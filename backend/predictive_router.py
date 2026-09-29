"""
predictive_router.py  (Member 4 - Rithwik)

Exposes:
  POST /api/predictive/telemetry            ingest one sample -> score
  POST /api/predictive/telemetry/batch      ingest many
  GET  /api/predictive/scores               all services, riskiest first
  GET  /api/predictive/scores/{service}
  POST /api/predictive/incidents/{id}/events        append timeline event
  POST /api/predictive/incidents/{id}/resolve       resolve + generate post-mortem
  GET  /api/predictive/incidents/{id}/postmortem    markdown
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from .adapters import HarshaReasoningAdapter, SaiMemoryAdapter
from .postmortem import IncidentRecord, PostMortemGenerator, TimelineEvent
from .predictive_engine import PredictiveEngine, TelemetrySample, VulnerabilityScore
from .service import incident_service

log = logging.getLogger("replayops.router")


class IncidentStore:
    """In-memory store for incidents and post-mortems."""

    def __init__(self):
        self.incidents: dict[str, IncidentRecord] = {}
        self.postmortems: dict[str, dict] = {}
        self.recent_alerts: dict[str, list[VulnerabilityScore]] = {}

    def open(self, incident_id: str, service: str, title: str = "", severity: str = "P1") -> IncidentRecord:
        if incident_id not in self.incidents:
            now = datetime.now(timezone.utc)
            self.incidents[incident_id] = IncidentRecord(
                incident_id=incident_id, service=service, title=title, severity=severity,
                started_at=now, detected_at=now,
                predictive_alerts=list(self.recent_alerts.get(service, [])[-5:]))
        return self.incidents[incident_id]

    def add_alert(self, score: VulnerabilityScore):
        self.recent_alerts.setdefault(score.service, []).append(score)
        self.recent_alerts[score.service] = self.recent_alerts[score.service][-20:]


class EventIn(BaseModel):
    service: str
    message: str
    source: str = "system"
    title: str = ""
    timestamp: Optional[datetime] = None


class ResolveIn(BaseModel):
    resolution_summary: str
    service: Optional[str] = None


# Default initialized instances
_memory = SaiMemoryAdapter(incident_service)
_engine = PredictiveEngine(_memory)
_generator = PostMortemGenerator(_memory, None)
_store = IncidentStore()

router = APIRouter(tags=["Predictive Engine"])


@router.post("/telemetry", response_model=VulnerabilityScore)
async def ingest(sample: TelemetrySample):
    return await _engine.ingest(sample)


@router.post("/telemetry/batch", response_model=list[VulnerabilityScore])
async def ingest_batch(samples: list[TelemetrySample]):
    return [await _engine.ingest(s) for s in samples]


@router.get("/scores", response_model=list[VulnerabilityScore])
async def scores():
    return _engine.all_scores()


@router.get("/scores/{service}", response_model=VulnerabilityScore)
async def score(service: str):
    s = _engine.get_score(service)
    if not s:
        raise HTTPException(404, f"No telemetry for '{service}' yet")
    return s


@router.post("/incidents/{incident_id}/events")
async def add_event(incident_id: str, ev: EventIn):
    inc = _store.open(incident_id, ev.service, ev.title)
    inc.events.append(TimelineEvent(timestamp=ev.timestamp or datetime.now(timezone.utc),
                                    source=ev.source, message=ev.message))
    return {"incident_id": incident_id, "events": len(inc.events)}


@router.post("/incidents/{incident_id}/resolve")
async def resolve(incident_id: str, body: ResolveIn):
    inc = _store.incidents.get(incident_id)
    if inc is None:
        if not body.service:
            raise HTTPException(404, "Unknown incident; pass 'service' to create it")
        inc = _store.open(incident_id, body.service)
    inc.resolution_summary = body.resolution_summary
    inc.resolved_at = datetime.now(timezone.utc)
    result = await _generator.generate(inc)
    _store.postmortems[incident_id] = result
    return result


@router.get("/incidents/{incident_id}/postmortem", response_class=PlainTextResponse)
async def get_postmortem(incident_id: str):
    pm = _store.postmortems.get(incident_id)
    if not pm:
        raise HTTPException(404, "Post-mortem not generated yet")
    return PlainTextResponse(pm["markdown"], media_type="text/markdown")


def setup_predictive(app: FastAPI, sai_service: Any, harsha_agent: Any = None,
                     harsha_method: str = "investigate", on_alert_agent: bool = True) -> dict:
    """Wire everything into the existing app."""
    global _memory, _engine, _generator, _store
    _memory = SaiMemoryAdapter(sai_service)
    reasoner = HarshaReasoningAdapter(harsha_agent, harsha_method) if harsha_agent else None

    async def on_alert(score: VulnerabilityScore):
        _store.add_alert(score)
        log.warning("PREDICTIVE ALERT %s %s p=%.2f", score.service, score.level, score.probability)
        if on_alert_agent and reasoner:
            try:
                await reasoner.analyze({"mode": "predictive", "service": score.service,
                                        "score": score.model_dump(mode="json")})
            except Exception:
                log.exception("agent handoff failed")

    _engine = PredictiveEngine(_memory, on_alert=on_alert)
    _generator = PostMortemGenerator(_memory, reasoner)
    app.state.predictive = {"engine": _engine, "generator": _generator, "store": _store}
    return app.state.predictive