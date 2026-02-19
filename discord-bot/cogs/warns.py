import logging

import discord
from discord.ext import commands

import db

logger = logging.getLogger("miauriguard.warns")


class Warns(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.command(name="warns")
    @commands.has_permissions(moderate_members=True)
    async def list_warns(self, ctx: commands.Context, member: discord.Member) -> None:
        """Show all warnings for a user."""
        if not ctx.guild:
            return

        warns = await db.get_warns(member.id, ctx.guild.id)
        if not warns:
            await ctx.send(f"{member.mention} has no warnings.")
            return

        embed = discord.Embed(
            title=f"Warnings for {member}",
            description=f"Total: **{len(warns)}** warning(s)",
            color=discord.Color.orange(),
        )
        for w in warns[:10]:  # Show last 10
            embed.add_field(
                name=f"#{w['id']} - {w['created_at']}",
                value=f"**Reason:** {w['reason']}\n**By:** {w['moderator']}",
                inline=False,
            )
        if len(warns) > 10:
            embed.set_footer(text=f"Showing 10 of {len(warns)} warnings")

        await ctx.send(embed=embed)

    @commands.command(name="removewarn")
    @commands.has_permissions(moderate_members=True)
    async def remove_warn(self, ctx: commands.Context, warn_id: int) -> None:
        """Remove a specific warning by ID."""
        removed = await db.remove_warn(warn_id)
        if removed:
            await ctx.send(f"Warn #{warn_id} removed.")
        else:
            await ctx.send(f"Warn #{warn_id} not found.")

    @commands.command(name="clearwarns")
    @commands.has_permissions(moderate_members=True)
    async def clear_warns(self, ctx: commands.Context, member: discord.Member) -> None:
        """Clear all warnings for a user."""
        if not ctx.guild:
            return

        count = await db.clear_warns(member.id, ctx.guild.id)
        await ctx.send(f"Cleared **{count}** warning(s) for {member.mention}.")


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Warns(bot))
