# 009 - AI ASISTAN (KAMPÜS YAPAY ZEKA ASİSTANI)

## 📋 GENEL BAKIŞ

**Modül Adı:** AI Asistanım (AI Assistant)  
**Öncelik:** Yüksek (Core Feature)  
**Bağımlılıklar:** 
- 002-register-page (Kullanıcı kaydı)
- 003-login-page (Kimlik doğrulama)
- 004-dashboard (Ana navigasyon)
- 006-academic-features (Ders programı, Akademik takvim)
- 005-forum-page (Forum verileri)
- 007-marketplace (Pazar verileri)
- 008-career-page (Kariyer verileri)

**Amaç:**  
Öğrencilere kampüs yaşamları boyunca yardımcı olacak, platform içi verilere erişebilen, akıllı bir yapay zeka asistanı sağlamak. AI, akademik takvim, ders programı, forum, pazar ve kariyer ilanları hakkında bilgi verebilir ve öğrencileri doğru yönlendirebilir.

**NOT:** AI, akademik ders içerikleri hakkında yardım VERMEZ. Sadece kampüs bilgileri ve platform navigasyonu konusunda asistanlık yapar.

---

## 🎯 KULLANICI HİKAYELERİ

### US-09.1: Ders Programı Sorgulama
**Rol:** Öğrenci  
**İstek:** Bugün hangi derslerimin olduğunu AI'ya sormak istiyorum.  
**Değer:** Ders programıma hızlıca erişebilir ve günümü planlayabilirim.

**Kabul Kriterleri:**
- Kullanıcı "Bugün hangi derslerim var?" diye sorabilir
- AI, kullanıcının ders programından bugünkü dersleri çeker
- Ders adı, saat, salon bilgisi gösterilir
- Ders programı sayfasına link verilir

**Örnek Diyalog:**
```
Öğrenci: "Bugün hangi derslerim var?"

AI: "Bugün Pazartesi, 15 Eylül 2025. Ders programına göre 2 dersin var:

📚 10:00-10:45 - Veri Yapıları (A-201)
📚 14:00-14:45 - Algoritma Analizi (B-105)

[Ders Programımı Görüntüle](/dashboard/course-schedule)"
```

---

### US-09.2: Akademik Takvim Sorgulama
**Rol:** Öğrenci  
**İstek:** Yaklaşan akademik etkinlikler hakkında bilgi almak istiyorum.  
**Değer:** Önemli tarihleri kaçırmam ve planımı buna göre yaparım.

**Kabul Kriterleri:**
- Kullanıcı "Ara sınav ne zaman?" gibi sorular sorabilir
- AI, akademik takvimden ilgili etkinliği bulur
- Tarih, gün sayısı, açıklama gösterilir
- Akademik takvim sayfasına link verilir

**Örnek Diyalog:**
```
Öğrenci: "Bir sonraki ara sınav ne zaman?"

AI: "Ara Sınav Haftası 8-16 Kasım 2025 tarihleri arasında. 
3 gün kaldı! 📅 İyi hazırlıklar!

[Akademik Takvimi Görüntüle](/dashboard/academic-calendar)"
```

---

### US-09.3: Forum Arama
**Rol:** Öğrenci  
**İstek:** Forum'da belirli bir konuyla ilgili tartışma olup olmadığını öğrenmek istiyorum.  
**Değer:** İlgilendiğim konulardaki tartışmalara hızlıca erişebilirim.

**Kabul Kriterleri:**
- Kullanıcı "Forum'da React var mı?" gibi sorular sorabilir
- AI, forum konularını arar (başlık, açıklama)
- Bulunan konuları listeler (max 5)
- Forum sayfasına veya konuya link verilir

**Örnek Diyalog:**
```
Öğrenci: "Forum'da Python konusu var mı?"

AI: "Evet, 5 Python konusu buldum:

1. 'Python ile Web Scraping' (12 yanıt) 💬
2. 'Django vs Flask' (8 yanıt) 💬
3. 'Python Veri Analizi Başlangıç' (15 yanıt) 💬

[Forumu Görüntüle](/dashboard/forum?search=Python)"
```

---

### US-09.4: Pazar/Kariyer Arama
**Rol:** Öğrenci  
**İstek:** Satılık ürün veya iş ilanı olup olmadığını öğrenmek istiyorum.  
**Değer:** Aradığım ürünü veya fırsatı hızlıca bulabilirim.

