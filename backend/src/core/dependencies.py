"""FastAPI dependency injection providers.

Provides shared dependencies for:
- Database sessions
- Current user authentication
- Role-based access control
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import decode_token
from src.models.user import User, UserRole


# Bearer token authentication scheme (auto_error=False to manually handle missing token)
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> User:
    """Get currently authenticated user from JWT token.
    
    Args:
        credentials: Bearer token from Authorization header (optional to allow 401 response)
        session: Database session
        
    Returns:
        User: Authenticated user object
        
    Raises:
        HTTPException: 401 if token invalid or user not found
    """
    # Check if credentials are provided
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Missing authentication token"
                }
            },
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        # Decode JWT token
        token = credentials.credentials
        payload = decode_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid or expired token"
                    }
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Extract user_id from payload
        user_id_str: Optional[str] = payload.get("user_id")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid token payload"
                    }
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Convert string UUID to UUID object
        try:
            from uuid import UUID
            user_id = UUID(user_id_str)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid user ID format"
                    }
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Get user from database
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "User not found"
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
                        "message": "User account is inactive"
                    }
                }
            )
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Could not validate credentials"
                }
            },
            headers={"WWW-Authenticate": "Bearer"}
        )


def require_role(*allowed_roles: UserRole):
    """Create dependency that requires user to have specific role.
    
    Usage:
        @router.get("/admin", dependencies=[Depends(require_role(UserRole.ADMIN))])
        
    Args:
        *allowed_roles: One or more UserRole values
        
    Returns:
        Dependency function
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": f"This endpoint requires role: {', '.join(r.value for r in allowed_roles)}"
                    }
                }
            )
        return current_user
    
    return role_checker


def require_verified_email(current_user: User = Depends(get_current_user)) -> User:
    """Require user to have verified email.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Same user if verified
        
    Raises:
        HTTPException: 403 if email not verified
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "EMAIL_NOT_VERIFIED",
                    "message": "Please verify your email before accessing this resource"
                }
            }
        )
    return current_user
