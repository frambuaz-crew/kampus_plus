# Feature Specification: Register Page (Kayıt Sayfası)

**Module**: 002-register-page  
**Created**: 2025-12-30  
**Status**: Draft  
**Priority**: P1 - Critical

---

## Overview

KAMPÜS+ platformuna kayıt sayfası. Sadece **Türkiye'deki üniversite öğrencileri** (`.edu.tr` email domain'i) kayıt olabilir. Email doğrulama ile güvenlik sağlanır.

**Erişim:** Public (Herkes görebilir, ama sadece üniversite öğrencileri kayıt olabilir)  
**URL:** `/register`  
**Vizyon:** Türkiye geneli 200+ üniversite destekli  
**Pilot Program:** Konya (5 üniversite ile test)

---

## User Story

**"Bir üniversite öğrencisi olarak, KAMPÜS+ platformuna üniversite email'imle kayıt olmak ve email doğrulama yaparak hesabımı aktifleştirmek istiyorum."**

**Kabul Kriterleri:**
1. ✅ Sadece `.edu.tr` uzantılı email'ler kabul edilir
2. ✅ Kullanıcı email, şifre, ad, soyad, bölüm girer
3. ✅ Şifre en az 8 karakter, en az 1 harf, en az 1 rakam içermeli
5. ✅ Bölüm dropdown'dan seçilir (20 yaygın bölüm + "Diğer")
6. ✅ Form validasyonu client-side çalışır (anlık feedback)
7. ✅ Kayıt sonrası doğrulama email'i gönderilir
8. ✅ Kullanıcı email'deki linke tıklayarak hesabını doğrular
9. ✅ Doğrulama sonrası login sayfasına yönlendirilir (otomatik giriş YOK)
10. ✅ Email doğrulanmadan login yapılamaz (is_verified check)
11. ✅ Kullanım koşulları checkbox'ı zorunlu

---

## User Flow

```
1. Kullanıcı Landing Page'de "Hemen Kayıt Ol" veya "Register" butonuna tıklar
   ↓
2. /register sayfası açılır
   ↓
3. Form doldurulur:
   - Email (örn: ali@selcuk.edu.tr)
   - Şifre (min 8 karakter, 1 harf, 1 rakam)
   - Ad (örn: Ali)
   - Soyad (örn: Yılmaz)
   - Bölüm (dropdown: Bilgisayar Mühendisliği, Yazılım Mühendisliği, vs.)
   - [✓] Kullanım koşulları (zorunlu)
   ↓
4. "Kayıt Ol" butonuna tıklanır
   ↓
5. Backend validation:
   ✅ Email .edu.tr ile bitiyor mu?
   ✅ Email daha önce kullanılmış mı?
   ✅ Şifre min 8 karakter, 1 harf, 1 rakam var mı?
   ✅ Bölüm dropdown'dan seçilmiş mi?
   ✅ Kullanım koşulları kabul edilmiş mi?
   ↓
6. Başarılı ise:
   - Kullanıcı DB'ye kaydedilir (is_verified=false)
   - Doğrulama email'i gönderilir
   - Aynı sayfada başarı mesajı gösterilir (form kaybolur)
   ↓
7. Kullanıcı email'ini kontrol eder
   ↓
8. Email'deki "Hesabını Doğrula" linkine tıklar
   ↓
9. Link: /verify-email?token=XXXX
   ↓
10. Backend token'ı doğrular, is_verified=true yapar
    ↓
11. "Email Doğrulandı" mesajı gösterilir
    ↓
12. Login sayfasına yönlendirilir (/login) - 3 saniye sonra otomatik
    ↓
13. Kullanıcı kayıt bilgileriyle manuel giriş yapar
```

---

## Page Structure

### Register Form

**Form Fields:**

1. **Email**
   - Type: `email`
   - Placeholder: `ornek: ali@selcuk.edu.tr`
   - Validation:
     - Boş olamaz
     - Geçerli email formatı
     - `.edu.tr` ile bitmeli
     - Eğer başka domain girilirse: "Lütfen üniversite email adresinizi kullanın (.edu.tr)"
   - Real-time validation: Kullanıcı yazarken yeşil/kırmızı border feedback

2. **Şifre**
   - Type: `password`
   - Placeholder: `En az 8 karakter`
   - Validation:
     - Boş olamaz
     - Minimum 8 karakter
     - En az 1 harf (büyük veya küçük fark etmez)
     - En az 1 rakam (0-9)
   - "Göster/Gizle" ikonu (eye icon)
   - Şifre gücü göstergesi (opsiyonel, basit ✓/✗ feedback)

