# Feature Specification: Login Page (Giriş Sayfası)

**Module**: 003-login-page  
**Created**: 2025-12-30  
**Status**: Draft  
**Priority**: P1 - Critical

---

## Overview

KAMPÜS+ platformuna giriş sayfası. Kayıtlı kullanıcılar email ve şifre ile giriş yapabilir. Email doğrulanmamış kullanıcılar için doğrulama email'i tekrar gönderme özelliği vardır.

**Erişim:** Public (Herkes görebilir)  
**URL:** `/login`  
**Auth Method:** Email + Password (JWT tokens)

---

## User Story

**"Kayıtlı bir kullanıcı olarak, email ve şifremle KAMPÜS+ platformuna güvenli bir şekilde giriş yapmak istiyorum."**

**Kabul Kriterleri:**
1. ✅ Kullanıcı email ve şifre ile giriş yapar
2. ✅ Email doğrulanmış olmalı (is_verified=true)
3. ✅ "Beni Hatırla" seçeneği ile oturum süresi uzatılabilir (7 gün → 30 gün)
4. ✅ "Şifremi Unuttum" linki ile şifre sıfırlama yapılabilir
5. ✅ Email doğrulanmamışsa hata verilir + "Email Tekrar Gönder" butonu gösterilir
6. ✅ Başarılı girişte dashboard'a yönlendirilir
7. ✅ Rate limiting ile brute force saldırıları engellenir (5 deneme / 10 dakika)

---

## User Flow

### Happy Path (Başarılı Giriş)

```
1. Kullanıcı /login sayfasına gelir
   ↓
2. Form doldurulur:
   - Email: ali@selcuk.edu.tr
   - Şifre: ••••••••
   - ☐ Beni Hatırla (opsiyonel)
   ↓
3. "Giriş Yap" butonuna tıklanır
   ↓
4. Backend validation:
   ✅ Email ve şifre doğru mu?
   ✅ Kullanıcı aktif mi? (is_active=true)
   ✅ Email doğrulanmış mı? (is_verified=true)
   ↓
5. JWT tokens oluşturulur:
   - Access Token (15 dakika, response body)
   - Refresh Token (7 gün veya 30 gün, httpOnly cookie)
   ↓
6. Dashboard'a yönlendirilir (/dashboard)
```

### Error Flow: Email Doğrulanmamış

```
1. Kullanıcı giriş yapmaya çalışır
   ↓
2. Backend: Email doğrulanmamış (is_verified=false)
   ↓
3. Hata mesajı gösterilir:
   ❌ Email Doğrulanmamış
   
   Hesabınıza giriş yapmadan önce email adresinizi
   doğrulamanız gerekiyor.
   
   [Email Tekrar Gönder]
   ↓
4. Kullanıcı "Email Tekrar Gönder" butonuna tıklar
   ↓
5. Yeni doğrulama email'i gönderilir
   ↓
6. Başarı mesajı: "Doğrulama email'i gönderildi. Lütfen email'inizi kontrol edin."
```

### Password Reset Flow

```
1. Kullanıcı "Şifremi Unuttum" linkine tıklar
   ↓
2. /forgot-password sayfası açılır
   ↓
3. Email girer: ali@selcuk.edu.tr
   ↓
4. Backend password reset email'i gönderir
   ↓
5. Kullanıcı email'deki linke tıklar
   ↓
6. /reset-password?token=XXX sayfası açılır
   ↓
7. Yeni şifre girer (2 kez, confirmation)
   ↓
8. Şifre güncellenir
   ↓
9. Login sayfasına yönlendirilir
   ↓
10. Yeni şifre ile giriş yapar
```

---

## Page Structure

### Login Form

**Form Fields:**

1. **Email**
   - Type: `email`
   - Placeholder: `Email adresiniz`
   - Validation:
     - Boş olamaz
     - Geçerli email formatı
   - Auto-complete: `email`

