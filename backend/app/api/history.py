from fastapi import APIRouter, HTTPException
from typing import List

from backend.app.database.session import SessionLocal
from backend.app.database.models import AnalysisRun
from backend.app.schemas.analysis import AnalysisRunItem

router = APIRouter(prefix="/history", tags=["History"])

@router.get("", response_model=List[AnalysisRunItem])
def get_analysis_history():
    """Retrieves all past transaction analysis records sorted by most recent."""
    db = SessionLocal()
    try:
        runs = db.query(AnalysisRun).order_by(AnalysisRun.id.desc()).all()
        return runs
    finally:
        db.close()

@router.delete("/{run_id}")
def delete_analysis_run(run_id: int):
    """Deletes an analysis run record from SQLite."""
    db = SessionLocal()
    try:
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Analysis run not found.")
        db.delete(run)
        db.commit()
        return {"message": f"Analysis run #{run_id} deleted successfully."}
    finally:
        db.close()

@router.post("/clear")
def clear_all_history():
    """Resets local development analysis history."""
    db = SessionLocal()
    try:
        deleted = db.query(AnalysisRun).delete()
        db.commit()
        return {"message": f"Successfully cleared {deleted} analysis records."}
    finally:
        db.close()
