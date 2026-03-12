# 012 - Bildirimler Sistemi - Implementation Tasks

## 📋 Genel Bakış

Platform içi bildirim sistemini implement etmek. 4 bildirim tipi (Forum cevap, Forum mention, Akademik katkı onayı/reddi, İlan süresi dolacak), header dropdown, bildirimler sayfası ve polling mekanizması.

---

## 🎯 Fazlar ve Tahmini Süreler

| Faz | Açıklama | Tahmini Süre |
|-----|----------|--------------|
| **Phase 1** | Database ve Backend Setup | 0.5 gün |
| **Phase 2** | Bildirim Oluşturma Helpers | 0.5 gün |
| **Phase 3** | API Endpoints | 1 gün |
| **Phase 4** | Cron Jobs (Otomatik Bildirimler) | 0.5 gün |
| **Phase 5** | Frontend Header Dropdown | 1 gün |
| **Phase 6** | Bildirimler Sayfası | 1 gün |
| **Phase 7** | Polling Mekanizması | 0.5 gün |
| **Phase 8** | Testing ve Bug Fixes | 0.5 gün |

**Toplam Tahmini Süre:** 4-5 gün

---

## Phase 1: Database ve Backend Setup (0.5 gün)

### Task 1.1: Database Migration - `notifications` Tablosu Oluştur
**Dosya:** `backend/alembic/versions/xxx_create_notifications.py`

**Yeni Tablo:**
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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

**Test:**
- Migration'ı çalıştır: `alembic upgrade head`
- Tablo oluşturulduğunu kontrol et
- Index'lerin oluşturulduğunu kontrol et

---

### Task 1.2: Pydantic Models - Bildirim Şemaları Oluştur
**Dosya:** `backend/app/schemas/notification.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Bildirim Response
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    actor: Optional[dict] = None  # {"id": 123, "username": "...", "full_name": "..."}
    link: str
    is_read: bool
    created_at: datetime
    relative_time: str  # "5 dakika önce"
    
    class Config:
        from_attributes = True

# Bildirim Listesi Response
class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    page: int
    limit: int
    has_more: bool
    notifications: list[NotificationResponse]

# Okunmamış Sayı Response
class UnreadCountResponse(BaseModel):
    count: int
```

---

### Task 1.3: SQLAlchemy Model - Notification Model
**Dosya:** `backend/app/models/notification.py`

```python
from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    link = Column(String(500))
    metadata = Column(JSON)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])
```

**Test:**
- Model import edilebiliyor mu kontrol et
- Database'e yansıyor mu kontrol et

---

## Phase 2: Bildirim Oluşturma Helpers (0.5 gün)

### Task 2.1: Bildirim Oluşturma Helper Fonksiyonu
**Dosya:** `backend/app/utils/notifications.py`

```python
from sqlalchemy.orm import Session
from app.models.notification import Notification
from typing import Optional

def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    link: str,
    actor_id: Optional[int] = None,
    metadata: Optional[dict] = None
) -> Notification:
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
    db.refresh(notification)
    return notification
```

---

### Task 2.2: Forum Cevap Bildirim Entegrasyonu
**Dosya:** `backend/app/routers/forum.py` (Güncelleme)

Forum cevabı oluşturulduğunda bildirim gönder:

```python
from app.utils.notifications import create_notification

# POST /api/v1/forum/topics/{topic_id}/replies endpoint'inde
@router.post("/topics/{topic_id}/replies")
def create_reply(topic_id: int, ...):
    # ... reply oluşturma kodu ...
    
    # Bildirim gönder (konu sahibine)
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
    
    return reply
```

**Test:**
- Konu aç, cevap ver
- Konu sahibi bildirim aldı mı kontrol et
- Kendi konuna cevap ver → Bildirim gitmemeli

---

### Task 2.3: Forum Mention Bildirim Entegrasyonu
**Dosya:** `backend/app/utils/mention_parser.py` (Yeni)

Mention'ları parse et ve bildirim gönder:

