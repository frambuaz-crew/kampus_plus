# Feature Specification: Terms of Service & Privacy Policy Page

**Module**: 018-terms-of-service  
**Created**: 2 Ocak 2026  
**Status**: Ready for Development  
**Priority**: P2 - Medium (Legal Gereklilik)

---

## Overview

Kullanıcıların kayıt olmadan önce kabul etmeleri gereken Kullanım Koşulları ve Gizlilik Politikası sayfası. Register sayfasındaki checkbox'tan bu sayfaya yönlendirilir.

**Erişim:** Public (Herkes görebilir)  
**URL:** `/terms`  
**Display:** Ayrı sayfa (modal değil, çünkü legal metinler uzun olabilir)

---

## User Story

**"Kayıt olmadan önce, platformun kullanım koşullarını ve gizlilik politikasını okumak istiyorum."**

**Kabul Kriterleri:**
1. ✅ Register sayfasındaki "kullanım koşulları" linkine tıklandığında `/terms` sayfası açılır
2. ✅ Sayfa hem Kullanım Koşulları hem de Gizlilik Politikası içerir
3. ✅ İçerik okunabilir formatta gösterilir (başlıklar, paragraflar, listeler)
4. ✅ Sayfa scroll edilebilir (uzun içerik için)
5. ✅ "Geri Dön" butonu ile register sayfasına dönülebilir
6. ✅ Mobile responsive olmalı

---

## Page Structure

### 1. Header

```
┌─────────────────────────────────────┐
│  ← Geri Dön    KAMPÜS+ Logo        │
└─────────────────────────────────────┘
```

**Özellikler:**
- Sol: "← Geri Dön" butonu (register sayfasına döner)
- Sağ: KAMPÜS+ logosu (tıklanabilir, ana sayfaya gider)
- Sticky header (scroll edince yukarıda kalır)

---

### 2. Page Title

```
┌─────────────────────────────────────┐
│                                     │
│   Kullanım Koşulları ve            │
│   Gizlilik Politikası               │
│                                     │
│   Son Güncelleme: 2 Ocak 2026      │
│                                     │
└─────────────────────────────────────┘
```

**Özellikler:**
- Ana başlık: "Kullanım Koşulları ve Gizlilik Politikası"
- Alt başlık: "Son Güncelleme: [Tarih]"
- Merkezi hizalama

---

### 3. Content Sections

Sayfa iki ana bölümden oluşur:

#### 3.1. Kullanım Koşulları

```
┌─────────────────────────────────────┐
│  1. Kullanım Koşulları             │
│                                     │
│  1.1. Genel Bilgiler                │
│  [İçerik...]                        │
│                                     │
│  1.2. Kullanıcı Sorumlulukları     │
│  [İçerik...]                        │
│                                     │
│  1.3. Platform Kuralları           │
│  [İçerik...]                        │
│                                     │
│  1.4. İçerik ve Fikri Mülkiyet     │
│  [İçerik...]                        │
│                                     │
│  1.5. Hesap Askıya Alma ve Silme   │
│  [İçerik...]                        │
│                                     │
│  1.6. Değişiklikler                 │
│  [İçerik...]                        │
│                                     │
│  1.7. İletişim                      │
│  [İçerik...]                        │
└─────────────────────────────────────┘
```

#### 3.2. Gizlilik Politikası

```
┌─────────────────────────────────────┐
│  2. Gizlilik Politikası             │
│                                     │
│  2.1. Toplanan Bilgiler             │
│  [İçerik...]                        │
│                                     │
│  2.2. Bilgilerin Kullanımı          │
│  [İçerik...]                        │
│                                     │
│  2.3. Bilgilerin Paylaşımı          │
│  [İçerik...]                        │
│                                     │
│  2.4. Güvenlik                      │
│  [İçerik...]                        │
│                                     │
│  2.5. Çerezler (Cookies)            │
│  [İçerik...]                        │
│                                     │
│  2.6. Kullanıcı Hakları             │
│  [İçerik...]                        │
│                                     │
│  2.7. Değişiklikler                 │
│  [İçerik...]                        │
│                                     │
│  2.8. İletişim                      │
│  [İçerik...]                        │
└─────────────────────────────────────┘
```

---

### 4. Footer Actions

```
┌─────────────────────────────────────┐
│                                     │
│  [Geri Dön]                         │
│                                     │
│  [Kabul Ediyorum ve Kayıt Ol]       │
│                                     │
└─────────────────────────────────────┘
```

