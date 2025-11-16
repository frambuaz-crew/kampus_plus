"""FastAPI dependencies for authentication and authorization.

This module provides:
- JWT token extraction and validation from request headers
- Current user retrieval from database
- Role-based access control (RBAC) decorators
- Dependency injection for protected endpoints

All dependencies use Bearer token authentication.
"""

from typing import Optional, List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import decode_token, extract_user_id_from_token
from src.models.user import User, UserRole


# Bearer token security scheme
security = HTTPBearer()


# ============================================================================
# CURRENT USER DEPENDENCY
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token.
    
    Extracts JWT from Authorization header, validates signature,
    checks expiration, and loads user from database.
    
    Args:
        credentials: HTTP Bearer token from Authorization header.
        session: Database session.
    
    Returns:
        User instance if token is valid and user exists.
    
    Raises:
        HTTPException 401: If token is invalid, expired, or user not found.
        HTTPException 403: If user account is deactivated.
    
    Usage:
        ```python
        @router.get("/me")
        async def get_profile(current_user: User = Depends(get_current_user)):
            return {"email": current_user.email}
        ```
    """
    token = credentials.credentials
    
    try:
        # Decode and validate JWT
        payload = decode_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token type is "access"
    token_type = payload.get("type")
    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user_id
    try:
        user_id = extract_user_id_from_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid user_id in token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Load user from database
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    return user


# ============================================================================
# ROLE-BASED ACCESS CONTROL (RBAC)
# ============================================================================

def require_role(allowed_roles: List[str]):
    """Dependency factory for role-based access control.
    
    Creates a dependency that checks if current user has one of the allowed roles.
    
    Args:
        allowed_roles: List of role strings (e.g., ["admin", "instructor"]).
    
    Returns:
        FastAPI dependency function.
    
    Raises:
        HTTPException 403: If user does not have required role.
    
    Usage:
        ```python
        @router.get("/admin/users")
        async def list_users(
            current_user: User = Depends(require_role(["admin"]))
        ):
            return {"users": [...]}
        
        @router.post("/courses")
        async def create_course(
            current_user: User = Depends(require_role(["admin", "instructor"]))
        ):
            return {"course_id": "..."}
        ```
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Check if current user has required role."""
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {' or '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker


# ============================================================================
# ADMIN-ONLY DEPENDENCY
# ============================================================================

async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency that requires admin role.
    
    Convenience wrapper for require_role(["admin"]).
    
    Usage:
        ```python
        @router.delete("/users/{user_id}")
        async def delete_user(
            user_id: UUID,
            current_user: User = Depends(require_admin)
        ):
            # Only admins can delete users
            pass
        ```
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ============================================================================
# INSTRUCTOR OR ADMIN DEPENDENCY
# ============================================================================

async def require_instructor_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency that requires instructor or admin role.
    
    Convenience wrapper for require_role(["instructor", "admin"]).
    
    Usage:
        ```python
        @router.post("/materials")
        async def upload_material(
            current_user: User = Depends(require_instructor_or_admin)
        ):
            # Only instructors and admins can upload materials
            pass
        ```
    """
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor or admin access required"
        )
    return current_user


# ============================================================================
# OPTIONAL AUTHENTICATION
# ============================================================================

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    session: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Get current user if token is provided, otherwise return None.
    
    Useful for endpoints that have different behavior for authenticated
    vs anonymous users (e.g., public content with personalized features).
    
    Args:
        credentials: Optional HTTP Bearer token.
        session: Database session.
    
    Returns:
        User instance if token is valid, None if no token provided.
    
    Usage:
        ```python
        @router.get("/materials")
        async def list_materials(
            current_user: Optional[User] = Depends(get_current_user_optional)
        ):
            if current_user:
                # Show personalized materials
                return {"materials": get_user_materials(current_user.id)}
            else:
                # Show public materials only
                return {"materials": get_public_materials()}
        ```
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials, session)
    except HTTPException:
        # Invalid token = treat as anonymous
        return None


# ============================================================================
# EMAIL VERIFICATION DEPENDENCY
# ============================================================================

async def require_verified_email(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency that requires verified email.
    
    Some actions (like uploading materials) may require email verification
    for security and accountability.
    
    Usage:
        ```python
        @router.post("/questions")
        async def ask_question(
            current_user: User = Depends(require_verified_email)
        ):
            # Only verified users can ask questions
            pass
        ```
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Check your inbox for verification link."
        )
    return current_user


# ============================================================================
# SELF OR ADMIN DEPENDENCY
# ============================================================================

def require_self_or_admin(user_id_param: str = "user_id"):
    """Dependency factory for self-or-admin access control.
    
    Allows users to access their own resources, or admins to access any resource.
    
    Args:
        user_id_param: Name of path parameter containing target user_id.
    
    Returns:
        FastAPI dependency function.
    
    Usage:
        ```python
        @router.get("/users/{user_id}/profile")
        async def get_profile(
            user_id: UUID,
            current_user: User = Depends(require_self_or_admin())
        ):
            # Users can view their own profile, admins can view any profile
            return {"profile": ...}
        ```
    """
    async def checker(
        target_user_id: UUID,
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Check if user is accessing their own resource or is admin."""
        if current_user.id != target_user_id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only access your own resources."
            )
        return current_user
    
    return checker
