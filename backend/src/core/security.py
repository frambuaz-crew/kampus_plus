"""Güvenlik yardımcı fonksiyonları - Şifre hashleme ve JWT token yönetimi.

Bu modül şunları sağlar:
- Bcrypt ile şifre hashleme (cost factor ≥12)
- JWT token oluşturma (access + refresh token'lar)
- JWT token doğrulama ve decode etme
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
# UUID import kaldırıldı - user_id artık string

import bcrypt
from jose import JWTError, jwt

from src.core.config import get_settings


def hash_password(password: str) -> str:
    """Bcrypt ile şifre hashle (cost factor ≥12)."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Düz metin şifreyi bcrypt hash ile doğrula."""
    if not plain_password:
        return False
    
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(
    user_id: str,  # String olarak kullanılıyor
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """JWT access token oluştur (15 dakika süre).
    
    Token payload:
    - user_id: Kullanıcı ID (string)
    - role: Kullanıcı rolü (student, admin)
    - type: "access"
    - exp: Süre dolma zamanı
    - iat: Oluşturulma zamanı
    """
    settings = get_settings()
    
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    payload = {
        "user_id": str(user_id),
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": now,
    }
    
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )


def create_refresh_token(
    user_id: str,  # String olarak kullanılıyor
    expires_delta: Optional[timedelta] = None
) -> str:
    """JWT refresh token oluştur (7 gün süre).
    
    Refresh token'lar yeni access token almak için kullanılır.
    XSS koruması için httpOnly cookie'de saklanır.
    
    Token payload:
    - user_id: Kullanıcı ID (string)
    - type: "refresh"
    - exp: Süre dolma zamanı
    - iat: Oluşturulma zamanı
    """
    settings = get_settings()
    
    if expires_delta is None:
        expires_delta = timedelta(days=settings.jwt_refresh_token_expire_days)
    
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    payload = {
        "user_id": str(user_id),
        "type": "refresh",
        "exp": expire,
        "iat": now,
    }
    
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )


def create_email_verification_token(
    user_id: str,  # String olarak kullanılıyor
    expires_delta: Optional[timedelta] = None
) -> str:
    """JWT email doğrulama token'ı oluştur (24 saat süre).
    
    Token payload:
    - user_id: Kullanıcı ID (string)
    - type: "email_verification"
    - exp: Süre dolma zamanı (24 saat)
    - iat: Oluşturulma zamanı
    """
    settings = get_settings()
    
    if expires_delta is None:
        expires_delta = timedelta(hours=24)
    
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    payload = {
        "user_id": str(user_id),
        "type": "email_verification",
        "exp": expire,
        "iat": now,
    }
    
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )


def decode_token(token: str) -> Dict[str, Any]:
    """JWT token'ı decode et ve doğrula.
    
    Doğrular:
    - İmza geçerli (JWT_SECRET_KEY kullanarak)
    - Token süresi dolmamış
    - Token yapısı doğru
    
    Raises:
        JWTError: Token geçersiz, süresi dolmuş veya değiştirilmişse.
    """
    settings = get_settings()
    
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
    except JWTError as e:
        raise JWTError(f"Token doğrulama başarısız: {str(e)}")