**Butonlar:**
1. **"Geri Dön"** → Register sayfasına döner
2. **"Kabul Ediyorum ve Kayıt Ol"** → Register sayfasına döner ve checkbox'ı otomatik işaretler (opsiyonel)

---

## Content Structure

### Kullanım Koşulları İçeriği (Örnek)

**Not:** Gerçek içerik hukukçu tarafından hazırlanmalıdır. Bu sadece yapı örneğidir.

#### 1.1. Genel Bilgiler
- Platform tanımı
- Hizmet kapsamı
- Kullanıcı tanımı

#### 1.2. Kullanıcı Sorumlulukları
- Doğru bilgi verme yükümlülüğü
- Hesap güvenliği
- Platform kurallarına uyma

#### 1.3. Platform Kuralları
- Yasak içerikler
- Spam ve kötüye kullanım
- Telif hakları

#### 1.4. İçerik ve Fikri Mülkiyet
- Kullanıcı içerikleri
- Platform içerikleri
- Telif hakları

#### 1.5. Hesap Askıya Alma ve Silme
- İhlal durumunda hesap askıya alma
- Hesap silme süreci
- İtiraz hakkı

#### 1.6. Değişiklikler
- Koşulların güncellenmesi
- Bildirim süreci

#### 1.7. İletişim
- İletişim bilgileri
- Şikayet süreci

---

### Gizlilik Politikası İçeriği (Örnek)

**Not:** Gerçek içerik hukukçu tarafından hazırlanmalıdır. Bu sadece yapı örneğidir.

#### 2.1. Toplanan Bilgiler
- Kişisel bilgiler (ad, soyad, email, öğrenci numarası)
- Kullanım verileri
- Teknik bilgiler (IP adresi, tarayıcı bilgisi)

#### 2.2. Bilgilerin Kullanımı
- Hizmet sağlama
- İletişim
- Platform iyileştirme

#### 2.3. Bilgilerin Paylaşımı
- Üçüncü taraflarla paylaşım (varsa)
- Yasal yükümlülükler
- İş ortakları

#### 2.4. Güvenlik
- Veri güvenliği önlemleri
- Şifreleme
- Erişim kontrolleri

#### 2.5. Çerezler (Cookies)
- Çerez türleri
- Çerez kullanım amaçları
- Çerez yönetimi

#### 2.6. Kullanıcı Hakları
- Bilgi edinme hakkı
- Düzeltme hakkı
- Silme hakkı (GDPR uyumlu)

#### 2.7. Değişiklikler
- Politika güncellemeleri
- Bildirim süreci

#### 2.8. İletişim
- Gizlilik iletişim bilgileri
- Veri koruma sorumlusu

---

## Technical Requirements

### Functional Requirements

**FR-001:** Register sayfasındaki link `/terms` sayfasına yönlendirmeli  
**FR-002:** Sayfa hem Kullanım Koşulları hem de Gizlilik Politikası içermeli  
**FR-003:** İçerik okunabilir formatta gösterilmeli (başlıklar, paragraflar, listeler)  
**FR-004:** Sayfa scroll edilebilir olmalı (uzun içerik için)  
**FR-005:** "Geri Dön" butonu register sayfasına döndürmeli  
**FR-006:** Header sticky olmalı (scroll edince yukarıda kalır)  
**FR-007:** Mobile responsive olmalı

---

### Non-Functional Requirements

**NFR-001:** Sayfa yükleme süresi < 1 saniye olmalı  
**NFR-002:** İçerik okunabilir olmalı (uygun font size, line height, spacing)  
**NFR-003:** Mobile responsive olmalı  
**NFR-004:** SEO friendly olmalı (meta tags, structured data)

---

## Frontend Implementation

### Component Structure

```
terms/
├── TermsPage.tsx              ← Ana sayfa component
├── TermsHeader.tsx            ← Header component
├── TermsContent.tsx            ← İçerik component
└── TermsFooter.tsx            ← Footer actions component
```

### State Management

```typescript
// Basit sayfa, state gerekmez (static content)
// Sadece navigation için React Router kullanılır
```

### User Flow

```
1. Kullanıcı register sayfasında "kullanım koşulları" linkine tıklar
   ↓
2. /terms sayfası açılır
   ↓
3. İçerik gösterilir (scroll edilebilir)
   ↓
4a. "Geri Dön" butonuna tıklar → Register sayfasına döner
   ↓
4b. "Kabul Ediyorum ve Kayıt Ol" butonuna tıklar → Register sayfasına döner (checkbox otomatik işaretli, opsiyonel)
```

