# 004 - Dashboard (Ana Kontrol Paneli)

## 📋 Genel Bakış

Dashboard, kullanıcıların login olduktan sonra karşılaştıkları ana kontrol paneli sayfasıdır. Tüm platform özelliklerine buradan erişilir.

### 🎯 Amaç
- Kullanıcıya kişiselleştirilmiş karşılama deneyimi sunmak
- Platform'daki tüm özelliklere merkezi erişim noktası olmak
- Temiz, modern ve kullanıcı dostu bir arayüz sunmak

### 👥 Hedef Kullanıcı
- Email doğrulaması yapılmış üniversite öğrencileri
- Sisteme login olmuş tüm kullanıcılar

---

## 🎨 Sayfa Yapısı

### Layout Bileşenleri

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo | Arama | Bildirim | Profil Dropdown              │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Sidebar   │              Main Content Area                     │
│            │                                                    │
│  🏠 Ana    │                                                    │
│  🤖 AI     │                                                    │
│  💬 Forum  │                                                    │
│  🛒 Pazar  │                                                    │
│            │                                                    │
└────────────┴────────────────────────────────────────────────────┘
```

---

## 🧩 1. Header (Üst Bar)

### 1.1. Header Bileşenleri

```
┌────────────────────────────────────────────────────────────────────┐
│  📚 KAMPÜS+    🔍 [Ara...]         🔔    💬    👤 (AY) ▼         │
└────────────────────────────────────────────────────────────────────┘
   Logo           Arama            Bildirim Mesaj  Profil
```

#### **Sol Taraf:**
- **Logo:** "KAMPÜS+" logosu (tıklanınca Ana Sayfa'ya gider)

#### **Orta:**
- **Arama Çubuğu:** Global arama (forum konuları, kullanıcılar)
  - Placeholder: "Konu, kullanıcı veya içerik ara..."
  - Enter'a basınca arama sonuçları sayfasına gider

#### **Sağ Taraf:**

**1. Bildirimler Dropdown (🔔):**
- Yeni bildirim varsa kırmızı badge (örn: 3)
- Tıklayınca dropdown ile son bildirimler açılır:
  ```
  ┌─ BİLDİRİMLER ────────────────────────────┐
  │                                          │
  │  📬 Yeni forum yanıtı                    │
  │     "React Hooks" konusuna...            │
  │     5 dakika önce                        │
  │                                          │
  │  🛒 İlanına mesaj geldi                  │
  │     "iPhone 13" ilanına...               │
  │     2 saat önce                          │
  │                                          │
  │  [Tümünü Gör]                            │
  └──────────────────────────────────────────┘
  ```

**2. Mesajlar Dropdown (💬):**
- Okunmamış mesaj varsa kırmızı badge (örn: 2)
- Tıklayınca dropdown ile son mesajlar açılır:
  ```
  ┌─ MESAJLAR (2) ─────────────────────────────┐
  │                                            │
  │  🟢 Ahmet Kaya                             │
  │     📦 Pazar: iPhone Satılık               │
  │     "iPhone hala satılık mı?"              │
  │     10 dakika önce                         │
  │                                            │
  │  🟢 Ayşe Yılmaz                            │
  │     💼 Kariyer: Frontend Developer         │
  │     "Staj için detay alabilir miyim?"      │
  │     1 saat önce                            │
  │                                            │
  │  ⚪ Mehmet Demir                            │
  │     📦 Pazar: Laptop Satılık               │
  │     "Teşekkürler!"                         │
  │     Dün                                    │
  │                                            │
  │  ──────────────────────────────────────── │
  │  [Tüm Mesajları Gör] (/dashboard/messages)│
  └────────────────────────────────────────────┘
  ```
- **Not:** Mesajlaşma sistemi merkezi ve birleşiktir (Pazar + Kariyer)
- **Detaylar:** `specs/013-messages/spec.md` dosyasına bakın

**3. Profil Dropdown (👤 Profil Resmi ▼):**
- **Profil Resmi:** 
  - Kullanıcı resim yüklediyse → Profil fotoğrafı gösterilir (40x40px, yuvarlak)
  - Resim yoksa → Baş harfler gösterilir (örn: "Ali Yılmaz" → **(AY)**)
  - Arka plan rengi: Kullanıcıya özel rastgele renk (tutarlı)
- **Dropdown İçerik:**
  ```
  ┌─────────────────────┐
  │ 👤 Profilim         │ → /dashboard/profile
  │ ⚙️ Ayarlar          │ → /dashboard/settings
  │ ──────────────────  │
  │ 🚪 Çıkış Yap        │ → Logout
  └─────────────────────┘
  ```

### 1.2. Header Özellikleri
- **Sticky:** Sayfa scroll edildiğinde üstte sabit kalır
- **Responsive:** Mobilde hamburger menü + logo + 3 ikon (bildirim, mesaj, profil)
- **Yükseklik:** 64px (desktop)

### 1.3. Profil Resmi / Baş Harfler Mantığı

**Profil Avatar Gösterimi:**
```python
def get_profile_avatar(user):
    if user.profile_image:
        return user.profile_image_url  # Yüklenen resim
    else:
        # Baş harfler
        first_initial = user.first_name[0].upper()
        last_initial = user.last_name[0].upper()
        initials = f"{first_initial}{last_initial}"
        
        # Kullanıcıya özel tutarlı renk
        color = generate_color_from_user_id(user.id)
        
        return {
            "initials": initials,
            "background_color": color
        }