```python
import re
from sqlalchemy.orm import Session
from app.models.user import User
from app.utils.notifications import create_notification

def parse_and_notify_mentions(
    db: Session,
    content: str,
    topic_id: int,
    reply_id: int,
    author_id: int
):
    """
    İçerikteki @username mention'larını bulur ve bildirim gönderir.
    """
    # @username pattern'ini bul
    mentions = re.findall(r'@(\w+)', content)
    
    for username in mentions:
        # Kullanıcıyı bul
        user = db.query(User).filter(User.username == username).first()
        
        if user and user.id != author_id:  # Kendine mention bildirim gönderme
            create_notification(
                db=db,
                user_id=user.id,
                type="forum_mention",
                title="Mention edildin",
                message=content[:100] + "..." if len(content) > 100 else content,
                link=f"/dashboard/forum/topic/{topic_id}?reply={reply_id}",
                actor_id=author_id,
                metadata={"topic_id": topic_id, "reply_id": reply_id}
            )

# Forum cevabı oluşturulurken çağır
@router.post("/topics/{topic_id}/replies")
def create_reply(topic_id: int, ...):
    # ... reply oluşturma kodu ...
    
    # Mention'ları parse et ve bildirim gönder
    parse_and_notify_mentions(
        db=db,
        content=reply.content,
        topic_id=topic.id,
        reply_id=reply.id,
        author_id=current_user.id
    )
    
    return reply
```

**Test:**
- "@mehmet_demir naber?" yaz
- Mehmet Demir bildirim aldı mı kontrol et
- "@mehmet123" (yok) yaz → Bildirim gitmemeli

---

### Task 2.4: Akademik Katkı Bildirim Entegrasyonu
**Dosya:** `backend/app/routers/admin.py` (veya academic.py)

Admin katkıyı onaylar/reddeder:

```python
from app.utils.notifications import create_notification

# PATCH /api/v1/admin/academic-contributions/{id}/approve
@router.patch("/academic-contributions/{id}/approve")
def approve_contribution(id: int, ...):
    contribution = db.query(AcademicCalendarContribution).filter(...).first()
    contribution.status = "approved"
    db.commit()
    
    # Bildirim gönder
    create_notification(
        db=db,
        user_id=contribution.contributor_id,
        type="academic_contribution_approved",
        title="Katkın onaylandı",
        message=f"{contribution.title}",
        link="/dashboard/academic-calendar",
        actor_id=current_user.id,  # Admin
        metadata={"contribution_id": contribution.id, "contribution_type": "academic_calendar"}
    )
    
    return {"success": True}

# PATCH /api/v1/admin/academic-contributions/{id}/reject
@router.patch("/academic-contributions/{id}/reject")
def reject_contribution(id: int, reason: str, ...):
    contribution = db.query(AcademicCalendarContribution).filter(...).first()
    contribution.status = "rejected"
    db.commit()
    
    # Bildirim gönder
    create_notification(
        db=db,
        user_id=contribution.contributor_id,
        type="academic_contribution_rejected",
        title="Katkın reddedildi",
        message=f"{contribution.title}\nSebep: {reason}",
        link="/dashboard/notifications",  # Bildirimler sayfasında detay göster
        actor_id=current_user.id,
        metadata={"contribution_id": contribution.id, "reason": reason}
    )
    
    return {"success": True}
```

**Test:**
- Katkı gönder, admin onaylasın
- Bildirim geldi mi kontrol et
- Katkı reddedilsin (sebep ile)
- Red bildirimi geldi mi kontrol et

---

## Phase 3: API Endpoints (1 gün)

### Task 3.1: GET /api/v1/notifications - Bildirim Listesi
**Dosya:** `backend/app/routers/notifications.py`

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.utils.auth import get_current_user
from app.schemas.notification import NotificationListResponse
from datetime import datetime

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

def get_relative_time(dt: datetime) -> str:
    """
    Relative time string oluştur (5 dakika önce, 1 saat önce, vb.)
    """
    diff = datetime.utcnow() - dt
    
    if diff.seconds < 60:
        return "Az önce"
    elif diff.seconds < 3600:
        return f"{diff.seconds // 60} dakika önce"
    elif diff.seconds < 86400:
        return f"{diff.seconds // 3600} saat önce"
    elif diff.days == 1:
        return "Dün"
    elif diff.days < 7:
        return f"{diff.days} gün önce"
    else:
        return dt.strftime("%d.%m.%Y")

