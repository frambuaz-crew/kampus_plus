"""Kimlik doğrulama servisi - Kullanıcı kaydı, giriş ve token yönetimi.

Spec: specs/002-register-page, specs/003-login-page
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from uuid import uuid4


def _utc_naive() -> datetime:
    """PostgreSQL TIMESTAMP WITHOUT TIME ZONE ile uyumlu naive UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_email_verification_token,
    decode_token,
)
from src.models.user import User, RefreshToken, UserRole


class AuthService:
    """Kimlik doğrulama servisi."""
    
    def __init__(self):
        """Kimlik doğrulama servisini başlat."""
        self.settings = get_settings()
    
    async def register_user(
        self,
        session: AsyncSession,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        student_number: str,
        department: str,
        university: Optional[str] = None,
        username: Optional[str] = None,
        terms_accepted_at: Optional[datetime] = None,
    ) -> User:
        """Yeni öğrenci kullanıcısı kaydet.
        
        Args:
            session: Veritabanı oturumu
            email: Kullanıcı email adresi (.edu.tr domain)
            password: Düz metin şifre
            first_name: Ad
            last_name: Soyad
            student_number: Öğrenci numarası
            department: Bölüm
            university: Üniversite adı (opsiyonel, email'den çıkarılabilir)
            username: Kullanıcı adı (opsiyonel)
        
        Returns:
            Oluşturulan User instance (role='student', is_verified=False)
        
        Raises:
            ValueError: Email zaten kayıtlıysa veya validasyon başarısızsa
        """
        result = await session.execute(
            select(User).where(User.email == email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise ValueError(f"Bu email adresi zaten kayıtlı: {email}")
        
        password_hash = hash_password(password)
        
        if not university:
            # Email'den otomatik olarak üniversite ismini çıkar
            from src.services.university_service import get_university_service
            university_service = get_university_service()
            university = await university_service.get_university_from_email(email, session)
        
        user = User(
            id=str(uuid4()),  # String olarak kaydet
            email=email,
            password_hash=password_hash,
            role=UserRole.STUDENT,
            first_name=first_name,
            last_name=last_name,
            username=username or email.split("@")[0],
            student_number=student_number,
            department=department,
            university=university,
            is_verified=False,
            is_active=True,
            terms_accepted_at=terms_accepted_at or _utc_naive(),
            created_at=_utc_naive(),
            updated_at=_utc_naive(),
        )
        
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        return user
    
    async def authenticate_user(
        self,
        session: AsyncSession,
        email: str,
        password: str,
        remember_me: bool = False,
    ) -> Tuple[User, str, str]:
        """Kullanıcıyı doğrula ve token'ları döndür.
        
        Args:
            session: Veritabanı oturumu
            email: Kullanıcı email'i
            password: Düz metin şifre
            remember_me: "Beni Hatırla" seçeneği (refresh token süresini uzatır)
        
        Returns:
            (user, access_token, refresh_token) tuple
        
        Raises:
            ValueError: Kimlik bilgileri geçersizse veya kullanıcı aktif değilse
        """
        result = await session.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("Geçersiz email veya şifre")
        
        if not verify_password(password, user.password_hash):
            raise ValueError("Geçersiz email veya şifre")
        
        if not user.is_verified:
            raise ValueError("Email doğrulanmamış. Lütfen email adresinizi doğrulayın.")
        
        if not user.is_active:
            raise ValueError("Kullanıcı hesabı aktif değil")
        
        access_token = create_access_token(
            user_id=user.id,
            role=user.role.value
        )
        
        # Remember me için refresh token süresini uzat
        refresh_expire_days = (
            self.settings.jwt_refresh_token_expire_days_remember_me
            if remember_me
            else self.settings.jwt_refresh_token_expire_days
        )
        refresh_token_str = create_refresh_token(
            user_id=user.id,
            expires_delta=timedelta(days=refresh_expire_days)
        )
        
        # Refresh token'ı veritabanına kaydet (spec'e göre token string olarak)
        refresh_token = RefreshToken(
            id=str(uuid4()),
            user_id=user.id,
            token=refresh_token_str,
            expires_at=_utc_naive() + timedelta(days=refresh_expire_days),
            created_at=_utc_naive(),
        )
        
        session.add(refresh_token)
        await session.commit()
        
        return user, access_token, refresh_token_str
    
    async def refresh_access_token(
        self,
        session: AsyncSession,
        refresh_token_str: str,
    ) -> Tuple[str, str]:
        """Refresh token ile yeni access token oluştur.
        
        Args:
            session: Veritabanı oturumu
            refresh_token_str: Mevcut refresh token
        
        Returns:
            (new_access_token, new_refresh_token) tuple
        
        Raises:
            ValueError: Refresh token geçersiz, süresi dolmuş veya iptal edilmişse
        """
        try:
            payload = decode_token(refresh_token_str)
        except Exception as e:
            raise ValueError(f"Geçersiz refresh token: {e}")
        
        if payload.get("type") != "refresh":
            raise ValueError("Token bir refresh token değil")
        
        user_id_str = payload.get("user_id")
        if not user_id_str:
            raise ValueError("Token'da user_id eksik")
        
        # User ID string olarak kullanılıyor
        result = await session.execute(
            select(User).where(User.id == user_id_str)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("Kullanıcı bulunamadı")
        
        if not user.is_active:
            raise ValueError("Kullanıcı hesabı devre dışı")
        
        # Veritabanında refresh token'ı kontrol et
        result = await session.execute(
            select(RefreshToken).where(
                RefreshToken.token == refresh_token_str,
                RefreshToken.user_id == user_id_str
            )
        )
        token_record = result.scalar_one_or_none()
        
        if not token_record:
            raise ValueError("Refresh token bulunamadı")
        
        if token_record.expires_at < _utc_naive():
            raise ValueError("Refresh token süresi dolmuş")
        
        # Yeni token'lar oluştur
        new_access_token = create_access_token(
            user_id=user.id,
            role=user.role.value
        )
        new_refresh_token_str = create_refresh_token(user_id=user.id)
        
        # Eski token'ı sil, yeni token'ı kaydet
        await session.delete(token_record)
        
        new_refresh_token = RefreshToken(
            id=str(uuid4()),
            user_id=user.id,
            token=new_refresh_token_str,
            expires_at=_utc_naive() + timedelta(days=self.settings.jwt_refresh_token_expire_days),
            created_at=_utc_naive(),
        )
        
        session.add(new_refresh_token)
        await session.commit()
        
        return new_access_token, new_refresh_token_str
    
    def generate_verification_token(self, user_id: str) -> str:
        """Email doğrulama token'ı oluştur."""
        return create_email_verification_token(user_id=user_id)
    
    async def verify_email(
        self,
        session: AsyncSession,
        verification_token: str,
    ) -> User:
        """Email doğrulama token'ı ile kullanıcı email'ini doğrula."""
        try:
            payload = decode_token(verification_token)
        except Exception as e:
            raise ValueError(f"Geçersiz doğrulama token'ı: {e}")
        
        if payload.get("type") != "email_verification":
            raise ValueError("Token bir email doğrulama token'ı değil")
        
        user_id_str = payload.get("user_id")
        if not user_id_str:
            raise ValueError("Token'da user_id eksik")
        
        # User ID string olarak kullanılıyor
        result = await session.execute(
            select(User).where(User.id == user_id_str)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("Kullanıcı bulunamadı")
        
        if user.is_verified:
            raise ValueError("Email adresi zaten doğrulanmış")
        
        user.is_verified = True
        user.updated_at = _utc_naive()
        
        await session.commit()
        await session.refresh(user)
        
        return user
    
    def create_password_reset_token(self, user_id: str) -> str:
        """Şifre sıfırlama token'ı oluştur (1 saat süre)."""
        return create_access_token(
            user_id=user_id,
            role="password_reset",
            expires_delta=timedelta(hours=1)
        )
    
    async def verify_password_reset_token(
        self,
        session: AsyncSession,
        token: str,
    ) -> User:
        """Şifre sıfırlama token'ını doğrula ve kullanıcıyı döndür."""
        try:
            payload = decode_token(token)
        except Exception as e:
            raise ValueError(f"Geçersiz şifre sıfırlama token'ı: {e}")
        
        if payload.get("role") != "password_reset":
            raise ValueError("Token bir şifre sıfırlama token'ı değil")
        
        user_id_str = payload.get("user_id")
        if not user_id_str:
            raise ValueError("Token'da user_id eksik")
        
        # User ID string olarak kullanılıyor
        result = await session.execute(
            select(User).where(User.id == user_id_str)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("Kullanıcı bulunamadı")
        
        return user
    
    async def reset_password(
        self,
        session: AsyncSession,
        token: str,
        new_password: str,
    ) -> User:
        """Token ile kullanıcı şifresini sıfırla."""
        user = await self.verify_password_reset_token(session, token)
        
        # Şifre güçlülük kontrolü
        if len(new_password) < 8:
            raise ValueError("Şifre en az 8 karakter olmalı")
        
        has_letter = any(c.isalpha() for c in new_password)
        has_digit = any(c.isdigit() for c in new_password)
        
        if not has_letter:
            raise ValueError("Şifre en az bir harf içermeli")
        
        if not has_digit:
            raise ValueError("Şifre en az bir rakam içermeli")
        
        user.password_hash = hash_password(new_password)
        user.updated_at = _utc_naive()
        
        # Güvenlik için tüm refresh token'ları sil
        result = await session.execute(
            select(RefreshToken).where(RefreshToken.user_id == user.id)
        )
        tokens = result.scalars().all()
        for token_record in tokens:
            await session.delete(token_record)
        
        await session.commit()
        await session.refresh(user)
        
        return user
    
    async def revoke_refresh_token(
        self,
        session: AsyncSession,
        refresh_token_str: str,
    ) -> None:
        """Refresh token'ı iptal et (logout)."""
        try:
            payload = decode_token(refresh_token_str)
        except Exception as e:
            raise ValueError(f"Geçersiz refresh token: {e}")
        
        user_id_str = payload.get("user_id")
        if not user_id_str:
            raise ValueError("Token'da user_id eksik")
        
        result = await session.execute(
            select(RefreshToken).where(
                RefreshToken.token == refresh_token_str,
                RefreshToken.user_id == user_id_str
            )
        )
        token = result.scalar_one_or_none()
        
        if token:
            await session.delete(token)
            await session.commit()
    
    async def get_user_by_id(
        self,
        session: AsyncSession,
        user_id: str,  # String olarak kullanılıyor
    ) -> Optional[User]:
        """ID ile kullanıcı getir."""
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_email(
        self,
        session: AsyncSession,
        email: str,
    ) -> Optional[User]:
        """Email ile kullanıcı getir."""
        result = await session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