```

**Örnek Görünümler:**
```
Resim var:
┌─────┐
│ 🖼️  │  ← Profil fotoğrafı (40x40px, yuvarlak)
└─────┘

Resim yok:
┌─────┐
│ AY  │  ← Baş harfler (beyaz yazı, renkli arka plan)
└─────┘
```

**Arka Plan Renkleri (Rastgele ama tutarlı):**
- `#FF6B6B` (Kırmızı)
- `#4ECDC4` (Turkuaz)
- `#45B7D1` (Mavi)
- `#FFA07A` (Turuncu)
- `#98D8C8` (Yeşil)
- `#FFD93D` (Sarı)
- `#6BCB77` (Açık Yeşil)
- `#A8DADC` (Açık Mavi)

---

## 📂 2. Sidebar (Sol Menü)

### 2.1. Sidebar Bileşenleri

```
┌─────────────────┐
│ 🏠 Ana Sayfa    │ ← Aktif (mavi arka plan)
├─────────────────┤
│ 🤖 AI Asistanım │
├─────────────────┤
│ 💬 Forum        │
├─────────────────┤
│ 🛒 Pazar        │
├─────────────────┤
│ 💼 Kariyer      │
├─────────────────┤
│ ── AKADEMİK ──  │
├─────────────────┤
│ 📅 Ders Programım│
├─────────────────┤
│ ⏰ Akademik Takvim│
└─────────────────┘
```

### 2.2. Menü Öğeleri

#### **1. 🏠 Ana Sayfa**
- Dashboard ana sayfası (Hero section)
- URL: `/dashboard`

#### **2. 🤖 AI Asistanım**
- AI chatbot sayfası (yeni sayfada açılır)
- URL: `/dashboard/ai-assistant`

#### **3. 💬 Forum**
- Forum ana sayfası
- URL: `/dashboard/forum`

#### **4. 🛒 Pazar**
- İkinci el eşya alım-satımı
- URL: `/dashboard/marketplace`

#### **5. 💼 Kariyer**
- Staj ve iş ilanları
- URL: `/dashboard/career`
- *(Detaylı spec ayrıca hazırlanacak)*

#### **── AKADEMİK ──**
Grup başlığı (tıklanamaz)

#### **6. 📅 Ders Programım**
- Haftalık ders programı
- URL: `/dashboard/course-schedule`
- Öğrencinin bölüm ve sınıfına göre ders programı
- Admin tarafından yüklenmiş veriler veya öğrenci katkısı
- *(Detaylı spec: 006-academic-features)*

#### **7. ⏰ Akademik Takvim**
- Üniversite akademik takvimi
- URL: `/dashboard/academic-calendar`
- Ara sınav, final, kayıt tarihleri vb.
- Admin tarafından yüklenmiş veriler veya öğrenci katkısı
- *(Detaylı spec: 006-academic-features)*