@router.get("/", response_model=NotificationListResponse)
def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcının bildirimlerini listeler.
    """
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    notifications = query.order_by(
        Notification.created_at.desc()
    ).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "limit": limit,
        "has_more": total > page * limit,
        "notifications": [
            {
                "id": notif.id,
                "type": notif.type,
                "title": notif.title,
                "message": notif.message,
                "actor": {
                    "id": notif.actor.id,
                    "username": notif.actor.username,
                    "full_name": f"{notif.actor.first_name} {notif.actor.last_name}"
                } if notif.actor else None,
                "link": notif.link,
                "is_read": notif.is_read,
                "created_at": notif.created_at.isoformat(),
                "relative_time": get_relative_time(notif.created_at)
            }
            for notif in notifications
        ]
    }
```

**Test:**
- İlk sayfa (20 bildirim)
- 2. sayfa
- Sadece okunmamışlar

---

### Task 3.2: GET /api/v1/notifications/unread-count - Okunmamış Sayı
**Dosya:** `backend/app/routers/notifications.py`

```python
from app.schemas.notification import UnreadCountResponse

@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Okunmamış bildirim sayısını döner (header badge için).
    """
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return {"count": count}
```

**Test:**
- Sayı doğru mu kontrol et
- Yeni bildirim gelince artıyor mu

---

### Task 3.3: PATCH /api/v1/notifications/{id}/read - Okundu İşaretle
**Dosya:** `backend/app/routers/notifications.py`

```python
@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bir bildirimi okundu olarak işaretler.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    notification.is_read = True
    db.commit()
    
    return {
        "success": True,
        "message": "Bildirim okundu olarak işaretlendi"
    }
