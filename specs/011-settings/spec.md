# 011 - Ayarlar Sayfası

## 📋 Genel Bakış

Kullanıcıların hesap ayarlarını yönetebilecekleri sayfa. Şifre değiştirme, tema (Dark/Light Mode), iletişim ve hesap silme işlemlerini içerir.

---

## 🎯 Amaç

- Şifre güncelleme işlemi sağlamak
- Tema tercihini yönetmek (Dark/Light Mode)
- Platform yetkilileri ile iletişim kanalı sunmak
- Hesap silme (soft-delete) özelliği sunmak

---

## 👥 Kullanıcı Rolleri

- **Öğrenci, Eğitmen, Admin:** Tüm roller aynı ayarlara sahiptir

---

## 🗂️ Sayfa Yapısı

### Layout

Ayarlar sayfası, Profil sayfasına benzer **ayrı bir layout** kullanır:

```
┌───────────────────────────────────────────────────────────────┐
│  📚 KAMPÜS+    🔍 [Ara...]      🔔    💬    👤 (AY) ▼        │  ← Header (sabit)
└───────────────────────────────────────────────────────────────┘

┌──────────────────┬────────────────────────────────────────────┐
│  AYARLAR SIDEBAR │         MAIN CONTENT AREA                  │
│  (240px)         │         (Dinamik içerik)                   │
│                  │                                            │
│ ⚙️ AYARLAR       │                                            │
│                  │                                            │
│ 🔒 Şifre         │  ← Aktif sekme (kalın + arka plan rengi)  │
│ 🎨 Tema          │                                            │
│ 📧 İletişim      │                                            │
│ 🗑️ Hesap Sil     │                                            │
│                  │                                            │
└──────────────────┴────────────────────────────────────────────┘
```

**Önemli Not:** 
- Dashboard'daki sol sidebar **kaybolur**
- Ayarlar sayfası için **yeni bir sidebar** gösterilir
- Header **sabit kalır**
- URL: `/dashboard/settings`

---

## 🔒 1. ŞİFRE DEĞİŞTİR SEKMESİ (Varsayılan)

Kullanıcının mevcut şifresini değiştirmesine izin verir.

### Görünüm

```
┌─ ŞİFRE DEĞİŞTİR ───────────────────────────────────────────┐
│                                                            │
│  Mevcut Şifre:                                             │
│  [                                           ] 👁️          │
│                                                            │
│  Yeni Şifre:                                               │
│  [                                           ] 👁️          │
│                                                            │
│  Yeni Şifre Tekrar:                                        │
│  [                                           ] 👁️          │
│                                                            │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  ✓ Şifre Kuralları:                                        │
│    • En az 8 karakter                                      │
│    • En az 1 harf                                          │
│    • En az 1 sayı                                          │
│                                                            │
│  [🔄 Şifreyi Güncelle]                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Şifre Değiştirme Akışı

1. **Kullanıcı formu doldurur**
   - Mevcut şifre
   - Yeni şifre (2 kez)

2. **Client-side validation:**
   - Mevcut şifre boş olmamalı
   - Yeni şifre kurallarına uymalı (min 8, 1 harf, 1 sayı)
   - İki yeni şifre alanı eşleşmeli

3. **"Şifreyi Güncelle" butonuna basar**
   - Backend'e PATCH isteği

4. **Backend doğrular:**
   - Mevcut şifre doğru mu?
   - Yeni şifre kurallarına uygun mu?

5. **Başarılıysa:**
   - Şifre hashlenir ve güncellenir
   - Başarı mesajı gösterilir
   - Kullanıcı **logout edilmez** (sadece şifre değişti, oturum açık kalır)

6. **Hata durumları:**
   - Mevcut şifre yanlış → "Mevcut şifre hatalı"
   - Yeni şifre kurallara uymuyor → "Şifre en az 8 karakter, 1 harf ve 1 sayı içermelidir"
   - İki yeni şifre eşleşmiyor → "Şifreler eşleşmiyor"

### Validasyon

- ✅ Mevcut şifre doğru olmalı
- ✅ Yeni şifre min 8 karakter
- ✅ Yeni şifre en az 1 harf ve 1 sayı içermeli
- ✅ İki yeni şifre alanı eşleşmeli

### Rate Limiting

- **Şifre değiştirme:** 5 deneme/saat

---

## 🎨 2. TEMA SEKMESİ

Kullanıcının arayüz temasını (Dark Mode / Light Mode) seçmesine izin verir.

### Görünüm

```
┌─ TEMA TERCİHİ ─────────────────────────────────────────────┐
│                                                            │
│  Görünüm Modu:                                             │
│                                                            │
│  ┌────────────────┐  ┌────────────────┐                   │
│  │                │  │                │                   │
│  │   ☀️ Light     │  │   🌙 Dark      │                   │
│  │                │  │                │                   │
│  │   [Seçili]     │  │   [Seç]        │                   │
│  │                │  │                │                   │
│  └────────────────┘  └────────────────┘                   │
│                                                            │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  ✓ Seçilen tema anında uygulanır                          │
│  ✓ Tercih kaydedilir ve her giriş yaptığınızda hatırlanır │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Tema Seçim Akışı