2. **Şifre**
   - Type: `password`
   - Placeholder: `Şifreniz`
   - Validation:
     - Boş olamaz
   - "Göster/Gizle" ikonu (eye icon)
   - Auto-complete: `current-password`

3. **Beni Hatırla Checkbox**
   - Type: `checkbox`
   - Text: "Beni Hatırla (30 gün)"
   - Optional (default: unchecked)
   - Eğer checked → refresh token 30 gün geçerli olur
   - Eğer unchecked → refresh token 7 gün geçerli olur

**Submit Button:**
- Text: `Giriş Yap`
- Loading state: `Giriş yapılıyor...` (spinner)
- Disabled durumu: Form geçersizse veya submit sırasında

**Additional Links:**
- "Şifremi Unuttum?" → `/forgot-password`
- "Hesabın yok mu? Kayıt ol" → `/register`

---

### Error Message: Email Not Verified

Email doğrulanmamış kullanıcı giriş yapmaya çalıştığında:

```
┌─────────────────────────────────────┐
│   ❌  Email Doğrulanmamış           │
│                                     │
│  Hesabınıza giriş yapmadan önce     │
│  email adresinizi doğrulamanız      │
│  gerekiyor.                         │
│                                     │
│  [Email Tekrar Gönder]              │
│                                     │
│  Email'inizi kontrol edin.          │
│  Spam/Junk klasörünü de kontrol     │
│  edin.                              │
└─────────────────────────────────────┘
```

**Behavior:**
- Form kaybolmaz, sadece üstte hata mesajı gösterilir
- "Email Tekrar Gönder" butonu tıklanınca:
  - POST `/api/v1/auth/resend-verification`
  - Rate limit check (3 deneme / 1 saat)
  - Başarılıysa: "Email gönderildi" mesajı
  - Hata varsa: Rate limit hatası

---

### Forgot Password Page

**URL:** `/forgot-password`

**Form:**
```
┌─────────────────────────────────────┐
│   Şifremi Unuttum                   │
│                                     │
│  Email adresinizi girin, size       │
│  şifre sıfırlama linki gönderelim.  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Email                         │  │
│  │ ali@selcuk.edu.tr             │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Gönder]                           │
│                                     │
│  [← Giriş Sayfasına Dön]            │
└─────────────────────────────────────┘
```

**Success Message:**
```
✅ Email Gönderildi

Eğer bu email kayıtlıysa, şifre sıfırlama 
linki gönderildi. Lütfen email'inizi 
kontrol edin.

(Security: Email enumeration prevention)
```

---

### Reset Password Page

**URL:** `/reset-password?token=XXX`

**Form:**
```
┌─────────────────────────────────────┐
│   Yeni Şifre Belirle                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Yeni Şifre                    │  │
│  │ ••••••••                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Şifre Tekrar                  │  │
│  │ ••••••••                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  Şifre Kuralları:                   │
│  • En az 8 karakter                 │
│  • En az 1 harf                     │
│  • En az 1 rakam                    │
│                                     │
│  [Şifremi Güncelle]                 │
└─────────────────────────────────────┘
```

**Success:**
```
✅ Şifre Güncellendi

Şifreniz başarıyla güncellendi.
Artık yeni şifrenizle giriş yapabilirsiniz.

[Giriş Yap]
```

---

## Technical Requirements

### Functional Requirements

**FR-001:** Email ve şifre ile giriş yapılabilmeli  
**FR-002:** Email doğrulanmamışsa (is_verified=false) giriş engellenmelidir  
**FR-003:** Email doğrulanmamış hatası durumunda "Email Tekrar Gönder" butonu gösterilmelidir  
**FR-004:** "Beni Hatırla" seçeneği refresh token süresini 7 günden 30 güne çıkarmalı  
**FR-005:** Başarılı girişte kullanıcı dashboard'a yönlendirilmelidir  
**FR-006:** "Şifremi Unuttum" linki ile password reset flow başlatılabilmelidir  
**FR-007:** Password reset email'i JWT token içermeli (1 saat geçerli)  
**FR-008:** Password reset sayfasında şifre confirmation (2 kez girmeli) olmalı  
**FR-009:** Yeni şifre eski şifre kurallarına uymalı (min 8 karakter, 1 harf, 1 rakam)  
**FR-010:** Rate limiting ile brute force engellenmelidir (5 deneme / 10 dakika / IP)

