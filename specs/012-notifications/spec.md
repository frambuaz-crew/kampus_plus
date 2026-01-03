# 012 - Bildirimler Sistemi

## 📋 Genel Bakış

Platform içi bildirim sistemi. Kullanıcılar forum aktiviteleri, akademik katkıları ve pazar ilanlarıyla ilgili bildirimleri alır. Header'daki bildirim dropdown'ında son 3 bildirim gösterilir, tümü için ayrı sayfa vardır.

---

## 🎯 Amaç

- Kullanıcıları önemli olaylardan haberdar etmek
- Forum, akademik ve pazar aktivitelerini takip etmeyi kolaylaştırmak
- Bildirimler için merkezi bir görüntüleme alanı sağlamak

---

## 👥 Kullanıcı Rolleri

- **Öğrenci, Eğitmen:** Tüm bildirimleri alır
- **Admin:** Sistem bildirimleri gönderebilir (ileride)

---

## 🔔 Bildirim Tipleri (MVP)

### 1. 📌 Forum Konuma Cevap

**Tetiklenme:** Kullanıcının açtığı bir konuya yeni cevap geldiğinde

**Örnek:**
```
📌 Konuna cevap geldi
"Python ile web scraping nasıl yapılır?"
Mehmet Demir • 5 dakika önce
[Konuya Git]
```

**Aksiyon:** Konuya yönlendir (`/dashboard/forum/topic/{topic_id}`)

**Database Kaydı:**
```json
{
  "type": "forum_reply",
  "title": "Konuna cevap geldi",
  "message": "Python ile web scraping nasıl yapılır?",
  "actor": "Mehmet Demir",
  "actor_id": 123,
  "link": "/dashboard/forum/topic/456",
  "metadata": {
    "topic_id": 456,
    "reply_id": 789
  }
}
```

---

### 2. 📌 Forum Mention (@username)

**Tetiklenme:** Kullanıcı bir konuda veya cevapta mention edildiğinde

**Örnek:**
```
📌 Mention edildin
"@ali_yilmaz bu konuda senin fikrin nedir?"
Ayşe Kaya • 1 saat önce
[Konuya Git]
```

**Aksiyon:** Mention edildiği mesaja yönlendir (`/dashboard/forum/topic/{topic_id}?reply={reply_id}`)

**Database Kaydı:**
```json
{
  "type": "forum_mention",
  "title": "Mention edildin",
  "message": "@ali_yilmaz bu konuda senin fikrin nedir?",
  "actor": "Ayşe Kaya",
  "actor_id": 234,
  "link": "/dashboard/forum/topic/456?reply=790",
  "metadata": {
    "topic_id": 456,
    "reply_id": 790
  }
}
```

---

### 3. 📚 Akademik Katkı Onayı/Reddi

**Tetiklenme:** Admin kullanıcının akademik takvim/ders programı katkısını onaylar veya reddeder

**Örnek (Onay):**
```
✅ Katkın onaylandı
"Akademik Takvim - 2024-2025 Güz Dönemi"
Admin • 2 saat önce
[Takvimi Gör]
```

**Örnek (Red):**
```
❌ Katkın reddedildi
"Ders Programı - Bilgisayar Mühendisliği"
Sebep: Yanlış bilgiler içeriyor
Admin • 3 saat önce
[Detayları Gör]
```

**Aksiyon:** 
- Onay → Akademik takvim/ders programı sayfasına yönlendir
- Red → Bildirimler sayfasında red sebebini göster

**Database Kaydı:**
```json
{
  "type": "academic_contribution_approved",
  "title": "Katkın onaylandı",
  "message": "Akademik Takvim - 2024-2025 Güz Dönemi",
  "actor": "Admin",
  "actor_id": 1,
  "link": "/dashboard/academic-calendar",
  "metadata": {
    "contribution_id": 123,
    "contribution_type": "academic_calendar"
  }
}
```

---

### 4. 🛍️ İlan Süresi Dolacak

**Tetiklenme:** Pazar ilanının süresi dolmasına 3 gün kala (otomatik, cron job)

**Örnek:**
```
⏰ İlan süresi dolacak
"Laptop Satılık - Apple MacBook Pro M1"
3 gün içinde otomatik silinecek
[İlanı Gör] [Süreyi Uzat]
```

**Aksiyon:** 
- İlana yönlendir (`/dashboard/marketplace/listing/{listing_id}`)
- "Süreyi Uzat" butonu (opsiyonel, ilan yeniden yayınlanır)

