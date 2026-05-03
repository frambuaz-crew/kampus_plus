"""Admin AI management endpoints.

Endpoints:
- GET  /api/v1/admin/ai/settings  — fetch (or seed) AISystemSettings
- PUT  /api/v1/admin/ai/settings  — update system_prompt / rate_limit_per_day
- GET  /api/v1/admin/ai/stats     — conversation & message statistics
"""

import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import cast, func, select, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import require_admin
from src.models.ai import AIConversation, AIKnowledgeBase, AIMessage, AISystemSettings
from src.models.user import User
from src.schemas.ai_admin import (
    AIKnowledgeBaseCreate,
    AIKnowledgeBaseEntry,
    AIKnowledgeBaseUpdate,
    AISettingsResponse,
    AISettingsUpdate,
    AIStatsResponse,
    DailyUsageItem,
)
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
    seven_days_ago = today_midnight - timedelta(days=6)  # inclusive: today + 6 prior days

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

    # ── Daily usage: messages per day for the last 7 days ──────────────────── #
    daily_result = await session.execute(
        select(
            cast(AIMessage.created_at, Date).label("day"),
            func.count().label("cnt"),
        )
        .where(AIMessage.created_at >= seven_days_ago)
        .group_by(cast(AIMessage.created_at, Date))
        .order_by(cast(AIMessage.created_at, Date))
    )
    rows_by_day = {str(row.day): row.cnt for row in daily_result}

    # Back-fill every day in the 7-day window with 0 so the chart is continuous
    daily_usage = [
        DailyUsageItem(
            date=(seven_days_ago + timedelta(days=i)).strftime("%Y-%m-%d"),
            count=rows_by_day.get(
                (seven_days_ago + timedelta(days=i)).strftime("%Y-%m-%d"), 0
            ),
        )
        for i in range(7)
    ]

    return AIStatsResponse(
        total_conversations=total_conversations,
        messages_today=messages_today,
        active_conversations=active_conversations,
        daily_usage=daily_usage,
    )


# ─── Knowledge Base CRUD ──────────────────────────────────────────────────────

def _kb_keywords(raw: object) -> list[str]:
    """Always return a plain Python list regardless of how the driver returned keywords."""
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else []
        except (ValueError, TypeError):
            return []
    return []

@router.get("/knowledge-base", response_model=list[AIKnowledgeBaseEntry])
async def list_knowledge_base(
    session: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[AIKnowledgeBaseEntry]:
    result = await session.execute(
        select(AIKnowledgeBase).order_by(AIKnowledgeBase.priority.desc())
    )
    rows = result.scalars().all()
    return [
        AIKnowledgeBaseEntry(
            id=row.id,
            keywords=_kb_keywords(row.keywords),
            answer=row.answer,
            priority=row.priority,
            is_active=row.is_active,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.post("/knowledge-base", response_model=AIKnowledgeBaseEntry, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base_entry(
    payload: AIKnowledgeBaseCreate,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AIKnowledgeBaseEntry:
    row = AIKnowledgeBase(
        id=str(uuid4()),
        keywords=json.dumps(payload.keywords),
        answer=payload.answer,
        priority=payload.priority,
        is_active=payload.is_active,
        created_by=admin.id,
        created_at=_utc_naive(),
        updated_at=_utc_naive(),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return AIKnowledgeBaseEntry(
        id=row.id,
        keywords=_kb_keywords(row.keywords),
        answer=row.answer,
        priority=row.priority,
        is_active=row.is_active,
        created_at=row.created_at,
    )


@router.put("/knowledge-base/{entry_id}", response_model=AIKnowledgeBaseEntry)
async def update_knowledge_base_entry(
    entry_id: str,
    payload: AIKnowledgeBaseUpdate,
    session: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AIKnowledgeBaseEntry:
    result = await session.execute(
        select(AIKnowledgeBase).where(AIKnowledgeBase.id == entry_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Kayıt bulunamadı."}},
        )

    if payload.keywords is not None:
        row.keywords = json.dumps(payload.keywords)
    if payload.answer is not None:
        row.answer = payload.answer
    if payload.priority is not None:
        row.priority = payload.priority
    if payload.is_active is not None:
        row.is_active = payload.is_active
    row.updated_at = _utc_naive()

    await session.commit()
    await session.refresh(row)
    return AIKnowledgeBaseEntry(
        id=row.id,
        keywords=_kb_keywords(row.keywords),
        answer=row.answer,
        priority=row.priority,
        is_active=row.is_active,
        created_at=row.created_at,
    )


@router.delete("/knowledge-base/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base_entry(
    entry_id: str,
    session: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    result = await session.execute(
        select(AIKnowledgeBase).where(AIKnowledgeBase.id == entry_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Kayıt bulunamadı."}},
        )
    await session.delete(row)
    await session.commit()
