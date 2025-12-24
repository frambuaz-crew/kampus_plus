# 🚀 Kampus Plus - Kurulum Rehberi

Projeyi kendi bilgisayarında çalıştırmak için **2 yöntem** var:

1. 🐳 **Docker** (Önerilen - 2 dakika)
2. 🛠️ **Manuel Kurulum** (5 dakika)

---

## 📋 Gereksinimler

### Docker Yöntemi (Önerilen)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac/Linux)
- **Google Gemini API Key** ([buradan al](https://makersuite.google.com/app/apikey))

### Manuel Yöntem
- **Python 3.11+**
- **Node.js 18+** ve npm
- **Google Gemini API Key**

---

## 🐳 Yöntem 1: Docker ile Kurulum (ÖNERİLEN)

Tüm takım aynı ortamda çalışır, sürüm karmaşası yok! ✨

### Adım 1: Projeyi Klonla

```bash
git clone https://github.com/frambuaz-crew/kampus_plus.git
cd kampus_plus
git checkout develop
```

### Adım 2: .env Dosyasını Ayarla

```bash
# Backend .env dosyasını kopyala
cd backend
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux
```

`backend/.env` dosyasını aç ve **sadece şu satırı değiştir**:

```env
GOOGLE_API_KEY=buraya-kendi-api-keyini-yapistir
```

> 💡 **API Key Nasıl Alınır?**
> 1. https://makersuite.google.com/app/apikey → "Create API Key"
> 2. Oluşan key'i kopyala ve yapıştır

```bash
# Frontend .env dosyasını kopyala (root dizine dön)
cd ..
cd frontend
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux
cd ..
```

### Adım 3: Docker ile Başlat

```bash
# Tüm servisleri başlat (backend + frontend)
docker-compose up --build
```

**İlk çalıştırmada:**
- Docker image'lar indirilecek (~2-3 dakika)
- Paketler yüklenecek
- Veritabanı oluşturulacak
- Test kullanıcıları eklenecek

**✅ Hazır!**
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

**Test Kullanıcıları:**

| Email | Şifre | Rol |
|-------|-------|-----|
| `student1@university.edu.tr` | `Student123!` | Öğrenci |
| `instructor@university.edu.tr` | `Instructor123!` | Eğitmen |

### Adım 4: Test Et

1. http://localhost:5173 aç
2. Yukarıdaki kullanıcılardan biriyle giriş yap
3. AI chatbot'a "Merhaba!" yaz

Cevap alıyorsan **tamamdır!** 🎉

---

### Docker Komutları

```bash
# Servisleri başlat
docker-compose up

# Arka planda çalıştır
docker-compose up -d

# Logları izle
docker-compose logs -f

# Durdur
docker-compose down

# Sıfırdan başla (veritabanı dahil)
docker-compose down -v
docker-compose up --build
```

---

## 🛠️ Yöntem 2: Manuel Kurulum

Docker kullanmadan geliştirme yapmak istersen:

### 1️⃣ Projeyi Klonla

```bash
git clone https://github.com/frambuaz-crew/kampus_plus.git
cd kampus_plus
git checkout develop
```

### 2️⃣ Backend Kurulumu

```bash
cd backend

# Virtual environment oluştur
python -m venv venv

# Aktifleştir
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # macOS/Linux

# Paketleri yükle
pip install -r requirements.txt

# .env dosyasını ayarla
copy .env.example .env        # Windows
cp .env.example .env          # macOS/Linux
# .env dosyasında GOOGLE_API_KEY'i düzenle

# Veritabanını hazırla
python -m alembic upgrade head
python scripts/seed_data.py
python scripts/populate_vectors.py

# Backend'i başlat
python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

✅ Backend: http://127.0.0.1:8000

### 3️⃣ Frontend Kurulumu (Yeni Terminal)

```bash
cd frontend

# .env dosyasını ayarla
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux

# Paketleri yükle
npm install

# Frontend'i başlat
npm run dev
```

✅ Frontend: http://localhost:5173

---

## 💡 Geliştirme İpuçları

### Backend Testleri
```bash
cd backend
pytest                    # Tüm testler
pytest tests/unit        # Sadece unit testler
pytest -v --cov         # Coverage ile
```

### Frontend Testleri
```bash
cd frontend
npm test                 # Test modu
npm run test:coverage   # Coverage ile
```

### Database Migration
```bash
cd backend
python -m alembic upgrade head    # Migration uygula
python -m alembic revision -m "description"  # Yeni migration
```

### Health Check
```bash
# Backend sağlık kontrolü
curl http://localhost:8000/health

# Detaylı kontrol
curl http://localhost:8000/health/ready
```

---

## 🔄 Güncellemeleri Çekme

### Docker Kullanıyorsan
```bash
git pull origin develop
docker-compose down
docker-compose up --build
```

### Manuel Kurulum
```bash
# Değişiklikleri çek
git pull origin develop

# Backend güncelle
cd backend
pip install -r requirements.txt
python -m alembic upgrade head

# Frontend güncelle
cd ../frontend
npm install
```
```


## 🐛 Sık Karşılaşılan Sorunlar

### ❌ Docker: "Cannot connect to the Docker daemon"

**Çözüm:**
1. Docker Desktop'ı aç ve çalıştır
2. Docker Engine'in çalıştığını kontrol et
3. `docker-compose up` komutunu tekrar dene

---

### ❌ Docker: "port is already allocated"

**Çözüm:**
```bash
# 8000 veya 5173 portunu kullanan process'i bul
netstat -ano | findstr :8000   # Windows
lsof -i :8000                  # macOS/Linux

# Process'i sonlandır veya docker-compose.yml'de portu değiştir
```

---

### ❌ Backend Health Check Failed

**Kontrol Et:**
```bash
# Health endpoint'i kontrol et
curl http://localhost:8000/health
```

**Olası Sorunlar:**
- ✅ Database bağlantısı
- ✅ Gemini API key doğru mu
- ✅ Vector stores oluşturulmuş mu

**Çözüm:**
```bash
docker-compose exec backend python scripts/populate_vectors.py
docker-compose restart backend
```

---

### ❌ ModuleNotFoundError (Manuel Kurulum)

**Çözüm:**
```bash
cd backend
# Virtual environment aktif mi?
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # macOS/Linux

# Paketleri yeniden yükle
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
