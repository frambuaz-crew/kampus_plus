"""Forum API routes - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - Forum Endpoints
Spec: specs/005-forum-page/spec.md
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from collections import defaultdict
from uuid import uuid4

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

TOPIC_RATE_LIMIT = 10      # 10 konu / 1 saat
REPLY_RATE_LIMIT = 30      # 30 cevap / 1 saat
HELPFUL_RATE_LIMIT = 50    # 50 beğeni / 1 saat
RATE_LIMIT_WINDOW = 3600   # 1 saat


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
    author: Optional[TopicAuthorResponse]
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    topic_type: str = "text"
    tags: Optional[str] = None
    image_urls: Optional[str] = None
    event_date: Optional[datetime] = None
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
    author: Optional[ReplyAuthorResponse]
    helpful_count: int
    is_liked_by_me: bool = False
    parent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TopicDetailResponse(BaseModel):
    """Forum konu detay response."""
    topic: TopicResponse
    replies: List[ReplyResponse]


class CreateTopicRequest(BaseModel):
    """Yeni konu oluşturma request."""
    category_id: Optional[str] = Field(None, description="Kategori ID")
    title: str = Field(..., description="Başlık")
    content: str = Field(..., description="İçerik")
    topic_type: str = Field("text", description="Konu tipi (text, event)")
    tags: Optional[List[str]] = Field(None, description="Etiketler")
    image_urls: Optional[List[str]] = Field(None, description="Fotoğraf URL'leri")
    event_date: Optional[datetime] = Field(None, description="Etkinlik tarihi")


class CreateReplyRequest(BaseModel):
    """Yeni cevap oluşturma request."""
    content: str = Field(..., description="İçerik")
    parent_id: Optional[str] = Field(None, description="Üst yorum ID'si (threaded reply)")


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

    if category_id:
        query = query.where(ForumTopic.category_id == category_id)

    if topic_type:
        query = query.where(ForumTopic.topic_type == topic_type)

    if sort == "newest":
        query = query.order_by(ForumTopic.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(ForumTopic.created_at.asc())
    elif sort == "most_replies":
        query = query.order_by(ForumTopic.reply_count.desc(), ForumTopic.created_at.desc())
    elif sort == "most_views":
        query = query.order_by(ForumTopic.view_count.desc(), ForumTopic.created_at.desc())
    else:
        query = query.order_by(ForumTopic.is_pinned.desc(), ForumTopic.created_at.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit).options(selectinload(ForumTopic.author))

    result = await session.execute(query)
    topics = result.scalars().all()

    # Mevcut kullanıcının beğendiği topic'leri tek sorguda al
    liked_topic_ids: set = set()
    if topics:
        topic_ids = [t.id for t in topics]
        fav_stmt = select(UserFavorite.target_id).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.target_type == "forum_topic",
            UserFavorite.target_id.in_(topic_ids),
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
            "content": topic.content[:200] + "..." if len(topic.content) > 200 else topic.content,
            "author": author_data,
            "category_id": topic.category_id,
            "topic_type": topic.topic_type,
            "tags": topic.tags,
            "image_urls": topic.image_urls,
            "event_date": topic.event_date.isoformat() if topic.event_date else None,
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

    # Kullanıcının beğendiği reply'ları tek sorguda al
    liked_reply_ids: set = set()
    if replies:
        reply_ids = [r.id for r in replies]
        fav_stmt = select(UserFavorite.target_id).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.target_type == "forum_reply",
            UserFavorite.target_id.in_(reply_ids),
        )
        fav_res = await session.execute(fav_stmt)
        liked_reply_ids = set(fav_res.scalars().all())

    # Topic response
    author_data = None
    if topic.author:
        author_data = TopicAuthorResponse(
            id=topic.author.id,
            username=topic.author.username,
            first_name=topic.author.first_name,
            last_name=topic.author.last_name,
            university=getattr(topic.author, "university", None),
            profile_picture_url=topic.author.profile_picture_url,
        )

    # Kullanıcının bu topic'i beğenip beğenmediğini kontrol et
    topic_liked_result = await session.execute(
        select(UserFavorite).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.target_type == "forum_topic",
            UserFavorite.target_id == topic_id,
        )
    )
    is_topic_liked = topic_liked_result.scalar_one_or_none() is not None

    topic_response = TopicResponse(
        id=topic.id,
        title=topic.title,
        content=topic.content,
        author=author_data,
        category_id=topic.category_id,
        topic_type=topic.topic_type,
        tags=topic.tags,
        image_urls=topic.image_urls,
        event_date=topic.event_date,
        reply_count=topic.reply_count,
        view_count=topic.view_count,
        helpful_count=topic.helpful_count,
        is_pinned=topic.is_pinned,
        is_liked_by_me=is_topic_liked,
        last_reply_at=topic.last_reply_at,
        created_at=topic.created_at,
        updated_at=topic.updated_at,
    )

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
            is_liked_by_me=reply.id in liked_reply_ids,
            parent_id=reply.parent_id,
            created_at=reply.created_at,
            updated_at=reply.updated_at,
        ))

    return TopicDetailResponse(topic=topic_response, replies=replies_list)


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

    # Kategori verilmişse kontrol et
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

    topic = ForumTopic(
        id=str(uuid4()),
        category_id=request.category_id,
        author_id=current_user.id,
        title=request.title,
        content=request.content,
        topic_type=request.topic_type,
        tags=json.dumps(request.tags, ensure_ascii=False) if request.tags else None,
        image_urls=json.dumps(request.image_urls, ensure_ascii=False) if request.image_urls else None,
        event_date=request.event_date,
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

    topic_creation_attempts[current_user.id].append(now)

    return {"success": True, "topic_id": topic.id}


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

    topic_result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    topic = topic_result.scalar_one_or_none()

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Konu bulunamadı"}}
        )

    # parent_id varsa geçerli bir reply olduğunu doğrula
    if request.parent_id:
        parent_result = await session.execute(
            select(ForumReply).where(
                and_(ForumReply.id == request.parent_id, ForumReply.is_deleted == False)
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Yanıtlanacak yorum bulunamadı"}}
            )

    reply = ForumReply(
        id=str(uuid4()),
        topic_id=topic_id,
        author_id=current_user.id,
        content=request.content,
        parent_id=request.parent_id,
        helpful_count=0,
        is_deleted=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    session.add(reply)

    topic.reply_count += 1
    topic.last_reply_at = datetime.now(timezone.utc)
    topic.updated_at = datetime.now(timezone.utc)

    await session.commit()
    await session.refresh(reply)

    reply_creation_attempts[current_user.id].append(now)

    return {"success": True, "reply_id": reply.id}


@router.post("/topics/{topic_id}/helpful", response_model=dict)
async def toggle_topic_helpful(
    topic_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Topic beğeni toggle (like/unlike).

    Spec: POST /api/v1/forum/topics/{topic_id}/helpful
    Rate Limit: 50 beğeni / 1 saat / user
    """
    now = datetime.now(timezone.utc).timestamp()
    user_attempts = helpful_attempts[current_user.id]
    user_attempts[:] = [ts for ts in user_attempts if now - ts < RATE_LIMIT_WINDOW]

    if len(user_attempts) >= HELPFUL_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Çok fazla beğeni yaptınız. Lütfen daha sonra tekrar deneyin."
                }
            }
        )

    topic_result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    topic = topic_result.scalar_one_or_none()

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Konu bulunamadı"}}
        )

    fav_stmt = select(UserFavorite).where(
        UserFavorite.user_id == current_user.id,
        UserFavorite.target_type == "forum_topic",
        UserFavorite.target_id == topic_id,
    )
    fav_res = await session.execute(fav_stmt)
    existing_fav = fav_res.scalar_one_or_none()

    if existing_fav:
        await session.delete(existing_fav)
        topic.helpful_count = max(0, topic.helpful_count - 1)
        action = "unliked"
    else:
        session.add(UserFavorite(
            user_id=current_user.id,
            target_type="forum_topic",
            target_id=topic_id,
        ))
        topic.helpful_count += 1
        action = "liked"

    topic.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(topic)

    helpful_attempts[current_user.id].append(now)

    return {"success": True, "action": action, "helpful_count": topic.helpful_count, "is_liked": action == "liked"}