3. **Ad**
   - Type: `text`
   - Placeholder: `Adınız`
   - Validation:
     - Boş olamaz
     - Minimum 2 karakter
     - Sadece harf ve boşluk

4. **Soyad**
   - Type: `text`
   - Placeholder: `Soyadınız`
   - Validation:
     - Boş olamaz
     - Minimum 2 karakter
     - Sadece harf ve boşluk

6. **Bölüm**
   - Type: `select` (dropdown)
   - Placeholder: `Bölümünüzü seçin`
   - Options:
     - Bilgisayar Mühendisliği
     - Yazılım Mühendisliği
     - Elektrik-Elektronik Mühendisliği
     - Makine Mühendisliği
     - Endüstri Mühendisliği
     - İnşaat Mühendisliği
     - Mimarlık
     - Hukuk
     - Tıp
     - İşletme
     - İktisat
     - Psikoloji
     - İletişim
     - Türk Dili ve Edebiyatı
     - Matematik
     - Fizik
     - Kimya
     - Biyoloji
     - Tarih
     - Diğer
   - Validation:
     - Boş olamaz (dropdown'dan bir seçim yapılmalı)

7. **Kullanım Koşulları Checkbox**
   - Required checkbox
   - Text: "Kullanım koşullarını ve gizlilik politikasını okudum, kabul ediyorum"
   - Link: "kullanım koşulları" → `/terms` (modal veya yeni sayfa)
   - Validation: Checkbox işaretli olmalı (ZORUNLU)

**Submit Button:**
- Text: `Kayıt Ol`
- Loading state: `Kaydediliyor...` (spinner)
- Disabled durumu: Form geçersizse veya submit sırasında

**Already Have Account:**
- Text: "Zaten hesabın var mı? Giriş yap"
- Link: → `/login`

---

### Success Message (Same Page)

Kayıt başarılı olduktan sonra **aynı sayfada** başarı mesajı gösterilir:

```
┌─────────────────────────────────────┐
│   ✅  Kayıt Başarılı!              │
│                                     │
│  ali@selcuk.edu.tr adresinize       │
│  doğrulama linki gönderdik.         │
│                                     │
│  Lütfen email'inizi kontrol edin    │
│  ve hesabınızı aktifleştirin.       │
│                                     │
│  [Giriş Sayfasına Dön]              │
└─────────────────────────────────────┘
```

**Features:**
- Form alanları kaybolur, yerine başarı mesajı gösterilir
- Email adresi gösterilir (tam hali: `ali@selcuk.edu.tr`)
- "Giriş Sayfasına Dön" butonu → `/login`
- "Spam/Junk klasörünü kontrol edin" uyarısı (küçük text)

---

### Email Verification Link Page

Email'deki linke tıklandığında açılan sayfa:

**URL:** `/verify-email?token=abc123xyz`

**Başarılı Doğrulama:**
```
┌─────────────────────────────────────┐
│   ✅  Email Doğrulandı!            │
│                                     │
│  Email adresiniz başarıyla          │
│  doğrulandı. Artık giriş            │
│  yapabilirsiniz!                    │
│                                     │
│  Yönlendiriliyorsunuz...            │
│  (3 saniye içinde login sayfası)    │
└─────────────────────────────────────┘
```
→ 3 saniye sonra otomatik `/login` redirect

**Önemli:** Doğrulama sonrası otomatik login YOK. Kullanıcı login sayfasına yönlendirilir ve manuel giriş yapmalı.

**Hatalı Token:**
```
┌─────────────────────────────────────┐
│   ❌  Doğrulama Başarısız           │
│                                     │
│  Link geçersiz veya süresi dolmuş.  │
│                                     │
│  [Yeni Link Gönder]                 │
│  [Giriş Sayfasına Dön]              │
└─────────────────────────────────────┘
```

---

## Technical Requirements

### Functional Requirements

**FR-001:** Form sadece `.edu.tr` ile biten email'leri kabul etmeli  
**FR-002:** Email client-side ve server-side validate edilmeli  
**FR-003:** Şifre en az 8 karakter, en az 1 harf, en az 1 rakam içermeli  
**FR-005:** Bölüm dropdown'dan seçilmeli (20 yaygın bölüm + "Diğer")  
**FR-006:** Kullanım koşulları checkbox'ı zorunlu olmalı  
**FR-007:** Aynı email ile birden fazla kayıt engellenmelidir  
**FR-008:** Kayıt sonrası doğrulama email'i gönderilmeli (JWT token, 24 saat geçerli)  
**FR-009:** Email doğrulanmadan login'e izin verilmemeli (is_verified=false check)  
**FR-010:** Kayıt başarılı olunca aynı sayfada başarı mesajı gösterilmeli (form kaybolur)  
**FR-011:** Email doğrulama sonrası kullanıcı login sayfasına yönlendirilmeli (otomatik giriş YOK)  
**FR-012:** Email gönderilmezse bile kullanıcıya "başarılı" mesajı gösterilmeli  
**FR-013:** Login'de email doğrulanmamışsa "Resend Email" butonu gösterilmeli  
**FR-014:** Form submit sırasında loading state gösterilmeli  
**FR-015:** Hata mesajları kullanıcı dostu olmalı (teknik detay yok)  

### Non-Functional Requirements

**NFR-001:** Form validasyonu instant feedback vermeli (<100ms)  
**NFR-002:** Email gönderimi 5 saniye içinde tamamlanmalı  
**NFR-003:** Şifre hash'lemesi bcrypt ile yapılmalı (cost factor: 12)  
**NFR-004:** Doğrulama token'ı JWT olmalı (HS256, 24 saat expiry)  
**NFR-005:** Rate limiting: Aynı IP'den 10 dakikada max 5 kayıt denemesi  
**NFR-006:** Resend email: Aynı email'den 1 saatte max 3 deneme  
**NFR-007:** Verify-email sayfası loading popup gösterip otomatik login'e redirect etmeli  
**NFR-008:** SQLite database kullanılmalı (mezuniyet projesi için basitlik ve sıfır maliyet, WAL mode ile concurrent access)  
**NFR-009:** Gmail SMTP (production) + Mailhog (local development) kullanılmalı  

---

## Backend Implementation

### Technical Stack

**Database:**
- SQLite (mezuniyet projesi için basitlik ve sıfır maliyet)
- WAL (Write-Ahead Logging) mode etkin - concurrent reads/writes destekler
- SQLAlchemy (ORM)
- Alembic (migrations)
- **NOT:** PostgreSQL kullanılmaz (production için gerekirse ileride eklenebilir)

**Email Service:**
- **Production:** Gmail SMTP (500 email/gün ücretsiz)
- **Development:** Mailhog (local SMTP test server, Docker)

**Authentication:**
- JWT tokens (PyJWT library)
- Bcrypt password hashing (cost factor: 12)
- Email verification via JWT (24 saat expiry)

**Rate Limiting:**
- In-memory rate limiting (Redis gerekmez, masrafsız)
- Register endpoint: 5 deneme / 10 dakika / IP
- Resend email: 3 deneme / 1 saat / email

### Database Schema

**User Table:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_verified ON users(is_verified);
```

**Not:** Email verification için **ayrı tablo kullanılmaz**. JWT token kullanılır (stateless).

**JWT Token Payload (Email Verification):**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "email_verification",
  "exp": 1672531200,
  "iat": 1672444800
}
```

Token backend'de `jwt.encode()` ile oluşturulur, email'de gönderilir, frontend `/verify-email?token=XXX` ile geri gönderir.

### API Endpoints

**POST /api/v1/auth/register**

**Request:**
```json
{
  "email": "ali@selcuk.edu.tr",
  "password": "SecurePass123",
  "first_name": "Ali",
  "last_name": "Yılmaz",
  "department": "Bilgisayar Mühendisliği",
  "terms_accepted": true
}
```

**Validation Rules:**
- `email`: `.edu.tr` ile bitmeli
- `password`: Min 8 karakter, en az 1 harf, en az 1 rakam
- `first_name`: Min 2 karakter, sadece harf ve boşluk
- `last_name`: Min 2 karakter, sadece harf ve boşluk
- `department`: Dropdown'dan seçilmiş değer (boş olamaz)
- `terms_accepted`: `true` olmalı

**Response (Success - 201 Created):**
```json
{
  "success": true,
  "message": "Kayıt başarılı. Lütfen email'inizi kontrol edin.",
  "email": "ali@selcuk.edu.tr"
}
```

**Not:** Email gönderilmezse bile backend başarılı response döner. Login'de email doğrulanmamış hatası verilir ve resend butonu gösterilir.

**Response (Error - 400 Bad Request - Invalid Email):**
```json
{
  "success": false,
  "error": "invalid_email",
  "message": "Lütfen geçerli bir üniversite email adresi kullanın (.edu.tr)"
}
```

**Response (Error - 409 Conflict - Email Exists):**
```json
{
  "success": false,
  "error": "email_exists",
  "message": "Bu email adresi zaten kayıtlı. Giriş yapmayı deneyin."
}
```

**Response (Error - 400 Bad Request - Weak Password):**
```json
{
  "success": false,
  "error": "weak_password",
  "message": "Şifre en az 8 karakter, en az 1 harf ve 1 rakam içermelidir."
}
```

**Response (Error - 429 Too Many Requests - Rate Limit):**
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Çok fazla deneme yaptınız. Lütfen 10 dakika sonra tekrar deneyin.",
  "retry_after": 600
}
```

---

**POST /api/v1/auth/resend-verification**

**Request:**
```json
{
  "email": "ali@selcuk.edu.tr"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Doğrulama email'i tekrar gönderildi. Lütfen email'inizi kontrol edin."
}
```

**Response (Error - 429 Too Many Requests - Rate Limit):**
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Çok fazla deneme yaptınız. Lütfen 1 saat sonra tekrar deneyin.",
  "retry_after": 3600
}
```

