# 013 - Mesajlaşma Sistemi

## 📋 Genel Bakış

Merkezi mesajlaşma sistemi. Pazar ve Kariyer DM'lerini tek bir yerde birleştirir. Kullanıcılar header'daki mesaj dropdown'ından son konuşmaları görebilir, tüm mesajlar için ayrı sayfaya gidebilir.

---

## 🎯 Amaç

- Tüm DM'leri (Pazar + Kariyer) tek merkezde toplamak
- Kullanıcının tüm konuşmalarını kolayca takip etmesini sağlamak
- Header'dan hızlı erişim sağlamak

---

## 👥 Kullanıcı Rolleri

- **Öğrenci, Eğitmen:** Hem Pazar hem Kariyer için mesajlaşabilir

---

## 💬 Mesajlaşma Kaynakları

### 1. Pazar Mesajları
- **Kaynak:** Marketplace ilanları
- **Senaryo:** Alıcı-Satıcı iletişimi
- **Örnek:** "Laptop Satılık" ilanı için mesajlaşma

### 2. Kariyer Mesajları
- **Kaynak:** Kariyer ilanları (Startup Ekip, Proje Partner)
- **Senaryo:** İş/Staj başvurusu, ekip kurma
- **Örnek:** "UI/UX Designer Aranıyor" ilanı için mesajlaşma

---

## 🎨 Header Dropdown Tasarımı

### Görünüm

```
┌─ MESAJLAR (2) ─────────────────────────────────┐
│                                                │
│  🟢 Mehmet Demir                               │
│     Pazar: Laptop Satılık                     │
│     "Laptop hala satılıkta mı?"               │
│     5 dakika önce                              │
│                                                │
│  🟢 Ayşe Kaya                                  │
│     Kariyer: UI/UX Designer Aranıyor          │
│     "Staj pozisyonu hakkında..."              │
│     1 saat önce                                │
│                                                │
│  ⚪ Ali Yılmaz                                 │
│     Pazar: Matematik Kitabı                   │
│     "Teşekkürler!"                            │
│     Dün                                        │
│                                                │
│  ──────────────────────────────────────────── │
│  [Tüm Mesajları Gör]                           │
└────────────────────────────────────────────────┘
```

### Özellikler

- **Son 3 konuşma** gösterilir (en yeni üstte)
- **Renk kodları:**
  - 🟢 Okunmamış mesaj var
  - ⚪ Tüm mesajlar okundu
- **Badge:** Header'daki mesaj ikonunda okunmamış sayısı (`💬 (2)`)
- **Kaynak belirtilir:** Pazar: İlan Başlığı / Kariyer: İlan Başlığı
- **Son mesaj özeti:** İlk 50 karakter
- **"Tüm Mesajları Gör":** `/dashboard/messages` sayfasına yönlendirir
- **Konuşmaya tıklama:** Chat ekranına yönlendirir (`/dashboard/messages/{conversation_id}`)

### Dropdown Açılma

- **Click ile açılır**
- **Dışarı tıklayınca kapanır**
- **Polling:** 30 saniyede bir yeni mesaj kontrolü (badge güncellenir)

---

## 📄 Mesajlar Anasayfası (Konuşma Listesi)

### URL

