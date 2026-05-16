from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.database import get_db
from src.core.dependencies import get_current_user, require_admin
from src.models.user import User, UserRole
from src.models.favorite import UserFavorite
from src.models.forum import ForumTopic
from src.models.marketplace import MarketplaceListing
from src.models.career import CareerListing
from src.models.academic import AcademicContribution
from src.core.security import hash_password, verify_password
from src.schemas.user import (
    AdminUserItem,
    AdminUserListResponse,
    AdminUserStats,
    UserBlockRequest,
    UserVerifyRequest,
    UserRoleUpdateRequest,
)
from typing import Optional, List
from pydantic import BaseModel, Field
from sqlalchemy import desc
import os
import uuid
from fastapi import File, UploadFile

router = APIRouter(prefix="/users", tags=["Users"])

# Users with this role are invisible to and unmanageable by the admin panel.
_PROTECTED_ROLE = UserRole.ADMIN

@router.get("/profile/{username}")
async def get_user_profile(
    username: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
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

    is_allowed = not user.is_private or current_user.id == user.id or current_user.university_id == user.university_id

    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "university": user.university,
        "university_id": user.university_id,
        "department": user.department_rel.name if user.department_rel else "Belirtilmemiş",
        "grade": user.grade,
        "profile_picture_url": user.profile_picture_url,
        "bio": user.bio if is_allowed else None,
        "is_private": user.is_private,
        "created_at": user.created_at
    }


VALID_GRADES = {
    "Hazırlık", "1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf",
    "5. Sınıf", "Yüksek Lisans", "Doktora"
}

class ProfileUpdateRequest(BaseModel):
    bio: Optional[str] = None
    theme_preference: Optional[str] = None
    grade: Optional[str] = None
    university: Optional[str] = None
    university_id: Optional[str] = None
    department_id: Optional[str] = None
    is_private: Optional[bool] = None

