"""Pydantic schemas for Admin AI management endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AISettingsResponse(BaseModel):
    id: str
    system_prompt: str
    rate_limit_per_day: int
    updated_at: datetime
    updated_by_username: Optional[str] = None

    model_config = {"from_attributes": True}


class AISettingsUpdate(BaseModel):
    system_prompt: Optional[str] = Field(None, min_length=10)
    rate_limit_per_day: Optional[int] = Field(None, ge=1, le=10000)


class AIStatsResponse(BaseModel):
    total_conversations: int
    messages_today: int
    active_conversations: int
