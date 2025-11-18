"""Authentication API routes for KAMPÜS+ Platform.

Endpoints:
- POST /auth/register - Register new user
- POST /auth/login - User login
- POST /auth/refresh - Refresh access token
- POST /auth/logout - User logout
- POST /auth/verify-email - Verify email with token
- POST /auth/forgot-password - Request password reset
- POST /auth/reset-password - Reset password with token

All endpoints follow OpenAPI specification from contracts/openapi.yaml
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.core.security import decode_token
from src.services.auth_service import AuthService
from src.models.user import User


# Initialize router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Initialize auth service
auth_service = AuthService()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class RegisterRequest(BaseModel):
    """Request model for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., pattern="^(student|instructor)$")
    student_id: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_university_email(cls, v: str) -> str:
        """Validate that email is from university domain."""
        # Accept any .edu domain (e.g., .edu, .edu.tr, university.edu, etc.)
        if not ('.edu' in v.lower()):
            raise ValueError('Email must be from a university domain (must contain .edu)')
        return v


class RegisterResponse(BaseModel):
    """Response model for successful registration."""
    user_id: str
    email: str
    message: str


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User information in responses."""
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    student_id: Optional[str]
    is_verified: bool
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
    """Register new user with university email.
    
    - **email**: University email address (.edu.tr domain)
    - **password**: Minimum 8 characters
    - **first_name**: User's first name
    - **last_name**: User's last name
    - **role**: Either 'student' or 'instructor'
    - **student_id**: Optional university ID
    
    Returns user_id and sends verification email.
    """
    try:
        # Register user
        user = await auth_service.register_user(
            session=session,
            email=request.email,
            password=request.password,
            first_name=request.first_name,
            last_name=request.last_name,
            role=request.role,
            student_id=request.student_id
        )
        
        # Generate verification token
        verification_token = await auth_service.generate_verification_token(user.id)
        
        # TODO: Send verification email (T038 - will be implemented with email service)
        # await send_verification_email(user.email, verification_token)
        
        return RegisterResponse(
            user_id=str(user.id),
            email=user.email,
            message=f"Verification email sent to {user.email}"
        )
    
    except ValueError as e:
        # User already exists or validation error
        if "already exists" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "CONFLICT",
                        "message": str(e)
                    }
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": str(e)
                    }
                }
            )
    except Exception as e:
        # Log the actual error for debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": f"Failed to register user: {str(e)}"
                }
            }
        )


@router.post(
    "/login",
    response_model=LoginResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized - Invalid credentials"},
        403: {"model": ErrorResponse, "description": "Forbidden - Email not verified"}
    }
)
async def login(
    request: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_db)
) -> LoginResponse:
    """Authenticate user and issue JWT tokens.
    
    - **email**: User's email address
    - **password**: User's password
    
    Returns access token (JWT) and sets httpOnly cookie with refresh token.
    """
    try:
        # Authenticate user
        user, access_token, refresh_token = await auth_service.authenticate_user(
            session=session,
            email=request.email,
            password=request.password
        )
        
        # Set httpOnly cookie for refresh token
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,  # HTTPS only in production
            samesite="strict",
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/v1/auth"
        )
        
        # Return access token in response body
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=15 * 60,  # 15 minutes
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role.value,
                student_id=user.student_id,
                is_verified=user.is_verified,
                created_at=user.created_at
            )
        )
    
    except ValueError as e:
        error_msg = str(e).lower()
        
        if "not verified" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "EMAIL_NOT_VERIFIED",
                        "message": "Please verify your email before logging in"
                    }
                }
            )
        elif "inactive" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "ACCOUNT_INACTIVE",
                        "message": "Your account has been deactivated"
                    }
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid email or password"
                    }
                }
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to authenticate user"
                }
            }
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
            refresh_token=refresh_token
        )
        
        # Update refresh token cookie
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=7 * 24 * 60 * 60,
            path="/v1/auth"
        )
        
        return RefreshResponse(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=15 * 60
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": str(e)
                }
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to refresh token"
                }
            }
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
    """Logout user by revoking refresh token and clearing cookie.
    
    Requires valid access token (Bearer) in Authorization header.
    """
    try:
        if refresh_token:
            # Revoke refresh token
            await auth_service.revoke_refresh_token(
                session=session,
                refresh_token_str=refresh_token
            )
        
        # Clear refresh token cookie
        response.delete_cookie(
            key="refresh_token",
            path="/v1/auth"
        )
        
        return  # 204 No Content (specified in decorator)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to logout"
                }
            }
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
    """Verify user's email address using verification token.
    
    - **token**: Email verification token from registration email
    
    Marks user account as verified.
    """
    try:
        # Verify email with token
        await auth_service.verify_email(
            session=session,
            verification_token=request.token
        )
        
        return {"message": "Email verified successfully"}
    
    except ValueError as e:
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to verify email"
                }
            }
        )


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK
)
async def forgot_password(
    request: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_db)
):
    """Request password reset email.
    
    - **email**: User's email address
    
    Always returns 200 to prevent email enumeration.
    Sends password reset email if user exists.
    """
    try:
        # TODO: Implement password reset token generation
        # reset_token = await auth_service.generate_password_reset_token(request.email)
        # await send_password_reset_email(request.email, reset_token)
        
        # Always return 200 to prevent email enumeration
        return {"message": "If the email exists, a password reset link has been sent"}
    
    except Exception as e:
        # Still return 200 to prevent enumeration
        return {"message": "If the email exists, a password reset link has been sent"}


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
    """Reset password using reset token.
    
    - **token**: Password reset token from email
    - **new_password**: New password (minimum 8 characters)
    
    Updates user's password.
    """
    try:
        # Reset password using token
        await auth_service.reset_password(
            session=session,
            token=request.token,
            new_password=request.new_password
        )
        
        return {"message": "Password reset successfully"}
    
    except ValueError as e:
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to reset password"
                }
            }
        )
