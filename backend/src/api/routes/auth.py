"""Authentication API routes for KAMPÜS+ Platform.

Endpoints:
- POST /auth/register - Register new user
- POST /auth/login - User login
- POST /auth/refresh - Refresh access token
- POST /auth/logout - User logout
- POST /auth/verify-email - Verify email with token
- POST /auth/resend-verification - Resend verification email
- POST /auth/forgot-password - Request password reset
- POST /auth/reset-password - Reset password with token
"""

import logging
import traceback
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, Dict
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.user import User, UserRole
from src.services.university_service import get_university_service

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.core.config import get_settings
from src.services.auth_service import AuthService
from src.services.email_service import get_email_service
from src.models.user import User

from sqlalchemy import select
from src.models.department import Department

logger = logging.getLogger(__name__)


# Initialize router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Initialize auth service
auth_service = AuthService()
settings = get_settings()


def _refresh_cookie_settings() -> dict:
    is_production = settings.environment == "production"
    return {
        "httponly": True,
        "secure": is_production,
        "samesite": "strict" if is_production else "lax",
        "path": "/api/v1/auth",
    }

# Rate limiting for resend verification (in-memory cache)
# Format: {email: [timestamp1, timestamp2, ...]}
resend_verification_attempts: Dict[str, list] = defaultdict(list)
RESEND_VERIFICATION_LIMIT = 3  # Max 3 attempts
RESEND_VERIFICATION_WINDOW = 3600  # 1 hour in seconds


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class RegisterRequest(BaseModel):
    """Request model for user registration (students only, .edu.tr domains)."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    university: str = Field(..., min_length=2, max_length=255, description="Seçilen üniversitenin adı")
    department_id: str = Field(..., min_length=1, description="Seçilen bölümün UUID'si")
    terms_accepted: bool = Field(..., description="Kullanım koşulları kabul edilmeli")
    
    @field_validator('email')
    @classmethod
    def validate_university_email(cls, v: str) -> str:
        """Sadece .edu.tr kontrolü yapar, kısıtlayıcı listeyi devre dışı bırakır."""
        email_lower = v.lower().strip()
        
        # Genel format kontrolü
        if '@' not in email_lower:
            raise ValueError('Geçersiz email formatı')
        
        # 🎯 TEK KRİTER: .edu.tr ile bitmesi (Tüm Türkiye'yi kapsar)
        if not email_lower.endswith('.edu.tr'):
            raise ValueError('Lütfen geçerli bir üniversite email adresi kullanın (.edu.tr)')
        
        # NOT: settings.allowed_email_domains_list kontrolünü buradan sildik 
        # çünkü artık 205 üniversiteyi de kabul etmek istiyoruz.
        
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength: min 8 karakter, 1 harf, 1 rakam."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        has_letter = any(c.isalpha() for c in v)
        has_digit = any(c.isdigit() for c in v)
        
        if not has_letter:
            raise ValueError('Password must contain at least one letter')
        
        if not has_digit:
            raise ValueError('Password must contain at least one digit')
        
        return v
    
    @field_validator('terms_accepted')
    @classmethod
    def validate_terms_accepted(cls, v: bool) -> bool:
        """Validate that terms are accepted."""
        if not v:
            raise ValueError('You must accept the terms of service')
        return v


class RegisterResponse(BaseModel):
    """Response model for successful registration."""
    success: bool = True
    message: str
    email: str


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str
    remember_me: bool = Field(default=False, description="Beni Hatırla (30 gün refresh token)")


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    role: str
    university: Optional[str]
    university_id: Optional[str] = None      # 🚀 YENİ: Üniversite UUID'si
    department_id: Optional[str] = None
    department: Optional[str] = None         # Yeni: Bölümün ismi (Metin)
    faculty_id: Optional[str] = None         # 🚀 YENİ: Fakülte UUID'si
    grade: Optional[str] = None
    is_verified: bool
    profile_picture_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """Response model for successful login."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshResponse(BaseModel):
    """Response model for token refresh."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class VerifyEmailRequest(BaseModel):
    """Request model for email verification."""
    token: str


class ForgotPasswordRequest(BaseModel):
    """Request model for forgot password."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request model for password reset."""
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength: min 8 karakter, 1 harf, 1 rakam."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        has_letter = any(c.isalpha() for c in v)
        has_digit = any(c.isdigit() for c in v)
        
        if not has_letter:
            raise ValueError('Password must contain at least one letter')
        
        if not has_digit:
            raise ValueError('Password must contain at least one digit')
        
        return v
    
    @field_validator('confirm_password')
    @classmethod
    def validate_confirmation(cls, v: str, info) -> str:
        """Validate password confirmation matches."""
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v


