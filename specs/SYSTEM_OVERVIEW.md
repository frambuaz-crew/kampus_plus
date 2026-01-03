# KAMPÜS+ Sistem Genel Bakış

**Oluşturulma Tarihi:** 2 Ocak 2026  
**Versiyon:** 1.0  
**Durum:** ✅ Tüm Specs Tamamlandı - Development Ready

---

## 📊 Modül Özeti

Toplam **13 Modül** tanımlanmıştır:

### ✅ Tamamlanan Modüller (13/13)

| # | Modül | Durum | Öncelik | Dosyalar |
|---|-------|-------|---------|----------|
| 001 | Landing Page | ✅ Ready | P1 - Critical | spec.md, tasks.md, design-notes.md |
| 002 | Register Page | ✅ Ready | P1 - Critical | spec.md, tasks.md |
| 003 | Login Page | ✅ Ready | P1 - Critical | spec.md, tasks.md |
| 004 | Dashboard | ✅ Ready | P1 - Critical | spec.md, tasks.md |
| 005 | Forum | ✅ Ready | P2 - High | spec.md, tasks.md |
| 006 | Academic Features | ✅ Ready | P2 - High | spec.md, tasks.md |
| 007 | Marketplace (Pazar) | ✅ Ready | P2 - High | spec.md, tasks.md |
| 008 | Career Page | ✅ Ready | P2 - High | spec.md, tasks.md |
| 009 | AI Assistant | ✅ Ready | P2 - High | spec.md, tasks.md |
| 010 | Profile (Profilim) | ✅ Ready | P3 - Medium | spec.md, tasks.md |
| 011 | Settings (Ayarlar) | ✅ Ready | P3 - Medium | spec.md, tasks.md |
| 012 | Notifications | ✅ Ready | P3 - Medium | spec.md, tasks.md |
| 013 | **Messages (Merkezi DM)** | ✅ Ready | P2 - High | spec.md, tasks.md |

---

## 🎯 Kritik Özellikler

