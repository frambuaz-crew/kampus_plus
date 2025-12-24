"""T093: Integration tests for forum flow.

Covers:
- Create thread → reply → verify anonymity
- Search posts → moderator reveal real identity

Tests the full forum workflow with anonymous identity preservation.
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4

from src.models.user import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
class TestForumFlow:
    """Integration tests for complete forum workflows."""

    async def test_create_thread_and_reply_with_anonymity(
        self, client: AsyncClient, db_session: AsyncSession, test_user: User, auth_headers: dict
    ):
        """Test: Create thread → reply → verify anonymous IDs are stable and unique."""
        
        # Step 1: Create a new thread
        thread_payload = {
            "title": "Need help with calculus",
            "content": "Can anyone explain limits?"
        }
        
        response = await client.post(
            "/v1/forum/threads",
            json=thread_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Thread creation failed: {response.text}"
        thread_data = response.json()
        
        assert "thread" in thread_data
        thread = thread_data["thread"]
        assert thread["title"] == "Need help with calculus"
        assert thread["content"] == "Can anyone explain limits?"
        assert "anonymous_id" in thread
        assert thread["thread_id"] is None  # Root thread
        
        thread_id = thread["id"]
        original_anon_id = thread["anonymous_id"]
        
        # Step 2: Reply to the thread with same user
        reply_payload = {
            "content": "Actually, I found the answer!"
        }
        
        response = await client.post(
            f"/v1/forum/threads/{thread_id}/replies",
            json=reply_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Reply creation failed: {response.text}"
        reply_data = response.json()
        
        assert reply_data["content"] == "Actually, I found the answer!"
        assert reply_data["thread_id"] == thread_id
        assert "anonymous_id" in reply_data
        
        # Step 3: Verify same user has same anonymous_id in thread
        assert reply_data["anonymous_id"] == original_anon_id, \
            "Same user should have same anonymous_id within a thread"
        
        # Step 4: Retrieve thread with replies
        response = await client.get(f"/v1/forum/threads/{thread_id}")
        assert response.status_code == 200
        
        thread_detail = response.json()
        assert thread_detail["thread"]["anonymous_id"] == original_anon_id
        assert len(thread_detail["replies"]) == 1
        assert thread_detail["replies"][0]["anonymous_id"] == original_anon_id


    async def test_different_users_have_different_anonymous_ids(
        self, client: AsyncClient, db_session: AsyncSession, test_user: User, auth_headers: dict
    ):
        """Test: Two different users should have different anonymous IDs in same thread."""
        
        # Step 1: User 1 creates thread
        thread_payload = {
            "title": "Study group?",
            "content": "Anyone want to form a study group?"
        }
        
        response = await client.post(
            "/v1/forum/threads",
            json=thread_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        thread_data = response.json()
        thread_id = thread_data["thread"]["id"]
        user1_anon_id = thread_data["thread"]["anonymous_id"]
        
        # Step 2: Create second user directly in database (bypass email verification)
        from src.core.security import hash_password
        user2 = User(
            email=f"student2_{uuid4().hex[:8]}@test.edu",
            password_hash=hash_password("Password123!"),
            first_name="Student",
            last_name="Two",
            role="student",
            student_id="202200002",
            is_verified=True,
            is_active=True
        )
        db_session.add(user2)
        await db_session.commit()
        await db_session.refresh(user2)
        
        # Generate token for user2
        from src.core.security import create_access_token
        user2_token = create_access_token(user_id=user2.id, role=user2.role.value)
        user2_headers = {"Authorization": f"Bearer {user2_token}"}
        
        # Step 3: User 2 replies to thread
        reply_payload = {"content": "I'm interested!"}
        
        response = await client.post(
            f"/v1/forum/threads/{thread_id}/replies",
            json=reply_payload,
            headers=user2_headers
        )
        
        assert response.status_code == 201
        reply_data = response.json()
        user2_anon_id = reply_data["anonymous_id"]
        
        # Step 4: Verify different users have different anonymous IDs
        assert user1_anon_id != user2_anon_id, \
            "Different users must have different anonymous IDs"


    async def test_search_forum_posts(
        self, client: AsyncClient, db_session: AsyncSession, test_user: User, auth_headers: dict
    ):
        """Test: Search forum posts by keyword."""
        
        # Step 1: Create threads with searchable content
        thread1 = {
            "title": "Python tips",
            "content": "Looking for Python optimization techniques"
        }
        
        thread2 = {
            "title": "Java help",
            "content": "Need help with Java streams"
        }
        
        await client.post("/v1/forum/threads", json=thread1, headers=auth_headers)
        await client.post("/v1/forum/threads", json=thread2, headers=auth_headers)
        
        # Step 2: Search for "Python"
        response = await client.get("/v1/forum/search?q=Python")
        assert response.status_code == 200
        
        search_data = response.json()
        assert "results" in search_data
        assert len(search_data["results"]) >= 1
        
        # Verify Python thread is in results
        python_results = [r for r in search_data["results"] if "Python" in r["content"] or (r["title"] and "Python" in r["title"])]
        assert len(python_results) >= 1


    async def test_flag_post(
        self, client: AsyncClient, db_session: AsyncSession, test_user: User, auth_headers: dict
    ):
        """Test: Flag a post for moderator review."""
        
        # Step 1: Create thread
        thread_payload = {
            "title": "Test thread",
            "content": "This content might be inappropriate"
        }
        
        response = await client.post(
            "/v1/forum/threads",
            json=thread_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        thread_data = response.json()
        post_id = thread_data["thread"]["id"]
        
        # Step 2: Flag the post
        response = await client.post(
            f"/v1/forum/posts/{post_id}/flag",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        
        # Step 3: Verify post is flagged
        response = await client.get(f"/v1/forum/threads/{post_id}")
        assert response.status_code == 200
        assert response.json()["thread"]["is_flagged"] is True


    async def test_admin_reveal_real_identity(
        self, client: AsyncClient, db_session: AsyncSession, test_user: User, auth_headers: dict
    ):
        """Test: Admin can reveal real user identity behind anonymous post."""
        
        # Step 1: Create thread as regular user
        thread_payload = {
            "title": "Anonymous post",
            "content": "This is an anonymous message"
        }
        
        response = await client.post(
            "/v1/forum/threads",
            json=thread_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        thread_data = response.json()
        post_id = thread_data["thread"]["id"]
        
        # Step 2: Create admin user
        from src.core.security import hash_password
        from src.models.user import UserRole
        admin_user = User(
            email=f"admin_{uuid4().hex[:8]}@test.edu",
            password_hash=hash_password("AdminPass123!"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            is_verified=True,
            is_active=True
        )
        db_session.add(admin_user)
        await db_session.commit()
        
        # Step 3: Authenticate as admin
        from src.core.security import create_access_token
        admin_token = create_access_token(user_id=admin_user.id, role=admin_user.role.value)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Step 4: Admin reveals real identity
        response = await client.post(
            f"/v1/forum/posts/{post_id}/reveal",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        reveal_data = response.json()
        
        assert "user_id" in reveal_data
        assert reveal_data["user_id"] == str(test_user.id), \
            "Admin should see the real user ID"


    async def test_list_threads_with_pagination(
        self, client: AsyncClient, db_session: AsyncSession, test_user: User, auth_headers: dict
    ):
        """Test: List threads with pagination and metadata."""
        
        # Step 1: Create multiple threads
        for i in range(3):
            thread_payload = {
                "title": f"Thread {i+1}",
                "content": f"Content for thread {i+1}"
            }
            await client.post("/v1/forum/threads", json=thread_payload, headers=auth_headers)
        
        # Step 2: Fetch thread list
        response = await client.get("/v1/forum/threads?page=1&page_size=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "page" in data
        assert "page_size" in data
        assert "total" in data
        
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert data["total"] >= 3
        assert len(data["items"]) >= 3
        
        # Step 3: Verify thread items have required fields
        for item in data["items"]:
            assert "id" in item
            assert "title" in item
            assert "anonymous_id" in item
            assert "reply_count" in item
            assert "last_activity" in item
