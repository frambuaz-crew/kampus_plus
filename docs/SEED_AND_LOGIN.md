# Seed ve Giriş

## Seed çalıştırma

Backend (ve Postgres) ayaktayken:

```bash
docker compose exec backend python scripts/seed_data.py
```

Yerel kurulumda:

```bash
cd backend && python scripts/seed_data.py
```

Script 3 kullanıcı oluşturur (zaten varsa atlar).

---

## Giriş bilgileri (seed’den)

| Rol     | Email                     | Şifre        |
|--------|---------------------------|---------------|
| Öğrenci | `student1@selcuk.edu.tr`  | `Student123!` |
| Öğrenci | `student2@selcuk.edu.tr`  | `Student123!` |
| Admin   | `admin@kampusplus.edu.tr` | `Admin123!`   |

Hepsi `is_verified=true` ile oluşturulur.

---

## Giriş

**Arayüz:** http://localhost:5173 → Giriş sayfasında yukarıdaki bilgilerden biri.

**API:** `POST http://localhost:8000/api/v1/auth/login`

```json
{ "email": "student1@selcuk.edu.tr", "password": "Student123!", "remember_me": false }
```

Swagger: http://localhost:8000/docs → `POST /api/v1/auth/login`

---

## Sorun giderme

- **"type userrole does not exist"** → Backend’i yeniden başlatıp seed’i tekrar çalıştırın.
- **"Email veya şifre hatalı"** → Seed çıktısında `[OK] 3 kullanici olusturuldu` veya `[SKIP]` görünmeli.
- **"Email doğrulanmamış"** → Seed kullanıcıları doğrulanmış oluşturulur; farklı (manuel) kullanıcı ile giriş yapıyor olabilirsiniz.
