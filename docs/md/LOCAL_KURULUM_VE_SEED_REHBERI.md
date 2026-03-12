# KAMPUS+ Local Kurulum ve Seed Rehberi

Bu rehber, projeyi sifirdan kuracak birinin hata almadan ayağa kaldirabilmesi icin adim adim hazirlanmistir.

---

## 0) Hizli Kurulum Sirasi

Sorunsuz kurulum icin adimlari bu sirayla uygulayin:

1. `.env` dosyalarini olustur ve guncelle.
2. `backend/data/raw_docs` ve `backend/data/vectors` klasorlerini kontrol et/olustur.
3. Docker imajlarini `--build` ile yeniden olusturup servisleri kaldir.
4. Alembic migration'i manuel olarak `upgrade head` ile kesin calistir.
5. Standart seed'i calistir.
6. Vektor hafizasini sirasiyla yukle (`vector_seed_konya.py` -> `ingest_docs.py`).
7. URL kontrollerini yap.

---

## 1) Ortam Hazirligi (.env Dosyalari)

### 1.1 .env dosyalarini olustur

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

Copy-Item backend\.env.example backend\.env -Force
Copy-Item frontend\.env.example frontend\.env -Force
```

### 1.2 Backend .env kritik alanlari

`backend/.env` icinde en az su alanlari doldur:

- `JWT_SECRET_KEY` (en az 32 karakter)
- `GOOGLE_API_KEY` (AI asistan icin)
- `ENABLE_USAGE_LIMIT=False`
- `DAILY_MESSAGE_LIMIT=50`

JWT key uretmek icin:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Not: `DATABASE_URL` Docker Compose icinde zaten PostgreSQL servisine (`postgres`) yonlendirilir.

### 1.3 Frontend API URL ayari

Bu projede backend prefix'i `/api/v1` oldugu icin `frontend/.env` icinde su deger kullanilmali:

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 2) Gerekli Veri Klasorlerini Kontrol Et (Kritik)

Vektor ve dokuman adimlari icin su klasorler mutlaka mevcut olmali:

- `backend/data/raw_docs` (PDF/TXT ozel belgeler)
- `backend/data/vectors` (FAISS indeksleri)

PowerShell ile kontrol/olusturma:

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

New-Item -ItemType Directory -Path backend\data\raw_docs -Force | Out-Null
New-Item -ItemType Directory -Path backend\data\vectors -Force | Out-Null
```

---

## 3) Docker Imajlarini Yenile ve Servisleri Kaldir

`requirements.txt` guncellendigi icin imajlari rebuild etmek zorunludur:

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

docker compose down -v --remove-orphans
docker compose up --build -d
```

Durum ve log kontrolu:

```powershell
docker compose ps
docker compose logs -f postgres backend frontend mailhog
```

Servisler:
- `postgres` (5432)
- `backend` (8000)
- `frontend` (5173)
- `mailhog` (1025 SMTP, 8025 Web UI)

---

## 4) Veritabani Hazirligi ve Migration (Zorunlu)

Sadece tablolarin olusmasi yeterli degil. Yeni mesaj limiti kolonlarinin DB'ye islenmesi icin su komut mutlaka calistirilmali:

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
docker compose exec backend alembic history
```

Kritik not: `docker-compose.yml` icindeki otomatik migration'a guvenmek yerine bu adimi manuel gecmek, surum farki kaynakli kolon eksikligi hatalarini onler.

---

## 5) Seed Data Yukleme

Standart seed (departman + test kullanicilari + universities.json):

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

docker compose exec backend python scripts/seed_data.py
```

`seed_data.py` su islemleri yapar:
- `backend/data/universities.json` kaynagindan universiteleri yukler.
- Temel bolumleri olusturur.
- Ornek kullanicilari olusturur:
  - `student1@selcuk.edu.tr` / `Student123!` (student)
  - `student2@selcuk.edu.tr` / `Student123!` (student)
  - `admin@kampusplus.edu.tr` / `Admin123!` (admin)

---

## 6) Hafiza (Vektor) Yukleme - Sirayla Calistir

Projenin "akillanmasi" icin bu iki scripti sirasiyla calistir:

1. `vector_seed_konya.py`
2. `ingest_docs.py`

### 6.1 Konya universite hafizasini yukle (3072-dim)

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

docker compose exec backend python scripts/vector_seed_konya.py
```

Bu adim Konya universitelerini 3072 boyutlu embedding ile hafizaya (FAISS) yazar.

### 6.2 Ozel dokumanlari sisteme isle

`backend/data/raw_docs` klasorune PDF/TXT belgelerini koyduktan sonra:

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

docker compose exec backend python scripts/ingest_docs.py
```

Bu adim, `raw_docs` altindaki belgeleri parse edip vektor veritabanina ekler.

---

## 7) Dokuman Erisimi Teknik Notu

Backend artik dokumanlari `GET /api/v1/ai/documents` uzerinden servis eder. Bu nedenle backend surecinin `backend/data/raw_docs` klasorune okuma yetkisi olmali.

Kontrol onerisi:
- Docker volume mount dogru olmali.
- Konteyner icindeki uygulama kullanicisi bu klasoru okuyabilmeli.

---

## 8) Kurulum Sonrasi Kontrol URL'leri

Tarayicidan su adresleri dogrula:

- Frontend: `http://localhost:5173`
- Backend Health: `http://localhost:8000/health`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
- Mailhog UI: `http://localhost:8025`

---

## 9) Sik Kullanilan Operasyon Komutlari

```powershell
# Servisleri baslat
docker compose up -d

# Servisleri durdur
docker compose stop

# Tam kapat (container sil)
docker compose down

# Tam temizle (volume dahil, DB sifirlanir)
docker compose down -v --remove-orphans

# Sadece backend shell
docker compose exec backend bash

# Migration tekrar calistir
docker compose exec backend alembic upgrade head

# Seed tekrar calistir
docker compose exec backend python scripts/seed_data.py

# Vektorleri tekrar yukle
docker compose exec backend python scripts/vector_seed_konya.py
docker compose exec backend python scripts/ingest_docs.py

# Vektör hafızasını (FAISS) tamamen sıfırlamak gerekirse:
docker compose exec backend rm -f data/vectors/vdb_official.index data/vectors/metadata_official.pkl
```

---

## 10) Sorun Cikarsa Ilk Kontrol Listesi

- `frontend/.env` icinde `VITE_API_URL` degeri `/api/v1` ile bitiyor mu?
- `backend/.env` icinde `ENABLE_USAGE_LIMIT` ve `DAILY_MESSAGE_LIMIT` var mi?
- `docker compose up --build -d` ile guncel imajlar olustu mu?
- `docker compose exec backend alembic upgrade head` manuel calisti mi?
- `backend/data/raw_docs` ve `backend/data/vectors` klasorleri mevcut mu?

---

Son guncelleme: 2026-03-06
