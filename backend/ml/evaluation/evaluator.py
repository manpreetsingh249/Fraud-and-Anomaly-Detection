import numpy as np
from typing import Dict, Any, Optional
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    precision_recall_curve,
    auc
)

def evaluate_supervised_model(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_proba: Optional[np.ndarray] = None
) -> Dict[str, Any]:
    """
    Evaluates supervised classification with emphasis on imbalanced metrics:
    Precision, Recall, F1, PR-AUC, and Confusion Matrix.
    """
    acc = float(accuracy_score(y_true, y_pred))
    # zero_division=0 prevents division by zero warning if no positive cases predicted
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    # Confusion Matrix: [[TN, FP], [FN, TP]]
    cm = confusion_matrix(y_true, y_pred)
    # Ensure standard 2x2 layout even if only one class exists in small test slice
    if cm.shape == (1, 1):
        # Degenerate case
        cm_list = [[int(cm[0, 0]), 0], [0, 0]]
    elif cm.shape == (2, 2):
        cm_list = cm.astype(int).tolist()
    else:
        cm_list = [[0, 0], [0, 0]]
        
    pr_auc = None
    if y_proba is not None:
        try:
            precision_pts, recall_pts, _ = precision_recall_curve(y_true, y_proba)
            pr_auc = float(auc(recall_pts, precision_pts))
        except Exception:
            pr_auc = None
            
    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "pr_auc": round(pr_auc, 4) if pr_auc is not None else None,
        "confusion_matrix": cm_list,
        "total_test_samples": int(len(y_true)),
        "actual_fraud_count": int(np.sum(y_true == 1)),
        "predicted_fraud_count": int(np.sum(y_pred == 1))
    }

def evaluate_unsupervised_anomaly(
    scores: np.ndarray,
    flags: np.ndarray,
    y_true: Optional[np.ndarray] = None
) -> Dict[str, Any]:
    """
    Evaluates unsupervised anomaly detection (Isolation Forest).
    Reports anomaly counts, score distribution, and threshold.
    Only computes classification metrics if ground-truth labels are explicitly provided.
    """
    total = len(flags)
    # IsolationForest outputs -1 for anomaly, 1 for inlier
    anomalies_detected = int(np.sum(flags == -1))
    anomaly_percentage = round((anomalies_detected / total) * 100, 2) if total > 0 else 0.0
    
    metrics = {
        "total_samples": total,
        "anomalies_detected": anomalies_detected,
        "anomaly_percentage": anomaly_percentage,
        "score_min": round(float(np.min(scores)), 4),
        "score_max": round(float(np.max(scores)), 4),
        "score_mean": round(float(np.mean(scores)), 4),
        "score_std": round(float(np.std(scores)), 4),
    }
    
    # If ground-truth labels exist, report supplementary comparison strictly for academic analysis
    if y_true is not None:
        # Convert -1 -> 1 (anomaly), 1 -> 0 (normal)
        binary_pred = (flags == -1).astype(int)
        metrics["ground_truth_available"] = True
        metrics["overlap_with_fraud"] = int(np.sum((binary_pred == 1) & (y_true == 1)))
        metrics["fraud_recall"] = round(float(recall_score(y_true, binary_pred, zero_division=0)), 4)
        metrics["fraud_precision"] = round(float(precision_score(y_true, binary_pred, zero_division=0)), 4)
    else:
        metrics["ground_truth_available"] = False
        
    return metrics
