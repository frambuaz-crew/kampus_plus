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
from src.models.ai import AIMessage
from src.models.career import CareerReport
from src.models.forum import ForumReport
from src.models.marketplace import MarketplaceReport
from src.models.settings import ContactMessage
from src.models.user import User
from src.schemas.admin_dashboard import DashboardStatsResponse

router = APIRouter(prefix="/admin/dashboard", tags=["Admin – Dashboard"])


def _today_midnight_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)


@router.get("", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    session: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> DashboardStatsResponse:
    pending_contributions = (
        await session.execute(
            select(func.count())
            .select_from(AcademicContribution)
            .where(AcademicContribution.status == "pending")
        )
    ).scalar_one()

    approved_data = (
        await session.execute(
            select(func.count())
            .select_from(AcademicContribution)
            .where(AcademicContribution.status == "approved")
        )
    ).scalar_one()

    forum_reports = (
        await session.execute(
            select(func.count())
            .select_from(ForumReport)
            .where(ForumReport.status == "pending")
        )
    ).scalar_one()

    marketplace_reports = (
        await session.execute(
            select(func.count())
            .select_from(MarketplaceReport)
            .where(MarketplaceReport.status == "pending")
        )
    ).scalar_one()

    career_reports = (
        await session.execute(
            select(func.count())
            .select_from(CareerReport)
            .where(CareerReport.status == "pending")
        )
    ).scalar_one()

    new_messages = (
        await session.execute(
            select(func.count())
            .select_from(ContactMessage)
            .where(ContactMessage.status == "pending")
        )
    ).scalar_one()

    total_users = (
        await session.execute(select(func.count()).select_from(User))
    ).scalar_one()

    ai_messages_today = (
        await session.execute(
            select(func.count())
            .select_from(AIMessage)
            .where(AIMessage.created_at >= _today_midnight_utc())
        )
    ).scalar_one()

    return DashboardStatsResponse(
        pending_contributions=pending_contributions,
        approved_data=approved_data,
        reported_items=forum_reports + marketplace_reports + career_reports,
        new_messages=new_messages,
        total_users=total_users,
        ai_messages_today=ai_messages_today,
    )