**Rate Limiting:** 3 deneme / 1 saat / email (in-memory cache)

---

**POST /api/v1/auth/verify-email**

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidHlwZSI6ImVtYWlsX3ZlcmlmaWNhdGlvbiIsImV4cCI6MTY3MjUzMTIwMCwiaWF0IjoxNjcyNDQ0ODAwfQ.XXXXX"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Email doğrulandı. Giriş yapabilirsiniz.",
  "redirect_url": "/login"
}
```

**Frontend Behavior:**
- Loading popup gösterilir (spinner)
- Backend'den response gelince başarı mesajı gösterilir
- 2-3 saniye sonra otomatik `/login` redirect

**Not:** Doğrulama sonrası **otomatik login YOK**. Kullanıcı login sayfasına yönlendirilir ve manuel giriş yapmalı.

**Response (Error - 400 Bad Request - Invalid/Expired Token):**
```json
{
  "success": false,
  "error": "invalid_token",
  "message": "Doğrulama linki geçersiz veya süresi dolmuş. Yeni link göndermek için giriş yapın."
}
```

**JWT Token Validation:**
- Token decode edilir (JWT library)
- `type` field'ı `"email_verification"` olmalı
- `exp` (expiry) check edilir (24 saat)
- `user_id` bulunur, `is_verified=true` yapılır

---

### Email Template

**Service:**
- **Production:** Gmail SMTP (kampusplus.noreply@gmail.com)
- **Development:** Mailhog (local test server, port 8025 web UI)

**Gmail SMTP Configuration:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=kampusplus.noreply@gmail.com
SMTP_PASSWORD=<App Password from Google Account>
SMTP_FROM_EMAIL=kampusplus.noreply@gmail.com
SMTP_FROM_NAME=KAMPÜS+ Platform
```

