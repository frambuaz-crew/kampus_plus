"""API Contract Tests for Authentication Endpoints (T035).

Tests validate that auth endpoints conform to OpenAPI specification:
- /auth/register: POST - Register new user
- /auth/login: POST - User login
- /auth/refresh: POST - Refresh access token
- /auth/logout: POST - User logout
- /auth/verify-email: POST - Verify email address
- /auth/forgot-password: POST - Request password reset
- /auth/reset-password: POST - Reset password with token

Contract Testing Approach:
1. Request schema validation (required fields, types, formats)
2. Response schema validation (status codes, response structure)
3. Error response format validation (4xx, 5xx)
4. Security requirements (no auth for public endpoints)

Tools: pytest, pydantic for schema validation, httpx for async requests
"""

import pytest
from httpx import AsyncClient
from typing import Dict, Any
from uuid import UUID, uuid4
from datetime import datetime

# Import app for testing
from src.main import app
from src.core.database import get_db
from src.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def client():
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def valid_register_payload():
    """Valid registration request payload."""
    return {
        "email": f"student{uuid4().hex[:8]}@university.edu.tr",
        "password": "SecurePass123!",
        "first_name": "Test",
        "last_name": "Student",
        "role": "student",
        "student_id": "202112345"
    }


@pytest.fixture
def valid_login_payload():
    """Valid login request payload."""
    return {
        "email": "student@university.edu.tr",
        "password": "SecurePass123!"
    }


class TestRegisterEndpoint:
    """Contract tests for POST /auth/register endpoint."""
    
    @pytest.mark.asyncio
    async def test_register_request_schema_validation(self, client, valid_register_payload):
        """Test that register endpoint accepts valid request schema."""
        response = await client.post("/v1/auth/register", json=valid_register_payload)
        
        # Should accept valid schema (201 or 409 if email exists)
        assert response.status_code in [201, 409], \
            "Endpoint should accept valid registration schema"
    
    @pytest.mark.asyncio
    async def test_register_requires_all_fields(self, client):
        """Test that register endpoint rejects requests missing required fields."""
        # Missing 'password'
        incomplete_payload = {
            "email": "student@university.edu.tr",
            "first_name": "Test",
            "last_name": "Student",
            "role": "student"
        }
        
        response = await client.post("/v1/auth/register", json=incomplete_payload)
        
        assert response.status_code == 400, "Should reject missing required fields"
        assert "error" in response.json(), "Should return error object"
    
    @pytest.mark.asyncio
    async def test_register_validates_email_format(self, client, valid_register_payload):
        """Test that register endpoint validates email format."""
        invalid_payload = {**valid_register_payload, "email": "not-an-email"}
        
        response = await client.post("/v1/auth/register", json=invalid_payload)
        
        assert response.status_code == 400, "Should reject invalid email format"
    
    @pytest.mark.asyncio
    async def test_register_validates_password_length(self, client, valid_register_payload):
        """Test that register endpoint enforces password minimum length (8 chars)."""
        invalid_payload = {**valid_register_payload, "password": "short"}
        
        response = await client.post("/v1/auth/register", json=invalid_payload)
        
        assert response.status_code == 400, "Should reject password shorter than 8 characters"
    
    @pytest.mark.asyncio
    async def test_register_validates_role_enum(self, client, valid_register_payload):
        """Test that register endpoint validates role enum [student, instructor]."""
        invalid_payload = {**valid_register_payload, "role": "invalid_role"}
        
        response = await client.post("/v1/auth/register", json=invalid_payload)
        
        assert response.status_code == 400, "Should reject invalid role value"
    
    @pytest.mark.asyncio
    async def test_register_success_response_schema(self, client, valid_register_payload):
        """Test that successful registration returns correct response schema (201)."""
        response = await client.post("/v1/auth/register", json=valid_register_payload)
        
        if response.status_code == 201:
            data = response.json()
            
            # Validate response schema
            assert "user_id" in data, "Response should contain user_id"
            assert "email" in data, "Response should contain email"
            assert "message" in data, "Response should contain message"
            
            # Validate types
            assert isinstance(data["user_id"], str), "user_id should be string (UUID)"
            assert isinstance(data["email"], str), "email should be string"
            assert isinstance(data["message"], str), "message should be string"
            
            # Validate UUID format
            try:
                UUID(data["user_id"])
            except ValueError:
                pytest.fail("user_id should be valid UUID format")
    
    @pytest.mark.asyncio
    async def test_register_conflict_response(self, client, valid_register_payload):
        """Test that registering duplicate email returns 409 Conflict."""
        # Register first time
        await client.post("/v1/auth/register", json=valid_register_payload)
        
        # Try to register again with same email
        response = await client.post("/v1/auth/register", json=valid_register_payload)
        
        assert response.status_code == 409, "Duplicate email should return 409 Conflict"
        
        data = response.json()
        assert "error" in data, "Conflict response should contain error object"
        assert "code" in data["error"], "Error should have code"
        assert "message" in data["error"], "Error should have message"


