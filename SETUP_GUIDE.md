# 🚀 Kampus Plus - Kurulum Rehberi

Bu rehber, projeyi kendi bilgisayarınızda çalıştırmak için gereken tüm adımları içerir.

## 📋 Gereksinimler

- **Python 3.11+** (backend)
- **Node.js 18+** ve npm (frontend)
- **Google Gemini API Key** ([buradan alın](https://makersuite.google.com/app/apikey))

---

## ⚡ Hızlı Kurulum (5 Dakika)

### 1️⃣ Projeyi Klonla

```bash
git clone https://github.com/frambuaz-crew/kampus_plus.git
cd kampus_plus
git checkout develop
```


### 2️⃣ Backend Kurulumu

```bash
cd backend

# Virtual environment oluştur ve aktifleştir
python -m venv venv

# Windows:
.\venv\Scripts\Activate.ps1

# macOS/Linux:
source venv/bin/activate

# Paketleri yükle
pip install -r requirements.txt
```

### 3️⃣ Environment Variables (.env) Ayarla

```bash
# .env.example dosyasını kopyala
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux
```

`backend/.env` dosyasını aç ve **sadece şu satırı değiştir**:

```env
GOOGLE_API_KEY=buraya-kendi-api-keyini-yapistir
```

> 💡 **API Key Nasıl Alınır?**
> 1. https://makersuite.google.com/app/apikey adresine git
> 2. "Create API Key" butonuna tıkla
> 3. Oluşan key'i kopyala ve .env dosyasına yapıştır

### 4️⃣ Veritabanını Hazırla

```bash
# Migration'ları çalıştır
python -m alembic upgrade head

# Test kullanıcıları oluştur
python scripts/seed_data.py
```

**Oluşturulan Test Kullanıcıları:**

| Email | Şifre | Rol |
|-------|-------|-----|
| `student1@university.edu.tr` | `Student123!` | Öğrenci |
| `student2@university.edu.tr` | `Student123!` | Öğrenci |
| `instructor@university.edu.tr` | `Instructor123!` | Eğitmen |
| `admin@university.edu.tr` | `Admin123!` | Admin |

### 5️⃣ Backend'i Başlat

```bash
python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

✅ Backend çalışıyor: **http://127.0.0.1:8000**

---

### 6️⃣ Frontend Kurulumu (Yeni Terminal)

```bash
cd frontend

# .env dosyasını kopyala
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux

# Paketleri yükle
npm install

# Frontend'i başlat
npm run dev
```

✅ Frontend çalışıyor: **http://localhost:5173**

---

## 🧪 Test Et

1. Tarayıcıda **http://localhost:5173** adresine git
2. Yukarıdaki tablodaki kullanıcılardan biriyle giriş yap
3. AI chatbot'a bir soru sor: "Merhaba!"

Cevap alıyorsan, **her şey çalışıyor!** 🎉

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
python -m alembic upgrade head
```


## 🐛 Sık Karşılaşılan Sorunlar

### ❌ Backend'e bağlanamıyorum

**Kontrol Et:**
- Backend terminali çalışıyor mu?
- `http://127.0.0.1:8000` adresine git → JSON yanıt görmelisin
- `backend/.env` dosyasında `GOOGLE_API_KEY` doğru mu?

**Çözüm:**
```bash
# Backend'i yeniden başlat
cd backend
python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

---

### ❌ ModuleNotFoundError: No module named 'langchain_google_genai'

**Çözüm:**
```bash
cd backend
# Virtual environment aktif mi kontrol et
pip install -r requirements.txt
```

---

### ❌ FAISS index file not found

**Çözüm:**
```bash
cd backend
python scripts/populate_vectors.py
```

---

### ❌ Database locked / Alembic hatası

**Çözüm:**
```bash
cd backend
# Backend'i durdur (Ctrl+C)

# SQLite dosyasını sil
Remove-Item kampus_plus_dev.db  # Windows
rm kampus_plus_dev.db           # macOS/Linux

# Yeniden oluştur
python -m alembic upgrade head
python scripts/seed_data.py
```

---

### ❌ Frontend CORS hatası / Network Error

**Kontrol Et:**
1. Backend çalışıyor mu? (`http://127.0.0.1:8000`)
2. `frontend/.env` dosyası var mı?

**Çözüm:**
```bash
cd frontend
# .env dosyasını kontrol et
cat .env  # macOS/Linux
type .env # Windows

# Doğru içerik:
# VITE_API_URL=http://127.0.0.1:8000/v1

# Frontend'i yeniden başlat
npm run dev
```

---

### ❌ "alembic: command not found"

**Çözüm:**
```bash
# Her zaman python -m kullan
python -m alembic upgrade head
```

---

## 📁 Proje Yapısı

```
kampus_plus/
├── backend/
│   ├── src/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Config, security, database
│   │   ├── models/          # SQLAlchemy models
│   │   └── services/        # Business logic
│   ├── scripts/             # Utility scripts (seed, populate)
│   ├── data/vectors/        # FAISS vector stores
│   ├── alembic/versions/    # Database migrations
│   ├── .env.example         # Environment variables template
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts (Auth)
│   │   └── api/             # API client (axios)
│   ├── .env.example         # Frontend env template
│   └── package.json         # Node dependencies
├── .gitignore               # Ignored files (.env, venv, *.db)
└── SETUP_GUIDE.md           # Bu dosya
```

---

## 🤝 Geliştirme Workflow'u

### Yeni Feature Eklemek

```bash
# 1. Yeni branch oluştur
git checkout -b feature/yeni-ozellik

# 2. Değişikliklerini yap

# 3. Commit et
git add .
git commit -m "feat: yeni özellik eklendi"

# 4. Push et
git push origin feature/yeni-ozellik

# 5. GitHub'da Pull Request oluştur
```

### Commit Mesaj Formatı

```
feat: yeni özellik eklendi
fix: bug düzeltildi
docs: dokümantasyon güncellendi
style: kod formatı düzenlendi
refactor: kod yeniden yapılandırıldı
test: test eklendi
chore: konfigürasyon değişti
```

---

## 🔒 Güvenlik Notları

### ⚠️ GitHub'a Pushlamamanız Gerekenler:

- ✅ `.env` dosyaları (`.gitignore`'da)
- ✅ `venv/` klasörü (`.gitignore`'da)
- ✅ `*.db` dosyaları (`.gitignore`'da)
- ✅ `node_modules/` (`.gitignore`'da)
- ✅ API keys, şifreler

### ✅ GitHub'a Pushlanması Gerekenler:

- `.env.example` dosyaları (hassas bilgi içermez)
- Kaynak kodlar
- Migration dosyaları
- Dokümantasyon

---

## 📞 Yardım

**Sorun mu yaşıyorsun?**

1. Bu rehberi tekrar oku
2. "Sık Karşılaşılan Sorunlar" bölümüne bak
3. GitHub Issues'a bak: https://github.com/frambuaz-crew/kampus_plus/issues
4. Takım liderine sor

---

## 🎉 Başarılar!

Artık projeyi kendi bilgisayarında çalıştırabilirsin. İyi kodlamalar! 🚀

---

**Son Güncelleme:** 30 Kasım 2025
