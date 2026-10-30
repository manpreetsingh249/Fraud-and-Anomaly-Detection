import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from pathlib import Path

from backend.app.core.config import settings
from backend.ml.preprocessing.cleaner import (
    REQUIRED_NUMERICAL_COLS, 
    TARGET_COL,
    clean_data_for_pipeline,
    normalize_column_names
)
from backend.ml.preprocessing.scaler import FraudPreprocessor
from backend.ml.evaluation.evaluator import (
    evaluate_supervised_model,
    evaluate_unsupervised_anomaly
)

class InferenceEngine:
    """
    Handles inference for single transactions and batches.
    Maintains clean separation between supervised fraud prediction and unsupervised anomaly detection.
    Supports:
      Operation A (Evaluation): Labeled datasets containing 'Class' compute full classification metrics.
      Operation B (Prediction): Unlabeled datasets output calibrated probabilities and anomaly scores without inventing accuracy.
    """
    def __init__(self):
        self.preprocessor: Optional[FraudPreprocessor] = None
        self.supervised_models: Dict[str, Any] = {}
        self.anomaly_model: Optional[Any] = None
        self.load_models()

    def load_models(self):
        """Loads available models and preprocessor from disk."""
        preprocessor_path = settings.MODELS_DIR / "preprocessor.joblib"
        if preprocessor_path.exists():
            self.preprocessor = FraudPreprocessor.load(preprocessor_path)
            
        for model_key in ["logistic_regression", "random_forest"]:
            mpath = settings.MODELS_DIR / f"{model_key}.joblib"
            if mpath.exists():
                self.supervised_models[model_key] = joblib.load(mpath)
                
        iforest_path = settings.MODELS_DIR / "isolation_forest.joblib"
        if iforest_path.exists():
            self.anomaly_model = joblib.load(iforest_path)

    def is_ready(self) -> Dict[str, bool]:
        """Returns readiness status for inference components."""
        return {
            "preprocessor": self.preprocessor is not None,
            "logistic_regression": "logistic_regression" in self.supervised_models,
            "random_forest": "random_forest" in self.supervised_models,
            "isolation_forest": self.anomaly_model is not None
        }

    def predict_batch(
        self,
        df: pd.DataFrame,
        supervised_model_name: str = "random_forest",
        run_anomaly_check: bool = True
    ) -> Dict[str, Any]:
        """
        Executes batch inference across a DataFrame.
        """
        self.load_models()
        
        if self.preprocessor is None:
            raise RuntimeError("Models have not been trained yet. Please train models or load pre-trained artifacts first.")

        if df is None or len(df) == 0:
            raise ValueError("Input dataset contains 0 records. Please provide a valid CSV with transaction rows.")

        # Robustly clean and normalize columns
        df_clean, cleaning_meta = clean_data_for_pipeline(df)

        # Ensure required numerical columns exist
        missing_features = [col for col in REQUIRED_NUMERICAL_COLS if col not in df_clean.columns]
        if missing_features:
            sample_miss = missing_features[:5]
            suffix = "..." if len(missing_features) > 5 else ""
            raise ValueError(
                f"Missing required feature columns ({len(missing_features)} missing): {', '.join(sample_miss)}{suffix}. "
                f"The credit card model expects: Time, V1..V28, and Amount."
            )

        X_raw = df_clean[REQUIRED_NUMERICAL_COLS]
        X_scaled = self.preprocessor.transform(X_raw)

        # 1. Supervised Fraud Prediction
        if supervised_model_name not in self.supervised_models:
            if self.supervised_models:
                supervised_model_name = list(self.supervised_models.keys())[0]
            else:
                raise RuntimeError(f"Requested model '{supervised_model_name}' is not trained.")

        model = self.supervised_models[supervised_model_name]
        probas = model.predict_proba(X_scaled)[:, 1]
        preds = (probas >= 0.5).astype(int)

        # 2. Unsupervised Anomaly Detection
        if run_anomaly_check and self.anomaly_model is not None:
            anomaly_flags = self.anomaly_model.predict(X_scaled)  # -1 (anomaly) or 1 (inlier)
            anomaly_scores = self.anomaly_model.decision_function(X_scaled)
        else:
            anomaly_flags = np.ones(len(df_clean), dtype=int)
            anomaly_scores = np.zeros(len(df_clean), dtype=float)

        # Risk classification tiers
        risk_levels = []
        for p in probas:
            if p >= 0.70:
                risk_levels.append("High")
            elif p >= 0.25:
                risk_levels.append("Medium")
            else:
                risk_levels.append("Low")

        has_ground_truth = TARGET_COL in df_clean.columns
        ground_truth = None
        if has_ground_truth:
            try:
                ground_truth = pd.to_numeric(df_clean[TARGET_COL], errors='coerce').fillna(0).astype(int).values
            except Exception:
                has_ground_truth = False

        records = []
        for i in range(len(df_clean)):
            records.append({
                "index": i + 1,
                "Time": round(float(df_clean["Time"].iloc[i]), 1),
                "Amount": round(float(df_clean["Amount"].iloc[i]), 2),
                "fraud_prediction": int(preds[i]),
                "fraud_probability": round(float(probas[i]), 4),
                "risk_level": risk_levels[i],
                "anomaly_flag": int(anomaly_flags[i]),
                "anomaly_score": round(float(anomaly_scores[i]), 4),
                "ground_truth": int(ground_truth[i]) if has_ground_truth and ground_truth is not None else None
            })

        total = len(records)
        fraud_count = int(np.sum(preds == 1))
        anomaly_count = int(np.sum(anomaly_flags == -1))

        risk_counts = {
            "Low": int(risk_levels.count("Low")),
            "Medium": int(risk_levels.count("Medium")),
            "High": int(risk_levels.count("High"))
        }

        # Operation A vs Operation B: Evaluation vs Prediction
        evaluation_result = None
        unsupervised_eval = None
        if has_ground_truth and ground_truth is not None:
            # Operation A: Labeled Evaluation
            evaluation_result = evaluate_supervised_model(
                y_true=ground_truth,
                y_pred=preds,
                y_proba=probas
            )
            evaluation_result["is_labeled"] = True
            evaluation_result["operation_mode"] = "Evaluation (Ground Truth Available)"
            
            # Confusion matrix breakdown
            cm = evaluation_result.get("confusion_matrix", [[0, 0], [0, 0]])
            evaluation_result["true_negatives"] = cm[0][0]
            evaluation_result["false_positives"] = cm[0][1]
            evaluation_result["false_negatives"] = cm[1][0]
            evaluation_result["true_positives"] = cm[1][1]

            unsupervised_eval = evaluate_unsupervised_anomaly(
                scores=anomaly_scores,
                flags=anomaly_flags,
                y_true=ground_truth
            )
        else:
            # Operation B: Unlabeled Prediction
            evaluation_result = {
                "is_labeled": False,
                "operation_mode": "Prediction (Unlabeled Dataset)",
                "message": "Dataset does not contain 'Class' ground-truth labels. Displaying model predictions and calibrated probabilities without ground-truth metrics."
            }
            unsupervised_eval = evaluate_unsupervised_anomaly(
                scores=anomaly_scores,
                flags=anomaly_flags,
                y_true=None
            )

        return {
            "total_records": total,
            "supervised_model": supervised_model_name,
            "fraud_detected_count": fraud_count,
            "fraud_percentage": round((fraud_count / total) * 100, 2) if total > 0 else 0.0,
            "anomaly_detected_count": anomaly_count,
            "anomaly_percentage": round((anomaly_count / total) * 100, 2) if total > 0 else 0.0,
            "risk_counts": risk_counts,
            "has_ground_truth": has_ground_truth,
            "evaluation": evaluation_result,
            "unsupervised_evaluation": unsupervised_eval,
            "cleaning_metadata": cleaning_meta,
            "results": records
        }

inference_engine = InferenceEngine()
