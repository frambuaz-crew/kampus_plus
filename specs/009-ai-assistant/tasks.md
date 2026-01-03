# 009 - AI ASISTAN (KAMPÜS YAPAY ZEKA ASİSTANI) - IMPLEMENTATION TASKS

## 📋 GENEL BAKIŞ

**Tahmini Süre:** 7-9 gün  
**Öncelik:** Yüksek (Core Feature)  
**Bağımlılıklar:** 
- 002-register-page (✅ Tamamlanmalı)
- 003-login-page (✅ Tamamlanmalı)
- 004-dashboard (✅ Tamamlanmalı)
- 006-academic-features (✅ Veri kaynağı)
- 005-forum-page (✅ Veri kaynağı)
- 007-marketplace (✅ Veri kaynağı)
- 008-career-page (✅ Veri kaynağı)

---

## 📦 PHASE 0: Infrastructure Setup (1 gün)

### Task 0.1: Google Gemini API Setup
**Süre:** 1 saat  
**Açıklama:** Gemini API key alma ve test

**Adımlar:**
1. Google AI Studio'ya git: https://aistudio.google.com/app/apikey
2. API Key oluştur
3. `.env` dosyasına ekle:
   ```
   GOOGLE_API_KEY=AIzaSy...
   GEMINI_MODEL=models/gemini-2.5-flash
   ```
4. Python paketi yükle:
   ```bash
   pip install google-generativeai
   ```

**Test:**
```python
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")
model = genai.GenerativeModel('models/gemini-2.5-flash')
response = model.generate_content("Merhaba!")
print(response.text)
```

---

### Task 0.2: Gemini Client Utility
**Süre:** 3 saat  
**Açıklama:** Gemini API'yi saran utility fonksiyonu

**Dosya:** `backend/app/utils/gemini_client.py`

```python
import google.generativeai as genai
from app.config import settings
from typing import Dict, List, Optional

genai.configure(api_key=settings.GOOGLE_API_KEY)

class GeminiClient:
    def __init__(self):
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
    
    def generate_response(
        self, 
        system_prompt: str, 
        user_message: str, 
        context: Dict = None,
        conversation_history: List[Dict] = None
    ) -> str:
        """
        Gemini API'ye istek gönder ve yanıt al
        
        Args:
            system_prompt: AI'nin davranışını belirleyen sistem promptu
            user_message: Kullanıcının mesajı
            context: Platform içi veriler (ders programı, takvim, vb.)
            conversation_history: Önceki konuşma geçmişi
        
        Returns:
            AI'nin yanıtı (string)
        """
        # Full prompt oluştur
        full_prompt = self._build_prompt(
            system_prompt, 
            context, 
            conversation_history, 
            user_message
        )
        
        try:
            # API çağrısı
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            print(f"Gemini API Error: {e}")
            return "Üzgünüm, şu anda bir sorun yaşıyorum. Lütfen daha sonra tekrar dene."
    
    def _build_prompt(
        self, 
        system_prompt: str, 
        context: Dict, 
        history: List[Dict], 
        user_message: str
    ) -> str:
        """Tam prompt'u oluştur"""
        prompt_parts = [system_prompt, "\n\n"]
        
        # Context ekle
        if context:
            if context.get('course_schedule'):
                prompt_parts.append("DERS PROGRAMI:\n")
                for course in context['course_schedule']:
                    prompt_parts.append(
                        f"- {course['day_of_week_tr']} {course['start_time']}: "
                        f"{course['course_name']} ({course['room']})\n"
                    )
                prompt_parts.append("\n")
            
            if context.get('academic_calendar'):
                prompt_parts.append("AKADEMİK TAKVİM (Yaklaşan Etkinlikler):\n")
                for event in context['academic_calendar'][:5]:
                    prompt_parts.append(
                        f"- {event['title']}: {event['start_date']} "
                        f"({event['days_until']} gün kaldı)\n"
                    )
                prompt_parts.append("\n")
            
            if context.get('forum_topics'):
                prompt_parts.append("FORUM KONULARI:\n")
                for topic in context['forum_topics'][:5]:
                    prompt_parts.append(
                        f"- '{topic['title']}' ({topic['reply_count']} yanıt)\n"
                    )
                prompt_parts.append("\n")
            
            if context.get('marketplace_listings'):
                prompt_parts.append("PAZAR İLANLARI:\n")
                for listing in context['marketplace_listings'][:5]:
                    prompt_parts.append(
                        f"- {listing['title']} - {listing['price']} TL (@{listing['seller']})\n"
                    )
                prompt_parts.append("\n")
            
            if context.get('career_listings'):
                prompt_parts.append("KARİYER İLANLARI:\n")
                for listing in context['career_listings'][:5]:
                    prompt_parts.append(
                        f"- {listing['title']} ({listing['listing_type_tr']}) - {listing['location']}\n"
                    )
                prompt_parts.append("\n")
        
        # Conversation history ekle (son 5 mesaj)
        if history:
            prompt_parts.append("ÖNCEKİ KONUŞMA:\n")
            for msg in history[-5:]:
                role = "Kullanıcı" if msg['role'] == 'user' else "Sen"
                prompt_parts.append(f"{role}: {msg['content']}\n")
            prompt_parts.append("\n")
        
        # Kullanıcı mesajı
        prompt_parts.append(f"KULLANICI SORUSU: {user_message}\n\n")
        prompt_parts.append("CEVAP (Türkçe, kısa ve öz, emoji kullan):")
        
        return "".join(prompt_parts)

# Singleton instance
gemini_client = GeminiClient()
```

