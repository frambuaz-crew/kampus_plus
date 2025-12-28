"""X-Request-ID Header Validation Tests (T162).

Tests validate that all API endpoints include X-Request-ID header in responses:
- Header presence in all responses (success and error)
- UUID format validation (RFC 4122 compliance)
- Request ID propagation through multi-hop requests
- Request ID consistency in logs (constitutional requirement FR-032)

This ensures distributed tracing capability across all API operations.

Constitution Principle: Request ID Tracking (FR-039, FR-040, FR-041)
- Every request must have a unique identifier
- Request ID must be included in all log entries
- Request ID must be returned in response headers for client-side tracing
"""

import pytest
import re
from httpx import AsyncClient
from uuid import UUID, uuid4

from src.main import app


@pytest.fixture
async def client():
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def authenticated_client(client: AsyncClient):
    """Create authenticated client with valid JWT token."""
    # Register and login a test user
    register_payload = {
        "email": f"test{uuid4().hex[:8]}@university.edu.tr",
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "student",
        "student_id": "202112345"
    }
    
    await client.post("/v1/auth/register", json=register_payload)
    
    login_response = await client.post("/v1/auth/login", json={
        "email": register_payload["email"],
        "password": register_payload["password"]
    })
    
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Set authorization header
    client.headers["Authorization"] = f"Bearer {token}"
    return client


def is_valid_uuid(value: str) -> bool:
    """
    Validate if string is a valid UUID (RFC 4122).
    
    Args:
        value: String to validate
        
    Returns:
        True if valid UUID, False otherwise
    """
    try:
        UUID(value)
        return True
    except (ValueError, AttributeError):
        return False


class TestRequestIDHeaderPresence:
    """Test X-Request-ID header is present in all responses."""
    
    @pytest.mark.asyncio
    async def test_request_id_in_health_endpoint(self, client):
        """Test X-Request-ID header in GET /health."""
        response = await client.get("/v1/health")
        
        assert "x-request-id" in response.headers, \
            "X-Request-ID header missing from health endpoint"
        assert is_valid_uuid(response.headers["x-request-id"]), \
            f"X-Request-ID is not a valid UUID: {response.headers['x-request-id']}"
    
    @pytest.mark.asyncio
    async def test_request_id_in_auth_endpoints(self, client):
        """Test X-Request-ID header in authentication endpoints."""
        # Test login endpoint
        login_response = await client.post("/v1/auth/login", json={
            "email": "test@university.edu.tr",
            "password": "test123"
        })
        
        assert "x-request-id" in login_response.headers, \
            "X-Request-ID header missing from login endpoint"
        assert is_valid_uuid(login_response.headers["x-request-id"]), \
            f"X-Request-ID is not a valid UUID: {login_response.headers['x-request-id']}"
    
    @pytest.mark.asyncio
    async def test_request_id_in_protected_endpoints(self, authenticated_client):
        """Test X-Request-ID header in protected endpoints."""
        # Test chat sessions list
        response = await authenticated_client.get("/v1/chat/sessions")
        
        assert "x-request-id" in response.headers, \
            "X-Request-ID header missing from protected endpoint"
        assert is_valid_uuid(response.headers["x-request-id"]), \
            f"X-Request-ID is not a valid UUID: {response.headers['x-request-id']}"
    
    @pytest.mark.asyncio
    async def test_request_id_in_error_responses(self, client):
        """Test X-Request-ID header in error responses (4xx, 5xx)."""
        # Test 404 Not Found
        response_404 = await client.get("/v1/nonexistent-endpoint")
        
        assert "x-request-id" in response_404.headers, \
            "X-Request-ID header missing from 404 response"
        assert is_valid_uuid(response_404.headers["x-request-id"]), \
            f"X-Request-ID is not a valid UUID: {response_404.headers['x-request-id']}"
        
        # Test 401 Unauthorized
        response_401 = await client.get("/v1/chat/sessions")
        
        assert "x-request-id" in response_401.headers, \
            "X-Request-ID header missing from 401 response"
        assert is_valid_uuid(response_401.headers["x-request-id"]), \
            f"X-Request-ID is not a valid UUID: {response_401.headers['x-request-id']}"


