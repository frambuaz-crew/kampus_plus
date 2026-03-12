# Feature Specification: Reset Password Page

**Module**: 017-reset-password  
**Created**: 2 Ocak 2026  
**Status**: Ready for Development  
**Priority**: P1 - Critical

---

## Overview

Kullanıcıların şifrelerini sıfırlamak için kullandıkları sayfa. Forgot password flow'unun ikinci adımıdır. Email'deki linke tıklandığında bu sayfa açılır ve kullanıcı yeni şifresini belirler.

**Erişim:** Public (Token ile erişim)  
**URL:** `/reset-password?token=XXX`  
**Auth Method:** JWT Token (password reset token)

---

## User Story

**"Şifremi unutan bir kullanıcı olarak, email'imdeki şifre sıfırlama linkine tıklayarak yeni şifremi belirlemek istiyorum."**

**Kabul Kriterleri:**
1. ✅ Email'deki linke tıklandığında `/reset-password?token=XXX` sayfası açılır
2. ✅ Token otomatik olarak doğrulanır (geçerli/geçersiz kontrolü)
3. ✅ Yeni şifre ve şifre tekrar input'ları gösterilir
4. ✅ Şifre kuralları gösterilir (min 8 karakter, 1 harf, 1 rakam)
5. ✅ Şifre confirmation kontrolü yapılır (client-side ve server-side)
6. ✅ Başarılı güncelleme sonrası başarı mesajı gösterilir
7. ✅ 3 saniye sonra otomatik olarak `/login` sayfasına yönlendirilir
8. ✅ Hatalı/geçersiz token durumunda hata mesajı gösterilir

---

## Page Structure

### 1. Loading State (İlk Yükleme)

Sayfa açıldığında token otomatik olarak backend'de doğrulanır. Bu süreçte loading state gösterilir:

```
┌─────────────────────────────────────┐
│                                     │
│         ⏳ Yükleniyor...            │
│                                     │
│    Token doğrulanıyor...           │
│                                     │
└─────────────────────────────────────┘
```

**Teknik Detaylar:**
- Sayfa yüklendiğinde (`useEffect`) token query parameter'ından alınır
- Token varsa otomatik olarak backend'de doğrulanır (token validation endpoint)
- Response gelene kadar loading spinner gösterilir
- Token yoksa hata mesajı gösterilir

---

### 2. Reset Password Form (Geçerli Token)

Token geçerliyse form gösterilir:

```
┌─────────────────────────────────────┐
│                                     │
│      Yeni Şifre Belirle            │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Yeni Şifre                    │  │
│  │ ••••••••                      │  │
│  │ [👁️]                          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Şifre Tekrar                  │  │
│  │ ••••••••                      │  │
│  │ [👁️]                          │  │
│  └───────────────────────────────┘  │
│                                     │
│  Şifre Kuralları:                   │
│  ✓ En az 8 karakter                 │
│  ✓ En az 1 harf                     │
│  ✓ En az 1 rakam                    │
│                                     │
│  [Şifremi Güncelle]                  │
│                                     │
└─────────────────────────────────────┘
```

**Form Fields:**

