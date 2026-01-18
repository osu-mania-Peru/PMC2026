"""
Service for interacting with the osu! API v2.

Handles OAuth token management and beatmap lookups.
"""
import time
import httpx
from config import Config


class OsuAPIService:
    """Service for osu! API v2 interactions."""

    BASE_URL = "https://osu.ppy.sh/api/v2"
    TOKEN_URL = "https://osu.ppy.sh/oauth/token"

    def __init__(self):
        self._token = None
        self._token_expires_at = 0

    async def _get_token(self) -> str:
        """Get a valid OAuth token using client credentials grant."""
        # Return cached token if still valid
        if self._token and time.time() < self._token_expires_at - 60:
            return self._token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": Config.OSU_CLIENT_ID,
                    "client_secret": Config.OSU_CLIENT_SECRET,
                    "grant_type": "client_credentials",
                    "scope": "public",
                },
            )
            response.raise_for_status()
            data = response.json()

            self._token = data["access_token"]
            self._token_expires_at = time.time() + data["expires_in"]
            return self._token

    async def get_beatmap(self, beatmap_id: int) -> dict | None:
        """
        Fetch beatmap data from osu! API.

        Args:
            beatmap_id: The osu! beatmap ID (specific difficulty).

        Returns:
            Dictionary with beatmap data or None if not found.
        """
        try:
            token = await self._get_token()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/beatmaps/{beatmap_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )

                if response.status_code == 404:
                    return None

                response.raise_for_status()
                data = response.json()

                # Extract relevant fields
                beatmapset = data.get("beatmapset", {})

                return {
                    "beatmap_id": str(data["id"]),
                    "beatmapset_id": str(data["beatmapset_id"]),
                    "artist": beatmapset.get("artist", ""),
                    "title": beatmapset.get("title", ""),
                    "difficulty_name": data.get("version", ""),
                    "mapper": beatmapset.get("creator", ""),
                    "star_rating": round(data.get("difficulty_rating", 0), 2),
                    "bpm": int(data.get("bpm", 0)),
                    "length_seconds": data.get("total_length", 0),
                    "od": round(data.get("accuracy", 0), 1),
                    "hp": round(data.get("drain", 0), 1),
                    "cs": round(data.get("cs", 0), 1),
                    "ar": round(data.get("ar", 0), 1),
                    "banner_url": beatmapset.get("covers", {}).get("cover", ""),
                    "thumbnail_url": beatmapset.get("covers", {}).get("list", ""),
                }

        except httpx.HTTPStatusError as e:
            print(f"osu! API error: {e}")
            return None
        except Exception as e:
            print(f"Error fetching beatmap: {e}")
            return None

    async def get_beatmapset(self, beatmapset_id: int) -> dict | None:
        """
        Fetch beatmapset data with all difficulties from osu! API.

        Args:
            beatmapset_id: The osu! beatmapset ID.

        Returns:
            Dictionary with beatmapset data and all beatmaps, or None if not found.
        """
        try:
            token = await self._get_token()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/beatmapsets/{beatmapset_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )

                if response.status_code == 404:
                    return None

                response.raise_for_status()
                data = response.json()

                # Extract beatmaps (difficulties)
                beatmaps = []
                for bm in data.get("beatmaps", []):
                    beatmaps.append({
                        "beatmap_id": str(bm["id"]),
                        "difficulty_name": bm.get("version", ""),
                        "mode": bm.get("mode", ""),
                        "star_rating": round(bm.get("difficulty_rating", 0), 2),
                        "bpm": int(bm.get("bpm", 0)),
                        "length_seconds": bm.get("total_length", 0),
                        "od": round(bm.get("accuracy", 0), 1),
                        "hp": round(bm.get("drain", 0), 1),
                        "cs": round(bm.get("cs", 0), 1),
                        "ar": round(bm.get("ar", 0), 1),
                    })

                # Sort by star rating
                beatmaps.sort(key=lambda x: x["star_rating"])

                return {
                    "beatmapset_id": str(data["id"]),
                    "artist": data.get("artist", ""),
                    "title": data.get("title", ""),
                    "mapper": data.get("creator", ""),
                    "banner_url": data.get("covers", {}).get("cover", ""),
                    "beatmaps": beatmaps,
                }

        except httpx.HTTPStatusError as e:
            print(f"osu! API error: {e}")
            return None
        except Exception as e:
            print(f"Error fetching beatmapset: {e}")
            return None


    async def get_user(self, osu_id: int, mode: str = "mania") -> dict | None:
        """
        Fetch user data from osu! API.

        Args:
            osu_id: The osu! user ID.
            mode: Game mode (osu, taiko, fruits, mania).

        Returns:
            Dictionary with user data or None if not found.
        """
        try:
            token = await self._get_token()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/users/{osu_id}/{mode}",
                    headers={"Authorization": f"Bearer {token}"},
                )

                if response.status_code == 404:
                    return None

                response.raise_for_status()
                data = response.json()

                stats = data.get("statistics", {})

                return {
                    "osu_id": data.get("id"),
                    "username": data.get("username"),
                    "country_code": data.get("country_code"),
                    "global_rank": stats.get("global_rank"),
                    "country_rank": stats.get("country_rank"),
                    "pp": stats.get("pp"),
                    "accuracy": stats.get("hit_accuracy"),
                    "play_count": stats.get("play_count"),
                }

        except httpx.HTTPStatusError as e:
            print(f"osu! API error: {e}")
            return None
        except Exception as e:
            print(f"Error fetching user: {e}")
            return None


# Singleton instance
osu_api = OsuAPIService()
