"""E2E Forum Tests.

Comprehensive tests for forum functionality:
- Thread creation and replies
- Anonymous identity consistency
- Multi-user interactions
- Forum search functionality
- Content flagging
- Admin identity reveal
- Forum post vectorization for AI
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from src.models.user import User
from src.models.forum import ForumPost, AnonymousMapping
from src.core.security import hash_password


@pytest.mark.asyncio
class TestForumBasicOperations:
    """Test basic forum CRUD operations"""
    
    async def test_create_thread(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict
    ):
        """Test creating a new forum thread"""
        
        response = await client.post(
            "/v1/forum/threads",
            headers=auth_headers,
            json={
                "title": "Test Thread",
                "content": "This is a test forum thread about machine learning."
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "thread" in data
        thread = data["thread"]
        assert thread["title"] == "Test Thread"
        assert thread["content"] == "This is a test forum thread about machine learning."
        assert "anonymous_id" in thread
        assert "id" in thread
    
    async def test_create_thread_without_title(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test creating thread without title (should use content preview)"""
        
        response = await client.post(
            "/v1/forum/threads",
            headers=auth_headers,
            json={
                "content": "Thread content without explicit title"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "thread" in data
        # Title should be auto-generated from content
    
    async def test_reply_to_thread(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test replying to an existing thread"""
        
        # Create thread first
        thread = ForumPost(
            id=uuid4(),
            user_id=test_user.id,
            thread_id=None,  # Top-level thread
            title="Reply Test Thread",
            content="Original thread content"
        )
        db_session.add(thread)
        await db_session.commit()
        
        # Reply to thread
        response = await client.post(
            f"/v1/forum/threads/{thread.id}/replies",
            headers=auth_headers,
            json={
                "content": "This is my reply to the thread"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "thread" in data
        reply = data["thread"]
        assert reply["content"] == "This is my reply to the thread"
        assert reply["thread_id"] == str(thread.id)
    
    async def test_get_thread_with_replies(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test retrieving thread with all replies"""
        
        # Create thread
        thread = ForumPost(
            id=uuid4(),
            user_id=test_user.id,
            thread_id=None,
            title="Thread with Replies",
            content="Main thread content"
        )
        db_session.add(thread)
        
        # Add replies
        for i in range(3):
            reply = ForumPost(
                id=uuid4(),
                user_id=test_user.id,
                thread_id=thread.id,
                content=f"Reply {i+1}"
            )
            db_session.add(reply)
        
        await db_session.commit()
        
        # Get thread
        response = await client.get(
            f"/v1/forum/threads/{thread.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "thread" in data
        assert "replies" in data
        assert len(data["replies"]) == 3
    
    async def test_list_threads(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test listing forum threads with pagination"""
        
        # Create multiple threads
        for i in range(5):
            thread = ForumPost(
                id=uuid4(),
                user_id=test_user.id,
                thread_id=None,
                title=f"Thread {i+1}",
                content=f"Content {i+1}"
            )
            db_session.add(thread)
        
        await db_session.commit()
        
        # List threads
        response = await client.get(
            "/v1/forum/threads",
            headers=auth_headers,
            params={"page": 1, "page_size": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 5


@pytest.mark.asyncio
class TestAnonymousIdentity:
    """Test anonymous identity consistency"""
    
    async def test_anonymous_id_consistency_within_thread(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test that same user gets same anonymous_id within a thread"""
        
        # Create thread
        thread_response = await client.post(
            "/v1/forum/threads",
            headers=auth_headers,
            json={
                "title": "Anonymity Test",
                "content": "Testing anonymous ID consistency"
            }
        )
        assert thread_response.status_code == 201
        thread_data = thread_response.json()
        thread_id = thread_data["thread"]["id"]
        first_anonymous_id = thread_data["thread"]["anonymous_id"]
        
        # Reply to same thread
        reply_response = await client.post(
            f"/v1/forum/threads/{thread_id}/replies",
            headers=auth_headers,
            json={"content": "My reply"}
        )
        assert reply_response.status_code == 201
        reply_data = reply_response.json()
        second_anonymous_id = reply_data["thread"]["anonymous_id"]
        
        # Anonymous IDs should match
        assert first_anonymous_id == second_anonymous_id
    
    async def test_different_anonymous_id_across_threads(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict
    ):
        """Test that same user gets different anonymous_id in different threads"""
        
        # Create first thread
        response1 = await client.post(
            "/v1/forum/threads",
            headers=auth_headers,
            json={"content": "First thread"}
        )
        anonymous_id_1 = response1.json()["thread"]["anonymous_id"]
        
        # Create second thread
        response2 = await client.post(
            "/v1/forum/threads",
            headers=auth_headers,
            json={"content": "Second thread"}
        )
        anonymous_id_2 = response2.json()["thread"]["anonymous_id"]
        
        # Anonymous IDs should be different
        assert anonymous_id_1 != anonymous_id_2
    
    async def test_multiple_users_different_anonymous_ids(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test that different users get different anonymous IDs in same thread"""
        
        # Create two users
        user1 = User(
            id=uuid4(),
            email="forum.user1@university.edu.tr",
            password_hash=hash_password("Password123!"),
            first_name="User",
            last_name="One",
            role="student",
            is_verified=True,
            is_active=True
        )
        user2 = User(
            id=uuid4(),
            email="forum.user2@university.edu.tr",
            password_hash=hash_password("Password123!"),
            first_name="User",
            last_name="Two",
            role="student",
            is_verified=True,
            is_active=True
        )
        db_session.add(user1)
        db_session.add(user2)
        await db_session.commit()
        
        # Login both users
        login1 = await client.post(
            "/v1/auth/login",
            json={"email": "forum.user1@university.edu.tr", "password": "Password123!"}
        )
        login2 = await client.post(
            "/v1/auth/login",
            json={"email": "forum.user2@university.edu.tr", "password": "Password123!"}
        )
        
        token1 = login1.json()["access_token"]
        token2 = login2.json()["access_token"]
        
        # User1 creates thread
        thread_response = await client.post(
            "/v1/forum/threads",
            headers={"Authorization": f"Bearer {token1}"},
            json={"content": "Multi-user thread"}
        )
        thread_id = thread_response.json()["thread"]["id"]
        anon_id_user1 = thread_response.json()["thread"]["anonymous_id"]
        
        # User2 replies
        reply_response = await client.post(
            f"/v1/forum/threads/{thread_id}/replies",
            headers={"Authorization": f"Bearer {token2}"},
            json={"content": "Reply from user 2"}
        )
        anon_id_user2 = reply_response.json()["thread"]["anonymous_id"]
        
        # Different users should have different anonymous IDs
        assert anon_id_user1 != anon_id_user2


@pytest.mark.asyncio
class TestForumSearch:
    """Test forum search functionality"""
    
    async def test_search_forum_posts(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test searching forum posts by keyword"""
        
        # Create threads with specific keywords
        keywords = ["machine learning", "deep learning", "neural networks"]
        for keyword in keywords:
            thread = ForumPost(
                id=uuid4(),
                user_id=test_user.id,
                thread_id=None,
                title=f"Discussion about {keyword}",
                content=f"Let's discuss {keyword} in detail"
            )
            db_session.add(thread)
        
        await db_session.commit()
        
        # Search for "learning"
        response = await client.get(
            "/v1/forum/search",
            headers=auth_headers,
            params={"query": "learning"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # Should find at least 2 threads (machine learning, deep learning)
        assert len(data["results"]) >= 2
    
    async def test_search_empty_query(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test search with empty query"""
        
        response = await client.get(
            "/v1/forum/search",
            headers=auth_headers,
            params={"query": ""}
        )
        
        # Should either return 400 or empty results
        assert response.status_code in [200, 400]


@pytest.mark.asyncio
class TestContentFlagging:
    """Test content flagging functionality"""
    
    async def test_flag_inappropriate_content(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test flagging a post as inappropriate"""
        
        # Create post
        post = ForumPost(
            id=uuid4(),
            user_id=test_user.id,
            thread_id=None,
            title="Test Post",
            content="Some content",
            is_flagged=False
        )
        db_session.add(post)
        await db_session.commit()
        
        # Flag post
        response = await client.post(
            f"/v1/forum/posts/{post.id}/flag",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]
        
        # Verify post is flagged
        await db_session.refresh(post)
        assert post.is_flagged is True
    
    async def test_flag_nonexistent_post(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test flagging non-existent post"""
        
        fake_post_id = uuid4()
        response = await client.post(
            f"/v1/forum/posts/{fake_post_id}/flag",
            headers=auth_headers
        )
        
        assert response.status_code == 404


@pytest.mark.asyncio
class TestAdminIdentityReveal:
    """Test admin ability to reveal anonymous identities"""
    
    async def test_admin_can_reveal_identity(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test that admin can reveal real user identity behind anonymous post"""
        
        # Create regular user
        user = User(
            id=uuid4(),
            email="anonymous.user@university.edu.tr",
            password_hash=hash_password("Password123!"),
            first_name="Anonymous",
            last_name="User",
            role="student",
            is_verified=True,
            is_active=True
        )
        
        # Create admin user
        admin = User(
            id=uuid4(),
            email="admin.user@university.edu.tr",
            password_hash=hash_password("AdminPass123!"),
            first_name="Admin",
            last_name="User",
            role="admin",
            is_verified=True,
            is_active=True
        )
        
        db_session.add(user)
        db_session.add(admin)
        await db_session.commit()
        
        # User creates post
        user_login = await client.post(
            "/v1/auth/login",
            json={"email": "anonymous.user@university.edu.tr", "password": "Password123!"}
        )
        user_token = user_login.json()["access_token"]
        
        post_response = await client.post(
            "/v1/forum/threads",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"content": "Anonymous post content"}
        )
        post_id = post_response.json()["thread"]["id"]
        anonymous_id = post_response.json()["thread"]["anonymous_id"]
        
        # Admin reveals identity
        admin_login = await client.post(
            "/v1/auth/login",
            json={"email": "admin.user@university.edu.tr", "password": "AdminPass123!"}
        )
        admin_token = admin_login.json()["access_token"]
        
        reveal_response = await client.post(
            f"/v1/forum/posts/{post_id}/reveal-identity",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert reveal_response.status_code == 200
        data = reveal_response.json()
        assert "user_id" in data or "email" in data or "real_identity" in data
    
    async def test_regular_user_cannot_reveal_identity(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test that regular users cannot reveal identities"""
        
        # Create post
        post = ForumPost(
            id=uuid4(),
            user_id=test_user.id,
            thread_id=None,
            content="Test post"
        )
        db_session.add(post)
        await db_session.commit()
        
        # Try to reveal as regular user
        response = await client.post(
            f"/v1/forum/posts/{post.id}/reveal-identity",
            headers=auth_headers
        )
        
        assert response.status_code == 403  # Forbidden


@pytest.mark.asyncio
class TestForumEdgeCases:
    """Test edge cases and error handling"""
    
    async def test_empty_thread_content(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test creating thread with empty content"""
        
        response = await client.post(
            "/v1/forum/threads",
            headers=auth_headers,
            json={"content": ""}
        )
        
        assert response.status_code in [400, 422]
    
    async def test_reply_to_nonexistent_thread(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test replying to non-existent thread"""
        
        fake_thread_id = uuid4()
        response = await client.post(
            f"/v1/forum/threads/{fake_thread_id}/replies",
            headers=auth_headers,
            json={"content": "Reply to nowhere"}
        )
        
        assert response.status_code == 404
    
    async def test_get_nonexistent_thread(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test retrieving non-existent thread"""
        
        fake_thread_id = uuid4()
        response = await client.get(
            f"/v1/forum/threads/{fake_thread_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    async def test_pagination_limits(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test thread listing pagination edge cases"""
        
        # Request with page_size = 0
        response = await client.get(
            "/v1/forum/threads",
            headers=auth_headers,
            params={"page": 1, "page_size": 0}
        )
        assert response.status_code in [200, 400, 422]
        
        # Request with negative page
        response = await client.get(
            "/v1/forum/threads",
            headers=auth_headers,
            params={"page": -1, "page_size": 10}
        )
        assert response.status_code in [200, 400, 422]
