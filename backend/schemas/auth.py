from pydantic import BaseModel
from typing import Optional


class UserResponse(BaseModel):
    id: int
    osu_id: int
    username: str
    flag_code: str
    discord_username: Optional[str] = None
    is_staff: bool
    is_registered: bool
    seed_number: Optional[int] = None
    stays_playing: bool = False

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    auth_url: str


class CallbackResponse(BaseModel):
    user: UserResponse
    token: str


class LogoutResponse(BaseModel):
    message: str
