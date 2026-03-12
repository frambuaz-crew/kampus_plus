# 006 - Akademik Özellikler (Ders Programı + Akademik Takvim)

## 📋 Genel Bakış

Akademik Özellikler, öğrencilerin ders programlarını ve üniversitelerinin akademik takvimini görüntüleyebildiği, admin'in bu verileri yönettiği ve öğrencilerin de katkıda bulunabildiği bir modüldür.

### 🎯 Amaç
- Öğrencilere ders programlarını kolayca göstermek
- Akademik takvim etkinliklerini (sınav, kayıt, tatil) hatırlatmak
- Crowd-sourced + Admin-moderated veri toplama
- Üniversite ve bölüm bazlı veri yönetimi

### 👥 Hedef Kullanıcı
- **Öğrenciler:** Ders programı ve akademik takvimi görüntüler, katkıda bulunur
- **Admin:** Verileri yükler, öğrenci katkılarını onaylar/reddeder

### 🔑 Core Değer
"Akademik hayatı organize etmek ve öğrenciler arası bilgi paylaşımını teşvik etmek"

---

## 📊 İki Ana Özellik

### **1. 📅 Ders Programım (Course Schedule)**
- Haftalık ders programı
- Bölüm ve sınıf bazlı
- Ders adı, saat, salon, hoca bilgileri
- Haftalık grid veya liste görünümü

### **2. ⏰ Akademik Takvim (Academic Calendar)**
- Üniversite geneli akademik takvim
- Sınav tarihleri, kayıt dönemleri, tatiller
- Yaklaşan etkinlikler (renk kodlu)
- Tarih bazlı

---

## 🗂️ Veri Yönetim Modeli

### **Hibrit Yaklaşım:**

```
┌─ VERİ KAYNAKLARI ─────────────────────────────┐
│                                                │
│  1️⃣ Admin Upload (Resmi Veriler)              │
│     • PDF/Excel yükleme                        │
│     • Manuel girdi                             │
│     • Öncelikli kaynak                         │
│                                                │
│  2️⃣ Öğrenci Katkısı (Community-Sourced)       │
│     • PDF/Resim yükleme                        │
│     • Manuel girdi                             │
│     • Admin onayı gerekir                      │
│                                                │
│  3️⃣ Boş Durum (Veri Yok)                      │
│     • "Henüz veri yok" mesajı                  │
│     • "Katkıda bulun" butonu                   │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 📅 BÖLÜM 1: DERS PROGRAMI

### 1.1. Ders Programı Ana Sayfası

```
┌─ 📅 DERS PROGRAMIM ────────────────────────────────────┐
│                                                        │
│  Moleküler Biyoloji ve Genetik - 1. Sınıf (Dönem 1)   │
│  2025-2026 Güz Dönemi                                  │
│                                                        │
│  [📅 Haftalık] [📋 Liste] [🎨 Renkler] [📄 PDF İndir] │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 1.2. Haftalık Görünüm (Grid View)

```
┌─ HAFTALIK DERS PROGRAMI ──────────────────────────────────────┐
│                                                                │
│  ┌──────┬───────────────────────────────────────────────────┐ │
│  │      │ Pzt    Sal    Çar    Per    Cum    Cmt    Paz    │ │
│  ├──────┼───────────────────────────────────────────────────┤ │
│  │09:00 │      │       │ 🟦 Eng│       │       │       │    │ │
│  │      │      │       │ MB114 │       │       │       │    │ │
│  ├──────┼───────────────────────────────────────────────────┤ │
│  │10:00 │🟩 Bio│🟨 Chem│       │🟪 Prog│🟧 Phys│       │    │ │
│  │      │MB120 │MB350  │       │MB117  │MB117  │       │    │ │
│  ├──────┼───────────────────────────────────────────────────┤ │
│  │11:00 │      │       │       │       │       │       │    │ │
│  ├──────┼───────────────────────────────────────────────────┤ │
│  │12:00 │      │       │       │       │       │       │    │ │
│  ├──────┼───────────────────────────────────────────────────┤ │
│  │13:00 │      │🟨 Lab │       │       │       │       │    │ │
│  │      │      │MB218  │       │       │       │       │    │ │
│  ├──────┼───────────────────────────────────────────────────┤ │
│  │14:00 │🟩 Lab│       │       │🟧 Math│🟧 Lab │       │    │ │
│  │      │MB119 │       │       │MB-215 │       │       │    │ │
│  ├──────┼───────────────────────────────────────────────────┤ │
│  │15:00 │      │       │🔷 Sos │       │       │       │    │ │
│  │      │      │       │MB350  │       │       │       │    │ │
│  └──────┴───────────────────────────────────────────────────┘ │
│                                                                │
│  ℹ️ Çarşamba 13:00-15:00: Üniversite etkinlikleri             │
└────────────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Her ders farklı renk ile gösterilir
- Ders kodu kısaltılır (uzunsa)
- Tıklayınca ders detayı popup açılır
- Boş slotlar beyaz/gri

### 1.3. Liste Görünümü (List View)

```
┌─ DERS PROGRAMI (Liste) ───────────────────────────────┐
│                                                        │
│  📅 Pazartesi                                          │
│  ├─ 10:00-10:45  🟩 Biology                           │
│  │  📍 MB120 • Prof. Dr. Ahmet Yılmaz                 │
│  │  📚 GENE1001                                        │
│  │                                                    │
│  └─ 14:00-14:45  🟩 Biology Laboratory                │
│     📍 MB119-120 • Lab Asistanı                       │
│     📚 GENE1001                                        │
│                                                        │
│  📅 Salı                                               │
│  ├─ 10:00-10:45  🟨 Chemistry-I                       │
│  │  📍 MB350 • Dr. Öğr. Üyesi Zeynep Kaya            │
│  │  📚 FANS1005                                        │
│  │                                                    │
│  └─ 13:00-13:45  🟨 Chemistry-I LAB.                  │
│     📍 MB218 • Lab Asistanı                           │
│     📚 FANS1005                                        │
│                                                        │
│  📅 Çarşamba                                           │
│  ├─ 09:00-09:45  🟦 Academic English I                │
│  │  📍 MB114 • Öğr. Gör. İngilizce Hocası            │
│  │  📚 FLED1001                                        │
│  │                                                    │
│  └─ 15:00-15:45  🔷 Social Responsibility             │
│     📍 MB350 • Dr. Öğr. Üyesi Sosyal Hoca            │
│     📚 FANS1009                                        │
│                                                        │
│  ... (Perşembe, Cuma)                                  │
│                                                        │
│  📊 Toplam: 18 ders/hafta • 27 saat                   │
└────────────────────────────────────────────────────────┘
```

### 1.4. Ders Detay Popup

Ders kartına tıklandığında:

```
┌─ DERS DETAYI ──────────────────────────────────────────┐
│                                                        │
│  🟩 Biology                                            │
│  GENE1001                                              │
│                                                        │
│  ──────────────────────────────────────                │
│                                                        │
│  📅 Pazartesi                                          │
│  ⏰ 10:00 - 10:45                                      │
│  📍 MB120                                              │
│  👨‍🏫 Prof. Dr. Ahmet Yılmaz                           │
│                                                        │
│  ──────────────────────────────────────                │
│                                                        │
│  📝 Notlar: (Opsiyonel, öğrenci ekleyebilir)          │
│  [Not ekle...]                                         │
│                                                        │
│                          [✕ Kapat]                     │
└────────────────────────────────────────────────────────┘
```

### 1.5. Boş Durum (Veri Yok)

```
┌─ 📅 DERS PROGRAMIM ────────────────────────────────────┐
│                                                        │
│              📭                                        │
│                                                        │
│         Henüz Veri Yok                                 │
│                                                        │
│  Üniversitenizin (Selçuk Üniversitesi)                 │
│  ders programı verilerine henüz erişemedik.            │
│                                                        │
│  📝 Kısa süre içinde eklenecek!                        │
│                                                        │
│  ────────────────────────────────────                  │
│                                                        │
│  💡 Katkıda Bulunun:                                   │
│                                                        │
│  Ders programınızı bizimle paylaşarak                  │
│  diğer öğrencilere yardımcı olabilirsiniz!             │
│                                                        │
│  • Üniversitenizden aldığınız resmi ders               │
│    programı PDF'ini yükleyin                           │
│  • Veya manuel olarak ders bilgilerini girin           │
│                                                        │
│  [📤 PDF/Resim Yükle]  [✏️ Manuel Gir]                 │
│                                                        │
│  ✅ Kontrol edildikten sonra tüm sınıf                 │
│     arkadaşlarınız görebilecek!                        │
└────────────────────────────────────────────────────────┘
```

---

## ⏰ BÖLÜM 2: AKADEMİK TAKVİM

### 2.1. Akademik Takvim Ana Sayfası

```
┌─ ⏰ AKADEMİK TAKVİM ───────────────────────────────────┐
│                                                        │
│  🎓 Konya Gıda ve Tarım Üniversitesi                   │
│  📆 2025-2026 Eğitim-Öğretim Yılı                      │
│                                                        │
│  [🔽 Filtre: Tüm Etkinlikler ▼]  [📄 PDF İndir]       │
│  [🗓️ Aylık] [📋 Liste]                                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 2.2. Liste Görünümü

