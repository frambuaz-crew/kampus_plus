# 008 - KARİYER (İŞ, STAJ VE PROJE İLANLARI)

## 📋 GENEL BAKIŞ

**Modül Adı:** Kariyer (Career Board)  
**Öncelik:** Orta  
**Bağımlılıklar:** 
- 002-register-page (Kullanıcı kaydı)
- 003-login-page (Kimlik doğrulama)
- 004-dashboard (Ana navigasyon)
- 007-marketplace (DM sistemi paylaşılıyor)

**Amaç:**  
Öğrencilerin iş bulma sürecinde birbirlerine destek olmasını sağlamak. İnternetten buldukları iş/staj ilanlarını paylaşabilecekleri, startup için ekip arkadaşı veya proje için yardımcı arayabilecekleri community-driven bir kariyer platformu oluşturmak.

---

## 🎯 KULLANICI HİKAYELERİ

### US-08.1: İş/Staj İlanı Paylaşma
**Rol:** Öğrenci veya Admin  
**İstek:** İnternette bulduğum iş/staj ilanını diğer öğrencilerle paylaşmak istiyorum.  
**Değer:** Kampüs topluluğuna katkıda bulunur ve diğer öğrencilerin fırsatları kaçırmasını önlerim.

**Kabul Kriterleri:**
- Sadece doğrulanmış email'e sahip öğrenciler ilan oluşturabilir
- İlan türü seçilir: "İş İlanı" veya "Staj İlanı"
- Zorunlu alanlar: Başlık, Açıklama, Kategori, Sektör, Lokasyon, **Dış Link (URL)**
- Opsiyonel: Şirket adı, Maaş aralığı
- İlan admin onayı olmadan direkt yayınlanır
- Adminler de ilan oluşturabilir (rate limiting yok)

---

### US-08.2: Startup Ekibi Oluşturma
**Rol:** Öğrenci (Startup Sahibi)  
**İstek:** Kendi startup'ım için ekip arkadaşı bulmak istiyorum.  
**Değer:** Üniversiteden yetenekli ve motive arkadaşlarla tanışabilirim.

**Kabul Kriterleri:**
- İlan türü: "Startup Ekibi"
- Zorunlu alanlar: Başlık, Açıklama, Aranan Pozisyon, Sektör, Lokasyon
- Opsiyonel: Ödeme durumu (Ücretli / Ücretsiz / Proje Bazlı / Hisse Ortaklığı)
- **Dış link YOK** (içerik platform içinde)
- İletişim: Platform içi mesaj (DM)
- "İlgileniyorum" butonu ile başvuru

---

### US-08.3: Proje Arkadaşı Arama
**Rol:** Öğrenci (Proje Sahibi)  
**İstek:** Ders projesi veya kişisel proje için yardımcı arkadaşlar bulmak istiyorum.  
**Değer:** Projeyi daha hızlı tamamlar ve yeni beceriler öğrenirim.

**Kabul Kriterleri:**
- İlan türü: "Proje Arkadaşı"
- Zorunlu alanlar: Başlık, Açıklama, Aranan Beceri, Sektör, Süre (Kısa Vadeli / Uzun Vadeli)
- Opsiyonel: Ödeme durumu (Ücretli / Ücretsiz / Öğrenme Amaçlı)
- **Dış link YOK**
- İletişim: Platform içi mesaj (DM)
- "Katılmak İstiyorum" butonu ile başvuru

---

### US-08.4: İlan Listeleme ve Filtreleme
**Rol:** Öğrenci (İş Arayan)  
**İstek:** Kendi ilgi alanıma uygun iş/staj/proje ilanlarını görüntülemek istiyorum.  
**Değer:** Zaman kaybetmeden bana uygun fırsatları bulabilirim.

**Kabul Kriterleri:**
- Default olarak önce kendi üniversitesinden ilanlar gösterilir
- "Tüm İlanlar" sekmesine geçerek tüm üniversitelerden ilanları görebilir
- Kategoriye göre filtreleme (İş / Staj / Startup / Proje)
- Sektöre göre filtreleme (Yazılım, Mühendislik, Tasarım, vb.)
- Lokasyona göre filtreleme (Remote, Ankara, İstanbul, vb.)
- Arama çubuğundan başlık, açıklama, şirket adı içinde arama
- İlanlar şu şekilde sıralanabilir: Yeni İlanlar, Eski İlanlar

