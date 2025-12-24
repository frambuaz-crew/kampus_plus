"""T092: Unit tests for forum service anonymous identity logic.

Covers:
- HMAC-SHA256 anonymous ID generation (stable per user/thread)
- Collision prevention via unique (user_id, thread_id) constraint
- Secure mapping storage in DB (AnonymousMapping)
- Moderator reveal function contract

Note: Service not implemented yet; tests will skip if module is missing.
"""

import pytest
import hashlib
import hmac
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

# Skip all tests if forum_service is not present yet (T095 pending)
forum_service = pytest.importorskip("src.services.forum_service")
from src.models.forum import AnonymousMapping, ForumPost  # noqa: E402
from src.models.user import User  # noqa: E402
from src.core.security import hash_password  # noqa: E402


@pytest.mark.asyncio
async def test_generate_anonymous_id_stability(db_session: AsyncSession):
    """Ensure anonymous ID is stable for same (user_id, thread_id)."""
    user_id = uuid4()
    thread_id = uuid4()

    anon1 = forum_service.generate_anonymous_id(user_id, thread_id)
    anon2 = forum_service.generate_anonymous_id(user_id, thread_id)

    assert isinstance(anon1, str) and len(anon1) > 0
    assert anon1 == anon2
    # Must look like hex digest (64 chars for sha256)
    assert len(anon1) == 64
    int(anon1, 16)  # valid hex


@pytest.mark.asyncio
async def test_generate_anonymous_id_uniqueness(db_session: AsyncSession):
    """Different pairs should produce different anonymous IDs."""
    uid1, uid2 = uuid4(), uuid4()
    tid = uuid4()

    a1 = forum_service.generate_anonymous_id(uid1, tid)
    a2 = forum_service.generate_anonymous_id(uid2, tid)
    assert a1 != a2


@pytest.mark.asyncio
async def test_mapping_storage_and_uniqueness(db_session: AsyncSession):
    """Store mapping in DB and ensure unique per (user, thread)."""
    # Create a user and a thread
    user = User(
        email=f"t092_{uuid4().hex[:8]}@university.edu.tr",
        first_name="Anon",
        last_name="User",
        password_hash=hash_password("TestPassword123!"),
        role="student",
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    thread = ForumPost(author_id=user.id, title="Thread", content="Root")
    db_session.add(thread)
    await db_session.commit()
    await db_session.refresh(thread)

    # Create or get mapping
    mapping1 = await forum_service.get_or_create_mapping(db_session, user.id, thread.id)
    mapping2 = await forum_service.get_or_create_mapping(db_session, user.id, thread.id)

    assert isinstance(mapping1, AnonymousMapping)
    assert mapping1.id == mapping2.id
    assert mapping1.user_id == user.id
    assert mapping1.thread_id == thread.id
    assert len(mapping1.anonymous_id) == 64


@pytest.mark.asyncio
async def test_moderator_reveal_contract(db_session: AsyncSession):
    """Moderator reveal contract: returns real user_id for a given post.
    This test does not check auth; it validates function behavior.
    """
    # Setup two users and a thread
    u1 = User(
        email=f"t092_u1_{uuid4().hex[:8]}@university.edu.tr",
        first_name="U1",
        last_name="User",
        password_hash=hash_password("TestPassword123!"),
        role="student",
        is_verified=True,
        is_active=True,
    )
    db_session.add(u1)
    await db_session.commit()
    await db_session.refresh(u1)

    thread = ForumPost(author_id=u1.id, title="Thread", content="Root")
    db_session.add(thread)
    await db_session.commit()
    await db_session.refresh(thread)

    # Reply post
    reply = ForumPost(author_id=u1.id, thread_id=thread.id, content="Reply")
    db_session.add(reply)
    await db_session.commit()
    await db_session.refresh(reply)

    # Create mapping for thread
    await forum_service.get_or_create_mapping(db_session, u1.id, thread.id)

    revealed_user_id = await forum_service.moderator_reveal(db_session, reply.id)
    assert revealed_user_id == u1.id


def test_reference_hmac_example():
    """Reference HMAC-SHA256 example for consistency documentation."""
    secret = b"example_secret_salt"
    msg = b"user_id:123|thread_id:456"
    digest = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    assert len(digest) == 64
