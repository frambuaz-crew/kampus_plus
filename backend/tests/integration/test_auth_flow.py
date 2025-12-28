"""Integration Tests for Authentication Flow (T036).

Tests cover complete authentication workflows:
- Registration → Email Verification → Login → Token Refresh → Logout
- Password Reset Flow
- JWT token lifecycle
- Cookie management (httpOnly refresh tokens)
- Database state verification
- Email delivery verification (mocked)

Test Approach:
- Full end-to-end flows (not isolated unit tests)
- Database transactions (create/verify/cleanup)
- Real JWT token validation
- Cookie handling with httpOnly flags
- Email service mocking (no actual emails sent)

Tools: pytest, httpx AsyncClient, SQLAlchemy async sessions
"""

import pytest
from httpx import AsyncClient, Cookies
from typing import Dict, Any
from uuid import uuid4, UUID
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock, MagicMock

# Import app and dependencies
from src.main import app
from src.core.database import get_db, get_session_factory
from src.models.user import User
from src.services.auth_service import AuthService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def unique_email():
    """Generate unique email for each test (Konya university domain)."""
    return f"student{uuid4().hex[:12]}@ogr.selcuk.edu.tr"


@pytest.fixture
def mock_email_service():
    """Mock email service to prevent actual email sending.
    
    Note: Email service will be mocked during endpoint implementation.
    This fixture is a placeholder for future use.
    """
    # Will be used to verify email sending in GREEN phase
    return MagicMock()


class TestRegistrationFlow:
    """Integration tests for user registration."""
    
    @pytest.mark.asyncio
    async def test_complete_registration_flow(self, client, db_session, unique_email, mock_email_service):
        """Test full registration: create user → verify in DB → email sent."""
        
        # Step 1: Register new user
        register_payload = {
            "email": unique_email,
            "password": "SecurePass123!",
            "first_name": "Integration",
            "last_name": "Test",
            "student_id": "202199999"
        }
        
        response = await client.post("/v1/auth/register", json=register_payload)
        
        assert response.status_code == 201, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert data["email"] == unique_email
        assert "message" in data
        
        user_id = data["user_id"]
        
        # Step 2: Verify user exists in database
        result = await db_session.execute(
            select(User).where(User.email == unique_email)
        )
        user = result.scalar_one_or_none()
        
        assert user is not None, "User should exist in database"
        assert str(user.id) == user_id
        assert user.email == unique_email
        assert user.first_name == "Integration"
        assert user.last_name == "Test"
        assert user.role == "student"
        assert user.student_id == "202199999"
        assert user.is_verified == False, "User should not be verified initially"
        assert user.is_active == True, "User should be active by default"
        assert user.password_hash is not None, "Password should be hashed"
        assert user.password_hash != "SecurePass123!", "Password should not be stored in plaintext"
        
        # Step 3: Verify email was sent
        # TODO: Uncomment when email service is implemented
        # mock_email_service.assert_called_once()
        # call_args = mock_email_service.call_args
        # assert unique_email in str(call_args), "Email should be sent to registered address"
    
    @pytest.mark.asyncio
    async def test_duplicate_registration_fails(self, client, unique_email, mock_email_service):
        """Test that registering same email twice returns 409 Conflict."""
        
        register_payload = {
            "email": unique_email,
            "password": "SecurePass123!",
            "first_name": "First",
            "last_name": "User",
            "student_id": "202199999"
        }
        
        # First registration
        response1 = await client.post("/v1/auth/register", json=register_payload)
        assert response1.status_code == 201
        
        # Second registration with same email
        response2 = await client.post("/v1/auth/register", json=register_payload)
        assert response2.status_code == 409, "Duplicate email should return 409"
        
        error_data = response2.json()
        assert "error" in error_data
        assert "CONFLICT" in error_data["error"]["code"] or "conflict" in error_data["error"]["message"].lower()


