# 013 - Mesajlaşma Sistemi - Implementation Tasks

## 📋 Genel Bakış

Merkezi mesajlaşma sistemi için gerekli tüm backend ve frontend işleri. Pazar + Kariyer DM'lerini tek merkezde birleştirir.

---

## 🎯 Öncelik Sırası

1. **Phase 1:** Database Migration (conversations tablo)
2. **Phase 2:** Backend API (Endpoints)
3. **Phase 3:** Frontend - Header Dropdown
4. **Phase 4:** Frontend - Konuşma Listesi Sayfası
5. **Phase 5:** Frontend - Chat Ekranı
6. **Phase 6:** Pazar/Kariyer Entegrasyonu
7. **Phase 7:** Polling + Testing

---

## 📂 PHASE 1: Database Migration

### Task 1.1: `conversations` Tablosu Oluştur

**Dosya:** `backend/alembic/versions/xxx_create_conversations_table.py`

**SQL:**
```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('marketplace', 'career')),
    reference_id INTEGER NOT NULL,
    user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP DEFAULT NOW(),
    user1_unread_count INTEGER DEFAULT 0,
    user2_unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_conversation UNIQUE(type, reference_id, user1_id, user2_id)
);

CREATE INDEX idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_type_ref ON conversations(type, reference_id);
```

**Kontroller:**
- ✅ `type` sadece 'marketplace' veya 'career' olmalı
- ✅ Aynı iki kullanıcı aynı ilan için iki konuşma oluşturamamalı
- ✅ Index'ler performans için eklenmiş olmalı

---

### Task 1.2: `marketplace_messages` Tablosuna `conversation_id` Ekle

**Dosya:** `backend/alembic/versions/xxx_add_conversation_to_marketplace_messages.py`

**SQL:**
```sql
ALTER TABLE marketplace_messages 
ADD COLUMN conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE;

CREATE INDEX idx_marketplace_messages_conversation 
ON marketplace_messages(conversation_id);
```

**Kontroller:**
- ✅ Mevcut veriler korunmalı
- ✅ Yeni mesajlar `conversation_id` ile oluşturulmalı

---

### Task 1.3: `career_messages` Tablosuna `conversation_id` Ekle

**Dosya:** `backend/alembic/versions/xxx_add_conversation_to_career_messages.py`

**SQL:**
```sql
ALTER TABLE career_messages 
ADD COLUMN conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE;

CREATE INDEX idx_career_messages_conversation 
ON career_messages(conversation_id);
```

**Kontroller:**
- ✅ Mevcut veriler korunmalı
- ✅ Yeni mesajlar `conversation_id` ile oluşturulmalı

---

### Task 1.4: Test Migration

**Komut:**
```bash
# Migration oluştur
alembic revision --autogenerate -m "Add conversations table"

# Migration çalıştır
alembic upgrade head

# Test et
psql kampus_plus_db
\d conversations
\d marketplace_messages
\d career_messages
```

**Kontroller:**
- ✅ Migration hatasız çalışmalı
- ✅ Tablolar doğru oluşturulmalı
- ✅ Index'ler eklenmiş olmalı

---

## 🔌 PHASE 2: Backend API

### Task 2.1: Conversation Model

**Dosya:** `backend/app/models/conversation.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), nullable=False)
    reference_id = Column(Integer, nullable=False)
    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    user1_unread_count = Column(Integer, default=0)
    user2_unread_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('type', 'reference_id', 'user1_id', 'user2_id', name='unique_conversation'),
        CheckConstraint("type IN ('marketplace', 'career')", name='check_conversation_type'),
    )
```

**Kontroller:**
- ✅ Model database şemasına uygun
- ✅ Relationships doğru tanımlı
- ✅ Constraints eklenmiş

---

### Task 2.2: Conversation Schemas

**Dosya:** `backend/app/schemas/conversation.py`

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal

class ConversationUserInfo(BaseModel):
    id: int
    username: str
    full_name: str
    profile_picture_url: Optional[str]

class ConversationReferenceInfo(BaseModel):
    id: int
    title: str
    image_url: Optional[str] = None
    company_name: Optional[str] = None  # Sadece career için

class ConversationListItem(BaseModel):
    id: int
    type: Literal["marketplace", "career"]
    reference: ConversationReferenceInfo
    other_user: ConversationUserInfo
    last_message: str
    last_message_at: datetime
    relative_time: str
    unread_count: int

class ConversationListResponse(BaseModel):
    total: int
    total_unread: int
    page: int
    limit: int
    has_more: bool
    conversations: list[ConversationListItem]

class MessageSender(BaseModel):
    id: int
    username: str
    full_name: str

class MessageItem(BaseModel):
    id: int
    sender_id: int
    sender: MessageSender
    content: str
    is_read: bool
    created_at: datetime
    relative_time: str

