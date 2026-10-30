from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    missing_count: int
    sample_values: List[Any]

class DatasetValidationResult(BaseModel):
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    missing_columns: List[str]
    present_columns: List[str]
    has_ground_truth: bool

class DatasetStats(BaseModel):
    total_rows: int
    total_columns: int
    missing_cells: int
    duplicate_rows: int
    has_ground_truth: bool
    fraud_count: Optional[int] = None
    fraud_percentage: Optional[float] = None
    columns: List[ColumnInfo]

class DatasetSummaryResponse(BaseModel):
    filename: str
    is_sample: bool
    stats: DatasetStats
    preview: List[Dict[str, Any]]

class SampleGenerateRequest(BaseModel):
    num_samples: int = 1000
    fraud_rate: float = 0.02
