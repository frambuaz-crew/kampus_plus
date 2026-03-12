# 008 - KARİYER (İŞ, STAJ VE PROJE İLANLARI) - IMPLEMENTATION TASKS

## 📋 GENEL BAKIŞ

**Tahmini Süre:** 8-10 gün  
**Öncelik:** Orta  
**Bağımlılıklar:** 
- 002-register-page (✅ Tamamlanmalı)
- 003-login-page (✅ Tamamlanmalı)
- 004-dashboard (✅ Tamamlanmalı)
- 007-marketplace (✅ DM sistemi paylaşılıyor)

---

## 📦 PHASE 0: Infrastructure Setup (0.5 gün)

### Task 0.1: Link Validation Utility
**Süre:** 2 saat  
**Açıklama:** Dış linklerin geçerli ve güvenli olduğunu doğrulayan utility fonksiyonu

**Dosya:** `backend/app/utils/link_validator.py`

```python
import re
from urllib.parse import urlparse

ALLOWED_DOMAINS = [
    'linkedin.com',
    'kariyer.net',
    'indeed.com',
    'glassdoor.com',
    'sahibinden.com',
    'github.com',
    'behance.net',
    'dribbble.com'
]

SUSPICIOUS_PATTERNS = [
    r'bit\.ly',
    r'tinyurl',
    r'\.tk$',
    r'\.ml$',
    r'\.ga$',
    r'\.cf$',
    r'\.gq$'
]

def is_valid_url(url: str) -> bool:
    """URL formatını kontrol et"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def is_safe_url(url: str) -> tuple[bool, str]:
    """
    URL'nin güvenli olup olmadığını kontrol et
    Returns: (is_safe: bool, message: str)
    """
    if not is_valid_url(url):
        return False, "Geçersiz URL formatı"
    
    # Suspicious pattern kontrolü
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            return False, "Kısaltılmış veya şüpheli link kullanılamaz"
    
    # Domain kontrolü (opsiyonel - strict mode)
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    
    # HTTPS kontrolü (önerilen)
    if parsed.scheme != 'https':
        return False, "Sadece HTTPS linkleri kullanılabilir"
    
    return True, "Link güvenli"
```

**Test:**
- `https://linkedin.com/jobs/123` → ✅ Geçerli
- `http://example.com` → ❌ HTTP (HTTPS değil)
- `https://bit.ly/abc` → ❌ Kısaltılmış link
- `invalid-url` → ❌ Geçersiz format

---

### Task 0.2: Cron Job Setup (APScheduler)
**Süre:** 1.5 saat  
**Açıklama:** 90 gün sonra ilan arşivleme cron job'ı

**Dosya:** `backend/app/tasks/career_cleanup.py`

```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from app.models import CareerListing
from app.utils.email_sender import send_email

scheduler = BackgroundScheduler()

def archive_expired_listings():
    """90 günden eski aktif ilanları arşivle"""
    expired_listings = db.query(CareerListing).filter(
        CareerListing.auto_archive_at < datetime.now(),
        CareerListing.status == 'active'
    ).all()
    
    for listing in expired_listings:
        # Email gönder
        send_email(
            to=listing.creator.email,
            subject="İlanınız Arşivlendi",
            body=f"'{listing.title}' ilanınız 90 gün boyunca güncellenmediği için arşivlendi."
        )
        
        # İlanı arşivle
        listing.status = 'archived'
        listing.archived_at = datetime.now()
        db.commit()
    
    print(f"[{datetime.now()}] {len(expired_listings)} ilan arşivlendi.")

# Her gün saat 02:00'da çalıştır
scheduler.add_job(archive_expired_listings, 'cron', hour=2, minute=0)
scheduler.start()
```

**Entegrasyon:** `main.py` içinde scheduler'ı başlat

---

## 🗄️ PHASE 1: Database Setup (1 gün)

### Task 1.1: Alembic Migration - Career Tables
**Süre:** 3 saat  
**Açıklama:** Database tablolarını oluştur

**Migration Dosyası:** `alembic/versions/xxx_create_career_tables.py`

