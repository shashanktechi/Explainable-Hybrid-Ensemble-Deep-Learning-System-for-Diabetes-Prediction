"""
FastAPI application — CORS, router registration, health check.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.routes import auth_routes, patient_routes, predict_routes
from backend.app.utils.logger import get_logger
from database.db_connection import get_db

logger = get_logger(__name__)

app = FastAPI(
    title="XAI-HEDL API",
    description="Explainable Hybrid Ensemble Deep Learning System for Diabetes Prediction",
    version="0.1.0",
)

# ---------- CORS ----------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Routers ----------

app.include_router(auth_routes.router)
app.include_router(patient_routes.router)
app.include_router(predict_routes.router)


# ---------- Health check ----------

@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Returns API and database connection status."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"

    return {"status": "ok", "db": db_status}
