# 005 - Forum Sayfası - Implementation Tasks

## 📋 Genel Bakış

Bu doküman, Forum özelliğinin implementasyon task'lerini içerir. Forum, Technopat benzeri klasik forum yapısında, üniversite öğrencilerine özel bir tartışma platformudur.

---

## 📊 Proje Özeti

| Özellik | Süre Tahmini | Zorluk | Öncelik |
|---------|--------------|---------|---------|
| Forum Platform | 7-10 gün | Yüksek | Kritik |

**Toplam Task Sayısı:** 45  
**Tahmini Süre:** 7-10 gün (2 developer: 1 backend, 1 frontend)

---

## 🎯 Phase 0: Database & Infrastructure (1 gün)

### Task 0.1: Database Schema Oluştur
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Forum için gerekli tüm tabloları oluştur.

**Tablolar:**
```sql
-- Kategoriler
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(10),
    category_type VARCHAR(20) NOT NULL,  -- 'university', 'department', 'general'
    description TEXT,
    thread_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Konular (Threads)
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Cevaplar
CREATE TABLE replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Etiketler
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(30) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE thread_tags (
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (thread_id, tag_id)
);

-- Dosyalar
CREATE TABLE thread_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reply_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Yararlı İşaretleri
CREATE TABLE thread_helpful (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(thread_id, user_id)
);

CREATE TABLE reply_helpful (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(reply_id, user_id)
);

-- Raporlar
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL REFERENCES users(id),
    content_type VARCHAR(20) NOT NULL,
    content_id UUID NOT NULL,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_threads_category ON threads(category_id);
CREATE INDEX idx_threads_user ON threads(user_id);
CREATE INDEX idx_threads_created ON threads(created_at DESC);
CREATE INDEX idx_threads_pinned ON threads(is_pinned, created_at DESC);
CREATE INDEX idx_replies_thread ON replies(thread_id);
CREATE INDEX idx_replies_created ON replies(created_at);
CREATE INDEX idx_reports_status ON reports(status);
```

**Test Kriterleri:**
- [x] Tüm tablolar oluşturuldu
- [x] Foreign key'ler çalışıyor
- [x] Index'ler eklendi

---

### Task 0.2: Alembic Migration Script
**Süre:** 30 dakika  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 0.1

**Açıklama:**  
Forum tablolarını için Alembic migration script'i oluştur.

**Konum:** `alembic/versions/xxx_add_forum_tables.py`

**Test Kriterleri:**
- [x] `alembic upgrade head` çalışıyor
- [x] `alembic downgrade -1` çalışıyor

---

### Task 0.3: Kategori Seed Data
**Süre:** 1 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 0.1

**Açıklama:**  
Başlangıç kategorilerini veritabanına ekle (seed script).

**Konum:** `scripts/seed_categories.py`

**Kategoriler:**
```python
# Üniversiteler (Konya için 5, gelecekte daha fazla eklenebilir)
universities = [
    {"name": "Selçuk Üniversitesi", "slug": "selcuk-universitesi", "icon": "📍"},
    {"name": "Konya Teknik Üniversitesi", "slug": "konya-teknik-universitesi", "icon": "📍"},
    {"name": "Necmettin Erbakan Üniversitesi", "slug": "necmettin-erbakan-universitesi", "icon": "📍"},
    {"name": "KTO Karatay Üniversitesi", "slug": "kto-karatay-universitesi", "icon": "📍"},
    {"name": "Konya Gıda ve Tarım Üniversitesi", "slug": "konya-gida-tarim-universitesi", "icon": "📍"},
]

# Bölümler (Register page'deki 20 bölüm)
departments = [
    {"name": "Bilgisayar Mühendisliği", "slug": "bilgisayar-muhendisligi", "icon": "🖥️"},
    {"name": "Yazılım Mühendisliği", "slug": "yazilim-muhendisligi", "icon": "💾"},
    {"name": "Elektrik-Elektronik Mühendisliği", "slug": "elektrik-elektronik-muhendisligi", "icon": "⚡"},
    {"name": "İnşaat Mühendisliği", "slug": "insaat-muhendisligi", "icon": "🏗️"},
    {"name": "Makine Mühendisliği", "slug": "makine-muhendisligi", "icon": "🔬"},
    {"name": "Endüstri Mühendisliği", "slug": "endustri-muhendisligi", "icon": "⚙️"},
    {"name": "İşletme", "slug": "isletme", "icon": "🎓"},
    {"name": "Tıp", "slug": "tip", "icon": "💊"},
    {"name": "Hukuk", "slug": "hukuk", "icon": "⚖️"},
    {"name": "Mimarlık", "slug": "mimarlik", "icon": "🎨"},
    # ... diğer 10 bölüm
]

# Genel Konular
general = [
    {"name": "Kariyer & Staj", "slug": "kariyer-staj", "icon": "💼"},
    {"name": "Proje Ortakları", "slug": "proje-ortaklari", "icon": "🤝"},
    {"name": "Sosyal Etkinlikler", "slug": "sosyal-etkinlikler", "icon": "🎉"},
    {"name": "Sınav & Ders Notları", "slug": "sinav-ders-notlari", "icon": "📖"},
    {"name": "Genel Tartışma", "slug": "genel-tartisma", "icon": "💡"},
]
```

**Test Kriterleri:**
- [x] 5 üniversite kategorisi eklendi
- [x] 20 bölüm kategorisi eklendi
- [x] 5 genel kategori eklendi
- [x] Slug'lar unique

---

### Task 0.4: Dosya Yükleme Sistemi (Setup)
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Dosya yükleme için klasör yapısı ve yardımcı fonksiyonlar.

**Konum:** `app/utils/file_upload.py`

**Özellikler:**
- Local storage için `uploads/forum/` klasörü
- Dosya adı sanitization (güvenlik)
- Dosya tipi validation
- Dosya boyutu kontrolü (max 10 MB)
- Unique dosya adı (UUID + orijinal ad)