```

**Test:**
- Bildirime tıklayınca okundu işaretleniyor mu
- Başka kullanıcının bildirimine erişim yok

---

### Task 3.4: PATCH /api/v1/notifications/read-all - Tümünü Okundu İşaretle
**Dosya:** `backend/app/routers/notifications.py`

```python
@router.patch("/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tüm bildirimleri okundu olarak işaretler.
    """
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    
    return {
        "success": True,
        "message": "Tüm bildirimler okundu olarak işaretlendi",
        "count": count
    }
```

**Test:**
- "Tümünü Okundu İşaretle" butonu çalışıyor mu
- Badge sıfırlanıyor mu

---

## Phase 4: Cron Jobs (Otomatik Bildirimler) (0.5 gün)

### Task 4.1: İlan Süresi Dolacak Cron Job
**Dosya:** `backend/app/tasks/notifications.py`

```python
from app.models.marketplace import MarketplaceListing
from app.models.notification import Notification
from app.utils.notifications import create_notification
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

def send_listing_expiring_notifications(db: Session):
    """
    Süresi dolmaya 3 gün kalan ilanlar için bildirim gönder.
    Her gün çalışır (cron job).
    """
    # 57 gün önce oluşturulmuş aktif ilanları bul (60 gün - 3 gün)
    fifty_seven_days_ago = datetime.utcnow() - timedelta(days=57)
    fifty_eight_days_ago = datetime.utcnow() - timedelta(days=58)
    
    listings = db.query(MarketplaceListing).filter(
        MarketplaceListing.status == 'active',
        MarketplaceListing.created_at >= fifty_eight_days_ago,
        MarketplaceListing.created_at < fifty_seven_days_ago
    ).all()
    
    for listing in listings:
        # Bu ilan için daha önce bildirim gönderilmiş mi kontrol et
        existing = db.query(Notification).filter(
            Notification.user_id == listing.seller_id,
            Notification.type == 'listing_expiring',
            Notification.metadata['listing_id'].astext == str(listing.id)
        ).first()
        
        if not existing:
            expires_at = listing.created_at + timedelta(days=60)
            
            create_notification(
                db=db,
                user_id=listing.seller_id,
                type="listing_expiring",
                title="İlan süresi dolacak",
                message=f"{listing.title}",
                link=f"/dashboard/marketplace/listing/{listing.id}",
                metadata={
                    "listing_id": listing.id,
                    "expires_at": expires_at.isoformat()
                }
            )
    
    print(f"İlan süresi dolacak bildirimleri gönderildi: {len(listings)} ilan")
```

---

### Task 4.2: Cron Job Scheduler Setup
**Dosya:** `backend/app/main.py` (veya ayrı bir scheduler.py)

```python
from apscheduler.schedulers.background import BackgroundScheduler
from app.tasks.notifications import send_listing_expiring_notifications
from app.database import SessionLocal

scheduler = BackgroundScheduler()

def scheduled_notification_job():
    db = SessionLocal()
    try:
        send_listing_expiring_notifications(db)
    finally:
        db.close()

# Her gün saat 09:00'da çalışsın
scheduler.add_job(scheduled_notification_job, 'cron', hour=9, minute=0)
scheduler.start()
```

**Dependency:**
```bash
pip install apscheduler
```

**Test:**
- Manuel çalıştır
- 57 gün önce ilan oluştur → Bildirim geldi mi

---

## Phase 5: Frontend Header Dropdown (1 gün)

### Task 5.1: Notifications Hook
**Dosya:** `frontend/src/hooks/useNotifications.ts`

```typescript
import { useEffect, useState } from 'react';
import api from '../utils/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  actor: {
    id: number;
    username: string;
    full_name: string;
  } | null;
  link: string;
  is_read: boolean;
  created_at: string;
  relative_time: string;
}

export const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (err) {
      console.error('Bildirim sayısı alınamadı');
    }
  };
  
  const fetchLatestNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications?limit=3');
      setNotifications(response.data.notifications);
    } catch (err) {
      console.error('Bildirimler alınamadı');
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (notificationId: number) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (err) {
      console.error('Bildirim okundu işaretlenemedi');
    }
  };
  
  useEffect(() => {
    fetchUnreadCount();
    
    // 30 saniyede bir polling
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    unreadCount,
    notifications,
    loading,
    fetchLatestNotifications,
    markAsRead,
    refetch: fetchUnreadCount
  };
};
```

---

### Task 5.2: NotificationDropdown Component
**Dosya:** `frontend/src/components/notifications/NotificationDropdown.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, notifications, loading, fetchLatestNotifications, markAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isOpen) {
      fetchLatestNotifications();
    }
  }, [isOpen]);
  
  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    navigate(`/dashboard/notifications?highlight=${notification.id}`);
    setIsOpen(false);
  };
  
  const getNotificationIcon = (type: string, is_read: boolean) => {
    if (is_read) return '⚪';
    
    switch (type) {
      case 'forum_reply':
      case 'forum_mention':
        return '🔴';
      case 'academic_contribution_approved':
        return '🟢';
      case 'academic_contribution_rejected':
        return '🔴';
      case 'listing_expiring':
        return '🟡';
      default:
        return '🔵';
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold">
              Bildirimler {unreadCount > 0 && `(${unreadCount})`}
            </h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Bildirim yok</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">{getNotificationIcon(notif.type, notif.is_read)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-sm text-gray-600 truncate">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {notif.actor?.full_name || 'Sistem'} • {notif.relative_time}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200">
            <Link
              to="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Tümünü Gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
```

---

### Task 5.3: Header Component'e Ekle
**Dosya:** `frontend/src/components/Header.tsx` (Güncelleme)

```tsx
import NotificationDropdown from './notifications/NotificationDropdown';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Logo */}
      <div className="text-xl font-bold">📚 KAMPÜS+</div>
      
      {/* Search */}
      <div className="flex-1 max-w-2xl mx-6">
        <input
          type="text"
          placeholder="Ara..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
        />
      </div>
      
      {/* Right Side */}
      <div className="flex items-center space-x-4">
        <NotificationDropdown />
        {/* Mesajlar Dropdown (sonra eklenecek) */}
        {/* Profil Dropdown */}
      </div>
    </header>
  );
};
```

**Test:**
- Dropdown açılıyor mu
- Son 3 bildirim gösteriliyor mu
- Badge sayısı doğru mu
- Bildirime tıklayınca sayfaya yönleniyor mu

---

## Phase 6: Bildirimler Sayfası (1 gün)

### Task 6.1: NotificationsPage Component
**Dosya:** `frontend/src/pages/notifications/NotificationsPage.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';

const NotificationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const fetchNotifications = async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await api.get(`/notifications?page=${pageNum}&limit=20`);
      
      if (pageNum === 1) {
        setNotifications(response.data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...response.data.notifications]);
      }
      
      setHasMore(response.data.has_more);
    } catch (err) {
      console.error('Bildirimler alınamadı');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchNotifications(1);
  }, []);
  
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
  };
  
  const handleNotificationClick = async (notification: any) => {
    // Okundu işaretle
    if (!notification.is_read) {
      await api.patch(`/notifications/${notification.id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
    }
    
    // Yönlendir
    window.location.href = notification.link;
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Tüm Bildirimler ({notifications.length})
      </h1>
      
      <div className="bg-white rounded-lg shadow">
        {notifications.length === 0 && !loading ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-4xl mb-4">🔔</p>
            <p>Henüz bildiriminiz yok</p>
          </div>
        ) : (
          <>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-6 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  highlightId === notif.id.toString() ? 'bg-yellow-50' : ''
                } ${notif.is_read ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  <span className="text-2xl">
                    {notif.is_read ? '⚪' : '🔴'}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{notif.title}</h3>
                    <p className="text-gray-700 mt-1">{notif.message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {notif.actor?.full_name || 'Sistem'} • {notif.relative_time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? '⏳ Yükleniyor...' : '📄 Daha Fazla Yükle'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
```

---

### Task 6.2: Routing Ekle
**Dosya:** `frontend/src/App.tsx` (Güncelleme)

```tsx
import NotificationsPage from './pages/notifications/NotificationsPage';

// Route ekle (Dashboard layout içinde)
<Route path="/dashboard/notifications" element={<NotificationsPage />} />
```

**Test:**
- Sayfa açılıyor mu
- Bildirimler listeleniyor mu
- "Daha Fazla Yükle" çalışıyor mu
- Highlight çalışıyor mu (URL'de ?highlight=123)

---

## Phase 7: Polling Mekanizması (0.5 gün)

### Task 7.1: useNotifications Hook'u Güncelle
**Dosya:** `frontend/src/hooks/useNotifications.ts` (Güncelleme)

(Task 5.1'de zaten polling var, burada test edeceğiz)

**Test:**
- 30 saniye bekle
- Badge güncelleniyor mu
- Network tab'de istekler görünüyor mu

---

## Phase 8: Testing ve Bug Fixes (0.5 gün)

### Test Senaryoları

1. **Forum cevap bildirimi:**
   - Konu aç, başka kullanıcı cevap versin
   - Bildirim geldi mi
   - Bildirime tıklayınca konuya gidiyor mu

2. **Forum mention:**
   - "@username" yaz
   - O kullanıcı bildirim aldı mı
   - Yanlış username → Bildirim gitmemeli

3. **Akademik katkı:**
   - Katkı gönder, admin onaylasın
   - Bildirim geldi mi
   - Red edilince sebep görünüyor mu

4. **İlan süresi:**
   - 57 gün önce ilan oluştur (test için manuel database edit)
   - Cron job çalıştır
   - Bildirim geldi mi

5. **Header dropdown:**
   - Son 3 bildirim görünüyor mu
   - Badge doğru mu
   - "Tümünü Gör" çalışıyor mu

6. **Bildirimler sayfası:**
   - Tüm bildirimler listeleniyor mu
   - Pagination çalışıyor mu
   - Highlight çalışıyor mu

7. **Polling:**
   - Yeni bildirim gelince badge güncelleniyor mu
   - 30 saniye aralıkla istek atılıyor mu

8. **Responsive:**
   - Mobile dropdown full screen modal mu
   - Bildirimler sayfası responsive mi

---

## ✅ Tamamlanma Kriterleri

- [ ] Database migration başarılı (notifications tablosu)
- [ ] 4 bildirim tipi çalışıyor (Forum cevap, Mention, Akademik, İlan)
- [ ] Header dropdown son 3 bildirimi gösteriyor
- [ ] Badge okunmamış sayısını gösteriyor
- [ ] Bildirimler sayfası çalışıyor
- [ ] Pagination ("Daha Fazla Yükle") çalışıyor
- [ ] Bildirime tıklayınca okundu işaretleniyor
- [ ] Highlight çalışıyor (URL'den gelen bildirim vurgulu)
- [ ] Polling 30 saniyede bir çalışıyor
- [ ] Cron job ile otomatik bildirimler gönderiliyor
- [ ] Mobile responsive tasarım

---

## 📦 Dependencies

### Backend
- `apscheduler` (cron jobs için)

```bash
pip install apscheduler
```

### Frontend
- Mevcut kütüphaneler yeterli (React, React Router, Axios)

---

**Tahmini Toplam Süre:** 4-5 gün  
**Son Güncelleme:** 2 Ocak 2026  
**Durum:** Tasks Hazır, Implementation Başlayabilir 🚀

