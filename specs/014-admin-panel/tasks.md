# 014 - Admin Panel - Implementation Tasks

## 📋 Genel Bakış

**Tahmini Süre:** 10-12 gün  
**Öncelik:** Yüksek (Platform Yönetimi)  
**Bağımlılıklar:**
- 002-register-page (✅ User model, role field)
- 003-login-page (✅ Auth sistemi)
- 006-academic-features (✅ Academic contributions)
- 007-marketplace (✅ Marketplace reports)
- 008-career-page (✅ Career reports)
- 009-ai-assistant (✅ AI settings, knowledge base)
- 011-settings (✅ Contact messages)

---

## 📊 Proje Özeti

| Özellik | Süre Tahmini | Zorluk | Öncelik |
|---------|--------------|---------|---------|
| Admin Login | 0.5 gün | Düşük | Yüksek |
| Admin Dashboard | 1 gün | Orta | Yüksek |
| Academic Management | 2-3 gün | Yüksek | Yüksek |
| AI Assistant Management | 2 gün | Orta | Yüksek |
| Moderation (Reports) | 1.5 gün | Orta | Orta |
| Forum Moderation | 1 gün | Düşük | Orta |
| Contact Messages | 0.5 gün | Düşük | Düşük |
| User Management | 1.5 gün | Orta | Düşük (Gelecek) |

**Toplam Task Sayısı:** ~65  
**Tahmini Süre:** 10-12 gün (2 developer: 1 backend, 1 frontend)

---

## 🎯 Phase 0: Infrastructure & Setup (0.5 gün)

### Task 0.1: Admin Seed Script
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Development ortamı için admin kullanıcı oluşturan seed script.

**Dosya:** `backend/scripts/seed_admin.py`

```python
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session_factory
from src.models.user import User, UserRole
from src.core.security import get_password_hash

async def create_admin_user():
    """Create default admin user for development."""
    session_factory = get_session_factory()
    
    async with session_factory() as session:
        # Check if admin already exists
        existing_admin = await session.execute(
            select(User).where(User.email == "admin@kampusplus.edu.tr")
        )
        if existing_admin.scalar_one_or_none():
            print("Admin user already exists")
            return
        
        # Create admin user
        admin = User(
            email="admin@kampusplus.edu.tr",
            password_hash=get_password_hash("admin123"),  # Change in production!
            first_name="Admin",
            last_name="User",
            student_id=None,
            department="Sistem Yönetimi",
            role=UserRole.ADMIN,
            is_verified=True,
            is_active=True
        )
        
        session.add(admin)
        await session.commit()
        print("Admin user created successfully!")

if __name__ == "__main__":
    asyncio.run(create_admin_user())
```

**Adımlar:**
- [ ] Script dosyasını oluştur
- [ ] `get_password_hash` fonksiyonunu import et
- [ ] Admin kullanıcı oluştur (email: admin@kampusplus.edu.tr, password: admin123)
- [ ] Duplicate kontrolü ekle
- [ ] Test: Script çalıştırıldığında admin kullanıcı oluşuyor

**Kullanım:**
```bash
python backend/scripts/seed_admin.py
```

---

### Task 0.2: Admin Dependency Function
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Admin role kontrolü yapan dependency fonksiyonu.

**Dosya:** `backend/src/api/dependencies.py` (güncelle)

```python
from fastapi import Depends, HTTPException, status
from src.core.dependencies import get_current_user
from src.models.user import User, UserRole

async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that requires admin role.
    
    Usage:
        @router.get("/admin/endpoint")
        async def admin_endpoint(
            admin: User = Depends(require_admin)
        ):
            ...
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
```

**Adımlar:**
- [ ] `require_admin` fonksiyonunu ekle
- [ ] Role kontrolü yap (UserRole.ADMIN)
- [ ] 403 Forbidden hatası döndür (admin değilse)
- [ ] Test: Admin olmayan kullanıcı endpoint'e erişemez

---

### Task 0.3: Database Schema - Admin Tabloları
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Admin paneli için gerekli yeni tabloları oluştur.

