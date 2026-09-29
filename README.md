# ReplayOps: Backend Architecture & Hindsight Core

> **Role (Member 1 - Sai)**: Backend Architecture & Hindsight Persistent Memory Core  
> **Bank ID**: `replayops-bank`  
> **API URL**: `https://api.hindsight.vectorize.io`  
> **Promo Code**: `MEMHACK99`  

---

## 1. What This Role Built

As Member 1 (**Sai: Backend Architecture & Hindsight Core**), you have built the **central nervous system** of ReplayOps:
1. **FastAPI Server (`backend/main.py`)**: High-performance asynchronous API server with CORS enabled, lifespan lifecycle handlers, and comprehensive OpenAPI documentation.
2. **Hindsight Memory Client (`backend/hindsight_client.py`)**: Production-ready wrapper connecting to Hindsight Cloud. Supports both async and sync execution of the core memory cycle:
   - **`retain` / `aretain`**: Ingest and structure incoming alerts and incident post-mortems into persistent memory.
   - **`recall` / `arecall`**: Sub-second multi-strategy search (semantic, keyword, graph, and temporal) for matching past incidents.
   - **`reflect` / `areflect`**: Deep agentic reasoning over stored memories to synthesize root causes, failed mitigation warnings, and proven fixes.
3. **Historical Incidents Dataset (`data/historical_incidents.json`)**: Curated repository of production incidents:
   - **INC-101**: Payment Service - Redis Connection Pool Exhaustion under checkout traffic spike.
   - **INC-102**: Auth Service - PostgreSQL Database Deadlock on user session verification.
   - **INC-103**: Notification Service - Kubernetes OOMKilled Heap Crash on Kafka batch ingestion.
4. **Automated Seeder (`backend/seed_data.py`)**: Tooling to ingest historical incidents into the Hindsight memory bank.
5. **Memory-Retrieval Service Layer (`backend/service.py`)**: Dedicated domain layer prepared for clean handoff to Harsha (Member 2) for multi-agent reasoning.

---

## 2. Directory Structure

```text
replayops/
├── backend/
│   ├── __init__.py
│   ├── config.py             # Environment & settings loader
│   ├── hindsight_client.py   # Core Hindsight retain/recall/reflect wrapper
│   ├── main.py               # FastAPI application & REST endpoints
│   ├── seed_data.py          # Script to seed INC-101, INC-102, INC-103
│   ├── service.py            # Domain service layer for incident triage
│   └── test_client.py        # End-to-end integration demo script
├── data/
│   └── historical_incidents.json  # Rich incident dataset
├── tests/
│   └── test_api.py           # Pytest test suite (7 automated tests)
├── .env                      # Real environment credentials
├── .env.example              # Template configuration
├── requirements.txt          # Python dependencies
└── README.md                 # Complete documentation & handoff guide
```

---

## 3. Environment Configuration (`.env`)

```ini
# Hindsight Persistent Memory Settings
HINDSIGHT_API_KEY=hsk_e4eaa698a824ce42dce1ccb80d69d1c4_c940838f12eddbec
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_ID=replayops-bank
HINDSIGHT_PROMO_CODE=MEMHACK99

# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=*
```

---

## 4. API Endpoints

### `POST /incident/ingest`
Receives live outage alerts/webhooks and persists them to Hindsight memory.

**Payload:**
```json
{
  "service": "payment-service",
  "severity": "CRITICAL",
  "title": "Payment gateway latency spike",
  "error_message": "redis.exceptions.ConnectionError: Connection pool exhausted. Maximum 50 connections reached.",
  "symptoms": [
    "HTTP 504 Gateway Timeout during checkout",
    "Redis client connection pool saturated at 50/50"
  ],
  "logs": "Traceback ... Connection pool exhausted",
  "tags": ["stripe", "redis", "checkout"]
}
```

### `POST /incident/analyze`
Queries Hindsight retrieval API to identify past similar incidents and synthesizes root-cause insights with **WHAT NOT TO DO** warnings.

**Payload:**
```json
{
  "service": "payment-service",
  "error_message": "redis.exceptions.ConnectionError: Connection pool exhausted",
  "symptoms": ["HTTP 504 Gateway Timeout"],
  "limit": 5,
  "include_reflection": true
}
```

**Response:**
```json
{
  "search_query": "Service: payment-service | Error: redis.exceptions.ConnectionError: Connection pool exhausted | Symptoms: HTTP 504 Gateway Timeout",
  "target_service": "payment-service",
  "matched_historical_incidents": ["INC-101"],
  "recalled_memories_count": 45,
  "recalled_memories": [ ... ],
  "hindsight_reflection": "## Incident Analysis: Redis Connection Pool Exhaustion (INC-101)...",
  "bank_id": "replayops-bank"
}
```

### Utility & Health Endpoints
- `GET /health`: Tests connectivity to Hindsight bank and returns status.
- `GET /incident/history`: Returns raw historical dataset from `historical_incidents.json`.
- `POST /memory/retain`: Direct retention interface for arbitrary memories.
- `POST /memory/recall`: Direct recall search.
- `POST /memory/reflect`: Direct reflection synthesis.

---

## 5. Handoff to Harsha (Member 2: Multi-Agent Reasoning)

Harsha can integrate with this persistent memory layer in two ways:

### Option A: Python Import (Direct Service Layer)
```python
from backend.service import incident_service

# 1. Ingest an incident from agent workflow
result = await incident_service.ingest_incident({
    "service": "auth-service",
    "title": "Deadlock in SSO token verification",
    "error_message": "asyncpg.exceptions.DeadlockDetectedError: deadlock detected on relation user_sessions",
    "symptoms": ["SSO login failures spiking"]
})

# 2. Query Hindsight for similar past incidents and agentic reflection
analysis = await incident_service.analyze_incident(
    service="auth-service",
    error_message="Deadlock detected on relation user_sessions",
    symptoms=["SSO login failures spiking"],
    include_reflection=True
)

# Extract matched incidents and reflection
matched_ids = analysis["matched_historical_incidents"]  # e.g. ['INC-102']
reflection_text = analysis["hindsight_reflection"]      # Synthesized root cause & failed action warnings
```

### Option B: HTTP REST Call
Harsha's agents can send HTTP `POST` requests to `http://localhost:8000/incident/analyze`.

---

## 6. How to Run & Verify

### Step 1: Seed Historical Incidents
```bash
python backend/seed_data.py
```

### Step 2: Run Automated Pytest Suite
```bash
python -m pytest tests/test_api.py -v
```

### Step 3: Run the Demonstration Client
```bash
python backend/test_client.py
```

### Step 4: Start the FastAPI Server
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger docs available at: `http://localhost:8000/docs`.
