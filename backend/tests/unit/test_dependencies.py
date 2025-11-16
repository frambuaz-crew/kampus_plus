"""Unit tests for FastAPI authentication dependencies.

Tests cover:
- JWT token extraction from Authorization header
- Current user retrieval from database
- Role-based access control (RBAC)
- Token validation and error handling
- Optional authentication
- Email verification requirements
"""

import pytest
from uuid import uuid4
from datetime import timedelta

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

try:
    from src.api.dependencies import (
        get_current_user,
        require_role,
        require_admin,
        require_instructor_or_admin,
        get_current_user_optional,
        require_verified_email,
    )
except ImportError:
    get_current_user = None
    require_role = None
    require_admin = None
    require_instructor_or_admin = None
    get_current_user_optional = None
    require_verified_email = None

try:
    from src.core.security import create_access_token, create_refresh_token
except ImportError:
    create_access_token = None
    create_refresh_token = None

try:
    from src.models.user import User, UserRole
except ImportError:
    User = None
    UserRole = None


# ============================================================================
# CURRENT USER RETRIEVAL TESTS
# ============================================================================

@pytest.mark.skipif(get_current_user is None, reason="Implementation not yet available")
class TestGetCurrentUser:
    """Test current user extraction from JWT token."""
    
    @pytest.mark.asyncio
    async def test_get_current_user_returns_user_for_valid_token(self, mocker):
        """Test that valid access token returns user from database."""
        user_id = uuid4()
        
        # Create valid access token
        token = create_access_token(user_id=user_id, role="student")
        
        # Mock user
        mock_user = mocker.Mock()
        mock_user.id = user_id
        mock_user.email = "student@university.edu.tr"
        mock_user.role = UserRole.STUDENT
        mock_user.is_active = True
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user))
        )
        
        # Mock credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        # Get current user
        user = await get_current_user(credentials, mock_session)
        
        assert user.id == user_id
        assert user.email == "student@university.edu.tr"
    
    @pytest.mark.asyncio
    async def test_get_current_user_raises_401_for_expired_token(self, mocker):
        """Test that expired token raises 401 Unauthorized."""
        user_id = uuid4()
        
        # Create expired token
        expired_token = create_access_token(
            user_id=user_id,
            role="student",
            expires_delta=timedelta(seconds=-1)
        )
        
        # Mock DB session (not called due to early validation failure)
        mock_session = mocker.AsyncMock()
        
        # Mock credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=expired_token)
        
        # Attempt to get current user
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials, mock_session)
        
        assert exc_info.value.status_code == 401
        assert "invalid" in exc_info.value.detail.lower() or "expired" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_get_current_user_raises_401_for_invalid_signature(self, mocker):
        """Test that tampered token raises 401 Unauthorized."""
        user_id = uuid4()
        
        # Create valid token then tamper with it
        token = create_access_token(user_id=user_id, role="student")
        tampered_token = token[:-10] + "TAMPERED!!"
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        
        # Mock credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=tampered_token)
        
        # Attempt to get current user
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials, mock_session)
        
        assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_user_raises_401_for_refresh_token(self, mocker):
        """Test that refresh token is rejected (access token required)."""
        user_id = uuid4()
        
        # Create refresh token (wrong type)
        refresh_token = create_refresh_token(user_id=user_id)
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        
        # Mock credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=refresh_token)
        
        # Attempt to get current user
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials, mock_session)
        
        assert exc_info.value.status_code == 401
        assert "type" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_get_current_user_raises_401_for_nonexistent_user(self, mocker):
        """Test that token with non-existent user_id raises 401."""
        user_id = uuid4()
        
        # Create valid token
        token = create_access_token(user_id=user_id, role="student")
        
        # Mock DB session returning None (user not found)
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=None))
        )
        
        # Mock credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        # Attempt to get current user
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials, mock_session)
        
        assert exc_info.value.status_code == 401
        assert "not found" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_get_current_user_raises_403_for_deactivated_user(self, mocker):
        """Test that deactivated user account raises 403 Forbidden."""
        user_id = uuid4()
        
        # Create valid token
        token = create_access_token(user_id=user_id, role="student")
        
        # Mock deactivated user
        mock_user = mocker.Mock()
        mock_user.id = user_id
        mock_user.is_active = False  # Deactivated
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user))
        )
        
        # Mock credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        # Attempt to get current user
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials, mock_session)
        
        assert exc_info.value.status_code == 403
        assert "deactivated" in exc_info.value.detail.lower()


# ============================================================================
# ROLE-BASED ACCESS CONTROL TESTS
# ============================================================================

@pytest.mark.skipif(require_role is None, reason="Implementation not yet available")
class TestRequireRole:
    """Test role-based access control dependency."""
    
    @pytest.mark.asyncio
    async def test_require_role_allows_user_with_correct_role(self, mocker):
        """Test that user with allowed role passes through."""
        # Mock student user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.role = UserRole.STUDENT
        
        # Create role checker for students
        role_checker = require_role(["student"])
        
        # Mock get_current_user to return our user
        mocker.patch("src.api.dependencies.get_current_user", return_value=mock_user)
        
        # Should pass without exception
        result = await role_checker(current_user=mock_user)
        assert result.id == mock_user.id
    
    @pytest.mark.asyncio
    async def test_require_role_allows_multiple_roles(self, mocker):
        """Test that user with any of multiple allowed roles passes through."""
        # Mock instructor user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.role = UserRole.INSTRUCTOR
        
        # Create role checker for instructors and admins
        role_checker = require_role(["instructor", "admin"])
        
        # Should pass without exception
        result = await role_checker(current_user=mock_user)
        assert result.id == mock_user.id
    
    @pytest.mark.asyncio
    async def test_require_role_rejects_user_with_wrong_role(self, mocker):
        """Test that user without required role is rejected with 403."""
        # Mock student user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.role = UserRole.STUDENT
        
        # Create role checker requiring admin
        role_checker = require_role(["admin"])
        
        # Should raise 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            await role_checker(current_user=mock_user)
        
        assert exc_info.value.status_code == 403
        assert "denied" in exc_info.value.detail.lower()


