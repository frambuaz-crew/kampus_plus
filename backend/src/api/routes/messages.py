"""Mesajlar / konuşmalar API - GET /api/v1/messages/conversations.

Spec: specs/013-messages/spec.md
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid import uuid4

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.career import CareerListing, CareerMessage
from src.models.direct import DirectMessage
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


class SendMessageRequest(BaseModel):
    content: str


class StartDirectRequest(BaseModel):
    receiver_id: str


@router.post("/direct", status_code=status.HTTP_200_OK)
async def get_or_create_direct_conversation(
    body: StartDirectRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """İki kullanıcı arasında doğrudan (direct) konuşma başlatır veya mevcutu döner."""
    if body.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinize mesaj gönderemezsiniz.")

    # Alıcı kullanıcının var olduğunu doğrula
    receiver_stmt = select(User).where(User.id == body.receiver_id)
    receiver_result = await session.execute(receiver_stmt)
    receiver = receiver_result.scalar_one_or_none()
    if not receiver:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    # Mevcut direct conversation var mı? (çift yönlü kontrol)
    existing_stmt = select(Conversation).where(
        Conversation.type == "direct",
        or_(
            (Conversation.user1_id == current_user.id) & (Conversation.user2_id == body.receiver_id),
            (Conversation.user1_id == body.receiver_id) & (Conversation.user2_id == current_user.id),
        ),
    )
    existing_result = await session.execute(existing_stmt)
    conv = existing_result.scalar_one_or_none()

    if conv:
        return {"conversation_id": conv.id, "created": False}

    # Yeni conversation oluştur
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    conv = Conversation(
        id=str(uuid4()),
        type="direct",
        reference_id=None,
        user1_id=current_user.id,
        user2_id=body.receiver_id,
        user1_unread_count=0,
        user2_unread_count=0,
        last_message_at=now,
    )
    session.add(conv)
    await session.commit()
    await session.refresh(conv)

    return {"conversation_id": conv.id, "created": True}


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
    direct_conv_ids = [c.id for c in convs if c.type == "direct"]

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
    if direct_conv_ids:
        stmt = (
            select(DirectMessage.conversation_id, DirectMessage.content, DirectMessage.created_at)
            .where(DirectMessage.conversation_id.in_(direct_conv_ids))
            .order_by(DirectMessage.created_at.desc())
        )
        dr = await session.execute(stmt)
        for row in dr.all():
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
        if c.type == "marketplace":
            ref = listings_m.get(c.reference_id)
        elif c.type == "career":
            ref = listings_c.get(c.reference_id)
        else:
            ref = None
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


# ─── Conversation detail & messages ──────────────────────────────────────────

@router.get("/conversations/{conv_id}", response_model=dict)
async def get_conversation(
    conv_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Tek bir konuşmanın bilgilerini döner."""
    conv = await _get_authorized_conversation(conv_id, current_user.id, session)

    other = conv.user2 if conv.user1_id == current_user.id else conv.user1
    full_name = f"{other.first_name} {other.last_name}".strip() if other else ""

    ref: dict[str, Any] = {"id": conv.reference_id, "title": "", "image_url": None}
    if conv.type == "career":
        r = await session.execute(
            select(CareerListing.id, CareerListing.title, CareerListing.company_name)
            .where(CareerListing.id == conv.reference_id)
        )
        row = r.first()
        if row:
            ref = {"id": row[0], "title": row[1], "company_name": row[2]}
    elif conv.type == "marketplace":
        r = await session.execute(
            select(MarketplaceListing.id, MarketplaceListing.title, MarketplaceListing.image_urls)
            .where(MarketplaceListing.id == conv.reference_id)
        )
        row = r.first()
        if row:
            ref = {"id": row[0], "title": row[1], "image_url": row[2]}
    elif conv.type == "direct":
        ref = None

    return {
        "id": conv.id,
        "type": conv.type,
        "reference": ref,
        "other_user": {
            "id": other.id if other else None,
            "username": other.username if other else "",
            "full_name": full_name,
            "profile_picture_url": other.profile_picture_url if other else None,
        },
        "user1_id": conv.user1_id,
        "user2_id": conv.user2_id,
    }


