# 007 - PAZAR (İKİNCİ EL EŞYA ALIM-SATIM) - IMPLEMENTATION TASKS

## 📋 GENEL BAKIŞ

**Tahmini Süre:** 10-12 gün  
**Öncelik:** Orta  
**Bağımlılıklar:** 
- 002-register-page (✅ Tamamlanmalı)
- 003-login-page (✅ Tamamlanmalı)
- 004-dashboard (✅ Tamamlanmalı)

---

## 📦 PHASE 0: Infrastructure Setup (0.5 gün)

### Task 0.1: Local Image Storage Setup
**Süre:** 30 dakika  
**Açıklama:** Local disk'te image storage klasörü oluştur ve FastAPI StaticFiles configure et

**Adımlar:**
1. Backend'de upload klasörü oluştur:
   ```bash
   mkdir -p backend/uploads/marketplace
   ```

2. `.gitignore` dosyasına ekle:
   ```
   backend/uploads/
   ```

3. Python `pillow` kütüphanesini yükle:
   ```bash
   pip install pillow
   ```

4. `backend/app/main.py` dosyasına StaticFiles ekle:
   ```python
   from fastapi.staticfiles import StaticFiles
   
   app.mount("/uploads", StaticFiles(directory="backend/uploads"), name="uploads")
   ```

**Test:**
- `backend/uploads/marketplace/` klasörü oluşturulmalı
- `GET /uploads/test.jpg` çalışmalı (test dosyası koyarsan)

---

### Task 0.2: Image Processing Utility (Local Storage)
**Süre:** 1.5 saat  
**Açıklama:** Image resize ve local disk'e kaydetme utility fonksiyonları

**Dosya:** `backend/app/utils/image_handler.py`

```python
import os
from PIL import Image
import uuid
from fastapi import UploadFile

UPLOAD_DIR = "backend/uploads/marketplace"

def upload_marketplace_image(
    file: UploadFile, 
    user_id: str, 
    listing_id: str
) -> str:
    """
    Resmi local disk'e kaydet ve URL döndür
    - Image validation (5MB max, JPEG/PNG only)
    - Resize (1200x1200 max)
    - Save to disk
    """
    # Image validation
    if file.size > 5 * 1024 * 1024:  # 5MB
        raise ValueError("Dosya boyutu 5MB'dan büyük olamaz")
    
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise ValueError("Sadece JPEG ve PNG formatları destekleniyor")
    
    # Resize image
    image = Image.open(file.file)
    image.thumbnail((1200, 1200))
    
    # Generate unique filename
    filename = f"{user_id}/{listing_id}/{uuid.uuid4()}.jpg"
    file_path = f"{UPLOAD_DIR}/{filename}"
    
    # Create directories if not exist
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save to disk
    image.save(file_path, format="JPEG", quality=85)
    
    # Return relative URL (StaticFiles will serve this)
    return f"/uploads/marketplace/{filename}"

def delete_marketplace_image(image_url: str):
    """Local disk'ten resmi sil"""
    # Extract filepath from URL: /uploads/marketplace/user-id/listing-id/abc.jpg
    relative_path = image_url.replace("/uploads/marketplace/", "")
    file_path = f"{UPLOAD_DIR}/{relative_path}"
    
    if os.path.exists(file_path):
        os.remove(file_path)
```

**Test:**
- 5MB'dan büyük dosya yüklemeyi reddetmeli
- PDF, DOCX gibi formatları reddetmeli
- JPEG ve PNG dosyalarını başarıyla yüklemeli
- Dosyalar `backend/uploads/marketplace/user-id/listing-id/` altında olmalı

**Not:** 
- **NOT:** Bu proje mezuniyet projesi için local storage kullanır (backend/uploads/). S3, MinIO veya cloud storage kullanılmaz.
- ⚠️ Sunucu yeniden başladığında dosyalar silinmez (kalıcı storage)

---

### Task 0.3: Cron Job Setup (APScheduler)
**Süre:** 2 saat  
**Açıklama:** 60 gün sonra ilan silme cron job'ı

**Opsiyonlar:**
- **Seçenek A:** APScheduler (Python içi)
- **Seçenek B:** Celery + Redis (daha güçlü ama karmaşık)
- **Seçenek C:** OS-level cron + Python script (basit)

**Önerilen:** Seçenek A (APScheduler)

**Dosya:** `backend/app/tasks/marketplace_cleanup.py`

```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from app.models import MarketplaceListing
from app.utils.email_sender import send_email

scheduler = BackgroundScheduler()

def delete_expired_listings():
    """60 günden eski aktif ilanları sil"""
    expired_listings = db.query(MarketplaceListing).filter(
        MarketplaceListing.auto_delete_at < datetime.now(),
        MarketplaceListing.status == 'active'
    ).all()
    
    for listing in expired_listings:
        # Email gönder
        send_email(
            to=listing.seller.email,
            subject="İlanınız Süresi Doldu",
            body=f"'{listing.title}' ilanınız 60 gün boyunca satılmadığı için sistemden kaldırıldı."
        )
        
        # İlanı sil
        listing.status = 'deleted'
        db.commit()
    
    print(f"[{datetime.now()}] {len(expired_listings)} ilan silindi.")

# Her gün saat 02:00'da çalıştır
scheduler.add_job(delete_expired_listings, 'cron', hour=2, minute=0)
scheduler.start()
```

**Entegrasyon:** `main.py` içinde scheduler'ı başlat
```python
from app.tasks.marketplace_cleanup import scheduler

@app.on_event("startup")
def startup_event():
    scheduler.start()
```