`/dashboard/messages`

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  📚 KAMPÜS+    🔍 [Ara...]    🔔(2)  💬(2)  👤 (AY) ▼    │
└───────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────────────────────────────┐
│  DASHBOARD      │   MESAJLARIM (2 okunmamış)              │
│  SIDEBAR        │                                         │
│  (sabit)        │   [Tümünü Okundu İşaretle]              │
│                 │                                         │
│ 🏠 Ana Sayfa    │   ┌───────────────────────────────────┐ │
│ 🤖 AI Asistanım │   │ 🟢 Mehmet Demir                   │ │
│ 💬 Forum        │   │    📦 Pazar: Laptop Satılık       │ │
│ 🛍️ Pazar        │   │    "Laptop hala satılıkta mı?"    │ │
│ 💼 Kariyer      │   │    5 dakika önce                  │ │
│                 │   └───────────────────────────────────┘ │
│ 📚 Akademik     │                                         │
│ 📖 Ders Prog.   │   ┌───────────────────────────────────┐ │
│ 📅 Akd. Takvim  │   │ 🟢 Ayşe Kaya                      │ │
│                 │   │    💼 Kariyer: Frontend Developer │ │
│                 │   │    "Staj pozisyonu hakkında..."   │ │
│                 │   │    1 saat önce                    │ │
│                 │   └───────────────────────────────────┘ │
│                 │                                         │
│                 │   ┌───────────────────────────────────┐ │
│                 │   │ ⚪ Ali Yılmaz                      │ │
│                 │   │    📦 Pazar: Matematik Kitabı     │ │
│                 │   │    "Teşekkürler!"                 │ │
│                 │   │    Dün                            │ │
│                 │   └───────────────────────────────────┘ │
│                 │                                         │
│                 │   [📄 Daha Fazla Yükle]                 │
└─────────────────┴─────────────────────────────────────────┘
```

### Özellikler

- **Dashboard sidebar sabit kalır** (normal dashboard gibi)
- **Main alan:** Konuşma listesi
- **Her konuşma kartı:**
  - Profil resmi / baş harfler
  - İsim (karşı taraf)
  - Kaynak emoji + başlık (📦 Pazar: İlan / 💼 Kariyer: İlan)
  - Son mesaj (kısa özet, max 50 karakter)
  - Zaman (5 dakika önce, 1 saat önce, dün, vb.)
  - Okundu/Okunmadı (🟢 / ⚪)
- **Tıklanınca:** Chat ekranına yönlendirilir (`/dashboard/messages/{conversation_id}`)
- **"Tümünü Okundu İşaretle":** Tüm konuşmaları okundu işaretler
- **Pagination:** "Daha Fazla Yükle" butonu (20 konuşma/sayfa)
- **Sıralama:** En yeni mesaj üstte

---

## 💬 Chat Ekranı (Mesajlaşma)

### URL

`/dashboard/messages/{conversation_id}`

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  📚 KAMPÜS+    🔍 [Ara...]    🔔(2)  💬(2)  👤 (AY) ▼    │
└───────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────────────────────────────┐
│  DASHBOARD      │  ← Geri | Mehmet Demir                  │
│  SIDEBAR        │           📦 Pazar: Laptop Satılık       │
│  (sabit)        │  ───────────────────────────────────────│
│                 │                                         │
│ 🏠 Ana Sayfa    │  ⚪ Merhaba, laptop hala satılıkta mı?  │
│ 🤖 AI Asistanım │     Mehmet • Dün 14:30                  │
│ 💬 Forum        │                                         │
│ 🛍️ Pazar        │          Evet hala satılıkta 👍  ⚪     │
│ 💼 Kariyer      │                      Sen • Dün 15:00     │
│                 │                                         │
│ 📚 Akademik     │  ⚪ Ne zaman buluşabiliriz?              │
│ 📖 Ders Prog.   │     Mehmet • Dün 16:00                  │
│ 📅 Akd. Takvim  │                                         │
│                 │      Yarın müsaitim, Selçuklu'dayım ⚪  │
│                 │                      Sen • Dün 16:15     │
│                 │                                         │
│                 │  ───────────────────────────────────────│
│                 │  [Mesajını yaz...]            [Gönder]  │
└─────────────────┴─────────────────────────────────────────┘
```

### Özellikler

#### Üst Bar:
- **"← Geri" butonu:** Konuşma listesine dön (`/dashboard/messages`)
- **Karşı tarafın adı:** Mehmet Demir
- **Kaynak + İlan başlığı:** 📦 Pazar: Laptop Satılık

#### Mesaj Alanı:
- **Bubble tasarım** (WhatsApp/Telegram gibi)
- **Sol:** Karşı tarafın mesajları (beyaz bubble)
- **Sağ:** Senin mesajların (mavi bubble)
- **Her mesajda:**
  - İçerik
  - Gönderen (Mehmet / Sen)
  - Zaman damgası (Dün 14:30)
  - Okundu işareti (⚪) - sadece senin mesajlarında
- **Otomatik scroll:** En son mesaja
- **Polling:** 10 saniyede bir yeni mesaj kontrolü

