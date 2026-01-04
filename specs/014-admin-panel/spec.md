# 014 - Admin Panel (Yönetici Paneli)

## 📋 Genel Bakış

Admin Panel, platform yöneticilerinin tüm içeriği yönetebileceği, moderasyon yapabileceği ve sistem ayarlarını kontrol edebileceği merkezi yönetim arayüzüdür.

### 🎯 Amaç
- Platform içeriğini yönetmek (akademik veriler, forum, ilanlar)
- İçerik moderasyonu yapmak (raporlar, uygunsuz içerikler)
- AI Assistant'ı yönetmek (system prompt, knowledge base)
- Kullanıcı hesaplarını yönetmek
- Sistem istatistiklerini görüntülemek

### 👥 Hedef Kullanıcı
- **Admin Role:** Sadece `role='admin'` olan kullanıcılar erişebilir
- **Giriş:** Ayrı admin login sayfası (`/admin/login`)
- **Yetki:** Tüm platform içeriğine tam erişim

### 🔑 Core Değer
"Platform içeriğini güvenli, verimli ve merkezi bir şekilde yönetmek"

---

## 🎨 Sayfa Yapısı

### Genel Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin Header: Logo | Admin Name | Logout                       │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Sidebar   │              Main Content Area                     │
│            │                                                    │
│  📊 Dashboard │                                                │
│  📅 Academic  │                                                │
│  💬 Forum     │                                                │
│  🛒 Marketplace│                                               │
│  💼 Career    │                                                │
│  🤖 AI        │                                                │
│  👥 Users     │                                                │
│  📧 Messages  │                                                │
│            │                                                    │
└────────────┴────────────────────────────────────────────────────┘
```

**Özellikler:**
- Dashboard layout'undan **farklı** bir layout
- Koyu tema (gray-900, red accents)
- Sidebar sabit kalır
- Header'da admin bilgisi ve logout butonu

---

## 🔐 1. Admin Login Sayfası

### 1.1. URL ve Erişim

**URL:** `/admin/login`  
**Erişim:** Public (ama sadece admin role'ü olanlar giriş yapabilir)  
**Redirect:** Başarılı girişte `/admin/dashboard`

### 1.2. Tasarım

```
┌─────────────────────────────────────────────────────────────┐
│                    [Koyu Arka Plan]                        │
│              (gradient: gray-900 → gray-800 → black)      │
│                                                             │
│                    ┌─────────────────┐                     │
│                    │   🔐 (Kırmızı)  │                     │
│                    └─────────────────┘                     │
│                                                             │
│              Admin Panel                                    │
│              Authorized access only                        │
│                                                             │
│         ┌─────────────────────────────────────┐           │
│         │  [Koyu Gri Form Kutusu]              │           │
│         │                                       │           │
│         │  Admin Email                         │           │
│         │  [admin@kampusplus.com        ]      │           │
│         │                                       │           │
│         │  Password                            │           │
│         │  [••••••••                    ]      │           │
│         │                                       │           │
│         │  [  Access Admin Panel  ]            │           │
│         │                                       │           │
│         │  ← Back to Student Portal            │           │
│         └─────────────────────────────────────┘           │
│                                                             │
│  ⚠️ This area is restricted to authorized                  │
│     administrators only. All access attempts are logged.   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3. Form Alanları

**1. Admin Email:**
- Type: `email`
- Placeholder: "admin@kampusplus.com"
- Required: ✅
- Validation: Email format + backend'de admin role kontrolü

**2. Password:**
- Type: `password`
- Placeholder: "••••••••"
- Required: ✅
- Validation: Backend'de şifre + role kontrolü

### 1.4. User Flow

```
1. Admin /admin/login'e gelir
   ↓
2. Email + Password girer
   ↓
3. Backend validation:
   ✅ Email/şifre doğru mu?
   ✅ Role='admin' mi?
   ↓
4. JWT tokens oluşturulur
   ↓
5. /admin/dashboard'a yönlendirilir
```

### 1.5. Hata Durumları

**Normal Kullanıcı Giriş Yaparsa:**
```
❌ Access denied. Admin credentials required.
```

**Yanlış Şifre:**
```
❌ Invalid credentials
```

**Rate Limit:**
```
❌ Too many attempts. Please try again in 10 minutes.
```

### 1.6. Güvenlik

