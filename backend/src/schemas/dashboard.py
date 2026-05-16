from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class FeedItem(BaseModel):
    id: str
    type: str  # 'forum' | 'marketplace' | 'career'
    title: str
    author_name: str
    created_at: datetime
    # Forum
    tags: Optional[List[str]] = None
    # Marketplace
    price: Optional[str] = None
    image_url: Optional[str] = None
    # Career
    company_name: Optional[str] = None
    location: Optional[str] = None
    listing_type: Optional[str] = None
    sector: Optional[str] = None
    salary_range: Optional[str] = None


class EventItem(BaseModel):
    id: str
    title: str
    start_date: date
    end_date: Optional[date] = None
    event_type: Optional[str] = None


class SemesterInfo(BaseModel):
    start_date: date
    end_date: date
    title: str


class DashboardResponse(BaseModel):
    unread_message_count: int
    active_listing_count: int
    ai_messages_remaining: int
    friend_count: int
    course_notes_count: int
    recent_feed: List[FeedItem]
    upcoming_events: List[EventItem]
    semester_info: Optional[SemesterInfo] = None
