# KAMPÜS+ Migration Analysis - Mevcut Proje vs. Yeni Specs

**Tarih:** 2 Ocak 2026  
**Durum:** Analiz Tamamlandı

---

## 📊 Genel Durum

### ✅ Mevcut Projede OLAN Özellikler:
- ✅ FastAPI Backend (Python)
- ✅ React Frontend (TypeScript)
- ✅ Docker Compose setup
- ✅ Alembic migrations
- ✅ Authentication (Register, Login, JWT)
- ✅ Forum sistemi (anonim)
- ✅ AI Chat sistemi (ConversationSession)
- ✅ Document upload sistemi
- ✅ Course/Enrollment sistemi
- ✅ MinIO (S3-compatible storage)

### ❌ Specs'te İSTENEN ama Mevcut Projede OLMAYAN:
- ❌ PostgreSQL (şu an SQLite)
- ❌ Merkezi mesajlaşma sistemi (Pazar + Kariyer)
- ❌ Marketplace (Pazar) modülü
- ❌ Career (Kariyer) modülü
- ❌ Academic Calendar & Course Schedule
- ❌ Notifications sistemi
- ❌ Profile page (username, bio, profile_picture)
- ❌ Settings page (password change, theme, contact, account deletion)
- ❌ Landing page
- ❌ Profilli forum (şu an anonim)

---

## 🔍 Detaylı Karşılaştırma

### 1. DATABASE YAPISI

#### Mevcut Durum:
```python
# User Model (UUID)
id: UUID (PG_UUID)
email: String(255)
password_hash: String(255)
role: Enum (student, instructor, admin)
first_name: String(100)
last_name: String(100)
student_id: String(50)  # Optional
is_verified: Boolean
is_active: Boolean
```

#### Specs'te İstenen:
```python
# User Model (INTEGER)
id: INTEGER (SERIAL)
email: String(255)
password_hash: String(255)
role: Enum (student, instructor, admin)
first_name: String(100)
last_name: String(100)
student_id: String(15)  # 6-15 karakter, zorunlu
department: String(100)  # YENİ - Zorunlu
username: String(50)  # YENİ - Unique, otomatik oluşturulur
profile_picture_url: String(255)  # YENİ - Optional
bio: Text  # YENİ - Optional
is_verified: Boolean
is_active: Boolean
is_deleted: Boolean  # YENİ - Soft delete
deleted_at: DateTime  # YENİ
theme_preference: String(10)  # YENİ - 'light' | 'dark'
```

**Farklar:**
- ❌ UUID → INTEGER (BÜYÜK DEĞİŞİKLİK)
- ❌ `department` eksik
- ❌ `username` eksik
- ❌ `profile_picture_url` eksik
- ❌ `bio` eksik
- ❌ `is_deleted`, `deleted_at` eksik
- ❌ `theme_preference` eksik
- ⚠️ `student_id` validation farklı (6-15 karakter, zorunlu)

---

### 2. MESAJLAŞMA SİSTEMİ

#### Mevcut Durum:
```python
# ConversationSession (AI Chat için)
class ConversationSession:
    id: UUID
    user_id: UUID
    title: Optional[str]
    is_active: Boolean
    messages: List[ChatMessage]  # AI chat messages

class ChatMessage:
    id: UUID
    session_id: UUID
    role: Enum (user, assistant)
    content: Text
    sources: JSON  # AI sources
```

**Kullanım:** Sadece AI chat için

#### Specs'te İstenen:
```python
# Conversation (Merkezi DM sistemi)
class Conversation:
    id: INTEGER
    type: String (marketplace | career)
    reference_id: INTEGER  # İlan ID
    user1_id: INTEGER
    user2_id: INTEGER
    last_message_at: DateTime
    user1_unread_count: INTEGER
    user2_unread_count: INTEGER

class MarketplaceMessage:
    id: INTEGER
    conversation_id: INTEGER
    sender_id: INTEGER
    receiver_id: INTEGER
    content: Text (max 1000)
    is_read: Boolean

class CareerMessage:
    id: INTEGER
    conversation_id: INTEGER
    sender_id: INTEGER
    receiver_id: INTEGER
    content: Text (max 1000)
    is_read: Boolean
```