#### Alt Bar (Mesaj Gönderme):
- **Textarea:** "Mesajını yaz..." (max 1000 karakter)
- **Gönder butonu:** Enter veya butona tıklayarak gönder
- **Karakter sayacı:** 245/1000 (opsiyonel)

---

## 🗄️ Database Şeması

### Yeni Tablo: `conversations`

```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,  -- 'marketplace' veya 'career'
    reference_id INTEGER NOT NULL,  -- ilan ID'si (listing_id veya career_listing_id)
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

**Açıklama:**
- `type`: Mesajın kaynağı (marketplace / career)
- `reference_id`: İlanın ID'si
- `user1_id`, `user2_id`: Konuşan iki kullanıcı
- `last_message_at`: Son mesaj zamanı (sıralama için)
- `user1_unread_count`, `user2_unread_count`: Her kullanıcının okunmamış mesaj sayısı

---

### Mevcut Tablolar Güncellenir

#### `marketplace_messages` tablosuna ekle:

```sql
ALTER TABLE marketplace_messages ADD COLUMN conversation_id INTEGER REFERENCES conversations(id);
CREATE INDEX idx_marketplace_messages_conversation ON marketplace_messages(conversation_id);
```

#### `career_messages` tablosuna ekle:

```sql
ALTER TABLE career_messages ADD COLUMN conversation_id INTEGER REFERENCES conversations(id);
CREATE INDEX idx_career_messages_conversation ON career_messages(conversation_id);
```

---

## 🔌 API Endpoints

### Konuşma Listesi

#### `GET /api/v1/messages/conversations`
Kullanıcının tüm konuşmalarını listeler (Pazar + Kariyer birleşik).

**Query Parameters:**
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başı konuşma sayısı (default: 20)

**Response:**
```json
{
  "total": 15,
  "total_unread": 2,
  "page": 1,
  "limit": 20,
  "has_more": false,
  "conversations": [
    {
      "id": 123,
      "type": "marketplace",
      "reference": {
        "id": 456,
        "title": "Laptop Satılık",
        "image_url": "/uploads/listings/456_1.jpg"
      },
      "other_user": {
        "id": 789,
        "username": "mehmet_demir",
        "full_name": "Mehmet Demir",
        "profile_picture_url": null
      },
      "last_message": "Laptop hala satılıkta mı?",
      "last_message_at": "2026-01-02T10:55:00Z",
      "relative_time": "5 dakika önce",
      "unread_count": 1
    },
    {
      "id": 124,
      "type": "career",
      "reference": {
        "id": 789,
        "title": "UI/UX Designer Aranıyor",
        "company_name": null
      },
      "other_user": {
        "id": 790,
        "username": "ayse_kaya",
        "full_name": "Ayşe Kaya",
        "profile_picture_url": "/uploads/profiles/790.jpg"
      },
      "last_message": "Staj pozisyonu hakkında...",
      "last_message_at": "2026-01-02T09:00:00Z",
      "relative_time": "1 saat önce",
      "unread_count": 1
    }
  ]
}
```

---

#### `GET /api/v1/messages/conversations/unread-count`
Okunmamış mesaj sayısını döner (header badge için).

**Response:**
```json
{
  "count": 2
}
```

---

### Konuşma Mesajları

#### `GET /api/v1/messages/conversations/{conversation_id}/messages`
Belirli bir konuşmanın tüm mesajlarını getirir.

**Query Parameters:**
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başı mesaj sayısı (default: 50)

**Response:**
```json
{
  "conversation": {
    "id": 123,
    "type": "marketplace",
    "reference": {
      "id": 456,
      "title": "Laptop Satılık",
      "image_url": "/uploads/listings/456_1.jpg"
    },
    "other_user": {
      "id": 789,
      "username": "mehmet_demir",
      "full_name": "Mehmet Demir",
      "profile_picture_url": null
    }
  },
  "total": 8,
  "page": 1,
  "limit": 50,
  "has_more": false,
  "messages": [
    {
      "id": 1001,
      "sender_id": 789,
      "sender": {
        "id": 789,
        "username": "mehmet_demir",
        "full_name": "Mehmet Demir"
      },
      "content": "Merhaba, laptop hala satılıkta mı?",
      "is_read": true,
      "created_at": "2026-01-01T14:30:00Z",
      "relative_time": "Dün 14:30"
    },
    {
      "id": 1002,
      "sender_id": 456,
      "sender": {
        "id": 456,
        "username": "ali_yilmaz",
        "full_name": "Ali Yılmaz"
      },
      "content": "Evet hala satılıkta 👍",
      "is_read": true,
      "created_at": "2026-01-01T15:00:00Z",
      "relative_time": "Dün 15:00"
    }
  ]
}
```

**Note:** Mesajlar okundu işaretlenir (otomatik olarak API çağrısı ile).

---

### Mesaj Gönderme

#### `POST /api/v1/messages/conversations/{conversation_id}/messages`
Yeni mesaj gönderir.

**Request:**
```json
{
  "content": "Yarın müsaitim, Selçuklu'dayım"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": 1003,
    "sender_id": 456,
    "content": "Yarın müsaitim, Selçuklu'dayım",
    "is_read": false,
    "created_at": "2026-01-02T11:00:00Z"
  }
}
```

---

### Konuşma Başlatma

#### `POST /api/v1/messages/conversations`
Yeni konuşma başlatır (ilk mesaj gönderilirken).

**Request:**
```json
{
  "type": "marketplace",
  "reference_id": 456,
  "receiver_id": 789,
  "content": "Merhaba, laptop hala satılıkta mı?"
}
```

**Response:**
```json
{
  "success": true,
  "conversation_id": 123,
  "message_id": 1001
}
```

**Note:** Eğer konuşma zaten varsa, mevcut conversation_id döner ve mesaj eklenir.

---

### Okundu İşaretleme

#### `PATCH /api/v1/messages/conversations/{conversation_id}/read`
Konuşmadaki tüm mesajları okundu olarak işaretler.

**Response:**
```json
{
  "success": true,
  "message": "Tüm mesajlar okundu olarak işaretlendi"
}
```

---

#### `PATCH /api/v1/messages/conversations/read-all`
Tüm konuşmaları okundu olarak işaretler.

**Response:**
```json
{
  "success": true,
  "message": "Tüm konuşmalar okundu olarak işaretlendi",
  "count": 3
}
```

---

## 🔒 Güvenlik ve Kısıtlamalar

### Mesajlaşma Başlatma Kuralları

**Önemli:** Kullanıcılar rastgele birine mesaj atamaz!

1. ❌ **Kullanıcılar rastgele birine mesaj atamaz**
   - Profil sayfasından "Mesaj Gönder" butonu YOK
   - Forum'dan direkt DM gönderme YOK
   - Rastgele kullanıcı araması ile mesaj atma YOK

2. ✅ **Her konuşma bir ilan üzerinden başlatılmalıdır**
   - **Pazar:** "Satıcıya Mesaj Gönder" butonundan
   - **Kariyer:** "İlgileniyorum" butonundan (Startup/Proje için)

3. ✅ **Sadece ilan sahibiyle mesajlaşma yapılabilir**
   - Pazar: Alıcı ↔ Satıcı
   - Kariyer: Başvuran ↔ İlan Veren

4. ✅ **Her konuşmanın bir reference_id (ilan) olması zorunludur**
   - Database constraint ile garanti altında
   - `CONSTRAINT unique_conversation UNIQUE(type, reference_id, user1_id, user2_id)`

---

### Spam Önleme

**Rate Limiting:**
- **Yeni konuşma başlatma:** 10 requests / 1 hour / user
- **Mesaj gönderme:** 30 requests / 1 minute / user

**İlave Kısıtlamalar:**
- Bir kullanıcı aynı ilana sadece **1 kez** konuşma başlatabilir
- Aynı iki kullanıcı arasında aynı ilan için birden fazla konuşma oluşturulamaz
- Kendine mesaj gönderme engellenir (backend check)

---

### Backend Validasyon

```python
# Örnek: Konuşma başlatma endpoint'inde
@router.post("/conversations")
def start_conversation(request: StartConversationRequest, ...):
    # 1. reference_id kontrolü (ilan var mı?)
    if request.type == "marketplace":
        listing = db.query(MarketplaceListing).filter(
            MarketplaceListing.id == request.reference_id,
            MarketplaceListing.status == 'active'
        ).first()
        if not listing:
            raise HTTPException(404, "İlan bulunamadı")
    
    elif request.type == "career":
        listing = db.query(CareerListing).filter(
            CareerListing.id == request.reference_id,
            CareerListing.status == 'active'
        ).first()
        if not listing:
            raise HTTPException(404, "İlan bulunamadı")
    
    # 2. Alıcı ilan sahibi mi?
    if request.receiver_id != listing.seller_id:  # veya creator_user_id
        raise HTTPException(403, "Bu kullanıcıya mesaj gönderemezsiniz")
    
    # 3. Konuşma oluştur
    conversation = ConversationService.get_or_create_conversation(...)
    ...
