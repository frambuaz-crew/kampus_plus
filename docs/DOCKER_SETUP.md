# 🐳 KAMPÜS+ Docker Kurulum Rehberi

**Versiyon:** 1.0  
**Son Güncelleme:** 5 Ocak 2026  
**Durum:** ✅ Production Ready

---

## 📋 İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Gereksinimler](#gereksinimler)
3. [Proje Yapısı](#proje-yapısı)
4. [İlk Kurulum Adımları](#ilk-kurulum-adımları)
5. [Container'ları Çalıştırma](#containerları-çalıştırma)
6. [Environment Variables](#environment-variables)
7. [Veritabanı İşlemleri](#veritabanı-işlemleri)
8. [Geliştirme Workflow](#geliştirme-workflow)
9. [Sorun Giderme](#sorun-giderme)
10. [Sık Kullanılan Komutlar](#sık-kullanılan-komutlar)

---

## 🚀 Hızlı Başlangıç

```bash
# 1. Projeyi klonlayın
git clone <repository-url>
cd kampus_plus

# 2. Backend .env dosyasını oluşturun
cd backend
cp .env.example .env  # Eğer varsa
# .env dosyasını düzenleyin (GOOGLE_API_KEY ve JWT_SECRET_KEY ekleyin)

# 3. Container'ları başlatın
cd ..
docker-compose up -d

# 4. Uygulamayı açın
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
```

---

## 🔧 Gereksinimler

### Zorunlu Yazılımlar

- **Docker Desktop** (v20.10+) veya **Docker Engine** + **Docker Compose**
  - Windows: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
  - macOS: [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
  - Linux: `sudo apt-get install docker.io docker-compose-plugin`

- **Git** - Versiyon kontrolü için

### Sistem Gereksinimleri

- **RAM:** Minimum 4GB (önerilen: 8GB+)
- **Disk:** Minimum 5GB boş alan
- **CPU:** 2+ core (önerilen)

### Docker Kurulumunu Kontrol Etme

```bash
# Docker versiyonunu kontrol et
docker --version
# Çıktı: Docker version 20.10.x veya üzeri olmalı

# Docker Compose versiyonunu kontrol et
docker compose version
# Çıktı: Docker Compose version v2.x.x olmalı

# Docker'ın çalıştığını kontrol et
docker ps
# Hata yoksa Docker çalışıyor demektir
```

---

## 📁 Proje Yapısı

```
kampus_plus/
├── backend/                    # Backend API (FastAPI)
│   ├── src/                    # Kaynak kod
│   │   ├── api/                # API routes
│   │   ├── core/               # Core utilities (database, security, config)
│   │   ├── models/             # SQLAlchemy modelleri
│   │   └── services/           # Business logic
│   ├── alembic/                # Database migrations
│   │   └── versions/           # Migration dosyaları
│   ├── scripts/                # Yardımcı scriptler
│   │   ├── seed_data.py        # Test kullanıcıları oluşturur
│   │   ├── fetch_yok_universities.py  # Üniversite verilerini çeker
│   │   └── ...
│   ├── data/                   # Vector store dosyaları (FAISS)
│   ├── uploads/                # Yüklenen dosyalar
│   ├── Dockerfile              # Backend Docker image
│   ├── requirements.txt        # Python bağımlılıkları
│   └── .env                    # Backend environment variables (oluşturulmalı)
│
├── frontend/                    # Frontend (React + Vite)
│   ├── src/                    # Kaynak kod
│   │   ├── api/                # API client
│   │   ├── components/         # React componentleri
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Sayfa componentleri
│   │   └── types/              # TypeScript type tanımları
│   ├── public/                 # Statik dosyalar
│   ├── Dockerfile              # Frontend Docker image
│   └── package.json            # Node.js bağımlılıkları
│
├── docs/                       # Dokümantasyon
│   ├── SETUP.md               # Genel kurulum rehberi
│   └── TEST_USERS.md          # Test kullanıcı bilgileri
│
├── specs/                      # Proje spesifikasyonları
├── docker-compose.yml          # Docker Compose yapılandırması
└── DOCKER_SETUP.md            # Bu dosya
```

---

## 🐳 Docker Container'ları

### 1. Backend Container (`kampus-backend`)

**Teknoloji Stack:**
- **Framework:** FastAPI (Python 3.11)
- **Database:** SQLite (WAL mode)
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **AI:** Google Gemini API
- **Vector Store:** FAISS

**Port:** `8000`  
**Health Check:** `http://localhost:8000/health`

**Otomatik İşlemler (Container başlatıldığında):**
1. ✅ Alembic migrations (`alembic upgrade head`)
2. ✅ Seed data oluşturma (`python scripts/seed_data.py`)
3. ✅ Vector store populate (`python scripts/populate_vectors.py`)
4. ✅ FastAPI server başlatma (`uvicorn src.main:app --reload`)

**Volumes (Veri Kalıcılığı):**
- `./backend/src:/app/src` - Source code (hot reload)
- `./backend/alembic:/app/alembic` - Migrations
- `./backend/data:/app/data` - Vector store dosyaları
- `./backend/uploads:/app/uploads` - Yüklenen dosyalar
- `backend_db:/app` - SQLite database (persistent volume)

### 2. Frontend Container (`kampus-frontend`)

**Teknoloji Stack:**
- **Framework:** React 19
- **Build Tool:** Vite 7
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v7

**Port:** `5173`  
**Dev Server:** Vite dev server (hot reload)

**Volumes:**
- `./frontend/src:/app/src` - Source code (hot reload)
- `./frontend/public:/app/public` - Public files
- `frontend_node_modules:/app/node_modules` - Dependencies (cached)

**Environment Variables:**
- `VITE_API_URL=http://localhost:8000/api/v1` - Backend API URL
- `NODE_ENV=development` - Development mode

---

## 📝 İlk Kurulum Adımları

### Adım 1: Projeyi Klonlayın

```bash
git clone <repository-url>
cd kampus_plus
```

### Adım 2: Backend Environment Variables

Backend için `.env` dosyası **ZORUNLUDUR**. Oluşturmanız gerekiyor:

```bash
cd backend

# .env dosyası oluşturun (eğer .env.example varsa kopyalayın)
# Windows:
copy .env.example .env
# Linux/Mac:
cp .env.example .env
```

**`.env` dosyasına eklemeniz gerekenler:**

```bash
# ============================================================================
# ZORUNLU AYARLAR
# ============================================================================

# Google Gemini API Key (AI Assistant için ZORUNLU)
# Nasıl alınır: https://makersuite.google.com/app/apikey
GOOGLE_API_KEY=your-gemini-api-key-here

# JWT Secret Key (Authentication için ZORUNLU)
# Minimum 32 karakter, güvenli bir string olmalı
# Oluşturma: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET_KEY=your-super-secret-key-min-32-characters-long

# ============================================================================
# VERİTABANI AYARLARI
# ============================================================================

# SQLite Database URL (varsayılan - değiştirmeyin)
DATABASE_URL=sqlite+aiosqlite:///./kampus_plus.db

# ============================================================================
# JWT AYARLARI
# ============================================================================

JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER_ME=30

# ============================================================================
# UYGULAMA AYARLARI
# ============================================================================

# Frontend URL (email linkleri için)
FRONTEND_URL=http://localhost:5173

# Environment
ENVIRONMENT=development
DEBUG=true

# ============================================================================
# CORS AYARLARI
# ============================================================================

# Frontend URL'leri (virgülle ayrılmış)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ============================================================================
# EMAIL AYARLARI (Opsiyonel - Development için)
# ============================================================================

# Mailhog kullanıyorsanız:
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@kampusplus.edu.tr
SMTP_FROM_NAME=KAMPÜS+ Platform

# ============================================================================
# AI AYARLARI
# ============================================================================

GEMINI_MODEL=models/gemini-2.5-flash
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=8192

# ============================================================================
# VECTOR STORE AYARLARI
# ============================================================================

VECTOR_STORE_PATH=./data/vectors
FAISS_INDEX_OFFICIAL=vdb_official.index
VECTOR_DIMENSION=768
VECTOR_SEARCH_K=5

# ============================================================================
# DOSYA YÜKLEME AYARLARI
# ============================================================================

UPLOAD_DIR=backend/uploads
MAX_UPLOAD_SIZE_MB=10
```

**Önemli Notlar:**

1. **Google Gemini API Key:**
   - https://makersuite.google.com/app/apikey adresinden alın
   - AI Assistant özelliği için zorunludur
   - Ücretsiz tier yeterlidir

2. **JWT Secret Key:**
   - Güvenli bir key oluşturun:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   - Veya online tool kullanabilirsiniz
   - **ASLA** commit etmeyin!

### Adım 3: Docker Container'larını Başlatın

```bash
# Proje root dizininde
docker-compose up -d
```

**İlk çalıştırmada:**
- Docker image'ları build edilir (5-10 dakika sürebilir)
- Backend container başlatılır
- Database migrations otomatik çalışır
- Seed data oluşturulur (test kullanıcıları)
- Vector store populate edilir
- Frontend container başlatılır (backend hazır olduktan sonra)

**Logları izlemek için:**
```bash
docker-compose logs -f
```

### Adım 4: Container Durumunu Kontrol Edin

```bash
# Container durumlarını görüntüle
docker-compose ps
```

**Beklenen Çıktı:**
```
NAME                STATUS          PORTS
kampus-backend      Up (healthy)    0.0.0.0:8000->8000/tcp
kampus-frontend     Up               0.0.0.0:5173->5173/tcp
```

**Eğer backend `unhealthy` görünüyorsa:**
```bash
# Logları kontrol edin
docker-compose logs backend

# Health check'i manuel test edin
curl http://localhost:8000/health
```

### Adım 5: Uygulamayı Test Edin

**Backend API:**
- Health Check: http://localhost:8000/health
- API Documentation (Swagger): http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

**Frontend:**
- Ana Sayfa: http://localhost:5173
- Login: http://localhost:5173/login
- Register: http://localhost:5173/register

**Test Kullanıcıları:**
- Öğrenci 1: `student1@selcuk.edu.tr` / `Student123!`
- Öğrenci 2: `student2@selcuk.edu.tr` / `Student123!`
- Admin: `admin@kampusplus.edu.tr` / `Admin123!`

Detaylı bilgi için: `docs/TEST_USERS.md`

---

## ▶️ Container'ları Çalıştırma

### Normal Başlatma (Background)

```bash
# Container'ları arka planda başlat
docker-compose up -d

# Logları izle
docker-compose logs -f

# Sadece backend logları
docker-compose logs -f backend

# Sadece frontend logları
docker-compose logs -f frontend
```

### Development Modu (Foreground)

```bash
# Logları terminalde görmek için
docker-compose up
```

### Container'ları Durdurma

```bash
# Container'ları durdur (veriler korunur)
docker-compose stop

# Container'ları durdur ve sil (veriler korunur)
docker-compose down

# Container'ları durdur, sil ve volume'ları temizle
# DİKKAT: Tüm veriler silinir (database, uploads, vb.)
docker-compose down -v
```

### Container'ları Yeniden Başlatma

```bash
# Container'ları yeniden başlat
docker-compose restart

# veya
docker-compose down
docker-compose up -d
```

### Container'ları Rebuild Etme

```bash
# Image'ları yeniden build et (kod değişikliklerinden sonra)
docker-compose build

# Cache olmadan rebuild (tam temiz build)
docker-compose build --no-cache

# Rebuild ve başlat
docker-compose up -d --build
```

---

## 🔐 Environment Variables

### Backend (.env)

**Zorunlu Değişkenler:**

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `GOOGLE_API_KEY` | Google Gemini API key (AI için) | `AIzaSy...` |
| `JWT_SECRET_KEY` | JWT token şifreleme anahtarı | `your-secret-key-32-chars-min` |

**Önemli Opsiyonel Değişkenler:**

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./kampus_plus.db` | Veritabanı URL'i |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL (email linkleri için) |
| `CORS_ORIGINS` | `http://localhost:5173` | CORS izin verilen origin'ler |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token süresi (dakika) |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token süresi (gün) |

### Frontend (docker-compose.yml)

Frontend environment variables `docker-compose.yml` içinde tanımlı:

```yaml
environment:
  - VITE_API_URL=http://localhost:8000/api/v1
  - NODE_ENV=development
```

**Değiştirmek için:**
1. `docker-compose.yml` dosyasını düzenleyin
2. Container'ı yeniden başlatın: `docker-compose restart frontend`

---

## 🗄️ Veritabanı İşlemleri

### SQLite Veritabanı

**Veritabanı Dosyası:**
- Konum: Container içinde `/app/kampus_plus.db`
- Host'ta: `backend/kampus_plus.db` (volume mount sayesinde)
- WAL Mode: Etkin (concurrent access için)

### Migration İşlemleri

**Yeni Migration Oluşturma:**
```bash
# Backend container'a gir
docker-compose exec backend bash

# Migration oluştur
alembic revision --autogenerate -m "migration_name"

# Migration'ı uygula
alembic upgrade head

# Container'tan çık
exit
```

**Migration'ı Geri Alma:**
```bash
docker-compose exec backend bash
alembic downgrade -1
exit
```

**Migration Geçmişi:**
```bash
docker-compose exec backend alembic history
```

**NOT:** Container başlatıldığında migrations otomatik çalışır.

### Veritabanını Sıfırlama

```bash
# Container'ı durdur
docker-compose down

# Veritabanı dosyasını sil
rm backend/kampus_plus.db*

# Container'ı yeniden başlat (migrations otomatik çalışır)
docker-compose up -d
```

### Veritabanını İnceleme

```bash
# SQLite CLI ile
docker-compose exec backend bash
sqlite3 kampus_plus.db

# Örnek sorgular:
.tables
SELECT * FROM users;
SELECT * FROM universities;
.quit
exit
```

### Seed Data (Test Kullanıcıları)

**Manuel olarak seed data oluşturma:**
```bash
docker-compose exec backend python scripts/seed_data.py
```

**Seed data içeriği:**
- 2 öğrenci kullanıcı
- 1 admin kullanıcı
- Tüm kullanıcılar email doğrulanmış (`is_verified=True`)

Detaylı bilgi: `docs/TEST_USERS.md`

---

## 💻 Geliştirme Workflow

### Backend Geliştirme

1. **Kodu Düzenle:**
   ```bash
   # Backend kodunu düzenle
   code backend/src/
   ```

2. **Hot Reload:**
   - FastAPI `--reload` flag'i ile otomatik restart
   - Kod değişiklikleri anında yansır
   - Logları izle: `docker-compose logs -f backend`

3. **API'yi Test Et:**
   - Swagger UI: http://localhost:8000/docs
   - veya Postman/curl kullan

4. **Yeni Bağımlılık Ekleme:**
   ```bash
   # requirements.txt'e ekle
   echo "new-package==1.0.0" >> backend/requirements.txt
   
   # Container'ı rebuild et
   docker-compose build backend
   docker-compose up -d backend
   ```

### Frontend Geliştirme

1. **Kodu Düzenle:**
   ```bash
   # Frontend kodunu düzenle
   code frontend/src/
   ```

2. **Hot Reload:**
   - Vite dev server otomatik olarak değişiklikleri algılar
   - Browser otomatik refresh
   - Logları izle: `docker-compose logs -f frontend`

3. **Yeni Bağımlılık Ekleme:**
   ```bash
   # package.json'a ekle (veya npm install kullan)
   # Container'ı rebuild et
   docker-compose build frontend
   docker-compose up -d frontend
   ```

### Test Çalıştırma

**Backend Tests:**
```bash
docker-compose exec backend pytest
```

**Frontend Tests:**
```bash
docker-compose exec frontend npm test
```

---

## 🔧 Sorun Giderme

### Problem 1: Container Başlamıyor

**Belirtiler:**
- `docker-compose ps` komutu container'ları `Exited` veya `Restarting` gösteriyor

**Çözüm:**
```bash
# Logları kontrol et
docker-compose logs backend
docker-compose logs frontend

# En son 50 satır log
docker-compose logs --tail=50 backend

# Container'ı manuel başlat ve logları izle
docker-compose up backend
```

### Problem 2: Port Zaten Kullanılıyor

**Belirtiler:**
- `Error: bind: address already in use`
- `Port 8000 is already in use`

**Çözüm:**
```bash
# Port'u kullanan process'i bul
# Windows:
netstat -ano | findstr :8000

# Linux/Mac:
lsof -i :8000

# Process'i durdur veya docker-compose.yml'de port'u değiştir
# Örnek: "8001:8000" (host:container)
```

### Problem 3: Backend Health Check Başarısız

**Belirtiler:**
- Backend container `unhealthy` durumunda
- Frontend başlamıyor (backend'e bağımlı)

**Çözüm:**
```bash
# Health check endpoint'ini manuel test et
curl http://localhost:8000/health

# Backend loglarını kontrol et
docker-compose logs backend

# Container'ı yeniden başlat
docker-compose restart backend

# Eğer hala çalışmıyorsa, .env dosyasını kontrol et
cat backend/.env
```

### Problem 4: Frontend Backend'e Bağlanamıyor

**Belirtiler:**
- Frontend'de API çağrıları başarısız
- Network error veya CORS hatası

**Çözüm:**
```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:8000/health

# CORS ayarlarını kontrol et (backend/.env)
cat backend/.env | grep CORS

# Frontend environment variable'ını kontrol et
docker-compose exec frontend env | grep VITE_API_URL

# Browser console'da hata mesajlarını kontrol et (F12)
```

### Problem 5: Database Lock Hatası

**Belirtiler:**
- `database is locked` hatası
- Migration'lar çalışmıyor

**Çözüm:**
```bash
# WAL mode'un etkin olduğunu kontrol et
docker-compose exec backend bash
sqlite3 kampus_plus.db "PRAGMA journal_mode;"
# Çıktı: wal olmalı

# Eğer değilse, WAL mode'u etkinleştir
sqlite3 kampus_plus.db "PRAGMA journal_mode=WAL;"
exit
```

### Problem 6: Hot Reload Çalışmıyor

**Belirtiler:**
- Kod değişiklikleri container'a yansımıyor
- Manuel restart gerekiyor

**Çözüm:**
```bash
# Volume mount'ların doğru olduğunu kontrol et
docker-compose config

# Container'ı yeniden başlat
docker-compose restart backend
docker-compose restart frontend

# Eğer hala çalışmıyorsa, rebuild et
docker-compose up -d --build
```

### Problem 7: Vector Store Bulunamıyor

**Belirtiler:**
- `FAISS index not found` hatası
- AI Assistant çalışmıyor

**Çözüm:**
```bash
# Vector store'u initialize et
docker-compose exec backend python scripts/init_faiss.py

# Vector store'u populate et
docker-compose exec backend python scripts/populate_vectors.py
```

### Problem 8: Seed Data Oluşturulmadı

**Belirtiler:**
- Test kullanıcıları ile giriş yapılamıyor

**Çözüm:**
```bash
# Seed script'i manuel çalıştır
docker-compose exec backend python scripts/seed_data.py

# Kullanıcıları kontrol et
docker-compose exec backend bash
sqlite3 kampus_plus.db "SELECT email, role, is_verified FROM users;"
exit
```

---

## 📊 Sık Kullanılan Komutlar

### Container Yönetimi

```bash
# Container'ları başlat
docker-compose up -d

# Container'ları durdur
docker-compose stop

# Container'ları durdur ve sil
docker-compose down

# Container'ları yeniden başlat
docker-compose restart

# Container durumunu görüntüle
docker-compose ps

# Container'ları rebuild et
docker-compose build

# Rebuild ve başlat
docker-compose up -d --build
```

### Log İzleme

```bash
# Tüm loglar
docker-compose logs -f

# Sadece backend logları
docker-compose logs -f backend

# Sadece frontend logları
docker-compose logs -f frontend

# Son 100 satır
docker-compose logs --tail=100

# Belirli bir container'ın logları
docker logs kampus-backend
docker logs kampus-frontend
```

### Container İçine Girme

```bash
# Backend container'a gir
docker-compose exec backend bash

# Frontend container'a gir
docker-compose exec frontend sh

# Python shell (backend)
docker-compose exec backend python

# SQLite CLI (backend)
docker-compose exec backend sqlite3 kampus_plus.db
```

### Veritabanı İşlemleri

```bash
# Migration oluştur
docker-compose exec backend alembic revision --autogenerate -m "migration_name"

# Migration uygula
docker-compose exec backend alembic upgrade head

# Migration geri al
docker-compose exec backend alembic downgrade -1

# Migration geçmişi
docker-compose exec backend alembic history

# Seed data oluştur
docker-compose exec backend python scripts/seed_data.py
```

### Script Çalıştırma

```bash
# Üniversite verilerini çek
docker-compose exec backend python scripts/fetch_yok_universities.py

# Vector store initialize
docker-compose exec backend python scripts/init_faiss.py

# Vector store populate
docker-compose exec backend python scripts/populate_vectors.py
```

### Temizlik

```bash
# Container'ları durdur ve sil
docker-compose down

# Volume'ları da sil (DİKKAT: Veriler silinir!)
docker-compose down -v

# Kullanılmayan image'ları sil
docker image prune

# Kullanılmayan volume'ları sil
docker volume prune

# Her şeyi temizle (DİKKAT!)
docker system prune -a
```

### Container İstatistikleri

```bash
# Tüm container'ların kaynak kullanımı
docker stats

# Belirli container'ları izle
docker stats kampus-backend kampus-frontend
```

---

## 📝 Önemli Notlar

### 1. SQLite Kullanımı

- Bu proje **mezuniyet projesi** için SQLite kullanır
- WAL mode etkin (concurrent access için)
- Production için PostgreSQL'e geçilebilir
- Veritabanı dosyası: `backend/kampus_plus.db`

### 2. Local File Storage

- Tüm dosyalar `backend/uploads/` klasöründe saklanır
- S3, MinIO veya cloud storage kullanılmaz
- Docker volume ile persist edilir
- Production için cloud storage'a geçilebilir

### 3. Hot Reload

- Development modunda hem backend hem frontend hot reload destekler
- Kod değişiklikleri anında yansır
- Container restart gerekmez

### 4. Health Checks

- Backend health check: `/health` endpoint
- Frontend backend'in healthy olmasını bekler
- Health check başarısız olursa frontend başlamaz

### 5. Environment Variables

- Backend `.env` dosyası **ZORUNLUDUR**
- Frontend environment variables `docker-compose.yml` içinde tanımlı
- `.env` dosyasını **ASLA** commit etmeyin!

### 6. Port Mapping

- Backend: `8000:8000` (host:container)
- Frontend: `5173:5173` (host:container)
- Port çakışması varsa `docker-compose.yml`'de değiştirin

### 7. Volume Mounts

- Source code volume'ları hot reload için mount edilir
- `node_modules` container'da kalır (performans)
- Database ve uploads persistent volume'larda saklanır

---

## 🆘 Yardım ve Destek

### Sorun mu Yaşıyorsunuz?

1. **Logları kontrol edin:**
   ```bash
   docker-compose logs -f
   ```

2. **Container durumunu kontrol edin:**
   ```bash
   docker-compose ps
   ```

3. **Health check'leri test edin:**
   ```bash
   curl http://localhost:8000/health
   ```

4. **Container'ları yeniden başlatın:**
   ```bash
   docker-compose restart
   ```

5. **Rebuild edin:**
   ```bash
   docker-compose up -d --build
   ```

### Daha Fazla Bilgi

- **Backend README:** `backend/README.md` (varsa)`
- **Frontend README:** `frontend/README.md`
- **Genel Setup:** `docs/SETUP.md`
- **Test Kullanıcıları:** `docs/TEST_USERS.md`
- **System Overview:** `specs/SYSTEM_OVERVIEW.md`

---

## ✅ Kurulum Kontrol Listesi

Kurulumun başarılı olduğunu doğrulamak için:

- [ ] Docker ve Docker Compose kurulu ve çalışıyor
- [ ] `backend/.env` dosyası oluşturuldu
- [ ] `GOOGLE_API_KEY` `.env` dosyasına eklendi
- [ ] `JWT_SECRET_KEY` `.env` dosyasına eklendi
- [ ] `docker-compose up -d` başarıyla çalıştı
- [ ] Backend container `healthy` durumunda
- [ ] Frontend container çalışıyor
- [ ] http://localhost:8000/health çalışıyor
- [ ] http://localhost:8000/docs açılıyor
- [ ] http://localhost:5173 açılıyor
- [ ] Test kullanıcıları ile giriş yapılabiliyor

---

**Son Güncelleme:** 5 Ocak 2026  
**Versiyon:** 1.0  
**Hazırlayan:** KAMPÜS+ Development Team