- **Rate Limiting:** 5 deneme / 10 dakika / IP
- **Audit Logging:** Tüm giriş denemeleri loglanır
- **Role Kontrolü:** Hem frontend hem backend'de

---

## 📊 2. Admin Dashboard (Ana Sayfa)

### 2.1. URL ve Layout

**URL:** `/admin/dashboard`  
**Layout:** Admin layout (sidebar + main content)

### 2.2. Dashboard İstatistikleri

```
┌─ HOŞGELDİN, ADMIN! ────────────────────────────────────────┐
│                                                            │
│  ┌──────────────┬──────────────┬──────────────┐          │
│  │ 📊 12        │ 🚩 7         │ 📧 3         │          │
│  │ Bekleyen     │ Rapor        │ Yeni Mesaj   │          │
│  │ Katkı        │ Edilen       │              │          │
│  └──────────────┴──────────────┴──────────────┘          │
│                                                            │
│  ┌──────────────┬──────────────┬──────────────┐          │
│  │ 👥 1,247     │ 🤖 2,543     │ ✅ 45        │          │
│  │ Toplam       │ AI Mesaj     │ Onaylanmış   │          │
│  │ Kullanıcı    │ (Bugün)      │ Veri         │          │
│  └──────────────┴──────────────┴──────────────┘          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**İstatistikler:**
- 📊 Bekleyen katkılar (academic contributions)
- 🚩 Rapor edilen içerikler (marketplace + career)
- 📧 Yeni iletişim mesajları
- 👥 Toplam kullanıcı sayısı
- 🤖 AI kullanım istatistikleri (bugünkü mesaj sayısı)
- ✅ Onaylanmış akademik veriler

### 2.3. Hızlı Erişim Kartları

```
┌─ HIZLI ERİŞİM ────────────────────────────────────────────┐
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ 📅 Ders      │  │ ⏰ Akademik  │  │ 👥 Bekleyen  │    │
│  │ Programı     │  │ Takvim       │  │ Katkılar     │    │
│  │ Yönetimi     │  │ Yönetimi     │  │ (12)         │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ 🚩 Rapor     │  │ 🤖 AI        │  │ 👤 Kullanıcı │    │
│  │ Edilen       │  │ Assistant    │  │ Yönetimi     │    │
│  │ İçerikler    │  │ Ayarları     │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                            │
│  ┌──────────────┐                                         │
│  │ 📧 İletişim  │                                         │
│  │ Mesajları    │                                         │
│  └──────────────┘                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Kartlar:**
1. **📅 Ders Programı Yönetimi** → `/admin/academic/course-schedule`
2. **⏰ Akademik Takvim Yönetimi** → `/admin/academic/calendar`
3. **👥 Bekleyen Katkılar** → `/admin/academic/pending-contributions`
4. **🚩 Rapor Edilen İçerikler** → `/admin/moderation/reports`
5. **🤖 AI Assistant Ayarları** → `/admin/ai/settings`
6. **👤 Kullanıcı Yönetimi** → `/admin/users`
7. **📧 İletişim Mesajları** → `/admin/messages`

---

## 📅 3. Akademik Özellikler Yönetimi

### 3.1. Bekleyen Katkılar

**URL:** `/admin/academic/pending-contributions`

**Görev:**
- Öğrencilerin yüklediği ders programı ve akademik takvim katkılarını inceleme
- Onaylama/reddetme

**Sayfa Görünümü:**

```
┌─ BEKLEYEN KATKILAR ────────────────────────────────────────┐
│                                                            │
│  [🔽 Filtre: Tümü ▼]  [📅 Ders Programı] [⏰ Takvim]      │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 📄 ders_programi.pdf (2 MB)                       │   │
│  │                                                    │   │
│  │ 👤 Ali Yılmaz (@ali_yilmaz)                       │   │
│  │ 📅 2. Sınıf - 2025-2026 Güz                       │   │
│  │ 🎓 Konya Gıda ve Tarım Üniversitesi               │   │
│  │ 💻 Bilgisayar Mühendisliği                        │   │
│  │ 🕐 15 Ocak 2026 14:30                             │   │
│  │                                                    │   │
│  │ [📄 PDF Önizle]  [✅ Onayla]  [❌ Reddet]         │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ ✏️ Manuel Giriş                                   │   │
│  │                                                    │   │
│  │ 👤 Ayşe Demir (@ayse_demir)                       │   │
│  │ 📅 Ara Sınav Haftası                              │   │
│  │ 📆 8-16 Kasım 2025                                │   │
│  │ 🎓 Selçuk Üniversitesi                            │   │
│  │ 🕐 16 Ocak 2026 10:15                             │   │
│  │                                                    │   │
│  │ [👁️ Detayları Gör]  [✅ Onayla]  [❌ Reddet]     │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [Daha Fazla Yükle]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Filtreleme (Ders Programı / Akademik Takvim)
- PDF önizleme
- Parse edilmiş verileri görüntüleme
- Onayla/Reddet butonları
- Reddetme sebebi yazma (öğrenciye bildirim gider)
- Pagination (20 katkı/sayfa)

**Onaylama Akışı:**

```
1. Admin "✅ Onayla" butonuna tıklar
   ↓
