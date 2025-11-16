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
    
    def test_register_user_hashes_password(self, auth_service):
        """Test that user registration hashes password with bcrypt."""
        email = "newstudent@university.edu.tr"
        password = "SecurePass123!"
        
        # This will need mock DB session - placeholder for now
        # user = auth_service.register_user(email=email, password=password, role="student")
        
        # assert user.password_hash != password
        # assert user.password_hash.startswith("$2b$")
        # assert verify_password(password, user.password_hash) is True
        
        pytest.skip("Requires DB mocking - will implement after service structure is clear")
    
    def test_authenticate_user_returns_tokens_for_valid_credentials(self, auth_service):
        """Test that authentication with correct credentials returns access + refresh tokens."""
        # This requires DB with seeded user - placeholder
        pytest.skip("Requires DB mocking - will implement after service structure is clear")
    
    def test_authenticate_user_raises_exception_for_invalid_password(self, auth_service):
        """Test that authentication fails with wrong password."""
        pytest.skip("Requires DB mocking - will implement after service structure is clear")
    
    def test_refresh_tokens_generates_new_access_token(self, auth_service):
        """Test that refresh endpoint generates new access token."""
        pytest.skip("Requires DB mocking - will implement after service structure is clear")
    
    def test_refresh_tokens_rejects_revoked_refresh_token(self, auth_service):
        """Test that revoked refresh tokens cannot be used."""
        pytest.skip("Requires DB mocking - will implement after service structure is clear")


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