class ConversationMessagesResponse(BaseModel):
    conversation: ConversationListItem
    total: int
    page: int
    limit: int
    has_more: bool
    messages: list[MessageItem]

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

class StartConversationRequest(BaseModel):
    type: Literal["marketplace", "career"]
    reference_id: int
    receiver_id: int
    content: str = Field(..., min_length=1, max_length=1000)

class UnreadCountResponse(BaseModel):
    count: int
```

**Kontroller:**
- ✅ Pydantic validation doğru
- ✅ API response'lara uygun
- ✅ `relative_time` helper fonksiyonu yazılmalı

---

### Task 2.3: Relative Time Helper

**Dosya:** `backend/app/utils/time_helpers.py`

```python
from datetime import datetime, timedelta
from typing import Optional

def get_relative_time(dt: datetime) -> str:
    """
    Türkçe göreceli zaman döner.
    Örnek: "5 dakika önce", "1 saat önce", "Dün", "3 gün önce"
    """
    now = datetime.utcnow()
    diff = now - dt
    
    if diff < timedelta(minutes=1):
        return "Şimdi"
    elif diff < timedelta(hours=1):
        minutes = int(diff.total_seconds() / 60)
        return f"{minutes} dakika önce"
    elif diff < timedelta(days=1):
        hours = int(diff.total_seconds() / 3600)
        return f"{hours} saat önce"
    elif diff < timedelta(days=2):
        return "Dün"
    elif diff < timedelta(days=7):
        days = diff.days
        return f"{days} gün önce"
    else:
        return dt.strftime("%d.%m.%Y")
```

**Kontroller:**
- ✅ Türkçe çıktı
- ✅ Test edilmiş

---

### Task 2.4: Conversation Service

**Dosya:** `backend/app/services/conversation_service.py`

```python
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from ..models.conversation import Conversation
from ..models.marketplace import MarketplaceMessage
from ..models.career import CareerMessage
from ..models.user import User
from typing import Optional, List, Tuple
from datetime import datetime

class ConversationService:
    
    @staticmethod
    def get_or_create_conversation(
        db: Session,
        type: str,
        reference_id: int,
        user1_id: int,
        user2_id: int
    ) -> Conversation:
        """
        Konuşma var mı kontrol et, yoksa oluştur.
        user1_id ve user2_id sırasını normalize et (küçük olan user1).
        """
        # ID sırasını normalize et
        if user1_id > user2_id:
            user1_id, user2_id = user2_id, user1_id
        
        # Mevcut konuşmayı ara
        conversation = db.query(Conversation).filter(
            Conversation.type == type,
            Conversation.reference_id == reference_id,
            Conversation.user1_id == user1_id,
            Conversation.user2_id == user2_id
        ).first()
        
        # Yoksa oluştur
        if not conversation:
            conversation = Conversation(
                type=type,
                reference_id=reference_id,
                user1_id=user1_id,
                user2_id=user2_id
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
        
        return conversation
    
    @staticmethod
    def get_user_conversations(
        db: Session,
        user_id: int,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Conversation], int, int]:
        """
        Kullanıcının tüm konuşmalarını getir (Pazar + Kariyer).
        """
        query = db.query(Conversation).filter(
            or_(
                Conversation.user1_id == user_id,
                Conversation.user2_id == user_id
            )
        ).order_by(desc(Conversation.last_message_at))
        
        total = query.count()
        
        # Okunmamış toplam
        total_unread = 0
        for conv in query.all():
            if conv.user1_id == user_id:
                total_unread += conv.user1_unread_count
            else:
                total_unread += conv.user2_unread_count
        
        # Pagination
        offset = (page - 1) * limit
        conversations = query.offset(offset).limit(limit).all()
        
        return conversations, total, total_unread
    
    @staticmethod
    def get_conversation_messages(
        db: Session,
        conversation_id: int,
        page: int = 1,
        limit: int = 50
    ) -> Tuple[List, int]:
        """
        Konuşmadaki mesajları getir.
        """
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            return [], 0
        
        # Type'a göre mesajları çek
        if conversation.type == "marketplace":
            query = db.query(MarketplaceMessage).filter(
                MarketplaceMessage.conversation_id == conversation_id
            ).order_by(MarketplaceMessage.created_at)
        else:  # career
            query = db.query(CareerMessage).filter(
                CareerMessage.conversation_id == conversation_id
            ).order_by(CareerMessage.created_at)
        
        total = query.count()
        
        # Pagination
        offset = (page - 1) * limit
        messages = query.offset(offset).limit(limit).all()
        
        return messages, total
    
    @staticmethod
    def mark_conversation_as_read(
        db: Session,
        conversation_id: int,
        user_id: int
    ):
        """
        Konuşmadaki mesajları okundu işaretle.
        """
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            return
        
        # Hangi kullanıcının unread count'unu sıfırla
        if conversation.user1_id == user_id:
            conversation.user1_unread_count = 0
        elif conversation.user2_id == user_id:
            conversation.user2_unread_count = 0
        
        # Mesajları okundu işaretle
        if conversation.type == "marketplace":
            db.query(MarketplaceMessage).filter(
                MarketplaceMessage.conversation_id == conversation_id,
                MarketplaceMessage.sender_id != user_id
            ).update({"is_read": True})
        else:  # career
            db.query(CareerMessage).filter(
                CareerMessage.conversation_id == conversation_id,
                CareerMessage.sender_id != user_id
            ).update({"is_read": True})
        
        db.commit()
    
    @staticmethod
    def mark_all_as_read(db: Session, user_id: int):
        """
        Tüm konuşmaları okundu işaretle.
        """
        # User1 olan konuşmalarda user1_unread_count sıfırla
        db.query(Conversation).filter(
            Conversation.user1_id == user_id
        ).update({"user1_unread_count": 0})
        
        # User2 olan konuşmalarda user2_unread_count sıfırla
        db.query(Conversation).filter(
            Conversation.user2_id == user_id
        ).update({"user2_unread_count": 0})
        
        # Mesajları okundu işaretle
        db.query(MarketplaceMessage).filter(
            MarketplaceMessage.receiver_id == user_id
        ).update({"is_read": True})
        
        db.query(CareerMessage).filter(
            CareerMessage.receiver_id == user_id
        ).update({"is_read": True})
        
        db.commit()