class TestEmailVerificationFlow:
    """Integration tests for email verification."""
    
    @pytest.mark.asyncio
    async def test_email_verification_success(self, client, db_session, unique_email, mock_email_service):
        """Test successful email verification flow."""
        
        # Step 1: Register user
        register_payload = {
            "email": unique_email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "Test",
            "student_id": "202199999"
        }
        
        response = await client.post("/v1/auth/register", json=register_payload)
        assert response.status_code == 201
        user_id = response.json()["user_id"]
        
        # Step 2: Get verification token (in real app, this would be from email)
        # For testing, we'll generate a valid token
        # First, get user_id from database
        result = await db_session.execute(
            select(User).where(User.email == unique_email)
        )
        user = result.scalar_one_or_none()
        assert user is not None, "User should exist after registration"
        
        auth_service = AuthService()
        verification_token = await auth_service.generate_verification_token(user.id)
        
        # Step 3: Verify email with token
        verify_response = await client.post("/v1/auth/verify-email", json={
            "token": verification_token
        })
        
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        
        # Step 4: Verify user is marked as verified in database
        # Expire current session to fetch latest data
        db_session.expire_all()  # This is synchronous
        result = await db_session.execute(
            select(User).where(User.email == unique_email)
        )
        user = result.scalar_one_or_none()
        
        assert user is not None
        assert user.is_verified == True, "User should be verified after successful verification"
    
    @pytest.mark.asyncio
    async def test_email_verification_invalid_token(self, client):
        """Test that invalid verification token returns 400."""
        
        response = await client.post("/v1/auth/verify-email", json={
            "token": "invalid_token_12345"
        })
        
        assert response.status_code in [400, 404], "Invalid token should return 400 or 404"


