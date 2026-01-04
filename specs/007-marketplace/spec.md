# 007 - PAZAR (İKİNCİ EL EŞYA ALIM-SATIM)

## 📋 GENEL BAKIŞ

**Modül Adı:** Pazar (Marketplace)  
**Öncelik:** Orta  
**Bağımlılıklar:** 
- 002-register-page (Kullanıcı kaydı)
- 003-login-page (Kimlik doğrulama)
- 004-dashboard (Ana navigasyon)

**Amaç:**  
Üniversite öğrencilerinin güvenli bir ortamda ikinci el eşya alım-satımı yapabilecekleri bir platform oluşturmak. Platform içi mesajlaşma (DM) sistemi ile alıcı-satıcı iletişimini sağlamak.

---

## 🎯 KULLANICI HİKAYELERİ

### US-07.1: İlan Oluşturma
**Rol:** Öğrenci (Satıcı)  
**İstek:** Kullanmadığım eşyaları satmak için ilan oluşturmak istiyorum.  
**Değer:** Eşyalarımdan gelir elde edebilir ve kampüs topluluğuna katkıda bulunabilirim.

**Kabul Kriterleri:**
- Sadece doğrulanmış email'e sahip öğrenciler ilan oluşturabilir
- İlan oluştururken şu bilgiler zorunludur: Başlık, Açıklama, Fiyat, Kategori, Durum, En az 1 fotoğraf
- Maksimum 3 fotoğraf yüklenebilir
- İlan admin onayı olmadan direkt yayınlanır
- İlan oluşturulduktan sonra "İlanın Yayında" mesajı gösterilir

---

### US-07.2: İlan Listeleme ve Filtreleme
**Rol:** Öğrenci (Alıcı)  
**İstek:** İhtiyacım olan eşyaları arayıp filtreleyebilmek istiyorum.  
**Değer:** Uygun fiyatlı ikinci el ürünlere hızlıca erişebilirim.

**Kabul Kriterleri:**
- Default olarak önce kendi üniversitesinden ilanlar gösterilir
- "Tüm İlanlar" sekmesine geçerek tüm üniversitelerden ilanları görebilir
- Kategoriye göre filtreleme yapılabilir
- Fiyat aralığına göre filtreleme yapılabilir
- Ürün durumuna göre filtreleme yapılabilir (Sıfır, Az Kullanılmış, İyi Durumda, Kullanılmış)
- Arama çubuğundan ürün adı, açıklama içinde arama yapılabilir
- İlanlar şu şekilde sıralanabilir: Yeni İlanlar, Ucuz → Pahalı, Pahalı → Ucuz

---

### US-07.3: İlan Detayı ve Mesajlaşma
**Rol:** Öğrenci (Alıcı)  
**İstek:** İlan detaylarını görmek ve satıcıyla iletişim kurmak istiyorum.  
**Değer:** Ürün hakkında daha fazla bilgi alabilir ve satın alma kararı verebilirim.

**Kabul Kriterleri:**
- İlana tıklandığında detay sayfası açılır
- İlan detayında şunlar görünür: Başlık, Açıklama, Fiyat, Kategori, Durum, Fotoğraflar (galeri), Satıcı profili (Ad Soyad, Üniversite, Bölüm), Yayınlanma tarihi
- "Satıcıya Mesaj Gönder" butonu ile DM sistemi açılır
- Satıcının profil sayfasına gidilerek diğer ilanları görülebilir
- "Uygunsuz İlan Bildir" butonu ile rapor gönderilebilir

---

### US-07.4: İlanlarımı Yönetme
**Rol:** Öğrenci (Satıcı)  
**İstek:** Oluşturduğum ilanları düzenlemek ve durumunu güncellemek istiyorum.  
**Değer:** İlanlarımın güncel kalmasını sağlayabilirim.

**Kabul Kriterleri:**
- Profilim > "İlanlarım" sekmesinden aktif ve satılmış ilanlarım görülür
- İlanı düzenleyebilirim (başlık, açıklama, fiyat, fotoğraflar)
- İlan satıldığında "Satıldı Olarak İşaretle" butonuna basabilirim
- Satıldı olarak işaretlenen ilanlar listede "SATILDI" rozeti ile gösterilir
- İlanı tamamen silebilirim
- 60 gün boyunca satılmayan ilanlar otomatik olarak silinir (sistem tarafından email bildirimi gönderilir)

