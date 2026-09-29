from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import settings
from backend.hindsight_client import hindsight_service
from backend.service import incident_service
from backend.predictive_router import router as predictive_router

# Logging setup
logger = logging.getLogger("replayops.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to handle startup and cleanup tasks."""
    logger.info("Starting ReplayOps Backend...")
    logger.info("Target Hindsight Bank: %s (%s)", settings.HINDSIGHT_BANK_ID, settings.HINDSIGHT_API_URL)
    yield
    logger.info("Shutting down ReplayOps Backend...")
    await hindsight_service.aclose()


# Initialize FastAPI app
app = FastAPI(
    title="ReplayOps - Agentic Incident Management API",
    description="Persistent Memory & Outage Triage System powered by Vectorize Hindsight",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Rithwik's Predictive Engine Router
app.include_router(predictive_router, prefix="/api/predictive", tags=["Predictive Engine"])


# -------------------------------------------------------------------------
# Pydantic Request / Response Models
# -------------------------------------------------------------------------

class IncidentIngestRequest(BaseModel):
    """Payload schema for live incoming outage webhooks."""
    service: str = Field(..., description="Name of the affected service (e.g. 'payment-service')")
    severity: str = Field("HIGH", description="Severity level: CRITICAL, HIGH, MEDIUM, LOW")
    title: str = Field(..., description="Summary or alert title")
    error_message: str = Field(..., description="Error message or exception stack trace")
    symptoms: list[str] = Field(default_factory=list, description="List of observed telemetry anomalies")
    logs: Optional[str] = Field(None, description="Diagnostic logs or traceback")
    incident_id: Optional[str] = Field(None, description="Optional custom incident ID (auto-generated if empty)")
    timestamp: Optional[str] = Field(None, description="ISO timestamp of detection")
    tags: list[str] = Field(default_factory=list, description="Tags for categorization")


class IncidentAnalyzeRequest(BaseModel):
    """Request schema for querying Hindsight memory for similar past incidents."""
    service: Optional[str] = Field(None, description="Service name to scope search")
    error_message: Optional[str] = Field(None, description="Error message or exception text to match")
    symptoms: list[str] = Field(default_factory=list, description="Observed symptoms")
    query: Optional[str] = Field(None, description="Direct natural language search query")
    limit: int = Field(5, ge=1, le=20, description="Max recalled memory units to return")
    include_reflection: bool = Field(True, description="Whether to invoke Hindsight reflect for agentic synthesis")


class DirectRetainRequest(BaseModel):
    """Payload for directly retaining raw text/documents into Hindsight."""
    content: str = Field(..., description="Text or structured memory content to persist")
    context: Optional[str] = Field(None, description="Contextual background")
    metadata: Optional[dict[str, str]] = Field(None, description="Custom metadata key-values")
    tags: list[str] = Field(default_factory=list, description="Memory tags")


class DirectRecallRequest(BaseModel):
    """Payload for directly recalling memories from Hindsight."""
    query: str = Field(..., description="Search query string")
    tags: Optional[list[str]] = Field(None, description="Tags filter")
    max_tokens: int = Field(4096, description="Token budget for recalled memories")


class DirectReflectRequest(BaseModel):
    """Payload for directly reflecting on memories in Hindsight."""
    query: str = Field(..., description="Diagnostic or reasoning question")
    context: Optional[str] = Field(None, description="Live context for reflection")
    budget: str = Field("mid", description="Reasoning budget: 'low', 'mid', 'high'")


# -------------------------------------------------------------------------
# Core API Endpoints
# -------------------------------------------------------------------------

@app.get("/", tags=["General"])
async def root():
    """Root info endpoint."""
    return {
        "system": "ReplayOps API",
        "description": "Backend Architecture & Hindsight Persistent Memory Core",
        "hindsight_bank": settings.HINDSIGHT_BANK_ID,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "status": "online",
    }


@app.get("/health", tags=["General"])
async def health():
    """Health check endpoint verifying connection to Hindsight."""
    try:
        test_recall = await hindsight_service.arecall(query="ping", max_tokens=100)
        return {
            "status": "healthy",
            "hindsight_connection": "connected",
            "bank_id": settings.HINDSIGHT_BANK_ID,
            "api_url": settings.HINDSIGHT_API_URL,
            "promo_code": settings.HINDSIGHT_PROMO_CODE,
            "sample_memory_units_accessible": len(test_recall) >= 0,
        }
    except Exception as exc:
        logger.error("Health check failed: %s", exc)
        return {
            "status": "degraded",
            "hindsight_connection": "error",
            "error": str(exc),
            "bank_id": settings.HINDSIGHT_BANK_ID,
        }


@app.post("/incident/ingest", status_code=status.HTTP_201_CREATED, tags=["Incidents"])
async def ingest_incident(incident: IncidentIngestRequest):
    """Handle live incoming outage webhooks."""
    try:
        payload = incident.model_dump()
        result = await incident_service.ingest_incident(payload)
        return result
    except Exception as exc:
        logger.error("Failed to ingest incident webhook: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest incident into Hindsight: {str(exc)}",
        ) from exc


@app.post("/incident/analyze", tags=["Incidents"])
async def analyze_incident(req: IncidentAnalyzeRequest):
    """Query Hindsight retrieval API for past similar incidents."""
    try:
        analysis = await incident_service.analyze_incident(
            service=req.service,
            error_message=req.error_message,
            symptoms=req.symptoms,
            query=req.query,
            limit=req.limit,
            include_reflection=req.include_reflection,
        )
        return analysis
    except Exception as exc:
        logger.error("Error analyzing incident via Hindsight: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing incident in Hindsight: {str(exc)}",
        ) from exc


@app.get("/incident/history", tags=["Incidents"])
async def get_incident_history():
    """Retrieve the base catalogue of seeded historical incidents."""
    return {
        "incidents": incident_service.get_historical_incidents(),
        "count": len(incident_service.get_historical_incidents()),
        "bank_id": settings.HINDSIGHT_BANK_ID,
    }


# -------------------------------------------------------------------------
# Hindsight Direct Memory Endpoints (Utility / Agent Integration Layer)
# -------------------------------------------------------------------------

@app.post("/memory/retain", tags=["Hindsight Memory"])
async def direct_retain(req: DirectRetainRequest):
    """Directly retain content into Hindsight persistent memory bank."""
    try:
        res = await hindsight_service.aretain(
            content=req.content,
            context=req.context,
            metadata=req.metadata,
            tags=req.tags,
        )
        return res
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/memory/recall", tags=["Hindsight Memory"])
async def direct_recall(req: DirectRecallRequest):
    """Directly recall relevant memory units from Hindsight."""
    try:
        results = await hindsight_service.arecall(
            query=req.query,
            tags=req.tags,
            max_tokens=req.max_tokens,
        )
        return {"query": req.query, "results": results, "count": len(results)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/memory/reflect", tags=["Hindsight Memory"])
async def direct_reflect(req: DirectReflectRequest):
    """Directly run agentic reflection over Hindsight memories."""
    try:
        res = await hindsight_service.areflect(
            query=req.query,
            context=req.context,
            budget=req.budget,
        )
        return res
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)