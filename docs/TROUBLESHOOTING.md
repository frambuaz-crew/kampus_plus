# 🔧 Sorun Giderme Rehberi

Bu dokümanda sık karşılaşılan sorunlar ve çözümleri bulabilirsiniz.

## 📄 Dosya Yükleme Çalışmıyor

### Problem
PDF veya resim dosyası yüklemeye çalıştığınızda hata alıyorsunuz veya yükleme işlemi başarısız oluyor.

### Neden Oluyor?
Bu proje **local storage** kullanır (MinIO/S3 değil). Tüm dosyalar `backend/uploads/` klasöründe saklanır. Bu klasör yoksa veya yazma izni yoksa dosya yükleyemezsiniz.

### ✅ Çözüm 1: Docker Kullanıyorsanız (Önerilen)

Docker-compose otomatik olarak `uploads/` klasörünü oluşturur ve mount eder. Sadece klasörün var olduğundan emin olun:

```bash
# Proje root'unda
ls -la backend/uploads
```

Eğer klasör yoksa oluşturun:

```bash
mkdir -p backend/uploads
chmod 755 backend/uploads
```

Ardından servisleri yeniden başlatın:

```bash
docker-compose down
docker-compose up --build
```

### ✅ Çözüm 2: Manuel Kurulum Kullanıyorsanız

`backend/uploads/` klasörünü oluşturun:

```bash
cd backend
mkdir -p uploads
chmod 755 uploads
```

Backend'i yeniden başlatın:

```bash
python -m uvicorn src.main:app --reload
```

### ✅ Çözüm 3: İzin Sorunları

Eğer "Permission denied" hatası alıyorsanız:

**Linux/Mac:**
```bash
chmod -R 755 backend/uploads
```

**Windows:**
- Klasöre sağ tıklayın → Properties → Security
- "Users" grubuna "Full control" verin

### 🧪 Test Etme

1. Frontend'e giriş yapın: http://localhost:5173
2. Bir dosya (PDF, resim) yüklemeyi deneyin
3. Dosya `backend/uploads/` klasöründe görünmeli
4. Başarılı olursa tamamdır! 🎉

### 📝 Notlar

- Dosyalar şu formatta saklanır: `uploads/{category}/{user_id}/{resource_id}/{filename}`
- Kategoriler: `marketplace`, `forum`, `profiles`, `academic`
- Dosyalar backend sunucusunun disk'inde saklanır (cloud storage yok)

---

## 🤖 AI Chatbot Cevap Vermiyor

### Problem
AI chatbot'a mesaj gönderdiğinizde hata alıyorsunuz veya cevap alamıyorsunuz.

### ✅ Çözüm: Google Gemini API Key Kontrolü

`backend/.env` dosyasını kontrol edin:

```env
GOOGLE_API_KEY=AIzaSy...  # Gerçek API key'iniz olmalı
AI_PROVIDER=gemini
```

API key almak için: https://makersuite.google.com/app/apikey

---

## 🗄️ Veritabanı Hataları

### Problem
`no such table` veya `database is locked` gibi hatalar alıyorsunuz.

### Neden Oluyor?
Bu proje **SQLite** kullanır (PostgreSQL değil). Veritabanı dosyası `backend/kampus_plus.db` olarak saklanır. Migration'lar çalışmamışsa veya veritabanı dosyası bozuksa hata alırsınız.

### ✅ Çözüm 1: Migration ve Seed Verileri

```bash
cd backend

# Migrations çalıştır
python -m alembic upgrade head

# Test verilerini yükle
python scripts/seed_data.py
python scripts/populate_vectors.py
```

### ✅ Çözüm 2: Docker Kullanıyorsanız

Docker-compose otomatik olarak migration'ları çalıştırır. Eğer sorun varsa:

```bash
# Tüm volumes'ları sil ve sıfırdan başlat
docker-compose down -v
docker-compose up --build
```

### ✅ Çözüm 3: Veritabanı Dosyası Bozuksa

SQLite veritabanı dosyası bozulmuş olabilir:

```bash
cd backend

# Eski veritabanını yedekle
cp kampus_plus.db kampus_plus.db.backup

# Yeni veritabanı oluştur
rm kampus_plus.db kampus_plus.db-shm kampus_plus.db-wal

# Migration'ları tekrar çalıştır
python -m alembic upgrade head
python scripts/seed_data.py
```

### ✅ Çözüm 4: "Database is locked" Hatası

SQLite WAL (Write-Ahead Logging) modu kullanılır, ancak bazen lock sorunları olabilir:

```bash
# Tüm backend process'lerini durdurun
# Sonra tekrar başlatın
docker-compose restart backend
```

Veya manuel kurulumda:

```bash
# Backend'i durdurun (Ctrl+C)
# Veritabanı lock dosyalarını temizleyin
rm -f backend/kampus_plus.db-shm backend/kampus_plus.db-wal
# Backend'i tekrar başlatın
```

### 📝 Notlar

- Veritabanı dosyası: `backend/kampus_plus.db`
- WAL dosyaları: `kampus_plus.db-shm`, `kampus_plus.db-wal` (otomatik oluşur)
- SQLite WAL modu concurrent reads/writes destekler

---

## 🌐 Frontend Backend'e Bağlanamıyor

### Problem
Frontend API istekleri gönderiyor ama cevap alamıyor veya CORS hatası alıyorsunuz.

### ✅ Çözüm 1: Backend Çalışıyor mu?

Backend'in çalıştığını kontrol edin:

```bash
# Health check endpoint'ini test edin
curl http://localhost:8000/health
```

Veya tarayıcıda: http://localhost:8000/docs

### ✅ Çözüm 2: Frontend Environment Variables

`frontend/.env` dosyasını kontrol edin:

```env
# Development için
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

> ⚠️ **ÖNEMLİ:** API URL `/api/v1` ile bitmeli (sadece `/v1` değil)!

> ⚠️ **ÖNEMLİ:** Vite environment variable'ları `VITE_` ile başlamalı!

Docker kullanıyorsanız, `docker-compose.yml` dosyasında `VITE_API_URL` doğru ayarlanmış olmalı.

### ✅ Çözüm 3: CORS Ayarları

Backend'in CORS ayarlarını kontrol edin (`backend/src/main.py`):

```python
# CORS middleware doğru ayarlanmış olmalı
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### ✅ Çözüm 4: Port Çakışması

Port 8000 veya 5173 zaten kullanılıyor olabilir:

**Windows PowerShell:**
```powershell
# Port 8000'i kullanan process'i bul
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess

# Port 5173'i kullanan process'i bul
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess
```

**Linux/Mac:**
```bash
lsof -i :8000
lsof -i :5173
```

### ✅ Çözüm 5: Docker Network

Docker kullanıyorsanız, frontend ve backend aynı network'te olmalı:

```bash
docker-compose ps  # Container'ların çalıştığını kontrol edin
docker network ls  # kampus-network var mı kontrol edin
```

---

## 🔑 JWT Token Hataları

### Problem
"Invalid token" veya "Token expired" hataları alıyorsunuz.

### ✅ Çözüm: Secret Key Kontrolü

`backend/.env` dosyasında:

```env
JWT_SECRET_KEY=en-az-32-karakter-uzunlugunda-gizli-anahtar
```

Yeni bir secret key oluşturun:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🐳 Docker Sorunları

### "Port already in use" Hatası

Port zaten kullanılıyor. Çakışan servisi durdurun:

**Windows PowerShell:**
```powershell
# Port 8000'i kullanan process'i durdur
$process = Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess
Stop-Process -Id $process.Id -Force

# Port 5173'i kullanan process'i durdur
$process = Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess
Stop-Process -Id $process.Id -Force
```

**Linux/Mac:**
```bash
# Port 8000'i kullanan process'i bul ve durdur
kill $(lsof -t -i:8000)

# Port 5173'i kullanan process'i bul ve durdur
kill $(lsof -t -i:5173)
```

Veya `docker-compose.yml` dosyasında port'u değiştirin:

```yaml
ports:
  - "8001:8000"  # 8000 yerine 8001 kullan
```

### Container Başlatılamıyor

```bash
# Tüm container'ları ve volumes'ları temizle
docker-compose down -v

# İsteğe bağlı: Tüm kullanılmayan Docker kaynaklarını temizle
docker system prune -a

# Yeniden başlat
docker-compose up --build
```

### Container Logları Kontrol Etme

Hata mesajlarını görmek için:

```bash
# Backend logları
docker-compose logs backend

# Frontend logları
docker-compose logs frontend

# Tüm loglar (son 100 satır)
docker-compose logs --tail=100

# Canlı log takibi
docker-compose logs -f
```

### Volume Mount Sorunları

Eğer dosya değişiklikleri container'a yansımıyorsa:

```bash
# Volume'ları kontrol edin
docker volume ls

# Container içindeki dosyaları kontrol edin
docker exec -it kampus-backend ls -la /app/uploads
docker exec -it kampus-backend ls -la /app/data
```

### Hot Reload Çalışmıyor

Development modunda hot reload çalışmıyorsa:

1. `docker-compose.yml` dosyasında volume mount'ları kontrol edin
2. Container'ı yeniden başlatın: `docker-compose restart backend`
3. Vite dev server'ı kontrol edin: `docker-compose logs frontend`

---

## 📞 Hala Sorun mu Var?

1. **Logları kontrol edin:**
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. **Issue açın:** GitHub repo'da detaylı açıklama ile issue oluşturun

3. **Dokümantasyonu inceleyin:**
   - [DOCKER_SETUP.md](./docs/DOCKER_SETUP.md)
   - [TEST_USERS.md](./docs/TEST_USERS.md)
   - [README.md](../README.md)

---

## 📋 Ek Sorunlar

### Vector Store Çalışmıyor

FAISS vector index dosyaları oluşturulmamış olabilir:

```bash
cd backend

# Vector store'u başlat
python scripts/init_faiss.py

# Vector store'u doldur
python scripts/populate_vectors.py
```

Docker kullanıyorsanız:

```bash
docker exec -it kampus-backend python scripts/init_faiss.py
docker exec -it kampus-backend python scripts/populate_vectors.py
```

### Email Gönderilemiyor

Email servisi çalışmıyorsa, `backend/.env` dosyasında email ayarlarını kontrol edin:

```env
# Email ayarları (opsiyonel - development için gerekli değil)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@kampusplus.edu.tr
```

> ⚠️ **Not:** Development modunda email gönderimi opsiyoneldir. Email servisi yapılandırılmamışsa, email doğrulama linkleri console'a yazdırılır.

### Environment Variables Yüklenmiyor

`.env` dosyası doğru konumda olmalı:

- Backend: `backend/.env`
- Frontend: `frontend/.env`

Docker kullanıyorsanız, `docker-compose.yml` dosyasında `env_file` ayarlarını kontrol edin.

---

**Son Güncelleme:** 2025-01-XX