1. **Kullanıcı tema kartına tıklar**
   - Light veya Dark seçeneğini seçer

2. **Tema anında uygulanır**
   - CSS sınıfları değişir (`dark` class eklenir/kaldırılır)
   - Tüm sayfada tema güncellenir

3. **Tercih kaydedilir**
   - Backend'e PATCH isteği (`/api/v1/settings/theme`)
   - Database'de `users.theme_preference` güncellenir
   - Kullanıcı bir sonraki girişte aynı temayı görür

### Teknik Detaylar

**Frontend:**
- Tailwind CSS'in dark mode özelliği kullanılır
- `<html>` veya `<body>` tag'ine `class="dark"` eklenir/kaldırılır
- LocalStorage'da da saklanır (daha hızlı yüklenme için)

**Backend:**
- `users` tablosuna `theme_preference` VARCHAR(10) DEFAULT 'light'
- Değerler: `'light'` veya `'dark'`

**Varsayılan:** Light Mode

---

## 📧 3. İLETİŞİM SEKMESİ

Platform yetkilileri ile iletişim kurma formu.

### Görünüm

```
┌─ İLETİŞİM ─────────────────────────────────────────────────┐
│                                                            │
│  Platform yetkilileri ile iletişime geçin:                │
│                                                            │
│  Konu:                                                     │
│  [▼ Seçiniz]                                               │
│    • Genel Soru                                            │
│    • Teknik Destek                                         │
│    • Özellik Önerisi                                       │
│    • Hata Bildirimi                                        │
│    • Hesap Sorunu                                          │
│    • Diğer                                                 │
│                                                            │
│  Mesajınız:                                                │
│  [                                           ]             │
│  [                                           ]             │
│  [                                           ]             │
│  [                                           ]             │
│  [                                           ]             │
│                                                            │
│  Max 1000 karakter                                         │
│  245/1000                                                  │
│                                                            │
│  [📤 Gönder]                                               │
│                                                            │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  💡 Cevap süresi: 1-3 iş günü                              │
│  📧 Cevap email adresinize gelecektir                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### İletişim Formu Akışı

1. **Kullanıcı formu doldurur**
   - Konu seçer (dropdown)
   - Mesaj yazar (max 1000 karakter)

2. **"Gönder" butonuna basar**
   - Backend'e POST isteği
   - Mesaj veritabanına kaydedilir

3. **Başarı mesajı gösterilir**
   ```
   ✅ Mesajınız başarıyla gönderildi!
   En kısa sürede dönüş yapacağız.
   ```

4. **Admin paneline bildirim düşer**
   - Adminler yeni iletişim mesajlarını görür
   - Email ile cevap verir

### Validasyon

- ✅ Konu seçilmeli
- ✅ Mesaj min 10 karakter
- ✅ Mesaj max 1000 karakter

### Rate Limiting

- **İletişim formu:** 3 mesaj/gün/kullanıcı

### Database Şeması

**Yeni Tablo:** `contact_messages`

```sql
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, answered, closed
    created_at TIMESTAMP DEFAULT NOW(),
    answered_at TIMESTAMP DEFAULT NULL,
    answered_by INTEGER REFERENCES users(id),
    
    INDEX idx_contact_messages_user (user_id),
    INDEX idx_contact_messages_status (status)
);
```

---

## 🗑️ 4. HESAP SİL SEKMESİ

Kullanıcının hesabını kalıcı olarak (soft-delete) silmesine izin verir.

### Görünüm

```
┌─ HESAP SİL ────────────────────────────────────────────────┐
│                                                            │
│  ⚠️ DİKKAT: BU İŞLEM GERİ ALINAMAZ!                       │
│                                                            │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  Hesabınızı sildiğinizde:                                 │
│                                                            │
│  ❌ Tüm ilanlarınız silinir                                │
│  ❌ Forum mesajlarınız anonim hale gelir                   │
│  ❌ DM geçmişiniz silinir                                  │
│  ❌ Kariyer başvurularınız silinir                         │
│  ❌ Profil bilgileriniz kalıcı olarak silinir             │
│  ❌ Akademik katkılarınız silinir                          │
│                                                            │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  Hesabınızı silmek için aşağıya "HESAP SIL" yazın:       │
│  (Büyük/küçük harf duyarlı)                               │
│                                                            │
│  [                                           ]            │
│                                                            │
│  [🗑️ Hesabı Kalıcı Olarak Sil]  [disabled]               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Hesap Silme Akışı

