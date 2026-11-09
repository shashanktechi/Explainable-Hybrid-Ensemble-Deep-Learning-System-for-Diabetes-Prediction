"""
WSGI / ASGI entrypoint — exposes the FastAPI app for uvicorn.

Usage:
    uvicorn backend.wsgi:app --host 0.0.0.0 --port 8000
"""

from backend.app.main import app  # noqa: F401