**Migration:** `alembic revision -m "add_admin_tables"`

**Tablolar:**

1. **ai_system_settings**
```sql
CREATE TABLE ai_system_settings (
    id SERIAL PRIMARY KEY,
    system_prompt TEXT NOT NULL,
    rate_limit_per_day INTEGER DEFAULT 50,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

2. **ai_knowledge_base**
```sql
CREATE TABLE ai_knowledge_base (
    id SERIAL PRIMARY KEY,
    keywords TEXT[] NOT NULL,
    answer TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_knowledge_base_keywords ON ai_knowledge_base USING GIN(keywords);
CREATE INDEX idx_ai_knowledge_base_active ON ai_knowledge_base(is_active) WHERE is_active = TRUE;
```

3. **academic_contributions**
```sql
CREATE TABLE academic_contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) NOT NULL,  -- 'course_schedule' | 'academic_calendar'
    university VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    class_year VARCHAR(50),
    semester VARCHAR(20),
    academic_year VARCHAR(20),
    file_url VARCHAR(500),
    manual_data JSONB,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
    rejection_reason TEXT,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_academic_contributions_status ON academic_contributions(status);
CREATE INDEX idx_academic_contributions_user ON academic_contributions(user_id);
```

4. **marketplace_reports** (007-marketplace spec'inde var, kontrol et)
5. **career_reports** (008-career-page spec'inde var, kontrol et)
6. **contact_messages** (011-settings spec'inde var, kontrol et)

**Adımlar:**
- [ ] Migration dosyası oluştur
- [ ] Tabloları ekle
- [ ] Index'leri ekle
- [ ] Foreign key'leri ekle
- [ ] Migration'ı çalıştır: `alembic upgrade head`
- [ ] Test: Tablolar oluştu

---

## 🔐 Phase 1: Admin Login (0.5 gün)

### Task 1.1: Backend - Admin Login Endpoint
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Normal login endpoint'ini kullan, ama admin role kontrolü ekle.

**Dosya:** `backend/src/api/routes/auth.py` (güncelle)

**Değişiklikler:**
- [ ] Mevcut `/api/v1/auth/login` endpoint'ini kullan
- [ ] Response'a `user.role` ekle (zaten var olabilir)
- [ ] Frontend'de role kontrolü yapılacak (backend'de ekstra kontrol gerekmez)

**Not:** Admin login için ayrı endpoint gerekmez. Normal login endpoint'i kullanılır, frontend'de role kontrolü yapılır.

---

### Task 1.2: Frontend - Admin Login Page
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Ayrı admin login sayfası oluştur.

**Dosya:** `frontend/src/pages/admin/AdminLogin.tsx`

**Özellikler:**
- [ ] Koyu tema (gray-900 → gray-800 → black gradient)
- [ ] Kırmızı vurgu (ikon, buton)
- [ ] Email + Password form
- [ ] Loading state
- [ ] Hata mesajları
- [ ] "Back to Student Portal" linki
- [ ] Role kontrolü (admin değilse hata)

**Component Yapısı:**
```tsx
export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    // Login API çağrısı
    // Role kontrolü (user.role === 'admin')
    // Başarılı ise /admin/dashboard'a yönlendir
  };

  return (
    // UI
  );
};
```

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] Form state'lerini ekle
- [ ] Login API çağrısı yap
- [ ] Role kontrolü ekle
- [ ] Hata durumlarını handle et
- [ ] Loading state ekle
- [ ] Styling (koyu tema, kırmızı vurgu)
- [ ] Test: Admin login çalışıyor

---

### Task 1.3: Frontend - Admin Route Setup
**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Admin route'larını ekle.

**Dosya:** `frontend/src/App.tsx` (güncelle)

**Route'lar:**
- [ ] `/admin/login` → AdminLogin component
- [ ] `/admin/dashboard` → AdminDashboard component (ProtectedRoute ile)
- [ ] Admin route'ları için ProtectedRoute (role kontrolü)

**ProtectedRoute Güncellemesi:**
```tsx
// Admin için özel ProtectedRoute
<ProtectedRoute requireRole="admin">
  <AdminDashboard />
