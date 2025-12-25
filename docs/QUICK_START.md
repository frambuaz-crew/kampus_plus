# ⚡ Quick Start - 2 Dakika

Projeyi çalıştırmak için **sadece 3 adım**:

## 1️⃣ Clone

```bash
git clone https://github.com/frambuaz-crew/kampus_plus.git
cd kampus_plus
git checkout develop
```

## 2️⃣ .env Ayarla

```bash
# Backend .env
cd backend
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux
```

`backend/.env` dosyasını aç ve **GOOGLE_API_KEY**'i değiştir:

```env
GOOGLE_API_KEY=buraya-kendi-api-keyini-yapistir

# MinIO credentials (Docker için - değiştirmeyin!)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
AWS_S3_ENDPOINT_URL=http://minio:9000
```

> 💡 API Key: https://makersuite.google.com/app/apikey  
> ⚠️ MinIO ayarlarına dokunmayın - Docker otomatik halleder!

```bash
# Frontend .env
cd ../frontend
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux
cd ..
```

## 3️⃣ Başlat

```bash
docker-compose up --build
```

**✅ Hazır!**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)

**Test Kullanıcısı:**
- Email: `student1@university.edu.tr`
- Şifre: `Student123!`

---

**Sorun mu yaşıyorsun?** → [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) | [SETUP_GUIDE.md](./SETUP_GUIDE.md)