### Code Example

```tsx
import { Link, useNavigate } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="terms-page">
      <TermsHeader />
      
      <div className="terms-content">
        <h1>Kullanım Koşulları ve Gizlilik Politikası</h1>
        <p className="last-updated">Son Güncelleme: 2 Ocak 2026</p>
        
        <section className="terms-section">
          <h2>1. Kullanım Koşulları</h2>
          
          <h3>1.1. Genel Bilgiler</h3>
          <p>...</p>
          
          {/* Diğer bölümler */}
        </section>
        
        <section className="privacy-section">
          <h2>2. Gizlilik Politikası</h2>
          
          <h3>2.1. Toplanan Bilgiler</h3>
          <p>...</p>
          
          {/* Diğer bölümler */}
        </section>
      </div>
      
      <TermsFooter />
    </div>
  );
};
```

---

## UI/UX Design

### Color Scheme

- Background: White
- Text: Dark gray (#1F2937)
- Headings: Dark blue (#1E40AF)
- Links: Primary blue (#3B82F6)
- Buttons: Primary blue (#3B82F6)

### Typography

- **Ana Başlık:** 32px, Bold
- **Bölüm Başlıkları (H2):** 24px, Bold
- **Alt Başlıklar (H3):** 20px, Semi-Bold
- **Paragraflar:** 16px, Regular
- **Listeler:** 16px, Regular
- **Son Güncelleme:** 14px, Regular, Gray

### Spacing

- Container: Max-width 800px, centered
- Padding: 32px (mobile: 24px)
- Section spacing: 48px
- Paragraph spacing: 16px

### Responsive Design

- Mobile: Full width, padding 24px, font size küçültülebilir
- Tablet: Max-width 800px, centered
- Desktop: Max-width 800px, centered

---

## Content Management

### MVP Yaklaşımı

**Seçenek 1: Static Content (Önerilen)**
- İçerik doğrudan component içinde (hardcoded)
- Hukukçu tarafından hazırlanan metin component'e eklenir
- Güncelleme: Code değişikliği gerekir

**Seçenek 2: Database/API (Gelecek)**
- İçerik database'de saklanır
- Admin panelinden güncellenebilir
- API endpoint ile çekilir
- MVP sonrası eklenebilir

**MVP için Seçenek 1 önerilir** (basit, hızlı, yeterli).

---

## Legal Considerations

1. **Hukukçu Onayı:** İçerik mutlaka hukukçu tarafından hazırlanmalıdır
2. **GDPR Uyumluluğu:** Gizlilik politikası GDPR'a uygun olmalıdır
3. **KVKK Uyumluluğu:** Türkiye'de KVKK'ya uygun olmalıdır
4. **Güncelleme:** İçerik değiştiğinde "Son Güncelleme" tarihi güncellenmelidir
5. **Kabul Kaydı:** Register'da checkbox işaretlendiğinde kabul kaydı tutulmalıdır (database'de `terms_accepted_at` timestamp)

---

## Integration Points

### Related Modules

- **002-register-page:** "kullanım koşulları" linki bu sayfaya yönlendirir
- **Backend User Model:** `terms_accepted_at` field'ı (kabul kaydı için)

### Dependencies

- React Router (Link, useNavigate)
- UI Components (Button, Header, Footer)

---

## Future Enhancements (MVP Sonrası)

1. **Content Management:** Admin panelinden içerik güncelleme
2. **Version History:** İçerik versiyon geçmişi
3. **Multi-language:** Çoklu dil desteği
4. **PDF Export:** İçeriği PDF olarak indirme
5. **Acceptance Tracking:** Kullanıcıların kabul tarihlerini görüntüleme (admin)

---

## Testing Scenarios

### Happy Path

1. ✅ Register sayfasından linke tıklanır
2. ✅ Terms sayfası açılır
3. ✅ İçerik görüntülenir
4. ✅ Scroll çalışır
5. ✅ "Geri Dön" butonu çalışır
6. ✅ Register sayfasına dönülür

### Edge Cases

1. ✅ Direkt URL ile erişim (`/terms`)
2. ✅ Mobile responsive test
3. ✅ Uzun içerik scroll test
4. ✅ Print preview (tarayıcı print özelliği)

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Ready for Development

**Not:** İçerik hukukçu tarafından hazırlanmalıdır. Bu spec sadece sayfa yapısını ve teknik gereksinimleri tanımlar.

