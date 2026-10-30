import os
from pathlib import Path
from typing import List

# Project root directory: D:\Fraud & Anomaly detection
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = BASE_DIR / "backend"

class Settings:
    PROJECT_NAME: str = "Fraud & Anomaly Detection System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Environment
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    
    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,"
            "http://localhost:3000,http://127.0.0.1:3000,"
            "http://localhost:8000,http://127.0.0.1:8000",
        ).split(",")
        if origin.strip()
    ]
    
    # Storage Paths
    DATA_DIR: Path = BASE_DIR / "data"
    MODELS_DIR: Path = BASE_DIR / "models"
    REPORTS_DIR: Path = BASE_DIR / "reports"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR / 'fraud_detection.db'}"
    )
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 250  # Allows Kaggle creditcard.csv (143 MB)
    
    # Machine Learning Defaults
    RANDOM_SEED: int = 42
    DEFAULT_TEST_SIZE: float = 0.20
    ANOMALY_CONTAMINATION: float = 0.01  # Expected ~1% anomalies in unsupervised setup

    def __init__(self):
        # Ensure critical storage folders exist
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.MODELS_DIR.mkdir(parents=True, exist_ok=True)
        self.REPORTS_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
