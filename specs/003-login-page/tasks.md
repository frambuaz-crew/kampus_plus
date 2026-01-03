# Tasks: Login Page Implementation

**Module:** 003-login-page  
**Status:** Ready for Development  
**Estimated Time:** 3-4 days (Backend 1.5 gün + Frontend 1.5 gün + Testing 0.5 gün)

---

## Task Breakdown

### Phase 1: Backend Implementation (1.5 gün)

#### Auth Endpoints (4-5 saat)

**T001** - Implement POST /api/v1/auth/login endpoint
- [ ] Update `backend/src/api/routes/auth.py`
- [ ] Add LoginRequest Pydantic model:
  - email: EmailStr
  - password: str
  - remember_me: bool (default: False)
- [ ] Add LoginResponse model: access_token, token_type, expires_in, user
- [ ] Validation logic:
  - Check email ve password boş değil
  - Find user by email
  - Verify password with bcrypt
  - Check is_verified=True (email doğrulanmış mı?)
  - Check is_active=True
- [ ] Generate JWT tokens:
  - Access token (15 dakika)
  - Refresh token (7 gün veya 30 gün, remember_me'ye göre)
- [ ] Set refresh token as httpOnly cookie:
  - httponly=True
  - secure=True (production)
  - samesite="strict"
  - max_age = 7 gün (default) veya 30 gün (remember_me=true)
- [ ] Return access token + user info in response body
- [ ] Test: Postman ile login testi (başarılı ve başarısız senaryolar)

**T002** - Implement error handling for login endpoint
- [ ] Return proper error responses:
  - 401: Invalid email or password (genel mesaj, email/şifre belirtme)
  - 403: Email not verified (is_verified=False)
    - Include email in response
    - Frontend "Email Tekrar Gönder" butonu gösterir
  - 403: Account inactive (is_active=False)
  - 429: Rate limit exceeded (5 deneme / 10 dk / IP)
  - 500: Server error
- [ ] Add logging for all login attempts (success/failure)
- [ ] Test: Invalid credentials, email not verified, rate limit

**T003** - Implement rate limiting for login
- [ ] Update `backend/src/core/rate_limiter.py`
- [ ] Add login_attempts cache: `{ip: [timestamp1, timestamp2, ...]}`
- [ ] Rate limit: 5 attempts / 10 minutes / IP
- [ ] Apply decorator to login endpoint
- [ ] Test: 6 login attempts quickly → 6th should be blocked (429)

---

#### Password Reset Endpoints (5-6 saat)

**T004** - Implement POST /api/v1/auth/forgot-password endpoint
- [ ] Add ForgotPasswordRequest model: email
- [ ] Validation:
  - Email format valid
  - (Backend'de user bulunur ama response her zaman aynı)
- [ ] Logic:
  - Find user by email
  - If exists:
    - Generate password reset JWT token (1 saat expiry)
    - Payload: user_id, type="password_reset", exp, iat
    - Send password reset email (Gmail SMTP / Mailhog)
  - If not exists:
    - Silently fail (no action)
  - Always return same response (email enumeration prevention)
- [ ] Response: "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi."
- [ ] Test: Existing email, non-existing email → same response

**T005** - Create password reset email template
- [ ] Create or update `backend/src/services/email_service.py`
- [ ] Implement `send_password_reset_email(to_email: str, first_name: str, reset_token: str)` function
- [ ] HTML email template (spec.md'deki gibi)
- [ ] Reset link: `{FRONTEND_URL}/reset-password?token={reset_token}`
- [ ] Test: Email gönderilir, Mailhog'da görünür, link doğru

**T006** - Implement POST /api/v1/auth/reset-password endpoint
- [ ] Add ResetPasswordRequest model:
  - token: str
  - new_password: str (min_length=8)
  - confirm_password: str
- [ ] Validation:
  - Decode JWT token
  - Check type == "password_reset"
  - Check token not expired (1 saat)
  - new_password == confirm_password
  - Password strength: min 8 char, 1 harf, 1 rakam
- [ ] Logic:
  - Find user by user_id from token
  - Hash new password (bcrypt, cost factor 12)
  - Update user.password_hash
  - Update user.updated_at
  - Revoke all refresh tokens (security best practice)
- [ ] Return success response
- [ ] Test: Valid token, invalid token, password mismatch, weak password

**T007** - Implement rate limiting for password reset
- [ ] Add rate limiting for forgot-password: 3 attempts / 1 hour / email
- [ ] Add rate limiting for reset-password: 5 attempts / 1 hour / IP
- [ ] Test: Rate limits work

---

### Phase 2: Frontend Implementation (1.5 gün)

#### Login Form Component (4-5 saat)

**T008** - Create login page and form
- [ ] Create `frontend/src/pages/LoginPage.tsx`
- [ ] Create `frontend/src/components/auth/LoginForm.tsx`
- [ ] Add route `/login` in `App.tsx` router
- [ ] Basic layout:
  - Header with "Hesabın yok mu? Kayıt ol" link → /register
  - Form fields (email, password, remember me checkbox)
  - Submit button
  - "Şifremi Unuttum?" link → /forgot-password
  - Footer
- [ ] Test: Page renders, accessible at /login

**T009** - Implement form fields with validation
- [ ] Email input:
  - Required field
  - Valid email format (HTML5 validation)
  - Placeholder: "Email adresiniz"
  - Auto-complete: "email"
- [ ] Password input:
  - Required field
  - Show/hide toggle (eye icon)
  - Placeholder: "Şifreniz"
  - Auto-complete: "current-password"
- [ ] Remember Me checkbox:
  - Optional
  - Text: "Beni Hatırla (30 gün)"
  - Default: unchecked
- [ ] Test: All validations work, auto-complete çalışıyor

**T010** - Implement form submission logic
- [ ] Add form state management (useState or React Hook Form)
- [ ] On submit:
  - Validate email ve password boş değil
  - Show loading state (disable button, show spinner)
  - Make POST request to `/api/v1/auth/login`
  - Request body: email, password, remember_me
- [ ] Handle success:
  - Store access_token in memory (useState or context)
  - Refresh token cookie otomatik set edilir (backend)
  - Redirect to /dashboard
- [ ] Handle errors:
  - 401: "Email veya şifre hatalı" → form'da göster
  - 403 email_not_verified: Show "Email Doğrulanmamış" error component
  - 429: Rate limit → "Çok fazla deneme" mesajı
- [ ] Test: Başarılı login, hatalı credentials, email not verified

**T011** - Implement "Email Not Verified" error component
- [ ] Create `EmailNotVerifiedError` component
- [ ] When 403 email_not_verified error:
  - Hide form (or keep visible)
  - Show error message:
    - ❌ Email Doğrulanmamış
    - "Hesabınıza giriş yapmadan önce..."
    - [Email Tekrar Gönder] button
    - Small text: "Spam/Junk kontrol edin"
- [ ] "Email Tekrar Gönder" button:
  - onClick → POST `/api/v1/auth/resend-verification` (from register spec)
  - Show loading state
  - Success: "Email gönderildi" mesajı
  - Error: Rate limit veya server error
- [ ] Test: Email not verified error görünür, resend çalışır

---

#### Forgot Password Flow (3-4 saat)

**T012** - Create forgot password page
- [ ] Create `frontend/src/pages/ForgotPasswordPage.tsx`
- [ ] Add route `/forgot-password` in router
- [ ] Form:
  - Email input (required)
  - Submit button: "Gönder"
  - "← Giriş Sayfasına Dön" link
- [ ] On submit:
  - Make POST request to `/api/v1/auth/forgot-password`
  - Always show success message (email enumeration prevention):
    - "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi."
  - Show "Giriş Sayfasına Dön" button
- [ ] Test: Form çalışır, success message gösterilir

**T013** - Create reset password page
- [ ] Create `frontend/src/pages/ResetPasswordPage.tsx`
- [ ] Add route `/reset-password` in router
- [ ] Parse token from URL query params (`?token=xxx`)
- [ ] Form:
  - New Password input (min 8 char, show/hide toggle)
  - Confirm Password input (must match)
  - Password rules display:
    - • En az 8 karakter
    - • En az 1 harf
    - • En az 1 rakam
  - Submit button: "Şifremi Güncelle"
- [ ] Validation:
  - new_password == confirm_password
  - Password strength (min 8, 1 harf, 1 rakam)
- [ ] On submit:
  - Make POST request to `/api/v1/auth/reset-password`
  - Request: token, new_password, confirm_password
- [ ] Handle success:
  - Show "✅ Şifre Güncellendi" mesajı
  - "Artık giriş yapabilirsiniz"
  - [Giriş Yap] button → /login
  - Auto-redirect after 3 seconds
- [ ] Handle errors:
  - Invalid/expired token → "Link geçersiz veya süresi dolmuş"
  - Password mismatch → "Şifreler eşleşmiyor"
  - Weak password → "Şifre kurallarına uymuyor"
- [ ] Test: Valid token, invalid token, password mismatch

---

#### Styling & UX Polish (2-3 saat)

**T014** - Style login form with Tailwind CSS
- [ ] Apply consistent styling:
  - Form container: centered, max-width 400-450px
  - Input fields: same style as register page
  - Checkbox: proper spacing and styling
  - Button: primary style, hover effects
  - Links: proper colors and hover states
- [ ] Add animations:
  - Fade-in for form
  - Smooth transitions for error messages
- [ ] Ensure responsive design (mobile, tablet, desktop)
- [ ] Test: Looks good on all screen sizes

**T015** - Style forgot & reset password pages
- [ ] Apply same styling as login page
- [ ] Success messages: green background, icon
- [ ] Error messages: red background, icon
- [ ] Password rules: list style, checkmarks for valid rules (optional)
- [ ] Test: All pages visually consistent

**T016** - Implement real-time validation feedback
- [ ] Email validation on blur
- [ ] Show error messages below inputs (red text)
- [ ] Password match validation (reset password page)
- [ ] Show ✓ or ✗ for valid/invalid fields
- [ ] Test: Instant feedback works smoothly

---

### Phase 3: Integration & Testing (0.5 gün)

#### End-to-End Testing (3-4 saat)

**T017** - Manual testing: Happy path (Login)
- [ ] Test complete flow:
  1. Go to login page
  2. Enter valid email + password
  3. Check "Beni Hatırla"
  4. Click "Giriş Yap"
  5. Verify redirect to dashboard
  6. Check cookie: refresh_token set with 30 gün expiry
- [ ] Document any issues found
- [ ] Fix critical bugs

**T018** - Manual testing: Email Not Verified
- [ ] Test flow:
  1. Register new user (don't verify email)
  2. Try to login
  3. See "Email Doğrulanmamış" error
  4. Click "Email Tekrar Gönder"
  5. Check Mailhog for verification email
  6. Verify email
  7. Login successfully
- [ ] Test: Error message clear, resend works

**T019** - Manual testing: Forgot Password flow
- [ ] Test flow:
  1. Go to login page
  2. Click "Şifremi Unuttum?"
  3. Enter email
  4. Check Mailhog for reset email
  5. Click reset link
  6. Enter new password (2 kez)
  7. Submit
  8. See success message
  9. Login with new password
- [ ] Test: Complete flow works, email received, password updated

**T020** - Test error scenarios
- [ ] Try login with wrong email → Should fail (401)
- [ ] Try login with wrong password → Should fail (401)
- [ ] Try login with unverified email → Should show resend button
- [ ] Try login 6 times quickly → 6th should be blocked (429)
- [ ] Try forgot password with non-existent email → Same success message (security)
- [ ] Try reset password with invalid token → Should show error
- [ ] Try reset password with expired token → Should show error
- [ ] Try reset password with mismatched passwords → Should show error
- [ ] Try reset password with weak password → Should show error
- [ ] Test rate limits: forgot password, reset password
- [ ] Document all error messages, ensure user-friendly

**T021** - Cross-browser testing
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (if Mac available)
- [ ] Test on mobile browsers (Chrome mobile, Safari iOS)
- [ ] Fix any browser-specific issues

---

#### Security Audit (2-3 saat)

**T022** - Security checklist
- [ ] Verify passwords are verified with bcrypt
- [ ] Verify JWT tokens are secure (access 15 min, refresh 7/30 gün)
- [ ] Verify refresh token is httpOnly cookie (XSS protection)
- [ ] Verify rate limiting works (login, forgot, reset)
- [ ] Verify email enumeration prevention (forgot password)
- [ ] Verify CORS is properly configured
- [ ] Verify HTTPS enforced (production)
- [ ] Run security linter (Bandit, ESLint security)
- [ ] Document any vulnerabilities found

**T023** - Performance testing
- [ ] Test login response time (<500ms)
- [ ] Test forgot password email sending (<5 seconds)
- [ ] Test reset password response time (<500ms)
- [ ] Run Lighthouse audit on login page
- [ ] Target: Performance ≥ 85, Accessibility ≥ 90
- [ ] Fix any performance issues

---

### Phase 4: Documentation & Deployment (0.5 gün)

**T024** - Write API documentation
- [ ] Document login endpoint in OpenAPI/Swagger
  - POST /api/v1/auth/login
  - Request: email, password, remember_me
  - Response: access_token, user info
  - Errors: 401, 403, 429
- [ ] Document forgot-password endpoint
- [ ] Document reset-password endpoint
- [ ] Add example requests and responses
- [ ] Test: Swagger UI displays correctly

**T025** - Update developer setup guide
- [ ] Document login flow
- [ ] Document password reset flow
- [ ] Document JWT tokens (access + refresh)
- [ ] Document "Beni Hatırla" feature (7 gün vs 30 gün)
- [ ] Add to project README or `specs/003-login-page/setup.md`

**T026** - Deployment preparation
- [ ] Verify production email service (Gmail SMTP)
- [ ] Verify JWT_SECRET_KEY is strong (min 32 characters)
- [ ] Verify refresh token cookies secure (httpOnly, secure, sameSite)
- [ ] Test on staging environment
- [ ] Create deployment checklist
- [ ] Deploy to production

---

## Acceptance Testing Checklist

From `spec.md`:

- [ ] ✅ Email ve şifre ile giriş yapılabilir
- [ ] ✅ Email doğrulanmamışsa giriş engellenir
- [ ] ✅ Email doğrulanmamış hatası "Email Tekrar Gönder" butonu gösterir
- [ ] ✅ "Beni Hatırla" seçeneği refresh token süresini 30 güne çıkarır
- [ ] ✅ Başarılı girişte dashboard'a yönlendirilir
- [ ] ✅ "Şifremi Unuttum" linki ile password reset başlatılır
- [ ] ✅ Password reset email'i gönderilir (1 saat geçerli)
- [ ] ✅ Yeni şifre ile giriş yapılabilir
- [ ] ✅ Rate limiting çalışır (5 deneme / 10 dk)
- [ ] ✅ Mobile'de düzgün çalışır

---

## Success Criteria Testing

- [ ] **SC-001:** Email ve şifre ile giriş başarılı olur
- [ ] **SC-002:** Yanlış email/şifre ile giriş reddedilir
- [ ] **SC-003:** Email doğrulanmamış kullanıcı giriş yapamaz
- [ ] **SC-004:** "Email Tekrar Gönder" butonu çalışır
- [ ] **SC-005:** "Beni Hatırla" refresh token süresini uzatır
- [ ] **SC-006:** "Şifremi Unuttum" flow çalışır
- [ ] **SC-007:** Password reset email'i gönderilir
- [ ] **SC-008:** Yeni şifre ile giriş yapılabilir
- [ ] **SC-009:** Rate limiting çalışır
- [ ] **SC-010:** Dashboard'a yönlendirilir
- [ ] **SC-011:** Mobile'de düzgün çalışır

---

## Dependencies & Blockers

**Blockers:**
- Register Page (002-register-page) → Kullanıcılar kayıt olmadan login yapamaz

**Required After:**
- Dashboard Page → Login sonrası yönlendirilecek sayfa (placeholder yeterli)

**External Services:**
- Email service (Gmail SMTP / Mailhog)
- Database (PostgreSQL)

---

## Estimated Effort

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 1: Backend | T001-T007 | 12-14 hours (1.5 gün) |
| Phase 2: Frontend | T008-T016 | 12-14 hours (1.5 gün) |
| Phase 3: Testing | T017-T023 | 8-10 hours (0.5 gün) |
| Phase 4: Docs & Deploy | T024-T026 | 3-4 hours (0.5 gün) |
| **Total** | **26 tasks** | **35-42 hours (3-4 gün)** |

**Team:**
- Backend Developer: 1.5 gün (T001-T007)
- Frontend Developer: 1.5 gün (T008-T016)
- QA/Testing: 0.5 gün (T017-T023)
- DevOps: 0.5 gün (T024-T026)

**Parallel Work:**
Backend and frontend can work in parallel after T001-T003 complete (API contract defined).

---

## Tech Stack

**Same as Register:**

**Backend:**
- FastAPI (Python 3.11+)
- SQLAlchemy (ORM)
- Bcrypt (password verification)
- PyJWT (JWT tokens)
- Gmail SMTP (email service)
- PostgreSQL (database)

**Frontend:**
- React 19+ with TypeScript
- React Router (routing)
- Axios (API calls)
- TailwindCSS (styling)
- React Hook Form (form management, optional)

---

## Environment Variables

**Backend (.env):**
```bash
# Database
DATABASE_URL=postgresql+psycopg://kampus_user:kampus_pass_dev@localhost:5432/kampus_plus_dev

# Email (Mailhog for local)
SMTP_HOST=localhost
SMTP_PORT=1025

# Email (Gmail for production)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=kampusplus.noreply@gmail.com
# SMTP_PASSWORD=<Google App Password>

# JWT
JWT_SECRET_KEY=your-super-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7  # Default (unchecked "Beni Hatırla")
JWT_REFRESH_TOKEN_REMEMBER_ME_DAYS=30  # "Beni Hatırla" checked

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_LOGIN_PER_IP=5
RATE_LIMIT_FORGOT_PASSWORD_PER_EMAIL=3
RATE_LIMIT_RESET_PASSWORD_PER_IP=5
```

**Frontend (.env.local):**
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Notes for Developers

1. **JWT Tokens:** Access token in response body, refresh token in httpOnly cookie. NEVER store refresh token in localStorage (XSS risk).

2. **"Beni Hatırla":** Default refresh token 7 gün. "Beni Hatırla" checked → 30 gün.

3. **Email Enumeration Prevention:** Forgot password endpoint always returns same message (security best practice).

4. **Password Reset Token:** JWT token, 1 saat expiry, single use (kullanıcı şifre değiştirince tüm refresh tokenları revoke et).

5. **Rate Limiting:** In-memory cache (masrafsız). Production'da Redis kullanılabilir.

6. **Error Messages:** User-friendly, never expose technical details.

7. **Dashboard Placeholder:** If dashboard doesn't exist yet, create placeholder: "Dashboard - Coming Soon" page.

---

**Created:** 2025-12-30  
**Status:** ✅ Ready for Development  
**Next:** Assign tasks to backend and frontend developers, start parallel development

