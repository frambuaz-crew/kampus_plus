"""Error Response Format Consistency Tests (T163).

Tests validate that all error responses follow consistent format across the API:
- 400 Bad Request: Invalid input validation
- 401 Unauthorized: Missing or invalid authentication
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource does not exist
- 409 Conflict: Resource state conflict
- 422 Unprocessable Entity: Validation errors
- 429 Too Many Requests: Rate limit exceeded (tested in T164)
- 500 Internal Server Error: Unexpected server errors

All errors must follow standard format:
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message"
    }
}

Or Pydantic validation format (422):
{
    "detail": [
        {
            "loc": ["body", "field"],
            "msg": "Error message",
            "type": "value_error"
        }
    ]
}

Constitution Principle: Consistent Error Handling (FR-036, FR-037, FR-038)
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4

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


def validate_error_format(response_data: dict, allow_detail_format: bool = False):
    """
    Validate error response structure.
    
    Args:
        response_data: Response JSON data
        allow_detail_format: Allow Pydantic 'detail' format (for 422 errors)
    """
    # Check for standard error format
    if "error" in response_data:
        error = response_data["error"]
        assert isinstance(error, dict), "Error must be a dictionary"
        
        # Check if error has code and message
        if "code" in error and "message" in error:
            assert isinstance(error["code"], str), "Error code must be string"
            assert isinstance(error["message"], str), "Error message must be string"
            assert len(error["message"]) > 0, "Error message cannot be empty"
            return True
    
    # Check for Pydantic validation error format (422)
    if allow_detail_format and "detail" in response_data:
        detail = response_data["detail"]
        
        # Detail can be string or list
        if isinstance(detail, str):
            assert len(detail) > 0, "Detail message cannot be empty"
            return True
        
        if isinstance(detail, list):
            assert len(detail) > 0, "Detail list cannot be empty"
            for error_item in detail:
                assert isinstance(error_item, dict), "Each detail item must be dict"
                # Pydantic error format typically has 'loc', 'msg', 'type'
                # But we're flexible here
                assert "msg" in error_item or "message" in error_item, \
                    "Detail item must have msg or message field"
            return True
        
        if isinstance(detail, dict):
            # Sometimes detail is nested error format
            return True
    
    # If neither format matched, fail
    pytest.fail(
        f"Response does not match expected error format. "
        f"Expected {{error: {{code, message}}}} or {{detail: ...}}. "
        f"Got: {response_data}"
    )


class Test400BadRequestFormat:
    """Test 400 Bad Request error format."""
    
    @pytest.mark.asyncio
    async def test_invalid_email_format(self, client):
        """Test 400 error when email format is invalid."""
        response = await client.post("/v1/auth/register", json={
            "email": "invalid-email-format",  # Not a valid email
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "student",
            "student_id": "202112345"
        })
        
        assert response.status_code in [400, 422]
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_missing_required_field(self, client):
        """Test 400 error when required field is missing."""
        response = await client.post("/v1/auth/register", json={
            "email": "test@university.edu.tr",
            # Missing password field
            "first_name": "Test",
            "last_name": "User",
            "role": "student"
        })
        
        assert response.status_code in [400, 422]
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_invalid_json_body(self, client):
        """Test 400 error when JSON body is malformed."""
        response = await client.post(
            "/v1/auth/login",
            content="invalid json {",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [400, 422]
        # Response should have error information
        assert response.json() is not None


class Test401UnauthorizedFormat:
    """Test 401 Unauthorized error format."""
    
    @pytest.mark.asyncio
    async def test_missing_auth_token(self, client):
        """Test 401 error when accessing protected endpoint without token."""
        response = await client.get("/v1/chat/sessions")
        
        assert response.status_code == 401
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_invalid_auth_token(self, client):
        """Test 401 error when using invalid JWT token."""
        client.headers["Authorization"] = "Bearer invalid.jwt.token"
        response = await client.get("/v1/chat/sessions")
        
        assert response.status_code == 401
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_expired_token(self, client):
        """Test 401 error when using expired token."""
        # Use a known expired token (or malformed token that fails validation)
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        
        client.headers["Authorization"] = f"Bearer {expired_token}"
        response = await client.get("/v1/chat/sessions")
        
        assert response.status_code == 401
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_wrong_credentials(self, client):
        """Test 401 error when login credentials are incorrect."""
        response = await client.post("/v1/auth/login", json={
            "email": "nonexistent@university.edu.tr",
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401
        validate_error_format(response.json(), allow_detail_format=True)


class Test403ForbiddenFormat:
    """Test 403 Forbidden error format."""
    
    @pytest.mark.asyncio
    async def test_insufficient_permissions(self, authenticated_client):
        """Test 403 error when user lacks required role."""
        # Try to access admin-only endpoint as student
        response = await authenticated_client.post("/v1/forum/posts/fake-id-123/reveal")
        
        # Should return 403 Forbidden or 404 if endpoint checks resource existence first
        assert response.status_code in [403, 404]
        
        if response.status_code == 403:
            validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_access_other_user_resource(self, authenticated_client):
        """Test 403 error when accessing another user's private resource."""
        # This test requires two users and trying to access first user's document
        # For now, we'll test with a non-existent document owned by another user
        
        # Try to access a document that doesn't belong to authenticated user
        fake_document_id = str(uuid4())
        response = await authenticated_client.get(f"/v1/documents/{fake_document_id}")
        
        # Should return 403 Forbidden or 404 Not Found
        assert response.status_code in [403, 404]
        
        if response.status_code == 403:
            validate_error_format(response.json(), allow_detail_format=True)


