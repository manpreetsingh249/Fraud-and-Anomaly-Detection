from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class SingleTransactionInput(BaseModel):
    Time: Optional[float] = 0.0
    Amount: float
    features: Dict[str, float]  # V1 to V28
    supervised_model: str = "random_forest"
    run_anomaly_detection: bool = True

class PredictionItem(BaseModel):
    index: int
    Time: Optional[float] = 0.0
    Amount: float
    fraud_prediction: int  # 0 or 1
    fraud_probability: float  # [0.0, 1.0]
    risk_level: str  # "Low", "Medium", "High"
    anomaly_flag: int  # -1 (outlier) or 1 (normal)
    anomaly_score: float
    ground_truth: Optional[int] = None

class BatchPredictRequest(BaseModel):
    filename: Optional[str] = None
    supervised_model: str = "random_forest"
    run_anomaly_detection: bool = True
    save_run: bool = True

class BatchPredictResponse(BaseModel):
    run_id: Optional[int] = None
    total_records: int
    supervised_model: str
    fraud_detected_count: int
    fraud_percentage: float
    anomaly_detected_count: int
    anomaly_percentage: float
    risk_counts: Dict[str, int]  # {"Low": N, "Medium": N, "High": N}
    has_ground_truth: Optional[bool] = False
    evaluation: Optional[Dict[str, Any]] = None
    unsupervised_evaluation: Optional[Dict[str, Any]] = None
    cleaning_metadata: Optional[Dict[str, Any]] = None
    results: List[PredictionItem]