---

## 🗄️ PHASE 1: Database Setup (1 gün)

### Task 1.1: Alembic Migration - Marketplace Tables
**Süre:** 3 saat  
**Açıklama:** Database tablolarını oluştur

**Migration Dosyası:** `alembic/versions/xxx_create_marketplace_tables.py`

```python
def upgrade():
    # marketplace_listings tablosu
    op.create_table(
        'marketplace_listings',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('seller_user_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('condition', sa.String(30), nullable=False),
        sa.Column('status', sa.String(20), default='active', nullable=False),
        sa.Column('view_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('sold_at', sa.DateTime(), nullable=True),
        sa.Column('auto_delete_at', sa.DateTime(), server_default=sa.text("NOW() + INTERVAL '60 days'")),
        sa.CheckConstraint("char_length(description) >= 20", name='check_description_length'),
        sa.CheckConstraint("price > 0", name='check_price_positive'),
        sa.CheckConstraint("category IN ('Elektronik', 'Kitap & Ders Notları', 'Kıyafet & Aksesuar', 'Mobilya & Ev Eşyası', 'Spor Malzemeleri', 'Müzik Aletleri', 'Ulaşım', 'Oyun & Hobi', 'Diğer')", name='check_category'),
        sa.CheckConstraint("condition IN ('Sıfır', 'Az Kullanılmış', 'İyi Durumda', 'Kullanılmış')", name='check_condition'),
        sa.CheckConstraint("status IN ('active', 'sold', 'deleted')", name='check_status')
    )
    
    # İndeksler
    op.create_index('idx_marketplace_listings_seller', 'marketplace_listings', ['seller_user_id'])
    op.create_index('idx_marketplace_listings_category', 'marketplace_listings', ['category'])
    op.create_index('idx_marketplace_listings_status', 'marketplace_listings', ['status'])
    op.create_index('idx_marketplace_listings_created_at', 'marketplace_listings', [sa.text('created_at DESC')])
    
    # marketplace_listing_images tablosu
    op.create_table(
        'marketplace_listing_images',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('listing_id', sa.UUID(), sa.ForeignKey('marketplace_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.func.now()),
        sa.CheckConstraint("display_order >= 1 AND display_order <= 3", name='check_display_order'),
        sa.UniqueConstraint('listing_id', 'display_order', name='unique_listing_order')
    )
    
    op.create_index('idx_marketplace_images_listing', 'marketplace_listing_images', ['listing_id'])
    
    # marketplace_reports tablosu
    op.create_table(
        'marketplace_reports',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('listing_id', sa.UUID(), sa.ForeignKey('marketplace_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reporter_user_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('reviewed_by', sa.UUID(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'reviewed', 'action_taken')", name='check_report_status'),
        sa.UniqueConstraint('listing_id', 'reporter_user_id', name='unique_user_report')
    )
    
    op.create_index('idx_marketplace_reports_status', 'marketplace_reports', ['status'])
    op.create_index('idx_marketplace_reports_listing', 'marketplace_reports', ['listing_id'])
    
    # marketplace_messages tablosu (merkezi DM sisteminin bir parçası)
    # Not: Detaylı bilgi için specs/013-messages/tasks.md dosyasına bakın
    op.create_table(
        'marketplace_messages',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('receiver_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.CheckConstraint("sender_id != receiver_id", name='check_not_self_message'),
        sa.CheckConstraint("char_length(content) > 0 AND char_length(content) <= 1000", name='check_message_length')
    )
    
    op.create_index('idx_marketplace_messages_conversation', 'marketplace_messages', ['conversation_id'])
    op.create_index('idx_marketplace_messages_sender', 'marketplace_messages', ['sender_id'])
    op.create_index('idx_marketplace_messages_receiver', 'marketplace_messages', ['receiver_id'])
```

**Test:**
```bash
alembic upgrade head
```

---

### Task 1.2: SQLAlchemy Models
**Süre:** 2 saat  
**Açıklama:** ORM modellerini oluştur

**Dosya:** `backend/app/models/marketplace.py`

```python
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
# SQLite kullanılır - UUID için String(36) kullanılır (PostgreSQL PG_UUID değil)
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime, timedelta

class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    category = Column(String(50), nullable=False)
    condition = Column(String(30), nullable=False)
    status = Column(String(20), default="active", nullable=False)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sold_at = Column(DateTime, nullable=True)
    auto_delete_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=60))
    
    # Relationships
    seller = relationship("User", foreign_keys=[seller_user_id], back_populates="marketplace_listings")
    images = relationship("MarketplaceListingImage", back_populates="listing", cascade="all, delete-orphan")
    reports = relationship("MarketplaceReport", back_populates="listing", cascade="all, delete-orphan")

class MarketplaceListingImage(Base):
    __tablename__ = "marketplace_listing_images"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_listings.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    display_order = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    listing = relationship("MarketplaceListing", back_populates="images")

class MarketplaceReport(Base):
    __tablename__ = "marketplace_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_listings.id", ondelete="CASCADE"), nullable=False)
    reporter_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Relationships
    listing = relationship("MarketplaceListing", back_populates="reports")
    reporter = relationship("User", foreign_keys=[reporter_user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class MarketplaceMessage(Base):
    __tablename__ = "marketplace_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", foreign_keys=[conversation_id])
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

# Not: Mesajlaşma sisteminin tüm detayları specs/013-messages/ klasöründe bulunmaktadır.
```

**Dosya:** `backend/app/models/__init__.py` (güncelle)
```python
from .marketplace import MarketplaceListing, MarketplaceListingImage, MarketplaceReport, MarketplaceMessage
```