### 2.3. Sidebar Özellikleri
- **Genişlik:** 240px (desktop)
- **Aktif Sayfa:** Mavi arka plan + kalın yazı
- **Hover Efekti:** Açık gri arka plan
- **Sticky:** Sayfa scroll edildiğinde sabit kalır
- **Responsive:** Mobilde hamburger menü ile açılır/kapanır

---

## 🏠 3. Ana Sayfa (Dashboard Home)

### 3.1. İçerik: Hero Section + Akademik Widget'lar

Kullanıcı dashboard'a ilk girdiğinde karşılaşacağı bölüm.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│         🎓 Günaydın, Ali!                               │
│         Bugün ne öğrenmek istersin?                     │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─ 📅 BUGÜN DERSLERİM ────────────────────────────────────┐
│                                                         │
│  Pazartesi, 15 Eylül 2025                               │
│                                                         │
│  📚 10:00-10:45  Biology (MB120)                        │
│  📚 14:00-14:45  Biology Laboratory (MB119-120)         │
│                                                         │
│  [📅 Tüm Programım]                                     │
│                                                         │
│  ─── Veri Yoksa: ───                                    │
│  📭 Henüz veri yok. [➕ Katkıda Bulun]                  │
└─────────────────────────────────────────────────────────┘

┌─ ⏰ YAKLAȘAN ETKİNLİKLER ───────────────────────────────┐
│                                                         │
│  🔴 3 gün kaldı:                                        │
│  📝 Ara Sınav Haftası (8-16 Kasım 2025)                 │
│                                                         │
│  🟡 12 gün kaldı:                                       │
│  ⚠️ Dersten Çekilme Son Gün (31 Ekim 2025)             │
│                                                         │
│  [⏰ Tüm Takvim]                                        │
│                                                         │
│  ─── Veri Yoksa: ───                                    │
│  📭 Henüz veri yok. [➕ Katkıda Bulun]                  │
└─────────────────────────────────────────────────────────┘
```

### 3.2. Hero Section Bileşenleri

#### **Başlık (Dinamik Selamlaşma):**
Saat dilimine göre dinamik mesaj:

| Saat Aralığı | Mesaj |
|--------------|-------|
| 05:00 - 11:59 | 🌅 Günaydın, {Ad}! |
| 12:00 - 17:59 | ☀️ İyi günler, {Ad}! |
| 18:00 - 21:59 | 🌆 İyi akşamlar, {Ad}! |
| 22:00 - 04:59 | 🌙 İyi geceler, {Ad}! |

**Not:** `{Ad}` kullanıcının veritabanındaki `first_name` alanından gelir.

#### **Alt Başlık:**
- "Bugün ne öğrenmek istersin?"
- Sabit metin (şimdilik)

---

### 3.2. Akademik Widget'lar

#### **A. Bugün Derslerim Widget'ı**

**Gösterim Koşulu:**
- Admin tarafından üniversite + bölüm + sınıf için ders programı yüklenmiş olmalı
- VEYA öğrenci katkısı onaylanmış olmalı

**Veri Varsa:**
```
┌─ 📅 BUGÜN DERSLERİM ───────────────────────────┐
│                                                │
│  Pazartesi, 15 Eylül 2025                      │
│                                                │
│  📚 10:00-10:45  Biology                       │
│     📍 MB120 • Prof. Dr. Ahmet Yılmaz          │
│                                                │
│  📚 14:00-14:45  Biology Laboratory            │
│     📍 MB119-120 • Lab Asistanı                │
│                                                │
│  [📅 Tüm Haftalık Programım]                   │
└────────────────────────────────────────────────┘
```

**Veri Yoksa:**
```
┌─ 📅 BUGÜN DERSLERİM ───────────────────────────┐
│                                                │
│  📭 Henüz Veri Yok                             │
│                                                │
│  Üniversitenizin ders programı verilerine      │
│  henüz erişemedik.                             │
│                                                │
│  💡 Ders programınızı paylaşarak diğer         │
│     öğrencilere yardımcı olabilirsiniz!        │
│                                                │
│  [📤 Katkıda Bulun]                            │
└────────────────────────────────────────────────┘
```

**Özellikler:**
- Sadece bugünün dersleri gösterilir
- Max 5 ders gösterilir (daha fazlaysa "..." ile gösterilir)
- Ders saati, adı, salon ve hoca bilgisi
- "Tüm Programım" butonu → `/dashboard/course-schedule` sayfasına gider
- "Katkıda Bulun" butonu → Katkı modalı açılır

#### **B. Yaklaşan Etkinlikler Widget'ı**

**Gösterim Koşulu:**
- Admin tarafından üniversite için akademik takvim yüklenmiş olmalı
- VEYA öğrenci katkısı onaylanmış olmalı

**Veri Varsa:**
```
┌─ ⏰ YAKLAȘAN ETKİNLİKLER ──────────────────────┐
│                                                │
│  🔴 3 gün kaldı:                               │
│  📝 Ara Sınav Haftası                          │
│  8-16 Kasım 2025                               │
│                                                │
│  🟡 12 gün kaldı:                              │
│  ⚠️ Dersten Çekilme Son Gün                   │
│  31 Ekim 2025                                  │
│                                                │
│  🟢 1 ay kaldı:                                │
│  🎉 Cumhuriyet Bayramı Tatili                  │
│  28-29 Ekim 2025                               │
│                                                │
│  [⏰ Tüm Akademik Takvim]                      │
└────────────────────────────────────────────────┘
```

**Renk Kodları:**
- 🔴 Kırmızı: 0-7 gün kaldı (acil)
- 🟡 Sarı: 8-30 gün kaldı (yakın)
- 🟢 Yeşil: 30+ gün kaldı (uzak)

**Veri Yoksa:**
```
┌─ ⏰ YAKLAȘAN ETKİNLİKLER ──────────────────────┐
│                                                │
│  📭 Henüz Veri Yok                             │
│                                                │
│  Üniversitenizin akademik takvim verilerine    │
│  henüz erişemedik.                             │
│                                                │
│  💡 Akademik takviminizi paylaşarak diğer      │
│     öğrencilere yardımcı olabilirsiniz!        │
│                                                │
│  [📤 Katkıda Bulun]                            │
└────────────────────────────────────────────────┘
```

**Özellikler:**
- En yakın 3-5 etkinlik gösterilir
- Tarihe göre sıralı (yakın → uzak)
- Renk kodlu gösterim (kırmızı/sarı/yeşil)
- "Tüm Takvim" butonu → `/dashboard/academic-calendar` sayfasına gider
- "Katkıda Bulun" butonu → Katkı modalı açılır

---

### 3.3. Hero Section Tasarım Detayları

- **Yükseklik:** min-height: 400px (ekran ortasında görünür)
- **Hizalama:** Ortalanmış (horizontal + vertical center)
- **Arka Plan:** Gradient animasyon (Landing page'deki gibi)
- **Yazı Boyutu:**
  - Başlık: 3rem (48px) - Bold
  - Alt başlık: 1.5rem (24px) - Regular
- **Renk:**
  - Başlık: Beyaz (#FFFFFF)
  - Alt başlık: Açık gri (#E0E0E0)

### 3.4. Hero Section Animasyonu

```css
/* Gradient animasyon (Landing page ile aynı) */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.hero-section {
  background: linear-gradient(
    135deg,
    #667eea 0%,
    #764ba2 50%,
    #f093fb 100%
  );
  background-size: 200% 200%;
  animation: gradient-shift 8s ease infinite;
}
```

---

## 🎨 4. Genel Tasarım Sistemi

### 4.1. Renk Paleti

| Kullanım | Renk | Hex Kodu |
|----------|------|----------|
| Birincil (Primary) | Mor | #667eea |
| İkincil (Secondary) | Pembe | #764ba2 |
| Arka Plan | Koyu Gri | #1a1a2e |
| Kart Arka Planı | Orta Gri | #16213e |
| Metin (Ana) | Beyaz | #FFFFFF |
| Metin (İkincil) | Açık Gri | #B0B0B0 |
| Sidebar Aktif | Mavi | #4A90E2 |
| Hover | Açık Mavi | #5BA3F5 |
| Başarı | Yeşil | #4CAF50 |
| Hata | Kırmızı | #F44336 |

### 4.2. Tipografi

| Öğe | Font Boyutu | Font Ağırlığı |
|-----|-------------|---------------|
| Sayfa Başlığı | 2.5rem (40px) | Bold (700) |
| Alt Başlık | 1.5rem (24px) | Regular (400) |
| Kart Başlığı | 1.25rem (20px) | Semibold (600) |
| Body Text | 1rem (16px) | Regular (400) |
| Small Text | 0.875rem (14px) | Regular (400) |

**Font Ailesi:** 
- Primary: `'Inter', sans-serif`
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### 4.3. Spacing (Boşluklar)

```css
/* 8px grid sistemi */
--spacing-xs: 0.5rem;  /* 8px */
--spacing-sm: 1rem;    /* 16px */
--spacing-md: 1.5rem;  /* 24px */
--spacing-lg: 2rem;    /* 32px */
--spacing-xl: 3rem;    /* 48px */
```

### 4.4. Border Radius

```css
--radius-sm: 4px;   /* Butonlar */
--radius-md: 8px;   /* Kartlar */
--radius-lg: 12px;  /* Modals */
--radius-full: 50%; /* Avatarlar */
```

### 4.5. Shadows

```css
/* Kart shadow'ları */
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.15);
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.2);
```

---

## 📱 5. Responsive Tasarım

### 5.1. Breakpoints

```css
/* Mobile first approach */
--mobile: 320px;   /* Min genişlik */
--tablet: 768px;   /* iPad */
--desktop: 1024px; /* Laptop */
--wide: 1440px;    /* Geniş ekran */
```

### 5.2. Layout Değişiklikleri

#### **Mobile (< 768px):**
- Sidebar gizli (hamburger menü ile açılır)
- Header: Logo + Hamburger + Profil ikonu
- Hero section yazı boyutu küçültülür (2rem başlık)
- Padding'ler azaltılır

#### **Tablet (768px - 1023px):**
- Sidebar overlay olarak açılır
- Header tam görünür
- Hero section normal boyut

#### **Desktop (≥ 1024px):**
- Sidebar her zaman görünür
- Tam header
- Hero section tam boyut

---

## 🔐 6. Güvenlik ve Erişim

### 6.1. Auth Gereksinimleri

**Dashboard'a erişim için:**
1. ✅ Kullanıcı login olmuş olmalı (valid JWT token)
2. ✅ Email doğrulanmış olmalı (`is_verified = true`)
3. ✅ Kullanıcı aktif olmalı (`is_active = true`)

**Doğrulanmamış kullanıcı dashboard'a erişmeye çalışırsa:**
- 401 Unauthorized
- Login sayfasına redirect
- Hata mesajı: "Email adresinizi doğrulamanız gerekiyor"

### 6.2. Route Protection (Frontend)

```typescript
// React Router örneği
<Route 
  path="/dashboard/*" 
  element={
    <ProtectedRoute requireVerified={true}>
      <DashboardLayout />
    </ProtectedRoute>
  }
