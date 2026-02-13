# 5 Kişilik Görev Dağılımı – Dosya Çakışmasını Önleme

**Amaç:** 5 kişi aynı anda (veya en fazla 2’şer kişi paralel) çalışırken dosya çakışması (merge conflict) olmaması için modül ve dosya bazlı dağılım.

**Kural:** Aynı dosyayı aynı anda sadece **bir kişi** değiştirmeli.

---

## 1. Çakışma Riskli Ortak Dosyalar

Bu dosyalar birden fazla modülde değişiyor; kimin ne zaman dokunacağı net olmalı:

| Dosya / Alan | Dokunan modüller | Risk |
|-------------|------------------|------|
| `backend/src/main.py` | Tüm backend modüller (router include) | **Yüksek** |
| `frontend/src/App.tsx` (veya routes) | Tüm sayfalar (route tanımı) | **Yüksek** |
| `backend/src/api/routes/auth.py` | 002, 003, 015, 016, 017 (kayıt, giriş, doğrulama, şifre) | **Yüksek** |
| `frontend` Layout (Header, Sidebar) | 004 Dashboard; 012 (bildirim), 019 (arama) Header’a bağlı | **Orta** |
| `frontend` AuthContext / ProtectedRoute | 004 oluşturur, tüm korumalı sayfalar kullanır | **Orta** |
| `backend` Alembic migrations | Her modül kendi migration dosyası (dosya adı farklı) | **Düşük** |
| `.env` / config | Bir kişi yönetmeli | **Düşük** |

---

## 2. Önerilen Kişi–Modül Eşlemesi (5 Kişi)

Temel fikir: **Ortak dosyaları sırayla veya tek “entegratör” ile güncellemek.**

### Kişi 1 – Auth & Temel Akış (Backend ağırlıklı)
**Sahip olduğu alan:** `backend/src/api/routes/auth.py`, auth ile ilgili backend.

| Modül | Açıklama | Dokunduğu ortak dosya |
|-------|----------|------------------------|
| 002 Register | Kayıt, email doğrulama backend | auth.py, main.py (1 kez) |
| 015 Email Verification | (002 ile birlikte) | auth.py |
| 003 Login | Giriş, refresh, logout | auth.py |
| 016 Forgot Password | Şifremi unuttum | auth.py |
| 017 Reset Password | Şifre sıfırlama | auth.py |

**Sıra:** 002 + 015 → 003 → 016 → 017. Hepsi aynı kişide olduğu için `auth.py` çakışmaz.

---

### Kişi 2 – Public Sayfalar & Dashboard Layout
**Sahip olduğu alan:** Landing, Terms, Error, **Dashboard layout**, AuthContext, router yapısı.

| Modül | Açıklama | Dokunduğu ortak dosya |
|-------|----------|------------------------|
| 001 Landing Page | Ana sayfa, Header/Footer | App.tsx (route) |
| 018 Terms of Service | Kullanım koşulları sayfası | App.tsx (route) |
| 020 Error Pages | 404, 500, 403 | App.tsx (route) |
| 004 Dashboard | Layout, Sidebar, Header, AuthContext, ProtectedRoute | App.tsx, Layout bileşenleri |

**Sıra:** 001 → 018 → 020 → 004. App.tsx’e route eklemeleri tek kişi yaptığı için çakışma olmaz. 004 bittikten sonra diğerleri dashboard altı route’larını entegratöre verir.

---

### Kişi 3 – Forum & Akademik
**Kendi alanı:** Sadece kendi route ve sayfaları; `main.py` / `App.tsx` için sadece “entegratöre snippet verir”.

| Modül | Açıklama | Dokunduğu ortak dosya |
|-------|----------|------------------------|
| 005 Forum | Kategoriler, konular, cevaplar | main.py, App.tsx → **entegratör ekler** |
| 006 Academic | Takvim, ders programı, katkı | main.py, App.tsx → **entegratör ekler** |

**Kural:** Kendi dosyaları: `backend/.../forum/`, `.../academic/`, `frontend/.../Forum/`, `.../Academic/`. `main.py` ve `App.tsx`’e dokunmaz; snippet verir.

---

### Kişi 4 – Marketplace & Kariyer & Mesajlar
**Kendi alanı:** Pazar, kariyer, mesajlaşma; ortak dosyalara sadece snippet ile katkı.

| Modül | Açıklama | Dokunduğu ortak dosya |
|-------|----------|------------------------|
| 007 Marketplace | İlanlar, resim, rapor | main.py, App.tsx → **entegratör** |
| 008 Career | İş/staj ilanları, başvuru | main.py, App.tsx → **entegratör** |
| 013 Messages | Merkezi mesajlaşma (pazar + kariyer) | main.py, App.tsx → **entegratör** |

**Kural:** 013, 007 ve 008 ile entegre; hepsi aynı kişide olduğu için mesaj/ilan entegrasyonu tek elde kalır.

---

### Kişi 5 – AI, Profil, Ayarlar, Bildirimler, Arama, Admin
**Kendi alanı:** AI, profil, ayarlar, bildirimler, global arama, admin paneli; ortak dosyalara snippet.

