# 010 - Profilim Sayfası

## 📋 Genel Bakış

Kullanıcıların profil bilgilerini görüntüleyip düzenleyebilecekleri, platformdaki aktivitelerini (ilanlar, forum mesajları, başvurular) takip edebilecekleri özel sayfa.

---

## 🎯 Amaç

- Kullanıcının temel bilgilerini (username, profil resmi, bio) düzenlemesine izin vermek
- Kullanıcının platformdaki aktivitelerini tek yerden göstermek
- İstatistikleri görselleştirmek

---

## 👥 Kullanıcı Rolleri

- **Öğrenci:** Kendi profilini düzenleyebilir ve istatistiklerini görüntüleyebilir
- **Eğitmen & Admin:** Öğrencilerle aynı profil özelliklerine sahiptir

---

## 🗂️ Sayfa Yapısı

### Layout

Profil sayfası, dashboard layout'undan **farklı bir layout** kullanır:

```
┌───────────────────────────────────────────────────────────────┐
│  📚 KAMPÜS+    🔍 [Ara...]      🔔    💬    👤 (AY) ▼        │  ← Header (sabit)
└───────────────────────────────────────────────────────────────┘

┌──────────────────┬────────────────────────────────────────────┐
│  PROFIL SIDEBAR  │         MAIN CONTENT AREA                  │
│  (240px)         │         (Dinamik içerik)                   │
│                  │                                            │
│  ┌────────────┐  │                                            │
│  │   [Foto]   │  │                                            │
│  │   veya     │  │                                            │
│  │    (AY)    │  │                                            │
│  └────────────┘  │                                            │
│                  │                                            │
│  @ali_yilmaz     │                                            │
│  Ali Yılmaz      │                                            │
│                  │                                            │
│ ━━━━━━━━━━━━━━━━ │                                            │
│                  │                                            │
│ 📊 Profil Bilgi  │  ← Aktif sekme (kalın + arka plan rengi)  │
│ 📝 Hakkımda      │                                            │
│ 🛍️ İlanlarım     │                                            │
│ 💬 Forum         │                                            │
│ 💼 Başvurularım  │                                            │
│                  │                                            │
└──────────────────┴────────────────────────────────────────────┘
```

**Önemli Not:** 
- Dashboard'daki sol sidebar **kaybolur**
- Profil sayfası için **yeni bir sidebar** gösterilir
- Header **sabit kalır** (bildirim, mesaj, profil dropdownları hala erişilebilir)
- URL: `/dashboard/profile`

---

## 📊 1. PROFİL BİLGİ SEKMESİ (Varsayılan)

Kullanıcı profil sayfasına girdiğinde ilk göreceği sekme.

### Görünüm

```
┌─ PROFİL BİLGİLERİM ────────────────────────────────────────┐
│                                                            │
│  ┌─────────┐                                              │
│  │ [Foto]  │  @ali_yilmaz                    [Düzenle]   │
│  │  veya   │                                              │
│  │  (AY)   │  Ali Yılmaz                                  │
│  └─────────┘  Bilgisayar Mühendisliği                     │
│               Konya Gıda ve Tarım Üniversitesi            │
│                                                            │
│  [📷 Profil Resmini Değiştir]                            │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ BİLGİLERİM ───────────────────────────────────────────────┐
│                                                            │
│  Username:          @ali_yilmaz                  [✏️ Düzenle] │
│  Ad Soyad:          Ali Yılmaz                             │
│  Email:             ali.yilmaz@gidatarim.edu.tr           │
│  Üniversite:        Konya Gıda ve Tarım Üniversitesi      │
│  Bölüm:             Bilgisayar Mühendisliği                │
│  Öğrenci Numarası:  123456                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ HAKKIMDA ─────────────────────────────────────────────────┐
│                                                            │
│  Merhaba! 3. sınıf bilgisayar mühendisliği öğrencisiyim. │
│  Web geliştirme ve AI ile ilgileniyorum.                  │
│  React ve Python kullanıyorum. 📧 Projeler için           │
│  iletişime geçebilirsiniz.                                │
│                                                            │
│  [✏️ Düzenle]                                              │
│                                                            │
│  Max 500 karakter                                          │
└────────────────────────────────────────────────────────────┘
```

