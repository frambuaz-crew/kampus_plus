# KAMPÜS+ Sistem Genel Bakış ve Teknik Dokümantasyon

**Oluşturulma Tarihi:** 2 Ocak 2026  
**Versiyon:** 2.0  
**Durum:** ✅ Tüm Specs Tamamlandı - Development Ready
**Son Güncelleme:** 2 Ocak 2026

---

## 📋 İçindekiler

1. [Modül Özeti](#modül-özeti)
2. [Teknoloji Stack](#teknoloji-stack)
3. [Database Şeması](#database-şeması)
4. [API Endpoint'leri](#api-endpointleri)
5. [Frontend Routing](#frontend-routing)
6. [Güvenlik ve Yetkilendirme](#güvenlik-ve-yetkilendirme)
7. [Modül Detayları](#modül-detayları)
8. [Entegrasyonlar ve Bağımlılıklar](#entegrasyonlar-ve-bağımlılıklar)
9. [Geliştirme Süresi Tahminleri](#geliştirme-süresi-tahminleri)
10. [MVP Kapsamı](#mvp-kapsamı)

---

## 📊 Modül Özeti

Toplam **20 Modül** tanımlanmıştır:

| # | Modül | Durum | Öncelik | Kategori |
|---|-------|-------|---------|----------|
| 001 | Landing Page | ✅ Ready | P1 - Critical | Public |
| 002 | Register Page | ✅ Ready | P1 - Critical | Auth |
| 003 | Login Page | ✅ Ready | P1 - Critical | Auth |
| 004 | Dashboard | ✅ Ready | P1 - Critical | Core |
| 005 | Forum | ✅ Ready | P2 - High | Community |
| 006 | Academic Features | ✅ Ready | P2 - High | Academic |
| 007 | Marketplace | ✅ Ready | P2 - High | Commerce |
| 008 | Career Page | ✅ Ready | P2 - High | Career |
| 009 | AI Assistant | ✅ Ready | P2 - High | AI |
| 010 | Profile | ✅ Ready | P3 - Medium | User |
| 011 | Settings | ✅ Ready | P3 - Medium | User |
| 012 | Notifications | ✅ Ready | P3 - Medium | System |
| 013 | Messages | ✅ Ready | P2 - High | Communication |
| 014 | Admin Panel | ✅ Ready | P2 - High | Admin |
| 015 | Email Verification | ✅ Ready | P1 - Critical | Auth |
| 016 | Forgot Password | ✅ Ready | P1 - Critical | Auth |
| 017 | Reset Password | ✅ Ready | P1 - Critical | Auth |
| 018 | Terms of Service | ✅ Ready | P2 - Medium | Legal |
| 019 | Global Search | ✅ Ready | P2 - Medium | Search |
| 020 | Error Pages | ✅ Ready | P3 - Medium | System |

---

## 🛠️ Teknoloji Stack

### Backend Teknolojileri

#### Core Framework
- **FastAPI** (v0.104.1) - Modern, hızlı web framework
- **Python** (3.11+) - Programlama dili
- **Uvicorn** (v0.24.0) - ASGI server
- **Pydantic** (v2.12.4) - Data validation
- **Pydantic Settings** (v2.12.0) - Configuration management

#### Database & ORM
- **SQLite** - Database (mezuniyet projesi için basitlik ve sıfır maliyet)
- **SQLAlchemy** (v2.0.35) - ORM
- **Alembic** (v1.17.1) - Database migrations
- **aiosqlite** (v0.19.0) - SQLite async driver
- **NOT:** WAL (Write-Ahead Logging) mode etkin - concurrent reads/writes destekler

#### Authentication & Security
- **python-jose[cryptography]** (v3.3.0) - JWT token handling
- **passlib[bcrypt]** (v1.7.4) - Password hashing
- **bcrypt** (v4.1.1) - Password hashing algorithm
- **python-dotenv** (v1.0.0) - Environment variables

#### AI & Vector Search
- **google-generativeai** (v0.8.3) - Google Gemini API
- **faiss-cpu** (v1.12.0) - Vector similarity search (FAISS)
- **langchain** (v0.3.7) - AI service framework
- **langchain-core** (>=0.3.34) - LangChain core
- **langchain-community** (v0.3.7) - LangChain community
- **langchain-google-genai** (v2.0.5) - Google Gemini integration

#### Storage & File Handling
- **Local File Storage** - Dosyalar backend sunucusunun disk'inde saklanır (`backend/uploads/`)
- **python-multipart** (v0.0.6) - File upload handling
- **NOT:** S3, MinIO veya cloud storage kullanılmaz (mezuniyet projesi için sıfır maliyet)

#### HTTP & Networking
- **httpx** (v0.27.0) - HTTP client (async)
- **email-validator** (v2.1.0) - Email validation

#### Development & Testing
- **pytest** (v8.0.0) - Testing framework
- **pytest-asyncio** (v0.23.3) - Async testing
- **pytest-cov** (v4.1.0) - Coverage reporting
- **black** (v24.1.1) - Code formatter
- **ruff** (v0.1.15) - Linter

#### Optional Dependencies
- **spacy** (v3.7.2) - PII anonymization (optional, fallback mekanizması var)

### Frontend Teknolojileri

#### Core Framework
- **React** (18+) - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool
- **React Router** (v6+) - Client-side routing

#### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **CSS Modules** (opsiyonel) - Component-scoped styles

#### State Management
- **React Context API** - Global state (AuthContext)
- **React Hooks** - Local state management
- **Custom Hooks** - Reusable logic (useAuth, useNotifications, useMessages)

#### HTTP Client
- **Axios** veya **Fetch API** - API calls
- **API Client Wrapper** - Centralized API configuration

#### UI Components
- **Custom Components** - Reusable UI components
- **Icons** - React Icons veya benzeri

#### Development Tools
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking
- **Vite Dev Server** - Development server

---

## 🗄️ Database Şeması

**NOT:** Aşağıdaki SQL şemaları örnek amaçlıdır. Gerçek implementasyonda SQLAlchemy ORM kullanılır ve SQLite uyumludur.
SQLite'da `SERIAL` yerine `INTEGER PRIMARY KEY AUTOINCREMENT` kullanılır, ancak SQLAlchemy bunu otomatik handle eder.

### Core Tables

#### `users` - Kullanıcılar
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    username_last_changed_at TIMESTAMP DEFAULT NULL,
    student_number VARCHAR(50),
    university VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',  -- 'student', 'instructor', 'admin'
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP DEFAULT NULL,
    profile_picture_url VARCHAR(255) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    theme_preference VARCHAR(10) DEFAULT 'light',  -- 'light', 'dark'
    terms_accepted_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_is_deleted (is_deleted),
    INDEX idx_users_is_verified (is_verified)
);
```

#### `refresh_tokens` - Refresh Token'lar
```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_refresh_tokens_user (user_id),
    INDEX idx_refresh_tokens_token (token),
    INDEX idx_refresh_tokens_expires (expires_at)
);
```

### Forum Tables

#### `forum_categories` - Forum Kategorileri
```sql
CREATE TABLE forum_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `forum_topics` - Forum Konuları
```sql
CREATE TABLE forum_topics (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES forum_categories(id),
    author_id INTEGER REFERENCES users(id),  -- NULL = anonim
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    last_reply_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_forum_topics_category (category_id),
    INDEX idx_forum_topics_author (author_id),
    INDEX idx_forum_topics_is_pinned (is_pinned),
    INDEX idx_forum_topics_created_at (created_at)
);
```

#### `forum_replies` - Forum Cevapları
```sql
CREATE TABLE forum_replies (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id),  -- NULL = anonim
    content TEXT NOT NULL,
    helpful_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_forum_replies_topic (topic_id),
    INDEX idx_forum_replies_author (author_id),
    INDEX idx_forum_replies_created_at (created_at)
);
```

### Marketplace Tables

#### `marketplace_listings` - Pazar İlanları
```sql
CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL,  -- 'new', 'like_new', 'good', 'fair'
    image_urls TEXT[],  -- Array of image URLs
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'sold', 'expired'
    view_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,  -- 60 gün sonra otomatik silinir
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_marketplace_listings_seller (seller_id),
    INDEX idx_marketplace_listings_status (status),
    INDEX idx_marketplace_listings_category (category),
    INDEX idx_marketplace_listings_created_at (created_at)
);
```

#### `marketplace_reports` - Pazar Raporları
```sql
CREATE TABLE marketplace_reports (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id),
    reporter_user_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'reviewed', 'action_taken'
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Career Tables

#### `career_listings` - Kariyer İlanları
```sql
CREATE TABLE career_listings (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,  -- 'job', 'internship', 'startup', 'project'
    posted_by INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    company_name VARCHAR(255),  -- NULL for startup/project
    location VARCHAR(255),
    is_remote BOOLEAN DEFAULT FALSE,
    application_type VARCHAR(20) NOT NULL,  -- 'external', 'dm'
    external_url VARCHAR(500),  -- NULL for DM type
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'closed', 'expired'
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_career_listings_type (type),
    INDEX idx_career_listings_posted_by (posted_by),
    INDEX idx_career_listings_status (status),
    INDEX idx_career_listings_created_at (created_at)
);
```

#### `career_applications` - Kariyer Başvuruları
```sql
CREATE TABLE career_applications (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES career_listings(id),
    applicant_id INTEGER NOT NULL REFERENCES users(id),
    application_type VARCHAR(20) NOT NULL,  -- 'external', 'dm'
    dm_conversation_id INTEGER REFERENCES conversations(id),  -- NULL for external
    applied_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(listing_id, applicant_id),
    INDEX idx_career_applications_listing (listing_id),
    INDEX idx_career_applications_applicant (applicant_id)
);
```

#### `career_reports` - Kariyer Raporları
```sql
CREATE TABLE career_reports (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES career_listings(id),
    reporter_user_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Academic Tables

#### `academic_calendar_events` - Akademik Takvim Etkinlikleri
```sql
CREATE TABLE academic_calendar_events (
    id SERIAL PRIMARY KEY,
    university VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,  -- 'exam', 'registration', 'holiday', 'other'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_academic_calendar_university (university),
    INDEX idx_academic_calendar_dates (start_date, end_date)
);
```

#### `course_schedules` - Ders Programları
```sql
CREATE TABLE course_schedules (
    id SERIAL PRIMARY KEY,
    university VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    class_year VARCHAR(50) NOT NULL,  -- '1. Sınıf', '2. Sınıf', vb.
    semester VARCHAR(20) NOT NULL,  -- 'Güz', 'Bahar'
    academic_year VARCHAR(20) NOT NULL,
    schedule_data JSONB NOT NULL,  -- Ders programı verisi (JSON)
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(university, department, class_year, semester, academic_year),
    INDEX idx_course_schedules_university (university),
    INDEX idx_course_schedules_department (department)
);
```

#### `academic_contributions` - Akademik Katkılar
```sql
CREATE TABLE academic_contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL,  -- 'course_schedule', 'academic_calendar'
    university VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    class_year VARCHAR(50),
    semester VARCHAR(20),
    academic_year VARCHAR(20),
    file_url VARCHAR(500),  -- PDF/Resim URL
    manual_data JSONB,  -- Manuel girilen veriler
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    rejection_reason TEXT,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_academic_contributions_user (user_id),
    INDEX idx_academic_contributions_status (status),
    INDEX idx_academic_contributions_type (type)
);
```

### Messaging Tables

#### `conversations` - Konuşmalar (Merkezi)
```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,  -- 'marketplace' veya 'career'
    reference_id INTEGER NOT NULL,  -- ilan ID'si
    user1_id INTEGER NOT NULL REFERENCES users(id),
    user2_id INTEGER NOT NULL REFERENCES users(id),
    last_message_at TIMESTAMP DEFAULT NOW(),
    user1_unread_count INTEGER DEFAULT 0,
    user2_unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(type, reference_id, user1_id, user2_id),
    INDEX idx_conversations_user1 (user1_id),
    INDEX idx_conversations_user2 (user2_id),
    INDEX idx_conversations_last_message (last_message_at)
);
```

#### `marketplace_messages` - Pazar Mesajları
```sql
CREATE TABLE marketplace_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_marketplace_messages_conversation (conversation_id),
    INDEX idx_marketplace_messages_sender (sender_id),
    INDEX idx_marketplace_messages_receiver (receiver_id),
    INDEX idx_marketplace_messages_listing (listing_id),
    INDEX idx_marketplace_messages_created_at (created_at)
);
```

#### `career_messages` - Kariyer Mesajları
```sql
CREATE TABLE career_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    listing_id INTEGER NOT NULL REFERENCES career_listings(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_career_messages_conversation (conversation_id),
    INDEX idx_career_messages_sender (sender_id),
    INDEX idx_career_messages_receiver (receiver_id),
    INDEX idx_career_messages_listing (listing_id),
    INDEX idx_career_messages_created_at (created_at)
);
```

### Notification Tables

#### `notifications` - Bildirimler
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,  -- 'forum_reply', 'forum_mention', 'academic_contribution_approved', 'listing_expiring'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    actor_id INTEGER REFERENCES users(id),  -- NULL = sistem
    link VARCHAR(500),
    metadata JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created_at (created_at),
    INDEX idx_notifications_type (type)
);
```

### AI Assistant Tables

#### `ai_conversations` - AI Konuşmaları
```sql
CREATE TABLE ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_ai_conversations_user (user_id)
);
```

#### `ai_messages` - AI Mesajları
```sql
CREATE TABLE ai_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'user', 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_ai_messages_conversation (conversation_id),
    INDEX idx_ai_messages_created_at (created_at)
);
```

#### `ai_system_settings` - AI Sistem Ayarları
```sql
CREATE TABLE ai_system_settings (
    id SERIAL PRIMARY KEY,
    system_prompt TEXT NOT NULL,
    rate_limit_per_day INTEGER DEFAULT 50,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `ai_knowledge_base` - AI Knowledge Base
```sql
CREATE TABLE ai_knowledge_base (
    id SERIAL PRIMARY KEY,
    keywords TEXT[] NOT NULL,
    answer TEXT NOT NULL,
    priority INTEGER DEFAULT 1,  -- 1 = Yüksek, 5 = Düşük
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ai_knowledge_base_keywords (keywords),
    INDEX idx_ai_knowledge_base_priority (priority),
    INDEX idx_ai_knowledge_base_is_active (is_active)
);
```

### Settings Tables

#### `contact_messages` - İletişim Mesajları
```sql
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'answered', 'closed'
    created_at TIMESTAMP DEFAULT NOW(),
    answered_at TIMESTAMP DEFAULT NULL,
    answered_by INTEGER REFERENCES users(id),
    
    INDEX idx_contact_messages_user (user_id),
    INDEX idx_contact_messages_status (status),
    INDEX idx_contact_messages_created_at (created_at)
);
```

---

## 🔌 API Endpoint'leri

### Authentication Endpoints

#### `POST /api/v1/auth/register`
- **Açıklama:** Yeni kullanıcı kaydı
- **Request:** `{email, password, first_name, last_name, student_number, university, department}`
- **Response:** `{success, message, user_id}`
- **Rate Limit:** 5 kayıt / 10 dakika / IP
- **Validasyon:** Email format, `.edu.tr` domain, password rules

#### `POST /api/v1/auth/login`
- **Açıklama:** Kullanıcı girişi
- **Request:** `{email, password}`
- **Response:** `{access_token, refresh_token, user}`
- **Rate Limit:** 5 deneme / 10 dakika / IP
- **Validasyon:** Email/şifre kontrolü, email verification kontrolü

#### `POST /api/v1/auth/refresh`
- **Açıklama:** Access token yenileme
- **Request:** `{refresh_token}`
- **Response:** `{access_token, refresh_token}`
- **Rate Limit:** 10 istek / 1 dakika / user

#### `POST /api/v1/auth/logout`
- **Açıklama:** Kullanıcı çıkışı
- **Request:** `{refresh_token}`
- **Response:** `{success, message}`
- **Aksiyon:** Refresh token silinir

#### `POST /api/v1/auth/verify-email`
- **Açıklama:** Email doğrulama
- **Request:** `{token}` (JWT email verification token)
- **Response:** `{success, message}`
- **Token Süresi:** 24 saat

#### `POST /api/v1/auth/resend-verification`
- **Açıklama:** Email doğrulama linki tekrar gönderme
- **Request:** `{email}`
- **Response:** `{success, message}`
- **Rate Limit:** 3 istek / 1 saat / email

#### `POST /api/v1/auth/forgot-password`
- **Açıklama:** Şifre sıfırlama linki gönderme
- **Request:** `{email}`
- **Response:** `{success, message}` (her durumda aynı mesaj - enumeration prevention)
- **Rate Limit:** 5 deneme / 10 dakika / email
- **Token Süresi:** 1 saat

#### `POST /api/v1/auth/reset-password`
- **Açıklama:** Şifre sıfırlama
- **Request:** `{token, new_password, confirm_password}`
- **Response:** `{success, message}`
- **Rate Limit:** 5 deneme / 1 saat / IP
- **Aksiyon:** Tüm refresh token'lar iptal edilir

### Forum Endpoints

#### `GET /api/v1/forum/categories`
- **Açıklama:** Forum kategorilerini listele
- **Response:** `{categories: [{id, name, description, icon, topic_count}]}`
- **Auth:** Public (authenticated users)

#### `GET /api/v1/forum/topics`
- **Açıklama:** Forum konularını listele
- **Query Params:** `category_id, page, limit, sort`
- **Response:** `{topics: [{id, title, author, category, reply_count, view_count, created_at}], total, page, limit}`
- **Auth:** Authenticated

#### `GET /api/v1/forum/topics/{topic_id}`
- **Açıklama:** Forum konusu detayı
- **Response:** `{topic: {...}, replies: [...]}`
- **Aksiyon:** View count artırılır

#### `POST /api/v1/forum/topics`
- **Açıklama:** Yeni konu oluştur
- **Request:** `{category_id, title, content}`
- **Response:** `{success, topic_id}`
- **Rate Limit:** 10 konu / 1 saat / user
- **Validasyon:** Title min 10, max 255 karakter, content min 20 karakter

#### `POST /api/v1/forum/topics/{topic_id}/replies`
- **Açıklama:** Konuya cevap yaz
- **Request:** `{content}`
- **Response:** `{success, reply_id}`
- **Rate Limit:** 30 cevap / 1 saat / user
- **Validasyon:** Content min 10 karakter
- **Aksiyon:** Topic'a bildirim gönderilir (eğer kendi konusu değilse)

#### `POST /api/v1/forum/replies/{reply_id}/helpful`
- **Açıklama:** Cevabı beğen
- **Response:** `{success, helpful_count}`
- **Rate Limit:** 50 beğeni / 1 saat / user

#### `POST /api/v1/admin/forum/topics/{id}/pin`
- **Açıklama:** Konuyu pin'le (Admin only)
- **Response:** `{success, message}`

#### `PUT /api/v1/admin/forum/posts/{id}`
- **Açıklama:** Post düzenle (Admin only)
- **Request:** `{content}`
- **Response:** `{success, message}`

#### `DELETE /api/v1/admin/forum/posts/{id}`
- **Açıklama:** Post sil (Admin only)
- **Response:** `{success, message}`

### Marketplace Endpoints

#### `GET /api/v1/marketplace/listings`
- **Açıklama:** Pazar ilanlarını listele
- **Query Params:** `category, page, limit, sort, search`
- **Response:** `{listings: [...], total, page, limit}`
- **Auth:** Authenticated

#### `GET /api/v1/marketplace/listings/{listing_id}`
- **Açıklama:** İlan detayı
- **Response:** `{listing: {...}}`
- **Aksiyon:** View count artırılır

#### `POST /api/v1/marketplace/listings`
- **Açıklama:** Yeni ilan oluştur
- **Request:** `{title, description, price, category, condition, images}`
- **Response:** `{success, listing_id}`
- **Rate Limit:** 5 ilan / 1 gün / user (admin için limit yok)
- **Validasyon:** Title, description, price, category, condition
- **Süre:** 60 gün (otomatik silinir)

#### `PUT /api/v1/marketplace/listings/{listing_id}`
- **Açıklama:** İlanı güncelle
- **Request:** `{title, description, price, ...}`
- **Response:** `{success, message}`
- **Auth:** Sadece ilan sahibi

#### `DELETE /api/v1/marketplace/listings/{listing_id}`
- **Açıklama:** İlanı sil
- **Response:** `{success, message}`
- **Auth:** Sadece ilan sahibi veya admin

#### `POST /api/v1/marketplace/listings/{listing_id}/report`
- **Açıklama:** İlanı rapor et
- **Request:** `{reason}`
- **Response:** `{success, message}`
- **Rate Limit:** 10 rapor / 1 gün / user

### Career Endpoints

#### `GET /api/v1/career/listings`
- **Açıklama:** Kariyer ilanlarını listele
- **Query Params:** `type, page, limit, sort, search`
- **Response:** `{listings: [...], total, page, limit}`
- **Auth:** Authenticated

#### `GET /api/v1/career/listings/{listing_id}`
- **Açıklama:** İlan detayı
- **Response:** `{listing: {...}}`
- **Aksiyon:** View count artırılır

#### `POST /api/v1/career/listings`
- **Açıklama:** Yeni ilan oluştur
- **Request:** `{type, title, description, company_name, location, application_type, external_url}`
- **Response:** `{success, listing_id}`
- **Rate Limit:** 3 ilan / 1 gün / user (admin için limit yok)
- **Validasyon:** Type, title, description, application_type

#### `POST /api/v1/career/listings/{listing_id}/apply`
- **Açıklama:** İlana başvur
- **Request:** `{application_type, message}` (DM için)
- **Response:** `{success, conversation_id}` (DM için)
- **Rate Limit:** 20 başvuru / 1 gün / user

#### `POST /api/v1/career/listings/{listing_id}/report`
- **Açıklama:** İlanı rapor et
- **Request:** `{reason}`
- **Response:** `{success, message}`

### Academic Endpoints

#### `GET /api/v1/academic/calendar`
- **Açıklama:** Akademik takvim etkinliklerini getir
- **Query Params:** `university, academic_year, start_date, end_date`
- **Response:** `{events: [...]}`
- **Auth:** Authenticated

#### `GET /api/v1/academic/course-schedule`
- **Açıklama:** Ders programını getir
- **Query Params:** `university, department, class_year, semester, academic_year`
- **Response:** `{schedule: {...}}`
- **Auth:** Authenticated

#### `POST /api/v1/academic/contribute/calendar`
- **Açıklama:** Akademik takvim katkısı yap
- **Request:** `{university, academic_year, events: [...]}` veya `{file}`
- **Response:** `{success, contribution_id}`
- **Rate Limit:** 5 katkı / 1 gün / user

#### `POST /api/v1/academic/contribute/course-schedule`
- **Açıklama:** Ders programı katkısı yap
- **Request:** `{university, department, class_year, semester, academic_year, file}` veya `{manual_data}`
- **Response:** `{success, contribution_id}`
- **Rate Limit:** 5 katkı / 1 gün / user

### AI Assistant Endpoints

#### `POST /api/v1/ai/chat`
- **Açıklama:** AI ile sohbet
- **Request:** `{message, conversation_id?}`
- **Response:** `{message, conversation_id}`
- **Rate Limit:** 50 mesaj / 1 gün / user (ayarlanabilir)
- **AI Model:** Google Gemini 1.5 Flash
- **Vector Search:** FAISS (official documents, user uploads, forum content)

#### `GET /api/v1/ai/conversations`
- **Açıklama:** AI konuşma geçmişi
- **Response:** `{conversations: [...]}`
- **Auth:** Authenticated

#### `GET /api/v1/ai/conversations/{conversation_id}/messages`
- **Açıklama:** Konuşma mesajlarını getir
- **Response:** `{messages: [...]}`
- **Auth:** Authenticated

#### `DELETE /api/v1/ai/conversations/{conversation_id}`
- **Açıklama:** Konuşmayı sil
- **Response:** `{success, message}`
- **Auth:** Sadece konuşma sahibi

### Messages Endpoints

#### `GET /api/v1/messages/conversations`
- **Açıklama:** Tüm konuşmaları listele (Pazar + Kariyer)
- **Query Params:** `page, limit`
- **Response:** `{conversations: [...], total, total_unread}`
- **Auth:** Authenticated

#### `GET /api/v1/messages/conversations/unread-count`
- **Açıklama:** Okunmamış mesaj sayısı (header badge için)
- **Response:** `{count}`
- **Polling:** 30 saniyede bir

#### `GET /api/v1/messages/conversations/{conversation_id}/messages`
- **Açıklama:** Konuşma mesajlarını getir
- **Query Params:** `page, limit`
- **Response:** `{conversation: {...}, messages: [...]}`
- **Aksiyon:** Mesajlar okundu işaretlenir
- **Polling:** 10 saniyede bir

#### `POST /api/v1/messages/conversations`
- **Açıklama:** Yeni konuşma başlat (ilk mesaj)
- **Request:** `{type, reference_id, receiver_id, content}`
- **Response:** `{success, conversation_id, message_id}`
- **Rate Limit:** 10 konuşma / 1 saat / user
- **Validasyon:** İlan kontrolü, alıcı kontrolü (ilan sahibi olmalı)

#### `POST /api/v1/messages/conversations/{conversation_id}/messages`
- **Açıklama:** Mesaj gönder
- **Request:** `{content}`
- **Response:** `{success, message}`
- **Rate Limit:** 30 mesaj / 1 dakika / user
- **Validasyon:** Content min 1, max 1000 karakter

#### `PATCH /api/v1/messages/conversations/{conversation_id}/read`
- **Açıklama:** Konuşmayı okundu işaretle
- **Response:** `{success, message}`

#### `PATCH /api/v1/messages/conversations/read-all`
- **Açıklama:** Tüm konuşmaları okundu işaretle
- **Response:** `{success, message, count}`

### Notifications Endpoints

#### `GET /api/v1/notifications`
- **Açıklama:** Bildirimleri listele
- **Query Params:** `page, limit, unread_only`
- **Response:** `{notifications: [...], total, unread_count}`
- **Auth:** Authenticated

#### `GET /api/v1/notifications/unread-count`
- **Açıklama:** Okunmamış bildirim sayısı (header badge için)
- **Response:** `{count}`
- **Polling:** 30 saniyede bir

#### `PATCH /api/v1/notifications/{notification_id}/read`
- **Açıklama:** Bildirimi okundu işaretle
- **Response:** `{success, message}`

#### `PATCH /api/v1/notifications/read-all`
- **Açıklama:** Tüm bildirimleri okundu işaretle
- **Response:** `{success, message, count}`

### Profile Endpoints

#### `GET /api/v1/profile/me`
- **Açıklama:** Kullanıcının kendi profil bilgileri
- **Response:** `{id, username, first_name, last_name, email, university, department, profile_picture_url, bio, ...}`
- **Auth:** Authenticated

#### `PATCH /api/v1/profile/username`
- **Açıklama:** Username güncelle
- **Request:** `{username}`
- **Response:** `{success, message, username, next_change_allowed_at}`
- **Rate Limit:** 3 deneme / 1 dakika / user
- **Validasyon:** Alfanumerik + alt tire, 3-30 karakter, benzersiz, 30 günde 1 kez değiştirilebilir

#### `POST /api/v1/profile/picture`
- **Açıklama:** Profil resmi yükle
- **Request:** Multipart form-data (file)
- **Response:** `{success, message, profile_picture_url}`
- **Rate Limit:** 5 yükleme / 1 saat / user
- **Validasyon:** JPG/PNG/WebP, max 2MB, min 200x200px

#### `DELETE /api/v1/profile/picture`
- **Açıklama:** Profil resmini sil
- **Response:** `{success, message}`

#### `PATCH /api/v1/profile/bio`
- **Açıklama:** Bio güncelle
- **Request:** `{bio}`
- **Response:** `{success, message}`
- **Validasyon:** Max 500 karakter

#### `GET /api/v1/profile/listings`
- **Açıklama:** Kullanıcının ilanlarını listele
- **Query Params:** `status, page, limit`
- **Response:** `{listings: [...], total, page, limit}`

#### `GET /api/v1/profile/forum-topics`
- **Açıklama:** Kullanıcının açtığı forum konularını listele
- **Query Params:** `page, limit`
- **Response:** `{topics: [...], total, page, limit}`

#### `GET /api/v1/profile/forum-replies`
- **Açıklama:** Kullanıcının yazdığı forum cevaplarını listele
- **Query Params:** `page, limit`
- **Response:** `{replies: [...], total, page, limit}`

#### `GET /api/v1/profile/applications`
- **Açıklama:** Kullanıcının başvurularını listele
- **Query Params:** `type, page, limit`
- **Response:** `{applications: [...], total, page, limit}`

### Settings Endpoints

#### `PATCH /api/v1/settings/password`
- **Açıklama:** Şifre değiştir
- **Request:** `{current_password, new_password}`
- **Response:** `{success, message}`
- **Rate Limit:** 5 deneme / 1 saat / user
- **Validasyon:** Mevcut şifre kontrolü, yeni şifre kuralları

#### `PATCH /api/v1/settings/theme`
- **Açıklama:** Tema tercihini güncelle
- **Request:** `{theme}` ('light' veya 'dark')
- **Response:** `{success, message, theme}`

#### `POST /api/v1/settings/contact`
- **Açıklama:** İletişim mesajı gönder
- **Request:** `{subject, message}`
- **Response:** `{success, message}`
- **Rate Limit:** 3 mesaj / 1 gün / user
- **Validasyon:** Subject, message min 10, max 1000 karakter

#### `GET /api/v1/settings/contact/history`
- **Açıklama:** İletişim mesaj geçmişi
- **Response:** `{messages: [...]}`

#### `DELETE /api/v1/settings/account`
- **Açıklama:** Hesabı sil (soft-delete)
- **Request:** `{confirmation: "HESAP SIL"}`
- **Response:** `{success, message}`
- **Rate Limit:** 1 deneme / 1 dakika / user
- **Aksiyon:** İlanlar silinir, forum mesajları anonim yapılır, DM geçmişi silinir, kariyer başvuruları silinir

### Admin Endpoints

#### `POST /api/v1/admin/login`
- **Açıklama:** Admin girişi (normal login endpoint'i kullanılır, role kontrolü yapılır)
- **Request:** `{email, password}`
- **Response:** `{access_token, refresh_token, user}`
- **Auth:** Role='admin' olmalı
- **Rate Limit:** 5 deneme / 10 dakika / IP

#### `GET /api/v1/admin/academic/pending-contributions`
- **Açıklama:** Bekleyen akademik katkıları listele
- **Query Params:** `type, page, limit`
- **Response:** `{contributions: [...]}`
- **Auth:** Admin only

#### `POST /api/v1/admin/academic/contributions/{id}/approve`
- **Açıklama:** Katkıyı onayla
- **Response:** `{success, message}`
- **Aksiyon:** Status='approved', öğrenciye bildirim gönderilir

#### `POST /api/v1/admin/academic/contributions/{id}/reject`
- **Açıklama:** Katkıyı reddet
- **Request:** `{reason}`
- **Response:** `{success, message}`
- **Aksiyon:** Status='rejected', öğrenciye bildirim gönderilir (sebep ile)

#### `GET /api/v1/admin/academic/course-schedules`
- **Açıklama:** Ders programlarını listele
- **Response:** `{schedules: [...]}`

#### `POST /api/v1/admin/academic/course-schedules`
- **Açıklama:** Yeni ders programı ekle
- **Request:** `{university, department, class_year, semester, academic_year, file/manual_data}`
- **Response:** `{success, schedule_id}`

#### `GET /api/v1/admin/moderation/marketplace-reports`
- **Açıklama:** Marketplace raporlarını listele
- **Query Params:** `status, page, limit`
- **Response:** `{reports: [...]}`

#### `GET /api/v1/admin/moderation/career-reports`
- **Açıklama:** Career raporlarını listele
- **Query Params:** `status, page, limit`
- **Response:** `{reports: [...]}`

#### `DELETE /api/v1/admin/moderation/listings/{id}`
- **Açıklama:** İlanı sil
- **Response:** `{success, message}`

#### `GET /api/v1/admin/ai/settings`
- **Açıklama:** AI ayarlarını getir
- **Response:** `{system_prompt, rate_limit_per_day}`

#### `PUT /api/v1/admin/ai/settings`
- **Açıklama:** AI ayarlarını güncelle
- **Request:** `{system_prompt, rate_limit_per_day}`
- **Response:** `{success, message}`

#### `GET /api/v1/admin/ai/knowledge-base`
- **Açıklama:** Knowledge base'i listele
- **Response:** `{items: [...]}`

#### `POST /api/v1/admin/ai/knowledge-base`
- **Açıklama:** Yeni cevap ekle
- **Request:** `{keywords, answer, priority, is_active}`
- **Response:** `{success, item_id}`

#### `PUT /api/v1/admin/ai/knowledge-base/{id}`
- **Açıklama:** Cevabı güncelle
- **Request:** `{keywords, answer, priority, is_active}`
- **Response:** `{success, message}`

#### `DELETE /api/v1/admin/ai/knowledge-base/{id}`
- **Açıklama:** Cevabı sil
- **Response:** `{success, message}`

#### `GET /api/v1/admin/ai/stats`
- **Açıklama:** AI kullanım istatistikleri
- **Query Params:** `start_date, end_date`
- **Response:** `{total_messages, active_users, success_rate, top_questions: [...]}`

#### `GET /api/v1/admin/messages`
- **Açıklama:** İletişim mesajlarını listele
- **Query Params:** `status, page, limit`
- **Response:** `{messages: [...]}`

#### `PUT /api/v1/admin/messages/{id}/read`
- **Açıklama:** Mesajı okundu işaretle
- **Response:** `{success, message}`

### Search Endpoints

#### `GET /api/v1/search`
- **Açıklama:** Global arama
- **Query Params:** `q, type, page, limit`
- **Response:** `{query, total_results, results: {forum: {...}, users: {...}}}`
- **Auth:** Authenticated
- **Arama:** SQLite LIKE (MVP), full-text search kullanılmaz

---

## 🗺️ Frontend Routing

### Public Routes

```
/                           → Landing Page (001)
/login                      → Login Page (003)
/register                   → Register Page (002)
/verify-email?token=XXX     → Email Verification (015)
/forgot-password            → Forgot Password (016)
/reset-password?token=XXX   → Reset Password (017)
/terms                      → Terms of Service (018)
/404                        → Error 404 Page (020)
/500                        → Error 500 Page (020)
/403                        → Error 403 Page (020)
```

### Authenticated Routes (Dashboard)

```
/dashboard                  → Dashboard Home (004)
/dashboard/forum            → Forum List (005)
/dashboard/forum/topic/{id} → Forum Topic Detail (005)
/dashboard/marketplace      → Marketplace List (007)
/dashboard/marketplace/listing/{id} → Marketplace Listing Detail (007)
/dashboard/career           → Career List (008)
/dashboard/career/listing/{id} → Career Listing Detail (008)
/dashboard/academic-calendar → Academic Calendar (006)
/dashboard/course-schedule  → Course Schedule (006)
/dashboard/ai-assistant     → AI Assistant Chat (009)
/dashboard/profile          → Profile Page (010)
/dashboard/profile/about    → Profile About (010)
/dashboard/profile/listings → Profile Listings (010)
/dashboard/profile/forum    → Profile Forum (010)
/dashboard/profile/applications → Profile Applications (010)
/dashboard/settings         → Settings Password (011)
/dashboard/settings/theme   → Settings Theme (011)
/dashboard/settings/contact → Settings Contact (011)
/dashboard/settings/delete  → Settings Delete Account (011)
/dashboard/notifications     → Notifications List (012)
/dashboard/messages         → Messages List (013)
/dashboard/messages/{conversation_id} → Messages Chat (013)
/dashboard/search?q=...     → Global Search (019)
```

### Admin Routes

```
/admin/login                → Admin Login (014)
/admin/dashboard            → Admin Dashboard (014)
/admin/academic/pending-contributions → Pending Contributions (014)
/admin/academic/course-schedule → Course Schedule Management (014)
/admin/academic/calendar    → Academic Calendar Management (014)
/admin/moderation/marketplace-reports → Marketplace Reports (014)
/admin/moderation/career-reports → Career Reports (014)
/admin/ai/settings          → AI Settings (014)
/admin/ai/knowledge-base    → AI Knowledge Base (014)
/admin/ai/stats             → AI Statistics (014)
/admin/users                → User Management (014) - Gelecek
/admin/messages             → Contact Messages (014)
```

---

## 🔒 Güvenlik ve Yetkilendirme

### Authentication

#### JWT Token Sistemi
- **Access Token:** 15 dakika geçerli, her istekte gönderilir
- **Refresh Token:** 7 gün geçerli, access token yenileme için
- **Token Storage:** 
  - Frontend: Memory (XSS koruması için localStorage değil)
  - Backend: Database (`refresh_tokens` tablosu)
- **Token Revocation:** Logout, password reset, hesap silme durumlarında tüm refresh token'lar iptal edilir

#### Email Verification
- **Zorunlu:** Kayıt sonrası email doğrulanmadan giriş yapılamaz
- **Token Süresi:** 24 saat
- **Token Tipi:** JWT with `type: "email_verification"`
- **Resend Limit:** 3 istek / 1 saat / email

#### Password Security
- **Hashing:** Bcrypt, cost factor 12
- **Rules:** Min 8 karakter, en az 1 harf, 1 rakam
- **Reset Token:** 1 saat geçerli, one-time use
- **Password History:** MVP'de yok, gelecekte son 5 şifre kontrolü

### Authorization

#### Role-Based Access Control (RBAC)
- **Roles:**
  - `student` - Öğrenci (varsayılan)
  - `instructor` - Eğitmen
  - `admin` - Yönetici
- **Role Checks:**
  - Backend: Her endpoint'te role kontrolü
  - Frontend: ProtectedRoute component ile route koruması
  - Admin Panel: Sadece `role='admin'` erişebilir

#### Resource Ownership
- **Ownership Checks:**
  - İlan düzenleme/silme: Sadece ilan sahibi
  - Forum post düzenleme: İlk 10 dakika içinde sadece yazar (admin her zaman)
  - Profil düzenleme: Sadece kendi profili
  - Mesajlaşma: Sadece konuşma katılımcıları

### Rate Limiting

#### Authentication Endpoints
- **Register:** 5 kayıt / 10 dakika / IP
- **Login:** 5 deneme / 10 dakika / IP
- **Refresh Token:** 10 istek / 1 dakika / user
- **Email Verification Resend:** 3 istek / 1 saat / email
- **Forgot Password:** 5 deneme / 10 dakika / email
- **Reset Password:** 5 deneme / 1 saat / IP

#### Content Creation
- **Forum Topics:** 10 konu / 1 saat / user
- **Forum Replies:** 30 cevap / 1 saat / user
- **Forum Helpful:** 50 beğeni / 1 saat / user
- **Marketplace Listings:** 5 ilan / 1 gün / user (admin için limit yok)
- **Career Listings:** 3 ilan / 1 gün / user (admin için limit yok)
- **Academic Contributions:** 5 katkı / 1 gün / user

#### Messaging
- **New Conversation:** 10 konuşma / 1 saat / user
- **Send Message:** 30 mesaj / 1 dakika / user

#### Profile & Settings
- **Username Change:** 3 deneme / 1 dakika / user (30 günde 1 kez değiştirilebilir)
- **Profile Picture Upload:** 5 yükleme / 1 saat / user
- **Password Change:** 5 deneme / 1 saat / user
- **Contact Form:** 3 mesaj / 1 gün / user
- **Account Deletion:** 1 deneme / 1 dakika / user

#### AI Assistant
- **AI Chat:** 50 mesaj / 1 gün / user (ayarlanabilir, admin panelinden)

#### Admin Endpoints
- **Rate Limiting:** Admin endpoint'lerinde rate limiting YOK (sınırsız işlem)

### Input Validation

#### Client-Side Validation
- **Hızlı feedback** için form validation
- **Real-time validation** (password rules, username format, vb.)
- **Regex patterns** (email, username, vb.)

#### Server-Side Validation
- **Mutlaka yapılmalı** (güvenlik için)
- **Pydantic models** ile request validation
- **SQL injection koruması** (ORM kullanımı)
- **XSS koruması** (input sanitization)

### Security Best Practices

#### Email Enumeration Prevention
- **Forgot Password:** Her durumda (email kayıtlı olsun veya olmasın) aynı mesaj
- **Register:** Email zaten kayıtlıysa genel hata mesajı

#### Token Security
- **HTTPS:** Production'da zorunlu (token URL'de gönderiliyor)
- **Token Expiry:** Tüm token'lar expiry süresi içerir
- **One-Time Use:** Email verification ve password reset token'ları bir kez kullanılabilir
- **Token Revocation:** Refresh token'lar database'de saklanır, iptal edilebilir

#### Data Protection
- **Password Hashing:** Bcrypt, cost factor 12
- **PII Anonymization:** Forum mesajları silindiğinde anonim yapılır
- **Soft Delete:** Hesap silme soft-delete (veriler korunur)
- **GDPR Compliance:** Kullanıcı verileri silme hakkı (gelecek özellik)

---

## 📦 Modül Detayları

### 001 - Landing Page
- **Amaç:** Platform tanıtımı, kayıt/giriş yönlendirmesi
- **Özellikler:** Hero section, özellikler, CTA butonları
- **Teknoloji:** React, Tailwind CSS
- **Auth:** Public

### 002 - Register Page
- **Amaç:** Yeni kullanıcı kaydı
- **Özellikler:** Form validation, `.edu.tr` domain kontrolü, terms acceptance
- **Teknoloji:** React, Form validation, Email validation
- **Auth:** Public
- **Rate Limit:** 5 kayıt / 10 dakika / IP

### 003 - Login Page
- **Amaç:** Kullanıcı girişi
- **Özellikler:** Email/şifre girişi, "Şifremi Unuttum" linki, email verification kontrolü
- **Teknoloji:** React, JWT token handling
- **Auth:** Public
- **Rate Limit:** 5 deneme / 10 dakika / IP

### 004 - Dashboard
- **Amaç:** Ana sayfa, navigasyon merkezi
- **Özellikler:** Hero section, sidebar navigation, header (arama, bildirim, mesaj, profil)
- **Layout:** Sidebar (240px) + Main content
- **Teknoloji:** React Router, Context API
- **Auth:** Authenticated

### 005 - Forum
- **Amaç:** Topluluk forumu
- **Özellikler:**
  - Kategoriler (Genel, Programlama, Üniversite bazlı, vb.)
  - Konu oluşturma/cevaplama
  - Pin/Unpin (admin)
  - Mention (@username)
  - Beğeni sistemi
  - Arama
- **Teknoloji:** React, SQLite LIKE (full-text search kullanılmaz)
- **Auth:** Authenticated
- **Rate Limits:** 10 konu / 1 saat, 30 cevap / 1 saat

### 006 - Academic Features
- **Amaç:** Akademik takvim ve ders programı
- **Özellikler:**
  - Akademik takvim görüntüleme (üniversite bazlı)
  - Ders programı görüntüleme (üniversite + bölüm + sınıf bazlı)
  - Katkı yapma (PDF/Resim yükleme veya manuel giriş)
  - Admin onaylama/reddetme
- **Teknoloji:** React, PDF parsing (gelecek), Image processing
- **Auth:** Authenticated
- **Rate Limits:** 5 katkı / 1 gün

### 007 - Marketplace
- **Amaç:** İkinci el satış platformu
- **Özellikler:**
  - İlan oluşturma (resim, açıklama, fiyat, kategori, durum)
  - İlan listeleme (filtreleme, sıralama, arama)
  - İlan detay sayfası
  - "Satıcıya Mesaj Gönder" butonu (mesajlaşma sistemine yönlendirir)
  - İlan raporlama
  - 60 gün otomatik silme
- **Teknoloji:** React, Image upload, File storage (Local/Cloudflare R2)
- **Auth:** Authenticated
- **Rate Limits:** 5 ilan / 1 gün (admin için limit yok)

### 008 - Career Page
- **Amaç:** Kariyer fırsatları
- **Özellikler:**
  - İlan tipleri: İş, Staj, Startup Ekip, Proje Partner
  - İlan oluşturma
  - İlan listeleme (filtreleme, sıralama, arama)
  - Başvuru (harici link veya platform içi DM)
  - İlan raporlama
- **Teknoloji:** React, External link handling
- **Auth:** Authenticated
- **Rate Limits:** 3 ilan / 1 gün (admin için limit yok)

### 009 - AI Assistant
- **Amaç:** Kampüs bilgileri için AI asistanı
- **Özellikler:**
  - Google Gemini 1.5 Flash entegrasyonu
  - FAISS vector search (official documents, user uploads, forum content)
  - LangChain framework
  - Knowledge base yönetimi (admin)
  - System prompt düzenleme (admin)
  - Rate limit ayarları (admin)
  - Konuşma geçmişi
- **Teknoloji:** 
  - Backend: Google Gemini API, FAISS, LangChain
  - Frontend: React, Chat UI
- **Auth:** Authenticated
- **Rate Limits:** 50 mesaj / 1 gün (ayarlanabilir)
- **Vector Dimensions:** 768 (Google Gemini text-embedding-004)

### 010 - Profile
- **Amaç:** Kullanıcı profil yönetimi
- **Özellikler:**
  - Profil bilgi düzenleme (username, profil resmi, bio)
  - İlanlarım sekmesi (aktif, satıldı, süresi doldu)
  - Forum mesajlarım sekmesi (açtığım konular, yazdığım cevaplar)
  - Başvurularım sekmesi (iş, staj, startup, proje)
- **Layout:** Profil sidebar (240px) + Main content
- **Teknoloji:** React, Image upload
- **Auth:** Authenticated
- **Rate Limits:** Username 3 deneme / 1 dakika, profil resmi 5 yükleme / 1 saat

### 011 - Settings
- **Amaç:** Hesap ayarları
- **Özellikler:**
  - Şifre değiştirme
  - Tema tercihi (Dark/Light Mode)
  - İletişim formu (platform yetkilileri ile)
  - Hesap silme (soft-delete)
- **Layout:** Settings sidebar (240px) + Main content
- **Teknoloji:** React, Theme switching (Tailwind dark mode)
- **Auth:** Authenticated
- **Rate Limits:** Şifre 5 deneme / 1 saat, iletişim 3 mesaj / 1 gün, hesap silme 1 deneme / 1 dakika

### 012 - Notifications
- **Amaç:** Platform içi bildirimler
- **Bildirim Tipleri:**
  1. Forum konuma cevap geldi
  2. Forum mention (@username)
  3. Akademik katkı onayı/reddi
  4. İlan süresi dolacak (3 gün kala)
- **Özellikler:**
  - Header dropdown (son 3 bildirim)
  - Bildirimler sayfası (tüm bildirimler)
  - Okundu/okunmadı işaretleme
  - Polling (30 saniyede bir)
- **Teknoloji:** React, Polling mechanism
- **Auth:** Authenticated
- **Cron Jobs:** İlan süresi dolacak bildirimi (günlük)

### 013 - Messages
- **Amaç:** Merkezi mesajlaşma sistemi
- **Özellikler:**
  - Pazar + Kariyer mesajları tek merkezde
  - İlan bazlı mesajlaşma (rastgele mesaj YOK)
  - Header dropdown (son 3 konuşma)
  - Konuşma listesi
  - Chat ekranı (bubble tasarım)
  - Polling (30s header, 10s chat)
- **Güvenlik:**
  - Her konuşma bir ilan üzerinden başlatılmalı
  - Sadece ilan sahibiyle mesajlaşma
  - Database constraint ile garanti
- **Teknoloji:** React, Polling mechanism
- **Auth:** Authenticated
- **Rate Limits:** 10 konuşma / 1 saat, 30 mesaj / 1 dakika

### 014 - Admin Panel
- **Amaç:** Platform yönetimi
- **Özellikler:**
  - Admin login (ayrı sayfa)
  - Admin dashboard (istatistikler, hızlı erişim)
  - Akademik katkıları onaylama/reddetme
  - Ders programı yönetimi
  - Akademik takvim yönetimi
  - Forum moderation (pin/unpin, düzenleme/silme)
  - Marketplace/Career raporları görüntüleme
  - AI Assistant yönetimi (system prompt, knowledge base, rate limits, istatistikler)
  - İletişim mesajları görüntüleme
- **Layout:** Admin layout (koyu tema, farklı sidebar)
- **Teknoloji:** React, Admin-specific components
- **Auth:** Admin only (role='admin')
- **Rate Limits:** Admin endpoint'lerinde limit YOK

### 015 - Email Verification
- **Amaç:** Email doğrulama
- **Özellikler:**
  - Token doğrulama (otomatik)
  - Başarı/hata state'leri
  - Otomatik redirect (3 saniye sonra login sayfasına)
- **Teknoloji:** React, JWT token validation
- **Auth:** Public (token ile)
- **Token Süresi:** 24 saat

### 016 - Forgot Password
- **Amaç:** Şifre sıfırlama linki alma
- **Özellikler:**
  - Email girişi
  - Email enumeration prevention (her durumda aynı mesaj)
  - Başarı mesajı
- **Teknoloji:** React, Email validation
- **Auth:** Public
- **Rate Limits:** 5 deneme / 10 dakika / email

### 017 - Reset Password
- **Amaç:** Şifre sıfırlama
- **Özellikler:**
  - Token doğrulama
  - Yeni şifre girişi (şifre kuralları, confirmation)
  - Real-time validation feedback
  - Başarı mesajı, otomatik redirect
- **Teknoloji:** React, Password validation
- **Auth:** Public (token ile)
- **Token Süresi:** 1 saat
- **Aksiyon:** Tüm refresh token'lar iptal edilir

### 018 - Terms of Service
- **Amaç:** Kullanım koşulları ve gizlilik politikası
- **Özellikler:**
  - Kullanım koşulları bölümü
  - Gizlilik politikası bölümü
  - Scroll edilebilir içerik
  - "Geri Dön" ve "Kabul Ediyorum" butonları
- **Teknoloji:** React, Static content (MVP)
- **Auth:** Public
- **Not:** İçerik hukukçu tarafından hazırlanmalıdır

### 019 - Global Search
- **Amaç:** Platform genelinde arama
- **Özellikler:**
  - Forum konuları araması
  - Kullanıcı araması
  - Kategorilere göre gruplama
  - Filtreleme (Tümü, Forum, Kullanıcılar)
  - Pagination
- **Teknoloji:** React, SQLite LIKE (MVP, full-text search kullanılmaz)
- **Auth:** Authenticated

### 020 - Error Pages
- **Amaç:** Kullanıcı dostu hata sayfaları
- **Sayfalar:**
  - 404 Not Found
  - 500 Internal Server Error
  - 403 Forbidden
- **Özellikler:**
  - Modern tasarım
  - Navigation butonları
  - Hızlı erişim linkleri (404 için)
- **Teknoloji:** React, Error Boundary
- **Auth:** Public

---

## 🔗 Entegrasyonlar ve Bağımlılıklar

### Modül Bağımlılıkları

```
001-landing-page (bağımsız)
    ↓
002-register-page → 003-login-page → 004-dashboard
    ↓                                    ↓
015-email-verification              Tüm modüller
016-forgot-password → 017-reset-password
018-terms-of-service (register'dan link)

004-dashboard (temel layout)
    ├── 005-forum-page
    ├── 006-academic-features
    ├── 007-marketplace ──┐
    ├── 008-career-page ──┼──→ 013-messages (Merkezi DM)
    ├── 009-ai-assistant  │
    ├── 010-profile       │
    ├── 011-settings      │
    ├── 012-notifications │
    └── 019-global-search │
                          │
012-notifications ← 005-forum, 006-academic, 007-marketplace
010-profile ← 007-marketplace, 008-career, 005-forum
009-ai-assistant ← 006-academic, 007-marketplace, 008-career, 005-forum
014-admin-panel (bağımsız, admin login)
```

### Kritik Entegrasyonlar

#### Mesajlaşma Sistemi (013)
- **Pazar (007):** "Satıcıya Mesaj Gönder" butonu → Mesajlaşma sistemine yönlendirir
- **Kariyer (008):** "İlgileniyorum" butonu (Startup/Proje için) → Mesajlaşma sistemine yönlendirir
- **Güvenlik:** Her konuşma bir ilan üzerinden başlatılmalı, rastgele mesajlaşma YOK

#### Bildirimler Sistemi (012)
- **Forum (005):** Konuya cevap geldiğinde, mention edildiğinde bildirim
- **Akademik (006):** Katkı onaylandığında/reddedildiğinde bildirim
- **Pazar (007):** İlan süresi dolacak bildirimi (cron job)

#### Profil (010)
- **Pazar (007):** İlanlarım sekmesi
- **Kariyer (008):** Başvurularım sekmesi
- **Forum (005):** Forum mesajlarım sekmesi

#### AI Assistant (009)
- **Vector Search:** Official documents, user uploads, forum content
- **Knowledge Base:** Admin panelinden yönetilir
- **System Prompt:** Admin panelinden düzenlenir

#### Admin Panel (014)
- **Akademik (006):** Katkıları onaylama/reddetme, ders programı/takvim yönetimi
- **Forum (005):** Pin/unpin, düzenleme/silme
- **Pazar (007):** Raporları görüntüleme, ilan silme
- **Kariyer (008):** Raporları görüntüleme, ilan silme
- **AI (009):** System prompt, knowledge base, rate limits, istatistikler
- **Ayarlar (011):** İletişim mesajları görüntüleme

---

## ⏱️ Geliştirme Süresi Tahminleri

| Modül | Backend | Frontend | Test | Toplam |
|-------|---------|----------|------|--------|
| 001-003 (Auth) | 3 gün | 2 gün | 1 gün | 6 gün |
| 004 (Dashboard) | 2 gün | 3 gün | 1 gün | 6 gün |
| 005 (Forum) | 5 gün | 4 gün | 2 gün | 11 gün |
| 006 (Academic) | 4 gün | 3 gün | 1 gün | 8 gün |
| 007 (Marketplace) | 3 gün | 3 gün | 1 gün | 7 gün |
| 008 (Career) | 3 gün | 3 gün | 1 gün | 7 gün |
| 009 (AI Assistant) | 4 gün | 2 gün | 1 gün | 7 gün |
| 010 (Profile) | 2 gün | 3 gün | 1 gün | 6 gün |
| 011 (Settings) | 2 gün | 2 gün | 1 gün | 5 gün |
| 012 (Notifications) | 2 gün | 2 gün | 1 gün | 5 gün |
| 013 (Messages) | 3 gün | 3 gün | 1 gün | 7 gün |
| 014 (Admin Panel) | 4 gün | 3 gün | 1 gün | 8 gün |
| 015-017 (Auth Flow) | 2 gün | 2 gün | 1 gün | 5 gün |
| 018 (Terms) | 0.5 gün | 1 gün | 0.5 gün | 2 gün |
| 019 (Search) | 1 gün | 2 gün | 0.5 gün | 3.5 gün |
| 020 (Error Pages) | 0.5 gün | 1 gün | 0.5 gün | 2 gün |

**Toplam Tahmini:** 100-110 iş günü (2-3 kişilik ekip için, ~5-6 ay)

**Not:** Bu tahminler ideal koşullar için. Gerçek süre proje yönetimi, hata düzeltme, code review, vb. faktörlere bağlı olarak değişebilir.

---

## 🎯 MVP Kapsamı

### MVP'de OLAN Özellikler

#### Authentication & Security
- ✅ Email verification ile kayıt/giriş
- ✅ Password reset flow
- ✅ JWT token sistemi (access + refresh)
- ✅ Rate limiting (tüm kritik endpoint'lerde)
- ✅ Role-based access control (student, instructor, admin)

#### Core Features
- ✅ Dashboard (Hero + Sidebar + Header)
- ✅ Forum (kategoriler, konu/cevap, pin, mention, beğeni)
- ✅ Akademik Takvim & Ders Programı (görüntüleme, katkı yapma)
- ✅ Pazar (ilan oluşturma/listeleme, mesajlaşma)
- ✅ Kariyer (iş/staj/startup/proje ilanları, başvuru)
- ✅ AI Asistan (Google Gemini, FAISS vector search, knowledge base)
- ✅ Profil & Ayarlar (düzenleme, istatistikler, tema, hesap silme)
- ✅ Bildirimler (4 tip, header dropdown, sayfa)
- ✅ Merkezi Mesajlaşma (Pazar + Kariyer, polling)
- ✅ Admin Panel (tüm yönetim özellikleri)
- ✅ Global Search (forum, kullanıcılar)
- ✅ Error Pages (404, 500, 403)

#### Technical Features
- ✅ SQLite database (WAL mode ile concurrent access)
- ✅ Alembic migrations
- ✅ Docker Compose (local development)
- ✅ Email service (Gmail SMTP / Mailhog)
- ✅ Local file storage (backend/uploads/)
- ✅ Polling mechanism (30s/10s)
- ✅ Responsive design (Desktop/Tablet/Mobile)

### MVP'de OLMAYAN Özellikler

#### Real-time Features
- ❌ WebSocket (gerçek zamanlı mesajlaşma)
- ❌ Real-time notifications (WebSocket)
- ❌ Live chat typing indicators

#### Advanced Features
- ❌ Dosya/Resim gönderme (mesajlarda)
- ❌ Video/Ses araması
- ❌ Grup mesajlaşması
- ❌ Kullanıcı engelleme
- ❌ Profil sayfasından direkt mesaj
- ❌ Forum'dan direkt DM
- ❌ Mobil uygulama (iOS/Android)
- ❌ Push notifications (mobil)
- ❌ Email notifications (bildirimler için)
- ❌ Advanced search (full-text search, filters)
- ❌ Analytics dashboard
- ❌ User management (admin panelinde, gelecek özellik)

#### Content Features
- ❌ Video upload
- ❌ Audio upload
- ❌ Rich text editor (forum için, gelecek)
- ❌ Markdown support (forum için, gelecek)
- ❌ Image gallery (ilanlar için, şu an tek resim)

---

## 📝 Önemli Notlar ve Kararlar

### Kritik Kararlar

1. **Merkezi Mesajlaşma Sistemi:**
   - Pazar + Kariyer mesajları tek sistemde birleştirildi
   - İlan bazlı mesajlaşma (rastgele mesajlaşma YOK)
   - Güvenlik: Her konuşma bir ilan üzerinden başlatılmalı

2. **Polling vs WebSocket:**
   - MVP için polling kullanılacak (30s header, 10s chat)
   - WebSocket MVP sonrası eklenebilir

3. **Email Domain:**
   - `.edu.tr` domain kontrolü (Türkiye geneli üniversiteler)
   - Email verification zorunlu

4. **AI Model:**
   - Google Gemini 1.5 Flash
   - FAISS vector search (768 dimensions)
   - LangChain framework

5. **Database:**
   - SQLite (mezuniyet projesi için basitlik ve sıfır maliyet)
   - WAL (Write-Ahead Logging) mode etkin - concurrent reads/writes destekler
   - Alembic migrations
   - **NOT:** PostgreSQL kullanılmaz (production için gerekirse ileride eklenebilir)

6. **File Storage:**
   - Local storage (backend/uploads/)
   - Tüm dosyalar backend sunucusunun disk'inde saklanır
   - **NOT:** S3, MinIO, Cloudflare R2 veya cloud storage kullanılmaz (mezuniyet projesi için sıfır maliyet)

7. **Rate Limiting:**
   - In-memory (development)
   - Redis (production, opsiyonel)
   - Admin endpoint'lerinde limit YOK

8. **Authentication:**
   - JWT tokens (access + refresh)
   - Token storage: Memory (frontend), Database (backend)
   - Token revocation: Logout, password reset, account deletion

### Teknik Borç

1. **Mesajlaşma:**
- Eski mesajları temizleme (90 gün sonra)
- Mesaj raporlama sistemi
- Admin panelinde mesaj moderasyonu
   - WebSocket entegrasyonu

2. **Forum:**
   - Full-text search (SQLite'da kullanılmaz, LIKE query yeterli)
   - Rich text editor
   - Markdown support

3. **AI Assistant:**
   - Advanced vector search optimizasyonu
   - Conversation context management
   - Multi-language support

4. **Admin Panel:**
   - User management (gelecek özellik)
   - Audit log (kim ne yaptı)
   - System settings
   - Toplu işlemler

5. **General:**
   - Error tracking (Sentry)
   - Analytics
   - Performance monitoring
   - Caching (Redis)

---

## 🚦 Sonraki Adımlar

1. ✅ **Tüm Specs Tamamlandı**
2. ✅ **SYSTEM_OVERVIEW.md Güncellendi**
3. ⏳ **SDD (Software Design Description) Hazırlanacak**
4. ⏳ **Development Başlayacak:**
   - Phase 1: Infrastructure (Docker, SQLite, Alembic, FastAPI setup)
   - Phase 2: Authentication (Register, Login, Email Verification, Password Reset)
   - Phase 3: Dashboard & Core Layout
   - Phase 4: Forum & Academic Features
   - Phase 5: Marketplace & Career
   - Phase 6: Messages & Notifications
   - Phase 7: AI Assistant
   - Phase 8: Profile & Settings
   - Phase 9: Admin Panel
   - Phase 10: Search & Error Pages
   - Phase 11: Testing & Deployment

---

**Hazırlayan:** Furkan Fidan 
**Onaylayan:** Furkan Fidan  
**Son Güncelleme:** 2 Ocak 2026  
**Versiyon:** 2.0  
**Durum:** ✅ Ready for Development