**Test:**
- Basit prompt ile test et
- Context ile test et
- Conversation history ile test et

---

### Task 0.3: Context Gatherer Utility
**Süre:** 4 saat  
**Açıklama:** Platform verilerini toplayan utility

**Dosya:** `backend/app/utils/ai_context.py`

```python
from sqlalchemy.orm import Session
from app.models import User, CourseSchedule, AcademicCalendarEvent, ForumTopic, MarketplaceListing, CareerListing
from datetime import datetime, timedelta
from typing import Dict, List
import re

class AIContextGatherer:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
    
    async def gather_context(self, user_message: str) -> Dict:
        """
        Kullanıcı mesajına göre ilgili platform verilerini topla
        """
        context = {}
        message_lower = user_message.lower()
        
        # Ders programı gerekli mi?
        if self._needs_course_schedule(message_lower):
            context['course_schedule'] = self._get_course_schedule()
        
        # Akademik takvim gerekli mi?
        if self._needs_academic_calendar(message_lower):
            context['academic_calendar'] = self._get_academic_calendar()
        
        # Forum araması gerekli mi?
        if self._needs_forum_search(message_lower):
            search_term = self._extract_search_term(message_lower, ['forum'])
            context['forum_topics'] = self._search_forum(search_term)
        
        # Pazar araması gerekli mi?
        if self._needs_marketplace_search(message_lower):
            search_term = self._extract_search_term(message_lower, ['satılık', 'alınır', 'pazar'])
            context['marketplace_listings'] = self._search_marketplace(search_term)
        
        # Kariyer araması gerekli mi?
        if self._needs_career_search(message_lower):
            search_term = self._extract_search_term(message_lower, ['iş', 'staj', 'ilan'])
            context['career_listings'] = self._search_career(search_term)
        
        return context
    
    def _needs_course_schedule(self, message: str) -> bool:
        keywords = ['ders', 'sınıf', 'bugün', 'yarın', 'program', 'ders saati']
        return any(keyword in message for keyword in keywords)
    
    def _needs_academic_calendar(self, message: str) -> bool:
        keywords = ['sınav', 'kayıt', 'tatil', 'etkinlik', 'takvim', 'ara sınav', 'final']
        return any(keyword in message for keyword in keywords)
    
    def _needs_forum_search(self, message: str) -> bool:
        keywords = ['forum', 'konu', 'tartışma']
        return any(keyword in message for keyword in keywords)
    
    def _needs_marketplace_search(self, message: str) -> bool:
        keywords = ['satılık', 'alınır', 'pazar', 'ikinci el']
        return any(keyword in message for keyword in keywords)
    
    def _needs_career_search(self, message: str) -> bool:
        keywords = ['iş', 'staj', 'ilan', 'kariyer', 'pozisyon']
        return any(keyword in message for keyword in keywords)
    
    def _get_course_schedule(self) -> List[Dict]:
        """Kullanıcının ders programını çek"""
        today = datetime.now().weekday()  # 0=Monday, 6=Sunday
        
        schedules = self.db.query(CourseSchedule).filter(
            CourseSchedule.university_id == self.user.university_id,
            CourseSchedule.department == self.user.department,
            CourseSchedule.day_of_week == today
        ).all()
        
        result = []
        for schedule in schedules:
            result.append({
                'day_of_week_tr': self._get_day_name_tr(schedule.day_of_week),
                'start_time': schedule.start_time.strftime('%H:%M'),
                'end_time': schedule.end_time.strftime('%H:%M'),
                'course_name': schedule.course_name,
                'room': schedule.room or 'Belirtilmemiş'
            })
        
        return result
    
    def _get_academic_calendar(self) -> List[Dict]:
        """Yaklaşan akademik etkinlikleri çek"""
        today = datetime.now().date()
        
        events = self.db.query(AcademicCalendarEvent).filter(
            AcademicCalendarEvent.university_id == self.user.university_id,
            AcademicCalendarEvent.start_date >= today
        ).order_by(AcademicCalendarEvent.start_date).limit(5).all()
        
        result = []
        for event in events:
            days_until = (event.start_date - today).days
            result.append({
                'title': event.title,
                'start_date': event.start_date.strftime('%d.%m.%Y'),
                'end_date': event.end_date.strftime('%d.%m.%Y') if event.end_date else None,
                'days_until': days_until
            })
        
        return result
    
    def _search_forum(self, search_term: str) -> List[Dict]:
        """Forum'da arama yap"""
        if not search_term:
            return []
        
        topics = self.db.query(ForumTopic).filter(
            ForumTopic.title.ilike(f'%{search_term}%')
        ).limit(5).all()
        
        result = []
        for topic in topics:
            result.append({
                'id': str(topic.id),
                'title': topic.title,
                'reply_count': topic.reply_count,
                'url': f'/dashboard/forum/topic/{topic.id}'
            })
        
        return result
    
    def _search_marketplace(self, search_term: str) -> List[Dict]:
        """Pazar'da arama yap"""
        if not search_term:
            return []
        
        listings = self.db.query(MarketplaceListing).filter(
            MarketplaceListing.status == 'active',
            MarketplaceListing.title.ilike(f'%{search_term}%')
        ).limit(5).all()
        
        result = []
        for listing in listings:
            result.append({
                'id': str(listing.id),
                'title': listing.title,
                'price': float(listing.price),
                'seller': f"{listing.seller.first_name}_{listing.seller.last_name[0]}",
                'url': f'/dashboard/marketplace/{listing.id}'
            })
        
        return result
    
    def _search_career(self, search_term: str) -> List[Dict]:
        """Kariyer'de arama yap"""
        if not search_term:
            return []
        
        listings = self.db.query(CareerListing).filter(
            CareerListing.status == 'active',
            CareerListing.title.ilike(f'%{search_term}%')
        ).limit(5).all()
        
        result = []
        for listing in listings:
            listing_type_map = {
                'job': 'İş İlanı',
                'internship': 'Staj İlanı',
                'startup': 'Startup Ekibi',
                'project': 'Proje Arkadaşı'
            }
            result.append({
                'id': str(listing.id),
                'title': listing.title,
                'listing_type_tr': listing_type_map.get(listing.listing_type, ''),
                'location': listing.location,
                'url': f'/dashboard/career/{listing.id}'
            })
        
        return result
    
    def _extract_search_term(self, message: str, exclude_keywords: List[str]) -> str:
        """Mesajdan arama terimini çıkar"""
        # Basit yaklaşım: exclude_keywords'leri çıkar
        for keyword in exclude_keywords:
            message = message.replace(keyword, '')
        
        # "var mı", "arıyorum" gibi gereksiz kelimeleri çıkar
        noise_words = ['var', 'mı', 'mi', 'arıyorum', 'bul', 'göster', 've']
        words = message.split()
        clean_words = [w for w in words if w not in noise_words and len(w) > 2]
        
        return ' '.join(clean_words).strip()
    
    def _get_day_name_tr(self, day_of_week: int) -> str:
        days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
        return days[day_of_week]
```

