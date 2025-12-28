# 🐳 Docker Build ve Test Rehberi

## ✅ Ön Kontroller

### 1. Docker Desktop Çalışıyor mu?
```bash
docker --version
docker-compose --version
```

### 2. .env Dosyası Kontrolü
- ✅ `backend/.env` dosyası mevcut
- ✅ `JWT_SECRET_KEY` güvenli bir değerle ayarlanmış
- ✅ `GOOGLE_API_KEY` ayarlanmış
- ⚠️ `SMTP_PASSWORD` (Email servisi şu an pasif - email verification devre dışı)

---

## 🚀 Docker Build ve Başlatma

### Adım 1: Eski Container'ları Temizle (Opsiyonel)
```bash
# Eğer önceki build'ler varsa temizle
docker-compose down -v
docker system prune -f
```

### Adım 2: Build ve Başlat
```bash
# Tüm servisleri build et ve başlat
docker-compose up --build

# Veya arka planda çalıştırmak için:
docker-compose up --build -d
```

**İlk build'de:**
- Docker image'lar indirilecek (~2-3 dakika)
- Python ve Node.js paketleri yüklenecek
- Veritabanı migration'ları çalışacak
- Test verileri eklenecek (seed_data.py)
- Vector store populate edilecek

### Adım 3: Logları İzle
```bash
# Tüm servislerin loglarını gör
docker-compose logs -f

# Sadece backend logları
docker-compose logs -f backend

# Sadece frontend logları
docker-compose logs -f frontend
```

---

## ✅ Servislerin Çalıştığını Kontrol Et

### 1. Backend Health Check
```bash
curl http://localhost:8000/health
```

**Beklenen çıktı:**
```json
{"status": "healthy", "version": "0.1.0"}
```

### 2. API Docs
Tarayıcıda aç: http://localhost:8000/docs

### 3. Frontend
Tarayıcıda aç: http://localhost:5173

### 4. MinIO Console
Tarayıcıda aç: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin123`

---

## 🧪 Authentication Test Senaryoları

### Test 1: Kayıt Ol (Register)

**Swagger UI'dan:**
1. http://localhost:8000/docs → `/v1/auth/register` endpoint'ini aç
2. "Try it out" butonuna tıkla
3. Şu JSON'u yapıştır:
```json
{
  "email": "test@ogr.selcuk.edu.tr",
  "password": "Test123456",
  "first_name": "Test",
  "last_name": "User",
  "student_id": "20211234567"
}
```
4. "Execute" butonuna tıkla
5. **Beklenen:** 201 Created, `user_id` ve `message` döner
   - **Not:** Email gönderilmez (email verification pasif)
   - Mesaj: "Account created successfully. You can now login."

**cURL ile:**
```bash
curl -X POST "http://localhost:8000/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ogr.selcuk.edu.tr",
    "password": "Test123456",
    "first_name": "Test",
    "last_name": "User",
    "student_id": "20211234567"
  }'
```

### Test 2: Email Doğrulama (Verify Email) - ⚠️ ŞU AN PASIF

**Not:** Email verification şu an development için pasif hale getirilmiştir. Kullanıcılar email doğrulaması olmadan giriş yapabilir.

**Endpoint hala mevcut ama kullanılmıyor:**
- `/v1/auth/verify-email` endpoint'i çalışıyor ama kayıt sonrası email gönderilmiyor
- Yeni kullanıcılar otomatik olarak `is_verified=True` ile oluşturuluyor
- Production'da email verification tekrar aktif edilecek

### Test 3: Giriş Yap (Login)

**Swagger UI'dan:**
1. `/v1/auth/login` endpoint'ini aç
2. Şu JSON'u yapıştır:
```json
{
  "email": "test@ogr.selcuk.edu.tr",
  "password": "Test123456"
}
```
3. Execute
4. **Beklenen:** 
   - 200 OK
   - `access_token` döner
   - `refresh_token` cookie olarak set edilir
   - `user` bilgileri döner

**Not:** Email verification pasif olduğu için kayıt olduktan sonra hemen giriş yapabilirsin. "Email not verified" hatası gelmez.

### Test 4: Token Yenileme (Refresh)

**Swagger UI'dan:**
1. `/v1/auth/refresh` endpoint'ini aç
2. "Try it out" → Execute
3. **Beklenen:** 200 OK, yeni `access_token` döner

**Not:** Swagger UI cookie'leri otomatik yönetir. cURL kullanıyorsan cookie dosyası kullan.

### Test 5: Çıkış Yap (Logout)

**Swagger UI'dan:**
1. Önce "Authorize" butonuna tıkla
2. Access token'ı yapıştır (Bearer token)
3. `/v1/auth/logout` endpoint'ini aç
4. Execute
5. **Beklenen:** 204 No Content

### Test 6: Şifre Sıfırlama (Forgot Password) - ⚠️ Email Servisi Pasif

**Swagger UI'dan:**
1. `/v1/auth/forgot-password` endpoint'ini aç
2. Email yaz:
```json
{
  "email": "test@ogr.selcuk.edu.tr"
}
```
3. Execute
4. **Beklenen:** 200 OK (ama email gönderilmez - email servisi pasif)
   - Endpoint çalışıyor ama SMTP yapılandırması olmadığı için email gönderilmiyor
   - Production'da email servisi aktif edildiğinde çalışacak

### Test 7: Şifre Sıfırlama (Reset Password)

**Önce reset token'ı al** (email'den veya test için manuel oluştur)

**Swagger UI'dan:**
1. `/v1/auth/reset-password` endpoint'ini aç
2. Token ve yeni şifre:
```json
{
  "token": "YOUR_RESET_TOKEN_HERE",
  "new_password": "NewPassword123!"
}
```
3. Execute
4. **Beklenen:** 200 OK, şifre değişir

---

## 🔍 Veritabanını İnceleme

### Container'a Bağlan
```bash
# Backend container'ına bağlan
docker exec -it kampus-backend bash

