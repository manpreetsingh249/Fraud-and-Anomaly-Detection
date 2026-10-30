import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.config import settings
from backend.ml.preprocessing.cleaner import (
    normalize_column_names,
    validate_dataset_schema,
    clean_data_for_pipeline,
    generate_sample_creditcard_dataset
)
from backend.ml.inference.predictor import inference_engine

def test_operation_a_labeled_evaluation():
    """Verify Operation A: Evaluation on labeled dataset computes full ground-truth metrics."""
    with TestClient(app) as client:
        # Generate sample labeled dataset
        res = client.post("/api/datasets/sample", json={"num_samples": 200, "fraud_rate": 0.05})
        assert res.status_code == 200

        # Execute batch prediction
        response = client.post("/api/predict/batch", json={
            "filename": "sample_creditcard.csv",
            "supervised_model": "random_forest",
            "run_anomaly_detection": True,
            "save_run": False
        })
        assert response.status_code == 200
        data = response.json()

        # Must indicate ground truth is present
        assert data["has_ground_truth"] is True
        assert "evaluation" in data
        eval_meta = data["evaluation"]
        assert eval_meta["is_labeled"] is True
        assert "precision" in eval_meta
        assert "recall" in eval_meta
        assert "f1_score" in eval_meta
        assert "accuracy" in eval_meta
        assert "confusion_matrix" in eval_meta
        assert len(eval_meta["confusion_matrix"]) == 2
        assert "true_positives" in eval_meta
        assert "false_positives" in eval_meta
        assert "true_negatives" in eval_meta
        assert "false_negatives" in eval_meta

def test_operation_b_unlabeled_prediction():
    """Verify Operation B: Prediction on unlabeled dataset outputs probabilities without inventing ground truth metrics."""
    # Create an unlabeled test dataset (no 'Class' column)
    df_sample = generate_sample_creditcard_dataset(num_samples=100, fraud_rate=0.03)
    df_unlabeled = df_sample.drop(columns=["Class"])
    unlabeled_path = settings.DATA_DIR / "test_unlabeled.csv"
    df_unlabeled.to_csv(unlabeled_path, index=False)

    try:
        with TestClient(app) as client:
            response = client.post("/api/predict/batch", json={
                "filename": "test_unlabeled.csv",
                "supervised_model": "random_forest",
                "run_anomaly_detection": True,
                "save_run": False
            })
            assert response.status_code == 200
            data = response.json()

            # Must indicate no ground truth is present
            assert data["has_ground_truth"] is False
            assert data["evaluation"]["is_labeled"] is False
            # Verify predictions and calibrated probabilities exist for each transaction
            assert len(data["results"]) == 100
            for r in data["results"]:
                assert r["ground_truth"] is None
                assert 0.0 <= r["fraud_probability"] <= 1.0
                assert r["fraud_prediction"] in [0, 1]
                assert r["risk_level"] in ["Low", "Medium", "High"]
                assert r["anomaly_flag"] in [-1, 1]
    finally:
        unlabeled_path.unlink(missing_ok=True)

def test_column_normalization_and_aliasing():
    """Verify column normalization handles lowercasing, whitespace, and known aliases."""
    df_raw = pd.DataFrame({
        " time ": [10.0, 20.0],
        "amt": [50.0, 120.0],
        "is_fraud": [0, 1]
    })
    for i in range(1, 29):
        df_raw[f"v{i}"] = [0.1, -0.2]

    df_norm, remapped = normalize_column_names(df_raw)
    assert "Time" in df_norm.columns
    assert "Amount" in df_norm.columns
    assert "Class" in df_norm.columns
    assert "V1" in df_norm.columns
    assert "V28" in df_norm.columns
    assert len(remapped) > 0

def test_missing_columns_validation_error():
    """Verify invalid CSV with missing required columns returns informative HTTP 400."""
    invalid_df = pd.DataFrame({
        "TransactionID": [1, 2, 3],
        "CustomerName": ["Alice", "Bob", "Charlie"],
        "Amount": [10.5, 99.0, 500.0]
    })
    invalid_path = settings.DATA_DIR / "test_missing_cols.csv"
    invalid_df.to_csv(invalid_path, index=False)

    try:
        with TestClient(app) as client:
            response = client.post("/api/predict/batch", json={
                "filename": "test_missing_cols.csv",
                "supervised_model": "random_forest"
            })
            assert response.status_code == 400
            detail = response.json()["detail"]
            assert "Missing required feature columns" in detail
            assert "Time, V1..V28, and Amount" in detail
    finally:
        invalid_path.unlink(missing_ok=True)

