import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List

FEATURE_COLS = [f"V{i}" for i in range(1, 29)]
REQUIRED_NUMERICAL_COLS = ["Time"] + FEATURE_COLS + ["Amount"]
TARGET_COL = "Class"

# Known canonical mappings for column normalization
COLUMN_ALIASES = {
    "time": "Time",
    "timestamp": "Time",
    "txn_time": "Time",
    "transaction_time": "Time",
    "seconds": "Time",
    "amount": "Amount",
    "amt": "Amount",
    "transaction_amount": "Amount",
    "txn_amount": "Amount",
    "value": "Amount",
    "price": "Amount",
    "class": "Class",
    "label": "Class",
    "target": "Class",
    "is_fraud": "Class",
    "fraud": "Class",
    "fraudulent": "Class"
}
for i in range(1, 29):
    COLUMN_ALIASES[f"v{i}"] = f"V{i}"

def normalize_column_names(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, str]]:
    """
    Normalizes column names by:
    1. Trimming leading and trailing whitespace.
    2. Mapping case-insensitive and known alias names to canonical columns.
    Returns:
        (df_renamed, remapped_columns_dict)
    """
    df_renamed = df.copy()
    raw_cols = [str(c).strip() for c in df_renamed.columns]
    df_renamed.columns = raw_cols

    remapped = {}
    rename_dict = {}
    for col in df_renamed.columns:
        lower_col = col.lower()
        if lower_col in COLUMN_ALIASES and col != COLUMN_ALIASES[lower_col]:
            canonical = COLUMN_ALIASES[lower_col]
            rename_dict[col] = canonical
            remapped[col] = canonical

    if rename_dict:
        df_renamed.rename(columns=rename_dict, inplace=True)

    return df_renamed, remapped