class ResendVerificationRequest(BaseModel):
    """Request model for resending verification email."""
    email: EmailStr


class ErrorResponse(BaseModel):
    """Standard error response format."""
    error: dict


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Validation failed"},
        409: {"model": ErrorResponse, "description": "Conflict - Email already exists"}
    }
)
async def register(
    request: RegisterRequest,
    session: AsyncSession = Depends(get_db)
) -> RegisterResponse:
    """Register new student user with university email."""
    try:
        user = await auth_service.register_user(
            session=session,
            email=request.email,
            password=request.password,
            first_name=request.first_name,
            last_name=request.last_name,
            university=request.university,
            department_id=request.department_id,
            terms_accepted_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        
        verification_token = auth_service.generate_verification_token(user.id)
        email_service = get_email_service()
        email_sent = email_service.send_verification_email(
            to_email=user.email,
            verification_token=verification_token,
            user_name=user.first_name
        )

        if not email_sent:
            logger.error(
                "Doğrulama e-postası gönderilemedi (kullanıcı: %s)",
                user.id,
            )

        return RegisterResponse(
            success=True,
            email=user.email,
            message="Kayıt başarılı. Lütfen email'inizi kontrol edin."
        )
    
    except ValueError as e:
        if "already exists" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "CONFLICT", "message": str(e)}}
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}}
        )
    except Exception as e:
        logger.error("Kayıt hatası", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "Kayıt işlemi başarısız oldu."}}
        )



@router.post(
    "/login",
    response_model=LoginResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized - Invalid credentials"},
        403: {"model": ErrorResponse, "description": "Forbidden - Account inactive"}
    }
)
async def login(
    request: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_db)
) -> LoginResponse:
    """Kullanıcıyı doğrular, JWT token'larını oluşturur ve resmi üniversite adını döner."""
    try:
        # 1. Kullanıcıyı doğrula ve tokenları al
        user, access_token, refresh_token = await auth_service.authenticate_user(
            session=session,
            email=request.email,
            password=request.password,
            remember_me=request.remember_me
        )
        
        # 2. Üniversite servisini çağır ve resmi ismi çöz
        uni_service = get_university_service()
        official_university_name = await uni_service.get_university_from_email(
            user.email, 
            session
        )

        # 3. Refresh Token için Cookie ayarları
        refresh_token_days = (
            auth_service.settings.jwt_refresh_token_expire_days_remember_me 
            if request.remember_me 
            else auth_service.settings.jwt_refresh_token_expire_days
        )
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=refresh_token_days * 24 * 60 * 60,
            **_refresh_cookie_settings(),
        )
        
        # 4. Yanıtı döndür
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=auth_service.settings.jwt_access_token_expire_minutes * 60,
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                username=user.username,
                role=user.role.value,
                # 🚀 Veritabanındaki eski değer yerine servisten gelen resmi isim
                university=official_university_name, 
                university_id=user.university_id,                    # 🚀 YENİ: UUID
                department_id=user.department_id,
                # İlişki üzerinden bölüm ismini al
                department=user.department_rel.name if user.department_rel else "Bölüm Bilgisi Yok",
                faculty_id=user.department_rel.faculty_id if user.department_rel else None,  # 🚀 YENİ: Faculty UUID
                is_verified=user.is_verified,
                profile_picture_url=user.profile_picture_url,
                created_at=user.created_at
            )
        )
    
    except ValueError as e:
        error_msg = str(e).lower()
        if "email_not_verified" in error_msg or "not verified" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "EMAIL_NOT_VERIFIED",
                        "message": "Email adresiniz doğrulanmamış. Lütfen email'inizi kontrol edin.",
                        "email": request.email
                    }
                }
            )
        if "account_inactive" in error_msg or "inactive" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "ACCOUNT_INACTIVE", "message": "Hesabınız devre dışı bırakılmış."}}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Email veya şifre hatalı."}}
        )
    except Exception as e:
        logger.error("Giriş hatası", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "Giriş işlemi başarısız oldu."}}
        )

