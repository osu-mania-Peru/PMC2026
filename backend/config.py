"""
Application configuration module.

Loads environment variables and provides centralized configuration
for the Peru Mania Cup tournament backend.
"""
import os
import dotenv

dotenv.load_dotenv()


class Config:
    """
    Central configuration class for the PMC backend.

    All configuration values are loaded from environment variables with
    sensible defaults for development. In production, ensure all sensitive
    values (SECRET_KEY, INTERNAL_SECRET, OSU_CLIENT_SECRET) are properly set.

    Attributes:
        FRONTEND_URL: Base URL for the frontend application.
        FRONTEND_PORT: Port the frontend runs on.
        DATABASE_URL: PostgreSQL connection string.
        DEBUG: Enable debug mode and SQLAlchemy echo.
        OSU_CLIENT_ID: osu! OAuth application client ID.
        OSU_CLIENT_SECRET: osu! OAuth application client secret.
        OSU_REDIRECT_URI: OAuth callback URL.
        DEV_MODE: Allow localhost origins in OAuth state validation.
        SECRET_KEY: JWT signing secret key.
        JWT_ALGORITHM: Algorithm for JWT encoding (HS256).
        JWT_EXPIRATION_DAYS: Token validity period in days.
        INTERNAL_SECRET: Secret for inter-service authentication.
    """
    # Frontend
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost")
    FRONTEND_PORT = os.getenv("FRONTEND_PORT", "5173")

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/pmc")
    DEBUG = os.getenv("DEBUG", "True") == "True"
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_ECHO = DEBUG

    # OAuth (osu!)
    OSU_CLIENT_ID = os.getenv("OSU_CLIENT_ID", "")
    OSU_CLIENT_SECRET = os.getenv("OSU_CLIENT_SECRET", "")
    OSU_REDIRECT_URI = os.getenv("OSU_REDIRECT_URI", "http://localhost:8000/auth/callback")

    # Development mode - allows localhost origins in OAuth state
    DEV_MODE = os.getenv("DEV_MODE", "False") == "True"

    # JWT
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_DAYS = 7

    # Internal service authentication
    INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "internal-service-secret-change-this") 
