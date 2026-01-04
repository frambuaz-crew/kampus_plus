# 🎓 KAMPÜS+ - AI Destekli Öğrenme Platformu

**Versiyon:** 1.0  
**Durum:** 🚧 Development  
**Son Güncelleme:** 5 Ocak 2026

---

## 📖 Hakkında

KAMPÜS+, üniversite öğrencileri için tasarlanmış modern bir öğrenme ve sosyal platformdur. AI destekli asistan, forum, marketplace, kariyer rehberliği ve akademik takvim gibi özellikler sunar.

### 🎯 Özellikler

- 🤖 **AI Asistan** - Google Gemini ile entegre akıllı asistan
- 💬 **Forum** - Öğrenciler arası tartışma ve paylaşım platformu
- 🛒 **Marketplace** - İkinci el kitap ve materyal alışverişi
- 💼 **Kariyer Rehberliği** - İş ilanları ve kariyer danışmanlığı
- 📅 **Akademik Takvim** - Ders programı ve etkinlik takibi
- 🔔 **Bildirimler** - Anlık bildirim sistemi
- 💌 **Mesajlaşma** - Öğrenciler arası iletişim
- 🔍 **Global Arama** - Platform genelinde arama

---

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Docker Desktop (v20.10+) veya Docker Engine + Docker Compose
- Git
- Minimum 4GB RAM, 5GB disk alanı

### Kurulum

```bash
# 1. Projeyi klonlayın
git clone <repository-url>
cd kampus_plus

# 2. Backend .env dosyasını oluşturun
cd backend
# .env dosyasını oluşturun ve GOOGLE_API_KEY, JWT_SECRET_KEY ekleyin
cd ..

# 3. Container'ları başlatın
docker-compose up -d

# 4. Uygulamayı açın
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
```

**Detaylı kurulum rehberi için:** [DOCKER_SETUP.md](./DOCKER_SETUP.md)

---

## 📚 Dokümantasyon

- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Docker kurulum ve kullanım rehberi
- **[docs/SETUP.md](./docs/SETUP.md)** - Genel kurulum rehberi
- **[docs/TEST_USERS.md](./docs/TEST_USERS.md)** - Test kullanıcı bilgileri
- **[specs/SYSTEM_OVERVIEW.md](./specs/SYSTEM_OVERVIEW.md)** - Sistem mimarisi

---

## 🏗️ Teknoloji Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** SQLite (WAL mode)
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **AI:** Google Gemini API
- **Vector Store:** FAISS
- **Authentication:** JWT

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 7
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v7
- **HTTP Client:** Axios

### DevOps
- **Containerization:** Docker & Docker Compose
- **Development:** Hot reload (backend & frontend)

---

## 📁 Proje Yapısı

```
kampus_plus/
├── backend/          # FastAPI backend
├── frontend/          # React frontend
├── docs/              # Dokümantasyon
├── specs/             # Proje spesifikasyonları
├── docker-compose.yml # Docker Compose yapılandırması
└── README.md         # Bu dosya
```

---

## 🧪 Test Kullanıcıları

- **Öğrenci 1:** `student1@selcuk.edu.tr` / `Student123!`
- **Öğrenci 2:** `student2@selcuk.edu.tr` / `Student123!`
- **Admin:** `admin@kampusplus.edu.tr` / `Admin123!`

Detaylı bilgi: [docs/TEST_USERS.md](./docs/TEST_USERS.md)

---

## 🔧 Geliştirme

### Container'ları Çalıştırma

```bash
# Başlat
docker-compose up -d

# Logları izle
docker-compose logs -f

# Durdur
docker-compose stop
```

### Backend Geliştirme

```bash
# Container'a gir
docker-compose exec backend bash

# Migration oluştur
alembic revision --autogenerate -m "migration_name"

# Migration uygula
alembic upgrade head

# Test çalıştır
pytest
```

### Frontend Geliştirme

```bash
# Container'a gir
docker-compose exec frontend sh

# Test çalıştır
npm test
```

**Detaylı bilgi:** [DOCKER_SETUP.md](./DOCKER_SETUP.md)

---

## 📝 API Dokümantasyonu

Backend API dokümantasyonu:
- **Swagger UI:** http://localhost:8000/docs
- **OpenAPI JSON:** http://localhost:8000/openapi.json

---

## 🐛 Sorun Giderme

Yaygın sorunlar ve çözümleri için: [DOCKER_SETUP.md#sorun-giderme](./DOCKER_SETUP.md#sorun-giderme)

---

## 📄 Lisans

Bu proje mezuniyet projesi kapsamında geliştirilmiştir.

---

## 👥 Katkıda Bulunanlar

KAMPÜS+ Development Team

---

## 📞 İletişim

Sorularınız için issue açabilir veya dokümantasyonu inceleyebilirsiniz.

---

**Son Güncelleme:** 5 Ocak 2026