/>
```

### 6.3. Backend API Endpoints

#### **GET /api/v1/dashboard/welcome**
Kullanıcının dashboard verilerini getirir.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-123",
    "first_name": "Ali",
    "last_name": "Yılmaz",
    "email": "ali.yilmaz@selcuk.edu.tr",
    "university": "Selçuk Üniversitesi",
    "department": "Bilgisayar Mühendisliği",
    "student_number": "20220101001"
  },
  "greeting": "Günaydın",
  "emoji": "🌅",
  "time_of_day": "morning"
}
```

**Response (401 Unauthorized):**
```json
{
  "detail": "Email doğrulaması gerekiyor"
}
```

#### **GET /api/v1/dashboard/today-courses**
Kullanıcının bugünkü derslerini getirir.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK - Veri Varsa):**
```json
{
  "has_data": true,
  "date": "2025-09-15",
  "day_of_week": "Pazartesi",
  "courses": [
    {
      "course_code": "GENE1001",
      "course_name": "Biology",
      "start_time": "10:00",
      "end_time": "10:45",
      "room": "MB120",
      "instructor": "Prof. Dr. Ahmet Yılmaz"
    },
    {
      "course_code": "GENE1001",
      "course_name": "Biology Laboratory",
      "start_time": "14:00",
      "end_time": "14:45",
      "room": "MB119-120",
      "instructor": "Lab Asistanı"
    }
  ]
}
```