</ProtectedRoute>
```

**Adımlar:**
- [ ] AdminLogin route'unu ekle
- [ ] AdminDashboard route'unu ekle
- [ ] ProtectedRoute'u güncelle (role kontrolü ekle)
- [ ] Test: Route'lar çalışıyor

---

## 📊 Phase 2: Admin Dashboard (1 gün)

### Task 2.1: Backend - Dashboard Stats Endpoint
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Dashboard istatistiklerini döndüren endpoint.

**Dosya:** `backend/src/api/routes/admin.py` (yeni)

**Endpoint:** `GET /api/v1/admin/dashboard/stats`

**Response:**
```json
{
  "pending_contributions": 12,
  "marketplace_reports": 5,
  "career_reports": 2,
  "new_contact_messages": 3,
  "total_users": 1247,
  "ai_messages_today": 2543,
  "approved_data_count": 45
}
```

**Adımlar:**
- [ ] `admin.py` route dosyasını oluştur
- [ ] `require_admin` dependency'yi kullan
- [ ] İstatistikleri hesapla (SQL sorguları)
- [ ] Response model oluştur
- [ ] Test: Endpoint çalışıyor, doğru veriler dönüyor

---

### Task 2.2: Frontend - Admin Layout Component
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Admin paneli için özel layout (sidebar + header).

**Dosya:** `frontend/src/components/admin/AdminLayout.tsx`

**Özellikler:**
- [ ] Sidebar (sabit, solda)
- [ ] Header (üstte, admin bilgisi + logout)
- [ ] Main content area
- [ ] Koyu tema

**Sidebar Menü:**
```
📊 Dashboard
📅 Academic
💬 Forum
🛒 Marketplace
💼 Career
🤖 AI
👥 Users
📧 Messages
```

**Adımlar:**
- [ ] Layout component'ini oluştur
- [ ] Sidebar component'ini oluştur
- [ ] Header component'ini oluştur
- [ ] Styling (koyu tema)
- [ ] Navigation logic
- [ ] Test: Layout görünüyor, navigation çalışıyor

---

### Task 2.3: Frontend - Admin Dashboard Page
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Admin dashboard ana sayfası.

**Dosya:** `frontend/src/pages/admin/AdminDashboard.tsx`

**Özellikler:**
- [ ] İstatistik kartları (API'den veri çek)
- [ ] Hızlı erişim kartları
- [ ] Loading state
- [ ] Error handling

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] API çağrısı yap (`/api/v1/admin/dashboard/stats`)
- [ ] İstatistik kartlarını göster
- [ ] Hızlı erişim kartlarını ekle
- [ ] Navigation (kartlara tıklayınca ilgili sayfaya git)
- [ ] Styling
- [ ] Test: Dashboard görünüyor, veriler doğru

---

## 📅 Phase 3: Academic Management (2-3 gün)

### Task 3.1: Backend - Pending Contributions Endpoint
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Bekleyen katkıları listele.

**Endpoint:** `GET /api/v1/admin/academic/pending-contributions`

**Query Parameters:**
- `type`: `course_schedule` | `academic_calendar` | `all` (default: `all`)
- `page`: integer (default: 1)
- `limit`: integer (default: 20)

**Response:**
```json
{
  "contributions": [
    {
      "id": 1,
      "user": {
        "id": 123,
        "username": "ali_yilmaz",
        "first_name": "Ali",
        "last_name": "Yılmaz"
      },
      "type": "course_schedule",
      "university": "Konya Gıda ve Tarım Üniversitesi",
      "department": "Bilgisayar Mühendisliği",
      "class_year": "2. Sınıf",
      "semester": "Dönem 3",
      "academic_year": "2025-2026",
      "file_url": "https://...",
      "manual_data": {...},
      "status": "pending",
      "created_at": "2025-01-15T14:30:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

**Adımlar:**
- [ ] Endpoint'i ekle (`admin.py`)
- [ ] Query parametrelerini handle et
- [ ] Database sorgusu (pending contributions)
- [ ] Pagination
- [ ] Response model
- [ ] Test: Endpoint çalışıyor

---

### Task 3.2: Backend - Approve Contribution Endpoint
**Süre:** 1.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Katkıyı onayla.

**Endpoint:** `POST /api/v1/admin/academic/contributions/{id}/approve`

**Logic:**
1. Contribution'ı bul (id ile)
2. Status kontrolü (pending olmalı)
3. Status'u `approved` yap
4. `reviewed_by` ve `reviewed_at` güncelle
5. Veriyi aktif hale getir (course_schedule veya academic_calendar tablosuna ekle)
6. Öğrenciye bildirim gönder (notification)

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] Contribution'ı bul
- [ ] Status kontrolü
- [ ] Status güncelle
- [ ] Veriyi aktif hale getir (parse edilmiş veriyi tabloya ekle)
- [ ] Bildirim gönder
- [ ] Test: Onaylama çalışıyor

---

### Task 3.3: Backend - Reject Contribution Endpoint
**Süre:** 1.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Katkıyı reddet (sebep ile).

**Endpoint:** `POST /api/v1/admin/academic/contributions/{id}/reject`

**Request Body:**
```json
{
  "rejection_reason": "PDF okunamıyor. Lütfen daha net bir fotoğraf yükleyin."
}
```

**Logic:**
1. Contribution'ı bul
2. Status kontrolü
3. Status'u `rejected` yap
4. `rejection_reason` kaydet
5. `reviewed_by` ve `reviewed_at` güncelle
6. Öğrenciye bildirim gönder (sebep ile)

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] Request body model (rejection_reason)
- [ ] Status güncelle
- [ ] Rejection reason kaydet
- [ ] Bildirim gönder
- [ ] Test: Reddetme çalışıyor

---

### Task 3.4: Frontend - Pending Contributions Page
**Süre:** 4 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Bekleyen katkıları görüntüleme sayfası.

**Dosya:** `frontend/src/pages/admin/PendingContributionsPage.tsx`

**Özellikler:**
- [ ] Katkı listesi (API'den çek)
- [ ] Filtreleme (type: course_schedule / academic_calendar)
- [ ] PDF önizleme (eğer file_url varsa)
- [ ] Onayla/Reddet butonları
- [ ] Reddetme modal'ı (sebep yazma)
- [ ] Pagination ("Daha Fazla Yükle")
- [ ] Loading state

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] API çağrısı (`GET /api/v1/admin/academic/pending-contributions`)
- [ ] Liste görünümü
- [ ] Filtreleme
- [ ] PDF önizleme (iframe veya embed)
- [ ] Onayla butonu (onay popup'ı ile)
- [ ] Reddet butonu (modal ile)
- [ ] Pagination
- [ ] Styling
- [ ] Test: Sayfa çalışıyor

---

### Task 3.5: Backend - Course Schedule Management Endpoints
**Süre:** 3 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Ders programı CRUD endpoint'leri.

**Endpoints:**
- `GET /api/v1/admin/academic/course-schedules` - Listele
- `POST /api/v1/admin/academic/course-schedules` - Ekle
- `PUT /api/v1/admin/academic/course-schedules/{id}` - Güncelle
- `DELETE /api/v1/admin/academic/course-schedules/{id}` - Sil

**Adımlar:**
- [ ] List endpoint (filtreleme: university, department, class_year)
- [ ] Create endpoint (PDF/Excel parse veya manuel veri)
- [ ] Update endpoint
- [ ] Delete endpoint
- [ ] Response modelleri
- [ ] Test: Tüm endpoint'ler çalışıyor

---

### Task 3.6: Frontend - Course Schedule Management Page
**Süre:** 4 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Ders programı yönetim sayfası.

**Dosya:** `frontend/src/pages/admin/CourseScheduleManagementPage.tsx`

**Özellikler:**
- [ ] Ağaç yapısında görüntüleme (Üniversite → Bölüm → Sınıf)
- [ ] Veri durumu göstergesi (✅ Veri Var / ⏳ Veri Yok)
- [ ] Yeni ders programı ekleme modal'ı
- [ ] Düzenleme/Silme

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] API çağrısı (list)
- [ ] Ağaç yapısı component'i
- [ ] Ekleme modal'ı
- [ ] Düzenleme modal'ı
- [ ] Silme onay popup'ı
- [ ] Styling
- [ ] Test: Sayfa çalışıyor

---

### Task 3.7: Backend - Academic Calendar Management Endpoints
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Akademik takvim CRUD endpoint'leri.

**Endpoints:**
- `GET /api/v1/admin/academic/calendars` - Listele
- `POST /api/v1/admin/academic/calendars` - Ekle
- `PUT /api/v1/admin/academic/calendars/{id}` - Güncelle
- `DELETE /api/v1/admin/academic/calendars/{id}` - Sil

**Adımlar:**
- [ ] Endpoint'leri ekle
- [ ] Test: Çalışıyor

---

### Task 3.8: Frontend - Academic Calendar Management Page
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Akademik takvim yönetim sayfası.

**Dosya:** `frontend/src/pages/admin/AcademicCalendarManagementPage.tsx`

**Adımlar:**
- [ ] Component oluştur
- [ ] API entegrasyonu
- [ ] Liste görünümü
- [ ] Ekleme/Düzenleme/Silme
- [ ] Test: Çalışıyor

---

## 🤖 Phase 4: AI Assistant Management (2 gün)

### Task 4.1: Backend - AI Settings Endpoints
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
AI ayarlarını getir/güncelle.

**Endpoints:**
- `GET /api/v1/admin/ai/settings` - Ayarları getir
- `PUT /api/v1/admin/ai/settings` - Ayarları güncelle

**Request Body (PUT):**
```json
{
  "system_prompt": "Yeni prompt...",
  "rate_limit_per_day": 100
}
```

**Adımlar:**
- [ ] Model oluştur (`AISystemSettings`)
- [ ] GET endpoint
- [ ] PUT endpoint
- [ ] Default değerler (ilk kurulumda)
- [ ] Test: Endpoint'ler çalışıyor

---

### Task 4.2: Backend - Knowledge Base CRUD Endpoints
**Süre:** 3 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Knowledge base için CRUD endpoint'leri.

**Endpoints:**
- `GET /api/v1/admin/ai/knowledge-base` - Listele (filtreleme, arama)
- `POST /api/v1/admin/ai/knowledge-base` - Ekle
- `PUT /api/v1/admin/ai/knowledge-base/{id}` - Güncelle
- `DELETE /api/v1/admin/ai/knowledge-base/{id}` - Sil

**Adımlar:**
- [ ] Model oluştur (`AIKnowledgeBase`)
- [ ] CRUD endpoint'leri
- [ ] Arama (keywords ile)
- [ ] Test: Tüm endpoint'ler çalışıyor

---

### Task 4.3: Backend - AI Stats Endpoint
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
AI kullanım istatistiklerini getir.

**Endpoint:** `GET /api/v1/admin/ai/stats`

**Query Parameters:**
- `period`: `today` | `week` | `month` | `all` (default: `today`)

**Response:**
```json
{
  "total_messages": 2543,
  "active_users": 1247,
  "success_rate": 98.5,
  "top_queries": [
    {"query": "Bugün derslerim var mı?", "count": 340},
    {"query": "Ara sınav ne zaman?", "count": 180}
  ],
  "average_response_time": 2.3
}
```

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] SQL sorguları (istatistikler)
- [ ] Top queries hesapla
- [ ] Response model
- [ ] Test: Endpoint çalışıyor

