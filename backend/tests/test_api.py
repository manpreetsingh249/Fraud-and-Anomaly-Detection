import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.database.session import init_db
from backend.app.services.dataset_service import dataset_service
from backend.app.services.ml_service import ml_service

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Ensure database and baseline models are prepared before running tests."""
    init_db()
    # Ensure sample dataset exists
    dataset_service.generate_and_save_sample(num_samples=300, fraud_rate=0.03)
    # Ensure baseline models are trained
    ml_service.train_models_pipeline(filename="sample_creditcard.csv")

def test_root():
    with TestClient(app) as client:
        # Root returns 200 (HTML or JSON)
        response = client.get("/")
        assert response.status_code == 200

        # /api returns JSON metadata
        api_res = client.get("/api")
        assert api_res.status_code == 200
        data = api_res.json()
        assert "version" in data
        assert data["api_prefix"] == "/api"

def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "models_status" in data

def test_sample_dataset_generation():
    with TestClient(app) as client:
        response = client.post("/api/datasets/sample", json={"num_samples": 300, "fraud_rate": 0.03})
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "sample_creditcard.csv"
        assert data["inspection"]["stats"]["total_rows"] == 300

def test_batch_prediction():
    with TestClient(app) as client:
        response = client.post("/api/predict/batch", json={
            "filename": "sample_creditcard.csv",
            "supervised_model": "random_forest",
            "run_anomaly_detection": True,
            "save_run": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_records" in data
        assert "fraud_detected_count" in data
        assert "anomaly_detected_count" in data
        assert "results" in data
        assert len(data["results"]) > 0

def test_history_list():
    with TestClient(app) as client:
        response = client.get("/api/history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

def test_models_evaluations():
    with TestClient(app) as client:
        response = client.get("/api/models/evaluations")
        assert response.status_code == 200
        data = response.json()
        assert "evaluations" in data
        assert len(data["evaluations"]) > 0

def test_report_export_csv():
    with TestClient(app) as client:
        dummy_results = [
            {"index": 1, "Time": 10.0, "Amount": 150.0, "fraud_prediction": 0, "fraud_probability": 0.05, "risk_level": "Low", "anomaly_flag": 1, "anomaly_score": 0.2, "ground_truth": 0}
        ]
        response = client.post("/api/reports/export-csv", json={"results": dummy_results})
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

def test_report_export_pdf():
    with TestClient(app) as client:
        run_data = {
            "total_records": 100,
            "supervised_model": "random_forest",
            "fraud_detected_count": 2,
            "fraud_percentage": 2.0,
            "anomaly_detected_count": 3,
            "anomaly_percentage": 3.0,
            "risk_counts": {"Low": 95, "Medium": 3, "High": 2}
        }
        response = client.post("/api/reports/export-pdf", json={"run_data": run_data})
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
