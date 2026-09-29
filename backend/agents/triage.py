from __future__ import annotations
import logging
from typing import Any, Optional
from backend.service import incident_service

logger = logging.getLogger("replayops.agents.triage")

class TriageAgent:
    """Specialized agent to parse incoming alerts and query Hindsight persistent memory."""
    
    async def process_alert(self, payload: dict[str, Any]) -> dict[str, Any]:
        logger.info("TriageAgent parsing incoming incident alert...")
        service = payload.get("service")
        error_message = payload.get("error_message")
        symptoms = payload.get("symptoms", [])
        
        # Ingest alert first
        ingest_res = await incident_service.ingest_incident(payload)
        
        # Analyze and query Hindsight memory recall
        analysis = await incident_service.analyze_incident(
            service=service,
            error_message=error_message,
            symptoms=symptoms,
            include_reflection=False
        )
        
        return {
            "agent": "TriageAgent",
            "status": "triaged",
            "incident_id": ingest_res.get("incident_id"),
            "matched_history": analysis.get("matched_historical_incidents"),
            "recalled_memories": analysis.get("recalled_memories")
        }

triage_agent = TriageAgent()
