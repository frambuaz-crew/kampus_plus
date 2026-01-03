# Tasks: Landing Page Implementation

**Module:** 001-landing-page  
**Status:** Ready for Development  
**Estimated Time:** 1-2 days (1 developer)

---

## Task Breakdown

### Phase 1: Setup & Structure (2-3 hours)

**T001** - Create landing page route and component structure
- [ ] Create `frontend/src/pages/LandingPage.tsx`
- [ ] Add route `/` in `App.tsx` router
- [ ] Set up basic page layout (Header, Hero, Footer)
- [ ] Test: Page renders at root URL

**T002** - Create reusable Header component
- [ ] Create `frontend/src/components/layout/Header.tsx`
- [ ] Implement sticky/fixed positioning
- [ ] Add KAMPÜS+ logo (placeholder or SVG)
- [ ] Add Login and Register buttons
- [ ] Test: Header stays visible on scroll

**T003** - Create Footer component
- [ ] Create `frontend/src/components/layout/Footer.tsx`
- [ ] Add copyright text: "© 2025 KAMPÜS+ - Tüm hakları saklıdır"
- [ ] Style footer (center aligned, proper spacing)
- [ ] Test: Footer appears at bottom of page

---

### Phase 2: Hero Section Implementation (3-4 hours)

**T004** - Build Hero section layout
- [ ] Create `frontend/src/components/landing/HeroSection.tsx`
- [ ] Add main heading: "KAMPÜS+ ile Öğrenme Deneyiminizi Dönüştürün"
- [ ] Add subtitle: "7/24 aktif yapay zeka asistanı ile tüm sorularınıza hızlı cevap"
- [ ] Add CTA button: "Hemen Kayıt Ol"
- [ ] Center-align all content
- [ ] Test: Hero section displays correctly

**T005** - Implement button navigation
- [ ] Wire "Hemen Kayıt Ol" button to `/register` route
- [ ] Wire "Login" button (Header) to `/login` route
- [ ] Wire "Register" button (Header) to `/register` route
- [ ] Test: All buttons navigate correctly (even if target pages don't exist yet)

**T006** - Add gradient background animation
- [ ] Create CSS animation for gradient shift
- [ ] Define color palette (e.g., blue-purple-pink gradient)
- [ ] Apply `background-size: 600% 600%` for smooth effect
- [ ] Set animation duration: ~15 seconds
- [ ] Test: Animation runs smoothly at 60 FPS, no janking

---

### Phase 3: Responsive Design (2-3 hours)

**T007** - Implement mobile responsiveness
- [ ] Add breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- [ ] Adjust header layout for mobile (smaller logo, icon buttons if needed)
- [ ] Adjust hero font sizes for mobile
- [ ] Test: Page looks good on 375px, 768px, 1920px widths

**T008** - Optimize layout and spacing
- [ ] Set max-width container (1200px)
- [ ] Add proper padding/margins for all screen sizes
- [ ] Ensure hero section takes appropriate height (70vh or full viewport)
- [ ] Test: Spacing looks consistent across devices

---

### Phase 4: Styling & Polish (2-3 hours)

**T009** - Apply typography and colors
- [ ] Set font family (e.g., Inter or system-ui)
- [ ] Apply heading font: 48-64px, bold
- [ ] Apply subtitle font: 18-24px, normal
- [ ] Apply footer font: 14px, gray
- [ ] Define color variables in Tailwind config or CSS
- [ ] Test: Typography is readable and visually appealing

**T010** - Style buttons
- [ ] Create primary button style (CTA: large, colorful)
- [ ] Create secondary button style (Login/Register: subtle)
- [ ] Add hover effects (scale, color change, etc.)
- [ ] Ensure accessibility (focus states, contrast)
- [ ] Test: Buttons are interactive and accessible

**T011** - Add animations and transitions
- [ ] Add fade-in animation for hero content on page load
- [ ] Add smooth transitions for button hovers
- [ ] Ensure gradient animation is performant
- [ ] Test: All animations run at 60 FPS

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

