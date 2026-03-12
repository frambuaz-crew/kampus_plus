# Design Notes: Landing Page

**Module:** 001-landing-page  
**Last Updated:** 2025-12-30

---

## Design Philosophy

Landing page tasarımında **minimal, temiz ve dikkat çekici** bir yaklaşım benimsenmiştir. Kullanıcı karmaşık içeriklerle bombardıman edilmek yerine, platformun ana değer önerisini (AI destekli öğrenme asistanı) hızlıca kavramalı ve kayıt olmaya teşvik edilmelidir.

---

## Visual Hierarchy

```
1. Header (En üst - her zaman görünür)
   └─> Logo + CTA butonları (Login, Register)

2. Hero Section (Ana odak noktası)
   ├─> Ana başlık (En büyük, bold)
   ├─> Alt başlık (Orta, açıklayıcı)
   ├─> CTA Butonu (Büyük, dikkat çekici)
   └─> Gradient animasyon (Arka plan, pasif)

3. Footer (En alt - bilgi amaçlı)
   └─> Copyright (Küçük, gri)
```

---

## Color Palette

### Option 1: Blue-Purple Gradient (Önerilen)

**Primary:**
- `#667eea` (Soft Blue)
- `#764ba2` (Deep Purple)

**Gradient:**
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**Text:**
- Heading: `#1F2937` (Almost Black)
- Subtitle: `#4B5563` (Dark Gray)
- Footer: `#9CA3AF` (Light Gray)

**Buttons:**
- Primary (CTA): `#6366F1` (Indigo) with white text
- Secondary (Login): White background, `#6366F1` border

---

### Option 2: Vibrant Multi-Color (Alternatif)

**Gradient Colors:**
- `#f093fb` (Pink)
- `#4facfe` (Cyan Blue)
- `#00f2fe` (Bright Cyan)

**Gradient:**
```css
background: linear-gradient(270deg, #f093fb, #4facfe, #00f2fe);
```

**Not:** Bu daha canlı ama dikkat dağıtıcı olabilir. Option 1 daha profesyonel.

---

## Typography

### Font Family

**Primary:** Inter (Google Fonts veya system fallback)