def validate_dataset_schema(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validates dataset against the Credit Card Fraud schema.
    Returns validation dictionary with status, errors, warnings, and column presence.
    """
    errors = []
    warnings = []

    if df is None or len(df) == 0:
        return {
            "is_valid": False,
            "errors": ["Dataset is empty. It contains 0 records."],
            "warnings": [],
            "missing_columns": REQUIRED_NUMERICAL_COLS,
            "present_columns": [],
            "has_ground_truth": False,
            "total_rows": 0,
            "total_columns": 0,
            "remapped_columns": {}
        }

    # Normalize columns first
    df_norm, remapped = normalize_column_names(df)
    if remapped:
        warnings.append(f"Auto-mapped {len(remapped)} column(s) to canonical names: {', '.join(f'{k} -> {v}' for k, v in remapped.items())}")

    # Check required feature columns
    missing_features = [col for col in REQUIRED_NUMERICAL_COLS if col not in df_norm.columns]
    present_cols = [col for col in df_norm.columns if col in REQUIRED_NUMERICAL_COLS or col == TARGET_COL]

    if missing_features:
        sample_missing = missing_features[:5]
        suffix = "..." if len(missing_features) > 5 else ""
        errors.append(
            f"Missing required feature columns ({len(missing_features)} missing): {', '.join(sample_missing)}{suffix}. "
            f"This model requires the standard feature set: Time, V1..V28, and Amount."
        )

    target_info = {
        "has_target": False,
        "target_col": None,
        "is_valid_binary": False,
        "unique_values": [],
        "message": None
    }

    has_ground_truth = TARGET_COL in df_norm.columns
    if has_ground_truth:
        target_info["has_target"] = True
        target_info["target_col"] = TARGET_COL
        raw_target = df_norm[TARGET_COL].dropna()
        unique_vals = list(raw_target.unique())
        target_info["unique_values"] = [str(v) for v in unique_vals[:10]]

        numeric_target = pd.to_numeric(raw_target, errors='coerce')
        if numeric_target.isna().sum() > 0:
            target_info["is_valid_binary"] = False
            msg = f"Target column '{TARGET_COL}' contains non-numeric values ({target_info['unique_values']}). Expected binary labels: 0 (legitimate) and 1 (fraud)."
            target_info["message"] = msg
            warnings.append(msg)
        else:
            set_vals = set(numeric_target.unique())
            if set_vals.issubset({0, 1}):
                target_info["is_valid_binary"] = True
                target_info["message"] = f"Valid binary ground-truth label identified ('{TARGET_COL}'). Values: 0 (normal) and 1 (fraud)."
            else:
                target_info["is_valid_binary"] = False
                msg = f"Target column '{TARGET_COL}' contains non-binary values {list(set_vals)}. Binary classification expects labels: 0 (legitimate) and 1 (fraud)."
                target_info["message"] = msg
                warnings.append(msg)
    else:
        target_info["message"] = (
            "Dataset does NOT contain a 'Class' ground-truth label column. "
            "It will be processed under 'Operation B: Unlabeled Prediction' (probabilities and anomaly scores will be shown, but accuracy/confusion matrix cannot be computed)."
        )
        warnings.append(target_info["message"])

    # Check numeric types
    non_numeric_cols = []
    for col in present_cols:
        # Check if column is numeric or can be coerced to numeric
        if not pd.api.types.is_numeric_dtype(df_norm[col]):
            # Try numeric coercion check
            coerced = pd.to_numeric(df_norm[col], errors='coerce')
            if coerced.isna().sum() > (0.1 * len(df_norm)):
                non_numeric_cols.append(col)

    if non_numeric_cols:
        errors.append(f"Columns with non-numeric data types: {', '.join(non_numeric_cols)}")

    # Check missing values
    missing_count = int(df_norm[present_cols].isna().sum().sum())
    if missing_count > 0:
        warnings.append(f"Dataset contains {missing_count} missing (NaN) values. The pipeline will apply median imputation.")

    # Check duplicates
    duplicate_count = int(df_norm.duplicated().sum())
    if duplicate_count > 0:
        warnings.append(f"Found {duplicate_count} duplicate rows.")

    is_valid = len(errors) == 0
    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "missing_columns": missing_features,
        "present_columns": present_cols,
        "has_ground_truth": has_ground_truth,
        "target_info": target_info,
        "total_rows": len(df_norm),
        "total_columns": len(df_norm.columns),
        "remapped_columns": remapped
    }

def clean_data_for_pipeline(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Cleans DataFrame:
    1. Normalizes column names (whitespace, casing, aliases).
    2. Coerces numerical columns to float.
    3. Handles infinite values by converting to NaN.
    4. Imputes NaNs with column medians.
    Returns cleaned DataFrame and cleaning metadata dictionary.
    """
    df_clean, remapped = normalize_column_names(df)

    # Coerce required numerical columns if present
    for col in REQUIRED_NUMERICAL_COLS:
        if col in df_clean.columns and not pd.api.types.is_numeric_dtype(df_clean[col]):
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')

    # Replace infinite values with NaN
    num_cols = df_clean.select_dtypes(include=[np.number]).columns
    inf_count = int(np.isinf(df_clean[num_cols]).values.sum())
    df_clean.replace([np.inf, -np.inf], np.nan, inplace=True)

    # Impute missing with median
    missing_imputed = 0
    for col in num_cols:
        col_na = int(df_clean[col].isna().sum())
        if col_na > 0:
            median_val = df_clean[col].median()
            if pd.isna(median_val):
                median_val = 0.0
            df_clean[col] = df_clean[col].fillna(median_val)
            missing_imputed += col_na

    return df_clean, {
        "infinite_replaced": inf_count,
        "missing_imputed": missing_imputed,
        "remapped_columns": remapped
    }

def generate_sample_creditcard_dataset(num_samples: int = 1500, fraud_rate: float = 0.02, random_state: int = 42) -> pd.DataFrame:
    """
    Generates a realistic sample dataset matching the Kaggle Credit Card Fraud format.
    Explicitly labeled as sample data for academic demonstration when the 143MB dataset is not present.
    """
    np.random.seed(random_state)

    num_fraud = int(max(1, round(num_samples * fraud_rate)))
    num_normal = num_samples - num_fraud

    # Normal transactions: V1-V28 from standard normal ~ N(0, 1)
    normal_features = np.random.randn(num_normal, 28)
    # Fraud transactions: slight distribution shifts on key known PCA components (e.g. V1, V2, V3, V4, V14, V17)
    fraud_features = np.random.randn(num_fraud, 28)
    fraud_features[:, 0] -= 2.5  # V1 shifted
    fraud_features[:, 1] += 2.0  # V2 shifted
    fraud_features[:, 2] -= 3.0  # V3 shifted
    fraud_features[:, 3] += 2.5  # V4 shifted
    fraud_features[:, 13] -= 3.5 # V14 strongly shifted
    fraud_features[:, 16] -= 2.8 # V17 shifted

    features = np.vstack([normal_features, fraud_features])

    # Amounts: normal has lognormal(mean ~ 40-100), fraud has some high-value and some tiny probe amounts
    normal_amounts = np.round(np.random.lognormal(mean=3.5, sigma=1.2, size=num_normal), 2)
    fraud_amounts = np.round(np.random.lognormal(mean=4.2, sigma=1.8, size=num_fraud), 2)
    amounts = np.concatenate([normal_amounts, fraud_amounts])

    # Timestamps (seconds): monotonically increasing with small random delta
    time_deltas = np.random.exponential(scale=60, size=num_samples)
    times = np.round(np.cumsum(time_deltas), 1)

    # Labels
    classes = np.concatenate([np.zeros(num_normal, dtype=int), np.ones(num_fraud, dtype=int)])

    # Assemble DataFrame
    data_dict = {"Time": times}
    for i in range(28):
        data_dict[f"V{i+1}"] = np.round(features[:, i], 6)
    data_dict["Amount"] = amounts
    data_dict["Class"] = classes

    df = pd.DataFrame(data_dict)
    # Shuffle to intersperse fraud records
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    return df
