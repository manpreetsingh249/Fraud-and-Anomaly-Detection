# Fraud & Anomaly Detection System (Academic Project)

A full-stack, enterprise-grade academic project built for BCA final year presentation and demonstration. It combines **supervised machine learning** (Logistic Regression, Random Forest) for fraudulent transaction prediction with **unsupervised anomaly detection** (Isolation Forest) for novel pattern discovery.

---

## 🎯 Academic Motivation & Core Concept

In financial systems, traditional rule-based checks fail against emerging fraud patterns, while standard supervised learning requires historical labeled data. This project demonstrates two complementary approaches:

| Dimension | Supervised Fraud Detection | Unsupervised Anomaly Detection |
|---|---|---|
| **Objective** | Classify known fraud patterns based on past labels | Discover statistical outliers without labels |
| **Algorithms** | **Logistic Regression**, **Random Forest** | **Isolation Forest** |
| **Output** | Fraud Probability ($P \in [0, 1]$), Binary Class | Anomaly Score, Binary Outlier Flag ($-1$ or $1$) |
| **Critical Insight** | High accuracy can be deceptive due to severe class imbalance | **An anomaly is NOT automatically fraud**; it flags unusual behavior for auditor review |
| **Key Metrics** | Precision, Recall, F1-Score, PR-AUC, Confusion Matrix | Outlier count, score distribution, quantile thresholds |

### ⚠️ The Accuracy Fallacy in Fraud Detection
In the standard Credit Card dataset, only ~0.17% of transactions are fraudulent (492 out of 284,807). A naive model predicting "every transaction is non-fraud" achieves **99.83% accuracy** while catching **0% of fraud**. Therefore, our system prioritizes **Recall** (catching fraud), **Precision** (avoiding false alarms), and **PR-AUC** over raw accuracy.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 18 (Vite SPA), Lucide Icons, Vanilla CSS design system, responsive financial intelligence dashboard, interactive confusion matrix, paginated transaction table with real-time risk filters.
- **Backend**: FastAPI (Python 3.10+ / 3.13 tested), Uvicorn ASGI server, Pydantic v2 schemas, CORS enabled.
- **Machine Learning**: Scikit-Learn (`LogisticRegression`, `RandomForestClassifier`, `IsolationForest`, `RobustScaler`), Pandas, NumPy, Joblib model persistence.
- **Database**: SQLite with SQLAlchemy ORM (`fraud_detection.db` zero-config, persistent across runs).
- **Reporting**: ReportLab PDF summary generation and Pandas CSV audit exports.
- **Testing**: Pytest test suite covering API endpoints, data validation, ML training, evaluation metrics, and error handling.

---

## 📁 Project Directory Structure

```text
D:\Fraud & Anomaly detection\
├── backend\
│   ├── app\
│   │   ├── api\             # FastAPI routers (dataset, models, predict, history, reports)
│   │   ├── core\            # App configuration (paths, limits, CORS)
│   │   ├── database\        # SQLAlchemy models and SQLite session
│   │   ├── schemas\         # Pydantic request and response models
│   │   └── services\        # Business logic & report generation
│   ├── ml\
│   │   ├── preprocessing\   # RobustScaler, schema validation, column aliasing
│   │   ├── training\        # Model trainers (LR, RF, Isolation Forest)
│   │   ├── evaluation\      # Precision, Recall, F1, PR-AUC, Confusion Matrix
│   │   └── inference\       # Predictor engine for batch and single inference
│   ├── tests\               # Pytest automated test suite
│   ├── requirements.txt     # Python backend dependencies
│   └── main.py              # Application entrypoint & static mount
├── frontend\
│   ├── src\
│   │   ├── components\      # Reusable UI (Sidebar, Topbar, ConfusionMatrixCard)
│   │   ├── pages\           # Dashboard, Data, Fraud, Anomaly, ModelLab, Explorer, Reports
│   │   ├── services\        # Axios API client (/api proxy)
│   │   └── App.jsx          # Main application & routing state
│   ├── package.json
│   └── vite.config.js
├── data\                    # Storage for sample & uploaded CSV datasets
├── models\                  # Saved Joblib model files & RobustScaler
├── reports\                 # Generated PDF and CSV audit reports
├── fraud_detection.db       # SQLite persistent database
├── TEST_REPORT.md           # Comprehensive audit & testing report
├── CONTINUATION_STATUS.md   # Latest verified continuation checkpoint
└── README.md                # System documentation & viva guide
```

