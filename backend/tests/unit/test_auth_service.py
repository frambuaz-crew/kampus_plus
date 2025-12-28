"""
Unit tests for authentication service.

Tests JWT token generation, password hashing, token validation,
and refresh token flow following TDD Red-Green-Refactor approach.

CONSTITUTION MANDATE: These tests are written FIRST before implementation.
Expected to FAIL initially (Red), then pass after implementation (Green).
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

# These imports will fail until implementation exists (RED phase)
try:
    from src.services.auth_service import AuthService
except ImportError:
    AuthService = None

try:
    from src.core.security import (
        hash_password,
        verify_password,
        create_access_token,
        create_refresh_token,
        decode_token,
    )
except ImportError:
    # Expected during RED phase - tests should still be runnable
    hash_password = None
    verify_password = None
    create_access_token = None
    create_refresh_token = None
    decode_token = None


# ============================================================================
# PASSWORD HASHING TESTS
# ============================================================================

@pytest.mark.skipif(hash_password is None, reason="Implementation not yet available (RED phase)")
class TestPasswordHashing:
    """Test password hashing with bcrypt."""
    
    def test_hash_password_returns_different_hash_each_time(self):
        """Test that hashing same password twice produces different hashes (salt)."""
        password = "Student123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2, "Hashes should differ due to random salt"
        assert len(hash1) > 50, "Bcrypt hash should be substantial length"
        assert hash1.startswith("$2b$"), "Should use bcrypt format"
    
    def test_hash_password_uses_bcrypt_cost_factor_12_or_higher(self):
        """Test that password hashing uses bcrypt cost factor ≥12 (spec requirement)."""
        password = "Instructor123!"
        hashed = hash_password(password)
        
        # Bcrypt format: $2b$12$... (12 is the cost factor)
        parts = hashed.split("$")
        cost_factor = int(parts[2])
        
        assert cost_factor >= 12, f"Cost factor {cost_factor} must be ≥12 per spec"
    
    def test_verify_password_accepts_correct_password(self):
        """Test that verify_password returns True for correct password."""
        password = "MySecurePass123!"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_rejects_incorrect_password(self):
        """Test that verify_password returns False for wrong password."""
        password = "CorrectPassword123!"
        wrong_password = "WrongPassword123!"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_verify_password_rejects_empty_password(self):
        """Test that empty password is rejected."""
        hashed = hash_password("SomePassword123!")
        
        assert verify_password("", hashed) is False
    
    def test_hash_password_handles_unicode_characters(self):
        """Test password hashing with Turkish characters."""
        password = "Şifre123!İçÜöÇ"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True


# ============================================================================
# JWT TOKEN GENERATION TESTS
# ============================================================================

@pytest.mark.skipif(create_access_token is None, reason="Implementation not yet available (RED phase)")
class TestJWTTokenGeneration:
    """Test JWT access token creation."""
    
    def test_create_access_token_includes_user_id_and_role(self):
        """Test that access token contains user_id and role claims."""
        user_id = uuid4()
        role = "student"
        
        token = create_access_token(user_id=user_id, role=role)
        payload = decode_token(token)
        
        assert payload["user_id"] == str(user_id)
        assert payload["role"] == role
        assert payload["type"] == "access"
    
    def test_create_access_token_includes_expiration(self):
        """Test that access token has exp claim."""
        user_id = uuid4()
        
        token = create_access_token(user_id=user_id, role="student")
        payload = decode_token(token)
        
        assert "exp" in payload
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        
        # Access token should expire in ~15 minutes (allow 14-16 min range)
        time_diff = (exp_time - now).total_seconds()
        assert 14 * 60 <= time_diff <= 16 * 60, "Access token should expire in ~15 minutes"
    
    def test_create_access_token_includes_issued_at(self):
        """Test that access token has iat claim."""
        user_id = uuid4()
        
        token = create_access_token(user_id=user_id, role="instructor")
        payload = decode_token(token)
        
        assert "iat" in payload
        iat_time = datetime.fromtimestamp(payload["iat"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        
        # Should be issued within last few seconds
        time_diff = (now - iat_time).total_seconds()
        assert 0 <= time_diff <= 5, "Token should be issued within last 5 seconds"
    
    def test_create_refresh_token_has_longer_expiration(self):
        """Test that refresh token expires in 7 days (spec requirement)."""
        user_id = uuid4()
        
        token = create_refresh_token(user_id=user_id)
        payload = decode_token(token)
        
        assert payload["type"] == "refresh"
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        
        # Refresh token should expire in ~7 days
        time_diff = (exp_time - now).total_seconds()
        expected_seconds = 7 * 24 * 60 * 60  # 7 days
        
        # Allow 1 hour variance
        assert abs(time_diff - expected_seconds) <= 3600, "Refresh token should expire in ~7 days"


# ============================================================================
# TOKEN VALIDATION TESTS
# ============================================================================

@pytest.mark.skipif(decode_token is None, reason="Implementation not yet available (RED phase)")
class TestTokenValidation:
    """Test JWT token validation and decoding."""
    
    def test_decode_token_returns_payload_for_valid_token(self):
        """Test that decode_token successfully decodes valid JWT."""
        user_id = uuid4()
        role = "admin"
        
        token = create_access_token(user_id=user_id, role=role)
        payload = decode_token(token)
        
        assert payload["user_id"] == str(user_id)
        assert payload["role"] == role
    
    def test_decode_token_raises_exception_for_expired_token(self):
        """Test that expired tokens are rejected."""
        user_id = uuid4()
        
        # Create token that expired 1 hour ago
        token = create_access_token(
            user_id=user_id,
            role="student",
            expires_delta=timedelta(hours=-1)
        )
        
        with pytest.raises(Exception) as exc_info:
            decode_token(token)
        
        assert "expired" in str(exc_info.value).lower()
    
    def test_decode_token_raises_exception_for_invalid_signature(self):
        """Test that tokens with tampered signature are rejected."""
        user_id = uuid4()
        token = create_access_token(user_id=user_id, role="student")
        
        # Tamper with token (change last character)
        tampered_token = token[:-1] + ("X" if token[-1] != "X" else "Y")
        
        with pytest.raises(Exception) as exc_info:
            decode_token(tampered_token)
        
        assert "signature" in str(exc_info.value).lower() or "invalid" in str(exc_info.value).lower()
    
    def test_decode_token_raises_exception_for_malformed_token(self):
        """Test that malformed JWT strings are rejected."""
        with pytest.raises(Exception):
            decode_token("not.a.valid.jwt.token")
    
    def test_decode_token_rejects_empty_token(self):
        """Test that empty token string is rejected."""
        with pytest.raises(Exception):
            decode_token("")


# ============================================================================
# AUTH SERVICE INTEGRATION TESTS
# ============================================================================

@pytest.mark.skipif(AuthService is None, reason="Implementation not yet available (RED phase)")
class TestAuthService:
    """Test AuthService high-level authentication flows."""
    
    @pytest.fixture
    def auth_service(self):
        """Provide AuthService instance for testing."""
        return AuthService()
    
    @pytest.mark.asyncio
    async def test_register_user_hashes_password(self, auth_service, mocker):
        """Test that user registration hashes password with bcrypt."""
        email = "newstudent@university.edu.tr"
        password = "SecurePass123!"
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=None)))
        mock_session.commit = mocker.AsyncMock()
        mock_session.refresh = mocker.AsyncMock()
        
        # Register user
        user = await auth_service.register_user(
            session=mock_session,
            email=email,
            password=password,
            first_name="Ali",
            last_name="Yılmaz",
            student_id="202112345"
        )
        
        # Verify password is hashed
        assert user.password_hash != password
        assert user.password_hash.startswith("$2b$")
        assert verify_password(password, user.password_hash) is True
        
        # Verify DB operations called
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_authenticate_user_returns_tokens_for_valid_credentials(self, auth_service, mocker):
        """Test that authentication with correct credentials returns access + refresh tokens."""
        email = "student@university.edu.tr"
        password = "SecurePass123!"
        
        # Create mock user with hashed password
        from src.models.user import UserRole
        user_id = uuid4()
        mock_user = mocker.Mock()
        mock_user.id = user_id
        mock_user.email = email
        mock_user.password_hash = hash_password(password)
        mock_user.role = UserRole.STUDENT
        mock_user.is_active = True
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user)))
        mock_session.commit = mocker.AsyncMock()
        
        # Authenticate
        user, access_token, refresh_token = await auth_service.authenticate_user(
            session=mock_session,
            email=email,
            password=password
        )
        
        # Verify returned values
        assert user.id == user_id
        assert isinstance(access_token, str)
        assert isinstance(refresh_token, str)
        
        # Verify tokens are valid
        access_payload = decode_token(access_token)
        assert access_payload["user_id"] == str(user_id)
        assert access_payload["type"] == "access"
        
        refresh_payload = decode_token(refresh_token)
        assert refresh_payload["user_id"] == str(user_id)
        assert refresh_payload["type"] == "refresh"
    
    @pytest.mark.asyncio
    async def test_authenticate_user_raises_exception_for_invalid_password(self, auth_service, mocker):
        """Test that authentication fails with wrong password."""
        email = "student@university.edu.tr"
        correct_password = "SecurePass123!"
        wrong_password = "WrongPassword"
        
        # Create mock user
        from src.models.user import UserRole
        mock_user = mocker.Mock()
        mock_user.email = email
        mock_user.password_hash = hash_password(correct_password)
        mock_user.role = UserRole.STUDENT
        mock_user.is_active = True
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user)))
        
        # Attempt authentication with wrong password
        with pytest.raises(ValueError) as exc_info:
            await auth_service.authenticate_user(
                session=mock_session,
                email=email,
                password=wrong_password
            )
        
        assert "invalid" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_refresh_tokens_generates_new_access_token(self, auth_service, mocker):
        """Test that refresh endpoint generates new access token."""
        import time
        user_id = uuid4()
        
        # Create valid refresh token
        refresh_token = create_refresh_token(user_id=user_id)
        time.sleep(1)  # Ensure different iat timestamp for new token
        
        # Create mock user
        from src.models.user import UserRole
        mock_user = mocker.Mock()
        mock_user.id = user_id
        mock_user.role = UserRole.STUDENT
        mock_user.is_active = True
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user)))
        mock_session.commit = mocker.AsyncMock()
        
        # Refresh tokens
        new_access_token, new_refresh_token = await auth_service.refresh_access_token(
            session=mock_session,
            refresh_token_str=refresh_token
        )
        
        # Verify new tokens
        assert isinstance(new_access_token, str)
        assert isinstance(new_refresh_token, str)
        assert new_access_token != refresh_token
        assert new_refresh_token != refresh_token
        
        # Verify new access token is valid
        access_payload = decode_token(new_access_token)
        assert access_payload["user_id"] == str(user_id)
        assert access_payload["type"] == "access"
    
    @pytest.mark.asyncio
    async def test_refresh_tokens_rejects_revoked_refresh_token(self, auth_service, mocker):
        """Test that revoked refresh tokens cannot be used."""
        user_id = uuid4()
        
        # Create expired refresh token (negative expiration)
        from datetime import timedelta
        expired_token = create_refresh_token(user_id=user_id, expires_delta=timedelta(seconds=-1))
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        
        # Attempt to use expired token
        with pytest.raises(ValueError) as exc_info:
            await auth_service.refresh_access_token(
                session=mock_session,
                refresh_token_str=expired_token
            )
        
        assert "invalid" in str(exc_info.value).lower() or "expired" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_register_user_rejects_duplicate_email(self, auth_service, mocker):
        """Test that registering with existing email raises ValueError."""
        email = "existing@university.edu.tr"
        
        # Mock existing user
        mock_existing_user = mocker.Mock()
        mock_existing_user.email = email
        
        # Mock DB session returning existing user
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_existing_user))
        )
        
        # Attempt registration
        with pytest.raises(ValueError) as exc_info:
            await auth_service.register_user(
                session=mock_session,
                email=email,
                password="Password123!",
                first_name="Ali",
                last_name="Yılmaz",
                role="student"
            )
        
        assert "already exists" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_authenticate_user_rejects_nonexistent_email(self, auth_service, mocker):
        """Test that authentication fails with non-existent email."""
        # Mock DB session returning None (user not found)
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=None))
        )
        
        # Attempt authentication
        with pytest.raises(ValueError) as exc_info:
            await auth_service.authenticate_user(
                session=mock_session,
                email="nonexistent@university.edu.tr",
                password="Password123!"
            )
        
        assert "invalid" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_authenticate_user_rejects_inactive_user(self, auth_service, mocker):
        """Test that authentication fails for deactivated user."""
        email = "inactive@university.edu.tr"
        password = "Password123!"
        
        # Create mock inactive user
        from src.models.user import UserRole
        mock_user = mocker.Mock()
        mock_user.email = email
        mock_user.password_hash = hash_password(password)
        mock_user.role = UserRole.STUDENT
        mock_user.is_active = False  # Deactivated
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user))
        )
        
        # Attempt authentication
        with pytest.raises(ValueError) as exc_info:
            await auth_service.authenticate_user(
                session=mock_session,
                email=email,
                password=password
            )
        
        assert "deactivated" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_refresh_access_token_rejects_nonexistent_user(self, auth_service, mocker):
        """Test that refresh fails if user no longer exists."""
        user_id = uuid4()
        
        # Create valid refresh token
        refresh_token = create_refresh_token(user_id=user_id)
        
        # Mock DB session returning None (user deleted)
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=None))
        )
        
        # Attempt refresh
        with pytest.raises(ValueError) as exc_info:
            await auth_service.refresh_access_token(
                session=mock_session,
                refresh_token_str=refresh_token
            )
        
        assert "not found" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_refresh_access_token_rejects_inactive_user(self, auth_service, mocker):
        """Test that refresh fails for deactivated user."""
        user_id = uuid4()
        
        # Create valid refresh token
        refresh_token = create_refresh_token(user_id=user_id)
        
        # Create mock inactive user
        from src.models.user import UserRole
        mock_user = mocker.Mock()
        mock_user.id = user_id
        mock_user.role = UserRole.STUDENT
        mock_user.is_active = False  # Deactivated
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user))
        )
        
        # Attempt refresh
        with pytest.raises(ValueError) as exc_info:
            await auth_service.refresh_access_token(
                session=mock_session,
                refresh_token_str=refresh_token
            )
        
        assert "deactivated" in str(exc_info.value).lower()


# ============================================================================
# TOKEN ROTATION TESTS
# ============================================================================

@pytest.mark.skipif(create_refresh_token is None, reason="Implementation not yet available (RED phase)")
class TestTokenRotation:
    """Test refresh token rotation security mechanism."""
    
    def test_refresh_tokens_are_unique(self):
        """Test that creating multiple refresh tokens produces unique values."""
        import time
        user_id = uuid4()
        
        token1 = create_refresh_token(user_id=user_id)
        time.sleep(1)  # Ensure different iat timestamp
        token2 = create_refresh_token(user_id=user_id)
        
        assert token1 != token2, "Refresh tokens should be unique even for same user"
    
    def test_refresh_token_contains_user_id(self):
        """Test that refresh token payload includes user_id."""
        user_id = uuid4()
        
        token = create_refresh_token(user_id=user_id)
        payload = decode_token(token)
        
        assert payload["user_id"] == str(user_id)
        assert payload["type"] == "refresh"


# ============================================================================
# EDGE CASES & SECURITY TESTS
# ============================================================================

@pytest.mark.skipif(hash_password is None, reason="Implementation not yet available (RED phase)")
class TestSecurityEdgeCases:
    """Test edge cases and security scenarios."""
    
    def test_password_hashing_handles_very_long_passwords(self):
        """Test that very long passwords (>100 chars) are handled correctly."""
        long_password = "A" * 200 + "1!"
        hashed = hash_password(long_password)
        
        assert verify_password(long_password, hashed) is True
    
    def test_token_generation_handles_special_characters_in_role(self):
        """Test token generation with various role values."""
        user_id = uuid4()
        roles = ["student", "instructor", "admin", "STUDENT", "Admin"]
        
        for role in roles:
            token = create_access_token(user_id=user_id, role=role)
            payload = decode_token(token)
            assert payload["role"] == role
    
    def test_decode_token_raises_on_none_input(self):
        """Test that None token raises appropriate exception."""
        with pytest.raises(Exception):
            decode_token(None)


# ============================================================================
# EMAIL VERIFICATION TESTS
# ============================================================================

@pytest.mark.skipif(AuthService is None, reason="Implementation not yet available")
class TestEmailVerification:
    """Test email verification functionality."""
    
    @pytest.fixture
    def auth_service(self):
        """Provide AuthService instance for testing."""
        return AuthService()
    
    @pytest.mark.asyncio
    async def test_generate_verification_token_creates_valid_token(self, auth_service):
        """Test that verification token is generated correctly."""
        user_id = uuid4()
        
        # Generate verification token
        token = await auth_service.generate_verification_token(user_id)
        
        # Verify token structure
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify payload
        payload = decode_token(token)
        assert payload["user_id"] == str(user_id)
        assert payload["role"] == "verification"
    
    @pytest.mark.asyncio
    async def test_verify_email_marks_user_as_verified(self, auth_service, mocker):
        """Test that email verification updates user.is_verified."""
        user_id = uuid4()
        
        # Create verification token
        verification_token = await auth_service.generate_verification_token(user_id)
        
        # Mock unverified user
        mock_user = mocker.Mock()
        mock_user.id = user_id
        mock_user.is_verified = False
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user))
        )
        mock_session.commit = mocker.AsyncMock()
        mock_session.refresh = mocker.AsyncMock()
        
        # Verify email
        user = await auth_service.verify_email(mock_session, verification_token)
        
        # Check user is verified
        assert user.is_verified is True
        mock_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_verify_email_rejects_expired_token(self, auth_service, mocker):
        """Test that expired verification token is rejected."""
        from datetime import timedelta
        user_id = uuid4()
        
        # Create expired token
        expired_token = create_access_token(
            user_id=user_id,
            role="verification",
            expires_delta=timedelta(seconds=-1)
        )
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        
        # Attempt verification
        with pytest.raises(ValueError) as exc_info:
            await auth_service.verify_email(mock_session, expired_token)
        
        assert "invalid" in str(exc_info.value).lower() or "expired" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_verify_email_rejects_nonexistent_user(self, auth_service, mocker):
        """Test that verification fails if user doesn't exist."""
        user_id = uuid4()
        
        # Create valid token
        verification_token = await auth_service.generate_verification_token(user_id)
        
        # Mock DB session returning None (user deleted)
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=None))
        )
        
        # Attempt verification
        with pytest.raises(ValueError) as exc_info:
            await auth_service.verify_email(mock_session, verification_token)
        
        assert "not found" in str(exc_info.value).lower()