1. **Kullanıcı "HESAP SIL" yazar**
   - Case-sensitive kontrol
   - Buton aktif olur

2. **"Hesabı Kalıcı Olarak Sil" butonuna basar**
   - Onay popup'ı gösterilir:
   ```
   ┌─ Son Onay ─────────────────────────────┐
   │                                        │
   │  ⚠️ Emin misiniz?                      │
   │                                        │
   │  Bu işlem geri alınamaz.               │
   │  Hesabınız kalıcı olarak silinecek.    │
   │                                        │
   │  [İptal]  [Evet, Sil]                 │
   └────────────────────────────────────────┘
   ```

3. **"Evet, Sil" butonuna basar**
   - Backend'e DELETE isteği

4. **Backend soft-delete yapar:**
   - `users.is_deleted = true`
   - `users.deleted_at = NOW()`
   - İlanlar silinir (`marketplace_listings` → DELETE)
   - Forum mesajları anonim yapılır (`forum_topics/replies` → author_id = NULL)
   - DM geçmişi silinir (merkezi sistem: `conversations`, `marketplace_messages`, `career_messages` → DELETE)
   - Kariyer başvuruları silinir (`career_applications` → DELETE)
   - Akademik katkıları silinir (`academic_calendar_contributions, course_schedule_contributions` → DELETE)

5. **Başarılıysa:**
   - Kullanıcı **logout** olur
   - Login sayfasına yönlendirilir
   - "Hesabınız başarıyla silindi" mesajı gösterilir

6. **Hata durumları:**
   - Yanlış onay yazısı → Buton disabled kalır
   - Rate limit → "Çok fazla deneme. 1 dakika sonra tekrar deneyin"

### Validasyon

- ✅ Onay yazısı "HESAP SIL" olmalı (case-sensitive)
- ✅ İkinci onay popup'ında "Evet, Sil" seçilmeli

### Rate Limiting

- **Hesap silme:** 1 deneme/dakika

---

## 🗄️ Database Değişiklikleri

### `users` Tablosuna Eklenmesi Gerekenler

```sql
-- Hesap silme
is_deleted BOOLEAN DEFAULT FALSE,
deleted_at TIMESTAMP DEFAULT NULL,

-- Tema tercihi
theme_preference VARCHAR(10) DEFAULT 'light',

-- Index
CREATE INDEX idx_users_is_deleted ON users(is_deleted);
```

### Yeni Tablo: `contact_messages`

```sql
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    answered_at TIMESTAMP DEFAULT NULL,
    answered_by INTEGER REFERENCES users(id),
    
    INDEX idx_contact_messages_user (user_id),
    INDEX idx_contact_messages_status (status)
);
```

