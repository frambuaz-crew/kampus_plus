"""Forum API routes: threads, replies, search, flagging, admin reveal."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.api.dependencies import get_current_user, require_admin
from src.models.user import User
from src.models.forum import ForumPost, AnonymousMapping
from src.services.forum_service import get_or_create_mapping


router = APIRouter(prefix="/forum", tags=["Forum"])


# ============================================================================
# Schemas
# ============================================================================

class ThreadCreate(BaseModel):
    title: Optional[str] = None
    content: str


class ReplyCreate(BaseModel):
    content: str


class PostItem(BaseModel):
    id: UUID
    thread_id: Optional[UUID] = None
    title: Optional[str] = None
    content: str
    anonymous_id: str
    is_flagged: bool
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class ThreadResponse(BaseModel):
    thread: PostItem


class ThreadListItem(BaseModel):
    id: UUID
    title: Optional[str] = None
    anonymous_id: str
    reply_count: int
    last_activity: str


class ThreadListResponse(BaseModel):
    items: List[ThreadListItem]
    page: int
    page_size: int
    total: int


class ThreadWithRepliesResponse(BaseModel):
    thread: PostItem
    replies: List[PostItem]


class SearchResponseItem(BaseModel):
    id: UUID
    thread_id: Optional[UUID] = None
    title: Optional[str] = None
    content: str
    anonymous_id: str
    created_at: str


class SearchResponse(BaseModel):
    results: List[SearchResponseItem]


# ============================================================================
# Helpers
# ============================================================================

async def _get_anonymous_id(
    session: AsyncSession, user_id: UUID, thread_scope_id: UUID
) -> str:
    mapping = await get_or_create_mapping(session, user_id, thread_scope_id)
    return mapping.anonymous_id


# ============================================================================
# Routes
# ============================================================================

@router.post(
    "/threads",
    response_model=ThreadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new thread (anonymous)",
)
async def create_thread(
    payload: ThreadCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> ThreadResponse:
    # Create root thread post (thread_id is NULL)
    post = ForumPost(
        author_id=current_user.id,
        thread_id=None,
        title=payload.title,
        content=payload.content,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    # Thread scope id is the thread's own id
    anon_id = await _get_anonymous_id(session, current_user.id, post.id)

    return ThreadResponse(
        thread=PostItem(
            id=post.id,
            thread_id=None,
            title=post.title,
            content=post.content,
            anonymous_id=anon_id,
            is_flagged=post.is_flagged,
            created_at=post.created_at.isoformat(),
        )
    )


@router.get(
    "/threads",
    response_model=ThreadListResponse,
    status_code=status.HTTP_200_OK,
    summary="List threads with reply stats",
)
async def list_threads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> ThreadListResponse:
    # Query root threads
    stmt = (
        select(ForumPost)
        .where(ForumPost.thread_id.is_(None))
        .order_by(ForumPost.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(stmt)
    threads = result.scalars().all()

    # Total count
    total_stmt = select(func.count()).select_from(
        select(ForumPost).where(ForumPost.thread_id.is_(None)).subquery()
    )
    total = (await session.execute(total_stmt)).scalar_one()

    items: List[ThreadListItem] = []
    for t in threads:
        # Reply count
        rc_stmt = select(func.count()).where(ForumPost.thread_id == t.id)
        reply_count = (await session.execute(rc_stmt)).scalar_one()

        # Last activity = max(created_at) across thread + replies
        la_stmt = select(func.max(ForumPost.created_at)).where(
            (ForumPost.id == t.id) | (ForumPost.thread_id == t.id)
        )
        last_activity = (await session.execute(la_stmt)).scalar_one() or t.created_at

        # Anonymous id of thread author
        anon_id = await _get_anonymous_id(session, t.author_id, t.id)

        items.append(
            ThreadListItem(
                id=t.id,
                title=t.title,
                anonymous_id=anon_id,
                reply_count=reply_count,
                last_activity=last_activity.isoformat(),
            )
        )

    return ThreadListResponse(items=items, page=page, page_size=page_size, total=total)


@router.get(
    "/threads/{thread_id}",
    response_model=ThreadWithRepliesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get thread with replies (anonymous identities)",
)
async def get_thread(
    thread_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> ThreadWithRepliesResponse:
    # Load thread
    th_stmt = select(ForumPost).where(ForumPost.id == thread_id).options(selectinload(ForumPost.replies))
    th_res = await session.execute(th_stmt)
    thread = th_res.scalar_one_or_none()
    if not thread or thread.thread_id is not None:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Thread not found"}})

    # Anonymous id of thread author
    anon_thread = await _get_anonymous_id(session, thread.author_id, thread.id)
    thread_item = PostItem(
        id=thread.id,
        thread_id=None,
        title=thread.title,
        content=thread.content,
        anonymous_id=anon_thread,
        is_flagged=thread.is_flagged,
        created_at=thread.created_at.isoformat(),
    )

    # Replies
    rp_stmt = select(ForumPost).where(ForumPost.thread_id == thread.id).order_by(ForumPost.created_at.asc())
    rp_res = await session.execute(rp_stmt)
    replies = rp_res.scalars().all()

    reply_items: List[PostItem] = []
    for r in replies:
        anon_r = await _get_anonymous_id(session, r.author_id, thread.id)
        reply_items.append(
            PostItem(
                id=r.id,
                thread_id=thread.id,
                title=None,
                content=r.content,
                anonymous_id=anon_r,
                is_flagged=r.is_flagged,
                created_at=r.created_at.isoformat(),
            )
        )

    return ThreadWithRepliesResponse(thread=thread_item, replies=reply_items)


@router.post(
    "/threads/{thread_id}/replies",
    response_model=PostItem,
    status_code=status.HTTP_201_CREATED,
    summary="Reply to thread (anonymous)",
)
async def reply_thread(
    thread_id: UUID,
    payload: ReplyCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> PostItem:
    # Ensure thread exists
    th_res = await session.execute(select(ForumPost).where(ForumPost.id == thread_id))
    thread = th_res.scalar_one_or_none()
    if not thread or thread.thread_id is not None:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Thread not found"}})

    post = ForumPost(
        author_id=current_user.id,
        thread_id=thread_id,
        content=payload.content,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    anon_id = await _get_anonymous_id(session, current_user.id, thread_id)
    return PostItem(
        id=post.id,
        thread_id=thread_id,
        title=None,
        content=post.content,
        anonymous_id=anon_id,
        is_flagged=post.is_flagged,
        created_at=post.created_at.isoformat(),
    )


@router.get(
    "/search",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search forum posts (basic LIKE)",
)
async def search_forum(
    q: str = Query(..., min_length=2),
    session: AsyncSession = Depends(get_db),
) -> SearchResponse:
    # Basic LIKE search compatible with SQLite; upgrade to PostgreSQL tsvector in production
    like = f"%{q}%"
    stmt = (
        select(ForumPost)
        .where((ForumPost.content.ilike(like)) | (ForumPost.title.ilike(like)))
        .order_by(ForumPost.created_at.desc())
        .limit(50)
    )
    res = await session.execute(stmt)
    posts = res.scalars().all()

    items: List[SearchResponseItem] = []
    for p in posts:
        scope_id = p.id if p.thread_id is None else p.thread_id
        anon_id = await _get_anonymous_id(session, p.author_id, scope_id)
        items.append(
            SearchResponseItem(
                id=p.id,
                thread_id=p.thread_id,
                title=p.title,
                content=p.content,
                anonymous_id=anon_id,
                created_at=p.created_at.isoformat(),
            )
        )

    return SearchResponse(results=items)


@router.post(
    "/posts/{post_id}/flag",
    status_code=status.HTTP_200_OK,
    summary="Flag a post for moderator review",
)
async def flag_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    res = await session.execute(select(ForumPost).where(ForumPost.id == post_id))
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Post not found"}})

    post.is_flagged = True
    await session.commit()

    return {"status": "ok"}


@router.post(
    "/posts/{post_id}/reveal",
    status_code=status.HTTP_200_OK,
    summary="Admin: reveal real user behind anonymous post",
)
async def admin_reveal(
    post_id: UUID,
    admin_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    res = await session.execute(select(ForumPost).where(ForumPost.id == post_id))
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Post not found"}})

    # Reveal author user_id
    return {"user_id": str(post.author_id)}