```
┌─ AKADEMİK TAKVİM (Liste) ──────────────────────────────┐
│                                                        │
│  ── GÜZ DÖNEMİ 2025 ──                                 │
│                                                        │
│  📌 Ders Kayıtları                                     │
│     8-12 Eylül 2025 (Pazartesi-Cuma)                   │
│     ⏰ 5 gün sürecek                                    │
│     🏷️ Kayıt                                           │
│                                                        │
│  📌 Dersler Başlangıç                                  │
│     15 Eylül 2025 (Pazartesi)                          │
│     🏷️ Ders                                            │
│                                                        │
│  📌 Ders Ekleme/Bırakma                                │
│     29 Eylül - 3 Ekim 2025                             │
│     🏷️ Kayıt                                           │
│                                                        │
│  📌 Cumhuriyet Bayramı Tatili 🎉                       │
│     28-29 Ekim 2025 (Salı-Çarşamba)                    │
│     🏷️ Tatil                                           │
│                                                        │
│  🔴 Ara Sınav Haftası 📝 (3 gün kaldı)                 │
│     8-16 Kasım 2025 (Cumartesi-Pazar)                  │
│     🏷️ Sınav                                           │
│                                                        │
│  🟡 Dersten Çekilme Son Gün (12 gün kaldı)             │
│     31 Ekim 2025 (Cuma)                                │
│     🏷️ Son Tarih                                       │
│                                                        │
│  📌 Yarıyıl Sonu Sınavları 📝                          │
│     5-16 Ocak 2026 (Pazartesi-Cuma)                    │
│     🏷️ Sınav                                           │
│                                                        │
│  📌 Bütünleme Sınavları 📝                             │
│     24-30 Ocak 2026 (Cumartesi-Cuma)                   │
│     🏷️ Sınav                                           │
│                                                        │
│  ── BAHAR DÖNEMİ 2026 ──                               │
│                                                        │
│  📌 Ders Kayıtları                                     │
│     2-6 Şubat 2026 (Pazartesi-Cuma)                    │
│     🏷️ Kayıt                                           │
│                                                        │
│  ... (devam)                                           │
└────────────────────────────────────────────────────────┘
```

**Renk Kodları:**
- 🔴 Kırmızı: 0-7 gün kaldı (acil)
- 🟡 Sarı: 8-30 gün kaldı (yakın)
- 🟢 Yeşil: 30+ gün kaldı (uzak)
- ⚪ Beyaz: Geçmiş etkinlikler (gri tonlu)

### 2.3. Aylık Görünüm (Calendar View)

```
┌─ AKADEMİK TAKVİM (Aylık) ──────────────────────────────┐
│                                                        │
│  [◀ Ekim]    Kasım 2025    [Aralık ▶]                  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Pzt  Sal  Çar  Per  Cum  Cmt  Paz               │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                         1    2                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  3    4    5    6    7    8    9               │  │
│  │                        🔴📝  🔴📝               │  │
│  │                        Ara   Ara                │  │
│  │                        Sınav Sınav              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 10   11   12   13   14   15   16               │  │
│  │ 🔴📝 🔴📝 🔴📝 🔴📝 🔴📝 🔴📝 🔴📝              │  │
│  │ Ara  Ara  Ara  Ara  Ara  Ara  Ara              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 17   18   19   20   21   22   23               │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 24   25   26   27   28   29   30               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  • Tıklayınca o günün etkinlikleri gösterilir          │
└────────────────────────────────────────────────────────┘
```

