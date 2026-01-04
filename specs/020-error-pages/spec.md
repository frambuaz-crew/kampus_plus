# Feature Specification: Error Pages (404, 500, 403)

**Module**: 020-error-pages  
**Created**: 2 Ocak 2026  
**Status**: Ready for Development  
**Priority**: P3 - Medium (UX İyileştirmesi)

---

## Overview

Kullanıcı dostu hata sayfaları. 404 (Not Found), 500 (Internal Server Error) ve 403 (Forbidden) hataları için özel sayfalar.

**Erişim:** Public (Herkes görebilir)  
**URLs:** 
- `/404` (veya otomatik 404 route)
- `/500` (veya otomatik 500 route)
- `/403` (veya otomatik 403 route)

---

## User Story

**"Bir hata ile karşılaşan bir kullanıcı olarak, ne olduğunu anlamak ve ne yapabileceğimi görmek istiyorum."**

**Kabul Kriterleri:**
1. ✅ 404 hatası için kullanıcı dostu sayfa gösterilir
2. ✅ 500 hatası için kullanıcı dostu sayfa gösterilir
3. ✅ 403 hatası için kullanıcı dostu sayfa gösterilir
4. ✅ Her sayfada "Ana Sayfaya Dön" veya "Geri Dön" butonu bulunur
5. ✅ Sayfalar modern ve görsel olarak çekicidir
6. ✅ Mobile responsive olmalıdır

---

## Page Structure

### 1. 404 Not Found Page

```
┌─────────────────────────────────────┐
│                                     │
│         😕                          │
│                                     │
│      Sayfa Bulunamadı               │
│                                     │
│  Aradığınız sayfa mevcut değil      │
│  veya taşınmış olabilir.            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Ana Sayfaya Dön]             │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Geri Git]                    │ │
│  └───────────────────────────────┘ │
│                                     │
│  Hızlı Erişim:                      │
│  • Forum                            │
│  • Pazar                            │
│  • Kariyer                          │
│  • AI Asistan                       │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- 😕 İkonu (veya 404 animasyonu)
- "Sayfa Bulunamadı" başlığı
- Açıklayıcı mesaj
- "Ana Sayfaya Dön" butonu → `/` (Landing page)
- "Geri Git" butonu → `window.history.back()`
- Hızlı erişim linkleri (Forum, Pazar, Kariyer, AI Asistan)

---

### 2. 500 Internal Server Error Page

```
┌─────────────────────────────────────┐
│                                     │
│         ⚠️                          │
│                                     │
│   Bir Hata Oluştu                    │
│                                     │
│  Üzgünüz, bir şeyler ters gitti.    │
│  Lütfen birkaç dakika sonra         │
│  tekrar deneyin.                     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Sayfayı Yenile]              │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Ana Sayfaya Dön]             │ │
│  └───────────────────────────────┘ │
│                                     │
│  Sorun devam ederse:                │
│  [İletişime Geç]                    │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- ⚠️ İkonu (veya hata animasyonu)
- "Bir Hata Oluştu" başlığı
- Açıklayıcı mesaj
- "Sayfayı Yenile" butonu → `window.location.reload()`
- "Ana Sayfaya Dön" butonu → `/`
- "İletişime Geç" linki → Settings'teki contact form veya email

---

### 3. 403 Forbidden Page

```
┌─────────────────────────────────────┐
│                                     │
│         🔒                          │
│                                     │
│      Erişim Reddedildi               │
│                                     │
│  Bu sayfaya erişim yetkiniz yok.    │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Ana Sayfaya Dön]             │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Giriş Yap]                   │ │
│  └───────────────────────────────┘ │
│                                     │
│  Eğer bu sayfaya erişim hakkınız    │
│  olduğunu düşünüyorsanız:           │
│  [İletişime Geç]                    │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- 🔒 İkonu
- "Erişim Reddedildi" başlığı
- Açıklayıcı mesaj
- "Ana Sayfaya Dön" butonu → `/`
- "Giriş Yap" butonu → `/login` (eğer logged out ise)
- "İletişime Geç" linki

---

## Technical Requirements

### Functional Requirements

**FR-001:** 404 hatası için özel sayfa gösterilmeli  
**FR-002:** 500 hatası için özel sayfa gösterilmeli  
**FR-003:** 403 hatası için özel sayfa gösterilmeli  
**FR-004:** Her sayfada navigation butonları olmalı  
**FR-005:** "Geri Git" butonu browser history'yi kullanmalı  
**FR-006:** "Sayfayı Yenile" butonu sayfayı reload etmeli  
**FR-007:** Hızlı erişim linkleri çalışmalı (404 için)  
**FR-008:** Mobile responsive olmalı

---

### Non-Functional Requirements

**NFR-001:** Sayfa yükleme süresi < 500ms olmalı  
**NFR-002:** Modern ve görsel olarak çekici olmalı  
**NFR-003:** Animasyonlar smooth olmalı (opsiyonel)  
**NFR-004:** Mobile responsive olmalı

---

## Frontend Implementation

### Component Structure

```
error-pages/
├── Error404Page.tsx          ← 404 sayfası
├── Error500Page.tsx          ← 500 sayfası
├── Error403Page.tsx          ← 403 sayfası
├── ErrorLayout.tsx           ← Ortak layout
└── ErrorIcon.tsx             ← Animasyonlu ikon (opsiyonel)
```

### Route Setup

**React Router:**
```tsx
// Catch-all route (404)
<Route path="*" element={<Error404Page />} />

// Error boundary (500)
<ErrorBoundary fallback={<Error500Page />}>
  <App />