---

### US-08.5: İlana Başvurma
**Rol:** Öğrenci (İş Arayan)  
**İstek:** İlgilendiğim ilana başvurmak istiyorum.  
**Değer:** Kariyer fırsatlarını değerlendirebilirim.

**Kabul Kriterleri:**
- **İş/Staj İlanları:** "Başvur" butonu → Dış link'e yönlendirir (yeni sekmede açılır)
- **Startup/Proje İlanları:** "İlgileniyorum" butonu → Merkezi DM sisteminde konuşma başlatır
- **Mesajlaşma Sistemi:** Pazar + Kariyer mesajları tek sayfada (`/dashboard/messages`)
- **Detaylar:** `specs/013-messages/spec.md` dosyasına bakın
- İlan detayında ilan sahibinin profil bilgisi görünür (ad, üniversite, bölüm)
- "Uygunsuz İlan Bildir" butonu ile rapor gönderilebilir

---

### US-08.6: İlanlarımı Yönetme
**Rol:** Öğrenci veya Admin (İlan Sahibi)  
**İstek:** Oluşturduğum ilanları düzenlemek ve durumunu güncellemek istiyorum.  
**Değer:** İlanlarımın güncel kalmasını sağlayabilirim.

**Kabul Kriterleri:**
- Profilim > "İlanlarım" sekmesinden aktif ve arşivlenmiş ilanlarım görülür
- İlanı düzenleyebilirim (başlık, açıklama, link)
- İlan kapandığında "Arşivle" butonuna basabilirim
- Arşivlenen ilanlar listede görünmez ama kendi profilimde görürüm
- İlanı tamamen silebilirim
- 90 gün boyunca güncellenmemiş ilanlar otomatik olarak arşivlenir (sistem tarafından email bildirimi gönderilir)

---

## 🎨 UI/UX TASARIMI

### 1. Kariyer Ana Sayfası