---

### Task 4.4: Frontend - AI Settings Page
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
AI ayarları sayfası.

**Dosya:** `frontend/src/pages/admin/AISettingsPage.tsx`

**Özellikler:**
- [ ] System prompt editor (rich text, çok satırlı)
- [ ] Rate limit input
- [ ] Kaydet butonu
- [ ] Preview özelliği

**Adımlar:**
- [ ] Component oluştur
- [ ] API çağrısı (GET settings)
- [ ] Form state'leri
- [ ] Rich text editor (opsiyonel, textarea yeterli)
- [ ] Save butonu (PUT request)
- [ ] Success/Error mesajları
- [ ] Test: Sayfa çalışıyor

---

### Task 4.5: Frontend - Knowledge Base Management Page
**Süre:** 4 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Knowledge base yönetim sayfası.

**Dosya:** `frontend/src/pages/admin/KnowledgeBasePage.tsx`

**Özellikler:**
- [ ] Knowledge base listesi
- [ ] Arama (keywords ile)
- [ ] Yeni cevap ekleme modal'ı
- [ ] Düzenleme modal'ı
- [ ] Silme onay popup'ı
- [ ] Aktif/Pasif toggle

**Adımlar:**
- [ ] Component oluştur
- [ ] API çağrısı (list)
- [ ] Liste görünümü
- [ ] Arama
- [ ] Ekleme modal'ı
- [ ] Düzenleme modal'ı
- [ ] Silme
- [ ] Test: Sayfa çalışıyor

