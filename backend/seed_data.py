"""Seed script to populate Hindsight persistent memory with historical incidents.

Reads data/historical_incidents.json and retains INC-101, INC-102, INC-103
into the Hindsight bank ('replayops-bank').
"""

import json
import logging
import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.hindsight_client import hindsight_service
from backend.config import settings

logger = logging.getLogger("replayops.seed")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def load_historical_incidents(file_path: Path | None = None) -> list[dict]:
    """Load historical incidents from the JSON data file."""
    target_path = file_path or (ROOT_DIR / "data" / "historical_incidents.json")
    if not target_path.exists():
        raise FileNotFoundError(f"Historical incidents file not found at: {target_path}")

    with open(target_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def seed_hindsight_memory(dry_run: bool = False) -> list[dict]:
    """Seed all historical incidents into the Hindsight memory bank."""
    incidents = load_historical_incidents()
    logger.info("Found %d historical incidents to seed into bank '%s'", len(incidents), settings.HINDSIGHT_BANK_ID)

    results = []
    for inc in incidents:
        inc_id = inc.get("incident_id")
        title = inc.get("title")
        service = inc.get("service")

        logger.info("Processing [%s] (%s): %s", inc_id, service, title)

        if dry_run:
            logger.info("[DRY RUN] Would retain incident: %s", inc_id)
            results.append({"incident_id": inc_id, "status": "simulated"})
            continue

        try:
            res = hindsight_service.retain_incident(inc)
            logger.info("Successfully retained [%s] into Hindsight memory! Details: %s", inc_id, res)
            results.append({"incident_id": inc_id, "status": "success", "response": res})
        except Exception as e:
            logger.error("Failed to retain [%s]: %s", inc_id, e)
            results.append({"incident_id": inc_id, "status": "error", "error": str(e)})

    logger.info("Seeding completed. Successfully processed %d/%d incidents.",
                len([r for r in results if r.get("status") == "success"]), len(incidents))
    hindsight_service.close()
    return results


if __name__ == "__main__":
    is_dry = "--dry-run" in sys.argv
    print(f"Starting Hindsight seed process (Bank: {settings.HINDSIGHT_BANK_ID})...")
    seed_results = seed_hindsight_memory(dry_run=is_dry)
    print("\n--- Summary of Seeding ---")
    for r in seed_results:
        print(f"Incident: {r['incident_id']} -> Status: {r['status']}")
    print("Done!")