### Düzenlenebilir Alanlar

#### 1. Profil Resmi
- **Format:** JPG, PNG, WebP
- **Boyut:** Max 2MB
- **Çözünürlük:** Min 200x200px, max 2000x2000px
- **Saklama:** Local storage (MVP), Cloudflare R2 (production)
- **Varsayılan:** Ad ve soyad baş harfleri (`AY`), rastgele arka plan rengi

**Akış:**
1. Kullanıcı "📷 Profil Resmini Değiştir" butonuna tıklar
2. Dosya seçim popup'ı açılır
3. Resim seçilir ve yüklenir (client-side preview)
4. "Kaydet" butonuna basılır
5. Backend'e POST isteği gönderilir
6. Başarılıysa: Resim güncellenir, sidebar'daki foto güncellenir
7. Hatalıysa: Hata mesajı gösterilir (örn: "Dosya çok büyük")

#### 2. Username
- **Format:** Alfanumerik + alt tire (`_`), boşluk yok
- **Uzunluk:** 3-30 karakter
- **Benzersizlik:** Kontrol edilir (başka kullanıcıda olmamalı)
- **Limit:** Ayda 1 kez değiştirilebilir
- **Otomatik oluşturma (kayıt sırasında):** `ad_soyad` formatında (örn: `ali_yilmaz`)
- **Çakışma durumunda:** Sona numara eklenir (örn: `ali_yilmaz2`)

**Validasyon:**
- ✅ Alfanumerik + alt tire
- ✅ 3-30 karakter
- ❌ Boşluk, özel karakter (-, ., vb.) yok
- ❌ Türkçe karakter yok (sadece a-z, 0-9, _)
- ✅ Benzersiz olmalı

**Akış:**
1. Kullanıcı "✏️ Düzenle" butonuna tıklar
2. Input field açılır, mevcut username gösterilir
3. Yeni username girilir (client-side validation)
4. "Kaydet" butonuna basılır
5. Backend'e PATCH isteği gönderilir
6. Başarılıysa: Username güncellenir, sidebar'daki username güncellenir
7. Hatalıysa: Hata mesajı gösterilir
   - "Bu username zaten kullanımda"
   - "Son 30 gün içinde username değiştirdiniz"
   - "Geçersiz karakter"

**Not:** Username DB'de `ali_yilmaz` olarak saklanır, UI'da `@ali_yilmaz` olarak gösterilir.

#### 3. Hakkımda (Bio)
- **Format:** Düz metin (markdown yok)
- **Uzunluk:** Max 500 karakter
- **Varsayılan:** Boş (opsiyonel alan)

**Akış:**
1. Kullanıcı "✏️ Düzenle" butonuna tıklar
2. Textarea açılır (multiline input)
3. Bio girilir (karakter sayacı gösterilir: 245/500)
4. "Kaydet" butonuna basılır
5. Backend'e PATCH isteği gönderilir
6. Başarılıysa: Bio güncellenir
7. Hatalıysa: Hata mesajı gösterilir (örn: "Max 500 karakter")

### Düzenlenemeyen Alanlar

- **Ad Soyad:** Güvenlik nedeniyle sabit (öğrenci kimlik bilgisi)
- **Email:** Ayarlar sayfasından değiştirilebilir
- **Üniversite, Bölüm, Öğrenci No:** Kayıt sırasında girildi, değişmez

---

## 📝 2. HAKKIMDA SEKMESİ

"Profil Bilgi" sekmesindeki "Hakkımda" bölümünün detaylı versiyonu. Ayrı bir sekme olarak gösterilir.

### Görünüm

