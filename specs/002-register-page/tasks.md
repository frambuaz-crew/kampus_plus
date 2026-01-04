# Tasks: Register Page Implementation

**Module:** 002-register-page  
**Status:** Ready for Development  
**Estimated Time:** 4-5 days (Setup 0.5 gün + Backend 2 gün + Frontend 2 gün + Testing 0.5 gün)

---

## Task Breakdown

### Phase 0: Infrastructure Setup (0.5 gün)

#### SQLite & Environment Setup (1-2 saat)

**T001** - Setup Environment Variables
- [ ] Create `backend/.env` file from `.env.example`
- [ ] Update `backend/.env` file:
  - DATABASE_URL=sqlite+aiosqlite:///./kampus_plus_dev.db
  - SMTP_HOST=localhost, SMTP_PORT=1025 (Mailhog - opsiyonel)
  - JWT_SECRET_KEY (min 32 karakter)
  - FRONTEND_URL=http://localhost:5173
- [ ] Test: Backend `.env` dosyası doğru yükleniyor

**T002** - Setup SQLite Database
- [ ] Alembic migration oluştur: `alembic revision --autogenerate -m "initial_schema"`
- [ ] Migration'ı çalıştır: `alembic upgrade head`
- [ ] Test: SQLite database dosyası oluşmuş (`backend/kampus_plus_dev.db`)
- [ ] Test: Tablolar oluşmuş (users, refresh_tokens, vs.)
- [ ] Test: Backend başlatınca database'e bağlanıyor (WAL mode etkin)

**T003** - Optional: Mailhog Setup (Email Testing)
- [ ] Add Mailhog service to `docker-compose.yml` (opsiyonel)
  - SMTP Port: 1025
  - Web UI Port: 8025
- [ ] Test: Mailhog web UI'a erişim: http://localhost:8025

---

### Phase 1: Backend Implementation (2 gün)

#### Database Schema (1-2 saat)

