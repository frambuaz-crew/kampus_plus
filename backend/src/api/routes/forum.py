"""Forum API routes - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - Forum Endpoints
Spec: specs/005-forum-page/spec.md
"""


import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import get_current_user, require_admin
from src.core.rate_limit import limiter
from src.models.user import User, UserRole
from src.models.forum import ForumCategory, ForumTopic, ForumReply, ForumReport
from src.models.favorite import UserFavorite

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forum", tags=["Forum"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CategoryResponse(BaseModel):
    """Forum kategori response."""
    id: str
    name: str
    description: Optional[str]
    icon: Optional[str]
    order_index: int = 0
    is_active: bool = True
    topic_count: int = 0

    model_config = {"from_attributes": True}


class ForumCategoryCreate(BaseModel):
    """Yeni kategori oluşturma request."""
    name: str = Field(..., min_length=1, max_length=100, description="Kategori adı")
    description: Optional[str] = Field(None, max_length=500, description="Açıklama")
    icon: Optional[str] = Field(None, max_length=50, description="İkon (emoji veya lucide adı)")
    order_index: int = Field(0, ge=0, description="Sıralama indexi")
    is_active: bool = Field(True, description="Aktif mi?")


class ForumCategoryUpdate(BaseModel):
    """Kategori güncelleme request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    order_index: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


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
    tags: Optional[list] = None
    image_urls: Optional[list] = None
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


class UpdateTopicRequest(BaseModel):
    """Konu düzenleme request."""
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


class UpdateReplyRequest(BaseModel):
    """Cevap düzenleme request."""
    content: str = Field(..., description="Güncellenmiş içerik")


class ReportRequest(BaseModel):
    """Şikayet request."""
    reason: str = Field(..., min_length=5, max_length=500, description="Şikayet sebebi")


class ReportResponse(BaseModel):
    """Rapor response."""
    id: str
    topic_id: Optional[str] = None
    reply_id: Optional[str] = None
    reporter_id: str
    reason: str
    status: str
    created_at: datetime
    topic_title: Optional[str] = None
    reply_content: Optional[str] = None
    reporter_name: Optional[str] = None

class ForumStatsResponse(BaseModel):
    """Forum genel istatistikleri."""
    total_users: int
    total_topics: int
    total_replies: int


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
    # Multi-tenant filtre: ADMIN tümünü görür (inactive dahil), diğerleri sadece aktif + kendi üni/global
    is_admin = UserRole(current_user.role) in {UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN}
    cat_query = select(ForumCategory)
    if not is_admin:
        cat_query = cat_query.where(ForumCategory.is_active == True).where(
            or_(
                ForumCategory.university_id == current_user.university_id,
                ForumCategory.university_id.is_(None),
            )
        )
    cat_query = cat_query.order_by(ForumCategory.order_index, ForumCategory.name)

    result = await session.execute(cat_query)
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
            "order_index": category.order_index,
            "is_active": category.is_active,
            "topic_count": topic_count,
        })

    return {"categories": categories_with_counts}


@router.get("/stats", response_model=ForumStatsResponse)
async def get_forum_stats(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ForumStatsResponse:
    """Forum genel istatistiklerini getir (Kullanıcının üniversitesine özel)."""
    # Toplam kayıtlı kullanıcı sayısı (Üniversite bazlı)
    total_users_query = select(func.count(User.id)).where(
        User.university_id == current_user.university_id
    )
    total_users = (await session.execute(total_users_query)).scalar() or 0

    # Toplam konu sayısı
    total_topics_query = select(func.count(ForumTopic.id)).where(
        and_(
            ForumTopic.university_id == current_user.university_id,
            ForumTopic.is_deleted == False
        )
    )
    total_topics = (await session.execute(total_topics_query)).scalar() or 0

    # Toplam cevap sayısı
    total_replies_query = (
        select(func.count(ForumReply.id))
        .join(ForumTopic, ForumTopic.id == ForumReply.topic_id)
        .where(
            and_(
                ForumTopic.university_id == current_user.university_id,
                ForumReply.is_deleted == False
            )
        )
    )
    total_replies = (await session.execute(total_replies_query)).scalar() or 0

    return ForumStatsResponse(
        total_users=total_users,
        total_topics=total_topics,
        total_replies=total_replies
    )


@router.get("/topics", response_model=dict)
async def get_topics(
    category_id: Optional[str] = Query(None, description="Kategori ID ile filtrele"),
    topic_type: Optional[str] = Query(None, description="Konu tipi (text, event)"),
    search: Optional[str] = Query(None, description="Başlık, içerik veya etiketlerde arama"),
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

    # Multi-tenant filtre
    if UserRole(current_user.role) != UserRole.ADMIN:
        query = query.where(
            or_(
                ForumTopic.university_id == current_user.university_id,
                ForumTopic.university_id.is_(None),
            )
        )

    if category_id:
        query = query.where(ForumTopic.category_id == category_id)

    if topic_type:
        query = query.where(ForumTopic.topic_type == topic_type)

    # Server-side arama (etiketler JSON dizisi — metne cast ile alt dizgi araması)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        tags_as_text = cast(ForumTopic.tags, String)
        query = query.where(
            or_(
                ForumTopic.title.ilike(pattern),
                ForumTopic.content.ilike(pattern),
                tags_as_text.ilike(pattern),
            )
        )

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
@limiter.limit("10/hour")
async def create_topic(
    request: Request,
    data: CreateTopicRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Yeni konu oluştur.

    Spec: POST /api/v1/forum/topics
    Rate Limit: 10 konu / 1 saat / IP
    """
    # Kategori verilmişse kontrol et
    if data.category_id:
        category_result = await session.execute(
            select(ForumCategory).where(ForumCategory.id == data.category_id)
        )
        category = category_result.scalar_one_or_none()
        if not category or not category.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Kategori bulunamadı"}}
            )

    # Zaman dilimi çakışmasını önlemek için event_date'i naive (zaman dilimsiz) hale getir
    event_date = data.event_date
    if event_date and event_date.tzinfo:
        event_date = event_date.replace(tzinfo=None)

    topic = ForumTopic(
        id=str(uuid4()),
        category_id=data.category_id,
        author_id=current_user.id,
        university_id=current_user.university_id,
        title=data.title,
        content=data.content,
        topic_type=data.topic_type,
        tags=data.tags,
        image_urls=data.image_urls,
        event_date=event_date,
        is_pinned=False,
        is_deleted=False,
        view_count=0,
        reply_count=0,
        helpful_count=0,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    session.add(topic)
    await session.commit()
    await session.refresh(topic)

    return {"success": True, "topic_id": topic.id}


@router.post("/topics/{topic_id}/replies", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/hour")
async def create_reply(
    request: Request,
    topic_id: str,
    data: CreateReplyRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Konuya cevap yaz.

    Spec: POST /api/v1/forum/topics/{topic_id}/replies
    Rate Limit: 30 cevap / 1 saat / IP
    """
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
    if data.parent_id:
        parent_result = await session.execute(
            select(ForumReply).where(
                and_(ForumReply.id == data.parent_id, ForumReply.is_deleted == False)
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
        content=data.content,
        parent_id=data.parent_id,
        helpful_count=0,
        is_deleted=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    session.add(reply)

    topic.reply_count += 1
    topic.last_reply_at = datetime.now()
    topic.updated_at = datetime.now()

    await session.commit()
    await session.refresh(reply)

    return {"success": True, "reply_id": reply.id}


@router.post("/topics/{topic_id}/helpful", response_model=dict)
@limiter.limit("50/hour")
async def toggle_topic_helpful(
    request: Request,
    topic_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Topic beğeni toggle (like/unlike).

    Spec: POST /api/v1/forum/topics/{topic_id}/helpful
    Rate Limit: 50 beğeni / 1 saat / IP
    """
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

    topic.updated_at = datetime.now()
    await session.commit()
    await session.refresh(topic)

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
@limiter.limit("50/hour")
async def toggle_reply_helpful(
    request: Request,
    reply_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Reply beğeni toggle (like/unlike).

    Spec: POST /api/v1/forum/replies/{reply_id}/helpful
    Rate Limit: 50 beğeni / 1 saat / IP
    """
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

    reply.updated_at = datetime.now()
    await session.commit()
    await session.refresh(reply)

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


# ============================================================================
# CRUD: DÜZENLE / SİL
# ============================================================================

def _is_admin_user(user: User) -> bool:
    """Kullanıcının admin veya university_admin olup olmadığını kontrol et."""
    return UserRole(user.role) in {UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN}


@router.patch("/topics/{topic_id}", response_model=dict)
async def update_topic(
    topic_id: str,
    request: UpdateTopicRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Konuyu düzenle (sahip veya admin)."""
    result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Konu bulunamadı"}})

    if topic.author_id != current_user.id and not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Bu konuyu düzenleme yetkiniz yok"}})

    if request.title is not None:
        topic.title = request.title
    if request.content is not None:
        topic.content = request.content
    if request.tags is not None:
        topic.tags = request.tags

    topic.updated_at = datetime.now()
    await session.commit()
    return {"success": True}


@router.delete("/topics/{topic_id}", response_model=dict)
async def delete_topic(
    topic_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Konuyu sil — soft delete (sahip veya admin)."""
    result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Konu bulunamadı"}})

    if topic.author_id != current_user.id and not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Bu konuyu silme yetkiniz yok"}})

    topic.is_deleted = True
    topic.updated_at = datetime.now()
    await session.commit()
    return {"success": True}


@router.patch("/replies/{reply_id}", response_model=dict)
async def update_reply(
    reply_id: str,
    request: UpdateReplyRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Cevabı düzenle (sahip veya admin)."""
    result = await session.execute(
        select(ForumReply).where(and_(ForumReply.id == reply_id, ForumReply.is_deleted == False))
    )
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Cevap bulunamadı"}})

    if reply.author_id != current_user.id and not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Bu cevabı düzenleme yetkiniz yok"}})

    reply.content = request.content
    reply.updated_at = datetime.now()
    await session.commit()
    return {"success": True}


@router.delete("/replies/{reply_id}", response_model=dict)
async def delete_reply(
    reply_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Cevabı sil — soft delete (sahip veya admin)."""
    result = await session.execute(
        select(ForumReply).where(and_(ForumReply.id == reply_id, ForumReply.is_deleted == False))
    )
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Cevap bulunamadı"}})

    if reply.author_id != current_user.id and not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Bu cevabı silme yetkiniz yok"}})

    reply.is_deleted = True
    reply.updated_at = datetime.now()

    # Reply count güncelle
    topic_result = await session.execute(select(ForumTopic).where(ForumTopic.id == reply.topic_id))
    topic = topic_result.scalar_one_or_none()
    if topic:
        topic.reply_count = max(0, topic.reply_count - 1)

    await session.commit()
    return {"success": True}


# ============================================================================
# RAPORLAMA (ŞİKAYET)
# ============================================================================

@router.post("/topics/{topic_id}/report", response_model=dict, status_code=status.HTTP_201_CREATED)
async def report_topic(
    topic_id: str,
    request: ReportRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Konuyu şikayet et."""
    topic_result = await session.execute(
        select(ForumTopic).where(and_(ForumTopic.id == topic_id, ForumTopic.is_deleted == False))
    )
    if not topic_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Konu bulunamadı"}})

    report = ForumReport(
        id=str(uuid4()),
        topic_id=topic_id,
        reporter_id=current_user.id,
        reason=request.reason,
    )
    session.add(report)
    await session.commit()
    return {"success": True, "report_id": report.id}


@router.post("/replies/{reply_id}/report", response_model=dict, status_code=status.HTTP_201_CREATED)
async def report_reply(
    reply_id: str,
    request: ReportRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Cevabı şikayet et."""
    reply_result = await session.execute(
        select(ForumReply).where(and_(ForumReply.id == reply_id, ForumReply.is_deleted == False))
    )
    if not reply_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Cevap bulunamadı"}})

    report = ForumReport(
        id=str(uuid4()),
        reply_id=reply_id,
        reporter_id=current_user.id,
        reason=request.reason,
    )
    session.add(report)
    await session.commit()
    return {"success": True, "report_id": report.id}


# ============================================================================
# ADMİN: MODERASYON
# ============================================================================

@router.get("/admin/reports", response_model=dict)
async def get_reports(
    report_status: str = Query("pending", description="Rapor durumu: pending, resolved, rejected"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Bekleyen raporları listele (admin yetkisi gerekli)."""
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Admin yetkisi gerekli"}})

    stmt = (
        select(ForumReport)
        .where(ForumReport.status == report_status)
        .options(
            selectinload(ForumReport.topic),
            selectinload(ForumReport.reply),
            selectinload(ForumReport.reporter),
        )
        .order_by(ForumReport.created_at.desc())
        .limit(100)
    )
    result = await session.execute(stmt)
    reports = result.scalars().all()

    reports_list = []
    for r in reports:
        reports_list.append({
            "id": r.id,
            "topic_id": r.topic_id,
            "reply_id": r.reply_id,
            "reporter_id": r.reporter_id,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "topic_title": r.topic.title if r.topic else None,
            "reply_content": r.reply.content[:200] if r.reply else None,
            "reporter_name": f"{r.reporter.first_name} {r.reporter.last_name}" if r.reporter else None,
        })

    return {"reports": reports_list, "total": len(reports_list)}


@router.post("/admin/reports/{report_id}/resolve", response_model=dict)
async def resolve_report(
    report_id: str,
    action: str = Query(..., description="İşlem: delete_content, reject"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Raporu kapat. action=delete_content ise ilgili içerik soft-delete edilir."""
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Admin yetkisi gerekli"}})

    result = await session.execute(select(ForumReport).where(ForumReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Rapor bulunamadı"}})

    if action == "delete_content":
        # İlgili içeriği sil
        if report.topic_id:
            topic_res = await session.execute(select(ForumTopic).where(ForumTopic.id == report.topic_id))
            topic = topic_res.scalar_one_or_none()
            if topic:
                topic.is_deleted = True
        if report.reply_id:
            reply_res = await session.execute(select(ForumReply).where(ForumReply.id == report.reply_id))
            reply = reply_res.scalar_one_or_none()
            if reply:
                reply.is_deleted = True
        report.status = "resolved"
    elif action == "reject":
        report.status = "rejected"
    else:
        raise HTTPException(status_code=400, detail={"error": {"code": "BAD_REQUEST", "message": "Geçersiz işlem. 'delete_content' veya 'reject' kullanın."}})

    await session.commit()
    return {"success": True, "status": report.status}


# ============================================================================
# ADMİN: KATEGORİ YÖNETİMİ
# ============================================================================

@router.post("/admin/categories", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_forum_category(
    request: ForumCategoryCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    """Yeni forum kategorisi oluştur (admin)."""
    existing = await session.execute(
        select(ForumCategory).where(ForumCategory.name == request.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "CONFLICT", "message": "Bu isimde bir kategori zaten mevcut"}}
        )

    category = ForumCategory(
        id=str(uuid4()),
        name=request.name,
        description=request.description,
        icon=request.icon,
        order_index=request.order_index,
        is_active=request.is_active,
        university_id=current_user.university_id,
        created_at=datetime.now(),
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)

    return {
        "success": True,
        "category": {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "icon": category.icon,
            "order_index": category.order_index,
            "is_active": category.is_active,
            "topic_count": 0,
        }
    }


@router.put("/admin/categories/{category_id}", response_model=dict)
async def update_forum_category(
    category_id: str,
    request: ForumCategoryUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    """Forum kategorisini güncelle (admin)."""
    result = await session.execute(
        select(ForumCategory).where(ForumCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Kategori bulunamadı"}}
        )

    if request.name is not None:
        dup = await session.execute(
            select(ForumCategory).where(
                ForumCategory.name == request.name,
                ForumCategory.id != category_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "CONFLICT", "message": "Bu isimde bir kategori zaten mevcut"}}
            )
        category.name = request.name

    if request.description is not None:
        category.description = request.description
    if request.icon is not None:
        category.icon = request.icon
    if request.order_index is not None:
        category.order_index = request.order_index
    if request.is_active is not None:
        category.is_active = request.is_active

    await session.commit()
    await session.refresh(category)

    topic_count_result = await session.execute(
        select(func.count(ForumTopic.id)).where(
            and_(ForumTopic.category_id == category.id, ForumTopic.is_deleted == False)
        )
    )
    topic_count = topic_count_result.scalar() or 0

    return {
        "success": True,
        "category": {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "icon": category.icon,
            "order_index": category.order_index,
            "is_active": category.is_active,
            "topic_count": topic_count,
        }
    }


@router.delete("/admin/categories/{category_id}", response_model=dict)
async def delete_forum_category(
    category_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    """Forum kategorisini sil (admin). Bağlı konu varsa silmeye izin verilmez."""
    result = await session.execute(
        select(ForumCategory).where(ForumCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Kategori bulunamadı"}}
        )

    topic_count_result = await session.execute(
        select(func.count(ForumTopic.id)).where(
            and_(ForumTopic.category_id == category_id, ForumTopic.is_deleted == False)
        )
    )
    topic_count = topic_count_result.scalar() or 0
    if topic_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "CONFLICT",
                    "message": f"Bu kategoride {topic_count} konu bulunuyor. Önce konuları silin veya taşıyın."
                }
            }
        )

    await session.delete(category)
    await session.commit()
    return {"success": True}

