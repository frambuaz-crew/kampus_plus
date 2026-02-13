# Sorun Giderme

Sık karşılaşılan sorunlar ve kısa çözümler. Detaylı kurulum için [DOCKER_SETUP.md](DOCKER_SETUP.md).

---

## Dosya yükleme çalışmıyor

Proje **local storage** kullanır (`backend/uploads/`). Klasör yoksa veya yazma izni yoksa yükleme başarısız olur.

- **Docker:** `backend/uploads` volume ile oluşturulur. Yoksa `mkdir -p backend/uploads` sonra `docker compose up -d --build`.
- **Manuel:** `mkdir -p backend/uploads` ve backend’i yeniden başlatın.
- **İzin:** `chmod -R 755 backend/uploads` (Linux/Mac). Windows’ta klasör özelliklerinden yazma izni verin.

---

## AI chatbot cevap vermiyor

`backend/.env` içinde **GOOGLE_API_KEY** ve **AI_PROVIDER=gemini** olmalı. API key: https://makersuite.google.com/app/apikey

---

## Veritabanı hataları

- **Docker:** Veritabanı PostgreSQL. `docker compose down -v` sonra `docker compose up -d` ile sıfırdan başlatın. Seed: `docker compose exec backend python scripts/seed_data.py`.
- **Yerel SQLite:** `no such table` → `cd backend && alembic upgrade head && python scripts/seed_data.py`. Dosya bozuksa `kampus_plus.db` silinip migration tekrar çalıştırın.
- **"Database is locked"** → Backend’i durdurun, `kampus_plus.db-shm` / `kampus_plus.db-wal` varsa silin, tekrar başlatın.

---

## Frontend backend’e bağlanamıyor

- Backend çalışıyor mu: `curl http://localhost:8000/health` veya http://localhost:8000/docs
- Frontend `.env`: `VITE_API_URL=http://127.0.0.1:8000/api/v1` (Vite’ta `VITE_` prefix zorunlu)
- CORS: Backend `backend/.env` veya `main.py` içinde `http://localhost:5173` izinli olmalı
- Port çakışması: 8000 / 5173 kullanan process’i kapatın veya `docker-compose.yml`’de port değiştirin

---

## JWT / token hataları

`backend/.env`: `JWT_SECRET_KEY` en az 32 karakter olmalı. Yeni key: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

---

## Docker: port kullanımda, container başlamıyor

- Port boşalt: Windows `Get-NetTCPConnection -LocalPort 8000` ile process bulun, kapatın. Linux/Mac: `lsof -i :8000` → `kill`
- Tam temizlik: `docker compose down -v` → `docker compose up -d --build`
- Log: `docker compose logs backend` veya `docker compose logs -f`

---

## Vector store / FAISS

Index yoksa: `docker compose exec backend python scripts/init_faiss.py` ve `python scripts/populate_vectors.py`. Yerelde: `cd backend` sonra aynı komutlar.

---

## Email gönderilemiyor

Development’ta opsiyonel. `.env`’de SMTP ayarları yoksa doğrulama linkleri console’a yazdırılır. SMTP kullanmak için `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` ekleyin.

---

**Daha fazla:** [DOCKER_SETUP.md](DOCKER_SETUP.md), [SEED_AND_LOGIN.md](SEED_AND_LOGIN.md)
