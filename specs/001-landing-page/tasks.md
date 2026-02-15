# Tasks: Landing Page Implementation

**Module:** 001-landing-page  
**Status:** Ready for Development  
**Estimated Time:** 1-2 days (1 developer)

---

## Task Breakdown

### Phase 1: Setup & Structure (2-3 hours)

**T001** - Create landing page route and component structure
- [x] Create `frontend/src/pages/LandingPage.tsx`
- [x] Add route `/` in `App.tsx` router
- [x] Set up basic page layout (Header, Hero, Footer)
- [x] Test: Page renders at root URL

**T002** - Create reusable Header component
- [x] Create `frontend/src/components/layout/Header.tsx`
- [x] Implement sticky/fixed positioning
- [x] Add KAMPÜS+ logo (placeholder or SVG)
- [x] Add Login and Register buttons
- [x] Test: Header stays visible on scroll

**T003** - Create Footer component
- [x] Create `frontend/src/components/layout/Footer.tsx`
- [x] Add copyright text: "© 2025 KAMPÜS+ - Tüm hakları saklıdır"
- [x] Style footer (center aligned, proper spacing)
- [x] Test: Footer appears at bottom of page

---

### Phase 2: Hero Section Implementation (3-4 hours)

**T004** - Build Hero section layout
- [x] Create `frontend/src/components/landing/HeroSection.tsx`
- [x] Add main heading: "KAMPÜS+ ile Öğrenme Deneyiminizi Dönüştürün"
- [x] Add subtitle: "7/24 aktif yapay zeka asistanı ile tüm sorularınıza hızlı cevap"
- [x] Add CTA button: "Hemen Kayıt Ol"
- [x] Center-align all content
- [x] Test: Hero section displays correctly