---

### US-07.5: Platform İçi Mesajlaşma (DM)
**Rol:** Öğrenci (Alıcı/Satıcı)  
**İstek:** Diğer öğrencilerle güvenli bir şekilde mesajlaşmak istiyorum.  
**Değer:** Kişisel bilgilerimi paylaşmadan iletişim kurabilirim.

**Kabul Kriterleri:**
- İlan detayında "Satıcıya Mesaj Gönder" butonu vardır
- Butona tıklandığında merkezi mesajlaşma sistemine yeni konuşma başlatılır
- **Merkezi DM Sistemi:** Pazar + Kariyer mesajları tek sayfada (`/dashboard/messages`)
- **Detaylar:** `specs/013-messages/spec.md` dosyasına bakın
- Header'daki mesaj dropdown'ından son 3 konuşma görülebilir
- Okunmamış mesaj sayısı header badge'inde gösterilir
- Mesajlaşma polling ile güncellenir: Her 10 saniyede bir otomatik refresh (MVP için, WebSocket yok)

---

## 🎨 UI/UX TASARIMI

### 1. Pazar Ana Sayfası

```
┌─ PAZAR ────────────────────────────────────────────────────────────┐
│                                                                     │
│  [🔍 Arama...]  [Kategori ▼] [Fiyat ▼] [Durum ▼] [Sırala: Yeni ▼] │
│                                                                     │
│  📍 [Üniversitem] [Tüm İlanlar]                    [+ İlan Ver]   │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│  │ 📱 [Foto]   │ │ 💻 [Foto]   │ │ 📚 [Foto]   │                  │
│  │ iPhone 13   │ │ MacBook Air │ │ Kalkülüs    │                  │
│  │ 25.000 TL   │ │ 35.000 TL   │ │ 150 TL      │                  │
│  │ SATILDI     │ │ İyi Durumda │ │ Az Kullanım │                  │
│  │ @ahmet_k    │ │ @ayse_y     │ │ @mehmet_a   │                  │
│  │ Selçuk Üni  │ │ KTÜN        │ │ GIDATARIM   │                  │
│  └─────────────┘ └─────────────┘ └─────────────┘                  │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│  │ ...         │ │ ...         │ │ ...         │                  │
│  └─────────────┘ └─────────────┘ └─────────────┘                  │
│                                                                     │
│  [1] [2] [3] ... [10] [>]                                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Bileşenler:**
- **Arama Çubuğu:** Başlık ve açıklamada arama
- **Filtreler:** Kategori, Fiyat Aralığı (Min-Max), Durum dropdown'ları
- **Sıralama:** Yeni İlanlar, Ucuz → Pahalı, Pahalı → Ucuz
- **Sekmeler:** "Üniversitem" (default), "Tüm İlanlar"
- **İlan Ver Butonu:** Sağ üstte, öne çıkan renkte
- **İlan Kartı:**
  - Fotoğraf (ilk fotoğraf gösterilir)
  - Başlık (max 50 karakter, taşarsa "...")
  - Fiyat (TL formatında)
  - Durum rozeti
  - Satıcı adı (link)
  - Üniversite adı
  - Satıldıysa "SATILDI" rozeti (opak overlay)
- **Pagination:** 24 ilan/sayfa

---

### 2. İlan Oluşturma Sayfası

```
┌─ YENİ İLAN OLUŞTUR ────────────────────────────────────────────────┐
│                                                                     │
│  📸 Fotoğraflar (En az 1, en fazla 3) *                            │
│  ┌────────┐ ┌────────┐ ┌────────┐                                 │
│  │ [+]    │ │ [Foto] │ │        │                                 │
│  │ Ekle   │ │  [X]   │ │        │                                 │
│  └────────┘ └────────┘ └────────┘                                 │
│                                                                     │
│  📝 Başlık *                                                        │
│  [_________________________________________________]                │
│                                                                     │
│  📋 Kategori *                                                      │
│  [Seçiniz                                               ▼]         │
│   - 📱 Elektronik                                                   │
│   - 📚 Kitap & Ders Notları                                         │
│   - 👕 Kıyafet & Aksesuar                                           │
│   - 🪑 Mobilya & Ev Eşyası                                          │
│   - ⚽ Spor Malzemeleri                                              │
│   - 🎸 Müzik Aletleri                                               │
│   - 🚲 Ulaşım (Bisiklet, Scooter)                                   │
│   - 🎮 Oyun & Hobi                                                  │
│   - ⚙️ Diğer                                                        │
│                                                                     │
│  💰 Fiyat (TL) *                                                    │
│  [_________________________________________________]                │
│                                                                     │
│  ✨ Durum *                                                          │
│  [Seçiniz                                               ▼]         │
│   - Sıfır                                                           │
│   - Az Kullanılmış                                                  │
│   - İyi Durumda                                                     │
│   - Kullanılmış                                                     │
│                                                                     │
│  📄 Açıklama *                                                      │
│  [____________________________________________________________]     │
│  [____________________________________________________________]     │
│  [____________________________________________________________]     │
│  [____________________________________________________________]     │
│                                                                     │
│  [İptal]                                        [İlanı Yayınla]    │
└─────────────────────────────────────────────────────────────────────┘
```

**Validasyon:**
- Başlık: 10-100 karakter arası
- Açıklama: 20-1000 karakter arası
- Fiyat: Pozitif sayı, max 999,999 TL
- Fotoğraf: JPEG/PNG, max 5MB/dosya, min 1 - max 3 fotoğraf
- Kategori, Durum: Dropdown'dan seçilmeli

**Başarı Mesajı:**
```
✅ İlanınız Başarıyla Yayınlandı!
İlanınız şimdi diğer öğrenciler tarafından görülebilir.
[İlanlarımı Görüntüle] [Yeni İlan Ver]
```

---

### 3. İlan Detay Sayfası

```
┌─ İLAN DETAYI ──────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─────────────────────────────┐  ┌─ SATICI BİLGİLERİ ─────────┐  │
│  │                             │  │                             │  │
│  │   [ANA FOTOĞRAF]            │  │  👤 Ahmet Kaya              │  │
│  │                             │  │  🎓 Selçuk Üniversitesi     │  │
│  │                             │  │  📚 Bilgisayar Müh.         │  │
│  │   [◀] [1/3] [▶]            │  │                             │  │
│  │                             │  │  [📩 Mesaj Gönder]          │  │
│  └─────────────────────────────┘  │  [👤 Profili Görüntüle]     │  │
│  [Küçük] [Küçük] [Küçük]          │                             │  │
│                                    └─────────────────────────────┘  │
│  📱 iPhone 13 Pro 128GB                                             │
│  ─────────────────────────────────────────────────────────────────  │
│  💰 25.000 TL                                                       │
│  📋 Kategori: Elektronik                                            │
│  ✨ Durum: Az Kullanılmış                                            │
│  📅 Yayınlandı: 2 saat önce                                         │
│                                                                     │
│  📄 AÇIKLAMA                                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  1 yıldır kullanılan iPhone 13 Pro. Hiçbir problemi yok,           │
│  ekran koruyucu ve kılıfı ile birlikte satılacak. Kutu ve          │
│  aksesuarları mevcuttur. Garanti süresi dolmuştur.                 │
│                                                                     │
│  [🚩 Uygunsuz İlan Bildir]                                          │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  📱 SATICIPIN DİĞER İLANLARI                                        │
│  ┌──────────┐ ┌──────────┐                                         │
│  │ AirPods  │ │ Watch    │                                         │
│  │ 3.500 TL │ │ 8.000 TL │                                         │
│  └──────────┘ └──────────┘                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 4. İlanlarım Sayfası (Profil > İlanlarım)

