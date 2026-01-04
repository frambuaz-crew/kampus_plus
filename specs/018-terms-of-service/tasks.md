# Tasks: Terms of Service Page Implementation

**Module:** 018-terms-of-service  
**Status:** Ready for Development  
**Estimated Time:** 0.5 gün (Frontend 3 saat + Content 1 saat)

---

## Task Breakdown

### Phase 1: Frontend Implementation (3 saat)

#### Task 1.1: Terms Page Component

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Ana sayfa component'ini oluştur.

**Dosya:** `frontend/src/pages/TermsPage.tsx`

**Özellikler:**
- [ ] Page layout (header, content, footer)
- [ ] React Router navigation (useNavigate)
- [ ] Basic structure

**Code Structure:**
```tsx
import { useNavigate } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="terms-page">
      <TermsHeader onBack={() => navigate('/register')} />
      <TermsContent />
      <TermsFooter onBack={() => navigate('/register')} />
    </div>
  );
};
```

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] React Router hooks (useNavigate)
- [ ] Basic layout structure
- [ ] Test: Component çalışıyor

---

#### Task 1.2: Terms Header Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Header component'ini oluştur.

**Dosya:** `frontend/src/pages/TermsPage.tsx` (inline component veya ayrı)

**UI:**
```
┌─────────────────────────────────────┐
│  ← Geri Dön    KAMPÜS+ Logo        │
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] "← Geri Dön" butonu (register sayfasına döner)
- [ ] KAMPÜS+ logosu (ana sayfaya gider)
- [ ] Sticky header (scroll edince yukarıda kalır)

**Adımlar:**
- [ ] Header component oluştur
- [ ] Navigation butonları
- [ ] Logo component
- [ ] Sticky positioning
- [ ] Styling
- [ ] Test: Header çalışıyor

---

#### Task 1.3: Terms Content Component

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
İçerik component'ini oluştur.

**Dosya:** `frontend/src/pages/TermsPage.tsx` (inline component)

**Özellikler:**
- [ ] Page title ("Kullanım Koşulları ve Gizlilik Politikası")
- [ ] Last updated date ("Son Güncelleme: [Tarih]")
- [ ] Kullanım Koşulları bölümü (1.1, 1.2, 1.3, ...)
- [ ] Gizlilik Politikası bölümü (2.1, 2.2, 2.3, ...)
- [ ] Scroll edilebilir içerik
- [ ] Typography (başlıklar, paragraflar, listeler)

**Content Structure:**
```tsx
<div className="terms-content">
  <h1>Kullanım Koşulları ve Gizlilik Politikası</h1>
  <p className="last-updated">Son Güncelleme: 2 Ocak 2026</p>
  
  <section className="terms-section">
    <h2>1. Kullanım Koşulları</h2>
    <h3>1.1. Genel Bilgiler</h3>
    <p>...</p>
    {/* Diğer alt bölümler */}
  </section>
  
  <section className="privacy-section">
    <h2>2. Gizlilik Politikası</h2>
    <h3>2.1. Toplanan Bilgiler</h3>
    <p>...</p>
    {/* Diğer alt bölümler */}
  </section>
</div>
```

**Adımlar:**
- [ ] Content component oluştur
- [ ] Page title ve last updated
- [ ] Section structure (Kullanım Koşulları, Gizlilik Politikası)
- [ ] Typography styling
- [ ] Scroll behavior
- [ ] Styling
- [ ] Test: İçerik görüntüleniyor

---

#### Task 1.4: Terms Footer Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Footer actions component'ini oluştur.

**Dosya:** `frontend/src/pages/TermsPage.tsx` (inline component)

**UI:**
```
┌─────────────────────────────────────┐
│                                     │
│  [Geri Dön]                         │
│                                     │
│  [Kabul Ediyorum ve Kayıt Ol]       │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- [ ] "Geri Dön" butonu (register sayfasına döner)
- [ ] "Kabul Ediyorum ve Kayıt Ol" butonu (register sayfasına döner, opsiyonel: checkbox otomatik işaretli)

**Adımlar:**
- [ ] Footer component oluştur
- [ ] Butonlar
- [ ] Navigation logic
- [ ] Styling
- [ ] Test: Butonlar çalışıyor

---

#### Task 1.5: Route Setup

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Terms sayfası için route ekle.

