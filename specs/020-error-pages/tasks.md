# Tasks: Error Pages Implementation

**Module:** 020-error-pages  
**Status:** Ready for Development  
**Estimated Time:** 1 gün (Frontend 6 saat + Integration 2 saat)

---

## Task Breakdown

### Phase 1: Frontend Implementation (6 saat)

#### Task 1.1: Error Layout Component

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Ortak error page layout component'ini oluştur.

**Dosya:** `frontend/src/components/error/ErrorLayout.tsx`

**Props:**
```typescript
interface ErrorLayoutProps {
  icon: string | React.ReactNode;
  title: string;
  message: string;
  children: React.ReactNode;
}
```

**Özellikler:**
- [ ] Centered container
- [ ] Icon/emoji display
- [ ] Title ve message
- [ ] Children (actions, links)
- [ ] Responsive design

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] Props interface tanımla
- [ ] Layout structure
- [ ] Styling (centered, spacing)
- [ ] Test: Layout görünüyor

---

#### Task 1.2: Error 404 Page

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
404 Not Found sayfasını oluştur.

**Dosya:** `frontend/src/pages/error/Error404Page.tsx`

**UI:**
```
😕
Sayfa Bulunamadı
Aradığınız sayfa mevcut değil veya taşınmış olabilir.

[Ana Sayfaya Dön] [Geri Git]

Hızlı Erişim:
• Forum • Pazar • Kariyer • AI Asistan
```

**Özellikler:**
- [ ] 😕 İkonu (veya animasyonlu 404)
- [ ] "Sayfa Bulunamadı" başlığı
- [ ] Açıklayıcı mesaj
- [ ] "Ana Sayfaya Dön" butonu → `/`
- [ ] "Geri Git" butonu → `window.history.back()`
- [ ] Hızlı erişim linkleri

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] ErrorLayout kullan
- [ ] Navigation butonları
- [ ] Hızlı erişim linkleri
- [ ] Styling (404 teması)
- [ ] Test: 404 sayfası çalışıyor

---

#### Task 1.3: Error 500 Page

**Süre:** 1.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
500 Internal Server Error sayfasını oluştur.

**Dosya:** `frontend/src/pages/error/Error500Page.tsx`

**UI:**
```
⚠️
Bir Hata Oluştu
Üzgünüz, bir şeyler ters gitti. Lütfen birkaç dakika sonra tekrar deneyin.

[Sayfayı Yenile] [Ana Sayfaya Dön]

Sorun devam ederse:
[İletişime Geç]
```

**Özellikler:**
- [ ] ⚠️ İkonu (veya hata animasyonu)
- [ ] "Bir Hata Oluştu" başlığı
- [ ] Açıklayıcı mesaj
- [ ] "Sayfayı Yenile" butonu → `window.location.reload()`
- [ ] "Ana Sayfaya Dön" butonu → `/`
- [ ] "İletişime Geç" linki → Settings contact form

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] ErrorLayout kullan
- [ ] Navigation butonları
- [ ] Reload functionality
- [ ] İletişim linki
- [ ] Styling (500 teması - kırmızı/turuncu)
- [ ] Test: 500 sayfası çalışıyor

---

#### Task 1.4: Error 403 Page

**Süre:** 1.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
403 Forbidden sayfasını oluştur.

**Dosya:** `frontend/src/pages/error/Error403Page.tsx`

**UI:**
```
🔒
Erişim Reddedildi
Bu sayfaya erişim yetkiniz yok.

[Ana Sayfaya Dön] [Giriş Yap]

Eğer bu sayfaya erişim hakkınız olduğunu düşünüyorsanız:
[İletişime Geç]
```

**Özellikler:**
- [ ] 🔒 İkonu
- [ ] "Erişim Reddedildi" başlığı
- [ ] Açıklayıcı mesaj
- [ ] "Ana Sayfaya Dön" butonu → `/`
- [ ] "Giriş Yap" butonu → `/login` (conditional, logged out ise)
- [ ] "İletişime Geç" linki

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] ErrorLayout kullan
- [ ] Navigation butonları
- [ ] Conditional "Giriş Yap" butonu (auth check)
- [ ] İletişim linki
- [ ] Styling (403 teması - sarı/gri)
- [ ] Test: 403 sayfası çalışıyor

---

#### Task 1.5: Error Icon Component (Opsiyonel)

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Animasyonlu error icon component'i (opsiyonel, ama UX için güzel).

**Dosya:** `frontend/src/components/error/ErrorIcon.tsx`

**Animasyonlar:**
- 404: Bounce veya fade-in
- 500: Shake veya pulse
- 403: Lock animation