### 2.4. Filtreler

```
[🔽 Filtre: Tüm Etkinlikler ▼]
  ┌─────────────────────────┐
  │ ✓ Tüm Etkinlikler       │
  │   Sadece Sınavlar       │
  │   Sadece Kayıtlar       │
  │   Sadece Tatiller       │
  │   Sadece Son Tarihler   │
  └─────────────────────────┘
```

### 2.5. Boş Durum (Veri Yok)

```
┌─ ⏰ AKADEMİK TAKVİM ───────────────────────────────────┐
│                                                        │
│              ⏰                                         │
│                                                        │
│         Henüz Veri Yok                                 │
│                                                        │
│  Üniversitenizin akademik takvim verilerine            │
│  henüz erişemedik.                                     │
│                                                        │
│  📝 Resmi takvim yayınlandığında eklenecek!            │
│                                                        │
│  ────────────────────────────────────────              │
│                                                        │
│  💡 Katkıda Bulunun:                                   │
│                                                        │
│  Üniversitenizin resmi akademik takvimini              │
│  bizimle paylaşarak diğer öğrencilere                  │
│  yardımcı olabilirsiniz!                               │
│                                                        │
│  • Üniversitenizin web sitesinden akademik             │
│    takvim PDF'ini indirip yükleyin                     │
│  • Veya önemli tarihleri manuel girin                  │
│                                                        │
│  [📤 PDF Yükle]  [✏️ Manuel Gir]                       │
│                                                        │
│  ✅ Kontrol edildikten sonra tüm üniversite            │
│     öğrencileri görebilecek!                           │
└────────────────────────────────────────────────────────┘
```

---

## 📤 BÖLÜM 3: ÖĞRENCİ KATKISI SİSTEMİ

### 3.1. Katkı Modalı (Ders Programı)

```
┌─ 📤 DERS PROGRAMI PAYLAŞ ──────────────────────────────┐
│                                                        │
│  Bilgileriniz otomatik dolduruldu:                     │
│  🎓 Üniversite: Selçuk Üniversitesi                    │
│  📚 Bölüm: Bilgisayar Mühendisliği                     │
│                                                        │
│  Sınıf/Dönem: *                                        │
│  [2. Sınıf (3. Dönem) ▼]                               │
│                                                        │
│  Akademik Yıl: *                                       │
│  [2025-2026 Güz ▼]                                     │
│                                                        │
│  ──────────────────────────────────────                │
│                                                        │
│  Seçenek 1: PDF/Resim Yükle 📄                         │
│                                                        │
│  Üniversitenizden aldığınız ders programı              │
│  PDF'ini veya ekran görüntüsünü yükleyin:              │
│                                                        │
│  [📎 Dosya Seç...]  (Max 10 MB, PDF/JPG/PNG)          │
│                                                        │
│  ── Veya ──                                            │
│                                                        │
│  Seçenek 2: Manuel Gir ✏️                              │
│                                                        │
│  Dersleri tek tek girmek isterseniz:                   │
│                                                        │
│  [+ Ders Ekle]                                         │
│                                                        │
│  ──────────────────────────────────────                │
│                                                        │
│  ℹ️ Bilgilendirme:                                     │
│  • Yüklediğiniz veriler yöneticilerimiz                │
│    tarafından kontrol edilecek                         │
│  • Onaylandıktan sonra tüm sınıf                       │
│    arkadaşlarınız görebilecek                          │
│  • Katkınız için çok teşekkürler! 🙏                   │
│                                                        │
│  [❌ İptal]  [✅ Gönder]                                │
└────────────────────────────────────────────────────────┘
```

### 3.2. Manuel Ders Ekleme Formu

```
┌─ ✏️ DERS EKLE ─────────────────────────────────────────┐
│                                                        │
│  Ders Kodu:                                            │
│  [CENG2001]                                            │
│                                                        │
│  Ders Adı: *                                           │
│  [Veri Yapıları ve Algoritmalar]                       │
│                                                        │
│  Öğretim Görevlisi:                                    │
│  [Prof. Dr. Ahmet Yılmaz]                              │
│                                                        │
│  Gün: *                                                │
│  [Pazartesi ▼]                                         │
│                                                        │
│  Başlangıç Saati: *                                    │
│  [09:00 ▼]                                             │
│                                                        │
│  Bitiş Saati: *                                        │
│  [10:45 ▼]                                             │
│                                                        │
│  Salon:                                                │
│  [A-201]                                               │
│                                                        │
│  ☐ Laboratuvar Dersi                                   │
│                                                        │
│  [❌ İptal]  [✅ Ekle]  [+ Başka Ders Ekle]            │
└────────────────────────────────────────────────────────┘
```

### 3.3. Gönderim Sonrası (Pending Durumu)

```
┌─ 📅 DERS PROGRAMIM ────────────────────────────────────┐
│                                                        │
│  ⏳ Katkınız Gözden Geçiriliyor...                     │
│                                                        │
│  Teşekkürler! 🙏                                       │
│                                                        │
│  Yöneticilerimiz ders programınızı kontrol ediyor.    │
│  Onaylandığında otomatik olarak gösterilecek ve        │
│  tüm sınıf arkadaşlarınız görebilecek.                 │
│                                                        │
│  ── Gönderdiğiniz Bilgiler: ──                         │
│  📄 ders_programi.pdf (2 MB)                           │
│  📅 2. Sınıf - 2025-2026 Güz                           │
│  🕐 15 Ocak 2026 14:30'da gönderildi                   │
│                                                        │
│  Durum: ⏳ İnceleniyor                                 │
│                                                        │
│  📧 Onaylandığında bildirim alacaksınız.               │
└────────────────────────────────────────────────────────┘
```

### 3.4. Onaylandı Durumu

```
┌─ 📅 DERS PROGRAMIM ────────────────────────────────────┐
│                                                        │
│  ✅ Katkınız Onaylandı!                                │
│                                                        │
│  Tebrikler! Paylaştığınız ders programı onaylandı.    │
│  Şimdi tüm sınıf arkadaşlarınız görebiliyor.           │
│                                                        │
│  Katkınız için çok teşekkürler! 🙏                     │
│                                                        │
│  [📅 Programı Gör]                                     │
└────────────────────────────────────────────────────────┘

[Haftalık ders programı gösterilir...]

┌─ Bilgilendirme ────────────────────────────────────────┐
│ ℹ️ Bu veriler Ali Yılmaz tarafından paylaşıldı.       │
│    Teşekkürler! 🙏                                     │
└────────────────────────────────────────────────────────┘
```

