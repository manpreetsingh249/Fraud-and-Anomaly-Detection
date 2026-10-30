import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import RobustScaler
from backend.ml.preprocessing.cleaner import REQUIRED_NUMERICAL_COLS

class FraudPreprocessor:
    """
    Handles preprocessing for credit card fraud data.
    Scales 'Time' and 'Amount' using RobustScaler (resistant to extreme financial outliers).
    V1-V28 are PCA-derived orthogonal features and remain unscaled.
    CRITICAL: Scaler is fitted strictly on X_train to prevent data leakage.
    """
    def __init__(self):
        self.scaler = RobustScaler()
        self.is_fitted = False
        self.feature_names = REQUIRED_NUMERICAL_COLS

    def fit(self, X: pd.DataFrame):
        """Fits scaler only on training data."""
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X, columns=self.feature_names)
            
        time_amount = X[["Time", "Amount"]].values
        self.scaler.fit(time_amount)
        self.is_fitted = True
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        """Transforms input features using fitted scaler."""
        if not self.is_fitted:
            raise ValueError("FraudPreprocessor must be fitted on training data before transform.")
            
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X, columns=self.feature_names)
            
        # Ensure all columns exist
        for col in self.feature_names:
            if col not in X.columns:
                raise ValueError(f"Missing required feature column: {col}")
                
        scaled_time_amount = self.scaler.transform(X[["Time", "Amount"]].values)
        
        # Combine: Scaled Time, V1-V28, Scaled Amount
        v_features = X[[f"V{i}" for i in range(1, 29)]].values
        
        # Matrix layout: [Time, V1, V2, ..., V28, Amount]
        transformed_matrix = np.hstack([
            scaled_time_amount[:, 0:1],
            v_features,
            scaled_time_amount[:, 1:2]
        ])
        return transformed_matrix

    def fit_transform(self, X: pd.DataFrame) -> np.ndarray:
        return self.fit(X).transform(X)

    def save(self, filepath: Path):
        joblib.dump(self, filepath)

    @staticmethod
    def load(filepath: Path) -> "FraudPreprocessor":
        return joblib.load(filepath)
