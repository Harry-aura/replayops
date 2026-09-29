"""Demonstration and Integration Test Client for ReplayOps.

Demonstrates:
1. Live incident ingestion into Hindsight.
2. Incident retrieval and reflection against past incidents (INC-101, INC-102, INC-103).
3. The exact Python SDK and service layer handoff interface for Harsha.
"""

import json
import sys
from pathlib import Path

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.service import incident_service
from backend.hindsight_client import hindsight_service, retain, recall, reflect


def run_demo():
    print("=" * 70)
    print(" REPLAYOPS BACKEND & HINDSIGHT PERSISTENT MEMORY DEMO")
    print("=" * 70)

    # 1. Test Ingestion of a Live Incident
    print("\n[Step 1] Ingesting Live Outage Webhook...")
    test_incident = {
        "service": "payment-service",
        "severity": "CRITICAL",
        "title": "Production Outage: Payment Gateways Hanging",
        "error_message": "redis.exceptions.ConnectionError: Connection pool exhausted. Maximum 50 connections reached.",
        "symptoms": [
            "HTTP 504 Gateway Timeout during checkout",
            "Redis client connection pool saturated at 50/50",
            "Checkout API response time degraded from 150ms to 45,000ms"
        ],
        "logs": "Traceback (most recent call last):\n  File 'payment/checkout.py', line 88, in create_session\n    redis_conn = pool.get_connection()\nredis.exceptions.ConnectionError: Connection pool exhausted",
        "tags": ["live-demo", "redis-pool", "stripe"]
    }

    ingest_result = incident_service.client.retain_incident(test_incident)
    print("-> Ingest Result:", json.dumps(ingest_result, indent=2))

    # 2. Test Retrieval & Analysis of Past Incidents
    print("\n[Step 2] Analyzing Outage & Querying Hindsight Retrieval API...")
    analysis = incident_service.client.recall(
        query="payment-service redis connection pool exhausted 504 gateway timeout",
        max_tokens=2048
    )

    print(f"-> Recalled {len(analysis)} memory units matching the query.")
    for i, mem in enumerate(analysis[:3], 1):
        print(f"\n   [Memory #{i} | Type: {mem['type']} | Score: {mem.get('score')}]")
        print(f"   {mem['text'][:180]}...")

    # 3. Test Agentic Reflection
    print("\n[Step 3] Running Hindsight Reflection for Root Cause & Remediation...")
    reflection = incident_service.client.reflect(
        query="What past incident is this similar to? What was the root cause, what action FAILED, and how do we resolve it?",
        context="Active incident: payment-service redis connection pool exhaustion",
        budget="mid"
    )

    print("\n-> Synthesized Hindsight Reflection:")
    print("-" * 50)
    print(reflection.get("analysis", ""))
    print("-" * 50)

    print("\n[Handoff to Harsha]")
    print("Harsha can now import: from backend.service import incident_service")
    print("or call: POST http://localhost:8000/incident/analyze")
    print("=" * 70)


if __name__ == "__main__":
    try:
        run_demo()
    finally:
        hindsight_service.close()