**T004** - Update User model for register feature
- [ ] Update `backend/src/models/user.py`:
  - ✅ Zaten var: email, password_hash, first_name, last_name, is_verified
  - ✅ Zaten var: student_id (nullable olabilir, register'da zorunlu yapacağız)
  - ✅ Zaten var: role, is_active, created_at, updated_at
  - ❌ Ekle: department (VARCHAR(255), NOT NULL)
- [ ] Create Alembic migration: `alembic revision -m "add_department_to_users"`
- [ ] Run migration: `alembic upgrade head`
- [ ] Test: `department` field'ı users tablosunda görünüyor

**Not:** EmailVerificationToken tablosu **KULLANILMAYACAK**. JWT token kullanılacak (stateless).

---

#### Email Service Setup (2-3 saat)

**T005** - Configure Gmail SMTP + Mailhog
- [ ] Update `backend/src/core/config.py` with email settings:
  - smtp_host, smtp_port, smtp_user, smtp_password
  - smtp_from_email, smtp_from_name
- [ ] Create or update `backend/src/services/email_service.py`
- [ ] Implement `send_verification_email(to_email: str, first_name: str, verification_token: str)` function
  - Use SMTP (Gmail for production, Mailhog for development)
  - HTML email template (basit, spec.md'deki gibi)
- [ ] Create HTML email template (inline veya Jinja2 template)
- [ ] Test (Development): Send email to Mailhog, web UI'da görünür
- [ ] Test (Production): Gmail SMTP ile gerçek email gönder (Google App Password gerekli)

**T006** - Create JWT email verification token generator
- [ ] Update or create `backend/src/services/auth_service.py`
- [ ] Implement `generate_email_verification_token(user_id: UUID)` function
  - Use PyJWT library
  - Payload: user_id, type="email_verification", exp (24 saat), iat
  - Algorithm: HS256
  - Secret: config.jwt_secret_key
- [ ] Implement `verify_email_verification_token(token: str)` function
  - Decode JWT token
  - Check type == "email_verification"
  - Check expiry (24 saat)
  - Return user_id if valid
- [ ] Test: Token generation ve validation çalışıyor

---

#### Auth Endpoints (4-5 saat)

**T007** - Implement POST /api/v1/auth/register endpoint
- [ ] Update `backend/src/api/routes/auth.py`
- [ ] Add RegisterRequest Pydantic model:
  - email: EmailStr
  - password: str (min_length=8)
  - first_name: str (min_length=2, max_length=100)
  - last_name: str (min_length=2, max_length=100)
  - student_id: str (min_length=6, max_length=15, pattern="^[0-9]+$")
  - department: str (enum: 20 bölüm listesi)
  - terms_accepted: bool
- [ ] Add RegisterResponse model: success, message, email
- [ ] Validation logic:
  - Check email ends with `.edu.tr`
  - Check email not already registered
  - Check password: min 8 char, en az 1 harf, en az 1 rakam
  - Check student_id: sadece rakam, 6-15 karakter
  - Check department: dropdown'dan seçilmiş değer
  - Check terms_accepted == true
- [ ] Hash password with bcrypt (cost factor 12)
- [ ] Save user to database (is_verified=False)
- [ ] Generate JWT verification token
- [ ] Send verification email (Mailhog/Gmail SMTP)
- [ ] Return success response (email gönderilmezse bile başarılı)
- [ ] Test: Postman ile kayıt testi

**T008** - Implement error handling for register endpoint
- [ ] Return proper error responses:
  - 400: Invalid email domain (.edu.tr değil)
  - 409: Email already exists
  - 400: Weak password (< 8 karakter veya harf/rakam yok)
  - 400: Invalid student_id (harf içeriyor veya 6-15 karakter değil)
  - 400: Terms not accepted
  - 429: Rate limit exceeded (5 deneme / 10 dk / IP)
  - 500: Server error
- [ ] Add logging for all errors
- [ ] Test: Invalid input'lar ile test et, error mesajları user-friendly

**T009** - Implement POST /api/v1/auth/resend-verification endpoint
- [ ] Accept email in request body (ResendVerificationRequest)
- [ ] Check if user exists and not verified (is_verified=False)
- [ ] Rate limit: Max 3 requests per email per hour (in-memory cache)
- [ ] Generate new JWT token
- [ ] Send email
- [ ] Return success response
- [ ] Test: Resend çalışıyor, rate limiting çalışıyor

**T010** - Implement POST /api/v1/auth/verify-email endpoint
- [ ] Accept token in request body (VerifyEmailRequest)
- [ ] Decode JWT token (verify_email_verification_token)
- [ ] Check token valid ve expired değil
- [ ] Mark user as verified (is_verified=True)
- [ ] Update updated_at timestamp
- [ ] Return success response with redirect_url="/login"
- [ ] Test: Valid token ile doğrulama çalışıyor
- [ ] Test: Invalid/expired token hata veriyor

**Not:** Doğrulama sonrası otomatik login YOK. Kullanıcı login sayfasına yönlendirilir.

---

#### Security & Rate Limiting (2-3 saat)

**T011** - Implement in-memory rate limiting (masrafsız, Redis gerekmez)
- [ ] Create `backend/src/core/rate_limiter.py`
- [ ] Implement in-memory rate limiter:
  - `register_attempts = {}  # {ip: [timestamp1, timestamp2, ...]}`
  - `resend_attempts = {}    # {email: [timestamp1, timestamp2, ...]}`
- [ ] Add rate_limit_register decorator: 5 attempts / 10 min / IP
- [ ] Add rate_limit_resend decorator: 3 attempts / 1 hour / email
- [ ] Cleanup function (eski timestamp'leri sil)
- [ ] Apply decorators to register ve resend endpoints
- [ ] Test: Exceed limits, 429 Too Many Requests response

**T012** - Add security headers and CORS
- [ ] Update `backend/src/main.py` CORS configuration:
  - Allow origins: http://localhost:5173 (development)
  - Allow credentials: True
  - Allow methods: GET, POST, PUT, DELETE
- [ ] Add security headers middleware (helmet equivalent)
- [ ] Test: CORS çalışıyor, preflight requests handled
- [ ] Test: Frontend'den backend'e request gidiyor

---

### Phase 2: Frontend Implementation (2 gün)

#### Register Form Component (4-5 saat)

**T013** - Create register page and form
- [ ] Create `frontend/src/pages/RegisterPage.tsx`
- [ ] Create `frontend/src/components/auth/RegisterForm.tsx`
- [ ] Add route `/register` in `App.tsx` router
- [ ] Basic layout:
  - Header with "Zaten hesabın var mı? Giriş yap" link
  - Form fields (email, password, first_name, last_name, student_id, department dropdown, terms checkbox)
  - Submit button
  - Footer
- [ ] Test: Page renders, accessible at /register

**T014** - Implement form fields with validation
- [ ] Email input with validation:
  - Required field
  - Valid email format (HTML5 + custom)
  - Must end with `.edu.tr`
  - Real-time validation with visual feedback (border color)
  - Error message display
- [ ] Password input with validation:
  - Required field
  - Min 8 characters
  - At least 1 harf (büyük/küçük fark etmez)
  - At least 1 rakam
  - Show/hide password toggle (eye icon)
- [ ] First Name input:
  - Required field
  - Min 2 characters
  - Only letters and spaces
  - Placeholder: "Adınız"
- [ ] Last Name input:
  - Required field
  - Min 2 characters
  - Only letters and spaces
  - Placeholder: "Soyadınız"
- [ ] Student ID input:
  - Required field
  - Only digits (0-9)
  - 6-15 characters
  - Error: "Öğrenci numarası 6-15 karakter arası olmalı ve sadece rakam içermelidir"
  - Placeholder: "Örnek: 123456789"
- [ ] Department dropdown (select):
  - Required field
  - Options: 20 bölüm listesi (spec.md'den al)
  - Default: "Bölümünüzü seçin" (placeholder)
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
- [ ] Terms checkbox:
  - Required
  - Text: "Kullanım koşullarını ve gizlilik politikasını okudum, kabul ediyorum"
  - Link to terms page/modal
- [ ] Test: All validations work, error messages display, dropdown çalışıyor

**T015** - Implement form submission logic
- [ ] Add form state management (useState or React Hook Form)
- [ ] Prepare request payload:
  - email, password, first_name, last_name, student_id, department, terms_accepted
- [ ] On submit:
  - Validate all fields
  - Show loading state (disable button, show spinner)
  - Make POST request to `/api/v1/auth/register`
  - Handle success: Aynı sayfada başarı mesajı göster (form'u gizle)
  - Handle errors: Display error messages (user-friendly)
- [ ] Add axios instance in `frontend/src/api/config.ts` (if not exists)
- [ ] Test: Form submits, loading state works, errors handled

**Not:** "Email Sent" ayrı sayfa YOK. Aynı sayfada success message gösterilir.

---

#### Email Verification Flow (3-4 saat)

**T016** - Implement success message on register page
- [ ] Create success message component (conditional render)
- [ ] When registration succeeds:
  - Hide form
  - Show success message:
    - Success icon (✅)
    - "Kayıt Başarılı!"
    - "Email'inizi kontrol edin: [email]"
    - "Giriş Sayfasına Dön" button → /login
    - Small text: "Spam/Junk klasörünü de kontrol edin"
- [ ] Test: Success message displays, login button works

**Not:** Ayrı sayfa YOK, aynı sayfada form yerine success message gösterilir.

**T017** - Create email verification page with loading popup
- [ ] Create `frontend/src/pages/VerifyEmailPage.tsx`
- [ ] Parse token from URL query params (`?token=xxx`)
- [ ] On mount:
  - Show loading popup/spinner (yüklenme animasyonu)
  - Make POST request to `/api/v1/auth/verify-email` with token in body
- [ ] Success case:
  - Hide loading popup
  - Show success message "Email Doğrulandı!"
  - "Artık giriş yapabilirsiniz"
  - Auto-redirect to /login after 2-3 seconds
- [ ] Error case:
  - Hide loading popup
  - Show error message "Link geçersiz veya süresi dolmuş"
  - "Yeni Doğrulama Linki Gönder" button (optional)
  - "Giriş Sayfasına Dön" link
- [ ] Test: Valid token verifies, invalid token shows error, loading UX iyi
- [ ] Test: Auto-redirect çalışıyor

**Not:** Doğrulama sonrası otomatik login YOK. Login sayfasına yönlendirilir.

---

#### Styling & UX Polish (3-4 saat)

**T018** - Style register form with Tailwind CSS
- [ ] Apply consistent styling:
  - Form container: centered, max-width 450-550px
  - Input fields: proper padding, borders, focus states (Tailwind focus:ring)
  - Dropdown (select): same style as input fields
  - Error messages: red text below inputs (text-red-600)
  - Success feedback: green borders (border-green-500)
  - Button: primary style (bg-indigo-600), hover effects, disabled state
- [ ] Add animations:
  - Fade-in for form (transition-opacity)
  - Smooth transitions for validation feedback
- [ ] Ensure responsive design (mobile, tablet, desktop)
- [ ] Test: Looks good on all screen sizes, dropdown mobile'de iyi görünüyor

**T019** - (OPSIYONEL) Add password strength indicator
- [ ] Create simple validation feedback
- [ ] Check:
  - Min 8 karakter ✓/✗
  - En az 1 harf ✓/✗
  - En az 1 rakam ✓/✗
- [ ] Show checkmarks as user types (real-time)
- [ ] Test: Validation feedback works

**Not:** Fancy strength meter gerekmez. Basit ✓/✗ feedback yeterli.

**T020** - Implement real-time field validation
- [ ] Email validation on blur (unfocus) → .edu.tr check
- [ ] Student ID validation on blur → sadece rakam, 6-15 karakter
- [ ] Show check mark (✓) for valid fields (green)
- [ ] Show X mark (✗) for invalid fields (red)
- [ ] Debounce validation (300ms) for better UX
- [ ] Test: Instant feedback works without lag

---

### Phase 3: Integration & Testing (0.5 gün)

#### End-to-End Testing (3-4 saat)

**T021** - Manual testing: Happy path
- [ ] Test complete flow:
  1. Go to landing page
  2. Click "Hemen Kayıt Ol"
  3. Fill form with valid .edu.tr email
  4. Select department from dropdown
  5. Submit form
  6. See success message on register page (form gizlenir)
  7. Check Mailhog (http://localhost:8025) for verification email
  8. Click verification link
  9. See loading popup → "Email Doğrulandı" message
  10. Auto-redirect to login page (2-3 saniye)
- [ ] Document any issues found
- [ ] Fix critical bugs

**T022** - Test error scenarios
- [ ] Try registering with gmail.com email → Should fail (.edu.tr değil)
- [ ] Try registering with already registered email → Should fail (409 Conflict)
- [ ] Try weak password (e.g., "123") → Should fail (< 8 karakter)
- [ ] Try password without letter (e.g., "12345678") → Should fail (harf yok)
- [ ] Try password without digit (e.g., "abcdefgh") → Should fail (rakam yok)
- [ ] Try invalid student ID (e.g., "123abc") → Should fail (harf içeriyor)
- [ ] Try student ID too short (e.g., "12345") → Should fail (5 karakter, min 6)
- [ ] Try student ID too long (e.g., "1234567890123456") → Should fail (16 karakter, max 15)
- [ ] Try empty first name → Should fail
- [ ] Try empty last name → Should fail
- [ ] Try without selecting department → Should fail (dropdown boş)
- [ ] Try without accepting terms → Should fail
- [ ] Try invalid token in verification URL → Should show error
- [ ] Try expired token (JWT expired) → Should show error
- [ ] Try login without email verification → Should fail (is_verified check)
- [ ] Test rate limiting: Register 6 times quickly → 6th should be blocked (429)
- [ ] Document all error messages, ensure user-friendly

**T023** - Cross-browser testing
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (if Mac available)
- [ ] Test on mobile browsers (Chrome mobile, Safari iOS)
- [ ] Fix any browser-specific issues
- [ ] Test dropdown on mobile (iOS Safari önemli)

---

#### Security Audit (2-3 saat)

**T024** - Security checklist
- [ ] Verify passwords are hashed with bcrypt (cost factor 12)
- [ ] Verify JWT tokens are secure (HS256, 24 saat expiry)
- [ ] Verify SQL injection is prevented (SQLAlchemy ORM kullanılıyor)
- [ ] Verify XSS is prevented (React default escape, HTML templates check)
- [ ] Verify rate limiting works (5/10dk register, 3/1saat resend)
- [ ] Verify HTTPS is enforced (production only)
- [ ] Verify CORS is properly configured (localhost:5173 allowed)
- [ ] Run security linter (Bandit for Python, ESLint security plugin for JS)
- [ ] Document any vulnerabilities found

**T025** - Performance testing
- [ ] Test email sending speed (Mailhog instant, Gmail <5 seconds)
- [ ] Test form submission speed (<1 second response)
- [ ] Check database query performance (indexes on email, student_id)
- [ ] Run Lighthouse audit on register page
- [ ] Target: Performance ≥ 85, Accessibility ≥ 90
- [ ] Fix any performance issues

---

### Phase 4: Documentation & Deployment (0.5 gün)

**T026** - Write API documentation
- [ ] Document register endpoint in OpenAPI/Swagger
  - POST /api/v1/auth/register
  - Request body: email, password, first_name, last_name, student_id, department, terms_accepted
  - Response: success, message, email
- [ ] Document resend-verification endpoint
  - POST /api/v1/auth/resend-verification
- [ ] Document verify-email endpoint
  - POST /api/v1/auth/verify-email
- [ ] Add example requests and responses
- [ ] Test: Swagger UI displays correctly (http://localhost:8000/docs)

**T027** - Create developer setup guide
- [ ] Document environment variables needed:
  - DATABASE_URL (SQLite)
  - SMTP_HOST, SMTP_PORT (Gmail/Mailhog)
  - JWT_SECRET_KEY (min 32 karakter)
  - FRONTEND_URL (for email links)
- [ ] Document Docker setup:
  - docker-compose up -d (Mailhog - opsiyonel)
  - Mailhog web UI: http://localhost:8025
- [ ] Document how to run migrations (Alembic)
- [ ] Document how to test email locally (Mailhog)
- [ ] Add to project README or `specs/002-register-page/setup.md`

**T028** - Deployment preparation
- [ ] Add production email service configuration:
  - Gmail SMTP (Google App Password)
  - Or SendGrid (if switching)
- [ ] Configure production database (AWS RDS / DigitalOcean / Railway)
- [ ] Set up HTTPS redirect (Let's Encrypt)
- [ ] Update CORS origins (production domain)
- [ ] Test on staging environment
- [ ] Create deployment checklist
- [ ] Deploy to production (Heroku/Railway/AWS/DigitalOcean)

---

## Acceptance Testing Checklist

From `spec.md`:

- [ ] ✅ Sadece `.edu.tr` uzantılı email'ler kabul edilir
- [ ] ✅ Kullanıcı email, şifre, ad, soyad, öğrenci no, bölüm girer
- [ ] ✅ Şifre en az 8 karakter, en az 1 harf, 1 rakam içermeli
- [ ] ✅ Öğrenci numarası sadece rakam, 6-15 karakter
- [ ] ✅ Bölüm dropdown'dan seçilir (20 yaygın bölüm + "Diğer")
- [ ] ✅ Form validasyonu client-side çalışır (anlık feedback)
- [ ] ✅ Kayıt sonrası aynı sayfada başarı mesajı gösterilir (form kaybolur)
- [ ] ✅ Doğrulama email'i gönderilir (Mailhog/Gmail SMTP)
- [ ] ✅ Kullanıcı email'deki linke tıklayarak hesabını doğrular
- [ ] ✅ Doğrulama sonrası loading popup → login sayfasına yönlendirilir (otomatik login YOK)
- [ ] ✅ Email doğrulanmadan giriş yapma engellenir (is_verified check)
- [ ] ✅ Kullanım koşulları checkbox'ı zorunlu

---

## Success Criteria Testing

- [ ] **SC-001:** `.edu.tr` email'i ile kayıt başarılı olur
- [ ] **SC-002:** Gmail/Outlook gibi email'ler reddedilir
- [ ] **SC-003:** 8 karakterden kısa veya harf/rakam içermeyen şifreler reddedilir
- [ ] **SC-004:** Aynı email ile ikinci kayıt engellenir
- [ ] **SC-005:** Doğrulama email'i 5 saniyede gönderilir
- [ ] **SC-006:** Email doğrulama linki çalışır
- [ ] **SC-007:** Doğrulama sonrası login sayfasına yönlendirilir (otomatik giriş YOK)
- [ ] **SC-008:** Email doğrulanmadan giriş yapma engellenir
- [ ] **SC-009:** Kayıt başarılı olunca aynı sayfada başarı mesajı gösterilir
- [ ] **SC-010:** Form validasyonu instant feedback verir
- [ ] **SC-011:** Hata mesajları anlaşılırdır
- [ ] **SC-012:** Mobil cihazlarda düzgün çalışır

---

## Dependencies & Blockers

**Blockers:**
- Landing Page (001-landing-page) → Must be complete for register button

**Required After:**
- Login Page (003-login-page) → "Zaten hesabın var mı?" link needs target + Email verification redirects here

**External Services:**
- Email service (SMTP/SendGrid) → Must be configured
- Database (SQLite) → File-based, otomatik oluşur

---

## Estimated Effort

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 0: Setup | T001-T003 | 4-6 hours (0.5 gün) |
| Phase 1: Backend | T004-T012 | 16-20 hours (2 gün) |
| Phase 2: Frontend | T013-T020 | 16-20 hours (2 gün) |
| Phase 3: Testing | T021-T025 | 8-10 hours (0.5 gün) |
| Phase 4: Docs & Deploy | T026-T028 | 3-4 hours (0.5 gün) |
| **Total** | **28 tasks** | **47-60 hours (4-5 gün)** |

**Team:**
- DevOps/Setup: 0.5 gün (T001-T003) - SQLite + Environment setup
- Backend Developer: 2 gün (T004-T012)
- Frontend Developer: 2 gün (T013-T020)
- QA/Testing: 0.5 gün (T021-T025)
- DevOps: 0.5 gün (T026-T028)

**Parallel Work:**
Backend and frontend can work in parallel after T001-T006 complete (database + API contract defined).

---

## Tech Stack

**Backend:**
- FastAPI (Python 3.11+)
- SQLAlchemy (ORM)
- Alembic (migrations)
- Bcrypt (password hashing)
- SMTP/SendGrid (email service)
- SQLite (database - mezuniyet projesi için)

**Frontend:**
- React 19+ with TypeScript
- React Router (routing)
- Axios (API calls)
- TailwindCSS (styling)
- React Hook Form or Formik (form management, optional)

---

## Environment Variables Needed

**Backend (.env):**
```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./kampus_plus_dev.db

# Email Service (Option 1: SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Email Service (Option 2: SendGrid)
SENDGRID_API_KEY=SG.xxxxx

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# Rate Limiting (optional, defaults in code)
RATE_LIMIT_REGISTER_PER_IP=5
RATE_LIMIT_RESEND_PER_EMAIL=3
```

**Frontend (.env.local):**
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Email Testing (Development)

**For Local Testing, use Mailhog:**

1. Run Mailhog (SMTP test server):
```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

2. Configure backend .env:
```bash
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
```

3. Access Mailhog UI at: http://localhost:8025

All emails will be caught by Mailhog instead of actually sending.

---

## Notes for Developers

1. **Email Domain Validation:** Only `.edu.tr` is allowed. Pattern is simple: `email.endswith('.edu.tr')`. Türkiye'deki tüm üniversiteleri destekler.

2. **Password Hashing:** Use bcrypt with cost factor 12. NEVER store plain text passwords.

3. **Token Security:** Use `secrets.token_urlsafe(32)` for cryptographically secure tokens. Store SHA256 hash in database if extra paranoid.

4. **Rate Limiting:** Important to prevent abuse. Use Redis for distributed rate limiting in production.

5. **Email Template:** Keep it simple for MVP. Can enhance with HTML templates later.

6. **Error Messages:** Always user-friendly, never expose technical details (e.g., "Email already exists" instead of "Unique constraint violation on users.email").

7. **Testing:** Test with real `.edu.tr` emails if possible. Create test accounts: `test1@selcuk.edu.tr`, `test2@ktun.edu.tr`, etc.

---

**Created:** 2025-12-30  
**Status:** ✅ Ready for Development  
**Next:** Assign tasks to backend and frontend developers, start parallel development