---

## 🗄️ PHASE 1: Database Setup (1 gün)

### Task 1.1: Alembic Migration - AI Tables
**Süre:** 3 saat  
**Açıklama:** Database tablolarını oluştur

**Migration Dosyası:** `alembic/versions/xxx_create_ai_tables.py`

```python
def upgrade():
    # ai_conversations tablosu
    op.create_table(
        'ai_conversations',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('user_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('started_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('last_message_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', name='unique_active_conversation')
    )
    
    op.create_index('idx_ai_conversations_user', 'ai_conversations', ['user_id'])
    
    # ai_messages tablosu
    op.create_table(
        'ai_messages',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('conversation_id', sa.UUID(), sa.ForeignKey('ai_conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('references', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.CheckConstraint("role IN ('user', 'assistant')", name='check_role')
    )
    
    op.create_index('idx_ai_messages_conversation', 'ai_messages', ['conversation_id'])
    op.create_index('idx_ai_messages_created_at', 'ai_messages', [sa.text('created_at DESC')])
    
    # ai_usage_logs tablosu
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('user_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message_count', sa.Integer(), default=1),
        sa.Column('date', sa.Date(), server_default=sa.func.current_date()),
        sa.UniqueConstraint('user_id', 'date', name='unique_user_date')
    )
    
    op.create_index('idx_ai_usage_logs_user_date', 'ai_usage_logs', ['user_id', 'date'])
    
    # ai_system_settings tablosu
    op.create_table(
        'ai_system_settings',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('setting_key', sa.String(100), nullable=False, unique=True),
        sa.Column('setting_value', sa.Text(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_by', sa.UUID(), sa.ForeignKey('users.id'), nullable=True)
    )
    
    op.create_index('idx_ai_system_settings_key', 'ai_system_settings', ['setting_key'])
    
    # ai_knowledge_base tablosu
    op.create_table(
        'ai_knowledge_base',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('keywords', sa.ARRAY(sa.Text()), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('priority', sa.Integer(), default=1),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_by', sa.UUID(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    op.execute("CREATE INDEX idx_ai_knowledge_base_keywords ON ai_knowledge_base USING GIN(keywords)")
    op.create_index('idx_ai_knowledge_base_active', 'ai_knowledge_base', ['is_active'])
    
    # Default settings ekle
    op.execute("""
        INSERT INTO ai_system_settings (id, setting_key, setting_value) VALUES
        (gen_random_uuid(), 'system_prompt', 'Sen KAMPÜS+ platformunun yapay zeka asistanısın. Öğrencilere kampüs yaşamları boyunca yardımcı olursun. Ders programı, akademik takvim, forum, pazar ve kariyer ilanları hakkında bilgi verirsin. Samimi ve yardımsever ol. Kısa ve öz cevaplar ver. Emoji kullan.'),
        (gen_random_uuid(), 'daily_message_limit', '50'),
        (gen_random_uuid(), 'max_token_per_message', '4000'),
        (gen_random_uuid(), 'enabled', 'true');
    """)
```