**Mailhog (Development):**
```bash
# Docker ile çalıştır
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Backend .env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=

# Web UI: http://localhost:8025
```

**Subject:** KAMPÜS+ - Email Adresinizi Doğrulayın

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">Merhaba {first_name},</h2>
        
        <p>KAMPÜS+ platformuna hoş geldin!</p>
        
        <p>Hesabını doğrulamak için aşağıdaki linke tıkla:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verification_link}" 
               style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
                Hesabımı Doğrula
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            Link: <a href="{verification_link}">{verification_link}</a>
        </p>
        
        <p style="color: #999; font-size: 12px;">
            Bu link 24 saat geçerlidir.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
            KAMPÜS+ Ekibi
        </p>
    </div>
</body>
</html>
```

**Variables:**
- `{first_name}`: Kullanıcının adı (örn: "Ali")
- `{verification_link}`: `http://localhost:5173/verify-email?token=XXX` (development) veya `https://kampusplus.com/verify-email?token=XXX` (production)

---

## University Email Validation Logic

### Pattern Matching

```python
import re

def is_valid_password(password: str) -> bool:
    """
    Şifre kurallarını kontrol eder:
    - Minimum 8 karakter
    - En az 1 harf (büyük veya küçük)
    - En az 1 rakam
    """
    if len(password) < 8:
        return False
    
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    
    return has_letter and has_digit

def is_valid_university_email(email: str) -> bool:
    """
    Türkiye üniversite email'lerini validate eder.
    Sadece .edu.tr domain'lerini kabul eder.
    """
    # Email formatı kontrolü
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False
    
    # .edu.tr kontrolü
    if email.lower().endswith('.edu.tr'):
        return True
    
    return False

# Test cases
assert is_valid_university_email('ali@selcuk.edu.tr') == True
assert is_valid_university_email('ayse@ktun.edu.tr') == True
assert is_valid_university_email('mehmet@gmail.com') == False
assert is_valid_university_email('test@company.com.tr') == False

assert is_valid_password('abcd1234') == True  # 8 karakter, harf + rakam
assert is_valid_password('Password1') == True  # Harf + rakam
assert is_valid_password('pass123word') == True  # Harf + rakam
assert is_valid_password('12345678') == False  # Sadece rakam
assert is_valid_password('abcdefgh') == False  # Sadece harf
assert is_valid_password('abc123') == False  # 8 karakterden az

```

