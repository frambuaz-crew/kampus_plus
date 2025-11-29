# 🚀 Kampus Plus - Geliştirici Kurulum Rehberi

Bu rehber, projeyi kendi bilgisayarınızda çalıştırmak için gereken tüm adımları içerir.

## 📋 Gereksinimler

Kuruluma başlamadan önce aşağıdaki yazılımların yüklü olduğundan emin olun:

- **Git** (versiyon kontrol)
- **Python 3.11+** (backend için)
- **Node.js 18+** ve **npm** (frontend için)
- **Google Gemini API Key** (AI chatbot için)

---

## 🔧 Adım 1: Projeyi Klonlama

```bash
# Projeyi klonla
git clone https://github.com/YOUR_USERNAME/kampus_plus.git
cd kampus_plus

# Develop branch'ine geç
git checkout develop
```

---

## 🐍 Adım 2: Backend Kurulumu

### 2.1. Virtual Environment Oluşturma

```bash
cd backend

# Windows için:
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS/Linux için:
python3 -m venv venv
source venv/bin/activate
```

### 2.2. Python Paketlerini Yükleme

```bash
pip install -r requirements.txt
```

### 2.3. Environment Variables Ayarlama

Backend klasöründe `.env` dosyası oluşturun:

```bash
# .env dosyası oluştur
New-Item -Path .env -ItemType File  # Windows
# veya
touch .env  # macOS/Linux
```

`.env` dosyasına aşağıdaki içeriği ekleyin:

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./kampus_plus_dev.db

# JWT Settings
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Provider (gemini or openai)
AI_PROVIDER=gemini

# Google Gemini API
GOOGLE_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=2048

# OpenAI API (opsiyonel, eğer OpenAI kullanacaksanız)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2048
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Vector Store
VECTOR_STORE_PATH=data/vectors
VECTOR_SEARCH_K=5

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Environment
ENVIRONMENT=development
```

> **ÖNEMLİ:** `GOOGLE_API_KEY` için kendi API anahtarınızı alın: https://makersuite.google.com/app/apikey

### 2.4. Veritabanını Oluşturma

```bash
# Alembic migration'ları çalıştır
alembic upgrade head
```

### 2.5. Test Kullanıcıları Oluşturma

```bash
# Seed data script'ini çalıştır (eğer varsa)
python scripts/seed_data.py

# VEYA manuel olarak instructor hesabı oluştur
python scripts/create_instructor.py
```

**Varsayılan Kullanıcılar:**
- 📧 `instructor@gidatarim.edu.tr` / 🔑 `instructor123!` (Instructor)
- 📧 `emre.kayacan@ogr.gidatarim.edu.tr` / 🔑 `test123!` (Student)

### 2.6. Vektör Veritabanını Doldurma

```bash
# Ders bilgilerini vektör veritabanına ekle
python scripts/populate_vectors.py
```

### 2.7. Backend'i Başlatma

```bash
uvicorn src.main:app --reload
```

✅ Backend şu adreste çalışacak: http://localhost:8000

---

## ⚛️ Adım 3: Frontend Kurulumu

Yeni bir terminal açın:

```bash
cd frontend

# Node paketlerini yükle
npm install

# Frontend'i başlat
npm run dev
```

✅ Frontend şu adreste çalışacak: http://localhost:5173

---

## 🧪 Adım 4: Test Etme

1. **Frontend'e git:** http://localhost:5173
2. **Giriş yap:**
   - Email: `instructor@gidatarim.edu.tr`
   - Şifre: `instructor123!`
3. **AI Chatbot'u test et:**
   - "MAT101 sınavı ne zaman?" gibi bir soru sor
   - Cevap alabiliyorsanız her şey çalışıyor! 🎉

---

## 🔄 Güncellemeleri Çekme

Projeye yeni özellikler eklendiğinde:

```bash
# En son değişiklikleri çek
git pull origin develop

# Backend paketlerini güncelle
cd backend
pip install -r requirements.txt

# Frontend paketlerini güncelle
cd ../frontend
npm install

# Veritabanı migration'larını çalıştır
cd ../backend
alembic upgrade head
```

---

## 🐛 Sık Karşılaşılan Sorunlar

### Problem: "ModuleNotFoundError: No module named 'google.generativeai'"

**Çözüm:**
```bash
cd backend
pip install google-generativeai
```

### Problem: "FAISS index file not found"

**Çözüm:**
```bash
cd backend
python scripts/populate_vectors.py
```

### Problem: "Database locked" hatası

**Çözüm:**
```bash
# Backend'i durdur (Ctrl+C)
# SQLite DB dosyasını sil
rm kampus_plus_dev.db  # macOS/Linux
Remove-Item kampus_plus_dev.db  # Windows

# Migration'ları tekrar çalıştır
alembic upgrade head
python scripts/create_instructor.py
python scripts/populate_vectors.py
```

### Problem: Frontend'de CORS hatası

**Çözüm:**
`.env` dosyasında `CORS_ORIGINS` ayarını kontrol edin:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 📁 Proje Yapısı

```
kampus_plus/
├── backend/
│   ├── src/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security, database
│   │   ├── models/       # SQLAlchemy models
│   │   └── services/     # Business logic
│   ├── scripts/          # Utility scripts
│   ├── data/vectors/     # FAISS vector store
│   ├── alembic/          # Database migrations
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   └── services/     # API services
│   └── package.json      # Node dependencies
└── SETUP_GUIDE.md        # Bu dosya
```

---

## 🤝 Geliştirme Workflow'u

1. **Yeni feature için branch oluştur:**
   ```bash
   git checkout -b feature/yeni-ozellik
   ```

2. **Değişiklikleri yap ve commit et:**
   ```bash
   git add .
   git commit -m "feat: yeni özellik eklendi"
   ```

3. **Push et:**
   ```bash
   git push origin feature/yeni-ozellik
   ```

4. **Pull Request oluştur** (GitHub'da)

---

## 📞 Yardım

Sorun yaşarsanız:
1. Bu rehberi tekrar okuyun
2. GitHub Issues'a bakın
3. Takım liderinize sorun

---

## 🎉 Başarılar!

Artık projeyi kendi bilgisayarınızda çalıştırabilirsiniz. İyi kodlamalar! 🚀