---

## 🔌 API Endpoints

### Şifre Değiştir

#### `PATCH /api/v1/settings/password`
Şifreyi değiştirir.

**Request:**
```json
{
  "current_password": "eskisifre123",
  "new_password": "yenisifre456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Şifre başarıyla güncellendi"
}
```

**Errors:**
- `400`: "Mevcut şifre yanlış"
- `400`: "Yeni şifre geçersiz (min 8 karakter, 1 harf, 1 sayı)"
- `429`: "Çok fazla deneme. 1 saat sonra tekrar deneyin"

---

### Tema Değiştir

#### `PATCH /api/v1/settings/theme`
Tema tercihini günceller.

**Request:**
```json
{
  "theme": "dark"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tema tercihi güncellendi",
  "theme": "dark"
}
```

**Errors:**
- `400`: "Geçersiz tema (light veya dark olmalı)"

---

### İletişim Formu

#### `POST /api/v1/settings/contact`
İletişim mesajı gönderir.

**Request:**
```json
{
  "subject": "Teknik Destek",
  "message": "Profil resmimi yükleyemiyorum, yardımcı olabilir misiniz?"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mesajınız başarıyla gönderildi. En kısa sürede dönüş yapacağız."
}
```

**Errors:**
- `400`: "Mesaj en az 10 karakter olmalı"
- `400`: "Mesaj en fazla 1000 karakter olabilir"
- `429`: "Günlük mesaj limitine ulaştınız (3 mesaj/gün)"

---

#### `GET /api/v1/settings/contact/history`
Kullanıcının gönderdiği iletişim mesajlarını listeler.

**Response:**
```json
{
  "total": 3,
  "messages": [
    {
      "id": 123,
      "subject": "Teknik Destek",
      "message": "Profil resmimi yükleyemiyorum...",
      "status": "answered",
      "created_at": "2026-01-01T10:00:00Z",
      "answered_at": "2026-01-02T14:30:00Z"
    }
  ]
}
```

---

### Hesap Sil

#### `DELETE /api/v1/settings/account`
Hesabı siler (soft-delete).

**Request:**
```json
{
  "confirmation": "HESAP SIL"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hesabınız başarıyla silindi"
}
```

**Errors:**
- `400`: "Onay yazısı hatalı. 'HESAP SIL' yazmalısınız"
- `429`: "Çok fazla deneme. 1 dakika sonra tekrar deneyin"

**Note:** Kullanıcı logout edilir, login sayfasına yönlendirilir.

---

## 🎨 Frontend Routing

### URL Yapısı

```
/dashboard/settings          → Şifre Değiştir (varsayılan)
/dashboard/settings/theme    → Tema
/dashboard/settings/contact  → İletişim
/dashboard/settings/delete   → Hesap Sil
```

### State Management

**Active Tab State:**
```typescript
const [activeTab, setActiveTab] = useState<SettingsTab>('password');

type SettingsTab = 'password' | 'theme' | 'contact' | 'delete';
```

**Sidebar Component:**
```tsx
<SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
```

### SPA Navigasyon

- Sidebar'daki sekmelere tıklandığında sayfa yenilenmez
- URL güncelenir (React Router)
- İçerik dinamik olarak değişir
- Header sabit kalır

---

## 🔒 Güvenlik

### Rate Limiting

- **Şifre değiştirme:** 5 deneme/saat
- **İletişim formu:** 3 mesaj/gün
- **Hesap silme:** 1 deneme/dakika

### Yetkilendirme

- Kullanıcı sadece **kendi ayarlarını** değiştirebilir
- JWT token ile authentication
- Hassas işlemler için ek doğrulama (email değiştir → kod, hesap sil → onay)

### Validasyon

- **Client-side:** Hızlı feedback için
- **Server-side:** Güvenlik için (mutlaka yapılmalı)

---

## 🧪 Test Senaryoları

### Şifre Değiştirme

1. **Normal akış:**
   - Mevcut şifre + yeni şifre gir → Şifre güncellenir

2. **Yanlış mevcut şifre:**
   - Hatalı mevcut şifre → "Mevcut şifre yanlış" hatası