**Fonksiyonlar:**
```python
def validate_file_type(file: UploadFile) -> bool:
    """İzin verilen dosya tiplerini kontrol et"""
    allowed_extensions = ['.pdf', '.docx', '.zip', '.py', '.java', '.cpp', '.js', '.txt', '.jpg', '.png']
    allowed_mimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ...]
    return True/False

def validate_file_size(file: UploadFile, max_mb: int = 10) -> bool:
    """Dosya boyutunu kontrol et"""
    ...

def save_forum_file(file: UploadFile, upload_type: str) -> dict:
    """Dosyayı kaydet ve bilgilerini döndür"""
    # upload_type: 'thread' veya 'reply'
    return {
        "file_name": "orijinal_ad.pdf",
        "file_path": "uploads/forum/threads/uuid_orijinal_ad.pdf",
        "file_size": 1024000,
        "file_type": "application/pdf"
    }

def delete_forum_file(file_path: str):
    """Dosyayı sil"""
    ...
```

**Test Kriterleri:**
- [x] Dosya yükleme çalışıyor
- [x] İzin verilmeyen tipler reddediliyor
- [x] 10 MB'dan büyük dosyalar reddediliyor
- [x] Dosya adı sanitize ediliyor

---

## 🔧 Phase 1: Backend - Category & Thread List (2 gün)

### Task 1.1: Category Schema (Pydantic)
**Süre:** 30 dakika  
**Atanan:** Backend Developer

**Açıklama:**  
Kategori için Pydantic schema'ları oluştur.

**Konum:** `app/schemas/forum.py`

```python
from pydantic import BaseModel
from typing import Literal
from datetime import datetime

class CategoryBase(BaseModel):
    id: str
    name: str
    slug: str
    icon: str | None
    category_type: Literal["university", "department", "general"]
    thread_count: int
    reply_count: int
    last_activity: datetime | None

class CategoryListResponse(BaseModel):
    universities: list[CategoryBase]
    departments: list[CategoryBase]
    general: list[CategoryBase]
```

**Test Kriterleri:**
- [x] Schema validation çalışıyor

---

### Task 1.2: GET /api/v1/forum/categories Endpoint
**Süre:** 1 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.1

**Açıklama:**  
Tüm kategorileri gruplu şekilde dönen endpoint.

**Konum:** `app/routers/forum.py`

```python
@router.get("/categories", response_model=CategoryListResponse)
async def get_categories(db: Session = Depends(get_db)):
    """
    Tüm forum kategorilerini 3 gruba ayrılmış şekilde döner.
    - Üniversiteler
    - Bölümler
    - Genel Konular
    """
    universities = db.query(Category).filter(
        Category.category_type == "university"
    ).order_by(Category.thread_count.desc()).all()
    
    departments = db.query(Category).filter(
        Category.category_type == "department"
    ).order_by(Category.thread_count.desc()).all()
    
    general = db.query(Category).filter(
        Category.category_type == "general"
    ).order_by(Category.display_order).all()
    
    return {
        "universities": universities,
        "departments": departments,
        "general": general
    }
```

**Test Kriterleri:**
- [x] Endpoint çalışıyor
- [x] 3 grup dönüyor
- [x] thread_count doğru hesaplanıyor

---

### Task 1.3: Thread Schema (Pydantic)
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Thread (konu) için Pydantic schema'ları.

**Konum:** `app/schemas/forum.py`

```python
class UserBasicInfo(BaseModel):
    id: str
    first_name: str
    last_name: str
    university: str | None

class FileInfo(BaseModel):
    id: str
    file_name: str
    file_size: int
    file_type: str | None

class ThreadListItem(BaseModel):
    id: str
    title: str
    content_preview: str  # İlk 200 karakter
    author: UserBasicInfo
    category: CategoryBase
    is_pinned: bool
    reply_count: int
    helpful_count: int
    view_count: int
    files: list[FileInfo]
    tags: list[str]
    created_at: datetime
    last_activity: datetime

class ThreadListResponse(BaseModel):
    category: CategoryBase
    threads: list[ThreadListItem]
    pagination: dict

class ThreadCreateRequest(BaseModel):
    category_id: str
    title: str  # 10-200 chars
    content: str  # 20-10,000 chars
    tags: list[str] = []  # Max 5
    
    @validator('title')
    def validate_title(cls, v):
        if len(v) < 10 or len(v) > 200:
            raise ValueError('Başlık 10-200 karakter olmalı')
        return v
    
    @validator('content')
    def validate_content(cls, v):
        if len(v) < 20 or len(v) > 10000:
            raise ValueError('İçerik 20-10,000 karakter olmalı')
        return v
    
    @validator('tags')
    def validate_tags(cls, v):
        if len(v) > 5:
            raise ValueError('Max 5 etiket eklenebilir')
        for tag in v:
            if len(tag) > 30:
                raise ValueError('Etiket max 30 karakter olmalı')
        return v
```

**Test Kriterleri:**
- [x] Validation çalışıyor
- [x] Title/content uzunluk kontrolü
- [x] Tag sayısı kontrolü

---

### Task 1.4: GET /api/v1/forum/categories/{slug}/threads
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.3

**Açıklama:**  
Bir kategorideki threadleri listeleyen endpoint.

**Query Params:**
- `page` (default: 1)
- `per_page` (default: 20, max: 50)
- `sort_by` (newest, most_replied, most_helpful)
- `search` (opsiyonel)

**Implementasyon:**
```python
@router.get("/categories/{slug}/threads", response_model=ThreadListResponse)
async def get_category_threads(
    slug: str,
    page: int = 1,
    per_page: int = 20,
    sort_by: str = "newest",
    search: str = None,
    db: Session = Depends(get_db)
):
    """Bir kategorideki threadleri listeler"""
    
    # Kategoriyi bul
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    # Base query
    query = db.query(Thread).filter(
        Thread.category_id == category.id,
        Thread.is_deleted == False
    )
    
    # Arama
    if search:
        query = query.filter(
            or_(
                Thread.title.ilike(f"%{search}%"),
                Thread.content.ilike(f"%{search}%")
            )
        )
    
    # Sıralama
    if sort_by == "newest":
        query = query.order_by(Thread.is_pinned.desc(), Thread.created_at.desc())
    elif sort_by == "most_replied":
        query = query.order_by(Thread.is_pinned.desc(), Thread.reply_count.desc())
    elif sort_by == "most_helpful":
        query = query.order_by(Thread.is_pinned.desc(), Thread.helpful_count.desc())
    
    # Sayfalama
    total = query.count()
    threads = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "category": category,
        "threads": threads,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_threads": total,
            "total_pages": (total + per_page - 1) // per_page
        }
    }
```

