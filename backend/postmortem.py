"""
postmortem.py  (Member 4 - Rithwik)

Once an incident is resolved, synthesize: timeline + RCA + action items ->
Markdown, then retain the finished post-mortem back into Hindsight so future
incidents can recall it (closing the ReplayOps learning loop).

RCA source priority:
  1. Harsha's multi-agent reasoner (ReasoningBackend)
  2. Hindsight reflect()
  3. Deterministic heuristic from the timeline (always available)
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

from .adapters import MemoryBackend, ReasoningBackend
from .predictive_engine import VulnerabilityScore

log = logging.getLogger("replayops.postmortem")


class TimelineEvent(BaseModel):
    timestamp: datetime
    source: str = "system"  # telemetry | alert | agent | human | deploy | system
    message: str


class IncidentRecord(BaseModel):
    incident_id: str
    service: str
    title: str = ""
    severity: str = "P1"
    started_at: Optional[datetime] = None
    detected_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    events: list[TimelineEvent] = Field(default_factory=list)
    resolution_summary: str = ""
    predictive_alerts: list[VulnerabilityScore] = Field(default_factory=list)


class ActionItem(BaseModel):
    title: str
    category: str  # prevent | detect | mitigate | process
    priority: str  # P0 | P1 | P2
    owner: str = "TBD"


class RCA(BaseModel):
    root_cause: str
    contributing_factors: list[str] = Field(default_factory=list)
    confidence: Optional[float] = None
    source: str = "heuristic"


# keyword -> (root cause phrase, [action items])
_RULES: list[tuple[re.Pattern, str, list[ActionItem]]] = [
    (re.compile(r"pool|connection|exhaust", re.I), "Database connection pool exhaustion",
     [ActionItem(title="Right-size connection pool and add per-request connection timeouts", category="prevent", priority="P0"),
      ActionItem(title="Alert when pool utilization > 80% for 3 minutes", category="detect", priority="P1")]),
    (re.compile(r"oom|memory|heap|leak", re.I), "Memory leak / memory saturation",
     [ActionItem(title="Add heap profiling and memory-growth regression test", category="prevent", priority="P0"),
      ActionItem(title="Set memory-limit alerts at 80% with 10-minute trend", category="detect", priority="P1")]),
    (re.compile(r"cpu|throttl|load", re.I), "CPU saturation under load",
     [ActionItem(title="Configure autoscaling on CPU and request rate", category="mitigate", priority="P1"),
      ActionItem(title="Load-test the hot path before next release", category="prevent", priority="P2")]),
    (re.compile(r"deploy|release|rollout|config", re.I), "Faulty deploy or configuration change",
     [ActionItem(title="Introduce canary rollout with automatic rollback on SLO breach", category="prevent", priority="P0"),
      ActionItem(title="Require change annotations on dashboards", category="process", priority="P2")]),
    (re.compile(r"latency|p99|timeout|slow|downstream", re.I), "Downstream dependency latency causing timeouts",
     [ActionItem(title="Add circuit breakers and bounded retries with jitter", category="prevent", priority="P0"),
      ActionItem(title="Alert on p99 trend, not just threshold", category="detect", priority="P1")]),
]


def _fmt_dur(seconds: Optional[float]) -> str:
    if seconds is None:
        return "n/a"
    m, s = divmod(int(max(0, seconds)), 60)
    h, m = divmod(m, 60)
    return f"{h}h {m}m" if h else f"{m}m {s}s"


class PostMortemGenerator:
    def __init__(self, memory: MemoryBackend, reasoner: Optional[ReasoningBackend] = None,
                 timeout_s: float = 20.0, retain: bool = True):
        self.memory, self.reasoner = memory, reasoner
        self.timeout, self.retain = timeout_s, retain

    async def generate(self, inc: IncidentRecord) -> dict:
        inc.resolved_at = inc.resolved_at or datetime.now(timezone.utc)
        events = sorted(inc.events, key=lambda e: e.timestamp)
        started = inc.started_at or (events[0].timestamp if events else inc.resolved_at)
        similar = await self._similar(inc)
        rca = await self._rca(inc, events, similar)
        actions = self._actions(inc, rca)
        md = self._render(inc, events, started, rca, actions, similar)
        if self.retain:
            try:
                await asyncio.wait_for(self.memory.retain(
                    f"POST-MORTEM {inc.incident_id} ({inc.service}): root cause: {rca.root_cause}. "
                    f"Resolution: {inc.resolution_summary}. Actions: "
                    + "; ".join(a.title for a in actions),
                    {"incident_id": inc.incident_id, "service": inc.service, "type": "post_mortem"}),
                    self.timeout)
            except Exception as exc:  # noqa: BLE001
                log.warning("retain post-mortem failed: %s", exc)
        return {"incident_id": inc.incident_id, "markdown": md,
                "rca": rca.model_dump(), "action_items": [a.model_dump() for a in actions]}

    # ------------------------------------------------------------ helpers
    async def _similar(self, inc: IncidentRecord) -> list[str]:
        try:
            mems = await asyncio.wait_for(self.memory.recall(
                f"incidents similar to: {inc.title or inc.service} {inc.resolution_summary}", limit=5), 8)
            return [m["text"][:200] for m in mems if inc.incident_id not in m["text"]][:3]
        except Exception as exc:  # noqa: BLE001
            log.warning("similar-incident recall failed: %s", exc)
            return []

    async def _rca(self, inc, events, similar) -> RCA:
        context = {
            "incident_id": inc.incident_id, "service": inc.service, "title": inc.title,
            "timeline": [f"{e.timestamp.isoformat()} [{e.source}] {e.message}" for e in events],
            "resolution": inc.resolution_summary, "similar_incidents": similar,
        }
        if self.reasoner:
            try:
                r = await asyncio.wait_for(self.reasoner.analyze(context), self.timeout)
                if r.get("root_cause"):
                    return RCA(root_cause=r["root_cause"], contributing_factors=list(r.get("contributing_factors") or []),
                               confidence=r.get("confidence"), source="multi-agent")
            except Exception as exc:  # noqa: BLE001
                log.warning("multi-agent RCA failed (%s); falling back", exc)
        try:
            text = await asyncio.wait_for(self.memory.reflect(
                f"Given this timeline, what was the root cause of {inc.incident_id}?\n" + "\n".join(context["timeline"])),
                self.timeout)
            if text and text.strip():
                return RCA(root_cause=text.strip()[:800], source="hindsight-reflect")
        except Exception as exc:  # noqa: BLE001
            log.warning("reflect RCA failed (%s); using heuristic", exc)
        corpus = " ".join(context["timeline"]) + " " + inc.resolution_summary + " " + inc.title
        hits = [(len(p.findall(corpus)), cause) for p, cause, _ in _RULES]
        hits.sort(reverse=True)
        top = [c for n, c in hits if n > 0]
        return RCA(root_cause=top[0] if top else "Undetermined - requires manual investigation",
                   contributing_factors=top[1:3], source="heuristic")

    def _actions(self, inc, rca: RCA) -> list[ActionItem]:
        text = " ".join([rca.root_cause, *rca.contributing_factors, inc.resolution_summary])
        items: list[ActionItem] = []
        for pat, _, acts in _RULES:
            if pat.search(text):
                items += [a for a in acts if a.title not in {i.title for i in items}]
        if not inc.predictive_alerts:
            items.append(ActionItem(title="Predictive engine gave no early warning - tune thresholds/memory patterns for this service",
                                    category="detect", priority="P1"))
        items.append(ActionItem(title=f"Add {inc.incident_id} runbook entry and replay it in ReplayOps drills",
                                category="process", priority="P2"))
        return items

    def _render(self, inc, events, started, rca, actions, similar) -> str:
        mttd = (inc.detected_at - started).total_seconds() if inc.detected_at else None
        mttr = (inc.resolved_at - started).total_seconds()
        lead = None
        if inc.predictive_alerts:
            first = min(a.computed_at for a in inc.predictive_alerts)
            lead = (started - first).total_seconds()
        L = [f"# Post-Mortem: {inc.incident_id} - {inc.title or inc.service}", "",
             f"_Generated by ReplayOps on {datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}_", "",
             "## Summary", "",
             "| Field | Value |", "|---|---|",
             f"| Service | `{inc.service}` |", f"| Severity | {inc.severity} |",
             f"| Started | {started:%Y-%m-%d %H:%M:%S UTC} |",
             f"| Resolved | {inc.resolved_at:%Y-%m-%d %H:%M:%S UTC} |",
             f"| Time to detect | {_fmt_dur(mttd)} |", f"| Time to resolve | {_fmt_dur(mttr)} |",
             f"| Predictive early warning | {('%s before impact' % _fmt_dur(lead)) if lead and lead > 0 else 'None'} |",
             "", "## Timeline", ""]
        L += [f"- **{e.timestamp:%H:%M:%S}** `{e.source}` - {e.message}" for e in events] or ["- _No events recorded._"]
        L += ["", "## Root Cause Analysis", "", f"**Root cause:** {rca.root_cause}", ""]
        if rca.confidence is not None:
            L.append(f"**Confidence:** {rca.confidence:.0%}  ")
        L.append(f"**Source:** {rca.source}")
        if rca.contributing_factors:
            L += ["", "**Contributing factors:**"] + [f"- {f}" for f in rca.contributing_factors]
        L += ["", "## Resolution", "", inc.resolution_summary or "_Not provided._"]
        if inc.predictive_alerts:
            L += ["", "## Predictive Signals Before Impact", ""]
            for a in sorted(inc.predictive_alerts, key=lambda a: a.computed_at)[:5]:
                L.append(f"- {a.computed_at:%H:%M:%S} - {a.level.upper()} ({a.probability:.0%}): {a.recommended_action}")
        if similar:
            L += ["", "## Similar Past Incidents (from Hindsight)", ""] + [f"- {s}" for s in similar]
        L += ["", "## Action Items", "", "| Priority | Category | Action | Owner |", "|---|---|---|---|"]
        L += [f"| {a.priority} | {a.category} | {a.title} | {a.owner} |"
              for a in sorted(actions, key=lambda a: a.priority)]
        return "\n".join(L) + "\n"