**Test:**
```bash
alembic upgrade head
```

---

### Task 1.2: SQLAlchemy Models
**Süre:** 2 saat  
**Açıklama:** ORM modellerini oluştur

**Dosya:** `backend/app/models/ai.py`

*(Model tanımlamaları - spec'te belirtildi, kod örnekleri atlanabilir)*

---

### Task 1.3: Pydantic Schemas
**Süre:** 2 saat  
**Açıklama:** Request/Response DTO'larını oluştur

**Dosya:** `backend/app/schemas/ai.py`

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)

class ReferenceResponse(BaseModel):
    type: str
    label: str
    url: str

class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    references: Optional[List[ReferenceResponse]]
    remaining_messages: int

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    references: Optional[List[ReferenceResponse]]
    created_at: datetime

class ConversationResponse(BaseModel):
    conversation_id: str
    messages: List[MessageResponse]
    remaining_messages: int

class RemainingMessagesResponse(BaseModel):
    remaining: int
    limit: int
    resets_at: datetime
```

---

## 🔌 PHASE 2: Backend API Implementation (3 gün)

### Task 2.1: Chat Endpoint - Mesaj Gönderme
**Süre:** 6 saat  
**Dosya:** `backend/app/routers/ai.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, AIConversation, AIMessage, AIUsageLog
from app.schemas.ai import ChatRequest, ChatResponse
from app.dependencies import get_current_user
from app.utils.gemini_client import gemini_client
from app.utils.ai_context import AIContextGatherer
from datetime import datetime, date

