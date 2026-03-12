"""Forum API routes - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - Forum Endpoints
Spec: specs/005-forum-page/spec.md
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List
from collections import defaultdict
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.models.forum import ForumCategory, ForumTopic, ForumReply

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forum", tags=["Forum"])

# Rate limiting (in-memory)
topic_creation_attempts: dict = defaultdict(list)
reply_creation_attempts: dict = defaultdict(list)
helpful_attempts: dict = defaultdict(list)

TOPIC_RATE_LIMIT = 10  # 10 konu / 1 saat
REPLY_RATE_LIMIT = 30  # 30 cevap / 1 saat
HELPFUL_RATE_LIMIT = 50  # 50 beğeni / 1 saat
RATE_LIMIT_WINDOW = 3600  # 1 saat


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CategoryResponse(BaseModel):
    """Forum kategori response."""
    id: str
    name: str
    description: Optional[str]
    icon: Optional[str]
    topic_count: int = 0
    
    model_config = {"from_attributes": True}


class TopicAuthorResponse(BaseModel):
    """Konu yazarı bilgisi."""
    id: str
    username: str
    first_name: str
    last_name: str
    profile_picture_url: Optional[str] = None
    
    model_config = {"from_attributes": True}


class TopicResponse(BaseModel):
    """Forum konu response."""
    id: str
    title: str
    content: str
    author: Optional[TopicAuthorResponse]
    category_id: str
    category_name: Optional[str] = None
    reply_count: int
    view_count: int
    helpful_count: int
    is_pinned: bool
    last_reply_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class ReplyAuthorResponse(BaseModel):
    """Cevap yazarı bilgisi."""
    id: str
    username: str
    first_name: str
    last_name: str
    profile_picture_url: Optional[str] = None
    
    model_config = {"from_attributes": True}


class ReplyResponse(BaseModel):
    """Forum cevap response."""
    id: str
    content: str
    author: Optional[ReplyAuthorResponse]
    helpful_count: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class TopicDetailResponse(BaseModel):
    """Forum konu detay response."""
    topic: TopicResponse
    replies: List[ReplyResponse]


class CreateTopicRequest(BaseModel):
    """Yeni konu oluşturma request."""
    category_id: str = Field(..., description="Kategori ID")
    title: str = Field(..., min_length=10, max_length=255, description="Başlık (min 10, max 255 karakter)")
    content: str = Field(..., min_length=20, description="İçerik (min 20 karakter)")


class CreateReplyRequest(BaseModel):
    """Yeni cevap oluşturma request."""
    content: str = Field(..., min_length=10, description="İçerik (min 10 karakter)")


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/categories", response_model=dict)
async def get_categories(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Forum kategorilerini listele.
    
    Spec: GET /api/v1/forum/categories
    """
    result = await session.execute(
        select(ForumCategory)
        .where(ForumCategory.is_active == True)
        .order_by(ForumCategory.order_index, ForumCategory.name)
    )
    categories = result.scalars().all()
    
    # Her kategori için topic sayısını hesapla
    categories_with_counts = []
    for category in categories:
        topic_count_result = await session.execute(
            select(func.count(ForumTopic.id))
            .where(
                and_(
                    ForumTopic.category_id == category.id,
                    ForumTopic.is_deleted == False
                )
            )
        )
        topic_count = topic_count_result.scalar() or 0
        
        categories_with_counts.append({
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "icon": category.icon,
            "topic_count": topic_count,
        })
    
    return {"categories": categories_with_counts}