@router.put("/profile")
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Kullanıcının kendi profilini güncellemesi."""
    if data.bio is not None:
        current_user.bio = data.bio
    if data.theme_preference is not None:
        current_user.theme_preference = data.theme_preference
    if data.grade is not None:
        if data.grade != "" and data.grade not in VALID_GRADES:
            raise HTTPException(status_code=422, detail="Geçersiz sınıf değeri.")
        current_user.grade = data.grade if data.grade != "" else None
    if data.university:
        current_user.university = data.university
    if data.university_id:
        current_user.university_id = data.university_id
    if data.department_id:
        current_user.department_id = data.department_id
    if data.is_private is not None:
        current_user.is_private = data.is_private

    session.add(current_user)
    await session.commit()
    return {"success": True, "message": "Profil güncellendi."}

@router.post("/profile/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    upload_dir = "uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    image_url = f"/uploads/avatars/{unique_filename}"
    current_user.profile_picture_url = image_url

    session.add(current_user)
    await session.commit()

    return {"success": True, "profile_picture_url": image_url}

@router.get("/admin/stats", response_model=AdminUserStats)
async def get_admin_user_stats(
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminUserStats:
    """Toplam, doğrulanmış, doğrulanmamış ve engelli kullanıcı sayılarını döndürür."""
    base = and_(User.is_deleted == False, User.role != _PROTECTED_ROLE)
    if admin.role == UserRole.UNIVERSITY_ADMIN:
        base = and_(base, User.university_id == admin.university_id)

    total = await session.scalar(select(func.count(User.id)).where(base))
    verified = await session.scalar(
        select(func.count(User.id)).where(and_(base, User.is_verified == True))
    )
    blocked = await session.scalar(
        select(func.count(User.id)).where(and_(base, User.is_active == False))
    )
    unverified = await session.scalar(
        select(func.count(User.id)).where(
            and_(base, User.is_verified == False, User.is_active == True)
        )
    )

    return AdminUserStats(
        total=total or 0,
        verified=verified or 0,
        unverified=unverified or 0,
        blocked=blocked or 0,
    )


@router.get("/admin/list", response_model=AdminUserListResponse)
async def get_admin_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("all"),
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminUserListResponse:
    """Tüm kullanıcıları sayfalanmış, filtrelenmiş ve aranmış şekilde listeler."""
    stmt = (
        select(User)
        .options(selectinload(User.department_rel))
        .where(User.is_deleted == False, User.role != _PROTECTED_ROLE)
    )
    if admin.role == UserRole.UNIVERSITY_ADMIN:
        stmt = stmt.where(User.university_id == admin.university_id)

    if status == "verified":
        stmt = stmt.where(User.is_verified == True)
    elif status == "blocked":
        stmt = stmt.where(User.is_active == False)
    elif status == "unverified":
        stmt = stmt.where(and_(User.is_verified == False, User.is_active == True))

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                User.username.ilike(term),
                User.email.ilike(term),
                User.first_name.ilike(term),
                User.last_name.ilike(term),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await session.scalar(count_stmt) or 0

    stmt = stmt.order_by(desc(User.created_at)).offset((page - 1) * limit).limit(limit)
    result = await session.execute(stmt)
    users = result.scalars().all()

    return AdminUserListResponse(
        users=[
            AdminUserItem(
                id=u.id,
                email=u.email,
                username=u.username,
                first_name=u.first_name,
                last_name=u.last_name,
                role=u.role.value if hasattr(u.role, "value") else u.role,
                is_verified=u.is_verified,
                is_active=u.is_active,
                university=u.university,
                department=u.department_rel.name if u.department_rel else None,
                grade=u.grade,
                profile_picture_url=u.profile_picture_url,
                created_at=u.created_at,
                last_login=u.last_login,
            )
            for u in users
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/admin/{user_id}", response_model=AdminUserItem)
async def get_admin_user_detail(
    user_id: str,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminUserItem:
    """Tek bir kullanıcının detay bilgilerini döndürür."""
    result = await session.execute(
        select(User)
        .options(selectinload(User.department_rel))
        .where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if admin.role == UserRole.UNIVERSITY_ADMIN and user.university_id != admin.university_id:
        raise HTTPException(status_code=403, detail="Bu kullanıcıya erişim izniniz yok.")

    return AdminUserItem(
        id=user.id,
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        is_verified=user.is_verified,
        is_active=user.is_active,
        university=user.university,
        department=user.department_rel.name if user.department_rel else None,
        grade=user.grade,
        profile_picture_url=user.profile_picture_url,
        created_at=user.created_at,
        last_login=user.last_login,
    )


@router.patch("/admin/{user_id}/block")
async def toggle_user_block(
    user_id: str,
    data: UserBlockRequest,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Kullanıcı hesabını engeller veya engeli kaldırır (is_active)."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı engelleyemezsiniz.")

    result = await session.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    if admin.role == UserRole.UNIVERSITY_ADMIN and user.university_id != admin.university_id:
        raise HTTPException(status_code=403, detail="Bu kullanıcıyı yönetme izniniz yok.")

    if user.role == _PROTECTED_ROLE:
        raise HTTPException(status_code=403, detail="Bu kullanıcının hesabı yönetilemez.")

    user.is_active = not data.block
    session.add(user)
    await session.commit()
    return {"success": True, "is_active": user.is_active}


@router.patch("/admin/{user_id}/verify")
async def toggle_user_verification(
    user_id: str,
    data: UserVerifyRequest,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Kullanıcının e-posta doğrulama durumunu günceller (is_verified)."""
    result = await session.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if admin.role == UserRole.UNIVERSITY_ADMIN and user.university_id != admin.university_id:
        raise HTTPException(status_code=403, detail="Bu kullanıcıyı yönetme izniniz yok.")

    user.is_verified = data.verified
    session.add(user)
    await session.commit()
    return {"success": True, "is_verified": user.is_verified}


