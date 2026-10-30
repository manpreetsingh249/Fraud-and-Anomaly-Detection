from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AnalysisRunItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dataset_name: str
    total_records: int
    supervised_model: Optional[str] = None
    fraud_detected_count: int
    fraud_percentage: float
    anomaly_model: Optional[str] = None
    anomaly_detected_count: int
    anomaly_percentage: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    notes: Optional[str] = None
    created_at: datetime
