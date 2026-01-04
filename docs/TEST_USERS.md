# Test Kullanıcı Giriş Bilgileri

## 📋 Test Kullanıcıları

Seed script çalıştırıldıktan sonra aşağıdaki kullanıcılar oluşturulur:

### Öğrenci 1
- **Email:** `student1@selcuk.edu.tr`
- **Şifre:** `Student123!`
- **Rol:** Student
- **Durum:** ✅ Email doğrulanmış (is_verified=True)

### Öğrenci 2
- **Email:** `student2@selcuk.edu.tr`
- **Şifre:** `Student123!`
- **Rol:** Student
- **Durum:** ✅ Email doğrulanmış (is_verified=True)

### Admin
- **Email:** `admin@kampusplus.edu.tr`
- **Şifre:** `Admin123!`
- **Rol:** Admin
- **Durum:** ✅ Email doğrulanmış (is_verified=True)

---

## 🔧 Seed Script Çalıştırma

```bash
cd backend
python scripts/seed_data.py
```

---

## ⚠️ Sorun Giderme

### Giriş Yapamıyorsanız:

1. **Email doğrulama kontrolü:**
   - Seed script'te `is_verified=True` olarak ayarlanmış
   - Eğer manuel kayıt yaptıysanız, email doğrulama gerekebilir

2. **Şifre kontrolü:**
   - Şifreler bcrypt ile hash'lenmiş
   - Büyük/küçük harf duyarlı

3. **Database kontrolü:**
   ```bash
   # SQLite database'i kontrol et
   sqlite3 backend/kampus_plus.db
   SELECT email, is_verified, is_active FROM users;
   ```

4. **Backend log kontrolü:**
   - Backend console'da hata mesajlarını kontrol edin
   - Login endpoint'ine gelen istekleri kontrol edin

---

**Not:** Eğer hala giriş yapamıyorsanız, backend console'daki hata mesajlarını paylaşın.