def test_empty_dataset_error():
    """Verify empty CSV returns informative HTTP 400."""
    empty_path = settings.DATA_DIR / "test_empty.csv"
    empty_path.write_text("", encoding="utf-8")

    try:
        with TestClient(app) as client:
            response = client.post("/api/predict/batch", json={
                "filename": "test_empty.csv",
                "supervised_model": "random_forest"
            })
            assert response.status_code == 400
            detail = response.json()["detail"]
            assert "empty" in detail.lower()
    finally:
        empty_path.unlink(missing_ok=True)

def test_non_numeric_and_nan_cleaning():
    """Verify NaN and infinite values are cleaned and imputed with median."""
    df_sample = generate_sample_creditcard_dataset(num_samples=50, fraud_rate=0.04)
    # Inject some NaNs and infs
    df_sample.loc[0, "V1"] = np.nan
    df_sample.loc[1, "Amount"] = np.inf
    df_sample.loc[2, "Time"] = -np.inf

    df_cleaned, stats = clean_data_for_pipeline(df_sample)
    assert stats["infinite_replaced"] >= 2
    assert stats["missing_imputed"] >= 1
    assert not np.isinf(df_cleaned["Amount"].values).any()
    assert not np.isnan(df_cleaned["V1"].values).any()

def test_real_csv_upload_and_preview():
    """Verify real CSV upload endpoint saves file, inspects schema, and returns preview."""
    df_sample = generate_sample_creditcard_dataset(num_samples=60, fraud_rate=0.05)
    csv_bytes = df_sample.to_csv(index=False).encode("utf-8")
    
    with TestClient(app) as client:
        response = client.post(
            "/api/datasets/upload",
            files={"file": ("teacher_test_dataset.csv", csv_bytes, "text/csv")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "teacher_test_dataset.csv"
        assert "inspection" in data
        insp = data["inspection"]
        assert insp["stats"]["total_rows"] == 60
        assert insp["stats"]["total_columns"] == 31
        assert insp["validation"]["is_valid"] is True
        assert len(insp["preview"]) > 0
        assert insp["validation"]["target_info"]["is_valid_binary"] is True

        # Clean up
        uploaded_path = settings.DATA_DIR / "teacher_test_dataset.csv"
        uploaded_path.unlink(missing_ok=True)

def test_upload_invalid_extension():
    """Verify uploading non-CSV file is rejected with HTTP 400."""
    with TestClient(app) as client:
        response = client.post(
            "/api/datasets/upload",
            files={"file": ("notes.txt", b"some text content", "text/plain")}
        )
        assert response.status_code == 400
        assert "Only CSV files" in response.json()["detail"]

def test_upload_empty_csv():
    """Verify uploading 0-byte CSV file is rejected with HTTP 400."""
    with TestClient(app) as client:
        response = client.post(
            "/api/datasets/upload",
            files={"file": ("zero_bytes.csv", b"", "text/csv")}
        )
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

def test_upload_headers_only_csv():
    """Verify uploading CSV with headers but no rows is rejected with HTTP 400."""
    header_content = b"Time,Amount,V1,Class\n"
    with TestClient(app) as client:
        response = client.post(
            "/api/datasets/upload",
            files={"file": ("headers_only.csv", header_content, "text/csv")}
        )
        assert response.status_code == 400
        assert "no data rows" in response.json()["detail"].lower()

def test_target_label_validity_detection():
    """Verify target_info correctly flags valid binary vs non-binary labels."""
    df_valid = pd.DataFrame({"Class": [0, 1, 0, 1]})
    val_valid = validate_dataset_schema(df_valid)
    assert val_valid["target_info"]["has_target"] is True
    assert val_valid["target_info"]["is_valid_binary"] is True

    df_invalid = pd.DataFrame({"Class": [0, 1, 2, 99]})
    val_invalid = validate_dataset_schema(df_invalid)
    assert val_invalid["target_info"]["has_target"] is True
    assert val_invalid["target_info"]["is_valid_binary"] is False