@router.get("/conversations/{conv_id}/messages", response_model=dict)
async def get_conv_messages(
    conv_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Konuşmadaki mesajları döner ve okunmamışları okundu olarak işaretler."""
    conv = await _get_authorized_conversation(conv_id, current_user.id, session)

    offset = (page - 1) * limit

    if conv.type == "career":
        count_stmt = select(func.count()).where(CareerMessage.conversation_id == conv_id)
        total = (await session.execute(count_stmt)).scalar_one()

        msg_stmt = (
            select(CareerMessage)
            .where(CareerMessage.conversation_id == conv_id)
            .order_by(CareerMessage.created_at.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await session.execute(msg_stmt)
        msgs = result.scalars().all()

        for m in msgs:
            if m.receiver_id == current_user.id and not m.is_read:
                m.is_read = True

        if conv.user1_id == current_user.id:
            conv.user1_unread_count = 0
        else:
            conv.user2_unread_count = 0

        await session.commit()

        messages = [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "content": m.content,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat() + "Z",
            }
            for m in msgs
        ]
    elif conv.type == "direct":
        count_stmt = select(func.count()).where(DirectMessage.conversation_id == conv_id)
        total = (await session.execute(count_stmt)).scalar_one()

        msg_stmt = (
            select(DirectMessage)
            .where(DirectMessage.conversation_id == conv_id)
            .order_by(DirectMessage.created_at.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await session.execute(msg_stmt)
        msgs = result.scalars().all()

        for m in msgs:
            if m.receiver_id == current_user.id and not m.is_read:
                m.is_read = True

        if conv.user1_id == current_user.id:
            conv.user1_unread_count = 0
        else:
            conv.user2_unread_count = 0

        await session.commit()

        messages = [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "content": m.content,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat() + "Z",
            }
            for m in msgs
        ]
    else:
        count_stmt = select(func.count()).where(MarketplaceMessage.conversation_id == conv_id)
        total = (await session.execute(count_stmt)).scalar_one()

        msg_stmt = (
            select(MarketplaceMessage)
            .where(MarketplaceMessage.conversation_id == conv_id)
            .order_by(MarketplaceMessage.created_at.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await session.execute(msg_stmt)
        msgs = result.scalars().all()

        for m in msgs:
            if m.receiver_id == current_user.id and not m.is_read:
                m.is_read = True

        if conv.user1_id == current_user.id:
            conv.user1_unread_count = 0
        else:
            conv.user2_unread_count = 0

        await session.commit()

        messages = [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "content": m.content,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat() + "Z",
            }
            for m in msgs
        ]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": (page * limit) < total,
        "messages": messages,
    }


@router.post("/conversations/{conv_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_conv_message(
    conv_id: str,
    body: SendMessageRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Bir konuşmaya yeni mesaj gönderir."""
    if not body.content or len(body.content.strip()) < 1:
        raise HTTPException(status_code=422, detail="Mesaj boş olamaz.")

    conv = await _get_authorized_conversation(conv_id, current_user.id, session)

    other_id = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if conv.type == "career":
        # Listing ID'yi mevcut bir mesajdan çek
        existing_stmt = select(CareerMessage.listing_id).where(
            CareerMessage.conversation_id == conv_id
        ).limit(1)
        existing_result = await session.execute(existing_stmt)
        listing_id = existing_result.scalar_one_or_none()

        if not listing_id:
            listing_id = conv.reference_id

        msg = CareerMessage(
            id=str(uuid4()),
            conversation_id=conv_id,
            sender_id=current_user.id,
            receiver_id=other_id,
            listing_id=listing_id,
            content=body.content.strip(),
            is_read=False,
        )
    elif conv.type == "direct":
        msg = DirectMessage(
            id=str(uuid4()),
            conversation_id=conv_id,
            sender_id=current_user.id,
            receiver_id=other_id,
            content=body.content.strip(),
            is_read=False,
        )
    else:
        existing_stmt = select(MarketplaceMessage.listing_id).where(
            MarketplaceMessage.conversation_id == conv_id
        ).limit(1)
        existing_result = await session.execute(existing_stmt)
        listing_id = existing_result.scalar_one_or_none()

        if not listing_id:
            listing_id = conv.reference_id

        msg = MarketplaceMessage(
            id=str(uuid4()),
            conversation_id=conv_id,
            sender_id=current_user.id,
            receiver_id=other_id,
            listing_id=listing_id,
            content=body.content.strip(),
            is_read=False,
        )

    session.add(msg)

    # Update conversation metadata
    conv.last_message_at = now
    if conv.user1_id == current_user.id:
        conv.user2_unread_count = (conv.user2_unread_count or 0) + 1
    else:
        conv.user1_unread_count = (conv.user1_unread_count or 0) + 1

    try:
        await session.commit()
        await session.refresh(msg)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Mesaj gönderilemedi: {str(e)}")

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "is_read": msg.is_read,
        "created_at": msg.created_at.isoformat() + "Z",
    }


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _get_authorized_conversation(
    conv_id: str,
    user_id: str,
    session: AsyncSession,
) -> Conversation:
    """Conversation'ı çeker; yoksa veya kullanıcı üye değilse 404/403 fırlatır."""
    stmt = (
        select(Conversation)
        .where(Conversation.id == conv_id)
        .options(selectinload(Conversation.user1), selectinload(Conversation.user2))
    )
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()

    if not conv:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")
    if conv.user1_id != user_id and conv.user2_id != user_id:
        raise HTTPException(status_code=403, detail="Bu konuşmaya erişim yetkiniz yok.")

    return conv
