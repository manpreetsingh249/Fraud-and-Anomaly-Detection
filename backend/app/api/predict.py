import pandas as pd
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from backend.app.core.config import settings
from backend.app.schemas.predict import BatchPredictRequest, SingleTransactionInput
from backend.app.services.dataset_service import dataset_service
from backend.ml.inference.predictor import inference_engine
from backend.app.database.session import SessionLocal
from backend.app.database.models import AnalysisRun
from backend.ml.preprocessing.cleaner import REQUIRED_NUMERICAL_COLS, validate_dataset_schema

router = APIRouter(prefix="/predict", tags=["Prediction"])

@router.post("/batch")
def predict_batch(request: BatchPredictRequest):
    """
    Executes fraud prediction and anomaly detection across a dataset.
    Saves analysis metadata to SQLite and returns transaction-level results.
    Distinguishes Operation A (Evaluation on labeled data) from Operation B (Prediction on unlabeled data).
    """
    data_dir = settings.DATA_DIR
    if request.filename:
        file_path = dataset_service.resolve_dataset_path(request.filename)
    else:
        # Default fallback
        if (data_dir / "creditcard.csv").exists():
            file_path = data_dir / "creditcard.csv"
        elif (data_dir / "sample_creditcard.csv").exists():
            file_path = data_dir / "sample_creditcard.csv"
        else:
            raise HTTPException(status_code=400, detail="No dataset found. Please generate a sample dataset or upload one first.")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file '{file_path.name}' not found.")

    try:
        # Read dataset (limit to 10,000 for rapid interactive UI response if file is huge)
        try:
            df = pd.read_csv(file_path, nrows=10000)
        except pd.errors.EmptyDataError:
            raise HTTPException(status_code=400, detail=f"The dataset '{file_path.name}' is completely empty (0 bytes / no headers).")
        except Exception as pe:
            raise HTTPException(status_code=400, detail=f"Unable to parse CSV file '{file_path.name}': {str(pe)}")

        if df.empty:
            raise HTTPException(status_code=400, detail=f"The dataset '{file_path.name}' contains no data rows.")

        validation = validate_dataset_schema(df)
        if not validation["is_valid"]:
            detail = validation["errors"][0] if validation["errors"] else "Dataset validation failed."
            raise HTTPException(status_code=400, detail=detail)

        batch_output = inference_engine.predict_batch(
            df=df,
            supervised_model_name=request.supervised_model,
            run_anomaly_check=request.run_anomaly_detection
        )

        run_id = None
        if request.save_run:
            db = SessionLocal()
            try:
                run = AnalysisRun(
                    dataset_name=file_path.name,
                    total_records=batch_output["total_records"],
                    supervised_model=batch_output["supervised_model"],
                    fraud_detected_count=batch_output["fraud_detected_count"],
                    fraud_percentage=batch_output["fraud_percentage"],
                    anomaly_model="isolation_forest" if request.run_anomaly_detection else None,
                    anomaly_detected_count=batch_output["anomaly_detected_count"],
                    anomaly_percentage=batch_output["anomaly_percentage"],
                    high_risk_count=batch_output["risk_counts"]["High"],
                    medium_risk_count=batch_output["risk_counts"]["Medium"],
                    low_risk_count=batch_output["risk_counts"]["Low"],
                    notes=f"Batch analysis of {file_path.name} using {request.supervised_model}"
                )
                db.add(run)
                db.commit()
                db.refresh(run)
                run_id = run.id
            finally:
                db.close()

        batch_output["run_id"] = run_id
        batch_output["dataset_name"] = file_path.name
        return batch_output
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Validation Error: {str(ve)}")
    except RuntimeError as re:
        raise HTTPException(status_code=400, detail=f"Model Error: {str(re)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/single")
def predict_single(input_data: SingleTransactionInput):
    """
    Evaluates a single transaction against trained fraud and anomaly detection models.
    """
    row_dict = {"Time": input_data.Time, "Amount": input_data.Amount}
    for i in range(1, 29):
        col_name = f"V{i}"
        row_dict[col_name] = input_data.features.get(col_name, 0.0)

    df_single = pd.DataFrame([row_dict])
    try:
        res = inference_engine.predict_batch(
            df=df_single,
            supervised_model_name=input_data.supervised_model,
            run_anomaly_check=input_data.run_anomaly_detection
        )
        return res["results"][0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
