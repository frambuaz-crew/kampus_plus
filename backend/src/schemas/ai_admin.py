"""Pydantic schemas for Admin AI management endpoints."""

from datetime import datetime
from typing import List, Optional

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


class DailyUsageItem(BaseModel):
    date: str   # "YYYY-MM-DD"
    count: int


class AIStatsResponse(BaseModel):
    total_conversations: int
    messages_today: int
    active_conversations: int
    daily_usage: List[DailyUsageItem] = []


class AIKnowledgeBaseEntry(BaseModel):
    id: str
    university_id: Optional[str] = None
    keywords: List[str]
    answer: str
    priority: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AIKnowledgeBaseCreate(BaseModel):
    keywords: List[str] = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    priority: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True)


class AIKnowledgeBaseUpdate(BaseModel):
    keywords: Optional[List[str]] = None
    answer: Optional[str] = Field(None, min_length=1)
    priority: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
