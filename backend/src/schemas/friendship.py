"""Arkadaşlık (Friendship) Pydantic şemaları."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class UserSummary(BaseModel):
    """Karşı taraf için minimal kullanıcı özeti."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    first_name: str
    last_name: str
    profile_picture_url: Optional[str] = None


class FriendshipCreate(BaseModel):
    """Arkadaşlık isteği gönderme şeması."""

    addressee_id: str


class FriendshipUpdate(BaseModel):
    """Arkadaşlık isteğini yanıtlama şeması."""

    status: Literal["accepted", "rejected"]


class FriendshipResponse(BaseModel):
    """Arkadaşlık kaydı yanıt şeması."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    requester_id: str
    addressee_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    requester: Optional[UserSummary] = None
    addressee: Optional[UserSummary] = None
