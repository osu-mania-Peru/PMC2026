"""
Auth Microservice - Handles osu! OAuth only
Runs on separate domain: auth.perumaniacup.info
"""
import base64
import httpx
from typing import Optional
from fastapi import FastAPI, Request, Query
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from utils.osu_api import OsuAPI
from utils.jwt_utils import create_access_token

# Create FastAPI app
app = FastAPI(
    title="PMC Auth Service",
    description="osu! OAuth Authentication Microservice",
    version="1.0.0",
)

# Configure CORS
origins = [
    f"{Config.FRONTEND_URL}:{Config.FRONTEND_PORT}",
    Config.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    Config.MAIN_BACKEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "name": "PMC Auth Service",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/auth/login")
async def login(request: Request):
    """
    Initiate osu! OAuth flow
    Redirects to osu! OAuth for authentication
    """
    # Get origin from Referer header or use default
    origin = request.headers.get("referer", "")
    if not origin:
        origin = f"{Config.FRONTEND_URL}:{Config.FRONTEND_PORT}"

    # Encode origin as state for callback
    state = base64.urlsafe_b64encode(origin.encode()).decode()
    auth_url = OsuAPI.get_auth_url(state=state)

    print(f"[AUTH] Redirecting to OAuth provider from origin: {origin}")
    return RedirectResponse(url=auth_url, status_code=302)


@app.get("/auth/callback")
async def callback(
    code: str = Query(..., description="Authorization code from osu!"),
    state: Optional[str] = Query(None, description="State parameter for origin tracking"),
):
    """
    Handle OAuth callback from osu!
    Exchange code for token, get user info, create JWT, send to main backend
    """
    # Determine redirect origin
    redirect_origin = f"{Config.FRONTEND_URL}:{Config.FRONTEND_PORT}"
    if state:
        try:
            redirect_origin = base64.urlsafe_b64decode(state.encode()).decode()
        except Exception:
            pass

    if not code:
        print("[AUTH] No authorization code provided")
        return RedirectResponse(url=f"{redirect_origin}?error=no_code", status_code=302)

    # Exchange code for access token
    access_token = await OsuAPI.exchange_code_for_token(code)
    if not access_token:
        print("[AUTH] Failed to exchange code for token")
        return RedirectResponse(url=f"{redirect_origin}?error=auth_failed", status_code=302)

    # Get user info from osu!
    osu_user = await OsuAPI.get_user_info(access_token)
    if not osu_user:
        print("[AUTH] Failed to get user info")
        return RedirectResponse(url=f"{redirect_origin}?error=user_failed", status_code=302)

    print(f"[AUTH] User authenticated: {osu_user['username']} (osu_id: {osu_user['id']})")

    # Send user data to main backend to create/update user
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{Config.MAIN_BACKEND_URL}/internal/users/sync",
                json={
                    "osu_id": osu_user["id"],
                    "username": osu_user["username"],
                    "flag_code": osu_user.get("country_code", "XX"),
                },
                headers={
                    "X-Internal-Secret": Config.INTERNAL_SECRET
                },
                timeout=10.0
            )

            if response.status_code != 200:
                print(f"[AUTH] Failed to sync user with main backend: {response.text}")
                return RedirectResponse(url=f"{redirect_origin}?error=sync_failed", status_code=302)

            user_data = response.json()
            print(f"[AUTH] User synced with main backend: {user_data}")

        except Exception as e:
            print(f"[AUTH] Error syncing user with main backend: {e}")
            return RedirectResponse(url=f"{redirect_origin}?error=sync_failed", status_code=302)

    # Create JWT token with user data from main backend
    token = create_access_token({
        "user_id": user_data["id"],
        "osu_id": user_data["osu_id"],
        "username": user_data["username"],
        "is_staff": user_data["is_staff"],
    })

    print(f"[AUTH] JWT created for user {user_data['username']}")

    # Redirect to frontend with token
    return RedirectResponse(url=f"{redirect_origin}?token={token}", status_code=302)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=Config.DEBUG
    )