**Farklar:**
- ❌ Tamamen farklı sistem
- ❌ Mevcut ConversationSession AI chat için
- ❌ Yeni sistem Pazar + Kariyer mesajları için
- ❌ İlan bazlı mesajlaşma (rastgele mesaj YOK)

**Karar:** Mevcut ConversationSession'ı koru (AI chat için), yeni Conversation sistemi ekle (mesajlaşma için)

---

### 3. FORUM SİSTEMİ

#### Mevcut Durum:
```python
# ForumPost (Anonim)
class ForumPost:
    id: UUID
    author_id: UUID
    thread_id: Optional[UUID]
    title: Optional[str]
    content: Text
    anonymous_id: String  # Anonim ID
    is_flagged: Boolean
    is_deleted: Boolean
```

**Özellikler:**
- ✅ Anonim forum
- ✅ Thread/Reply yapısı
- ✅ Flagging sistemi
- ✅ Admin reveal

#### Specs'te İstenen:
```python
# ForumTopic (Profilli)
class ForumTopic:
    id: INTEGER
    author_id: INTEGER
    category_id: INTEGER
    title: String(200)
    content: Text
    is_pinned: Boolean
    is_locked: Boolean
    view_count: INTEGER
    reply_count: INTEGER

class ForumReply:
    id: INTEGER
    topic_id: INTEGER
    author_id: INTEGER  # Profilli (anonim YOK)
    content: Text
    is_edited: Boolean
    edited_at: DateTime
```

**Farklar:**
- ❌ Anonim → Profilli (BÜYÜK DEĞİŞİKLİK)
- ❌ Category sistemi eklenmeli
- ❌ File attachment eklenmeli
- ❌ Mention (@username) eklenmeli
- ❌ Pin/Lock özellikleri eklenmeli

**Karar:** Mevcut anonim forum'u kaldır, profilli forum'a geç

---

### 4. AUTHENTICATION

#### Mevcut Durum:
```python
# Auth Routes
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/verify-email  # DISABLED
POST /auth/resend-verification  # DISABLED
POST /auth/forgot-password
POST /auth/reset-password
```

**Özellikler:**
- ✅ JWT (access + refresh tokens)
- ✅ Email verification (ama disabled)
- ✅ Password reset
- ⚠️ `.edu.tr` validation yok (her email kabul ediliyor)

#### Specs'te İstenen:
```python
# Auth Routes
POST /api/v1/auth/register
  - .edu.tr email validation (ZORUNLU)
  - Email verification (ZORUNLU, aktif olmalı)
  - Rate limiting (5 attempts / 10 min / IP)
  - Student number validation (6-15 karakter, sadece rakam)
  - Department dropdown (20 bölüm + "Diğer")

POST /api/v1/auth/login
  - Remember Me checkbox
  - Unverified account handling (Resend Email butonu)
  - Rate limiting

POST /api/v1/auth/verify-email
  - Email verification token ile
  - Redirect to login (auto-login YOK)

POST /api/v1/auth/resend-verification
  - Rate limiting (3 attempts / 1 hour / email)
```

**Farklar:**
- ❌ `.edu.tr` validation eksik
- ❌ Email verification disabled (aktif etmek gerekiyor)
- ❌ Student number validation eksik
- ❌ Department field eksik
- ❌ Remember Me özelliği eksik
- ❌ Unverified account handling eksik
- ⚠️ Rate limiting var ama farklı limitler

**Karar:** Mevcut auth sistemini adapte et, eksik özellikleri ekle

---

### 5. ROUTING YAPISI

#### Mevcut Durum:
```
Frontend Routes:
/ → /login (redirect)
/login
/register
/verify-email
/dashboard
/chat
/chat-test
/documents
/forum
/courses
/stats
/settings
/help
/admin/login
/admin/dashboard
```

