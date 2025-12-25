# 🔧 Sorun Giderme Rehberi

Bu dokümanda sık karşılaşılan sorunlar ve çözümleri bulabilirsiniz.

## 📄 PDF Yükleme Çalışmıyor

### Problem
PDF dosyası yüklemeye çalıştığınızda hata alıyorsunuz veya yükleme işlemi başarısız oluyor.

### Neden Oluyor?
PDF yükleme özelliği **MinIO** (S3-compatible storage) kullanır. MinIO servisi çalışmıyorsa veya `.env` dosyanızda MinIO ayarları eksikse PDF yükleyemezsiniz.

### ✅ Çözüm 1: Docker Kullanıyorsanız (Önerilen)

Docker-compose otomatik olarak MinIO'yu başlatır. Sadece `.env` dosyanızı kontrol edin:

```bash
cd backend
```

`backend/.env` dosyasını açın ve şu satırların **doğru** olduğundan emin olun:

```env
# MinIO Ayarları (Docker için)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_BUCKET=kampus-plus-documents
AWS_REGION=eu-central-1
```

> ⚠️ **ÖNEMLİ:** `AWS_S3_ENDPOINT_URL=http://minio:9000` olmalı (localhost DEĞİL!)

Ardından servisleri yeniden başlatın:

```bash
docker-compose down
docker-compose up --build
```

MinIO console'a erişebilirsiniz: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin123`

### ✅ Çözüm 2: Manuel Kurulum Kullanıyorsanız

MinIO'yu ayrı olarak başlatmanız gerekir:

```bash
# MinIO'yu Docker ile başlat
docker run -d \
  --name kampus-minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 \
  minio/minio server /data --console-address ":9001"
```

`backend/.env` dosyanızda:

```env
# MinIO Ayarları (Manuel kurulum için)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
AWS_S3_ENDPOINT_URL=http://localhost:9000  # Manuel kurulumda localhost
AWS_S3_BUCKET=kampus-plus-documents
AWS_REGION=eu-central-1
```

Backend'i yeniden başlatın:

```bash
cd backend
python -m uvicorn src.main:app --reload
```

### 🧪 Test Etme

1. Frontend'e giriş yapın: http://localhost:5173
2. Bir PDF dosyası yüklemeyi deneyin
3. Başarılı olursa tamamdır! 🎉

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
`no such table` veya `relation does not exist` gibi hatalar alıyorsunuz.

### ✅ Çözüm: Migration ve Seed Verileri

```bash
cd backend

# Migrations çalıştır
python -m alembic upgrade head

# Test verilerini yükle
python scripts/seed_data.py
python scripts/populate_vectors.py
```

Docker kullanıyorsanız:

```bash
docker-compose down -v  # Tüm volumes'ları sil
docker-compose up --build  # Sıfırdan başlat
```

---

## 🌐 Frontend Backend'e Bağlanamıyor

### Problem
Frontend API istekleri gönderiyor ama cevap alamıyor.

### ✅ Çözüm: CORS ve URL Kontrolü

1. Backend'in çalıştığından emin olun: http://localhost:8000/docs
2. `frontend/.env` dosyasını kontrol edin:

```env
VITE_API_URL=http://localhost:8000/v1
```

3. Backend'in CORS ayarlarını kontrol edin ([src/main.py](backend/src/main.py#L30-L40))

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

```powershell
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
```

Veya `docker-compose.yml` dosyasında port'u değiştirin.

### Container Başlatılamıyor

```bash
# Tüm container'ları ve volumes'ları temizle
docker-compose down -v
docker system prune -a

# Yeniden başlat
docker-compose up --build
```

---

## 📞 Hala Sorun mu Var?

1. **Logları kontrol edin:**
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. **Issue açın:** GitHub repo'da detaylı açıklama ile issue oluşturun

3. **Dokümantasyonu inceleyin:**
   - [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)
   - [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)
   - [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

**Son Güncelleme:** 2025-12-25