```
┌─ HAKKIMDA ─────────────────────────────────────────────────┐
│                                                            │
│  Merhaba! 3. sınıf bilgisayar mühendisliği öğrencisiyim. │
│  Web geliştirme ve AI ile ilgileniyorum.                  │
│  React ve Python kullanıyorum.                            │
│                                                            │
│  📧 Projeler için iletişime geçebilirsiniz.               │
│                                                            │
│  [✏️ Düzenle]                                              │
│                                                            │
│  245/500 karakter                                          │
└────────────────────────────────────────────────────────────┘
```

**Not:** "Profil Bilgi" sekmesindeki "Hakkımda" ile aynı içerik. Kullanıcı her iki yerden de düzenleyebilir.

---

## 🛍️ 3. İLANLARIM SEKMESİ

Kullanıcının Pazar'da oluşturduğu tüm ilanları listeler.

### Görünüm

```
┌─ İLANLARIM (12) ───────────────────────────────────────────┐
│                                                            │
│  📊 Özet: 12 ilan, 5 aktif, 4 satıldı, 3 süresi doldu    │
│                                                            │
│  [➕ Yeni İlan Oluştur]                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ 🟢 AKTİF İLANLAR (5) ─────────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📷 [Resim]  Laptop Satılık                         │  │
│  │             Apple MacBook Pro M1                    │  │
│  │             💰 15,000₺                              │  │
│  │             📅 Yayınlandı: 5 gün önce               │  │
│  │             👁️ 127 görüntüleme                      │  │
│  │             💬 8 mesaj                              │  │
│  │                                                     │  │
│  │             [Düzenle] [Satıldı İşaretle] [Sil]     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📷 [Resim]  Matematik Kitabı                       │  │
│  │             Thomas Kalkülüs Cilt 1                  │  │
│  │             💰 200₺                                 │  │
│  │             📅 Yayınlandı: 12 gün önce              │  │
│  │             👁️ 43 görüntüleme                       │  │
│  │             💬 2 mesaj                              │  │
│  │                                                     │  │
│  │             [Düzenle] [Satıldı İşaretle] [Sil]     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (3 ilan daha)                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ 🔴 SATILDI OLARAK İŞARETLENEN (4) ────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📷 [Resim]  Fizik Kitabı                  [SATILDI] │  │
│  │             Serway Fizik 1                          │  │
│  │             💰 150₺                                 │  │
│  │             📅 Satıldı: 3 gün önce                  │  │
│  │             👁️ 68 görüntüleme                       │  │
│  │                                                     │  │
│  │             [Yeniden Aktifleştir] [Sil]            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (3 ilan daha)                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ ⏰ SÜRESİ DOLMUŞ (3) ─────────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📷 [Resim]  Eski Ders Notları         [SÜRESİ DOLDU] │  │
│  │             Veri Yapıları notları                   │  │
│  │             💰 50₺                                  │  │
│  │             📅 Silindi: 2 gün önce (60 gün doldu)   │  │
│  │             👁️ 12 görüntüleme                       │  │
│  │                                                     │  │
│  │             [Yeniden Yayınla]                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (2 ilan daha)                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘

[ 📄 Daha Fazla Yükle ]  ← İlk 20 ilan gösterildi
```

### Özellikler

- **Sıralama:** En yeni ilanlar üstte
- **Kategorizasyon:** Aktif, Satıldı, Süresi Doldu
- **İstatistikler:** Görüntüleme, mesaj sayısı
- **Aksiyonlar:**
  - **Aktif ilanlar:** Düzenle, Satıldı İşaretle, Sil
  - **Satıldı ilanlar:** Yeniden Aktifleştir, Sil
  - **Süresi dolmuş:** Yeniden Yayınla (yeni 60 günlük süre)
- **Pagination:** "Daha Fazla Yükle" butonu (20 ilan/sayfa)

### API Endpoint

- `GET /api/v1/profile/listings?status={active|sold|expired}&page=1&limit=20`

---

## 💬 4. FORUM MESAJLARIM SEKMESİ

