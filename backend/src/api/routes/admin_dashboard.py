"""Admin dashboard aggregation endpoint.

Endpoints:
- GET /api/v1/admin/dashboard  — single-query aggregation for dashboard stat cards
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import require_admin
from src.models.academic import AcademicContribution
from src.models.ai import AIConversation, AIMessage
from src.models.career import CareerListing, CareerReport
from src.models.forum import ForumReport, ForumTopic
from src.models.marketplace import MarketplaceListing, MarketplaceReport
from src.models.settings import ContactMessage
from src.models.user import User, UserRole
from src.schemas.admin_dashboard import DashboardStatsResponse

router = APIRouter(prefix="/admin/dashboard", tags=["Admin – Dashboard"])


def _today_midnight_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)


@router.get("", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> DashboardStatsResponse:
    is_uni_admin = admin.role == UserRole.UNIVERSITY_ADMIN
    uid = admin.university_id if is_uni_admin else None

    # ── pending_contributions ─────────────────────────────────────────────── #
    if is_uni_admin:
        pending_stmt = (
            select(func.count())
            .select_from(AcademicContribution)
            .join(User, AcademicContribution.user_id == User.id)
            .where(
                AcademicContribution.status == "pending",
                User.university_id == uid,
            )
        )
    else:
        pending_stmt = (
            select(func.count())
            .select_from(AcademicContribution)
            .where(AcademicContribution.status == "pending")
        )
    pending_contributions = (await session.execute(pending_stmt)).scalar_one()

    # ── approved_data ─────────────────────────────────────────────────────── #
    if is_uni_admin:
        approved_stmt = (
            select(func.count())
            .select_from(AcademicContribution)
            .join(User, AcademicContribution.user_id == User.id)
            .where(
                AcademicContribution.status == "approved",
                User.university_id == uid,
            )
        )
    else:
        approved_stmt = (
            select(func.count())
            .select_from(AcademicContribution)
            .where(AcademicContribution.status == "approved")
        )
    approved_data = (await session.execute(approved_stmt)).scalar_one()

    # ── forum_reports ─────────────────────────────────────────────────────── #
    if is_uni_admin:
        forum_stmt = (
            select(func.count())
            .select_from(ForumReport)
            .join(ForumTopic, ForumReport.topic_id == ForumTopic.id)
            .where(
                ForumReport.status == "pending",
                ForumTopic.university_id == uid,
            )
        )
    else:
        forum_stmt = (
            select(func.count())
            .select_from(ForumReport)
            .where(ForumReport.status == "pending")
        )
    forum_reports = (await session.execute(forum_stmt)).scalar_one()

    # ── marketplace_reports ───────────────────────────────────────────────── #
    if is_uni_admin:
        marketplace_stmt = (
            select(func.count())
            .select_from(MarketplaceReport)
            .join(MarketplaceListing, MarketplaceReport.listing_id == MarketplaceListing.id)
            .join(User, MarketplaceListing.seller_id == User.id)
            .where(
                MarketplaceReport.status == "pending",
                User.university_id == uid,
            )
        )
    else:
        marketplace_stmt = (
            select(func.count())
            .select_from(MarketplaceReport)
            .where(MarketplaceReport.status == "pending")
        )
    marketplace_reports = (await session.execute(marketplace_stmt)).scalar_one()

    # ── career_reports ────────────────────────────────────────────────────── #
    if is_uni_admin:
        career_stmt = (
            select(func.count())
            .select_from(CareerReport)
            .join(CareerListing, CareerReport.listing_id == CareerListing.id)
            .join(User, CareerListing.posted_by == User.id)
            .where(
                CareerReport.status == "pending",
                User.university_id == uid,
            )
        )
    else:
        career_stmt = (
            select(func.count())
            .select_from(CareerReport)
            .where(CareerReport.status == "pending")
        )
    career_reports = (await session.execute(career_stmt)).scalar_one()

    # ── new_messages — ContactMessage has no university_id ───────────────── #
    # university_admin receives 0 because contact messages are platform-wide
    if is_uni_admin:
        new_messages = 0
    else:
        new_messages = (
            await session.execute(
                select(func.count())
                .select_from(ContactMessage)
                .where(ContactMessage.status == "pending")
            )
        ).scalar_one()

    # ── total_users ───────────────────────────────────────────────────────── #
    if is_uni_admin:
        total_users_stmt = (
            select(func.count())
            .select_from(User)
            .where(User.university_id == uid)
        )
    else:
        total_users_stmt = select(func.count()).select_from(User)
    total_users = (await session.execute(total_users_stmt)).scalar_one()

    # ── ai_messages_today ─────────────────────────────────────────────────── #
    if is_uni_admin:
        ai_stmt = (
            select(func.count())
            .select_from(AIMessage)
            .join(AIConversation, AIMessage.conversation_id == AIConversation.id)
            .join(User, AIConversation.user_id == User.id)
            .where(
                AIMessage.created_at >= _today_midnight_utc(),
                User.university_id == uid,
            )
        )
    else:
        ai_stmt = (
            select(func.count())
            .select_from(AIMessage)
            .where(AIMessage.created_at >= _today_midnight_utc())
        )
    ai_messages_today = (await session.execute(ai_stmt)).scalar_one()

    return DashboardStatsResponse(
        pending_contributions=pending_contributions,
        approved_data=approved_data,
        reported_items=forum_reports + marketplace_reports + career_reports,
        new_messages=new_messages,
        total_users=total_users,
        ai_messages_today=ai_messages_today,
    )