```

---

### Frontend Kısıtlamaları

**Mesaj gönderme sadece şu yerlerden:**
1. **Pazar İlan Detay Sayfası:** `/marketplace/{listing_id}`
   - "Satıcıya Mesaj Gönder" butonu
   
2. **Kariyer İlan Detay Sayfası:** `/career/{listing_id}`
   - "İlgileniyorum" butonu (sadece Startup/Proje için)

**Mesaj gönderilemez:**
- ❌ Kullanıcı profil sayfasından
- ❌ Forum kullanıcı kartından
- ❌ Arama sonuçlarından
- ❌ Header'dan kullanıcı arayarak

---

## 🔧 Teknik Detaylar

### Polling Mekanizması

**Header Badge (30 saniye):**
```typescript
// frontend/src/hooks/useMessages.ts

const fetchUnreadCount = async () => {
  const response = await api.get('/messages/conversations/unread-count');
  setUnreadCount(response.data.count);
};

useEffect(() => {
  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 30000); // 30 saniye
  return () => clearInterval(interval);
}, []);
```

**Chat Ekranı (10 saniye):**
```typescript
// frontend/src/pages/messages/ChatPage.tsx

const fetchMessages = async () => {
  const response = await api.get(`/messages/conversations/${conversationId}/messages`);
  setMessages(response.data.messages);
};

