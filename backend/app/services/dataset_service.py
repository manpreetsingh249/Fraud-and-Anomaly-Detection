import os
import shutil
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException

from backend.app.core.config import settings
from backend.ml.preprocessing.cleaner import (
    validate_dataset_schema,
    generate_sample_creditcard_dataset,
    REQUIRED_NUMERICAL_COLS,
    normalize_column_names
)
from backend.app.database.session import SessionLocal
from backend.app.database.models import DatasetMeta

class DatasetService:
    @staticmethod
    def get_data_dir() -> Path:
        settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
        return settings.DATA_DIR

    @staticmethod
    def resolve_dataset_path(filename: Optional[str]) -> Path:
        """Returns a safe dataset path in the project data directory."""
        if filename is None:
            raise HTTPException(status_code=400, detail="Dataset filename is required.")

        raw_name = str(filename).strip()
        if not raw_name or raw_name in {".", ".."}:
            raise HTTPException(status_code=400, detail="Invalid dataset filename.")

        if os.path.isabs(raw_name) or ".." in Path(raw_name).parts or "/" in raw_name or "\\" in raw_name:
            raise HTTPException(status_code=400, detail="Invalid dataset path. Please use a file name from the data directory.")

        safe_name = Path(raw_name).name
        if not safe_name or safe_name in {".", ".."}:
            raise HTTPException(status_code=400, detail="Invalid dataset filename.")

        return DatasetService.get_data_dir() / safe_name

    @classmethod
    def list_datasets(cls) -> List[Dict[str, Any]]:
        """Lists CSV datasets available in the data directory."""
        data_dir = cls.get_data_dir()
        datasets = []
        for file in data_dir.glob("*.csv"):
            size_mb = round(file.stat().st_size / (1024 * 1024), 2)
            is_sample = "sample" in file.name.lower()
            datasets.append({
                "filename": file.name,
                "filepath": str(file),
                "size_mb": size_mb,
                "is_sample": is_sample
            })
        return datasets

    @classmethod
    def generate_and_save_sample(cls, num_samples: int = 1500, fraud_rate: float = 0.02) -> Dict[str, Any]:
        """Generates a verified synthetic sample dataset for immediate testing."""
        df = generate_sample_creditcard_dataset(num_samples=num_samples, fraud_rate=fraud_rate)
        sample_path = cls.get_data_dir() / "sample_creditcard.csv"
        df.to_csv(sample_path, index=False)
        
        # Save metadata to DB
        db = SessionLocal()
        try:
            meta = DatasetMeta(
                filename="sample_creditcard.csv",
                filepath=str(sample_path),
                file_size_bytes=int(sample_path.stat().st_size),
                row_count=len(df),
                column_count=len(df.columns),
                is_sample=True,
                has_ground_truth=True,
                fraud_count=int(df["Class"].sum())
            )
            db.add(meta)
            db.commit()
        finally:
            db.close()
            
        return {
            "message": "Sample dataset generated successfully.",
            "filename": "sample_creditcard.csv",
            "rows": len(df),
            "fraud_count": int(df["Class"].sum()),
            "is_sample": True
        }

    @classmethod
    async def save_uploaded_csv(cls, file: UploadFile) -> Path:
        """Saves uploaded file securely with thorough format and integrity validation."""
        filename = file.filename or "uploaded.csv"
        if not filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")

        safe_name = Path(filename).name
        if not safe_name or safe_name in {".", ".."}:
            raise HTTPException(status_code=400, detail="Invalid uploaded filename.")

        target_path = cls.get_data_dir() / safe_name
        
        # Write streaming to disk with size cap check
        size = 0
        with open(target_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                size += len(chunk)
                if size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                    buffer.close()
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail=f"File exceeds maximum upload size limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")
                buffer.write(chunk)
                
        # 1. Check for 0-byte empty file
        if size == 0:
            target_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="The uploaded file is empty (0 bytes). Please upload a valid CSV file with data.")

        # 2. Check if valid CSV and readable
        try:
            df_check = pd.read_csv(target_path, nrows=50)
        except pd.errors.EmptyDataError:
            target_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="The uploaded CSV file is empty or contains no readable columns/rows.")
        except Exception as pe:
            target_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=f"Invalid CSV structure: Unable to parse file as CSV ({str(pe)}).")

        # 3. Check for at least 1 row of data
        if len(df_check) == 0:
            target_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="The uploaded CSV file contains headers but no data rows.")

        # 4. Count total rows safely
        try:
            with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
                total_rows = max(0, sum(1 for _ in f) - 1)
        except Exception:
            total_rows = len(df_check)

        df_check_normalized, _ = normalize_column_names(df_check)
        has_labels = "Class" in df_check_normalized.columns
        fraud_count = 0
        if has_labels:
            try:
                df_class = pd.read_csv(target_path)
                df_class, _ = normalize_column_names(df_class)
                fraud_count = int(pd.to_numeric(df_class["Class"], errors='coerce').fillna(0).sum())
            except Exception:
                pass

        # 5. Persist to SQLite Database
        db = SessionLocal()
        try:
            existing = db.query(DatasetMeta).filter(DatasetMeta.filename == safe_name).first()
            if existing:
                db.delete(existing)
                db.commit()

            meta = DatasetMeta(
                filename=safe_name,
                filepath=str(target_path),
                file_size_bytes=int(target_path.stat().st_size),
                row_count=total_rows,
                column_count=len(df_check.columns),
                is_sample="sample" in safe_name.lower(),
                has_ground_truth=has_labels,
                fraud_count=fraud_count
            )
            db.add(meta)
            db.commit()
        finally:
            db.close()

        return target_path

    @classmethod
    def inspect_dataset(cls, filename: str) -> Dict[str, Any]:
        """Inspects CSV dataset, computes statistics, checks schema, returns preview."""
        target_path = cls.resolve_dataset_path(filename)
        if not target_path.exists():
            raise HTTPException(status_code=404, detail=f"Dataset '{target_path.name}' not found.")
            
        # Read small sample for schema inspection (first 50 rows)
        try:
            df_preview = pd.read_csv(target_path, nrows=50)
        except pd.errors.EmptyDataError:
            df_preview = pd.DataFrame()
        except Exception as pe:
            df_preview = pd.DataFrame()
        
        # Count total rows safely
        try:
            with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
                total_rows = max(0, sum(1 for _ in f) - 1)  # Minus header
        except Exception:
            total_rows = 0
            
        validation = validate_dataset_schema(df_preview)
        
        # Column level info
        col_infos = []
        for col in df_preview.columns:
            missing = int(df_preview[col].isna().sum())
            col_infos.append({
                "name": col,
                "dtype": str(df_preview[col].dtype),
                "missing_count": missing,
                "sample_values": df_preview[col].dropna().head(3).tolist()
            })
            
        normalized_preview, _ = normalize_column_names(df_preview)
        has_labels = "Class" in normalized_preview.columns
        fraud_count = None
        fraud_percentage = None

        if has_labels:
            target_col = "Class"
            # If dataset is reasonably sized, count fraud exactly
            if total_rows < 350000:
                try:
                    df_full_class = pd.read_csv(target_path)
                    df_full_class, _ = normalize_column_names(df_full_class)
                    fraud_count = int(pd.to_numeric(df_full_class[target_col], errors='coerce').fillna(0).sum())
                    if total_rows > 0:
                        fraud_percentage = round((fraud_count / total_rows) * 100, 3)
                except Exception:
                    pass

        return {
            "filename": target_path.name,
            "is_sample": "sample" in target_path.name.lower(),
            "stats": {
                "total_rows": total_rows,
                "total_columns": len(df_preview.columns),
                "missing_cells": int(df_preview.isna().sum().sum()),
                "duplicate_rows": int(df_preview.duplicated().sum()),
                "has_ground_truth": has_labels,
                "fraud_count": fraud_count,
                "fraud_percentage": fraud_percentage,
                "columns": col_infos
            },
            "validation": validation,
            "preview": df_preview.head(25).to_dict(orient="records")
        }

dataset_service = DatasetService()
