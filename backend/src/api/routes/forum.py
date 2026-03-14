"""Forum API routes - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - Forum Endpoints
Spec: specs/005-forum-page/spec.md
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List
from collections import defaultdict
from uuid import uuid4
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.models.forum import ForumCategory, ForumTopic, ForumReply
from src.models.favorite import UserFavorite

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
    university: Optional[str] = None
    profile_picture_url: Optional[str] = None
    
    model_config = {"from_attributes": True}


class TopicResponse(BaseModel):
    """Forum konu response."""
    id: str
    title: str
    content: str
    topic_type: str = "text"
    tags: Optional[str] = None
    image_urls: Optional[str] = None
    event_date: Optional[datetime] = None
    author: Optional[TopicAuthorResponse]
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    reply_count: int
    view_count: int
    helpful_count: int
    is_pinned: bool
    is_liked_by_me: bool = False
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
    parent_id: Optional[str] = None
    author: Optional[ReplyAuthorResponse]
    helpful_count: int
    is_liked_by_me: bool = False
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class TopicDetailResponse(BaseModel):
    """Forum konu detay response."""
    topic: TopicResponse
    replies: List[ReplyResponse]


class CreateTopicRequest(BaseModel):
    """Yeni konu oluşturma request."""
    category_id: Optional[str] = Field(None, description="Kategori ID (Artık zorunlu değil)")
    title: str = Field(..., description="Başlık")
    content: str = Field(..., description="İçerik")
    topic_type: str = Field("text", description="Konu tipi (text, event)")
    tags: Optional[List[str]] = Field(None, description="Etiketler")
    image_urls: Optional[List[str]] = Field(None, description="Fotoğraf URL'leri")
    event_date: Optional[datetime] = Field(None, description="Etkinlik tarihi")


class CreateReplyRequest(BaseModel):
    """Yeni cevap oluşturma request."""
    content: str = Field(..., description="İçerik")
    parent_id: Optional[str] = Field(None, description="Üst yorum ID'si (Threaded reply)")

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
    topic_type: Optional[str] = Query(None, description="Konu tipi (text, event)"),
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
        
    # Topic Type filtresi
    if topic_type:
        query = query.where(ForumTopic.topic_type == topic_type)
    
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
    
    # Mevcut kullanıcının beğendiği (favorilediği) topic'leri bul
    liked_topic_ids = set()
    if topics and current_user:
        topic_ids = [t.id for t in topics]
        fav_stmt = select(UserFavorite.target_id).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.target_type == "forum_topic",
            UserFavorite.target_id.in_(topic_ids)
        )
        fav_res = await session.execute(fav_stmt)
        liked_topic_ids = set(fav_res.scalars().all())
    
    topics_list = []
    for topic in topics:
        author_data = None
        if topic.author:
            author_data = {
                "id": topic.author.id,
                "username": topic.author.username,
                "first_name": topic.author.first_name,
                "last_name": topic.author.last_name,
                "university": topic.author.university,
                "profile_picture_url": topic.author.profile_picture_url,
            }
        
        topics_list.append({
            "id": topic.id,
            "title": topic.title,
            "content": topic.content[:200] + "..." if len(topic.content) > 200 else topic.content,  # Preview
            "topic_type": topic.topic_type,
            "tags": topic.tags,
            "image_urls": topic.image_urls,
            "author": author_data,
            "category_id": topic.category_id,
            "reply_count": topic.reply_count,
            "view_count": topic.view_count,
            "helpful_count": topic.helpful_count,
            "is_pinned": topic.is_pinned,
            "is_liked_by_me": topic.id in liked_topic_ids,
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
    
    # Mevcut kullanıcının beğendiği (favorilediği) topic'leri bul
    liked_topic_ids = set()
    if topics and current_user:
        topic_ids = [t.id for t in topics]
        fav_stmt = select(UserFavorite.target_id).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.target_type == "forum_topic",
            UserFavorite.target_id.in_(topic_ids)
        )
        fav_res = await session.execute(fav_stmt)
        liked_topic_ids = set(fav_res.scalars().all())
    
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
            "topic_type": topic.topic_type,
            "tags": topic.tags,
            "image_urls": topic.image_urls,
            "author": author_data,
            "category_id": topic.category_id,
            "reply_count": topic.reply_count,
            "view_count": topic.view_count,
            "helpful_count": topic.helpful_count,
            "is_pinned": topic.is_pinned,
            "is_liked_by_me": topic.id in liked_topic_ids,
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
    try:
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
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise e
    
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
    liked_reply_ids = set()
    if replies and current_user:
        reply_ids = [r.id for r in replies]
        fav_reply_stmt = select(UserFavorite.target_id).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.target_type == "forum_reply",
            UserFavorite.target_id.in_(reply_ids)
        )
        fav_reply_res = await session.execute(fav_reply_stmt)
        liked_reply_ids = set(fav_reply_res.scalars().all())
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
    
    # Mevcut kullanıcının beğendiği (favorilediği) topic'i bul
    is_liked_by_me = False
    if current_user:
        fav_stmt = select(UserFavorite).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.target_type == "forum_topic",
            UserFavorite.target_id == topic_id
        )
        fav_res = await session.execute(fav_stmt)
        if fav_res.scalar_one_or_none():
            is_liked_by_me = True
    
    topic_response = TopicResponse(
        id=topic.id,
        title=topic.title,
        content=topic.content,
        topic_type=topic.topic_type,
        tags=topic.tags,
        image_urls=topic.image_urls,
        author=author_data,
        category_id=topic.category_id,
        reply_count=topic.reply_count,
        view_count=topic.view_count,
        helpful_count=topic.helpful_count,
        is_pinned=topic.is_pinned,
        is_liked_by_me=is_liked_by_me,
        last_reply_at=topic.last_reply_at,
        created_at=topic.created_at,
        updated_at=topic.updated_at,
    )
    
    try:
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
                parent_id=reply.parent_id,
                author=reply_author,
                helpful_count=reply.helpful_count,
                is_liked_by_me=(reply.id in liked_reply_ids),
                created_at=reply.created_at,
                updated_at=reply.updated_at,
            ))
        
        return TopicDetailResponse(topic=topic_response, replies=replies_list)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise e


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
    now = datetime.utcnow().timestamp()
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
    if request.category_id:
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
        topic_type=request.topic_type,
        tags=json.dumps(request.tags) if request.tags else None,
        image_urls=json.dumps(request.image_urls) if request.image_urls else None,
        event_date=request.event_date.replace(tzinfo=None) if request.event_date else None,
        is_pinned=False,
        is_deleted=False,
        view_count=0,
        reply_count=0,
        helpful_count=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    session.add(topic)
    
    if request.topic_type == "poll" and request.poll_options:
        for opt_text in request.poll_options:
            poll_opt = ForumPollOption(
                id=str(uuid4()),
                topic_id=topic.id,
                option_text=opt_text,
                vote_count=0
            )
            session.add(poll_opt)
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
    now = datetime.utcnow().timestamp()
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
        parent_id=request.parent_id,
        author_id=current_user.id,
        content=request.content,
        helpful_count=0,
        is_deleted=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    session.add(reply)
    
    # Topic güncelle: reply_count (sadece ana yorumlar) ve last_reply_at
    if not reply.parent_id:
        topic.reply_count += 1
    topic.last_reply_at = datetime.utcnow()
    topic.updated_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(reply)
    
    # Rate limit tracking
    reply_creation_attempts[current_user.id].append(now)
    
    # TODO: Bildirim gönder (eğer kendi konusu değilse)
    # if topic.author_id != current_user.id:
    #     await create_notification(...)
    
    return {"success": True, "reply_id": reply.id}


@router.post("/topics/{topic_id}/helpful", response_model=dict)
async def mark_topic_helpful(
    topic_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    now = datetime.utcnow().timestamp()
    user_attempts = helpful_attempts[current_user.id]
    user_attempts[:] = [ts for ts in user_attempts if now - ts < RATE_LIMIT_WINDOW]
    
    if len(user_attempts) >= HELPFUL_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Çok fazla beğeni yaptınız.")
        
    topic_result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    topic = topic_result.scalar_one_or_none()
    
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
        
    # Check if user already liked
    fav_stmt = select(UserFavorite).where(
        UserFavorite.user_id == current_user.id,
        UserFavorite.target_type == "forum_topic",
        UserFavorite.target_id == topic_id
    )
    fav_res = await session.execute(fav_stmt)
    existing_fav = fav_res.scalar_one_or_none()
    
    action = ""
    if existing_fav:
        # Unlike
        await session.delete(existing_fav)
        topic.helpful_count = max(0, topic.helpful_count - 1)
        action = "unliked"
    else:
        # Like
        new_fav = UserFavorite(
            user_id=current_user.id,
            target_type="forum_topic",
            target_id=topic_id
        )
        session.add(new_fav)
        topic.helpful_count += 1
        action = "liked"

    await session.commit()
    
    helpful_attempts[current_user.id].append(now)
    return {"success": True, "action": action, "helpful_count": topic.helpful_count}

@router.get("/topics/{topic_id}/likers", response_model=dict)
async def get_topic_likers(
    topic_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Konuyu beğenen kullanıcıları listeler."""
    topic_result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    if not topic_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
        
    fav_stmt = select(UserFavorite).where(
        UserFavorite.target_type == "forum_topic",
        UserFavorite.target_id == topic_id
    ).order_by(UserFavorite.created_at.desc())
    
    fav_res = await session.execute(fav_stmt)
    favorites = fav_res.scalars().all()
    
    likers = []
    if favorites:
        user_ids = [f.user_id for f in favorites]
        users_stmt = select(User).where(User.id.in_(user_ids))
        users_res = await session.execute(users_stmt)
        users = {u.id: u for u in users_res.scalars().all()}
        
        for fav in favorites:
            u = users.get(fav.user_id)
            if u:
                likers.append({
                    "id": u.id,
                    "username": u.username,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "profile_picture_url": u.profile_picture_url
                })
                
    return {"likers": likers}

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
    now = datetime.utcnow().timestamp()
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
    
    # Check if already liked
    fav_stmt = select(UserFavorite).where(
        UserFavorite.user_id == current_user.id,
        UserFavorite.target_type == "forum_reply",
        UserFavorite.target_id == reply_id
    )
    fav_res = await session.execute(fav_stmt)
    existing_fav = fav_res.scalar_one_or_none()

    action = ""
    if existing_fav:
        # Unlike
        await session.delete(existing_fav)
        reply.helpful_count = max(0, reply.helpful_count - 1)
        action = "unliked"
    else:
        # Like
        new_fav = UserFavorite(
            user_id=current_user.id,
            target_type="forum_reply",
            target_id=reply_id
        )
        session.add(new_fav)
        reply.helpful_count += 1
        action = "liked"

    reply.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(reply)

    # Rate limit tracking
    helpful_attempts[current_user.id].append(now)

    return {"success": True, "action": action, "helpful_count": reply.helpful_count, "is_liked": action == "liked"}


# ... existing code ...
@router.post("/upload-images", response_model=dict)
async def upload_forum_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Forum gönderileri için fotoğraf yükler."""
    import os
    import uuid
    from src.core.config import get_settings
    
    settings = get_settings()
    upload_dir = settings.get_upload_dir_absolute() / "forum"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    saved_urls = []
    for file in files:
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
            
        saved_urls.append(f"/uploads/forum/{unique_filename}")
        
    return {"success": True, "urls": saved_urls}
