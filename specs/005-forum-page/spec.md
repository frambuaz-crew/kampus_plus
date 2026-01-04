# 005 - Forum Sayfası

## 📋 Genel Bakış

Forum, üniversite öğrencilerinin akademik konularda soru sorabileceği, bilgi paylaşabileceği ve tartışabileceği Technopat benzeri bir platform sayfasıdır.

### 🎯 Amaç
- Öğrencilerin akademik konularda yardımlaşmasını sağlamak
- Ders notları, ödevler, projeler hakkında tartışma ortamı sunmak
- Dosya paylaşımı (PDF, kod, vs.) ile bilgi alışverişini kolaylaştırmak
- Üniversite ve bölüm bazlı kategorilerle organize edilmiş içerik

### 👥 Hedef Kullanıcı
- Email doğrulaması yapılmış üniversite öğrencileri
- Tüm kullanıcılar profilli (anonim paylaşım yok)

### 🔑 Core Değer
"Akademik yardımlaşma ve bilgi paylaşımı için güvenli, organize, profilli forum platformu"

---

## 🎨 Sayfa Yapısı

### Genel Layout

```
┌────────────┬──────────────────────────────────────────────────────┐
│            │  💬 Forum                                            │
│  SIDEBAR   ├──────────────────────────────────────────────────────┤
│            │  🔍 [Ara...]  [🔽 Sırala] [➕ Yeni Konu Aç]         │
│ 🏠 Ana     │                                                      │
│ 🤖 AI      │  ─────────────────────────────────────────────────  │
│ 💬 Forum   │                                                      │
│ 🛒 Pazar   │  📁 KATEGORİLER                                      │
│            │                                                      │
│            │  🎓 Üniversiteler        (kategori kartları)         │
│            │  💻 Bölümler                                         │
│            │  🔧 Genel Konular                                    │
└────────────┴──────────────────────────────────────────────────────┘
```

---

## 🗂️ 1. Forum Ana Sayfası (Category List)

### 1.1. Sayfa Başlığı

```
┌─────────────────────────────────────────────────────────┐
│  💬 KAMPÜS+ Forum                                       │
│                                                         │
│  🔍 [Konu, kullanıcı veya etiket ara...]  [🔍 Ara]     │
│                                                         │
│  [➕ Yeni Konu Aç]                                      │
└─────────────────────────────────────────────────────────┘
```

**Bileşenler:**
- Başlık: "KAMPÜS+ Forum"
- Arama çubuğu (global forum araması)
- "Yeni Konu Aç" butonu (modal açar)

### 1.2. Kategori Grupları

Forum 3 ana grup altında organize edilir:

#### **Grup 1: 🎓 Üniversiteler**

```
┌─ 🎓 Üniversiteler ──────────────────────────────┐
│                                                 │
│  📍 Selçuk Üniversitesi              234 konu  │
│  📍 Konya Teknik Üniversitesi        156 konu  │
│  📍 Necmettin Erbakan Üniversitesi   189 konu  │
│  📍 KTO Karatay Üniversitesi          67 konu  │
│  📍 Konya Gıda ve Tarım Üniversitesi  45 konu  │
│                                                 │
│  [+ Daha Fazla Göster]                          │
└─────────────────────────────────────────────────┘
```

**Özellikler:**
- Her üniversite için toplam konu sayısı gösterilir
- İlk 5 üniversite görünür, "Daha Fazla Göster" ile tam liste açılır
- Konu sayısına göre sıralanır (en fazla konu yukarıda)

#### **Grup 2: 💻 Bölümler (TR Geneli)**

```
┌─ 💻 Bölümler (TR Geneli) ───────────────────────┐
│                                                 │
│  🖥️ Bilgisayar Mühendisliği          892 konu  │
│  💾 Yazılım Mühendisliği             634 konu  │
│  ⚡ Elektrik-Elektronik Mühendisliği 478 konu  │
│  🏗️ İnşaat Mühendisliği              312 konu  │
│  🔬 Makine Mühendisliği              267 konu  │
│  ⚙️ Endüstri Mühendisliği            201 konu  │
│  🎓 İşletme                           189 konu  │
│  💊 Tıp                               145 konu  │
│  ⚖️ Hukuk                             123 konu  │
│  🎨 Mimarlık                          98 konu   │
│  ... (tümünü gör)                               │
└─────────────────────────────────────────────────┘
```

**Özellikler:**
- Tüm Türkiye'deki öğrencilerin aynı bölüm altında birleşmesi
- Register page'deki 20 bölüm listesi kullanılır
- "Diğer" kategorisi de var

#### **Grup 3: 🔧 Genel Konular**

```
┌─ 🔧 Genel Konular ──────────────────────────────┐
│                                                 │
│  💼 Kariyer & Staj                   423 konu  │
│  🤝 Proje Ortakları                  289 konu  │
│  🎉 Sosyal Etkinlikler               156 konu  │
│  📖 Sınav & Ders Notları             567 konu  │
│  💡 Genel Tartışma                   390 konu  │
└─────────────────────────────────────────────────┘
```

**Özellikler:**
- Üniversite/bölüm spesifik olmayan genel konular
- Sabit 5 kategori

### 1.3. Kategori Kart Tasarımı

```
┌────────────────────────────────────────────────┐
│  🖥️ Bilgisayar Mühendisliği                    │
│                                                │
│  892 konu • 3,421 cevap                        │
│  Son mesaj: 5 dakika önce                      │
│                                                │
│  [Kategoriye Git →]                            │
└────────────────────────────────────────────────┘
```

