# 011 - Ayarlar Sayfası - Implementation Tasks

## 📋 Genel Bakış

Ayarlar sayfasının tüm özelliklerini (şifre değiştir, tema, iletişim, hesap sil) backend ve frontend'de implement etmek.

---

## 🎯 Fazlar ve Tahmini Süreler

| Faz | Açıklama | Tahmini Süre |
|-----|----------|--------------|
| **Phase 1** | Database ve Backend Setup | 0.5 gün |
| **Phase 2** | Ayarlar API Endpoints | 1 gün |
| **Phase 3** | Frontend Layout ve Routing | 0.5 gün |
| **Phase 4** | Ayarlar UI (Şifre, Tema, İletişim, Hesap Sil) | 1 gün |
| **Phase 5** | Testing ve Bug Fixes | 0.5 gün |

**Toplam Tahmini Süre:** 2-3 gün

---

## Phase 1: Database ve Backend Setup (0.5 gün)

### Task 1.1: Database Migration - `users` Tablosuna Ayarlar Alanları Ekle
**Dosya:** `backend/alembic/versions/xxx_add_settings_fields.py`

**Eklenecek Alanlar:**
```sql
-- Hesap silme
ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;

-- Tema tercihi
ALTER TABLE users ADD COLUMN theme_preference VARCHAR(10) DEFAULT 'light';

-- Index
CREATE INDEX idx_users_is_deleted ON users(is_deleted);
```

**Test:**
- Migration'ı çalıştır: `alembic upgrade head`
- Veritabanında alanları kontrol et

---

### Task 1.2: Database Migration - `contact_messages` Tablosu Oluştur
**Dosya:** `backend/alembic/versions/xxx_create_contact_messages.py`

**Yeni Tablo:**
```sql
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    answered_at TIMESTAMP DEFAULT NULL,
    answered_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_contact_messages_user ON contact_messages(user_id);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
```

**Test:**
- Migration'ı çalıştır: `alembic upgrade head`
- Tablo oluşturulduğunu kontrol et

---

### Task 1.3: Pydantic Models - Ayarlar Şemaları Oluştur
**Dosya:** `backend/app/schemas/settings.py`

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

# Şifre Değiştirme Request
class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_password(cls, v):
        if not any(c.isalpha() for c in v):
            raise ValueError('Şifre en az 1 harf içermelidir')
        if not any(c.isdigit() for c in v):
            raise ValueError('Şifre en az 1 sayı içermelidir')
        return v

# Tema Değiştirme Request
class ThemeUpdateRequest(BaseModel):
    theme: str = Field(..., pattern='^(light|dark)$')
    
    @validator('theme')
    def validate_theme(cls, v):
        if v not in ['light', 'dark']:
            raise ValueError('Geçersiz tema (light veya dark olmalı)')
        return v

# İletişim Formu Request
class ContactMessageRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=10, max_length=1000)

# İletişim Mesajı Response
class ContactMessageResponse(BaseModel):
    id: int
    subject: str
    message: str
    status: str
    created_at: datetime
    answered_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Hesap Silme Request
class AccountDeleteRequest(BaseModel):
    confirmation: str = Field(..., min_length=9, max_length=9)
    
    @validator('confirmation')
    def validate_confirmation(cls, v):
        if v != "HESAP SIL":
            raise ValueError('Onay yazısı hatalı')
        return v
```

---

### Task 1.4: Rate Limiting - Ayarlar İşlemleri için Rate Limit
**Dosya:** `backend/app/utils/rate_limiter.py` (Güncelleme)

```python
# Mevcut dosyaya ekle

SETTINGS_RATE_LIMITS = {
    "password_change": (5, 3600),    # 5 deneme/saat
    "contact_message": (3, 86400),   # 3 mesaj/gün
    "account_delete": (1, 60),       # 1 deneme/dakika
}

def check_settings_rate_limit(key: str, identifier: str) -> bool:
    """
    Ayarlar işlemleri için rate limit kontrolü.
    """
    if key not in SETTINGS_RATE_LIMITS:
        return True
    
    max_attempts, window = SETTINGS_RATE_LIMITS[key]
    cache_key = f"settings:{key}:{identifier}"
    
    return check_rate_limit(cache_key, max_attempts, window)
