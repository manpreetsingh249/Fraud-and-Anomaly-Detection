from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

def utc_now():
    return datetime.now(timezone.utc)

class DatasetMeta(Base):
    __tablename__ = "dataset_metadata"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    row_count = Column(Integer, nullable=False)
    column_count = Column(Integer, nullable=False)
    is_sample = Column(Boolean, default=False)
    has_ground_truth = Column(Boolean, default=False)
    fraud_count = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, default=utc_now)

class ModelEvaluation(Base):
    __tablename__ = "model_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(String(64), nullable=False)
    model_name = Column(String(128), nullable=False)
    is_supervised = Column(Boolean, default=True)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    pr_auc = Column(Float, nullable=True)
    confusion_matrix_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)
    train_samples = Column(Integer, default=0)
    test_samples = Column(Integer, default=0)
    trained_at = Column(DateTime, default=utc_now)

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_name = Column(String(255), nullable=False)
    total_records = Column(Integer, nullable=False)
    supervised_model = Column(String(64), nullable=True)
    fraud_detected_count = Column(Integer, default=0)
    fraud_percentage = Column(Float, default=0.0)
    anomaly_model = Column(String(64), nullable=True)
    anomaly_detected_count = Column(Integer, default=0)
    anomaly_percentage = Column(Float, default=0.0)
    high_risk_count = Column(Integer, default=0)
    medium_risk_count = Column(Integer, default=0)
    low_risk_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