**Database Kaydı:**
```json
{
  "type": "listing_expiring",
  "title": "İlan süresi dolacak",
  "message": "Laptop Satılık - Apple MacBook Pro M1",
  "link": "/dashboard/marketplace/listing/789",
  "metadata": {
    "listing_id": 789,
    "expires_at": "2026-01-05T23:59:59Z"
  }
}
```

---

## 🎨 Header Dropdown Tasarımı

### Görünüm

```
┌─ BİLDİRİMLER (2) ──────────────────────────────────┐
│                                                    │
│  🔴 Konuna cevap geldi                             │
│     "Python ile web scraping nasıl yapılır?"      │
│     Mehmet Demir • 5 dakika önce                   │
│                                                    │
│  🔴 Mention edildin                                │
│     "@ali_yilmaz bu konuda fikrin nedir?"         │
│     Ayşe Kaya • 1 saat önce                        │
│                                                    │
│  ⚪ Katkın onaylandı                               │
│     "Akademik Takvim - 2024-2025"                 │
│     Admin • 2 saat önce                            │
│                                                    │
│  ───────────────────────────────────────────────  │
│  [Tümünü Gör]                                      │
└────────────────────────────────────────────────────┘
```

### Özellikler

- **Son 3 bildirim** gösterilir (en yeni üstte)
- **Renk kodları:**
  - 🔴 Okunmamış
  - ⚪ Okunmuş
  - ✅ Pozitif (onay)
  - ❌ Negatif (red)
  - ⏰ Uyarı (süre dolacak)
- **Badge:** Header'daki bildirim ikonunda okunmamış sayısı (`🔔 (2)`)
- **"Tümünü Gör":** `/dashboard/notifications` sayfasına yönlendirir
- **Bildirime tıklama:** Bildirim sayfasına yönlendirir, o bildirim vurgulu gösterilir

### Dropdown Açılma

- **Hover değil, click ile açılır**
- **Dışarı tıklayınca kapanır**
- **Bildirim gelince badge güncellenir** (polling ile 30 saniyede bir kontrol)

---

## 📄 Bildirimler Sayfası

### URL

`/dashboard/notifications`

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  📚 KAMPÜS+    🔍 [Ara...]    🔔(2)  💬  👤 (AY) ▼       │
└───────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────────────────────────────┐
│  DASHBOARD      │   BİLDİRİMLER                           │
│  SIDEBAR        │                                         │
│  (sabit)        │   ┌─ Tüm Bildirimler (25) ───────────┐ │
│                 │   │                                   │ │
│ 🏠 Ana Sayfa    │   │  🔴 Konuna cevap geldi (VURGULU) │ │
│ 🤖 AI Asistanım │   │     "Python ile web scraping?"    │ │
│ 💬 Forum        │   │     Mehmet Demir                  │ │
│ 🛍️ Pazar        │   │     5 dakika önce                 │ │
│ 💼 Kariyer      │   │     [Konuya Git]                  │ │
│                 │   │                                   │ │
│ 📚 Akademik     │   │  🔴 Mention edildin               │ │
│ 📖 Ders Prog.   │   │     "@ali_yilmaz naber?"          │ │
│ 📅 Akd. Takvim  │   │     Ayşe Kaya                     │ │
│                 │   │     1 saat önce                   │ │
│                 │   │     [Konuya Git]                  │ │
│                 │   │                                   │ │
│                 │   │  ⚪ Katkın onaylandı              │ │
│                 │   │     "Akademik Takvim"             │ │
│                 │   │     Admin                         │ │
│                 │   │     2 saat önce                   │ │
│                 │   │     [Takvimi Gör]                 │ │
│                 │   │                                   │ │
│                 │   │  ⏰ İlan süresi dolacak           │ │
│                 │   │     "Laptop Satılık"              │ │
│                 │   │     3 gün içinde silinecek        │ │
│                 │   │     [İlanı Gör]                   │ │
│                 │   │                                   │ │
│                 │   │  ... (21 bildirim daha)           │ │
│                 │   │                                   │ │
│                 │   │  [📄 Daha Fazla Yükle]            │ │
│                 │   └───────────────────────────────────┘ │
└─────────────────┴─────────────────────────────────────────┘
```

### Özellikler

- **Dashboard sidebar sabit kalır** (normal dashboard gibi)
- **Main alan:** Bildirim listesi
- **Her bildirim:**
  - Icon/Renk (okundu/okunmadı)
  - Başlık
  - Mesaj (kısa özet)
  - Actor (kim tetikledi)
  - Zaman (5 dakika önce, 1 saat önce, dün, vb.)
  - Aksiyon butonu (Konuya Git, İlanı Gör, vb.)
- **Tıklanınca:** Bildirim "okundu" işaretlenir ve ilgili sayfaya yönlendirilir
- **Pagination:** "Daha Fazla Yükle" butonu (20 bildirim/sayfa)
- **Vurgulama:** Header'dan gelen bildirim sarı arka plan ile vurgulu gösterilir

### Header'dan Gelen Bildirim Vurgulama

**URL:** `/dashboard/notifications?highlight={notification_id}`

**Akış:**
1. Kullanıcı header dropdown'dan bir bildirime tıklar
2. `/dashboard/notifications?highlight=123` URL'ine yönlendirilir
3. ID'si 123 olan bildirim sarı arka plan ile vurgulanır
4. 3 saniye sonra vurgu kaybolur
5. Bildirim "okundu" işaretlenir

---

## 🗄️ Database Şeması

### Yeni Tablo: `notifications`

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    actor_id INTEGER REFERENCES users(id),
    link VARCHAR(500),
    metadata JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created_at (created_at)
);
```

