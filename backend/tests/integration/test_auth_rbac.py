"""
Integration tests for auth/RBAC security fixes.

Covered behaviours
------------------
1.  Marketplace GET requires a valid token (401 without one).
2.  Marketplace GET requires a verified user (403 for unverified).
3.  Career listings are scoped to the requesting user's university.
4.  Admins bypass the university filter and see all listings.
5.  UNIVERSITY_ADMIN can delete any career listing (not just their own).
6.  A student cannot delete another student's career listing (403).
7.  A soft-deleted user's still-valid JWT is rejected with 401.

Run in isolation (skip the global coverage gate):
    pytest tests/integration/test_auth_rbac.py -p no:cov -v
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import UserRole

from .helpers import (
    make_career_listing,
    make_marketplace_listing,
    make_token,
    make_user,
)

pytestmark = pytest.mark.integration


# ── 1. Marketplace: unauthenticated ──────────────────────────────────────────

async def test_marketplace_unauthenticated(api_client: AsyncClient):
    """GET /marketplace/ without any Authorization header must return 401."""
    resp = await api_client.get("/api/v1/marketplace/")
    assert resp.status_code == 401, resp.text


# ── 2. Marketplace: unverified user ──────────────────────────────────────────

async def test_marketplace_unverified_user(
    api_client: AsyncClient, db_session: AsyncSession
):
    """A valid JWT for an unverified user must return 403 EMAIL_NOT_VERIFIED."""
    user = await make_user(db_session, is_verified=False)
    token = make_token(user)

    resp = await api_client.get(
        "/api/v1/marketplace/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 403, resp.text
    body = resp.json()
    assert body["error"]["code"] == "EMAIL_NOT_VERIFIED"


# ── 3. Career: university isolation (student) ─────────────────────────────────

async def test_career_university_isolation(
    api_client: AsyncClient, db_session: AsyncSession
):
    """A student from university A must NOT see listings posted by university B users."""
    user_a = await make_user(db_session, university_id="uni-alpha")
    user_b = await make_user(db_session, university_id="uni-beta")

    listing_own = await make_career_listing(db_session, posted_by=user_a.id)
    listing_other = await make_career_listing(db_session, posted_by=user_b.id)

    token = make_token(user_a)
    resp = await api_client.get(
        "/api/v1/career/listings",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200, resp.text
    returned_ids = {item["id"] for item in resp.json()}

    assert listing_own.id in returned_ids, (
        "The student's own-university listing must be visible."
    )
    assert listing_other.id not in returned_ids, (
        "A listing from a different university must be hidden from a student."
    )


# ── 4. Career: admin sees all universities ────────────────────────────────────

async def test_career_admin_sees_all_universities(
    api_client: AsyncClient, db_session: AsyncSession
):
    """UNIVERSITY_ADMIN must receive listings from every university (no tenant filter)."""
    user_a = await make_user(db_session, university_id="uni-alpha")
    user_b = await make_user(db_session, university_id="uni-beta")
    admin = await make_user(
        db_session,
        role=UserRole.UNIVERSITY_ADMIN,
        university_id="uni-alpha",
    )

    listing_a = await make_career_listing(db_session, posted_by=user_a.id)
    listing_b = await make_career_listing(db_session, posted_by=user_b.id)

    resp = await api_client.get(
        "/api/v1/career/listings",
        headers={"Authorization": f"Bearer {make_token(admin)}"},
    )

    assert resp.status_code == 200, resp.text
    returned_ids = {item["id"] for item in resp.json()}

    assert listing_a.id in returned_ids, "Admin must see listings from their own university."
    assert listing_b.id in returned_ids, "Admin must see listings from other universities."


# ── 5. Career: UNIVERSITY_ADMIN can delete any listing ───────────────────────

async def test_career_admin_delete(
    api_client: AsyncClient, db_session: AsyncSession
):
    """UNIVERSITY_ADMIN must be able to delete a listing they did not create."""
    owner = await make_user(db_session, university_id="uni-alpha")
    admin = await make_user(
        db_session,
        role=UserRole.UNIVERSITY_ADMIN,
        university_id="uni-alpha",
    )
    listing = await make_career_listing(db_session, posted_by=owner.id)

    resp = await api_client.delete(
        f"/api/v1/career/listings/{listing.id}",
        headers={"Authorization": f"Bearer {make_token(admin)}"},
    )

    assert resp.status_code == 204, resp.text

    # Confirm the route used a soft-delete (status → "deleted"), not a hard-delete.
    await db_session.refresh(listing)
    assert listing.status == "deleted", (
        "delete_listing must soft-delete by setting status='deleted', not DROP the row."
    )


# ── 6. Career: student cannot delete another user's listing ──────────────────

async def test_career_student_cannot_delete_others(
    api_client: AsyncClient, db_session: AsyncSession
):
    """A student must receive 403 when trying to delete a listing they don't own."""
    owner = await make_user(db_session, university_id="uni-alpha")
    attacker = await make_user(db_session, university_id="uni-alpha")
    listing = await make_career_listing(db_session, posted_by=owner.id)

    resp = await api_client.delete(
        f"/api/v1/career/listings/{listing.id}",
        headers={"Authorization": f"Bearer {make_token(attacker)}"},
    )

    assert resp.status_code == 403, resp.text

    # Row must still be active — nothing was deleted.
    await db_session.refresh(listing)
    assert listing.status == "active"


# ── 7. Soft-deleted user: valid JWT must be rejected ─────────────────────────

async def test_soft_deleted_user_blocked(
    api_client: AsyncClient, db_session: AsyncSession
):
    """A valid JWT belonging to a soft-deleted user must be rejected with 401.

    The fix in get_current_user checks is_deleted before is_active so that
    tokens issued before the soft-delete cannot be replayed.
    """
    deleted_user = await make_user(db_session, is_deleted=True)
    token = make_token(deleted_user)

    # Use marketplace as the canary endpoint — it requires get_current_active_user
    # which chains from get_current_user where the is_deleted guard lives.
    resp = await api_client.get(
        "/api/v1/marketplace/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 401, resp.text
    body = resp.json()
    assert body["error"]["code"] == "ACCOUNT_DELETED"
