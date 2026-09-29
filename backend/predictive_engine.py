"""
predictive_engine.py  (Member 4 - Rithwik)

Scans live telemetry BEFORE a P1 and produces a Vulnerability & Failure
Probability Score per service:

    telemetry_risk (T)  : thresholds + trend (time-to-breach) + co-occurrence
    memory_prior   (M)  : how strongly Hindsight's past incidents match the
                          current anomaly fingerprint
    probability         : sigmoid(-3 + 4T + 2.5M + 1.0*T*M)

The engine degrades gracefully: if Hindsight is slow/down, M = 0 and the score
is flagged `degraded=True` (telemetry alone still works).
"""
from __future__ import annotations

import asyncio
import logging
import math
import re
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional

from pydantic import BaseModel, Field

from .adapters import MemoryBackend

log = logging.getLogger("replayops.predictive")


# ----------------------------------------------------------------- models
class TelemetrySample(BaseModel):
    service: str
    timestamp: Optional[datetime] = None
    cpu_pct: Optional[float] = Field(None, ge=0, le=100)
    p99_ms: Optional[float] = Field(None, ge=0)
    mem_pct: Optional[float] = Field(None, ge=0, le=100)
    pool_error_rate: Optional[float] = Field(None, ge=0, le=1, description="fraction 0-1")


class Signal(BaseModel):
    metric: str
    label: str
    value: float
    risk: float
    slope_per_min: float
    minutes_to_critical: Optional[float] = None


class MemoryMatch(BaseModel):
    incident_id: Optional[str]
    relevance: float
    excerpt: str


class VulnerabilityScore(BaseModel):
    service: str
    probability: float
    level: str  # healthy | elevated | high | critical
    telemetry_risk: float
    memory_prior: float
    signals: list[Signal]
    matched_incidents: list[MemoryMatch]
    eta_minutes: Optional[float]
    recommended_action: str
    degraded: bool = False
    computed_at: datetime


@dataclass(frozen=True)
class MetricSpec:
    name: str
    label: str
    warn: float
    crit: float
    weight: float
    keywords: tuple[str, ...]
    action: str


DEFAULT_SPECS: tuple[MetricSpec, ...] = (
    MetricSpec("cpu_pct", "CPU saturation", 70, 95, 0.8,
               ("cpu", "saturation", "throttl", "load"),
               "Scale out / shed load; check for runaway workers or hot loops."),
    MetricSpec("p99_ms", "p99 latency spike", 500, 2000, 1.0,
               ("latency", "p99", "slow", "timeout"),
               "Inspect downstream dependencies and recent deploys; enable circuit breakers."),
    MetricSpec("mem_pct", "Memory saturation", 75, 95, 0.9,
               ("memory", "oom", "heap", "leak"),
               "Capture heap profile; restart leaking pods gradually; raise limits temporarily."),
    MetricSpec("pool_error_rate", "Connection pool errors", 0.01, 0.10, 1.0,
               ("connection", "pool", "exhaust", "db"),
               "Check DB connection pool size/leaks and DB health; throttle new connections."),
)

LEVELS = ("healthy", "elevated", "high", "critical")


def _clip(x: float, lo=0.0, hi=1.0) -> float:
    return max(lo, min(hi, x))


def _sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def _slope_per_min(points: list[tuple[float, float]]) -> float:
    """Least-squares slope (value per minute) over (epoch_seconds, value)."""
    n = len(points)
    if n < 3:
        return 0.0
    mx = sum(t for t, _ in points) / n
    my = sum(v for _, v in points) / n
    den = sum((t - mx) ** 2 for t, _ in points)
    if den == 0:
        return 0.0
    return (sum((t - mx) * (v - my) for t, v in points) / den) * 60.0


@dataclass
class _ServiceState:
    samples: deque = field(default_factory=lambda: deque(maxlen=120))  # (ts, {metric: value})
    last_score: Optional[VulnerabilityScore] = None
    last_alert_ts: float = 0.0
    last_alert_level: int = 0
    mem_cache: Optional[tuple[float, str, float, list[MemoryMatch], bool]] = None  # ts, fp, M, matches, degraded