**Alanlar:**
- `id`: Bildirim ID
- `user_id`: Bildirimi alan kullanıcı
- `type`: Bildirim tipi (`forum_reply`, `forum_mention`, `academic_contribution_approved`, `listing_expiring`)
- `title`: Bildirim başlığı
- `message`: Bildirim mesajı (kısa özet)
- `actor_id`: Bildirimi tetikleyen kullanıcı (NULL ise sistem)
- `link`: Yönlendirilecek URL
- `metadata`: Ekstra bilgiler (JSON)
- `is_read`: Okundu/Okunmadı
- `created_at`: Oluşturulma zamanı

---

## 🔌 API Endpoints

### Bildirim Listesi

#### `GET /api/v1/notifications`
Kullanıcının bildirimlerini listeler.

**Query Parameters:**
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başı bildirim sayısı (default: 20)
- `unread_only`: Sadece okunmamışlar (default: false)

**Response:**
```json
{
  "total": 25,
  "unread_count": 2,
  "page": 1,
  "limit": 20,
  "has_more": true,
  "notifications": [
    {
      "id": 123,
      "type": "forum_reply",
      "title": "Konuna cevap geldi",
      "message": "Python ile web scraping nasıl yapılır?",
      "actor": {
        "id": 456,
        "username": "mehmet_demir",
        "full_name": "Mehmet Demir"
      },
      "link": "/dashboard/forum/topic/789",
      "is_read": false,
      "created_at": "2026-01-02T10:55:00Z",
      "relative_time": "5 dakika önce"
    },
    {
      "id": 124,
      "type": "forum_mention",
      "title": "Mention edildin",
      "message": "@ali_yilmaz bu konuda fikrin nedir?",
      "actor": {
        "id": 457,
        "username": "ayse_kaya",
        "full_name": "Ayşe Kaya"
      },
      "link": "/dashboard/forum/topic/790?reply=1011",
      "is_read": false,
      "created_at": "2026-01-02T09:00:00Z",
      "relative_time": "1 saat önce"
    },
    {
      "id": 125,
      "type": "academic_contribution_approved",
      "title": "Katkın onaylandı",
      "message": "Akademik Takvim - 2024-2025 Güz Dönemi",
      "actor": {
        "id": 1,
        "username": "admin",
        "full_name": "Admin"
      },
      "link": "/dashboard/academic-calendar",
      "is_read": true,
      "created_at": "2026-01-02T08:00:00Z",
      "relative_time": "2 saat önce"
    }
  ]
}
```

---

### Bildirim Okundu İşaretle

#### `PATCH /api/v1/notifications/{notification_id}/read`
Bir bildirimi okundu olarak işaretler.

**Response:**
```json
{
  "success": true,
  "message": "Bildirim okundu olarak işaretlendi"
}
```

---

#### `PATCH /api/v1/notifications/read-all`
Tüm bildirimleri okundu olarak işaretler.

**Response:**
```json
{
  "success": true,
  "message": "Tüm bildirimler okundu olarak işaretlendi",
  "count": 5
}
```