</ErrorBoundary>

// Protected route (403)
<ProtectedRoute requireRole="admin">
  <AdminPanel />
</ProtectedRoute>
// Eğer role yoksa → Error403Page
```

### Code Example

```tsx
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

export const Error404Page: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ErrorLayout
      icon="😕"
      title="Sayfa Bulunamadı"
      message="Aradığınız sayfa mevcut değil veya taşınmış olabilir."
    >
      <div className="error-actions">
        <button onClick={() => navigate('/')}>
          Ana Sayfaya Dön
        </button>
        <button onClick={() => window.history.back()}>
          Geri Git
        </button>
      </div>
      
      <div className="quick-links">
        <h3>Hızlı Erişim:</h3>
        <Link to="/dashboard/forum">Forum</Link>
        <Link to="/dashboard/marketplace">Pazar</Link>
        <Link to="/dashboard/career">Kariyer</Link>
        <Link to="/dashboard/ai-assistant">AI Asistan</Link>
      </div>
    </ErrorLayout>
  );
};
```

---

## UI/UX Design

### Color Scheme

**404 Page:**
- Background: Light gray (#F9FAFB) veya gradient
- Icon: Blue (#3B82F6) veya gray (#6B7280)
- Text: Dark gray (#1F2937)
- Buttons: Primary blue (#3B82F6)

**500 Page:**
- Background: Light red (#FEF2F2) veya gradient
- Icon: Red (#EF4444) veya orange (#F59E0B)
- Text: Dark gray (#1F2937)
- Buttons: Primary blue (#3B82F6)

**403 Page:**
- Background: Light yellow (#FFFBEB) veya gradient
- Icon: Yellow (#F59E0B) veya gray (#6B7280)
- Text: Dark gray (#1F2937)
- Buttons: Primary blue (#3B82F6)

### Typography

- **Icon/Emoji:** 80-120px (büyük, dikkat çekici)
- **Title:** 32px, Bold
- **Message:** 18px, Regular
- **Buttons:** 16px, Medium
- **Quick Links:** 14px, Regular

### Spacing

- Container: Max-width 600px, centered
- Padding: 48px (mobile: 32px)
- Button spacing: 16px
- Section spacing: 32px

### Animations (Opsiyonel)

**404 Page:**
- Icon animasyonu (bounce, fade-in)
- "404" yazısı animasyonu (typewriter effect)

**500 Page:**
- Icon animasyonu (shake, pulse)
- Error mesajı fade-in

**403 Page:**
- Icon animasyonu (lock animation)
- Fade-in effect

---

## Error Handling Strategy

### 404 Not Found

**Tetiklenme:**
- Geçersiz URL
- Silinmiş sayfa
- Route bulunamadı

**Frontend:**
```tsx
// React Router catch-all
<Route path="*" element={<Error404Page />} />
```

**Backend:**
```python
# API endpoint bulunamadı
raise HTTPException(status_code=404, detail="Endpoint not found")
```

---

### 500 Internal Server Error

**Tetiklenme:**
- Backend hata
- Database connection error
- Unexpected exception

**Frontend:**
```tsx
// Error Boundary
<ErrorBoundary fallback={<Error500Page />}>
  <App />
</ErrorBoundary>
```

**Backend:**
```python
# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

---

### 403 Forbidden

**Tetiklenme:**
- Yetkisiz erişim
- Role kontrolü başarısız
- Admin panel erişimi (student role)

**Frontend:**
```tsx
// Protected route
<ProtectedRoute requireRole="admin">
  <AdminPanel />
</ProtectedRoute>
// Eğer role yoksa → Error403Page
```

**Backend:**
```python
# Permission check
if current_user.role != UserRole.ADMIN:
    raise HTTPException(status_code=403, detail="Forbidden")
```

---

## Integration Points

### Related Modules

- **001-landing-page:** "Ana Sayfaya Dön" butonu
- **003-login-page:** "Giriş Yap" butonu (403 için)
- **004-dashboard:** Hızlı erişim linkleri (404 için)
- **011-settings:** "İletişime Geç" linki

### Dependencies

- React Router (useNavigate, Link)
- Error Boundary (React 16+)
- UI Components (Button, Icon)

---

## Future Enhancements (MVP Sonrası)

1. **Error Tracking:** Sentry veya benzeri error tracking servisi entegrasyonu
2. **Error Reporting:** Kullanıcıların hata raporu gönderebilmesi
3. **Custom Error Messages:** Backend'den özel hata mesajları
4. **Error Analytics:** Hangi hataların ne sıklıkla oluştuğunu takip
5. **Retry Mechanism:** 500 hatası için otomatik retry butonu

---

## Testing Scenarios

### 404 Page

1. ✅ Geçersiz URL → 404 sayfası gösterilir
2. ✅ "Ana Sayfaya Dön" butonu çalışır
3. ✅ "Geri Git" butonu çalışır
4. ✅ Hızlı erişim linkleri çalışır

### 500 Page

1. ✅ Backend hata → 500 sayfası gösterilir
2. ✅ "Sayfayı Yenile" butonu çalışır
3. ✅ "Ana Sayfaya Dön" butonu çalışır
4. ✅ "İletişime Geç" linki çalışır

### 403 Page

1. ✅ Yetkisiz erişim → 403 sayfası gösterilir
2. ✅ "Ana Sayfaya Dön" butonu çalışır
3. ✅ "Giriş Yap" butonu çalışır (logged out ise)
4. ✅ "İletişime Geç" linki çalışır

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Ready for Development