**T005** - Implement button navigation
- [x] Wire "Hemen Kayıt Ol" button to `/register` route
- [x] Wire "Login" button (Header) to `/login` route
- [x] Wire "Register" button (Header) to `/register` route
- [x] Test: All buttons navigate correctly (even if target pages don't exist yet)

**T006** - Add gradient background animation
- [x] Create CSS animation for gradient shift
- [x] Define color palette (e.g., blue-purple-pink gradient)
- [x] Apply `background-size: 600% 600%` for smooth effect
- [x] Set animation duration: ~15 seconds
- [x] Test: Animation runs smoothly at 60 FPS, no janking

---

### Phase 3: Responsive Design (2-3 hours)

**T007** - Implement mobile responsiveness
- [x] Add breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- [x] Adjust header layout for mobile (smaller logo, icon buttons if needed)
- [x] Adjust hero font sizes for mobile
- [x] Test: Page looks good on 375px, 768px, 1920px widths

**T008** - Optimize layout and spacing
- [x] Set max-width container (1200px)
- [x] Add proper padding/margins for all screen sizes
- [x] Ensure hero section takes appropriate height (70vh or full viewport)
- [x] Test: Spacing looks consistent across devices

---

### Phase 4: Styling & Polish (2-3 hours)

**T009** - Apply typography and colors
- [x] Set font family (e.g., Inter or system-ui)
- [x] Apply heading font: 48-64px, bold
- [x] Apply subtitle font: 18-24px, normal
- [x] Apply footer font: 14px, gray
- [x] Define color variables in Tailwind config or CSS
- [x] Test: Typography is readable and visually appealing

**T010** - Style buttons
- [x] Create primary button style (CTA: large, colorful)
- [x] Create secondary button style (Login/Register: subtle)
- [x] Add hover effects (scale, color change, etc.)
- [x] Ensure accessibility (focus states, contrast)
- [x] Test: Buttons are interactive and accessible

**T011** - Add animations and transitions
- [x] Add fade-in animation for hero content on page load
- [x] Add smooth transitions for button hovers
- [x] Ensure gradient animation is performant
- [x] Test: All animations run at 60 FPS

---

### Phase 5: Testing & Optimization (2-3 hours)

**T012** - Performance testing
- [ ] Run Lighthouse audit (target: Performance ≥ 90)
- [ ] Optimize images (if any)
- [ ] Minimize CSS/JS bundle size
- [ ] Test: Page loads in < 2 seconds on 3G

**T013** - Cross-browser testing
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on Edge (latest)
- [ ] Fix any browser-specific issues

**T014** - Accessibility audit
- [ ] Check keyboard navigation (Tab through buttons)
- [ ] Add ARIA labels where needed
- [ ] Ensure color contrast meets WCAG AA standards
- [ ] Test with screen reader (optional but recommended)
- [ ] Test: Page is accessible to keyboard and screen reader users

**T015** - Final QA and bug fixes
- [ ] Test all acceptance criteria from `spec.md`
- [ ] Fix any visual bugs
- [ ] Ensure no console errors
- [ ] Test: All success criteria met

---

## Acceptance Testing Checklist

From `spec.md`:

- [ ] ✅ Kullanıcı siteye girdiğinde ana sayfa yüklenir
- [ ] ✅ Header'da logo ve giriş/kayıt butonları görünür
- [ ] ✅ Hero section'da başlık, açıklama ve CTA butonu bulunur
- [ ] ✅ Arka planda gradient animasyonu çalışır
- [ ] ✅ Footer'da copyright bilgisi yer alır
- [ ] ✅ "Hemen Kayıt Ol" butonu `/register` sayfasına yönlendirir
- [ ] ✅ "Login" butonu `/login` sayfasına yönlendirir
- [x] ✅ Kullanıcı siteye girdiğinde ana sayfa yüklenir
- [x] ✅ Header'da logo ve giriş/kayıt butonları görünür
- [x] ✅ Hero section'da başlık, açıklama ve CTA butonu bulunur
- [x] ✅ Arka planda gradient animasyonu çalışır
- [x] ✅ Footer'da copyright bilgisi yer alır
- [x] ✅ "Hemen Kayıt Ol" butonu `/register` sayfasına yönlendirir
- [x] ✅ "Login" butonu `/login` sayfasına yönlendirir

---

## Success Criteria Testing

- [ ] **SC-001:** Header, hero ve footer görünür
- [ ] **SC-002:** Header scroll ederken sabit kalır
- [ ] **SC-003:** Gradient animasyonu smooth (60 FPS)
- [ ] **SC-004:** Butonlar doğru sayfalara yönlendirir
- [ ] **SC-005:** Responsive (mobile + desktop)
- [ ] **SC-006:** Sayfa < 2 saniye yüklenir

---

## Dependencies & Blockers

**Blockers:** None (İlk özellik)

**Future Dependencies:**
- Login sayfası (`/login`) - Sonraki özellik
- Register sayfası (`/register`) - Sonraki özellik

**Note:** Butonlar şimdilik 404'e veya placeholder sayfaya gidebilir. Bu normal.

---

## Estimated Effort

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 1 | T001-T003 | 2-3 hours |
| Phase 2 | T004-T006 | 3-4 hours |
| Phase 3 | T007-T008 | 2-3 hours |
| Phase 4 | T009-T011 | 2-3 hours |
| Phase 5 | T012-T015 | 2-3 hours |
| **Total** | **15 tasks** | **11-16 hours (1-2 days)** |

**Developer:** Frontend (React + TailwindCSS)  
**Priority:** P1 - Critical (İlk sayfa, blocker için sonraki özellikler)

---

## Tech Stack

**Frontend:**
- React 19.2+ with TypeScript
- React Router (routing)
- TailwindCSS (styling)
- Vite (build tool)

**No Backend Required:** Bu sayfa tamamen frontend, API call yok.

---

## Notes for Developer

1. **Placeholder Pages:** Login ve Register sayfaları henüz yok. Butonlar şimdilik 404'e gidebilir veya basit placeholder sayfalar oluşturabilirsiniz.

2. **Logo:** Eğer KAMPÜS+ logosu SVG olarak yoksa, şimdilik text-based logo kullanın: "KAMPÜS+" yazısı.

3. **Gradient Animation:** Performance önemli. Eğer CSS animasyonu yavaşsa, daha basit bir efekt kullanın.

4. **Responsive:** Mobile-first yaklaşım kullanın. Önce mobil tasarlayın, sonra desktop'a genişletin.

5. **Accessibility:** Tab tuşuyla butonlar arasında gezinebilmeli.

---

**Created:** 2025-12-30  
**Status:** ✅ Ready for Development  
**Next:** Assign to frontend developer

