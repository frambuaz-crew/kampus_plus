# 010 - Profilim Sayfası - Implementation Tasks

## 📋 Genel Bakış

Profilim sayfasının tüm özelliklerini (username sistemi, profil düzenleme, istatistikler) backend ve frontend'de implement etmek.

---

## 🎯 Fazlar ve Tahmini Süreler

| Faz | Açıklama | Tahmini Süre |
|-----|----------|--------------|
| **Phase 1** | Database ve Backend Setup | 1 gün |
| **Phase 2** | Profil API Endpoints | 1 gün |
| **Phase 3** | İstatistik API Endpoints | 1 gün |
| **Phase 4** | Frontend Layout ve Routing | 1 gün |
| **Phase 5** | Profil Bilgi ve Hakkımda UI | 1 gün |
| **Phase 6** | İstatistikler UI | 1 gün |
| **Phase 7** | Testing ve Bug Fixes | 0.5 gün |

**Toplam Tahmini Süre:** 5-6 gün

---

## Phase 1: Database ve Backend Setup (1 gün)

### Task 1.1: Database Migration - `users` Tablosuna Alanlar Ekle
**Dosya:** `backend/alembic/versions/xxx_add_profile_fields.py`

**Eklenecek Alanlar:**
```sql
-- Username sistemi
ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE NOT NULL;
ALTER TABLE users ADD COLUMN username_last_changed_at TIMESTAMP DEFAULT NULL;

-- Profil bilgileri
ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL;

-- Timestamps
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP;

-- Index
CREATE INDEX idx_users_username ON users(username);
```

**Migration Script için Özel Lojik:**
```python
def upgrade():
    # Önce alanları ekle (nullable)
    op.add_column('users', sa.Column('username', sa.String(50), nullable=True))
    
    # Mevcut kullanıcılar için username oluştur
    connection = op.get_bind()
    result = connection.execute("SELECT id, first_name, last_name FROM users")
    for row in result:
        username = f"{row.first_name}_{row.last_name}".lower()
        # Türkçe karakter değiştir
        turkish_map = {'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c'}
        for tr_char, en_char in turkish_map.items():
            username = username.replace(tr_char, en_char)
        
        # Özel karakter temizle
        username = ''.join(c for c in username if c.isalnum() or c == '_')
        
        # Benzersizlik kontrolü (çakışma varsa numara ekle)
        counter = 2
        original_username = username
        while connection.execute(f"SELECT id FROM users WHERE username = '{username}'").first():
            username = f"{original_username}{counter}"
            counter += 1
        connection.execute(f"UPDATE users SET username = '{username}' WHERE id = {row.id}")
    
    # Şimdi NOT NULL yap
    op.alter_column('users', 'username', nullable=False)
    op.create_unique_constraint('uq_users_username', 'users', ['username'])
```

**Test:**
- Migration'ı çalıştır: `alembic upgrade head`
- Veritabanında alanları kontrol et
- Mevcut kullanıcılar için username oluşturulduğunu doğrula
- Çakışma durumunda numara eklendiğini kontrol et

---

### Task 1.2: Pydantic Models - Profil Şemaları Oluştur
**Dosya:** `backend/app/schemas/profile.py`

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

# Profil Bilgi Response
class ProfileResponse(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str
    email: str
    university: str
    department: str
    student_number: str
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None
    username_last_changed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Username Güncelleme Request
class UsernameUpdateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    
    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError('Username sadece harf, rakam ve alt tire içerebilir')
        if any(char in 'ğüşıöçĞÜŞİÖÇ' for char in v):
            raise ValueError('Username Türkçe karakter içeremez')
        return v.lower()

# Bio Güncelleme Request
class BioUpdateRequest(BaseModel):
    bio: str = Field(..., max_length=500)

# Profil Resmi Response
class ProfilePictureResponse(BaseModel):
    success: bool
    message: str
    profile_picture_url: str
```

---

### Task 1.3: File Upload Helper - Profil Resmi Yükleme Fonksiyonu
**Dosya:** `backend/app/utils/file_upload.py`

```python
import os
import uuid
from fastapi import UploadFile, HTTPException
from PIL import Image
import io

UPLOAD_DIR = "uploads/profiles"
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_FORMATS = {"image/jpeg", "image/png", "image/webp"}
MIN_DIMENSION = 200
MAX_DIMENSION = 2000

os.makedirs(UPLOAD_DIR, exist_ok=True)

async def save_profile_picture(file: UploadFile, user_id: int) -> str:
    """
    Profil resmini kaydeder ve yolunu döner.
    """
    # 1. Format kontrolü
    if file.content_type not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Geçersiz dosya formatı. JPG, PNG veya WebP yükleyebilirsiniz."
        )
    
    # 2. Dosyayı oku
    contents = await file.read()
    
    # 3. Boyut kontrolü
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Dosya çok büyük. Maksimum 2MB yükleyebilirsiniz."
        )
    
    # 4. Görüntü boyutu kontrolü
    try:
        image = Image.open(io.BytesIO(contents))
        width, height = image.size
        
        if width < MIN_DIMENSION or height < MIN_DIMENSION:
            raise HTTPException(
                status_code=400,
                detail=f"Görüntü çok küçük. Minimum {MIN_DIMENSION}x{MIN_DIMENSION}px olmalı."
            )
        
        if width > MAX_DIMENSION or height > MAX_DIMENSION:
            raise HTTPException(
                status_code=400,
                detail=f"Görüntü çok büyük. Maksimum {MAX_DIMENSION}x{MAX_DIMENSION}px olmalı."
            )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="Geçersiz görüntü dosyası."
        )
    
    # 5. Dosya adı oluştur (unique)
    file_extension = file.filename.split('.')[-1]
    filename = f"{user_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # 6. Kaydet
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # 7. Relative path döner
    return f"/{UPLOAD_DIR}/{filename}"