**Kabul Kriterleri:**
- Kullanıcı "Satılık iPhone var mı?" veya "Yazılım staj ilanı var mı?" gibi sorular sorabilir
- AI, pazar/kariyer ilanlarını arar
- Bulunan ilanları listeler (max 5)
- İlgili sayfaya link verilir

**Örnek Diyalog:**
```
Öğrenci: "Satılık laptop var mı?"

AI: "Evet, 3 laptop ilanı buldum:

1. MacBook Air M1 - 35,000 TL (@ahmet_k) 💻
2. Dell XPS 15 - 28,000 TL (@ayse_y) 💻
3. Lenovo ThinkPad - 22,000 TL (@mehmet_a) 💻

[Pazar'ı Görüntüle](/dashboard/marketplace?search=laptop)"
```

---

### US-09.5: Genel Yardım ve Navigasyon
**Rol:** Öğrenci  
**İstek:** Platform özelliklerini keşfetmek ve nasıl kullanacağımı öğrenmek istiyorum.  
**Değer:** Platformu daha verimli kullanabilirim.

**Kabul Kriterleri:**
- Kullanıcı "Nasıl ilan verebilirim?" gibi sorular sorabilir
- AI, platform özelliklerini açıklar
- İlgili sayfalara link verir
- Kısa ve öz cevaplar verir

**Örnek Diyalog:**
```
Öğrenci: "Nasıl ilan verebilirim?"

AI: "İlan vermek için iki seçeneğin var:

🛒 Pazar: İkinci el eşya satışı için
💼 Kariyer: İş, staj, startup ekibi veya proje arkadaşı için

[Pazar'a Git](/dashboard/marketplace/create)
[Kariyer'e Git](/dashboard/career/create)"
```

---

### US-09.6: Konuşma Geçmişi
**Rol:** Öğrenci  
**İstek:** Önceki konuşmalarıma geri dönebilmek istiyorum.  
**Değer:** Daha önce sorduğum soruları tekrar hatırlayabilirim.

**Kabul Kriterleri:**
- Her kullanıcının konuşma geçmişi kaydedilir (tek aktif sohbet)
- Sayfa yenilendiğinde konuşma devam eder
- "Yeni Konuşma" butonu ile temiz başlanabilir
  - Butona basıldığında onay popup'ı gösterilir
  - "Mevcut konuşma geçmişi silinecek. Emin misin?"
  - Onaylanırsa tüm mesajlar silinir
- Son 50 mesaj gösterilir (eski mesajlar silinir)

---

## 🎨 UI/UX TASARIMI

### 1. AI Asistan Sayfası (Chat Interface)