@router.patch("/admin/{user_id}/role")
async def change_user_role(
    user_id: str,
    data: UserRoleUpdateRequest,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Kullanıcının rolünü günceller."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Kendi rolünüzü değiştiremezsiniz.")

    if data.role == _PROTECTED_ROLE.value:
        raise HTTPException(status_code=403, detail="Bu rol atanamaz.")

    # university_admin can only assign roles that are not above their own level
    if admin.role == UserRole.UNIVERSITY_ADMIN and data.role == UserRole.UNIVERSITY_ADMIN.value:
        raise HTTPException(status_code=403, detail="Üniversite admini başka bir üniversite admini atayamaz.")

    valid_roles = {r.value for r in UserRole if r != _PROTECTED_ROLE}
    if data.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz rol. Geçerli roller: {', '.join(valid_roles)}",
        )

    result = await session.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    if admin.role == UserRole.UNIVERSITY_ADMIN and user.university_id != admin.university_id:
        raise HTTPException(status_code=403, detail="Sadece kendi üniversitenizin kullanıcılarının rolünü değiştirebilirsiniz.")

    if user.role == _PROTECTED_ROLE:
        raise HTTPException(status_code=403, detail="Bu kullanıcının rolü değiştirilemez.")

    if data.role == UserRole.UNIVERSITY_ADMIN.value and not user.university_id:
        raise HTTPException(
            status_code=400,
            detail="Kullanıcıya 'university_admin' rolü atanabilmesi için önce bir üniversite atanması gerekir.",
        )

    user.role = UserRole(data.role)
    session.add(user)
    await session.commit()
    return {"success": True, "role": user.role.value}


@router.get("/{username}/activity")
async def get_user_activity(
    username: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Kullanıcının yaptığı tüm paylaşımları (Forum, Pazar vs.) getirir."""
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    if user.is_private and user.id != current_user.id and user.university_id != current_user.university_id:
        return {"activities": []}

    activities = []

    # Marketplace ilanlarını çek
    market_stmt = select(MarketplaceListing).where(MarketplaceListing.seller_id == user.id).order_by(desc(MarketplaceListing.created_at)).limit(10)
    market_res = await session.execute(market_stmt)
    for listing in market_res.scalars():
        image_url = None
        if listing.image_urls:
            import json
            try:
                images = json.loads(listing.image_urls)
                image_url = images[0] if images else None
            except Exception:
                pass

        activities.append({
            "type": "marketplace_listing",
            "id": listing.id,
            "title": listing.title,
            "content": listing.description[:150] + "..." if listing.description and len(listing.description) > 150 else listing.description,
            "image_url": image_url,
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
            "content": topic.content[:150] + "..." if topic.content and len(topic.content) > 150 else topic.content,
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
            "content": career.description[:150] + "..." if career.description and len(career.description) > 150 else career.description,
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


# ── Şifre Değiştirme ──────────────────────────────────────────────────────────
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifreniz hatalı.")
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="Yeni şifre mevcut şifreyle aynı olamaz.")
    current_user.password_hash = hash_password(data.new_password)
    session.add(current_user)
    await session.commit()
    return {"success": True, "message": "Şifreniz başarıyla güncellendi."}


# ── E-posta Değiştirme ────────────────────────────────────────────────────────
class ChangeEmailRequest(BaseModel):
    new_email: str
    current_password: str


@router.post("/change-email")
async def change_email(
    data: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifreniz hatalı.")
    existing = await session.execute(select(User).where(User.email == data.new_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanımda.")
    current_user.email = data.new_email
    session.add(current_user)
    await session.commit()
    return {"success": True, "message": "E-posta adresiniz güncellendi."}


# ── Hesap Silme ───────────────────────────────────────────────────────────────
class DeleteAccountRequest(BaseModel):
    current_password: str
    confirmation: str  # "HESABIMI SİL" yazması bekleniyor


@router.delete("/account")
async def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Şifreniz hatalı.")
    if data.confirmation != "HESABIMI SİL":
        raise HTTPException(status_code=400, detail="Onay metni hatalı.")
    await session.delete(current_user)
    await session.commit()
    return {"success": True, "message": "Hesabınız silindi."}
