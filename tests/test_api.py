"""Automated tests for ReplayOps FastAPI application and Hindsight integration."""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app
from backend.config import settings

client = TestClient(app)


def test_root_endpoint():
    """Verify root information endpoint returns expected metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["system"] == "ReplayOps API"
    assert data["hindsight_bank"] == settings.HINDSIGHT_BANK_ID
    assert data["status"] == "online"


def test_health_endpoint():
    """Verify health endpoint checks Hindsight connectivity."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["bank_id"] == settings.HINDSIGHT_BANK_ID


def test_get_historical_incidents():
    """Verify seeded incidents can be retrieved from local catalog."""
    response = client.get("/incident/history")
    assert response.status_code == 200
    data = response.json()
    assert "incidents" in data
    assert data["count"] >= 3
    
    incident_ids = [inc["incident_id"] for inc in data["incidents"]]
    assert "INC-101" in incident_ids
    assert "INC-102" in incident_ids
    assert "INC-103" in incident_ids


def test_incident_ingest():
    """Verify live webhook ingestion endpoint /incident/ingest persists to Hindsight."""
    payload = {
        "service": "payment-service",
        "severity": "CRITICAL",
        "title": "Automated Test Alert - Stripe Webhook Spike",
        "error_message": "redis.exceptions.ConnectionError: Maximum connections reached (test)",
        "symptoms": [
            "Response times > 5000ms",
            "Gateway 504 on /checkout"
        ],
        "tags": ["test", "webhook", "ci-cd"]
    }
    response = client.post("/incident/ingest", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ingested"
    assert data["service"] == "payment-service"
    assert "INC-" in data["incident_id"]
    assert data["hindsight_bank"] == settings.HINDSIGHT_BANK_ID


def test_incident_analyze_redis_matches_inc101():
    """Verify /incident/analyze queries Hindsight and finds past incident INC-101."""
    payload = {
        "service": "payment-service",
        "error_message": "redis.exceptions.ConnectionError: Connection pool exhausted. Maximum 50 connections reached.",
        "symptoms": ["Payment checkout HTTP 504 Gateway Timeout"],
        "limit": 5,
        "include_reflection": False  # Faster for unit testing
    }
    response = client.post("/incident/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recalled_memories" in data
    assert data["recalled_memories_count"] > 0
    
    # Check if INC-101 was recognized in the recalled memories
    assert "INC-101" in data["matched_historical_incidents"]


def test_incident_analyze_deadlock_matches_inc102():
    """Verify /incident/analyze matches PostgreSQL deadlock incident INC-102."""
    payload = {
        "service": "auth-service",
        "error_message": "Deadlock detected on relation user_sessions",
        "symptoms": ["SSO login failures spiking"],
        "limit": 5,
        "include_reflection": False
    }
    response = client.post("/incident/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recalled_memories" in data
    assert "INC-102" in data["matched_historical_incidents"]


def test_incident_analyze_oom_matches_inc103():
    """Verify /incident/analyze matches Kafka OOM crash incident INC-103."""
    payload = {
        "service": "notification-service",
        "error_message": "Container killed by Kubernetes OOMKilled (exit code 137)",
        "symptoms": ["Kafka consumer lag increasing"],
        "limit": 5,
        "include_reflection": False
    }
    response = client.post("/incident/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recalled_memories" in data
    assert "INC-103" in data["matched_historical_incidents"]