### 3.5. Reddedildi Durumu

```
┌─ 📅 DERS PROGRAMIM ────────────────────────────────────┐
│                                                        │
│  ❌ Katkınız Reddedildi                                │
│                                                        │
│  Üzgünüz, gönderdiğiniz ders programı onaylanamadı.   │
│                                                        │
│  Sebep:                                                │
│  "Yüklenen PDF okunamıyor. Lütfen daha net bir        │
│   fotoğraf veya PDF yükleyin. Ayrıca 2025-2026 Güz    │
│   dönemi için program yüklemelisiniz."                 │
│                                                        │
│  ── Gönderdiğiniz: ──                                  │
│  📄 ders_programi.pdf (2 MB)                           │
│  📅 2. Sınıf - 2025-2026 Güz                           │
│  🕐 15 Ocak 2026 14:30                                 │
│                                                        │
│  [📤 Tekrar Dene]  [✕ Kapat]                           │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ BÖLÜM 4: ADMİN PANELİ

### 4.1. Admin Dashboard

```
┌─ ADMİN PANELİ ─────────────────────────────────────────┐
│                                                        │
│  Hoşgeldin, Admin!                                     │
│                                                        │
│  ┌─ İstatistikler ─────────────────────────────────┐  │
│  │ 📊 12 bekleyen katkı                            │  │
│  │ ✅ 45 onaylanmış veri                           │  │
│  │ 🎓 8 üniversite için veri var                   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  [📅 Ders Programı Yönetimi]                           │
│  [⏰ Akademik Takvim Yönetimi]                         │
│  [👥 Bekleyen Katkılar (12)]                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 4.2. Ders Programı Yönetimi (Admin)

```
┌─ DERS PROGRAMI YÖNETİMİ ───────────────────────────────┐
│                                                        │
│  [+ Yeni Ders Programı Ekle]                           │
│                                                        │
│  ── Mevcut Ders Programları: ──                        │
│                                                        │
│  🎓 Konya Gıda ve Tarım Üniversitesi                   │
│  ├─ Moleküler Biyoloji ve Genetik                     │
│  │  ├─ 1. Sınıf (Dönem 1) ✅ 2025-2026 Güz           │
│  │  ├─ 1. Sınıf (Dönem 2) ⏳ Veri Yok                │
│  │  ├─ 3. Sınıf (Dönem 5) ✅ 2025-2026 Güz           │
│  │  └─ ... (diğer dönemler)                          │
│  │                                                    │
│  └─ Psikoloji                                          │
│     ├─ 1. Sınıf (Dönem 1) ⏳ Veri Yok                 │
│     └─ ... (diğer dönemler)                           │
│                                                        │
│  🎓 Selçuk Üniversitesi                                │
│  ├─ Bilgisayar Mühendisliği                           │
│  │  ├─ 2. Sınıf (Dönem 3) ⏳ Veri Yok                │
│  │  └─ ...                                            │
│  │                                                    │
│  └─ ...                                                │
└────────────────────────────────────────────────────────┘
```

### 4.3. Yeni Ders Programı Ekleme (Admin)

```
┌─ + DERS PROGRAMI EKLE ─────────────────────────────────┐
│                                                        │
│  Üniversite: *                                         │
│  [Konya Gıda ve Tarım Üniversitesi ▼]                 │
│                                                        │
│  Bölüm: *                                              │
│  [Moleküler Biyoloji ve Genetik ▼]                     │
│                                                        │
│  Sınıf/Dönem: *                                        │
│  [1. Sınıf (Dönem 1) ▼]                                │
│                                                        │
│  Akademik Yıl: *                                       │
│  [2025-2026 ▼]                                         │
│                                                        │
│  Dönem: *                                              │
│  [○ Güz  ○ Bahar]                                      │
│                                                        │
│  ──────────────────────────────────────                │
│                                                        │
│  Seçenek 1: PDF Yükle 📄                               │
│  [📎 Dosya Seç...]  [Yükle ve Parse Et]               │
│                                                        │
│  Seçenek 2: Excel/CSV İçe Aktar                        │
│  [📊 Dosya Seç...]  [İçe Aktar]                        │
│                                                        │
│  Seçenek 3: Manuel Gir                                 │
│  [+ Ders Ekle]                                         │
│                                                        │
│  ──────────────────────────────────────                │
│                                                        │
│  [❌ İptal]  [💾 Kaydet]                               │
└────────────────────────────────────────────────────────┘
```

### 4.4. Bekleyen Katkılar Sayfası

```
┌─ 👥 BEKLEYEN KATKILAR (12) ────────────────────────────┐
│                                                        │
│  [🔽 Tümü ▼] [🔽 Ders Programı ▼] [🔍 Ara...]         │
│                                                        │
│  ┌─ Katkı #1 ──────────────────────────────────────┐  │
│  │                                                  │  │
│  │  👤 Ali Yılmaz (ali.yilmaz@selcuk.edu.tr)       │  │
│  │  🎓 Selçuk Üni - Bilgisayar Müh. - 2. Sınıf     │  │
│  │  📅 2025-2026 Güz Dönemi                         │  │
│  │  🕐 15 Ocak 2026 14:30                           │  │
│  │                                                  │  │
│  │  📦 Veri Tipi: Ders Programı                     │  │
│  │  📄 ders_programi.pdf (2 MB)                     │  │
│  │                                                  │  │
│  │  [👁️ Önizle] [📥 İndir]                          │  │
│  │  [✅ Onayla] [❌ Reddet] [✏️ Düzenle]             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Katkı #2 ──────────────────────────────────────┐  │
│  │  👤 Ayşe Kaya (ayse.kaya@ktun.edu.tr)           │  │
│  │  🎓 KTÜN - Yazılım Müh. - 3. Sınıf               │  │
│  │  📅 Akademik Takvim 2025-2026                    │  │
│  │  🕐 14 Ocak 2026 09:15                           │  │
│  │  [✅ Onayla] [❌ Reddet]                          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ... (diğer katkılar)                                  │
└────────────────────────────────────────────────────────┘
```

### 4.5. Katkı Önizleme ve Onaylama