Kullanıcının forum'da açtığı konular ve yazdığı cevapları listeler.

### Görünüm

```
┌─ FORUM MESAJLARIM (48) ────────────────────────────────────┐
│                                                            │
│  📊 Özet: 48 mesaj, 12 konu, 36 cevap                     │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ 📌 AÇTIĞIM KONULAR (12) ──────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 💻 [Programlama]                                    │  │
│  │ Python ile web scraping nasıl yapılır?              │  │
│  │                                                     │  │
│  │ 📅 3 gün önce                                       │  │
│  │ 💬 12 cevap                                         │  │
│  │ 👁️ 245 görüntüleme                                  │  │
│  │ ⭐ Son cevap: 2 saat önce (@mehmet_demir)           │  │
│  │                                                     │  │
│  │ [Konuya Git]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📚 [Konya Gıda ve Tarım Üniversitesi]              │  │
│  │ Vize haftası ders programı nasıl olacak?            │  │
│  │                                                     │  │
│  │ 📅 1 hafta önce                                     │  │
│  │ 💬 8 cevap                                          │  │
│  │ 👁️ 156 görüntüleme                                  │  │
│  │ ⭐ Son cevap: 1 gün önce (@ayse_kaya)               │  │
│  │                                                     │  │
│  │ [Konuya Git]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (10 konu daha)                                        │
│                                                            │
│  [ 📄 Daha Fazla Yükle ]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ 📝 YAZDIĞIM CEVAPLAR (36) ────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 💻 [Programlama]                                    │  │
│  │ React'te state management nasıl yapılır?            │  │
│  │                                                     │  │
│  │ ✍️ Cevabım:                                         │  │
│  │ "Redux veya Context API kullanabilirsin.           │  │
│  │  Basit projeler için Context API yeterli..."       │  │
│  │                                                     │  │
│  │ 📅 5 saat önce                                      │  │
│  │ 👍 8 beğeni                                         │  │
│  │                                                     │  │
│  │ [Konuya Git]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (35 cevap daha)                                       │
│                                                            │
│  [ 📄 Daha Fazla Yükle ]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Özellikler

- **Kategorizasyon:** Açtığım Konular, Yazdığım Cevaplar
- **Sıralama:** En yeni mesajlar üstte
- **İstatistikler:** Cevap sayısı, görüntüleme, beğeni (cevaplar için)
- **Aksiyonlar:** "Konuya Git" butonu (forum sayfasına yönlendirir)
- **Pagination:** "Daha Fazla Yükle" butonu (20 mesaj/sayfa)

### API Endpoints

- `GET /api/v1/profile/forum-topics?page=1&limit=20`
- `GET /api/v1/profile/forum-replies?page=1&limit=20`

---

## 💼 5. BAŞVURULARIM SEKMESİ

Kullanıcının kariyer sayfasında yaptığı başvuruları listeler.

### Görünüm

```
┌─ BAŞVURULARIM (15) ────────────────────────────────────────┐
│                                                            │
│  📊 Özet: 15 başvuru                                       │
│      • 4 iş ilanı                                          │
│      • 6 staj ilanı                                        │
│      • 3 startup ekip                                      │
│      • 2 proje partner                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ 📋 İŞ İLANLARI (4) ───────────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Frontend Developer                                  │  │
│  │ ABC Teknoloji A.Ş.                                  │  │
│  │                                                     │  │
│  │ 📍 İstanbul (Uzaktan)                               │  │
│  │ 📅 Başvuru: 5 gün önce                              │  │
│  │ 🔗 Başvuru türü: Harici link                        │  │
│  │                                                     │  │
│  │ [İlana Git] [Başvuruyu Geri Çek]                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (3 ilan daha)                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ 🎓 STAJ İLANLARI (6) ─────────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Backend Stajyer                                     │  │
│  │ XYZ Yazılım A.Ş.                                    │  │
│  │                                                     │  │
│  │ 📍 Konya                                            │  │
│  │ 📅 Başvuru: 2 hafta önce                            │  │
│  │ 🔗 Başvuru türü: Harici link                        │  │
│  │                                                     │  │
│  │ [İlana Git] [Başvuruyu Geri Çek]                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (5 ilan daha)                                         │
│                                                            │
│  [ 📄 Daha Fazla Yükle ]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ 🚀 STARTUP EKİP (3) ──────────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ UI/UX Designer Aranıyor                             │  │
│  │ @mehmet_startup tarafından                          │  │
│  │                                                     │  │
│  │ 📍 Ankara (Uzaktan)                                 │  │
│  │ 📅 Başvuru: 1 hafta önce                            │  │
│  │ 💬 Başvuru türü: Platform içi DM                    │  │
│  │ 📩 Durum: Mesaj gönderildi                          │  │
│  │                                                     │  │
│  │ [İlana Git] [Mesajlaşmaya Git]                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (2 ilan daha)                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ 💻 PROJE PARTNER (2) ─────────────────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Mobil App Geliştirme Projesi                        │  │
│  │ @ayse_dev tarafından                                │  │
│  │                                                     │  │
│  │ 📍 İzmir                                            │  │
│  │ 📅 Başvuru: 3 gün önce                              │  │
│  │ 💬 Başvuru türü: Platform içi DM                    │  │
│  │ 📩 Durum: Cevap alındı                              │  │
│  │                                                     │  │
│  │ [İlana Git] [Mesajlaşmaya Git]                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ... (1 ilan daha)                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Özellikler