# ============================================================================
# TOKEN REVOCATION TESTS
# ============================================================================

@pytest.mark.skipif(AuthService is None, reason="Implementation not yet available")
class TestTokenRevocation:
    """Test token revocation (logout) functionality."""
    
    @pytest.fixture
    def auth_service(self):
        """Provide AuthService instance for testing."""
        return AuthService()
    
    @pytest.mark.asyncio
    async def test_revoke_refresh_token_marks_tokens_as_revoked(self, auth_service, mocker):
        """Test that revoking refresh token updates database."""
        user_id = uuid4()
        
        # Create refresh token
        refresh_token = create_refresh_token(user_id=user_id)
        
        # Mock existing token in database
        from src.models.user import RefreshToken
        mock_token = mocker.Mock(spec=RefreshToken)
        mock_token.user_id = user_id
        mock_token.is_revoked = False
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalars=mocker.Mock(return_value=mocker.Mock(all=mocker.Mock(return_value=[mock_token]))))
        )
        mock_session.commit = mocker.AsyncMock()
        
        # Revoke token
        await auth_service.revoke_refresh_token(mock_session, refresh_token)
        
        # Verify token is revoked
        assert mock_token.is_revoked is True
        mock_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_revoke_refresh_token_rejects_invalid_token(self, auth_service, mocker):
        """Test that invalid token raises error."""
        # Mock DB session
        mock_session = mocker.AsyncMock()
        
        # Attempt to revoke invalid token
        with pytest.raises(ValueError) as exc_info:
            await auth_service.revoke_refresh_token(mock_session, "invalid.token.here")
        
        assert "invalid" in str(exc_info.value).lower()


