from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.database import get_db
from src.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/profile/{username}")
async def get_user_profile(username: str, session: AsyncSession = Depends(get_db)):
    # Kullanıcıyı kullanıcı adına göre, bölüm bilgisiyle birlikte getiriyoruz
    stmt = (
        select(User)
        .where(User.username == username)
        .options(selectinload(User.department_rel))
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "university": user.university,
        "department": user.department_rel.name if user.department_rel else "Belirtilmemiş",
        "profile_picture_url": user.profile_picture_url,
        "bio": user.bio,
        "created_at": user.created_at
    }