### Supported Universities (Examples)

Türkiye'deki tüm `.edu.tr` domain'leri otomatik desteklenir:

**Konya (Pilot):**
- ✅ selcuk.edu.tr (Selçuk Üniversitesi)
- ✅ ktun.edu.tr (Konya Teknik Üniversitesi)
- ✅ konya.edu.tr (Necmettin Erbakan Üniversitesi)
- ✅ karatay.edu.tr (KTO Karatay Üniversitesi)
- ✅ gidatarim.edu.tr (Konya Gıda ve Tarım Üniversitesi)

**Diğer Türkiye Üniversiteleri:**
- ✅ bogazici.edu.tr
- ✅ metu.edu.tr (ODTÜ)
- ✅ itu.edu.tr (İTÜ)
- ✅ bilkent.edu.tr
- ✅ hacettepe.edu.tr
- ... ve 200+ üniversite

---

## Security Measures

**Password Security:**
- Bcrypt hashing (cost factor: 12)
- Never store plain text passwords
- Never log passwords
- Minimum 8 karakter, en az 1 harf, en az 1 rakam

**Token Security (JWT):**
- HS256 algorithm (HMAC with SHA-256)
- Secret key: `JWT_SECRET_KEY` environment variable (min 32 characters)
- 24-hour expiration (`exp` claim)
- Payload: `user_id`, `type: "email_verification"`, `iat`, `exp`
- **Stateless:** Token veritabanında saklanmaz (JWT'nin kendisi yeterli)
- Expire olduktan sonra geçersiz olur (resend gerekir)

**Rate Limiting (In-Memory, Redis gerekmez):**
```python
# In-memory cache (masrafsız çözüm)
register_attempts = {}  # {ip_address: [timestamp1, timestamp2, ...]}
resend_attempts = {}    # {email: [timestamp1, timestamp2, ...]}

# Cleanup: 10 dakikadan eski timestamp'ler silinir
def cleanup_old_attempts(cache, window_seconds):
    now = time.time()
    for key in list(cache.keys()):
        cache[key] = [ts for ts in cache[key] if now - ts < window_seconds]
        if not cache[key]:
            del cache[key]
```

**Rate Limits:**
- **Register:** 5 deneme / 10 dakika / IP
- **Resend Email:** 3 deneme / 1 saat / email

**HTTPS (Production Only):**
- SSL/TLS certificates (Let's Encrypt)
- Force HTTPS redirect
- Secure cookies (httpOnly, secure, sameSite)

**SQL Injection Prevention:**
- Parameterized queries (SQLAlchemy ORM)
- Input sanitization
- ORM prevents raw SQL

**XSS Prevention:**
- Escape user inputs in frontend (React does this by default)
- Content Security Policy headers
- Sanitize HTML in email templates

---

## Error Handling

### User-Friendly Error Messages

**Invalid Email Domain:**
```
❌ Lütfen üniversite email adresinizi kullanın
   Örnek: isim@selcuk.edu.tr
```

**Email Already Exists:**
```
❌ Bu email adresi zaten kayıtlı
   [Giriş yap] veya [Şifremi unuttum]
```

**Weak Password:**
```
❌ Şifreniz geçersiz
   Şunları içermelidir:
   • En az 8 karakter
   • En az 1 harf
   • En az 1 rakam
```

**Terms Not Accepted:**
```
❌ Devam etmek için kullanım koşullarını kabul etmelisiniz
```

**Server Error:**
```
❌ Bir hata oluştu. Lütfen tekrar deneyin.
   Sorun devam ederse: destek@kampusplus.com
```

---

## Success Criteria

**SC-001:** `.edu.tr` email'i ile kayıt başarılı olur  
**SC-002:** Gmail/Outlook gibi email'ler reddedilir  
**SC-003:** 8 karakterden kısa veya harf/rakam içermeyen şifreler reddedilir  
**SC-004:** Aynı email ile ikinci kayıt engellenir  
**SC-005:** Doğrulama email'i 5 saniyede gönderilir  
**SC-006:** Email doğrulama linki çalışır  
**SC-007:** Doğrulama sonrası login sayfasına yönlendirilir (otomatik giriş YOK)  
**SC-008:** Email doğrulanmadan giriş yapma engellenir  
**SC-009:** Kayıt başarılı olunca aynı sayfada başarı mesajı gösterilir  
**SC-010:** Form validasyonu instant feedback verir  
**SC-011:** Hata mesajları anlaşılırdır  
**SC-012:** Mobil cihazlarda düzgün çalışır  

---

## Development Setup

### Database Setup (SQLite)

**NOT:** Bu proje mezuniyet projesi için SQLite kullanır (basitlik ve sıfır maliyet).
WAL (Write-Ahead Logging) mode etkin - concurrent reads/writes destekler.

**Database:**
- SQLite (file-based, `backend/kampus_plus_dev.db`)
- WAL mode etkin (concurrent access için)
- Alembic migrations

### Environment Variables

**Backend (.env):**
```bash
# App
ENVIRONMENT=development
DEBUG=True

# Database (SQLite)
DATABASE_URL=sqlite+aiosqlite:///./kampus_plus_dev.db

# JWT
JWT_SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (Mailhog for local development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@kampusplus.local
SMTP_FROM_NAME=KAMPÜS+ Platform

# Frontend URL
FRONTEND_URL=http://localhost:5173

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Frontend (.env.local):**
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=KAMPÜS+
```

### Developer Workflow

1. **İlk setup:**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

2. **Email test etme (opsiyonel - Mailhog):**
- Mailhog web UI: http://localhost:8025
- Register ol → Email Mailhog'da görünür
- Verification link'e tıkla → Doğrulama yapılır

3. **Database check:**
```bash
# SQLite veritabanını kontrol et
sqlite3 backend/kampus_plus_dev.db

# Kullanıcıları listele
SELECT email, first_name, last_name, is_verified FROM users;
```

---

## Out of Scope (Bu Özellikte Yok)

❌ Sosyal medya ile kayıt (Google, Facebook OAuth)  
❌ Telefon numarası ile kayıt  
❌ Üniversite ID kartı upload  
❌ Profil fotoğrafı upload (kayıt sırasında)  
❌ İki faktörlü kimlik doğrulama (2FA)  
❌ Şifre gücü gereksinimleri ayarlanabilir olma  

**Not:** Bunlar ilerleyen özellikler olarak eklenebilir.

---

## Dependencies

**Blocker:**
- Landing Page (001-landing-page) → "Hemen Kayıt Ol" butonu register'a yönlendirir

**Required for Next:**
- Login Page → "Zaten hesabın var mı?" linki login'e gider

**External Dependencies:**
- Email Service (SMTP veya SendGrid)
- Database (SQLite - mezuniyet projesi için)

---

## Pilot Program: Konya Universities

Teknik olarak Türkiye geneli destekli olsa da, **pilot program Konya ile başlar**:

**Marketing Strategy:**
1. Selçuk Üniversitesi kampüsünde tanıtım
2. Konya'daki 5 üniversiteye odaklanma
3. İlk 100 kullanıcı hedefi (Konya)
4. Feedback toplama ve iterasyon
5. Başarılı olursa Türkiye geneli expansion

**Technical Note:**
Sistem her `.edu.tr` email'ini kabul eder, ama ilk tanıtım ve test Konya'da yapılır.

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-30 | 1.0 | Initial specification | AI Agent |

---

**Status:** ✅ Ready for Implementation  
**Next Step:** Create tasks breakdown in `tasks.md`

