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
```

> 💡 API Key: https://makersuite.google.com/app/apikey

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

**Test Kullanıcısı:**
- Email: `student1@university.edu.tr`
- Şifre: `Student123!`

---

**Sorun mu yaşıyorsun?** → [SETUP_GUIDE.md](./SETUP_GUIDE.md)