```
┌─ İLANLARIM ────────────────────────────────────────────────────────┐
│                                                                     │
│  [Aktif İlanlar (3)] [Satılmış İlanlar (5)]       [+ Yeni İlan]   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📱 iPhone 13 Pro 128GB                    25.000 TL         │   │
│  │ Kategori: Elektronik | Durum: Az Kullanılmış                │   │
│  │ Yayınlandı: 2 saat önce | Görüntülenme: 45                  │   │
│  │                                                              │   │
│  │ [✏️ Düzenle] [✅ Satıldı Olarak İşaretle] [🗑️ Sil]          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 💻 MacBook Air M1                         35.000 TL         │   │
│  │ Kategori: Elektronik | Durum: İyi Durumda                    │   │
│  │ Yayınlandı: 1 gün önce | Görüntülenme: 120                  │   │
│  │                                                              │   │
│  │ [✏️ Düzenle] [✅ Satıldı Olarak İşaretle] [🗑️ Sil]          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📚 Kalkülüs Kitabı                        150 TL            │   │
│  │ Kategori: Kitap & Ders Notları | Durum: Az Kullanılmış      │   │
│  │ Yayınlandı: 3 gün önce | Görüntülenme: 28                   │   │
│  │ ⚠️ İlan 57 gün sonra otomatik silinecek                      │   │
│  │                                                              │   │
│  │ [✏️ Düzenle] [✅ Satıldı Olarak İşaretle] [🗑️ Sil]          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 5. Mesajlaşma Sistemi

**Not:** Pazar mesajlaşması, merkezi DM sisteminin bir parçasıdır.

**Detaylı Bilgi:** `specs/013-messages/spec.md` dosyasına bakın.

**Kısa Özet:**
- İlan detayında "Satıcıya Mesaj Gönder" butonu
- Yeni konuşma başlatır (`POST /api/v1/messages/conversations`)
- Konuşma oluşturulduktan sonra `/dashboard/messages/{conversation_id}` sayfasına yönlendirilir
- Tüm mesajlar (Pazar + Kariyer) tek merkezde gösterilir
- Header dropdown'ında son 3 konuşma görünür
- Polling: 10 saniye (chat), 30 saniye (header badge)

---

## 🔧 TEKNİK DETAYLAR

### Database Schema

#### `marketplace_listings` Tablosu
```sql
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL CHECK (char_length(description) >= 20),
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    category VARCHAR(50) NOT NULL,
    condition VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    sold_at TIMESTAMP NULL,
    auto_delete_at TIMESTAMP DEFAULT (NOW() + INTERVAL '60 days'),
    
    CONSTRAINT check_category CHECK (category IN (
        'Elektronik', 
        'Kitap & Ders Notları', 
        'Kıyafet & Aksesuar', 
        'Mobilya & Ev Eşyası', 
        'Spor Malzemeleri', 
        'Müzik Aletleri', 
        'Ulaşım', 
        'Oyun & Hobi', 
        'Diğer'
    )),
    CONSTRAINT check_condition CHECK (condition IN (
        'Sıfır', 
        'Az Kullanılmış', 
        'İyi Durumda', 
        'Kullanılmış'
    )),
    CONSTRAINT check_status CHECK (status IN ('active', 'sold', 'deleted'))
);