1. **Yeni Şifre**
   - Type: `password` (toggle ile `text`'e çevrilebilir)
   - Placeholder: `Yeni şifreniz`
   - Validation:
     - Boş olamaz
     - Min 8 karakter
     - En az 1 harf
     - En az 1 rakam
   - "Göster/Gizle" ikonu (eye icon)
   - Real-time validation feedback

2. **Şifre Tekrar**
   - Type: `password` (toggle ile `text`'e çevrilebilir)
   - Placeholder: `Şifrenizi tekrar girin`
   - Validation:
     - Boş olamaz
     - Yeni şifre ile eşleşmeli
   - "Göster/Gizle" ikonu (eye icon)
   - Real-time validation feedback

**Şifre Kuralları Gösterimi:**
- ✓/✗ İkonları ile her kuralın durumu gösterilir
- Real-time güncelleme (kullanıcı yazarken)

**Submit Button:**
- Text: `Şifremi Güncelle`
- Loading state: `Güncelleniyor...` (spinner)
- Disabled durumu: Form geçersizse veya submit sırasında

---

### 3. Success State (Başarılı Güncelleme)

Şifre başarıyla güncellendikten sonra:

```
┌─────────────────────────────────────┐
│                                     │
│      ✅ Şifre Güncellendi           │
│                                     │
│  Şifreniz başarıyla güncellendi.    │
│  Artık yeni şifrenizle giriş        │
│  yapabilirsiniz.                    │
│                                     │
│  Yönlendiriliyorsunuz...            │
│  (3 saniye içinde login sayfası)    │
│                                     │
│  [Giriş Yap]                        │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- ✅ İkonu (yeşil checkmark)
- Başarı mesajı
- Otomatik redirect countdown (3 saniye)
- "Giriş Yap" butonu (manuel redirect için)

**Otomatik Redirect:**
- 3 saniye sonra otomatik olarak `/login` sayfasına yönlendirilir
- Countdown gösterilir: "3... 2... 1..." veya progress bar

**Önemli:** Şifre güncelleme sonrası **otomatik login YOK**. Kullanıcı login sayfasına yönlendirilir ve manuel giriş yapmalı.

---

### 4. Error State (Hatalı/Geçersiz Token)

Token geçersiz, süresi dolmuş veya zaten kullanılmışsa:

```
┌─────────────────────────────────────┐
│                                     │
│   ❌ Doğrulama Başarısız            │
│                                     │
│  Şifre sıfırlama linki geçersiz    │
│  veya süresi dolmuş.                │
│                                     │
│  Yeni bir şifre sıfırlama linki     │
│  göndermek için giriş yapın.        │
│                                     │
│  [Şifremi Unuttum]                  │
│  [Giriş Sayfasına Dön]              │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- ❌ İkonu (kırmızı X veya uyarı)
- Hata mesajı
- "Şifremi Unuttum" butonu → `/forgot-password` sayfasına yönlendirir
- "Giriş Sayfasına Dön" butonu → `/login` sayfasına yönlendirir

**Hata Durumları:**
1. **Token yok:** URL'de token query parameter'ı yok
2. **Geçersiz token:** Token formatı hatalı veya decode edilemiyor
3. **Süresi dolmuş:** Token'ın `exp` (expiry) süresi geçmiş (1 saat)
4. **Zaten kullanılmış:** Token daha önce kullanılmış (one-time use)
5. **Kullanıcı bulunamadı:** Token'daki `user_id` geçersiz
6. **Token type hatalı:** Token type `"password_reset"` değil

---

## Technical Requirements

### Functional Requirements

**FR-001:** Sayfa yüklendiğinde token query parameter'ından alınmalı  
**FR-002:** Token varsa otomatik olarak backend'de doğrulanmalı  
**FR-003:** Backend response'una göre form/error state gösterilmeli  
**FR-004:** Yeni şifre input field zorunlu olmalı  
**FR-005:** Şifre tekrar input field zorunlu olmalı  
**FR-006:** Şifre kuralları validation (client-side ve server-side)  
**FR-007:** Şifre confirmation kontrolü (yeni şifre == şifre tekrar)  
**FR-008:** Real-time validation feedback gösterilmeli  
**FR-009:** "Göster/Gizle" toggle butonları çalışmalı  
**FR-010:** Başarılı güncelleme sonrası 3 saniye countdown gösterilmeli  
**FR-011:** 3 saniye sonra otomatik `/login` redirect yapılmalı  
**FR-012:** Hatalı token durumunda kullanıcıya yardımcı butonlar gösterilmeli  
**FR-013:** Loading state gösterilmeli (token doğrulanırken ve submit sırasında)

---

### Non-Functional Requirements

**NFR-001:** Sayfa yükleme süresi < 1 saniye olmalı  
**NFR-002:** Token doğrulama API response süresi < 500ms olmalı  
**NFR-003:** Şifre güncelleme API response süresi < 500ms olmalı  
**NFR-004:** Otomatik redirect smooth olmalı (ani değil)  
**NFR-005:** Mobile responsive olmalı  
**NFR-006:** Error handling kullanıcı dostu olmalı

---

## Backend API Endpoints

### 1. Token Validation (Opsiyonel - Frontend'de yapılabilir)

**GET /api/v1/auth/reset-password/validate?token=XXX**

**Response (Success - 200 OK):**
```json
{
  "valid": true,
  "message": "Token geçerli"
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "valid": false,
  "error": "invalid_token",
  "message": "Şifre sıfırlama linki geçersiz veya süresi dolmuş."
}
```

**Not:** Bu endpoint opsiyonel. Token validation, reset password endpoint'inde de yapılabilir.

---

### 2. Reset Password

**POST /api/v1/auth/reset-password**

**Request Body:**
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

**Response (Error - 429 Too Many Requests - Rate Limit):**
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Çok fazla deneme yaptınız. Lütfen 1 saat sonra tekrar deneyin.",
  "retry_after": 3600
}
```

**Backend Logic:**
1. Token decode et (JWT)
2. Token validation:
   - `type` field'ı `"password_reset"` olmalı
   - `exp` (expiry) check et (1 saat)
   - `user_id` bul
3. User'ı bul (database'den)
4. Password validation:
   - `new_password == confirm_password`
   - Password strength: min 8 char, 1 harf, 1 rakam
5. Rate limiting check (5 deneme / 1 saat / IP)
6. Yeni şifreyi hash'le (bcrypt, cost factor 12)
7. `user.password_hash` güncelle
8. `user.updated_at` güncelle
9. **Tüm refresh token'ları iptal et** (security best practice)
10. Success response döndür

**Security Best Practice:**
- Token one-time use: Şifre güncellendikten sonra token geçersiz olur
- Tüm refresh token'ları iptal et: Eski cihazlardan oturum kapatılır
- Rate limiting: 5 deneme / 1 saat / IP

---

## Frontend Implementation

### Component Structure

```
reset-password/
├── ResetPasswordPage.tsx      ← Ana sayfa component
├── ResetPasswordForm.tsx       ← Form component
├── ResetPasswordSuccess.tsx   ← Başarı state component
├── ResetPasswordError.tsx      ← Hata state component
└── ResetPasswordLoading.tsx   ← Loading state component
```

### State Management

```typescript
type ResetPasswordState = 
  | 'loading'      // Token doğrulanıyor
  | 'form'         // Form gösteriliyor
  | 'submitting'   // Şifre güncelleniyor
  | 'success'      // Başarılı güncelleme
  | 'error';       // Hata durumu

interface ResetPasswordPageState {
  state: ResetPasswordState;
  token: string | null;
  newPassword: string;
  confirmPassword: string;
  errorMessage?: string;
  errorCode?: string;
  countdown?: number;  // 3, 2, 1...
  passwordRules: {
    minLength: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
  };
}
```

### User Flow

```
1. Kullanıcı email'deki linke tıklar
   ↓
2. /reset-password?token=XXX sayfası açılır
   ↓
3. useEffect hook çalışır, token alınır
   ↓
4. Token validation (opsiyonel, veya direkt form göster)
   ↓
5. Form gösterilir (geçerli token ise)
   ↓
6. Kullanıcı yeni şifre girer
   ↓
7. Real-time validation feedback
   ↓
8. "Şifremi Güncelle" butonuna tıklar
   ↓
9. POST /api/v1/auth/reset-password çağrılır
   ↓
10a. Başarılı → Success state gösterilir
     → 3 saniye countdown
     → Otomatik /login redirect
    ↓
10b. Hata → Error state gösterilir
     → Hata mesajı
     → "Şifremi Unuttum" ve "Giriş Sayfasına Dön" butonları
```

### Code Example

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword, validateResetToken } from '@/api/auth';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'form' | 'submitting' | 'success' | 'error'>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [passwordRules, setPasswordRules] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false
  });

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    
    if (!tokenParam) {
      setState('error');
      setErrorMessage('Şifre sıfırlama token\'ı bulunamadı.');
      return;
    }

    setToken(tokenParam);
    
    // Token validation (opsiyonel)
    validateResetToken(tokenParam)
      .then((response) => {
        if (response.valid) {
          setState('form');
        } else {
          setState('error');
          setErrorMessage(response.message);
        }
      })
      .catch(() => {
        // Token validation başarısız, ama form göster (backend'de tekrar kontrol edilir)
        setState('form');
      });
  }, [searchParams]);

  // Real-time password validation
  useEffect(() => {
    setPasswordRules({
      minLength: newPassword.length >= 8,
      hasLetter: /[a-zA-Z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword)
    });
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (newPassword !== confirmPassword) {
      setErrorMessage('Şifreler eşleşmiyor.');
      return;
    }

    if (!passwordRules.minLength || !passwordRules.hasLetter || !passwordRules.hasNumber) {
      setErrorMessage('Şifre kurallarına uygun değil.');
      return;
    }

    if (!token) {
      setErrorMessage('Token bulunamadı.');
      return;
    }

    setState('submitting');
    setErrorMessage('');

    try {
      const response = await resetPassword({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

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
    } catch (error: any) {
      setState('error');
      setErrorMessage(error.response?.data?.message || 'Bir hata oluştu.');
    }
  };

  if (state === 'loading') {
    return <ResetPasswordLoading />;
  }

  if (state === 'success') {
    return <ResetPasswordSuccess countdown={countdown} />;
  }

  if (state === 'error') {
    return <ResetPasswordError message={errorMessage} />;
  }

  return (
    <ResetPasswordForm
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      passwordRules={passwordRules}
      isSubmitting={state === 'submitting'}
      errorMessage={errorMessage}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleSubmit}
    />
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
- Password rules: Green (#10B981) / Red (#EF4444)

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
- **Açıklama:** 16px, Regular
- **Input:** 16px, Regular
- **Buton:** 16px, Medium
- **Password Rules:** 14px, Regular

### Spacing

- Container: Max-width 500px, centered
- Padding: 32px (mobile: 24px)
- Input spacing: 16px
- Button spacing: 24px

### Responsive Design

- Mobile: Full width, padding 24px
- Tablet: Max-width 500px, centered
- Desktop: Max-width 500px, centered

---

## Password Validation

### Client-Side Validation

**Real-time Feedback:**
- Kullanıcı yazarken her kural kontrol edilir
- ✓/✗ İkonları ile durum gösterilir
- Şifre tekrar eşleşme kontrolü

**Password Rules:**
1. ✓ En az 8 karakter
2. ✓ En az 1 harf (a-z, A-Z)
3. ✓ En az 1 rakam (0-9)

**Confirmation Check:**
- Şifre tekrar input'u yazılırken eşleşme kontrolü
- Eşleşmiyorsa kırmızı border ve mesaj

### Server-Side Validation

Backend'de de aynı kontroller yapılır:
- Password strength
- Password confirmation
- Token validation

---

## Error Handling

### Token Yok

**Durum:** URL'de `token` query parameter'ı yok  
**UI:** Error state gösterilir  
**Mesaj:** "Şifre sıfırlama token'ı bulunamadı. Lütfen email'inizdeki linki kontrol edin."

### Geçersiz Token

**Durum:** Token formatı hatalı veya decode edilemiyor  
**UI:** Error state gösterilir  
**Mesaj:** "Şifre sıfırlama linki geçersiz. Yeni link göndermek için giriş yapın."

### Süresi Dolmuş Token

**Durum:** Token'ın `exp` (expiry) süresi geçmiş (1 saat)  
**UI:** Error state gösterilir  
**Mesaj:** "Şifre sıfırlama linki süresi dolmuş. Yeni link göndermek için giriş yapın."

### Zaten Kullanılmış Token

**Durum:** Token daha önce kullanılmış (one-time use)  
**UI:** Error state gösterilir  
**Mesaj:** "Bu link daha önce kullanılmış. Yeni link göndermek için giriş yapın."

### Password Mismatch

**Durum:** Yeni şifre ve şifre tekrar eşleşmiyor  
**UI:** Form'da error mesajı gösterilir  
**Mesaj:** "Şifreler eşleşmiyor."

### Weak Password

**Durum:** Şifre kurallarına uymuyor  
**UI:** Form'da error mesajı gösterilir  
**Mesaj:** "Şifre en az 8 karakter, en az 1 harf ve 1 rakam içermelidir."

### Network Error

**Durum:** API çağrısı başarısız (network error, 500 error, vb.)  
**UI:** Error state gösterilir  
**Mesaj:** "Bir hata oluştu. Lütfen daha sonra tekrar deneyin."

---

## Security Considerations

1. **Token Validation:** Token sadece backend'de doğrulanmalı, frontend'de decode edilmemeli
2. **HTTPS:** Production'da HTTPS kullanılmalı (token URL'de gönderiliyor)
3. **Token Expiry:** Token 1 saat geçerli (JWT `exp` claim)
4. **One-Time Use:** Token bir kez kullanılabilir (şifre güncellendikten sonra geçersiz)
5. **Rate Limiting:** Backend'de rate limiting olmalı (5 deneme / 1 saat / IP)
6. **Refresh Token Revocation:** Şifre güncellendikten sonra tüm refresh token'lar iptal edilmeli
7. **Password Hashing:** Bcrypt, cost factor 12

---

## Testing Scenarios

### Happy Path

1. ✅ Geçerli token ile sayfa açılır
2. ✅ Token backend'de doğrulanır
3. ✅ Form gösterilir
4. ✅ Yeni şifre girilir (kurallara uygun)
5. ✅ Şifre tekrar girilir (eşleşiyor)
6. ✅ Submit edilir
7. ✅ Success state gösterilir
8. ✅ 3 saniye countdown çalışır
9. ✅ Otomatik `/login` redirect yapılır

### Error Scenarios

1. ✅ Token yok → Error state gösterilir
2. ✅ Geçersiz token → Error state gösterilir
3. ✅ Süresi dolmuş token → Error state gösterilir
4. ✅ Zaten kullanılmış token → Error state gösterilir
5. ✅ Password mismatch → Form'da error mesajı
6. ✅ Weak password → Form'da error mesajı
7. ✅ Network error → Error state gösterilir

### Validation Scenarios

1. ✅ Real-time password rules validation
2. ✅ Password confirmation check
3. ✅ Client-side ve server-side validation uyumu
4. ✅ Form submit disabled (geçersiz form)

### Edge Cases

1. ✅ Token query parameter'ı boş string → Error state
2. ✅ Token query parameter'ı çok uzun → Error state
3. ✅ Multiple token query parameter'ı → İlk token kullanılır
4. ✅ Sayfa yenilenirse → Token tekrar doğrulanır
5. ✅ Rate limit aşıldı → Rate limit error

---

## Integration Points

### Related Modules

- **016-forgot-password:** Bu sayfadan gönderilen email'deki link bu sayfaya yönlendirir
- **003-login-page:** Şifre güncelleme sonrası bu sayfaya yönlendirilir
- **Backend Auth Service:** Reset password endpoint'i

### Dependencies

- React Router (useSearchParams, useNavigate, Link)
- API Client (resetPassword, validateResetToken functions)
- UI Components (Button, Input, Loading Spinner, Icon)

---

## Future Enhancements (MVP Sonrası)

1. **Password Strength Meter:** Şifre gücünü gösteren progress bar
2. **Password History:** Son 5 şifreyi tekrar kullanma engelleme
3. **Biometric Authentication:** Şifre sıfırlama sonrası biyometrik doğrulama
4. **Account Recovery:** Email doğrulama olmadan hesap kurtarma
5. **Security Questions:** Güvenlik soruları ile şifre sıfırlama

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Ready for Development