---

## 💻 Exact Windows CMD Setup & Run Instructions

Follow these exact steps in **Windows Command Prompt (`cmd.exe`)**:

### Step 1: Open the Project Directory
```cmd
d:
cd "D:\Fraud & Anomaly detection"
```

### Step 2: Install Backend Dependencies
```cmd
python -m pip install -r backend\requirements.txt
```

### Step 3: Install Frontend Dependencies
```cmd
cd /d "D:\Fraud & Anomaly detection\frontend"
npm ci
```

### Step 4: Start the Backend Server (Terminal 1)
Open a CMD window and run:
```cmd
cd /d "D:\Fraud & Anomaly detection"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- API will start at: `http://127.0.0.1:8000`
- Interactive Swagger API docs: `http://127.0.0.1:8000/docs`

### Step 5: Start the Frontend Server (Terminal 2)
Open a **second separate CMD window** and run:
```cmd
d:
cd "D:\Fraud & Anomaly detection\frontend"
npm run dev
```
- Frontend dev server will start at: `http://localhost:5173`
- (Note: Vite automatically proxies `/api` requests to backend port `8000`).

### Step 6: Open in Browser
Open your browser and navigate to:
```text
http://localhost:5173/
```
*(Or navigate to `http://127.0.0.1:8000/` to test the integrated production build served directly by FastAPI).*

### Step 7: Run Automated Tests
In a CMD window from the project root:
```cmd
cd /d "D:\Fraud & Anomaly detection"
python -m pytest backend/tests/ -v
```
The backend suite currently contains 25 tests. The completion report records the latest test run and any limitations.

---

## 🔬 How to Test a Teacher's or Evaluator's New CSV Dataset

The system supports two distinct workflows depending on whether the test dataset has ground-truth labels:

### Operation A: Labeled Dataset (Model Evaluation)
- **When to use**: The dataset contains the target column `Class` (1 = fraud, 0 = normal).
- **Workflow**:
  1. Go to the **Dataset Management** tab (`/data`).
  2. Click **Upload Dataset (.csv)** and select the file.
  3. The system verifies columns, missing values, and data types.
  4. Navigate to **Supervised Fraud ML** (`/fraud`).
  5. Select your algorithm (**Random Forest** or **Logistic Regression**) and click **Run Supervised Classification**.
  6. **Results Displayed**:
     - **Confusion Matrix**: True Positives (caught fraud), False Positives (false alarms), True Negatives (correct legit), False Negatives (missed fraud).
     - **Evaluation Metrics**: Precision, Recall, F1-Score, PR-AUC, and Accuracy.
     - **Transaction Table**: Filterable by "All", "Flagged High Risk", "Predicted Fraud", "Normal", and "Classification Errors".

### Operation B: Unlabeled Dataset (Prediction & Inference)
- **When to use**: A raw transaction file with transaction features but **no** `Class` column.
- **Workflow**:
  1. Upload the CSV file in **Dataset Management**.
  2. Navigate to **Supervised Fraud ML**.
  3. The page badges the dataset as **Operation B: Unlabeled Prediction Mode**.
  4. Click **Run Supervised Classification**.
  5. **Results Displayed**:
     - Transaction-level continuous fraud probabilities $P(\text{Fraud}) \in [0.0, 1.0]$.
     - Discrete risk tiers (**High Risk** $\ge 70\%$, **Medium Risk** $25\%-70\%$, **Low Risk** $< 25\%$).
     - Outlier Anomaly scores from the unsupervised Isolation Forest.
     - **Notice**: Ground-truth metrics (Accuracy, Precision, Recall, Confusion Matrix) are omitted to avoid false assumptions.

