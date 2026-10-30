import json
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException

from backend.app.core.config import settings
from backend.app.database.session import SessionLocal
from backend.app.database.models import ModelEvaluation
from backend.ml.training.trainer import train_all_models
from backend.ml.inference.predictor import inference_engine

class MLService:
    @classmethod
    def train_models_pipeline(
        cls,
        filename: Optional[str] = None,
        test_size: float = 0.20,
        random_state: int = 42,
        models_to_train: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Loads dataset, trains models, records metrics in DB, reloads inference engine.
        """
        # Resolve dataset
        data_dir = settings.DATA_DIR
        if filename:
            from backend.app.services.dataset_service import dataset_service
            file_path = dataset_service.resolve_dataset_path(filename)
        else:
            # Look for creditcard.csv or sample_creditcard.csv
            if (data_dir / "creditcard.csv").exists():
                file_path = data_dir / "creditcard.csv"
            elif (data_dir / "sample_creditcard.csv").exists():
                file_path = data_dir / "sample_creditcard.csv"
            else:
                from backend.app.services.dataset_service import dataset_service
                dataset_service.generate_and_save_sample(num_samples=1500)
                file_path = data_dir / "sample_creditcard.csv"

        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Dataset file '{file_path.name}' not found.")

        # If full Kaggle dataset (284k rows), we can sample e.g. 50,000 rows for fast web training demo if needed,
        # or train directly. Let's read it:
        df = pd.read_csv(file_path)
        # If massive (>100k rows), take stratified sample of 30,000 to keep interactive training response within ~10 seconds
        if len(df) > 50000 and "Class" in df.columns:
            fraud_df = df[df["Class"] == 1]
            non_fraud_sample = df[df["Class"] == 0].sample(n=min(30000, len(df) - len(fraud_df)), random_state=random_state)
            df = pd.concat([fraud_df, non_fraud_sample]).sample(frac=1.0, random_state=random_state).reset_index(drop=True)

        train_results = train_all_models(
            df=df,
            test_size=test_size,
            random_state=random_state,
            models_to_train=models_to_train
        )

        # Store in Database
        db = SessionLocal()
        try:
            for m_key, m_eval in train_results["evaluations"].items():
                is_sup = m_eval["is_supervised"]
                metrics = m_eval["metrics"]
                
                db_eval = ModelEvaluation(
                    model_type=m_key,
                    model_name=m_eval["model_name"],
                    is_supervised=is_sup,
                    accuracy=metrics.get("accuracy") if is_sup else None,
                    precision=metrics.get("precision") if is_sup else metrics.get("fraud_precision"),
                    recall=metrics.get("recall") if is_sup else metrics.get("fraud_recall"),
                    f1_score=metrics.get("f1_score") if is_sup else None,
                    pr_auc=metrics.get("pr_auc") if is_sup else None,
                    confusion_matrix_json=json.dumps(metrics.get("confusion_matrix")) if is_sup else None,
                    metrics_json=json.dumps(metrics),
                    train_samples=train_results["train_samples"],
                    test_samples=train_results["test_samples"],
                    trained_at=datetime.now(timezone.utc)
                )
                db.add(db_eval)
            db.commit()
        finally:
            db.close()

        # Reload inference engine models in memory
        inference_engine.load_models()
        return train_results

    @classmethod
    def get_model_evaluations(cls) -> Dict[str, Any]:
        """Fetches latest evaluation results for all models."""
        db = SessionLocal()
        try:
            records = db.query(ModelEvaluation).order_by(ModelEvaluation.id.desc()).all()
            
            # Keep latest for each model_type
            latest_by_type = {}
            for r in records:
                if r.model_type not in latest_by_type:
                    cm = json.loads(r.confusion_matrix_json) if r.confusion_matrix_json else None
                    metrics_data = json.loads(r.metrics_json) if r.metrics_json else {}
                    
                    latest_by_type[r.model_type] = {
                        "id": r.id,
                        "model_type": r.model_type,
                        "model_name": r.model_name,
                        "is_supervised": r.is_supervised,
                        "accuracy": r.accuracy,
                        "precision": r.precision,
                        "recall": r.recall,
                        "f1_score": r.f1_score,
                        "pr_auc": r.pr_auc,
                        "confusion_matrix": cm,
                        "anomaly_metrics": metrics_data if not r.is_supervised else None,
                        "train_samples": r.train_samples,
                        "test_samples": r.test_samples,
                        "trained_at": r.trained_at.isoformat() if r.trained_at else None
                    }
                    
            evals_list = list(latest_by_type.values())
            
            # Recommendations
            recs = [
                "Random Forest provides superior Precision-Recall AUC on imbalanced fraud distributions compared to linear models.",
                "Logistic Regression serves as a strong, explainable baseline with lower compute footprint.",
                "Isolation Forest acts as an unsupervised safety net to catch unusual transaction structures without requiring labels."
            ]
            
            return {
                "evaluations": evals_list,
                "best_supervised_model": "random_forest" if "random_forest" in latest_by_type else None,
                "recommendations": recs
            }
        finally:
            db.close()

ml_service = MLService()