2. Onay popup'ı:
   ┌─ Onayla? ─────────────────────┐
   │                                │
   │ Bu katkıyı onaylamak            │
   │ istediğinize emin misiniz?    │
   │                                │
   │ [İptal]  [Evet, Onayla]       │
   └────────────────────────────────┘
   ↓
3. Backend: Katkı onaylanır
   - Status: pending → approved
   - Veri aktif hale gelir
   - Öğrenciye bildirim gider
   ↓
4. Başarı mesajı: "Katkı onaylandı!"
```

**Reddetme Akışı:**

```
1. Admin "❌ Reddet" butonuna tıklar
   ↓
2. Reddetme modal'ı:
   ┌─ Reddet ──────────────────────┐
   │                                │
   │ Reddetme Sebebi: *             │
   │ [________________________]     │
   │                                │
   │ [İptal]  [Reddet]              │
   └────────────────────────────────┘
   ↓
3. Backend: Katkı reddedilir
   - Status: pending → rejected
   - Sebep kaydedilir
   - Öğrenciye bildirim gider (sebep ile)
   ↓
4. Başarı mesajı: "Katkı reddedildi!"
```

### 3.2. Ders Programı Yönetimi

**URL:** `/admin/academic/course-schedule`

**Görev:**
- Üniversite + Bölüm + Sınıf bazlı ders programı ekleme/yönetme

**Sayfa Görünümü:**

```
┌─ DERS PROGRAMI YÖNETİMİ ───────────────────────────────────┐
│                                                            │
│  [+ Yeni Ders Programı Ekle]                              │
│                                                            │
│  ── Mevcut Ders Programları: ──                            │
│                                                            │
│  🎓 Konya Gıda ve Tarım Üniversitesi                      │
│  ├─ Moleküler Biyoloji ve Genetik                         │
│  │  ├─ 1. Sınıf (Dönem 1) ✅ 2025-2026 Güz  [✏️] [🗑️]  │
│  │  ├─ 1. Sınıf (Dönem 2) ⏳ Veri Yok      [+ Ekle]     │
│  │  └─ 3. Sınıf (Dönem 5) ✅ 2025-2026 Güz  [✏️] [🗑️]  │
│  │                                                       │
│  └─ Psikoloji                                             │
│     ├─ 1. Sınıf (Dönem 1) ⏳ Veri Yok      [+ Ekle]     │
│     └─ ...                                                │
│                                                            │
│  🎓 Selçuk Üniversitesi                                    │
│  ├─ Bilgisayar Mühendisliği                               │
│  │  ├─ 2. Sınıf (Dönem 3) ⏳ Veri Yok      [+ Ekle]     │
│  │  └─ ...                                                │
│  └─ ...                                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Ağaç yapısında görüntüleme (Üniversite → Bölüm → Sınıf)
- Veri durumu göstergesi (✅ Veri Var / ⏳ Veri Yok)
- Ders programı ekleme (PDF/Excel/Manuel)
- Düzenleme/Silme

**Yeni Ders Programı Ekleme:**