AlertHook = Callable[[VulnerabilityScore], Awaitable[None]]


# ----------------------------------------------------------------- engine
class PredictiveEngine:
    def __init__(
        self,
        memory: MemoryBackend,
        on_alert: Optional[AlertHook] = None,
        specs: tuple[MetricSpec, ...] = DEFAULT_SPECS,
        window_minutes: float = 30.0,
        horizon_minutes: float = 30.0,
        memory_ttl_s: float = 60.0,
        recall_timeout_s: float = 5.0,
        alert_cooldown_s: float = 300.0,
        alert_min_level: str = "high",
    ):
        self.memory, self.on_alert = memory, on_alert
        self.specs = specs
        self.window_s = window_minutes * 60
        self.horizon = horizon_minutes
        self.memory_ttl = memory_ttl_s
        self.recall_timeout = recall_timeout_s
        self.cooldown = alert_cooldown_s
        self.alert_min = LEVELS.index(alert_min_level)
        self._state: dict[str, _ServiceState] = {}

    # ---------------------------------------------------------- public API
    async def ingest(self, sample: TelemetrySample) -> VulnerabilityScore:
        ts = (sample.timestamp or datetime.now(timezone.utc)).timestamp()
        st = self._state.setdefault(sample.service, _ServiceState())
        st.samples.append((ts, {s.name: getattr(sample, s.name) for s in self.specs
                                if getattr(sample, s.name) is not None}))
        while st.samples and ts - st.samples[0][0] > self.window_s:
            st.samples.popleft()

        signals, t_risk = self._telemetry_risk(st)
        m_prior, matches, degraded = await self._memory_prior(sample.service, st, signals, t_risk)

        logit = -3.0 + 4.0 * t_risk + 2.5 * m_prior + 1.0 * t_risk * m_prior
        prob = round(_sigmoid(logit), 4)
        level_idx = 0 if prob < 0.30 else 1 if prob < 0.55 else 2 if prob < 0.80 else 3
        etas = [s.minutes_to_critical for s in signals if s.minutes_to_critical is not None]
        top = max(signals, key=lambda s: s.risk, default=None)
        action = ("No action needed." if level_idx == 0 or top is None else
                  next(sp.action for sp in self.specs if sp.name == top.metric))

        score = VulnerabilityScore(
            service=sample.service, probability=prob, level=LEVELS[level_idx],
            telemetry_risk=round(t_risk, 3), memory_prior=round(m_prior, 3),
            signals=signals, matched_incidents=matches,
            eta_minutes=round(min(etas), 1) if etas else None,
            recommended_action=action, degraded=degraded,
            computed_at=datetime.now(timezone.utc),
        )
        st.last_score = score
        await self._maybe_alert(st, score, level_idx)
        return score

    def get_score(self, service: str) -> Optional[VulnerabilityScore]:
        st = self._state.get(service)
        return st.last_score if st else None

    def all_scores(self) -> list[VulnerabilityScore]:
        return sorted((s.last_score for s in self._state.values() if s.last_score),
                      key=lambda s: s.probability, reverse=True)

    # ------------------------------------------------------- telemetry risk
    def _telemetry_risk(self, st: _ServiceState) -> tuple[list[Signal], float]:
        signals: list[Signal] = []
        weighted, weights, trend_risks, past_warn = [], [], [], 0
        for sp in self.specs:
            pts = [(t, m[sp.name]) for t, m in st.samples if sp.name in m]
            if not pts:
                continue
            recent = [v for _, v in pts[-3:]]
            value = sum(recent) / len(recent)  # damp single-sample noise
            if value < sp.warn:
                risk = 0.3 * value / sp.warn
            else:
                risk = 0.3 + 0.7 * _clip((value - sp.warn) / (sp.crit - sp.warn))
                past_warn += 1
            slope = _slope_per_min(pts[-30:])
            ttc = None
            if slope > 0 and value < sp.crit:
                ttc = (sp.crit - value) / slope
            elif value >= sp.crit:
                ttc = 0.0
            trend_risk = _clip(1 - ttc / self.horizon) if ttc is not None else 0.0
            trend_risks.append(trend_risk * min(1.0, risk + 0.3))  # ignore trends on healthy values
            weighted.append(risk * sp.weight)
            weights.append(sp.weight)
            signals.append(Signal(metric=sp.name, label=sp.label, value=round(value, 4),
                                  risk=round(risk, 3), slope_per_min=round(slope, 4),
                                  minutes_to_critical=None if ttc is None else round(ttc, 1)))
        if not signals:
            return signals, 0.0
        max_r = max(s.risk for s in signals)
        mean_r = sum(weighted) / sum(weights)
        bonus = min(0.2, 0.1 * max(0, past_warn - 1))  # co-occurring anomalies
        t = _clip(0.5 * max_r + 0.25 * mean_r + 0.25 * max(trend_risks, default=0) + bonus)
        return signals, t

    # --------------------------------------------------------- memory prior
    async def _memory_prior(self, service, st, signals, t_risk):
        active = [s for s in signals if s.risk >= 0.3]
        if t_risk < 0.25 or not active:
            return 0.0, [], False  # don't burn Hindsight calls on quiet services
        specs = {sp.name: sp for sp in self.specs}
        labels = [s.label.lower() for s in active]
        fingerprint = f"{service}: " + ", ".join(sorted(labels))
        now = time.time()
        if st.mem_cache and st.mem_cache[1] == fingerprint and now - st.mem_cache[0] < self.memory_ttl:
            return st.mem_cache[2], st.mem_cache[3], st.mem_cache[4]

        query = (f"Past incidents where {', '.join(labels)} on service '{service}' "
                 f"preceded an outage. What failed and how was it resolved?")
        try:
            memories = await asyncio.wait_for(self.memory.recall(query, limit=8), self.recall_timeout)
        except Exception as exc:  # noqa: BLE001
            log.warning("Hindsight recall failed (%s); using telemetry only", exc)
            return 0.0, [], True

        kws = {k for s in active for k in specs[s.metric].keywords}
        matches: list[MemoryMatch] = []
        for mem in memories:
            text = (mem.get("text") or "")
            low = text.lower()
            overlap = sum(1 for k in kws if k in low) / max(1, len(kws))
            sc = mem.get("score")
            sc = sc if isinstance(sc, (int, float)) and 0 <= sc <= 1 else overlap
            rel = 0.5 * overlap + 0.5 * sc
            if service.lower() in low:
                rel += 0.15
            if re.search(r"\b(p1|sev-?1|outage|downtime|cascad)", low):
                rel += 0.15
            rel = _clip(rel)
            if rel >= 0.3:
                m = re.search(r"INC-\d+", text)
                matches.append(MemoryMatch(incident_id=m.group(0) if m else None,
                                           relevance=round(rel, 3), excerpt=text[:240]))
        matches.sort(key=lambda m: m.relevance, reverse=True)
        matches = matches[:3]
        prior = 1.0
        for m in matches:
            prior *= 1 - 0.7 * m.relevance
        prior = 1 - prior
        st.mem_cache = (now, fingerprint, prior, matches, False)
        return prior, matches, False

    # ----------------------------------------------------------- alerting
    async def _maybe_alert(self, st: _ServiceState, score: VulnerabilityScore, level_idx: int):
        if not self.on_alert or level_idx < self.alert_min:
            st.last_alert_level = min(st.last_alert_level, level_idx)
            return
        now = time.time()
        escalated = level_idx > st.last_alert_level
        if escalated or now - st.last_alert_ts > self.cooldown:
            st.last_alert_ts, st.last_alert_level = now, level_idx
            try:
                await self.on_alert(score)
            except Exception:  # noqa: BLE001
                log.exception("on_alert hook failed")
