import asyncio
import logging

import discord
from discord.ext import commands

import db
from config import DISCORD_TOKEN

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("miauriguard")

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready() -> None:
    logger.info("MiauriGuard is online as %s (ID: %s)", bot.user, bot.user.id if bot.user else "?")
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="for bad behavior"))


async def main() -> None:
    await db.init_db()
    async with bot:
        await bot.load_extension("cogs.moderation")
        await bot.load_extension("cogs.warns")
        await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    asyncio.run(main())