**Test Kriterleri:**
- [x] Thread listesi dönüyor
- [x] Pinned threadler en üstte
- [x] Sıralama çalışıyor
- [x] Sayfalama çalışıyor
- [x] Arama çalışıyor

---

### Task 1.5: POST /api/v1/forum/threads (Konu Oluşturma)
**Süre:** 3 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.3, 0.4

**Açıklama:**  
Yeni thread oluşturma endpoint'i (dosya yükleme destekli).

**Request:** `multipart/form-data`

```python
@router.post("/threads", response_model=dict)
async def create_thread(
    category_id: str = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),  # JSON array string
    files: list[UploadFile] = File(None),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Yeni thread oluştur"""
    
    # Validation
    if len(title) < 10 or len(title) > 200:
        raise HTTPException(status_code=400, detail="Başlık 10-200 karakter olmalı")
    
    if len(content) < 20 or len(content) > 10000:
        raise HTTPException(status_code=400, detail="İçerik 20-10,000 karakter olmalı")
    
    # Kategori kontrolü
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    # Dosya kontrolü
    if files and len(files) > 3:
        raise HTTPException(status_code=400, detail="Max 3 dosya yüklenebilir")
    
    uploaded_files = []
    if files:
        for file in files:
            if not validate_file_type(file):
                raise HTTPException(status_code=400, detail=f"Geçersiz dosya tipi: {file.filename}")
            if not validate_file_size(file, max_mb=10):
                raise HTTPException(status_code=400, detail=f"Dosya çok büyük: {file.filename}")
            
            file_info = save_forum_file(file, "thread")
            uploaded_files.append(file_info)
    
    # Thread oluştur
    thread = Thread(
        category_id=category_id,
        user_id=current_user.id,
        title=title,
        content=content
    )
    db.add(thread)
    db.flush()
    
    # Dosyaları kaydet
    for file_info in uploaded_files:
        thread_file = ThreadFile(
            thread_id=thread.id,
            file_name=file_info["file_name"],
            file_path=file_info["file_path"],
            file_size=file_info["file_size"],
            file_type=file_info["file_type"]
        )
        db.add(thread_file)
    
    # Etiketleri işle
    if tags:
        tag_list = json.loads(tags)
        for tag_name in tag_list[:5]:  # Max 5
            tag_name = tag_name.lower().strip()
            if len(tag_name) > 30:
                continue
            
            # Tag var mı kontrol et, yoksa oluştur
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name, usage_count=1)
                db.add(tag)
                db.flush()
            else:
                tag.usage_count += 1
            
            # Thread-tag ilişkisi
            thread_tag = ThreadTag(thread_id=thread.id, tag_id=tag.id)
            db.add(thread_tag)
    
    # Kategori thread_count güncelle
    category.thread_count += 1
    
    db.commit()
    
    return {"thread_id": str(thread.id), "message": "Konu başarıyla oluşturuldu"}
```

**Test Kriterleri:**
- [x] Thread oluşturuluyor
- [x] Dosyalar yükleniyor (max 3, max 10 MB)
- [x] Etiketler kaydediliyor
- [x] Kategori thread_count güncelleniyor
- [x] Validation çalışıyor

---

### Task 1.6: Backend Unit Tests (Phase 1)
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.1-1.5

**Açıklama:**  
Kategori ve thread listesi endpoint'leri için unit test'ler.

**Konum:** `tests/test_forum_categories.py`, `tests/test_forum_threads.py`

**Test Senaryoları:**
```python
def test_get_categories_success():
    """Kategoriler başarıyla getiriliyor"""
    ...

def test_get_category_threads_success():
    """Thread listesi başarıyla getiriliyor"""
    ...

def test_create_thread_success():
    """Thread başarıyla oluşturuluyor"""
    ...

def test_create_thread_invalid_title():
    """Geçersiz başlık reddediliyor"""
    ...

def test_create_thread_with_files():
    """Dosya yüklemeli thread oluşturuluyor"""
    ...

def test_create_thread_too_many_files():
    """4+ dosya reddediliyor"""
    ...

def test_create_thread_file_too_large():
    """10 MB'dan büyük dosya reddediliyor"""
    ...
```

**Test Kriterleri:**
- [x] Tüm test'ler pass
- [x] Coverage %85+

---

## 📄 Phase 2: Backend - Thread Detail & Replies (2 gün)

### Task 2.1: Reply Schema (Pydantic)
**Süre:** 30 dakika  
**Atanan:** Backend Developer

**Konum:** `app/schemas/forum.py`

```python
class ReplyItem(BaseModel):
    id: str
    content: str
    author: UserBasicInfo
    helpful_count: int
    is_helpful_by_me: bool
    files: list[FileInfo]
    can_edit: bool
    can_delete: bool
    created_at: datetime
    updated_at: datetime | None

class ThreadDetailResponse(BaseModel):
    thread: ThreadDetail
    replies: list[ReplyItem]

class ReplyCreateRequest(BaseModel):
    content: str  # 1-10,000 chars
    
    @validator('content')
    def validate_content(cls, v):
        if len(v) < 1 or len(v) > 10000:
            raise ValueError('İçerik 1-10,000 karakter olmalı')
        return v
```

---

### Task 2.2: GET /api/v1/forum/threads/{thread_id}
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 2.1

**Açıklama:**  
Thread detay + tüm cevaplar.

**Query Params:**
- `sort_replies` (oldest, newest, most_helpful)

