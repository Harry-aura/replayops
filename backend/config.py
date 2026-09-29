"""Configuration module for ReplayOps backend.

Loads environment variables securely from .env and system environment.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Path to project root and .env file
ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)
else:
    load_dotenv()

class Settings:
    """Application settings and configuration parameters."""
    
    # Hindsight Configuration
    HINDSIGHT_API_KEY: str = os.getenv(
        "HINDSIGHT_API_KEY",
        "hsk_e4eaa698a824ce42dce1ccb80d69d1c4_c940838f12eddbec"
    )
    HINDSIGHT_API_URL: str = os.getenv(
        "HINDSIGHT_API_URL",
        "https://api.hindsight.vectorize.io"
    )
    HINDSIGHT_BANK_ID: str = os.getenv("HINDSIGHT_BANK_ID", "replayops-bank")
    HINDSIGHT_PROMO_CODE: str = os.getenv("HINDSIGHT_PROMO_CODE", "MEMHACK99")
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS Configuration
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ]

settings = Settings()
