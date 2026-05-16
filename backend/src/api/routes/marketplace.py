"""Marketplace API routes.

Endpoints:
  Public (authenticated):
    GET  /marketplace/             - List active listings (filter by category_id)
    POST /marketplace/             - Create a listing
    GET  /marketplace/categories   - List active categories with listing counts
    DELETE /marketplace/{id}       - Delete own listing (or admin)

  Admin:
    GET  /marketplace/admin/listings              - All listings
    POST /marketplace/admin/categories            - Create category
    PUT  /marketplace/admin/categories/{id}       - Update category
    DELETE /marketplace/admin/categories/{id}     - Delete category (blocked if listings exist)
"""

import json
import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import and_, or_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import get_current_active_user, get_current_user, require_admin
from src.models.marketplace import MarketplaceCategory, MarketplaceListing
from src.models.user import User, UserRole
from src.schemas.marketplace import (
    MarketplaceCategoryCreate,
    MarketplaceCategoryResponse,
    MarketplaceCategoryUpdate,
)

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# ============================================================================
# RESPONSE MODELS (inline — kept close to endpoints they serve)
# ============================================================================

class CreatorInfo(BaseModel):
    id: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    university: Optional[str] = None
    profile_picture_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ListingCategoryInfo(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None

    model_config = {"from_attributes": True}


class ListingResponse(BaseModel):
    id: str
    title: str
    description: str
    price: Decimal
    category_id: Optional[str] = None
    category: Optional[ListingCategoryInfo] = None
    condition: str
    status: str
    view_count: int
    image_urls: Optional[str] = None
    created_at: datetime
    seller_id: str
    creator: Optional[CreatorInfo] = None

    model_config = {"from_attributes": True}


# ============================================================================
# HELPERS
# ============================================================================

def _build_listing_response(listing: MarketplaceListing) -> dict:
    """Convert a fully-loaded ORM listing into a ListingResponse-compatible dict."""
    seller = listing.seller
    creator = None
    if seller:
        creator = {
            "id": seller.id,
            "username": seller.username,
            "first_name": seller.first_name,
            "last_name": seller.last_name,
            "university": seller.university or "Kampüs İçi",
            "profile_picture_url": seller.profile_picture_url,
        }

    category = None
    if listing.category_rel:
        category = {
            "id": listing.category_rel.id,
            "name": listing.category_rel.name,
            "icon": listing.category_rel.icon,
        }

    return {
        "id": listing.id,
        "title": listing.title,
        "description": listing.description,
        "price": listing.price,
        "category_id": listing.category_id,
        "category": category,
        "condition": listing.condition,
        "status": listing.status,
        "view_count": listing.view_count,
        "message_count": listing.message_count,
        "image_urls": listing.image_urls,
        "created_at": listing.created_at,
        "seller_id": listing.seller_id,
        "creator": creator,
    }


_LISTING_OPTIONS = [
    selectinload(MarketplaceListing.seller),
    selectinload(MarketplaceListing.category_rel),
]


def _is_admin(user: User) -> bool:
    return UserRole(user.role) in (UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN)


# ============================================================================
# PUBLIC ENDPOINTS
# ============================================================================

@router.get("/categories", response_model=dict)
async def get_categories(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Aktif marketplace kategorilerini ilan sayılarıyla döndürür."""
    is_admin = _is_admin(current_user)
    cat_query = select(MarketplaceCategory)
    if not is_admin:
        cat_query = cat_query.where(MarketplaceCategory.is_active == True)
    cat_query = cat_query.order_by(MarketplaceCategory.order_index, MarketplaceCategory.name)

    result = await session.execute(cat_query)
    categories = result.scalars().all()

    categories_with_counts = []
    for cat in categories:
        count_result = await session.execute(
            select(func.count(MarketplaceListing.id)).where(
                and_(
                    MarketplaceListing.category_id == cat.id,
                    MarketplaceListing.status == "active",
                )
            )
        )
        listing_count = count_result.scalar() or 0
        categories_with_counts.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "order_index": cat.order_index,
            "is_active": cat.is_active,
            "listing_count": listing_count,
        })

    return {"categories": categories_with_counts}


@router.get("/", response_model=List[ListingResponse])
async def get_listings(
    university: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None, description="Kategori UUID ile filtrele"),
    scope: Optional[str] = Query(None, description="public veya university"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> List[dict]:
    stmt = (
        select(MarketplaceListing)
        .where(MarketplaceListing.status == "active")
        .options(*_LISTING_OPTIONS)
        .order_by(desc(MarketplaceListing.created_at))
    )

    is_admin = _is_admin(current_user)
    if not is_admin:
        if scope == "university":
            stmt = stmt.outerjoin(User, MarketplaceListing.seller_id == User.id).where(
                or_(
                    MarketplaceListing.university_id == current_user.university_id,
                    and_(
                        MarketplaceListing.university_id.is_(None),
                        User.university_id == current_user.university_id
                    )
                )
            )
        elif scope == "public":
            stmt = stmt.where(MarketplaceListing.university_id.is_(None))
        else:
            stmt = stmt.where(
                or_(
                    MarketplaceListing.university_id == current_user.university_id,
                    MarketplaceListing.university_id.is_(None)
                )
            )

    if category_id:
        stmt = stmt.where(MarketplaceListing.category_id == category_id)

    result = await session.execute(stmt)
    listings = result.scalars().all()

    if university:
        listings = [l for l in listings if l.seller and l.seller.university == university]

    return [_build_listing_response(l) for l in listings]


@router.post("/", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    title: str = Form(...),
    description: str = Form(...),
    price: Decimal = Form(...),
    category_id: Optional[str] = Form(None),
    condition: str = Form(...),
    visibility: str = Form("public"),
    files: Optional[List[UploadFile]] = File(None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    # Validate category if provided
    if category_id:
        cat_result = await session.execute(
            select(MarketplaceCategory).where(
                and_(MarketplaceCategory.id == category_id, MarketplaceCategory.is_active == True)
            )
        )
        if not cat_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "NOT_FOUND", "message": "Kategori bulunamadı veya aktif değil"}},
            )

    saved_image_urls = []
    if files:
        upload_dir = "uploads/marketplace"
        os.makedirs(upload_dir, exist_ok=True)
        for file in files:
            ext = os.path.splitext(file.filename)[1] if file.filename else ""
            unique_filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(upload_dir, unique_filename)
            content = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            saved_image_urls.append(f"/uploads/marketplace/{unique_filename}")

    new_listing = MarketplaceListing(
        id=str(uuid.uuid4()),
        seller_id=current_user.id,
        title=title,
        description=description,
        price=price,
        category_id=category_id,
        university_id=None if visibility == "public" else current_user.university_id,
        condition=condition,
        image_urls=json.dumps(saved_image_urls) if saved_image_urls else None,
        status="active",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    session.add(new_listing)
    try:
        await session.commit()
        await session.refresh(new_listing)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    # Reload with relationships for the response
    result = await session.execute(
        select(MarketplaceListing)
        .where(MarketplaceListing.id == new_listing.id)
        .options(*_LISTING_OPTIONS)
    )
    loaded = result.scalar_one()
    return _build_listing_response(loaded)


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(
    listing_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Tekil ilan detayını döndürür ve view_count'u artırır."""
    stmt = (
        select(MarketplaceListing)
        .where(MarketplaceListing.id == listing_id)
        .where(MarketplaceListing.status == "active")
        .options(*_LISTING_OPTIONS)
    )
    result = await session.execute(stmt)
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    if listing.seller_id != current_user.id:
        listing.view_count = (listing.view_count or 0) + 1
        try:
            await session.commit()
            await session.refresh(listing)
        except Exception:
            await session.rollback()

    return _build_listing_response(listing)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> None:
    """İlan sahibi veya admin silebilir."""
    result = await session.execute(
        select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    if listing.seller_id != current_user.id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Bu ilanı silme yetkiniz bulunmamaktadır.")

    await session.delete(listing)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=500, detail="İlan silinirken bir hata oluştu.")


class ContactRequest(BaseModel):
    message_text: str

@router.post("/{listing_id}/contact", status_code=status.HTTP_201_CREATED)
async def contact_seller(
    listing_id: str,
    body: ContactRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Satıcıya mesaj gönderir ve message_count'u artırır."""
    if not body.message_text or len(body.message_text.strip()) < 5:
        raise HTTPException(status_code=422, detail="Mesaj en az 5 karakter olmalıdır.")

    stmt = select(MarketplaceListing).where(
        MarketplaceListing.id == listing_id,
        MarketplaceListing.status == "active"
    )
    result = await session.execute(stmt)
    listing = result.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi ilanınıza mesaj gönderemezsiniz.")

    seller_id = listing.seller_id
    from src.models.messages import Conversation
    from src.models.marketplace import MarketplaceMessage

    conv_stmt = select(Conversation).where(
        Conversation.type == "marketplace",
        Conversation.reference_id == listing_id,
        or_(
            (Conversation.user1_id == current_user.id) & (Conversation.user2_id == seller_id),
            (Conversation.user1_id == seller_id) & (Conversation.user2_id == current_user.id),
        ),
    )
    conv_result = await session.execute(conv_stmt)
    conversation = conv_result.scalar_one_or_none()
    now = datetime.now()

    if not conversation:
        conversation = Conversation(
            id=str(uuid.uuid4()),
            type="marketplace",
            reference_id=listing_id,
            user1_id=current_user.id,
            user2_id=seller_id,
            user1_unread_count=0,
            user2_unread_count=1,
            last_message_at=now,
        )
        session.add(conversation)
        await session.flush()
    else:
        if conversation.user1_id == current_user.id:
            conversation.user2_unread_count = (conversation.user2_unread_count or 0) + 1
        else:
            conversation.user1_unread_count = (conversation.user1_unread_count or 0) + 1
        conversation.last_message_at = now

    msg = MarketplaceMessage(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        sender_id=current_user.id,
        receiver_id=seller_id,
        listing_id=listing_id,
        content=body.message_text.strip(),
        is_read=False,
    )
    session.add(msg)

    listing.message_count = (listing.message_count or 0) + 1

    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail="Mesaj gönderilemedi.")

    return {"conversation_id": conversation.id, "success": True}


# ============================================================================
# ADMIN: İLAN YÖNETİMİ
# ============================================================================

@router.get("/admin/listings", response_model=List[ListingResponse])
async def admin_get_all_listings(
    category_id: Optional[str] = Query(None, description="Kategori UUID ile filtrele"),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> List[dict]:
    """Admin: tüm ilanları durum filtresi olmadan döndürür."""
    stmt = (
        select(MarketplaceListing)
        .options(*_LISTING_OPTIONS)
        .order_by(desc(MarketplaceListing.created_at))
    )
    if category_id:
        stmt = stmt.where(MarketplaceListing.category_id == category_id)

    result = await session.execute(stmt)
    listings = result.scalars().all()
    return [_build_listing_response(l) for l in listings]


# ============================================================================
# ADMIN: KATEGORİ YÖNETİMİ
# ============================================================================

@router.post("/admin/categories", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_category(
    request: MarketplaceCategoryCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    """Yeni marketplace kategorisi oluştur."""
    dup = await session.execute(
        select(MarketplaceCategory).where(MarketplaceCategory.name == request.name)
    )
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "CONFLICT", "message": "Bu isimde bir kategori zaten mevcut"}},
        )

    category = MarketplaceCategory(
        id=str(uuid.uuid4()),
        name=request.name,
        description=request.description,
        icon=request.icon,
        order_index=request.order_index,
        is_active=request.is_active,
        university_id=current_user.university_id,
        created_at=datetime.now(),
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)

    return {
        "success": True,
        "category": {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "icon": category.icon,
            "order_index": category.order_index,
            "is_active": category.is_active,
            "listing_count": 0,
        },
    }


@router.put("/admin/categories/{category_id}", response_model=dict)
async def update_category(
    category_id: str,
    request: MarketplaceCategoryUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    """Marketplace kategorisini güncelle."""
    result = await session.execute(
        select(MarketplaceCategory).where(MarketplaceCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Kategori bulunamadı"}},
        )

    if request.name is not None:
        dup = await session.execute(
            select(MarketplaceCategory).where(
                and_(MarketplaceCategory.name == request.name, MarketplaceCategory.id != category_id)
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "CONFLICT", "message": "Bu isimde bir kategori zaten mevcut"}},
            )
        category.name = request.name

    if request.description is not None:
        category.description = request.description
    if request.icon is not None:
        category.icon = request.icon
    if request.order_index is not None:
        category.order_index = request.order_index
    if request.is_active is not None:
        category.is_active = request.is_active

    await session.commit()
    await session.refresh(category)

    count_result = await session.execute(
        select(func.count(MarketplaceListing.id)).where(
            and_(
                MarketplaceListing.category_id == category.id,
                MarketplaceListing.status == "active",
            )
        )
    )
    listing_count = count_result.scalar() or 0

    return {
        "success": True,
        "category": {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "icon": category.icon,
            "order_index": category.order_index,
            "is_active": category.is_active,
            "listing_count": listing_count,
        },
    }


@router.delete("/admin/categories/{category_id}", response_model=dict)
async def delete_category(
    category_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    """Marketplace kategorisini sil. Bağlı aktif ilan varsa silmeye izin verilmez."""
    result = await session.execute(
        select(MarketplaceCategory).where(MarketplaceCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Kategori bulunamadı"}},
        )

    count_result = await session.execute(
        select(func.count(MarketplaceListing.id)).where(
            MarketplaceListing.category_id == category_id
        )
    )
    listing_count = count_result.scalar() or 0
    if listing_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "CONFLICT",
                    "message": (
                        f"Bu kategoride {listing_count} ilan bulunuyor. "
                        "Önce ilanları silin veya farklı bir kategoriye taşıyın."
                    ),
                }
            },
        )

    await session.delete(category)
    await session.commit()
    return {"success": True}