```
┌─ KARİYER ──────────────────────────────────────────────────────────┐
│                                                                     │
│  [🔍 Arama...]  [Kategori ▼] [Sektör ▼] [Lokasyon ▼] [Sırala ▼]   │
│                                                                     │
│  📍 [Üniversitem] [Tüm İlanlar]                    [+ İlan Ver]   │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│  │ 🏢 [İşveren] │ │ 🎓 [Staj]   │ │ 🚀 [Startup]│                  │
│  │ React Dev   │ │ Frontend    │ │ Co-founder  │                  │
│  │ Acme Corp   │ │ TechCo      │ │ Aranan      │                  │
│  │ İstanbul    │ │ Remote      │ │ Remote      │                  │
│  │ Yazılım     │ │ Yazılım     │ │ Yazılım     │                  │
│  │ @admin      │ │ @ahmet_k    │ │ @ayse_y     │                  │
│  │ Selçuk Üni  │ │ KTÜN        │ │ GIDATARIM   │                  │
│  │ 2 gün önce  │ │ 1 hafta önce│ │ 3 gün önce  │                  │
│  └─────────────┘ └─────────────┘ └─────────────┘                  │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│  │ 🤝 [Proje]  │ │ ...         │ │ ...         │                  │
│  │ Web Sitesi  │ │             │ │             │                  │
│  │ HTML/CSS    │ │             │ │             │                  │
│  │ Kısa Vadeli │ │             │ │             │                  │
│  │ Ücretsiz    │ │             │ │             │                  │
│  │ @mehmet_a   │ │             │ │             │                  │
│  │ Selçuk Üni  │ │             │ │             │                  │
│  │ Dün         │ │             │ │             │                  │
│  └─────────────┘ └─────────────┘ └─────────────┘                  │
│                                                                     │
│  [1] [2] [3] ... [10] [>]                                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Bileşenler:**
- **Arama Çubuğu:** Başlık, açıklama, şirket adı içinde arama
- **Filtreler:** 
  - Kategori: İş İlanı, Staj İlanı, Startup Ekibi, Proje Arkadaşı
  - Sektör: Yazılım, Mühendislik, Tasarım, Pazarlama, Veri Bilimi, Diğer
  - Lokasyon: Remote, Ankara, İstanbul, İzmir, Konya, Diğer
- **Sıralama:** Yeni İlanlar, Eski İlanlar
- **Sekmeler:** "Üniversitem" (default), "Tüm İlanlar"
- **İlan Ver Butonu:** Sağ üstte, öne çıkan renkte
- **İlan Kartı:**
  - Kategori ikonu (🏢 İş, 🎓 Staj, 🚀 Startup, 🤝 Proje)
  - Başlık (max 60 karakter)
  - Şirket adı (İş/Staj için) veya Aranan pozisyon (Startup/Proje için)
  - Lokasyon
  - Sektör
  - İlan veren (ad, üniversite)
  - Yayınlanma tarihi
- **Pagination:** 24 ilan/sayfa

---

### 2. İlan Oluşturma Sayfası

```
┌─ YENİ İLAN OLUŞTUR ────────────────────────────────────────────────┐
│                                                                     │
│  📋 İlan Türü *                                                     │
│  [Seçiniz                                               ▼]         │
│   - 🏢 İş İlanı                                                     │
│   - 🎓 Staj İlanı                                                   │
│   - 🚀 Startup Ekibi                                                │
│   - 🤝 Proje Arkadaşı                                               │
│                                                                     │
│  📝 Başlık *                                                        │
│  [_________________________________________________]                │
│                                                                     │
│  📄 Açıklama *                                                      │
│  [____________________________________________________________]     │
│  [____________________________________________________________]     │
│  [____________________________________________________________]     │
│                                                                     │
│  🏭 Sektör *                                                        │
│  [Seçiniz                                               ▼]         │
│   - Yazılım                                                         │
│   - Mühendislik                                                     │
│   - Tasarım                                                         │
│   - Pazarlama                                                       │
│   - Veri Bilimi                                                     │
│   - Diğer                                                           │
│                                                                     │
│  📍 Lokasyon *                                                      │
│  [Seçiniz                                               ▼]         │
│   - Remote                                                          │
│   - Ankara                                                          │
│   - İstanbul                                                        │
│   - İzmir                                                           │
│   - Konya                                                           │
│   - Diğer                                                           │
│                                                                     │
│  ─────── İş/Staj İlanı İçin Ekstra Alanlar ────────                │
│                                                                     │
│  🏢 Şirket Adı (Opsiyonel)                                          │
│  [_________________________________________________]                │
│                                                                     │
│  🔗 İlan Linki * (LinkedIn, Kariyer.net, vb.)                      │
│  [_________________________________________________]                │
│                                                                     │
│  💰 Maaş Aralığı (Opsiyonel)                                        │
│  [_________________________________________________]                │
│                                                                     │
│  ─────── Startup Ekibi / Proje Arkadaşı İçin Ekstra ───────        │
│                                                                     │
│  👤 Aranan Pozisyon/Beceri *                                        │
│  [_________________________________________________]                │
│                                                                     │
│  ⏱️ Süre * (Sadece Proje Arkadaşı için)                             │
│  [ ] Kısa Vadeli (1-3 ay)                                           │
│  [ ] Uzun Vadeli (3+ ay)                                            │
│                                                                     │
│  💵 Ödeme Durumu *                                                  │
│  [Seçiniz                                               ▼]         │
│   - Ücretli                                                         │
│   - Ücretsiz                                                        │
│   - Proje Bazlı                                                     │
│   - Hisse Ortaklığı (Startup için)                                  │
│   - Öğrenme Amaçlı (Proje için)                                     │
│                                                                     │
│  [İptal]                                        [İlanı Yayınla]    │
└─────────────────────────────────────────────────────────────────────┘
```

**Validasyon:**
- Başlık: 10-100 karakter arası
- Açıklama: 50-2000 karakter arası
- İlan linki (İş/Staj için): Geçerli URL formatı
- Kategori, Sektör, Lokasyon: Dropdown'dan seçilmeli

**Başarı Mesajı:**
```
✅ İlanınız Başarıyla Yayınlandı!
İlanınız şimdi diğer öğrenciler tarafından görülebilir.
[İlanlarımı Görüntüle] [Yeni İlan Ver]
```

---

### 3. İlan Detay Sayfası

#### 3A. İş/Staj İlanı Detayı

```
┌─ İLAN DETAYI ──────────────────────────────────────────────────────┐
│                                                                     │
│  🏢 İŞ İLANI                                                        │
│                                                                     │
│  📝 React Developer                                                 │
│  🏢 Acme Corporation                                                │
│  📍 İstanbul (Hibrit)                                               │
│  🏭 Sektör: Yazılım                                                 │
│  💰 Maaş: 20.000 - 30.000 TL                                        │
│  📅 Yayınlandı: 2 gün önce                                          │
│                                                                     │
│  ┌─ İLAN VEREN ─────────────────┐                                  │
│  │                               │                                  │
│  │  👤 Admin (Sistem)            │                                  │
│  │  🎓 -                         │                                  │
│  │                               │                                  │
│  └───────────────────────────────┘                                  │
│                                                                     │
│  📄 AÇIKLAMA                                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  Acme Corp olarak ekibimize React Developer arıyoruz.              │
│  Minimum 2 yıl deneyim, TypeScript bilgisi gereklidir.             │
│  Remote çalışma imkanı mevcut.                                     │
│                                                                     │
│  [🔗 İlana Başvur] (Yeni sekmede açılır)                           │
│                                                                     │
│  [🚩 Uygunsuz İlan Bildir]                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### 3B. Startup Ekibi / Proje Arkadaşı İlan Detayı