---

### Task 4.6: Frontend - AI Stats Page
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
AI istatistikleri sayfası.

**Dosya:** `frontend/src/pages/admin/AIStatsPage.tsx`

**Özellikler:**
- [ ] İstatistik kartları
- [ ] Top queries listesi
- [ ] Period seçimi (today/week/month/all)
- [ ] Grafikler (opsiyonel, basit bar chart yeterli)

**Adımlar:**
- [ ] Component oluştur
- [ ] API çağrısı
- [ ] İstatistik kartları
- [ ] Top queries listesi
- [ ] Period filter
- [ ] Test: Sayfa çalışıyor

---

## 🛒 Phase 5: Moderation (Reports) (1.5 gün)

### Task 5.1: Backend - Marketplace Reports Endpoint
**Süre:** 1.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Marketplace raporlarını listele.

**Endpoint:** `GET /api/v1/admin/moderation/marketplace-reports`

**Query Parameters:**
- `status`: `pending` | `reviewed` | `action_taken` | `all` (default: `all`)
- `page`: integer
- `limit`: integer

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] Filtreleme
- [ ] Pagination
- [ ] Response model (listing bilgileri ile birlikte)
- [ ] Test: Endpoint çalışıyor

---

### Task 5.2: Backend - Career Reports Endpoint
**Süre:** 1.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Career raporlarını listele.

