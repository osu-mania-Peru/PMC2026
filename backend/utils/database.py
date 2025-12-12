"""
Database session management
"""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import Config

# Create engine
engine = create_engine(
    Config.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=Config.SQLALCHEMY_ECHO,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency providing database session.

    Yields:
        SQLAlchemy Session that auto-closes after request.

    Example:
        >>> @app.get("/users")
        >>> def get_users(db: Session = Depends(get_db)):
        >>>     return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
