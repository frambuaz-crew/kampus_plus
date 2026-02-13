# Docker Kurulumu

**KAMPÜS+** – Backend, Frontend ve PostgreSQL tek komutla çalışır.

---

## Hızlı başlangıç

```bash
git clone <repo-url>
cd kampus_plus

cd backend
cp .env.example .env
# .env içine GOOGLE_API_KEY ve JWT_SECRET_KEY ekleyin (zorunlu)

cd ..
docker compose up -d
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:8000/docs  
- **Test kullanıcıları:** [SEED_AND_LOGIN.md](SEED_AND_LOGIN.md)

---

## Gereksinimler

- **Docker** (Desktop veya Engine) + **Docker Compose** v2
- **Git**
- RAM 4GB+ (önerilen 8GB), disk 5GB+

Kontrol: `docker --version`, `docker compose version`, `docker ps`

---

## Servisler

| Servis     | Port | Açıklama                    |
|------------|------|-----------------------------|
| postgres   | 5432 | PostgreSQL 15              |
| backend    | 8000 | FastAPI, migration + seed başlangıçta |
| frontend   | 5173 | React + Vite dev server     |

Backend başlarken otomatik: `alembic upgrade head`, `seed_data.py`, `populate_vectors.py`, sonra uvicorn.

---

## Backend .env (zorunlu)

`backend/.env` oluşturun (`backend/.env.example` kopyalayıp düzenleyin):

| Değişken         | Açıklama                          |
|------------------|------------------------------------|
| `GOOGLE_API_KEY` | Gemini API key (AI için)           |
| `JWT_SECRET_KEY` | En az 32 karakter (auth için)      |

Docker içinde `DATABASE_URL` compose tarafından PostgreSQL’e ayarlanır; yerel `.env`’deki DB ayarı override edilir.

JWT key üretmek: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

---

## Veritabanı

- **Docker:** PostgreSQL (`postgres` servisi). Migration’lar backend başlarken çalışır.
- **Seed:** İlk `up` sırasında otomatik çalışır. Tekrar: `docker compose exec backend python scripts/seed_data.py`
- **Migration (manuel):** `docker compose exec backend alembic upgrade head`
- **Sıfırlama:** `docker compose down -v` (tüm veriler silinir), sonra `docker compose up -d`

---

## Geliştirme

- **Hot reload:** Backend ve frontend kaynak kodları volume ile mount; değişiklikler anında yansır.
- **Log:** `docker compose logs -f backend` / `docker compose logs -f frontend`
- **Bağımlılık:** Backend için `requirements.txt` güncelle → `docker compose build backend && docker compose up -d backend`. Frontend için `package.json` → `docker compose build frontend` vb.

---

## Sık kullanılan komutlar

```bash
docker compose up -d          # Başlat
docker compose stop            # Durdur
docker compose down            # Durdur + container sil
docker compose down -v         # + volume sil (veri gider)
docker compose ps              # Durum
docker compose logs -f         # Log
docker compose exec backend bash   # Backend shell
docker compose exec backend python scripts/seed_data.py
docker compose exec backend alembic upgrade head
```

---

## Sorun giderme

- **Port meşgul:** 8000/5173 kullanan process’i kapatın veya `docker-compose.yml`’de port değiştirin.
- **Backend unhealthy:** `docker compose logs backend`, `curl http://localhost:8000/health`, `.env` kontrolü.
- **Frontend API’ye ulaşamıyor:** Backend ayakta mı, `VITE_API_URL=http://localhost:8000/api/v1` (frontend env).
- **Vector store / AI hata:** `docker compose exec backend python scripts/init_faiss.py` ve `populate_vectors.py`.

Detaylı rehber: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Önemli notlar

- **Local storage:** Dosyalar `backend/uploads/` (S3/MinIO yok). Volume ile kalıcı.
- **.env:** Commit etmeyin; sadece `.env.example` repo’da olsun.
- **Test kullanıcıları:** [SEED_AND_LOGIN.md](SEED_AND_LOGIN.md) ve [TEST_USERS.md](TEST_USERS.md).
