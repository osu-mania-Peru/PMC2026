import os

from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN: str = os.environ["DISCORD_TOKEN"]
ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY: str = os.environ["OPENAI_API_KEY"]
MOD_LOG_CHANNEL_ID: int = int(os.environ.get("MOD_LOG_CHANNEL_ID", "0"))
TRUSTED_ROLE_IDS: list[int] = [
    int(r) for r in os.environ.get("TRUSTED_ROLE_IDS", "").split(",") if r.strip()
]
WARN_MUTE_THRESHOLD: int = int(os.environ.get("WARN_MUTE_THRESHOLD", "3"))
WARN_KICK_THRESHOLD: int = int(os.environ.get("WARN_KICK_THRESHOLD", "5"))
DB_PATH: str = os.environ.get("DB_PATH", "data/miauriguard.db")