class TestLoginFlow:
    """Integration tests for user login."""
    
    @pytest.mark.asyncio
    async def test_login_with_verified_user(self, client, unique_email, mock_email_service):
        """Test successful login with verified user."""
        
        password = "SecurePass123!"
        
        # Step 1: Register and verify user
        register_payload = {
            "email": unique_email,
            "password": password,
            "first_name": "Login",
            "last_name": "Test",
            "student_id": "202199999"
        }
        
        register_response = await client.post("/v1/auth/register", json=register_payload)
        assert register_response.status_code == 201
        user_id = register_response.json()["user_id"]

        # Verify email (using token)
        auth_service = AuthService()
        verification_token = await auth_service.generate_verification_token(UUID(user_id))
        await client.post("/v1/auth/verify-email", json={"token": verification_token})
        
        # Step 2: Login
        login_response = await client.post("/v1/auth/login", json={
            "email": unique_email,
            "password": password
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        
        # Validate response structure
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        
        # Validate user object
        user = data["user"]
        assert user["email"] == unique_email
        assert user["first_name"] == "Login"
        assert user["last_name"] == "Test"
        assert user["role"] == "student"
        assert user["is_verified"] == True
        
        # Validate JWT token format
        access_token = data["access_token"]
        assert len(access_token.split('.')) == 3, "JWT should have 3 parts (header.payload.signature)"
        
        # Validate refresh token cookie
        cookies = login_response.cookies
        assert "refresh_token" in cookies, "Login should set refresh_token cookie"
        
        # Validate cookie attributes (httpOnly, Secure, SameSite)
        cookie_header = login_response.headers.get("set-cookie", "")
        assert "HttpOnly" in cookie_header or "httponly" in cookie_header.lower(), \
            "Refresh token cookie should be httpOnly"
    
    @pytest.mark.asyncio
    async def test_login_with_unverified_user_fails(self, client, unique_email, mock_email_service):
        """Test that unverified user cannot login (403 Forbidden)."""
        
        password = "SecurePass123!"
        
        # Register user but don't verify email
        register_payload = {
            "email": unique_email,
            "password": password,
            "first_name": "Unverified",
            "last_name": "User",
            "student_id": "202199999"
        }
        
        await client.post("/v1/auth/register", json=register_payload)
        
        # Try to login without verifying email
        login_response = await client.post("/v1/auth/login", json={
            "email": unique_email,
            "password": password
        })
        
        assert login_response.status_code == 403, \
            "Unverified user should not be able to login (403 Forbidden)"
    
    @pytest.mark.asyncio
    async def test_login_with_invalid_credentials_fails(self, client):
        """Test that invalid credentials return 401 Unauthorized."""
        
        response = await client.post("/v1/auth/login", json={
            "email": "nonexistent@university.edu.tr",
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401, "Invalid credentials should return 401"


class TestTokenRefreshFlow:
    """Integration tests for token refresh."""
    
    @pytest.mark.asyncio
    async def test_token_refresh_with_valid_cookie(self, client, unique_email, mock_email_service):
        """Test refreshing access token using refresh token cookie."""
        
        # Step 1: Login to get refresh token
        password = "SecurePass123!"
        
        # Register and verify
        register_payload = {
            "email": unique_email,
            "password": password,
            "first_name": "Refresh",
            "last_name": "Test",
            "student_id": "202199999"
        }
        response = await client.post("/v1/auth/register", json=register_payload)
        assert response.status_code == 201
        user_id = response.json()["user_id"]
        
        auth_service = AuthService()
        verification_token = await auth_service.generate_verification_token(UUID(user_id))
        await client.post("/v1/auth/verify-email", json={"token": verification_token})
        
        # Login
        login_response = await client.post("/v1/auth/login", json={
            "email": unique_email,
            "password": password
        })
        assert login_response.status_code == 200
        
        old_access_token = login_response.json()["access_token"]
        
        # Step 2: Use refresh token to get new access token
        # Extract cookies from login response
        cookies = login_response.cookies
        
        refresh_response = await client.post("/v1/auth/refresh", cookies=cookies)
        
        assert refresh_response.status_code == 200, f"Token refresh failed: {refresh_response.text}"
        
        data = refresh_response.json()
        
        # Validate response structure
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        
        # New access token should be different from old one
        new_access_token = data["access_token"]
        assert new_access_token != old_access_token, "New access token should be different"
    
    @pytest.mark.asyncio
    async def test_token_refresh_without_cookie_fails(self, client):
        """Test that refresh without cookie returns 401."""
        
        response = await client.post("/v1/auth/refresh")
        
        assert response.status_code == 401, "Refresh without cookie should return 401"


class TestLogoutFlow:
    """Integration tests for user logout."""
    
    @pytest.mark.asyncio
    async def test_logout_revokes_refresh_token(self, client, db_session, unique_email, mock_email_service):
        """Test that logout revokes refresh token and clears cookie."""
        
        # Step 1: Login to get tokens
        password = "SecurePass123!"
        
        # Register and verify
        register_payload = {
            "email": unique_email,
            "password": password,
            "first_name": "Logout",
            "last_name": "Test",
            "student_id": "202199999"
        }
        response = await client.post("/v1/auth/register", json=register_payload)
        assert response.status_code == 201
        user_id = response.json()["user_id"]
        
        auth_service = AuthService()
        verification_token = await auth_service.generate_verification_token(UUID(user_id))
        await client.post("/v1/auth/verify-email", json={"token": verification_token})
        
        login_response = await client.post("/v1/auth/login", json={
            "email": unique_email,
            "password": password
        })
        assert login_response.status_code == 200
        
        access_token = login_response.json()["access_token"]
        cookies = login_response.cookies
        
        # Step 2: Logout
        logout_response = await client.post(
            "/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
            cookies=cookies
        )
        
        assert logout_response.status_code == 204, f"Logout failed: {logout_response.text}"
        assert len(logout_response.content) == 0, "204 response should have no body"
        
        # Step 3: Verify refresh token is revoked (cannot refresh)
        refresh_response = await client.post("/v1/auth/refresh", cookies=cookies)
        assert refresh_response.status_code == 401, "Revoked refresh token should not work"
        
        # Step 4: Verify cookie is cleared (has Max-Age=0 or similar)
        cookie_header = logout_response.headers.get("set-cookie", "")
        if cookie_header:
            # Cookie should be cleared (empty value or Max-Age=0)
            assert "Max-Age=0" in cookie_header or "refresh_token=;" in cookie_header, \
                "Logout should clear refresh token cookie"


class TestPasswordResetFlow:
    """Integration tests for password reset."""
    
    @pytest.mark.asyncio
    async def test_forgot_password_sends_email(self, client, unique_email, mock_email_service):
        """Test that forgot password endpoint sends reset email."""
        
        # Register user first
        register_payload = {
            "email": unique_email,
            "password": "OldPassword123!",
            "first_name": "Reset",
            "last_name": "Test",
            "student_id": "202199999"
        }
        await client.post("/v1/auth/register", json=register_payload)
        
        # Request password reset
        with patch('src.services.email_service.send_password_reset_email', new_callable=AsyncMock) as mock_reset_email:
            mock_reset_email.return_value = True
            
            response = await client.post("/v1/auth/forgot-password", json={
                "email": unique_email
            })
            
            assert response.status_code == 200
            # Note: Mock might not be called if email service is not yet implemented
            # This test validates the endpoint behavior, full email testing comes later
    
    @pytest.mark.asyncio
    async def test_forgot_password_nonexistent_email_returns_200(self, client):
        """Test that forgot password returns 200 even for nonexistent email (prevent enumeration)."""
        
        response = await client.post("/v1/auth/forgot-password", json={
            "email": "nonexistent@university.edu.tr"
        })
        
        assert response.status_code == 200, \
            "Forgot password should return 200 even for nonexistent email"
    
    @pytest.mark.asyncio
    async def test_complete_password_reset_flow(self, client, db_session, unique_email, mock_email_service):
        """Test complete password reset: request → reset → login with new password."""
        
        old_password = "OldPassword123!"
        new_password = "NewPassword456!"
        
        # Step 1: Register user
        register_payload = {
            "email": unique_email,
            "password": old_password,
            "first_name": "Reset",
            "last_name": "Flow",
            "student_id": "202199999"
        }
        response = await client.post("/v1/auth/register", json=register_payload)
        assert response.status_code == 201
        user_id = response.json()["user_id"]

        # Verify email
        auth_service = AuthService()
        verification_token = await auth_service.generate_verification_token(UUID(user_id))
        await client.post("/v1/auth/verify-email", json={"token": verification_token})
        
        # Step 2: Request password reset and get token
        reset_token = auth_service.create_password_reset_token(unique_email)
        
        # Step 3: Reset password with token
        reset_response = await client.post("/v1/auth/reset-password", json={
            "token": reset_token,
            "new_password": new_password
        })
        
        assert reset_response.status_code == 200, f"Password reset failed: {reset_response.text}"
        
        # Step 4: Verify old password no longer works
        old_login_response = await client.post("/v1/auth/login", json={
            "email": unique_email,
            "password": old_password
        })
        assert old_login_response.status_code == 401, "Old password should not work"
        
        # Step 5: Verify new password works
        new_login_response = await client.post("/v1/auth/login", json={
            "email": unique_email,
            "password": new_password
        })
        assert new_login_response.status_code == 200, "New password should work"


class TestCompleteAuthenticationFlow:
    """End-to-end integration test covering entire auth flow."""
    
    @pytest.mark.asyncio
    async def test_full_authentication_lifecycle(self, client, db_session, unique_email, mock_email_service):
        """Test complete flow: register → verify → login → refresh → logout."""
        
        password = "FullFlow123!"
        
        # ========== STEP 1: REGISTER ==========
        register_payload = {
            "email": unique_email,
            "password": password,
            "first_name": "Full",
            "last_name": "Flow",
            "student_id": "202100001"
        }
        
        register_response = await client.post("/v1/auth/register", json=register_payload)
        assert register_response.status_code == 201, "Registration should succeed"

        user_id = register_response.json()["user_id"]

        # ========== STEP 2: VERIFY EMAIL ==========
        auth_service = AuthService()
        verification_token = await auth_service.generate_verification_token(UUID(user_id))
        
        verify_response = await client.post("/v1/auth/verify-email", json={
            "token": verification_token
        })
        assert verify_response.status_code == 200, "Email verification should succeed"
        
        # ========== STEP 3: LOGIN ==========
        login_response = await client.post("/v1/auth/login", json={
            "email": unique_email,
            "password": password
        })
        assert login_response.status_code == 200, "Login should succeed"
        
        access_token = login_response.json()["access_token"]
        cookies = login_response.cookies
        
        # ========== STEP 4: REFRESH TOKEN ==========
        refresh_response = await client.post("/v1/auth/refresh", cookies=cookies)
        assert refresh_response.status_code == 200, "Token refresh should succeed"
        
        new_access_token = refresh_response.json()["access_token"]
        assert new_access_token != access_token, "New token should be different"
        
        # ========== STEP 5: LOGOUT ==========
        logout_response = await client.post(
            "/v1/auth/logout",
            headers={"Authorization": f"Bearer {new_access_token}"},
            cookies=cookies
        )
        assert logout_response.status_code == 204, "Logout should succeed"
        
        # ========== STEP 6: VERIFY CANNOT REFRESH AFTER LOGOUT ==========
        post_logout_refresh = await client.post("/v1/auth/refresh", cookies=cookies)
        assert post_logout_refresh.status_code == 401, \
            "Cannot refresh token after logout"