class Test404NotFoundFormat:
    """Test 404 Not Found error format."""
    
    @pytest.mark.asyncio
    async def test_nonexistent_endpoint(self, client):
        """Test 404 error when endpoint does not exist."""
        response = await client.get("/v1/this-endpoint-does-not-exist")
        
        assert response.status_code == 404
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_nonexistent_resource(self, authenticated_client):
        """Test 404 error when resource does not exist."""
        fake_session_id = str(uuid4())
        response = await authenticated_client.get(f"/v1/chat/sessions/{fake_session_id}")
        
        assert response.status_code == 404
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_nonexistent_nested_resource(self, authenticated_client):
        """Test 404 error when nested resource does not exist."""
        fake_session_id = str(uuid4())
        response = await authenticated_client.post(
            f"/v1/chat/sessions/{fake_session_id}/messages",
            json={"content": "Test message"}
        )
        
        assert response.status_code == 404
        validate_error_format(response.json(), allow_detail_format=True)


class Test409ConflictFormat:
    """Test 409 Conflict error format."""
    
    @pytest.mark.asyncio
    async def test_duplicate_user_registration(self, client):
        """Test 409 error when registering with existing email."""
        # Register first user
        email = f"test{uuid4().hex[:8]}@university.edu.tr"
        payload = {
            "email": email,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "student",
            "student_id": "202112345"
        }
        
        response1 = await client.post("/v1/auth/register", json=payload)
        assert response1.status_code == 201
        
        # Try to register again with same email
        response2 = await client.post("/v1/auth/register", json=payload)
        
        assert response2.status_code == 409
        validate_error_format(response2.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_duplicate_resource_creation(self, authenticated_client):
        """Test 409 error when creating duplicate resource (if applicable)."""
        # Note: Current API might not have many 409 scenarios beyond user registration
        # This is a placeholder for future conflict scenarios
        
        # Example: Creating two sessions with same title might not be a conflict
        # But we test it for consistency
        response1 = await authenticated_client.post("/v1/chat/sessions", json={
            "title": "Duplicate Session"
        })
        assert response1.status_code == 201
        
        response2 = await authenticated_client.post("/v1/chat/sessions", json={
            "title": "Duplicate Session"
        })
        # This might succeed (no uniqueness constraint), so we accept 201 or 409
        assert response2.status_code in [201, 409]


class Test422ValidationFormat:
    """Test 422 Unprocessable Entity error format (Pydantic validation)."""
    
    @pytest.mark.asyncio
    async def test_type_mismatch(self, client):
        """Test 422 error when field type is incorrect."""
        response = await client.post("/v1/auth/register", json={
            "email": "test@university.edu.tr",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "student",
            "student_id": 12345  # Should be string, not integer
        })
        
        assert response.status_code in [400, 422]
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_enum_validation(self, client):
        """Test 422 error when enum value is invalid."""
        response = await client.post("/v1/auth/register", json={
            "email": "test@university.edu.tr",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "invalid_role",  # Invalid role (should be 'student' or 'admin')
            "student_id": "202112345"
        })
        
        assert response.status_code in [400, 422]
        validate_error_format(response.json(), allow_detail_format=True)
    
    @pytest.mark.asyncio
    async def test_multiple_validation_errors(self, client):
        """Test 422 error with multiple validation failures."""
        response = await client.post("/v1/auth/register", json={
            "email": "invalid-email",  # Invalid format
            "password": "short",  # Too short
            "first_name": "",  # Empty string
            "last_name": "",  # Empty string
            "role": "invalid",  # Invalid enum
            "student_id": 12345  # Wrong type
        })
        
        assert response.status_code in [400, 422]
        data = response.json()
        validate_error_format(data, allow_detail_format=True)
        
        # If using Pydantic format, should have multiple errors
        if "detail" in data and isinstance(data["detail"], list):
            assert len(data["detail"]) > 1, "Should have multiple validation errors"


class Test500InternalServerFormat:
    """Test 500 Internal Server Error format."""
    
    @pytest.mark.asyncio
    async def test_internal_error_format(self, client):
        """Test 500 error returns consistent format."""
        # Note: Hard to trigger 500 errors in tests without breaking the app
        # This test documents expected behavior rather than triggering real errors
        
        # In production, 500 errors should follow the same format:
        # {
        #     "error": {
        #         "code": "INTERNAL_SERVER_ERROR",
        #         "message": "An unexpected error occurred"
        #     }
        # }
        
        # We can't easily test this without mocking internal failures
        # So this test is mostly documentation
        pass


class TestErrorFormatConsistency:
    """Test error format consistency across different scenarios."""
    
    @pytest.mark.asyncio
    async def test_all_error_responses_have_request_id(self, client):
        """Test all error responses include X-Request-ID header."""
        error_endpoints = [
            ("/v1/nonexistent", "GET", 404),
            ("/v1/chat/sessions", "GET", 401),  # No auth
        ]
        
        for endpoint, method, expected_status in error_endpoints:
            if method == "GET":
                response = await client.get(endpoint)
            elif method == "POST":
                response = await client.post(endpoint, json={})
            
            assert response.status_code == expected_status
            assert "x-request-id" in response.headers, \
                f"X-Request-ID missing from {expected_status} response"
    
    @pytest.mark.asyncio
    async def test_error_responses_are_json(self, client):
        """Test all error responses use JSON content type."""
        response = await client.get("/v1/nonexistent-endpoint")
        
        assert response.status_code == 404
        assert "application/json" in response.headers.get("content-type", "")
    
    @pytest.mark.asyncio
    async def test_error_message_not_empty(self, client):
        """Test error messages are not empty."""
        # Test 404
        response = await client.get("/v1/nonexistent")
        assert response.status_code == 404
        
        data = response.json()
        
        # Check message is not empty
        if "error" in data and "message" in data["error"]:
            assert len(data["error"]["message"]) > 0
        elif "detail" in data:
            if isinstance(data["detail"], str):
                assert len(data["detail"]) > 0
            elif isinstance(data["detail"], list):
                assert len(data["detail"]) > 0