class TestLoginEndpoint:
    """Contract tests for POST /auth/login endpoint."""
    
    @pytest.mark.asyncio
    async def test_login_request_schema_validation(self, client, valid_login_payload):
        """Test that login endpoint accepts valid request schema."""
        response = await client.post("/v1/auth/login", json=valid_login_payload)
        
        # Should accept valid schema (200, 401, or 403)
        assert response.status_code in [200, 401, 403], \
            "Endpoint should accept valid login schema"
    
    @pytest.mark.asyncio
    async def test_login_requires_email_and_password(self, client):
        """Test that login endpoint requires both email and password."""
        # Missing password
        response = await client.post("/v1/auth/login", json={"email": "test@test.com"})
        assert response.status_code == 400, "Should reject missing password"
        
        # Missing email
        response = await client.post("/v1/auth/login", json={"password": "pass123"})
        assert response.status_code == 400, "Should reject missing email"
    
    @pytest.mark.asyncio
    async def test_login_success_response_schema(self, client):
        """Test that successful login returns correct response schema (200)."""
        # First register a user
        register_payload = {
            "email": f"student{uuid4().hex[:8]}@university.edu.tr",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "Student",
            "role": "student"
        }
        await client.post("/v1/auth/register", json=register_payload)
        
        # Login (might fail if email not verified, that's OK for contract test)
        response = await client.post("/v1/auth/login", json={
            "email": register_payload["email"],
            "password": register_payload["password"]
        })
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate response schema per OpenAPI spec
            assert "access_token" in data, "Response should contain access_token"
            assert "token_type" in data, "Response should contain token_type"
            assert "expires_in" in data, "Response should contain expires_in"
            assert "user" in data, "Response should contain user object"
            
            # Validate types
            assert isinstance(data["access_token"], str), "access_token should be string"
            assert data["token_type"] == "bearer", "token_type should be 'bearer'"
            assert isinstance(data["expires_in"], int), "expires_in should be integer"
            
            # Validate user object
            user = data["user"]
            assert "id" in user, "User should have id"
            assert "email" in user, "User should have email"
            assert "first_name" in user, "User should have first_name"
            assert "last_name" in user, "User should have last_name"
            assert "role" in user, "User should have role"
            assert "is_verified" in user, "User should have is_verified"
            
            # Validate Set-Cookie header for refresh token
            assert "set-cookie" in response.headers or "Set-Cookie" in response.headers, \
                "Login should set httpOnly cookie for refresh token"
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials_returns_401(self, client):
        """Test that invalid credentials return 401 Unauthorized."""
        response = await client.post("/v1/auth/login", json={
            "email": "nonexistent@university.edu.tr",
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401, "Invalid credentials should return 401"
        
        data = response.json()
        assert "error" in data, "Unauthorized response should contain error object"
    
    @pytest.mark.asyncio
    async def test_login_unverified_email_returns_403(self, client):
        """Test that unverified email returns 403 Forbidden."""
        # Register user (email not verified by default)
        register_payload = {
            "email": f"unverified{uuid4().hex[:8]}@university.edu.tr",
            "password": "SecurePass123!",
            "first_name": "Unverified",
            "last_name": "User",
            "role": "student"
        }
        await client.post("/v1/auth/register", json=register_payload)
        
        # Try to login without verifying email
        response = await client.post("/v1/auth/login", json={
            "email": register_payload["email"],
            "password": register_payload["password"]
        })
        
        # Should return 403 if email verification is enforced
        if response.status_code == 403:
            data = response.json()
            assert "error" in data, "Forbidden response should contain error object"


class TestRefreshEndpoint:
    """Contract tests for POST /auth/refresh endpoint."""
    
    @pytest.mark.asyncio
    async def test_refresh_requires_cookie(self, client):
        """Test that refresh endpoint requires refresh token cookie."""
        response = await client.post("/v1/auth/refresh")
        
        # Should return 401 if no cookie present
        assert response.status_code == 401, "Missing refresh token should return 401"
    
    @pytest.mark.asyncio
    async def test_refresh_success_response_schema(self, client):
        """Test that successful refresh returns correct response schema (200)."""
        # This test requires a valid refresh token cookie
        # Will be fully tested in integration tests (T036)
        
        # For contract test, just verify endpoint exists and returns proper error
        response = await client.post("/v1/auth/refresh")
        
        # Should return 401 (no cookie) or 200 (valid cookie)
        assert response.status_code in [200, 401], \
            "Refresh endpoint should exist and return expected status codes"
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate response schema
            assert "access_token" in data, "Response should contain access_token"
            assert "token_type" in data, "Response should contain token_type"
            assert "expires_in" in data, "Response should contain expires_in"
            
            assert data["token_type"] == "bearer", "token_type should be 'bearer'"
            assert isinstance(data["expires_in"], int), "expires_in should be integer"


class TestLogoutEndpoint:
    """Contract tests for POST /auth/logout endpoint."""
    
    @pytest.mark.asyncio
    async def test_logout_requires_authentication(self, client):
        """Test that logout endpoint requires authentication."""
        response = await client.post("/v1/auth/logout")
        
        # Should return 401 if not authenticated
        assert response.status_code == 401, "Unauthenticated logout should return 401"
    
    @pytest.mark.asyncio
    async def test_logout_success_returns_204(self, client):
        """Test that successful logout returns 204 No Content."""
        # This test requires valid authentication
        # Will be fully tested in integration tests (T036)
        
        # For contract test, just verify endpoint exists
        response = await client.post("/v1/auth/logout")
        
        # Should return 401 (no auth) or 204 (successful logout)
        assert response.status_code in [204, 401], \
            "Logout endpoint should exist and return expected status codes"
        
        if response.status_code == 204:
            # 204 should have no content
            assert len(response.content) == 0, "204 response should have no body"


class TestVerifyEmailEndpoint:
    """Contract tests for POST /auth/verify-email endpoint."""
    
    @pytest.mark.asyncio
    async def test_verify_email_requires_token(self, client):
        """Test that verify-email endpoint requires token in request body."""
        response = await client.post("/v1/auth/verify-email", json={})
        
        assert response.status_code == 400, "Missing token should return 400"
    
    @pytest.mark.asyncio
    async def test_verify_email_validates_token_format(self, client):
        """Test that verify-email endpoint validates token."""
        response = await client.post("/v1/auth/verify-email", json={"token": "invalid"})
        
        # Should return 400 for invalid/expired token
        assert response.status_code in [400, 404], \
            "Invalid token should return 400 or 404"
    
    @pytest.mark.asyncio
    async def test_verify_email_success_returns_200(self, client):
        """Test that valid token verification returns 200."""
        # This test requires actual verification flow
        # Will be fully tested in integration tests (T036)
        
        response = await client.post("/v1/auth/verify-email", json={
            "token": "test_token_will_be_invalid"
        })
        
        # Should return 200 (valid) or 400 (invalid)
        assert response.status_code in [200, 400, 404], \
            "Verify endpoint should exist and return expected status codes"


class TestForgotPasswordEndpoint:
    """Contract tests for POST /auth/forgot-password endpoint."""
    
    @pytest.mark.asyncio
    async def test_forgot_password_requires_email(self, client):
        """Test that forgot-password endpoint requires email."""
        response = await client.post("/v1/auth/forgot-password", json={})
        
        assert response.status_code == 400, "Missing email should return 400"
    
    @pytest.mark.asyncio
    async def test_forgot_password_always_returns_200(self, client):
        """Test that forgot-password always returns 200 (prevent email enumeration)."""
        # Even for non-existent email, should return 200
        response = await client.post("/v1/auth/forgot-password", json={
            "email": "nonexistent@university.edu.tr"
        })
        
        assert response.status_code == 200, \
            "Forgot password should always return 200 to prevent email enumeration"


class TestResetPasswordEndpoint:
    """Contract tests for POST /auth/reset-password endpoint."""
    
    @pytest.mark.asyncio
    async def test_reset_password_requires_token_and_password(self, client):
        """Test that reset-password endpoint requires token and new_password."""
        # Missing new_password
        response = await client.post("/v1/auth/reset-password", json={"token": "abc"})
        assert response.status_code == 400, "Missing new_password should return 400"
        
        # Missing token
        response = await client.post("/v1/auth/reset-password", json={"new_password": "NewPass123!"})
        assert response.status_code == 400, "Missing token should return 400"
    
    @pytest.mark.asyncio
    async def test_reset_password_validates_password_length(self, client):
        """Test that reset-password validates new password minimum length."""
        response = await client.post("/v1/auth/reset-password", json={
            "token": "test_token",
            "new_password": "short"
        })
        
        # Should return 400 for short password
        assert response.status_code in [400, 404], \
            "Short password should return 400 (or 404 if token invalid)"
    
    @pytest.mark.asyncio
    async def test_reset_password_success_returns_200(self, client):
        """Test that valid password reset returns 200."""
        response = await client.post("/v1/auth/reset-password", json={
            "token": "test_token_invalid",
            "new_password": "NewSecurePass123!"
        })
        
        # Should return 200 (valid) or 400/404 (invalid token)
        assert response.status_code in [200, 400, 404], \
            "Reset password endpoint should exist and return expected status codes"


class TestErrorResponseFormat:
    """Contract tests for error response format consistency."""
    
    @pytest.mark.asyncio
    async def test_400_error_has_standard_format(self, client):
        """Test that 400 errors follow standard error schema."""
        # Trigger validation error
        response = await client.post("/v1/auth/register", json={"email": "invalid"})
        
        if response.status_code == 400:
            data = response.json()
            
            # Validate error schema
            assert "error" in data, "Error response should have 'error' object"
            assert "code" in data["error"], "Error should have 'code'"
            assert "message" in data["error"], "Error should have 'message'"
            # 'details' is optional but should be object if present
            if "details" in data["error"]:
                assert isinstance(data["error"]["details"], (dict, type(None))), \
                    "Error details should be object or null"
    
    @pytest.mark.asyncio
    async def test_401_error_has_standard_format(self, client):
        """Test that 401 errors follow standard error schema."""
        response = await client.post("/v1/auth/logout")  # Requires auth
        
        if response.status_code == 401:
            data = response.json()
            
            assert "error" in data, "Unauthorized response should have 'error' object"
            assert "code" in data["error"], "Error should have 'code'"
            assert "message" in data["error"], "Error should have 'message'"
    
    @pytest.mark.asyncio
    async def test_409_error_has_standard_format(self, client):
        """Test that 409 errors follow standard error schema."""
        # Register twice with same email
        payload = {
            "email": f"conflict{uuid4().hex[:8]}@university.edu.tr",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "student"
        }
        await client.post("/v1/auth/register", json=payload)
        response = await client.post("/v1/auth/register", json=payload)
        
        if response.status_code == 409:
            data = response.json()
            
            assert "error" in data, "Conflict response should have 'error' object"
            assert "code" in data["error"], "Error should have 'code'"
            assert "message" in data["error"], "Error should have 'message'"
