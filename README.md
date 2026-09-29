<p align="center"><h1 align="center">🚀 ReplayOps</h1><p align="center"><b>Autonomous AI-Powered SRE & Incident Management Platform</b></p><p align="center"><img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge" /> <img src="https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=for-the-badge" /> <img src="https://img.shields.io/badge/Hackathon-Hack%20with%20Hyderabad-purple?style=for-the-badge" /></p></p>

## 🏗️ System Architecture
``mermaid
graph TD
    Client([API Client]) --> FastAPI[FastAPI Core]
    FastAPI --> Router[Predictive Router]
    Router --> Service[Core Service]
    Service --> PostMortem[Post-Mortem Analyzer]
    Service --> Hindsight[Hindsight Vector Client]
```n
## 🚀 Quick Start
``ash
git clone https://github.com/Harry-aura/replayops.git
cd replayops
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload
```