```

---

## Phase 2: Ayarlar API Endpoints (1 gün)

### Task 2.1: PATCH /api/v1/settings/password - Şifre Değiştir
**Dosya:** `backend/app/routers/settings.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user
from app.utils.rate_limiter import check_settings_rate_limit
from app.utils.password import verify_password, hash_password
from app.schemas.settings import PasswordChangeRequest

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])

@router.patch("/password")
def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Şifreyi değiştirir.
    """
    # 1. Rate limit
    if not check_settings_rate_limit("password_change", str(current_user.id)):
        raise HTTPException(status_code=429, detail="Çok fazla deneme. 1 saat sonra tekrar deneyin.")
    
    # 2. Mevcut şifre kontrolü
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mevcut şifre yanlış")
    
    # 3. Yeni şifre validasyonu
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Yeni şifre en az 8 karakter olmalı")
    
    if not any(c.isalpha() for c in request.new_password) or not any(c.isdigit() for c in request.new_password):
        raise HTTPException(status_code=400, detail="Yeni şifre en az 1 harf ve 1 sayı içermelidir")
    
    # 4. Şifreyi güncelle
    current_user.hashed_password = hash_password(request.new_password)
    db.commit()
    
    return {
        "success": True,
        "message": "Şifre başarıyla güncellendi"
    }
```

**Test:**
- Normal akış → Şifre güncellenir
- Yanlış mevcut şifre → 400
- Geçersiz yeni şifre → 422 veya 400
- 5 kez deneme → 6. kez 429

---

### Task 2.2: PATCH /api/v1/settings/theme - Tema Değiştir
**Dosya:** `backend/app/routers/settings.py`

```python
from app.schemas.settings import ThemeUpdateRequest

@router.patch("/theme")
def update_theme(
    request: ThemeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tema tercihini günceller.
    """
    current_user.theme_preference = request.theme
    db.commit()
    
    return {
        "success": True,
        "message": "Tema tercihi güncellendi",
        "theme": current_user.theme_preference
    }
```

**Test:**
- Light → Dark → Light değiştir
- Geçersiz tema ("blue") → 422

---

### Task 2.3: POST /api/v1/settings/contact - İletişim Mesajı Gönder
**Dosya:** `backend/app/routers/settings.py`

```python
from app.models.contact import ContactMessage
from app.schemas.settings import ContactMessageRequest

