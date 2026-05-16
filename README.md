# KAMPUS+ - AI Destekli Ogrenci Platformu

**Versiyon:** 1.1  
**Durum:** Development  
**Son Guncelleme:** 20 Nisan 2026

## Hakkinda

KAMPUS+, universite ogrencileri icin tasarlanmis modern bir ogrenme ve sosyal platformdur. AI asistan, forum, marketplace, kariyer ve akademik ozellikleri tek cati altinda sunar.

## Hizli Baslangic (Quick Start)

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

- **Windows:** koydeki `setup.bat` dosyasina cift tikla (veya terminalden `setup.bat` calistir).
- **Mac/Linux:** terminalde `make up` (alternatif: `make install`) calistir.

### 3) Uygulamayi ac

- **Frontend:** http://localhost:5174
- **Backend API Docs (Swagger):** http://localhost:8001/docs

### Bu tek komut neyi otomatik yapar?

- Alembic migration'larini calistirir ve veritabani semasini olusturur.
- Konya normalize seed'ini calistirir ve 5 Konya universitesinin guncel verilerini ekler.
- Baslangic test hesaplarini idempotent sekilde garanti eder.

## Test Hesaplari (Test Accounts)

| Rol | E-posta | Şifre | Açıklama |
|-----|---------|-------|----------|
| **Süper Admin (KGTÜ)** | `admin@ogr.gidatarim.edu.tr` | `admin123` | Tüm platformun yöneticisi (KGTÜ Bilg. Müh. 4. Sınıf) |
| **Üniversite Yetkilisi (KGTÜ)** | `kgtu_admin1@ogr.gidatarim.edu.tr` | `admin123` | KGTÜ Yetkilisi (Bilg. Müh. 4. Sınıf) |
| **Öğrenci (KGTÜ)** | `kgtu_student1@ogr.gidatarim.edu.tr` | `student123` | KGTÜ Öğrencisi (Bilg. Müh. 3. Sınıf) |
| **Üniversite Yetkilisi (KTÜN)** | `ktun_admin1@ogr.ktun.edu.tr` | `admin123` | KTÜN Yetkilisi (Bilg. Müh. 4. Sınıf) |
| **Öğrenci (KTÜN)** | `ktun_student1@ogr.ktun.edu.tr` | `student123` | KTÜN Öğrencisi (Bilg. Müh. 3. Sınıf) |
| **Üniversite Yetkilisi (Karatay)** | `karatay_admin1@ogr.karatay.edu.tr` | `admin123` | Karatay Yetkilisi (Bilg. Müh. 4. Sınıf) |
| **Öğrenci (Karatay)** | `karatay_student1@ogr.karatay.edu.tr` | `student123` | Karatay Öğrencisi (Bilg. Müh. 3. Sınıf) |
| **Üniversite Yetkilisi (NEÜ)** | `erbakan_admin1@ogr.erbakan.edu.tr` | `admin123` | NEÜ Yetkilisi (Bilg. Müh. 4. Sınıf) |
| **Öğrenci (NEÜ)** | `erbakan_student1@ogr.erbakan.edu.tr` | `student123` | NEÜ Öğrencisi (Bilg. Müh. 3. Sınıf) |
| **Üniversite Yetkilisi (Selçuk)** | `selcuk_admin1@ogr.selcuk.edu.tr` | `admin123` | Selçuk Yetkilisi (Bilg. Müh. 4. Sınıf) |
| **Öğrenci (Selçuk)** | `selcuk_student1@ogr.selcuk.edu.tr` | `student123` | Selçuk Öğrencisi (Bilg. Müh. 3. Sınıf) |

> **Not:** Bu hesaplar `setup.bat` veya `make up` komutu calisirken `backend/scripts/ensure_initial_data.py` scripti ile otomatik olarak olusturulur.

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

- **Backend:** FastAPI, SQLAlchemy, Alembic
- **Veritabani:** SQLite
- **Frontend:** React + TypeScript + Vite
- **Konteyner:** Docker + Docker Compose

## Proje Yapisi

```
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

- Sistem mimarisi: `specs/SYSTEM_OVERVIEW.md`

## Lisans

Bu proje mezuniyet projesi kapsaminda gelistirilmistir.