**Adımlar:**
- [ ] Icon component oluştur
- [ ] Animasyonlar ekle (CSS veya Framer Motion)
- [ ] Props (type: 404 | 500 | 403)
- [ ] Styling
- [ ] Test: Animasyonlar çalışıyor

---

### Phase 2: Integration (2 saat)

#### Task 2.1: React Router 404 Route

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
React Router'da catch-all route ekle (404 için).

**Dosya:** `frontend/src/App.tsx` (güncelle)

**Route:**
```tsx
// Catch-all route (en sonda)
<Route path="*" element={<Error404Page />} />
```

**Adımlar:**
- [ ] Catch-all route ekle
- [ ] Import Error404Page
- [ ] Route sırasını kontrol et (catch-all en sonda olmalı)
- [ ] Test: Geçersiz URL → 404 sayfası gösteriliyor

---

#### Task 2.2: Error Boundary Setup

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
React Error Boundary ekle (500 hataları için).

**Dosya:** `frontend/src/components/error/ErrorBoundary.tsx` (yeni)

**Code:**
```tsx
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
```

**Usage:**
```tsx
<ErrorBoundary fallback={<Error500Page />}>
  <App />
</ErrorBoundary>
```

**Adımlar:**
- [ ] ErrorBoundary component oluştur
- [ ] Error catching logic
- [ ] App.tsx'te wrap et
- [ ] Test: Error oluşunca 500 sayfası gösteriliyor

---

#### Task 2.3: Protected Route 403 Integration

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Protected route'larda 403 hatası göster.

**Dosya:** `frontend/src/components/auth/ProtectedRoute.tsx` (güncelle)

**Logic:**
```tsx
if (!isAuthenticated) {
  return <Navigate to="/login" />;
}

if (requireRole && user.role !== requireRole) {
  return <Error403Page />;
}

return <Outlet />;
```

**Adımlar:**
- [ ] ProtectedRoute component'ini bul
- [ ] Role check logic ekle
- [ ] 403 durumunda Error403Page göster
- [ ] Test: Yetkisiz erişim → 403 sayfası gösteriliyor

---

### Phase 3: Backend Integration (Opsiyonel)

#### Task 3.1: Backend Error Response Handling

**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Backend'den gelen error response'ları frontend'de handle et.

**Frontend:**
```tsx
// API client'da
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      navigate('/404');
    } else if (error.response?.status === 500) {
      navigate('/500');
    } else if (error.response?.status === 403) {
      navigate('/403');
    }
    return Promise.reject(error);
  }
);
```

**Adımlar:**
- [ ] Axios interceptor ekle
- [ ] Error status code kontrolü
- [ ] Navigation logic
- [ ] Test: Backend error → Error page gösteriliyor

---

### Phase 4: Polish & Testing (1 saat)

#### Task 4.1: Animations & Polish

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Animasyonlar ve UX iyileştirmeleri.

**İyileştirmeler:**
- [ ] Icon animasyonları (bounce, shake, pulse)
- [ ] Fade-in effects
- [ ] Button hover states
- [ ] Smooth transitions
- [ ] Loading states (opsiyonel)

**Adımlar:**
- [ ] CSS animations ekle
- [ ] Transitions ekle
- [ ] Hover effects
- [ ] Test: Animasyonlar smooth

---

#### Task 4.2: Responsive Design

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Mobile responsive design.

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Adımlar:**
- [ ] Mobile responsive test
- [ ] Tablet responsive test
- [ ] Desktop responsive test
- [ ] Font size adjustments
- [ ] Spacing adjustments
- [ ] Test: Tüm cihazlarda çalışıyor

---

## ✅ Checklist

### Frontend
- [ ] ErrorLayout component oluşturuldu
- [ ] Error404Page component
- [ ] Error500Page component
- [ ] Error403Page component
- [ ] ErrorIcon component (opsiyonel)
- [ ] Animations (opsiyonel)

### Integration
- [ ] React Router 404 route
- [ ] Error Boundary setup
- [ ] Protected Route 403 integration
- [ ] Backend error handling (opsiyonel)

### Polish
- [ ] Animations
- [ ] Responsive design
- [ ] UX iyileştirmeleri

---

## 📝 Notlar

1. **404 Route:** Catch-all route en sonda olmalı (diğer route'lardan sonra).

2. **Error Boundary:** React 16+ Error Boundary kullanılır. Functional component'lerde çalışmaz, class component gerekir.

3. **403 Page:** "Giriş Yap" butonu sadece logged out kullanıcılar için gösterilmeli.

4. **Animations:** Opsiyonel ama UX için güzel. CSS animations veya Framer Motion kullanılabilir.

5. **Error Tracking:** MVP sonrası Sentry gibi error tracking servisi eklenebilir.

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Tasks Tamamlandı - Ready for Development