### Non-Functional Requirements

**NFR-001:** Login response süresi <500ms olmalı  
**NFR-002:** JWT access token 15 dakika geçerli olmalı  
**NFR-003:** JWT refresh token 7 gün (default) veya 30 gün ("Beni Hatırla") geçerli olmalı  
**NFR-004:** Refresh token httpOnly cookie olarak saklanmalı (XSS koruması)  
**NFR-005:** Password reset token 1 saat geçerli olmalı  
**NFR-006:** Forgot password email'i her durumda "gönderildi" mesajı dönmeli (email enumeration prevention)

---

## Backend Implementation

### Technical Stack

**Same as Register:**
- SQLite (mezuniyet projesi için, WAL mode ile concurrent access)
- JWT tokens (PyJWT)
- Bcrypt password verification
- Gmail SMTP (production) + Mailhog (development)
- In-memory rate limiting

### API Endpoints

**POST /api/v1/auth/login**

**Request:**
```json
{
  "email": "ali@selcuk.edu.tr",
  "password": "SecurePass123",
  "remember_me": false
}
```

**Response (Success - 200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "ali@selcuk.edu.tr",
    "first_name": "Ali",
    "last_name": "Yılmaz",
    "role": "student",
    "is_verified": true
  }
}
```

**Note:** Refresh token response body'de DEĞİL, httpOnly cookie olarak set edilir.

**Response (Error - 401 Unauthorized - Invalid Credentials):**
```json
{
  "success": false,
  "error": "invalid_credentials",
  "message": "Email veya şifre hatalı."
}
```

**Response (Error - 403 Forbidden - Email Not Verified):**
```json
{
  "success": false,
  "error": "email_not_verified",
  "message": "Email adresiniz doğrulanmamış. Lütfen email'inizi kontrol edin.",
  "email": "ali@selcuk.edu.tr"
}
```

Frontend bu hatayı alınca "Email Tekrar Gönder" butonu gösterir.

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

**POST /api/v1/auth/forgot-password**

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
  "message": "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi."
}
```

**Note:** Security best practice → Her durumda aynı mesaj (email enumeration prevention)

**Backend Logic:**
1. Email'i database'de ara
2. Varsa:
   - Password reset token oluştur (JWT, 1 saat expiry)
   - Email gönder
3. Yoksa:
   - Hiçbir şey yapma (sessiz başarısızlık)
4. Her durumda aynı response dön

---

