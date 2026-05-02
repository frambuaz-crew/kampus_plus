"""Admin kullanıcı yönetimi Pydantic şemaları."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class AdminUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    role: str
    is_verified: bool
    is_active: bool
    university: Optional[str] = None
    department: Optional[str] = None
    grade: Optional[str] = None
    profile_picture_url: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None


class AdminUserListResponse(BaseModel):
    users: List[AdminUserItem]
    total: int
    page: int
    limit: int


class AdminUserStats(BaseModel):
    total: int
    verified: int
    unverified: int
    blocked: int


class UserBlockRequest(BaseModel):
    block: bool


class UserVerifyRequest(BaseModel):
    verified: bool


class UserRoleUpdateRequest(BaseModel):
    role: str