```
┌─ İLAN DETAYI ──────────────────────────────────────────────────────┐
│                                                                     │
│  🚀 STARTUP EKİBİ ARANIYOR                                          │
│                                                                     │
│  📝 Co-founder (CTO) Aranıyor                                       │
│  👤 Aranan Pozisyon: Full-Stack Developer                           │
│  📍 Remote                                                          │
│  🏭 Sektör: Yazılım                                                 │
│  💵 Ödeme: Hisse Ortaklığı                                          │
│  📅 Yayınlandı: 3 gün önce                                          │
│                                                                     │
│  ┌─ İLAN VEREN ─────────────────┐                                  │
│  │                               │                                  │
│  │  👤 Ayşe Yılmaz               │                                  │
│  │  🎓 Konya Gıda ve Tarım Üni   │                                  │
│  │  📚 Bilgisayar Mühendisliği   │                                  │
│  │                               │                                  │
│  │  [📩 Mesaj Gönder]            │                                  │
│  │  [👤 Profili Görüntüle]       │                                  │
│  └───────────────────────────────┘                                  │
│                                                                     │
│  📄 AÇIKLAMA                                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  E-ticaret startup'ım için CTO arıyorum. Node.js, React,           │
│  PostgreSQL bilgisi gerekli. Hisse ortaklığı ile çalışacağız.      │
│                                                                     │
│  [✅ İlgileniyorum] → DM gönderir                                   │
│                                                                     │
│  [🚩 Uygunsuz İlan Bildir]                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 4. İlanlarım Sayfası (Profil > İlanlarım)

```
┌─ İLANLARIM ────────────────────────────────────────────────────────┐
│                                                                     │
│  [Aktif İlanlar (3)] [Arşivlenmiş İlanlar (5)]   [+ Yeni İlan]    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🏢 React Developer                                          │   │
│  │ Acme Corp | İstanbul | Yazılım                              │   │
│  │ Yayınlandı: 2 gün önce | Görüntülenme: 45                  │   │
│  │                                                              │   │
│  │ [✏️ Düzenle] [📦 Arşivle] [🗑️ Sil]                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🚀 Co-founder (CTO) Aranıyor                                │   │
│  │ Startup Ekibi | Remote | Yazılım                            │   │
│  │ Yayınlandı: 3 gün önce | Görüntülenme: 28 | Başvuru: 5     │   │
│  │                                                              │   │
│  │ [✏️ Düzenle] [📦 Arşivle] [💬 Başvuruları Gör] [🗑️ Sil]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🤝 Web Sitesi Projesi için Yardımcı                         │   │
│  │ Proje Arkadaşı | Kısa Vadeli | Ücretsiz                    │   │
│  │ Yayınlandı: 1 gün önce | Görüntülenme: 12 | Başvuru: 2     │   │
│  │ ⚠️ İlan 89 gün sonra otomatik arşivlenecek                  │   │
│  │                                                              │   │
│  │ [✏️ Düzenle] [📦 Arşivle] [💬 Başvuruları Gör] [🗑️ Sil]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- **Başvuru Sayacı:** Sadece Startup/Proje ilanları için (kaç kişi DM gönderdi)
- **Başvuruları Gör:** Startup/Proje ilanları için → Mesajlar sayfasına yönlendirir
- **90 Gün Uyarısı:** Güncellenmemiş ilanlar için

