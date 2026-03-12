"""Bildirimler API - GET /api/v1/notifications.

Spec: specs/012-notifications/spec.md
"""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.notifications import Notification
from src.models.user import User


def _relative_time(dt: datetime) -> str:
    """created_at için göreli zaman metni."""
    if not dt:
        return ""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    if delta.days > 7:
        return dt.strftime("%d.%m.%Y")
    if delta.days > 0:
        return f"{delta.days} gün önce"
    if delta.seconds >= 3600:
        return f"{delta.seconds // 3600} saat önce"
    if delta.seconds >= 60:
        return f"{delta.seconds // 60} dakika önce"
    return "Az önce"


router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=dict)
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Kullanıcının bildirimlerini listeler (Spec: GET /api/v1/notifications)."""
    user_id = current_user.id

    # Unread count
    unread_stmt = select(func.count()).select_from(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read.is_(False),
    )
    unread_result = await session.execute(unread_stmt)
    unread_count = unread_result.scalar_one() or 0

    # Query
    base_q = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        base_q = base_q.where(Notification.is_read.is_(False))
    total_stmt = select(func.count()).select_from(base_q.subquery())
    total_result = await session.execute(total_stmt)
    total = total_result.scalar_one() or 0

    q = base_q.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await session.execute(q)
    rows = result.scalars().all()

    actor_ids = [n.actor_id for n in rows if n.actor_id]
    actors_map: dict[str, User] = {}
    if actor_ids:
        actor_stmt = select(User).where(User.id.in_(actor_ids))
        ar = await session.execute(actor_stmt)
        for a in ar.scalars().all():
            actors_map[a.id] = a

    notifications = []
    for n in rows:
        actor = None
        if n.actor_id and n.actor_id in actors_map:
            a = actors_map[n.actor_id]
            actor = {
                "id": a.id,
                "username": a.username,
                "full_name": f"{a.first_name} {a.last_name}".strip(),
            }
        notifications.append({
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "actor": actor,
            "link": n.link,
            "is_read": n.is_read,
            "read": n.is_read,
            "created_at": n.created_at.isoformat() + "Z" if n.created_at else None,
            "relative_time": _relative_time(n.created_at),
        })

    return {
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "limit": limit,
        "has_more": (page * limit) < total,
        "notifications": notifications,
    }