### Required Feature Columns & Column Mapping
The trained model expects the standard 30 numerical PCA feature columns:
- `Time` (numerical, seconds elapsed)
- `V1` through `V28` (numerical, PCA anonymized components)
- `Amount` (numerical, transaction dollar value)
- `Class` (optional for evaluation, 0 or 1)

#### Intelligent Column Normalization
The backend automatically trims whitespace and maps common column variations:
- Case variations: `time` $\rightarrow$ `Time`, `amount` $\rightarrow$ `Amount`, `class` $\rightarrow$ `Class`, `v1`..`v28` $\rightarrow$ `V1`..`V28`.
- Column aliases: `timestamp` / `txn_time` $\rightarrow$ `Time`, `amt` / `transaction_amount` $\rightarrow$ `Amount`, `is_fraud` / `target` / `label` $\rightarrow$ `Class`.
- If an incompatible dataset is uploaded (e.g. missing `V1..V28`), the backend returns an explicit HTTP 400 error detailing the missing columns.

### Strict Data Leakage Prevention
- **RobustScaler** is fitted strictly on `X_train` during training splits.
- Test splits and inference batches are transformed using the saved preprocessor parameters without retraining or fitting.
- Ground truth `Class` labels are never included in the input feature matrix.

---

## 🛠️ Troubleshooting & Common Errors

| Issue | Cause | Fix |
|---|---|---|
| `Port 8000 already in use` | Another Python or Uvicorn instance is running | Run in CMD: `netstat -ano \| findstr 8000` then `taskkill /PID <PID> /F` |
| `ModuleNotFoundError: No module named 'backend'` | Running pytest from a folder without `sys.path` configured | `conftest.py` is pre-configured. Run `python -m pytest backend/tests/ -v` from project root. |
| `Missing required feature columns` | Uploaded CSV lacks `Time`, `V1..V28`, or `Amount` | Check dataset columns in Dataset Management view. The model requires the 30 standard benchmark features. |
| `Dataset is empty` | 0-byte or corrupt CSV file uploaded | Ensure CSV has a header row and at least one data row. |

---

## 🎓 BCA Viva & Presentation Guide

1. **Why use both Supervised and Unsupervised models?**
   - *Answer*: Supervised learning (Random Forest, Logistic Regression) detects known fraud patterns based on labeled historical data. Unsupervised learning (Isolation Forest) detects new, zero-day anomalies and outliers that have never been seen or labeled before.
2. **What is the difference between an Anomaly and a Fraud?**
   - *Answer*: **An anomaly is NOT automatically fraud**. An anomaly is an unexpected statistical deviation (e.g. an unusually large transaction at 3:00 AM). It might be an affluent buyer on vacation (legitimate outlier) or a novel fraud scheme. Unsupervised models flag transactions for auditor review.
3. **Why is raw Accuracy misleading in Fraud Detection?**
   - *Answer*: In imbalanced financial datasets (e.g. 99.8% non-fraud), a dummy model predicting 0 for all transactions achieves 99.8% accuracy but catches 0% of fraud. We prioritize Recall (catching fraudulent dollars) and Precision (minimizing false customer friction).
4. **How does Isolation Forest work?**
   - *Answer*: It isolates outliers by randomly selecting a feature and a random split value. Outliers require fewer recursive splits to isolate than clustered normal points, resulting in shorter average path lengths in isolation trees.
5. **How is Data Leakage prevented?**
   - *Answer*: Scalers (`RobustScaler`) are fitted strictly on `X_train`. The test set and inference batches are transformed using only the parameters learned from training data.