@router.get(
    "/reset-password/validate",
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Geçersiz veya süresi dolmuş token"},
        500: {"model": ErrorResponse, "description": "Sunucu hatası"}
    }
)
async def validate_reset_token(
    token: str,
    session: AsyncSession = Depends(get_db)
):
    """
    Şifre sıfırlama linkine tıklandığında token'ın hala geçerli olup olmadığını kontrol eder.
    Frontend'deki ResetPasswordPage mount edildiğinde bu endpoint'i çağırır.
    """
    try:
        # AuthService içindeki mevcut doğrulama mantığını kullanıyoruz.
        # Bu metod token'ı decode eder, rolünü kontrol eder ve kullanıcıyı DB'den çeker.
        await auth_service.verify_password_reset_token(session=session, token=token)
        
        return {
            "success": True, 
            "message": "Token geçerli. Lütfen yeni şifrenizi belirleyin."
        }
        
    except ValueError as e:
        # Token geçersizse, süresi dolmuşsa veya kullanıcı bulunamadıysa burası çalışır.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_TOKEN", 
                    "message": str(e)
                }
            }
        )
    except Exception as e:
        # Beklenmedik sistem hataları için log tutulur.
        logger.error("Şifre sıfırlama token doğrulama hatası", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR", 
                    "message": "İşlem sırasında bir hata oluştu."
                }
            }
        )
    

@router.post(
    "/admin/login", 
    response_model=LoginResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Hatalı kimlik bilgileri"},
        403: {"model": ErrorResponse, "description": "Erişim reddedildi - Admin veya Üniversite Admin yetkisi gerekli"}
    }
)
async def admin_login(
    request: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_db)
) -> LoginResponse:
    """Admin ve university_admin rolüne sahip kullanıcıların giriş yapmasını sağlar."""
    try:
        # 1. Normal kimlik doğrulama (Email/Şifre)
        user, access_token, refresh_token = await auth_service.authenticate_user(
            session=session,
            email=request.email,
            password=request.password,
            remember_me=request.remember_me
        )
        
        # 2. KRİTİK: Admin portalı rol kontrolü
        if user.role not in (UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN):
            logger.warning(f"Yetkisiz admin giriş denemesi: {user.email} (role={user.role})") # Audit Log
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "ACCESS_DENIED",
                        "message": "Access denied. Admin or university admin credentials required." #
                    }
                }
            )

        # 3. Üniversite servisini çağır ve resmi ismi çöz
        uni_service = get_university_service()
        official_university_name = await uni_service.get_university_from_email(
            user.email, 
            session
        )

        # 4. Refresh Token için Cookie ayarları
        refresh_token_days = (
            auth_service.settings.jwt_refresh_token_expire_days_remember_me 
            if request.remember_me 
            else auth_service.settings.jwt_refresh_token_expire_days
        )
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=refresh_token_days * 24 * 60 * 60,
            **_refresh_cookie_settings(),
        )

        # 5. Başarılı yanıtı döndür
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=auth_service.settings.jwt_access_token_expire_minutes * 60,
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role.value,
                university=official_university_name,
                department_id=user.department_id,
                department=user.department_rel.name if user.department_rel else "Bölüm Bilgisi Yok",
                is_verified=user.is_verified,
                profile_picture_url=user.profile_picture_url,
                created_at=user.created_at
            )
        )

    except ValueError as e:
        error_msg = str(e).lower()
        if "email_not_verified" in error_msg or "not verified" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "EMAIL_NOT_VERIFIED",
                        "message": "Email adresiniz doğrulanmamış. Lütfen email'inizi kontrol edin.",
                        "email": request.email,
                    }
                },
            )
        if "account_inactive" in error_msg or "inactive" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "ACCOUNT_INACTIVE", "message": "Hesabınız devre dışı bırakılmış."}}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Email veya şifre hatalı."}}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin giriş hatası", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "Giriş işlemi başarısız oldu."}}
        )