---

### 5. Başvurularım Sayfası (Profil > Başvurularım)

```
┌─ BAŞVURULARIM ─────────────────────────────────────────────────────┐
│                                                                     │
│  Startup ve Proje ilanlarına yaptığınız başvurular                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🚀 Co-founder (CTO) Aranıyor                                │   │
│  │ @ayse_y | Konya Gıda ve Tarım Üni                           │   │
│  │ Başvuru: 2 gün önce                                         │   │
│  │ Durum: Mesaj gönderildi                                     │   │
│  │                                                              │   │
│  │ [💬 Mesajları Görüntüle]                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🤝 Mobil Uygulama Projesi                                   │   │
│  │ @mehmet_k | Selçuk Üni                                      │   │
│  │ Başvuru: 1 hafta önce                                       │   │
│  │ Durum: Mesaj gönderildi                                     │   │
│  │                                                              │   │
│  │ [💬 Mesajları Görüntüle]                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Not:** İş/Staj ilanları dış link olduğu için burada gösterilmez.

---

## 🔧 TEKNİK DETAYLAR

### Database Schema

#### `career_listings` Tablosu
```sql
CREATE TABLE career_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_type VARCHAR(20) NOT NULL,  -- 'job', 'internship', 'startup', 'project'
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL CHECK (char_length(description) >= 50),
    sector VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    
    -- İş/Staj için
    company_name VARCHAR(200),
    external_link VARCHAR(500),  -- Zorunlu (job/internship için)
    salary_range VARCHAR(100),
    
    -- Startup/Proje için
    required_position VARCHAR(200),
    duration VARCHAR(20),  -- 'short_term', 'long_term' (proje için)
    payment_type VARCHAR(50),  -- 'paid', 'unpaid', 'project_based', 'equity', 'learning'
    
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP NULL,
    auto_archive_at TIMESTAMP DEFAULT (NOW() + INTERVAL '90 days'),
    
    CONSTRAINT check_listing_type CHECK (listing_type IN ('job', 'internship', 'startup', 'project')),
    CONSTRAINT check_status CHECK (status IN ('active', 'archived', 'deleted')),
    CONSTRAINT check_sector CHECK (sector IN ('Yazılım', 'Mühendislik', 'Tasarım', 'Pazarlama', 'Veri Bilimi', 'Diğer'))
);

CREATE INDEX idx_career_listings_creator ON career_listings(creator_user_id);
CREATE INDEX idx_career_listings_type ON career_listings(listing_type);
CREATE INDEX idx_career_listings_sector ON career_listings(sector);
CREATE INDEX idx_career_listings_status ON career_listings(status);
CREATE INDEX idx_career_listings_created_at ON career_listings(created_at DESC);
CREATE INDEX idx_career_listings_auto_archive ON career_listings(auto_archive_at) WHERE status = 'active';
```

#### `career_messages` Tablosu
**Not:** Kariyer mesajlaşması merkezi DM sisteminin bir parçasıdır. Detaylı bilgi için `specs/013-messages/spec.md` dosyasına bakın.

```sql
CREATE TABLE career_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT check_not_self_message CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_career_messages_conversation ON career_messages(conversation_id);
CREATE INDEX idx_career_messages_sender ON career_messages(sender_id);
CREATE INDEX idx_career_messages_receiver ON career_messages(receiver_id);
```

---

#### `career_applications` Tablosu
**Not:** Sadece Startup/Proje ilanları için. İş/Staj ilanları dış link olduğu için başvuru kayıtları tutulmaz.

```sql
CREATE TABLE career_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES career_listings(id) ON DELETE CASCADE,
    applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id),  -- Konuşma referansı
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_application UNIQUE (listing_id, applicant_user_id)
);