- **Kategorizasyon:** İş İlanları, Staj İlanları, Startup Ekip, Proje Partner
- **Sıralama:** En yeni başvurular üstte
- **Başvuru Türleri:**
  - **Harici link:** Kullanıcı dış siteye yönlendirildi
  - **Platform içi DM:** Kullanıcı ilan sahibine DM gönderdi
- **Aksiyonlar:**
  - "İlana Git" (kariyer sayfasına yönlendirir)
  - "Başvuruyu Geri Çek" (sadece harici link başvuruları için, kayıt silinir)
  - "Mesajlaşmaya Git" (DM sayfasına yönlendirir)
- **Pagination:** "Daha Fazla Yükle" butonu (20 başvuru/sayfa)

### API Endpoint

- `GET /api/v1/profile/applications?type={job|internship|startup|project}&page=1&limit=20`

---

## 🗄️ Database Değişiklikleri

### `users` Tablosuna Eklenmesi Gerekenler

```sql
-- Username sistemi
username VARCHAR(50) UNIQUE NOT NULL,
username_last_changed_at TIMESTAMP DEFAULT NULL,

-- Profil bilgileri
profile_picture_url VARCHAR(255) DEFAULT NULL,
bio TEXT DEFAULT NULL,

-- Timestamps
updated_at TIMESTAMP DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
```

**Not:** Mevcut kullanıcılar için username otomatik oluşturulmalı (migration script ile).

---

## 🔌 API Endpoints

### Profil Bilgi

#### `GET /api/v1/profile/me`
Kullanıcının kendi profil bilgilerini döner.

**Response:**
```json
{
  "id": 123,
  "username": "ali_yilmaz",
  "first_name": "Ali",
  "last_name": "Yılmaz",
  "email": "ali.yilmaz@gidatarim.edu.tr",
  "university": "Konya Gıda ve Tarım Üniversitesi",
  "department": "Bilgisayar Mühendisliği",
  "student_number": "123456",
  "profile_picture_url": "/uploads/profiles/123.jpg",
  "bio": "Merhaba! 3. sınıf bilgisayar mühendisliği öğrencisiyim...",
  "username_last_changed_at": "2025-12-05T10:30:00Z",
  "created_at": "2024-09-01T08:00:00Z"
}
```

#### `PATCH /api/v1/profile/username`
Username'i günceller.

