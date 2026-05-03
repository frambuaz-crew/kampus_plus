"""Admin contact message management endpoints.

Endpoints:
- GET   /api/v1/admin/messages             — Paginated list, optional status filter
- GET   /api/v1/admin/messages/stats       — Counts per status
- PATCH /api/v1/admin/messages/{id}/status — Update message status
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import require_admin
from src.models.settings import ContactMessage
from src.models.user import User
from src.schemas.contact import (
    AdminContactMessageResponse,
    AdminMessagesResponse,
    ContactMessageSenderInfo,
    ContactMessageStats,
    ContactMessageStatusUpdate,
)

router = APIRouter(prefix="/admin/messages", tags=["Admin – Messages"])

_VALID_STATUSES = {"pending", "answered", "spam"}


def _utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.get("/stats", response_model=ContactMessageStats)
async def get_message_stats(
    session: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ContactMessageStats:
    """Return counts of contact messages grouped by status."""
    pending_result = await session.execute(
        select(func.count()).select_from(ContactMessage).where(ContactMessage.status == "pending")
    )
    answered_result = await session.execute(
        select(func.count()).select_from(ContactMessage).where(ContactMessage.status == "answered")
    )
    spam_result = await session.execute(
        select(func.count()).select_from(ContactMessage).where(ContactMessage.status == "spam")
    )
    return ContactMessageStats(
        pending=pending_result.scalar_one(),
        answered=answered_result.scalar_one(),
        spam=spam_result.scalar_one(),
    )


@router.get("", response_model=AdminMessagesResponse)
async def list_messages(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminMessagesResponse:
    """Return a paginated list of contact messages, optionally filtered by status.
    Each item includes the sender's basic info.
    """
    if status_filter is not None and status_filter not in _VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_STATUS",
                    "message": f"status must be one of: {sorted(_VALID_STATUSES)}",
                }
            },
        )

    base_stmt = (
        select(ContactMessage)
        .options(selectinload(ContactMessage.user))
        .order_by(ContactMessage.created_at.desc())
    )
    count_stmt = select(func.count()).select_from(ContactMessage)

    if status_filter:
        base_stmt = base_stmt.where(ContactMessage.status == status_filter)
        count_stmt = count_stmt.where(ContactMessage.status == status_filter)

    total_result = await session.execute(count_stmt)
    total: int = total_result.scalar_one()

    offset = (page - 1) * limit
    paginated_stmt = base_stmt.offset(offset).limit(limit)
    result = await session.execute(paginated_stmt)
    rows = result.scalars().all()

    items = []
    for row in rows:
        sender = row.user
        items.append(
            AdminContactMessageResponse(
                id=row.id,
                subject=row.subject,
                message=row.message,
                status=row.status,
                created_at=row.created_at,
                answered_at=row.answered_at,
                answered_by=row.answered_by,
                sender=ContactMessageSenderInfo(
                    id=sender.id,
                    username=sender.username,
                    first_name=sender.first_name,
                    last_name=sender.last_name,
                    email=sender.email,
                ),
            )
        )

    return AdminMessagesResponse(messages=items, total=total, page=page, limit=limit)


@router.patch("/{message_id}/status", response_model=AdminContactMessageResponse)
async def update_message_status(
    message_id: str,
    payload: ContactMessageStatusUpdate,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminContactMessageResponse:
    """Update the status of a contact message.
    Sets answered_by and answered_at when transitioning to 'answered' or 'spam'.
    Clears them when reverting to 'pending'.
    """
    result = await session.execute(
        select(ContactMessage)
        .options(selectinload(ContactMessage.user))
        .where(ContactMessage.id == message_id)
    )
    msg = result.scalar_one_or_none()

    if msg is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Mesaj bulunamadı."}},
        )

    msg.status = payload.status
    if payload.status in ("answered", "spam"):
        msg.answered_by = admin.id
        msg.answered_at = _utc_naive()
    else:
        msg.answered_by = None
        msg.answered_at = None

    await session.commit()
    await session.refresh(msg)

    sender = msg.user
    return AdminContactMessageResponse(
        id=msg.id,
        subject=msg.subject,
        message=msg.message,
        status=msg.status,
        created_at=msg.created_at,
        answered_at=msg.answered_at,
        answered_by=msg.answered_by,
        sender=ContactMessageSenderInfo(
            id=sender.id,
            username=sender.username,
            first_name=sender.first_name,
            last_name=sender.last_name,
            email=sender.email,
        ),
    )