router = APIRouter(prefix="/api/v1/ai", tags=["AI Assistant"])

@router.post("/chat", response_model=ChatResponse)
async def send_message(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Rate limiting kontrolü
    today = date.today()
    usage_log = db.query(AIUsageLog).filter(
        AIUsageLog.user_id == current_user.id,
        AIUsageLog.date == today
    ).first()
    
    daily_limit = int(
        db.query(AISystemSettings).filter(
            AISystemSettings.setting_key == 'daily_message_limit'
        ).first().setting_value
    )
    
    if usage_log and usage_log.message_count >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Günlük mesaj limitinize ulaştınız ({daily_limit}/{daily_limit}). Yarın tekrar deneyin."
        )
    
    # 2. AI enabled kontrolü
    ai_enabled = db.query(AISystemSettings).filter(
        AISystemSettings.setting_key == 'enabled'
    ).first().setting_value == 'true'
    
    if not ai_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI asistan şu anda bakımda. Lütfen daha sonra tekrar deneyin."
        )
    
    # 3. Conversation ID al veya oluştur
    conversation = db.query(AIConversation).filter(
        AIConversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        conversation = AIConversation(user_id=current_user.id)
        db.add(conversation)
        db.flush()
    
    # 4. Kullanıcı mesajını kaydet
    user_message = AIMessage(
        conversation_id=conversation.id,
        role='user',
        content=data.message
    )
    db.add(user_message)
    db.flush()
    
    # 5. Context topla
    context_gatherer = AIContextGatherer(db, current_user)
    context = await context_gatherer.gather_context(data.message)
    
    # 6. Conversation history çek (son 5 mesaj)
    history_messages = db.query(AIMessage).filter(
        AIMessage.conversation_id == conversation.id
    ).order_by(AIMessage.created_at.desc()).limit(5).all()
    
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(history_messages)
    ]
    
    # 7. System prompt çek
    system_prompt = db.query(AISystemSettings).filter(
        AISystemSettings.setting_key == 'system_prompt'
    ).first().setting_value
    
    # 8. Gemini API çağrısı
    ai_response = gemini_client.generate_response(
        system_prompt=system_prompt,
        user_message=data.message,
        context=context,
        conversation_history=history
    )
    
    # 9. References oluştur
    references = _build_references(context)
    
    # 10. AI mesajını kaydet
    assistant_message = AIMessage(
        conversation_id=conversation.id,
        role='assistant',
        content=ai_response,
        references=references
    )
    db.add(assistant_message)
    
    # 11. Conversation güncelle
    conversation.last_message_at = datetime.utcnow()
    
    # 12. Usage log güncelle
    if usage_log:
        usage_log.message_count += 1
    else:
        usage_log = AIUsageLog(
            user_id=current_user.id,
            message_count=1,
            date=today
        )
        db.add(usage_log)
    
    db.commit()
    
    # 13. Response döndür
    remaining = daily_limit - (usage_log.message_count if usage_log else 0)
    
    return ChatResponse(
        conversation_id=str(conversation.id),
        response=ai_response,
        references=references,
        remaining_messages=remaining
    )

