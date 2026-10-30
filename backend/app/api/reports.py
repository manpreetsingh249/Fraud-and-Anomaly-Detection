from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path

from backend.app.services.report_service import report_service
from backend.app.services.ml_service import ml_service

router = APIRouter(prefix="/reports", tags=["Reports"])

class ExportCsvRequest(BaseModel):
    results: List[Dict[str, Any]]
    filename_prefix: Optional[str] = "fraud_analysis"

class ExportPdfRequest(BaseModel):
    run_data: Dict[str, Any]
    output_filename: Optional[str] = "audit_report.pdf"

@router.post("/export-csv")
def export_results_csv(request: ExportCsvRequest):
    """Exports transaction records into a downloadable CSV file."""
    if not request.results:
        raise HTTPException(status_code=400, detail="Cannot export empty results list.")
        
    csv_path = report_service.export_csv(
        results=request.results,
        filename_prefix=request.filename_prefix or "fraud_analysis"
    )
    return FileResponse(
        path=str(csv_path),
        filename=csv_path.name,
        media_type="text/csv"
    )

@router.post("/export-pdf")
def export_summary_pdf(request: ExportPdfRequest):
    """Generates and downloads a formal academic audit summary report in PDF format."""
    try:
        eval_data = ml_service.get_model_evaluations()
        pdf_path = report_service.generate_pdf_report(
            run_data=request.run_data,
            eval_data=eval_data,
            output_filename=request.output_filename or "audit_report.pdf"
        )
        return FileResponse(
            path=str(pdf_path),
            filename=pdf_path.name,
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