@router.get("/topics", response_model=dict)
async def get_topics(
    category_id: Optional[str] = Query(None, description="Kategori ID ile filtrele"),
    page: int = Query(1, ge=1, description="Sayfa numarası"),
    limit: int = Query(20, ge=1, le=100, description="Sayfa başına kayıt"),
    sort: str = Query("newest", description="Sıralama: newest, oldest, most_replies, most_views"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Forum konularını listele.
    
    Spec: GET /api/v1/forum/topics
    """
    query = select(ForumTopic).where(ForumTopic.is_deleted == False)
    
    # Kategori filtresi
    if category_id:
        query = query.where(ForumTopic.category_id == category_id)
    
    # Sıralama
    if sort == "newest":
        query = query.order_by(ForumTopic.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(ForumTopic.created_at.asc())
    elif sort == "most_replies":
        query = query.order_by(ForumTopic.reply_count.desc(), ForumTopic.created_at.desc())
    elif sort == "most_views":
        query = query.order_by(ForumTopic.view_count.desc(), ForumTopic.created_at.desc())
    else:
        # Pin'lenmiş konular önce, sonra yeni
        query = query.order_by(ForumTopic.is_pinned.desc(), ForumTopic.created_at.desc())
    
    # Toplam sayı
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    # Author bilgilerini yükle
    query = query.options(selectinload(ForumTopic.author))
    
    result = await session.execute(query)
    topics = result.scalars().all()
    
    topics_list = []
    for topic in topics:
        author_data = None
        if topic.author:
            author_data = {
                "id": topic.author.id,
                "username": topic.author.username,
                "first_name": topic.author.first_name,
                "last_name": topic.author.last_name,
                "profile_picture_url": topic.author.profile_picture_url,
            }
        
        topics_list.append({
            "id": topic.id,
            "title": topic.title,
            "content": topic.content[:200] + "..." if len(topic.content) > 200 else topic.content,  # Preview
            "author": author_data,
            "category_id": topic.category_id,
            "reply_count": topic.reply_count,
            "view_count": topic.view_count,
            "helpful_count": topic.helpful_count,
            "is_pinned": topic.is_pinned,
            "last_reply_at": topic.last_reply_at.isoformat() if topic.last_reply_at else None,
            "created_at": topic.created_at.isoformat(),
            "updated_at": topic.updated_at.isoformat(),
        })
    
    return {
        "topics": topics_list,
        "total": total,
        "page": page,
        "limit": limit,
    }


# Alias endpoint for frontend compatibility (uses "threads" instead of "topics")
@router.get("/threads", response_model=dict)
async def get_threads(
    category_id: Optional[str] = Query(None, description="Kategori ID ile filtrele"),
    page: int = Query(1, ge=1, description="Sayfa numarası"),
    page_size: int = Query(20, ge=1, le=100, description="Sayfa başına kayıt"),
    sort: str = Query("newest", description="Sıralama: newest, oldest, most_replies, most_views"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Forum konularını listele (threads alias).
    
    Frontend compatibility için /threads endpoint'i.
    Response format: { "items": [...], "total": ..., "page": ..., "page_size": ... }
    """
    # page_size parametresini limit'e çevir
    limit = page_size
    
    query = select(ForumTopic).where(ForumTopic.is_deleted == False)
    
    # Kategori filtresi
    if category_id:
        query = query.where(ForumTopic.category_id == category_id)
    
    # Sıralama
    if sort == "newest":
        query = query.order_by(ForumTopic.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(ForumTopic.created_at.asc())
    elif sort == "most_replies":
        query = query.order_by(ForumTopic.reply_count.desc(), ForumTopic.created_at.desc())
    elif sort == "most_views":
        query = query.order_by(ForumTopic.view_count.desc(), ForumTopic.created_at.desc())
    else:
        # Pin'lenmiş konular önce, sonra yeni
        query = query.order_by(ForumTopic.is_pinned.desc(), ForumTopic.created_at.desc())
    
    # Toplam sayı
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    # Author bilgilerini yükle
    query = query.options(selectinload(ForumTopic.author))
    
    result = await session.execute(query)
    topics = result.scalars().all()
    
    items_list = []
    for topic in topics:
        author_data = None
        if topic.author:
            author_data = {
                "id": topic.author.id,
                "username": topic.author.username,
                "first_name": topic.author.first_name,
                "last_name": topic.author.last_name,
                "profile_picture_url": topic.author.profile_picture_url,
            }
        
        items_list.append({
            "id": topic.id,
            "title": topic.title,
            "content": topic.content[:200] + "..." if len(topic.content) > 200 else topic.content,  # Preview
            "author": author_data,
            "category_id": topic.category_id,
            "reply_count": topic.reply_count,
            "view_count": topic.view_count,
            "helpful_count": topic.helpful_count,
            "is_pinned": topic.is_pinned,
            "last_reply_at": topic.last_reply_at.isoformat() if topic.last_reply_at else None,
            "created_at": topic.created_at.isoformat(),
            "updated_at": topic.updated_at.isoformat(),
        })
    
    return {
        "items": items_list,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# Alias endpoint for frontend compatibility
@router.get("/threads/{thread_id}", response_model=TopicDetailResponse)
async def get_thread_detail(
    thread_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TopicDetailResponse:
    """Forum konusu detayı (threads alias).
    
    Frontend compatibility için /threads/{thread_id} endpoint'i.
    """
    return await get_topic_detail(thread_id, session, current_user)


@router.get("/topics/{topic_id}", response_model=TopicDetailResponse)
async def get_topic_detail(
    topic_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TopicDetailResponse:
    """Forum konusu detayı.
    
    Spec: GET /api/v1/forum/topics/{topic_id}
    Action: View count artırılır
    """
    result = await session.execute(
        select(ForumTopic)
        .where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
        .options(selectinload(ForumTopic.author))
    )
    topic = result.scalar_one_or_none()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Konu bulunamadı"}}
        )
    
    # View count artır
    topic.view_count += 1
    await session.commit()
    
    # Cevapları getir
    replies_result = await session.execute(
        select(ForumReply)
        .where(and_(ForumReply.topic_id == topic_id, ForumReply.is_deleted == False))
        .order_by(ForumReply.created_at.asc())
        .options(selectinload(ForumReply.author))
    )
    replies = replies_result.scalars().all()
    
    # Topic response
    author_data = None
    if topic.author:
        author_data = TopicAuthorResponse(
            id=topic.author.id,
            username=topic.author.username,
            first_name=topic.author.first_name,
            last_name=topic.author.last_name,
            profile_picture_url=topic.author.profile_picture_url,
        )
    
    topic_response = TopicResponse(
        id=topic.id,
        title=topic.title,
        content=topic.content,
        author=author_data,
        category_id=topic.category_id,
        reply_count=topic.reply_count,
        view_count=topic.view_count,
        helpful_count=topic.helpful_count,
        is_pinned=topic.is_pinned,
        last_reply_at=topic.last_reply_at,
        created_at=topic.created_at,
        updated_at=topic.updated_at,
    )
    
    # Replies response
    replies_list = []
    for reply in replies:
        reply_author = None
        if reply.author:
            reply_author = ReplyAuthorResponse(
                id=reply.author.id,
                username=reply.author.username,
                first_name=reply.author.first_name,
                last_name=reply.author.last_name,
                profile_picture_url=reply.author.profile_picture_url,
            )
        
        replies_list.append(ReplyResponse(
            id=reply.id,
            content=reply.content,
            author=reply_author,
            helpful_count=reply.helpful_count,
            created_at=reply.created_at,
            updated_at=reply.updated_at,
        ))
    
    return TopicDetailResponse(topic=topic_response, replies=replies_list)


# Alias endpoint for frontend compatibility
@router.post("/threads", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_thread(
    request: CreateTopicRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Yeni konu oluştur (threads alias).
    
    Frontend compatibility için /threads endpoint'i.
    """
    return await create_topic(request, session, current_user)


@router.post("/topics", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_topic(
    request: CreateTopicRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Yeni konu oluştur.
    
    Spec: POST /api/v1/forum/topics
    Rate Limit: 10 konu / 1 saat / user
    """
    # Rate limiting
    now = datetime.now(timezone.utc).timestamp()
    user_attempts = topic_creation_attempts[current_user.id]
    user_attempts[:] = [ts for ts in user_attempts if now - ts < RATE_LIMIT_WINDOW]
    
    if len(user_attempts) >= TOPIC_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Çok fazla konu oluşturdunuz. Lütfen {RATE_LIMIT_WINDOW // 60} dakika sonra tekrar deneyin."
                }
            }
        )
    
    # Kategori kontrolü
    category_result = await session.execute(
        select(ForumCategory).where(ForumCategory.id == request.category_id)
    )
    category = category_result.scalar_one_or_none()
    
    if not category or not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Kategori bulunamadı"}}
        )
    
    # Konu oluştur
    topic = ForumTopic(
        id=str(uuid4()),
        category_id=request.category_id,
        author_id=current_user.id,
        title=request.title,
        content=request.content,
        is_pinned=False,
        is_deleted=False,
        view_count=0,
        reply_count=0,
        helpful_count=0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    
    # Rate limit tracking
    topic_creation_attempts[current_user.id].append(now)
    
    return {"success": True, "topic_id": topic.id}


# Alias endpoint for frontend compatibility
@router.post("/threads/{thread_id}/replies", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_thread_reply(
    thread_id: str,
    request: CreateReplyRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Konuya cevap yaz (threads alias).
    
    Frontend compatibility için /threads/{thread_id}/replies endpoint'i.
    """
    return await create_reply(thread_id, request, session, current_user)


@router.post("/topics/{topic_id}/replies", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_reply(
    topic_id: str,
    request: CreateReplyRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Konuya cevap yaz.
    
    Spec: POST /api/v1/forum/topics/{topic_id}/replies
    Rate Limit: 30 cevap / 1 saat / user
    """
    # Rate limiting
    now = datetime.now(timezone.utc).timestamp()
    user_attempts = reply_creation_attempts[current_user.id]
    user_attempts[:] = [ts for ts in user_attempts if now - ts < RATE_LIMIT_WINDOW]
    
    if len(user_attempts) >= REPLY_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Çok fazla cevap yazdınız. Lütfen {RATE_LIMIT_WINDOW // 60} dakika sonra tekrar deneyin."
                }
            }
        )
    
    # Konu kontrolü
    topic_result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    topic = topic_result.scalar_one_or_none()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Konu bulunamadı"}}
        )
    
    # Cevap oluştur
    reply = ForumReply(
        id=str(uuid4()),
        topic_id=topic_id,
        author_id=current_user.id,
        content=request.content,
        helpful_count=0,
        is_deleted=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    session.add(reply)
    
    # Topic güncelle: reply_count ve last_reply_at
    topic.reply_count += 1
    topic.last_reply_at = datetime.now(timezone.utc)
    topic.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(reply)
    
    # Rate limit tracking
    reply_creation_attempts[current_user.id].append(now)
    
    # TODO: Bildirim gönder (eğer kendi konusu değilse)
    # if topic.author_id != current_user.id:
    #     await create_notification(...)
    
    return {"success": True, "reply_id": reply.id}


@router.post("/replies/{reply_id}/helpful", response_model=dict)
async def mark_reply_helpful(
    reply_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Cevabı beğen.
    
    Spec: POST /api/v1/forum/replies/{reply_id}/helpful
    Rate Limit: 50 beğeni / 1 saat / user
    """
    # Rate limiting
    now = datetime.now(timezone.utc).timestamp()
    user_attempts = helpful_attempts[current_user.id]
    user_attempts[:] = [ts for ts in user_attempts if now - ts < RATE_LIMIT_WINDOW]
    
    if len(user_attempts) >= HELPFUL_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Çok fazla beğeni yaptınız. Lütfen {RATE_LIMIT_WINDOW // 60} dakika sonra tekrar deneyin."
                }
            }
        )
    
    # Cevap kontrolü
    reply_result = await session.execute(
        select(ForumReply).where(and_(ForumReply.id == reply_id, ForumReply.is_deleted == False))
    )
    reply = reply_result.scalar_one_or_none()
    
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Cevap bulunamadı"}}
        )
    
    # Beğeni sayısını artır
    reply.helpful_count += 1
    reply.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(reply)
    
    # Rate limit tracking
    helpful_attempts[current_user.id].append(now)
    
    return {"success": True, "helpful_count": reply.helpful_count}
