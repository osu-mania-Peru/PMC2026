"""
osu! API utilities for OAuth and user information
Based on the Go implementation pattern
"""
import httpx
from typing import Dict, Any, Optional
from config import Config


class OsuAPI:
    """
    Client for osu! OAuth2 and API v2 interactions.

    Provides methods for OAuth authorization flow and user data retrieval.
    All methods are static as no instance state is required.

    Attributes:
        OSU_OAUTH_URL: OAuth authorization endpoint.
        OSU_TOKEN_URL: OAuth token exchange endpoint.
        OSU_API_BASE: API v2 base URL.
    """

    OSU_OAUTH_URL = "https://osu.ppy.sh/oauth/authorize"
    OSU_TOKEN_URL = "https://osu.ppy.sh/oauth/token"
    OSU_API_BASE = "https://osu.ppy.sh/api/v2"

    @staticmethod
    def get_auth_url(state: Optional[str] = None) -> str:
        """
        Generate osu! OAuth authorization URL.

        Args:
            state: Optional CSRF state parameter.

        Returns:
            Full authorization URL for redirect.
        """
        params = {
            "client_id": Config.OSU_CLIENT_ID,
            "redirect_uri": Config.OSU_REDIRECT_URI,
            "response_type": "code",
            "scope": "public identify",
        }

        if state:
            params["state"] = state

        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{OsuAPI.OSU_OAUTH_URL}?{query_string}"

    @staticmethod
    async def exchange_code_for_token(code: str) -> Optional[str]:
        """
        Exchange OAuth authorization code for access token.

        Args:
            code: Authorization code from OAuth callback.

        Returns:
            Access token string if successful, ``None`` on failure.
        """
        data = {
            "client_id": Config.OSU_CLIENT_ID,
            "client_secret": Config.OSU_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": Config.OSU_REDIRECT_URI,
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "PMC2025-Tournament/1.0",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    OsuAPI.OSU_TOKEN_URL,
                    data=data,
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code != 200:
                    print(f"Token exchange failed: {response.text}")
                    return None

                result = response.json()
                return result.get("access_token")

            except Exception as e:
                print(f"Error exchanging code for token: {e}")
                return None

    @staticmethod
    async def get_user_info(access_token: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user profile from osu! API.

        Args:
            access_token: Valid OAuth access token.

        Returns:
            User data dict with keys like ``id``, ``username``, ``country_code``,
            or ``None`` on failure.
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "PMC2025-Tournament/1.0",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{OsuAPI.OSU_API_BASE}/me",
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code != 200:
                    print(f"Failed to get user info: {response.text}")
                    return None

                return response.json()

            except Exception as e:
                print(f"Error getting user info: {e}")
                return None
