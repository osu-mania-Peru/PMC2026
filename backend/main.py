"""
Peru Mania Cup - Tournament Management System
FastAPI Backend
"""
import logging
import os
import traceback
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from config import Config
from routers import auth, users, tournament, brackets, maps, matches, notifications, api_keys, internal, timeline, news, mappool, slot, whitelist, scheduling, wheel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Create FastAPI app
app = FastAPI(
    title="Peru Mania Cup API",
    description="Torneo de osu! Peru Mania Cup",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    f"{Config.FRONTEND_URL}:{Config.FRONTEND_PORT}",
    Config.FRONTEND_URL,
    "https://perumaniacup.info",
    "http://perumaniacup.info",
    "https://www.perumaniacup.info",
    "http://www.perumaniacup.info",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Password", "X-API-Key"],
)

# Global exception handler for detailed error responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return detailed error info."""
    logger = logging.getLogger(__name__)

    # Get full traceback
    tb = traceback.format_exc()

    # Log the error
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    logger.error(tb)

    # Build detailed error response
    error_response = {
        "detail": str(exc),
        "type": type(exc).__name__,
        "path": str(request.url.path),
        "method": request.method,
        "traceback": tb if Config.DEBUG else None,
        "query_params": dict(request.query_params) if request.query_params else None,
    }

    # Try to get request body for debugging (only in debug mode)
    if Config.DEBUG:
        try:
            body = await request.body()
            if body:
                error_response["request_body"] = body.decode('utf-8')[:1000]  # Limit body size
        except Exception:
            pass

    return JSONResponse(
        status_code=500,
        content=error_response
    )

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tournament.router)
app.include_router(brackets.router)
app.include_router(maps.router)
app.include_router(matches.router)
app.include_router(notifications.router)
app.include_router(api_keys.router)
app.include_router(timeline.router)
app.include_router(news.router)
app.include_router(mappool.router)
app.include_router(slot.router)
app.include_router(whitelist.router)
app.include_router(scheduling.router)
app.include_router(wheel.router)

# Internal routers (for inter-service communication)
app.include_router(internal.router)

# Create beatmaps directory if it doesn't exist
BEATMAPS_DIR = Path("beatmaps")
BEATMAPS_DIR.mkdir(exist_ok=True)

# Mount beatmaps directory for static file access
app.mount("/beatmaps", StaticFiles(directory="beatmaps"), name="beatmaps")


@app.get("/")
def read_root():
    """Endpoint raíz"""
    return {
        "name": "Peru Mania Cup API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Verificación de estado"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=Config.DEBUG
    )
