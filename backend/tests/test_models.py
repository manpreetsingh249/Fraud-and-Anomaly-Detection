import pytest
import numpy as np
from backend.ml.preprocessing.cleaner import generate_sample_creditcard_dataset
from backend.ml.training.trainer import train_all_models
from backend.ml.evaluation.evaluator import evaluate_supervised_model, evaluate_unsupervised_anomaly

def test_supervised_metrics_calculation():
    y_true = np.array([0, 0, 0, 1, 1, 0, 0, 1])
    y_pred = np.array([0, 0, 0, 1, 0, 0, 1, 1])
    y_proba = np.array([0.1, 0.2, 0.1, 0.9, 0.3, 0.2, 0.8, 0.95])

    metrics = evaluate_supervised_model(y_true, y_pred, y_proba)
    assert "accuracy" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "f1_score" in metrics
    assert "pr_auc" in metrics
    assert "confusion_matrix" in metrics
    assert len(metrics["confusion_matrix"]) == 2

def test_unsupervised_metrics_calculation():
    scores = np.array([-0.3, -0.2, 0.1, 0.4, 0.5])
    flags = np.array([-1, -1, 1, 1, 1])
    
    metrics = evaluate_unsupervised_anomaly(scores, flags)
    assert metrics["anomalies_detected"] == 2
    assert metrics["anomaly_percentage"] == 40.0
    assert metrics["score_min"] == -0.3

def test_train_all_models():
    df = generate_sample_creditcard_dataset(num_samples=250, fraud_rate=0.04)
    results = train_all_models(df, test_size=0.20, random_state=42)
    
    assert "evaluations" in results
    evals = results["evaluations"]
    assert "logistic_regression" in evals
    assert "random_forest" in evals
    assert "isolation_forest" in evals

    # Check that supervised models have recall and precision
    rf_metrics = evals["random_forest"]["metrics"]
    assert "recall" in rf_metrics
    assert "precision" in rf_metrics
    assert "confusion_matrix" in rf_metrics

    # Check isolation forest
    iso_metrics = evals["isolation_forest"]["metrics"]
    assert "anomalies_detected" in iso_metrics