**Request:**
```json
{
  "username": "ali_yilmaz_new"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Username başarıyla güncellendi",
  "username": "ali_yilmaz_new",
  "next_change_allowed_at": "2026-02-01T10:30:00Z"
}
```

**Errors:**
- `400`: "Username zaten kullanımda"
- `400`: "Son 30 gün içinde username değiştirdiniz. Bir sonraki değişiklik: 2026-02-01"
- `400`: "Geçersiz username formatı"
- `429`: Rate limit (3 deneme/dakika)

#### `POST /api/v1/profile/picture`
Profil resmini yükler.

**Request:** Multipart form-data
```
file: [binary]
```

**Response:**
```json
{
  "success": true,
  "message": "Profil resmi başarıyla yüklendi",
  "profile_picture_url": "/uploads/profiles/123.jpg"
}
```

**Errors:**
- `400`: "Dosya çok büyük (max 2MB)"
- `400`: "Geçersiz dosya formatı (JPG, PNG, WebP)"
- `400`: "Geçersiz görüntü boyutu (min 200x200px)"

#### `DELETE /api/v1/profile/picture`
Profil resmini siler (varsayılana döner).

**Response:**
```json
{
  "success": true,
  "message": "Profil resmi silindi"
}
```

#### `PATCH /api/v1/profile/bio`
Bio'yu günceller.

**Request:**
```json
{
  "bio": "Merhaba! Yeni bio yazım..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bio başarıyla güncellendi"
}
```

**Errors:**
- `400`: "Bio max 500 karakter olabilir"

### İstatistikler

#### `GET /api/v1/profile/listings?status={active|sold|expired}&page=1&limit=20`
Kullanıcının ilanlarını listeler.

**Response:**
```json
{
  "total": 12,
  "page": 1,
  "limit": 20,
  "has_more": false,
  "listings": [
    {
      "id": 456,
      "title": "Laptop Satılık",
      "description": "Apple MacBook Pro M1...",
      "price": 15000,
      "category": "Elektronik",
      "status": "active",
      "image_urls": ["/uploads/listings/456_1.jpg"],
      "view_count": 127,
      "message_count": 8,
      "created_at": "2025-12-28T10:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/profile/forum-topics?page=1&limit=20`
Kullanıcının açtığı forum konularını listeler.

**Response:**
```json
{
  "total": 12,
  "page": 1,
  "limit": 20,
  "has_more": false,
  "topics": [
    {
      "id": 789,
      "category_id": 5,
      "category_name": "Programlama",
      "title": "Python ile web scraping nasıl yapılır?",
      "reply_count": 12,
      "view_count": 245,
      "last_reply_at": "2026-01-02T10:00:00Z",
      "last_reply_by": "mehmet_demir",
      "created_at": "2025-12-30T08:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/profile/forum-replies?page=1&limit=20`
Kullanıcının yazdığı forum cevaplarını listeler.

**Response:**
```json
{
  "total": 36,
  "page": 1,
  "limit": 20,
  "has_more": true,
  "replies": [
    {
      "id": 1011,
      "topic_id": 800,
      "topic_title": "React'te state management nasıl yapılır?",
      "category_name": "Programlama",
      "content": "Redux veya Context API kullanabilirsin...",
      "like_count": 8,
      "created_at": "2026-01-02T05:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/profile/applications?type={job|internship|startup|project}&page=1&limit=20`
Kullanıcının başvurularını listeler.

**Response:**
```json
{
  "total": 15,
  "page": 1,
  "limit": 20,
  "has_more": false,
  "applications": [
    {
      "id": 1213,
      "listing_id": 500,
      "listing_title": "Frontend Developer",
      "listing_type": "job",
      "company_name": "ABC Teknoloji A.Ş.",
      "location": "İstanbul",
      "application_type": "external",
      "applied_at": "2025-12-28T10:00:00Z"
    },
    {
      "id": 1214,
      "listing_id": 501,
      "listing_title": "UI/UX Designer Aranıyor",
      "listing_type": "startup",
      "posted_by": "mehmet_startup",
      "location": "Ankara",
      "application_type": "dm",
      "dm_status": "sent",
      "applied_at": "2025-12-26T12:00:00Z"
    }
  ]
}
```

