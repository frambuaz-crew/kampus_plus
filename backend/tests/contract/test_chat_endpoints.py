"""Contract tests for Chat API endpoints (T059-T063) - KAMPÜS+ Phase 4.

Tests verify:
- POST /v1/chat/sessions - Create conversation session (T059)
- GET /v1/chat/sessions - List user's sessions (T060)
- GET /v1/chat/sessions/{id} - Get session with messages (T061)
- POST /v1/chat/sessions/{id}/messages - Send message, get AI response (T062)
- DELETE /v1/chat/sessions/{id} - Soft-delete session (T063)

All endpoints require authentication via JWT token.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.conversation import ConversationSession, ChatMessage, MessageRole
from src.models.user import User


@pytest.mark.asyncio
class TestChatSessionEndpoints:
    """Test chat session CRUD endpoints (T059-T063)."""

    # ============================================================================
    # T059: POST /v1/chat/sessions - Create session
    # ============================================================================

    async def test_create_session_with_title(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test creating a new conversation session with custom title."""
        response = await client.post(
            "/v1/chat/sessions",
            json={"title": "My Custom Chat"},
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["title"] == "My Custom Chat"
        assert data["is_active"] is True
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_session_auto_title(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test creating session with auto-generated title."""
        response = await client.post(
            "/v1/chat/sessions",
            json={},
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert "Conversation" in data["title"]  # Auto-generated format
        assert data["is_active"] is True

    async def test_create_session_requires_auth(self, client: AsyncClient):
        """Test that session creation requires authentication."""
        response = await client.post(
            "/v1/chat/sessions",
            json={"title": "Test"}
        )
        
        assert response.status_code == 401

    async def test_create_session_invalid_title_too_long(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test validation: title exceeds max length."""
        response = await client.post(
            "/v1/chat/sessions",
            json={"title": "A" * 300},  # Exceeds 200 char limit
            headers=auth_headers
        )
        
        assert response.status_code == 400

    # ============================================================================
    # T060: GET /v1/chat/sessions - List sessions
    # ============================================================================

    async def test_list_sessions_empty(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing sessions when user has none."""
        response = await client.get(
            "/v1/chat/sessions",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # May have sessions from other tests, so just check it's a valid list

    async def test_list_sessions_with_data(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """Test listing sessions returns user's sessions."""
        # Create multiple sessions
        response1 = await client.post(
            "/v1/chat/sessions",
            json={"title": "Session 1"},
            headers=auth_headers
        )
        response2 = await client.post(
            "/v1/chat/sessions",
            json={"title": "Session 2"},
            headers=auth_headers
        )
        
        assert response1.status_code == 201
        assert response2.status_code == 201
        
        # List sessions
        response = await client.get(
            "/v1/chat/sessions",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        
        # Verify structure
        for session in data:
            assert "id" in session
            assert "title" in session
            assert "created_at" in session
            assert "updated_at" in session
            assert "is_active" in session
            assert "message_count" in session

    async def test_list_sessions_excludes_inactive(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that inactive sessions are excluded by default."""
        # Create session
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "To Be Deleted"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Soft delete it
        await client.delete(
            f"/v1/chat/sessions/{session_id}",
            headers=auth_headers
        )
        
        # List sessions (should exclude deleted)
        response = await client.get(
            "/v1/chat/sessions",
            headers=auth_headers
        )
        
        data = response.json()
        session_ids = [s["id"] for s in data]
        assert session_id not in session_ids

    async def test_list_sessions_include_inactive(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test including inactive sessions with query parameter."""
        # Create and delete session
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "Inactive Session"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        await client.delete(
            f"/v1/chat/sessions/{session_id}",
            headers=auth_headers
        )
        
        # List with include_inactive=true
        response = await client.get(
            "/v1/chat/sessions?include_inactive=true",
            headers=auth_headers
        )
        
        data = response.json()
        session_ids = [s["id"] for s in data]
        assert session_id in session_ids
        
        # Find the inactive session
        inactive_session = next((s for s in data if s["id"] == session_id), None)
        assert inactive_session is not None
        assert inactive_session["is_active"] is False

    async def test_list_sessions_requires_auth(self, client: AsyncClient):
        """Test that listing sessions requires authentication."""
        response = await client.get("/v1/chat/sessions")
        assert response.status_code == 401

    # ============================================================================
    # T061: GET /v1/chat/sessions/{id} - Get session detail
    # ============================================================================

    async def test_get_session_detail(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test retrieving session with full message history."""
        # Create session
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "Detail Test"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Get session detail
        response = await client.get(
            f"/v1/chat/sessions/{session_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["title"] == "Detail Test"
        assert "messages" in data
        assert isinstance(data["messages"], list)

    async def test_get_session_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test 404 when session doesn't exist."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.get(
            f"/v1/chat/sessions/{fake_uuid}",
            headers=auth_headers
        )
        
        assert response.status_code == 404

    async def test_get_session_forbidden(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """Test 403 when user tries to access another user's session."""
        # Create a different user
        other_user = User(
            email="other.user@university.edu.tr",
            first_name="Other",
            last_name="User",
            password_hash="$2b$12$test",
            role="student",
            is_verified=True,
            is_active=True
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)
        
        # Create session for other user
        other_session = ConversationSession(
            user_id=other_user.id,
            title="Other's Session",
            is_active=True
        )
        db_session.add(other_session)
        await db_session.commit()
        await db_session.refresh(other_session)
        
        # Try to access with current user's token
        response = await client.get(
            f"/v1/chat/sessions/{other_session.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 403

    async def test_get_session_requires_auth(self, client: AsyncClient):
        """Test that getting session detail requires authentication."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/v1/chat/sessions/{fake_uuid}")
        assert response.status_code == 401

    # ============================================================================
    # T062: POST /v1/chat/sessions/{id}/messages - Send message
    # ============================================================================

    async def test_send_message_success(
        self, client: AsyncClient, auth_headers: dict, monkeypatch
    ):
        """Test sending message and receiving AI response."""
        # Create session
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "Message Test"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Mock AI service response
        async def mock_ai_query(*args, **kwargs):
            return {
                "answer": "Mocked AI response",
                "sources": [
                    {
                        "title": "Test Document",
                        "source_type": "official_document",
                        "content_preview": "Test preview",
                        "metadata": {"document_id": "doc-123"}
                    }
                ]
            }
        
        from src.services import ai_service
        monkeypatch.setattr(ai_service.AIService, "query", mock_ai_query)
        
        # Send message
        response = await client.post(
            f"/v1/chat/sessions/{session_id}/messages",
            json={"content": "What is KAMPÜS+?"},
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify structure
        assert "user_message" in data
        assert "assistant_message" in data
        
        user_msg = data["user_message"]
        assert user_msg["role"] == "user"
        assert user_msg["content"] == "What is KAMPÜS+?"
        assert user_msg["sources"] is None
        
        assistant_msg = data["assistant_message"]
        assert assistant_msg["role"] == "assistant"
        assert assistant_msg["content"] == "Mocked AI response"
        assert isinstance(assistant_msg["sources"], list)
        assert len(assistant_msg["sources"]) == 1
        assert assistant_msg["sources"][0]["title"] == "Test Document"

    async def test_send_message_empty_content(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test validation: message content cannot be empty."""
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "Test"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        response = await client.post(
            f"/v1/chat/sessions/{session_id}/messages",
            json={"content": ""},
            headers=auth_headers
        )
        
        assert response.status_code == 400

    async def test_send_message_content_too_long(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test validation: message content exceeds max length."""
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "Test"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        response = await client.post(
            f"/v1/chat/sessions/{session_id}/messages",
            json={"content": "A" * 5000},  # Exceeds 4000 char limit
            headers=auth_headers
        )
        
        assert response.status_code == 400

    async def test_send_message_session_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test 404 when session doesn't exist."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.post(
            f"/v1/chat/sessions/{fake_uuid}/messages",
            json={"content": "Test message"},
            headers=auth_headers
        )
        
        assert response.status_code == 404

    async def test_send_message_inactive_session(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test 400 when trying to send message to inactive session."""
        # Create and delete session
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "To Delete"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        await client.delete(
            f"/v1/chat/sessions/{session_id}",
            headers=auth_headers
        )
        
        # Try to send message
        response = await client.post(
            f"/v1/chat/sessions/{session_id}/messages",
            json={"content": "Test"},
            headers=auth_headers
        )
        
        assert response.status_code == 400

    async def test_send_message_requires_auth(self, client: AsyncClient):
        """Test that sending message requires authentication."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.post(
            f"/v1/chat/sessions/{fake_uuid}/messages",
            json={"content": "Test"}
        )
        assert response.status_code == 401

    # ============================================================================
    # T063: DELETE /v1/chat/sessions/{id} - Soft delete
    # ============================================================================

    async def test_delete_session_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test soft-deleting a session."""
        # Create session
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "To Delete"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Delete session
        response = await client.delete(
            f"/v1/chat/sessions/{session_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204
        assert response.content == b""  # No content for 204

    async def test_delete_session_marks_inactive(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that deletion marks session as inactive (soft delete)."""
        # Create session
        create_response = await client.post(
            "/v1/chat/sessions",
            json={"title": "Soft Delete Test"},
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Delete session
        await client.delete(
            f"/v1/chat/sessions/{session_id}",
            headers=auth_headers
        )
        
        # Verify still accessible but inactive
        response = await client.get(
            f"/v1/chat/sessions/{session_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

    async def test_delete_session_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test 404 when session doesn't exist."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(
            f"/v1/chat/sessions/{fake_uuid}",
            headers=auth_headers
        )
        
        assert response.status_code == 404

    async def test_delete_session_forbidden(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """Test 403 when user tries to delete another user's session."""
        # Create other user and session
        other_user = User(
            email="delete.other@university.edu.tr",
            first_name="Delete",
            last_name="Other",
            password_hash="$2b$12$test",
            role="student",
            is_verified=True,
            is_active=True
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)
        
        other_session = ConversationSession(
            user_id=other_user.id,
            title="Other's Session",
            is_active=True
        )
        db_session.add(other_session)
        await db_session.commit()
        await db_session.refresh(other_session)
        
        # Try to delete with current user's token
        response = await client.delete(
            f"/v1/chat/sessions/{other_session.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 403

    async def test_delete_session_requires_auth(self, client: AsyncClient):
        """Test that deleting session requires authentication."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/v1/chat/sessions/{fake_uuid}")
        assert response.status_code == 401