```
┌─ + DERS PROGRAMI EKLE ────────────────────────────────────┐
│                                                            │
│  Üniversite: *                                            │
│  [Konya Gıda ve Tarım Üniversitesi ▼]                     │
│                                                            │
│  Bölüm: *                                                 │
│  [Moleküler Biyoloji ve Genetik ▼]                        │
│                                                            │
│  Sınıf/Dönem: *                                           │
│  [1. Sınıf (Dönem 1) ▼]                                   │
│                                                            │
│  Akademik Yıl: *                                          │
│  [2025-2026 ▼]                                            │
│                                                            │
│  Dönem: *                                                 │
│  [○ Güz  ○ Bahar]                                         │
│                                                            │
│  ──────────────────────────────────────                  │
│                                                            │
│  Seçenek 1: PDF Yükle 📄                                  │
│  [📎 Dosya Seç...]  [Yükle ve Parse Et]                  │
│                                                            │
│  Seçenek 2: Excel/CSV İçe Aktar                           │
│  [📊 Dosya Seç...]  [İçe Aktar]                           │
│                                                            │
│  Seçenek 3: Manuel Gir                                    │
│  [+ Ders Ekle]                                            │
│                                                            │
│  [❌ İptal]  [✅ Kaydet]                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.3. Akademik Takvim Yönetimi

**URL:** `/admin/academic/calendar`

**Görev:**
- Üniversite bazlı akademik takvim ekleme/yönetme

**Sayfa Görünümü:**

```
┌─ AKADEMİK TAKVİM YÖNETİMİ ─────────────────────────────────┐
│                                                            │
│  [+ Yeni Akademik Takvim Ekle]                           │
│                                                            │
│  ── Mevcut Takvimler: ──                                  │
│                                                            │
│  🎓 Konya Gıda ve Tarım Üniversitesi                      │
│  │  2025-2026 Eğitim-Öğretim Yılı                        │
│  │  ✅ 45 etkinlik                        [✏️] [🗑️]     │
│  │                                                       │
│  🎓 Selçuk Üniversitesi                                    │
│  │  2025-2026 Eğitim-Öğretim Yılı                        │
│  │  ⏳ Veri Yok                          [+ Ekle]       │
│  │                                                       │
│  ...                                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Üniversite bazlı takvim listesi
- Etkinlik ekleme/düzenleme/silme
- PDF/Excel yükleme veya manuel giriş

---

## 💬 4. Forum Moderation

### 4.1. Post Pin/Unpin

**URL:** `/admin/forum` (Forum sayfasında inline)

**Görev:**
- Önemli konuları pin'leme/unpin yapma

**Özellikler:**
- Forum sayfasında her postun yanında "📌 Pin" butonu (sadece admin görür)
- Pin'lenmiş postlar kategori listesinin en üstünde gösterilir
- "[PİN]" badge gösterilir

### 4.2. Post Düzenleme/Silme

**URL:** `/admin/forum` (Forum sayfasında inline)

**Görev:**
- Herhangi bir postu düzenleme/silme

**Özellikler:**
- Her postun yanında "✏️ Düzenle" ve "🗑️ Sil" butonları (sadece admin görür)
- Düzenleme modal'ı (normal kullanıcı modal'ı ile aynı)
- Silme onay popup'ı

---

## 🛒 5. Marketplace Moderation

### 5.1. Rapor Edilen İlanlar

**URL:** `/admin/moderation/marketplace-reports`

**Görev:**
- Kullanıcıların rapor ettiği marketplace ilanlarını görüntüleme
- İlan moderation (silme, uyarı gönderme)

**Sayfa Görünümü:**

```
┌─ MARKETPLACE RAPORLARI ────────────────────────────────────┐
│                                                            │
│  [🔽 Filtre: Tümü ▼]  [⏳ Pending] [✅ Reviewed]          │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 🚩 Rapor Edildi                                    │   │
│  │                                                    │   │
│  │ 📦 iPhone 13 Pro Max - 256GB                      │   │
│  │ 👤 Ahmet Kaya (@ahmet_kaya)                       │   │
│  │ 💰 25,000 TL                                      │   │
│  │                                                    │   │
│  │ ── Rapor Detayları: ──                            │   │
│  │ 👤 Rapor Eden: Ayşe Yılmaz (@ayse_yilmaz)        │   │
│  │ 📝 Sebep: "Fiyat çok yüksek, şüpheli"            │   │
│  │ 🕐 15 Ocak 2026 16:30                             │   │
│  │                                                    │   │
│  │ [👁️ İlanı Gör]  [⚠️ Uyarı Gönder]  [🗑️ Sil]     │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [Daha Fazla Yükle]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Filtreleme (Pending / Reviewed / Action Taken)
- İlan detaylarını görüntüleme
- Rapor sebeplerini görüntüleme
- İlan silme
- İlan sahibine uyarı gönderme
- Rapor durumunu güncelleme

**Uyarı Gönderme:**

```
┌─ UYARI GÖNDER ────────────────────────────────────────────┐
│                                                            │
│  Kullanıcı: Ahmet Kaya (@ahmet_kaya)                      │
│  İlan: iPhone 13 Pro Max - 256GB                         │
│                                                            │
│  Uyarı Mesajı: *                                          │
│  [________________________________]                       │
│  [________________________________]                       │
│                                                            │
│  [İptal]  [Uyarı Gönder]                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.2. Career Reports