CREATE INDEX idx_career_applications_listing ON career_applications(listing_id);
CREATE INDEX idx_career_applications_applicant ON career_applications(applicant_user_id);
```

#### `career_reports` Tablosu
```sql
CREATE TABLE career_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES career_listings(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP NULL,
    
    CONSTRAINT check_report_status CHECK (status IN ('pending', 'reviewed', 'action_taken')),
    CONSTRAINT unique_user_report UNIQUE (listing_id, reporter_user_id)
);

CREATE INDEX idx_career_reports_status ON career_reports(status);
CREATE INDEX idx_career_reports_listing ON career_reports(listing_id);
```

---

### Backend Endpoints

#### İlan Yönetimi

**POST /api/v1/career/listings**
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "listing_type": "job",
    "title": "React Developer",
    "description": "Acme Corp olarak...",
    "sector": "Yazılım",
    "location": "İstanbul",
    "company_name": "Acme Corp",
    "external_link": "https://linkedin.com/jobs/123",
    "salary_range": "20.000 - 30.000 TL"
  }
  ```
- **Response:** `201 Created`
- **Rate Limiting:** Öğrenciler için 5 ilan/gün, Adminler için sınırsız

**GET /api/v1/career/listings**
- **Auth:** Optional
- **Query Params:**
  - `university_id`: UUID (filter by university)
  - `listing_type`: string (job | internship | startup | project)
  - `sector`: string
  - `location`: string
  - `search`: string (search in title, description, company)
  - `sort`: "newest" | "oldest"
  - `page`: integer (default: 1)
  - `limit`: integer (default: 24)
- **Response:** `200 OK`

**GET /api/v1/career/listings/{id}**
- **Auth:** Optional
- **Response:** `200 OK`
- **Side Effect:** Increment `view_count`

**PUT /api/v1/career/listings/{id}**
- **Auth:** Required (JWT, owner only)
- **Body:** Partial update
- **Response:** `200 OK`

**PATCH /api/v1/career/listings/{id}/archive**
- **Auth:** Required (JWT, owner only)
- **Response:** `200 OK`

**DELETE /api/v1/career/listings/{id}**
- **Auth:** Required (JWT, owner or admin)
- **Response:** `204 No Content`

**GET /api/v1/career/my-listings**
- **Auth:** Required (JWT)
- **Query Params:** `status`: "active" | "archived"
- **Response:** `200 OK`

---

#### Başvuru Yönetimi (Sadece Startup/Proje için)

**POST /api/v1/career/listings/{listing_id}/apply**
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "message_text": "Merhaba, projenizde yer almak isterim..."
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "success": true,
    "conversation_id": 123,
    "message": "Başvurunuz gönderildi"
  }
  ```
- **Logic:**
  1. İlan `startup` veya `project` türünde mi kontrol et
  2. Daha önce başvuru yapmış mı kontrol et
  3. Merkezi DM sisteminde konuşma başlat (`POST /api/v1/messages/conversations`)
     - `type: "career"`
     - `reference_id: listing_id`
     - `receiver_id: poster_id`
  4. `career_applications` tablosuna kaydet (`conversation_id` ile)
  5. `/dashboard/messages/{conversation_id}` sayfasına yönlendir

**Alternatif (Frontend'den doğrudan):**
```typescript
// İlgileniyorum butonuna tıklayınca
const response = await api.post('/messages/conversations', {
  type: 'career',
  reference_id: listingId,
  receiver_id: listing.user_id,
  content: 'Merhaba, ilan hakkında detaylı bilgi alabilir miyim?',
});
navigate(`/dashboard/messages/${response.data.conversation_id}`);
```

**GET /api/v1/career/listings/{listing_id}/applications**
- **Auth:** Required (JWT, owner only)
- **Response:** `200 OK`
- **Returns:** Başvuru yapan kullanıcılar listesi

**GET /api/v1/career/my-applications**
- **Auth:** Required (JWT)
- **Response:** `200 OK`
- **Returns:** Kullanıcının yaptığı başvurular (sadece startup/proje)

**Not:** Mesajlaşma sistemiyle ilgili tüm detaylar `specs/013-messages/spec.md` dosyasında bulunmaktadır.

---

#### Raporlama

**POST /api/v1/career/listings/{listing_id}/report**
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "reason": "Sahte ilan, gerçek dışı bilgiler içeriyor."
  }
  ```
- **Response:** `201 Created`
- **Rate Limit:** 5 rapor/kullanıcı/gün

