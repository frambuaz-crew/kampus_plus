"""Mesajlar / konuşmalar API - GET /api/v1/messages/conversations.

Spec: specs/013-messages/spec.md
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.career import CareerListing, CareerMessage
from src.models.marketplace import MarketplaceListing, MarketplaceMessage
from src.models.messages import Conversation
from src.models.user import User


def _relative_time(dt: datetime) -> str:
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


router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/conversations", response_model=dict)
async def list_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Kullanıcının konuşmalarını listeler (Spec: GET /api/v1/messages/conversations)."""
    user_id = current_user.id

    # Konuşmaları getir (current user user1 veya user2)
    base_q = (
        select(Conversation)
        .where((Conversation.user1_id == user_id) | (Conversation.user2_id == user_id))
        .options(
            selectinload(Conversation.user1),
            selectinload(Conversation.user2),
        )
    )
    total_stmt = select(func.count()).select_from(base_q.subquery())
    total_result = await session.execute(total_stmt)
    total = total_result.scalar_one() or 0

    # Toplam okunmamış (tüm konuşmalarda)
    conv_ids_stmt = select(Conversation.id).where(
        (Conversation.user1_id == user_id) | (Conversation.user2_id == user_id)
    )
    conv_ids_result = await session.execute(conv_ids_stmt)
    all_conv_ids = [r[0] for r in conv_ids_result.all()]
    total_unread = 0
    if all_conv_ids:
        # Her konuşmada current user'ın unread sayısı: user1 ise user1_unread_count, user2 ise user2_unread_count
        convs_stmt = select(
            Conversation.user1_unread_count,
            Conversation.user2_unread_count,
            Conversation.user1_id,
        ).where(Conversation.id.in_(all_conv_ids))
        cr = await session.execute(convs_stmt)
        for row in cr.all():
            total_unread += row[0] if row[2] == user_id else row[1]

    q = base_q.order_by(Conversation.last_message_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await session.execute(q)
    convs = result.scalars().unique().all()

    conv_ids = [c.id for c in convs]
    marketplace_conv_ids = [c.id for c in convs if c.type == "marketplace"]
    career_conv_ids = [c.id for c in convs if c.type == "career"]

    # Son mesajlar: conversation_id -> (content, created_at)
    last_messages: dict[str, tuple[str, datetime]] = {}
    if marketplace_conv_ids:
        stmt = (
            select(MarketplaceMessage.conversation_id, MarketplaceMessage.content, MarketplaceMessage.created_at)
            .where(MarketplaceMessage.conversation_id.in_(marketplace_conv_ids))
            .order_by(MarketplaceMessage.created_at.desc())
        )
        mr = await session.execute(stmt)
        for row in mr.all():
            cid, content, created = row[0], row[1], row[2]
            if cid and cid not in last_messages:
                last_messages[cid] = (content, created)
    if career_conv_ids:
        stmt = (
            select(CareerMessage.conversation_id, CareerMessage.content, CareerMessage.created_at)
            .where(CareerMessage.conversation_id.in_(career_conv_ids))
            .order_by(CareerMessage.created_at.desc())
        )
        cr = await session.execute(stmt)
        for row in cr.all():
            cid, content, created = row[0], row[1], row[2]
            if cid and cid not in last_messages:
                last_messages[cid] = (content, created)

    # Referanslar (listing title, image_url / company_name)
    ref_ids_m = list({c.reference_id for c in convs if c.type == "marketplace"})
    ref_ids_c = list({c.reference_id for c in convs if c.type == "career"})
    listings_m: dict[str, Any] = {}
    listings_c: dict[str, Any] = {}
    if ref_ids_m:
        stmt = select(MarketplaceListing.id, MarketplaceListing.title, MarketplaceListing.image_urls).where(
            MarketplaceListing.id.in_(ref_ids_m)
        )
        lr = await session.execute(stmt)
        for row in lr.all():
            # image_urls JSON string olabilir; spec'te image_url tek
            img = row[2]
            if isinstance(img, str) and img.startswith("["):
                import json
                try:
                    arr = json.loads(img)
                    img = arr[0] if arr else None
                except Exception:
                    img = None
            listings_m[row[0]] = {"id": row[0], "title": row[1], "image_url": img}
    if ref_ids_c:
        stmt = select(CareerListing.id, CareerListing.title, CareerListing.company_name).where(
            CareerListing.id.in_(ref_ids_c)
        )
        lr = await session.execute(stmt)
        for row in lr.all():
            listings_c[row[0]] = {"id": row[0], "title": row[1], "company_name": row[2]}

    conversations = []
    for c in convs:
        other = c.user2 if c.user1_id == user_id else c.user1
        if not other:
            continue
        unread = c.user1_unread_count if c.user1_id == user_id else c.user2_unread_count
        last_content, last_at = last_messages.get(c.id, ("", None))
        ref = listings_m.get(c.reference_id) if c.type == "marketplace" else listings_c.get(c.reference_id)
        reference = ref or {"id": c.reference_id, "title": "", "image_url": None, "company_name": None}
        if "company_name" not in reference and c.type == "career":
            reference["company_name"] = None
        if "image_url" not in reference and c.type == "marketplace":
            reference["image_url"] = None

        full_name = f"{other.first_name} {other.last_name}".strip()
        conversations.append({
            "id": c.id,
            "type": c.type,
            "reference": reference,
            "listing_title": reference.get("title", ""),
            "other_user": {
                "id": other.id,
                "username": other.username,
                "full_name": full_name,
                "first_name": other.first_name,
                "last_name": other.last_name,
                "profile_picture_url": other.profile_picture_url,
            },
            "last_message": last_content,
            "last_message_at": last_at.isoformat() + "Z" if last_at else None,
            "relative_time": _relative_time(last_at),
            "unread_count": unread,
            "last_message_obj": {
                "content": last_content,
                "created_at": last_at.isoformat() + "Z" if last_at else None,
            },
        })

    return {
        "total": total,
        "total_unread": total_unread,
        "unread_count": total_unread,
        "page": page,
        "limit": limit,
        "has_more": (page * limit) < total,
        "conversations": conversations,
    }
