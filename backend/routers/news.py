"""Endpoints for tournament news management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.auth import get_current_staff_user
from utils.database import get_db
from models.news_item import NewsItem
from models.user import User

router = APIRouter(prefix="/news", tags=["News"])

# Default news data (matches frontend hardcoded values)
DEFAULT_NEWS = [
    {"date": "25/12/2025", "title": "Lorem ipsum dolor sit amet consectetur adipiscing elit.", "sort_order": 0},
    {"date": "20/12/2025", "title": "Sed do eiusmod tempor incididunt ut labore.", "sort_order": 1},
    {"date": "15/12/2025", "title": "Ut enim ad minim veniam quis nostrud.", "sort_order": 2},
    {"date": "10/12/2025", "title": "Duis aute irure dolor in reprehenderit voluptate.", "sort_order": 3},
    {"date": "05/12/2025", "title": "Excepteur sint occaecat cupidatat non proident sunt.", "sort_order": 4},
]


def seed_news_if_empty(db: Session):
    """Seed news items if table is empty."""
    if db.query(NewsItem).count() == 0:
        for item_data in DEFAULT_NEWS:
            db.add(NewsItem(**item_data))
        db.commit()


class NewsItemUpdate(BaseModel):
    date: str | None = None
    title: str | None = None


class NewsItemCreate(BaseModel):
    date: str
    title: str
    sort_order: int = 0


@router.get("")
async def get_news(db: Session = Depends(get_db)):
    """Get all news items (public)."""
    seed_news_if_empty(db)
    items = db.query(NewsItem).order_by(NewsItem.sort_order).all()
    return {
        "items": [
            {
                "id": item.id,
                "date": item.date,
                "title": item.title,
            }
            for item in items
        ]
    }


@router.put("")
async def update_all_news(
    items: list[NewsItemUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update all news items at once (staff only)."""
    db_items = db.query(NewsItem).order_by(NewsItem.sort_order).all()

    if len(items) != len(db_items):
        raise HTTPException(status_code=400, detail="Item count mismatch")

    for db_item, update_data in zip(db_items, items):
        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(db_item, key, value)

    db.commit()

    return {
        "items": [
            {
                "id": item.id,
                "date": item.date,
                "title": item.title,
            }
            for item in db_items
        ]
    }


@router.post("")
async def add_news_item(
    data: NewsItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Add a new news item (staff only)."""
    item = NewsItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "date": item.date,
        "title": item.title,
    }


@router.patch("/{item_id}")
async def update_news_item(
    item_id: int,
    data: NewsItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update a single news item (staff only)."""
    item = db.query(NewsItem).filter(NewsItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="News item not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "date": item.date,
        "title": item.title,
    }


@router.delete("/{item_id}")
async def delete_news_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete a news item (staff only)."""
    item = db.query(NewsItem).filter(NewsItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="News item not found")

    db.delete(item)
    db.commit()
    return {"message": "News item deleted"}