**Response (200 OK - Veri Yoksa):**
```json
{
  "has_data": false,
  "message": "Üniversitenizin ders programı verilerine henüz erişemedik."
}
```

#### **GET /api/v1/dashboard/upcoming-events**
Kullanıcının yaklaşan akademik takvim etkinliklerini getirir.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Params:**
- `limit` (default: 5) - Max kaç etkinlik getirileceği

**Response (200 OK - Veri Varsa):**
```json
{
  "has_data": true,
  "events": [
    {
      "id": "uuid-1",
      "title": "Ara Sınav Haftası",
      "start_date": "2025-11-08",
      "end_date": "2025-11-16",
      "event_type": "exam",
      "icon": "📝",
      "days_remaining": 3,
      "urgency": "high"
    },
    {
      "id": "uuid-2",
      "title": "Dersten Çekilme Son Gün",
      "start_date": "2025-10-31",
      "end_date": null,
      "event_type": "deadline",
      "icon": "⚠️",
      "days_remaining": 12,
      "urgency": "medium"
    }
  ]
}
```

**Response (200 OK - Veri Yoksa):**
```json
{
  "has_data": false,
  "message": "Üniversitenizin akademik takvim verilerine henüz erişemedik."
}
```

**Not:** `urgency` değeri:
- `high`: 0-7 gün kaldı (kırmızı 🔴)
- `medium`: 8-30 gün kaldı (sarı 🟡)
- `low`: 30+ gün kaldı (yeşil 🟢)