**Endpoint:** `GET /api/v1/admin/moderation/career-reports`

**Adımlar:**
- [ ] Endpoint'i ekle (marketplace ile benzer)
- [ ] Test: Çalışıyor

---

### Task 5.3: Backend - Report Status Update Endpoint
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Rapor durumunu güncelle.

**Endpoint:** `PUT /api/v1/admin/moderation/reports/{id}/status`

**Request Body:**
```json
{
  "status": "reviewed"  // "pending" | "reviewed" | "action_taken"
}
```

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] Status güncelle
- [ ] Test: Çalışıyor

---

### Task 5.4: Backend - Delete Listing Endpoint
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
İlanı sil (admin yetkisi ile).

**Endpoint:** `DELETE /api/v1/admin/moderation/listings/{id}`

**Query Parameters:**
- `type`: `marketplace` | `career`

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] Type kontrolü
- [ ] İlanı sil (soft delete veya hard delete)
- [ ] Test: Çalışıyor

---

### Task 5.5: Frontend - Marketplace Reports Page
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Açımlama:**  
Marketplace raporlarını görüntüleme sayfası.

**Dosya:** `frontend/src/pages/admin/MarketplaceReportsPage.tsx`

**Özellikler:**
- [ ] Rapor listesi
- [ ] Filtreleme (status)
- [ ] İlan detaylarını görüntüleme
- [ ] İlan silme butonu
- [ ] Rapor durumunu güncelleme

**Adımlar:**
- [ ] Component oluştur
- [ ] API çağrısı
- [ ] Liste görünümü
- [ ] Filtreleme
- [ ] İlan detay modal'ı
- [ ] Silme onay popup'ı
- [ ] Test: Sayfa çalışıyor

---