**Dosya:** `frontend/src/App.tsx` (güncelle)

**Route:**
```tsx
<Route path="/terms" element={<TermsPage />} />
```

**Adımlar:**
- [ ] Route ekle
- [ ] Import TermsPage component
- [ ] Test: Route çalışıyor (`/terms`)

---

#### Task 1.6: Register Page Link Update

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Register sayfasındaki "kullanım koşulları" linkini güncelle.

**Dosya:** `frontend/src/pages/RegisterPage.tsx` (güncelle)

**Değişiklik:**
```tsx
// Önceki (placeholder):
<a href="/terms">kullanım koşulları</a>

// Yeni:
<Link to="/terms">kullanım koşulları</Link>
```

**Adımlar:**
- [ ] Register sayfasını bul
- [ ] Link'i güncelle (React Router Link kullan)
- [ ] Test: Link çalışıyor

---

### Phase 2: Content Preparation (1 saat)

#### Task 2.1: Legal Content Preparation

**Süre:** 1 saat  
**Atanan:** Legal Team / Product Owner

**Açıklama:**  
Kullanım Koşulları ve Gizlilik Politikası içeriğini hazırla.

**İçerik Bölümleri:**

**Kullanım Koşulları:**
1. Genel Bilgiler
2. Kullanıcı Sorumlulukları
3. Platform Kuralları
4. İçerik ve Fikri Mülkiyet
5. Hesap Askıya Alma ve Silme
6. Değişiklikler
7. İletişim

**Gizlilik Politikası:**
1. Toplanan Bilgiler
2. Bilgilerin Kullanımı
3. Bilgilerin Paylaşımı
4. Güvenlik
5. Çerezler (Cookies)
6. Kullanıcı Hakları
7. Değişiklikler
8. İletişim

**Adımlar:**
- [ ] Hukukçu ile görüşme
- [ ] İçerik hazırlama
- [ ] GDPR ve KVKK uyumluluğu kontrolü
- [ ] İçerik onayı
- [ ] İçeriği component'e ekleme

**Not:** MVP için placeholder içerik kullanılabilir, production öncesi gerçek içerik eklenmelidir.

---

### Phase 3: Styling & Polish (1 saat)

#### Task 3.1: Responsive Design

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Mobile responsive design uygula.

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

#### Task 3.2: Typography & Spacing

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Typography ve spacing iyileştirmeleri yap.

**İyileştirmeler:**
- [ ] Font sizes (başlıklar, paragraflar)
- [ ] Line height (okunabilirlik)
- [ ] Letter spacing
- [ ] Section spacing
- [ ] Paragraph spacing
- [ ] List styling

**Adımlar:**
- [ ] Typography styling
- [ ] Spacing adjustments
- [ ] Readability test
- [ ] Test: İçerik okunabilir

---

## ✅ Checklist

### Frontend
- [ ] TermsPage component oluşturuldu
- [ ] TermsHeader component
- [ ] TermsContent component
- [ ] TermsFooter component
- [ ] Route setup
- [ ] Register page link güncellendi
- [ ] Responsive design
- [ ] Typography & spacing

### Content
- [ ] Legal content hazırlandı (hukukçu onaylı)
- [ ] Kullanım Koşulları içeriği
- [ ] Gizlilik Politikası içeriği
- [ ] Last updated date
- [ ] GDPR/KVKK uyumluluğu

### Integration
- [ ] Register sayfası linki çalışıyor
- [ ] Navigation butonları çalışıyor
- [ ] Route çalışıyor

---

## 📝 Notlar

1. **Content Management:** MVP için içerik hardcoded olacak. Gelecekte admin panelinden güncellenebilir.

2. **Legal Content:** İçerik mutlaka hukukçu tarafından hazırlanmalıdır. MVP için placeholder içerik kullanılabilir.

3. **GDPR/KVKK:** Gizlilik politikası GDPR ve KVKK'ya uygun olmalıdır.

4. **Acceptance Tracking:** Register'da checkbox işaretlendiğinde `terms_accepted_at` timestamp kaydedilmelidir (backend'de).

5. **Last Updated:** İçerik değiştiğinde "Son Güncelleme" tarihi güncellenmelidir.

6. **Modal vs Page:** Legal metinler uzun olabileceği için ayrı sayfa tercih edilmiştir (modal yerine).

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Tasks Tamamlandı - Ready for Development

