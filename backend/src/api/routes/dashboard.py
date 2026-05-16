"""Student Dashboard unified endpoint.

Returns all data needed by NewDashboard.tsx in a single request,
replacing 7 separate API calls with one consolidated response.

Endpoint:
- GET /api/v1/dashboard/me
"""

import json
from datetime import date
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.academic import AcademicCalendarEvent
from src.models.career import CareerListing
from src.models.forum import ForumTopic
from src.models.friendship import Friendship
from src.models.marketplace import MarketplaceListing
from src.models.messages import Conversation
from src.models.user import User
from src.models.course_notes import CourseNoteEntry
from src.schemas.dashboard import DashboardResponse, EventItem, FeedItem, SemesterInfo

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _first_image_url(raw: str | None) -> str | None:
    if not raw:
        return None
    try:
        urls = json.loads(raw)
        return urls[0] if isinstance(urls, list) and urls else None
    except (json.JSONDecodeError, TypeError):
        return raw


@router.get("/me", response_model=DashboardResponse)
async def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    user_id = current_user.id
    today = date.today()

    # ── Unread messages: sum from both sides of Conversation ─────────────────
    unread_as_user1 = await session.scalar(
        select(func.coalesce(func.sum(Conversation.user1_unread_count), 0)).where(
            Conversation.user1_id == user_id
        )
    ) or 0

    unread_as_user2 = await session.scalar(
        select(func.coalesce(func.sum(Conversation.user2_unread_count), 0)).where(
            Conversation.user2_id == user_id
        )
    ) or 0

    unread_message_count = int(unread_as_user1) + int(unread_as_user2)

    # ── Active marketplace listings owned by current user ─────────────────────
    active_listing_count = int(
        await session.scalar(
            select(func.count(MarketplaceListing.id)).where(
                MarketplaceListing.seller_id == user_id,
                MarketplaceListing.status == "active",
            )
        ) or 0
    )

    # ── AI messages remaining ─────────────────────────────────────────────────
    if not settings.ENABLE_USAGE_LIMIT:
        ai_messages_remaining = settings.DAILY_MESSAGE_LIMIT
    else:
        ai_messages_remaining = max(
            settings.DAILY_MESSAGE_LIMIT - current_user.daily_message_count, 0
        )

    friend_count = int(
        await session.scalar(
            select(func.count(Friendship.id)).where(
                or_(
                    Friendship.requester_id == user_id,
                    Friendship.addressee_id == user_id,
                ),
                Friendship.status == "accepted",
            )
        ) or 0
    )

    # ── Course notes count (entries created by current user) ──────────────────
    course_notes_count = int(
        await session.scalar(
            select(func.count(CourseNoteEntry.id)).where(
                CourseNoteEntry.user_id == user_id
            )
        ) or 0
    )

    # ── Upcoming academic calendar events (next 5, approved, future) ──────────
    upcoming_result = await session.execute(
        select(AcademicCalendarEvent)
        .where(
            AcademicCalendarEvent.is_approved == True,
            AcademicCalendarEvent.start_date >= today,
        )
        .order_by(AcademicCalendarEvent.start_date.asc())
        .limit(5)
    )
    upcoming_events_db = upcoming_result.scalars().all()

    upcoming_events: List[EventItem] = [
        EventItem(
            id=ev.id,
            title=ev.title,
            start_date=ev.start_date,
            end_date=ev.end_date,
            event_type=ev.event_type,
        )
        for ev in upcoming_events_db
    ]

    # ── Current semester info (approved event covering today, duration ≥ 60d) ──
    semester_candidates_result = await session.execute(
        select(AcademicCalendarEvent)
        .where(
            AcademicCalendarEvent.is_approved == True,
            AcademicCalendarEvent.start_date <= today,
            AcademicCalendarEvent.end_date != None,
            AcademicCalendarEvent.end_date >= today,
        )
        .order_by(AcademicCalendarEvent.end_date.desc())
        .limit(5)
    )
    semester_candidates = semester_candidates_result.scalars().all()

    semester_info: SemesterInfo | None = None
    for ev in semester_candidates:
        if ev.end_date and (ev.end_date - ev.start_date).days >= 60:
            semester_info = SemesterInfo(
                start_date=ev.start_date,
                end_date=ev.end_date,
                title=ev.title,
            )
            break

    # ── Global feed: latest 5 of each type, merged and sorted ────────────────
    forum_result = await session.execute(
        select(ForumTopic)
        .where(ForumTopic.is_deleted == False)
        .options(selectinload(ForumTopic.author))
        .order_by(ForumTopic.created_at.desc())
        .limit(5)
    )
    forum_topics = forum_result.scalars().all()

    market_result = await session.execute(
        select(MarketplaceListing)
        .where(MarketplaceListing.status == "active")
        .options(selectinload(MarketplaceListing.seller))
        .order_by(MarketplaceListing.created_at.desc())
        .limit(5)
    )
    market_listings = market_result.scalars().all()

    career_result = await session.execute(
        select(CareerListing)
        .where(CareerListing.status == "active")
        .options(selectinload(CareerListing.posted_by_user))
        .order_by(CareerListing.created_at.desc())
        .limit(5)
    )
    career_listings = career_result.scalars().all()

    feed_items: List[FeedItem] = []

    for topic in forum_topics:
        author = topic.author
        if author:
            author_name = f"{author.first_name} {author.last_name}".strip() or author.username
        else:
            author_name = "Anonim"
        feed_items.append(
            FeedItem(
                id=topic.id,
                type="forum",
                title=topic.title,
                author_name=author_name,
                created_at=topic.created_at,
                tags=topic.tags if isinstance(topic.tags, list) else None,
            )
        )

    for listing in market_listings:
        seller = listing.seller
        author_name = (
            f"{seller.first_name} {seller.last_name}".strip() if seller else "Satıcı"
        )
        feed_items.append(
            FeedItem(
                id=listing.id,
                type="marketplace",
                title=listing.title,
                author_name=author_name,
                created_at=listing.created_at,
                price=str(listing.price),
                image_url=_first_image_url(listing.image_urls),
            )
        )

    for listing in career_listings:
        poster = listing.posted_by_user
        author_name = (
            f"{poster.first_name} {poster.last_name}".strip() if poster else "Kullanıcı"
        )
        feed_items.append(
            FeedItem(
                id=listing.id,
                type="career",
                title=listing.title,
                author_name=author_name,
                created_at=listing.created_at,
                company_name=listing.company_name,
                location=listing.location,
                listing_type=listing.type,
                sector=listing.sector,
                salary_range=listing.salary_range,
            )
        )

    feed_items.sort(key=lambda x: x.created_at, reverse=True)
    recent_feed = feed_items[:8]

    return DashboardResponse(
        unread_message_count=unread_message_count,
        active_listing_count=active_listing_count,
        ai_messages_remaining=ai_messages_remaining,
        friend_count=friend_count,
        course_notes_count=course_notes_count,
        recent_feed=recent_feed,
        upcoming_events=upcoming_events,
        semester_info=semester_info,
    )