```
┌─ AI ASISTANIM ─────────────────────────────────────────────────────┐
│                                                                     │
│  [🔄 Yeni Konuşma]                            [⚙️ Ayarlar]        │
│                                                                     │
│  ┌─ AI ──────────────────────────────────────────────────────────┐ │
│  │ 🤖 Merhaba! Ben senin kampüs asistanınım.                     │ │
│  │    Ders programın, akademik takvim, forum, pazar ve           │ │
│  │    kariyer ilanları hakkında sorularını yanıtlayabilirim.     │ │
│  │    Nasıl yardımcı olabilirim?                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  10:30                                                              │
│                                                                     │
│  ┌─ SEN ─────────────────────────────────┐                         │
│  │ Bugün hangi derslerim var?            │                         │
│  └───────────────────────────────────────┘                         │
│  10:31                                                              │
│                                                                     │
│  ┌─ AI ──────────────────────────────────────────────────────────┐ │
│  │ Bugün Pazartesi, 15 Eylül 2025.                               │ │
│  │ Ders programına göre 2 dersin var:                            │ │
│  │                                                                │ │
│  │ 📚 10:00-10:45 - Veri Yapıları (A-201)                        │ │
│  │ 📚 14:00-14:45 - Algoritma Analizi (B-105)                    │ │
│  │                                                                │ │
│  │ [📅 Ders Programımı Görüntüle]                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  10:31                                                              │
│                                                                     │
│  ┌─ SEN ─────────────────────────────────┐                         │
│  │ Ara sınav ne zaman?                   │                         │
│  └───────────────────────────────────────┘                         │
│  10:32                                                              │
│                                                                     │
│  ┌─ AI ──────────────────────────────────────────────────────────┐ │
│  │ Ara Sınav Haftası 8-16 Kasım 2025.                            │ │
│  │ 3 gün kaldı! 📅 İyi hazırlıklar!                              │ │
│  │                                                                │ │
│  │ [⏰ Akademik Takvimi Görüntüle]                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  10:32                                                              │
│                                                                     │
│  ┌─ MESAJ KUTUSU ─────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │  [Mesajınızı yazın...]                                   [📤] │ │
│  │                                                                 │ │
│  │  50/50 mesaj kaldı bugün                                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Bileşenler:**
- **Header:**
  - "🔄 Yeni Konuşma" butonu (onay popup'ı gösterir → konuşma geçmişini siler)
  - "⚙️ Ayarlar" butonu (theme, vb. - opsiyonel)
- **Chat Area:**
  - AI mesajları (sol tarafa hizalı, açık gri arka plan)
  - Kullanıcı mesajları (sağ tarafa hizalı, mavi arka plan)
  - Zaman damgası (her mesajın altında)
  - Linkler (tıklanabilir butonlar)
- **Input Area:**
  - Mesaj input (multiline, max 500 karakter)
  - Gönder butonu
  - Kalan mesaj sayacı ("50/50 mesaj kaldı bugün")
- **Loading State:**
  - AI cevap yazarken "🤖 Düşünüyor..." animasyonu

---

### 2. Yeni Konuşma Onay Popup'ı

```
┌─ Yeni Konuşma Başlat? ─────────────────────────────────────────────┐
│                                                                     │
│  ⚠️ Mevcut konuşma geçmişi silinecek.                              │
│     Emin misin?                                                     │
│                                                                     │
│     [İptal]              [Evet, Temizle]                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Davranış:**
- Kullanıcı "🔄 Yeni Konuşma" butonuna basar
- Onay popup'ı gösterilir
- "İptal" → Popup kapanır, hiçbir şey olmaz
- "Evet, Temizle" → Tüm konuşma geçmişi silinir, temiz sayfa

---

### 3. Örnek Hızlı Sorular (Opsiyonel - Gelecek)

```
┌─ HIZLI SORULAR ────────────────────────────────────────────────────┐
│                                                                     │
│  [📅 Bugün derslerim var mı?]  [⏰ Ara sınav ne zaman?]            │
│  [💬 Forum'da yeni ne var?]    [🛒 Satılık laptop var mı?]         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Kullanıcı butona tıklayınca otomatik olarak soru gönderilir.

---

## 🔧 TEKNİK DETAYLAR

### AI Model: Google Gemini

**Model:** `models/gemini-2.5-flash` (ücretsiz, hızlı, güncel)  
**API Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`  
**Rate Limit:** 60 requests/minute (Google tarafından)  
**API Key:** `.env` dosyasında `GOOGLE_API_KEY`