#### Specs'te İstenen:
```
Frontend Routes:
/ → Landing Page (YENİ)
/register
/login
/verify-email
/dashboard → Hero section + Sidebar
/dashboard/messages → Merkezi mesajlaşma (YENİ)
/dashboard/forum
/dashboard/marketplace → Pazar (YENİ)
/dashboard/career → Kariyer (YENİ)
/dashboard/ai → AI Asistan (YENİ)
/dashboard/profile → Profilim (YENİ)
/dashboard/settings → Ayarlar (YENİ)
/dashboard/notifications → Bildirimler (YENİ)
```

**Farklar:**
- ❌ Landing page yok
- ❌ `/dashboard/messages` yok
- ❌ `/dashboard/marketplace` yok
- ❌ `/dashboard/career` yok
- ❌ `/dashboard/ai` yok (şu an `/chat`)
- ❌ `/dashboard/profile` yok
- ❌ `/dashboard/notifications` yok
- ⚠️ `/dashboard` farklı yapıda (Hero section + Sidebar)

**Karar:** Route yapısını specs'e göre yeniden düzenle

---

### 6. BACKEND API ENDPOINTS

#### Mevcut Durum:
```
/api/auth/* → /auth/*
/api/chat/* → /chat/*
/api/forum/* → /forum/*
/api/courses/* → /courses/*
/api/documents/* → /documents/*
/api/health → /health
```

#### Specs'te İstenen:
```
/api/v1/auth/*
/api/v1/messages/* → Merkezi mesajlaşma (YENİ)
/api/v1/marketplace/* → Pazar (YENİ)
/api/v1/career/* → Kariyer (YENİ)
/api/v1/forum/*
/api/v1/ai/* → AI Asistan (YENİ, şu an /chat)
/api/v1/academic/* → Akademik Takvim & Ders Programı (YENİ)
/api/v1/profile/* → Profil (YENİ)
/api/v1/settings/* → Ayarlar (YENİ)
/api/v1/notifications/* → Bildirimler (YENİ)
```

**Farklar:**
- ❌ `/api/v1/` prefix yok (şu an `/api/` veya direkt)
- ❌ `/api/v1/messages/*` yok
- ❌ `/api/v1/marketplace/*` yok
- ❌ `/api/v1/career/*` yok
- ❌ `/api/v1/academic/*` yok
- ❌ `/api/v1/profile/*` yok
- ❌ `/api/v1/settings/*` yok
- ❌ `/api/v1/notifications/*` yok
- ⚠️ `/api/chat/*` → `/api/v1/ai/*` olmalı

**Karar:** API prefix'ini `/api/v1/` yap, yeni endpoint'leri ekle

---

### 7. DATABASE: SQLite → PostgreSQL

#### Mevcut Durum:
```yaml
# docker-compose.yml
DATABASE_URL=sqlite+aiosqlite:///./kampus_plus.db
```

#### Specs'te İstenen:
```yaml
# docker-compose.yml
postgres:
  image: postgres:15
  environment:
    POSTGRES_DB: kampus_plus_db
    POSTGRES_USER: kampus_user
    POSTGRES_PASSWORD: kampus_pass
  volumes:
    - postgres_data:/var/lib/postgresql/data

DATABASE_URL=postgresql+asyncpg://kampus_user:kampus_pass@postgres:5432/kampus_plus_db
```

