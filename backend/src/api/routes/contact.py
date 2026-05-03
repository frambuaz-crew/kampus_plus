"""Student contact message endpoints.

Endpoints:
- POST /api/v1/contact         — Submit a new contact/support message
- GET  /api/v1/contact/history — Get current user's message history
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_active_user
from src.models.settings import ContactMessage
from src.models.user import User
from src.schemas.contact import (
    ContactHistoryResponse,
    ContactMessageCreate,
    ContactMessageResponse,
)

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("", response_model=ContactMessageResponse, status_code=status.HTTP_201_CREATED)
async def submit_contact_message(
    payload: ContactMessageCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ContactMessageResponse:
    """Submit a support/contact message. Status starts as 'pending'."""
    msg = ContactMessage(
        user_id=current_user.id,
        subject=payload.subject,
        message=payload.message,
        status="pending",
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)

    return ContactMessageResponse(
        id=msg.id,
        subject=msg.subject,
        message=msg.message,
        status=msg.status,
        created_at=msg.created_at,
        user_id=msg.user_id,
        answered_at=msg.answered_at,
        answered_by=msg.answered_by,
    )


@router.get("/history", response_model=ContactHistoryResponse)
async def get_contact_history(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ContactHistoryResponse:
    """Return all contact messages submitted by the current user, newest first."""
    count_result = await session.execute(
        select(func.count())
        .select_from(ContactMessage)
        .where(ContactMessage.user_id == current_user.id)
    )
    total: int = count_result.scalar_one()

    result = await session.execute(
        select(ContactMessage)
        .where(ContactMessage.user_id == current_user.id)
        .order_by(ContactMessage.created_at.desc())
    )
    rows = result.scalars().all()

    return ContactHistoryResponse(
        messages=[
            ContactMessageResponse(
                id=r.id,
                subject=r.subject,
                message=r.message,
                status=r.status,
                created_at=r.created_at,
                user_id=r.user_id,
                answered_at=r.answered_at,
                answered_by=r.answered_by,
            )
            for r in rows
        ],
        total=total,
    )