---

## 🎯 7. Kullanıcı Akışları

### 7.1. İlk Login Sonrası Dashboard

```
┌─────────────────────────────────┐
│ 1. Kullanıcı login olur         │
│    (Email doğrulanmış)          │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 2. Backend JWT token döner      │
│    (access + refresh)           │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 3. Frontend token'ı kaydeder    │
│    (localStorage)               │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 4. /dashboard sayfasına redirect│
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 5. GET /api/v1/dashboard/welcome│
│    API çağrısı                  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 6. Hero section render edilir   │
│    "Günaydın, Ali!"             │
└─────────────────────────────────┘
```

### 7.2. Sidebar Navigasyon

```
Kullanıcı sidebar'dan "Forum"a tıklar
           │
           ▼
React Router /dashboard/forum'a yönlendirir
           │
           ▼
Forum bileşeni mount olur
           │
           ▼
Sidebar'da "Forum" aktif olarak işaretlenir
```

### 7.3. Çıkış Yapma

```
┌─────────────────────────────────┐
│ 1. Header dropdown'dan "Çıkış"  │
│    tıklanır                     │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 2. Confirm modal açılır         │
│    "Çıkış yapmak istediğinize   │
│     emin misiniz?"              │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 3. "Evet" → Token'lar silinir   │
│    (localStorage temizlenir)    │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ 4. Landing page'e redirect      │
│    (/)                          │
└─────────────────────────────────┘
```

---

## 🛠️ 8. Teknik Gereksinimler

### 8.1. Frontend

**Framework:** React 18+ with TypeScript

**Routing:**
```typescript
/dashboard                    → Ana Sayfa (Hero section + Akademik Widget'lar)
/dashboard/ai-assistant       → AI Chatbot Sayfası
/dashboard/forum              → Forum Ana Sayfası
/dashboard/marketplace        → Pazar Sayfası
/dashboard/course-schedule    → Ders Programım (Detaylı spec ayrıca)
/dashboard/academic-calendar  → Akademik Takvim (Detaylı spec ayrıca)
/dashboard/profile            → Profil Sayfası
/dashboard/settings           → Ayarlar Sayfası
```

**State Management:**
- React Context API (kullanıcı bilgileri, auth)
- Zustand veya Redux (opsiyonel, büyüme durumunda)

