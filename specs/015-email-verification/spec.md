# Feature Specification: Email Verification Page

**Module**: 015-email-verification  
**Created**: 2 Ocak 2026  
**Status**: Ready for Development  
**Priority**: P1 - Critical

---

## Overview

Kullanıcıların email adreslerini doğrulamak için kullanılan sayfa. Register işlemi sonrası gönderilen email'deki linke tıklandığında bu sayfa açılır ve token doğrulaması yapılır.

**Erişim:** Public (Token ile erişim)  
**URL:** `/verify-email?token=XXX`  
**Auth Method:** JWT Token (email verification token)

---

## User Story

**"Yeni kayıt olan bir kullanıcı olarak, email adresimi doğrulamak ve platforma giriş yapabilmek için doğrulama linkine tıklıyorum."**

**Kabul Kriterleri:**
1. ✅ Email'deki linke tıklandığında `/verify-email?token=XXX` sayfası açılır
2. ✅ Token otomatik olarak backend'e gönderilir ve doğrulanır
3. ✅ Başarılı doğrulama durumunda başarı mesajı gösterilir
4. ✅ 3 saniye sonra otomatik olarak `/login` sayfasına yönlendirilir
5. ✅ Hatalı/geçersiz token durumunda hata mesajı gösterilir
6. ✅ Hatalı token durumunda "Yeni Link Gönder" ve "Giriş Sayfasına Dön" butonları gösterilir
7. ✅ Loading state gösterilir (token doğrulanırken)

---

## Page Structure

### 1. Loading State (İlk Yükleme)

Sayfa açıldığında token otomatik olarak backend'e gönderilir ve doğrulanır. Bu süreçte loading state gösterilir:

```
┌─────────────────────────────────────┐
│                                     │
│         ⏳ Yükleniyor...            │
│                                     │
│    Email doğrulanıyor...           │
│                                     │
└─────────────────────────────────────┘
```

**Teknik Detaylar:**
- Sayfa yüklendiğinde (`useEffect`) token query parameter'ından alınır
- Token varsa otomatik olarak `POST /api/v1/auth/verify-email` endpoint'ine gönderilir
- Response gelene kadar loading spinner gösterilir
- Token yoksa hata mesajı gösterilir

---

### 2. Success State (Başarılı Doğrulama)

Token geçerliyse ve email başarıyla doğrulanırsa:

```
┌─────────────────────────────────────┐
│                                     │
│         ✅ Email Doğrulandı!       │
│                                     │
│  Email adresiniz başarıyla        │
│  doğrulandı. Artık giriş            │
│  yapabilirsiniz!                    │
│                                     │
│  Yönlendiriliyorsunuz...            │
│  (3 saniye içinde login sayfası)    │
│                                     │
│  [Giriş Sayfasına Git]             │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- ✅ İkonu (yeşil checkmark)
- Başarı mesajı
- Otomatik redirect countdown (3 saniye)
- "Giriş Sayfasına Git" butonu (manuel redirect için)

**Otomatik Redirect:**
- 3 saniye sonra otomatik olarak `/login` sayfasına yönlendirilir
- Countdown gösterilir: "3... 2... 1..." veya progress bar

**Önemli:** Doğrulama sonrası **otomatik login YOK**. Kullanıcı login sayfasına yönlendirilir ve manuel giriş yapmalı.

---

### 3. Error State (Hatalı/Geçersiz Token)

Token geçersiz, süresi dolmuş veya zaten kullanılmışsa:

```
┌─────────────────────────────────────┐
│                                     │
│      ❌ Doğrulama Başarısız         │
│                                     │
│  Link geçersiz veya süresi dolmuş. │
│                                     │
│  Yeni bir doğrulama linki           │
│  göndermek için giriş yapın.        │
│                                     │
│  [Yeni Link Gönder]                 │
│  [Giriş Sayfasına Dön]              │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- ❌ İkonu (kırmızı X veya uyarı)
- Hata mesajı
- "Yeni Link Gönder" butonu → `/login` sayfasına yönlendirir (login sayfasında "Email Tekrar Gönder" özelliği var)
- "Giriş Sayfasına Dön" butonu → `/login` sayfasına yönlendirir

**Hata Durumları:**
1. **Token yok:** URL'de token query parameter'ı yok
2. **Geçersiz token:** Token formatı hatalı veya decode edilemiyor
3. **Süresi dolmuş:** Token'ın `exp` (expiry) süresi geçmiş (24 saat)
4. **Zaten kullanılmış:** Email zaten doğrulanmış (`is_verified=true`)
5. **Kullanıcı bulunamadı:** Token'daki `user_id` geçersiz