---

### Okunmamış Bildirim Sayısı

#### `GET /api/v1/notifications/unread-count`
Okunmamış bildirim sayısını döner (header badge için).

**Response:**
```json
{
  "count": 2
}
```

---

## 🔧 Teknik Detaylar

### Bildirim Oluşturma

**Backend'de bildirim oluşturma helper fonksiyonu:**

```python
# backend/app/utils/notifications.py

from app.models.notification import Notification
from sqlalchemy.orm import Session

def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    link: str,
    actor_id: int = None,
    metadata: dict = None
):
    """
    Yeni bildirim oluşturur.
    """
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
        actor_id=actor_id,
        metadata=metadata
    )
    db.add(notification)
    db.commit()
    return notification

# Kullanım örneği (Forum cevap geldiğinde):
def on_forum_reply_created(topic, reply, db):
    """
    Yeni forum cevabı oluşturulduğunda konu sahibine bildirim gönder.
    """
    if topic.author_id != reply.author_id:  # Kendi cevabına bildirim gönderme
        create_notification(
            db=db,
            user_id=topic.author_id,
            type="forum_reply",
            title="Konuna cevap geldi",
            message=topic.title,
            link=f"/dashboard/forum/topic/{topic.id}",
            actor_id=reply.author_id,
            metadata={"topic_id": topic.id, "reply_id": reply.id}
        )
```

---

### Polling Mekanizması

**Frontend'de 30 saniyede bir okunmamış bildirim sayısını kontrol eder:**

```typescript
// frontend/src/hooks/useNotifications.ts

import { useEffect, useState } from 'react';
import api from '../utils/api';

export const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (err) {
      console.error('Bildirim sayısı alınamadı');
    }
  };
  
  useEffect(() => {
    fetchUnreadCount(); // İlk yükleme
    
    const interval = setInterval(() => {
      fetchUnreadCount(); // 30 saniyede bir
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return { unreadCount, refetch: fetchUnreadCount };
};
```

---

### Otomatik Bildirimler (Cron Jobs)

**İlan süresi dolacak bildirimi için cron job:**

```python
# backend/app/tasks/notifications.py

from app.models.marketplace import MarketplaceListing
from app.utils.notifications import create_notification
from datetime import datetime, timedelta

def send_listing_expiring_notifications(db):
    """
    Süresi dolmaya 3 gün kalan ilanlar için bildirim gönder.
    Her gün çalışır (cron job).
    """
    three_days_later = datetime.utcnow() + timedelta(days=3)
    
    # 57 gün önce oluşturulmuş aktif ilanları bul (60 gün - 3 gün)
    listings = db.query(MarketplaceListing).filter(
        MarketplaceListing.status == 'active',
        MarketplaceListing.created_at <= datetime.utcnow() - timedelta(days=57),
        MarketplaceListing.created_at > datetime.utcnow() - timedelta(days=58)
    ).all()
    
    for listing in listings:
        # Bu ilan için daha önce bildirim gönderilmiş mi kontrol et
        existing = db.query(Notification).filter(
            Notification.user_id == listing.seller_id,
            Notification.type == 'listing_expiring',
            Notification.metadata['listing_id'].astext == str(listing.id)
        ).first()
        
        if not existing:
            create_notification(
                db=db,
                user_id=listing.seller_id,
                type="listing_expiring",
                title="İlan süresi dolacak",
                message=f"{listing.title}",
                link=f"/dashboard/marketplace/listing/{listing.id}",
                metadata={"listing_id": listing.id, "expires_at": (listing.created_at + timedelta(days=60)).isoformat()}
            )
```

---

## 🎨 Frontend Routing

### URL Yapısı

```
/dashboard/notifications           → Tüm bildirimler
/dashboard/notifications?highlight={id} → Belirli bildirim vurgulu
```

### Header Component

```tsx
// frontend/src/components/Header.tsx

import { useNotifications } from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

const Header: React.FC = () => {
  const { unreadCount } = useNotifications();
  
  return (
    <header>
      {/* ... */}
      <NotificationDropdown unreadCount={unreadCount} />
      {/* ... */}
    </header>
  );
};
```

---

## 🧪 Test Senaryoları

### Forum Cevap Bildirimi