**Avantajlar:**
- ✅ Ücretsiz (60 req/min)
- ✅ Hızlı yanıt (1-3 saniye)
- ✅ Türkçe desteği iyi
- ✅ Context tutma (conversation history)
- ✅ 1 milyon tokenlik bağlam penceresi (uzun konuşmalar için ideal)
- ✅ Daha yeni model (2.5 Flash, 1.5 Flash'tan daha güncel)

**Dezavantajlar:**
- ⚠️ Rate limit var (60 req/min → 1 istek/saniye)
- ⚠️ API key gerekli

---

### Database Schema

#### `ai_conversations` Tablosu
```sql
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_active_conversation UNIQUE (user_id)
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
```

**Not:** Her kullanıcının sadece 1 aktif konuşması olur. "Yeni Konuşma" butonuna basınca eski konuşma silinir.

---

#### `ai_messages` Tablosu
```sql
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'user' | 'assistant'
    content TEXT NOT NULL,
    references JSON,  -- [{"type": "course_schedule", "url": "/dashboard/course-schedule"}]
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT check_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at DESC);
```

**`references` örneği:**
```json
[
  {
    "type": "course_schedule",
    "label": "Ders Programımı Görüntüle",
    "url": "/dashboard/course-schedule"
  },
  {
    "type": "forum_topic",
    "label": "React Hooks Kullanımı",
    "url": "/dashboard/forum/topic/abc123"
  }
]
```

---

#### `ai_usage_logs` Tablosu (Rate Limiting için)
```sql
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

CREATE INDEX idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, date);
```

**Logic:** Her gün için kullanıcının mesaj sayısı tutulur. 50'ye ulaştığında yeni mesaj gönderemez.

---

#### `ai_system_settings` Tablosu (Admin Kontrolü)
```sql
CREATE TABLE ai_system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_ai_system_settings_key ON ai_system_settings(setting_key);
```

**Örnek kayıtlar:**
```sql
INSERT INTO ai_system_settings (setting_key, setting_value) VALUES
('system_prompt', 'Sen KAMPÜS+ platformunun yapay zeka asistanısın...'),
('daily_message_limit', '50'),
('max_token_per_message', '4000'),
('enabled', 'true');
```

---

#### `ai_knowledge_base` Tablosu (SSS)
```sql
CREATE TABLE ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keywords TEXT[] NOT NULL,  -- ['yemekhane', 'kantin', 'menü']
    answer TEXT NOT NULL,
    priority INTEGER DEFAULT 1,  -- Yüksek öncelikli cevaplar önce kullanılır
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_knowledge_base_keywords ON ai_knowledge_base USING GIN(keywords);
CREATE INDEX idx_ai_knowledge_base_active ON ai_knowledge_base(is_active) WHERE is_active = TRUE;
```

**Örnek kayıt:**
```sql
INSERT INTO ai_knowledge_base (keywords, answer, priority) VALUES
(
    ARRAY['yemekhane', 'kantin', 'menü', 'yemek'],
    'Yemekhane menüsü için üniversitenin web sitesini ziyaret edebilirsin: https://selcuk.edu.tr/yemekhane',
    1
);
```

---

### Backend Endpoints

#### Chat Endpoints

**POST /api/v1/ai/chat**
- **Auth:** Required (JWT)
- **Body:**
  ```json
  {
    "message": "Bugün hangi derslerim var?"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "conversation_id": "uuid",
    "response": "Bugün Pazartesi, 15 Eylül 2025...",
    "references": [
      {
        "type": "course_schedule",
        "label": "Ders Programımı Görüntüle",
        "url": "/dashboard/course-schedule"
      }
    ],
    "remaining_messages": 49
  }
  ```
- **Rate Limiting:** 50 mesaj/gün/kullanıcı
- **Logic:**
  1. Kullanıcının bugünkü mesaj sayısını kontrol et (50 limit)
  2. Conversation ID al veya oluştur
  3. Knowledge Base'de anahtar kelime ara
  4. Bulamazsa Gemini API'ye gönder
  5. Platform içi verilere erişim (ders programı, takvim, forum, vb.)
  6. Cevabı ve referansları oluştur
  7. Database'e kaydet
  8. Kullanıcıya döndür

---

**GET /api/v1/ai/conversation**
- **Auth:** Required (JWT)
- **Response:** `200 OK`
  ```json
  {
    "conversation_id": "uuid",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "Bugün hangi derslerim var?",
        "created_at": "2025-01-01T10:30:00Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "Bugün Pazartesi...",
        "references": [...],
        "created_at": "2025-01-01T10:30:02Z"
      }
    ],
    "remaining_messages": 48
  }
  ```
- **Logic:** Son 50 mesajı döndür (pagination yok)

---

**DELETE /api/v1/ai/conversation**
- **Auth:** Required (JWT)
- **Response:** `204 No Content`
- **Logic:** Kullanıcının aktif konuşmasını ve mesajlarını sil

---

**GET /api/v1/ai/remaining-messages**
- **Auth:** Required (JWT)
- **Response:** `200 OK`
  ```json
  {
    "remaining": 50,
    "limit": 50,
    "resets_at": "2025-01-02T00:00:00Z"
  }
  ```

---

#### Admin Endpoints

**GET /api/v1/admin/ai/settings**
- **Auth:** Required (JWT, Admin only)
- **Response:** `200 OK`
  ```json
  {
    "system_prompt": "Sen KAMPÜS+ platformunun...",
    "daily_message_limit": 50,
    "max_token_per_message": 4000,
    "enabled": true
  }
  ```

---

**PUT /api/v1/admin/ai/settings**
- **Auth:** Required (JWT, Admin only)
- **Body:**
  ```json
  {
    "system_prompt": "Yeni prompt...",
    "daily_message_limit": 100
  }
  ```
- **Response:** `200 OK`

---

**GET /api/v1/admin/ai/knowledge-base**
- **Auth:** Required (JWT, Admin only)
- **Response:** `200 OK`
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "keywords": ["yemekhane", "kantin"],
        "answer": "Yemekhane menüsü için...",
        "priority": 1,
        "is_active": true
      }
    ]
  }
  ```

---

**POST /api/v1/admin/ai/knowledge-base**
- **Auth:** Required (JWT, Admin only)
- **Body:**
  ```json
  {
    "keywords": ["yemekhane", "kantin", "menü"],
    "answer": "Yemekhane menüsü için...",
    "priority": 1
  }
  ```
- **Response:** `201 Created`

---

**PUT /api/v1/admin/ai/knowledge-base/{id}**
- **Auth:** Required (JWT, Admin only)
- **Body:** Partial update
- **Response:** `200 OK`

---

**DELETE /api/v1/admin/ai/knowledge-base/{id}**
- **Auth:** Required (JWT, Admin only)
- **Response:** `204 No Content`

---

**GET /api/v1/admin/ai/stats**
- **Auth:** Required (JWT, Admin only)
- **Response:** `200 OK`
  ```json
  {
    "total_messages_today": 1240,
    "total_messages_this_week": 8500,
    "average_response_time": 2.3,
    "top_queries": [
      {"query": "Bugün derslerim var mı?", "count": 340},
      {"query": "Ara sınav ne zaman?", "count": 180}
    ]
  }
  ```

---

### AI Logic: Platform Verilere Erişim

**Pseudo-code:**

```python
async def generate_ai_response(user_id: str, message: str, db: Session):
    # 1. Knowledge Base kontrolü
    kb_answer = search_knowledge_base(message, db)
    if kb_answer:
        return kb_answer
    
    # 2. Platform verilerini çek
    context = await gather_platform_context(user_id, message, db)
    
    # 3. Sistem prompt oluştur
    system_prompt = db.query(AiSystemSettings).filter(
        AiSystemSettings.setting_key == 'system_prompt'
    ).first().setting_value
    
    # 4. Gemini API çağrısı
    response = await call_gemini_api(
        system_prompt=system_prompt,
        user_message=message,
        context=context
    )
    
    # 5. Referansları ekle
    references = extract_references(response, context)
    
    return response, references

