"""Incident Memory Service layer for ReplayOps.

Coordinates incident ingestion, memory retention, and retrieval-augmented
incident analysis using Hindsight persistent memory.
Designed for seamless consumption by FastAPI endpoints and Harsha's multi-agent reasoning layer.
"""

from __future__ import annotations

import datetime
import json
import logging
import uuid
from pathlib import Path
from typing import Any, Optional

from backend.config import settings
from backend.hindsight_client import hindsight_service

logger = logging.getLogger("replayops.service")
ROOT_DIR = Path(__file__).resolve().parent.parent


class IncidentMemoryService:
    """Core memory and retrieval service for incident lifecycle."""

    def __init__(self, client=None):
        self.client = client or hindsight_service

    async def ingest_incident(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Ingest a live outage webhook and persist it into Hindsight memory.

        Args:
            payload: Dict containing incident details:
                     - incident_id (optional, auto-generated if missing)
                     - service (required, e.g. 'payment-service')
                     - severity (e.g. 'CRITICAL', 'HIGH')
                     - title (e.g. 'Redis pool exhaustion')
                     - error_message (e.g. 'Connection pool exhausted')
                     - symptoms (list of symptom strings)
                     - logs / stack_trace (optional)
                     - metadata (optional dict)
                     - tags (optional list)

        Returns:
            Dict with ingestion status, assigned incident_id, and Hindsight response.
        """
        service_name = payload.get("service", "unknown-service")
        incident_id = payload.get("incident_id") or f"INC-LIVE-{uuid.uuid4().hex[:6].upper()}"
        severity = payload.get("severity", "HIGH").upper()
        title = payload.get("title", f"Outage alert for {service_name}")
        error_message = payload.get("error_message", "")
        symptoms = payload.get("symptoms", [])
        logs = payload.get("logs", "")
        timestamp = payload.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat()
        tags = payload.get("tags") or []

        # Construct comprehensive document content for Hindsight retention
        content = f"""
LIVE OUTAGE INCIDENT: {incident_id}
Title: {title}
Service Affected: {service_name}
Severity: {severity}
Detected At: {timestamp}

Error Message:
{error_message}

Observed Symptoms:
{chr(10).join(f"- {s}" for s in symptoms) if symptoms else "- None specified"}

Raw Logs / Diagnostics:
{logs if logs else "No stack trace provided"}
""".strip()

        combined_tags = list(set(tags + [service_name, severity.lower(), incident_id.lower(), "live-incident"]))

        metadata = {
            "incident_id": incident_id,
            "service": service_name,
            "severity": severity,
            "source": "live_webhook",
            "type": "outage_alert",
        }

        logger.info("Ingesting live incident %s for service %s into Hindsight", incident_id, service_name)
        retain_res = await self.client.aretain(
            content=content,
            context=f"Live incoming alert for service {service_name}",
            metadata=metadata,
            tags=combined_tags,
            document_id=incident_id,
        )

        return {
            "status": "ingested",
            "incident_id": incident_id,
            "service": service_name,
            "severity": severity,
            "title": title,
            "timestamp": timestamp,
            "hindsight_bank": settings.HINDSIGHT_BANK_ID,
            "hindsight_result": retain_res,
        }

    async def analyze_incident(
        self,
        service: Optional[str] = None,
        error_message: Optional[str] = None,
        symptoms: Optional[list[str]] = None,
        query: Optional[str] = None,
        limit: int = 5,
        include_reflection: bool = True,
    ) -> dict[str, Any]:
        """Analyze an active or simulated incident by querying Hindsight memory.

        Retrieves past similar incidents (e.g. INC-101, INC-102, INC-103) and
        synthesizes root-cause insights and warnings on past failed actions.

        Args:
            service: Name of affected microservice (e.g. 'payment-service').
            error_message: Error string or stack trace snippet.
            symptoms: List of observed symptoms.
            query: Custom natural language query (if not provided, built automatically).
            limit: Max memories to recall.
            include_reflection: If True, uses Hindsight's reflect capability for deep reasoning.

        Returns:
            Dict containing recalled memories, matched incident references, and synthesized reflection.
        """
        # Formulate query
        parts = []
        if service:
            parts.append(f"Service: {service}")
        if error_message:
            parts.append(f"Error: {error_message}")
        if symptoms:
            parts.append(f"Symptoms: {', '.join(symptoms)}")
        if query:
            parts.append(f"Query: {query}")

        search_query = " | ".join(parts) if parts else "service outage error deadlock pool exhaustion memory"

        logger.info("Querying Hindsight recall for incident analysis: '%s'", search_query)
        tags_filter = [service] if service else None

        # 1. Recall similar memories
        try:
            recalled_memories = await self.client.arecall(query=search_query, tags=tags_filter, max_tokens=3000)
        except Exception as e:
            logger.warning("Tag-specific recall failed (%s), retrying without tag filter", e)
            recalled_memories = await self.client.arecall(query=search_query, max_tokens=3000)

        # 2. Extract matched incident IDs (like INC-101, INC-102, INC-103)
        matched_incident_ids = set()
        for mem in recalled_memories:
            text = mem.get("text", "")
            for known_id in ["INC-101", "INC-102", "INC-103"]:
                if known_id in text:
                    matched_incident_ids.add(known_id)

        # 3. Perform reflection if requested
        reflection_text = ""
        if include_reflection:
            reflect_prompt = f"""
Analyze the active incident for {service or 'affected system'}:
Error: {error_message or 'unspecified error'}
Symptoms: {', '.join(symptoms) if symptoms else 'system degraded'}

Based on your persistent memories of past incidents (such as INC-101, INC-102, INC-103):
1. What past incident is most similar to this outage?
2. What was the verified root cause?
3. What actions were attempted that FAILED or made things worse (WHAT NOT TO DO)?
4. What was the exact successful resolution to apply?
""".strip()
            try:
                reflect_res = await self.client.areflect(
                    query=reflect_prompt,
                    context=f"Real-time incident analysis for service {service}",
                    budget="mid",
                )
                reflection_text = reflect_res.get("analysis", "")
            except Exception as e:
                logger.error("Reflection failed in Hindsight: %s", e)
                reflection_text = f"Reflection unavailable due to error: {str(e)}"

        return {
            "search_query": search_query,
            "target_service": service,
            "matched_historical_incidents": sorted(list(matched_incident_ids)),
            "recalled_memories_count": len(recalled_memories),
            "recalled_memories": recalled_memories[:limit],
            "hindsight_reflection": reflection_text,
            "bank_id": settings.HINDSIGHT_BANK_ID,
        }

    def get_historical_incidents(self) -> list[dict[str, Any]]:
        """Load static historical incident dataset from disk for reference."""
        json_path = ROOT_DIR / "data" / "historical_incidents.json"
        if not json_path.exists():
            return []
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)


# Singleton service instance
incident_service = IncidentMemoryService()