@router.post(
    "/refresh",
    response_model=RefreshResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized - Invalid or missing refresh token"}
    }
)
async def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    session: AsyncSession = Depends(get_db)
) -> RefreshResponse:
    """Refresh access token using refresh token from cookie.
    
    Validates refresh token and issues new access token.
    Also rotates refresh token for security.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Refresh token not found"
                }
            }
        )
    
    try:
        # Refresh tokens
        new_access_token, new_refresh_token = await auth_service.refresh_access_token(
            session=session,
            refresh_token_str=refresh_token
        )
        
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            max_age=auth_service.settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
            **_refresh_cookie_settings(),
        )
        
        return RefreshResponse(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=auth_service.settings.jwt_access_token_expire_minutes * 60
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": str(e)}}
        )
    except Exception as e:
        logger.error("Token yenileme hatası", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "Token yenileme başarısız oldu."}}
        )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized - Invalid token"}
    }
)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Logout user by revoking refresh token and clearing cookie."""
    try:
        if refresh_token:
            await auth_service.revoke_refresh_token(session=session, refresh_token_str=refresh_token)
        
        response.delete_cookie(key="refresh_token", path="/api/v1/auth")
        return
    
    except Exception as e:
        logger.error("Çıkış hatası", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "Çıkış işlemi başarısız oldu."}}
        )


@router.post(
    "/verify-email",
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Invalid or expired token"}
    }
)
async def verify_email(
    request: VerifyEmailRequest,
    session: AsyncSession = Depends(get_db)
):
    """Verify user's email address using verification token."""
    try:
        await auth_service.verify_email(session=session, verification_token=request.token)
        return {
            "success": True,
            "message": "Email başarıyla doğrulandı. Giriş yapabilirsiniz.",
            "redirect_url": "/login"
        }
    
    except ValueError as e:
        error_msg = str(e).lower()
        # 💡 BURAYI GÜNCELLEDİK: Zaten doğrulanmışsa 409 fırlatmak yerine BAŞARI dönüyoruz.
        # Bu sayede frontend'deki 'catch' bloğuna düşmez ve yeşil onay ekranı görünür.
        if "already verified" in error_msg:
            return {
                "success": True,
                "message": "Hesabınız zaten onaylanmış. Giriş sayfasına yönlendiriliyorsunuz.",
                "redirect_url": "/login"
            }
            
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Doğrulama linki geçersiz veya süresi dolmuş."}}
        )
    except Exception as e:
        logger.error("E-posta doğrulama hatası", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "Email doğrulama başarısız oldu."}}
        )


