import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.core.config import settings
from backend.app.database.session import init_db
from backend.app.api import health, dataset, models, predict, history, reports
from backend.app.services.dataset_service import dataset_service
from backend.app.services.ml_service import ml_service
from backend.ml.inference.predictor import inference_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directories and database exist
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    
    # Check if a sample dataset or Kaggle dataset exists, if not generate sample
    sample_file = settings.DATA_DIR / "sample_creditcard.csv"
    kaggle_file = settings.DATA_DIR / "creditcard.csv"
    if not sample_file.exists() and not kaggle_file.exists():
        print("[Startup] Initializing default sample credit card dataset...")
        dataset_service.generate_and_save_sample(num_samples=1500, fraud_rate=0.02)
        
    # Check if models are trained, if not train initial baseline models
    ready_status = inference_engine.is_ready()
    if not ready_status["preprocessor"] or not ready_status["random_forest"]:
        print("[Startup] Initializing baseline machine learning models...")
        try:
            target_file = "creditcard.csv" if kaggle_file.exists() else "sample_creditcard.csv"
            ml_service.train_models_pipeline(filename=target_file)
            print("[Startup] Baseline models initialized successfully.")
        except Exception as e:
            print(f"[Startup Warning] Could not train initial models: {e}")

    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack financial fraud classification and unsupervised anomaly detection system.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(dataset.router, prefix=settings.API_PREFIX)
app.include_router(models.router, prefix=settings.API_PREFIX)
app.include_router(predict.router, prefix=settings.API_PREFIX)
app.include_router(history.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)

# Mount frontend static build if available
frontend_dist = BASE_DIR / "frontend" / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

@app.get("/api")
def api_info():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_prefix": settings.API_PREFIX
    }

@app.get("/")
def root():
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        from fastapi.responses import FileResponse
        return FileResponse(str(index_file))
    return api_info()

if __name__ == "__main__":
    import uvicorn
    app_target = "main:app" if (Path.cwd() / "main.py").exists() else "backend.main:app"
    uvicorn.run(app_target, host="127.0.0.1", port=8000, reload=True)
