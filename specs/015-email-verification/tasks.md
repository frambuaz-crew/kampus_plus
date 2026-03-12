# Tasks: Email Verification Page Implementation

**Module:** 015-email-verification  
**Status:** Ready for Development  
**Estimated Time:** 1 gün (Backend 2 saat + Frontend 4 saat + Testing 2 saat)

---

## Task Breakdown

### Phase 1: Backend Implementation (2 saat)

#### Task 1.1: Verify Email Endpoint (Zaten Var - Kontrol Et)

**Süre:** 0.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
`POST /api/v1/auth/verify-email` endpoint'i zaten `002-register-page` modülünde implement edilmiş olmalı. Kontrol et ve eksikse ekle.

**Dosya:** `backend/src/api/routes/auth.py`

**Endpoint:** `POST /api/v1/auth/verify-email`

**Request Body:**
```python
class VerifyEmailRequest(BaseModel):
    token: str
```

**Response (Success - 200 OK):**
```python
{
    "success": True,
    "message": "Email doğrulandı. Giriş yapabilirsiniz.",
    "redirect_url": "/login"
}
```

**Response (Error - 400 Bad Request):**
```python
{
    "success": False,
    "error": "invalid_token" | "already_verified" | "token_missing",
    "message": "..."
}
```

**Logic:**
1. Token'ı decode et (JWT)
2. `type` field'ı `"email_verification"` olmalı
3. `exp` (expiry) check et (24 saat)
4. `user_id` bul
5. User'ı bul (database'den)
6. Eğer `is_verified=True` ise → `already_verified` hatası
7. `is_verified=True` yap ve kaydet
8. Success response döndür

**Adımlar:**
- [ ] Endpoint'in var olduğunu kontrol et
- [ ] Eğer yoksa, endpoint'i ekle
- [ ] JWT token validation logic'i ekle
- [ ] User'ı bul ve `is_verified=True` yap
- [ ] Error handling ekle (invalid_token, already_verified, token_missing)
- [ ] Response modelleri oluştur
- [ ] Test: Endpoint çalışıyor

---

#### Task 1.2: Error Handling İyileştirme

**Süre:** 0.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Error handling'i iyileştir, tüm hata durumlarını handle et.

**Hata Durumları:**
1. Token yok → `token_missing`
2. Geçersiz token format → `invalid_token`
3. Token decode hatası → `invalid_token`
4. Token type hatalı (email_verification değil) → `invalid_token`
5. Token expiry geçmiş → `invalid_token`
6. User bulunamadı → `invalid_token`
7. Email zaten doğrulanmış → `already_verified`

**Adımlar:**
- [ ] Tüm hata durumlarını handle et
- [ ] Kullanıcı dostu error mesajları
- [ ] Test: Tüm error senaryoları test edildi

---

#### Task 1.3: Rate Limiting (Opsiyonel)

**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Spam prevention için rate limiting ekle.

**Rate Limit:** 10 deneme / 1 saat / IP

**Adımlar:**
- [ ] Rate limiting middleware ekle
- [ ] IP bazlı rate limiting
- [ ] Test: Rate limit çalışıyor

**Not:** MVP'de opsiyonel, ama production'da önerilir.

---

### Phase 2: Frontend Implementation (4 saat)

#### Task 2.1: Verify Email Page Component

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Ana sayfa component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/VerifyEmailPage.tsx`

**Özellikler:**
- [ ] Token query parameter'ından al
- [ ] useEffect ile otomatik token doğrulama
- [ ] Loading state göster
- [ ] Success/Error state yönetimi
- [ ] Countdown logic (3 saniye)
- [ ] Otomatik redirect (`/login`)

**Code Structure:**
```tsx
export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'success' | 'error' | 'no_token'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Token al ve doğrula
  }, [searchParams, navigate]);

  // Render logic
};
```

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] React Router hooks (useSearchParams, useNavigate)
- [ ] State management
- [ ] Token doğrulama logic
- [ ] Countdown logic
- [ ] Otomatik redirect
- [ ] Test: Component çalışıyor

---

#### Task 2.2: Loading State Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Loading state component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/VerifyEmailPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
│                                     │
│         ⏳ Yükleniyor...            │
│                                     │
│    Email doğrulanıyor...           │
│                                     │
└─────────────────────────────────────┘
```

**Adımlar:**
- [ ] Loading spinner component
- [ ] Loading mesajı
- [ ] Styling
- [ ] Test: Loading state görünüyor

---

#### Task 2.3: Success State Component

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Başarılı doğrulama state component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/VerifyEmailPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
│         ✅ Email Doğrulandı!       │
│                                     │
│  Email adresiniz başarıyla        │
│  doğrulandı. Artık giriş            │
│  yapabilirsiniz!                    │
│                                     │
│  Yönlendiriliyorsunuz...            │
│  (3 saniye içinde login sayfası)   │
│                                     │
│  [Giriş Sayfasına Git]             │
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] ✅ İkonu (yeşil checkmark)
- [ ] Başarı mesajı
- [ ] Countdown gösterimi (3, 2, 1...)
- [ ] "Giriş Sayfasına Git" butonu
- [ ] Otomatik redirect (3 saniye)

**Adımlar:**
- [ ] Success UI component
- [ ] Countdown logic
- [ ] Otomatik redirect
- [ ] Manuel redirect butonu
- [ ] Styling (yeşil, başarı teması)
- [ ] Test: Success state çalışıyor

---

#### Task 2.4: Error State Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Hata state component'ini oluştur.