@router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - User not found or already verified"},
        429: {"model": ErrorResponse, "description": "Too Many Requests - Rate limit exceeded"}
    }
)
async def resend_verification(
    request: ResendVerificationRequest,
    session: AsyncSession = Depends(get_db)
):
    """Resend verification email to user. Rate limited to 3 attempts per hour per email."""
    now = datetime.now(timezone.utc)
    email_lower = request.email.lower()
    
    resend_verification_attempts[email_lower] = [
        ts for ts in resend_verification_attempts[email_lower]
        if (now - ts).total_seconds() < RESEND_VERIFICATION_WINDOW
    ]
    
    if len(resend_verification_attempts[email_lower]) >= RESEND_VERIFICATION_LIMIT:
        oldest_attempt = min(resend_verification_attempts[email_lower])
        retry_after = int(RESEND_VERIFICATION_WINDOW - (now - oldest_attempt).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Çok fazla deneme yaptınız. Lütfen {retry_after} saniye sonra tekrar deneyin.",
                    "retry_after": retry_after
                }
            }
        )
    
    user = await auth_service.get_user_by_email(session=session, email=request.email)
    
    if not user or user.is_verified:
        return {
            "success": True,
            "message": "Eğer email adresiniz kayıtlı ve doğrulanmamışsa, size yeni bir doğrulama linki gönderildi."
        }
    
    try:
        verification_token = auth_service.generate_verification_token(user.id)
        email_service = get_email_service()
        email_service.send_verification_email(
            to_email=user.email,
            verification_token=verification_token,
            user_name=user.first_name
        )
        resend_verification_attempts[email_lower].append(now)
        return {
            "success": True,
            "message": "Doğrulama email'i tekrar gönderildi. Lütfen email'inizi kontrol edin."
        }
    except Exception as e:
        logger.error("Doğrulama e-postası yeniden gönderme hatası", exc_info=True)
        return {
            "success": True,
            "message": "Eğer email adresiniz kayıtlı ve doğrulanmamışsa, size yeni bir doğrulama linki gönderildi."
        }


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK
)
async def forgot_password(
    request: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_db)
):
    """Şifre sıfırlama maili isteği. Güvenlik için her zaman 200 döner."""
    try:
        user = await auth_service.get_user_by_email(session=session, email=request.email)
        
        if user:
            # 💡 DÜZELTME: user.email yerine user.id gönderilmeli
            # Backend bu ID'yi token içine gömer ve doğrularken bu ID ile DB'den kullanıcıyı çeker.
            reset_token = auth_service.create_password_reset_token(user.id)
            
            email_service = get_email_service()
            email_service.send_password_reset_email(
                to_email=user.email,
                reset_token=reset_token,
                user_name=user.first_name
            )
        
        return {
            "success": True,
            "message": "Eğer email adresiniz kayıtlıysa, şifre sıfırlama linki gönderildi."
        }
    
    except Exception as e:
        logger.error("Şifre sıfırlama isteği hatası", exc_info=True)
        return {
            "success": True,
            "message": "Eğer email adresiniz kayıtlıysa, şifre sıfırlama linki gönderildi."
        }


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Invalid or expired token"}
    }
)
async def reset_password(
    request: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db)
):
    """Reset password using reset token."""
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "PASSWORD_MISMATCH", "message": "Şifreler eşleşmiyor."}}
        )
    
    try:
        await auth_service.reset_password(
            session=session,
            token=request.token,
            new_password=request.new_password
        )
        return {
            "success": True,
            "message": "Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz.",
            "redirect_url": "/login"
        }
    
    except ValueError as e:
        error_msg = str(e).lower()
        if "password must be" in error_msg or "password must contain" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "WEAK_PASSWORD", "message": str(e)}}
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Şifre sıfırlama linki geçersiz veya süresi dolmuş."}}
        )
    except Exception as e:
        logger.error(f"Reset password error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "Şifre sıfırlanırken bir hata oluştu."}}
        )


from src.services.university_service import get_university_service # 1. Servisi import et

@router.get(
    "/me",
    response_model=UserResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized - Invalid token"}
    }
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Mevcut kullanıcının bilgilerini ve resmi üniversite adını getirir."""
    
    # 2. Servisi çağır
    uni_service = get_university_service()
    
    # 3. İlişkili verileri (Department) yükle
    stmt = (
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.department_rel))
    )
    result = await session.execute(stmt)
    user = result.scalar_one()

    # 4. Üniversite ismini email üzerinden resmi veritabanından çöz
    official_university_name = await uni_service.get_university_from_email(
        user.email, 
        session
    )

    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        role=user.role.value,
        university=official_university_name,
        department_id=user.department_id,
        department=user.department_rel.name if user.department_rel else "Bölüm Bilgisi Yok",
        grade=user.grade,
        is_verified=user.is_verified,
        profile_picture_url=user.profile_picture_url,
        created_at=user.created_at,
    )


@router.get("/departments", response_model=list[dict])
async def get_departments(session: AsyncSession = Depends(get_db)):
    """Kayıt formundaki dropdown için bölümleri listeler."""
    result = await session.execute(select(Department).order_by(Department.name))
    departments = result.scalars().all()
    return [{"id": d.id, "name": d.name} for d in departments]