"""Admin AI management endpoints.

Endpoints:
- GET  /api/v1/admin/ai/settings  — fetch (or seed) AISystemSettings
- PUT  /api/v1/admin/ai/settings  — update system_prompt / rate_limit_per_day
- GET  /api/v1/admin/ai/stats     — conversation & message statistics
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import require_admin
from src.models.ai import AIConversation, AIMessage, AISystemSettings
from src.models.user import User
from src.schemas.ai_admin import AISettingsResponse, AISettingsUpdate, AIStatsResponse
from src.services.ai_service import AIService

router = APIRouter(prefix="/admin/ai", tags=["Admin – AI"])


def _utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _get_or_create_settings(session: AsyncSession) -> AISystemSettings:
    """Return the single AISystemSettings row, creating a default one if absent."""
    stmt = (
        select(AISystemSettings)
        .options(selectinload(AISystemSettings.updater))
        .limit(1)
    )
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()

    if row is None:
        row = AISystemSettings(
            id=str(uuid4()),
            system_prompt=AIService._AGENT_SYSTEM_PROMPT_TEMPLATE,
            rate_limit_per_day=50,
            updated_by=None,
            updated_at=_utc_naive(),
        )
        session.add(row)
        await session.commit()
        await session.refresh(row)

    return row


@router.get("/settings", response_model=AISettingsResponse)
async def get_ai_settings(
    session: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AISettingsResponse:
    row = await _get_or_create_settings(session)
    return AISettingsResponse(
        id=row.id,
        system_prompt=row.system_prompt,
        rate_limit_per_day=row.rate_limit_per_day,
        updated_at=row.updated_at,
        updated_by_username=row.updater.username if row.updater else None,
    )


@router.put("/settings", response_model=AISettingsResponse)
async def update_ai_settings(
    payload: AISettingsUpdate,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AISettingsResponse:
    if payload.system_prompt is None and payload.rate_limit_per_day is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "NO_FIELDS",
                    "message": "En az bir alan gönderilmelidir (system_prompt veya rate_limit_per_day).",
                }
            },
        )

    row = await _get_or_create_settings(session)

    if payload.system_prompt is not None:
        row.system_prompt = payload.system_prompt
    if payload.rate_limit_per_day is not None:
        row.rate_limit_per_day = payload.rate_limit_per_day

    row.updated_by = admin.id
    row.updated_at = _utc_naive()

    await session.commit()

    # Re-fetch with updater loaded for the response
    stmt = (
        select(AISystemSettings)
        .where(AISystemSettings.id == row.id)
        .options(selectinload(AISystemSettings.updater))
    )
    result = await session.execute(stmt)
    row = result.scalar_one()

    return AISettingsResponse(
        id=row.id,
        system_prompt=row.system_prompt,
        rate_limit_per_day=row.rate_limit_per_day,
        updated_at=row.updated_at,
        updated_by_username=row.updater.username if row.updater else None,
    )


@router.get("/stats", response_model=AIStatsResponse)
async def get_ai_stats(
    session: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AIStatsResponse:
    now = _utc_naive()
    today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    last_24h = now - timedelta(hours=24)

    total_conversations_result = await session.execute(
        select(func.count()).select_from(AIConversation)
    )
    total_conversations: int = total_conversations_result.scalar_one()

    messages_today_result = await session.execute(
        select(func.count())
        .select_from(AIMessage)
        .where(AIMessage.created_at >= today_midnight)
    )
    messages_today: int = messages_today_result.scalar_one()

    active_conversations_result = await session.execute(
        select(func.count(func.distinct(AIMessage.conversation_id)))
        .where(AIMessage.created_at >= last_24h)
    )
    active_conversations: int = active_conversations_result.scalar_one()

    return AIStatsResponse(
        total_conversations=total_conversations,
        messages_today=messages_today,
        active_conversations=active_conversations,
    )