def _build_references(context: dict) -> List[dict]:
    """Context'ten referanslar oluştur"""
    references = []
    
    if context.get('course_schedule'):
        references.append({
            "type": "course_schedule",
            "label": "Ders Programımı Görüntüle",
            "url": "/dashboard/course-schedule"
        })
    
    if context.get('academic_calendar'):
        references.append({
            "type": "academic_calendar",
            "label": "Akademik Takvimi Görüntüle",
            "url": "/dashboard/academic-calendar"
        })
    
    if context.get('forum_topics') and len(context['forum_topics']) > 0:
        references.append({
            "type": "forum",
            "label": "Forum'u Görüntüle",
            "url": "/dashboard/forum"
        })
    
    if context.get('marketplace_listings') and len(context['marketplace_listings']) > 0:
        references.append({
            "type": "marketplace",
            "label": "Pazar'ı Görüntüle",
            "url": "/dashboard/marketplace"
        })
    
    if context.get('career_listings') and len(context['career_listings']) > 0:
        references.append({
            "type": "career",
            "label": "Kariyer'i Görüntüle",
            "url": "/dashboard/career"
        })
    
    return references if references else None
```

**Test:**
- Rate limiting çalışmalı (50 mesaj sonrası 429)
- AI disabled ise 503 dönmeli
- Geçerli mesaj ile 200 dönmeli
- Context doğru toplanmalı
- References doğru oluşturulmalı

---

### Task 2.2: Conversation Endpoint - Geçmiş Mesajlar
**Süre:** 2 saat  
**Dosya:** `backend/app/routers/ai.py`

```python
@router.get("/conversation", response_model=ConversationResponse)
def get_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Conversation çek
    conversation = db.query(AIConversation).filter(
        AIConversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        return ConversationResponse(
            conversation_id=None,
            messages=[],
            remaining_messages=50
        )
    
    # Mesajları çek (son 50)
    messages = db.query(AIMessage).filter(
        AIMessage.conversation_id == conversation.id
    ).order_by(AIMessage.created_at.asc()).limit(50).all()
    
    # Remaining messages hesapla
    today = date.today()
    usage_log = db.query(AIUsageLog).filter(
        AIUsageLog.user_id == current_user.id,
        AIUsageLog.date == today
    ).first()
    
    daily_limit = 50
    remaining = daily_limit - (usage_log.message_count if usage_log else 0)
    
    return ConversationResponse(
        conversation_id=str(conversation.id),
        messages=messages,
        remaining_messages=remaining
    )
```

---

### Task 2.3: Delete Conversation Endpoint
**Süre:** 1 saat  
**Dosya:** `backend/app/routers/ai.py`

```python
@router.delete("/conversation", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation = db.query(AIConversation).filter(
        AIConversation.user_id == current_user.id
    ).first()
    
    if conversation:
        db.delete(conversation)  # Cascade ile messages da silinir
        db.commit()
    
    return
```

---

### Task 2.4: Remaining Messages Endpoint
**Süre:** 1 saat  
**Dosya:** `backend/app/routers/ai.py`

```python
from datetime import timedelta

@router.get("/remaining-messages", response_model=RemainingMessagesResponse)
def get_remaining_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    usage_log = db.query(AIUsageLog).filter(
        AIUsageLog.user_id == current_user.id,
        AIUsageLog.date == today
    ).first()
    
    daily_limit = 50
    remaining = daily_limit - (usage_log.message_count if usage_log else 0)
    
    # Yarın saat 00:00'da reset
    tomorrow = today + timedelta(days=1)
    resets_at = datetime.combine(tomorrow, datetime.min.time())
    
    return RemainingMessagesResponse(
        remaining=remaining,
        limit=daily_limit,
        resets_at=resets_at
    )
```

---

### Task 2.5: Admin - Get Settings Endpoint
**Süre:** 1 saat  
**Dosya:** `backend/app/routers/ai_admin.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from app.models import AISystemSettings
from app.dependencies import get_current_admin

admin_router = APIRouter(prefix="/api/v1/admin/ai", tags=["AI Admin"])

@admin_router.get("/settings")
def get_ai_settings(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(AISystemSettings).all()
    
    result = {}
    for setting in settings:
        result[setting.setting_key] = setting.setting_value
    
    return result
```

---

### Task 2.6: Admin - Update Settings Endpoint
**Süre:** 1 saat  

---

### Task 2.7: Admin - Knowledge Base CRUD Endpoints
**Süre:** 3 saat  

---

### Task 2.8: Admin - Stats Endpoint
**Süre:** 2 saat  

---

### Task 2.9: Router'ları Main App'e Ekle
**Süre:** 30 dakika  
**Dosya:** `backend/app/main.py`

```python
from app.routers import ai, ai_admin

app.include_router(ai.router)
app.include_router(ai_admin.admin_router)
```

---

## 🎨 PHASE 3: Frontend Implementation (2 gün)

### Task 3.1: AI Service (API Client)
**Süre:** 1 saat  
**Dosya:** `frontend/src/services/aiService.ts`

```typescript
import axios from 'axios';

const API_BASE = '/api/v1/ai';

export const aiService = {
  async sendMessage(message: string) {
    const response = await axios.post(`${API_BASE}/chat`, { message });
    return response.data;
  },
  
  async getConversation() {
    const response = await axios.get(`${API_BASE}/conversation`);
    return response.data;
  },
  
  async deleteConversation() {
    await axios.delete(`${API_BASE}/conversation`);
  },
  
  async getRemainingMessages() {
    const response = await axios.get(`${API_BASE}/remaining-messages`);
    return response.data;
  }
};
```

---

### Task 3.2: AI Chat Sayfası
**Süre:** 8 saat  
**Dosya:** `frontend/src/pages/AI/AIChat.tsx`

**Önemli Özellikler:**

1. **Mesaj Listeleme:**
   - Konuşma geçmişini çek (GET /api/v1/ai/conversation)
   - AI ve kullanıcı mesajlarını göster
   - Scroll (en son mesaj görünür)

2. **Mesaj Gönderme:**
   - Input'tan mesaj al
   - POST /api/v1/ai/chat
   - Loading state ("🤖 Düşünüyor...")
   - Cevabı göster
   - References'ları buton olarak göster

3. **Yeni Konuşma Butonu:**
   - "🔄 Yeni Konuşma" butonuna bas
   - Onay popup'ı göster:
     ```jsx
     <ConfirmDialog
       title="Yeni Konuşma Başlat?"
       message="Mevcut konuşma geçmişi silinecek. Emin misin?"
       onConfirm={handleNewConversation}
       onCancel={() => setShowConfirm(false)}
     />
     ```
   - Onaylanırsa: DELETE /api/v1/ai/conversation
   - Sayfa yenilenir (temiz başlar)

4. **Kalan Mesaj Sayacı:**
   - "50/50 mesaj kaldı bugün" göster
   - Limit dolduğunda input disable et

**Örnek Kod (özet):**

```typescript
const AIChat: React.FC = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(50);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  useEffect(() => {
    loadConversation();
  }, []);
  
  const loadConversation = async () => {
    const data = await aiService.getConversation();
    setMessages(data.messages);
    setRemaining(data.remaining_messages);
  };
  
  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;
    
    setLoading(true);
    const data = await aiService.sendMessage(inputText);
    
    // Mesajları güncelle
    setMessages([...messages, 
      { role: 'user', content: inputText },
      { role: 'assistant', content: data.response, references: data.references }
    ]);
    setRemaining(data.remaining_messages);
    setInputText('');
    setLoading(false);
  };
  
  const handleNewConversation = async () => {
    await aiService.deleteConversation();
    setMessages([]);
    setRemaining(50);
    setShowConfirmDialog(false);
  };
  
  return (
    <div className="ai-chat">
      <header>
        <button onClick={() => setShowConfirmDialog(true)}>
          🔄 Yeni Konuşma
        </button>
      </header>
      
      <div className="messages">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && <LoadingIndicator />}
      </div>
      
      <div className="input-area">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={remaining === 0}
        />
        <button onClick={handleSendMessage} disabled={remaining === 0}>
          📤
        </button>
        <p>{remaining}/50 mesaj kaldı bugün</p>
      </div>
      
      {showConfirmDialog && (
        <ConfirmDialog
          title="Yeni Konuşma Başlat?"
          message="Mevcut konuşma geçmişi silinecek. Emin misin?"
          onConfirm={handleNewConversation}
          onCancel={() => setShowConfirmDialog(false)}
        />
      )}
    </div>
  );
};
```

---

### Task 3.3: Routing Yapılandırması
**Süre:** 30 dakika  
**Dosya:** `frontend/src/App.tsx`

```typescript
import AIChat from './pages/AI/AIChat';

