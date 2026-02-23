from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
import json
import os
import uuid

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.marketplace import MarketplaceListing
from src.models.user import User

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

# --- ARKADAŞININ KARİYER SAYFASIYLA AYNI STANDART (SARI YENİ) ---
class CreatorInfo(BaseModel):
    id: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    university: Optional[str] = None
    profile_picture_url: Optional[str] = None

    model_config = {"from_attributes": True}

class ListingResponse(BaseModel):
    id: str
    title: str
    description: str
    price: Decimal
    category: str
    condition: str
    status: str
    view_count: int
    image_urls: Optional[str] = None
    created_at: datetime
    seller_id: str
    # Artık seller_name ve seller_username yerine bu objeyi kullanıyoruz (SARI YENİ)
    creator: Optional[CreatorInfo] = None

    model_config = {"from_attributes": True}

@router.get("/", response_model=List[ListingResponse])
async def get_listings(
    university: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db)
):
    # User modelinden username kolonunu da çekiyoruz (SARI YENİ)
    stmt = (
        select(MarketplaceListing, User.first_name, User.last_name, User.university, User.username, User.profile_picture_url)
        .outerjoin(User, MarketplaceListing.seller_id == User.id)
        .where(MarketplaceListing.status == "active")
    )

    if university:
        stmt = stmt.where(User.university == university)
    if category:
        stmt = stmt.where(MarketplaceListing.category == category)

    stmt = stmt.order_by(desc(MarketplaceListing.created_at))
    result = await session.execute(stmt)

    final_listings = []
    for row in result:
        listing = row[0]

        # Bilgileri "creator" objesi içine paketliyoruz (SARI YENİ)
        listing.creator = {
            "id": listing.seller_id,
            "username": row[4],  # User.username
            "first_name": row[1], # User.first_name
            "last_name": row[2],  # User.last_name
            "university": row[3] if row[3] else "Kampüs İçi",
            "profile_picture_url": row[5] # User.profile_picture_url
        }

        final_listings.append(listing)

    return final_listings

@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """İlanı veren kişinin kendi ilanını silmesini sağlar."""
    stmt = select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    result = await session.execute(stmt)
    listing = result.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    if listing.seller_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Bu ilanı silme yetkiniz bulunmamaktadır."
        )

    await session.delete(listing)
    try:
        await session.commit()
        return None
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=500, detail="İlan silinirken bir hata oluştu.")

@router.post("/", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    title: str = Form(...),
    description: str = Form(...),
    price: Decimal = Form(...),
    category: str = Form(...),
    condition: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    saved_image_urls = []
    if files:
        upload_dir = "static/uploads/marketplace"
        os.makedirs(upload_dir, exist_ok=True)
        for file in files:
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            content = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            saved_image_urls.append(f"/static/uploads/marketplace/{unique_filename}")

    new_listing = MarketplaceListing(
        seller_id=current_user.id,
        title=title,
        description=description,
        price=price,
        category=category,
        condition=condition,
        image_urls=json.dumps(saved_image_urls) if saved_image_urls else None,
        status="active"
    )

    session.add(new_listing)
    try:
        await session.commit()
        await session.refresh(new_listing)
        return new_listing
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