async def gather_platform_context(user_id: str, message: str, db: Session):
    context = {}
    
    # Ders programı
    if any(keyword in message.lower() for keyword in ['ders', 'sınıf', 'bugün', 'yarın']):
        context['course_schedule'] = get_user_course_schedule(user_id, db)
    
    # Akademik takvim
    if any(keyword in message.lower() for keyword in ['sınav', 'kayıt', 'tatil', 'etkinlik']):
        context['academic_calendar'] = get_user_academic_calendar(user_id, db)
    
    # Forum
    if any(keyword in message.lower() for keyword in ['forum', 'konu', 'tartışma']):
        search_term = extract_search_term(message)
        context['forum_topics'] = search_forum(search_term, db)
    
    # Pazar
    if any(keyword in message.lower() for keyword in ['satılık', 'alınır', 'pazar']):
        search_term = extract_search_term(message)
        context['marketplace_listings'] = search_marketplace(search_term, db)
    
    # Kariyer
    if any(keyword in message.lower() for keyword in ['iş', 'staj', 'ilan', 'kariyer']):
        search_term = extract_search_term(message)
        context['career_listings'] = search_career(search_term, db)
    
    return context
```

---

### Gemini API Entegrasyonu

**Dosya:** `backend/app/utils/gemini_client.py`

```python
import google.generativeai as genai
from app.config import settings

genai.configure(api_key=settings.GOOGLE_API_KEY)