```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Fallback:** System-ui (platform-native font)

---

### Font Sizes & Weights

**Heading:**
- Desktop: `64px` / `4rem`
- Tablet: `48px` / `3rem`
- Mobile: `36px` / `2.25rem`
- Weight: `700` (Bold)

**Subtitle:**
- Desktop: `24px` / `1.5rem`
- Tablet: `20px` / `1.25rem`
- Mobile: `18px` / `1.125rem`
- Weight: `400` (Normal)

**CTA Button:**
- All devices: `18px` / `1.125rem`
- Weight: `600` (Semi-bold)

**Footer:**
- All devices: `14px` / `0.875rem`
- Weight: `400` (Normal)

---

## Layout & Spacing

### Container

```css
max-width: 1200px;
margin: 0 auto;
padding: 0 1.5rem; /* Mobile: 24px left/right */
```

### Header

```css
height: 72px;
position: sticky;
top: 0;
z-index: 50;
padding: 0 1.5rem;
background: rgba(255, 255, 255, 0.95); /* Slight transparency */
backdrop-filter: blur(10px); /* Glassmorphism effect */
```

### Hero Section

```css
min-height: calc(100vh - 72px); /* Full viewport minus header */
display: flex;
align-items: center;
justify-content: center;
padding: 4rem 1.5rem; /* Top/bottom: 64px, Left/right: 24px */
```

### Footer

```css
height: 80px;
padding: 2rem 1.5rem;
text-align: center;
background: #F9FAFB; /* Light gray background */
```

---

## Gradient Animation

### CSS Implementation

```css
.hero-background {
  background: linear-gradient(270deg, #667eea, #764ba2, #f093fb);
  background-size: 600% 600%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
```

### Performance Notes

- **GPU Acceleration:** Use `will-change: transform` or `transform: translateZ(0)` to force GPU rendering
- **FPS Target:** 60 FPS (16.67ms per frame)
- **Fallback:** If animation causes jank, switch to static gradient

---

## Button Styles

### Primary Button (CTA: "Hemen Kayıt Ol")

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
color: white;
padding: 1rem 2.5rem; /* 16px top/bottom, 40px left/right */
border-radius: 0.5rem; /* 8px */
font-size: 1.125rem; /* 18px */
font-weight: 600;
box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
transition: transform 0.2s, box-shadow 0.2s;
```

**Hover:**
```css
transform: translateY(-2px);
box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
```

**Active:**
```css
transform: translateY(0);
```

---

### Secondary Buttons (Header: "Login", "Register")

```css
background: white;
color: #6366F1;
border: 2px solid #6366F1;
padding: 0.5rem 1.5rem; /* 8px top/bottom, 24px left/right */
border-radius: 0.375rem; /* 6px */
font-size: 1rem; /* 16px */
font-weight: 600;
transition: background 0.2s, color 0.2s;
```

**Hover:**
```css
background: #6366F1;
color: white;
```

---

## Responsive Breakpoints

### Mobile (< 640px)

- Header: Logo centered, buttons stacked or icon-only
- Hero: Heading `36px`, subtitle `18px`
- CTA button: Full width (stretch to container)
- Padding: `1rem` (16px)

### Tablet (640px - 1024px)

- Header: Logo left, buttons right (inline)
- Hero: Heading `48px`, subtitle `20px`
- CTA button: Auto width (fit content)
- Padding: `1.5rem` (24px)

### Desktop (> 1024px)

- Header: Logo left, buttons right with spacing
- Hero: Heading `64px`, subtitle `24px`
- CTA button: Auto width with generous padding
- Padding: `2rem` (32px)

---

## Accessibility

### Keyboard Navigation

- All buttons must be focusable via Tab key
- Focus state: `outline: 2px solid #6366F1; outline-offset: 2px;`
- Enter key triggers button click

### Color Contrast

- Heading on white: `#1F2937` → Contrast ratio 14:1 ✅
- Subtitle on white: `#4B5563` → Contrast ratio 8:1 ✅
- Footer on `#F9FAFB`: `#9CA3AF` → Contrast ratio 4.5:1 ✅
- Button text on gradient: White on `#6366F1` → Contrast ratio 4.7:1 ✅

All meet WCAG AA standards (4.5:1 minimum).

### ARIA Labels

```html
<header aria-label="Site header">
  <nav aria-label="Main navigation">
    <button aria-label="Login to your account">Login</button>
    <button aria-label="Create new account">Register</button>
  </nav>
</header>

<main aria-label="Landing page content">
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">KAMPÜS+ ile...</h1>
    <button aria-label="Sign up now">Hemen Kayıt Ol</button>
  </section>
</main>

<footer aria-label="Site footer">
  <p>© 2025 KAMPÜS+</p>
</footer>
```

---

## Animation Details

### Page Load Animation (Önerilen)

Hero içeriğinin fade-in efekti:

```css
.hero-content {
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Timing:**
- Heading: `animation-delay: 0.1s;`
- Subtitle: `animation-delay: 0.3s;`
- CTA Button: `animation-delay: 0.5s;`

---

## Dark Mode (Opsiyonel - Gelecek)

Şu an scope dışı, ama gelecekte eklenebilir:

**Dark Theme Colors:**
- Background: `#111827` (Dark Gray)
- Heading: `#F9FAFB` (Almost White)
- Subtitle: `#D1D5DB` (Light Gray)
- Gradient: Aynı (zaten koyu temaya uygun)

---

## Figma / Design Tool Reference

**Not:** Henüz Figma design yok. Bu doküman tasarımcılara referans olarak kullanılabilir.

**Öneri:** Tasarımcı bu notları baz alarak Figma'da mockup oluşturabilir.

---

## Assets Needed

### Logo

- [ ] KAMPÜS+ logo (SVG format)
- [ ] Dimensions: ~40-50px height, auto width
- [ ] Color variants: Default (color) + White (for dark backgrounds)

**Placeholder:** Eğer logo hazır değilse, text-based logo kullanın: "KAMPÜS+" yazısı, Inter Bold font.

### Images

- [ ] Hero background image (opsiyonel - gradient yeterli)
- [ ] Favicon (16x16, 32x32, 192x192, 512x512)

---

## Inspiration & References

**Similar landing pages:**
- Notion.so - Minimal, clean hero
- Linear.app - Gradient backgrounds, smooth animations
- Vercel.com - Simple typography, strong CTA

**Design principles:**
- Keep it simple (KIS)
- Clear value proposition
- Strong call-to-action
- Fast loading time

---

## Future Enhancements (Not in Scope Now)

- [ ] Features section (kartlar)
- [ ] Testimonials / social proof
- [ ] Video demo
- [ ] Animated illustrations
- [ ] Parallax scrolling effects

---

**Status:** ✅ Design spec ready  
**Next:** Hand off to designer for mockups (optional) or directly to developer for implementation

