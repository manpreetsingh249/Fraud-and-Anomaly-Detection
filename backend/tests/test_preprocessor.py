import pytest
import numpy as np
import pandas as pd
from backend.ml.preprocessing.cleaner import (
    validate_dataset_schema,
    generate_sample_creditcard_dataset,
    REQUIRED_NUMERICAL_COLS
)
from backend.ml.preprocessing.scaler import FraudPreprocessor

def test_generate_sample_dataset():
    df = generate_sample_creditcard_dataset(num_samples=200, fraud_rate=0.05)
    assert len(df) == 200
    assert "Time" in df.columns
    assert "Amount" in df.columns
    assert "Class" in df.columns
    assert df["Class"].sum() == 10  # 5% of 200

def test_schema_validation():
    df = generate_sample_creditcard_dataset(num_samples=50)
    validation = validate_dataset_schema(df)
    assert validation["is_valid"] is True
    assert validation["has_ground_truth"] is True
    assert len(validation["missing_columns"]) == 0

    # Invalidate schema by dropping a required PCA column
    df_invalid = df.drop(columns=["V14"])
    invalid_val = validate_dataset_schema(df_invalid)
    assert invalid_val["is_valid"] is False
    assert "V14" in invalid_val["missing_columns"]

def test_preprocessor_no_leakage():
    df = generate_sample_creditcard_dataset(num_samples=100)
    train_df = df.iloc[:80]
    test_df = df.iloc[80:]

    preprocessor = FraudPreprocessor()
    assert preprocessor.is_fitted is False
    
    # Fit strictly on train
    preprocessor.fit(train_df)
    assert preprocessor.is_fitted is True

    # Transform both
    train_scaled = preprocessor.transform(train_df)
    test_scaled = preprocessor.transform(test_df)

    assert train_scaled.shape == (80, 30)  # Time + 28 V's + Amount = 30
    assert test_scaled.shape == (20, 30)
    assert not np.isnan(train_scaled).any()
    assert not np.isnan(test_scaled).any()