# ============================================================================
# ADMIN-ONLY TESTS
# ============================================================================

@pytest.mark.skipif(require_admin is None, reason="Implementation not yet available")
class TestRequireAdmin:
    """Test admin-only access control."""
    
    @pytest.mark.asyncio
    async def test_require_admin_allows_admin_user(self, mocker):
        """Test that admin user passes through."""
        # Mock admin user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.role = UserRole.ADMIN
        
        # Should pass without exception
        result = await require_admin(current_user=mock_user)
        assert result.id == mock_user.id
    
    @pytest.mark.asyncio
    async def test_require_admin_rejects_non_admin(self, mocker):
        """Test that non-admin user is rejected with 403."""
        # Mock student user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.role = UserRole.STUDENT
        
        # Should raise 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            await require_admin(current_user=mock_user)
        
        assert exc_info.value.status_code == 403
        assert "admin" in exc_info.value.detail.lower()


# ============================================================================
# INSTRUCTOR OR ADMIN TESTS
# ============================================================================

@pytest.mark.skipif(require_instructor_or_admin is None, reason="Implementation not yet available")
class TestRequireInstructorOrAdmin:
    """Test instructor-or-admin access control."""
    
    @pytest.mark.asyncio
    async def test_require_instructor_or_admin_allows_instructor(self, mocker):
        """Test that instructor passes through."""
        # Mock instructor user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.role = UserRole.INSTRUCTOR
        
        # Should pass without exception
        result = await require_instructor_or_admin(current_user=mock_user)
        assert result.id == mock_user.id
    
    @pytest.mark.asyncio
    async def test_require_instructor_or_admin_allows_admin(self, mocker):
        """Test that admin passes through."""
        # Mock admin user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.role = UserRole.ADMIN
        
        # Should pass without exception
        result = await require_instructor_or_admin(current_user=mock_user)
        assert result.id == mock_user.id
    
    @pytest.mark.asyncio
    async def test_require_instructor_or_admin_rejects_student(self, mocker):
        """Test that student is rejected with 403."""
        # Mock student user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.role = UserRole.STUDENT
        
        # Should raise 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            await require_instructor_or_admin(current_user=mock_user)
        
        assert exc_info.value.status_code == 403


# ============================================================================
# OPTIONAL AUTHENTICATION TESTS
# ============================================================================

@pytest.mark.skipif(get_current_user_optional is None, reason="Implementation not yet available")
class TestGetCurrentUserOptional:
    """Test optional authentication dependency."""
    
    @pytest.mark.asyncio
    async def test_get_current_user_optional_returns_user_for_valid_token(self, mocker):
        """Test that valid token returns user."""
        user_id = uuid4()
        
        # Create valid token
        token = create_access_token(user_id=user_id, role="student")
        
        # Mock user
        mock_user = mocker.Mock()
        mock_user.id = user_id
        mock_user.is_active = True
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user))
        )
        
        # Mock credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        # Get current user (optional)
        user = await get_current_user_optional(credentials, mock_session)
        
        assert user is not None
        assert user.id == user_id
    
    @pytest.mark.asyncio
    async def test_get_current_user_optional_returns_none_for_no_token(self, mocker):
        """Test that missing token returns None (not error)."""
        # Mock DB session
        mock_session = mocker.AsyncMock()
        
        # No credentials
        credentials = None
        
        # Get current user (optional)
        user = await get_current_user_optional(credentials, mock_session)
        
        assert user is None
    
    @pytest.mark.asyncio
    async def test_get_current_user_optional_returns_none_for_invalid_token(self, mocker):
        """Test that invalid token returns None (not error)."""
        # Mock DB session
        mock_session = mocker.AsyncMock()
        
        # Invalid credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.here")
        
        # Get current user (optional) - should not raise exception
        user = await get_current_user_optional(credentials, mock_session)
        
        assert user is None


# ============================================================================
# EMAIL VERIFICATION TESTS
# ============================================================================

@pytest.mark.skipif(require_verified_email is None, reason="Implementation not yet available")
class TestRequireVerifiedEmail:
    """Test email verification requirement."""
    
    @pytest.mark.asyncio
    async def test_require_verified_email_allows_verified_user(self, mocker):
        """Test that verified user passes through."""
        # Mock verified user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.is_verified = True
        
        # Should pass without exception
        result = await require_verified_email(current_user=mock_user)
        assert result.id == mock_user.id
    
    @pytest.mark.asyncio
    async def test_require_verified_email_rejects_unverified_user(self, mocker):
        """Test that unverified user is rejected with 403."""
        # Mock unverified user
        mock_user = mocker.Mock()
        mock_user.id = uuid4()
        mock_user.is_verified = False
        
        # Should raise 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            await require_verified_email(current_user=mock_user)
        
        assert exc_info.value.status_code == 403
        assert "verification" in exc_info.value.detail.lower()
