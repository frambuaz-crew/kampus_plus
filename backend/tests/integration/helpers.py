"""
Test-data factory helpers.

These are plain async functions, not pytest fixtures, so they can be called
directly inside test functions with an explicit session argument.  Keeping them
separate from conftest.py avoids the confusion between "fixture" and "factory".
"""
import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import create_access_token
from src.models.career import CareerListing
from src.models.marketplace import MarketplaceListing
from src.models.user import User, UserRole


# ── Internal utils ────────────────────────────────────────────────────────────

def _uid() -> str:
    return str(uuid.uuid4())


def _tag() -> str:
    return uuid.uuid4().hex[:8]


# ── User factory ──────────────────────────────────────────────────────────────

async def make_user(
    session: AsyncSession,
    *,
    role: UserRole = UserRole.STUDENT,
    university_id: str = "test-university-id",
    is_verified: bool = True,
    is_active: bool = True,
    is_deleted: bool = False,
) -> User:
    """Insert a User row and return the refreshed ORM object.

    department_id is a required NOT-NULL column but has a FK to `departments`.
    SQLite does not enforce FK constraints by default (no PRAGMA foreign_keys=ON
    in the test engine), so a placeholder UUID is safe to use here.
    """
    tag = _tag()
    user = User(
        id=_uid(),
        email=f"user_{tag}@test.local",
        # Bcrypt placeholder — never decoded in unit/integration tests.
        password_hash="$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        first_name="Test",
        last_name="User",
        username=f"testuser_{tag}",
        university="Test University",
        university_id=university_id,
        # FK to departments — enforced only if PRAGMA foreign_keys=ON, which the
        # test engine does not set.
        department_id="00000000-0000-0000-0000-000000000001",
        role=role,
        is_verified=is_verified,
        is_active=is_active,
        is_deleted=is_deleted,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def make_token(user: User) -> str:
    """Generate a real, signed JWT for the given user (mirrors production token)."""
    role_value = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    return create_access_token(user_id=user.id, role=role_value)


# ── Career listing factory ────────────────────────────────────────────────────

async def make_career_listing(
    session: AsyncSession,
    *,
    posted_by: str,
    listing_type: str = "job",
    status: str = "active",
) -> CareerListing:
    """Insert a CareerListing row and return the refreshed ORM object."""
    listing = CareerListing(
        id=_uid(),
        type=listing_type,
        posted_by=posted_by,
        title="Software Engineer Position (Test)",
        # description must be ≥ 50 chars when using the Pydantic API schema,
        # but we bypass that schema here by inserting directly.
        description="We are looking for a talented software engineer to join our team. "
                    "This is a test listing for integration tests.",
        status=status,
        # "job" / "internship" → external link flow; "startup" / "project" → dm flow.
        application_type="external" if listing_type in ("job", "internship") else "dm",
        view_count=0,
        application_count=0,
    )
    session.add(listing)
    await session.commit()
    await session.refresh(listing)
    return listing


# ── Marketplace listing factory ───────────────────────────────────────────────

async def make_marketplace_listing(
    session: AsyncSession,
    *,
    seller_id: str,
    status: str = "active",
) -> MarketplaceListing:
    """Insert a MarketplaceListing row and return the refreshed ORM object."""
    listing = MarketplaceListing(
        id=_uid(),
        seller_id=seller_id,
        title="Test Marketplace Item",
        description="A test item available for integration testing purposes.",
        price=Decimal("49.99"),
        category="electronics",
        condition="good",
        status=status,
        view_count=0,
    )
    session.add(listing)
    await session.commit()
    await session.refresh(listing)
    return listing
