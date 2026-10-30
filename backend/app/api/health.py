from fastapi import APIRouter
from sqlalchemy import text
from backend.app.core.config import settings
from backend.ml.inference.predictor import inference_engine
from backend.app.database.session import SessionLocal

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health_check():
    """Health check endpoint returning system status and model readiness."""
    db_connected = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db_connected = True
        db.close()
    except Exception:
        db_connected = False

    return {
        "status": "healthy",
        "database_connected": db_connected,
        "models_status": inference_engine.is_ready(),
        "storage": {
            "data_dir_exists": settings.DATA_DIR.exists(),
            "models_dir_exists": settings.MODELS_DIR.exists(),
            "reports_dir_exists": settings.REPORTS_DIR.exists()
        }
    }