```python
@router.get("/threads/{thread_id}", response_model=ThreadDetailResponse)
async def get_thread_detail(
    thread_id: str,
    sort_replies: str = "oldest",
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Thread detayı + cevapları döner"""
    
    # Thread bul
    thread = db.query(Thread).filter(
        Thread.id == thread_id,
        Thread.is_deleted == False
    ).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    
    # View count artır
    thread.view_count += 1
    
    # Kullanıcı bu thread'i yararlı bulmuş mu?
    is_helpful_by_me = db.query(ThreadHelpful).filter(
        ThreadHelpful.thread_id == thread_id,
        ThreadHelpful.user_id == current_user.id
    ).first() is not None
    
    # Kullanıcı düzenleme/silme yetkisi var mı?
    can_edit = (
        thread.user_id == current_user.id and 
        (datetime.utcnow() - thread.created_at).total_seconds() < 600  # 10 dakika
    ) or current_user.role == "admin"
    
    can_delete = can_edit
    
    # Cevapları getir
    replies_query = db.query(Reply).filter(
        Reply.thread_id == thread_id,
        Reply.is_deleted == False
    )
    
    if sort_replies == "oldest":
        replies_query = replies_query.order_by(Reply.created_at)
    elif sort_replies == "newest":
        replies_query = replies_query.order_by(Reply.created_at.desc())
    elif sort_replies == "most_helpful":
        replies_query = replies_query.order_by(Reply.helpful_count.desc())
    
    replies = replies_query.all()
    
    # Her cevap için is_helpful_by_me ve can_edit/delete hesapla
    reply_list = []
    for reply in replies:
        is_reply_helpful = db.query(ReplyHelpful).filter(
            ReplyHelpful.reply_id == reply.id,
            ReplyHelpful.user_id == current_user.id
        ).first() is not None
        
        can_edit_reply = (
            reply.user_id == current_user.id and
            (datetime.utcnow() - reply.created_at).total_seconds() < 600
        ) or current_user.role == "admin"
        
        reply_list.append({
            **reply.__dict__,
            "is_helpful_by_me": is_reply_helpful,
            "can_edit": can_edit_reply,
            "can_delete": can_edit_reply
        })
    
    db.commit()  # View count güncellemesi için
    
    return {
        "thread": {
            **thread.__dict__,
            "is_helpful_by_me": is_helpful_by_me,
            "can_edit": can_edit,
            "can_delete": can_delete
        },
        "replies": reply_list
    }
```

**Test Kriterleri:**
- [x] Thread detayı dönüyor
- [x] Cevaplar sıralı
- [x] View count artıyor
- [x] is_helpful_by_me doğru
- [x] can_edit/delete doğru

---

### Task 2.3: POST /api/v1/forum/threads/{thread_id}/replies
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 2.1, 0.4

**Açıklama:**  
Thread'e cevap ekleme (dosya yükleme destekli).

```python
@router.post("/threads/{thread_id}/replies", response_model=dict)
async def create_reply(
    thread_id: str,
    content: str = Form(...),
    files: list[UploadFile] = File(None),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Thread'e cevap ekle"""
    
    # Thread kontrolü
    thread = db.query(Thread).filter(
        Thread.id == thread_id,
        Thread.is_deleted == False
    ).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    
    # Validation
    if len(content) < 1 or len(content) > 10000:
        raise HTTPException(status_code=400, detail="İçerik 1-10,000 karakter olmalı")
    
    # Dosya kontrolü
    if files and len(files) > 3:
        raise HTTPException(status_code=400, detail="Max 3 dosya yüklenebilir")
    
    uploaded_files = []
    if files:
        for file in files:
            if not validate_file_type(file):
                raise HTTPException(status_code=400, detail=f"Geçersiz dosya tipi")
            if not validate_file_size(file, max_mb=10):
                raise HTTPException(status_code=400, detail=f"Dosya çok büyük")
            
            file_info = save_forum_file(file, "reply")
            uploaded_files.append(file_info)
    
    # Cevap oluştur
    reply = Reply(
        thread_id=thread_id,
        user_id=current_user.id,
        content=content
    )
    db.add(reply)
    db.flush()
    
    # Dosyaları kaydet
    for file_info in uploaded_files:
        reply_file = ReplyFile(
            reply_id=reply.id,
            file_name=file_info["file_name"],
            file_path=file_info["file_path"],
            file_size=file_info["file_size"],
            file_type=file_info["file_type"]
        )
        db.add(reply_file)
    
    # Thread reply_count güncelle
    thread.reply_count += 1
    
    # Kategori reply_count güncelle
    category = db.query(Category).filter(Category.id == thread.category_id).first()
    if category:
        category.reply_count += 1
    
    db.commit()
    
    return {"reply_id": str(reply.id), "message": "Cevap başarıyla eklendi"}
```

**Test Kriterleri:**
- [x] Cevap oluşturuluyor
- [x] Dosyalar yükleniyor
- [x] Thread reply_count güncelleniyor
- [x] Kategori reply_count güncelleniyor

---

### Task 2.4: POST /api/v1/forum/threads/{thread_id}/helpful
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Thread'i yararlı olarak işaretle (toggle).

```python
@router.post("/threads/{thread_id}/helpful", response_model=dict)
async def toggle_thread_helpful(
    thread_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Thread'i yararlı olarak işaretle veya işareti kaldır"""
    
    # Thread kontrolü
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    
    # Kullanıcı kendi thread'ini yararlı yapamaz
    if thread.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi konunuzu yararlı olarak işaretleyemezsiniz")
    
    # Varolan işaret var mı?
    existing = db.query(ThreadHelpful).filter(
        ThreadHelpful.thread_id == thread_id,
        ThreadHelpful.user_id == current_user.id
    ).first()
    
    if existing:
        # Kaldır (toggle off)
        db.delete(existing)
        thread.helpful_count -= 1
        is_helpful = False
    else:
        # Ekle (toggle on)
        helpful = ThreadHelpful(thread_id=thread_id, user_id=current_user.id)
        db.add(helpful)
        thread.helpful_count += 1
        is_helpful = True
    
    db.commit()
    
    return {
        "is_helpful": is_helpful,
        "helpful_count": thread.helpful_count
    }
```

**Test Kriterleri:**
- [x] Toggle on çalışıyor
- [x] Toggle off çalışıyor
- [x] Kendi thread'ine yararlı yapamıyor
- [x] helpful_count güncelleniyor

---

### Task 2.5: POST /api/v1/forum/replies/{reply_id}/helpful
**Süre:** 30 dakika  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 2.4

**Açıklama:**  
Cevabı yararlı olarak işaretle (toggle).

Aynı mantık, sadece `Reply` tablosu için.

---

### Task 2.6: PUT /api/v1/forum/threads/{thread_id} (Düzenleme)
**Süre:** 1.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Thread düzenleme (10 dakika içinde + admin).