<Route path="/ai-assistant" element={<AIChat />} />
```

---

### Task 3.4: CSS Styling
**Süre:** 3 saat  
**Dosya:** `frontend/src/styles/ai.css`

---

## 🧪 PHASE 4: Testing (1 gün)

### Task 4.1: Backend Unit Tests
**Süre:** 4 saat  

---

### Task 4.2: Frontend E2E Tests
**Süre:** 3 saat  

---

### Task 4.3: Manual QA
**Süre:** 2 saat  

---

## 📚 PHASE 5: Documentation (0.5 gün)

### Task 5.1: API Documentation
**Süre:** 1 saat  

---

### Task 5.2: User Guide
**Süre:** 1 saat  

---

### Task 5.3: Admin Guide
**Süre:** 1 saat  

---

## ✅ KABUL KRİTERLERİ

- [ ] Öğrenciler AI ile chat yapabilir
- [ ] AI platform içi verilere erişebilir (ders programı, takvim, forum, pazar, kariyer)
- [ ] Cevaplarla birlikte ilgili sayfalara linkler verilir
- [ ] Rate limiting çalışır (50 mesaj/gün)
- [ ] Conversation history tutulur
- [ ] "Yeni Konuşma" butonu çalışır
- [ ] Admin sistem prompt'u değiştirebilir
- [ ] Admin knowledge base ekleyebilir/düzenleyebilir
- [ ] Admin istatistikleri görebilir
- [ ] Gemini API entegrasyonu çalışır
- [ ] Responsive tasarım (desktop, tablet, mobile)

---

## 📊 BACKLOG / GELECEK GELİŞTİRMELER

- [ ] Sesli komut (voice input)
- [ ] Görsel yükleme (image upload)
- [ ] Real-time typing indicator
- [ ] Message reactions
- [ ] Conversation export
- [ ] Proaktif bildirimler
- [ ] Kişiselleştirilmiş öneriler
- [ ] Akademik destek (opsiyonel)
- [ ] Fine-tuning (kampüs diline özgü)

---

**Son Güncelleme:** 2025-01-02  
**Tahmini Tamamlanma Süresi:** 7-9 gün  
**Hazırlayan:** AI Assistant