---

## Technical Requirements

### Functional Requirements

**FR-001:** Sayfa yüklendiğinde token query parameter'ından alınmalı  
**FR-002:** Token varsa otomatik olarak backend'e gönderilmeli  
**FR-003:** Backend response'una göre success/error state gösterilmeli  
**FR-004:** Başarılı doğrulama sonrası 3 saniye countdown gösterilmeli  
**FR-005:** 3 saniye sonra otomatik `/login` redirect yapılmalı  
**FR-006:** Hatalı token durumunda kullanıcıya yardımcı butonlar gösterilmeli  
**FR-007:** Loading state gösterilmeli (token doğrulanırken)  
**FR-008:** Email zaten doğrulanmışsa uygun mesaj gösterilmeli

---

### Non-Functional Requirements

**NFR-001:** Sayfa yükleme süresi < 1 saniye olmalı  
**NFR-002:** Token doğrulama API response süresi < 500ms olmalı  
**NFR-003:** Otomatik redirect smooth olmalı (ani değil)  
**NFR-004:** Mobile responsive olmalı  
**NFR-005:** Error handling kullanıcı dostu olmalı

---

## Backend API Endpoint

### POST /api/v1/auth/verify-email

**Request Body:**
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

**Response (Error - 400 Bad Request - Invalid/Expired Token):**
```json
{
  "success": false,
  "error": "invalid_token",
  "message": "Doğrulama linki geçersiz veya süresi dolmuş. Yeni link göndermek için giriş yapın."
}
```

**Response (Error - 400 Bad Request - Already Verified):**
```json
{
  "success": false,
  "error": "already_verified",
  "message": "Bu email adresi zaten doğrulanmış. Giriş yapabilirsiniz."
}
```

**Response (Error - 400 Bad Request - Token Missing):**
```json
{
  "success": false,
  "error": "token_missing",
  "message": "Doğrulama token'ı bulunamadı."
}
```

**JWT Token Validation:**
- Token decode edilir (JWT library)
- `type` field'ı `"email_verification"` olmalı
- `exp` (expiry) check edilir (24 saat)
- `user_id` bulunur, `is_verified=true` yapılır
- Eğer zaten `is_verified=true` ise `already_verified` hatası döndürülür

---

## Frontend Implementation

### Component Structure

```
verify-email/
├── VerifyEmailPage.tsx      ← Ana sayfa component
├── VerifyEmailSuccess.tsx   ← Başarı state component
├── VerifyEmailError.tsx     ← Hata state component
└── VerifyEmailLoading.tsx   ← Loading state component
```

### State Management

```typescript
type VerifyEmailState = 
  | 'loading'      // Token doğrulanıyor
  | 'success'       // Başarılı doğrulama
  | 'error'        // Hata durumu
  | 'no_token';    // Token yok

interface VerifyEmailPageState {
  state: VerifyEmailState;
  errorMessage?: string;
  errorCode?: string;
  countdown?: number;  // 3, 2, 1...
}
```

### User Flow

```
1. Kullanıcı email'deki linke tıklar
   ↓
2. /verify-email?token=XXX sayfası açılır
   ↓
3. useEffect hook çalışır, token alınır
   ↓
4. POST /api/v1/auth/verify-email çağrılır
   ↓
5a. Başarılı → Success state gösterilir
    → 3 saniye countdown
    → Otomatik /login redirect
   ↓
5b. Hata → Error state gösterilir
    → "Yeni Link Gönder" ve "Giriş Sayfasına Dön" butonları
```

