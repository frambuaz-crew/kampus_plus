"""FastAPI bağımlılıkları - Kimlik doğrulama ve yetkilendirme.

Bu modül şunları sağlar:
- Mevcut kullanıcı kimlik doğrulaması
- Rol tabanlı erişim kontrolü
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import decode_token
from src.models.user import User, UserRole
from sqlalchemy.orm import selectinload # ⬅️ Bunu ekliyoruz

# Bearer token kimlik doğrulama şeması
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> User:
    """JWT token'dan mevcut kimlik doğrulanmış kullanıcıyı al."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Kimlik doğrulama token'ı eksik"
                }
            },
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Geçersiz veya süresi dolmuş token"
                    }
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        user_id_str: Optional[str] = payload.get("user_id")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Geçersiz token payload"
                    }
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # User ID string olarak kullanılıyor (UUID değil)
        stmt = select(User).where(User.id == user_id_str).options(selectinload(User.department_rel))
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Kullanıcı bulunamadı"
                    }
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Kullanıcı hesabı aktif değil"
                    }
                }
            )
        
        return user
    
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Kimlik bilgileri doğrulanamadı"
                }
            },
            headers={"WWW-Authenticate": "Bearer"}
        )


def require_role(*allowed_roles: UserRole):
    """Kullanıcının belirli role sahip olmasını gerektiren dependency oluştur."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": f"Bu endpoint şu rolü gerektirir: {', '.join(r.value for r in allowed_roles)}"
                    }
                }
            )
        return current_user
    
    return role_checker


async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Admin rolü gerektiren dependency."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Admin erişimi gerekli"
                }
            }
        )
    return current_user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    session: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Token sağlanmışsa mevcut kullanıcıyı al, aksi halde None döndür."""
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials, session)
    except HTTPException:
        return None


def require_verified_email(current_user: User = Depends(get_current_user)) -> User:
    """Kullanıcının doğrulanmış email'e sahip olmasını gerektir."""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "EMAIL_NOT_VERIFIED",
                    "message": "Bu kaynağa erişmeden önce lütfen email'inizi doğrulayın"
                }
            }
        )
    return current_user


def require_self_or_admin(user_id_param: str = "user_id"):
    """Kendisi veya admin erişim kontrolü için dependency factory."""
    async def checker(
        target_user_id: str,  # String olarak kullanılıyor
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.id != target_user_id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Erişim reddedildi. Sadece kendi kaynaklarınıza erişebilirsiniz."
                    }
                }
            )
        return current_user
    
    return checker