---

### Task 1.3: Pydantic Schemas
**Süre:** 2 saat  
**Açıklama:** Request/Response DTO'larını oluştur

**Dosya:** `backend/app/schemas/marketplace.py`

```python
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# Listing Schemas
class ListingCreateRequest(BaseModel):
    title: str = Field(..., min_length=10, max_length=100)
    description: str = Field(..., min_length=20, max_length=1000)
    price: Decimal = Field(..., gt=0, le=999999)
    category: str
    condition: str
    
    @validator('category')
    def validate_category(cls, v):
        allowed = ['Elektronik', 'Kitap & Ders Notları', 'Kıyafet & Aksesuar', 
                   'Mobilya & Ev Eşyası', 'Spor Malzemeleri', 'Müzik Aletleri', 
                   'Ulaşım', 'Oyun & Hobi', 'Diğer']
        if v not in allowed:
            raise ValueError(f'Kategori şunlardan biri olmalı: {allowed}')
        return v
    
    @validator('condition')
    def validate_condition(cls, v):
        allowed = ['Sıfır', 'Az Kullanılmış', 'İyi Durumda', 'Kullanılmış']
        if v not in allowed:
            raise ValueError(f'Durum şunlardan biri olmalı: {allowed}')
        return v

class ListingUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=10, max_length=100)
    description: Optional[str] = Field(None, min_length=20, max_length=1000)
    price: Optional[Decimal] = Field(None, gt=0, le=999999)
    category: Optional[str] = None
    condition: Optional[str] = None

class SellerInfoResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    university: str
    department: str

class ListingImageResponse(BaseModel):
    id: str
    image_url: str
    display_order: int

class ListingResponse(BaseModel):
    id: str
    seller: SellerInfoResponse
    title: str
    description: str
    price: Decimal
    category: str
    condition: str
    status: str
    view_count: int
    images: List[ListingImageResponse]
    created_at: datetime
    updated_at: datetime
    sold_at: Optional[datetime]

class ListingListResponse(BaseModel):
    listings: List[ListingResponse]
    total: int
    page: int
    pages: int

# Message Schemas
class MessageSendRequest(BaseModel):
    receiver_user_id: str
    message_text: str = Field(..., min_length=1, max_length=500)

class MessageResponse(BaseModel):
    id: str
    sender_user_id: str
    receiver_user_id: str
    message_text: str
    is_read: bool
    created_at: datetime

class ConversationResponse(BaseModel):
    user: SellerInfoResponse
    last_message: MessageResponse
    unread_count: int

# Report Schema
class ReportCreateRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)
```

---

## 🔌 PHASE 2: Backend API Implementation (4 gün)

### Task 2.1: İlan Oluşturma Endpoint
**Süre:** 4 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, MarketplaceListing
from app.schemas.marketplace import ListingCreateRequest, ListingResponse
from app.dependencies import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/marketplace", tags=["Marketplace"])

@router.post("/listings", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_listing(
    data: ListingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Email doğrulaması kontrolü
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email adresiniz doğrulanmamış. İlan vermek için email doğrulaması gereklidir."
        )
    
    # Rate limiting (10 ilan/gün)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_listings_count = db.query(MarketplaceListing).filter(
        MarketplaceListing.seller_user_id == current_user.id,
        MarketplaceListing.created_at >= today_start
    ).count()
    
    if today_listings_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Günlük ilan oluşturma limitini aştınız (10 ilan/gün)."
        )
    
    # İlan oluştur
    new_listing = MarketplaceListing(
        seller_user_id=current_user.id,
        title=data.title,
        description=data.description,
        price=data.price,
        category=data.category,
        condition=data.condition,
        auto_delete_at=datetime.utcnow() + timedelta(days=60)
    )
    
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    
    return new_listing
```

**Test:**
- Email doğrulanmamış kullanıcı 403 almalı
- 10 ilan oluşturduktan sonra 429 almalı
- Geçerli veri ile 201 dönmeli

---

### Task 2.2: Image Upload Endpoint
**Süre:** 3 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
from fastapi import File, UploadFile
from app.models import MarketplaceListingImage
from app.utils.image_handler import upload_marketplace_image

@router.post("/listings/{listing_id}/images", status_code=status.HTTP_201_CREATED)
def upload_listing_images(
    listing_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # İlanı kontrol et
    listing = db.query(MarketplaceListing).filter(
        MarketplaceListing.id == listing_id,
        MarketplaceListing.seller_user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı veya size ait değil")
    
    # Mevcut image sayısını kontrol et
    existing_images_count = db.query(MarketplaceListingImage).filter(
        MarketplaceListingImage.listing_id == listing_id
    ).count()
    
    if existing_images_count + len(files) > 3:
        raise HTTPException(
            status_code=400,
            detail=f"Maksimum 3 fotoğraf yükleyebilirsiniz. Şu an {existing_images_count} fotoğraf mevcut."
        )
    
    # Upload images
    uploaded_images = []
    for i, file in enumerate(files):
        try:
            image_url = upload_marketplace_image(file, str(current_user.id), str(listing_id))
            
            new_image = MarketplaceListingImage(
                listing_id=listing_id,
                image_url=image_url,
                display_order=existing_images_count + i + 1
            )
            db.add(new_image)
            uploaded_images.append(new_image)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    db.commit()
    
    return {"message": f"{len(uploaded_images)} fotoğraf başarıyla yüklendi", "images": uploaded_images}
```