def delete_profile_picture(filepath: str):
    """
    Profil resmini siler.
    """
    full_path = filepath.lstrip('/')
    if os.path.exists(full_path):
        os.remove(full_path)
```

**Test:**
- 2MB'lık JPG dosyası yükle → Başarılı
- 5MB'lık dosya yükle → Hata
- PDF dosyası yükle → Hata
- 100x100px resim yükle → Hata (çok küçük)

---

### Task 1.4: Username Helper - Otomatik Username Oluşturma
**Dosya:** `backend/app/utils/username_generator.py`

```python
from sqlalchemy.orm import Session
from app.models.user import User

def generate_unique_username(first_name: str, last_name: str, db: Session) -> str:
    """
    Ad ve soyad'dan unique username oluşturur.
    Örn: Ali Yılmaz → ali_yilmaz
    Çakışma varsa: ali_yilmaz2, ali_yilmaz3, ...
    """
    base_username = f"{first_name}_{last_name}".lower()
    base_username = base_username.replace(' ', '_')
    
    # Türkçe karakterleri değiştir
    turkish_map = {
        'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c',
        'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'İ': 'i', 'Ö': 'o', 'Ç': 'c'
    }
    for tr_char, en_char in turkish_map.items():
        base_username = base_username.replace(tr_char, en_char)
    
    # Özel karakterleri kaldır (sadece a-z, 0-9, _ kalacak)
    base_username = ''.join(c for c in base_username if c.isalnum() or c == '_')
    
    # Benzersizlik kontrolü
    username = base_username
    counter = 2
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1
    
    return username

def can_change_username(last_changed_at) -> tuple[bool, str]:
    """
    Username değiştirme iznini kontrol eder.
    Returns: (izin_var, hata_mesajı)
    """
    if last_changed_at is None:
        return True, ""
    
    from datetime import datetime, timedelta
    days_since_change = (datetime.utcnow() - last_changed_at).days
    
    if days_since_change < 30:
        next_change_date = (last_changed_at + timedelta(days=30)).strftime('%Y-%m-%d')
        return False, f"Son 30 gün içinde username değiştirdiniz. Bir sonraki değişiklik: {next_change_date}"
    
    return True, ""
```

**Test:**
- `generate_unique_username("Ali", "Yılmaz", db)` → `ali_yilmaz`
- Çakışma durumunda → `ali_yilmaz2`
- `can_change_username(25 gün önce)` → False, hata mesajı
- `can_change_username(35 gün önce)` → True

---

### Task 1.5: Rate Limiting - Profil İşlemleri için Rate Limit
**Dosya:** `backend/app/utils/rate_limiter.py` (Güncelleme)

```python
# Mevcut dosyaya ekle

PROFILE_RATE_LIMITS = {
    "username_update": (3, 60),      # 3 deneme/dakika
    "picture_upload": (5, 3600),     # 5 yükleme/saat
}

def check_profile_rate_limit(key: str, identifier: str) -> bool:
    """
    Profil işlemleri için rate limit kontrolü.
    """
    if key not in PROFILE_RATE_LIMITS:
        return True
    
    max_attempts, window = PROFILE_RATE_LIMITS[key]
    cache_key = f"profile:{key}:{identifier}"
    
    return check_rate_limit(cache_key, max_attempts, window)
