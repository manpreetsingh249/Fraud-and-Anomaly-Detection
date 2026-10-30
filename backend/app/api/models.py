from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional

from backend.app.schemas.models import ModelTrainRequest
from backend.app.services.ml_service import ml_service
from backend.ml.inference.predictor import inference_engine

router = APIRouter(prefix="/models", tags=["Models"])

@router.get("/status")
def get_model_status():
    """Returns the readiness status of models on disk."""
    return inference_engine.is_ready()

@router.post("/train")
def train_models(request: ModelTrainRequest = ModelTrainRequest()):
    """Triggers end-to-end model training, evaluation, and persistence."""
    try:
        results = ml_service.train_models_pipeline(
            filename=request.filename,
            test_size=request.test_size,
            random_state=request.random_state,
            models_to_train=request.models_to_train
        )
        return {
            "message": "Models trained and evaluated successfully.",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/evaluations")
def get_model_evaluations():
    """Returns stored evaluation metrics for all trained models."""
    return ml_service.get_model_evaluations()