```

**Kontroller:**
- ✅ User ID normalize edilmeli (küçük olan user1)
- ✅ Konuşma oluşturma idempotent olmalı
- ✅ Pagination doğru çalışmalı
- ✅ Okundu işaretleme doğru olmalı

---

### Task 2.5: API Endpoints

**Dosya:** `backend/app/api/v1/endpoints/messages.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....auth import get_current_user
from ....models.user import User
from ....schemas.conversation import (
    ConversationListResponse,
    ConversationMessagesResponse,
    SendMessageRequest,
    StartConversationRequest,
    UnreadCountResponse
)
from ....services.conversation_service import ConversationService
from ....utils.time_helpers import get_relative_time

router = APIRouter()

@router.get("/conversations", response_model=ConversationListResponse)
def get_conversations(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcının tüm konuşmalarını listele (Pazar + Kariyer birleşik).
    """
    conversations, total, total_unread = ConversationService.get_user_conversations(
        db, current_user.id, page, limit
    )
    
    # Format response
    # TODO: Her konuşma için reference bilgilerini çek
    # TODO: Karşı taraf bilgilerini çek
    # TODO: Son mesajı getir
    
    return {
        "total": total,
        "total_unread": total_unread,
        "page": page,
        "limit": limit,
        "has_more": total > page * limit,
        "conversations": []  # TODO: Format et
    }

@router.get("/conversations/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Okunmamış mesaj sayısını döner (header badge için).
    """
    _, _, total_unread = ConversationService.get_user_conversations(
        db, current_user.id, page=1, limit=1
    )
    
    return {"count": total_unread}

@router.get("/conversations/{conversation_id}/messages", response_model=ConversationMessagesResponse)
def get_conversation_messages(
    conversation_id: int,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Belirli konuşmanın mesajlarını getir.
    """
    # Konuşmayı kontrol et
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    # Kullanıcı bu konuşmanın sahibi mi?
    if conversation.user1_id != current_user.id and conversation.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu konuşmaya erişim yetkiniz yok")
    
    # Mesajları getir
    messages, total = ConversationService.get_conversation_messages(
        db, conversation_id, page, limit
    )
    
    # Okundu işaretle (otomatik)
    ConversationService.mark_conversation_as_read(db, conversation_id, current_user.id)
    
    # TODO: Format response
    
    return {}

@router.post("/conversations", status_code=status.HTTP_201_CREATED)
@rate_limit(max_attempts=10, window_seconds=3600)  # 10 konuşma / 1 saat
def start_conversation(
    request: StartConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Yeni konuşma başlat (ilk mesaj gönder).
    
    GÜVENLİK: Sadece ilan üzerinden mesajlaşma başlatılabilir!
    """
    # 1. Alıcı var mı?
    receiver = db.query(User).filter(User.id == request.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # 2. Kendine mesaj göndermeyi engelle
    if current_user.id == request.receiver_id:
        raise HTTPException(status_code=400, detail="Kendinize mesaj gönderemezsiniz")
    
    # 3. İlan var mı ve aktif mi? (GÜVENLİK KONTROLÜ)
    if request.type == "marketplace":
        from app.models.marketplace import MarketplaceListing
        listing = db.query(MarketplaceListing).filter(
            MarketplaceListing.id == request.reference_id,
            MarketplaceListing.status == 'active'
        ).first()
        
        if not listing:
            raise HTTPException(status_code=404, detail="İlan bulunamadı veya aktif değil")
        
        # Alıcı ilan sahibi mi kontrol et
        if request.receiver_id != listing.seller_user_id:
            raise HTTPException(
                status_code=403, 
                detail="Bu ilana sadece ilan sahibiyle mesajlaşabilirsiniz"
            )
    
    elif request.type == "career":
        from app.models.career import CareerListing
        listing = db.query(CareerListing).filter(
            CareerListing.id == request.reference_id,
            CareerListing.status == 'active'
        ).first()
        
        if not listing:
            raise HTTPException(status_code=404, detail="İlan bulunamadı veya aktif değil")
        
        # Alıcı ilan sahibi mi kontrol et
        if request.receiver_id != listing.creator_user_id:
            raise HTTPException(
                status_code=403, 
                detail="Bu ilana sadece ilan sahibiyle mesajlaşabilirsiniz"
            )
        
        # Sadece startup/proje ilanlarına DM gönderilebilir
        if listing.listing_type not in ['startup', 'project']:
            raise HTTPException(
                status_code=400,
                detail="İş/Staj ilanlarına platform üzerinden mesaj gönderilemez"
            )
    
    # 4. Konuşmayı oluştur veya getir
    conversation = ConversationService.get_or_create_conversation(
        db,
        type=request.type,
        reference_id=request.reference_id,
        user1_id=current_user.id,
        user2_id=request.receiver_id
    )
    
    # 5. İlk mesajı ekle
    if request.type == "marketplace":
        from app.models.marketplace import MarketplaceMessage
        new_message = MarketplaceMessage(
            conversation_id=conversation.id,
            sender_id=current_user.id,
            receiver_id=request.receiver_id,
            content=request.content
        )
    else:  # career
        from app.models.career import CareerMessage
        new_message = CareerMessage(
            conversation_id=conversation.id,
            sender_id=current_user.id,
            receiver_id=request.receiver_id,
            content=request.content
        )
    
    db.add(new_message)
    
    # 6. Unread count artır
    if conversation.user1_id == request.receiver_id:
        conversation.user1_unread_count += 1
    else:
        conversation.user2_unread_count += 1
    
    # 7. last_message_at güncelle
    conversation.last_message_at = datetime.utcnow()
    
    db.commit()
    db.refresh(new_message)
    
    return {
        "success": True,
        "conversation_id": conversation.id,
        "message_id": new_message.id
    }

@router.post("/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mevcut konuşmaya mesaj gönder.
    """
    # Konuşmayı kontrol et
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    # Kullanıcı bu konuşmanın sahibi mi?
    if conversation.user1_id != current_user.id and conversation.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu konuşmaya erişim yetkiniz yok")
    
    # Mesajı ekle
    # TODO: Mesaj gönderme
    
    # Unread count artır
    # TODO
    
    # last_message_at güncelle
    conversation.last_message_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "message": {}  # TODO
    }

@router.patch("/conversations/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Konuşmadaki tüm mesajları okundu işaretle.
    """
    ConversationService.mark_conversation_as_read(db, conversation_id, current_user.id)
    
    return {
        "success": True,
        "message": "Tüm mesajlar okundu olarak işaretlendi"
    }

@router.patch("/conversations/read-all")
def mark_all_conversations_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tüm konuşmaları okundu işaretle.
    """
    ConversationService.mark_all_as_read(db, current_user.id)
    
    return {
        "success": True,
        "message": "Tüm konuşmalar okundu olarak işaretlendi"
    }
```

**Kontroller:**
- ✅ Authentication middleware
- ✅ Authorization kontrolleri
- ✅ Error handling
- ✅ TODO'lar tamamlanmalı (reference bilgileri, mesaj gönderme)

---

### Task 2.6: Router'a Kaydet

**Dosya:** `backend/app/api/v1/api.py`

```python
from .endpoints import messages

api_router.include_router(
    messages.router,
    prefix="/messages",
    tags=["messages"]
)
```

---

### Task 2.7: Rate Limiting ve Güvenlik Kontrolleri

**Dosya:** `backend/app/api/v1/endpoints/messages.py` (güncelle)

**Rate Limits:**
- `POST /conversations`: 10 requests / 1 hour / user (spam önleme)
- `POST /conversations/{id}/messages`: 30 requests / 1 minute / user

**Güvenlik Kontrolleri:**
1. ✅ Sadece ilan üzerinden mesajlaşma başlatılabilir
2. ✅ Alıcı ilan sahibi olmalı (başkasına mesaj gönderilemez)
3. ✅ İlan aktif olmalı
4. ✅ Kendine mesaj gönderilemez
5. ✅ Kariyer: Sadece startup/proje ilanlarına DM gönderilebilir

```python
from ....middleware.rate_limiter import rate_limit

@router.post("/conversations", status_code=status.HTTP_201_CREATED)
@rate_limit(max_attempts=10, window_seconds=3600)
def start_conversation(...):
    # Güvenlik kontrolleri yukarıda detaylı açıklandı
    ...

@router.post("/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
@rate_limit(max_attempts=30, window_seconds=60)
def send_message(...):
    ...
```

**Test Senaryoları:**
- ❌ Rastgele kullanıcıya mesaj gönderme → 403 Forbidden
- ❌ Olmayan ilana mesaj → 404 Not Found
- ❌ Pasif ilana mesaj → 404 Not Found
- ❌ İlan sahibi olmayan birine mesaj → 403 Forbidden
- ❌ Kendine mesaj → 400 Bad Request
- ❌ İş/Staj ilanına DM → 400 Bad Request (kariyer için)
- ✅ Geçerli ilan + ilan sahibi → 201 Created

---

## 🎨 PHASE 3: Frontend - Header Dropdown

### Task 3.1: Messages Context

**Dosya:** `frontend/src/contexts/MessagesContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface MessagesContextType {
  unreadCount: number;
  refreshUnreadCount: () => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/messages/conversations/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30 saniye
    return () => clearInterval(interval);
  }, []);

  return (
    <MessagesContext.Provider value={{ unreadCount, refreshUnreadCount: fetchUnreadCount }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useMessages must be used within MessagesProvider');
  return context;
};
```

---

### Task 3.2: Messages Dropdown Component

**Dosya:** `frontend/src/components/dashboard/header/MessagesDropdown.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMessages } from '../../../contexts/MessagesContext';
import { api } from '../../../services/api';

interface Conversation {
  id: number;
  type: 'marketplace' | 'career';
  reference: {
    title: string;
  };
  other_user: {
    username: string;
    full_name: string;
    profile_picture_url: string | null;
  };
  last_message: string;
  relative_time: string;
  unread_count: number;
}

export const MessagesDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { unreadCount } = useMessages();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchRecentConversations = async () => {
    try {
      const response = await api.get('/messages/conversations?limit=3');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecentConversations();
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

  const getSourceIcon = (type: string) => {
    return type === 'marketplace' ? '📦' : '💼';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg"
      >
        <span className="text-2xl">💬</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold">
              MESAJLAR {unreadCount > 0 && `(${unreadCount})`}
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Henüz mesajınız yok
              </div>
            ) : (
              conversations.map((conv) => (
                <Link
                  key={conv.id}
                  to={`/dashboard/messages/${conv.id}`}
                  className="block p-4 hover:bg-gray-50 border-b"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-start gap-3">
                    {/* Profil resmi / Baş harfler */}
                    {conv.other_user.profile_picture_url ? (
                      <img
                        src={conv.other_user.profile_picture_url}
                        alt={conv.other_user.full_name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                        {getInitials(conv.other_user.full_name)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {conv.unread_count > 0 && <span className="text-green-500">🟢</span>}
                        <span className="font-medium">{conv.other_user.full_name}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {getSourceIcon(conv.type)} {conv.type === 'marketplace' ? 'Pazar' : 'Kariyer'}: {conv.reference.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        "{conv.last_message}"
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {conv.relative_time}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="p-2 border-t">
            <Link
              to="/dashboard/messages"
              className="block text-center text-blue-600 hover:underline py-2"
              onClick={() => setIsOpen(false)}
            >
              Tüm Mesajları Gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Kontroller:**
- ✅ Badge unread count göstermeli
- ✅ Son 3 konuşma gösterilmeli
- ✅ Dışarı tıklayınca kapanmalı
- ✅ "Tüm Mesajları Gör" link çalışmalı

---

### Task 3.3: Header'a Ekle

**Dosya:** `frontend/src/components/dashboard/DashboardHeader.tsx`

```typescript
import { MessagesDropdown } from './header/MessagesDropdown';

// Header içinde:
<div className="flex items-center gap-4">
  <NotificationsDropdown />
  <MessagesDropdown />  {/* Yeni eklenen */}
  <ProfileDropdown />
</div>
```

---

## 📄 PHASE 4: Frontend - Konuşma Listesi Sayfası

### Task 4.1: Conversations Page

**Dosya:** `frontend/src/pages/messages/ConversationsPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';

interface Conversation {
  id: number;
  type: 'marketplace' | 'career';
  reference: {
    title: string;
  };
  other_user: {
    username: string;
    full_name: string;
    profile_picture_url: string | null;
  };
  last_message: string;
  relative_time: string;
  unread_count: number;
}

export const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const response = await api.get(`/messages/conversations?page=${pageNum}&limit=20`);
      if (pageNum === 1) {
        setConversations(response.data.conversations);
      } else {
        setConversations((prev) => [...prev, ...response.data.conversations]);
      }
      setTotalUnread(response.data.total_unread);
      setHasMore(response.data.has_more);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/messages/conversations/read-all');
      setTotalUnread(0);
      setConversations((prev) =>
        prev.map((conv) => ({ ...conv, unread_count: 0 }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchConversations(nextPage);
  };

  const getSourceIcon = (type: string) => {
    return type === 'marketplace' ? '📦' : '💼';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            MESAJLARIM {totalUnread > 0 && `(${totalUnread} okunmamış)`}
          </h1>
          {totalUnread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Tümünü Okundu İşaretle
            </button>
          )}
        </div>

        {conversations.length === 0 && !loading ? (
          <div className="text-center py-12 text-gray-500">
            Henüz mesajınız yok
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/dashboard/messages/${conv.id}`}
                className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition border"
              >
                <div className="flex items-start gap-4">
                  {/* Profil resmi / Baş harfler */}
                  {conv.other_user.profile_picture_url ? (
                    <img
                      src={conv.other_user.profile_picture_url}
                      alt={conv.other_user.full_name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg">
                      {getInitials(conv.other_user.full_name)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {conv.unread_count > 0 && <span className="text-green-500">🟢</span>}
                      <span className="font-semibold">{conv.other_user.full_name}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {getSourceIcon(conv.type)} {conv.type === 'marketplace' ? 'Pazar' : 'Kariyer'}: {conv.reference.title}
                    </p>
                    <p className="text-sm text-gray-700 mt-1 truncate">
                      "{conv.last_message}"
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {conv.relative_time}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              {loading ? 'Yükleniyor...' : '📄 Daha Fazla Yükle'}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
```

**Kontroller:**
- ✅ Dashboard sidebar gözükmeli
- ✅ "Tümünü Okundu İşaretle" butonu çalışmalı
- ✅ Pagination "Daha Fazla Yükle" ile çalışmalı
- ✅ Her konuşma kartı tıklanabilir olmalı

---

## 💬 PHASE 5: Frontend - Chat Ekranı

### Task 5.1: Chat Page

**Dosya:** `frontend/src/pages/messages/ChatPage.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';

interface Message {
  id: number;
  sender_id: number;
  sender: {
    full_name: string;
  };
  content: string;
  is_read: boolean;
  relative_time: string;
}

interface Conversation {
  id: number;
  type: 'marketplace' | 'career';
  reference: {
    title: string;
  };
  other_user: {
    full_name: string;
  };
}

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}/messages`);
      setConversation(response.data.conversation);
      setMessages(response.data.messages);
      
      // Current user ID'yi al (ilk mesajdan)
      // TODO: Auth context'ten alınabilir
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  };

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 10000); // 10 saniye
    return () => clearInterval(interval);
  }, [conversationId]);

  // Otomatik scroll en alta
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await api.post(`/messages/conversations/${conversationId}/messages`, {
        content: newMessage,
      });
      setNewMessage('');
      fetchConversation(); // Mesajları yenile
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation) {
    return (
      <DashboardLayout>
        <div className="p-6">Yükleniyor...</div>
      </DashboardLayout>
    );
  }

  const getSourceIcon = (type: string) => {
    return type === 'marketplace' ? '📦' : '💼';
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Üst Bar */}
        <div className="p-4 border-b bg-white">
          <button
            onClick={() => navigate('/dashboard/messages')}
            className="text-blue-600 hover:underline mb-2"
          >
            ← Geri
          </button>
          <h2 className="text-xl font-semibold">{conversation.other_user.full_name}</h2>
          <p className="text-sm text-gray-600">
            {getSourceIcon(conversation.type)} {conversation.type === 'marketplace' ? 'Pazar' : 'Kariyer'}: {conversation.reference.title}
          </p>
        </div>

        {/* Mesaj Alanı */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.map((msg) => {
            const isOwnMessage = msg.sender_id === currentUserId;

            return (
              <div
                key={msg.id}
                className={`mb-4 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md p-3 rounded-lg ${
                    isOwnMessage ? 'bg-blue-500 text-white' : 'bg-white'
                  }`}
                >
                  <p>{msg.content}</p>
                  <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                    <span>{isOwnMessage ? 'Sen' : msg.sender.full_name} • {msg.relative_time}</span>
                    {isOwnMessage && msg.is_read && <span>⚪</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Alt Bar (Mesaj Gönderme) */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesajını yaz..."
              className="flex-1 p-2 border rounded-lg resize-none"
              rows={2}
              maxLength={1000}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Gönder
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {newMessage.length}/1000
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};
```

**Kontroller:**
- ✅ Bubble tasarım (sol/sağ)
- ✅ Otomatik scroll en alta
- ✅ Polling 10 saniyede bir
- ✅ Enter ile mesaj gönderme
- ✅ Karakter sayacı

---

## 🔗 PHASE 6: Pazar/Kariyer Entegrasyonu

### Task 6.1: Pazar - "Mesaj Gönder" Butonu

**Dosya:** `specs/007-marketplace/spec.md` güncelle

**Eski (Yanlış):**
```markdown
### Mesajlaşma
- Alıcı-Satıcı DM sistemi
- URL: `/dashboard/marketplace/messages/{listing_id}`
```

**Yeni (Doğru):**
```markdown
### Mesajlaşma
- Alıcı-Satıcı DM sistemi
- "Mesaj Gönder" butonu → Yeni konuşma başlatır
- API: `POST /api/v1/messages/conversations`
  - `type: "marketplace"`
  - `reference_id: listing_id`
  - `receiver_id: seller_id`
- Konuşma oluşturulduktan sonra `/dashboard/messages/{conversation_id}` sayfasına yönlenir
```

---

### Task 6.2: Pazar - Frontend Entegrasyonu

**Dosya:** `frontend/src/pages/marketplace/ListingDetailPage.tsx`

```typescript
const handleSendMessage = async () => {
  try {
    const response = await api.post('/messages/conversations', {
      type: 'marketplace',
      reference_id: listingId,
      receiver_id: listing.seller_id,
      content: 'Merhaba, ürün hakkında bilgi alabilir miyim?',
    });
    navigate(`/dashboard/messages/${response.data.conversation_id}`);
  } catch (error) {
    console.error('Failed to start conversation:', error);
  }
};

// UI'da:
<button onClick={handleSendMessage} className="...">
  Mesaj Gönder
</button>
```

---

### Task 6.3: Kariyer - "Başvur (DM)" Butonu

**Dosya:** `specs/008-career-page/spec.md` güncelle

**Eski (Yanlış):**
```markdown
### Başvuru Yöntemi (Startup/Proje)
- DM ile başvuru
- URL: `/dashboard/career/messages/{listing_id}`
```

**Yeni (Doğru):**
```markdown
### Başvuru Yöntemi (Startup/Proje)
- "Başvur (DM)" butonu → Yeni konuşma başlatır
- API: `POST /api/v1/messages/conversations`
  - `type: "career"`
  - `reference_id: listing_id`
  - `receiver_id: poster_id`
- Konuşma oluşturulduktan sonra `/dashboard/messages/{conversation_id}` sayfasına yönlenir
```

---

### Task 6.4: Kariyer - Frontend Entegrasyonu

**Dosya:** `frontend/src/pages/career/CareerDetailPage.tsx`

```typescript
const handleApplyDM = async () => {
  try {
    const response = await api.post('/messages/conversations', {
      type: 'career',
      reference_id: listingId,
      receiver_id: listing.user_id,
      content: 'Merhaba, ilan hakkında detaylı bilgi alabilir miyim?',
    });
    navigate(`/dashboard/messages/${response.data.conversation_id}`);
  } catch (error) {
    console.error('Failed to start conversation:', error);
  }
};

// UI'da:
<button onClick={handleApplyDM} className="...">
  Başvur (DM)
</button>
```

---

### Task 6.5: Eski Specs'leri Güncelle

**Güncellenecek dosyalar:**
1. `specs/007-marketplace/spec.md` → Mesajlaşma bölümü
2. `specs/007-marketplace/tasks.md` → DM sistemi taskları
3. `specs/008-career-page/spec.md` → Başvuru bölümü
4. `specs/008-career-page/tasks.md` → DM sistemi taskları

**Değişiklikler:**
- ❌ Kaldır: Ayrı mesajlaşma sayfaları (`/marketplace/messages`, `/career/messages`)
- ✅ Ekle: Merkezi mesajlaşma sistemi (`/dashboard/messages`)
- ✅ Ekle: `POST /api/v1/messages/conversations` endpoint kullanımı

---

## 🧪 PHASE 7: Testing

### Task 7.1: Backend Unit Tests

**Dosya:** `backend/tests/test_conversation_service.py`

```python
def test_get_or_create_conversation():
    # Yeni konuşma oluştur
    conv1 = ConversationService.get_or_create_conversation(
        db, "marketplace", 123, user1_id=1, user2_id=2
    )
    
    # Aynı konuşma tekrar oluşturulmaya çalışılırsa aynı döner
    conv2 = ConversationService.get_or_create_conversation(
        db, "marketplace", 123, user1_id=1, user2_id=2
    )
    
    assert conv1.id == conv2.id

def test_user_id_normalization():
    # User ID sırası normalize edilmeli
    conv1 = ConversationService.get_or_create_conversation(
        db, "marketplace", 123, user1_id=1, user2_id=2
    )
    conv2 = ConversationService.get_or_create_conversation(
        db, "marketplace", 123, user1_id=2, user2_id=1
    )
    
    assert conv1.id == conv2.id
```

---

### Task 7.2: API Endpoint Tests

**Dosya:** `backend/tests/test_messages_api.py`

```python
def test_get_conversations(client, auth_token):
    response = client.get(
        "/api/v1/messages/conversations",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    assert "conversations" in response.json()

def test_send_message(client, auth_token, conversation_id):
    response = client.post(
        f"/api/v1/messages/conversations/{conversation_id}/messages",
        json={"content": "Test mesajı"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 201
```

---

### Task 7.3: Frontend E2E Tests

**Dosya:** `frontend/cypress/e2e/messages.cy.ts`

```typescript
describe('Messages System', () => {
  it('Should show unread count in header', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="messages-dropdown"]').should('contain', '2');
  });

  it('Should start conversation from marketplace', () => {
    cy.visit('/dashboard/marketplace/123');
    cy.get('[data-testid="send-message-btn"]').click();
    cy.url().should('include', '/dashboard/messages/');
  });

  it('Should send message in chat', () => {
    cy.visit('/dashboard/messages/1');
    cy.get('textarea').type('Test mesajı{enter}');
    cy.contains('Test mesajı').should('be.visible');
  });
});
```

---

### Task 7.4: Polling Tests

**Dosya:** `frontend/src/__tests__/MessagesContext.test.tsx`

```typescript
describe('MessagesContext', () => {
  it('Should fetch unread count every 30 seconds', async () => {
    jest.useFakeTimers();
    const mockApi = jest.spyOn(api, 'get');

    render(
      <MessagesProvider>
        <TestComponent />
      </MessagesProvider>
    );

    expect(mockApi).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(30000);
    expect(mockApi).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(30000);
    expect(mockApi).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });
});
```

---

## ✅ Checklist

### Database
- [ ] `conversations` tablosu oluşturuldu
- [ ] `marketplace_messages` tablosuna `conversation_id` eklendi
- [ ] `career_messages` tablosuna `conversation_id` eklendi
- [ ] Migration test edildi

### Backend
- [ ] Conversation model oluşturuldu
- [ ] Conversation schemas oluşturuldu
- [ ] `relative_time` helper yazıldı
- [ ] ConversationService implementasyonu tamamlandı
- [ ] API endpoints oluşturuldu
- [ ] Rate limiting eklendi
- [ ] Router'a kaydedildi

### Frontend - Header
- [ ] MessagesContext oluşturuldu
- [ ] MessagesDropdown component yazıldı
- [ ] Header'a eklendi
- [ ] Polling çalışıyor (30 saniye)

### Frontend - Konuşma Listesi
- [ ] ConversationsPage oluşturuldu
- [ ] "Tümünü Okundu İşaretle" çalışıyor
- [ ] Pagination çalışıyor
- [ ] Dashboard sidebar gözüküyor

### Frontend - Chat
- [ ] ChatPage oluşturuldu
- [ ] Bubble tasarım uygulandı
- [ ] Mesaj gönderme çalışıyor
- [ ] Polling çalışıyor (10 saniye)
- [ ] Otomatik scroll çalışıyor

### Entegrasyon
- [ ] Pazar spec güncellendi
- [ ] Pazar frontend entegrasyonu yapıldı
- [ ] Kariyer spec güncellendi
- [ ] Kariyer frontend entegrasyonu yapıldı

### Testing
- [ ] Backend unit tests yazıldı
- [ ] API endpoint tests yazıldı
- [ ] Frontend E2E tests yazıldı
- [ ] Polling tests yazıldı

---

## 📝 Notlar

### Kritik Noktalar:
1. **User ID Normalization:** `get_or_create_conversation` her zaman küçük ID'yi user1 olarak ayarlamalı
2. **Unread Count:** Her mesaj gönderildiğinde karşı tarafın unread_count'u artmalı
3. **Last Message At:** Her yeni mesajda conversation'ın `last_message_at` güncellenmelimeli
4. **Polling:** Header 30 saniye, chat 10 saniye interval kullanmalı
5. **Rate Limiting:** Spam önlemek için mesaj gönderme limitleri önemli

### Gelecek Geliştirmeler:
- WebSocket entegrasyonu (gerçek zamanlı)
- Dosya/Resim gönderme
- Mesaj arama
- Konuşma arşivleme

---

**Tahmini Süre:** 5-6 gün  
**Durum:** Ready for Development