```python
def upgrade():
    # career_listings tablosu
    op.create_table(
        'career_listings',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('creator_user_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('listing_type', sa.String(20), nullable=False),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('sector', sa.String(50), nullable=False),
        sa.Column('location', sa.String(100), nullable=False),
        sa.Column('company_name', sa.String(200), nullable=True),
        sa.Column('external_link', sa.String(500), nullable=True),
        sa.Column('salary_range', sa.String(100), nullable=True),
        sa.Column('required_position', sa.String(200), nullable=True),
        sa.Column('duration', sa.String(20), nullable=True),
        sa.Column('payment_type', sa.String(50), nullable=True),
        sa.Column('status', sa.String(20), default='active', nullable=False),
        sa.Column('view_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.Column('auto_archive_at', sa.DateTime(), server_default=sa.text("NOW() + INTERVAL '90 days'")),
        sa.CheckConstraint("char_length(description) >= 50", name='check_description_length'),
        sa.CheckConstraint("listing_type IN ('job', 'internship', 'startup', 'project')", name='check_listing_type'),
        sa.CheckConstraint("status IN ('active', 'archived', 'deleted')", name='check_status'),
        sa.CheckConstraint("sector IN ('Yazılım', 'Mühendislik', 'Tasarım', 'Pazarlama', 'Veri Bilimi', 'Diğer')", name='check_sector')
    )
    
    # İndeksler
    op.create_index('idx_career_listings_creator', 'career_listings', ['creator_user_id'])
    op.create_index('idx_career_listings_type', 'career_listings', ['listing_type'])
    op.create_index('idx_career_listings_sector', 'career_listings', ['sector'])
    op.create_index('idx_career_listings_status', 'career_listings', ['status'])
    op.create_index('idx_career_listings_created_at', 'career_listings', [sa.text('created_at DESC')])
    
    # career_applications tablosu
    op.create_table(
        'career_applications',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('listing_id', sa.UUID(), sa.ForeignKey('career_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('applicant_user_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id'), nullable=True),  # Merkezi DM sistemi
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('listing_id', 'applicant_user_id', name='unique_application')
    )
    
    op.create_index('idx_career_applications_listing', 'career_applications', ['listing_id'])
    op.create_index('idx_career_applications_applicant', 'career_applications', ['applicant_user_id'])
    
    # career_messages tablosu (merkezi DM sisteminin bir parçası)
    # Not: Detaylı bilgi için specs/013-messages/tasks.md dosyasına bakın
    op.create_table(
        'career_messages',
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
    
    op.create_index('idx_career_messages_conversation', 'career_messages', ['conversation_id'])
    op.create_index('idx_career_messages_sender', 'career_messages', ['sender_id'])
    op.create_index('idx_career_messages_receiver', 'career_messages', ['receiver_id'])
    
    # career_reports tablosu
    op.create_table(
        'career_reports',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('listing_id', sa.UUID(), sa.ForeignKey('career_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reporter_user_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('reviewed_by', sa.UUID(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'reviewed', 'action_taken')", name='check_report_status'),
        sa.UniqueConstraint('listing_id', 'reporter_user_id', name='unique_user_report')
    )
    
    op.create_index('idx_career_reports_status', 'career_reports', ['status'])
    op.create_index('idx_career_reports_listing', 'career_reports', ['listing_id'])
```

**Test:**
```bash
alembic upgrade head
```

---

### Task 1.2: SQLAlchemy Models
**Süre:** 2 saat  
**Açıklama:** ORM modellerini oluştur

**Dosya:** `backend/app/models/career.py`