**Bilgiler:**
- İkon + Kategori adı
- Toplam konu sayısı
- Toplam cevap sayısı
- Son mesaj zamanı
- Hover efekti: Açık mavi gölge

---

## 📝 2. Kategori İçi (Thread List)

Kullanıcı bir kategoriye tıkladığında:

### 2.1. Kategori Header

```
┌──────────────────────────────────────────────────────────┐
│  ← Geri     💬 Forum > 💻 Bilgisayar Mühendisliği        │
├──────────────────────────────────────────────────────────┤
│  🔍 [Bu kategoride ara...]  [🔍 Ara]                     │
│                                                          │
│  [🔽 Sırala: En Yeni]  [➕ Yeni Konu Aç]                 │
└──────────────────────────────────────────────────────────┘
```

**Bileşenler:**
- Breadcrumb: Forum > Kategori Adı
- "Geri" butonu (forum ana sayfasına)
- Kategori içi arama
- Sıralama dropdown (En Yeni, En Çok Cevaplanan, En Çok Yararlı)
- "Yeni Konu Aç" butonu

### 2.2. Sıralama Seçenekleri

Dropdown menü:
```
[🔽 Sırala: En Yeni ▼]
  ┌────────────────────────┐
  │ ✓ En Yeni              │ ← Default
  │   En Çok Cevaplanan    │
  │   En Çok Yararlı       │
  └────────────────────────┘
```

### 2.3. Thread (Konu) Listesi

```
┌───────────────────────────────────────────────────────┐
│ 📌 [PİN] Python Django ile API Geliştirme           │ ← Pinned
│ 👤 Mehmet Demir • Erbakan Üniversitesi               │
│ 📎 api_kodlari.zip (45 KB)                            │
│ 💬 23 cevap  •  👍 67 yararlı  •  🕐 1 gün önce       │
│ #python #django #backend                              │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ 📌 Binary Tree Nasıl Çalışır?                        │
│ 👤 Ali Yılmaz • Selçuk Üniversitesi                  │
│ 📎 kod_ornegi.py (2 KB)                               │
│ 💬 12 cevap  •  👍 24 yararlı  •  🕐 2 saat önce      │
│ #veri-yapilari #algoritma                             │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ 📌 React ile State Management (Redux vs Context)     │
│ 👤 Ayşe Kaya • KTÜN                                   │
│ 💬 8 cevap  •  👍 15 yararlı  •  🕐 5 saat önce       │
│ #react #frontend                                      │
└───────────────────────────────────────────────────────┘

[Daha Fazla Göster...]  (Sayfa 1/45)
```

**Thread Kart Bilgileri:**
- 📌 Pin ikonu (sadece pinli konularda, en üstte gösterilir)
- Başlık (tıklanabilir → thread detay sayfası)
- Yazan kişi (ad soyad + üniversite)
- Eklenen dosyalar (varsa, max 3 gösterilir)
- İstatistikler:
  - 💬 Cevap sayısı
  - 👍 Yararlı sayısı
  - 🕐 Paylaşım zamanı (relatif: "2 saat önce", "3 gün önce")
- Etiketler (max 5 gösterilir)

### 2.4. Sayfalama

```
┌─ Sayfa Navigasyonu ─────────────────────────────┐
│  [← Önceki]  1  2  3 ... 10 [11] 12 ... 45  [Sonraki →]  │
└─────────────────────────────────────────────────┘
```

**Özellikler:**
- 20 konu/sayfa
- Aktif sayfa highlight (mavi)
- İlk/son 3 sayfa + ortadaki 5 sayfa gösterilir
- "..." ile atlanan sayfalar

---

## 📄 3. Thread Detay Sayfası (Konu + Cevaplar)

### 3.1. Thread Header

```
┌──────────────────────────────────────────────────────────┐
│  ← Geri    💬 Forum > 💻 Bilg. Müh. > Binary Tree...    │
└──────────────────────────────────────────────────────────┘
```

### 3.2. Thread (Ana Konu) Kartı

