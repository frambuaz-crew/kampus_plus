# Seed verileri ve login

## Seed çalıştırma

Backend (ve Postgres) ayaktayken:

```bash
docker compose exec backend python scripts/seed_data.py
```

Bu script 3 kullanıcı oluşturur (zaten varsa atlar).

---

## Login bilgileri (seed’den)

| Rol     | Email                     | Şifre      |
|--------|---------------------------|------------|
| Öğrenci | `student1@selcuk.edu.tr`  | `Student123!` |
| Öğrenci | `student2@selcuk.edu.tr`  | `Student123!` |
| Admin   | `admin@kampusplus.edu.tr` | `Admin123!`  |

Hepsi `is_verified=true` ile oluşturulur; ekstra doğrulama gerekmez.

---

## Login nasıl yapılır?

### 1. Arayüzden (frontend)

- Adres: http://localhost:5173  
- Giriş sayfasında yukarıdaki email ve şifrelerden birini kullan.

### 2. API ile (curl / Swagger)

**Endpoint:** `POST http://localhost:8000/api/v1/auth/login`

**Body (JSON):**

```json
{
  "email": "student1@selcuk.edu.tr",
  "password": "Student123!",
  "remember_me": false
}
```

**Örnek curl:**

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"student1@selcuk.edu.tr\",\"password\":\"Student123!\",\"remember_me\":false}"
```

Başarılı yanıtta `access_token` ve kullanıcı bilgisi döner.

**Swagger:** http://localhost:8000/docs → `POST /api/v1/auth/login` → Try it out.

---

## Sorun giderme

- **"type userrole does not exist"**  
  Model güncellendi (`native_enum=False`). Backend’i yeniden başlatıp seed’i tekrar çalıştırın.

- **"Email veya şifre hatalı"**  
  Seed’in başarıyla bittiğinden emin olun; çıktıda `[OK] 3 kullanici olusturuldu` veya `[SKIP] ... zaten mevcut` görünmeli.

- **"Email doğrulanmamış"**  
  Seed kullanıcıları doğrulanmış oluşturulur. Bu hatayı alıyorsanız farklı bir kullanıcıyla (örn. manuel kayıt) giriş yapıyor olabilirsiniz.
