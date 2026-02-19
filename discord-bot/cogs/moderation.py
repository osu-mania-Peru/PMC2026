import io
import logging
from datetime import timedelta

import discord
from discord.ext import commands

import db
import llm
from config import MOD_LOG_CHANNEL_ID, TRUSTED_ROLE_IDS, WARN_KICK_THRESHOLD, WARN_MUTE_THRESHOLD

logger = logging.getLogger("miauriguard.moderation")

_IMAGE_TYPES = {
    "image/png": "image/png",
    "image/jpeg": "image/jpeg",
    "image/gif": "image/gif",
    "image/webp": "image/webp",
}


class Moderation(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    def _is_trusted(self, member: discord.Member) -> bool:
        return any(role.id in TRUSTED_ROLE_IDS for role in member.roles)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot:
            return
        if not message.guild:
            return
        if isinstance(message.author, discord.Member) and self._is_trusted(message.author):
            return
        if not message.content and not message.attachments:
            return

        results: list[dict] = []

        # Moderate text
        if message.content:
            result = await llm.moderate_text(message.content)
            results.append(result)

        # Moderate image attachments
        for attachment in message.attachments:
            media_type = _IMAGE_TYPES.get(attachment.content_type or "")
            if not media_type:
                continue
            try:
                image_data = await attachment.read()
                # Skip images larger than 5MB
                if len(image_data) > 5 * 1024 * 1024:
                    continue
                result = await llm.moderate_image(image_data, media_type, message.content or "")
                results.append(result)
            except Exception:
                logger.exception("Failed to download attachment %s", attachment.url)

        # Find worst verdict
        worst = "safe"
        worst_reason = ""
        for r in results:
            verdict = r.get("verdict", "safe")
            if verdict == "severe" or (verdict == "warning" and worst == "safe"):
                worst = verdict
                worst_reason = r.get("reason", "")
            if worst == "severe":
                break

        if worst == "safe":
            return

        await self._handle_violation(message, worst, worst_reason)

    async def _handle_violation(
        self, message: discord.Message, verdict: str, reason: str
    ) -> None:
        member = message.author
        guild = message.guild
        if not guild or not isinstance(member, discord.Member):
            return

        # Store snippet (truncated)
        snippet = (message.content or "[image]")[:200]

        # Add warn to DB
        warn_id = await db.add_warn(member.id, guild.id, reason, snippet)
        warn_count = await db.count_warns(member.id, guild.id)

        # Delete the offending message
        try:
            await message.delete()
        except discord.Forbidden:
            logger.warning("Cannot delete message in #%s - missing permissions", message.channel)

        # Determine action based on warn count
        action = self._get_action(warn_count)

        # Execute escalation
        await self._execute_action(member, action, warn_count, guild)

        # Send warning embed in channel
        embed = discord.Embed(
            title="Message Removed",
            description=f"{member.mention}, your message was removed for violating server rules.",
            color=discord.Color.red() if verdict == "severe" else discord.Color.orange(),
        )
        embed.add_field(name="Reason", value=reason, inline=False)
        embed.add_field(name="Action", value=action, inline=True)
        embed.add_field(name="Warnings", value=f"{warn_count}", inline=True)
        embed.set_footer(text=f"Warn #{warn_id}")

        try:
            await message.channel.send(embed=embed, delete_after=15)
        except discord.Forbidden:
            pass

        # DM the user
        try:
            dm_embed = discord.Embed(
                title=f"Warning from {guild.name}",
                description=f"Your message was removed. Reason: {reason}",
                color=discord.Color.orange(),
            )
            dm_embed.add_field(name="Action", value=action, inline=True)
            dm_embed.add_field(name="Total Warnings", value=f"{warn_count}", inline=True)
            await member.send(embed=dm_embed)
        except discord.Forbidden:
            pass

        # Log to mod-log channel
        await self._log_action(guild, member, snippet, reason, action, warn_count, verdict)

    def _get_action(self, warn_count: int) -> str:
        if warn_count >= WARN_KICK_THRESHOLD:
            return "Kicked from server"
        if warn_count >= WARN_MUTE_THRESHOLD + 1:  # 4th warn
            return "Timed out for 24 hours"
        if warn_count >= WARN_MUTE_THRESHOLD:  # 3rd warn
            return "Timed out for 1 hour"
        return "Warning issued"

    async def _execute_action(
        self, member: discord.Member, action: str, warn_count: int, guild: discord.Guild
    ) -> None:
        try:
            if warn_count >= WARN_KICK_THRESHOLD:
                await member.kick(reason=f"MiauriGuard: {warn_count} warnings reached")
            elif warn_count >= WARN_MUTE_THRESHOLD + 1:
                await member.timeout(timedelta(hours=24), reason=f"MiauriGuard: {warn_count} warnings")
            elif warn_count >= WARN_MUTE_THRESHOLD:
                await member.timeout(timedelta(hours=1), reason=f"MiauriGuard: {warn_count} warnings")
        except discord.Forbidden:
            logger.warning("Cannot execute action '%s' on %s - missing permissions", action, member)

    async def _log_action(
        self,
        guild: discord.Guild,
        member: discord.Member,
        snippet: str,
        reason: str,
        action: str,
        warn_count: int,
        verdict: str,
    ) -> None:
        if not MOD_LOG_CHANNEL_ID:
            return
        channel = guild.get_channel(MOD_LOG_CHANNEL_ID)
        if not channel or not isinstance(channel, discord.TextChannel):
            return

        embed = discord.Embed(
            title="Moderation Action",
            color=discord.Color.red() if verdict == "severe" else discord.Color.orange(),
            timestamp=discord.utils.utcnow(),
        )
        embed.add_field(name="User", value=f"{member} ({member.id})", inline=True)
        embed.add_field(name="Action", value=action, inline=True)
        embed.add_field(name="Warnings", value=f"{warn_count}", inline=True)
        embed.add_field(name="Reason", value=reason, inline=False)
        embed.add_field(name="Message Snippet", value=f"```{snippet[:100]}```", inline=False)
        embed.set_thumbnail(url=member.display_avatar.url)

        try:
            await channel.send(embed=embed)
        except discord.Forbidden:
            logger.warning("Cannot send to mod-log channel")


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Moderation(bot))
