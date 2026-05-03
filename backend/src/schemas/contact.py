"""Pydantic schemas for Contact Message endpoints."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ContactMessageCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=100)
    message: str = Field(..., min_length=10, max_length=2000)


class ContactMessageResponse(BaseModel):
    id: str
    subject: str
    message: str
    status: str
    created_at: datetime
    user_id: str
    answered_at: Optional[datetime] = None
    answered_by: Optional[str] = None

    model_config = {"from_attributes": True}


class ContactMessageSenderInfo(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    email: str

    model_config = {"from_attributes": True}


class AdminContactMessageResponse(BaseModel):
    id: str
    subject: str
    message: str
    status: str
    created_at: datetime
    answered_at: Optional[datetime] = None
    answered_by: Optional[str] = None
    sender: ContactMessageSenderInfo

    model_config = {"from_attributes": True}


class ContactMessageStats(BaseModel):
    pending: int
    answered: int
    spam: int


class ContactMessageStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|answered|spam)$")


class ContactHistoryResponse(BaseModel):
    messages: List[ContactMessageResponse]
    total: int


class AdminMessagesResponse(BaseModel):
    messages: List[AdminContactMessageResponse]
    total: int
    page: int
    limit: int