### 1. Kimlik Doğrulama ve Güvenlik
- ✅ `.edu.tr` email domain kontrolü
- ✅ Email verification (JWT token)
- ✅ Password hashing (Bcrypt)
- ✅ Access & Refresh tokens
- ✅ Rate limiting (tüm kritik endpoint'lerde)

### 2. Merkezi Mesajlaşma Sistemi (013-messages)
- ✅ Pazar + Kariyer mesajları tek merkezde
- ✅ İlan bazlı mesajlaşma (rastgele mesaj YOK)
- ✅ Güvenlik kontrolleri (ilan sahibi kontrolü)
- ✅ Polling sistemi (30s header, 10s chat)
- ✅ Rate limiting (10 konuşma/saat, 30 mesaj/dakika)

### 3. Database Yapısı
- **PostgreSQL** (production)
- **Docker Compose** (local development)
- **Alembic** (migrations)
- **Merkezi Tablolar:**
  - `conversations` - Tüm konuşmalar
  - `marketplace_messages` - Pazar mesajları
  - `career_messages` - Kariyer mesajları

### 4. Frontend Stack
- **React + TypeScript**
- **Polling** (MVP için WebSocket yok)
- **Responsive Design** (Desktop/Tablet/Mobile)
- **Context API** (state management)

### 5. Backend Stack
- **FastAPI + Python**
- **SQLAlchemy ORM**
- **JWT Authentication**
- **Rate Limiting** (in-memory)
- **Email Service:** Gmail SMTP (production), Mailhog (local)

---

## 🔒 Güvenlik Özellikleri

### Mesajlaşma Güvenliği
1. ❌ Kullanıcılar rastgele birine mesaj atamaz
2. ✅ Her konuşma bir ilan üzerinden başlatılmalıdır
3. ✅ Sadece ilan sahibiyle mesajlaşma yapılabilir
4. ✅ Database constraint ile garanti (`UNIQUE(type, reference_id, user1_id, user2_id)`)
5. ✅ Backend validasyon (ilan kontrolü, alıcı kontrolü)
6. ✅ Rate limiting (spam önleme)

### Genel Güvenlik
- ✅ Email verification zorunlu
- ✅ Password rules (min 8 char, 1 letter, 1 number)
- ✅ SQL Injection koruması (ORM)
- ✅ XSS koruması (input sanitization)
- ✅ CSRF koruması
- ✅ Rate limiting (tüm kritik endpoint'lerde)

---

## 📁 Dosya Yapısı

```
specs/
├── 001-landing-page/
│   ├── spec.md (224 lines)
│   ├── tasks.md
│   └── design-notes.md
├── 002-register-page/
│   ├── spec.md (1016 lines)
│   └── tasks.md
├── 003-login-page/
│   ├── spec.md (607 lines)
│   └── tasks.md
├── 004-dashboard/
│   ├── spec.md (1089 lines)
│   └── tasks.md
├── 005-forum-page/
│   ├── spec.md (1483 lines)
│   └── tasks.md
├── 006-academic-features/
│   ├── spec.md (1488 lines)
│   └── tasks.md
├── 007-marketplace/
│   ├── spec.md (661 lines)
│   └── tasks.md (1736 lines)
├── 008-career-page/
│   ├── spec.md (757 lines)
│   └── tasks.md (1279 lines)
├── 009-ai-assistant/
│   ├── spec.md (796 lines)
│   └── tasks.md
├── 010-profile/
│   ├── spec.md (854 lines)
│   └── tasks.md
├── 011-settings/
│   ├── spec.md (710 lines)
│   └── tasks.md (866 lines)
├── 012-notifications/
│   ├── spec.md (741 lines)
│   └── tasks.md (1098 lines)
└── 013-messages/          ← YENİ MODÜL (Merkezi DM)
    ├── spec.md (798 lines)
    └── tasks.md (1712 lines)
```

**Toplam:** 26 dosya, ~15,000+ satır dokümantasyon

---

## 🔄 Modüller Arası Bağımlılıklar

### Temel Modüller (P1)
```
001-landing-page (bağımsız)
    ↓
002-register-page → 003-login-page
    ↓
004-dashboard (tüm modüller için temel)
```

### Ana Özellikler (P2)
```
004-dashboard
    ├── 005-forum-page
    ├── 006-academic-features
    ├── 007-marketplace ──┐
    ├── 008-career-page ──┼──→ 013-messages (Merkezi DM)
    └── 009-ai-assistant  │
                          │
010-profile ──────────────┘
011-settings
012-notifications
```

### Kritik Entegrasyonlar
- **013-messages** ← 007-marketplace (Pazar mesajları)
- **013-messages** ← 008-career-page (Kariyer mesajları)
- **012-notifications** ← 005-forum, 006-academic, 007-marketplace
- **010-profile** ← 007-marketplace, 008-career, 005-forum
- **009-ai-assistant** ← 006-academic, 007-marketplace, 008-career, 005-forum

---

## 🚀 Geliştirme Süresi Tahminleri

| Modül | Backend | Frontend | Test | Toplam |
|-------|---------|----------|------|--------|
| 001-003 (Auth) | 3 gün | 2 gün | 1 gün | 6 gün |
| 004 (Dashboard) | 2 gün | 3 gün | 1 gün | 6 gün |
| 005 (Forum) | 5 gün | 4 gün | 2 gün | 11 gün |
| 006 (Academic) | 4 gün | 3 gün | 1 gün | 8 gün |
| 007 (Marketplace) | 3 gün | 3 gün | 1 gün | 7 gün |
| 008 (Career) | 3 gün | 3 gün | 1 gün | 7 gün |
| 009 (AI Assistant) | 3 gün | 2 gün | 1 gün | 6 gün |
| 010-011 (Profile/Settings) | 2 gün | 2 gün | 1 gün | 5 gün |
| 012 (Notifications) | 2 gün | 2 gün | 1 gün | 5 gün |
| 013 (Messages) | 3 gün | 3 gün | 1 gün | 7 gün |

**Toplam Tahmini:** 60-70 iş günü (2-3 kişilik ekip için)

---

## ✅ Kontrol Listesi

### Dokümantasyon
- [x] Tüm modüller için spec.md oluşturuldu
- [x] Tüm modüller için tasks.md oluşturuldu
- [x] Database şemaları tanımlandı
- [x] API endpoint'leri dokümante edildi
- [x] UI mockup'ları hazırlandı
- [x] Test senaryoları yazıldı
- [x] Güvenlik kontrolleri tanımlandı

### Tutarlılık
- [x] Eski "direct_messages" referansları temizlendi
- [x] Merkezi mesajlaşma sistemi entegre edildi
- [x] Tüm modüller arası bağlantılar kontrol edildi
- [x] URL yapıları tutarlı (`/dashboard/messages`)
- [x] API endpoint'leri tutarlı (`/api/v1/messages/*`)
- [x] Database tablo isimleri tutarlı

### Güvenlik
- [x] Rate limiting tanımlandı
- [x] Authentication/Authorization kontrolleri
- [x] Input validation kuralları
- [x] Spam önleme mekanizmaları
- [x] Mesajlaşma güvenlik kuralları

---

## 🎯 MVP Kapsamı

### MVP'de OLAN Özellikler
- ✅ Email verification ile kayıt/giriş
- ✅ Dashboard (Hero + Sidebar)
- ✅ Forum (Profilli, kategorili)
- ✅ Akademik Takvim & Ders Programı
- ✅ Pazar (İkinci el satış)
- ✅ Kariyer (İş/Staj/Startup/Proje)
- ✅ AI Asistan (Gemini 1.5 Flash)
- ✅ Profil & Ayarlar
- ✅ Bildirimler (4 tip)
- ✅ Merkezi Mesajlaşma (Polling)

### MVP'de OLMAYAN Özellikler
- ❌ WebSocket (gerçek zamanlı mesajlaşma)
- ❌ Dosya/Resim gönderme (mesajlarda)
- ❌ Kullanıcı engelleme
- ❌ Grup mesajlaşması
- ❌ Profil sayfasından direkt mesaj
- ❌ Forum'dan direkt DM
- ❌ Video/Ses araması
- ❌ Mobil uygulama

---

## 📝 Notlar

### Kritik Kararlar
1. **Merkezi Mesajlaşma:** Pazar + Kariyer tek sistemde
2. **Polling:** MVP için WebSocket yerine polling (30s/10s)
3. **İlan Bazlı Mesajlaşma:** Rastgele mesajlaşma YOK
4. **Email Domain:** `.edu.tr` (Türkiye geneli)
5. **AI Model:** Google Gemini 1.5 Flash
6. **Database:** PostgreSQL (SQLite'dan geçiş)
7. **Image Storage:** Local (MVP), Cloudflare R2 (production)

### Teknik Borç
- Eski mesajları temizleme (90 gün sonra)
- Mesaj raporlama sistemi
- Admin panelinde mesaj moderasyonu
- WebSocket entegrasyonu (MVP sonrası)
- Dosya/Resim gönderme (mesajlarda)

---

## 🚦 Sonraki Adımlar

1. ✅ **Tüm Specs Tamamlandı**
2. ⏳ **SDD (Software Design Description) Hazırlanacak**
3. ⏳ **Development Başlayacak:**
   - Phase 1: Infrastructure (Docker, PostgreSQL, Alembic)
   - Phase 2: Authentication (Register, Login, Email Verification)
   - Phase 3: Dashboard & Core Features
   - Phase 4: Marketplace & Career
   - Phase 5: Messages & Notifications
   - Phase 6: AI Assistant
   - Phase 7: Testing & Deployment

---

**Hazırlayan:** AI Assistant  
**Onaylayan:** Kullanıcı  
**Son Güncelleme:** 2 Ocak 2026  
**Durum:** ✅ Ready for Development