**URL:** `/admin/moderation/career-reports`

**Görev:**
- Kariyer ilanlarının raporlarını görüntüleme
- İlan moderation

**Özellikler:**
- Marketplace reports ile aynı yapı
- Ayrı sayfa (career için)

---

## 🤖 6. AI Assistant Yönetimi

### 6.1. System Prompt Düzenleme

**URL:** `/admin/ai/settings`

**Görev:**
- AI'ın system prompt'unu düzenleme

**Sayfa Görünümü:**

```
┌─ AI ASSISTANT AYARLARI ───────────────────────────────────┐
│                                                            │
│  System Prompt: *                                          │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Sen KAMPÜS+ AI Asistanısın. Üniversite            │   │
│  │ öğrencilerine kampüs bilgileri hakkında            │   │
│  │ yardımcı oluyorsun...                              │   │
│  │                                                    │   │
│  │ [Rich text editor - çok satırlı]                  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [💾 Kaydet]  [👁️ Önizle]                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Rich text editor (çok satırlı)
- Preview özelliği
- Kaydetme (backend'e POST)

### 6.2. Knowledge Base Yönetimi

**URL:** `/admin/ai/knowledge-base`

**Görev:**
- Knowledge base'e cevaplar ekleme/düzenleme/silme

**Sayfa Görünümü:**

```
┌─ KNOWLEDGE BASE YÖNETİMİ ─────────────────────────────────┐
│                                                            │
│  [+ Yeni Cevap Ekle]  [🔍 Ara...]                        │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Anahtar Kelimeler: yemekhane, kantin, menü         │   │
│  │                                                    │   │
│  │ Cevap:                                             │   │
│  │ Yemekhane menüsü için üniversitenin web            │   │
│  │ sitesini ziyaret edebilirsin:                      │   │
│  │ https://selcuk.edu.tr/yemekhane                    │   │
│  │                                                    │   │
│  │ Öncelik: 1  |  Durum: ✅ Aktif                    │   │
│  │                                                    │   │
│  │ [✏️ Düzenle]  [🗑️ Sil]                            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [Daha Fazla Yükle]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- CRUD işlemleri (Create, Read, Update, Delete)
- Anahtar kelime arama
- Öncelik sıralaması
- Aktif/Pasif durumu

**Yeni Cevap Ekleme:**

```
┌─ + YENİ CEVAP EKLE ───────────────────────────────────────┐
│                                                            │
│  Anahtar Kelimeler: * (virgülle ayır)                     │
│  [yemekhane, kantin, menü, yemek]                         │
│                                                            │
│  Cevap: *                                                  │
│  [________________________________]                       │
│  [________________________________]                       │
│                                                            │
│  Öncelik:                                                  │
│  [1 ▼] (1 = Yüksek, 5 = Düşük)                            │
│                                                            │
│  Durum:                                                    │
│  [○ Aktif  ○ Pasif]                                       │
│                                                            │
│  [❌ İptal]  [✅ Kaydet]                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 6.3. Rate Limit Ayarları

**URL:** `/admin/ai/settings` (aynı sayfa, farklı sekme)

**Görev:**
- Günlük mesaj limitini ayarlama

**Sayfa Görünümü:**

```
┌─ RATE LİMİT AYARLARI ─────────────────────────────────────┐
│                                                            │
│  Günlük Mesaj Limiti: *                                    │
│  [50] mesaj/gün/kullanıcı                                  │
│                                                            │
│  [💾 Kaydet]                                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 6.4. İstatistikler

**URL:** `/admin/ai/stats`

**Görev:**
- AI kullanım istatistiklerini görüntüleme

**Sayfa Görünümü:**