**Bileşen Yapısı:**
```
src/
├── components/
│   ├── Layout/
│   │   ├── DashboardLayout.tsx    ← Ana layout wrapper
│   │   ├── Header.tsx             ← Üst bar
│   │   ├── Sidebar.tsx            ← Sol menü
│   │   └── MainContent.tsx        ← İçerik alanı
│   ├── Dashboard/
│   │   ├── HeroSection.tsx        ← Hero bileşeni
│   │   └── GreetingMessage.tsx    ← Dinamik selamlaşma
│   └── Common/
│       ├── ProfileDropdown.tsx    ← Profil menü
│       ├── NotificationBell.tsx   ← Bildirim ikonu
│       └── SearchBar.tsx          ← Arama çubuğu
├── pages/
│   ├── Dashboard/
│   │   ├── HomePage.tsx           ← Ana sayfa
│   │   ├── AIAssistantPage.tsx    ← AI sayfası
│   │   ├── ForumPage.tsx          ← Forum
│   │   └── MarketplacePage.tsx    ← Pazar
├── hooks/
│   ├── useAuth.ts                 ← Auth durumu
│   ├── useGreeting.ts             ← Dinamik selamlaşma
│   └── useCurrentTime.ts          ← Saat bilgisi
└── contexts/
    └── AuthContext.tsx            ← Kullanıcı context
```

**UI Kütüphaneleri:**
- CSS: Tailwind CSS veya Styled Components
- İkonlar: React Icons veya Heroicons
- Animasyonlar: Framer Motion (opsiyonel)

### 8.2. Backend

**Framework:** FastAPI (Python)

**Database:** SQLite (mezuniyet projesi için, WAL mode ile concurrent access)

**Yeni Endpoint:**

```python
# app/routers/dashboard.py

from fastapi import APIRouter, Depends
from app.core.auth import get_current_verified_user
from app.schemas.dashboard import DashboardWelcomeResponse

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/welcome", response_model=DashboardWelcomeResponse)
async def get_dashboard_welcome(
    current_user = Depends(get_current_verified_user)
):
    """
    Kullanıcının dashboard bilgilerini döner.
    Email doğrulanmış olmalı.
    """
    from datetime import datetime
    
    # Saate göre selamlaşma
    current_hour = datetime.now().hour
    
    if 5 <= current_hour < 12:
        greeting = "Günaydın"
        emoji = "🌅"
        time_of_day = "morning"
    elif 12 <= current_hour < 18:
        greeting = "İyi günler"
        emoji = "☀️"
        time_of_day = "afternoon"
    elif 18 <= current_hour < 22:
        greeting = "İyi akşamlar"
        emoji = "🌆"
        time_of_day = "evening"
    else:
        greeting = "İyi geceler"
        emoji = "🌙"
        time_of_day = "night"
    
    return {
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email": current_user.email,
            "university": current_user.university,
            "department": current_user.department,
            "student_number": current_user.student_number,
        },
        "greeting": greeting,
        "emoji": emoji,
        "time_of_day": time_of_day,
    }
```

**Schema (Pydantic):**

```python
# app/schemas/dashboard.py

from pydantic import BaseModel
from typing import Literal

class DashboardUser(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    university: str | None
    department: str
    student_number: str

class DashboardWelcomeResponse(BaseModel):
    user: DashboardUser
    greeting: str
    emoji: str
    time_of_day: Literal["morning", "afternoon", "evening", "night"]
```

### 8.3. Auth Middleware

**Frontend (React):**

```typescript
// src/components/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireVerified = true 
}: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !user?.is_verified) {
    return <Navigate to="/login" state={{ 
      error: "Email adresinizi doğrulamanız gerekiyor" 
    }} />;
  }

  return <>{children}</>;
};
```

**Backend (FastAPI):**

```python
# app/core/auth.py

from fastapi import Depends, HTTPException, status
from app.models.user import User

async def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Email doğrulanmış kullanıcı gerektirir.
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email doğrulaması gerekiyor"
        )
    return current_user
```

---

## ✅ 9. Başarı Kriterleri

### 9.1. Fonksiyonel Gereksinimler
- [ ] Login sonrası dashboard'a yönlendirme çalışır
- [ ] Hero section kullanıcı adını doğru gösterir
- [ ] Dinamik selamlaşma saate göre değişir (4 farklı mesaj)
- [ ] Sidebar menüsü tüm sayfalarda görünür
- [ ] Aktif sayfa sidebar'da highlight edilir
- [ ] Header dropdown menüsü çalışır (Profil, Ayarlar, Çıkış)
- [ ] Çıkış yapma token'ları temizler ve landing page'e yönlendirir
- [ ] Doğrulanmamış kullanıcılar dashboard'a erişemez

