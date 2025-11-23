"""
Peru Mania Cup - Tournament Management System
FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from routers import auth, users, tournament, brackets, maps, matches, notifications

# Create FastAPI app
app = FastAPI(
    title="Peru Mania Cup API",
    description="osu! Tournament Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = [
    f"{Config.FRONTEND_URL}:{Config.FRONTEND_PORT}",
    Config.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tournament.router)
app.include_router(brackets.router)
app.include_router(maps.router)
app.include_router(matches.router)
app.include_router(notifications.router)

# Internal routers (for inter-service communication)
from routers import internal
app.include_router(internal.router)


@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "name": "Peru Mania Cup API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=Config.DEBUG
    )