CREATE INDEX idx_marketplace_listings_seller ON marketplace_listings(seller_user_id);
CREATE INDEX idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_created_at ON marketplace_listings(created_at DESC);
CREATE INDEX idx_marketplace_listings_auto_delete ON marketplace_listings(auto_delete_at) WHERE status = 'active';
```

#### `marketplace_listing_images` Tablosu
```sql
CREATE TABLE marketplace_listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    display_order INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_listing_order UNIQUE (listing_id, display_order),
    CONSTRAINT check_display_order CHECK (display_order >= 1 AND display_order <= 3)
);

CREATE INDEX idx_marketplace_images_listing ON marketplace_listing_images(listing_id);
```

#### `marketplace_reports` Tablosu
```sql
CREATE TABLE marketplace_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP NULL,
    
    CONSTRAINT check_report_status CHECK (status IN ('pending', 'reviewed', 'action_taken')),
    CONSTRAINT unique_user_report UNIQUE (listing_id, reporter_user_id)
);

CREATE INDEX idx_marketplace_reports_status ON marketplace_reports(status);
CREATE INDEX idx_marketplace_reports_listing ON marketplace_reports(listing_id);
```

#### `marketplace_messages` Tablosu
**Not:** Pazar mesajlaşması merkezi DM sisteminin bir parçasıdır. Detaylı bilgi için `specs/013-messages/spec.md` dosyasına bakın.

```sql
CREATE TABLE marketplace_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT check_not_self_message CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_marketplace_messages_conversation ON marketplace_messages(conversation_id);
CREATE INDEX idx_marketplace_messages_sender ON marketplace_messages(sender_id);
CREATE INDEX idx_marketplace_messages_receiver ON marketplace_messages(receiver_id);
```

---

### Backend Endpoints

#### İlan Yönetimi

**POST /api/v1/marketplace/listings**
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "title": "iPhone 13 Pro 128GB",
    "description": "1 yıldır kullanılan iPhone...",
    "price": 25000,
    "category": "Elektronik",
    "condition": "Az Kullanılmış"
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "id": "uuid",
    "message": "İlan başarıyla oluşturuldu",
    "listing": {...}
  }
  ```