### 9.2. Tasarım Gereksinimleri
- [ ] Gradient animasyon akıcı çalışır
- [ ] Sidebar hover efektleri düzgün
- [ ] Header sticky (scroll'da üstte kalır)
- [ ] Responsive tasarım mobilde düzgün çalışır
- [ ] Font boyutları ve renkler tutarlı

### 9.3. Performans
- [ ] Dashboard ilk yüklenme < 2 saniye
- [ ] Sidebar navigasyon anında geçiş (<100ms)
- [ ] API response time < 500ms

### 9.4. Güvenlik
- [ ] JWT token validation çalışır
- [ ] Email doğrulaması kontrolü backend'de yapılır
- [ ] XSS saldırılarına karşı korumalı
- [ ] Token'lar güvenli şekilde saklanır (httpOnly cookies veya localStorage + XSS protection)

---

## 📝 10. Notlar ve Gelecek Geliştirmeler

### 10.1. Şimdilik Yapılmayacaklar
- ❌ Ana sayfada forum aktivitesi widget'ları
- ❌ İstatistik kartları (toplam konu, cevap sayısı)
- ❌ Hızlı erişim kartları
- ❌ Bildirim sistemi (backend hazır değil)
- ❌ Akademik widget'larda bildirimler (şimdilik sadece gösterim)

### 10.2. Gelecekte Eklenebilecekler
- 🔮 Ana sayfada "Son forum aktiviteleri" widget'ı
- 🔮 "Trending konular" bölümü
- 🔮 Kullanıcı istatistikleri (paylaşımlarım, cevaplarım)
- 🔮 Hızlı erişim kartları (Son ziyaretler, favoriler)
- 🔮 Dark/Light mode toggle
- 🔮 Bildirim merkezi (yeni cevap, mention vs.)
- 🔮 Akademik etkinlik hatırlatmaları (30 dk önce, 1 gün önce)

### 10.3. Akademik Özellikler (Ayrı Spec Hazırlanacak)
- 📅 **Ders Programım** - Detaylı haftalık ders programı sayfası
  - Admin upload sistemi
  - Öğrenci katkı sistemi (PDF yükleme, manuel girdi)
  - Admin onay mekanizması
  - Haftalık/Liste görünümleri
  - PDF export
  
- ⏰ **Akademik Takvim** - Detaylı akademik takvim sayfası
  - Admin upload sistemi
  - Öğrenci katkı sistemi
  - Admin onay mekanizması
  - Filtreler (sınavlar, kayıt, tatiller)
  - iCal export
  
**Not:** Bu özellikler için ayrı bir spec dokümanı (006-academic-features) hazırlanacak.

### 10.4. Bağımlılıklar
Bu özellik için öncelikle tamamlanmış olması gerekenler:
- ✅ 001 - Landing Page (tamamlandı)
- ✅ 002 - Register Page (tamamlandı)
- ✅ 003 - Login Page (tamamlandı)

---

## 🎯 Özet

Dashboard, kullanıcıların login sonrası karşılaştığı merkezi hub sayfasıdır. Hero section (kişiselleştirilmiş karşılama) ve akademik widget'lar (bugünün dersleri, yaklaşan etkinlikler) içerir. Sidebar ile tüm platform özelliklerine erişim sağlanır. Modern, temiz ve kullanıcı dostu bir arayüz sunar.

**核心 Özellikler:**
- ✅ Dinamik selamlaşma (saate göre 4 farklı mesaj)
- ✅ Bugün Derslerim widget'ı (ders programı varsa)
- ✅ Yaklaşan Etkinlikler widget'ı (akademik takvim varsa)
- ✅ Sidebar navigasyon (Ana Sayfa, AI, Forum, Pazar, Akademik)
- ✅ Header dropdown (Profil, Ayarlar, Çıkış)
- ✅ Responsive tasarım
- ✅ Auth korumalı (email doğrulanmış olmalı)
- ✅ Boş durum mesajları (veri yoksa "Katkıda bulun" butonu)

---

**Hazırlayan:** AI Assistant  
**Versiyon:** 1.0  
**Son Güncelleme:** 2026-01-01