```python
@router.put("/threads/{thread_id}", response_model=dict)
async def update_thread(
    thread_id: str,
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Thread'i düzenle"""
    
    # Thread bul
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    
    # Yetki kontrolü
    is_owner = thread.user_id == current_user.id
    is_within_time = (datetime.utcnow() - thread.created_at).total_seconds() < 600
    is_admin = current_user.role == "admin"
    
    if not ((is_owner and is_within_time) or is_admin):
        raise HTTPException(status_code=403, detail="Bu konuyu düzenleme yetkiniz yok")
    
    # Validation
    if len(title) < 10 or len(title) > 200:
        raise HTTPException(status_code=400, detail="Başlık 10-200 karakter olmalı")
    
    if len(content) < 20 or len(content) > 10000:
        raise HTTPException(status_code=400, detail="İçerik 20-10,000 karakter olmalı")
    
    # Güncelle
    thread.title = title
    thread.content = content
    thread.updated_at = datetime.utcnow()
    
    # Etiketleri güncelle (eski etiketleri sil, yenileri ekle)
    db.query(ThreadTag).filter(ThreadTag.thread_id == thread_id).delete()
    
    if tags:
        tag_list = json.loads(tags)
        for tag_name in tag_list[:5]:
            tag_name = tag_name.lower().strip()
            if len(tag_name) > 30:
                continue
            
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name, usage_count=1)
                db.add(tag)
                db.flush()
            
            thread_tag = ThreadTag(thread_id=thread.id, tag_id=tag.id)
            db.add(thread_tag)
    
    db.commit()
    
    return {"message": "Konu güncellendi"}
```

**Test Kriterleri:**
- [x] Sahibi 10 dakika içinde düzenleyebiliyor
- [x] Admin her zaman düzenleyebiliyor
- [x] 10 dakika sonra sahibi düzenleyemiyor
- [x] Etiketler güncelleniyor

---

### Task 2.7: DELETE /api/v1/forum/threads/{thread_id}
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Thread silme (soft delete).

```python
@router.delete("/threads/{thread_id}", response_model=dict)
async def delete_thread(
    thread_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Thread'i sil (soft delete)"""
    
    # Thread bul
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    
    # Yetki kontrolü
    is_owner = thread.user_id == current_user.id
    is_within_time = (datetime.utcnow() - thread.created_at).total_seconds() < 600
    is_admin = current_user.role == "admin"
    
    if not ((is_owner and is_within_time) or is_admin):
        raise HTTPException(status_code=403, detail="Bu konuyu silme yetkiniz yok")
    
    # Soft delete
    thread.is_deleted = True
    thread.deleted_at = datetime.utcnow()
    
    # Cevapları da soft delete
    db.query(Reply).filter(Reply.thread_id == thread_id).update({
        "is_deleted": True,
        "deleted_at": datetime.utcnow()
    })
    
    # Kategori thread_count ve reply_count güncelle
    category = db.query(Category).filter(Category.id == thread.category_id).first()
    if category:
        category.thread_count -= 1
        category.reply_count -= thread.reply_count
    
    db.commit()
    
    return {"message": "Konu silindi"}
```

**Test Kriterleri:**
- [x] Soft delete çalışıyor
- [x] Cevaplar da siliniyor
- [x] Kategori sayaçları güncelleniyor

---

### Task 2.8: Backend Unit Tests (Phase 2)
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 2.1-2.7

**Test Senaryoları:**
- Thread detay
- Cevap ekleme
- Yararlı işareti (thread + reply)
- Düzenleme (yetki kontrolü)
- Silme (yetki kontrolü)

**Test Kriterleri:**
- [x] Tüm test'ler pass
- [x] Coverage %85+

---

## 🚩 Phase 3: Backend - Search, Report, Admin (1 gün)

### Task 3.1: GET /api/v1/forum/search
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Forum genelinde arama.

**Query Params:**
- `q` (aranacak kelime)
- `category_id` (opsiyonel)
- `time_filter` (today, week, month, all)
- `sort_by` (relevance, newest, most_replied, most_helpful)
- `page`, `per_page`

```python
@router.get("/search", response_model=dict)
async def search_forum(
    q: str,
    category_id: str = None,
    time_filter: str = "all",
    sort_by: str = "relevance",
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """Forum'da arama yap"""
    
    # Base query
    query = db.query(Thread).filter(Thread.is_deleted == False)
    
    # Arama (title + content)
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Thread.title.ilike(search_term),
                Thread.content.ilike(search_term)
            )
        )
    
    # Kategori filtresi
    if category_id:
        query = query.filter(Thread.category_id == category_id)
    
    # Zaman filtresi
    if time_filter == "today":
        query = query.filter(Thread.created_at >= datetime.utcnow() - timedelta(days=1))
    elif time_filter == "week":
        query = query.filter(Thread.created_at >= datetime.utcnow() - timedelta(days=7))
    elif time_filter == "month":
        query = query.filter(Thread.created_at >= datetime.utcnow() - timedelta(days=30))
    
    # Sıralama
    if sort_by == "newest":
        query = query.order_by(Thread.created_at.desc())
    elif sort_by == "most_replied":
        query = query.order_by(Thread.reply_count.desc())
    elif sort_by == "most_helpful":
        query = query.order_by(Thread.helpful_count.desc())
    # relevance için PostgreSQL full-text search kullanılabilir (gelecek iyileştirme)
    
    # Sayfalama
    total = query.count()
    threads = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "results": threads,
        "total": total,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    }
```

**Test Kriterleri:**
- [x] Arama çalışıyor
- [x] Filtreler çalışıyor
- [x] Sayfalama çalışıyor

---

### Task 3.2: POST /api/v1/forum/reports
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
İçerik raporlama.

```python
@router.post("/reports", response_model=dict)
async def create_report(
    content_type: str = Form(...),  # 'thread' or 'reply'
    content_id: str = Form(...),
    reason: str = Form(...),  # 'spam', 'inappropriate', 'offtopic', 'harassment', 'other'
    description: str = Form(None),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """İçerik raporla"""
    
    # Validation
    if content_type not in ["thread", "reply"]:
        raise HTTPException(status_code=400, detail="Geçersiz content_type")
    
    if reason not in ["spam", "inappropriate", "offtopic", "harassment", "other"]:
        raise HTTPException(status_code=400, detail="Geçersiz reason")
    
    # İçerik var mı kontrol
    if content_type == "thread":
        content = db.query(Thread).filter(Thread.id == content_id).first()
    else:
        content = db.query(Reply).filter(Reply.id == content_id).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı")
    
    # Daha önce raporlanmış mı?
    existing = db.query(Report).filter(
        Report.reporter_user_id == current_user.id,
        Report.content_type == content_type,
        Report.content_id == content_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Bu içeriği zaten raporladınız")
    
    # Rapor oluştur
    report = Report(
        reporter_user_id=current_user.id,
        content_type=content_type,
        content_id=content_id,
        reason=reason,
        description=description
    )
    db.add(report)
    db.commit()
    
    return {"message": "Raporunuz alındı"}
```

