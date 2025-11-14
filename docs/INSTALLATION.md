# KAMPÜS+ Kurulum Rehberi

Bu dokümanda projeyi lokalde çalıştırmak için gerekli tüm adımlar detaylı olarak anlatılmaktadır.

## 📋 Gereksinimler

### Zorunlu
- **Python 3.11+** → [İndir](https://www.python.org/downloads/)
- **Node.js 18+** → [İndir](https://nodejs.org/)
- **Docker Desktop** → [İndir](https://www.docker.com/products/docker-desktop)
- **Git** → [İndir](https://git-scm.com/downloads)

### Opsiyonel (Docker yerine)
- **PostgreSQL 15+** → [İndir](https://www.postgresql.org/download/)

## 🚀 Hızlı Başlangıç (Docker ile)

### 1. Repository'yi Klonlayın

```bash
git clone https://github.com/frambuaz-crew/kampus_plus.git
cd kampus_plus
```

### 2. Docker Desktop'ı Başlatın

Windows'ta Docker Desktop ikonuna tıklayın ve başlamasını bekleyin (1-2 dakika).

### 3. PostgreSQL'i Başlatın

```bash
docker-compose up -d postgres
```

Kontrol edin:
```bash
docker ps
# kampus-postgres container'ı görmelisiniz
```

### 4. Backend Kurulumu

```bash
cd backend

# Virtual environment oluştur
python -m venv venv

# Aktif et (Windows)
.\venv\Scripts\Activate.ps1

# Paketleri kur
pip install -r requirements.txt

# Database migration'ları çalıştır
alembic upgrade head

# Backend'i başlat
uvicorn src.main:app --reload
```

Backend çalışıyor: http://localhost:8000

API Docs: http://localhost:8000/docs

### 5. Frontend Kurulumu

Yeni bir terminal açın:

```bash
cd frontend

# Paketleri kur
npm install

# Frontend'i başlat
npm start
```

Frontend çalışıyor: http://localhost:3000

## 🛠️ Manuel Kurulum (Docker olmadan)

### 1. PostgreSQL Kurulumu

1. [PostgreSQL 15](https://www.postgresql.org/download/windows/) indirin ve kurun
2. Installation sırasında:
   - Port: `5432`
   - Username: `postgres`
   - Password: Kendiniz belirleyin

3. pgAdmin veya psql ile database oluşturun:

```sql
CREATE DATABASE kampus_plus;
CREATE USER kampus_user WITH PASSWORD 'kampus_dev_password_2024';
GRANT ALL PRIVILEGES ON DATABASE kampus_plus TO kampus_user;
```

### 2. Environment Variables

`.env` dosyasını düzenleyin:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=kampus_plus
POSTGRES_USER=kampus_user
POSTGRES_PASSWORD=kampus_dev_password_2024

# JWT Secret (generate new one)
JWT_SECRET_KEY=your-secret-key-here

# OpenAI (opsiyonel, test için gerekli değil)
OPENAI_API_KEY=sk-your-key-here

# AWS (opsiyonel, test için gerekli değil)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=kampus-plus-dev
```

JWT secret oluştur:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Backend Başlatma

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Database migrations
alembic upgrade head

# Seed data (opsiyonel)
python scripts/seed_data.py

# Backend başlat
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Frontend Başlatma

```bash
cd frontend
npm install
npm start
```

## 🧪 Test Çalıştırma

### Backend Tests

```bash
cd backend
.\venv\Scripts\Activate.ps1

# Tüm testler
pytest

# Coverage ile
pytest --cov=src --cov-report=html

# Sadece unit testler
pytest tests/unit/

# Sadece integration testler
pytest tests/integration/
```

### Frontend Tests

```bash
cd frontend

# Tüm testler
npm test

# Coverage ile
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 🐳 Docker Komutları

### Container Yönetimi

```bash
# Tüm servisleri başlat
docker-compose up -d

# Logları görüntüle
docker-compose logs -f

# Belirli servis logu
docker-compose logs -f postgres

# Servisleri durdur
docker-compose down

# Volumes ile birlikte sil (dikkat: tüm data silinir!)
docker-compose down -v

# Container'a bağlan
docker exec -it kampus-postgres psql -U kampus_user -d kampus_plus
```

### Database Yönetimi

```bash
# Database backup
docker exec kampus-postgres pg_dump -U kampus_user kampus_plus > backup.sql

# Database restore
docker exec -i kampus-postgres psql -U kampus_user kampus_plus < backup.sql

# Container içinde psql
docker exec -it kampus-postgres psql -U kampus_user -d kampus_plus
```

## 📝 Geliştirme Workflow

### 1. Yeni Branch Oluştur

```bash
git checkout -b feature/yeni-ozellik
```

### 2. Test Yaz (TDD)

```python
# tests/unit/test_my_feature.py
def test_my_new_feature():
    # Test kodunu YAZ
    assert result == expected
```

### 3. Testi Çalıştır (RED)

```bash
pytest tests/unit/test_my_feature.py
# ❌ Test BAŞARISIZ olmalı
```

### 4. Kodu Yaz (GREEN)

```python
# src/services/my_service.py
def my_new_feature():
    # Implementation
    return result
```

### 5. Testi Tekrar Çalıştır

```bash
pytest tests/unit/test_my_feature.py
# ✅ Test BAŞARILI olmalı
```

### 6. Commit ve Push

```bash
git add .
git commit -m "feat: add new feature

Implements: T123
Tests: Added unit tests"

git push origin feature/yeni-ozellik
```

## 🔧 Yaygın Sorunlar

### Port Zaten Kullanımda

```bash
# Windows'ta port kullanan process'i bul
netstat -ano | findstr :5432

# Process'i kapat
taskkill /PID <PID> /F
```

### Docker Container Başlamıyor

```bash
# Container'ları temizle
docker-compose down -v
docker system prune -a

# Tekrar başlat
docker-compose up -d
```

### Python Paket Hatası

```bash
# Virtual environment'ı sil ve yeniden oluştur
rm -r venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Database Connection Hatası

1. PostgreSQL çalışıyor mu kontrol edin:
   ```bash
   docker ps  # veya
   pg_ctl status
   ```

2. `.env` dosyasındaki bilgileri kontrol edin

3. Database oluşturulmuş mu kontrol edin:
   ```bash
   docker exec -it kampus-postgres psql -U kampus_user -l
   ```

### Alembic Migration Hatası

```bash
# Migration history'yi kontrol et
alembic current

# Belirli revision'a git
alembic downgrade base
alembic upgrade head

# Yeni migration oluştur
alembic revision --autogenerate -m "description"
```

## 📚 Faydalı Komutlar

### Python

```bash
# Paket versiyonlarını listele
pip list

# Outdated paketleri göster
pip list --outdated

# Paket güncelle
pip install --upgrade package-name
```

### Node.js

```bash
# Paket versiyonlarını kontrol et
npm outdated

# Paket güncelle
npm update package-name

# Cache temizle
npm cache clean --force
```

### Git

```bash
# Branch'leri listele
git branch -a

# Son commit'i geri al (soft)
git reset --soft HEAD~1

# Değişiklikleri gör
git diff

# Stash (geçici kaydet)
git stash
git stash pop
```

## 🆘 Yardım

Sorun yaşıyorsanız:

1. **Logları kontrol edin**:
   ```bash
   docker-compose logs -f
   uvicorn --log-level debug
   ```

2. **Issue açın**: [GitHub Issues](https://github.com/frambuaz-crew/kampus_plus/issues)

3. **Dokümantasyon**: [Quickstart Guide](../specs/001-ai-platform/quickstart.md)

4. **Testleri çalıştırın**: Sorunun kaynağını bulun

## 📖 Ek Kaynaklar

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Docker Docs](https://docs.docker.com/)
- [Alembic Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
