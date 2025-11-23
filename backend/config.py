import os
import dotenv

dotenv.load_dotenv()

class Config:
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
