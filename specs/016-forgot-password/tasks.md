# Tasks: Forgot Password Page Implementation

**Module:** 016-forgot-password  
**Status:** Ready for Development  
**Estimated Time:** 1 gün (Backend 2 saat + Frontend 4 saat + Testing 2 saat)

---

## Task Breakdown

### Phase 1: Backend Implementation (2 saat)

#### Task 1.1: Forgot Password Endpoint (Zaten Var - Kontrol Et)

**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
`POST /api/v1/auth/forgot-password` endpoint'i zaten `003-login-page` modülünde implement edilmiş olmalı. Kontrol et ve eksikse ekle.

**Dosya:** `backend/src/api/routes/auth.py`

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Request Body:**
```python
class ForgotPasswordRequest(BaseModel):
    email: EmailStr
```

**Response (Success - 200 OK):**
```python
{
    "success": True,
    "message": "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi."
}
```

**Response (Error - 400 Bad Request - Invalid Email):**
```python
{
    "success": False,
    "error": "invalid_email",
    "message": "Lütfen geçerli bir email adresi girin."
}
```

**Response (Error - 429 Too Many Requests - Rate Limit):**
```python
{
    "success": False,
    "error": "rate_limit_exceeded",
    "message": "Çok fazla deneme yaptınız. Lütfen 10 dakika sonra tekrar deneyin.",
    "retry_after": 600
}
```

**Logic:**
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

**Adımlar:**
- [ ] Endpoint'in var olduğunu kontrol et
- [ ] Eğer yoksa, endpoint'i ekle
- [ ] Email format validation
- [ ] Rate limiting logic (5 deneme / 10 dakika / email)
- [ ] User lookup (email ile)
- [ ] JWT token generation (password_reset type)
- [ ] Email sending (password reset email)
- [ ] Email enumeration prevention (her durumda aynı response)
- [ ] Error handling
- [ ] Test: Endpoint çalışıyor

---

#### Task 1.2: Password Reset Email Template

**Süre:** 0.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Password reset email template'ini oluştur veya güncelle.

**Dosya:** `backend/src/services/email_service.py` (güncelle)

**Function:**
```python
async def send_password_reset_email(
    to_email: str,
    first_name: str,
    reset_token: str
) -> None:
    """
    Send password reset email with reset link.
    
    Args:
        to_email: Recipient email address
        first_name: User's first name
        reset_token: JWT token for password reset
    """
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    # HTML email template
    html_content = f"""
    <html>
    <body>
        <h2>KAMPÜS+ - Şifre Sıfırlama</h2>
        <p>Merhaba {first_name},</p>
        <p>Şifre sıfırlama talebiniz alındı. Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
        <p><a href="{reset_link}">Şifremi Sıfırla</a></p>
        <p>Bu link 1 saat geçerlidir.</p>
        <p>Eğer bu talebi siz yapmadıysanız, bu email'i görmezden gelebilirsiniz.</p>
        <p>Saygılarımızla,<br>KAMPÜS+ Ekibi</p>
    </body>
    </html>
    """
    
    # Send email via SMTP
    await send_email(
        to_email=to_email,
        subject="KAMPÜS+ - Şifre Sıfırlama",
        html_content=html_content
    )
```

**Adımlar:**
- [ ] Email template function'ı oluştur veya güncelle
- [ ] HTML email template hazırla
- [ ] Reset link formatı doğru (`/reset-password?token=XXX`)
- [ ] Email gönderme test et (Mailhog / Gmail SMTP)
- [ ] Test: Email gönderiliyor, link doğru

---

#### Task 1.3: Rate Limiting

**Süre:** 0.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Forgot password endpoint'i için rate limiting ekle.

**Rate Limit:** 5 deneme / 10 dakika / email

**Implementation:**
- In-memory cache (development)
- Redis (production, opsiyonel)

**Adımlar:**
- [ ] Rate limiting middleware ekle
- [ ] Email bazlı rate limiting
- [ ] 429 Too Many Requests response
- [ ] Retry after header ekle
- [ ] Test: Rate limit çalışıyor

---

### Phase 2: Frontend Implementation (4 saat)

