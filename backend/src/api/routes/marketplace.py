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

    model_config = {"from_attributes": True}

@router.get("/", response_model=List[ListingResponse])
async def get_listings(
    university: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(MarketplaceListing).where(MarketplaceListing.status == "active")
    
    # Üniversite filtresi için User tablosuna ihtiyaç duyulursa basit bir join
    if university:
        stmt = stmt.join(User).where(User.university == university)
    
    if category:
        stmt = stmt.where(MarketplaceListing.category == category)

    stmt = stmt.order_by(desc(MarketplaceListing.created_at))
    result = await session.execute(stmt)
    return result.scalars().all()

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