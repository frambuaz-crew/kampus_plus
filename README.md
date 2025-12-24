# 🎓 KAMPÜS+ AI-Powered Hybrid Intelligence Platform

**Üniversiteler için AI destekli hibrit bilgi platformu** - Resmi akademik veriler ile kullanıcı içeriğini birleştiren yapay zeka asistanı.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)

---

## ⚡ Quick Start

**2 dakikada başla:**

```bash
git clone https://github.com/frambuaz-crew/kampus_plus.git
cd kampus_plus
git checkout develop

# .env dosyalarını ayarla (backend ve frontend)
# Sadece GOOGLE_API_KEY değiştirilmeli

docker-compose up --build
```

✅ **Hazır!**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

📖 **Detaylı kurulum:** [QUICK_START.md](./QUICK_START.md) | [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## 🚀 Proje Durumu

- **Sürüm**: 0.1.0
- **Branch**: `develop`
- **Durum**: 🚧 Active Development

## 🎯 Temel Özellikler

1. **Öğrenci Kimlik Doğrulama** (US1 - P1)
   - Üniversite email ile güvenli giriş
   - JWT tabanlı authentication
   - Rol bazlı yetkilendirme

2. **AI Chatbot** (US2 - P1) ⭐
   - Resmi üniversite verilerine erişim
   - Hibrit RAG (dual FAISS vector stores)
   - Kaynak atıfları ile cevaplar

3. **PDF Yükleme** (US3 - P2)
   - Kişisel not ve doküman yönetimi
   - Otomatik vektorleştirme
   - AWS S3 güvenli depolama

4. **Anonim Forum** (US4 - P2)
   - Güvenli anonim tartışma ortamı
   - Moderasyon yetenekleri
   - AI referans kaynağı

5. **Otomatik Veri Senkronizasyonu** (US5 - P3)
   - UZEM içerik senkronizasyonu
   - Duyuru ve ders programı güncellemeleri
   - APScheduler ile otomatik çalışma

6. **Eğitmen Paneli** (US6 - P3)
   - Öğrenci etkileşim analitiği
   - Ders materyali yükleme
   - Anonim raporlama

## 🛠️ Teknoloji Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+ / SQLite (dev)
- **Vector Store**: FAISS (dual databases - 768 dims)
- **AI**: LangChain + Google Gemini 2.5 Flash
- **Embeddings**: Google text-embedding-004
- **Scheduler**: APScheduler
- **Storage**: AWS S3
- **Testing**: pytest, pytest-asyncio

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Testing**: Jest, React Testing Library, Playwright

### DevOps
- **Containerization**: Docker, Docker Compose
- **Database Migrations**: Alembic
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

## 📚 Dokümantasyon

### 🏗️ Mimari ve API Dokümantasyonu (ÖNEMLİ!)

- **[📐 Mimari Diyagram](./docs/ARCHITECTURE.md)**: Sistem mimarisi, servisler arası iletişim, veri akışı
- **[📡 API Dokümantasyonu](./docs/API_DOCUMENTATION.md)**: Tüm endpoint'ler, request/response formatları, örnekler
- **[🔗 Swagger UI](http://localhost:8000/docs)**: İnteraktif API test arayüzü (geliştirme ortamı)

### 📋 Proje Dokümantasyonu

- **[Constitution](./. specify/memory/constitution.md)**: Proje anayasası ve kurallar
- **[Specification](./specs/001-ai-platform/spec.md)**: Özellik belirtimi (6 user story)
- **[Planning](./specs/001-ai-platform/plan.md)**: Implementation planı
- **[Tasks](./specs/001-ai-platform/tasks.md)**: 217 görev breakdown
- **[Data Model](./specs/001-ai-platform/data-model.md)**: 13 entity şeması
- **[API Contracts](./specs/001-ai-platform/contracts/openapi.yaml)**: OpenAPI 3.0 spec
- **[Quickstart](./specs/001-ai-platform/quickstart.md)**: Geliştirici başlangıç kılavuzu
- **[Research](./specs/001-ai-platform/research.md)**: Teknik kararlar ve araştırma

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (veya Docker ile)

### Kurulum

```bash
# Repository'yi klonlayın
git clone <repository-url>
cd kampus_plus

# Environment variables oluşturun
cp .env.example .env
# .env dosyasını gerekli bilgilerle doldurun

# Docker ile başlatın
docker-compose up -d

# Veya manuel kurulum için:

# Backend kurulumu
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload

# Frontend kurulumu
cd frontend
npm install
npm start
```

Detaylı kurulum için: [Quickstart Guide](./specs/001-ai-platform/quickstart.md)

## 🧪 Test-First Development (Zorunlu!)

Bu proje **anayasal gereklilik** gereği Test-First Development (TDD) yaklaşımı kullanır:

1. 🔴 **RED**: Test yaz → Çalıştır → BAŞARISIZ olmalı
2. ✅ **GREEN**: Kod yaz → Test çalıştır → BAŞARILI olmalı
3. 🔄 **REFACTOR**: Kodu temizle → Testler hala geçmeli

```bash
# Backend testleri
cd backend
pytest --cov

# Frontend testleri
cd frontend
npm test -- --coverage

# E2E testleri
npm run test:e2e
```

Hedef: **80%+ kod coverage**

## 📊 Proje Yapısı

```
kampus_plus/
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── api/            # API endpoints
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic
│   │   ├── core/           # Config, DB, security
│   │   └── schedulers/     # APScheduler jobs
│   ├── tests/              # pytest tests
│   ├── alembic/            # DB migrations
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utilities
│   └── package.json
├── specs/                  # Feature specifications
├── docs/                   # Additional documentation
└── docker-compose.yml      # Docker setup
```

## 🎯 MVP Yol Haritası

**Minimum Viable Product (4-6 hafta):**

- [x] Faz 0-2: Planlama ve tasarım
- [ ] Faz 1: Altyapı kurulumu (T001-T020) - 1 hafta
- [ ] Faz 2: Temel servisler (T021-T034) - 1-2 hafta
- [ ] Faz 3: Authentication (T035-T055) - 1 hafta
- [ ] Faz 4: AI Chatbot (T056-T075) - 1-2 hafta

**MVP Çıktısı**: Öğrenciler login olup resmi üniversite verilerine AI ile erişebilir ✅

**Sonraki Sürümler**:
- v0.3: PDF Upload (US3)
- v0.4: Anonymous Forum (US4)
- v1.0: Full feature set (US5 + US6)

## 🔐 Güvenlik

- ✅ HTTPS zorunlu
- ✅ JWT token authentication
- ✅ Password hashing (bcrypt)
- ✅ Input validation (Pydantic)
- ✅ Rate limiting
- ✅ SQL injection koruması
- ✅ Data encryption at rest (S3)
- ✅ PII anonymization (AI prompts)
- ✅ No LLM prompt logging

## 🤝 Katkıda Bulunma

1. Feature branch oluşturun: `git checkout -b feature/amazing-feature`
2. **Önce testleri yazın** (TDD zorunlu!)
3. Değişikliklerinizi commit edin: `git commit -m 'feat: add amazing feature'`
4. Branch'i push edin: `git push origin feature/amazing-feature`
5. Pull Request açın

Detaylar için: [Contributing Guide](./CONTRIBUTING.md)

## 📝 Commit Convention

Conventional Commits kullanıyoruz:

- `feat:` Yeni özellik
- `fix:` Bug düzeltme
- `docs:` Dokümantasyon
- `test:` Test ekleme/güncelleme
- `refactor:` Kod refactoring
- `chore:` Bakım işleri

## 📄 Lisans

[Lisans bilgisi eklenecek]

## 👥 Ekip

[Ekip bilgisi eklenecek]

## 📞 İletişim

[İletişim bilgisi eklenecek]

---

**⚡ Powered by**: FastAPI • React • LangChain • OpenAI • FAISS • PostgreSQL