**Test:**
- 3'ten fazla fotoğraf yükleme 400 almalı
- 5MB'dan büyük dosya 400 almalı
- JPEG/PNG dışındaki formatlar 400 almalı
- Geçerli dosyalar başarıyla yüklenmeli

---

### Task 2.3: İlan Listeleme Endpoint (Filtreleme + Pagination)
**Süre:** 5 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
from sqlalchemy import or_, and_, func
from typing import Optional

@router.get("/listings", response_model=ListingListResponse)
def list_listings(
    university_id: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    condition: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest",  # newest | price_asc | price_desc
    page: int = 1,
    limit: int = 24,
    db: Session = Depends(get_db)
):
    # Base query
    query = db.query(MarketplaceListing).filter(
        MarketplaceListing.status == 'active'
    )
    
    # Filters
    if university_id:
        query = query.join(User, MarketplaceListing.seller_user_id == User.id).filter(
            User.university_id == university_id
        )
    
    if category:
        query = query.filter(MarketplaceListing.category == category)
    
    if min_price:
        query = query.filter(MarketplaceListing.price >= min_price)
    
    if max_price:
        query = query.filter(MarketplaceListing.price <= max_price)
    
    if condition:
        query = query.filter(MarketplaceListing.condition == condition)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                MarketplaceListing.title.ilike(search_pattern),
                MarketplaceListing.description.ilike(search_pattern)
            )
        )
    
    # Sorting
    if sort == "newest":
        query = query.order_by(MarketplaceListing.created_at.desc())
    elif sort == "price_asc":
        query = query.order_by(MarketplaceListing.price.asc())
    elif sort == "price_desc":
        query = query.order_by(MarketplaceListing.price.desc())
    
    # Pagination
    total = query.count()
    listings = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "listings": listings,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
```

**Test:**
- University filtrelemesi doğru çalışmalı
- Arama (title + description) çalışmalı
- Fiyat aralığı filtrelemesi çalışmalı
- Sıralama (newest, price_asc, price_desc) çalışmalı
- Pagination doğru çalışmalı

---

### Task 2.4: İlan Detay Endpoint (View Count Increment)
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
@router.get("/listings/{listing_id}", response_model=ListingResponse)
def get_listing_detail(
    listing_id: str,
    db: Session = Depends(get_db)
):
    listing = db.query(MarketplaceListing).filter(
        MarketplaceListing.id == listing_id,
        MarketplaceListing.status == 'active'
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    # View count artır
    listing.view_count += 1
    db.commit()
    
    return listing
```

---

