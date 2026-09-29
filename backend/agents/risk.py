from __future__ import annotations
import logging
from typing import Any

logger = logging.getLogger("replayops.agents.risk")

class RiskAgent:
    """Specialized agent to flag dangerous options or destructive workflows."""
    
    async def evaluate_risk(self, proposed_action: str) -> dict[str, Any]:
        logger.info("RiskAgent evaluating action: %s", proposed_action)
        dangerous_keywords = ["drop database", "restart cluster", "rm -rf", "force delete"]
        
        is_dangerous = any(kw in proposed_action.lower() for kw in dangerous_keywords)
        
        return {
            "agent": "RiskAgent",
            "action": proposed_action,
            "is_safe": not is_dangerous,
            "safety_score": 9.9 if not is_dangerous else 1.0,
            "warning": "Destructive restart flagged based on historical failure INC-101." if is_dangerous else None
        }

risk_agent = RiskAgent()