```
┌─ 👁️ KATKI ÖNİZLE VE ONAYLA ───────────────────────────┐
│                                                        │
│  Katkı #1: Ders Programı                              │
│  👤 Ali Yılmaz - Selçuk Üni - Bilgisayar Müh. 2       │
│                                                        │
│  ── PDF Önizlemesi: ──                                 │
│  [PDF görüntüleyici burada gösterilir]                │
│                                                        │
│  ── Parse Edilen Veriler: ──                           │
│  (Admin kontrol edip düzeltebilir)                     │
│                                                        │
│  ✅ Pazartesi 09:00-10:45 - Veri Yapıları (A-201)      │
│  ✅ Pazartesi 11:00-12:45 - Algoritma (B-105)          │
│  ✅ Salı 10:00-11:45 - Veritabanı (C-302)              │
│  ... (toplam 18 ders)                                  │
│                                                        │
│  [✏️ Düzenle]  [+ Ders Ekle]  [🗑️ Ders Sil]           │
│                                                        │
│  ────────────────────────────────────────              │
│                                                        │
│  Bu onaylandığında:                                    │
│  • Selçuk Üni - Bilgisayar Müh. 2. sınıf              │
│    öğrencilerinin hepsi görebilecek (yaklaşık 120 kişi)│
│  • Katkıda bulunan öğrenci bilgilendirilecek          │
│  • Dashboard widget'ları güncellenecek                │
│                                                        │
│  [❌ İptal]  [🔙 Geri]  [✅ Onayla ve Sisteme Ekle]    │
└────────────────────────────────────────────────────────┘
```

### 4.6. Katkı Reddetme

```
┌─ ❌ KATKILARI REDDET ──────────────────────────────────┐
│                                                        │
│  Katkı #3: Akademik Takvim                            │
│  👤 Mehmet Demir - KTÜN - İnşaat Müh. 4                │
│                                                        │
│  Reddetme Sebebi: *                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Yüklenen dosya çok bulanık ve okunamıyor.       │  │
│  │ Lütfen daha net bir PDF veya fotoğraf yükleyin. │  │
│  │                                                  │  │
│  │ Ayrıca lütfen 2025-2026 akademik yılı takvimini │  │
│  │ yükleyin, yüklediğiniz 2024-2025'e ait.         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Öğrenciye bildirim:                                   │
│  ✅ Dashboard'da göster                                │
│  ☐ Email gönder (opsiyonel)                           │
│                                                        │
│  [❌ İptal]  [✅ Reddet ve Bildir]                      │
└────────────────────────────────────────────────────────┘
```

---

## 🗄️ BÖLÜM 5: DATABASE SCHEMA

### 5.1. Tablolar

#### **universities (Üniversiteler)**
```sql
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    slug VARCHAR(200) NOT NULL UNIQUE,
    email_domain VARCHAR(100) NOT NULL,  -- "gidatarim.edu.tr"
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_universities_slug ON universities(slug);
CREATE INDEX idx_universities_domain ON universities(email_domain);
```

#### **course_schedules (Ders Programları)**
```sql
CREATE TABLE course_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id),
    department VARCHAR(200) NOT NULL,
    semester INTEGER NOT NULL,  -- 1-8
    academic_year VARCHAR(20) NOT NULL,  -- "2025-2026"
    term VARCHAR(10) NOT NULL,  -- "fall", "spring"
    
    -- Ders Bilgileri
    course_code VARCHAR(50),
    course_name VARCHAR(200) NOT NULL,
    instructor VARCHAR(200),
    
    -- Zaman
    day_of_week INTEGER NOT NULL,  -- 1=Pazartesi, 7=Pazar
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Lokasyon
    room VARCHAR(100),
    building VARCHAR(100),
    
    -- Meta
    is_lab BOOLEAN DEFAULT FALSE,
    color VARCHAR(20),  -- UI renk kodu
    
    -- Kaynak
    source VARCHAR(20) DEFAULT 'admin',  -- 'admin', 'user_contribution'
    contributed_by UUID REFERENCES users(id),  -- NULL ise admin
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_course_university ON course_schedules(university_id);
CREATE INDEX idx_course_dept_semester ON course_schedules(department, semester);
CREATE INDEX idx_course_academic_year ON course_schedules(academic_year, term);
CREATE INDEX idx_course_day_time ON course_schedules(day_of_week, start_time);
```

#### **academic_calendar_events (Akademik Takvim)**
```sql
CREATE TABLE academic_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id),
    academic_year VARCHAR(20) NOT NULL,  -- "2025-2026"
    semester VARCHAR(10),  -- "fall", "spring", NULL (yıl geneli)
    
    -- Etkinlik Bilgileri
    event_type VARCHAR(50) NOT NULL,  -- 'exam', 'registration', 'holiday', 'deadline', 'other'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Tarih
    start_date DATE NOT NULL,
    end_date DATE,  -- NULL ise tek günlük
    
    -- Görünüm
    is_holiday BOOLEAN DEFAULT FALSE,
    icon VARCHAR(10),  -- Emoji
    color VARCHAR(20),  -- "red", "yellow", "green"
    
    -- Kaynak
    source VARCHAR(20) DEFAULT 'admin',  -- 'admin', 'user_contribution'
    contributed_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_calendar_university ON academic_calendar_events(university_id);
CREATE INDEX idx_calendar_dates ON academic_calendar_events(start_date, end_date);
CREATE INDEX idx_calendar_year ON academic_calendar_events(academic_year);
CREATE INDEX idx_calendar_type ON academic_calendar_events(event_type);
```

#### **user_contributed_data (Öğrenci Katkıları)**
```sql
CREATE TABLE user_contributed_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_user_id UUID NOT NULL REFERENCES users(id),
    data_type VARCHAR(20) NOT NULL,  -- 'course_schedule', 'academic_calendar'
    
    -- Hedef Bilgileri
    university_id UUID NOT NULL REFERENCES universities(id),
    department VARCHAR(200),  -- course_schedule için zorunlu
    semester INTEGER,  -- course_schedule için zorunlu
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(10),  -- "fall", "spring"
    
    -- İçerik
    uploaded_file_path VARCHAR(500),  -- PDF/resim path
    parsed_data JSON,  -- Parse edilmiş veriler
    notes TEXT,  -- Öğrencinin notu
    
    -- Durum
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_contributed_status ON user_contributed_data(status);
CREATE INDEX idx_contributed_university ON user_contributed_data(university_id);
CREATE INDEX idx_contributed_user ON user_contributed_data(contributor_user_id);
CREATE INDEX idx_contributed_type ON user_contributed_data(data_type);
```