```
┌─ AI KULLANIM İSTATİSTİKLERİ ──────────────────────────────┐
│                                                            │
│  [📅 Bugün] [📅 Bu Hafta] [📅 Bu Ay] [📅 Tüm Zamanlar]   │
│                                                            │
│  ┌──────────────┬──────────────┬──────────────┐          │
│  │ 2,543        │ 1,247        │ 98.5%        │          │
│  │ Toplam Mesaj │ Aktif        │ Başarı       │          │
│  │ (Bugün)      │ Kullanıcı    │ Oranı        │          │
│  └──────────────┴──────────────┴──────────────┘          │
│                                                            │
│  ── En Çok Sorulan Sorular: ──                            │
│  1. "Bugün hangi derslerim var?" (234 soru)              │
│  2. "Ara sınav ne zaman?" (189 soru)                      │
│  3. "Yemekhane menüsü" (156 soru)                        │
│                                                            │
│  [📊 Grafikler]  [📥 CSV İndir]                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 👥 7. Kullanıcı Yönetimi (Gelecek Özellik)

### 7.1. Kullanıcı Listesi

**URL:** `/admin/users`

**Görev:**
- Tüm kullanıcıları görüntüleme/yönetme

**Özellikler:**
- Filtreleme (role, durum, üniversite, bölüm)
- Arama (isim, email, username)
- Pagination (20 kullanıcı/sayfa)
- Hesap askıya alma/aktifleştirme
- Email verification manuel onay

**Not:** MVP'de düşük öncelik, sonra eklenebilir.

---

## 📧 8. İletişim Mesajları

### 8.1. Mesaj Listesi

**URL:** `/admin/messages`

**Görev:**
- Kullanıcıların gönderdiği iletişim formu mesajlarını görüntüleme

**Sayfa Görünümü:**

```
┌─ İLETİŞİM MESAJLARI ──────────────────────────────────────┐
│                                                            │
│  [🔽 Filtre: Tümü ▼]  [📬 Yeni] [👁️ Okundu] [✅ Cevaplandı]│
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 📬 Yeni                                           │   │
│  │                                                    │   │
│  │ 👤 Ali Yılmaz (@ali_yilmaz)                      │   │
│  │ 📧 ali.yilmaz@selcuk.edu.tr                      │   │
│  │ 📝 Konu: Teknik Sorun                            │   │
│  │                                                    │   │
│  │ Mesaj:                                            │   │
│  │ "Profil resmimi yükleyemiyorum. Yardımcı         │   │
│  │  olabilir misiniz?"                               │   │
│  │                                                    │   │
│  │ 🕐 15 Ocak 2026 18:45                             │   │
│  │                                                    │   │
│  │ [👁️ Okundu İşaretle]  [📧 Email ile Cevapla]     │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [Daha Fazla Yükle]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Filtreleme (durum, konu, tarih)
- Arama (mesaj içeriği)
- Okundu işaretleme
- Email ile cevap verme (dış sistem - Gmail, Outlook, vb.)

---

## 🔧 Teknik Detaylar

### Database Schema

#### `ai_system_settings` Tablosu

```sql
CREATE TABLE ai_system_settings (
    id SERIAL PRIMARY KEY,
    system_prompt TEXT NOT NULL,
    rate_limit_per_day INTEGER DEFAULT 50,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `ai_knowledge_base` Tablosu

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
```

#### `academic_contributions` Tablosu

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
    file_url VARCHAR(500),  -- PDF/Resim URL
    manual_data JSONB,  -- Manuel girilen veriler
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
    rejection_reason TEXT,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `marketplace_reports` Tablosu