@router.get("/topics/{topic_id}/likers", response_model=dict)
async def get_topic_likers(
    topic_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Topic'i beğenenlerin listesi.

    Spec: GET /api/v1/forum/topics/{topic_id}/likers
    """
    topic_result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    if not topic_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Konu bulunamadı"}}
        )

    likers_result = await session.execute(
        select(UserFavorite)
        .where(
            UserFavorite.target_type == "forum_topic",
            UserFavorite.target_id == topic_id,
        )
        .options(selectinload(UserFavorite.user))
    )
    likers = likers_result.scalars().all()

    return {
        "likers": [
            {
                "id": fav.user.id,
                "username": fav.user.username,
                "first_name": fav.user.first_name,
                "last_name": fav.user.last_name,
                "profile_picture_url": fav.user.profile_picture_url,
            }
            for fav in likers
            if fav.user
        ]
    }


@router.post("/replies/{reply_id}/helpful", response_model=dict)
async def toggle_reply_helpful(
    reply_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Reply beğeni toggle (like/unlike).

    Spec: POST /api/v1/forum/replies/{reply_id}/helpful
    Rate Limit: 50 beğeni / 1 saat / user
    """
    now = datetime.now(timezone.utc).timestamp()
    user_attempts = helpful_attempts[current_user.id]
    user_attempts[:] = [ts for ts in user_attempts if now - ts < RATE_LIMIT_WINDOW]

    if len(user_attempts) >= HELPFUL_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Çok fazla beğeni yaptınız. Lütfen daha sonra tekrar deneyin."
                }
            }
        )

    reply_result = await session.execute(
        select(ForumReply).where(and_(ForumReply.id == reply_id, ForumReply.is_deleted == False))
    )
    reply = reply_result.scalar_one_or_none()

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Cevap bulunamadı"}}
        )

    fav_stmt = select(UserFavorite).where(
        UserFavorite.user_id == current_user.id,
        UserFavorite.target_type == "forum_reply",
        UserFavorite.target_id == reply_id,
    )
    fav_res = await session.execute(fav_stmt)
    existing_fav = fav_res.scalar_one_or_none()

    if existing_fav:
        await session.delete(existing_fav)
        reply.helpful_count = max(0, reply.helpful_count - 1)
        action = "unliked"
    else:
        session.add(UserFavorite(
            user_id=current_user.id,
            target_type="forum_reply",
            target_id=reply_id,
        ))
        reply.helpful_count += 1
        action = "liked"

    reply.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(reply)

    helpful_attempts[current_user.id].append(now)

    return {"success": True, "action": action, "helpful_count": reply.helpful_count, "is_liked": action == "liked"}


@router.post("/upload-images", response_model=dict)
async def upload_forum_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Forum gönderileri için fotoğraf yükler.

    Spec: POST /api/v1/forum/upload-images
    """
    from src.core.config import get_settings
    settings = get_settings()
    upload_dir = settings.get_upload_dir_absolute() / "forum"
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved_urls = []
    for file in files:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
        unique_filename = f"{uuid.uuid4()}{ext}"
        file_path = upload_dir / unique_filename
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        saved_urls.append(f"/uploads/forum/{unique_filename}")

    return {"success": True, "urls": saved_urls}