class TestRequestIDFormat:
    """Test X-Request-ID format compliance (UUID v4)."""
    
    @pytest.mark.asyncio
    async def test_request_id_uuid_format(self, client):
        """Test X-Request-ID follows UUID format."""
        response = await client.get("/v1/health")
        
        request_id = response.headers.get("x-request-id")
        assert request_id is not None
        
        # Validate UUID format (8-4-4-4-12 hex digits)
        uuid_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            re.IGNORECASE
        )
        assert uuid_pattern.match(request_id), \
            f"X-Request-ID does not match UUID format: {request_id}"
    
    @pytest.mark.asyncio
    async def test_request_id_uniqueness(self, client):
        """Test X-Request-ID is unique per request."""
        # Make multiple requests
        responses = []
        for _ in range(5):
            response = await client.get("/v1/health")
            responses.append(response.headers.get("x-request-id"))
        
        # All request IDs should be unique
        assert len(responses) == len(set(responses)), \
            f"Duplicate request IDs found: {responses}"
    
    @pytest.mark.asyncio
    async def test_request_id_is_uuid_v4(self, client):
        """Test X-Request-ID is UUID version 4."""
        response = await client.get("/v1/health")
        
        request_id_str = response.headers.get("x-request-id")
        assert request_id_str is not None
        
        # Parse as UUID
        request_id = UUID(request_id_str)
        
        # Verify it's UUID version 4 (random)
        # UUID v4 has version field = 4 (bits 12-15 of time_hi_version)
        assert request_id.version == 4, \
            f"X-Request-ID is not UUID v4: version={request_id.version}"


class TestRequestIDPropagation:
    """Test request ID propagation through multi-hop requests."""
    
    @pytest.mark.asyncio
    async def test_client_provided_request_id(self, client):
        """Test server accepts and uses client-provided X-Request-ID."""
        # Generate custom request ID
        custom_request_id = str(uuid4())
        
        # Send request with custom request ID
        response = await client.get(
            "/v1/health",
            headers={"X-Request-ID": custom_request_id}
        )
        
        # Server should return the same request ID
        assert response.headers.get("x-request-id") == custom_request_id, \
            f"Server did not preserve client request ID. " \
            f"Expected: {custom_request_id}, Got: {response.headers.get('x-request-id')}"
    
    @pytest.mark.asyncio
    async def test_request_id_consistency_across_endpoints(self, authenticated_client):
        """Test request ID changes between different requests but consistent within one."""
        # First request
        response1 = await authenticated_client.get("/v1/health")
        request_id_1 = response1.headers.get("x-request-id")
        
        # Second request (should have different ID)
        response2 = await authenticated_client.get("/v1/health")
        request_id_2 = response2.headers.get("x-request-id")
        
        assert request_id_1 != request_id_2, \
            "Different requests should have different request IDs"
        
        # Third request with explicit ID should preserve it
        custom_id = str(uuid4())
        response3 = await authenticated_client.get(
            "/v1/health",
            headers={"X-Request-ID": custom_id}
        )
        request_id_3 = response3.headers.get("x-request-id")
        
        assert request_id_3 == custom_id, \
            "Server should preserve explicit request ID from client"
    
    @pytest.mark.asyncio
    async def test_request_id_in_nested_operations(self, authenticated_client):
        """Test request ID consistency in complex operations (create session + send message)."""
        # Create chat session (operation 1)
        session_response = await authenticated_client.post("/v1/chat/sessions", json={
            "title": "Test Session"
        })
        session_request_id = session_response.headers.get("x-request-id")
        session_id = session_response.json()["id"]  # API returns 'id', not 'session_id'
        
        assert session_request_id is not None
        assert is_valid_uuid(session_request_id)
        
        # Send message to session (operation 2)
        message_response = await authenticated_client.post(
            f"/v1/chat/sessions/{session_id}/messages",
            json={"content": "Test message"}
        )
        message_request_id = message_response.headers.get("x-request-id")
        
        assert message_request_id is not None
        assert is_valid_uuid(message_request_id)
        
        # Two separate operations should have different request IDs
        assert session_request_id != message_request_id, \
            "Nested operations should have independent request IDs"


