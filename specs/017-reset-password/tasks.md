# Tasks: Reset Password Page Implementation

**Module:** 017-reset-password  
**Status:** Ready for Development  
**Estimated Time:** 1.5 gün (Backend 2 saat + Frontend 5 saat + Testing 2 saat)

---

## Task Breakdown

### Phase 1: Backend Implementation (2 saat)

#### Task 1.1: Reset Password Endpoint (Zaten Var - Kontrol Et)

**Süre:** 1.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
`POST /api/v1/auth/reset-password` endpoint'i zaten `003-login-page` modülünde implement edilmiş olmalı. Kontrol et ve eksikse ekle.

**Dosya:** `backend/src/api/routes/auth.py`

**Endpoint:** `POST /api/v1/auth/reset-password`

**Request Body:**
```python
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Şifre en az 8 karakter olmalıdır')
        if not any(c.isalpha() for c in v):
            raise ValueError('Şifre en az 1 harf içermelidir')
        if not any(c.isdigit() for c in v):
            raise ValueError('Şifre en az 1 rakam içermelidir')
        return v

    @validator('confirm_password')
    def validate_confirmation(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Şifreler eşleşmiyor')
        return v
```

**Response (Success - 200 OK):**
```python
{
    "success": True,
    "message": "Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz."
}
```

**Response (Error - 400 Bad Request):**
```python
{
    "success": False,
    "error": "invalid_token" | "password_mismatch" | "weak_password",
    "message": "..."
}
```

**Logic:**
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