### Task 5.6: Frontend - Career Reports Page
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Career raporlarını görüntüleme sayfası (marketplace ile benzer).

**Dosya:** `frontend/src/pages/admin/CareerReportsPage.tsx`

**Adımlar:**
- [ ] Component oluştur (marketplace ile benzer yapı)
- [ ] API entegrasyonu
- [ ] Test: Çalışıyor

---

## 💬 Phase 6: Forum Moderation (1 gün)

### Task 6.1: Backend - Pin/Unpin Topic Endpoints
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Konuyu pin'le/unpin yap.

**Endpoints:**
- `POST /api/v1/admin/forum/topics/{id}/pin`
- `POST /api/v1/admin/forum/topics/{id}/unpin`

**Adımlar:**
- [ ] Endpoint'leri ekle
- [ ] `is_pinned` field'ını güncelle
- [ ] Test: Çalışıyor

---

### Task 6.2: Backend - Edit/Delete Post Endpoints
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Postu düzenle/sil (admin yetkisi ile).

**Endpoints:**
- `PUT /api/v1/admin/forum/posts/{id}` - Düzenle
- `DELETE /api/v1/admin/forum/posts/{id}` - Sil

**Adımlar:**
- [ ] Endpoint'leri ekle
- [ ] Admin kontrolü (require_admin)
- [ ] Test: Çalışıyor

---

### Task 6.3: Frontend - Forum Moderation (Inline)
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Forum sayfasında admin butonları (pin, edit, delete).

**Dosya:** `frontend/src/components/forum/ThreadView.tsx` (güncelle)

**Özellikler:**
- [ ] Admin kontrolü (user.role === 'admin')
- [ ] Pin/Unpin butonu (sadece admin görür)
- [ ] Edit butonu (sadece admin görür)
- [ ] Delete butonu (sadece admin görür)

**Adımlar:**
- [ ] Forum component'lerini güncelle
- [ ] Admin butonlarını ekle
- [ ] API çağrıları
- [ ] Test: Admin butonları görünüyor, çalışıyor

---

## 📧 Phase 7: Contact Messages (0.5 gün)

### Task 7.1: Backend - Contact Messages Endpoint
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
İletişim mesajlarını listele.

**Endpoint:** `GET /api/v1/admin/messages`

**Query Parameters:**
- `status`: `new` | `read` | `replied` | `all` (default: `all`)
- `page`: integer
- `limit`: integer

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] Filtreleme
- [ ] Pagination
- [ ] Test: Çalışıyor

---

### Task 7.2: Backend - Mark Message as Read Endpoint
**Süre:** 0.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Mesajı okundu işaretle.

**Endpoint:** `PUT /api/v1/admin/messages/{id}/read`

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] Status güncelle
- [ ] Test: Çalışıyor

---

### Task 7.3: Frontend - Contact Messages Page
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
İletişim mesajlarını görüntüleme sayfası.

**Dosya:** `frontend/src/pages/admin/ContactMessagesPage.tsx`

**Özellikler:**
- [ ] Mesaj listesi
- [ ] Filtreleme (status)
- [ ] Mesaj detayları
- [ ] Okundu işaretleme

**Adımlar:**
- [ ] Component oluştur
- [ ] API entegrasyonu
- [ ] Liste görünümü
- [ ] Detay modal'ı
- [ ] Test: Sayfa çalışıyor

---

## 👥 Phase 8: User Management (Gelecek - 1.5 gün)

### Task 8.1: Backend - User List Endpoint
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Kullanıcıları listele (filtreleme, arama).

**Endpoint:** `GET /api/v1/admin/users`

**Query Parameters:**
- `role`: `student` | `admin` | `all`
- `status`: `active` | `inactive` | `all`
- `search`: string (isim, email, username)
- `page`: integer
- `limit`: integer

**Adımlar:**
- [ ] Endpoint'i ekle
- [ ] Filtreleme
- [ ] Arama
- [ ] Pagination
- [ ] Test: Çalışıyor

---

### Task 8.2: Backend - User Management Endpoints
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Kullanıcı yönetim endpoint'leri.

