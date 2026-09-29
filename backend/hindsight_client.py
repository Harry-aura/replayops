"""Hindsight Client Module for ReplayOps.

Provides utility functions and an interface to Vectorize Hindsight Cloud for:
- retain / aretain: Store outage events, post-mortems, and logs into persistent memory.
- recall / arecall: Retrieve past incidents (INC-101, INC-102, INC-103) via multi-strategy search.
- reflect / areflect: Synthesize deep agentic insights, root cause hypotheses, and remediation plans.

Supports both asynchronous (FastAPI/asyncio) and synchronous (CLI/scripts/agents) workflows.
Includes automatic event-loop freshness tracking for seamless execution across web requests and test runners.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import sys
from pathlib import Path
from typing import Any, Optional

# Safeguard against module shadowing:
_current_dir = str(Path(__file__).resolve().parent)
_path_removed = False
if _current_dir in sys.path:
    sys.path.remove(_current_dir)
    _path_removed = True

try:
    import hindsight_client as _hindsight_sdk
    Hindsight = getattr(_hindsight_sdk, "Hindsight")
finally:
    if _path_removed:
        sys.path.append(_current_dir)

from backend.config import settings

logger = logging.getLogger("replayops.hindsight")
logging.basicConfig(level=logging.INFO)

_thread_pool = ThreadPoolExecutor(max_workers=4)


class HindsightMemoryClient:
    """Wrapper client for interacting with Hindsight Memory Banks."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        bank_id: str | None = None,
        promo_code: str | None = None,
    ):
        self.base_url = base_url or settings.HINDSIGHT_API_URL
        self.api_key = api_key or settings.HINDSIGHT_API_KEY
        self.bank_id = bank_id or settings.HINDSIGHT_BANK_ID
        self.promo_code = promo_code or settings.HINDSIGHT_PROMO_CODE
        self._client: Hindsight | None = None

    def _is_client_stale(self) -> bool:
        """Check if the existing SDK client is bound to a closed or mismatched event loop."""
        if self._client is None:
            return True
        try:
            rc = getattr(self._client._api_client, "rest_client", None)
            pm = getattr(rc, "_pool_manager", None)
            if pm is not None:
                if getattr(pm, "closed", False):
                    return True
                loop = getattr(pm, "_loop", None)
                if loop is not None and loop.is_closed():
                    return True
                try:
                    curr_loop = asyncio.get_running_loop()
                    if loop is not None and loop != curr_loop:
                        return True
                except RuntimeError:
                    pass
        except Exception:
            return True
        return False

    def get_client(self) -> Hindsight:
        """Get or lazily initialize the Hindsight SDK client for the current loop."""
        if self._is_client_stale():
            logger.info("Initializing Hindsight client for bank: %s", self.bank_id)
            self._client = Hindsight(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=60.0,
            )
        return self._client

    # -------------------------------------------------------------------------
    # Asynchronous Core Methods (for FastAPI and Async Agents)
    # -------------------------------------------------------------------------

    async def aretain(
        self,
        content: str | list[dict[str, Any]],
        context: str | None = None,
        metadata: dict[str, str] | None = None,
        tags: list[str] | None = None,
        bank_id: str | None = None,
        document_id: str | None = None,
    ) -> dict[str, Any]:
        """Async store information into Hindsight memory."""
        client = self.get_client()
        target_bank = bank_id or self.bank_id
        tags = tags or []

        try:
            logger.info("Async retaining memory to bank '%s' with tags: %s", target_bank, tags)
            response = await client.aretain(
                bank_id=target_bank,
                content=content,
                context=context,
                metadata=metadata,
                tags=tags,
                document_id=document_id,
            )

            usage = getattr(response, "usage", None)
            return {
                "success": getattr(response, "success", True),
                "bank_id": target_bank,
                "items_count": getattr(response, "items_count", 1),
                "document_id": document_id,
                "usage": {
                    "input_tokens": getattr(usage, "input_tokens", 0) if usage else 0,
                    "output_tokens": getattr(usage, "output_tokens", 0) if usage else 0,
                    "total_tokens": getattr(usage, "total_tokens", 0) if usage else 0,
                },
            }
        except Exception as exc:
            logger.error("Error during aretain in Hindsight: %s", exc)
            raise

    async def arecall(
        self,
        query: str,
        tags: list[str] | None = None,
        max_tokens: int = 4096,
        bank_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Async retrieve relevant past memories using multi-strategy search."""
        client = self.get_client()
        target_bank = bank_id or self.bank_id

        try:
            logger.info("Async recalling memories from bank '%s' for query: %s", target_bank, query)
            response = await client.arecall(
                bank_id=target_bank,
                query=query,
                tags=tags,
                max_tokens=max_tokens,
            )

            results: list[dict[str, Any]] = []
            for item in getattr(response, "results", []):
                results.append({
                    "id": getattr(item, "id", None),
                    "type": getattr(item, "type", "observation"),
                    "text": getattr(item, "text", ""),
                    "score": getattr(item, "score", None),
                    "metadata": getattr(item, "metadata", None),
                })
            return results
        except Exception as exc:
            logger.error("Error during arecall in Hindsight: %s", exc)
            raise

    async def areflect(
        self,
        query: str,
        context: str | None = None,
        budget: str = "mid",
        bank_id: str | None = None,
    ) -> dict[str, Any]:
        """Async synthesize reasoned conclusions and root cause insights over stored memories."""
        client = self.get_client()
        target_bank = bank_id or self.bank_id

        try:
            logger.info("Async reflecting over bank '%s' for query: %s", target_bank, query)
            response = await client.areflect(
                bank_id=target_bank,
                query=query,
                context=context,
                budget=budget,
            )

            text = getattr(response, "text", "")
            return {
                "bank_id": target_bank,
                "analysis": text,
                "query": query,
            }
        except Exception as exc:
            logger.error("Error during areflect in Hindsight: %s", exc)
            raise

    # -------------------------------------------------------------------------
    # Synchronous Core Methods (with Event Loop Fallback)
    # -------------------------------------------------------------------------

    def retain(
        self,
        content: str | list[dict[str, Any]],
        context: str | None = None,
        metadata: dict[str, str] | None = None,
        tags: list[str] | None = None,
        bank_id: str | None = None,
        document_id: str | None = None,
    ) -> dict[str, Any]:
        """Store information into Hindsight memory (synchronous interface)."""
        try:
            asyncio.get_running_loop()
            future = _thread_pool.submit(
                asyncio.run,
                self.aretain(content, context, metadata, tags, bank_id, document_id)
            )
            return future.result()
        except RuntimeError:
            return asyncio.run(
                self.aretain(content, context, metadata, tags, bank_id, document_id)
            )

    def recall(
        self,
        query: str,
        tags: list[str] | None = None,
        max_tokens: int = 4096,
        bank_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve relevant past memories (synchronous interface)."""
        try:
            asyncio.get_running_loop()
            future = _thread_pool.submit(
                asyncio.run,
                self.arecall(query, tags, max_tokens, bank_id)
            )
            return future.result()
        except RuntimeError:
            return asyncio.run(
                self.arecall(query, tags, max_tokens, bank_id)
            )

    def reflect(
        self,
        query: str,
        context: str | None = None,
        budget: str = "mid",
        bank_id: str | None = None,
    ) -> dict[str, Any]:
        """Synthesize reasoned conclusions over stored memories (synchronous interface)."""
        try:
            asyncio.get_running_loop()
            future = _thread_pool.submit(
                asyncio.run,
                self.areflect(query, context, budget, bank_id)
            )
            return future.result()
        except RuntimeError:
            return asyncio.run(
                self.areflect(query, context, budget, bank_id)
            )

    # -------------------------------------------------------------------------
    # Specialized Incident Helpers
    # -------------------------------------------------------------------------

    def _format_incident_content(self, incident: dict[str, Any]) -> tuple[str, dict[str, str], list[str]]:
        incident_id = incident.get("incident_id", "UNKNOWN-INCIDENT")
        service = incident.get("service", "unknown-service")
        title = incident.get("title", "Untitled Incident")
        severity = incident.get("severity", "MEDIUM")
        error_msg = incident.get("error_message", "No error message provided")
        symptoms = incident.get("symptoms", [])
        root_cause = incident.get("root_cause", "Under investigation")
        failed_mitigations = incident.get("failed_mitigations", [])
        successful_resolution = incident.get("successful_resolution", "None recorded yet")
        timestamp = incident.get("timestamp", "")
        tags = incident.get("tags", [])

        combined_tags = list(set(tags + [service, severity.lower(), incident_id.lower(), "incident"]))

        formatted_content = f"""
Incident Report: {incident_id} - {title}
Service: {service}
Severity: {severity}
Timestamp: {timestamp}

Error Message:
{error_msg}

Observed Symptoms:
{chr(10).join(f"- {s}" for s in symptoms) if symptoms else "- None recorded"}

Identified Root Cause:
{root_cause}

Failed Mitigations (WHAT NOT TO DO):
{chr(10).join(f"- {m}" for m in failed_mitigations) if failed_mitigations else "- None"}

Successful Resolution:
{successful_resolution}
""".strip()

        metadata = {
            "incident_id": incident_id,
            "service": service,
            "severity": severity,
            "type": "incident_record",
        }
        return formatted_content, metadata, combined_tags

    async def aretain_incident(self, incident: dict[str, Any]) -> dict[str, Any]:
        """Async specialized helper to format and retain an incident into Hindsight."""
        content, metadata, tags = self._format_incident_content(incident)
        service = incident.get("service", "unknown-service")
        return await self.aretain(
            content=content,
            context=f"Incident postmortem and live alert history for {service}",
            metadata=metadata,
            tags=tags,
            document_id=incident.get("incident_id"),
        )

    def retain_incident(self, incident: dict[str, Any]) -> dict[str, Any]:
        """Synchronous specialized helper to format and retain an incident into Hindsight."""
        try:
            asyncio.get_running_loop()
            future = _thread_pool.submit(asyncio.run, self.aretain_incident(incident))
            return future.result()
        except RuntimeError:
            return asyncio.run(self.aretain_incident(incident))

    async def aclose(self) -> None:
        """Async cleanup client sessions."""
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:
                pass
            self._client = None

    def close(self) -> None:
        """Sync cleanup client sessions."""
        try:
            asyncio.get_running_loop()
            future = _thread_pool.submit(asyncio.run, self.aclose())
            future.result()
        except RuntimeError:
            if self._client is not None:
                try:
                    self._client.close()
                except Exception:
                    pass
                self._client = None


# Global singleton instance for easy import across endpoints & services
hindsight_service = HindsightMemoryClient()


# Convenience functional utilities for team handoff
def retain(content: str, **kwargs: Any) -> dict[str, Any]:
    """Store data into Hindsight persistent memory (Sync)."""
    return hindsight_service.retain(content, **kwargs)


def recall(query: str, **kwargs: Any) -> list[dict[str, Any]]:
    """Retrieve relevant memories from Hindsight (Sync)."""
    return hindsight_service.recall(query, **kwargs)


def reflect(query: str, **kwargs: Any) -> dict[str, Any]:
    """Perform agentic reasoning and synthesis over stored memories (Sync)."""
    return hindsight_service.reflect(query, **kwargs)


async def aretain(content: str, **kwargs: Any) -> dict[str, Any]:
    """Store data into Hindsight persistent memory (Async)."""
    return await hindsight_service.aretain(content, **kwargs)


async def arecall(query: str, **kwargs: Any) -> list[dict[str, Any]]:
    """Retrieve relevant memories from Hindsight (Async)."""
    return await hindsight_service.arecall(query, **kwargs)


async def areflect(query: str, **kwargs: Any) -> dict[str, Any]:
    """Perform agentic reasoning and synthesis over stored memories (Async)."""
    return await hindsight_service.areflect(query, **kwargs)