#### Task 2.1: Forgot Password Page Component

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Ana sayfa component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ForgotPasswordPage.tsx`

**Özellikler:**
- [ ] Email input field
- [ ] Form validation (client-side)
- [ ] Submit handler
- [ ] Loading state
- [ ] Success state
- [ ] Error state
- [ ] "Giriş Sayfasına Dön" linki
- [ ] "Kayıt Ol" linki

**Code Structure:**
```tsx
export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    // Form submit logic
  };

  // Render logic
};
```

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] React Router hooks (useNavigate, Link)
- [ ] State management
- [ ] Form validation
- [ ] API çağrısı
- [ ] State transitions (form → loading → success/error)
- [ ] Test: Component çalışıyor

---

#### Task 2.2: Forgot Password Form Component

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Form component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ForgotPasswordPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
│      Şifremi Unuttum                │
│                                     │
│  Email adresinizi girin, size       │
│  şifre sıfırlama linki gönderelim. │
│                                     │
│  [Email Input]                      │
│                                     │
│  [Şifre Sıfırlama Linki Gönder]     │
│                                     │
│  [Giriş Sayfasına Dön]              │
│  [Kayıt Ol]                         │
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] Email input (type="email")
- [ ] Submit button
- [ ] Loading state (button disabled, spinner)
- [ ] Error message display
- [ ] Rate limit info (retry after)
- [ ] Navigation links

**Adımlar:**
- [ ] Form UI component
- [ ] Input validation
- [ ] Submit button
- [ ] Error handling
- [ ] Styling
- [ ] Test: Form çalışıyor

---

#### Task 2.3: Success State Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Başarılı email gönderimi state component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ForgotPasswordPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
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
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] ✅ İkonu (yeşil checkmark)
- [ ] Başarı mesajı
- [ ] Yardımcı bilgiler (spam klasörü, bekleme süresi)
- [ ] "Giriş Sayfasına Dön" butonu

**Adımlar:**
- [ ] Success UI component
- [ ] İkon ve mesaj
- [ ] Yardımcı bilgiler
- [ ] Navigation butonu
- [ ] Styling (yeşil, başarı teması)
- [ ] Test: Success state çalışıyor

---

#### Task 2.4: Error State Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Hata state component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ForgotPasswordPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
│      ❌ Hata                        │
│                                     │
│  Email formatı geçersiz.            │
│  Lütfen geçerli bir email adresi   │
│  girin.                             │
│                                     │
│  [Tekrar Dene]                      │
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] ❌ İkonu (kırmızı X)
- [ ] Hata mesajı (backend'den gelen veya client-side validation)
- [ ] Rate limit info (retry after countdown, opsiyonel)
- [ ] "Tekrar Dene" butonu (form'a geri dön)

**Adımlar:**
- [ ] Error UI component
- [ ] Hata mesajı gösterimi
- [ ] Rate limit info (opsiyonel)
- [ ] "Tekrar Dene" butonu
- [ ] Styling (kırmızı, hata teması)
- [ ] Test: Error state çalışıyor

---

#### Task 2.5: API Client Function

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Forgot password API çağrısı için client function oluştur.

**Dosya:** `frontend/src/api/auth.ts` (güncelle veya yeni)

**Function:**
```typescript
export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
  const response = await axios.post('/api/v1/auth/forgot-password', {
    email
  });
  return response.data;
};

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  error?: string;
  retry_after?: number;
}
```

**Adımlar:**
- [ ] API client function oluştur
- [ ] TypeScript interface'leri tanımla
- [ ] Error handling
- [ ] Test: API çağrısı çalışıyor

---

#### Task 2.6: Route Setup

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Forgot password sayfası için route ekle.

**Dosya:** `frontend/src/App.tsx` (güncelle)

**Route:**
```tsx
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
```

**Adımlar:**
- [ ] Route ekle
- [ ] Import ForgotPasswordPage component
- [ ] Test: Route çalışıyor (`/forgot-password`)

---

### Phase 3: Testing (2 saat)

#### Task 3.1: Backend Tests

**Süre:** 1 saat  
**Atanan:** Backend Developer

**Test Senaryoları:**
- [ ] Geçerli email ile request → Success (email kayıtlı)
- [ ] Geçerli email ile request → Success (email kayıtlı değil, aynı mesaj)
- [ ] Geçersiz email format → Error (invalid_email)
- [ ] Rate limit aşıldı → Error (rate_limit_exceeded)
- [ ] Email enumeration prevention test (kayıtlı/ kayıtlı değil aynı response)
- [ ] Password reset token oluşturuluyor (1 saat expiry)
- [ ] Email gönderiliyor (Mailhog / SMTP)

**Adımlar:**
- [ ] Unit test'ler yaz
- [ ] Integration test'ler yaz
- [ ] Email enumeration prevention test
- [ ] Rate limiting test
- [ ] Tüm senaryolar test edildi

---

#### Task 3.2: Frontend Tests

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Test Senaryoları:**
- [ ] Sayfa yüklendiğinde form gösteriliyor
- [ ] Email input çalışıyor
- [ ] Form validation çalışıyor (geçersiz email)
- [ ] Submit butonu çalışıyor
- [ ] Loading state gösteriliyor
- [ ] Success state gösteriliyor (başarılı API response)
- [ ] Error state gösteriliyor (hata durumları)
- [ ] Rate limit error gösteriliyor (retry after)
- [ ] "Giriş Sayfasına Dön" linki çalışıyor
- [ ] "Kayıt Ol" linki çalışıyor

**Adımlar:**
- [ ] Component test'leri yaz
- [ ] Integration test'leri yaz
- [ ] E2E test'leri yaz (opsiyonel)
- [ ] Tüm senaryolar test edildi

---

### Phase 4: Integration & Polish (1 saat)

#### Task 4.1: Integration with Login Flow

**Süre:** 0.5 saat  
**Atanan:** Full-Stack Developer

**Açıklama:**  
Login flow ile entegrasyonu kontrol et.

**Kontrol Edilecekler:**
- [ ] Login sayfasında "Şifremi Unuttum?" linki `/forgot-password`'a yönlendiriyor
- [ ] Forgot password sayfasında "Giriş Sayfasına Dön" linki `/login`'e yönlendiriyor
- [ ] Email'deki reset link `/reset-password?token=XXX` formatında
- [ ] End-to-end flow çalışıyor (forgot password → email → reset password → login)

**Adımlar:**
- [ ] Login sayfası link kontrolü
- [ ] Navigation linkleri test et
- [ ] Email link formatı test et
- [ ] End-to-end flow test et
- [ ] Test: Tüm flow çalışıyor

---

#### Task 4.2: UI/UX Polish

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
UI/UX iyileştirmeleri yap.

**İyileştirmeler:**
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading spinner animasyonu
- [ ] Form validation feedback (real-time)
- [ ] Error mesajları kullanıcı dostu
- [ ] Buton hover/active states
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Rate limit countdown (opsiyonel)

**Adımlar:**
- [ ] Responsive test et
- [ ] Animasyonlar ekle
- [ ] Validation feedback iyileştir
- [ ] Accessibility iyileştir
- [ ] Test: UI/UX iyileştirildi

---

## ✅ Checklist

### Backend
- [ ] Forgot password endpoint var ve çalışıyor
- [ ] Email format validation
- [ ] Rate limiting (5 deneme / 10 dakika / email)
- [ ] Email enumeration prevention
- [ ] Password reset email template
- [ ] JWT token generation (password_reset type, 1 saat expiry)
- [ ] Backend test'leri yazıldı

### Frontend
- [ ] ForgotPasswordPage component oluşturuldu
- [ ] Form component
- [ ] Success state component
- [ ] Error state component
- [ ] API client function
- [ ] Route setup
- [ ] Navigation linkleri (login, register)
- [ ] Frontend test'leri yazıldı

### Integration
- [ ] Login sayfası link entegrasyonu
- [ ] Email link formatı doğru
- [ ] Reset password sayfasına yönlendirme çalışıyor
- [ ] End-to-end flow test edildi

### Polish
- [ ] Responsive design
- [ ] Animasyonlar
- [ ] Accessibility
- [ ] UI/UX iyileştirmeleri

---

## 📝 Notlar

1. **Backend Endpoint:** `POST /api/v1/auth/forgot-password` endpoint'i zaten `003-login-page` modülünde implement edilmiş olmalı. Kontrol et ve eksikse ekle.

2. **Email Enumeration Prevention:** Her durumda (email kayıtlı olsun veya olmasın) aynı mesaj gösterilir. Bu güvenlik best practice'idir.

3. **Rate Limiting:** 5 deneme / 10 dakika / email. Spam prevention için önemli.

4. **Token Format:** JWT token, `type: "password_reset"`, `exp: 1 saat`, `user_id: UUID`

5. **Email Template:** Password reset email'inde link formatı: `/reset-password?token=XXX`

6. **Integration:** Login sayfasından "Şifremi Unuttum?" linki bu sayfaya yönlendirir. Email'deki link reset password sayfasına gider.

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Tasks Tamamlandı - Ready for Development

