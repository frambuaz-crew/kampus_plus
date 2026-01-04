# Admin Görevleri ve Rolleri - KAMPÜS+

**Tarih:** 2 Ocak 2026  
**Versiyon:** 1.0

---

## 📋 Admin Görevleri Özeti

Admin paneli, platformun tüm içeriğini yönetmek ve moderasyon yapmak için kullanılır. Adminler aşağıdaki görevleri yerine getirir:

---

## 1. 📅 Akademik Özellikler Yönetimi (006-academic-features)

### 1.1. Öğrenci Katkılarını Onaylama/Reddetme

**Görev:**
- Öğrencilerin yüklediği ders programı ve akademik takvim katkılarını inceleme
- PDF/Resim dosyalarını kontrol etme
- Manuel girilen verileri doğrulama
- Onaylama veya reddetme (sebep belirterek)

**Durumlar:**
- ⏳ **Pending** - Bekleyen katkılar
- ✅ **Approved** - Onaylanmış katkılar
- ❌ **Rejected** - Reddedilmiş katkılar

**Özellikler:**
- PDF önizleme
- Parse edilmiş verileri görüntüleme
- Reddetme sebebi yazma (öğrenciye bildirim gider)

### 1.2. Ders Programı Yönetimi

**Görev:**
- Üniversite + Bölüm + Sınıf bazlı ders programı ekleme
- PDF/Excel/CSV yükleme veya manuel giriş
- Mevcut ders programlarını görüntüleme/düzenleme/silme
- Hangi üniversite/bölüm/sınıf için veri olduğunu görüntüleme

**Özellikler:**
- Ağaç yapısında görüntüleme (Üniversite → Bölüm → Sınıf)
- Veri durumu göstergesi (✅ Veri Var / ⏳ Veri Yok)
- Toplu işlemler (birden fazla sınıf için aynı anda)

### 1.3. Akademik Takvim Yönetimi

**Görev:**
- Üniversite bazlı akademik takvim ekleme
- PDF/Excel yükleme veya manuel giriş
- Etkinlik ekleme/düzenleme/silme (sınav, kayıt, tatil)
- Mevcut takvimleri görüntüleme

**Özellikler:**
- Tarih bazlı filtreleme
- Etkinlik tipi filtreleme (sınav, kayıt, tatil)
- Toplu etkinlik ekleme

---

## 2. 💬 Forum Moderation (005-forum-page)

### 2.1. Post Pin/Unpin

**Görev:**
- Önemli konuları pin'leme (kategori listesinin en üstünde gösterilir)
- Pin'lenmiş konuları unpin yapma

**Özellikler:**
- Sadece admin yapabilir
- Birden fazla konu pinlenebilir
- Pin ikonu (📌) + "[PİN]" badge gösterilir

### 2.2. Post Düzenleme/Silme

**Görev:**
- Herhangi bir postu düzenleme (her zaman)
- Herhangi bir postu silme
- Uygunsuz içerikleri kaldırma

**Özellikler:**
- Normal kullanıcılar sadece kendi postlarını ilk 10 dakika içinde düzenleyebilir
- Admin her zaman düzenleyebilir/silebilir

### 2.3. Rapor Edilen Postları Görüntüleme (Gelecek Özellik)

**Görev:**
- Kullanıcıların rapor ettiği postları görüntüleme
- Rapor sebeplerini inceleme
- Post silme veya uyarı gönderme

**Not:** MVP'de rapor sistemi yok, gelecekte eklenecek.

---

## 3. 🛒 Marketplace Moderation (007-marketplace)

### 3.1. Rapor Edilen İlanları Görüntüleme

**Görev:**
- Kullanıcıların rapor ettiği ilanları listeleme
- Rapor sebeplerini inceleme
- İlan detaylarını görüntüleme

**Durumlar:**
- ⏳ **Pending** - Bekleyen raporlar
- ✅ **Reviewed** - İncelenmiş raporlar
- ⚠️ **Action Taken** - İşlem yapılmış raporlar

### 3.2. İlan Moderation

**Görev:**
- Uygunsuz ilanları silme
- İlan sahibine uyarı gönderme
- Rapor durumunu güncelleme

**Özellikler:**
- İlan sahibi bilgilerini görüntüleme
- Rapor geçmişini görüntüleme
- Toplu işlemler (birden fazla ilanı aynı anda silme)

---

## 4. 💼 Career Moderation (008-career-page)

### 4.1. Rapor Edilen İlanları Görüntüleme

**Görev:**
- Kullanıcıların rapor ettiği kariyer ilanlarını listeleme
- Rapor sebeplerini inceleme
- İlan detaylarını görüntüleme

**Durumlar:**
- ⏳ **Pending** - Bekleyen raporlar
- ✅ **Reviewed** - İncelenmiş raporlar
- ⚠️ **Action Taken** - İşlem yapılmış raporlar

### 4.2. İlan Moderation

**Görev:**
- Uygunsuz ilanları silme
- İlan sahibine uyarı gönderme
- Rapor durumunu güncelleme

**Özellikler:**
- İlan sahibi bilgilerini görüntüleme
- Rapor geçmişini görüntüleme
- Toplu işlemler

### 4.3. İlan Oluşturma

**Görev:**
- Adminler de ilan oluşturabilir (rate limiting yok)
- Öğrenciler için faydalı iş ilanlarını paylaşma

**Özellikler:**
- Sınırsız ilan oluşturma (öğrenciler için 5 ilan/gün limiti var)

---

## 5. 🤖 AI Assistant Yönetimi (009-ai-assistant)

