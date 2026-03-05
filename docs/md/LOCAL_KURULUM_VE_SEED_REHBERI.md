# KAMPÜS+ Local Kurulum ve Seed Rehberi

Bu rehber KAMPÜS+ projesini yerel bilgisayarda Docker ile sıfırdan ayağa kaldırmak için hazırlanmıştır.

---

## 1) Ortam Hazırlığı (.env dosyaları)

### 1.1 .env dosyalarını oluştur

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

Copy-Item backend\.env.example backend\.env -Force
Copy-Item frontend\.env.example frontend\.env -Force
```

### 1.2 Backend .env kritik alanlar

`backend/.env` içinde en az şunları doldur:

- `JWT_SECRET_KEY` (en az 32 karakter)
- `GOOGLE_API_KEY` (AI asistan kullanımı için)

JWT key üretmek için:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

> Not: `DATABASE_URL` değeri Docker Compose içinde zaten PostgreSQL servisine (`postgres`) yönlendiriliyor.

### 1.3 Frontend VITE_API_URL düzeltmesi (önemli)

`frontend/.env.example` içinde `/v1` geçebilir. Bu projede backend router prefix’i `/api/v1` olduğu için frontend `.env` dosyasında şu değer kullanılmalıdır:

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 2) Docker ile Servisleri Ayağa Kaldırma

Temiz başlangıç (eski volume/container kalıntılarını temizler):

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

docker compose down -v --remove-orphans
docker compose up --build -d
```

Durum ve log kontrolü:

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

## 3) Veritabanı ve Alembic Migration

Backend konteyneri içinden migration komutları:

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
docker compose exec backend alembic history
```

> Not: `docker-compose.yml` içindeki backend başlangıç komutu da `alembic upgrade head` çalıştırır; yine de manuel komutlar bakım/tekrar için kullanılabilir.

---

## 4) Seed Data ve Scraping

## 4.1 Standart seed (departman + test kullanıcıları + universities.json)

```powershell
cd C:\Users\emrem\Desktop\kampus\kampus_plus

docker compose exec backend python scripts/seed_data.py
```

`seed_data.py` şunları yapar:
- `backend/data/universities.json` dosyasından üniversiteleri yükler
- Bölümleri oluşturur:
  - Bilgisayar Mühendisliği
  - Elektrik-Elektronik Mühendisliği
  - Sistem Yönetimi
  - Yazılım Mühendisliği
  - Hukuk
  - Diğer
- Örnek kullanıcıları oluşturur:
  - `student1@selcuk.edu.tr` / `Student123!` (student)
  - `student2@selcuk.edu.tr` / `Student123!` (student)
  - `admin@kampusplus.edu.tr` / `Admin123!` (admin)

## 4.2 YÖK scraping (opsiyonel)

Sadece üniversite listesini güncellemek için:

```powershell
docker compose exec backend python scripts/fetch_yok_universities.py
```

Email domain tespiti ile (daha uzun sürer):

```powershell
docker compose exec backend python scripts/fetch_yok_universities.py --detect-domains
```

---

## 5) Kurulum Sonrası Kontrol URL’leri

Tarayıcıdan şu adresleri doğrula:

- Frontend: `http://localhost:5173`
- Backend Health: `http://localhost:8000/health`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
- Mailhog UI: `http://localhost:8025`

---

## 6) Sık Kullanılan Operasyon Komutları

```powershell
# Servisleri başlat
docker compose up -d

# Servisleri durdur
docker compose stop

# Tam kapat (container sil)
docker compose down

# Tam temizle (volume dahil, DB sıfırlanır)
docker compose down -v --remove-orphans

# Sadece backend shell
docker compose exec backend bash

# Seed tekrar çalıştır
docker compose exec backend python scripts/seed_data.py
```

---

## 7) Notlar

- `.env` değişikliklerinden sonra ilgili servisi yeniden başlat:

```powershell
docker compose restart backend frontend
```

- Frontend API hatası alırsan önce `frontend/.env` içindeki `VITE_API_URL` değerinin `/api/v1` ile bittiğini kontrol et.
- Mail testleri için Mailhog arayüzü: `http://localhost:8025`

---

Son güncelleme: 2026-02-28