```

---

## Phase 2: Profil API Endpoints (1 gün)

### Task 2.1: GET /api/v1/profile/me - Profil Bilgilerini Getir
**Dosya:** `backend/app/routers/profile.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.profile import ProfileResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcının kendi profil bilgilerini döner.
    """
    return current_user
```

**Test:**
- JWT token ile istek at → Profil bilgileri dönmeli
- Geçersiz token → 401

---

### Task 2.2: PATCH /api/v1/profile/username - Username Güncelle
**Dosya:** `backend/app/routers/profile.py`

```python
from app.schemas.profile import UsernameUpdateRequest
from app.utils.username_generator import can_change_username
from app.utils.rate_limiter import check_profile_rate_limit
from datetime import datetime, timedelta

@router.patch("/username")
def update_username(
    request: UsernameUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Username'i günceller (30 günde 1 kez).
    """
    # 1. Rate limit kontrolü
    if not check_profile_rate_limit("username_update", str(current_user.id)):
        raise HTTPException(status_code=429, detail="Çok fazla deneme. Lütfen 1 dakika sonra tekrar deneyin.")
    
    # 2. 30 gün kontrolü
    can_change, error_msg = can_change_username(current_user.username_last_changed_at)
    if not can_change:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # 3. Benzersizlik kontrolü
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(status_code=400, detail="Bu username zaten kullanımda")
    
    # 4. Güncelle
    current_user.username = request.username
    current_user.username_last_changed_at = datetime.utcnow()
    db.commit()
    
    next_change_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
    
    return {
        "success": True,
        "message": "Username başarıyla güncellendi",
        "username": current_user.username,
        "next_change_allowed_at": next_change_date
    }
```

**Test:**
- Normal username güncelleme → Başarılı
- Aynı username'i başka kullanıcı kullanıyor → 400
- 25 gün önce değiştirilmiş → 400
- Geçersiz format (tire, Türkçe karakter) → 422 (Pydantic validation)

---

### Task 2.3: POST /api/v1/profile/picture - Profil Resmi Yükle
**Dosya:** `backend/app/routers/profile.py`

```python
from fastapi import UploadFile, File
from app.utils.file_upload import save_profile_picture, delete_profile_picture