**Endpoints:**
- `PUT /api/v1/admin/users/{id}/status` - Hesap askıya alma/aktifleştirme
- `PUT /api/v1/admin/users/{id}/verify-email` - Email verification manuel onay
- `DELETE /api/v1/admin/users/{id}` - Hesap silme (soft delete)

**Adımlar:**
- [ ] Endpoint'leri ekle
- [ ] Test: Çalışıyor

---

### Task 8.3: Frontend - User Management Page
**Süre:** 3 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Kullanıcı yönetim sayfası.

**Dosya:** `frontend/src/pages/admin/UserManagementPage.tsx`

**Adımlar:**
- [ ] Component oluştur
- [ ] Liste görünümü
- [ ] Filtreleme/Arama
- [ ] Kullanıcı detayları
- [ ] Hesap yönetimi butonları
- [ ] Test: Çalışıyor

**Not:** MVP'de düşük öncelik, sonra eklenebilir.

---

## 🧪 Phase 9: Testing & Polish (1 gün)

### Task 9.1: Backend Tests
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Adımlar:**
- [ ] Admin login test
- [ ] Admin endpoint'leri test (role kontrolü)
- [ ] Academic management test
- [ ] AI management test
- [ ] Moderation test

---

### Task 9.2: Frontend Tests
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Adımlar:**
- [ ] Admin login test
- [ ] Admin dashboard test
- [ ] Component test'leri
- [ ] E2E test'leri (opsiyonel)

---

### Task 9.3: Integration Tests
**Süre:** 2 saat  
**Atanan:** Full-Stack Developer

**Adımlar:**
- [ ] Admin login flow test
- [ ] Academic contribution approval flow test
- [ ] AI settings update test
- [ ] Report moderation flow test

---

### Task 9.4: Documentation
**Süre:** 1 saat  
**Atanan:** Full-Stack Developer

**Adımlar:**
- [ ] API endpoint dokümantasyonu
- [ ] Admin kullanım kılavuzu (opsiyonel)

---

## ✅ Checklist

### Phase 0: Infrastructure
- [ ] Admin seed script
- [ ] Admin dependency function
- [ ] Database schema (admin tabloları)

### Phase 1: Admin Login
- [ ] Backend endpoint (normal login kullanılır)
- [ ] Frontend admin login page
- [ ] Route setup

### Phase 2: Admin Dashboard
- [ ] Dashboard stats endpoint
- [ ] Admin layout component
- [ ] Admin dashboard page

### Phase 3: Academic Management
- [ ] Pending contributions endpoint
- [ ] Approve/Reject endpoints
- [ ] Course schedule management endpoints
- [ ] Academic calendar management endpoints
- [ ] Frontend pages

### Phase 4: AI Assistant Management
- [ ] AI settings endpoints
- [ ] Knowledge base CRUD endpoints
- [ ] AI stats endpoint
- [ ] Frontend pages

### Phase 5: Moderation
- [ ] Marketplace/Career reports endpoints
- [ ] Report status update endpoint
- [ ] Delete listing endpoint
- [ ] Frontend pages

### Phase 6: Forum Moderation
- [ ] Pin/Unpin endpoints
- [ ] Edit/Delete endpoints
- [ ] Frontend inline buttons

### Phase 7: Contact Messages
- [ ] Messages endpoint
- [ ] Mark as read endpoint
- [ ] Frontend page

### Phase 8: User Management (Gelecek)
- [ ] User list endpoint
- [ ] User management endpoints
- [ ] Frontend page

### Phase 9: Testing
- [ ] Backend tests
- [ ] Frontend tests
- [ ] Integration tests

---

## 📝 Notlar

1. **Admin Login:** Normal login endpoint'i kullanılır, frontend'de role kontrolü yapılır
2. **Rate Limiting:** Admin endpoint'lerinde rate limiting YOK
3. **Audit Logging:** Gelecek özellik (kim ne yaptı)
4. **User Management:** MVP'de düşük öncelik, sonra eklenebilir

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Tasks Tamamlandı - Ready for Development