**Dosya:** `frontend/src/pages/auth/VerifyEmailPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
│      ❌ Doğrulama Başarısız         │
│                                     │
│  Link geçersiz veya süresi dolmuş. │
│                                     │
│  Yeni bir doğrulama linki           │
│  göndermek için giriş yapın.        │
│                                     │
│  [Yeni Link Gönder]                 │
│  [Giriş Sayfasına Dön]              │
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] ❌ İkonu (kırmızı X)
- [ ] Hata mesajı (backend'den gelen)
- [ ] "Yeni Link Gönder" butonu → `/login` (login sayfasında email tekrar gönderme var)
- [ ] "Giriş Sayfasına Dön" butonu → `/login`

**Adımlar:**
- [ ] Error UI component
- [ ] Hata mesajı gösterimi
- [ ] Butonlar (Yeni Link Gönder, Giriş Sayfasına Dön)
- [ ] Navigation logic
- [ ] Styling (kırmızı, hata teması)
- [ ] Test: Error state çalışıyor

---

#### Task 2.5: API Client Function

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Email verification API çağrısı için client function oluştur.

**Dosya:** `frontend/src/api/auth.ts` (güncelle veya yeni)

**Function:**
```typescript
export const verifyEmail = async (token: string): Promise<VerifyEmailResponse> => {
  const response = await axios.post('/api/v1/auth/verify-email', {
    token
  });
  return response.data;
};

interface VerifyEmailResponse {
  success: boolean;
  message: string;
  redirect_url?: string;
  error?: string;
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
Verify email sayfası için route ekle.

**Dosya:** `frontend/src/App.tsx` (güncelle)

**Route:**
```tsx
<Route path="/verify-email" element={<VerifyEmailPage />} />
```

**Adımlar:**
- [ ] Route ekle
- [ ] Import VerifyEmailPage component
- [ ] Test: Route çalışıyor (`/verify-email?token=XXX`)

---

### Phase 3: Testing (2 saat)

#### Task 3.1: Backend Tests

**Süre:** 1 saat  
**Atanan:** Backend Developer

**Test Senaryoları:**
- [ ] Geçerli token ile doğrulama → Success
- [ ] Geçersiz token → Error (invalid_token)
- [ ] Süresi dolmuş token → Error (invalid_token)
- [ ] Zaten doğrulanmış email → Error (already_verified)
- [ ] Token yok → Error (token_missing)
- [ ] User bulunamadı → Error (invalid_token)
- [ ] Rate limiting test (10 deneme / 1 saat)

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
- [ ] Token varsa otomatik API çağrısı yapılıyor
- [ ] Loading state gösteriliyor
- [ ] Success state gösteriliyor (geçerli token)
- [ ] Error state gösteriliyor (geçersiz token)
- [ ] Countdown çalışıyor (3, 2, 1...)
- [ ] Otomatik redirect çalışıyor (3 saniye sonra)
- [ ] Manuel redirect butonları çalışıyor
- [ ] Token yok durumunda error gösteriliyor

**Adımlar:**
- [ ] Component test'leri yaz
- [ ] Integration test'leri yaz
- [ ] E2E test'leri yaz (opsiyonel)
- [ ] Tüm senaryolar test edildi

---

### Phase 4: Integration & Polish (1 saat)

#### Task 4.1: Integration with Register Flow

**Süre:** 0.5 saat  
**Atanan:** Full-Stack Developer

**Açıklama:**  
Register flow ile entegrasyonu kontrol et.

**Kontrol Edilecekler:**
- [ ] Register sonrası email'de link doğru (`/verify-email?token=XXX`)
- [ ] Email template'inde link formatı doğru
- [ ] Doğrulama sonrası login sayfasına yönlendirme çalışıyor
- [ ] Login sayfasında "Email Tekrar Gönder" özelliği çalışıyor (zaten var)

**Adımlar:**
- [ ] Register flow test et
- [ ] Email link test et
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
- [ ] Countdown animasyonu (smooth)
- [ ] Error mesajları kullanıcı dostu
- [ ] Buton hover/active states
- [ ] Accessibility (ARIA labels, keyboard navigation)

**Adımlar:**
- [ ] Responsive test et
- [ ] Animasyonlar ekle
- [ ] Accessibility iyileştir
- [ ] Test: UI/UX iyileştirildi

---

## ✅ Checklist

### Backend
- [ ] Verify email endpoint var ve çalışıyor
- [ ] Error handling tam
- [ ] Rate limiting (opsiyonel)
- [ ] Backend test'leri yazıldı

### Frontend
- [ ] VerifyEmailPage component oluşturuldu
- [ ] Loading state component
- [ ] Success state component
- [ ] Error state component
- [ ] API client function
- [ ] Route setup
- [ ] Frontend test'leri yazıldı

### Integration
- [ ] Register flow ile entegrasyon
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

1. **Backend Endpoint:** `POST /api/v1/auth/verify-email` endpoint'i zaten `002-register-page` modülünde implement edilmiş olmalı. Kontrol et ve eksikse ekle.

2. **Token Format:** JWT token, `type: "email_verification"`, `exp: 24 saat`, `user_id: UUID`

3. **Auto Redirect:** 3 saniye sonra otomatik `/login` redirect. Countdown gösterilir.

4. **Error Handling:** Tüm hata durumları kullanıcı dostu mesajlarla gösterilir.

5. **Integration:** Register flow ile entegre. Email'deki link bu sayfaya yönlendirir.

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Tasks Tamamlandı - Ready for Development

