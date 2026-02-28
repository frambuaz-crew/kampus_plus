from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.models.favorite import UserFavorite
from src.models.forum import ForumTopic
from src.models.marketplace import MarketplaceListing
from src.models.career import CareerListing
from src.models.academic import AcademicContribution
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy import desc
import os
import uuid
from fastapi import File, UploadFile

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


class ProfileUpdateRequest(BaseModel):
    bio: Optional[str] = None
    profile_picture_url: Optional[str] = None
    theme_preference: Optional[str] = None

@router.put("/profile")
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Kullanıcının kendi profilini güncellemesi."""
    if data.bio is not None:
        current_user.bio = data.bio
    if data.profile_picture_url is not None:
        current_user.profile_picture_url = data.profile_picture_url
    if data.theme_preference is not None:
        current_user.theme_preference = data.theme_preference

    session.add(current_user)
    await session.commit()
    return {"success": True, "message": "Profil güncellendi."}

@router.post("/profile/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    upload_dir = "static/uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    image_url = f"/static/uploads/avatars/{unique_filename}"
    current_user.profile_picture_url = image_url

    session.add(current_user)
    await session.commit()

    return {"success": True, "profile_picture_url": image_url}

@router.get("/{username}/activity")
async def get_user_activity(username: str, session: AsyncSession = Depends(get_db)):
    """Kullanıcının yaptığı tüm paylaşımları (Forum, Pazar vs.) getirir."""
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    activities = []

    # Marketplace ilanlarını çek
    market_stmt = select(MarketplaceListing).where(MarketplaceListing.seller_id == user.id).order_by(desc(MarketplaceListing.created_at)).limit(10)
    market_res = await session.execute(market_stmt)
    for listing in market_res.scalars():
        activities.append({
            "type": "marketplace_listing",
            "id": listing.id,
            "title": listing.title,
            "created_at": listing.created_at.isoformat(),
            "status": listing.status
        })

    # Forum konularını çek
    forum_stmt = select(ForumTopic).where(ForumTopic.author_id == user.id).order_by(desc(ForumTopic.created_at)).limit(10)
    forum_res = await session.execute(forum_stmt)
    for topic in forum_res.scalars():
        activities.append({
            "type": "forum_topic",
            "id": topic.id,
            "title": topic.title,
            "created_at": topic.created_at.isoformat(),
            "status": "active" if not topic.is_deleted else "deleted"
        })

    # Career ilanlarını çek
    career_stmt = select(CareerListing).where(CareerListing.posted_by == user.id).order_by(desc(CareerListing.created_at)).limit(10)
    career_res = await session.execute(career_stmt)
    for career in career_res.scalars():
        activities.append({
            "type": "career_listing",
            "id": career.id,
            "title": career.title,
            "created_at": career.created_at.isoformat(),
            "status": career.status
        })

    # Tarihe göre sırala
    activities.sort(key=lambda x: x["created_at"], reverse=True)

    return {"activities": activities}

class FavoriteToggleRequest(BaseModel):
    target_type: str  # "marketplace_listing", "forum_topic", vs.
    target_id: str

@router.post("/favorites/toggle")
async def toggle_favorite(
    data: FavoriteToggleRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Öğeyi favorilere ekler veya çıkarır. (Marketplace'deki Kalp butonu vs. için)"""
    stmt = select(UserFavorite).where(
        UserFavorite.user_id == current_user.id,
        UserFavorite.target_type == data.target_type,
        UserFavorite.target_id == data.target_id
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        await session.delete(existing)
        await session.commit()
        return {"success": True, "action": "removed"}
    else:
        new_fav = UserFavorite(
            user_id=current_user.id,
            target_type=data.target_type,
            target_id=data.target_id
        )
        session.add(new_fav)
        await session.commit()
        return {"success": True, "action": "added"}

@router.get("/favorites/all")
async def get_user_favorites(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Kullanıcının favoriye aldığı tüm öğeleri profilde listelemek için getirir."""
    stmt = select(UserFavorite).where(UserFavorite.user_id == current_user.id).order_by(desc(UserFavorite.created_at))
    result = await session.execute(stmt)
    favorites = result.scalars().all()

    detailed_favorites = []

    for fav in favorites:
        item_data = {
            "favorite_id": fav.id,
            "target_type": fav.target_type,
            "target_id": fav.target_id,
            "favorited_at": fav.created_at.isoformat()
        }

        if fav.target_type == "marketplace_listing":
            lst_stmt = select(MarketplaceListing).where(MarketplaceListing.id == fav.target_id)
            lst_res = await session.execute(lst_stmt)
            listing = lst_res.scalar_one_or_none()
            if listing:
                item_data["title"] = listing.title
                item_data["status"] = listing.status
                item_data["price"] = str(listing.price)
                if listing.image_urls:
                    import json
                    try:
                        images = json.loads(listing.image_urls)
                        item_data["image"] = images[0] if images else None
                    except Exception:
                        item_data["image"] = None
                detailed_favorites.append(item_data)

        elif fav.target_type == "forum_topic":
            top_stmt = select(ForumTopic).where(ForumTopic.id == fav.target_id)
            top_res = await session.execute(top_stmt)
            topic = top_res.scalar_one_or_none()
            if topic and not topic.is_deleted:
                item_data["title"] = topic.title
                detailed_favorites.append(item_data)

        elif fav.target_type == "career_listing":
            car_stmt = select(CareerListing).where(CareerListing.id == fav.target_id)
            car_res = await session.execute(car_stmt)
            career = car_res.scalar_one_or_none()
            if career:
                item_data["title"] = career.title
                item_data["status"] = career.status
                detailed_favorites.append(item_data)

    return {"favorites": detailed_favorites}
