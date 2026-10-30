# Project Plan: Fraud & Anomaly Detection System

## 1. Executive Summary & Academic Scope
This project is an end-to-end, full-stack machine learning web application built for academic demonstration (BCA level). It addresses the real-world challenge of financial transaction risk evaluation by explicitly contrasting two fundamentally distinct paradigms:
1. **Supervised Fraud Classification**: Using historical ground-truth fraud labels to train and evaluate **Logistic Regression** and **Random Forest Classifier** models.
2. **Unsupervised Anomaly Detection**: Identifying statistical outliers and multivariate deviations using **Isolation Forest**, operating without class labels.

A core tenet of this system is that **an anomaly is not automatically fraud**. An unusual high-value transaction or rare purchase hour might be an anomaly without being malicious, while subtle coordinated fraud may mimic regular behavior. The platform reflects this separation across UI, database, ML pipelines, and reports.

---

## 2. Architecture & Technology Stack

```
+-------------------------------------------------------------------------+
|                           Client Browser                                |
|   React (Vite) + Lucide Icons + Recharts / Canvas Charting + Responsive  |
|   Pages: Dashboard, Data Management, Fraud Detection, Anomaly Detection,|
|          Model Laboratory, Transaction Explorer, History & Reports      |
+------------------------------------+------------------------------------+
                                     |  REST API (JSON / Multipart)
                                     v
+-------------------------------------------------------------------------+
|                        FastAPI Backend Server                           |
|   - CORS Middleware & Request Validation (Pydantic v2)                  |
|   - Streaming CSV Upload, Schema & Data Quality Inspection               |
|   - Modular ML Engine (Preprocessing, Training, Inference, Evaluation)   |
|   - Persistence Engine (Joblib for models, SQLAlchemy SQLite for logs)  |
|   - PDF & CSV Report Generator (ReportLab + Pandas)                     |
+-------------------+--------------------------------+--------------------+
                    |                                |
                    v                                v
       +-------------------------+      +-------------------------+
       |   SQLite Database       |      |   Models & Artifacts    |
       |  - AnalysisRun          |      |  - preprocessor.joblib  |
       |  - DatasetMeta          |      |  - lr_model.joblib      |
       |  - ModelEvaluationMeta  |      |  - rf_model.joblib      |
       |  - PredictionLog (opt)  |      |  - iforest_model.joblib |
       +-------------------------+      +-------------------------+
```

### Components:
- **Backend**: Python 3.13, FastAPI, Uvicorn, SQLAlchemy, Pydantic, ReportLab.
- **Frontend**: React (Vite SPA), Modern Dashboard UI, interactive analytics charts, real-time risk indicators, paginated data explorer.
- **Machine Learning**: Scikit-Learn (`LogisticRegression`, `RandomForestClassifier`, `IsolationForest`, `RobustScaler`/`StandardScaler`, `StratifiedKFold`, `train_test_split`), Pandas, NumPy, Joblib.
- **Database**: SQLite with SQLAlchemy ORM (zero-config, persistent across restarts, portable for academic evaluation).

---

## 3. Data Flow Diagram

```
[User CSV Upload]
       |
       v
[Backend Validation] ---> Check Schema (V1..V28, Time, Amount, Class?)
       |             ---> Check Nulls, Infs, Duplicates, Types
       v
[Dataset Preview & Stats] ---> Summary Statistics returned to UI
       |
       +------------------------+-------------------------+
       | (If Labeled 'Class')   | (Inference / Unlabeled) |
       v                        v                         v
[Stratified Train/Test Split] [Supervised Inference]   [Unsupervised Inference]
       |                      (LR / RF Classifier)     (Isolation Forest)
       v                                |                         |
[Fit Scaler on Train Only]              v                         v
       |                      [Fraud Probabilities &]   [Anomaly Score &]
       v                      [Risk Classification ]    [Outlier Flag   ]
[Model Training & Eval]                 \                         /
(Precision, Recall, F1, PR-AUC)          \                       /
       |                                   v                     v
       v                             [Combined Analysis Table & Charts]
[Save Models & Metrics to DB]                       |
                                                    v
                                      [Downloadable CSV & PDF Reports]
```

---

## 4. Implementation Stages

| Stage | Name | Description | Status |
|---|---|---|---|
| **Stage 1** | Inspect & Plan | Inspect environment, finalize project plan & README | **COMPLETED** |
| **Stage 2** | Project Skeleton & Config | Set up folder structure, FastAPI app, SQLite database, Vite React scaffold | **COMPLETED** |
| **Stage 3** | Data Ingestion & Quality | Implement CSV upload, schema check, missing-value analysis, sample dataset generator | **COMPLETED** |
| **Stage 4** | Machine Learning Pipeline | Implement train/test split, scaling, LR, RF, Isolation Forest, evaluation metrics | **COMPLETED** |
| **Stage 5** | REST API Endpoints | Connect ML pipelines to FastAPI endpoints (predict, anomaly, train, evaluate) | **COMPLETED** |
| **Stage 6** | Frontend Dashboard & Views | Build modern React dashboard, upload view, fraud detection, anomaly detection, model lab | **COMPLETED** |
| **Stage 7** | Full-Stack Integration | Link React interface with live FastAPI backend endpoints | **COMPLETED** |
| **Stage 8** | History, Reports & Security | SQLite analysis logging, CSV export, PDF report generation, validation guards | **COMPLETED** |
| **Stage 9** | Automated Testing | Pytest suite for API endpoints, data validation, ML training, evaluation (14/14 Passed) | **COMPLETED** |
| **Stage 10** | Verification & Polish | End-to-end verification of upload -> train -> predict -> anomaly -> report workflow | **COMPLETED** |

---

## 5. Testing & Validation Strategy
1. **Unit & Pipeline Tests**:
   - Preprocessing: Verify fit on training set only (prevent data leakage).
   - Validation: Reject malformed CSVs, non-numeric values in feature columns, empty files.
   - Model Evaluation: Ensure accuracy is supplemented with Precision, Recall, F1, PR-AUC, and Confusion Matrix.
2. **API Endpoint Tests**:
   - `GET /api/health` returns status OK and model availability.
   - `POST /api/dataset/upload` validates and previews schema.
   - `POST /api/models/train` trains models and saves evaluation metrics.
   - `POST /api/predict/fraud` returns predicted probabilities and labels.
   - `POST /api/predict/anomalies` returns anomaly scores and flags.
   - `GET /api/history` lists previous runs.
   - `GET /api/reports/download` generates CSV & PDF files.
3. **Frontend Integration Tests**:
   - Verify upload preview, interactive filters, confusion matrix rendering, and export buttons.