# SQLite veritabanını kontrol et
sqlite3 kampus_plus.db

# Kullanıcıları listele
SELECT id, email, first_name, last_name, role, is_verified, created_at FROM users;

# Refresh token'ları listele
SELECT id, user_id, expires_at, is_revoked FROM refresh_tokens;

# Çıkış
.quit
exit
```

### Veritabanı Dosyasını Host'a Kopyala (İnceleme için)
```bash
# Container'dan host'a kopyala
docker cp kampus-backend:/app/kampus_plus.db ./backend/kampus_plus.db

# SQLite Browser ile aç (DB Browser for SQLite gibi)
```

---

## 🐛 Sorun Giderme

### Problem 1: Port Zaten Kullanılıyor
```bash
# Port'u kullanan process'i bul
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # macOS/Linux

# Docker-compose'da port'u değiştir veya process'i durdur
```

### Problem 2: Build Hatası
```bash
# Cache'i temizle ve yeniden build et
docker-compose build --no-cache
docker-compose up
```

### Problem 3: Database Migration Hatası
```bash
# Container'a bağlan ve manuel migration çalıştır
docker exec -it kampus-backend bash
python -m alembic upgrade head
```

### Problem 4: Email Gönderilmiyor
**Not:** Email verification şu an pasif. Bu normal bir durum.

Eğer production'da email gönderimi gerekiyorsa:
```bash
# Email service loglarını kontrol et
docker-compose logs backend | grep -i email

# SMTP ayarlarını kontrol et (.env dosyasında)
# Email verification'ı tekrar aktif etmek için:
# 1. auth_service.py'de TODO yorumlarını kaldır
# 2. auth.py'de email gönderimini aktif et
# 3. Backend'i yeniden başlat
```

### Problem 5: Frontend Backend'e Bağlanamıyor
```bash
# Backend health check
curl http://localhost:8000/health

# CORS ayarlarını kontrol et (.env dosyasında)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 📊 Test Sonuçlarını Kontrol Et

### Başarılı Test İçin Kontrol Listesi:

- [ ] Backend health check çalışıyor (200 OK)
- [ ] Swagger UI açılıyor (http://localhost:8000/docs)
- [ ] Frontend açılıyor (http://localhost:5173)
- [ ] Kayıt olma çalışıyor (201 Created, email gönderilmez)
- [ ] Giriş yapma çalışıyor (200 OK, token döner, email verification gerekmez)
- [ ] Token yenileme çalışıyor (200 OK)
- [ ] Çıkış yapma çalışıyor (204 No Content)
- [ ] Veritabanında kullanıcı kayıtlı ve `is_verified=True`
- [ ] Refresh token cookie olarak set ediliyor
- ⚠️ Email verification pasif (development için)

---

## 🎯 Hızlı Test Komutları

```bash
# Tüm servisleri başlat
docker-compose up -d

# Logları izle
docker-compose logs -f

# Servisleri durdur
docker-compose down

# Servisleri durdur ve volume'ları sil (veritabanı da silinir!)
docker-compose down -v

# Sadece backend'i yeniden başlat
docker-compose restart backend

# Container durumunu kontrol et
docker-compose ps
```

---

## 📝 Notlar

- **Development modunda:** Hot reload aktif, kod değişiklikleri otomatik yansır
- **Veritabanı:** SQLite kullanılıyor, `backend_db` volume'unda saklanıyor
- **Email Verification:** ⚠️ Şu an pasif (development için). Kullanıcılar email doğrulaması olmadan giriş yapabilir. Production'da tekrar aktif edilecek.
- **Email Servisi:** SMTP yapılandırması mevcut ama email gönderimi şu an devre dışı
- **MinIO:** S3-compatible storage, http://localhost:9001'den erişilebilir

---

## ✅ Başarılı Build İşaretleri

1. ✅ Tüm container'lar "healthy" durumunda
2. ✅ Backend: http://localhost:8000/docs açılıyor
3. ✅ Frontend: http://localhost:5173 açılıyor
4. ✅ Log'larda hata yok
5. ✅ Health check endpoint 200 döner

**Hepsi tamamlandıysa, authentication sistemi hazır! 🎉**

---

## ⚠️ Önemli Not: Email Verification

**Şu anki durum:** Email verification development için pasif hale getirilmiştir.

**Ne değişti:**
- ✅ Kullanıcılar email doğrulaması olmadan kayıt olup giriş yapabilir
- ✅ Yeni kullanıcılar otomatik olarak `is_verified=True` ile oluşturulur
- ❌ Kayıt sonrası email gönderilmez
- ❌ Email doğrulama endpoint'i çalışıyor ama kullanılmıyor

**Production'da aktif etmek için:**
1. `backend/src/services/auth_service.py` dosyasında TODO yorumlarını kaldır
2. `backend/src/api/routes/auth.py` dosyasında email gönderimini aktif et
3. SMTP yapılandırmasını yap (Resend veya Gmail)
4. Backend'i yeniden başlat

**Kod değişiklikleri:**
- `auth_service.py`: `is_verified` kontrolü yorum satırında
- `auth_service.py`: Yeni kullanıcılar `is_verified=True` ile oluşturuluyor
- `auth.py`: Email gönderimi yorum satırında