| Modül | Açıklama | Dokunduğu ortak dosya |
|-------|----------|------------------------|
| 009 AI Assistant | Gemini, sohbet, knowledge base | main.py, App.tsx → **entegratör** |
| 010 Profile | Profil sayfası, düzenleme, ilanlarım | main.py, App.tsx → **entegratör** |
| 011 Settings | Şifre, tema, iletişim, hesap silme | main.py, App.tsx → **entegratör** |
| 012 Notifications | Bildirimler, Header dropdown | main.py, App.tsx + **Header** (Kişi 2 ile koordinasyon) |
| 019 Global Search | Global arama | main.py, App.tsx + **Header SearchBar** (Kişi 2 ile koordinasyon) |
| 014 Admin Panel | Admin layout, tüm admin sayfaları | main.py, App.tsx → **entegratör** |

**Önemli:** 012 ve 019, Dashboard Header’a (bildirim ikonu, arama çubuğu) dokunur. Kişi 2 Dashboard’u bitirdikten sonra Kişi 5, Header’a sadece kendi bileşenlerini (NotificationBell, SearchBar) ekleyecek şekilde çalışmalı; gerekirse önce arayüz (props) Kişi 2 ile netleştirilip sonra Kişi 5 eklemeyi yapabilir.

---

## 3. Ortak Dosyaların Yönetimi: “Entegratör” Modeli

- **main.py:** Sadece **bir kişi** (örn. Kişi 2 veya takım kararıyla sabit bir “entegratör”) tüm `include_router(...)` satırlarını ekler. Diğerleri sadece kendi router dosyasını yazar ve “şu satırı main.py’e ekle” diye snippet verir.
- **App.tsx (routes):** Aynı kişi tüm yeni route’ları bu dosyaya ekler. Diğerleri route snippet’i verir (path, element, vs.).
- **Header (bildirim / arama):** 012 ve 019 için Kişi 5 çalışır; Header’ı ilk oluşturan Kişi 2 ile “slot” ve props konuşulur (örn. “Header’da NotificationBell ve SearchBar alanı bırak”) ki aynı anda aynı satırlara yazılmasın.

Böylece aynı anda 5 kişi bile çalışsa, `main.py` ve `App.tsx` (ve gerekirse Header) tek elden güncellenir; çakışma riski büyük ölçüde kalkar.

---

## 4. Zamanlama ve Sıra (Çakışmayı Azaltmak İçin)

1. **Önce (sırayla veya 2 kişi paralel):**
   - Kişi 1: 002 + 015 → 003 → 016 → 017 (auth tamamlanır).
   - Kişi 2: 001 → 018 → 020 → 004 (public sayfalar + dashboard layout biter).
2. **004 bittikten sonra:** Kişi 3, 4, 5 kendi modüllerine aynı anda girebilir (005, 006 / 007, 008, 013 / 009, 010, 011, 012, 019, 014). Hepsi sadece kendi klasörlerine ve snippet ile entegratöre katkı yapar.
3. **Header’a dokunan işler (012, 019):** Kişi 5, 004 tamamlandıktan sonra Header’a ekleme yapar; mümkünse Kişi 2 ile kısa bir “interface” konuşması yapılır.

---

## 5. Kısa Özet Tablo

| Kişi | Modüller | Ortak dosyaya doğrudan kim yazar? |
|------|----------|-------------------------------------|
| 1 | 002, 015, 003, 016, 017 | Sadece Kişi 1 → auth.py, main.py (auth router) |
| 2 | 001, 018, 020, 004 | Sadece Kişi 2 → App.tsx, Layout, AuthContext, main.py (dashboard vb.) |
| 3 | 005, 006 | Sadece kendi dosyaları; main/App → entegratör |
| 4 | 007, 008, 013 | Sadece kendi dosyaları; main/App → entegratör |
| 5 | 009, 010, 011, 012, 019, 014 | Kendi dosyaları + Header (012, 019); main/App → entegratör |

**Entegratör:** main.py ve App.tsx’i güncelleyen tek kişi (örn. Kişi 2 veya rotasyon).

---

## 6. Git / Branch Stratejisi (İsteğe Bağlı)

- Her kişi kendi feature branch’inde çalışır: `feature/001-landing`, `feature/002-register`, `feature/005-forum`, vb.
- main.py ve App.tsx değişiklikleri mümkünse **tek bir “integration” branch**’te veya develop’da entegratör tarafından uygulanır; diğerleri sadece kendi router/route snippet’ini verir.
- Merge sırası önerisi: 001, 002+015, 003, 016, 017 → 018, 020 → 004 → sonra 005, 006, 007, 008, 013, 009, 010, 011, 012, 019, 014 (sıra takıma göre değişebilir).

Bu yapı ile 5 kişi aynı anda çalışsa bile dosya çakışması büyük ölçüde önlenir; en kritik nokta main.py ve App.tsx’in tek elden güncellenmesidir.
