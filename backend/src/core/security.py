"""Security utilities for password hashing and JWT token management.

This module provides:
- Password hashing with bcrypt (cost factor ≥12)
- JWT token generation (access + refresh tokens)
- JWT token validation and decoding
- Token type verification (access vs refresh)

Authentication requirements:
- Access tokens: 15 minutes expiration, HS256 signature
- Refresh tokens: 7 days expiration, httpOnly cookie storage
- Password cost: bcrypt with cost factor ≥12 per spec
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from src.core.config import get_settings


# ============================================================================
# PASSWORD HASHING (bcrypt)
# ============================================================================

def hash_password(password: str) -> str:
    """Hash password using bcrypt with cost factor ≥12.
    
    Args:
        password: Plain text password to hash.
    
    Returns:
        Bcrypt hash string in format: $2b$12$...
    
    Example:
        >>> hashed = hash_password("Student123!")
        >>> hashed.startswith("$2b$12$")
        True
    """
    # Bcrypt requires bytes
    password_bytes = password.encode('utf-8')
    
    # Generate salt with cost factor 12 (spec requirement: ≥12)
    salt = bcrypt.gensalt(rounds=12)
    
    # Hash password with salt
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    
    # Return as string
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash.
    
    Args:
        plain_password: Plain text password to verify.
        hashed_password: Bcrypt hash to check against.
    
    Returns:
        True if password matches hash, False otherwise.
    
    Example:
        >>> hashed = hash_password("Secret123!")
        >>> verify_password("Secret123!", hashed)
        True
        >>> verify_password("WrongPassword", hashed)
        False
    """
    if not plain_password:
        return False
    
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


# ============================================================================
# JWT TOKEN GENERATION
# ============================================================================

def create_access_token(
    user_id: UUID,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token with 15-minute expiration.
    
    Token payload includes:
    - user_id: User UUID
    - role: User role (student, instructor, admin)
    - type: "access" (distinguishes from refresh tokens)
    - exp: Expiration timestamp
    - iat: Issued at timestamp
    
    Args:
        user_id: User's UUID.
        role: User's role.
        expires_delta: Optional custom expiration delta (default: 15 minutes).
    
    Returns:
        JWT token string.
    
    Example:
        >>> from uuid import uuid4
        >>> token = create_access_token(uuid4(), "student")
        >>> len(token) > 100
        True
    """
    settings = get_settings()
    
    # Calculate expiration time
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    # Build payload
    payload = {
        "user_id": str(user_id),
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": now,
    }
    
    # Encode JWT
    encoded_jwt = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def create_refresh_token(
    user_id: UUID,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT refresh token with 7-day expiration.
    
    Refresh tokens are used to obtain new access tokens without re-authentication.
    Stored in httpOnly cookies for XSS protection.
    
    Token payload includes:
    - user_id: User UUID
    - type: "refresh" (distinguishes from access tokens)
    - exp: Expiration timestamp
    - iat: Issued at timestamp
    
    Args:
        user_id: User's UUID.
        expires_delta: Optional custom expiration delta (default: 7 days).
    
    Returns:
        JWT token string.
    
    Example:
        >>> from uuid import uuid4
        >>> token = create_refresh_token(uuid4())
        >>> len(token) > 100
        True
    """
    settings = get_settings()
    
    # Calculate expiration time (7 days)
    if expires_delta is None:
        expires_delta = timedelta(days=settings.jwt_refresh_token_expire_days)
    
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    # Build payload (no role in refresh tokens - must re-fetch from DB)
    payload = {
        "user_id": str(user_id),
        "type": "refresh",
        "exp": expire,
        "iat": now,
    }
    
    # Encode JWT
    encoded_jwt = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


# ============================================================================
# JWT TOKEN VALIDATION
# ============================================================================

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT token.
    
    Verifies:
    - Signature is valid (using JWT_SECRET_KEY)
    - Token has not expired
    - Token structure is correct
    
    Args:
        token: JWT token string to decode.
    
    Returns:
        Dictionary containing token payload.
    
    Raises:
        JWTError: If token is invalid, expired, or tampered.
    
    Example:
        >>> from uuid import uuid4
        >>> token = create_access_token(uuid4(), "student")
        >>> payload = decode_token(token)
        >>> payload["type"]
        'access'
    """
    settings = get_settings()
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        # Re-raise with context
        raise JWTError(f"Token validation failed: {str(e)}")


def verify_token_type(token: str, expected_type: str) -> Dict[str, Any]:
    """Verify token is of expected type (access or refresh).
    
    Args:
        token: JWT token string.
        expected_type: Expected token type ("access" or "refresh").
    
    Returns:
        Token payload if type matches.
    
    Raises:
        ValueError: If token type doesn't match expected.
        JWTError: If token is invalid.
    
    Example:
        >>> from uuid import uuid4
        >>> token = create_access_token(uuid4(), "student")
        >>> payload = verify_token_type(token, "access")
        >>> payload["type"]
        'access'
    """
    payload = decode_token(token)
    
    if payload.get("type") != expected_type:
        raise ValueError(
            f"Invalid token type. Expected '{expected_type}', got '{payload.get('type')}'"
        )
    
    return payload


def extract_user_id_from_token(token: str) -> UUID:
    """Extract user_id from JWT token.
    
    Args:
        token: JWT token string.
    
    Returns:
        User UUID extracted from token.
    
    Raises:
        JWTError: If token is invalid.
        ValueError: If user_id is missing or invalid UUID.
    
    Example:
        >>> from uuid import uuid4
        >>> user_id = uuid4()
        >>> token = create_access_token(user_id, "student")
        >>> extracted_id = extract_user_id_from_token(token)
        >>> extracted_id == user_id
        True
    """
    payload = decode_token(token)
    
    user_id_str = payload.get("user_id")
    if not user_id_str:
        raise ValueError("Token missing user_id claim")
    
    try:
        return UUID(user_id_str)
    except ValueError as e:
        raise ValueError(f"Invalid user_id format in token: {e}")