@router.post("/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Profil resmini yükler.
    """
    # 1. Rate limit kontrolü
    if not check_profile_rate_limit("picture_upload", str(current_user.id)):
        raise HTTPException(status_code=429, detail="Çok fazla yükleme. Lütfen 1 saat sonra tekrar deneyin.")
    
    # 2. Eski resmi sil (varsa)
    if current_user.profile_picture_url:
        try:
            delete_profile_picture(current_user.profile_picture_url)
        except:
            pass  # Eski resim silinmezse devam et
    
    # 3. Yeni resmi kaydet
    filepath = await save_profile_picture(file, current_user.id)
    
    # 4. Veritabanını güncelle
    current_user.profile_picture_url = filepath
    db.commit()
    
    return {
        "success": True,
        "message": "Profil resmi başarıyla yüklendi",
        "profile_picture_url": filepath
    }
```

**Test:**
- 1MB JPG yükle → Başarılı, eski resim silinmeli
- 5MB dosya → 400
- PDF yükle → 400
- 5 kez yükle → 6. kez 429 (rate limit)

---

### Task 2.4: DELETE /api/v1/profile/picture - Profil Resmini Sil
**Dosya:** `backend/app/routers/profile.py`

```python
@router.delete("/picture")
def delete_profile_picture_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Profil resmini siler (varsayılana döner).
    """
    if current_user.profile_picture_url:
        try:
            delete_profile_picture(current_user.profile_picture_url)
        except:
            pass
        
        current_user.profile_picture_url = None
        db.commit()
    
    return {
        "success": True,
        "message": "Profil resmi silindi"
    }
```

---

### Task 2.5: PATCH /api/v1/profile/bio - Bio Güncelle
**Dosya:** `backend/app/routers/profile.py`

```python
from app.schemas.profile import BioUpdateRequest

@router.patch("/bio")
def update_bio(
    request: BioUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bio/Hakkımda günceller.
    """
    current_user.bio = request.bio
    db.commit()
    
    return {
        "success": True,
        "message": "Bio başarıyla güncellendi"
    }
```

---

## Phase 3: İstatistik API Endpoints (1 gün)

### Task 3.1: GET /api/v1/profile/listings - İlanlarımı Getir
**Dosya:** `backend/app/routers/profile.py`

```python
@router.get("/listings")
def get_my_listings(
    status: str = "active",  # active, sold, expired
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcının ilanlarını listeler.
    """
    from app.models.marketplace import MarketplaceListing
    
    query = db.query(MarketplaceListing).filter(
        MarketplaceListing.seller_id == current_user.id
    )
    
    if status == "active":
        query = query.filter(MarketplaceListing.status == "active")
    elif status == "sold":
        query = query.filter(MarketplaceListing.status == "sold")
    elif status == "expired":
        query = query.filter(MarketplaceListing.status == "expired")
    
    total = query.count()
    listings = query.order_by(MarketplaceListing.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": total > page * limit,
        "listings": [
            {
                "id": listing.id,
                "title": listing.title,
                "description": listing.description,
                "price": listing.price,
                "category": listing.category,
                "status": listing.status,
                "image_urls": listing.image_urls or [],
                "view_count": listing.view_count,
                "message_count": listing.message_count or 0,
                "created_at": listing.created_at.isoformat()
            }
            for listing in listings
        ]
    }
```

---

### Task 3.2: GET /api/v1/profile/forum-topics - Forum Konularımı Getir
**Dosya:** `backend/app/routers/profile.py`

(Benzer mantık, forum_topics tablosundan kullanıcının konularını çek)

---

### Task 3.3: GET /api/v1/profile/forum-replies - Forum Cevaplarımı Getir
**Dosya:** `backend/app/routers/profile.py`

(Benzer mantık, forum_replies tablosundan kullanıcının cevaplarını çek)

---

### Task 3.4: GET /api/v1/profile/applications - Başvurularımı Getir
**Dosya:** `backend/app/routers/profile.py`

(Benzer mantık, career_applications tablosundan kullanıcının başvurularını çek)

---

## Phase 4: Frontend Layout ve Routing (1 gün)

### Task 4.1: Profil Layout Komponenti Oluştur
**Dosya:** `frontend/src/layouts/ProfileLayout.tsx`

```tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import ProfileSidebar from '../components/profile/ProfileSidebar';

const ProfileLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (Sabit) */}
      <Header />
      
      {/* Main Content */}
      <div className="flex">
        {/* Profile Sidebar */}
        <ProfileSidebar />
        
        {/* Content Area */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProfileLayout;
```

---

### Task 4.2: Profil Sidebar Komponenti
**Dosya:** `frontend/src/components/profile/ProfileSidebar.tsx`

```tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProfileSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const menuItems = [
    { path: '/dashboard/profile', label: '📊 Profil Bilgi', exact: true },
    { path: '/dashboard/profile/about', label: '📝 Hakkımda' },
    { path: '/dashboard/profile/listings', label: '🛍️ İlanlarım' },
    { path: '/dashboard/profile/forum', label: '💬 Forum' },
    { path: '/dashboard/profile/applications', label: '💼 Başvurularım' },
  ];
  
  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };
  
  // Profil resmi veya baş harfler
  const getProfileDisplay = () => {
    if (user.profile_picture_url) {
      return <img src={user.profile_picture_url} alt="Profil" className="w-20 h-20 rounded-full" />;
    }
    
    const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500'];
    const colorIndex = user.id % colors.length;
    
    return (
      <div className={`w-20 h-20 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white text-2xl font-bold`}>
        {initials}
      </div>
    );
  };
  
  return (
    <aside className="w-60 bg-white border-r border-gray-200 min-h-screen p-6">
      {/* Profil Özeti */}
      <div className="flex flex-col items-center mb-6">
        {getProfileDisplay()}
        <p className="mt-3 font-semibold text-gray-800">@{user.username}</p>
        <p className="text-sm text-gray-600">{user.first_name} {user.last_name}</p>
      </div>
      
      <hr className="my-4" />
      
      {/* Menü */}
      <nav>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block py-2 px-3 rounded mb-1 ${
              isActive(item.path, item.exact)
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default ProfileSidebar;
```

---

### Task 4.3: Routing Ayarları
**Dosya:** `frontend/src/App.tsx` (Güncelleme)

```tsx
import ProfileLayout from './layouts/ProfileLayout';
import ProfileInfo from './pages/profile/ProfileInfo';
import ProfileAbout from './pages/profile/ProfileAbout';
import ProfileListings from './pages/profile/ProfileListings';
import ProfileForum from './pages/profile/ProfileForum';
import ProfileApplications from './pages/profile/ProfileApplications';

// Route ekle
<Route path="/dashboard/profile" element={<ProfileLayout />}>
  <Route index element={<ProfileInfo />} />
  <Route path="about" element={<ProfileAbout />} />
  <Route path="listings" element={<ProfileListings />} />
  <Route path="forum" element={<ProfileForum />} />
  <Route path="applications" element={<ProfileApplications />} />
</Route>
```

---

## Phase 5: Profil Bilgi ve Hakkımda UI (1 gün)

### Task 5.1: Profil Bilgi Sayfası
**Dosya:** `frontend/src/pages/profile/ProfileInfo.tsx`

(Profil resmi yükleme, username düzenleme, bio düzenleme komponentlerini içerir)

---

### Task 5.2: Profil Resmi Yükleme Komponenti
**Dosya:** `frontend/src/components/profile/ProfilePictureUpload.tsx`

(Dosya seçme, yükleme, silme işlemleri)

---

### Task 5.3: Username Düzenleme Komponenti
**Dosya:** `frontend/src/components/profile/UsernameEdit.tsx`

(Edit modu, validation, kaydetme)

---

### Task 5.4: Bio Düzenleme Komponenti
**Dosya:** `frontend/src/components/profile/BioEdit.tsx`

(Textarea, karakter sayacı, kaydetme)

---

### Task 5.5: Hakkımda Sayfası
**Dosya:** `frontend/src/pages/profile/ProfileAbout.tsx`

(BioEdit komponentini fullPage mode'da kullanır)

---

## Phase 6: İstatistikler UI (1 gün)

### Task 6.1: İlanlarım Sayfası
**Dosya:** `frontend/src/pages/profile/ProfileListings.tsx`

- 3 tab: Aktif, Satıldı, Süresi Doldu
- Her ilan için card gösterimi
- "Daha Fazla Yükle" butonu
- İlan düzenleme/silme/satıldı işaretleme aksiyonları

---

### Task 6.2: Forum Mesajlarım Sayfası
**Dosya:** `frontend/src/pages/profile/ProfileForum.tsx`

- 2 tab: Açtığım Konular, Yazdığım Cevaplar
- "Daha Fazla Yükle" butonu
- Her konu/cevap için "Konuya Git" butonu

---

### Task 6.3: Başvurularım Sayfası
**Dosya:** `frontend/src/pages/profile/ProfileApplications.tsx`

- 4 kategori gösterim (İş, Staj, Startup, Proje)
- "Daha Fazla Yükle" butonu
- Her başvuru için "İlana Git" veya "Mesajlaşmaya Git" butonu

---

## Phase 7: Testing ve Bug Fixes (0.5 gün)

### Test Senaryoları

1. **Username değiştirme:**
   - Normal akış
   - Zaten kullanımda
   - 30 gün limiti
   - Geçersiz format

2. **Profil resmi yükleme:**
   - Normal akış
   - Büyük dosya
   - Geçersiz format
   - Eski resim silinmesi

3. **Pagination:**
   - İlk sayfa
   - Daha fazla yükle
   - Son sayfa (buton kaybolur)

4. **Bio düzenleme:**
   - Normal akış
   - 500 karakter limiti

5. **Responsive tasarım:**
   - Desktop
   - Tablet
   - Mobile (sidebar hamburger menü)

---

## ✅ Tamamlanma Kriterleri

- [ ] Database migration başarılı (users tablosuna yeni alanlar)
- [ ] Mevcut kullanıcılar için username otomatik oluşturuldu
- [ ] Tüm API endpoints çalışıyor (GET, POST, PATCH, DELETE)
- [ ] Frontend routing düzgün (ProfileLayout, 5 alt sayfa)
- [ ] Profil resmi yükleme/silme çalışıyor (max 2MB, 3 format)
- [ ] Username değiştirme çalışıyor (benzersizlik, 30 gün limiti)
- [ ] Bio düzenleme çalışıyor (max 500 karakter)
- [ ] İlanlarım pagination çalışıyor ("Daha Fazla Yükle")
- [ ] Forum mesajlarım pagination çalışıyor
- [ ] Başvurularım pagination çalışıyor
- [ ] Mobile responsive tasarım (sidebar hamburger menü)
- [ ] Tüm rate limitler çalışıyor

---

## 📦 Dependencies

### Backend
- `Pillow` (resim işleme için)
- `python-multipart` (file upload için)

```bash
pip install Pillow python-multipart
```

### Frontend
- Mevcut kütüphaneler yeterli (React, React Router, Axios)

---

**Tahmini Toplam Süre:** 5-6 gün  
**Son Güncelleme:** 2 Ocak 2026  
**Durum:** Tasks Hazır, Implementation Başlayabilir 🚀