#### **university_data_availability (Veri Durumu)**
```sql
CREATE TABLE university_data_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id),
    
    -- Ders Programı Durumu
    has_course_schedule BOOLEAN DEFAULT FALSE,
    course_schedule_departments JSON,  -- ["Bilgisayar Müh.", "Yazılım Müh."]
    course_schedule_last_updated TIMESTAMP,
    
    -- Akademik Takvim Durumu
    has_academic_calendar BOOLEAN DEFAULT FALSE,
    academic_calendar_year VARCHAR(20),  -- "2025-2026"
    academic_calendar_last_updated TIMESTAMP,
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(university_id)
);
```

---

## 🔌 BÖLÜM 6: API ENDPOINTS

### 6.1. Ders Programı Endpoints (Öğrenci)

#### **GET /api/v1/academic/course-schedule**
Kullanıcının ders programını getirir (otomatik: üniversite + bölüm + sınıf).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK - Veri Varsa):**
```json
{
  "has_data": true,
  "university": "Konya Gıda ve Tarım Üniversitesi",
  "department": "Moleküler Biyoloji ve Genetik",
  "semester": 1,
  "academic_year": "2025-2026",
  "term": "fall",
  "courses": [
    {
      "id": "uuid-1",
      "course_code": "GENE1001",
      "course_name": "Biology",
      "instructor": "Prof. Dr. Ahmet Yılmaz",
      "day_of_week": 1,  // Pazartesi
      "start_time": "10:00",
      "end_time": "10:45",
      "room": "MB120",
      "building": null,
      "is_lab": false,
      "color": "#4CAF50"
    },
    // ... diğer dersler
  ],
  "source": "admin",  // veya "user_contribution"
  "contributed_by": null  // veya user_id
}
```

**Response (200 OK - Veri Yoksa):**
```json
{
  "has_data": false,
  "message": "Üniversitenizin ders programı verilerine henüz erişemedik.",
  "can_contribute": true
}
```

#### **GET /api/v1/academic/course-schedule/today**
Bugünkü dersleri getirir (Dashboard widget için).

**Response:**
```json
{
  "has_data": true,
  "date": "2025-09-15",
  "day_of_week": 1,
  "day_name": "Pazartesi",
  "courses": [
    {
      "course_code": "GENE1001",
      "course_name": "Biology",
      "start_time": "10:00",
      "end_time": "10:45",
      "room": "MB120",
      "instructor": "Prof. Dr. Ahmet Yılmaz"
    }
  ]
}
```

#### **POST /api/v1/academic/contribute/course-schedule**
Ders programı katkısı gönder.

**Request (multipart/form-data):**
```
semester: 2
academic_year: "2025-2026"
term: "fall"
file: UploadFile (opsiyonel)
manual_data: JSON (opsiyonel)
notes: "Resmi UZEM'den aldım"
```

**Response (201 Created):**
```json
{
  "contribution_id": "uuid",
  "message": "Katkınız gönderildi. Kontrol edildikten sonra onaylanacak.",
  "status": "pending"
}
```

#### **GET /api/v1/academic/my-contributions**
Kullanıcının katkılarını listeler.

**Response:**
```json
{
  "pending": [
    {
      "id": "uuid-1",
      "data_type": "course_schedule",
      "semester": 2,
      "academic_year": "2025-2026",
      "status": "pending",
      "created_at": "2026-01-15T14:30:00Z"
    }
  ],
  "approved": [...],
  "rejected": [
    {
      "id": "uuid-3",
      "data_type": "academic_calendar",
      "status": "rejected",
      "rejection_reason": "PDF okunamıyor...",
      "created_at": "2026-01-14T09:15:00Z"
    }
  ]
}
```

### 6.2. Akademik Takvim Endpoints (Öğrenci)

#### **GET /api/v1/academic/calendar**
Kullanıcının üniversitesinin akademik takvimini getirir.

**Query Params:**
- `year` (opsiyonel): "2025-2026"
- `event_type` (opsiyonel): "exam", "registration", "holiday", etc.
- `start_date` (opsiyonel): Tarih filtresi
- `end_date` (opsiyonel): Tarih filtresi

**Response (200 OK - Veri Varsa):**
```json
{
  "has_data": true,
  "university": "Konya Gıda ve Tarım Üniversitesi",
  "academic_year": "2025-2026",
  "events": [
    {
      "id": "uuid-1",
      "event_type": "registration",
      "title": "Ders Kayıtları",
      "description": null,
      "start_date": "2025-09-08",
      "end_date": "2025-09-12",
      "is_holiday": false,
      "icon": "📌",
      "color": "blue"
    },
    {
      "id": "uuid-2",
      "event_type": "exam",
      "title": "Ara Sınav Haftası",
      "start_date": "2025-11-08",
      "end_date": "2025-11-16",
      "is_holiday": false,
      "icon": "📝",
      "color": "red"
    }
  ]
}
```

#### **GET /api/v1/academic/calendar/upcoming**
Yaklaşan akademik etkinlikler (Dashboard widget için).

**Query Params:**
- `limit` (default: 5)

**Response:**
```json
{
  "has_data": true,
  "events": [
    {
      "id": "uuid-2",
      "title": "Ara Sınav Haftası",
      "start_date": "2025-11-08",
      "end_date": "2025-11-16",
      "event_type": "exam",
      "icon": "📝",
      "days_remaining": 3,
      "urgency": "high"  // "high", "medium", "low"
    }
  ]
}
```

**Urgency Hesaplama:**
- `high`: 0-7 gün kaldı (🔴)
- `medium`: 8-30 gün kaldı (🟡)
- `low`: 30+ gün kaldı (🟢)

#### **POST /api/v1/academic/contribute/calendar**
Akademik takvim katkısı gönder.

**Request (multipart/form-data):**
```
academic_year: "2025-2026"
file: UploadFile (opsiyonel)
manual_data: JSON (opsiyonel)
notes: "Üniversite web sitesinden aldım"
```

### 6.3. Admin Endpoints

#### **GET /api/v1/admin/academic/contributions/pending**
Bekleyen katkıları listeler.