**Adımlar:**
- [ ] Endpoint'in var olduğunu kontrol et
- [ ] Eğer yoksa, endpoint'i ekle
- [ ] Request model oluştur (Pydantic)
- [ ] Token validation logic
- [ ] Password validation (strength, confirmation)
- [ ] Rate limiting logic
- [ ] Password hashing (bcrypt)
- [ ] User update
- [ ] Refresh token revocation (tüm refresh token'ları sil)
- [ ] Error handling
- [ ] Test: Endpoint çalışıyor

---

#### Task 1.2: Token Validation Endpoint (Opsiyonel)

**Süre:** 0.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Token validation için ayrı endpoint (opsiyonel, frontend'de direkt form gösterilebilir).

**Endpoint:** `GET /api/v1/auth/reset-password/validate?token=XXX`

**Response (Success - 200 OK):**
```python
{
    "valid": True,
    "message": "Token geçerli"
}
```

**Response (Error - 400 Bad Request):**
```python
{
    "valid": False,
    "error": "invalid_token",
    "message": "Şifre sıfırlama linki geçersiz veya süresi dolmuş."
}
```

**Adımlar:**
- [ ] Endpoint'i ekle (opsiyonel)
- [ ] Token validation logic
- [ ] Response model
- [ ] Test: Endpoint çalışıyor

**Not:** Bu endpoint opsiyonel. Token validation, reset password endpoint'inde de yapılabilir.

---

#### Task 1.3: Refresh Token Revocation

**Süre:** 0.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Şifre güncellendikten sonra tüm refresh token'ları iptal et (security best practice).

**Logic:**
```python
# Şifre güncellendikten sonra
async def revoke_all_refresh_tokens(user_id: UUID):
    """Revoke all refresh tokens for a user."""
    await db.execute(
        delete(RefreshToken).where(RefreshToken.user_id == user_id)
    )
```

**Adımlar:**
- [ ] Refresh token revocation function oluştur
- [ ] Reset password endpoint'inde çağır
- [ ] Test: Refresh token'lar iptal ediliyor

---

### Phase 2: Frontend Implementation (5 saat)

#### Task 2.1: Reset Password Page Component

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Ana sayfa component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ResetPasswordPage.tsx`

**Özellikler:**
- [ ] Token query parameter'ından al
- [ ] Token validation (opsiyonel endpoint veya direkt form göster)
- [ ] State management (loading, form, submitting, success, error)
- [ ] Form state (newPassword, confirmPassword)
- [ ] Password rules state
- [ ] Countdown logic (3 saniye)
- [ ] Otomatik redirect (`/login`)

**Code Structure:**
```tsx
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'form' | 'submitting' | 'success' | 'error'>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // ... other states

  useEffect(() => {
    // Token al ve doğrula
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    // Form submit logic
  };

  // Render logic
};
```

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] React Router hooks (useSearchParams, useNavigate)
- [ ] State management
- [ ] Token validation logic
- [ ] Form state management
- [ ] Password rules validation
- [ ] Countdown logic
- [ ] Otomatik redirect
- [ ] Test: Component çalışıyor

---

#### Task 2.2: Reset Password Form Component

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Form component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ResetPasswordPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
│      Yeni Şifre Belirle            │
│                                     │
│  [Yeni Şifre Input]                 │
│  [Şifre Tekrar Input]               │
│                                     │
│  Şifre Kuralları:                   │
│  ✓ En az 8 karakter                 │
│  ✓ En az 1 harf                     │
│  ✓ En az 1 rakam                    │
│                                     │
│  [Şifremi Güncelle]                 │
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] Yeni şifre input (password type, toggle ile text)
- [ ] Şifre tekrar input (password type, toggle ile text)
- [ ] "Göster/Gizle" toggle butonları
- [ ] Real-time password rules validation
- [ ] Password confirmation check
- [ ] Submit button
- [ ] Loading state (submitting)
- [ ] Error message display

**Adımlar:**
- [ ] Form UI component
- [ ] Input components (password type, toggle)
- [ ] Real-time validation
- [ ] Password rules display (✓/✗ ikonları)
- [ ] Submit button
- [ ] Error handling
- [ ] Styling
- [ ] Test: Form çalışıyor

---

#### Task 2.3: Password Rules Validation

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Real-time password rules validation.

**Password Rules:**
1. En az 8 karakter
2. En az 1 harf (a-z, A-Z)
3. En az 1 rakam (0-9)

**Implementation:**
```tsx
useEffect(() => {
  setPasswordRules({
    minLength: newPassword.length >= 8,
    hasLetter: /[a-zA-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword)
  });
}, [newPassword]);
```

**UI:**
- ✓/✗ İkonları ile her kuralın durumu gösterilir
- Real-time güncelleme (kullanıcı yazarken)

**Adımlar:**
- [ ] Password rules validation logic
- [ ] Real-time feedback (✓/✗ ikonları)
- [ ] UI component (password rules list)
- [ ] Styling
- [ ] Test: Validation çalışıyor

---

#### Task 2.4: Success State Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Başarılı şifre güncelleme state component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ResetPasswordPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
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
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] ✅ İkonu (yeşil checkmark)
- [ ] Başarı mesajı
- [ ] Countdown gösterimi (3, 2, 1...)
- [ ] "Giriş Yap" butonu
- [ ] Otomatik redirect (3 saniye)

**Adımlar:**
- [ ] Success UI component
- [ ] Countdown logic
- [ ] Otomatik redirect
- [ ] Manuel redirect butonu
- [ ] Styling (yeşil, başarı teması)
- [ ] Test: Success state çalışıyor

---

#### Task 2.5: Error State Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Hata state component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ResetPasswordPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
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
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] ❌ İkonu (kırmızı X)
- [ ] Hata mesajı (backend'den gelen)
- [ ] "Şifremi Unuttum" butonu → `/forgot-password`
- [ ] "Giriş Sayfasına Dön" butonu → `/login`

**Adımlar:**
- [ ] Error UI component
- [ ] Hata mesajı gösterimi
- [ ] Butonlar (Şifremi Unuttum, Giriş Sayfasına Dön)
- [ ] Navigation logic
- [ ] Styling (kırmızı, hata teması)
- [ ] Test: Error state çalışıyor

---

#### Task 2.6: Loading State Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Loading state component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/ResetPasswordPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
│         ⏳ Yükleniyor...            │
│                                     │
│    Token doğrulanıyor...           │
│                                     │
└─────────────────────────────────────┘
```

**Adımlar:**
- [ ] Loading spinner component
- [ ] Loading mesajı
- [ ] Styling
- [ ] Test: Loading state görünüyor

---

#### Task 2.7: API Client Functions

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Reset password API çağrıları için client functions oluştur.

**Dosya:** `frontend/src/api/auth.ts` (güncelle veya yeni)

**Functions:**
```typescript
export const resetPassword = async (data: {
  token: string;
  new_password: string;
  confirm_password: string;
}): Promise<ResetPasswordResponse> => {
  const response = await axios.post('/api/v1/auth/reset-password', data);
  return response.data;
};

export const validateResetToken = async (token: string): Promise<ValidateTokenResponse> => {
  const response = await axios.get(`/api/v1/auth/reset-password/validate?token=${token}`);
  return response.data;
};

interface ResetPasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface ValidateTokenResponse {
  valid: boolean;
  message: string;
  error?: string;
}
```

**Adımlar:**
- [ ] API client functions oluştur
- [ ] TypeScript interface'leri tanımla
- [ ] Error handling
- [ ] Test: API çağrıları çalışıyor

---

#### Task 2.8: Route Setup

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Reset password sayfası için route ekle.

**Dosya:** `frontend/src/App.tsx` (güncelle)

**Route:**
```tsx
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

**Adımlar:**
- [ ] Route ekle
- [ ] Import ResetPasswordPage component
- [ ] Test: Route çalışıyor (`/reset-password?token=XXX`)

---

### Phase 3: Testing (2 saat)

#### Task 3.1: Backend Tests

**Süre:** 1 saat  
**Atanan:** Backend Developer

**Test Senaryoları:**
- [ ] Geçerli token ile şifre güncelleme → Success
- [ ] Geçersiz token → Error (invalid_token)
- [ ] Süresi dolmuş token → Error (invalid_token)
- [ ] Password mismatch → Error (password_mismatch)
- [ ] Weak password → Error (weak_password)
- [ ] Rate limit aşıldı → Error (rate_limit_exceeded)
- [ ] Refresh token revocation çalışıyor
- [ ] Token validation endpoint çalışıyor (opsiyonel)

**Adımlar:**
- [ ] Unit test'ler yaz
- [ ] Integration test'ler yaz
- [ ] Tüm senaryolar test edildi

---

#### Task 3.2: Frontend Tests

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Test Senaryoları:**
- [ ] Sayfa yüklendiğinde token alınıyor
- [ ] Token validation çalışıyor (opsiyonel)
- [ ] Form gösteriliyor (geçerli token)
- [ ] Password input'lar çalışıyor
- [ ] "Göster/Gizle" toggle butonları çalışıyor
- [ ] Real-time password rules validation çalışıyor
- [ ] Password confirmation check çalışıyor
- [ ] Submit butonu çalışıyor
- [ ] Loading state gösteriliyor
- [ ] Success state gösteriliyor
- [ ] Error state gösteriliyor
- [ ] Countdown çalışıyor
- [ ] Otomatik redirect çalışıyor
- [ ] Token yok durumunda error gösteriliyor

**Adımlar:**
- [ ] Component test'leri yaz
- [ ] Integration test'leri yaz
- [ ] E2E test'leri yaz (opsiyonel)
- [ ] Tüm senaryolar test edildi

---

### Phase 4: Integration & Polish (1 saat)

#### Task 4.1: Integration with Forgot Password Flow

**Süre:** 0.5 saat  
**Atanan:** Full-Stack Developer

**Açıklama:**  
Forgot password flow ile entegrasyonu kontrol et.

**Kontrol Edilecekler:**
- [ ] Forgot password sayfasından gönderilen email'deki link `/reset-password?token=XXX` formatında
- [ ] Reset password sayfası açılıyor
- [ ] Şifre güncelleme sonrası login sayfasına yönlendirme çalışıyor
- [ ] End-to-end flow çalışıyor (forgot password → email → reset password → login)

**Adımlar:**
- [ ] Email link formatı test et
- [ ] Navigation test et
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
- [ ] Real-time validation feedback (smooth)
- [ ] Password rules display (✓/✗ animasyonları)
- [ ] Error mesajları kullanıcı dostu
- [ ] Buton hover/active states
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Countdown animasyonu (smooth)

**Adımlar:**
- [ ] Responsive test et
- [ ] Animasyonlar ekle
- [ ] Validation feedback iyileştir
- [ ] Accessibility iyileştir
- [ ] Test: UI/UX iyileştirildi

---

## ✅ Checklist

### Backend
- [ ] Reset password endpoint var ve çalışıyor
- [ ] Token validation
- [ ] Password validation (strength, confirmation)
- [ ] Rate limiting (5 deneme / 1 saat / IP)
- [ ] Password hashing (bcrypt)
- [ ] Refresh token revocation
- [ ] Token validation endpoint (opsiyonel)
- [ ] Backend test'leri yazıldı

### Frontend
- [ ] ResetPasswordPage component oluşturuldu
- [ ] Form component
- [ ] Password rules validation (real-time)
- [ ] Password confirmation check
- [ ] "Göster/Gizle" toggle butonları
- [ ] Success state component
- [ ] Error state component
- [ ] Loading state component
- [ ] API client functions
- [ ] Route setup
- [ ] Frontend test'leri yazıldı

### Integration
- [ ] Forgot password flow ile entegrasyon
- [ ] Email link formatı doğru
- [ ] Login sayfasına yönlendirme çalışıyor
- [ ] End-to-end flow test edildi

### Polish
- [ ] Responsive design
- [ ] Animasyonlar
- [ ] Accessibility
- [ ] UI/UX iyileştirmeleri

---

## 📝 Notlar

1. **Backend Endpoint:** `POST /api/v1/auth/reset-password` endpoint'i zaten `003-login-page` modülünde implement edilmiş olmalı. Kontrol et ve eksikse ekle.

2. **Token Validation:** Token validation için ayrı endpoint opsiyonel. Frontend'de direkt form gösterilebilir, backend'de token validation yapılır.

3. **Refresh Token Revocation:** Şifre güncellendikten sonra tüm refresh token'lar iptal edilmeli (security best practice).

4. **Token Format:** JWT token, `type: "password_reset"`, `exp: 1 saat`, `user_id: UUID`

5. **Password Rules:** Min 8 karakter, en az 1 harf, en az 1 rakam. Real-time validation feedback gösterilir.

6. **One-Time Use:** Token bir kez kullanılabilir (şifre güncellendikten sonra geçersiz).

7. **Integration:** Forgot password sayfasından gönderilen email'deki link bu sayfaya yönlendirir. Şifre güncelleme sonrası login sayfasına yönlendirilir.

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Tasks Tamamlandı - Ready for Development