useEffect(() => {
  fetchMessages();
  const interval = setInterval(fetchMessages, 10000); // 10 saniye
  return () => clearInterval(interval);
}, [conversationId]);
```

---

### Konuşma Oluşturma Mantığı

**Pazar ilanında "Mesaj Gönder" butonuna basınca:**

1. Frontend: `POST /api/v1/messages/conversations`
   - `type: "marketplace"`
   - `reference_id: listing_id`
   - `receiver_id: seller_id`
   - `content: "İlk mesaj..."`

2. Backend:
   - `conversations` tablosunda bu konuşma var mı kontrol et
   - Yoksa oluştur
   - Mesajı ekle (`marketplace_messages`)
   - `conversation_id` döner

3. Frontend: `/dashboard/messages/{conversation_id}` sayfasına yönlendir

**Aynı mantık Kariyer ilanları için de geçerli.**

---

## 🎨 Frontend Routing

### URL Yapısı

```
/dashboard/messages                    → Konuşma listesi
/dashboard/messages/{conversation_id}  → Chat ekranı
```

### State Management

```typescript
const [conversations, setConversations] = useState<Conversation[]>([]);
const [messages, setMessages] = useState<Message[]>([]);
const [unreadCount, setUnreadCount] = useState(0);
```

---

## 🧪 Test Senaryoları

### Konuşma Başlatma

1. **Normal akış (Pazar):**
   - İlana gir, "Mesaj Gönder" butonu
   - İlk mesajı yaz
   - Konuşma oluşturulur
   - Chat ekranına yönlendirilir

2. **Mevcut konuşma (Pazar):**
   - Aynı ilana tekrar mesaj gönder
   - Yeni konuşma oluşturulmaz
   - Mevcut konuşmaya mesaj eklenir

3. **Kariyer mesajı:**
   - Kariyer ilanına başvur (DM ile)
   - Konuşma oluşturulur
   - Chat ekranına yönlendirilir

### Konuşma Listesi

1. **Karma liste:**
   - 2 Pazar konuşması + 1 Kariyer konuşması
   - Hepsi tek listede görünüyor
   - En yeni üstte

2. **Okunmamış sayısı:**
   - 2 okunmamış mesaj var
   - Header badge: 💬 (2)
   - Konuşma listesinde 🟢 işareti

3. **Tümünü Okundu İşaretle:**
   - Butona tıkla
   - Tüm 🟢 işaretleri ⚪ olur
   - Header badge kaybolur

### Chat Ekranı

1. **Mesaj gönderme:**
   - Textarea'ya yaz
   - "Gönder" butonu / Enter
   - Mesaj gönderilir
   - Sağ tarafa (mavi bubble) eklenir

2. **Yeni mesaj alma:**
   - Karşı taraf mesaj gönderir
   - 10 saniye sonra polling
   - Sol tarafa (beyaz bubble) eklenir
   - Otomatik scroll

3. **Okundu işareti:**
   - Karşı taraf mesajları okur
   - Senin mesajlarındaki ⚪ işareti aktif olur

### Polling

1. **Header badge:**
   - Yeni mesaj gelir
   - 30 saniye sonra badge güncellenir

2. **Chat ekranı:**
   - Chat ekranında mesajlaşıyorsun
   - Karşı taraf mesaj gönderir
   - 10 saniye sonra yeni mesaj görünür

---

## 📱 Responsive Tasarım

### Desktop (>1024px)
- Dropdown: 400px genişlik
- Konuşma listesi: Normal layout
- Chat ekranı: Bubble tasarım

### Tablet (768px - 1024px)
- Dropdown: 350px genişlik
- Konuşma listesi: Sidebar daraltılabilir

### Mobile (<768px)
- Dropdown: Full screen modal
- Konuşma listesi: Sidebar hamburger menü
- Chat ekranı: Full screen

---

## 🎯 Başarı Kriterleri

1. ✅ Pazar + Kariyer mesajları tek listede gösterilmeli
2. ✅ Header dropdown son 3 konuşmayı göstermeli
3. ✅ Okunmamış sayısı badge'de gösterilmeli
4. ✅ Konuşma listesi dashboard sidebar ile çalışmalı
5. ✅ Chat ekranı bubble tasarımda olmalı
6. ✅ "Daha Fazla Yükle" pagination çalışmalı
7. ✅ "Tümünü Okundu İşaretle" butonu çalışmalı
8. ✅ Polling (30 saniye header, 10 saniye chat) çalışmalı
9. ✅ Konuşma başlatma (Pazar/Kariyer) çalışmalı
10. ✅ Mobile responsive tasarım

---

## 🚀 Tahmini Geliştirme Süresi

**Toplam:** 5-6 gün

- **Backend (Database + API):** 2-3 gün
- **Frontend (Header Dropdown + Konuşma Listesi + Chat):** 2-3 gün
- **Entegrasyon (Pazar/Kariyer) + Test:** 1 gün

---

## 📝 Notlar ve Gelecek Geliştirmeler

### MVP Kapsamında:
- ✅ Tek merkezi mesajlaşma sistemi
- ✅ Pazar + Kariyer DM'leri birleşik
- ✅ Header dropdown
- ✅ Konuşma listesi
- ✅ Chat ekranı
- ✅ Polling (30 saniye / 10 saniye)

### MVP Sonrası:
- ⏳ WebSocket (gerçek zamanlı)
- ⏳ Dosya/Resim gönderme
- ⏳ Mesaj silme/düzenleme
- ⏳ Yazıyor... göstergesi
- ⏳ Mesaj arama
- ⏳ Konuşma arşivleme
- ⏳ Mesaj raporlama (spam, uygunsuz içerik)

### Teknik Borç:
- Eski mesajları temizleme (90 gün sonra)
- Admin panelinde mesaj moderasyonu
- Engelleme sistemi (kullanıcıyı engelle)

### ⚠️ MVP'de OLMAYACAKLAR:
- ❌ Kullanıcı profil sayfasından direkt mesaj gönderme
- ❌ Forum'dan direkt DM gönderme
- ❌ Rastgele kullanıcıya mesaj atma
- ❌ Grup mesajlaşması

---

**Versiyon:** 1.0  
**Son Güncelleme:** 2 Ocak 2026  
**Durum:** Spec Tamamlandı, Backend ve Frontend Development Bekliyor