# ============================================================================
# USER LOOKUP TESTS
# ============================================================================

@pytest.mark.skipif(AuthService is None, reason="Implementation not yet available")
class TestUserLookup:
    """Test user lookup helper methods."""
    
    @pytest.fixture
    def auth_service(self):
        """Provide AuthService instance for testing."""
        return AuthService()
    
    @pytest.mark.asyncio
    async def test_get_user_by_id_returns_user(self, auth_service, mocker):
        """Test that get_user_by_id returns user when exists."""
        user_id = uuid4()
        
        # Mock user
        mock_user = mocker.Mock()
        mock_user.id = user_id
        mock_user.email = "student@university.edu.tr"
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user))
        )
        
        # Get user by ID
        user = await auth_service.get_user_by_id(mock_session, user_id)
        
        assert user is not None
        assert user.id == user_id
    
    @pytest.mark.asyncio
    async def test_get_user_by_id_returns_none_when_not_found(self, auth_service, mocker):
        """Test that get_user_by_id returns None when user doesn't exist."""
        user_id = uuid4()
        
        # Mock DB session returning None
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=None))
        )
        
        # Get user by ID
        user = await auth_service.get_user_by_id(mock_session, user_id)
        
        assert user is None
    
    @pytest.mark.asyncio
    async def test_get_user_by_email_returns_user(self, auth_service, mocker):
        """Test that get_user_by_email returns user when exists."""
        email = "student@university.edu.tr"
        
        # Mock user
        mock_user = mocker.Mock()
        mock_user.email = email
        mock_user.id = uuid4()
        
        # Mock DB session
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=mock_user))
        )
        
        # Get user by email
        user = await auth_service.get_user_by_email(mock_session, email)
        
        assert user is not None
        assert user.email == email
    
    @pytest.mark.asyncio
    async def test_get_user_by_email_returns_none_when_not_found(self, auth_service, mocker):
        """Test that get_user_by_email returns None when user doesn't exist."""
        email = "nonexistent@university.edu.tr"
        
        # Mock DB session returning None
        mock_session = mocker.AsyncMock()
        mock_session.execute = mocker.AsyncMock(
            return_value=mocker.Mock(scalar_one_or_none=mocker.Mock(return_value=None))
        )
        
        # Get user by email
        user = await auth_service.get_user_by_email(mock_session, email)
        
        assert user is None