@router.post("/contact")
def send_contact_message(
    request: ContactMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    İletişim mesajı gönderir.
    """
    # 1. Rate limit
    if not check_settings_rate_limit("contact_message", str(current_user.id)):
        raise HTTPException(status_code=429, detail="Günlük mesaj limitine ulaştınız (3 mesaj/gün)")
    
    # 2. Mesajı kaydet
    message = ContactMessage(
        user_id=current_user.id,
        subject=request.subject,
        message=request.message,
        status="pending"
    )
    db.add(message)
    db.commit()
    
    return {
        "success": True,
        "message": "Mesajınız başarıyla gönderildi. En kısa sürede dönüş yapacağız."
    }
```

**Test:**
- Normal akış → Mesaj kaydedilir
- Kısa mesaj (5 karakter) → 422
- Uzun mesaj (1500 karakter) → 422
- 3 mesaj gönder → 4. kez 429

---

### Task 2.4: GET /api/v1/settings/contact/history - İletişim Geçmişi
**Dosya:** `backend/app/routers/settings.py`

```python
from app.schemas.settings import ContactMessageResponse

@router.get("/contact/history")
def get_contact_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcının gönderdiği iletişim mesajlarını listeler.
    """
    messages = db.query(ContactMessage).filter(
        ContactMessage.user_id == current_user.id
    ).order_by(ContactMessage.created_at.desc()).all()
    
    return {
        "total": len(messages),
        "messages": [
            {
                "id": msg.id,
                "subject": msg.subject,
                "message": msg.message,
                "status": msg.status,
                "created_at": msg.created_at.isoformat(),
                "answered_at": msg.answered_at.isoformat() if msg.answered_at else None
            }
            for msg in messages
        ]
    }
```

**Test:**
- Mesajları listele
- Cevaplanan/Cevap bekleyen mesajlar ayrı görünsün

---

### Task 2.5: DELETE /api/v1/settings/account - Hesap Sil
**Dosya:** `backend/app/routers/settings.py`

```python
from app.schemas.settings import AccountDeleteRequest
from datetime import datetime

@router.delete("/account")
def delete_account(
    request: AccountDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hesabı soft-delete yapar.
    """
    # 1. Rate limit
    if not check_settings_rate_limit("account_delete", str(current_user.id)):
        raise HTTPException(status_code=429, detail="Çok fazla deneme. 1 dakika sonra tekrar deneyin.")
    
    # 2. Soft-delete
    current_user.is_deleted = True
    current_user.deleted_at = datetime.utcnow()
    
    # 3. İlanları sil
    from app.models.marketplace import MarketplaceListing
    db.query(MarketplaceListing).filter(
        MarketplaceListing.seller_id == current_user.id
    ).delete()
    
    # 4. Forum mesajlarını anonim yap
    from app.models.forum import ForumTopic, ForumReply
    db.query(ForumTopic).filter(ForumTopic.author_id == current_user.id).update({"author_id": None})
    db.query(ForumReply).filter(ForumReply.author_id == current_user.id).update({"author_id": None})
    
    # 5. DM geçmişini sil (merkezi mesajlaşma sistemi)
    from app.models.marketplace import MarketplaceMessage
    from app.models.career import CareerMessage
    from app.models.conversation import Conversation
    
    # Kullanıcının tüm mesajlarını sil
    db.query(MarketplaceMessage).filter(
        (MarketplaceMessage.sender_id == current_user.id) | 
        (MarketplaceMessage.receiver_id == current_user.id)
    ).delete()
    
    db.query(CareerMessage).filter(
        (CareerMessage.sender_id == current_user.id) | 
        (CareerMessage.receiver_id == current_user.id)
    ).delete()
    
    # Kullanıcının konuşmalarını sil
    db.query(Conversation).filter(
        (Conversation.user1_id == current_user.id) | 
        (Conversation.user2_id == current_user.id)
    ).delete()
    
    # 6. Kariyer başvurularını sil
    from app.models.career import CareerApplication
    db.query(CareerApplication).filter(
        CareerApplication.applicant_id == current_user.id
    ).delete()
    
    # 7. Akademik katkıları sil
    from app.models.academic import AcademicCalendarContribution, CourseScheduleContribution
    db.query(AcademicCalendarContribution).filter(
        AcademicCalendarContribution.contributor_id == current_user.id
    ).delete()
    db.query(CourseScheduleContribution).filter(
        CourseScheduleContribution.contributor_id == current_user.id
    ).delete()
    
    # 8. İletişim mesajlarını sil
    from app.models.contact import ContactMessage
    db.query(ContactMessage).filter(
        ContactMessage.user_id == current_user.id
    ).delete()
    
    db.commit()
    
    return {
        "success": True,
        "message": "Hesabınız başarıyla silindi",
        "requires_logout": True
    }
```

**Test:**
- "HESAP SIL" yaz → Hesap silinir
- "hesap sil" yaz (küçük harf) → 422
- Tüm ilişkili veriler silindiğini kontrol et

---

## Phase 3: Frontend Layout ve Routing (0.5 gün)

### Task 3.1: Ayarlar Layout Komponenti Oluştur
**Dosya:** `frontend/src/layouts/SettingsLayout.tsx`

```tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import SettingsSidebar from '../components/settings/SettingsSidebar';

const SettingsLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (Sabit) */}
      <Header />
      
      {/* Main Content */}
      <div className="flex">
        {/* Settings Sidebar */}
        <SettingsSidebar />
        
        {/* Content Area */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;
```

---

### Task 3.2: Ayarlar Sidebar Komponenti
**Dosya:** `frontend/src/components/settings/SettingsSidebar.tsx`

```tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const SettingsSidebar: React.FC = () => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/dashboard/settings', label: '🔒 Şifre', exact: true },
    { path: '/dashboard/settings/theme', label: '🎨 Tema' },
    { path: '/dashboard/settings/contact', label: '📧 İletişim' },
    { path: '/dashboard/settings/delete', label: '🗑️ Hesap Sil' },
  ];
  
  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };
  
  return (
    <aside className="w-60 bg-white border-r border-gray-200 min-h-screen p-6">
      <h2 className="text-xl font-bold mb-6">⚙️ Ayarlar</h2>
      
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

export default SettingsSidebar;
```

---

### Task 3.3: Routing Ayarları
**Dosya:** `frontend/src/App.tsx` (Güncelleme)

```tsx
import SettingsLayout from './layouts/SettingsLayout';
import SettingsPassword from './pages/settings/SettingsPassword';
import SettingsTheme from './pages/settings/SettingsTheme';
import SettingsContact from './pages/settings/SettingsContact';
import SettingsDelete from './pages/settings/SettingsDelete';

// Route ekle
<Route path="/dashboard/settings" element={<SettingsLayout />}>
  <Route index element={<SettingsPassword />} />
  <Route path="theme" element={<SettingsTheme />} />
  <Route path="contact" element={<SettingsContact />} />
  <Route path="delete" element={<SettingsDelete />} />
</Route>
```

---

## Phase 4: Ayarlar UI (1 gün)

### Task 4.1: Şifre Değiştir Sayfası
**Dosya:** `frontend/src/pages/settings/SettingsPassword.tsx`

(Önceki tasarımdaki gibi - mevcut şifre, yeni şifre, yeni şifre tekrar, göz ikonu)

---

### Task 4.2: Tema Sayfası
**Dosya:** `frontend/src/pages/settings/SettingsTheme.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';

const SettingsTheme: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState(user.theme_preference || 'light');
  const [loading, setLoading] = useState(false);
  
  const handleThemeChange = async (theme: 'light' | 'dark') => {
    setSelectedTheme(theme);
    setLoading(true);
    
    try {
      await api.patch('/settings/theme', { theme });
      updateUser({ theme_preference: theme });
      
      // Anında uygula
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // LocalStorage'a kaydet
      localStorage.setItem('theme', theme);
    } catch (err: any) {
      console.error('Tema değiştirilemedi:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Tema Tercihi</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-700 mb-6">Görünüm Modu:</p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Light Mode */}
          <button
            onClick={() => handleThemeChange('light')}
            disabled={loading}
            className={`p-6 rounded-lg border-2 transition ${
              selectedTheme === 'light'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-4xl mb-2">☀️</div>
            <p className="font-semibold">Light Mode</p>
            {selectedTheme === 'light' && <p className="text-sm text-blue-600 mt-2">✓ Seçili</p>}
          </button>
          
          {/* Dark Mode */}
          <button
            onClick={() => handleThemeChange('dark')}
            disabled={loading}
            className={`p-6 rounded-lg border-2 transition ${
              selectedTheme === 'dark'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-4xl mb-2">🌙</div>
            <p className="font-semibold">Dark Mode</p>
            {selectedTheme === 'dark' && <p className="text-sm text-blue-600 mt-2">✓ Seçili</p>}
          </button>
        </div>
        
        <hr className="my-4" />
        
        <div className="text-sm text-gray-600 space-y-2">
          <p>✓ Seçilen tema anında uygulanır</p>
          <p>✓ Tercih kaydedilir ve her giriş yaptığınızda hatırlanır</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsTheme;
```

---

### Task 4.3: İletişim Sayfası
**Dosya:** `frontend/src/pages/settings/SettingsContact.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const SettingsContact: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  
  useEffect(() => {
    fetchHistory();
  }, []);
  
  const fetchHistory = async () => {
    try {
      const response = await api.get('/settings/contact/history');
      setHistory(response.data.messages);
    } catch (err) {
      console.error('Geçmiş yüklenemedi');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.length < 10) {
      setError('Mesaj en az 10 karakter olmalı');
      return;
    }
    
    setError('');
    setSuccess(false);
    setLoading(true);
    
    try {
      await api.post('/settings/contact', { subject, message });
      setSuccess(true);
      setSubject('');
      setMessage('');
      fetchHistory(); // Geçmişi yenile
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Mesaj gönderilemedi');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">İletişim</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="text-gray-700 mb-4">Platform yetkilileri ile iletişime geçin:</p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Konu:</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Seçiniz</option>
            <option value="Genel Soru">Genel Soru</option>
            <option value="Teknik Destek">Teknik Destek</option>
            <option value="Özellik Önerisi">Özellik Önerisi</option>
            <option value="Hata Bildirimi">Hata Bildirimi</option>
            <option value="Hesap Sorunu">Hesap Sorunu</option>
            <option value="Diğer">Diğer</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mesajınız: ({message.length}/1000)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            maxLength={1000}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Mesajınızı buraya yazın..."
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? '⏳ Gönderiliyor...' : '📤 Gönder'}
        </button>
        
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-600">✅ Mesajınız başarıyla gönderildi! En kısa sürede dönüş yapacağız.</p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        <hr className="my-4" />
        
        <div className="text-sm text-gray-600 space-y-2">
          <p>💡 Cevap süresi: 1-3 iş günü</p>
          <p>📧 Cevap email adresinize gelecektir</p>
        </div>
      </form>
      
      {/* Mesaj Geçmişi */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Mesaj Geçmişi ({history.length})</h2>
          <div className="space-y-3">
            {history.map((msg) => (
              <div key={msg.id} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">{msg.subject}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    msg.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {msg.status === 'answered' ? '✓ Cevaplandı' : '⏳ Bekliyor'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{msg.message}</p>
                <p className="text-xs text-gray-400">
                  {new Date(msg.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsContact;
```

---

### Task 4.4: Hesap Sil Sayfası
**Dosya:** `frontend/src/pages/settings/SettingsDelete.tsx`

(Önceki tasarımdaki gibi - "HESAP SIL" onay, popup, liste)

---

## Phase 5: Testing ve Bug Fixes (0.5 gün)

### Test Senaryoları

1. **Şifre Değiştirme:**
   - Normal akış
   - Yanlış mevcut şifre
   - Geçersiz yeni şifre
   - Şifreler eşleşmiyor
   - Rate limit

2. **Tema Değiştirme:**
   - Light → Dark → Light
   - Tema anında uygulanıyor mu?
   - Logout → Login → Tema hatırlanıyor mu?

3. **İletişim Formu:**
   - Normal akış
   - Kısa mesaj (5 karakter)
   - Uzun mesaj (1500 karakter)
   - Rate limit (3 mesaj/gün)
   - Mesaj geçmişi görüntüleme

4. **Hesap Silme:**
   - Normal akış
   - Yanlış yazı
   - Popup'ta iptal
   - Tüm veriler temizleniyor mu?

5. **Responsive Tasarım:**
   - Desktop
   - Tablet
   - Mobile (sidebar hamburger menü)

---

## ✅ Tamamlanma Kriterleri

- [ ] Database migration başarılı (users tablosuna theme_preference, contact_messages tablosu)
- [ ] Tüm API endpoints çalışıyor (PATCH, POST, DELETE, GET)
- [ ] Frontend routing düzgün (SettingsLayout, 4 alt sayfa)
- [ ] Şifre değiştirme mevcut şifre kontrolü ile çalışıyor
- [ ] Tema değişimi anında uygulanıyor ve kaydediliyor
- [ ] İletişim formu mesajları DB'ye kaydediliyor
- [ ] İletişim mesaj geçmişi görüntülenebiliyor
- [ ] Hesap silme soft-delete yapıyor
- [ ] Hesap silindiğinde kullanıcı verileri temizleniyor
- [ ] Hesap silme sonrası kullanıcı logout oluyor
- [ ] Tüm rate limitler çalışıyor
- [ ] Mobile responsive tasarım (sidebar hamburger menü)

---

## 📦 Dependencies

### Backend
- Mevcut kütüphaneler yeterli (FastAPI, SQLAlchemy, Pydantic)

### Frontend
- Mevcut kütüphaneler yeterli (React, React Router, Axios, Tailwind CSS dark mode)

---

**Tahmini Toplam Süre:** 2-3 gün  
**Son Güncelleme:** 2 Ocak 2026  
**Durum:** Tasks Hazır, Implementation Başlayabilir 🚀
