import os
from datetime import datetime

import aiosqlite

from config import DB_PATH

_SCHEMA = """
CREATE TABLE IF NOT EXISTS warns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    message_content TEXT,
    moderator TEXT DEFAULT 'auto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


async def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.executescript(_SCHEMA)
        await conn.commit()


async def add_warn(
    user_id: int,
    guild_id: int,
    reason: str,
    message_content: str | None = None,
    moderator: str = "auto",
) -> int:
    async with aiosqlite.connect(DB_PATH) as conn:
        cursor = await conn.execute(
            "INSERT INTO warns (user_id, guild_id, reason, message_content, moderator) "
            "VALUES (?, ?, ?, ?, ?)",
            (str(user_id), str(guild_id), reason, message_content, moderator),
        )
        await conn.commit()
        return cursor.lastrowid  # type: ignore[return-value]


async def get_warns(user_id: int, guild_id: int) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        cursor = await conn.execute(
            "SELECT * FROM warns WHERE user_id = ? AND guild_id = ? ORDER BY created_at DESC",
            (str(user_id), str(guild_id)),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def count_warns(user_id: int, guild_id: int) -> int:
    async with aiosqlite.connect(DB_PATH) as conn:
        cursor = await conn.execute(
            "SELECT COUNT(*) FROM warns WHERE user_id = ? AND guild_id = ?",
            (str(user_id), str(guild_id)),
        )
        row = await cursor.fetchone()
        return row[0] if row else 0


async def remove_warn(warn_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as conn:
        cursor = await conn.execute("DELETE FROM warns WHERE id = ?", (warn_id,))
        await conn.commit()
        return cursor.rowcount > 0


async def clear_warns(user_id: int, guild_id: int) -> int:
    async with aiosqlite.connect(DB_PATH) as conn:
        cursor = await conn.execute(
            "DELETE FROM warns WHERE user_id = ? AND guild_id = ?",
            (str(user_id), str(guild_id)),
        )
        await conn.commit()
        return cursor.rowcount
