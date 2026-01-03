# Feature Specification: Landing Page (Ana Sayfa)

**Module**: 001-landing-page  
**Created**: 2025-12-30  
**Status**: Draft  
**Priority**: P1 - Critical

---

## Overview

KAMPÜS+ platformunun ana giriş sayfası. Kimlik doğrulaması gerektirmeyen, herkese açık bir sayfa. Kullanıcıları platforma çekmek ve kayıt olmaya teşvik etmek amacıyla tasarlanmıştır.

**Erişim:** Public (Herkes görebilir)  
**URL:** `/` (Ana sayfa)

---

## User Story

**"Bir kullanıcı olarak, KAMPÜS+ platformunu keşfetmek ve platforma kayıt olmak için ana sayfayı görmek istiyorum."**

**Kabul Kriterleri:**
1. ✅ Kullanıcı siteye girdiğinde ana sayfa yüklenir
2. ✅ Header'da logo ve giriş/kayıt butonları görünür
3. ✅ Hero section'da başlık, açıklama ve CTA butonu bulunur
4. ✅ Arka planda gradient animasyonu çalışır
5. ✅ Footer'da copyright bilgisi yer alır
6. ✅ "Hemen Kayıt Ol" butonu `/register` sayfasına yönlendirir
7. ✅ "Login" butonu `/login` sayfasına yönlendirir

---

## Page Structure

### 1. Header (Sabit - Sticky)

**Konum:** Sayfa en üstünde, scroll edince yukarıda kalır

**İçerik:**
- **Sol:** KAMPÜS+ logosu (tıklanabilir, ana sayfaya döner)
- **Sağ Üst:** İki buton
  - `Login` butonu → `/login` sayfasına yönlendirir
  - `Register` butonu → `/register` sayfasına yönlendirir

**Teknik Detaylar:**
- Position: `sticky` veya `fixed`
- Z-index: Yüksek (diğer elementlerin üstünde)
- Arka plan: Hafif transparan veya solid beyaz/koyu tema
- Logo boyutu: ~40-50px yükseklik
- Butonlar: Primary (Register) ve Secondary (Login) stil

---

### 2. Hero Section

**Konum:** Header'ın hemen altında, sayfa ortasında

**İçerik:**

**Ana Başlık:**
```
"KAMPÜS+ ile Öğrenme Deneyiminizi Dönüştürün"
```

**Alt Başlık:**
```
"7/24 aktif yapay zeka asistanı ile tüm sorularınıza hızlı cevap"
```

**CTA Butonu:**
```
"Hemen Kayıt Ol"
```
- Tıklandığında `/register` sayfasına yönlendirir
- Primary buton stili (büyük, dikkat çekici)

**Animasyon:**
- Arka planda **gradient animasyonu** (renkli dalga efekti)
- Smooth, sürekli hareket eden gradient
- Renk paleti: Platformun ana renkleri (örn: mavi-mor-pembe tonları)

**Teknik Detaylar:**
- Layout: Merkezi hizalama (center aligned)
- Responsive: Mobilde tek sütun, desktop'ta merkezi
- Başlık font: Büyük, bold (örn: 48-64px)
- Alt başlık font: Orta, normal (örn: 18-24px)
- Gradient animasyon: CSS animation veya canvas-based

---

### 3. Footer

**Konum:** Sayfa en altında

**İçerik:**
```
© 2025 KAMPÜS+ - Tüm hakları saklıdır
```

**Teknik Detaylar:**
- Text align: Center
- Font: Küçük, normal (örn: 14px)
- Renk: Gri veya muted
- Padding: Yeterli boşluk (top/bottom 20-30px)

---

## Technical Requirements

### Functional Requirements

**FR-001:** Sayfa kimlik doğrulaması gerektirmez (public access)  
**FR-002:** Header scroll ederken sabit kalır (sticky/fixed)  
**FR-003:** Logo tıklandığında ana sayfaya yönlendirir  
**FR-004:** Login butonu `/login` sayfasına yönlendirir  
**FR-005:** Register butonu `/register` sayfasına yönlendirir  
**FR-006:** "Hemen Kayıt Ol" CTA butonu `/register` sayfasına yönlendirir  
**FR-007:** Gradient animasyonu sayfa yüklendiğinde otomatik başlar  
**FR-008:** Sayfa responsive olmalı (mobile, tablet, desktop)

### Non-Functional Requirements

**NFR-001:** Sayfa yükleme süresi < 2 saniye  
**NFR-002:** Animasyon 60 FPS'de smooth çalışmalı  
**NFR-003:** Lighthouse Performance Score ≥ 90  
**NFR-004:** Tüm tarayıcılarda (Chrome, Firefox, Safari, Edge) düzgün görünmeli

---

## Design Notes

### Color Palette (Örnek - Tasarım aşamasında değiştirilebilir)

**Primary Colors:**
- Ana: `#6366F1` (Indigo)
- Accent: `#8B5CF6` (Purple)
- Gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

**Text Colors:**
- Başlık: `#1F2937` (Dark Gray)
- Alt başlık: `#6B7280` (Medium Gray)
- Footer: `#9CA3AF` (Light Gray)

### Typography (Örnek)

- **Font Family:** Inter, system-ui, sans-serif
- **Başlık:** 48-64px, font-weight: 700
- **Alt başlık:** 18-24px, font-weight: 400
- **Buton:** 16-18px, font-weight: 600

### Spacing

- Header height: 64-80px
- Hero section: Full viewport height veya 70vh
- Footer height: 60-80px
- Container max-width: 1200px

### Animation Details

**Gradient Animasyon:**
```css
background: linear-gradient(270deg, color1, color2, color3);
background-size: 600% 600%;
animation: gradientShift 15s ease infinite;

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

---

## Dependencies

**Blocker:** Yok (İlk özellik, bağımlılık yok)

**Required Pages:** (Henüz implement edilmemiş, sonraki özellikler)
- `/login` - Login sayfası
- `/register` - Register sayfası

**Note:** Butonlar şu aşamada placeholder olarak kalabilir veya basit placeholder sayfalarına yönlendirebilir.

---

## Success Criteria

**SC-001:** Kullanıcı ana sayfayı ziyaret ettiğinde header, hero ve footer görünür  
**SC-002:** Header scroll ederken sabit kalır  
**SC-003:** Gradient animasyonu smooth çalışır (jank yok)  
**SC-004:** Butonlar doğru sayfalara yönlendirir  
**SC-005:** Sayfa mobilde ve desktop'ta düzgün görünür  
**SC-006:** Sayfa 2 saniyeden hızlı yüklenir

---

## Out of Scope (Bu Özellikte Yok)

❌ Features section (özellik kartları)  
❌ How it works section  
❌ Social proof / istatistikler  
❌ Duyurular / blog  
❌ Newsletter kayıt formu  
❌ Footer linkleri (Hakkında, İletişim, vb.)  
❌ Sosyal medya ikonları

**Not:** Bunlar ilerleyen özellikler olarak eklenebilir.

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-30 | 1.0 | Initial specification | AI Agent |

---

**Status:** ✅ Ready for Implementation  
**Next Step:** Create tasks breakdown in `tasks.md`

