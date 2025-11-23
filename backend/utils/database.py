"""
Database session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.config import Config

# Create engine
engine = create_engine(
    Config.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=Config.SQLALCHEMY_ECHO,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