```python
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
# SQLite kullanılır - UUID için String(36) kullanılır (PostgreSQL PG_UUID değil)
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime, timedelta

class CareerListing(Base):
    __tablename__ = "career_listings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    listing_type = Column(String(20), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    sector = Column(String(50), nullable=False)
    location = Column(String(100), nullable=False)
    
    # İş/Staj için
    company_name = Column(String(200), nullable=True)
    external_link = Column(String(500), nullable=True)
    salary_range = Column(String(100), nullable=True)
    
    # Startup/Proje için
    required_position = Column(String(200), nullable=True)
    duration = Column(String(20), nullable=True)
    payment_type = Column(String(50), nullable=True)
    
    status = Column(String(20), default="active", nullable=False)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    archived_at = Column(DateTime, nullable=True)
    auto_archive_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=90))
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_user_id], back_populates="career_listings")
    applications = relationship("CareerApplication", back_populates="listing", cascade="all, delete-orphan")
    reports = relationship("CareerReport", back_populates="listing", cascade="all, delete-orphan")

class CareerApplication(Base):
    __tablename__ = "career_applications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("career_listings.id", ondelete="CASCADE"), nullable=False)
    applicant_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)  # Merkezi DM sistemi
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    listing = relationship("CareerListing", back_populates="applications")
    applicant = relationship("User", foreign_keys=[applicant_user_id])
    conversation = relationship("Conversation", foreign_keys=[conversation_id])

class CareerMessage(Base):
    __tablename__ = "career_messages"
    
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

class CareerReport(Base):
    __tablename__ = "career_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("career_listings.id", ondelete="CASCADE"), nullable=False)
    reporter_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Relationships
    listing = relationship("CareerListing", back_populates="reports")
    reporter = relationship("User", foreign_keys=[reporter_user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
```

**Dosya:** `backend/app/models/__init__.py` (güncelle)
```python
from .career import CareerListing, CareerApplication, CareerMessage, CareerReport
```

---

### Task 1.3: Pydantic Schemas
**Süre:** 2 saat  
**Açıklama:** Request/Response DTO'larını oluştur

**Dosya:** `backend/app/schemas/career.py`

```python
from pydantic import BaseModel, Field, validator, HttpUrl
from typing import List, Optional
from datetime import datetime

# Listing Schemas
class ListingCreateRequest(BaseModel):
    listing_type: str
    title: str = Field(..., min_length=10, max_length=100)
    description: str = Field(..., min_length=50, max_length=2000)
    sector: str
    location: str
    
    # İş/Staj için
    company_name: Optional[str] = Field(None, max_length=200)
    external_link: Optional[str] = None
    salary_range: Optional[str] = Field(None, max_length=100)
    
    # Startup/Proje için
    required_position: Optional[str] = Field(None, max_length=200)
    duration: Optional[str] = None
    payment_type: Optional[str] = None
    
    @validator('listing_type')
    def validate_listing_type(cls, v):
        allowed = ['job', 'internship', 'startup', 'project']
        if v not in allowed:
            raise ValueError(f'listing_type şunlardan biri olmalı: {allowed}')
        return v
    
    @validator('sector')
    def validate_sector(cls, v):
        allowed = ['Yazılım', 'Mühendislik', 'Tasarım', 'Pazarlama', 'Veri Bilimi', 'Diğer']
        if v not in allowed:
            raise ValueError(f'Sektör şunlardan biri olmalı: {allowed}')
        return v
    
    @validator('external_link')
    def validate_external_link(cls, v, values):
        listing_type = values.get('listing_type')
        if listing_type in ['job', 'internship']:
            if not v:
                raise ValueError('İş/Staj ilanları için dış link zorunludur')
            # Link validation (link_validator.py kullanılacak)
        elif listing_type in ['startup', 'project']:
            if v:
                raise ValueError('Startup/Proje ilanları için dış link kullanılamaz')
        return v

class ListingUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=10, max_length=100)
    description: Optional[str] = Field(None, min_length=50, max_length=2000)
    sector: Optional[str] = None
    location: Optional[str] = None
    company_name: Optional[str] = None
    external_link: Optional[str] = None
    salary_range: Optional[str] = None
    required_position: Optional[str] = None
    duration: Optional[str] = None
    payment_type: Optional[str] = None

class CreatorInfoResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    university: str
    department: str
    is_admin: bool

class ListingResponse(BaseModel):
    id: str
    creator: CreatorInfoResponse
    listing_type: str
    title: str
    description: str
    sector: str
    location: str
    company_name: Optional[str]
    external_link: Optional[str]
    salary_range: Optional[str]
    required_position: Optional[str]
    duration: Optional[str]
    payment_type: Optional[str]
    status: str
    view_count: int
    application_count: Optional[int]  # Sadece startup/proje için
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime]

class ListingListResponse(BaseModel):
    listings: List[ListingResponse]
    total: int
    page: int
    pages: int

# Application Schemas
class ApplicationCreateRequest(BaseModel):
    message_text: str = Field(..., min_length=10, max_length=500)

class ApplicationResponse(BaseModel):
    id: str
    listing: ListingResponse
    created_at: datetime

# Report Schema
class ReportCreateRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)
```