**POST /api/v1/marketplace/listings/{listing_id}/images**
- **Auth:** Required (JWT, owner only)
- **Body:** `multipart/form-data` (max 3 images, max 5MB each)
- **Response:** `201 Created`

**GET /api/v1/marketplace/listings**
- **Auth:** Optional
- **Query Params:**
  - `university_id`: UUID (filter by university)
  - `category`: string
  - `min_price`, `max_price`: decimal
  - `condition`: string
  - `search`: string (search in title, description)
  - `sort`: "newest" | "price_asc" | "price_desc"
  - `page`: integer (default: 1)
  - `limit`: integer (default: 24)
- **Response:** `200 OK`
  ```json
  {
    "listings": [...],
    "total": 120,
    "page": 1,
    "pages": 5
  }
  ```

**GET /api/v1/marketplace/listings/{id}**
- **Auth:** Optional
- **Response:** `200 OK`
- **Side Effect:** Increment `view_count`

**PUT /api/v1/marketplace/listings/{id}**
- **Auth:** Required (JWT, owner only)
- **Body:** Partial update
- **Response:** `200 OK`

**PATCH /api/v1/marketplace/listings/{id}/mark-sold**
- **Auth:** Required (JWT, owner only)
- **Response:** `200 OK`

**DELETE /api/v1/marketplace/listings/{id}**
- **Auth:** Required (JWT, owner only)
- **Response:** `204 No Content`

**GET /api/v1/marketplace/my-listings**
- **Auth:** Required (JWT)
- **Query Params:** `status`: "active" | "sold"
- **Response:** `200 OK`

---

#### Mesajlaşma (DM)

**Not:** Pazar mesajlaşması merkezi DM sisteminin bir parçasıdır. Tüm API endpoints için `specs/013-messages/spec.md` dosyasına bakın.

**Pazar İlanı için Mesaj Başlatma:**

**Frontend'de** ilan detay sayfasında "Satıcıya Mesaj Gönder" butonu:
```typescript
// POST /api/v1/messages/conversations
{
  "type": "marketplace",
  "reference_id": listing_id,
  "receiver_id": seller_id,
  "content": "Merhaba, ürün hakkında bilgi alabilir miyim?"
}
```

**Response:** `conversation_id` döner ve `/dashboard/messages/{conversation_id}` sayfasına yönlendirilir.

**Diğer Mesajlaşma Endpoints:**
- `GET /api/v1/messages/conversations` - Tüm konuşmalar (Pazar + Kariyer)
- `GET /api/v1/messages/conversations/{conversation_id}/messages` - Konuşma mesajları
- `POST /api/v1/messages/conversations/{conversation_id}/messages` - Mesaj gönder
- `GET /api/v1/messages/conversations/unread-count` - Okunmamış sayısı

**Detaylı API dokümantasyonu:** `specs/013-messages/spec.md`

---

#### Raporlama