3. **Geçersiz yeni şifre:**
   - 5 karakterlik şifre → "En az 8 karakter" hatası
   - Sadece harf → "En az 1 sayı" hatası

4. **Şifreler eşleşmiyor:**
   - İki farklı yeni şifre → "Şifreler eşleşmiyor" hatası

### Tema Değiştirme

1. **Normal akış:**
   - Dark Mode'a tıkla → Anında tüm sayfa dark mode olur
   - Light Mode'a tıkla → Anında tüm sayfa light mode olur

2. **Tercih kaydedilir:**
   - Dark Mode seç → Logout → Login → Dark Mode görünüyor

3. **LocalStorage:**
   - Tema LocalStorage'da da saklanır (hızlı yüklenme)

### İletişim Formu

1. **Normal akış:**
   - Konu seç → Mesaj yaz → Gönder → Başarı mesajı

2. **Geçersiz mesaj:**
   - 5 karakterlik mesaj → "Mesaj en az 10 karakter olmalı" hatası
   - 1500 karakterlik mesaj → "Mesaj en fazla 1000 karakter olabilir" hatası

3. **Rate limit:**
   - 3 mesaj gönder → 4. mesaj "Günlük mesaj limitine ulaştınız" hatası

4. **Mesaj geçmişi:**
   - Gönderilen mesajları görüntüle (GET /settings/contact/history)
   - Cevaplanan mesajları göster

### Hesap Silme

1. **Normal akış:**
   - "HESAP SIL" yaz → Butona bas → Onay popup → Evet → Hesap silinir → Logout

2. **Yanlış yazı:**
   - "hesap sil" yaz (küçük harf) → Buton disabled kalır

3. **Popup'ta iptal:**
   - Popup'ta "İptal" bas → Hiçbir şey olmaz

---

## 📱 Responsive Tasarım

### Desktop (>1024px)
- Sidebar: 240px sabit
- Main content: Kalan alan

### Tablet (768px - 1024px)
- Sidebar: 200px
- Main content: Kalan alan

### Mobile (<768px)
- Sidebar: Hamburger menü (drawer)
- Main content: Full width

---

## 🎯 Başarı Kriterleri

1. ✅ Şifre değiştirme mevcut şifre kontrolü ile çalışmalı
2. ✅ Tema değişimi anında uygulanmalı ve kaydedilmeli
3. ✅ İletişim formu mesajları DB'ye kaydedilmeli
4. ✅ İletişim mesaj geçmişi görüntülenebilmeli
5. ✅ Hesap silme soft-delete yapmalı (hard-delete değil)
6. ✅ Hesap silindiğinde kullanıcı verileri temizlenmeli
7. ✅ Tüm rate limitler çalışmalı
8. ✅ Kullanıcı hesap silme sonrası logout olmalı
9. ✅ Mobile responsive tasarım

---

## 🚀 Tahmini Geliştirme Süresi

**Toplam:** 2-3 gün

- **Backend (Database + API):** 1-1.5 gün
- **Frontend (UI + State Management):** 1-1.5 gün
- **Test + Hata Düzeltme:** 0.5 gün

---

## 📝 Notlar ve Gelecek Geliştirmeler

### MVP Kapsamında:
- ✅ Şifre değiştir
- ✅ Tema tercihi (Dark/Light Mode)
- ✅ İletişim formu
- ✅ Hesap sil (soft-delete)

### MVP Sonrası:
- ⏳ Bildirim tercihleri
- ⏳ İki faktörlü kimlik doğrulama (2FA)
- ⏳ Oturum yönetimi (aktif oturumları görme, sonlandırma)
- ⏳ Gizlilik ayarları (profilim kimler görsün, vb.)
- ⏳ Email değiştirme (şu an kullanıcılar email değiştiremez)

### Teknik Borç:
- İletişim mesajları için admin paneli oluşturulmalı
- İletişim formu için email bildirimi (admin'e)

---

**Versiyon:** 1.0  
**Son Güncelleme:** 2 Ocak 2026  
**Durum:** Spec Tamamlandı, Backend ve Frontend Development Bekliyor

