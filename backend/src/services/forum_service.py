"""Forum service providing anonymous identity management and moderator reveal.

Implements:
- generate_anonymous_id(user_id, thread_id): stable HMAC-SHA256 hex digest
- get_or_create_mapping(session, user_id, thread_id): DB persistence with uniqueness
- moderator_reveal(session, post_id): retrieve real author user_id for a post

Security:
- Uses application secret (JWT secret key) as HMAC salt to avoid extra secrets
"""

from __future__ import annotations

import hmac
import hashlib
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.forum import AnonymousMapping, ForumPost


def generate_anonymous_id(user_id: UUID, thread_id: UUID) -> str:
    """Generate stable anonymous ID for a user within a thread.

    The value must be deterministic for the pair (user_id, thread_id)
    and should not be reversible to the original user. We use HMAC-SHA256
    with the application secret as the key.
    """
    # Use JWT secret as HMAC key to avoid storing separate salts
    key = settings.jwt_secret_key.encode("utf-8")
    message = f"{str(user_id)}|{str(thread_id)}".encode("utf-8")
    digest = hmac.new(key, message, hashlib.sha256).hexdigest()
    return digest


async def get_or_create_mapping(
    session: AsyncSession,
    user_id: UUID,
    thread_id: UUID,
) -> AnonymousMapping:
    """Return existing mapping or create a new one for (user_id, thread_id).

    Ensures uniqueness via DB constraint and avoids duplicate rows.
    """
    stmt = select(AnonymousMapping).where(
        AnonymousMapping.user_id == user_id,
        AnonymousMapping.thread_id == thread_id,
    )
    result = await session.execute(stmt)
    mapping: Optional[AnonymousMapping] = result.scalar_one_or_none()

    if mapping:
        return mapping

    anon_id = generate_anonymous_id(user_id, thread_id)
    mapping = AnonymousMapping(
        user_id=user_id,
        thread_id=thread_id,
        anonymous_id=anon_id,
    )
    session.add(mapping)
    await session.commit()
    await session.refresh(mapping)
    return mapping


async def moderator_reveal(session: AsyncSession, post_id: UUID) -> UUID:
    """Reveal the real author user_id behind an anonymous post.

    Contract used in tests: given a post ID, return the author's
    actual user_id. Mapping lookup uses thread scope so replies
    keep the same anonymous identity within a thread.
    """
    post_res = await session.execute(select(ForumPost).where(ForumPost.id == post_id))
    post: Optional[ForumPost] = post_res.scalar_one_or_none()
    if not post:
        raise ValueError("Post not found")

    # Determine thread scope: root thread uses its own id; replies reference parent thread_id
    thread_scope_id: UUID = post.id if post.thread_id is None else post.thread_id

    # The real author is stored directly on the post
    return post.author_id