### 5.1. System Prompt Düzenleme

**Görev:**
- AI'ın nasıl davranacağını belirleyen system prompt'u düzenleme
- AI'ın platform içi verilere nasıl erişeceğini ayarlama
- AI'ın dilini ve tonunu belirleme

**Özellikler:**
- Rich text editor
- Preview özelliği
- Değişiklik geçmişi (opsiyonel)

### 5.2. Knowledge Base Yönetimi

**Görev:**
- Knowledge base'e yeni cevaplar ekleme
- Mevcut cevapları düzenleme/silme
- Anahtar kelimeler belirleme
- Öncelik sıralaması ayarlama

**Özellikler:**
- CRUD işlemleri (Create, Read, Update, Delete)
- Anahtar kelime arama
- Öncelik bazlı sıralama
- Aktif/Pasif durumu

### 5.3. Rate Limit Ayarları

**Görev:**
- Günlük mesaj limitini ayarlama (varsayılan: 50 mesaj/gün)
- Limitleri kullanıcı bazlı özelleştirme (opsiyonel)

**Özellikler:**
- Global rate limit ayarı
- Kullanıcı bazlı override (gelecek özellik)

### 5.4. İstatistikler

**Görev:**
- AI kullanım istatistiklerini görüntüleme
- Toplam mesaj sayısı
- Aktif kullanıcı sayısı
- En çok sorulan sorular
- Hata oranları

**Özellikler:**
- Grafikler ve tablolar
- Tarih bazlı filtreleme
- Export (CSV/Excel)

---

## 6. 👥 User Management (Yeni Özellik)

### 6.1. Kullanıcı Listesi

**Görev:**
- Tüm kullanıcıları görüntüleme
- Filtreleme (role, durum, üniversite, bölüm)
- Arama (isim, email, username)

**Özellikler:**
- Pagination (20 kullanıcı/sayfa)
- Sıralama (tarih, isim, email)
- Toplu işlemler

### 6.2. Kullanıcı Detayları

**Görev:**
- Kullanıcı profilini görüntüleme
- Kullanıcının aktivitelerini görüntüleme (forum postları, ilanlar, vb.)
- Kullanıcı istatistiklerini görüntüleme

**Özellikler:**
- Profil bilgileri
- Aktivite geçmişi
- İstatistikler (toplam post, ilan, mesaj)

### 6.3. Hesap Yönetimi

**Görev:**
- Hesap askıya alma/aktifleştirme
- Email verification manuel onay
- Hesap silme (soft delete)

**Özellikler:**
- Durum değiştirme (active/inactive)
- Email verification manuel onay
- Soft delete (veriler korunur)

---

## 7. 📧 Contact Messages (011-settings)

### 7.1. İletişim Formu Mesajlarını Görüntüleme

**Görev:**
- Kullanıcıların gönderdiği iletişim formu mesajlarını listeleme
- Mesaj detaylarını görüntüleme
- Mesaj durumunu güncelleme

**Durumlar:**
- 📬 **New** - Yeni mesajlar
- 👁️ **Read** - Okunmuş mesajlar
- ✅ **Replied** - Cevaplanmış mesajlar

**Özellikler:**
- Filtreleme (durum, konu, tarih)
- Arama (mesaj içeriği)
- Email ile cevap verme (dış sistem)

---

## 8. ⚙️ System Settings (Yeni Özellik - Opsiyonel)

### 8.1. Platform Ayarları

**Görev:**
- Platform genel ayarlarını yönetme
- Email ayarları (SMTP)
- Rate limit ayarları (global)
- Platform bakım modu

**Özellikler:**
- Ayarları kaydetme
- Değişiklik geçmişi (opsiyonel)

---

## 📊 Admin Dashboard Özeti

Admin dashboard'da şu bilgiler gösterilir:

### İstatistikler:
- 📊 Bekleyen katkılar (academic)
- 🚩 Rapor edilen içerikler (marketplace, career)
- 📧 Yeni iletişim mesajları
- 👥 Toplam kullanıcı sayısı
- 🤖 AI kullanım istatistikleri

### Hızlı Erişim:
- [📅 Ders Programı Yönetimi]
- [⏰ Akademik Takvim Yönetimi]
- [👥 Bekleyen Katkılar]
- [🚩 Rapor Edilen İçerikler]
- [🤖 AI Assistant Ayarları]
- [👤 Kullanıcı Yönetimi]
- [📧 İletişim Mesajları]

---

## 🔐 Admin Yetkileri

### Tam Yetki:
- ✅ Tüm içeriği görüntüleme
- ✅ Tüm içeriği düzenleme/silme
- ✅ Kullanıcı hesaplarını yönetme
- ✅ Sistem ayarlarını değiştirme
- ✅ AI Assistant yönetimi
- ✅ Akademik veri yönetimi

### Rate Limiting:
- ✅ Adminler için rate limiting yok (sınırsız işlem)
- ✅ Öğrenciler için rate limiting var (her modülde farklı)

---

## 📝 Notlar

1. **MVP Öncelikleri:**
   - Academic contributions onaylama/reddetme (YÜKSEK)
   - AI Assistant yönetimi (YÜKSEK)
   - Forum pin/unpin (ORTA)
   - User management (DÜŞÜK - sonra eklenebilir)
   - System settings (DÜŞÜK - sonra eklenebilir)

2. **Gelecek Özellikler:**
   - Forum rapor sistemi
   - Kullanıcı uyarı sistemi
   - Toplu işlemler
   - Audit log (kim ne yaptı)
   - Email bildirimleri (admin'e)

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026

