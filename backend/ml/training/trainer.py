import os
import joblib
import json
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest

from backend.app.core.config import settings
from backend.ml.preprocessing.cleaner import (
    REQUIRED_NUMERICAL_COLS,
    TARGET_COL,
    validate_dataset_schema,
    clean_data_for_pipeline
)
from backend.ml.preprocessing.scaler import FraudPreprocessor
from backend.ml.evaluation.evaluator import (
    evaluate_supervised_model,
    evaluate_unsupervised_anomaly
)

def train_all_models(
    df: pd.DataFrame,
    test_size: float = 0.20,
    random_state: int = 42,
    models_to_train: Optional[list] = None
) -> Dict[str, Any]:
    """
    Executes full leak-free ML training pipeline:
    1. Schema validation & basic cleanup.
    2. Stratified train/test split.
    3. Fits FraudPreprocessor ONLY on training set.
    4. Trains Logistic Regression, Random Forest Classifier, and Isolation Forest.
    5. Evaluates on held-out test set.
    6. Saves fitted models and preprocessor to disk.
    """
    if models_to_train is None:
        models_to_train = ["logistic_regression", "random_forest", "isolation_forest"]

    # 1. Validation
    validation = validate_dataset_schema(df)
    if not validation["is_valid"]:
        raise ValueError(f"Dataset validation failed: {'; '.join(validation['errors'])}")
        
    df_clean, clean_meta = clean_data_for_pipeline(df)
    has_labels = validation["has_ground_truth"]
    
    if not has_labels and any(m in models_to_train for m in ["logistic_regression", "random_forest"]):
        raise ValueError("Supervised models require a 'Class' column with ground-truth fraud labels (0=legitimate, 1=fraud).")
        
    X_raw = df_clean[REQUIRED_NUMERICAL_COLS]
    
    # 2. Train / Test Split
    if has_labels:
        y_raw = df_clean[TARGET_COL].astype(int).values
        # Stratified split to ensure both splits have proportional fraud cases
        X_train, X_test, y_train, y_test = train_test_split(
            X_raw, y_raw,
            test_size=test_size,
            random_state=random_state,
            stratify=y_raw
        )
    else:
        # Unsupervised only
        X_train, X_test = train_test_split(
            X_raw,
            test_size=test_size,
            random_state=random_state
        )
        y_train, y_test = None, None

    # 3. Fit Preprocessor STRICTLY on X_train (No Data Leakage)
    preprocessor = FraudPreprocessor()
    preprocessor.fit(X_train)
    X_train_scaled = preprocessor.transform(X_train)
    X_test_scaled = preprocessor.transform(X_test)
    
    # Save Preprocessor
    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    preprocessor_path = settings.MODELS_DIR / "preprocessor.joblib"
    preprocessor.save(preprocessor_path)

    results = {
        "preprocessor_saved": str(preprocessor_path),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "evaluations": {}
    }

    # Model A: Logistic Regression (Supervised Baseline)
    if "logistic_regression" in models_to_train and has_labels:
        lr_model = LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            random_state=random_state,
            solver="lbfgs"
        )
        lr_model.fit(X_train_scaled, y_train)
        y_pred = lr_model.predict(X_test_scaled)
        y_proba = lr_model.predict_proba(X_test_scaled)[:, 1]
        
        eval_metrics = evaluate_supervised_model(y_test, y_pred, y_proba)
        model_path = settings.MODELS_DIR / "logistic_regression.joblib"
        joblib.dump(lr_model, model_path)
        
        results["evaluations"]["logistic_regression"] = {
            "model_name": "Logistic Regression",
            "is_supervised": True,
            "metrics": eval_metrics,
            "model_path": str(model_path)
        }

    # Model B: Random Forest Classifier (Supervised Ensemble)
    if "random_forest" in models_to_train and has_labels:
        # Use balanced class weight and moderate depth for fast, accurate generalization
        rf_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1
        )
        rf_model.fit(X_train_scaled, y_train)
        y_pred = rf_model.predict(X_test_scaled)
        y_proba = rf_model.predict_proba(X_test_scaled)[:, 1]
        
        eval_metrics = evaluate_supervised_model(y_test, y_pred, y_proba)
        model_path = settings.MODELS_DIR / "random_forest.joblib"
        joblib.dump(rf_model, model_path)
        
        results["evaluations"]["random_forest"] = {
            "model_name": "Random Forest Classifier",
            "is_supervised": True,
            "metrics": eval_metrics,
            "model_path": str(model_path)
        }

    # Model C: Isolation Forest (Unsupervised Anomaly Detection)
    if "isolation_forest" in models_to_train:
        # Unsupervised: trained without y labels
        contamination = settings.ANOMALY_CONTAMINATION
        if has_labels and y_train is not None:
            # Empirical contamination approximation from data, or 0.01 default
            actual_fraud_rate = float(np.mean(y_train == 1))
            contamination = max(0.005, min(0.05, actual_fraud_rate))
            
        iso_forest = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1
        )
        iso_forest.fit(X_train_scaled)
        
        # In test set: -1 is anomaly, 1 is normal
        flags = iso_forest.predict(X_test_scaled)
        # decision_function: lower score = more anomalous
        scores = iso_forest.decision_function(X_test_scaled)
        
        iso_eval = evaluate_unsupervised_anomaly(
            scores=scores,
            flags=flags,
            y_true=y_test if has_labels else None
        )
        iso_eval["contamination"] = contamination
        
        model_path = settings.MODELS_DIR / "isolation_forest.joblib"
        joblib.dump(iso_forest, model_path)
        
        results["evaluations"]["isolation_forest"] = {
            "model_name": "Isolation Forest",
            "is_supervised": False,
            "metrics": iso_eval,
            "model_path": str(model_path)
        }

    return results