### Task 2.5: İlan Güncelleme Endpoint
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
@router.put("/listings/{listing_id}", response_model=ListingResponse)
def update_listing(
    listing_id: str,
    data: ListingUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    listing = db.query(MarketplaceListing).filter(
        MarketplaceListing.id == listing_id,
        MarketplaceListing.seller_user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı veya size ait değil")
    
    # Update fields
    if data.title:
        listing.title = data.title
    if data.description:
        listing.description = data.description
    if data.price:
        listing.price = data.price
    if data.category:
        listing.category = data.category
    if data.condition:
        listing.condition = data.condition
    
    listing.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(listing)
    
    return listing
```

---

### Task 2.6: İlan "Satıldı" İşaretleme Endpoint
**Süre:** 1 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
@router.patch("/listings/{listing_id}/mark-sold")
def mark_listing_as_sold(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    listing = db.query(MarketplaceListing).filter(
        MarketplaceListing.id == listing_id,
        MarketplaceListing.seller_user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    listing.status = 'sold'
    listing.sold_at = datetime.utcnow()
    db.commit()
    
    return {"message": "İlan 'SATILDI' olarak işaretlendi"}
```

---

### Task 2.7: İlan Silme Endpoint
**Süre:** 1 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
from app.utils.image_handler import delete_marketplace_image

@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    listing = db.query(MarketplaceListing).filter(
        MarketplaceListing.id == listing_id,
        MarketplaceListing.seller_user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    # Local storage'dan resimleri sil
    for image in listing.images:
        delete_marketplace_image(image.image_url)
    
    # İlanı sil (cascade ile images da silinir)
    db.delete(listing)
    db.commit()
    
    return
```

---

### Task 2.8: Kullanıcının İlanları Endpoint
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
@router.get("/my-listings", response_model=List[ListingResponse])
def get_my_listings(
    status: Optional[str] = None,  # active | sold
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(MarketplaceListing).filter(
        MarketplaceListing.seller_user_id == current_user.id
    )
    
    if status:
        query = query.filter(MarketplaceListing.status == status)
    
    listings = query.order_by(MarketplaceListing.created_at.desc()).all()
    
    return listings
```

---

### Task 2.9-2.12: Mesajlaşma Sistemi (Merkezi DM)
**Süre:** Ayrı modülde ele alınır  
**Referans:** `specs/013-messages/tasks.md`

**Not:** Pazar mesajlaşma sistemi, merkezi DM sisteminin bir parçasıdır. 

**Özet:**
- Tüm mesajlaşma endpoint'leri `/api/v1/messages/` altındadır
- `POST /api/v1/messages/conversations` - Yeni konuşma başlat
- `GET /api/v1/messages/conversations` - Tüm konuşmalar (Pazar + Kariyer)
- `GET /api/v1/messages/conversations/{conversation_id}/messages` - Mesajları getir
- `POST /api/v1/messages/conversations/{conversation_id}/messages` - Mesaj gönder
- `GET /api/v1/messages/conversations/unread-count` - Okunmamış sayısı

**Pazar İlanı için Entegrasyon:**
Frontend'de ilan detay sayfasında "Satıcıya Mesaj Gönder" butonu:
```typescript
const response = await api.post('/messages/conversations', {
  type: 'marketplace',
  reference_id: listingId,
  receiver_id: sellerId,
  content: 'Merhaba, ürün hakkında bilgi alabilir miyim?',
});
navigate(`/dashboard/messages/${response.data.conversation_id}`);
```

**Detaylı Task Listesi:** `specs/013-messages/tasks.md` dosyasına bakın.

---

### Task 2.13: İlan Raporlama Endpoint
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/marketplace.py`

```python
from app.models import MarketplaceReport
from app.schemas.marketplace import ReportCreateRequest

@router.post("/listings/{listing_id}/report", status_code=status.HTTP_201_CREATED)
def report_listing(
    listing_id: str,
    data: ReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # İlanı kontrol et
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    # Daha önce rapor edilmiş mi?
    existing_report = db.query(MarketplaceReport).filter(
        MarketplaceReport.listing_id == listing_id,
        MarketplaceReport.reporter_user_id == current_user.id
    ).first()
    
    if existing_report:
        raise HTTPException(status_code=400, detail="Bu ilanı zaten raporladınız")
    
    # Rate limiting (5 rapor/gün)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_reports_count = db.query(MarketplaceReport).filter(
        MarketplaceReport.reporter_user_id == current_user.id,
        MarketplaceReport.created_at >= today_start
    ).count()
    
    if today_reports_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Günlük rapor gönderme limitini aştınız (5 rapor/gün)."
        )
    
    # Rapor oluştur
    new_report = MarketplaceReport(
        listing_id=listing_id,
        reporter_user_id=current_user.id,
        reason=data.reason
    )
    
    db.add(new_report)
    db.commit()
    
    return {"message": "Rapor başarıyla gönderildi. İnceleme yapılacaktır."}
```

---

### Task 2.14: Router'ları Main App'e Ekle
**Süre:** 30 dakika  
**Dosya:** `backend/app/main.py`

```python
from app.routers import marketplace, messages

app.include_router(marketplace.router)
app.include_router(messages.router)
```

---

## 🎨 PHASE 3: Frontend Implementation (4 gün)

### Task 3.1: Marketplace Service (API Client)
**Süre:** 2 saat  
**Dosya:** `frontend/src/services/marketplaceService.ts`

```typescript
import axios from 'axios';

const API_BASE = '/api/v1/marketplace';

export const marketplaceService = {
  // Listings
  async createListing(data: any) {
    const response = await axios.post(`${API_BASE}/listings`, data);
    return response.data;
  },
  
  async uploadImages(listingId: string, files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await axios.post(
      `${API_BASE}/listings/${listingId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  
  async getListings(params: any) {
    const response = await axios.get(`${API_BASE}/listings`, { params });
    return response.data;
  },
  
  async getListingDetail(listingId: string) {
    const response = await axios.get(`${API_BASE}/listings/${listingId}`);
    return response.data;
  },
  
  async updateListing(listingId: string, data: any) {
    const response = await axios.put(`${API_BASE}/listings/${listingId}`, data);
    return response.data;
  },
  
  async markAsSold(listingId: string) {
    const response = await axios.patch(`${API_BASE}/listings/${listingId}/mark-sold`);
    return response.data;
  },
  
  async deleteListing(listingId: string) {
    await axios.delete(`${API_BASE}/listings/${listingId}`);
  },
  
  async getMyListings(status?: string) {
    const response = await axios.get(`${API_BASE}/my-listings`, {
      params: { status }
    });
    return response.data;
  },
  
  async reportListing(listingId: string, reason: string) {
    const response = await axios.post(`${API_BASE}/listings/${listingId}/report`, { reason });
    return response.data;
  }
};

export const messageService = {
  async sendMessage(receiverId: string, text: string) {
    const response = await axios.post('/api/v1/messages', {
      receiver_user_id: receiverId,
      message_text: text
    });
    return response.data;
  },
  
  async getConversations() {
    const response = await axios.get('/api/v1/messages/conversations');
    return response.data;
  },
  
  async getConversation(userId: string) {
    const response = await axios.get(`/api/v1/messages/conversation/${userId}`);
    return response.data;
  },
  
  async getUnreadCount() {
    const response = await axios.get('/api/v1/messages/unread-count');
    return response.data;
  }
};
```

---

### Task 3.2: Pazar Ana Sayfası (Listing Grid)
**Süre:** 6 saat  
**Dosya:** `frontend/src/pages/Marketplace/MarketplaceHome.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { marketplaceService } from '../../services/marketplaceService';
import ListingCard from './components/ListingCard';
import FilterBar from './components/FilterBar';

const MarketplaceHome: React.FC = () => {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    university_id: null,
    category: null,
    min_price: null,
    max_price: null,
    condition: null,
    search: '',
    sort: 'newest'
  });
  const [activeTab, setActiveTab] = useState('my-university'); // my-university | all
  
  useEffect(() => {
    fetchListings();
  }, [filters, page, activeTab]);
  
  const fetchListings = async () => {
    const params = {
      ...filters,
      page,
      limit: 24
    };
    
    if (activeTab === 'my-university') {
      params.university_id = localStorage.getItem('user_university_id');
    }
    
    const data = await marketplaceService.getListings(params);
    setListings(data.listings);
    setTotal(data.total);
  };
  
  return (
    <div className="marketplace-home">
      <FilterBar filters={filters} setFilters={setFilters} />
      
      <div className="tabs">
        <button onClick={() => setActiveTab('my-university')}>
          📍 Üniversitem
        </button>
        <button onClick={() => setActiveTab('all')}>
          🌍 Tüm İlanlar
        </button>
        <button className="create-listing-btn" onClick={() => navigate('/marketplace/create')}>
          + İlan Ver
        </button>
      </div>
      
      <div className="listings-grid">
        {listings.map(listing => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      
      <Pagination page={page} setPage={setPage} totalPages={Math.ceil(total / 24)} />
    </div>
  );
};
```

---

### Task 3.3: İlan Kartı Component
**Süre:** 2 saat  
**Dosya:** `frontend/src/pages/Marketplace/components/ListingCard.tsx`

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ListingCardProps {
  listing: any;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const navigate = useNavigate();
  
  return (
    <div className="listing-card" onClick={() => navigate(`/marketplace/${listing.id}`)}>
      <div className="image-container">
        <img src={listing.images[0]?.image_url || '/placeholder.jpg'} alt={listing.title} />
        {listing.status === 'sold' && (
          <div className="sold-overlay">SATILDI</div>
        )}
      </div>
      
      <div className="card-content">
        <h3 className="title">{listing.title}</h3>
        <p className="price">{listing.price} TL</p>
        <span className="condition-badge">{listing.condition}</span>
        
        <div className="seller-info">
          <span>@{listing.seller.first_name}_{listing.seller.last_name[0]}</span>
          <span>{listing.seller.university}</span>
        </div>
      </div>
    </div>
  );
};
```

---

### Task 3.4: Filtre Barı Component
**Süre:** 3 saat  
**Dosya:** `frontend/src/pages/Marketplace/components/FilterBar.tsx`

```typescript
import React from 'react';

const FilterBar: React.FC = ({ filters, setFilters }) => {
  const categories = [
    'Elektronik', 'Kitap & Ders Notları', 'Kıyafet & Aksesuar',
    'Mobilya & Ev Eşyası', 'Spor Malzemeleri', 'Müzik Aletleri',
    'Ulaşım', 'Oyun & Hobi', 'Diğer'
  ];
  
  const conditions = ['Sıfır', 'Az Kullanılmış', 'İyi Durumda', 'Kullanılmış'];
  
  return (
    <div className="filter-bar">
      <input
        type="text"
        placeholder="🔍 Arama..."
        value={filters.search}
        onChange={(e) => setFilters({...filters, search: e.target.value})}
      />
      
      <select
        value={filters.category || ''}
        onChange={(e) => setFilters({...filters, category: e.target.value || null})}
      >
        <option value="">Kategori: Tümü</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      
      <div className="price-range">
        <input
          type="number"
          placeholder="Min Fiyat"
          value={filters.min_price || ''}
          onChange={(e) => setFilters({...filters, min_price: e.target.value || null})}
        />
        <input
          type="number"
          placeholder="Max Fiyat"
          value={filters.max_price || ''}
          onChange={(e) => setFilters({...filters, max_price: e.target.value || null})}
        />
      </div>
      
      <select
        value={filters.condition || ''}
        onChange={(e) => setFilters({...filters, condition: e.target.value || null})}
      >
        <option value="">Durum: Tümü</option>
        {conditions.map(cond => (
          <option key={cond} value={cond}>{cond}</option>
        ))}
      </select>
      
      <select
        value={filters.sort}
        onChange={(e) => setFilters({...filters, sort: e.target.value})}
      >
        <option value="newest">Sırala: Yeni İlanlar</option>
        <option value="price_asc">Ucuz → Pahalı</option>
        <option value="price_desc">Pahalı → Ucuz</option>
      </select>
    </div>
  );
};
```

---

### Task 3.5: İlan Oluşturma Sayfası
**Süre:** 5 saat  
**Dosya:** `frontend/src/pages/Marketplace/CreateListing.tsx`

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplaceService';

const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (images.length + files.length > 3) {
        setError('Maksimum 3 fotoğraf yükleyebilirsiniz');
        return;
      }
      setImages([...images, ...files]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // 1. İlan oluştur
      const listing = await marketplaceService.createListing(formData);
      
      // 2. Fotoğrafları yükle
      if (images.length > 0) {
        await marketplaceService.uploadImages(listing.id, images);
      }
      
      // 3. Başarı mesajı
      alert('✅ İlanınız Başarıyla Yayınlandı!');
      navigate('/marketplace/my-listings');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="create-listing-page">
      <h1>Yeni İlan Oluştur</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="image-upload">
          <label>📸 Fotoğraflar (En az 1, en fazla 3) *</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={handleImageChange}
          />
          <div className="image-preview">
            {images.map((img, idx) => (
              <div key={idx} className="preview-item">
                <img src={URL.createObjectURL(img)} alt={`Preview ${idx + 1}`} />
                <button onClick={() => setImages(images.filter((_, i) => i !== idx))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <label>📝 Başlık *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            minLength={10}
            maxLength={100}
            required
          />
        </div>
        
        <div className="form-group">
          <label>📋 Kategori *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          >
            <option value="">Seçiniz</option>
            {/* Kategori seçenekleri */}
          </select>
        </div>
        
        <div className="form-group">
          <label>💰 Fiyat (TL) *</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({...formData, price: e.target.value})}
            min={1}
            max={999999}
            required
          />
        </div>
        
        <div className="form-group">
          <label>✨ Durum *</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({...formData, condition: e.target.value})}
            required
          >
            <option value="">Seçiniz</option>
            <option value="Sıfır">Sıfır</option>
            <option value="Az Kullanılmış">Az Kullanılmış</option>
            <option value="İyi Durumda">İyi Durumda</option>
            <option value="Kullanılmış">Kullanılmış</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>📄 Açıklama *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            minLength={20}
            maxLength={1000}
            rows={6}
            required
          />
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/marketplace')}>
            İptal
          </button>
          <button type="submit" disabled={loading || images.length === 0}>
            {loading ? 'Yayınlanıyor...' : 'İlanı Yayınla'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

---

### Task 3.6: İlan Detay Sayfası
**Süre:** 5 saat  
**Dosya:** `frontend/src/pages/Marketplace/ListingDetail.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplaceService';

const ListingDetail: React.FC = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  
  useEffect(() => {
    fetchListing();
  }, [listingId]);
  
  const fetchListing = async () => {
    const data = await marketplaceService.getListingDetail(listingId!);
    setListing(data);
  };
  
  const handleContactSeller = () => {
    navigate(`/messages?user=${listing.seller.id}`);
  };
  
  return (
    <div className="listing-detail-page">
      {listing && (
        <>
          <div className="content-grid">
            <div className="image-gallery">
              <img
                src={listing.images[currentImageIndex]?.image_url}
                alt={listing.title}
              />
              <div className="image-nav">
                <button onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}>
                  ◀
                </button>
                <span>{currentImageIndex + 1} / {listing.images.length}</span>
                <button onClick={() => setCurrentImageIndex(Math.min(listing.images.length - 1, currentImageIndex + 1))}>
                  ▶
                </button>
              </div>
              <div className="thumbnails">
                {listing.images.map((img: any, idx: number) => (
                  <img
                    key={idx}
                    src={img.image_url}
                    alt={`Thumbnail ${idx + 1}`}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={idx === currentImageIndex ? 'active' : ''}
                  />
                ))}
              </div>
            </div>
            
            <div className="seller-card">
              <h3>Satıcı Bilgileri</h3>
              <div className="seller-info">
                <p>👤 {listing.seller.first_name} {listing.seller.last_name}</p>
                <p>🎓 {listing.seller.university}</p>
                <p>📚 {listing.seller.department}</p>
              </div>
              <button onClick={handleContactSeller}>📩 Mesaj Gönder</button>
              <button onClick={() => navigate(`/profile/${listing.seller.id}`)}>
                👤 Profili Görüntüle
              </button>
            </div>
          </div>
          
          <div className="listing-info">
            <h1>{listing.title}</h1>
            <p className="price">💰 {listing.price} TL</p>
            <p>📋 Kategori: {listing.category}</p>
            <p>✨ Durum: {listing.condition}</p>
            <p>📅 Yayınlandı: {new Date(listing.created_at).toLocaleDateString('tr-TR')}</p>
            
            <h2>Açıklama</h2>
            <p className="description">{listing.description}</p>
            
            <button onClick={() => setShowReportModal(true)}>
              🚩 Uygunsuz İlan Bildir
            </button>
          </div>
        </>
      )}
      
      {showReportModal && (
        <ReportModal
          listingId={listingId!}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};
```

---

### Task 3.7: İlanlarım Sayfası
**Süre:** 4 saat  
**Dosya:** `frontend/src/pages/Marketplace/MyListings.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { marketplaceService } from '../../services/marketplaceService';

const MyListings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('active'); // active | sold
  const [listings, setListings] = useState([]);
  
  useEffect(() => {
    fetchMyListings();
  }, [activeTab]);
  
  const fetchMyListings = async () => {
    const data = await marketplaceService.getMyListings(activeTab);
    setListings(data);
  };
  
  const handleMarkAsSold = async (listingId: string) => {
    if (confirm('Bu ilanı "SATILDI" olarak işaretlemek istediğinize emin misiniz?')) {
      await marketplaceService.markAsSold(listingId);
      fetchMyListings();
    }
  };
  
  const handleDelete = async (listingId: string) => {
    if (confirm('Bu ilanı silmek istediğinize emin misiniz?')) {
      await marketplaceService.deleteListing(listingId);
      fetchMyListings();
    }
  };
  
  return (
    <div className="my-listings-page">
      <div className="header">
        <h1>İlanlarım</h1>
        <button onClick={() => navigate('/marketplace/create')}>+ Yeni İlan</button>
      </div>
      
      <div className="tabs">
        <button onClick={() => setActiveTab('active')}>
          Aktif İlanlar ({listings.filter(l => l.status === 'active').length})
        </button>
        <button onClick={() => setActiveTab('sold')}>
          Satılmış İlanlar ({listings.filter(l => l.status === 'sold').length})
        </button>
      </div>
      
      <div className="listings-list">
        {listings.map(listing => (
          <div key={listing.id} className="listing-item">
            <img src={listing.images[0]?.image_url} alt={listing.title} />
            <div className="listing-details">
              <h3>{listing.title}</h3>
              <p>{listing.price} TL</p>
              <p>Kategori: {listing.category} | Durum: {listing.condition}</p>
              <p>Yayınlandı: {new Date(listing.created_at).toLocaleDateString('tr-TR')} | Görüntülenme: {listing.view_count}</p>
              {listing.status === 'active' && (
                <p className="warning">
                  ⚠️ İlan {Math.floor((new Date(listing.auto_delete_at) - new Date()) / (1000 * 60 * 60 * 24))} gün sonra otomatik silinecek
                </p>
              )}
            </div>
            <div className="actions">
              <button onClick={() => navigate(`/marketplace/edit/${listing.id}`)}>
                ✏️ Düzenle
              </button>
              {listing.status === 'active' && (
                <button onClick={() => handleMarkAsSold(listing.id)}>
                  ✅ Satıldı Olarak İşaretle
                </button>
              )}
              <button onClick={() => handleDelete(listing.id)}>
                🗑️ Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### Task 3.8-3.9: Mesajlaşma Sayfası ve Header Entegrasyonu
**Süre:** Ayrı modülde ele alınır  
**Referans:** `specs/013-messages/tasks.md`

**Not:** Mesajlaşma UI'ı merkezi DM sisteminde geliştirilir.

**Pazar İlanı Entegrasyonu:**
İlan detay sayfasında "Satıcıya Mesaj Gönder" butonu:

**Dosya:** `frontend/src/pages/Marketplace/ListingDetail.tsx`
```typescript
const handleContactSeller = async () => {
  try {
    const response = await api.post('/messages/conversations', {
      type: 'marketplace',
      reference_id: listingId,
      receiver_id: listing.seller_id,
      content: 'Merhaba, ürün hakkında bilgi alabilir miyim?',
    });
    navigate(`/dashboard/messages/${response.data.conversation_id}`);
  } catch (error) {
    console.error('Konuşma başlatılamadı:', error);
    alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
  }
};

// UI'da:
<button onClick={handleContactSeller} className="contact-btn">
  📩 Satıcıya Mesaj Gönder
</button>
```

**Detaylı UI Task'ları:**
- Mesajlaşma sayfası: `specs/013-messages/tasks.md` → Phase 4 & 5
- Header dropdown: `specs/013-messages/tasks.md` → Phase 3
- Polling: `specs/013-messages/tasks.md` → Phase 7

---

### Task 3.10: Routing Yapılandırması
**Süre:** 1 saat  
**Dosya:** `frontend/src/App.tsx`

```typescript
import MarketplaceHome from './pages/Marketplace/MarketplaceHome';
import CreateListing from './pages/Marketplace/CreateListing';
import ListingDetail from './pages/Marketplace/ListingDetail';
import MyListings from './pages/Marketplace/MyListings';

function App() {
  return (
    <Routes>
      {/* ... existing routes ... */}
      <Route path="/marketplace" element={<MarketplaceHome />} />
      <Route path="/marketplace/create" element={<CreateListing />} />
      <Route path="/marketplace/my-listings" element={<MyListings />} />
      <Route path="/marketplace/:listingId" element={<ListingDetail />} />
      {/* Mesajlar route'u merkezi sistemde: /dashboard/messages */}
    </Routes>
  );
}
```

---

### Task 3.11: CSS Styling
**Süre:** 4 saat  
**Dosya:** `frontend/src/styles/marketplace.css`

(Tüm marketplace sayfaları için responsive CSS stilleri)

---

## 🧪 PHASE 4: Testing (1 gün)

### Task 4.1: Backend Unit Tests
**Süre:** 4 saat  
- İlan oluşturma testi
- Filtreleme ve pagination testi
- Mesajlaşma testi
- Rate limiting testi

---

### Task 4.2: Frontend E2E Tests
**Süre:** 3 saat  
- İlan oluşturma ve görüntüleme flow
- Mesajlaşma flow
- Filtreleme ve arama

---

### Task 4.3: Manual QA
**Süre:** 2 saat  
- Image upload testi (farklı boyutlar, formatlar)
- Responsive design testi
- Accessibility testi

---

## 📚 PHASE 5: Documentation & Deployment (0.5 gün)

### Task 5.1: API Documentation (Swagger)
**Süre:** 1 saat  
- Marketplace endpoints dökümante et

---

### Task 5.2: User Guide
**Süre:** 1 saat  
- "Nasıl İlan Verilir?" rehberi
- "Mesajlaşma Nasıl Çalışır?" rehberi

---

### Task 5.3: Admin Panel (Raporları Görüntüleme)
**Süre:** 2 saat  
- Admin panelinde rapor edilen ilanları listeleme
- Rapor inceleme ve işlem yapma (ilan silme, uyarı gönderme)

---

## ✅ KABUL KRİTERLERİ

- [ ] Email doğrulanmış öğrenciler ilan oluşturabilir
- [ ] Maksimum 3 fotoğraf yüklenebilir (JPEG/PNG, 5MB/dosya)
- [ ] İlanlar kategori, fiyat, durum, arama ile filtrelenebilir
- [ ] Default olarak kullanıcının üniversitesinden ilanlar gösterilir
- [ ] İlan detayında satıcıya mesaj gönderilebilir
- [ ] Platform içi DM sistemi çalışır
- [ ] Kullanıcı kendi ilanlarını düzenleyebilir, satıldı işaretleyebilir, silebilir
- [ ] 60 gün sonra satılmayan ilanlar otomatik silinir
- [ ] Uygunsuz ilanlar raporlanabilir
- [ ] Rate limiting çalışır (10 ilan/gün, 20 mesaj/saat, 5 rapor/gün)
- [ ] Responsive tasarım (desktop, tablet, mobile)

---

## 📊 BACKLOG / GELECEK GELİŞTİRMELER

- [ ] Real-time mesajlaşma (WebSocket)
- [ ] Bildirim sistemi
- [ ] Favori ilanlar
- [ ] Fiyat önerisi sistemi
- [ ] Kullanıcı değerlendirme sistemi (satıcı puanı)
- [ ] AI destekli fiyat önerisi
- [ ] Kampüs içi teslimat noktaları
- [ ] QR kod ile hızlı ilan gösterme

---

**Son Güncelleme:** 2025-01-01  
**Tahmini Tamamlanma Süresi:** 10-12 gün  
**Hazırlayan:** AI Assistant

