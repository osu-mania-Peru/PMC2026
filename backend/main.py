"""
Peru Mania Cup - Tournament Management System
FastAPI Backend
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from routers import auth, users, tournament, brackets, maps, matches, notifications, api_keys, internal, timeline, news, mappool, slot

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
    "http://localhost:3000",
    "http://127.0.0.1:5173",
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

# Internal routers (for inter-service communication)
app.include_router(internal.router)


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
