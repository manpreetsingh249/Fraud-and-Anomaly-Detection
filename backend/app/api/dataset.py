from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import List, Dict, Any, Optional

from backend.app.services.dataset_service import dataset_service
from backend.app.schemas.dataset import SampleGenerateRequest

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.get("")
def list_datasets():
    """Lists all available CSV datasets in storage."""
    return dataset_service.list_datasets()

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Uploads a CSV dataset file with size checking and validation."""
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")

    saved_path = await dataset_service.save_uploaded_csv(file)
    inspection = dataset_service.inspect_dataset(saved_path.name)
    return {
        "message": f"Dataset '{saved_path.name}' uploaded successfully.",
        "filename": saved_path.name,
        "inspection": inspection
    }

@router.post("/sample")
def generate_sample(request: SampleGenerateRequest = SampleGenerateRequest()):
    """Generates a verified synthetic sample dataset matching Kaggle's Credit Card format."""
    res = dataset_service.generate_and_save_sample(
        num_samples=request.num_samples,
        fraud_rate=request.fraud_rate
    )
    inspection = dataset_service.inspect_dataset(res["filename"])
    return {
        "message": res["message"],
        "filename": res["filename"],
        "inspection": inspection
    }

@router.get("/{filename}/preview")
def preview_dataset(filename: str):
    """Returns preview records and validation metrics for a specific dataset file."""
    return dataset_service.inspect_dataset(filename)