**Query Params:**
- `data_type` (opsiyonel): "course_schedule", "academic_calendar"
- `page`, `per_page`

**Response:**
```json
{
  "contributions": [
    {
      "id": "uuid-1",
      "contributor": {
        "id": "user-uuid",
        "first_name": "Ali",
        "last_name": "Yılmaz",
        "email": "ali@selcuk.edu.tr"
      },
      "data_type": "course_schedule",
      "university": "Selçuk Üniversitesi",
      "department": "Bilgisayar Mühendisliği",
      "semester": 2,
      "academic_year": "2025-2026",
      "term": "fall",
      "uploaded_file_path": "/uploads/contributions/uuid_ders.pdf",
      "parsed_data": {...},
      "created_at": "2026-01-15T14:30:00Z"
    }
  ],
  "pagination": {...}
}
```

#### **POST /api/v1/admin/academic/contributions/{id}/approve**
Katkıyı onayla ve sisteme ekle.

**Request:**
```json
{
  "parsed_data": {...}  // Admin düzeltmişse
}
```

**Response (200 OK):**
```json
{
  "message": "Katkı onaylandı ve sisteme eklendi",
  "affected_users": 120  // Kaç öğrenci görebilecek
}
```

**İşlemler:**
1. `parsed_data`'yı `course_schedules` veya `academic_calendar_events` tablosuna ekle
2. `user_contributed_data` status'unu "approved" yap
3. `university_data_availability` tablosunu güncelle
4. Katkıda bulunan öğrenciye bildirim gönder

#### **POST /api/v1/admin/academic/contributions/{id}/reject**
Katkıyı reddet.

**Request:**
```json
{
  "reason": "Yüklenen PDF okunamıyor. Lütfen daha net yükleyin."
}
```

**Response (200 OK):**
```json
{
  "message": "Katkı reddedildi ve öğrenci bilgilendirildi"
}
```

#### **POST /api/v1/admin/academic/course-schedule**
Admin ders programı ekler.

**Request (multipart/form-data):**
```
university_id: "uuid"
department: "Bilgisayar Mühendisliği"
semester: 2
academic_year: "2025-2026"
term: "fall"
file: UploadFile (opsiyonel)
manual_data: JSON (opsiyonel)
```

#### **POST /api/v1/admin/academic/calendar**
Admin akademik takvim ekler.

**Request (multipart/form-data):**
```
university_id: "uuid"
academic_year: "2025-2026"
file: UploadFile (opsiyonel)
manual_data: JSON (opsiyonel)
```

---

## 🎨 BÖLÜM 7: FRONTEND BİLEŞENLERİ

### 7.1. Bileşen Yapısı

```
src/
├── components/
│   ├── Academic/
│   │   ├── CourseSchedule/
│   │   │   ├── CourseSchedulePage.tsx
│   │   │   ├── WeeklyView.tsx
│   │   │   ├── ListView.tsx
│   │   │   ├── CourseCard.tsx
│   │   │   ├── CourseDetailPopup.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── AcademicCalendar/
│   │   │   ├── AcademicCalendarPage.tsx
│   │   │   ├── CalendarListView.tsx
│   │   │   ├── CalendarMonthView.tsx
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventFilters.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── Contribute/
│   │   │   ├── ContributeModal.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── ManualEntryForm.tsx
│   │   │   └── ContributionStatus.tsx
│   │   │
│   │   └── Common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── PendingBadge.tsx
│   │       └── ColorPicker.tsx
│   │
│   └── Dashboard/
│       ├── TodayCoursesWidget.tsx
│       └── UpcomingEventsWidget.tsx
│
├── pages/
│   └── Dashboard/
│       ├── CourseSchedulePage.tsx
│       └── AcademicCalendarPage.tsx
│
└── hooks/
    ├── useAcademicData.ts
    ├── useCourseSchedule.ts
    ├── useAcademicCalendar.ts
    └── useContribution.ts
```

### 7.2. Custom Hooks

#### **useCourseSchedule.ts**
```typescript
export const useCourseSchedule = () => {
  const [schedule, setSchedule] = useState<CourseSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    fetchCourseSchedule();
  }, []);

  const fetchCourseSchedule = async () => {
    try {
      const response = await api.get('/api/v1/academic/course-schedule');
      setSchedule(response.data);
      setHasData(response.data.has_data);
    } catch (error) {
      console.error('Failed to fetch course schedule', error);
    } finally {
      setLoading(false);
    }
  };

  return { schedule, loading, hasData, refetch: fetchCourseSchedule };
};
```

#### **useContribution.ts**
```typescript
export const useContribution = () => {
  const [contributions, setContributions] = useState<Contributions | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitContribution = async (data: ContributionData) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      // ... populate formData
      
      const response = await api.post(
        '/api/v1/academic/contribute/course-schedule',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success('Katkınız gönderildi! Kontrol edildikten sonra onaylanacak.');
      return response.data;
    } catch (error) {
      toast.error('Katkı gönderilemedi');
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const fetchMyContributions = async () => {
    const response = await api.get('/api/v1/academic/my-contributions');
    setContributions(response.data);
  };

  return { contributions, submitting, submitContribution, fetchMyContributions };
};
```

---

## 🎯 BÖLÜM 8: KULLANICI AKIŞLARI

### 8.1. Öğrenci Akışı (Veri Var)

```
1. Öğrenci login olur
2. Dashboard'da "Bugün Derslerim" widget'ı görür
   ↓
3. "Tüm Programım" tıklar
   ↓
4. Haftalık ders programı sayfası açılır
   ↓
5. Ders kartına tıklayınca detay popup görür
   ↓
6. "Akademik Takvim" sidebar'dan tıklar
   ↓
7. Yaklaşan etkinlikler listesi görür
   ↓
8. Filtre uygular (sadece sınavlar)
   ↓
9. PDF indir butonuna basıp takvimi kaydeder
```

### 8.2. Öğrenci Akışı (Veri Yok - Katkıda Bulunma)

```
1. Öğrenci "Ders Programım" sayfasına girer
   ↓
2. "Henüz veri yok" mesajı görür
   ↓
3. "PDF Yükle" butonuna basar
   ↓
4. Katkı modalı açılır
   ↓
5. UZEM'den indirdiği PDF'i yükler
   ↓
6. "Gönder" butonuna basar
   ↓
7. "Katkınız gönderildi" mesajı görür
   ↓
8. Sayfa "Gözden geçiriliyor" durumuna geçer
   ↓
9. Admin onayladıktan sonra:
   ↓
10. "Katkınız onaylandı" mesajı görür
    ↓
11. Ders programı görünür hale gelir
```