1. **Normal akış:**
   - Kullanıcı A bir konu açar
   - Kullanıcı B konuya cevap verir
   - Kullanıcı A bildirim alır: "Konuna cevap geldi"
   - Bildirime tıklayınca konuya yönlendirilir

2. **Kendi cevabı:**
   - Kullanıcı A kendi konusuna cevap verir
   - Bildirim **gönderilmez**

### Forum Mention Bildirimi

1. **Normal akış:**
   - Kullanıcı A, "@mehmet_demir naber?" yazar
   - Mehmet Demir bildirim alır: "Mention edildin"
   - Bildirime tıklayınca mesaja yönlendirilir

2. **Geçersiz mention:**
   - "@mehmet123" yazar (böyle kullanıcı yok)
   - Bildirim gönderilmez

### Akademik Katkı Bildirimi

1. **Onay:**
   - Admin katkıyı onaylar
   - Kullanıcı bildirim alır: "Katkın onaylandı ✅"
   - Bildirime tıklayınca akademik takvim sayfasına yönlendirilir

2. **Red:**
   - Admin katkıyı reddeder (sebep: "Yanlış bilgiler")
   - Kullanıcı bildirim alır: "Katkın reddedildi ❌"
   - Bildirimde red sebebi gösterilir

### İlan Süresi Dolacak

1. **Normal akış:**
   - İlan 57 gün önce oluşturulmuş
   - Cron job çalışır, bildirim gönderilir
   - Kullanıcı bildirim alır: "İlan süresi dolacak ⏰"
   - Bildirime tıklayınca ilana yönlendirilir

2. **Tekrar gönderme:**
   - Aynı ilan için 2. kez bildirim gönderilmez

### Polling

1. **Header badge güncellenmesi:**
   - Kullanıcı dashboard'da
   - 30 saniye sonra yeni bildirim gelir
   - Header badge otomatik güncellenir (🔔 → 🔔(1))

2. **Dropdown açıkken:**
   - Dropdown açık
   - Yeni bildirim gelir
   - Dropdown içeriği güncellenmez (sadece sayfa yenilenince)

---

## 📱 Responsive Tasarım

### Desktop (>1024px)
- Dropdown: 400px genişlik
- Bildirimler sayfası: Normal dashboard layout

### Tablet (768px - 1024px)
- Dropdown: 350px genişlik
- Bildirimler sayfası: Sidebar daraltılabilir

### Mobile (<768px)
- Dropdown: Full screen modal
- Bildirimler sayfası: Sidebar hamburger menü

---

## 🎯 Başarı Kriterleri

1. ✅ 4 bildirim tipi çalışmalı (Forum cevap, Mention, Akademik katkı, İlan süresi)
2. ✅ Header dropdown son 3 bildirimi göstermeli
3. ✅ Okunmamış sayısı badge'de gösterilmeli
4. ✅ Bildirimler sayfası dashboard sidebar ile çalışmalı
5. ✅ Bildirime tıklayınca okundu işaretlenmeli
6. ✅ "Daha Fazla Yükle" pagination çalışmalı
7. ✅ Polling 30 saniyede bir çalışmalı
8. ✅ Cron job ile otomatik bildirimler gönderilmeli
9. ✅ Mobile responsive tasarım

---

## 🚀 Tahmini Geliştirme Süresi

**Toplam:** 4-5 gün

- **Backend (Database + API + Helpers):** 2 gün
- **Frontend (Header Dropdown + Sayfa + Polling):** 2 gün
- **Cron Jobs + Test:** 0.5-1 gün

---

## 📝 Notlar ve Gelecek Geliştirmeler

### MVP Kapsamında:
- ✅ 4 bildirim tipi
- ✅ Header dropdown
- ✅ Bildirimler sayfası
- ✅ Polling (30 saniye)

### MVP Sonrası:
- ⏳ WebSocket (gerçek zamanlı)
- ⏳ Bildirim ayarları (hangi bildirimleri almak istiyorum)
- ⏳ Email bildirimleri
- ⏳ Push bildirimleri (mobil)
- ⏳ Daha fazla bildirim tipi (cevap beğeni, takip ettiğin konu, vb.)

### Teknik Borç:
- Eski bildirimleri temizleme (30 gün sonra)
- Bildirim geçmişi export
- Bildirim istatistikleri (admin paneli)

---

**Versiyon:** 1.0  
**Son Güncelleme:** 2 Ocak 2026  
**Durum:** Spec Tamamlandı, Backend ve Frontend Development Bekliyor

