from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

class ModelTrainRequest(BaseModel):
    filename: Optional[str] = None
    test_size: float = 0.20
    random_state: int = 42
    models_to_train: List[str] = ["logistic_regression", "random_forest", "isolation_forest"]

class SupervisedMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    pr_auc: Optional[float] = None
    confusion_matrix: List[List[int]]  # [[TN, FP], [FN, TP]]
    train_samples: int
    test_samples: int
    fraud_test_count: int

class AnomalyMetrics(BaseModel):
    total_samples: int
    anomalies_detected: int
    anomaly_percentage: float
    contamination: float
    score_min: float
    score_max: float
    score_mean: float

class ModelEvaluationItem(BaseModel):
    id: Optional[int] = None
    model_type: str
    model_name: str
    is_supervised: bool
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    pr_auc: Optional[float] = None
    confusion_matrix: Optional[List[List[int]]] = None
    anomaly_metrics: Optional[AnomalyMetrics] = None
    train_samples: int
    test_samples: int
    trained_at: Optional[datetime] = None

class ModelComparisonResponse(BaseModel):
    evaluations: List[ModelEvaluationItem]
    best_supervised_model: Optional[str] = None
    recommendations: List[str]
