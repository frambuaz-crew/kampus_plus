# Scripts Klasörü

Geliştirme ve başlatma script'leri.

## 📁 Dosyalar

---

### `seed_data.py`
Veritabanına örnek kullanıcılar ekler (geliştirme için).

**Kullanım:**
```bash
python scripts/seed_data.py
```

**Oluşturulan Kullanıcılar:**
- Öğrenci 1: `student1@selcuk.edu.tr` / `Student123!`
- Öğrenci 2: `student2@selcuk.edu.tr` / `Student123!`
- Admin: `admin@kampusplus.edu.tr` / `admin123`

**Gereksinimler:**
- Veritabanı çalışıyor olmalı
- Alembic migration'ları uygulanmış olmalı

---

### `init_faiss.py`
FAISS vector index'lerini başlatır. Vector store'lar için boş index'ler oluşturur.

**Kullanım:**
```bash
python scripts/init_faiss.py
```

**Oluşturulan Index'ler:**
- `vdb_official.index` - Resmi üniversite belgeleri
- `vdb_user.index` - Kullanıcı yüklemeleri
- `vdb_social.index` - Forum içerikleri

**Not:** Index'ler zaten varsa uyarı verir, yoksa otomatik oluşturur.

---

### `populate_vectors.py`
Test verilerinden vector store'u doldurur. `metadata_official.py` dosyasındaki verileri kullanır.

**Kullanım:**
```bash
python scripts/populate_vectors.py
```

**Gereksinimler:**
- `metadata_official.py` dosyası mevcut olmalı
- Google Gemini API key ayarlanmış olmalı (`.env` dosyasında)

---

### `metadata_official.py`
Test verileri için metadata dosyası. AI Assistant için kampüs bilgileri içerir.

**İçerik:**
- Akademik Takvim
- Kütüphane Hizmetleri
- Ofis Saatleri
- Yemekhane ve Kantin Bilgileri

**Not:** AI Assistant sadece kampüs bilgileri ve platform navigasyonu için kullanılır (ders içeriği yok).

---

## 🔄 Çalıştırma Sırası

1. **`init.sql`** - Veritabanı başlatma (Docker otomatik yapar)
2. **Alembic migration'ları** - `alembic upgrade head`
3. **`seed_data.py`** - Örnek kullanıcılar
4. **`init_faiss.py`** - Vector index'leri (opsiyonel, otomatik oluşturulur)
5. **`populate_vectors.py`** - Vector store doldurma (opsiyonel, test için)

---

## 📝 Notlar

- Tüm script'ler Türkçe mesajlar kullanır
- Script'ler otomatik olarak gerekli dizinleri oluşturur
- Hata durumunda script'ler açıklayıcı mesajlar gösterir