```
┌─ KONU ────────────────────────────────────────────────┐
│                                                       │
│  📌 Binary Tree Nasıl Çalışır?                        │
│                                                       │
│  👤 Ali Yılmaz                                        │
│  🎓 Selçuk Üniversitesi • Bilgisayar Mühendisliği     │
│  🕐 2 saat önce                                       │
│                                                       │
│  ─────────────────────────────────────────────────    │
│                                                       │
│  Merhaba, binary tree konusunu anlamakta              │
│  zorlanıyorum. Özellikle insert ve delete             │
│  işlemlerini anlayamadım. Yardımcı olabilir           │
│  misiniz?                                             │
│                                                       │
│  📎 kod_ornegi.py (2 KB) [İndir]                      │
│  📎 notlarim.pdf (450 KB) [İndir]                     │
│                                                       │
│  #veri-yapilari #algoritma #yardim                    │
│                                                       │
│  ─────────────────────────────────────────────────    │
│                                                       │
│  👍 24 Yararlı  💬 12 Cevap  🚩 Rapor Et              │
│                                                       │
│  [✏️ Düzenle] [🗑️ Sil]  ← Sadece sahibine görünür    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Özellikler:**
- Başlık (büyük font)
- Yazar profil bilgisi (ad, üniversite, bölüm)
- Paylaşım zamanı
- İçerik metni (markdown destekli)
- Dosya ekleri (indir butonları)
- Etiketler (tıklanabilir → o etiketteki konuları göster)
- İstatistikler (Yararlı, Cevap, Rapor Et)
- Düzenle/Sil butonları (sadece sahibine + 10 dakika içinde)

### 3.3. Cevaplar Bölümü

```
┌─ CEVAPLAR (12) ───────────────────────────────────────┐
│                                                       │
│  [🔽 Sırala: En Eski (varsayılan)]                    │
│                                                       │
│  ┌─ Cevap #1 ─────────────────────────────────────┐  │
│  │                                                 │  │
│  │  👤 Ayşe Kaya                                   │  │
│  │  🎓 KTÜN • Yazılım Mühendisliği                 │  │
│  │  🕐 1 saat önce                                 │  │
│  │                                                 │  │
│  │  ─────────────────────────────────────────────  │  │
│  │                                                 │  │
│  │  Binary tree şu şekilde çalışıyor:             │  │
│  │  1. Her node en fazla 2 child'a sahip olabilir │  │
│  │  2. Insert işlemi...                            │  │
│  │                                                 │  │
│  │  📎 ornek_cozum.pdf (500 KB) [İndir]            │  │
│  │                                                 │  │
│  │  ─────────────────────────────────────────────  │  │
│  │                                                 │  │
│  │  👍 18 Yararlı  🚩 Rapor Et                     │  │
│  │                                                 │  │
│  │  [✏️ Düzenle] [🗑️ Sil]  ← Sahibine görünür     │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Cevap #2 ─────────────────────────────────────┐  │
│  │                                                 │  │
│  │  👤 Mehmet Demir                                │  │
│  │  🎓 Erbakan Üniversitesi • Bilgisayar Müh.      │  │
│  │  🕐 45 dakika önce                              │  │
│  │                                                 │  │
│  │  ─────────────────────────────────────────────  │  │
│  │                                                 │  │
│  │  @AyşeKaya'nın dediği gibi, ayrıca şu videoyu   │  │
│  │  izlemenizi öneririm: https://youtube.com/...   │  │
│  │                                                 │  │
│  │  ─────────────────────────────────────────────  │  │
│  │                                                 │  │
│  │  👍 12 Yararlı  🚩 Rapor Et                     │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ... (diğer cevaplar)                                 │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Cevap Kartı Özellikleri:**
- Cevap numarası (#1, #2, ...)
- Yazar bilgisi (ad, üniversite, bölüm)
- Zaman damgası
- İçerik (markdown + mention destekli)
- Dosya ekleri
- Yararlı butonu + sayısı
- Rapor Et butonu
- Düzenle/Sil (sadece sahibine + 10 dakika içinde)

**Cevap Sıralama:**
```
[🔽 Sırala ▼]
  ┌─────────────────┐
  │ ✓ En Eski       │ ← Default (kronolojik)
  │   En Yeni       │
  │   En Çok Yararlı│
  └─────────────────┘
```

### 3.4. Cevap Yazma Formu

Sayfa en altında:

```
┌─ CEVAP YAZ ───────────────────────────────────────────┐
│                                                       │
│  📝 Cevabını buraya yaz...                            │
│  ┌───────────────────────────────────────────────┐   │
│  │ Markdown formatında yazabilirsin:             │   │
│  │ **kalın**, *italik*, [link](url)              │   │
│  │                                                │   │
│  │ @kullanıcı ile mention edebilirsin            │   │
│  │                                                │   │
│  │                                                │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  📎 Dosya Ekle (Max 10 MB, 3 dosya)                   │
│  [Dosya Seç...]                                       │
│                                                       │
│  ── Eklenen Dosyalar: ──                              │
│  📄 cozum.pdf (2 MB) [x]                              │
│  📄 kod.py (15 KB) [x]                                │
│                                                       │
│                   [❌ İptal]  [✅ Gönder]              │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Özellikler:**
- Markdown editor (bold, italic, link destekli)
- Mention autocomplete (@kullanıcı yazınca öneri listesi)
- Dosya yükleme (max 10 MB, 3 dosya)
- Preview butonu (opsiyonel)
- Karakter sayacı (max 10,000 karakter)

---

## ➕ 4. Yeni Konu Açma (Modal)

"Yeni Konu Aç" butonuna tıklandığında modal açılır:

```
┌──────────────────────────────────────────────────────┐
│  ➕ Yeni Konu Aç                              [✕]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Kategori Seç: *                                     │
│  [🎓 Üniversiteler ▼]                                │
│    ┌───────────────────────────────────────┐         │
│    │ 🎓 Üniversiteler                      │         │
│    │   → Selçuk Üniversitesi               │         │
│    │   → KTÜN                              │         │
│    │   → Erbakan Üniversitesi              │         │
│    │ 💻 Bölümler                            │         │
│    │   → Bilgisayar Mühendisliği           │         │
│    │   → Yazılım Mühendisliği              │         │
│    │ 🔧 Genel                               │         │
│    │   → Kariyer & Staj                    │         │
│    │   → Proje Ortakları                   │         │
│    └───────────────────────────────────────┘         │
│                                                      │
│  Başlık: *                                           │
│  [Binary Tree Nasıl Çalışır?]                        │
│  (Max 200 karakter)                                  │
│                                                      │
│  İçerik: *                                           │
│  ┌────────────────────────────────────────────────┐  │
│  │ Markdown formatında yazabilirsin              │  │
│  │                                                │  │
│  │ Merhaba, binary tree konusunu anlamakta...    │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│  (Max 10,000 karakter)                               │
│                                                      │
│  Dosya Ekle: (Opsiyonel)                             │
│  📎 [Dosya Seç] (Max 10 MB, 3 dosya)                 │
│  Kabul edilen: PDF, DOCX, ZIP, kod, resim            │
│                                                      │
│  ── Eklenen: ──                                      │
│  📄 kod.py (15 KB) [x]                               │
│                                                      │
│  Etiketler: (Opsiyonel, max 5)                       │
│  [#veri-yapilari] [#algoritma] [#yardim]             │
│  [+ Etiket Ekle]                                     │
│                                                      │
│                                                      │
│           [❌ İptal]  [✅ Konu Aç]                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Form Alanları:**

1. **Kategori Seç:** (Zorunlu)
   - Grouped dropdown: Üniversiteler, Bölümler, Genel
   - Arama ile filtreleme

2. **Başlık:** (Zorunlu)
   - Min 10, max 200 karakter
   - Placeholder: "Konuyu açıklayıcı bir başlık yazın"

3. **İçerik:** (Zorunlu)
   - Min 20, max 10,000 karakter
   - Markdown destekli
   - Preview butonu

4. **Dosya Ekle:** (Opsiyonel)
   - Max 10 MB/dosya
   - Max 3 dosya
   - İzin verilen: `.pdf`, `.docx`, `.zip`, `.py`, `.java`, `.cpp`, `.js`, `.txt`, `.jpg`, `.png`

5. **Etiketler:** (Opsiyonel)
   - Serbest etiket girişi
   - Autocomplete (önceden kullanılan etiketler önerilir)
   - Max 5 etiket
   - Her etiket max 30 karakter

**Validasyon:**
- Kategori seçilmeli
- Başlık 10-200 karakter
- İçerik 20-10,000 karakter
- Dosya boyutu kontrolü
- Dosya tipi kontrolü

---

## 🔍 5. Arama Özelliği

### 5.1. Global Arama (Forum Ana Sayfasında)

```
┌─────────────────────────────────────────────────┐
│  🔍 [Konu, kullanıcı veya etiket ara...]  [Ara] │
└─────────────────────────────────────────────────┘
```

**Arama Kapsamı:**
- Konu başlıkları
- Konu içerikleri
- Cevap içerikleri
- Kullanıcı adları
- Etiketler

### 5.2. Arama Sonuçları Sayfası

```
┌──────────────────────────────────────────────────────┐
│  🔍 Arama Sonuçları: "binary tree"                   │
│  ← Geri                                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 45 sonuç bulundu                                 │
│                                                      │
│  [🔽 Filtrele: Tüm Kategoriler] [🔽 Sırala: İlgili] │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 📌 Binary Tree Nasıl Çalışır?                  │ │
│  │ 👤 Ali Yılmaz • 💻 Bilgisayar Mühendisliği     │ │
│  │ "...binary tree konusunu anlamakta..."         │ │
│  │ 💬 12 cevap • 🕐 2 saat önce                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ... (diğer sonuçlar)                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Filtreler:**
- Kategori (tümü/spesifik kategori)
- Zaman (bugün, bu hafta, bu ay, tümü)

**Sıralama:**
- İlgili (relevance - default)
- En yeni
- En çok cevaplanan
- En çok yararlı

### 5.3. Kategori İçi Arama

```
┌──────────────────────────────────────────────────────┐
│  🔍 [Bu kategoride ara...]  [Ara]                    │
└──────────────────────────────────────────────────────┘
```

Sadece o kategori içinde arama yapar.

---

## 👍 6. "Yararlı" (Helpful) Sistemi

### 6.1. Yararlı Butonu

Her konu ve cevap kartında:

```
┌─────────────────────────────────────────┐
│  👍 24 Yararlı                          │
│     ↑ Basılı (mavi)                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  👍 24 Yararlı                          │
│     ↑ Basılı değil (gri)                │
└─────────────────────────────────────────┘
```

**Özellikler:**
- Kullanıcı kendi içeriğini "yararlı" yapamaz
- Bir konu/cevaba sadece 1 kez "yararlı" yapılabilir
- Tekrar tıklayınca iptal olur (toggle)
- Toplam sayı real-time güncellenir

### 6.2. Backend Logic

**Tablo: `thread_helpful`**
```sql
CREATE TABLE thread_helpful (
    id UUID PRIMARY KEY,
    thread_id UUID REFERENCES threads(id),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP,
    UNIQUE(thread_id, user_id)
);
```

**Tablo: `reply_helpful`**
```sql
CREATE TABLE reply_helpful (
    id UUID PRIMARY KEY,
    reply_id UUID REFERENCES replies(id),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP,
    UNIQUE(reply_id, user_id)
);
```

---

## 🏷️ 7. Etiket (Tag) Sistemi

### 7.1. Etiket Formatı

```
#veri-yapilari #algoritma #python #django
```

**Kurallar:**
- Küçük harf (otomatik convert)
- Boşluk yerine tire (`-`)
- Özel karakter yok (sadece harf, rakam, tire)
- Min 2, max 30 karakter
- Max 5 etiket/konu

### 7.2. Etiket Tıklama

Etikete tıklandığında o etiketteki tüm konular listelenir:

```
┌──────────────────────────────────────────────────────┐
│  🏷️ Etiket: #veri-yapilari                          │
│  ← Geri                                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 87 konu bulundu                                  │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Binary Tree Nasıl Çalışır?                     │ │
│  │ ...                                             │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 7.3. Etiket Autocomplete

Konu açma modalında etiket girerken:

```
[#ver...]
  ┌────────────────────────┐
  │ #veri-yapilari (89)    │ ← Önceden kullanılan
  │ #veri-tabani (67)      │
  │ #veri-bilimi (45)      │
  └────────────────────────┘
```

---

## 📌 8. Pin (Sabitle) Özelliği

### 8.1. Yetki

Sadece **Admin** pin/unpin yapabilir.

### 8.2. Görünüm

Pinli konular kategori listesinin en üstünde görünür:

```
┌─────────────────────────────────────────────────────┐
│ 📌 [PİN] Python Django Eğitim Kaynakları            │ ← Pinned
│ ...                                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📌 Binary Tree Nasıl Çalışır?                       │ ← Normal
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**Özellikler:**
- Pin ikonu (📌) + "[PİN]" badge
- En üstte gösterilir (sıralama dışı)
- Birden fazla konu pinlenebilir

---

## ✏️ 9. Düzenleme & Silme

### 9.1. Konu Düzenleme

**Yetki:**
- Konu sahibi (ilk 10 dakika içinde)
- Admin (her zaman)

**Düzenle Butonu:**
```
[✏️ Düzenle]
```

**Modal:**
Konu açma modalı ile aynı, ama pre-filled (var olan verilerle dolu).

**Değiştirilebilir:**
- Başlık
- İçerik
- Dosyalar (ekle/çıkar)
- Etiketler

**Değiştirilemez:**
- Kategori (değiştirilemez, yanlış kategoriye açıldıysa silinip yeniden açılmalı)

**Edit Log:**
Düzenleme yapılınca:
```
✏️ Son düzenleme: 5 dakika önce
```

### 9.2. Konu Silme

**Yetki:**
- Konu sahibi (ilk 10 dakika içinde)
- Admin (her zaman)

**Sil Butonu:**
```
[🗑️ Sil]
```

**Confirm Modal:**
```
┌──────────────────────────────────────────────┐
│  ⚠️ Konuyu Sil                               │
├──────────────────────────────────────────────┤
│                                              │
│  Bu konuyu silmek istediğinize emin misiniz?│
│                                              │
│  ❗ Bu işlem geri alınamaz!                  │
│                                              │
│  - Konu silinecek                            │
│  - Tüm cevaplar silinecek (12 cevap)         │
│  - Dosyalar silinecek                        │
│                                              │
│                                              │
│       [❌ İptal]  [🗑️ Evet, Sil]             │
│                                              │
└──────────────────────────────────────────────┘
```

**Silme Sonrası:**
- Thread + tüm cevapları + dosyalar soft delete (is_deleted = true)
- Kategori listesinde görünmez
- Doğrudan link ile erişilince "Bu konu silinmiş" mesajı

### 9.3. Cevap Düzenleme & Silme

**Yetki:**
- Cevap sahibi (ilk 10 dakika içinde)
- Admin (her zaman)

**Düzenle:**
Inline editing (modal yok):
```
┌─────────────────────────────────────────────────────┐
│  [Textarea açılır, edit mode]                       │
│  [❌ İptal]  [✅ Kaydet]                             │
└─────────────────────────────────────────────────────┘
```

**Sil:**
Aynı confirm modal (ama sadece o cevap silinir).

---

## 🚩 10. Rapor Et (Report)

### 10.1. Rapor Butonu

Her konu ve cevapta:

```
[🚩 Rapor Et]
```

### 10.2. Rapor Modal

```
┌──────────────────────────────────────────────┐
│  🚩 Bu İçeriği Raporla                       │
├──────────────────────────────────────────────┤
│                                              │
│  Sebep seçin: *                              │
│  ○ Spam                                      │
│  ○ Uygunsuz içerik                           │
│  ○ Konu dışı                                 │
│  ○ Taciz/Zorbalık                            │
│  ○ Diğer                                     │
│                                              │
│  Açıklama: (Opsiyonel)                       │
│  ┌────────────────────────────────────────┐  │
│  │ Lütfen detay verin...                  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│                                              │
│       [❌ İptal]  [✅ Gönder]                 │
│                                              │
└──────────────────────────────────────────────┘
```

**Rapor Sonrası:**
- "Raporunuz alındı" toast mesajı
- Admin paneline düşer
- Kullanıcıya tekrar rapor etme engeli (aynı içerik için)

### 10.3. Admin Paneli (Gelecek Feature)

```
┌─ Raporlanan İçerikler ─────────────────────┐
│  5 yeni rapor                              │
│                                            │
│  Thread: "Binary Tree..." (3 rapor)       │
│  Sebep: Spam (2), Konu dışı (1)           │
│  [İncele] [Sil] [Görmezden Gel]           │
└────────────────────────────────────────────┘
```

---

## 💬 11. Mention Sistemi

### 11.1. Mention Yazma

Cevap yazarken `@` yazınca autocomplete:

```
@ali
  ┌────────────────────────────────┐
  │ @AliYılmaz (Selçuk Üni)        │
  │ @AliDemir (KTÜN)               │
  │ @AliKaya (Erbakan Üni)         │
  └────────────────────────────────┘
```

**Autocomplete Kriterleri:**
- O thread'de cevap veren kullanıcılar öncelikli
- Sonra tüm kullanıcılar (isim benzerliğine göre)
- Max 10 öneri

### 11.2. Mention Görünümü

```
@AyşeKaya'nın dediği gibi, ...
    ↑ Mavi + tıklanabilir (profile gider)
```

### 11.3. Mention Bildirimi

Mention edildiğinde:
- Bildirim simgesinde kırmızı badge (+1)
- Bildirim dropdown:
  ```
  📣 Ayşe Kaya seni bir konuda bahsetti
     "Binary Tree Nasıl Çalışır?"
     5 dakika önce
  ```
- (Opsiyonel) Email bildirimi (ayarlardan açılabilir)

---

## 📊 12. İstatistikler

### 12.1. Thread Kartında

```
💬 12 cevap  •  👍 24 yararlı  •  🕐 2 saat önce
```

### 12.2. Kategori Kartında

```
892 konu • 3,421 cevap
Son mesaj: 5 dakika önce
```

### 12.3. Kullanıcı Profili (Gelecek Feature)

```
👤 Ali Yılmaz
───────────────────────
📊 İstatistikler:
  - 45 konu açtı
  - 123 cevap verdi
  - 456 yararlı aldı
  - 78 yararlı verdi
```

---

## 📱 13. Responsive Tasarım

### 13.1. Mobil (< 768px)

**Layout:**
- Sidebar gizli (hamburger menü)
- Thread kartları full-width
- Dosya adları kısaltılır ("api_kod...zip")
- İstatistikler ikon + sayı (metin yok)

**Konu Açma:**
- Full-screen modal (sayfa gibi)
- Dosya seçimi mobil-friendly

### 13.2. Tablet (768px - 1023px)

- Thread kartları biraz padding azaltılır
- Sidebar overlay olarak açılır

### 13.3. Desktop (≥ 1024px)

- Full layout
- Sidebar her zaman görünür

---

## 🗄️ 14. Database Schema

### 14.1. Tablolar

#### **threads (Konular)**
```sql
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,  -- Max 10,000 karakter (backend'de kontrol)
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_threads_category ON threads(category_id);
CREATE INDEX idx_threads_user ON threads(user_id);
CREATE INDEX idx_threads_created ON threads(created_at DESC);
```

#### **replies (Cevaplar)**
```sql
CREATE TABLE replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,  -- Max 10,000 karakter
    is_deleted BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_replies_thread ON replies(thread_id);
CREATE INDEX idx_replies_user ON replies(user_id);
CREATE INDEX idx_replies_created ON replies(created_at);
```

#### **categories (Kategoriler)**
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(10),  -- Emoji
    category_type VARCHAR(20) NOT NULL,  -- 'university', 'department', 'general'
    description TEXT,
    thread_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_type ON categories(category_type);
CREATE INDEX idx_categories_slug ON categories(slug);
```

**Örnek Kayıtlar:**
```sql
-- Üniversiteler
INSERT INTO categories (name, slug, icon, category_type) VALUES
('Selçuk Üniversitesi', 'selcuk-universitesi', '📍', 'university'),
('Konya Teknik Üniversitesi', 'konya-teknik-universitesi', '📍', 'university');

-- Bölümler
INSERT INTO categories (name, slug, icon, category_type) VALUES
('Bilgisayar Mühendisliği', 'bilgisayar-muhendisligi', '🖥️', 'department'),
('Yazılım Mühendisliği', 'yazilim-muhendisligi', '💾', 'department');

-- Genel
INSERT INTO categories (name, slug, icon, category_type) VALUES
('Kariyer & Staj', 'kariyer-staj', '💼', 'general'),
('Proje Ortakları', 'proje-ortaklari', '🤝', 'general');
```

#### **thread_tags (Etiketler)**
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(30) NOT NULL UNIQUE,  -- Lowercase, no spaces
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE thread_tags (
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (thread_id, tag_id)
);

CREATE INDEX idx_thread_tags_thread ON thread_tags(thread_id);
CREATE INDEX idx_thread_tags_tag ON thread_tags(tag_id);
```

#### **thread_files (Dosya Ekleri)**
```sql
CREATE TABLE thread_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,  -- Local storage path (backend/uploads/)
    file_size INTEGER NOT NULL,  -- Bytes
    file_type VARCHAR(50),  -- MIME type
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reply_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

#### **thread_helpful & reply_helpful**
```sql
CREATE TABLE thread_helpful (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(thread_id, user_id)
);

CREATE TABLE reply_helpful (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(reply_id, user_id)
);
```

#### **reports (Raporlar)**
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL REFERENCES users(id),
    content_type VARCHAR(20) NOT NULL,  -- 'thread', 'reply'
    content_id UUID NOT NULL,  -- thread_id veya reply_id
    reason VARCHAR(50) NOT NULL,  -- 'spam', 'inappropriate', 'offtopic', 'harassment', 'other'
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_content ON reports(content_type, content_id);
```

---

## 🔐 15. API Endpoints (Backend)

### 15.1. Kategoriler

#### **GET /api/v1/forum/categories**
Tüm kategorileri gruplu şekilde döner.

**Response:**
```json
{
  "universities": [
    {
      "id": "uuid-1",
      "name": "Selçuk Üniversitesi",
      "slug": "selcuk-universitesi",
      "icon": "📍",
      "thread_count": 234,
      "reply_count": 1203,
      "last_activity": "2025-01-01T14:30:00Z"
    }
  ],
  "departments": [...],
  "general": [...]
}
```

### 15.2. Thread Listesi

#### **GET /api/v1/forum/categories/{category_slug}/threads**
Bir kategorideki threadleri listeler.

**Query Params:**
- `page` (default: 1)
- `per_page` (default: 20, max: 50)
- `sort_by` (default: "newest", options: "newest", "most_replied", "most_helpful")
- `search` (opsiyonel)

**Response:**
```json
{
  "category": {
    "id": "uuid",
    "name": "Bilgisayar Mühendisliği",
    "slug": "bilgisayar-muhendisligi"
  },
  "threads": [
    {
      "id": "uuid-thread",
      "title": "Binary Tree Nasıl Çalışır?",
      "content_preview": "Merhaba, binary tree konusunu...",
      "author": {
        "id": "uuid-user",
        "first_name": "Ali",
        "last_name": "Yılmaz",
        "university": "Selçuk Üniversitesi"
      },
      "is_pinned": false,
      "reply_count": 12,
      "helpful_count": 24,
      "view_count": 156,
      "files": [
        {"file_name": "kod_ornegi.py", "file_size": 2048}
      ],
      "tags": ["veri-yapilari", "algoritma"],
      "created_at": "2025-01-01T12:00:00Z",
      "last_activity": "2025-01-01T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_threads": 892,
    "total_pages": 45
  }
}
```

### 15.3. Thread Detay

#### **GET /api/v1/forum/threads/{thread_id}**
Thread + tüm cevaplarını döner.

**Query Params:**
- `sort_replies` (default: "oldest", options: "oldest", "newest", "most_helpful")

**Response:**
```json
{
  "thread": {
    "id": "uuid",
    "title": "Binary Tree Nasıl Çalışır?",
    "content": "Merhaba, binary tree...",
    "author": {...},
    "category": {...},
    "is_pinned": false,
    "helpful_count": 24,
    "reply_count": 12,
    "view_count": 157,
    "is_helpful_by_me": false,
    "files": [...],
    "tags": [...],
    "can_edit": false,
    "can_delete": false,
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:05:00Z"
  },
  "replies": [
    {
      "id": "uuid-reply",
      "content": "Binary tree şu şekilde...",
      "author": {...},
      "helpful_count": 18,
      "is_helpful_by_me": true,
      "files": [...],
      "can_edit": false,
      "can_delete": false,
      "created_at": "2025-01-01T13:00:00Z",
      "updated_at": null
    }
  ]
}
```

### 15.4. Thread Oluşturma

#### **POST /api/v1/forum/threads**
Yeni thread oluştur.

**Auth:** Required (JWT)

**Request Body (multipart/form-data):**
```json
{
  "category_id": "uuid",
  "title": "Binary Tree Nasıl Çalışır?",
  "content": "Merhaba, binary tree...",
  "tags": ["veri-yapilari", "algoritma"],
  "files": [File, File]  // Max 3, max 10 MB each
}
```

**Validation:**
- title: 10-200 karakter
- content: 20-10,000 karakter
- tags: max 5, her biri max 30 karakter
- files: max 3, her biri max 10 MB, izin verilen tipler

**Response (201 Created):**
```json
{
  "thread_id": "uuid",
  "message": "Konu başarıyla oluşturuldu"
}
```

### 15.5. Cevap Ekleme

#### **POST /api/v1/forum/threads/{thread_id}/replies**
Thread'e cevap ekle.

**Request Body:**
```json
{
  "content": "Binary tree şöyle çalışır...",
  "files": [File, File]
}
```

**Response (201 Created):**
```json
{
  "reply_id": "uuid",
  "message": "Cevap başarıyla eklendi"
}
```

### 15.6. Yararlı İşareti

#### **POST /api/v1/forum/threads/{thread_id}/helpful**
Thread'i yararlı olarak işaretle (toggle).

**Response:**
```json
{
  "is_helpful": true,  // veya false (removed)
  "helpful_count": 25
}
```

#### **POST /api/v1/forum/replies/{reply_id}/helpful**
Cevabı yararlı olarak işaretle (toggle).

### 15.7. Thread Düzenleme

#### **PUT /api/v1/forum/threads/{thread_id}**
Thread'i düzenle (10 dakika içinde veya admin).

**Request Body:**
```json
{
  "title": "Güncellenmiş Başlık",
  "content": "Güncellenmiş içerik",
  "tags": ["yeni-etiket"]
}
```

### 15.8. Thread Silme

#### **DELETE /api/v1/forum/threads/{thread_id}**
Thread'i sil (soft delete).

**Response:**
```json
{
  "message": "Konu silindi"
}
```

### 15.9. Rapor Et

#### **POST /api/v1/forum/reports**
İçerik raporla.

**Request Body:**
```json
{
  "content_type": "thread",  // veya "reply"
  "content_id": "uuid",
  "reason": "spam",
  "description": "Opsiyonel açıklama"
}
```

### 15.10. Arama

#### **GET /api/v1/forum/search**
Forum'da arama yap.

**Query Params:**
- `q` (aranacak kelime)
- `category_id` (opsiyonel)
- `time_filter` (today, week, month, all)
- `sort_by` (relevance, newest, most_replied, most_helpful)
- `page`, `per_page`

---

## 🎨 16. Tasarım Sistemi

### 16.1. Renk Paleti

| Kullanım | Renk | Hex |
|----------|------|-----|
| Kart Arka Plan | Koyu Gri | #16213e |
| Kart Hover | Biraz Açık Gri | #1a2744 |
| Border | Çok Koyu Gri | #0f1624 |
| Pinned Badge | Sarı | #FFC107 |
| Helpful (Aktif) | Mavi | #4A90E2 |
| Helpful (Pasif) | Gri | #6B7280 |
| Tag | Mor | #9333EA |
| Report | Kırmızı | #EF4444 |

### 16.2. Kart Tasarımı

```css
.thread-card {
  background: #16213e;
  border: 1px solid #0f1624;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.thread-card:hover {
  background: #1a2744;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.thread-card.pinned {
  border-left: 4px solid #FFC107;
}
```

### 16.3. Etiket Tasarımı

```css
.tag {
  display: inline-block;
  background: #9333EA;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-right: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.tag:hover {
  background: #A855F7;
}
```

---

## ✅ 17. Başarı Kriterleri

### 17.1. Fonksiyonel Gereksinimler
- [ ] Forum ana sayfası 3 grup kategori gösteriyor
- [ ] Kategori tıklayınca thread listesi açılıyor
- [ ] Thread tıklayınca detay + cevaplar görünüyor
- [ ] Yeni konu açma çalışıyor (kategori, başlık, içerik, dosya, etiket)
- [ ] Cevap yazma çalışıyor (metin + dosya)
- [ ] Yararlı butonu toggle çalışıyor (thread + reply)
- [ ] Düzenleme çalışıyor (10 dakika + admin)
- [ ] Silme çalışıyor (10 dakika + admin + confirm)
- [ ] Arama çalışıyor (global + kategori içi)
- [ ] Etiket tıklayınca filtreleme çalışıyor
- [ ] Mention autocomplete çalışıyor
- [ ] Rapor et modal açılıyor ve kayıt ediliyor
- [ ] Pin özelliği çalışıyor (sadece admin)
- [ ] Sayfalama çalışıyor (20 konu/sayfa)

### 17.2. Teknik Gereksinimler
- [ ] Backend API endpoint'leri çalışıyor
- [ ] Database schema oluşturuldu
- [ ] Dosya yükleme çalışıyor (max 10 MB, 3 dosya)
- [ ] Validasyonlar çalışıyor
- [ ] Auth middleware çalışıyor (sadece verified user)
- [ ] Unit test'ler yazıldı (%80+ coverage)
- [ ] E2E test'ler yazıldı

### 17.3. Performans
- [ ] Thread listesi < 1 saniye
- [ ] Thread detay sayfası < 1.5 saniye
- [ ] Arama sonuçları < 2 saniye
- [ ] Dosya yükleme progress bar gösteriliyor

### 17.4. UX
- [ ] Loading state'leri var
- [ ] Error mesajları anlaşılır
- [ ] Success toast mesajları gösteriliyor
- [ ] Responsive tasarım mobilde çalışıyor
- [ ] Keyboard navigation çalışıyor

---

## 📝 18. Notlar ve Gelecek Geliştirmeler

### 18.1. MVP'de Yok (V2'de Eklenecek)
- ❌ Quote/Alıntı yapma
- ❌ Dosya önizleme (PDF viewer, kod syntax highlighting)
- ❌ Moderatör rolü (şimdilik sadece Admin)
- ❌ Alt kategoriler
- ❌ Kullanıcı engelleme
- ❌ Email bildirimleri (sadece in-app)
- ❌ Kullanıcı profil sayfası (istatistikler)

### 18.2. Gelecekte Eklenebilecekler
- 🔮 Nested replies (Reddit gibi)
- 🔮 Cevaplara cevap (thread tree)
- 🔮 Poll/Anket ekleme
- 🔮 Kod bloğu syntax highlighting
- 🔮 LaTeX desteği (matematik formülleri)
- 🔮 Thread bookmark (favori)
- 🔮 Trending konular widget'ı
- 🔮 "Çözüldü" işareti (Q&A tarzı)

### 18.3. Bağımlılıklar
Bu özellik için öncelikle tamamlanmış olması gerekenler:
- ✅ 001 - Landing Page (tamamlandı)
- ✅ 002 - Register Page (tamamlandı)
- ✅ 003 - Login Page (tamamlandı)
- ✅ 004 - Dashboard (tamamlandı)

---

## 🎯 Özet

Forum, Technopat benzeri klasik forum yapısında, üniversite öğrencilerine özel, profilli bir tartışma platformudur. Akademik yardımlaşma ve bilgi paylaşımı odaklıdır. Dosya paylaşımı, etiketleme, arama, yararlı butonu, mention gibi modern özellikler içerir. Kategoriler üniversite, bölüm ve genel konular olarak 3 gruba ayrılmıştır.

**核心 Özellikler:**
- ✅ 3 grup kategori (Üniversite, Bölüm, Genel)
- ✅ Konu açma + cevap yazma (dosya ekleme destekli)
- ✅ Yararlı butonu (like yerine)
- ✅ Etiket sistemi (serbest, autocomplete)
- ✅ Arama (global + kategori içi)
- ✅ Mention (@kullanıcı)
- ✅ Düzenleme/Silme (10 dakika + admin)
- ✅ Rapor et (spam, uygunsuz içerik)
- ✅ Pin (sadece admin)
- ✅ Profilli kullanıcılar (anonim yok)

---

**Hazırlayan:** AI Assistant  
**Versiyon:** 1.0  
**Son Güncelleme:** 2026-01-01

