"""Marketplace Pydantic şemaları."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ============================================================================
# KATEGORİ ŞEMALARI
# ============================================================================

class MarketplaceCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    order_index: int = Field(0, ge=0)
    is_active: bool = True


class MarketplaceCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    order_index: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class MarketplaceCategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    order_index: int = 0
    is_active: bool = True
    listing_count: int = 0

    model_config = {"from_attributes": True}


# ============================================================================
# İLAN ŞEMALARI
# ============================================================================

class MarketplaceListingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    price: Decimal = Field(..., gt=0)
    category_id: Optional[str] = Field(None, description="Kategori UUID")
    condition: str = Field(..., description="new | like_new | good | fair")


class MarketplaceListingUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[str] = None
    condition: Optional[str] = None
    status: Optional[str] = None


class SellerInfo(BaseModel):
    id: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    university: Optional[str] = None
    profile_picture_url: Optional[str] = None

    model_config = {"from_attributes": True}


class MarketplaceListingResponse(BaseModel):
    id: str
    title: str
    description: str
    price: Decimal
    category_id: Optional[str] = None
    category: Optional[MarketplaceCategoryResponse] = None
    condition: str
    status: str
    view_count: int
    message_count: int = 0
    image_urls: Optional[str] = None
    created_at: datetime
    seller_id: str
    creator: Optional[SellerInfo] = None

    model_config = {"from_attributes": True}