---

### Otomasyon: İlan Arşivleme (Cron Job)

**Görev:** 90 gün boyunca güncellememiş ilanları otomatik arşivle

**Çalışma Periyodu:** Günlük (her gece 02:00)

**Pseudo-code:**
```python
def archive_expired_listings():
    expired = db.query(CareerListing).filter(
        CareerListing.auto_archive_at < datetime.now(),
        CareerListing.status == 'active'
    ).all()
    
    for listing in expired:
        # Email bildirimi gönder
        send_email(
            to=listing.creator.email,
            subject="İlanınız Arşivlendi",
            body=f"'{listing.title}' ilanınız 90 gün boyunca güncellenmediği için arşivlendi."
        )
        
        # İlanı arşivle
        listing.status = 'archived'
        listing.archived_at = datetime.now()
        db.commit()
```

---

## 🛡️ GÜVENLİK VE MODERASYON

### 1. İlan Güvenliği
- Sadece `email_verified=True` kullanıcılar ilan verebilir
- Rate Limiting: 5 ilan/kullanıcı/gün (adminler hariç)
- XSS koruması: Başlık ve açıklama sanitize edilir
- SQL Injection koruması: ORM kullanımı
- **Link Doğrulama:** Dış linkler phishing kontrolünden geçer

### 2. Başvuru Güvenliği
- Bir kullanıcı aynı ilana sadece 1 kez başvurabilir
- Spam koruması: 10 başvuru/kullanıcı/gün rate limit
- Kendi ilanına başvuramaz

### 3. Raporlama ve Moderasyon
- Kullanıcılar uygunsuz ilanları raporlayabilir
- Admin panelinde raporlar listelenir
- Admin, ilan sahibine uyarı gönderebilir veya ilanı silebilir
- Tekrarlayan ihlallerde kullanıcı hesabı askıya alınabilir

---

## 📱 RESPONSIVE TASARIM

### Desktop (1024px+)
- İlan kartları: 3 sütun grid

### Tablet (768px - 1023px)
- İlan kartları: 2 sütun grid

### Mobile (< 768px)
- İlan kartları: 1 sütun (liste görünümü)
- Filtreler: Accordion şeklinde açılır

---

## ♿ ERİŞİLEBİLİRLİK

- Tüm butonlar klavye ile erişilebilir (Tab navigasyonu)
- Form hataları screen reader ile okunabilir
- Kontrast oranı: WCAG AA standardı (4.5:1)
- İkon + Text kombinasyonu (sadece ikon değil)

---

## 🎯 BAŞARI METRİKLERİ

- **Aktif İlan Sayısı:** Aylık yayınlanan ilan sayısı (türlerine göre)
- **Başvuru Oranı:** Startup/Proje ilanlarına başvuru yüzdesi
- **Dış Link Tıklama Oranı:** İş/Staj ilanlarına tıklama yüzdesi
- **Arşivlenme Oranı:** Manuel vs. Otomatik arşivlenme
- **Kullanıcı Başına İlan:** Ortalama ilan oluşturma sayısı

---

## 📝 NOTLAR VE GELECEK GELİŞTİRMELER

### MVP için Dahil OLMAYANLAR:
- CV yükleme
- Otomatik eşleştirme (AI)
- İlan öne çıkarma (ücretli)
- Video/Fotoğraf ekleme
- Başvuru takip sistemi
- Mülakat/Randevu planlama

### Gelecek Versiyonlar için Fikirler:
- AI destekli ilan-öğrenci eşleştirmesi
- Şirket hesapları (doğrulanmış işverenler)
- İlan öne çıkarma (premium)
- CV/Portfolio entegrasyonu
- Başvuru istatistikleri (ilan sahibi için)
- Email bildirimleri (yeni ilan, başvuru, vb.)
- Favori ilanlar
- İlan paylaşma (WhatsApp, LinkedIn)

---

## ✅ ONAY DURUMU

- [ ] Kullanıcı tarafından gözden geçirildi
- [ ] Tasarım mockup'ları onaylandı
- [ ] Backend API kontratı onaylandı
- [ ] Database şeması onaylandı

---

**Son Güncelleme:** 2025-01-01  
**Versiyon:** 1.0  
**Hazırlayan:** AI Assistant