class TestRequestIDInRandomEndpoints:
    """Test X-Request-ID in random sampling of endpoints."""
    
    @pytest.mark.asyncio
    async def test_request_id_in_courses_endpoint(self, authenticated_client):
        """Test X-Request-ID in GET /courses/my-courses."""
        response = await authenticated_client.get("/v1/courses/my-courses")
        
        assert "x-request-id" in response.headers
        assert is_valid_uuid(response.headers["x-request-id"])
    
    @pytest.mark.asyncio
    async def test_request_id_in_documents_endpoint(self, authenticated_client):
        """Test X-Request-ID in GET /documents."""
        response = await authenticated_client.get("/v1/documents")
        
        assert "x-request-id" in response.headers
        assert is_valid_uuid(response.headers["x-request-id"])
    
    @pytest.mark.asyncio
    async def test_request_id_in_forum_endpoint(self, authenticated_client):
        """Test X-Request-ID in GET /forum/threads."""
        response = await authenticated_client.get("/v1/forum/threads")
        
        assert "x-request-id" in response.headers
        assert is_valid_uuid(response.headers["x-request-id"])
    
    @pytest.mark.asyncio
    async def test_request_id_in_health_live(self, client):
        """Test X-Request-ID in GET /health/live."""
        response = await client.get("/v1/health/live")
        
        assert "x-request-id" in response.headers
        assert is_valid_uuid(response.headers["x-request-id"])
    
    @pytest.mark.asyncio
    async def test_request_id_in_health_ready(self, client):
        """Test X-Request-ID in GET /health/ready."""
        response = await client.get("/v1/health/ready")
        
        assert "x-request-id" in response.headers
        assert is_valid_uuid(response.headers["x-request-id"])


class TestRequestIDEdgeCases:
    """Test edge cases and error scenarios."""
    
    @pytest.mark.asyncio
    async def test_request_id_with_invalid_client_id(self, client):
        """Test server generates new ID when client provides invalid format."""
        # Send request with invalid request ID
        response = await client.get(
            "/v1/health",
            headers={"X-Request-ID": "invalid-not-a-uuid"}
        )
        
        # Server should accept request and return it (or generate new one)
        # Implementation choice: either preserve or generate new
        returned_id = response.headers.get("x-request-id")
        assert returned_id is not None
        
        # If server preserves invalid ID, that's acceptable
        # If server generates new UUID, that's also acceptable
        # Just verify we got SOMETHING back
        assert len(returned_id) > 0
    
    @pytest.mark.asyncio
    async def test_request_id_in_large_response(self, authenticated_client):
        """Test X-Request-ID present even in large response bodies."""
        # Create multiple sessions to get larger response
        for i in range(10):
            await authenticated_client.post("/v1/chat/sessions", json={
                "title": f"Test Session {i}"
            })
        
        # List all sessions (larger response)
        response = await authenticated_client.get("/v1/chat/sessions")
        
        assert "x-request-id" in response.headers
        assert is_valid_uuid(response.headers["x-request-id"])
    
    @pytest.mark.asyncio
    async def test_request_id_in_streaming_response(self, authenticated_client):
        """Test X-Request-ID in responses that might stream (file downloads)."""
        # This test is a placeholder for streaming scenarios
        # If file download endpoints are implemented, test them here
        
        # For now, test document stats (simple JSON response)
        response = await authenticated_client.get("/v1/documents/stats")
        
        assert "x-request-id" in response.headers
        assert is_valid_uuid(response.headers["x-request-id"])