**Test Kriterleri:**
- [x] Rapor oluşturuluyor
- [x] Aynı içerik 2. kez raporlanamıyor
- [x] Geçersiz reason reddediliyor

---

### Task 3.3: Admin - Pin/Unpin Thread
**Süre:** 30 dakika  
**Atanan:** Backend Developer

**Açıklama:**  
Admin thread'i pinleyebilir/unpinleyebilir.

```python
@router.post("/threads/{thread_id}/pin", response_model=dict)
async def toggle_pin_thread(
    thread_id: str,
    current_user: User = Depends(get_current_admin_user),  # Sadece admin
    db: Session = Depends(get_db)
):
    """Thread'i pinle/unpinle (sadece admin)"""
    
    thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    
    thread.is_pinned = not thread.is_pinned
    db.commit()
    
    return {
        "is_pinned": thread.is_pinned,
        "message": "Konu sabitlendi" if thread.is_pinned else "Sabitleme kaldırıldı"
    }
```

---

### Task 3.4: GET /api/v1/forum/tags/{tag_name}/threads
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Belirli etiketteki tüm threadleri listele.

```python
@router.get("/tags/{tag_name}/threads", response_model=dict)
async def get_threads_by_tag(
    tag_name: str,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """Belirli etiketteki threadleri listele"""
    
    # Tag bul
    tag = db.query(Tag).filter(Tag.name == tag_name.lower()).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Etiket bulunamadı")
    
    # Bu tage sahip threadleri getir
    query = db.query(Thread).join(ThreadTag).filter(
        ThreadTag.tag_id == tag.id,
        Thread.is_deleted == False
    ).order_by(Thread.created_at.desc())
    
    total = query.count()
    threads = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "tag": {"name": tag.name, "usage_count": tag.usage_count},
        "threads": threads,
        "total": total,
        "pagination": {...}
    }
```

---

## 🖼️ Phase 4: Frontend - Forum UI (3 gün)

### Task 4.1: Forum Component Yapısı
**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Forum bileşenlerini için klasör yapısı.

```bash
src/components/Forum/
├── CategoryList/
│   ├── CategoryCard.tsx
│   ├── CategoryGroup.tsx
│   └── ForumHome.tsx
├── ThreadList/
│   ├── ThreadCard.tsx
│   ├── ThreadListPage.tsx
│   └── SortDropdown.tsx
├── ThreadDetail/
│   ├── ThreadContent.tsx
│   ├── ReplyCard.tsx
│   ├── ReplyForm.tsx
│   └── ThreadDetailPage.tsx
├── CreateThread/
│   ├── CreateThreadModal.tsx
│   ├── CategorySelect.tsx
│   └── FileUpload.tsx
└── Common/
    ├── HelpfulButton.tsx
    ├── TagList.tsx
    ├── FileList.tsx
    └── Pagination.tsx
```

---

### Task 4.2: Forum Ana Sayfa (Category List)
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Forum ana sayfası - 3 grup kategori listesi.

**Konum:** `src/pages/Dashboard/ForumPage.tsx`

```typescript
const ForumHomePage = () => {
  const [categories, setCategories] = useState<CategoryListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/v1/forum/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="forum-home">
      <header className="forum-header">
        <h1>💬 KAMPÜS+ Forum</h1>
        <SearchBar placeholder="Konu, kullanıcı veya etiket ara..." />
        <Button onClick={() => setShowCreateModal(true)}>
          ➕ Yeni Konu Aç
        </Button>
      </header>

      <CategoryGroup title="🎓 Üniversiteler" categories={categories.universities} />
      <CategoryGroup title="💻 Bölümler (TR Geneli)" categories={categories.departments} />
      <CategoryGroup title="🔧 Genel Konular" categories={categories.general} />

      <CreateThreadModal show={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
};
```

**Test Kriterleri:**
- [x] Kategoriler render ediliyor
- [x] 3 grup ayrı ayrı gösteriliyor
- [x] "Yeni Konu Aç" modal açılıyor

---