### 8.3. Admin Akışı (Katkı Onaylama)

```
1. Admin paneline girer
   ↓
2. "12 bekleyen katkı" bildirimini görür
   ↓
3. "Bekleyen Katkılar" sayfasına gider
   ↓
4. Katkı #1'e tıklar (Ali Yılmaz - Ders Programı)
   ↓
5. PDF önizlemesi açılır
   ↓
6. Otomatik parse edilmiş verileri görür
   ↓
7. Gerekirse düzeltir (ders adı, salon, vs.)
   ↓
8. "Onayla ve Sisteme Ekle" butonuna basar
   ↓
9. 120 öğrenci bu verileri görebilir hale gelir
   ↓
10. Ali Yılmaz'a "Katkınız onaylandı" bildirimi gider
```

### 8.4. Admin Akışı (Ders Programı Ekleme)

```
1. Admin "Ders Programı Yönetimi" sayfasına gider
   ↓
2. "Yeni Ders Programı Ekle" butonuna basar
   ↓
3. Üniversite, bölüm, sınıf seçer
   ↓
4. PDF yükler (resmi ders programı)
   ↓
5. Otomatik parse edilir
   ↓
6. Kontrol edip gerekirse düzeltir
   ↓
7. "Kaydet" butonuna basar
   ↓
8. Veriler sisteme eklenir
   ↓
9. O bölüm öğrencileri dashboard'da görebilir
```

---

## ✅ BÖLÜM 9: BAŞARI KRİTERLERİ

### 9.1. Fonksiyonel Gereksinimler
- [ ] **Ders Programı:**
  - [ ] Haftalık grid görünüm çalışıyor
  - [ ] Liste görünüm çalışıyor
  - [ ] Bugünkü dersler dashboard'da gösteriliyor
  - [ ] Ders detay popup açılıyor
  - [ ] PDF export çalışıyor
  - [ ] Veri yoksa "Katkıda bulun" mesajı gösteriliyor

- [ ] **Akademik Takvim:**
  - [ ] Liste görünüm çalışıyor
  - [ ] Aylık takvim görünüm çalışıyor
  - [ ] Yaklaşan etkinlikler renk kodlu gösteriliyor
  - [ ] Filtreler çalışıyor
  - [ ] PDF export çalışıyor
  - [ ] Veri yoksa "Katkıda bulun" mesajı gösteriliyor

- [ ] **Katkı Sistemi:**
  - [ ] PDF/resim yükleme çalışıyor
  - [ ] Manuel girdi çalışıyor
  - [ ] Pending durumu görüntüleniyor
  - [ ] Onay mesajı gösteriliyor
  - [ ] Red mesajı + sebep gösteriliyor

- [ ] **Admin Paneli:**
  - [ ] Bekleyen katkılar listeleniyor
  - [ ] PDF önizleme çalışıyor
  - [ ] Onaylama çalışıyor (veriler sisteme ekleniyor)
  - [ ] Reddetme çalışıyor (sebep yazılabiliyor)
  - [ ] Admin manuel veri ekleyebiliyor

### 9.2. Teknik Gereksinimler
- [ ] Tüm API endpoint'ler çalışıyor
- [ ] Database schema oluşturuldu
- [ ] Index'ler eklendi
- [ ] Dosya yükleme çalışıyor (max 10 MB)
- [ ] Dosya tipi validation çalışıyor
- [ ] Unit test'ler yazıldı (%80+ coverage)

### 9.3. Performans
- [ ] Ders programı sayfası < 1 saniye
- [ ] Akademik takvim sayfası < 1 saniye
- [ ] Dashboard widget'ları < 500ms
- [ ] PDF yükleme progress gösteriliyor

### 9.4. UX
- [ ] Boş durum mesajları net
- [ ] Loading state'leri var
- [ ] Error mesajları anlaşılır
- [ ] Success toast mesajları gösteriliyor
- [ ] Responsive tasarım çalışıyor

---

## 📝 BÖLÜM 10: NOTLAR VE GELECEK GELİŞTİRMELER

### 10.1. MVP'de Yok (V2'de)
- ❌ Bildirimler (30 dk önce, 1 gün önce)
- ❌ Google Calendar senkronizasyonu
- ❌ iCal export
- ❌ Ders notları ekleme
- ❌ Ders arkadaşlarını görme
- ❌ Otomatik OCR parse (şimdilik admin manuel kontrol)

### 10.2. Gelecekte Eklenebilecekler
- 🔮 Push bildirimleri (ders 30 dk önce)
- 🔮 Email hatırlatmaları
- 🔮 Ders notları ekleme/paylaşma
- 🔮 Ders arkadaşları listesi
- 🔮 Devamsızlık takibi
- 🔮 Ödev/Proje takvimine entegrasyon
- 🔮 Google Calendar iki yönlü senkronizasyon
- 🔮 Akıllı OCR (otomatik PDF parse)
- 🔮 Toplu veri import (Excel/CSV)

### 10.3. Bağımlılıklar
- ✅ 001 - Landing Page
- ✅ 002 - Register Page
- ✅ 003 - Login Page
- ✅ 004 - Dashboard (widget'lar için)

---

## 🎯 Özet

Akademik Özellikler, öğrencilerin ders programlarını ve akademik takvimi görüntüleyebildiği, admin ve öğrencilerin veri katkısında bulunabildiği hibrit bir sistemdir.

**核心 Özellikler:**
- ✅ **Ders Programım:** Haftalık/Liste görünüm, bugünkü dersler
- ✅ **Akademik Takvim:** Liste/Aylık görünüm, yaklaşan etkinlikler
- ✅ **Crowd-sourced:** Öğrenciler katkıda bulunabilir
- ✅ **Admin Moderation:** Katkılar onaylanır/reddedilir
- ✅ **Boş Durum:** Veri yoksa "Katkıda bulun" mesajı
- ✅ **Dashboard Widget'ları:** Bugün dersleri + yaklaşan etkinlikler

---

**Hazırlayan:** AI Assistant  
**Versiyon:** 1.0  
**Son Güncelleme:** 2026-01-01