---

## 🔌 PHASE 2: Backend API Implementation (3.5 gün)

### Task 2.1: İlan Oluşturma Endpoint
**Süre:** 4 saat  
**Dosya:** `backend/app/routers/career.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, CareerListing
from app.schemas.career import ListingCreateRequest, ListingResponse
from app.dependencies import get_current_user
from app.utils.link_validator import is_safe_url
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/career", tags=["Career"])

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
    
    # Rate limiting (5 ilan/gün) - Adminler hariç
    if not current_user.is_admin:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_listings_count = db.query(CareerListing).filter(
            CareerListing.creator_user_id == current_user.id,
            CareerListing.created_at >= today_start
        ).count()
        
        if today_listings_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Günlük ilan oluşturma limitini aştınız (5 ilan/gün)."
            )
    
    # Link validation (İş/Staj için)
    if data.listing_type in ['job', 'internship']:
        if not data.external_link:
            raise HTTPException(status_code=400, detail="İş/Staj ilanları için dış link zorunludur")
        
        is_safe, message = is_safe_url(data.external_link)
        if not is_safe:
            raise HTTPException(status_code=400, detail=message)
    
    # İlan oluştur
    new_listing = CareerListing(
        creator_user_id=current_user.id,
        listing_type=data.listing_type,
        title=data.title,
        description=data.description,
        sector=data.sector,
        location=data.location,
        company_name=data.company_name,
        external_link=data.external_link,
        salary_range=data.salary_range,
        required_position=data.required_position,
        duration=data.duration,
        payment_type=data.payment_type,
        auto_archive_at=datetime.utcnow() + timedelta(days=90)
    )
    
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    
    return new_listing
```

**Test:**
- Email doğrulanmamış kullanıcı 403 almalı
- 5 ilan oluşturduktan sonra 429 almalı (admin hariç)
- İş/Staj için link olmadan 400 almalı
- Geçersiz link ile 400 almalı
- Geçerli veri ile 201 dönmeli

---

### Task 2.2: İlan Listeleme Endpoint (Filtreleme + Pagination)
**Süre:** 4 saat  
**Dosya:** `backend/app/routers/career.py`

```python
from sqlalchemy import or_, and_, func
from typing import Optional

@router.get("/listings", response_model=ListingListResponse)
def list_listings(
    university_id: Optional[str] = None,
    listing_type: Optional[str] = None,
    sector: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest",  # newest | oldest
    page: int = 1,
    limit: int = 24,
    db: Session = Depends(get_db)
):
    # Base query
    query = db.query(CareerListing).filter(
        CareerListing.status == 'active'
    )
    
    # Filters
    if university_id:
        query = query.join(User, CareerListing.creator_user_id == User.id).filter(
            User.university_id == university_id
        )
    
    if listing_type:
        query = query.filter(CareerListing.listing_type == listing_type)
    
    if sector:
        query = query.filter(CareerListing.sector == sector)
    
    if location:
        query = query.filter(CareerListing.location == location)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                CareerListing.title.ilike(search_pattern),
                CareerListing.description.ilike(search_pattern),
                CareerListing.company_name.ilike(search_pattern)
            )
        )
    
    # Sorting
    if sort == "newest":
        query = query.order_by(CareerListing.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(CareerListing.created_at.asc())
    
    # Pagination
    total = query.count()
    listings = query.offset((page - 1) * limit).limit(limit).all()
    
    # Application count for startup/project listings
    for listing in listings:
        if listing.listing_type in ['startup', 'project']:
            listing.application_count = len(listing.applications)
    
    return {
        "listings": listings,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
```

---

