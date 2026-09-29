"""
adapters.py  (Member 4 - Rithwik)

Thin adapters so the Predictive Engine / Post-Mortem generator never import
Sai's or Harsha's code directly. If their method names differ from what is
assumed here, change the *_name arguments (or the mapping) in ONE place.
"""
from __future__ import annotations

import asyncio
import inspect
import logging
from typing import Any, Optional, Protocol

log = logging.getLogger("replayops.adapters")


class MemoryBackend(Protocol):
    async def recall(self, query: str, limit: int = 8) -> list[dict]: ...
    async def reflect(self, query: str) -> str: ...
    async def retain(self, content: str, metadata: Optional[dict] = None) -> None: ...


class ReasoningBackend(Protocol):
    async def analyze(self, context: dict) -> dict:
        """Return {"root_cause": str, "contributing_factors": [str], "confidence": float}."""


async def _call(fn, *args, **kwargs):
    """Call sync or async functions uniformly (sync ones run in a thread)."""
    if inspect.iscoroutinefunction(fn):
        return await fn(*args, **kwargs)
    result = await asyncio.to_thread(fn, *args, **kwargs)
    if inspect.isawaitable(result):
        result = await result
    return result


def _normalize_recall(raw: Any) -> list[dict]:
    """Turn whatever Hindsight/Sai returns into [{'text','score','raw'}]."""
    if raw is None:
        return []
    items = getattr(raw, "results", None)
    if items is None and isinstance(raw, dict):
        items = raw.get("results") or raw.get("memories") or raw.get("items")
    if items is None:
        items = raw
    out: list[dict] = []
    for it in items or []:
        if isinstance(it, str):
            out.append({"text": it, "score": None, "raw": it})
        elif isinstance(it, dict):
            out.append({
                "text": it.get("text") or it.get("content") or it.get("memory") or str(it),
                "score": it.get("score") or it.get("relevance"),
                "raw": it,
            })
        else:
            out.append({
                "text": getattr(it, "text", None) or getattr(it, "content", None) or str(it),
                "score": getattr(it, "score", None),
                "raw": it,
            })
    return out


class SaiMemoryAdapter:
    """Wraps Sai's service layer (backend/service.py or hindsight_client.py)."""

    def __init__(self, service: Any, recall_name="recall", reflect_name="reflect",
                 retain_name="retain", bank_id: str = "replayops-bank"):
        self.service, self.bank_id = service, bank_id
        self._names = (recall_name, reflect_name, retain_name)

    async def recall(self, query: str, limit: int = 8) -> list[dict]:
        fn = getattr(self.service, self._names[0])
        try:
            raw = await _call(fn, query)          # most common signature
        except TypeError:
            raw = await _call(fn, query=query)
        return _normalize_recall(raw)[:limit]

    async def reflect(self, query: str) -> str:
        raw = await _call(getattr(self.service, self._names[1]), query)
        return raw if isinstance(raw, str) else (
            getattr(raw, "text", None) or (raw.get("text") if isinstance(raw, dict) else None) or str(raw))

    async def retain(self, content: str, metadata: Optional[dict] = None) -> None:
        fn = getattr(self.service, self._names[2], None)
        if fn is None:
            log.warning("Sai's service has no '%s'; skipping retain", self._names[2])
            return
        try:
            await _call(fn, content, metadata or {})
        except TypeError:
            await _call(fn, content)


class HarshaReasoningAdapter:
    """
    Wraps Harsha's multi-agent module. `agent` must expose one callable
    (default name: `investigate`) accepting a dict and returning a dict/str.
    """

    def __init__(self, agent: Any, method_name: str = "investigate"):
        self.agent, self.method_name = agent, method_name

    async def analyze(self, context: dict) -> dict:
        raw = await _call(getattr(self.agent, self.method_name), context)
        if isinstance(raw, str):
            return {"root_cause": raw, "contributing_factors": [], "confidence": None}
        if isinstance(raw, dict):
            return {
                "root_cause": raw.get("root_cause") or raw.get("hypothesis") or raw.get("summary", ""),
                "contributing_factors": raw.get("contributing_factors") or raw.get("evidence") or [],
                "confidence": raw.get("confidence"),
            }
        return {"root_cause": str(raw), "contributing_factors": [], "confidence": None}