def call_gemini_api(system_prompt: str, user_message: str, context: dict) -> str:
    """
    Gemini API'ye istek gönder
    """
    model = genai.GenerativeModel('models/gemini-2.5-flash')
    
    # Context'i prompt'a ekle
    full_prompt = f"{system_prompt}\n\n"
    
    if context.get('course_schedule'):
        full_prompt += "DERS PROGRAMI:\n"
        for course in context['course_schedule']:
            full_prompt += f"- {course['day']} {course['time']}: {course['name']} ({course['room']})\n"
        full_prompt += "\n"
    
    if context.get('academic_calendar'):
        full_prompt += "AKADEMİK TAKVİM:\n"
        for event in context['academic_calendar']:
            full_prompt += f"- {event['title']}: {event['start_date']} - {event['end_date']}\n"
        full_prompt += "\n"
    
    if context.get('forum_topics'):
        full_prompt += "FORUM KONULARI:\n"
        for topic in context['forum_topics'][:5]:
            full_prompt += f"- {topic['title']} ({topic['reply_count']} yanıt)\n"
        full_prompt += "\n"
    
    # ... diğer context'ler
    
    full_prompt += f"KULLANICI SORUSU: {user_message}"
    
    # API çağrısı
    response = model.generate_content(full_prompt)
    
    return response.text
```

---

## 🛡️ GÜVENLİK VE MODERASYON

### 1. Rate Limiting
- **Günlük Limit:** 50 mesaj/kullanıcı
- **Token Limit:** Max 4000 token/mesaj (çok uzun mesajları engelle)
- **Cooldown:** 5 saniye/mesaj (spam engelleme)

### 2. İçerik Filtreleme
- **Yasaklı Kelimeler:** Admin panelden tanımlanabilir
- **Akademik Dürüstlük:** "ödev yap", "sınav çöz" gibi istekleri reddet

### 3. Kişisel Veri Koruması
- AI, kullanıcıların şifrelerini, email adreslerini ASLA görmesin
- Sadece gerekli veriler (ad, ders programı, vb.) paylaşılsın

---

## 📱 RESPONSIVE TASARIM

### Desktop (1024px+)
- Full width chat alanı
- Mesajlar max 800px genişlikte ortalanmış

### Tablet (768px - 1023px)
- Benzer layout

### Mobile (< 768px)
- Mesajlar ekrana tam genişlikte
- Input alanı sabit (sticky bottom)

---

## ♿ ERİŞİLEBİLİRLİK

- Mesajlar screen reader ile okunabilir
- Linkler klavye ile erişilebilir (Tab navigasyonu)
- Kontrast oranı: WCAG AA standardı (4.5:1)
- Loading state görsel ve metinsel olarak belirtilir

---

## 🎯 BAŞARI METRİKLERİ

- **Günlük Aktif Kullanıcı:** Kaç öğrenci AI'yi kullanıyor
- **Ortalama Mesaj Sayısı:** Kullanıcı başına mesaj
- **Cevap Doğruluğu:** Kullanıcı memnuniyeti (opsiyonel feedback)
- **En Popüler Sorgular:** Hangi sorular en çok soruluyor
- **Ortalama Yanıt Süresi:** AI'nin cevap verme hızı

---

## 📝 NOTLAR VE GELECEK GELİŞTİRMELER

### MVP için Dahil OLMAYANLAR:
- Sesli komut (voice input)
- Görsel yükleme (image upload)
- Çok dilli destek (sadece Türkçe)
- Real-time typing indicator
- Message reactions (👍, ❤️, vb.)
- Conversation export (PDF, TXT)

### Gelecek Versiyonlar için Fikirler:
- **Proaktif Bildirimler:** "Bugün 2 dersin var, hatırlatmamı ister misin?"
- **Kişiselleştirilmiş Öneriler:** "İlgilendiğin konularda yeni forum tartışması açıldı"
- **Akademik Destek:** (Kullanıcı isteğine bağlı) Ders içerikleri hakkında yardım
- **Voice Assistant:** Sesli komutlarla etkileşim
- **Multimodal:** Görsel yükleme ve analiz
- **Fine-tuning:** Kampüs diline özgü model eğitimi

---

## ✅ ONAY DURUMU

- [ ] Kullanıcı tarafından gözden geçirildi
- [ ] Tasarım mockup'ları onaylandı
- [ ] Backend API kontratı onaylandı
- [ ] Database şeması onaylandı
- [ ] Gemini API test edildi

---

**Son Güncelleme:** 2025-01-02  
**Versiyon:** 1.0  
**Hazırlayan:** AI Assistant