**Farklar:**
- ❌ SQLite → PostgreSQL (BÜYÜK DEĞİŞİKLİK)
- ❌ UUID → INTEGER (tüm primary key'ler)
- ❌ Async SQLite → Async PostgreSQL

**Karar:** PostgreSQL'e geçiş yap, tüm migration'ları yeniden yaz

---

## 🎯 ÖNCELİKLİ AKSİYONLAR

### 🔴 KRİTİK (Hemen Yapılmalı):

1. **Database Migration: SQLite → PostgreSQL**
   - [ ] PostgreSQL container ekle (docker-compose.yml)
   - [ ] DATABASE_URL güncelle
   - [ ] Tüm migration'ları yeniden yaz (UUID → INTEGER)
   - [ ] Mevcut verileri migrate et (eğer varsa)

2. **User Model Güncelleme**
   - [ ] UUID → INTEGER (id)
   - [ ] `department` field ekle
   - [ ] `username` field ekle (unique, auto-generate)
   - [ ] `profile_picture_url` field ekle
   - [ ] `bio` field ekle
   - [ ] `is_deleted`, `deleted_at` field ekle
   - [ ] `theme_preference` field ekle
   - [ ] `student_id` validation güncelle (6-15 karakter, zorunlu)

3. **Authentication Güncelleme**
   - [ ] `.edu.tr` email validation ekle
   - [ ] Email verification aktif et
   - [ ] Student number validation ekle
   - [ ] Department dropdown ekle
   - [ ] Remember Me özelliği ekle
   - [ ] Unverified account handling ekle
   - [ ] Rate limiting güncelle

4. **Landing Page Ekle**
   - [ ] `/` route oluştur
   - [ ] Header, Hero, Footer component'leri
   - [ ] Login/Register butonları

---

### 🟡 YÜKSEK ÖNCELİK (İlk Sprint):

5. **Merkezi Mesajlaşma Sistemi**
   - [ ] `conversations` tablosu oluştur
   - [ ] `marketplace_messages` tablosu oluştur
   - [ ] `career_messages` tablosu oluştur
   - [ ] API endpoints oluştur (`/api/v1/messages/*`)
   - [ ] Frontend: Header dropdown
   - [ ] Frontend: Konuşma listesi sayfası
   - [ ] Frontend: Chat ekranı

6. **Forum Sistemi Güncelleme**
   - [ ] Anonim forum'u kaldır
   - [ ] Profilli forum'a geç
   - [ ] Category sistemi ekle
   - [ ] File attachment ekle
   - [ ] Mention (@username) ekle
   - [ ] Pin/Lock özellikleri ekle

7. **Marketplace Modülü**
   - [ ] `marketplace_listings` tablosu
   - [ ] `marketplace_listing_images` tablosu
   - [ ] `marketplace_reports` tablosu
   - [ ] API endpoints (`/api/v1/marketplace/*`)
   - [ ] Frontend: İlan listesi, detay, oluşturma

8. **Career Modülü**
   - [ ] `career_listings` tablosu
   - [ ] `career_applications` tablosu
   - [ ] `career_reports` tablosu
   - [ ] API endpoints (`/api/v1/career/*`)
   - [ ] Frontend: İlan listesi, detay, oluşturma

---

### 🟢 ORTA ÖNCELİK (İkinci Sprint):

9. **Academic Features**
   - [ ] `academic_calendar_contributions` tablosu
   - [ ] `course_schedule_contributions` tablosu
   - [ ] API endpoints (`/api/v1/academic/*`)
   - [ ] Frontend: Takvim & Ders programı görüntüleme

10. **Notifications Sistemi**
    - [ ] `notifications` tablosu
    - [ ] API endpoints (`/api/v1/notifications/*`)
    - [ ] Frontend: Header dropdown
    - [ ] Frontend: Notifications sayfası
    - [ ] Cron job (expiring listings)

11. **Profile & Settings**
    - [ ] Profile page (`/dashboard/profile`)
    - [ ] Settings page (`/dashboard/settings`)
    - [ ] Username değiştirme (1/month)
    - [ ] Profile picture upload
    - [ ] Bio güncelleme
    - [ ] Password change
    - [ ] Theme toggle
    - [ ] Contact form
    - [ ] Account deletion (soft delete)

12. **AI Assistant Güncelleme**
    - [x] Model: Gemini 2.5 Flash (mevcut sistemde zaten kullanılıyor, specs güncellendi)
    - [ ] `/api/chat/*` → `/api/v1/ai/*` rename
    - [ ] Rate limiting (50 messages/day)
    - [ ] Conversation history (last 50 messages)
    - [ ] New Conversation button
    - [ ] Frontend: `/dashboard/ai` route

13. **Dashboard Güncelleme**
    - [ ] Hero section
    - [ ] Sidebar (Ana Sayfa, AI, Forum, Pazar, Kariyer, Akademik)
    - [ ] Header (Logo, Arama, Bildirimler, Mesajlar, Profil)
    - [ ] "Bugünün Dersleri" widget
    - [ ] "Yaklaşan Etkinlikler" widget

---

## 📋 SİLİNECEK/DEĞİŞTİRİLECEK ÖZELLİKLER

### ❌ SİLİNECEK:
1. **Anonim Forum Sistemi**
   - `AnonymousMapping` modeli
   - Anonim ID sistemi
   - Admin reveal özelliği

2. **Document Upload Sistemi** (MVP'de yok)
   - `UserDocument` modeli
   - `/api/documents/*` endpoints
   - DocumentsPage frontend

3. **Course/Enrollment Sistemi** (MVP'de yok)
   - `Course` modeli
   - `Enrollment` modeli
   - `/api/courses/*` endpoints
   - CoursesPage frontend

4. **Statistics Page** (MVP'de yok)
   - StatisticsPage frontend

5. **Help Page** (MVP'de yok)
   - HelpPage frontend

6. **Admin Dashboard** (MVP'de yok, sonra eklenebilir)
   - AdminLogin, AdminDashboard

### ⚠️ DEĞİŞTİRİLECEK:
1. **ConversationSession** → Sadece AI chat için kalacak
2. **ChatMessage** → Sadece AI chat için kalacak
3. **ForumPost** → Profilli forum'a geçecek
4. **User Model** → UUID → INTEGER, yeni field'lar eklenecek
5. **Auth Routes** → `/api/v1/auth/*` prefix, yeni validasyonlar
6. **Chat Routes** → `/api/v1/ai/*` rename

---

## 🔄 MIGRATION STRATEJİSİ

### Phase 1: Infrastructure (1-2 gün)
1. PostgreSQL container ekle
2. Database URL güncelle
3. Alembic config güncelle
4. Test connection

### Phase 2: Database Schema (2-3 gün)
1. Yeni migration oluştur (UUID → INTEGER)
2. User model güncelle (yeni field'lar)
3. Yeni tablolar ekle (conversations, marketplace_messages, vb.)
4. Eski tabloları kaldır/güncelle (anonim forum, vb.)

### Phase 3: Backend API (5-7 gün)
1. Auth endpoints güncelle
2. Yeni endpoints ekle (messages, marketplace, career, vb.)
3. Eski endpoints kaldır/güncelle
4. Rate limiting güncelle

### Phase 4: Frontend (7-10 gün)
1. Route yapısını güncelle
2. Landing page ekle
3. Dashboard güncelle
4. Yeni sayfalar ekle (messages, marketplace, career, vb.)
5. Eski sayfaları kaldır/güncelle

### Phase 5: Testing & Cleanup (2-3 gün)
1. Unit tests güncelle
2. Integration tests güncelle
3. E2E tests güncelle
4. Eski kod temizliği

---

## 📊 Tahmini Süre

**Toplam:** 17-25 iş günü (3-5 hafta)

- Infrastructure: 1-2 gün
- Database: 2-3 gün
- Backend: 5-7 gün
- Frontend: 7-10 gün
- Testing: 2-3 gün

---

## ✅ Sonuç

Mevcut proje iyi bir temel oluşturmuş, ancak specs'e göre önemli değişiklikler gerekiyor:

1. **Database:** SQLite → PostgreSQL, UUID → INTEGER
2. **User Model:** Yeni field'lar eklenmeli
3. **Mesajlaşma:** Tamamen yeni sistem
4. **Forum:** Anonim → Profilli
5. **Yeni Modüller:** Marketplace, Career, Academic, Notifications, Profile, Settings
6. **Route Yapısı:** Yeniden düzenlenmeli

**Öneri:** Adım adım migration yap, her phase'i test et, production'a geçmeden önce tüm testleri çalıştır.

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** Analiz Tamamlandı, Migration Planı Hazır