**POST /api/v1/auth/reset-password**

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewPass123",
  "confirm_password": "NewPass123"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz."
}
```

**Response (Error - 400 Bad Request - Invalid Token):**
```json
{
  "success": false,
  "error": "invalid_token",
  "message": "Şifre sıfırlama linki geçersiz veya süresi dolmuş."
}
```

**Response (Error - 400 Bad Request - Password Mismatch):**
```json
{
  "success": false,
  "error": "password_mismatch",
  "message": "Şifreler eşleşmiyor."
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

---

### Email Template: Password Reset

**Subject:** KAMPÜS+ - Şifre Sıfırlama

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
        
        <p>Şifrenizi sıfırlamak için bir istek aldık.</p>
        
        <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" 
               style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
                Şifremi Sıfırla
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            Link: <a href="{reset_link}">{reset_link}</a>
        </p>
        
        <p style="color: #999; font-size: 12px;">
            Bu link 1 saat geçerlidir.
        </p>
        
        <p style="color: #999; font-size: 12px;">
            Eğer bu isteği siz yapmadıysanız, bu email'i görmezden gelebilirsiniz.
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
- `{first_name}`: Kullanıcının adı
- `{reset_link}`: `http://localhost:5173/reset-password?token=XXX` (development) veya production URL

---

## Security Measures

**Authentication:**
- ✅ Bcrypt password verification
- ✅ JWT access token (15 dakika)
- ✅ JWT refresh token (7 gün veya 30 gün, httpOnly cookie)
- ✅ Refresh token rotation (her refresh'te yeni token)

**Rate Limiting:**
- ✅ Login: 5 deneme / 10 dakika / IP
- ✅ Forgot Password: 3 deneme / 1 saat / email
- ✅ Reset Password: 5 deneme / 1 saat / IP

**Password Reset Security:**
- ✅ Token JWT (1 saat expiry, single use)
- ✅ Email enumeration prevention (her durumda aynı mesaj)
- ✅ Old password'ü sorma (email verification yeterli)

**Session Security:**
- ✅ httpOnly cookies (XSS koruması)
- ✅ Secure flag (HTTPS only, production)
- ✅ SameSite=Strict (CSRF koruması)
- ✅ Refresh token rotation

---

## Error Handling

### User-Friendly Error Messages

**Invalid Credentials:**
```
❌ Email veya şifre hatalı
```

**Email Not Verified:**
```
❌ Email Doğrulanmamış

Hesabınıza giriş yapmadan önce email adresinizi 
doğrulamanız gerekiyor.

[Email Tekrar Gönder]
```

**Rate Limit Exceeded:**
```
❌ Çok fazla deneme yaptınız

Güvenlik amacıyla giriş denemeleriniz geçici olarak 
engellendi. Lütfen 10 dakika sonra tekrar deneyin.
```

**Server Error:**
```
❌ Bir hata oluştu

Lütfen tekrar deneyin. Sorun devam ederse: 
destek@kampusplus.com
```

---

## Success Criteria

**SC-001:** Email ve şifre ile giriş başarılı olur  
**SC-002:** Yanlış email/şifre ile giriş reddedilir  
**SC-003:** Email doğrulanmamış kullanıcı giriş yapamaz  
**SC-004:** "Email Tekrar Gönder" butonu çalışır  
**SC-005:** "Beni Hatırla" seçeneği refresh token süresini uzatır  
**SC-006:** "Şifremi Unuttum" flow çalışır  
**SC-007:** Password reset email'i gönderilir (1 saat geçerli)  
**SC-008:** Yeni şifre ile giriş yapılabilir  
**SC-009:** Rate limiting çalışır (brute force engellenir)  
**SC-010:** Başarılı girişte dashboard'a yönlendirilir  
**SC-011:** Mobile'de düzgün çalışır  

---

## Out of Scope (Bu Özellikte Yok)

❌ Sosyal medya ile giriş (Google, Facebook OAuth)  
❌ İki faktörlü kimlik doğrulama (2FA)  
❌ Biometric authentication (Face ID, Touch ID)  
❌ Magic link login (passwordless)  
❌ CAPTCHA (MVP için rate limiting yeterli)  
❌ Session management (aktif oturumları görme)  
❌ Device management (cihazları yönetme)  

**Not:** Bunlar ilerleyen özellikler olarak eklenebilir.

---

## Dependencies

**Blocker:**
- Register Page (002-register-page) → Kullanıcılar kayıt olmadan login yapamaz

**Related:**
- Dashboard Page → Login sonrası yönlendirilecek sayfa
- Email Verification → Email doğrulanmamış kullanıcılar için resend

**External Dependencies:**
- Email Service (Gmail SMTP / Mailhog)
- Database (SQLite - mezuniyet projesi için)
- JWT library (PyJWT)

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-30 | 1.0 | Initial specification | AI Agent |

---

**Status:** ✅ Ready for Implementation  
**Next Step:** Create tasks breakdown in `tasks.md`

