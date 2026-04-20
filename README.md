# KAMPUS+ - AI Destekli Ogrenci Platformu

Versiyon: 1.1  
Durum: Development  
Son Guncelleme: 20 Nisan 2026

---

## Hakkinda

KAMPUS+, universite ogrencileri icin tasarlanmis modern bir ogrenme ve sosyal platformdur. AI asistan, forum, marketplace, kariyer ve akademik ozellikleri tek cati altinda sunar.

## Hızlı Başlangıç (Quick Start)

Tek komut, sifir surpriz: Bu projede onboarding tek komutluk yapidadir. Lokal gelistirmede veritabani olarak SQLite kullanilir; lokal PostgreSQL kurulumu gerekmez.

### Gereksinimler

- Docker Desktop (veya Docker Engine + Docker Compose v2)
- Git

### 1) Repoyu cek

```bash
git clone <repository-url>
cd kampus_plus
```

### 2) One-click calistir

- Windows: koydeki setup.bat dosyasina cift tikla (veya terminalden setup.bat calistir).
- Mac/Linux: terminalde make up (alternatif: make install) calistir.

### 3) Uygulamayi ac

- Frontend: http://localhost:5174
- Backend API Docs (Swagger): http://localhost:8001/docs

### Bu tek komut neyi otomatik yapar?

- Alembic migration'larini calistirir ve veritabani semasini olusturur.
- Konya normalize seed'ini calistirir ve 5 Konya universitesinin guncel verilerini ekler.
- Baslangic test hesaplarini idempotent sekilde garanti eder.

## Test Hesapları (Test Accounts)

| Rol | E-posta | Şifre | Açıklama |
| :--- | :--- | :--- | :--- |
| **Süper Admin** | admin@abc.com | admin123 | Tüm üniversiteleri yöneten en yetkili hesap. |
| **Üniversite Admini** | kgtu_admin@kampusplus.edu.tr | admin123 | Sadece KGTÜ verilerini yöneten kısıtlı admin. |
| **Öğrenci (KGTÜ)** | kgtu_student@kampusplus.edu.tr | student123 | KGTÜ ders programı ve takvimini gören kullanıcı. |
| **Öğrenci (Selçuk)** | selcuk_student@kampusplus.edu.tr | student123 | Selçuk Üniversitesi verilerini gören kullanıcı. |

Not: Bu hesaplar `setup.bat` veya `make up` komutu calisirken `backend/scripts/ensure_initial_data.py` scripti ile otomatik olarak olusturulur.

## Gelistirme Komutlari

```bash
# Tum servislari baslat
docker compose up --build -d

# Backend loglarini izle
docker compose logs -f backend

# Servisleri durdur
docker compose stop

# Servisleri tamamen kaldir
docker compose down
```

## Teknoloji Ozeti

- Backend: FastAPI, SQLAlchemy, Alembic
- Veritabani: SQLite
- Frontend: React + TypeScript + Vite
- Konteyner: Docker + Docker Compose

## Proje Yapisi

```text
kampus_plus/
├── backend/
├── frontend/
├── docs/
├── specs/
├── docker-compose.yml
├── setup.bat
├── Makefile
└── README.md
```

## Referans

- Sistem mimarisi: [specs/SYSTEM_OVERVIEW.md](specs/SYSTEM_OVERVIEW.md)

## Lisans

Bu proje mezuniyet projesi kapsaminda gelistirilmistir.