```sql
CREATE TABLE marketplace_reports (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES marketplace_listings(id),
    reporter_user_id INTEGER REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'reviewed' | 'action_taken'
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `career_reports` Tablosu

```sql
CREATE TABLE career_reports (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES career_listings(id),
    reporter_user_id INTEGER REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `contact_messages` Tablosu

```sql
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'new',  -- 'new' | 'read' | 'replied'
    read_by INTEGER REFERENCES users(id),
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Backend API Endpoints

#### Admin Authentication

**POST /api/v1/admin/login**
- Admin login (normal login endpoint'i kullanılır, role kontrolü yapılır)

#### Academic Management

**GET /api/v1/admin/academic/pending-contributions**
- Bekleyen katkıları listele

**POST /api/v1/admin/academic/contributions/{id}/approve**
- Katkıyı onayla

**POST /api/v1/admin/academic/contributions/{id}/reject**
- Katkıyı reddet (sebep ile)

**GET /api/v1/admin/academic/course-schedules**
- Ders programlarını listele

**POST /api/v1/admin/academic/course-schedules**
- Yeni ders programı ekle

**PUT /api/v1/admin/academic/course-schedules/{id}**
- Ders programını güncelle

**DELETE /api/v1/admin/academic/course-schedules/{id}**
- Ders programını sil

#### Forum Moderation

**POST /api/v1/admin/forum/topics/{id}/pin**
- Konuyu pin'le

**POST /api/v1/admin/forum/topics/{id}/unpin**
- Konuyu unpin yap

**PUT /api/v1/admin/forum/posts/{id}**
- Postu düzenle

**DELETE /api/v1/admin/forum/posts/{id}**
- Postu sil

#### Marketplace/Career Reports

**GET /api/v1/admin/moderation/marketplace-reports**
- Marketplace raporlarını listele

**GET /api/v1/admin/moderation/career-reports**
- Career raporlarını listele

**PUT /api/v1/admin/moderation/reports/{id}/status**
- Rapor durumunu güncelle

**DELETE /api/v1/admin/moderation/listings/{id}**
- İlanı sil

#### AI Assistant Management

**GET /api/v1/admin/ai/settings**
- AI ayarlarını getir

**PUT /api/v1/admin/ai/settings**
- AI ayarlarını güncelle

**GET /api/v1/admin/ai/knowledge-base**
- Knowledge base'i listele

**POST /api/v1/admin/ai/knowledge-base**
- Yeni cevap ekle

**PUT /api/v1/admin/ai/knowledge-base/{id}**
- Cevabı güncelle

**DELETE /api/v1/admin/ai/knowledge-base/{id}**
- Cevabı sil

**GET /api/v1/admin/ai/stats**
- AI istatistiklerini getir

#### Contact Messages

**GET /api/v1/admin/messages**
- İletişim mesajlarını listele

**PUT /api/v1/admin/messages/{id}/read**
- Mesajı okundu işaretle

---

### Frontend Routes

```
/admin/login                    → Admin Login
/admin/dashboard                → Admin Dashboard
/admin/academic/pending-contributions → Bekleyen Katkılar
/admin/academic/course-schedule → Ders Programı Yönetimi
/admin/academic/calendar        → Akademik Takvim Yönetimi
/admin/moderation/marketplace-reports → Marketplace Raporları
/admin/moderation/career-reports → Career Raporları
/admin/ai/settings              → AI Ayarları
/admin/ai/knowledge-base        → Knowledge Base
/admin/ai/stats                 → AI İstatistikleri
/admin/users                    → Kullanıcı Yönetimi (gelecek)
/admin/messages                 → İletişim Mesajları
```

---

## ✅ MVP Öncelikleri

### Yüksek Öncelik (İlk Sprint)

1. ✅ Admin Login (`/admin/login`)
2. ✅ Admin Dashboard (`/admin/dashboard`)
3. ✅ Academic Contributions Onaylama/Reddetme
4. ✅ AI Assistant Yönetimi (Settings, Knowledge Base)
5. ✅ Marketplace/Career Reports Görüntüleme

### Orta Öncelik (İkinci Sprint)

6. ⚠️ Forum Pin/Unpin
7. ⚠️ Ders Programı Yönetimi (Admin ekleme)
8. ⚠️ Akademik Takvim Yönetimi (Admin ekleme)

### Düşük Öncelik (Gelecek)

9. ⏳ User Management
10. ⏳ System Settings
11. ⏳ Audit Log
12. ⏳ Toplu İşlemler

---

## 🔒 Güvenlik

### Admin Yetkileri

- ✅ Sadece `role='admin'` olan kullanıcılar erişebilir
- ✅ Tüm endpoint'lerde role kontrolü
- ✅ Rate limiting yok (adminler için)
- ✅ Audit logging (kim ne yaptı - gelecek özellik)

### Rate Limiting

- ✅ Admin endpoint'lerinde rate limiting YOK
- ✅ Normal kullanıcı endpoint'lerinde rate limiting VAR

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Spec Tamamlandı