### Code Example

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '@/api/auth';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'success' | 'error' | 'no_token'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setState('no_token');
      setErrorMessage('Doğrulama token\'ı bulunamadı.');
      return;
    }

    // Token doğrula
    verifyEmail(token)
      .then((response) => {
        if (response.success) {
          setState('success');
          
          // Countdown başlat
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                navigate('/login');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setState('error');
          setErrorMessage(response.message);
        }
      })
      .catch((error) => {
        setState('error');
        setErrorMessage(error.response?.data?.message || 'Bir hata oluştu.');
      });
  }, [searchParams, navigate]);

  if (state === 'loading') {
    return <VerifyEmailLoading />;
  }

  if (state === 'success') {
    return <VerifyEmailSuccess countdown={countdown} />;
  }

  return <VerifyEmailError message={errorMessage} />;
};
```

---

## UI/UX Design

### Color Scheme

**Success State:**
- Background: White / Light gray
- Icon: Green (#10B981)
- Text: Dark gray (#1F2937)
- Button: Primary blue (#3B82F6)

**Error State:**
- Background: White / Light gray
- Icon: Red (#EF4444)
- Text: Dark gray (#1F2937)
- Button: Primary blue (#3B82F6)

**Loading State:**
- Background: White / Light gray
- Spinner: Primary blue (#3B82F6)
- Text: Gray (#6B7280)

### Typography

- **Başlık:** 24px, Bold
- **Mesaj:** 16px, Regular
- **Buton:** 16px, Medium

### Spacing

- Container: Max-width 500px, centered
- Padding: 32px (mobile: 24px)
- Button spacing: 16px

### Responsive Design

- Mobile: Full width, padding 24px
- Tablet: Max-width 500px, centered
- Desktop: Max-width 500px, centered

---

## Error Handling

### Token Yok

**Durum:** URL'de `token` query parameter'ı yok  
**UI:** Error state gösterilir  
**Mesaj:** "Doğrulama token'ı bulunamadı. Lütfen email'inizdeki linki kontrol edin."

### Geçersiz Token

**Durum:** Token formatı hatalı veya decode edilemiyor  
**UI:** Error state gösterilir  
**Mesaj:** "Doğrulama linki geçersiz. Yeni link göndermek için giriş yapın."

### Süresi Dolmuş Token

**Durum:** Token'ın `exp` (expiry) süresi geçmiş (24 saat)  
**UI:** Error state gösterilir  
**Mesaj:** "Doğrulama linki süresi dolmuş. Yeni link göndermek için giriş yapın."

### Zaten Doğrulanmış

**Durum:** Email zaten doğrulanmış (`is_verified=true`)  
**UI:** Success state gösterilir (ama farklı mesaj)  
**Mesaj:** "Bu email adresi zaten doğrulanmış. Giriş yapabilirsiniz."

### Network Error

**Durum:** API çağrısı başarısız (network error, 500 error, vb.)  
**UI:** Error state gösterilir  
**Mesaj:** "Bir hata oluştu. Lütfen daha sonra tekrar deneyin."

---

## Security Considerations

1. **Token Validation:** Token sadece backend'de doğrulanmalı, frontend'de decode edilmemeli
2. **HTTPS:** Production'da HTTPS kullanılmalı (token URL'de gönderiliyor)
3. **Token Expiry:** Token 24 saat geçerli (JWT `exp` claim)
4. **One-Time Use:** Token bir kez kullanılabilir (email doğrulandıktan sonra tekrar kullanılamaz)
5. **Rate Limiting:** Backend'de rate limiting olmalı (spam prevention)

---

## Testing Scenarios

### Happy Path

1. ✅ Geçerli token ile sayfa açılır
2. ✅ Token backend'de doğrulanır
3. ✅ Success state gösterilir
4. ✅ 3 saniye countdown çalışır
5. ✅ Otomatik `/login` redirect yapılır

### Error Scenarios

1. ✅ Token yok → Error state gösterilir
2. ✅ Geçersiz token → Error state gösterilir
3. ✅ Süresi dolmuş token → Error state gösterilir
4. ✅ Zaten doğrulanmış email → Success state (farklı mesaj)
5. ✅ Network error → Error state gösterilir

### Edge Cases

1. ✅ Token query parameter'ı boş string → Error state
2. ✅ Token query parameter'ı çok uzun → Error state
3. ✅ Multiple token query parameter'ı → İlk token kullanılır
4. ✅ Sayfa yenilenirse → Token tekrar doğrulanır (idempotent)

---

## Integration Points

### Related Modules

- **002-register-page:** Register sonrası email gönderilir, bu sayfaya link verilir
- **003-login-page:** Doğrulama sonrası bu sayfaya yönlendirilir
- **Backend Auth Service:** Token doğrulama endpoint'i

### Dependencies

- React Router (useSearchParams, useNavigate)
- API Client (verifyEmail function)
- UI Components (Button, Loading Spinner, Icon)

---

## Future Enhancements (MVP Sonrası)

1. **Resend Verification Email:** Bu sayfadan direkt yeni link gönderme (şu an login sayfasından yapılıyor)
2. **Auto Login:** Doğrulama sonrası otomatik login (security risk, şimdilik yok)
3. **Email Change:** Email değiştirme özelliği (şu an yok, university email sabit)
4. **Verification Status Check:** Email doğrulama durumunu kontrol etme

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Ready for Development

