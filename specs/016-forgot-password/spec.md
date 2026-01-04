# Feature Specification: Forgot Password Page

**Module**: 016-forgot-password  
**Created**: 2 Ocak 2026  
**Status**: Ready for Development  
**Priority**: P1 - Critical

---

## Overview

Kullanıcıların şifrelerini unuttuklarında şifre sıfırlama linki almak için kullandıkları sayfa. Email adreslerini girerek şifre sıfırlama email'i alabilirler.

**Erişim:** Public (Herkes görebilir)  
**URL:** `/forgot-password`  
**Auth Method:** Email (JWT password reset token)

---

## User Story

**"Şifremi unutan bir kullanıcı olarak, email adresimi girerek şifre sıfırlama linki almak istiyorum."**

**Kabul Kriterleri:**
1. ✅ Kullanıcı email adresini girer
2. ✅ Email geçerli formatta olmalı (`.edu.tr` domain kontrolü yok, her email kabul edilir)
3. ✅ Backend email'i kontrol eder (varsa link gönderir, yoksa sessiz başarısızlık)
4. ✅ Her durumda aynı başarı mesajı gösterilir (email enumeration prevention)
5. ✅ Rate limiting uygulanır (5 deneme / 10 dakika / email)
6. ✅ Başarılı gönderim sonrası bilgilendirme mesajı gösterilir
7. ✅ "Giriş Sayfasına Dön" ve "Kayıt Ol" linkleri bulunur

---

## Page Structure

### 1. Forgot Password Form

```
┌─────────────────────────────────────┐
│                                     │
│      Şifremi Unuttum                │
│                                     │
│  Email adresinizi girin, size       │
│  şifre sıfırlama linki gönderelim. │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Email Adresiniz                │  │
│  │ ali@selcuk.edu.tr              │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Şifre Sıfırlama Linki Gönder]     │
│                                     │
│  Zaten hatırladınız mı?             │
│  [Giriş Sayfasına Dön]              │
│                                     │
│  Hesabınız yok mu?                  │
│  [Kayıt Ol]                         │
│                                     │
└─────────────────────────────────────┘
```

**Form Fields:**

1. **Email**
   - Type: `email`
   - Placeholder: `Email adresiniz`
   - Validation:
     - Boş olamaz
     - Geçerli email formatı
   - Auto-complete: `email`
   - Required: ✅

**Submit Button:**
- Text: `Şifre Sıfırlama Linki Gönder`
- Loading state: `Gönderiliyor...` (spinner)
- Disabled durumu: Form geçersizse veya submit sırasında

**Additional Links:**
- "Zaten hatırladınız mı? Giriş Sayfasına Dön" → `/login`
- "Hesabınız yok mu? Kayıt Ol" → `/register`

---

### 2. Success State (Email Gönderildi)

Form submit edildikten sonra başarı mesajı gösterilir:

```
┌─────────────────────────────────────┐
│                                     │
│         ✅ Email Gönderildi         │
│                                     │
│  Eğer bu email kayıtlıysa, şifre    │
│  sıfırlama linki gönderildi.         │
│  Lütfen email'inizi kontrol edin.   │
│                                     │
│  Email gelmedi mi?                  │
│  • Spam klasörünü kontrol edin      │
│  • 5 dakika bekleyin                │
│  • Tekrar deneyin (10 dakika sonra) │
│                                     │
│  [Giriş Sayfasına Dön]              │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- ✅ İkonu (yeşil checkmark)
- Başarı mesajı (email enumeration prevention için genel mesaj)
- Yardımcı bilgiler (spam klasörü, bekleme süresi)
- "Giriş Sayfasına Dön" butonu

**Önemli:** Her durumda (email kayıtlı olsun veya olmasın) aynı mesaj gösterilir. Bu, email enumeration saldırılarını önlemek için güvenlik best practice'idir.

---

### 3. Error State

Form validation hataları veya API hataları:

```
┌─────────────────────────────────────┐
│                                     │
│      ❌ Hata                        │
│                                     │
│  Email formatı geçersiz.            │
│  Lütfen geçerli bir email adresi   │
│  girin.                             │
│                                     │
│  [Tekrar Dene]                      │
│                                     │
└─────────────────────────────────────┘
```

**Hata Durumları:**

1. **Email formatı geçersiz**
   - Mesaj: "Lütfen geçerli bir email adresi girin."

2. **Email boş**
   - Mesaj: "Email adresi zorunludur."

3. **Rate limit aşıldı**
   - Mesaj: "Çok fazla deneme yaptınız. Lütfen 10 dakika sonra tekrar deneyin."
   - Retry after: 10 dakika

4. **Network error / Server error**
   - Mesaj: "Bir hata oluştu. Lütfen daha sonra tekrar deneyin."

---

## Technical Requirements

### Functional Requirements

**FR-001:** Email input field zorunlu olmalı  
**FR-002:** Email format validation (client-side ve server-side)  
**FR-003:** Form submit edildiğinde backend'e POST request gönderilmeli  
**FR-004:** Her durumda (email kayıtlı olsun veya olmasın) aynı başarı mesajı gösterilmeli  
**FR-005:** Rate limiting uygulanmalı (5 deneme / 10 dakika / email)  
**FR-006:** Loading state gösterilmeli (submit sırasında)  
**FR-007:** Success state gösterilmeli (email gönderildi)  
**FR-008:** Error handling yapılmalı (validation, rate limit, network errors)  
**FR-009:** "Giriş Sayfasına Dön" ve "Kayıt Ol" linkleri çalışmalı

---

### Non-Functional Requirements

**NFR-001:** Sayfa yükleme süresi < 1 saniye olmalı  
**NFR-002:** API response süresi < 500ms olmalı  
**NFR-003:** Mobile responsive olmalı  
**NFR-004:** Email enumeration prevention (güvenlik)  
**NFR-005:** Rate limiting (spam prevention)

---

## Backend API Endpoint

### POST /api/v1/auth/forgot-password

**Request Body:**
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

**Response (Error - 400 Bad Request - Invalid Email):**
```json
{
  "success": false,
  "error": "invalid_email",
  "message": "Lütfen geçerli bir email adresi girin."
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

**Backend Logic:**
1. Email format validation
2. Rate limiting check (5 deneme / 10 dakika / email)
3. Email'i database'de ara
4. Varsa:
   - Password reset JWT token oluştur (1 saat expiry)
   - Token payload: `{user_id, type: "password_reset", exp, iat}`
   - Email gönder (password reset link ile)
5. Yoksa:
   - Hiçbir şey yapma (sessiz başarısızlık)
6. Her durumda aynı response dön (email enumeration prevention)

**Security Best Practice:**
- Email enumeration prevention: Her durumda aynı mesaj
- Rate limiting: 5 deneme / 10 dakika / email
- Token expiry: 1 saat
- Token one-time use: Reset password sonrası token geçersiz olur

---

## Frontend Implementation

### Component Structure

```
forgot-password/
├── ForgotPasswordPage.tsx      ← Ana sayfa component
├── ForgotPasswordForm.tsx       ← Form component
├── ForgotPasswordSuccess.tsx   ← Başarı state component
└── ForgotPasswordError.tsx     ← Hata state component
```

### State Management

```typescript
type ForgotPasswordState = 
  | 'form'        // Form gösteriliyor
  | 'loading'      // Submit ediliyor
  | 'success'      // Email gönderildi
  | 'error';       // Hata durumu

interface ForgotPasswordPageState {
  state: ForgotPasswordState;
  email: string;
  errorMessage?: string;
  errorCode?: string;
  retryAfter?: number;  // Rate limit için (saniye)
}
```

### User Flow

```
1. Kullanıcı /forgot-password sayfasına gelir
   ↓
2. Email adresini girer
   ↓
3. "Şifre Sıfırlama Linki Gönder" butonuna tıklar
   ↓
4. Form validation (client-side)
   ↓
5. POST /api/v1/auth/forgot-password çağrılır
   ↓
6a. Başarılı → Success state gösterilir
    → "Eğer bu email kayıtlıysa..." mesajı
   ↓
6b. Hata → Error state gösterilir
    → Hata mesajı
    → "Tekrar Dene" butonu
```

### Code Example

```tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword } from '@/api/auth';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!email || !email.includes('@')) {
      setState('error');
      setErrorMessage('Lütfen geçerli bir email adresi girin.');
      return;
    }

    setState('loading');

    try {
      const response = await forgotPassword(email);
      
      if (response.success) {
        setState('success');
      } else {
        setState('error');
        setErrorMessage(response.message);
        
        if (response.retry_after) {
          setRetryAfter(response.retry_after);
        }
      }
    } catch (error: any) {
      setState('error');
      
      if (error.response?.status === 429) {
        setErrorMessage(error.response.data.message);
        setRetryAfter(error.response.data.retry_after);
      } else {
        setErrorMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    }
  };

  if (state === 'success') {
    return <ForgotPasswordSuccess />;
  }

  return (
    <div className="forgot-password-page">
      <h1>Şifremi Unuttum</h1>
      <p>Email adresinizi girin, size şifre sıfırlama linki gönderelim.</p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email adresiniz"
          required
          disabled={state === 'loading'}
        />
        
        {state === 'error' && (
          <div className="error-message">{errorMessage}</div>
        )}
        
        {retryAfter && (
          <div className="retry-info">
            {Math.floor(retryAfter / 60)} dakika sonra tekrar deneyebilirsiniz.
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={state === 'loading' || !email}
        >
          {state === 'loading' ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
        </button>
      </form>
      
      <div className="links">
        <Link to="/login">Zaten hatırladınız mı? Giriş Sayfasına Dön</Link>
        <Link to="/register">Hesabınız yok mu? Kayıt Ol</Link>
      </div>
    </div>
  );
};
```

---

## UI/UX Design

### Color Scheme

**Form State:**
- Background: White / Light gray
- Input border: Gray (#D1D5DB)
- Input focus: Primary blue (#3B82F6)
- Button: Primary blue (#3B82F6)
- Text: Dark gray (#1F2937)

**Success State:**
- Background: White / Light gray
- Icon: Green (#10B981)
- Text: Dark gray (#1F2937)
- Button: Primary blue (#3B82F6)

**Error State:**
- Background: White / Light gray
- Icon: Red (#EF4444)
- Error text: Red (#EF4444)
- Button: Primary blue (#3B82F6)

### Typography

- **Başlık:** 24px, Bold
- **Açıklama:** 16px, Regular
- **Input:** 16px, Regular
- **Buton:** 16px, Medium
- **Link:** 14px, Regular

### Spacing

- Container: Max-width 450px, centered
- Padding: 32px (mobile: 24px)
- Input spacing: 16px
- Button spacing: 24px

### Responsive Design

- Mobile: Full width, padding 24px
- Tablet: Max-width 450px, centered
- Desktop: Max-width 450px, centered

---

## Email Template

Password reset email'i şu bilgileri içermelidir:

**Subject:** "KAMPÜS+ - Şifre Sıfırlama"

**Body:**
```
Merhaba {first_name},

Şifre sıfırlama talebiniz alındı. Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:

[Şifremi Sıfırla] → /reset-password?token=XXX

Bu link 1 saat geçerlidir.

Eğer bu talebi siz yapmadıysanız, bu email'i görmezden gelebilirsiniz.

Saygılarımızla,
KAMPÜS+ Ekibi
```

**Link Format:**
- Development: `http://localhost:5173/reset-password?token=XXX`
- Production: `https://kampusplus.com/reset-password?token=XXX`

---

## Error Handling

### Email Format Validation

**Client-Side:**
- HTML5 email input type
- JavaScript validation (regex veya built-in validation)

**Server-Side:**
- Email format validation (regex)
- Email domain kontrolü YOK (her email kabul edilir, sadece format kontrolü)

### Rate Limiting

**Limit:** 5 deneme / 10 dakika / email

**Implementation:**
- In-memory cache (development)
- Redis (production, opsiyonel)

**Error Response:**
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Çok fazla deneme yaptınız. Lütfen 10 dakika sonra tekrar deneyin.",
  "retry_after": 600
}
```

**Frontend Handling:**
- Error mesajı göster
- Retry after countdown (opsiyonel)
- Submit butonu disable et (retry after süresi boyunca)

### Network Errors

**Durum:** API çağrısı başarısız (network error, 500 error, vb.)  
**UI:** Error state gösterilir  
**Mesaj:** "Bir hata oluştu. Lütfen daha sonra tekrar deneyin."

---

## Security Considerations

1. **Email Enumeration Prevention:**
   - Her durumda (email kayıtlı olsun veya olmasın) aynı mesaj gösterilir
   - Backend'de sessiz başarısızlık (email yoksa hiçbir şey yapma)

2. **Rate Limiting:**
   - 5 deneme / 10 dakika / email
   - Spam prevention

3. **Token Security:**
   - JWT token, 1 saat expiry
   - Token payload'da `type: "password_reset"` kontrolü
   - Token one-time use (reset password sonrası geçersiz)

4. **HTTPS:**
   - Production'da HTTPS kullanılmalı

5. **Email Security:**
   - Email'de token gönderilir (URL'de)
   - Token 1 saat geçerli
   - Token kullanıldıktan sonra geçersiz olur

---

## Testing Scenarios

### Happy Path

1. ✅ Geçerli email ile form submit
2. ✅ Email kayıtlı → Password reset email gönderilir
3. ✅ Success state gösterilir
4. ✅ Email'de link doğru format

### Error Scenarios

1. ✅ Email formatı geçersiz → Validation error
2. ✅ Email boş → Validation error
3. ✅ Rate limit aşıldı → Rate limit error
4. ✅ Network error → Network error mesajı

### Security Scenarios

1. ✅ Email kayıtlı değil → Aynı başarı mesajı (enumeration prevention)
2. ✅ Rate limiting çalışıyor
3. ✅ Token 1 saat geçerli
4. ✅ Token one-time use

### Edge Cases

1. ✅ Email çok uzun → Validation error
2. ✅ Email özel karakterler içeriyor → Validation
3. ✅ Multiple rapid requests → Rate limiting
4. ✅ Sayfa yenilenirse → Form state sıfırlanır

---

## Integration Points

### Related Modules

- **003-login-page:** "Şifremi Unuttum?" linki bu sayfaya yönlendirir
- **017-reset-password:** Bu sayfadan gönderilen email'deki link reset password sayfasına gider
- **Backend Auth Service:** Forgot password endpoint'i

### Dependencies

- React Router (Link, useNavigate)
- API Client (forgotPassword function)
- UI Components (Button, Input, Loading Spinner, Icon)

---

## Future Enhancements (MVP Sonrası)

1. **Email Domain Validation:** `.edu.tr` domain kontrolü (şu an yok, her email kabul edilir)
2. **Captcha:** Bot prevention için captcha ekleme
3. **Alternative Methods:** SMS veya telefon ile şifre sıfırlama
4. **Account Recovery:** Email doğrulama olmadan hesap kurtarma
5. **Security Questions:** Güvenlik soruları ile şifre sıfırlama

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Ready for Development

