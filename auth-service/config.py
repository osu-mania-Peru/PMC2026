import os
import dotenv

dotenv.load_dotenv()

class Config:
    # Frontend
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost")
    FRONTEND_PORT = os.getenv("FRONTEND_PORT", "5173")

    # OAuth (osu!)
    OSU_CLIENT_ID = os.getenv("OSU_CLIENT_ID", "")
    OSU_CLIENT_SECRET = os.getenv("OSU_CLIENT_SECRET", "")
    OSU_REDIRECT_URI = os.getenv("OSU_REDIRECT_URI", "http://localhost:8001/auth/callback")

    # JWT
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", "7"))

    # Main Backend
    MAIN_BACKEND_URL = os.getenv("MAIN_BACKEND_URL", "http://localhost:8000")

    # Internal service authentication
    INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "internal-service-secret-change-this")

    # Debug
    DEBUG = os.getenv("DEBUG", "True") == "True"