---

## 🎨 Frontend Routing

### URL Yapısı

```
/dashboard/profile             → Profil Bilgi (varsayılan)
/dashboard/profile/about       → Hakkımda
/dashboard/profile/listings    → İlanlarım
/dashboard/profile/forum       → Forum Mesajlarım
/dashboard/profile/applications → Başvurularım
```

### State Management

**Active Tab State:**
```typescript
const [activeTab, setActiveTab] = useState<ProfileTab>('info');

type ProfileTab = 'info' | 'about' | 'listings' | 'forum' | 'applications';
```

**Sidebar Component:**
```tsx
<ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} />
```

### SPA Navigasyon

- Sidebar'daki sekmelere tıklandığında sayfa yenilenmez
- URL güncelenir (React Router)
- İçerik dinamik olarak değişir
- Header sabit kalır

---

## 🔒 Güvenlik

### Rate Limiting

- **Username değiştirme:** 3 deneme/dakika
- **Profil resmi yükleme:** 5 yükleme/saat

### Yetkilendirme

- Kullanıcı sadece **kendi profilini** düzenleyebilir
- Başka kullanıcıların profillerini görüntüleyemez (MVP'de profil görüntüleme yok)
- JWT token ile authentication

### Validasyon

- **Client-side:** Hızlı feedback için (regex, uzunluk kontrolü)
- **Server-side:** Güvenlik için (benzersizlik, format kontrolü)

---

## 📱 Responsive Tasarım

### Desktop (>1024px)
- Sidebar: 240px sabit
- Main content: Kalan alan
- Header: Full width

### Tablet (768px - 1024px)
- Sidebar: 200px
- Main content: Kalan alan
- Bazı istatistikler yan yana (2 sütun)

### Mobile (<768px)
- Sidebar: Hamburger menü (drawer)
- Main content: Full width
- Sekmeler: Alt alta liste
- İstatistikler: Tek sütun

---

## 🎯 Başarı Kriterleri

1. ✅ Kullanıcı profil bilgilerini düzenleyebilmeli (username, resim, bio)
2. ✅ Kullanıcı istatistiklerini görüntüleyebilmeli (ilanlar, forum, başvurular)
3. ✅ Username benzersiz olmalı ve 30 günde 1 kez değiştirilebilmeli
4. ✅ Profil resmi yükleme işlemi sorunsuz çalışmalı (max 2MB, 3 format)
5. ✅ "Daha Fazla Yükle" butonu ile pagination çalışmalı
6. ✅ Sayfa yüklenme süresi < 2 saniye
7. ✅ Mobile responsive tasarım

---

## 🚀 Tahmini Geliştirme Süresi

**Toplam:** 5-6 gün

- **Backend (Database + API):** 2-3 gün
- **Frontend (UI + State Management):** 2-3 gün
- **Test + Hata Düzeltme:** 0.5 gün

---

## 📝 Notlar ve Gelecek Geliştirmeler

### MVP Kapsamında:
- ✅ Profil düzenleme (username, resim, bio)
- ✅ İstatistikler (ilanlar, forum, başvurular)
- ✅ "Daha Fazla Yükle" pagination

### MVP Sonrası:
- ⏳ Profil görüntüleme (diğer kullanıcıların profilleri)
- ⏳ Rozetler ve başarılar
- ⏳ Profil tamamlama çubuğu

### Teknik Borç:
- Profil resmi yükleme için Cloudflare R2 entegrasyonu (production'da)
- Username değiştirme rate limiting güçlendirilmeli (spam önleme)

---

**Versiyon:** 1.0  
**Son Güncelleme:** 2 Ocak 2026  
**Durum:** Spec Tamamlandı, Backend ve Frontend Development Bekliyor