### Task 2.3: İlan Detay Endpoint (View Count Increment)
**Süre:** 1.5 saat  
**Dosya:** `backend/app/routers/career.py`

```python
@router.get("/listings/{listing_id}", response_model=ListingResponse)
def get_listing_detail(
    listing_id: str,
    db: Session = Depends(get_db)
):
    listing = db.query(CareerListing).filter(
        CareerListing.id == listing_id,
        CareerListing.status == 'active'
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    # View count artır
    listing.view_count += 1
    db.commit()
    
    # Application count (startup/project için)
    if listing.listing_type in ['startup', 'project']:
        listing.application_count = len(listing.applications)
    
    return listing
```

---

### Task 2.4: İlan Güncelleme Endpoint
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/career.py`

```python
@router.put("/listings/{listing_id}", response_model=ListingResponse)
def update_listing(
    listing_id: str,
    data: ListingUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    listing = db.query(CareerListing).filter(
        CareerListing.id == listing_id,
        CareerListing.creator_user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı veya size ait değil")
    
    # Update fields
    update_data = data.dict(exclude_unset=True)
    
    # Link validation (eğer güncelleniyorsa)
    if 'external_link' in update_data and listing.listing_type in ['job', 'internship']:
        is_safe, message = is_safe_url(update_data['external_link'])
        if not is_safe:
            raise HTTPException(status_code=400, detail=message)
    
    for key, value in update_data.items():
        setattr(listing, key, value)
    
    listing.updated_at = datetime.utcnow()
    listing.auto_archive_at = datetime.utcnow() + timedelta(days=90)  # Reset archive timer
    db.commit()
    db.refresh(listing)
    
    return listing
```

---

### Task 2.5: İlan "Arşivle" Endpoint
**Süre:** 1 saat  
**Dosya:** `backend/app/routers/career.py`

```python
@router.patch("/listings/{listing_id}/archive")
def archive_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    listing = db.query(CareerListing).filter(
        CareerListing.id == listing_id,
        CareerListing.creator_user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    listing.status = 'archived'
    listing.archived_at = datetime.utcnow()
    db.commit()
    
    return {"message": "İlan arşivlendi"}
```

---

### Task 2.6: İlan Silme Endpoint
**Süre:** 1 saat  
**Dosya:** `backend/app/routers/career.py`

```python
@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    listing = db.query(CareerListing).filter(
        CareerListing.id == listing_id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    # Sadece ilan sahibi veya admin silebilir
    if listing.creator_user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    db.delete(listing)
    db.commit()
    
    return
```

---

### Task 2.7: Kullanıcının İlanları Endpoint
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/career.py`

```python
@router.get("/my-listings", response_model=List[ListingResponse])
def get_my_listings(
    status: Optional[str] = None,  # active | archived
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(CareerListing).filter(
        CareerListing.creator_user_id == current_user.id
    )
    
    if status:
        query = query.filter(CareerListing.status == status)
    
    listings = query.order_by(CareerListing.created_at.desc()).all()
    
    # Application count for startup/project listings
    for listing in listings:
        if listing.listing_type in ['startup', 'project']:
            listing.application_count = len(listing.applications)
    
    return listings
```

---

### Task 2.8: Başvuru Yapma Endpoint (Startup/Proje için)
**Süre:** 3 saat  
**Dosya:** `backend/app/routers/career.py`

**Not:** Başvuru sistemi merkezi DM sistemini kullanır. Detaylar için `specs/013-messages/tasks.md` dosyasına bakın.

```python
from app.models import CareerApplication
from app.services.conversation_service import ConversationService

@router.post("/listings/{listing_id}/apply", status_code=status.HTTP_201_CREATED)
def apply_to_listing(
    listing_id: str,
    data: ApplicationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # İlanı kontrol et
    listing = db.query(CareerListing).filter(
        CareerListing.id == listing_id,
        CareerListing.status == 'active'
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    # Sadece startup/proje ilanlarına başvurulabilir
    if listing.listing_type not in ['startup', 'project']:
        raise HTTPException(
            status_code=400,
            detail="İş/Staj ilanlarına platform üzerinden başvuru yapılamaz. İlan linkini kullanın."
        )
    
    # Kendi ilanına başvuramaz
    if listing.creator_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi ilanınıza başvuramazsınız")
    
    # Daha önce başvurmuş mu?
    existing_application = db.query(CareerApplication).filter(
        CareerApplication.listing_id == listing_id,
        CareerApplication.applicant_user_id == current_user.id
    ).first()
    
    if existing_application:
        raise HTTPException(status_code=400, detail="Bu ilana zaten başvurdunuz")
    
    # Rate limiting (10 başvuru/gün)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_applications_count = db.query(CareerApplication).filter(
        CareerApplication.applicant_user_id == current_user.id,
        CareerApplication.created_at >= today_start
    ).count()
    
    if today_applications_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Günlük başvuru limitini aştınız (10 başvuru/gün)."
        )
    
    # Merkezi DM sisteminde konuşma başlat
    conversation = ConversationService.get_or_create_conversation(
        db=db,
        type='career',
        reference_id=listing_id,
        user1_id=current_user.id,
        user2_id=listing.creator_user_id
    )
    
    # İlk mesajı gönder (merkezi sistem kullanılır)
    # Bu kısım specs/013-messages/tasks.md'deki mantıkla yapılır
    message_content = f"Merhaba, '{listing.title}' ilanınıza başvurmak istiyorum. {data.message_text}"
    
    # CareerMessage oluştur
    new_message = CareerMessage(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        receiver_id=listing.creator_user_id,
        content=message_content
    )
    db.add(new_message)
    db.flush()
    
    # Başvuru kaydı oluştur
    new_application = CareerApplication(
        listing_id=listing_id,
        applicant_user_id=current_user.id,
        conversation_id=conversation.id
    )
    
    db.add(new_application)
    
    # Conversation güncelle (last_message_at, unread_count)
    conversation.last_message_at = datetime.utcnow()
    if conversation.user1_id == listing.creator_user_id:
        conversation.user1_unread_count += 1
    else:
        conversation.user2_unread_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "conversation_id": conversation.id,
        "message": "Başvurunuz gönderildi. İlan sahibi mesajlarınızı görebilecek."
    }
```

**Test:**
- İş/Staj ilanına başvuru 400 almalı
- Kendi ilanına başvuru 400 almalı
- Daha önce başvurmuşsa 400 almalı
- 10 başvuru sonrası 429 almalı
- Geçerli başvuru 201 dönmeli ve merkezi DM'de konuşma oluşturulmalı

---

### Task 2.9: Başvuruları Görüntüleme Endpoint (İlan Sahibi için)
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/career.py`

```python
@router.get("/listings/{listing_id}/applications")
def get_listing_applications(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # İlanı kontrol et
    listing = db.query(CareerListing).filter(
        CareerListing.id == listing_id,
        CareerListing.creator_user_id == current_user.id
    ).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı veya size ait değil")
    
    # Başvuruları çek
    applications = db.query(CareerApplication).filter(
        CareerApplication.listing_id == listing_id
    ).order_by(CareerApplication.created_at.desc()).all()
    
    result = []
    for app in applications:
        result.append({
            "id": str(app.id),
            "applicant": {
                "id": str(app.applicant.id),
                "first_name": app.applicant.first_name,
                "last_name": app.applicant.last_name,
                "university": app.applicant.university,
                "department": app.applicant.department
            },
            "message_preview": app.message.message_text[:100] if app.message else "",
            "created_at": app.created_at
        })
    
    return {"applications": result, "total": len(result)}
```

---

### Task 2.10: Kullanıcının Başvuruları Endpoint
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/career.py`

```python
@router.get("/my-applications", response_model=List[ApplicationResponse])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    applications = db.query(CareerApplication).filter(
        CareerApplication.applicant_user_id == current_user.id
    ).order_by(CareerApplication.created_at.desc()).all()
    
    return applications
```

---

### Task 2.11: İlan Raporlama Endpoint
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/career.py`

```python
from app.models import CareerReport

@router.post("/listings/{listing_id}/report", status_code=status.HTTP_201_CREATED)
def report_listing(
    listing_id: str,
    data: ReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # İlanı kontrol et
    listing = db.query(CareerListing).filter(CareerListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
    
    # Daha önce rapor edilmiş mi?
    existing_report = db.query(CareerReport).filter(
        CareerReport.listing_id == listing_id,
        CareerReport.reporter_user_id == current_user.id
    ).first()
    
    if existing_report:
        raise HTTPException(status_code=400, detail="Bu ilanı zaten raporladınız")
    
    # Rate limiting (5 rapor/gün)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_reports_count = db.query(CareerReport).filter(
        CareerReport.reporter_user_id == current_user.id,
        CareerReport.created_at >= today_start
    ).count()
    
    if today_reports_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Günlük rapor gönderme limitini aştınız (5 rapor/gün)."
        )
    
    # Rapor oluştur
    new_report = CareerReport(
        listing_id=listing_id,
        reporter_user_id=current_user.id,
        reason=data.reason
    )
    
    db.add(new_report)
    db.commit()
    
    return {"message": "Rapor başarıyla gönderildi. İnceleme yapılacaktır."}
```

---

### Task 2.12: Router'ları Main App'e Ekle
**Süre:** 30 dakika  
**Dosya:** `backend/app/main.py`

```python
from app.routers import career

app.include_router(career.router)
```

---

## 🎨 PHASE 3: Frontend Implementation (3.5 gün)

### Task 3.1: Career Service (API Client)
**Süre:** 2 saat  
**Dosya:** `frontend/src/services/careerService.ts`

```typescript
import axios from 'axios';

const API_BASE = '/api/v1/career';

export const careerService = {
  // Listings
  async createListing(data: any) {
    const response = await axios.post(`${API_BASE}/listings`, data);
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
  
  async archiveListing(listingId: string) {
    const response = await axios.patch(`${API_BASE}/listings/${listingId}/archive`);
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
  
  // Applications (Startup/Project only)
  async applyToListing(listingId: string, messageText: string) {
    const response = await axios.post(`${API_BASE}/listings/${listingId}/apply`, {
      message_text: messageText
    });
    return response.data;
  },
  
  async getListingApplications(listingId: string) {
    const response = await axios.get(`${API_BASE}/listings/${listingId}/applications`);
    return response.data;
  },
  
  async getMyApplications() {
    const response = await axios.get(`${API_BASE}/my-applications`);
    return response.data;
  },
  
  // Report
  async reportListing(listingId: string, reason: string) {
    const response = await axios.post(`${API_BASE}/listings/${listingId}/report`, { reason });
    return response.data;
  }
};
```

---

### Task 3.2: Kariyer Ana Sayfası (Listing Grid)
**Süre:** 6 saat  
**Dosya:** `frontend/src/pages/Career/CareerHome.tsx`

*(Marketplace'e benzer yapı, detayları atlanabilir)*

---

### Task 3.3: İlan Kartı Component
**Süre:** 2 saat  
**Dosya:** `frontend/src/pages/Career/components/ListingCard.tsx`

---

### Task 3.4: Filtre Barı Component
**Süre:** 3 saat  
**Dosya:** `frontend/src/pages/Career/components/FilterBar.tsx`

---

### Task 3.5: İlan Oluşturma Sayfası
**Süre:** 6 saat  
**Dosya:** `frontend/src/pages/Career/CreateListing.tsx`

**Önemli:** Kategori seçimine göre form alanları dinamik olarak gösterilmeli

---

### Task 3.6: İlan Detay Sayfası (2 Farklı Layout)
**Süre:** 5 saat  
**Dosya:** `frontend/src/pages/Career/ListingDetail.tsx`

**Logic:**
- İş/Staj → "Başvur" butonu (dış link'e yönlendir)
- Startup/Proje → "İlgileniyorum" butonu (başvuru modalı aç)

---

### Task 3.7: İlanlarım Sayfası
**Süre:** 4 saat  
**Dosya:** `frontend/src/pages/Career/MyListings.tsx`

---

### Task 3.8: Başvurularım Sayfası
**Süre:** 3 saat  
**Dosya:** `frontend/src/pages/Career/MyApplications.tsx`

---

### Task 3.9: Routing Yapılandırması
**Süre:** 1 saat  
**Dosya:** `frontend/src/App.tsx`

```typescript
import CareerHome from './pages/Career/CareerHome';
import CreateListing from './pages/Career/CreateListing';
import ListingDetail from './pages/Career/ListingDetail';
import MyListings from './pages/Career/MyListings';
import MyApplications from './pages/Career/MyApplications';

function App() {
  return (
    <Routes>
      {/* ... existing routes ... */}
      <Route path="/career" element={<CareerHome />} />
      <Route path="/career/create" element={<CreateListing />} />
      <Route path="/career/my-listings" element={<MyListings />} />
      <Route path="/career/my-applications" element={<MyApplications />} />
      <Route path="/career/:listingId" element={<ListingDetail />} />
    </Routes>
  );
}
```

---

### Task 3.10: CSS Styling
**Süre:** 4 saat  
**Dosya:** `frontend/src/styles/career.css`

(Tüm career sayfaları için responsive CSS stilleri)

---

## 🧪 PHASE 4: Testing (1 gün)

### Task 4.1: Backend Unit Tests
**Süre:** 4 saat  
- İlan oluşturma testi
- Filtreleme ve pagination testi
- Başvuru sistemi testi
- Rate limiting testi
- Link validation testi

---

### Task 4.2: Frontend E2E Tests
**Süre:** 3 saat  
- İlan oluşturma ve görüntüleme flow
- Başvuru yapma flow (startup/proje)
- Dış link'e yönlendirme (iş/staj)
- Filtreleme ve arama

---

### Task 4.3: Manual QA
**Süre:** 2 saat  
- Form validation testi
- Responsive design testi
- Accessibility testi

---

## 📚 PHASE 5: Documentation & Deployment (0.5 gün)

### Task 5.1: API Documentation (Swagger)
**Süre:** 1 saat  
- Career endpoints dökümante et

---

### Task 5.2: User Guide
**Süre:** 1 saat  
- "Nasıl İlan Verilir?" rehberi
- "Başvuru Nasıl Yapılır?" rehberi

---

### Task 5.3: Admin Panel (Raporları Görüntüleme)
**Süre:** 2 saat  
- Admin panelinde rapor edilen ilanları listeleme
- Rapor inceleme ve işlem yapma (ilan silme, uyarı gönderme)

---

## ✅ KABUL KRİTERLERİ

- [ ] Email doğrulanmış öğrenciler ilan oluşturabilir
- [ ] 4 ilan türü desteklenir (İş, Staj, Startup, Proje)
- [ ] İş/Staj için dış link zorunlu, güvenli link kontrolü yapılır
- [ ] Startup/Proje için platform içi başvuru (DM) sistemi çalışır
- [ ] İlanlar kategori, sektör, lokasyon, arama ile filtrelenebilir
- [ ] Default olarak kullanıcının üniversitesinden ilanlar gösterilir
- [ ] Kullanıcı kendi ilanlarını düzenleyebilir, arşivleyebilir, silebilir
- [ ] 90 gün sonra güncellenmeyen ilanlar otomatik arşivlenir
- [ ] Uygunsuz ilanlar raporlanabilir
- [ ] Rate limiting çalışır (5 ilan/gün, 10 başvuru/gün, 5 rapor/gün)
- [ ] Adminler sınırsız ilan oluşturabilir
- [ ] Responsive tasarım (desktop, tablet, mobile)

---

## 📊 BACKLOG / GELECEK GELİŞTİRMELER

- [ ] CV/Portfolio yükleme
- [ ] AI destekli ilan-öğrenci eşleştirmesi
- [ ] Şirket hesapları (doğrulanmış işverenler)
- [ ] İlan öne çıkarma (premium)
- [ ] Video/Fotoğraf ekleme
- [ ] Başvuru takip sistemi
- [ ] Mülakat/Randevu planlama
- [ ] Email bildirimleri
- [ ] Favori ilanlar
- [ ] İlan paylaşma (WhatsApp, LinkedIn)

---

**Son Güncelleme:** 2025-01-01  
**Tahmini Tamamlanma Süresi:** 8-10 gün  
**Hazırlayan:** AI Assistant

