# KAMPÜS+ Teknoloji Özeti

Projede kullanılan teknolojiler ve ekip geliştirme ortamı.

---

## Mevcut teknolojiler

### Backend
| Teknoloji | Kullanım |
|-----------|----------|
| **Python** | 3.11 |
| **FastAPI** | REST API |
| **Uvicorn** | ASGI sunucu |
| **SQLAlchemy** | ORM (async) |
| **Alembic** | Migration |
| **PostgreSQL** | Veritabanı (ekip ortamı) |
| **SQLite** | Opsiyonel yerel geliştirme |
| **Pydantic** | Validasyon, ayarlar |
| **JWT** (python-jose) | Kimlik doğrulama |
| **Passlib / bcrypt** | Şifre hash |
| **Google Gemini** | AI (LangChain ile) |
| **LangChain** | AI zincirleri |
| **FAISS** | Vektör arama (embedding) |
| **httpx** | HTTP istemci |
| **BeautifulSoup** | Web scraping |

### Frontend
| Teknoloji | Kullanım |
|-----------|----------|
| **React** | 19 |
| **Vite** | 7 – build / dev server |
| **TypeScript** | 5.9 |
| **React Router** | 7 |
| **Tailwind CSS** | Stil |
| **Axios** | API istekleri |
| **react-markdown** | Markdown içerik |

### Altyapı
| Teknoloji | Kullanım |
|-----------|----------|
| **Docker** | Backend, frontend, PostgreSQL |
| **Docker Compose** | Tüm servisler tek komutla |

---

## 5 kişilik ekip – ortak Docker ortamı

- **Aynı ortam:** Herkes `docker compose up` ile aynı stack’i çalıştırır (backend, frontend, **PostgreSQL**).
- **Ortak image:** Image’lar aynı Dockerfile’lardan üretilir; isteğe bağlı olarak bir registry’e push edilip ekipça aynı image’lar kullanılabilir.
- **Veritabanı:** PostgreSQL tek kaynak; migration’lar `alembic upgrade head` ile uygulanır, veri container/volume’da kalır.

### Çalıştırma (herkes için)

```bash
# Proje kökünde
docker compose up --build -d

# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# API docs: http://localhost:8000/docs
```

Detaylı kurulum: `docs/DOCKER_SETUP.md`

---

## Veritabanı: PostgreSQL (Docker) / SQLite (yerel opsiyonel)

- **Docker ile çalıştırınca:** Backend tamamen **PostgreSQL** kullanır. `docker-compose.yml` içinde `DATABASE_URL=postgresql+asyncpg://kampus:kampus@postgres:5432/kampus_plus` tanımlı; container’daki `.env` bu değerle override edilir. Yani Docker ortamında SQLite yok.
- **Docker olmadan (yerel):** `backend/.env` içindeki `DATABASE_URL` geçerli olur. İstersen yerel Postgres veya SQLite kullanabilirsin (opsiyonel).
- **Kod:** Hem Postgres hem SQLite URL’lerini destekler (config + database.py). Şema migration’lar ve modeller her iki veritabanında da çalışır.

---

## Ortak veritabanı – nasıl çalışır?

### Git pull + Docker = ortak DB değil

- Her geliştirici `git pull` → `docker compose up -d` yaptığında **kendi makinesinde** Postgres container + `postgres_data` volume çalışır.
- Yani **herkesin kendi veritabanı** olur; veri otomatik paylaşılmaz. Şema (tablolar) git’teki migration’larla aynıdır, **içerik (kayıtlar) kişiye özeldir**.

### Gerçekten tek ortak DB istiyorsanız

1. **Ortak bir Postgres sunucusu** gerekir: bir sunucu, cloud (Supabase, Neon, AWS RDS vb.) veya bir ekip üyesinin makinesi (sürekli açık + IP/port erişilebilir).
2. O sunucuda DB + kullanıcı/şifre oluşturulur.
3. Ekip üyeleri kendi ortamında **sadece backend**’in bu DB’ye bağlanmasını sağlar:
   - **Seçenek A – Sadece backend’i çalıştırıp ortak DB’ye bağlamak:**  
     `backend/.env` veya `docker-compose` içinde  
     `DATABASE_URL=postgresql+asyncpg://user:pass@ORTAK_SUNUCU_IP_veya_HOST:5432/kampus_plus`  
     Böylece herkes aynı veriyi görür (postgres container’a gerek kalmaz).
   - **Seçenek B – Compose’ta postgres’i kapatıp ortak DB kullanmak:**  
     Ortak sunucu bilgisi `.env` veya compose `environment` ile verilir; compose’ta postgres servisi kullanılmaz veya sadece isteyenler local postgres ile çalışır.

### Docker image atmak ne işe yarar?

- **Image (backend/frontend):** Uygulama + bağımlılıklar. Registry’e atıp çekmek = **aynı build’i** herkeste kullanmak. Veritabanı ile ilgisi yok.
- **Ortak veri** için image değil, **tek bir Postgres sunucusu** ve ona bakan `DATABASE_URL` gerekir.

**Özet:**

| Ne istiyorsunuz?              | Ne yapılır?                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| Aynı kod + aynı şema         | Git pull + `docker compose up` yeterli (herkesin kendi DB’si).              |
| Aynı uygulama build’i        | Docker image’ları registry’e atıp çekmek (ortak DB sağlamaz).               |
| Gerçekten tek ortak veritabanı | Bir yerde Postgres açıp herkeste `DATABASE_URL`’i o sunucuya yönlendirmek. |