**POST /api/v1/marketplace/listings/{listing_id}/report**
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "reason": "Sahte ilan, gerçek olmayan bilgiler içeriyor."
  }
  ```
- **Response:** `201 Created`
- **Rate Limit:** 5 rapor/kullanıcı/gün

---

### Dosya Yükleme (Image Upload)

**Stratejisi:** Local Storage (mezuniyet projesi için sıfır maliyet)
- **Dosya Formatı:** JPEG, PNG
- **Maksimum Boyut:** 5MB/dosya
- **Maksimum Adet:** 3 fotoğraf/ilan
- **Kayıt Yeri:** `backend/uploads/marketplace/{user_id}/{listing_id}/{uuid}.jpg`
- **Optimizasyon:** Backend'de image resize (1200x1200 max)
- **Serving:** FastAPI StaticFiles (`/uploads/marketplace/...`)

**NOT:** 
- Bu proje mezuniyet projesi için local storage kullanır (backend/uploads/)
- S3, MinIO, Cloudflare R2 veya cloud storage kullanılmaz
- Tüm dosyalar backend sunucusunun disk'inde saklanır

---

### Otomasyon: İlan Silme (Cron Job)

**Görev:** 60 gün boyunca satılmayan ilanları otomatik sil

**Çalışma Periyodu:** Günlük (her gece 02:00)

**Pseudo-code:**
```python
def delete_expired_listings():
    expired = db.query(
        MarketplaceListing
    ).filter(
        MarketplaceListing.auto_delete_at < datetime.now(),
        MarketplaceListing.status == 'active'
    ).all()
    
    for listing in expired:
        # Email bildirimi gönder
        send_email(
            to=listing.seller.email,
            subject="İlanınız Süresi Doldu",
            body=f"'{listing.title}' ilanınız 60 gün boyunca satılmadığı için sistemden kaldırıldı."
        )
        
        # İlanı sil (cascade ile image'lar da silinir)
        db.delete(listing)
    
    db.commit()
```

---

## 🛡️ GÜVENLİK VE MODERASYON

### 1. İlan Güvenliği
- Sadece `email_verified=True` kullanıcılar ilan verebilir
- Rate Limiting: 10 ilan/kullanıcı/gün
- XSS koruması: Başlık ve açıklama sanitize edilir
- SQL Injection koruması: ORM kullanımı

### 2. Mesajlaşma Güvenliği
- Kullanıcılar sadece kendi mesajlarını görebilir
- Spam koruması: 20 mesaj/kullanıcı/saat rate limit
- Kötü söz filtresi (opsiyonel, sonraki versiyon)

### 3. Raporlama ve Moderasyon
- Kullanıcılar uygunsuz ilanları raporlayabilir
- Admin panelinde raporlar listelenir
- Admin, ilan sahibine uyarı gönderebilir veya ilanı silebilir
- Tekrarlayan ihlallerde kullanıcı hesabı askıya alınabilir

---

## 📱 RESPONSIVE TASARIM

### Desktop (1024px+)
- İlan kartları: 4 sütun grid
- Mesajlaşma: 2 panel (konuşmalar + aktif sohbet)

### Tablet (768px - 1023px)
- İlan kartları: 3 sütun grid
- Mesajlaşma: 2 panel (küçültülmüş)

### Mobile (< 768px)
- İlan kartları: 2 sütun grid
- Mesajlaşma: Tek panel (konuşma seçildiğinde full screen)
- Filtreler: Accordion şeklinde açılır

---

## ♿ ERİŞİLEBİLİRLİK

- Tüm butonlar klavye ile erişilebilir (Tab navigasyonu)
- İlan kartlarında alt text (fotoğraf yüklenmezse başlık gösterilir)
- Form hataları screen reader ile okunabilir
- Kontrast oranı: WCAG AA standardı (4.5:1)

---

## 🎯 BAŞARI METRİKLERİ

- **Aktif İlan Sayısı:** Aylık yayınlanan ilan sayısı
- **Tamamlanan Satış Oranı:** Satıldı olarak işaretlenen ilan yüzdesi
- **Ortalama İlan Süresi:** İlan oluşturulma ile satıldı işaretlenmesi arasındaki süre
- **Mesaj Yanıt Oranı:** Gönderilen mesajlara yanıt verme yüzdesi
- **Kullanıcı Başına İlan:** Ortalama ilan oluşturma sayısı

---

## 📝 NOTLAR VE GELECEK GELİŞTİRMELER

### MVP için Dahil OLMAYANLAR:
- Real-time mesajlaşma (WebSocket)
- Bildirim sistemi
- Favori ilanlar
- Fiyat önerisi sistemi
- İlan istatistikleri (görüntülenme grafiği)
- Ödeme entegrasyonu
- Teslimat takibi

### Gelecek Versiyonlar için Fikirler:
- AI destekli fiyat önerisi (benzer ürünlere göre)
- Kullanıcı değerlendirme sistemi (satıcı puanı)
- Kampüs içi teslimat noktaları
- QR kod ile hızlı ilan gösterme
- "Takasla" özelliği (ürün-ürün değişimi)
- İlan paylaşma (WhatsApp, Instagram)

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