### Task 4.3: Kategori Kartı
**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Forum/CategoryList/CategoryCard.tsx`

```typescript
const CategoryCard = ({ category }: { category: CategoryBase }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="category-card"
      onClick={() => navigate(`/dashboard/forum/category/${category.slug}`)}
    >
      <div className="category-header">
        <span className="category-icon">{category.icon}</span>
        <h3 className="category-name">{category.name}</h3>
      </div>
      
      <div className="category-stats">
        <span>{category.thread_count} konu</span>
        <span>•</span>
        <span>{category.reply_count} cevap</span>
      </div>
      
      {category.last_activity && (
        <div className="category-activity">
          Son mesaj: {formatDistanceToNow(new Date(category.last_activity))} önce
        </div>
      )}
    </div>
  );
};
```

**CSS:**
```css
.category-card {
  background: #16213e;
  border: 1px solid #0f1624;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.category-card:hover {
  background: #1a2744;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}
```

---

### Task 4.4: Thread List Page
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Forum/ThreadList/ThreadListPage.tsx`

```typescript
const ThreadListPage = () => {
  const { categorySlug } = useParams();
  const [data, setData] = useState<ThreadListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchThreads();
  }, [categorySlug, sortBy, page]);

  const fetchThreads = async () => {
    try {
      const response = await api.get(
        `/api/v1/forum/categories/${categorySlug}/threads`,
        { params: { sort_by: sortBy, page } }
      );
      setData(response.data);
    } catch (error) {
      toast.error('Konular yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="thread-list-page">
      <header>
        <Breadcrumb items={[
          { label: 'Forum', path: '/dashboard/forum' },
          { label: data.category.name }
        ]} />
        
        <div className="thread-list-actions">
          <SearchBar placeholder="Bu kategoride ara..." />
          <SortDropdown value={sortBy} onChange={setSortBy} />
          <Button onClick={() => setShowCreateModal(true)}>
            ➕ Yeni Konu Aç
          </Button>
        </div>
      </header>

      <div className="thread-list">
        {data.threads.map(thread => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </div>

      <Pagination 
        currentPage={page}
        totalPages={data.pagination.total_pages}
        onPageChange={setPage}
      />
    </div>
  );
};
```

---

### Task 4.5: Thread Card
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Forum/ThreadList/ThreadCard.tsx`

```typescript
const ThreadCard = ({ thread }: { thread: ThreadListItem }) => {
  const navigate = useNavigate();

  return (
    <div 
      className={`thread-card ${thread.is_pinned ? 'pinned' : ''}`}
      onClick={() => navigate(`/dashboard/forum/thread/${thread.id}`)}
    >
      {thread.is_pinned && (
        <span className="pin-badge">📌 PİN</span>
      )}
      
      <h3 className="thread-title">{thread.title}</h3>
      
      <div className="thread-author">
        <Avatar user={thread.author} />
        <span>{thread.author.first_name} {thread.author.last_name}</span>
        <span>•</span>
        <span>{thread.author.university}</span>
      </div>
      
      {thread.files.length > 0 && (
        <div className="thread-files">
          {thread.files.map(file => (
            <span key={file.id} className="file-badge">
              📎 {file.file_name} ({formatFileSize(file.file_size)})
            </span>
          ))}
        </div>
      )}
      
      <div className="thread-stats">
        <span>💬 {thread.reply_count} cevap</span>
        <span>•</span>
        <span>👍 {thread.helpful_count} yararlı</span>
        <span>•</span>
        <span>🕐 {formatDistanceToNow(new Date(thread.created_at))} önce</span>
      </div>
      
      {thread.tags.length > 0 && (
        <TagList tags={thread.tags} />
      )}
    </div>
  );
};
```

**CSS:**
```css
.thread-card {
  background: #16213e;
  border: 1px solid #0f1624;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.thread-card.pinned {
  border-left: 4px solid #FFC107;
}

.thread-card:hover {
  background: #1a2744;
  transform: translateY(-2px);
}
```

---

### Task 4.6: Thread Detail Page
**Süre:** 4 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Forum/ThreadDetail/ThreadDetailPage.tsx`

```typescript
const ThreadDetailPage = () => {
  const { threadId } = useParams();
  const [data, setData] = useState<ThreadDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortReplies, setSortReplies] = useState('oldest');

  useEffect(() => {
    fetchThreadDetail();
  }, [threadId, sortReplies]);

  const fetchThreadDetail = async () => {
    try {
      const response = await api.get(
        `/api/v1/forum/threads/${threadId}`,
        { params: { sort_replies: sortReplies } }
      );
      setData(response.data);
    } catch (error) {
      toast.error('Konu yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleHelpful = async () => {
    try {
      const response = await api.post(`/api/v1/forum/threads/${threadId}/helpful`);
      // Update local state
      setData(prev => ({
        ...prev,
        thread: {
          ...prev.thread,
          is_helpful_by_me: response.data.is_helpful,
          helpful_count: response.data.helpful_count
        }
      }));
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="thread-detail-page">
      <Breadcrumb items={[
        { label: 'Forum', path: '/dashboard/forum' },
        { label: data.thread.category.name, path: `/dashboard/forum/category/${data.thread.category.slug}` },
        { label: data.thread.title }
      ]} />

      {/* Thread Content */}
      <ThreadContent 
        thread={data.thread} 
        onHelpful={handleHelpful}
        onEdit={() => setShowEditModal(true)}
        onDelete={() => handleDelete()}
        onReport={() => setShowReportModal(true)}
      />

      {/* Replies */}
      <div className="replies-section">
        <div className="replies-header">
          <h2>CEVAPLAR ({data.replies.length})</h2>
          <SortDropdown value={sortReplies} onChange={setSortReplies} />
        </div>

        {data.replies.map(reply => (
          <ReplyCard 
            key={reply.id} 
            reply={reply}
            onHelpful={() => handleReplyHelpful(reply.id)}
            onEdit={() => handleReplyEdit(reply.id)}
            onDelete={() => handleReplyDelete(reply.id)}
          />
        ))}
      </div>

      {/* Reply Form */}
      <ReplyForm threadId={threadId} onSuccess={fetchThreadDetail} />
    </div>
  );
};
```

---

### Task 4.7: Helpful Button Component
**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Forum/Common/HelpfulButton.tsx`

```typescript
const HelpfulButton = ({ 
  count, 
  isHelpful, 
  onClick, 
  disabled = false 
}: HelpfulButtonProps) => {
  return (
    <button
      className={`helpful-button ${isHelpful ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="helpful-icon">👍</span>
      <span className="helpful-count">{count}</span>
      <span className="helpful-text">Yararlı</span>
    </button>
  );
};
```

**CSS:**
```css
.helpful-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #6B7280;
  border-radius: 6px;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.helpful-button.active {
  background: #4A90E2;
  border-color: #4A90E2;
  color: white;
}

.helpful-button:hover:not(.active) {
  border-color: #4A90E2;
  color: #4A90E2;
}
```

---

### Task 4.8: Create Thread Modal
**Süre:** 4 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Forum/CreateThread/CreateThreadModal.tsx`

```typescript
const CreateThreadModal = ({ show, onClose }: CreateThreadModalProps) => {
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    content: '',
    tags: [],
    files: []
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryListResponse | null>(null);

  useEffect(() => {
    if (show) {
      fetchCategories();
    }
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('category_id', formData.category_id);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('tags', JSON.stringify(formData.tags));
      
      formData.files.forEach(file => {
        formDataToSend.append('files', file);
      });

      const response = await api.post('/api/v1/forum/threads', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Konu başarıyla oluşturuldu');
      navigate(`/dashboard/forum/thread/${response.data.thread_id}`);
      onClose();
    } catch (error) {
      toast.error('Konu oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title="➕ Yeni Konu Aç" size="large">
      <form onSubmit={handleSubmit}>
        <CategorySelect 
          categories={categories}
          value={formData.category_id}
          onChange={(id) => setFormData({...formData, category_id: id})}
        />

        <Input
          label="Başlık *"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="Konuyu açıklayıcı bir başlık yazın"
          maxLength={200}
          required
        />

        <Textarea
          label="İçerik *"
          value={formData.content}
          onChange={(e) => setFormData({...formData, content: e.target.value})}
          placeholder="Markdown formatında yazabilirsin..."
          rows={10}
          maxLength={10000}
          required
        />

        <FileUpload
          files={formData.files}
          onChange={(files) => setFormData({...formData, files})}
          maxFiles={3}
          maxSizeMB={10}
        />

        <TagInput
          tags={formData.tags}
          onChange={(tags) => setFormData({...formData, tags})}
          maxTags={5}
        />

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            ❌ İptal
          </Button>
          <Button type="submit" loading={loading}>
            ✅ Konu Aç
          </Button>
        </div>
      </form>
    </Modal>
  );
};
```

---

### Task 4.9: Reply Form Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Forum/ThreadDetail/ReplyForm.tsx`

```typescript
const ReplyForm = ({ threadId, onSuccess }: ReplyFormProps) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach(file => formData.append('files', file));

      await api.post(`/api/v1/forum/threads/${threadId}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Cevap eklendi');
      setContent('');
      setFiles([]);
      onSuccess();
    } catch (error) {
      toast.error('Cevap eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reply-form">
      <h3>CEVAP YAZ</h3>
      <form onSubmit={handleSubmit}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Cevabını buraya yaz... (Markdown destekli)"
          rows={6}
          maxLength={10000}
          required
        />

        <FileUpload
          files={files}
          onChange={setFiles}
          maxFiles={3}
          maxSizeMB={10}
        />

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => { setContent(''); setFiles([]); }}>
            ❌ İptal
          </Button>
          <Button type="submit" loading={loading}>
            ✅ Gönder
          </Button>
        </div>
      </form>
    </div>
  );
};
```

---

### Task 4.10: Search Page
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Konum:** `src/pages/Dashboard/ForumSearchPage.tsx`

Arama sonuçlarını gösteren sayfa. Thread kartları ile benzer görünüm.

---

### Task 4.11: Report Modal
**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Forum/Common/ReportModal.tsx`

İçerik raporlama modal'ı (sebep seçimi + açıklama).

---

### Task 4.12: Tag Page
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Konum:** `src/pages/Dashboard/ForumTagPage.tsx`

Belirli etiketteki threadleri listeleyen sayfa.

---

## 🧪 Phase 5: Testing & Polish (1 gün)

### Task 5.1: Backend Integration Tests
**Süre:** 2 saat  
**Atanan:** Backend Developer

Tüm forum flow'ları için integration test'ler.

---

### Task 5.2: Frontend Component Tests
**Süre:** 2 saat  
**Atanan:** Frontend Developer

React Testing Library ile bileşen test'leri.

---

### Task 5.3: E2E Tests (Forum Flow)
**Süre:** 3 saat  
**Atanan:** QA / Full-Stack Developer

**Test Senaryoları:**
1. Kullanıcı forum ana sayfasını görür
2. Kategoriye tıklar, threadleri görür
3. Yeni konu açar (dosya yükleyerek)
4. Thread detayını görür
5. Cevap yazar
6. Yararlı işareti koyar
7. Kendi konusunu düzenler
8. Arama yapar
9. Etikete tıklar

---

### Task 5.4: Responsive Test
**Süre:** 1 saat  
**Atanan:** Frontend Developer

Mobil/tablet/desktop'ta forum'u test et.

---

### Task 5.5: Performance Optimization
**Süre:** 2 saat  
**Atanan:** Full-Stack Developer

- Backend query optimization (N+1 problem)
- Frontend lazy loading
- Image/file optimization
- Caching stratejileri

---

## 📝 Phase 6: Documentation & Deployment (0.5 gün)

### Task 6.1: API Dokümantasyonu
**Süre:** 1 saat  
**Atanan:** Backend Developer

FastAPI docs'a ek açıklamalar.

---

### Task 6.2: Frontend Component Docs
**Süre:** 1 saat  
**Atanan:** Frontend Developer

Bileşen kullanım kılavuzları.

---

### Task 6.3: Deployment
**Süre:** 2 saat  
**Atanan:** DevOps

- Database migration
- File upload klasörü ayarları
- Environment variables
- CORS ayarları

---

## ✅ Definition of Done (DoD)

### Fonksiyonel Gereksinimler
- [ ] Forum ana sayfası 3 grup kategori gösteriyor
- [ ] Kategori içi thread listesi çalışıyor
- [ ] Thread detay + cevaplar görünüyor
- [ ] Yeni konu açma çalışıyor (dosya yükleme dahil)
- [ ] Cevap yazma çalışıyor (dosya yükleme dahil)
- [ ] Yararlı butonu çalışıyor (thread + reply)
- [ ] Düzenleme çalışıyor (10 dakika + admin)
- [ ] Silme çalışıyor (10 dakika + admin)
- [ ] Arama çalışıyor
- [ ] Etiket filtreleme çalışıyor
- [ ] Rapor et çalışıyor
- [ ] Pin/unpin çalışıyor (admin)
- [ ] Sayfalama çalışıyor

### Teknik Gereksinimler
- [ ] Tüm backend endpoint'ler çalışıyor
- [ ] Database schema oluşturuldu
- [ ] Dosya yükleme çalışıyor (max 10 MB, 3 dosya)
- [ ] Validasyonlar çalışıyor
- [ ] Unit test'ler yazıldı (%80+ coverage)
- [ ] E2E test'ler yazıldı
- [ ] Responsive tasarım çalışıyor

### Performans
- [ ] Thread listesi < 1 saniye
- [ ] Thread detay < 1.5 saniye
- [ ] Arama < 2 saniye
- [ ] Dosya yükleme progress gösteriliyor

### Güvenlik
- [ ] Dosya tipi ve boyut kontrolü
- [ ] XSS koruması (user-generated content)
- [ ] SQL injection koruması
- [ ] CSRF token validation

---

## 📊 Task Özeti

| Phase | Task Sayısı | Tahmini Süre |
|-------|-------------|--------------|
| Phase 0: Database & Infrastructure | 4 | 1 gün |
| Phase 1: Backend - Category & Thread List | 6 | 2 gün |
| Phase 2: Backend - Thread Detail & Replies | 8 | 2 gün |
| Phase 3: Backend - Search, Report, Admin | 4 | 1 gün |
| Phase 4: Frontend - Forum UI | 12 | 3 gün |
| Phase 5: Testing & Polish | 5 | 1 gün |
| Phase 6: Documentation & Deployment | 3 | 0.5 gün |
| **TOPLAM** | **42** | **7-10 gün** |

---

**Hazırlayan:** AI Assistant  
**Versiyon:** 1.0  
**Son Güncelleme:** 2026-01-01

