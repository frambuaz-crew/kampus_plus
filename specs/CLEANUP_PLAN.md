# 🧹 KAMPÜS+ Proje Temizlik Planı

**Tarih:** 2 Ocak 2026  
**Amaç:** MVP'de olmayan gereksiz dosya ve klasörleri temizlemek

---

## ❌ SİLİNECEK DOSYALAR VE KLASÖRLER

### 1. 📄 Document Upload Sistemi (MVP'de YOK)

**Backend:**
- ❌ `backend/src/models/document.py` - UserDocument, OfficialDocument, VectorEmbedding modelleri
- ❌ `backend/src/api/routes/documents.py` - Document upload endpoints
- ❌ `backend/src/api/routes/tasks.py` - Document processing background tasks
- ❌ `backend/src/services/pdf_service.py` - PDF processing (sadece document upload için)
- ❌ `backend/src/services/malware_service.py` - Malware scanning (sadece document upload için)

**Frontend:**
- ❌ `frontend/src/pages/DocumentsPage.tsx`
- ❌ `frontend/src/components/documents/` - Tüm klasör (DocumentList, UploadForm, test dosyaları)

**Not:** `s3_service.py` ve `vector_service.py` AI Assistant için gerekli olabilir, kontrol edilmeli.

---

### 2. 📚 Course/Enrollment Sistemi (MVP'de YOK)

**Backend:**
- ❌ `backend/src/models/course.py` - Course, Enrollment modelleri
- ❌ `backend/src/api/routes/courses.py` - Courses endpoints

**Frontend:**
- ❌ `frontend/src/pages/CoursesPage.tsx`

**Migration:**
- ❌ `backend/alembic/versions/0810fca11896_add_missing_fields_to_courses_and_.py` - Course migration (ama initial migration'da da var, kontrol et)

**Not:** `sync.py` modeli akademik takvim için gerekli olabilir, kontrol edilmeli.

---

### 3. 📊 Statistics Page (MVP'de YOK)

**Frontend:**
- ❌ `frontend/src/pages/StatisticsPage.tsx`

---

### 4. ❓ Help Page (MVP'de YOK)

**Frontend:**
- ❌ `frontend/src/pages/HelpPage.tsx`

---

### 5. 👨‍💼 Admin Dashboard (MVP'de YOK)

**Frontend:**
- ❌ `frontend/src/pages/admin/` - Tüm klasör (AdminDashboard.tsx, AdminLogin.tsx, README.md)

**Backend:**
- ⚠️ Admin route'ları kontrol et (muhtemelen yok)

---

### 6. 🧪 Test Sayfası (Gereksiz)

**Frontend:**
- ❌ `frontend/src/pages/ChatTestPage.tsx`

---

### 7. 📝 Gereksiz Dokümantasyon (Opsiyonel)

**Docs:**
- ⚠️ `docs/API_DOCUMENTATION.md` - Eski API dokümantasyonu (güncellenmeli mi?)
- ⚠️ `docs/E2E_TEST_RESULTS.md` - Test sonuçları (geçici dosya)
- ⚠️ `docs/DOCKER_TEST_GUIDE.md` - Test guide (gerekli mi?)

---

## ⚠️ DİKKAT EDİLMESİ GEREKENLER

### 1. `backend/src/models/sync.py`
- **Durum:** Akademik takvim sync için kullanılıyor olabilir
- **Karar:** MVP'de akademik takvim var, bu model gerekli olabilir
- **Aksiyon:** Kontrol et, eğer sadece document sync için ise sil

### 2. `backend/src/services/s3_service.py`
- **Durum:** Document upload için kullanılıyor
- **Karar:** AI Assistant için profile picture upload gerekebilir
- **Aksiyon:** Koru, ama document upload referanslarını temizle

### 3. `backend/src/services/vector_service.py`
- **Durum:** Document embeddings için kullanılıyor
- **Karar:** AI Assistant RAG için gerekli
- **Aksiyon:** Koru, ama user document referanslarını temizle

### 4. `backend/src/services/pdf_service.py`
- **Durum:** PDF processing için
- **Karar:** Sadece document upload için kullanılıyor
- **Aksiyon:** SİL (AI Assistant başka bir şekilde PDF okuyorsa kontrol et)

### 5. Migration Dosyaları
- `backend/alembic/versions/429265287a30_initial_schema_13_entities.py` - İçinde Course, Enrollment, Document tabloları var
- **Aksiyon:** Yeni migration oluştur, eski tabloları kaldır

### 6. `backend/src/models/__init__.py`
- Document, Course, Enrollment import'larını kaldır

### 7. `backend/src/main.py`
- `documents_router` ve `courses_router` import'larını kaldır
- Router include'larını kaldır

### 8. `frontend/src/App.tsx`
- `/documents`, `/courses`, `/stats`, `/help`, `/admin/*` route'larını kaldır
- `ChatTestPage` import'unu kaldır

---

## 📋 TEMİZLİK ADIMLARI

### Adım 1: Backend Model Temizliği
1. [ ] `backend/src/models/document.py` sil
2. [ ] `backend/src/models/course.py` sil
3. [ ] `backend/src/models/__init__.py` güncelle (import'ları kaldır)
4. [ ] `backend/src/models/sync.py` kontrol et (akademik takvim için gerekli mi?)

### Adım 2: Backend API Temizliği
1. [ ] `backend/src/api/routes/documents.py` sil
2. [ ] `backend/src/api/routes/courses.py` sil
3. [ ] `backend/src/api/routes/tasks.py` sil
4. [ ] `backend/src/main.py` güncelle (router import'larını kaldır)

### Adım 3: Backend Service Temizliği
1. [ ] `backend/src/services/pdf_service.py` sil
2. [ ] `backend/src/services/malware_service.py` sil
3. [ ] `backend/src/services/s3_service.py` kontrol et (profile picture için gerekli mi?)
4. [ ] `backend/src/services/vector_service.py` kontrol et (AI Assistant için gerekli, user document referanslarını temizle)

### Adım 4: Frontend Page Temizliği
1. [ ] `frontend/src/pages/DocumentsPage.tsx` sil
2. [ ] `frontend/src/pages/CoursesPage.tsx` sil
3. [ ] `frontend/src/pages/StatisticsPage.tsx` sil
4. [ ] `frontend/src/pages/HelpPage.tsx` sil
5. [ ] `frontend/src/pages/ChatTestPage.tsx` sil
6. [ ] `frontend/src/pages/admin/` klasörünü sil

### Adım 5: Frontend Component Temizliği
1. [ ] `frontend/src/components/documents/` klasörünü sil

### Adım 6: Frontend Route Temizliği
1. [ ] `frontend/src/App.tsx` güncelle (route'ları kaldır, import'ları temizle)

### Adım 7: Test Dosyaları Temizliği (Opsiyonel)
1. [ ] `backend/tests/integration/test_upload_flow.py` sil
2. [ ] `backend/tests/unit/test_pdf_service.py` sil
3. [ ] `backend/tests/performance/test_pdf_performance.py` sil
4. [ ] `backend/tests/contract/test_courses_endpoints.py` sil
5. [ ] `frontend/src/components/documents/__tests__/` sil
6. [ ] `frontend/src/components/forum/__tests__/` - Forum testleri gerekli, koru

### Adım 8: Migration Temizliği
1. [ ] Yeni migration oluştur (Course, Enrollment, Document tablolarını kaldır)
2. [ ] `backend/alembic/versions/0810fca11896_add_missing_fields_to_courses_and_.py` sil (eğer sadece course için ise)

### Adım 9: Import/Reference Temizliği
1. [ ] Tüm dosyalarda `from src.models.document import` referanslarını bul ve kaldır
2. [ ] Tüm dosyalarda `from src.models.course import` referanslarını bul ve kaldır
3. [ ] Tüm dosyalarda `from src.api.routes.documents import` referanslarını bul ve kaldır
4. [ ] Tüm dosyalarda `from src.api.routes.courses import` referanslarını bul ve kaldır
4. [ ] Tüm dosyalarda `UserDocument`, `Course`, `Enrollment` referanslarını bul ve kaldır

---

## ✅ KORUNACAK DOSYALAR

### Backend:
- ✅ `backend/src/models/user.py` - User modeli (gerekli)
- ✅ `backend/src/models/forum.py` - Forum modeli (gerekli, ama anonim kısımları kaldırılacak)
- ✅ `backend/src/models/conversation.py` - AI chat için (gerekli)
- ✅ `backend/src/models/sync.py` - Akademik takvim için (kontrol et)
- ✅ `backend/src/services/ai_service.py` - AI Assistant (gerekli)
- ✅ `backend/src/services/auth_service.py` - Authentication (gerekli)
- ✅ `backend/src/services/email_service.py` - Email (gerekli)
- ✅ `backend/src/services/forum_service.py` - Forum (gerekli)
- ✅ `backend/src/services/s3_service.py` - Profile picture için gerekebilir
- ✅ `backend/src/services/vector_service.py` - AI Assistant RAG için (gerekli, ama user document referanslarını temizle)

### Frontend:
- ✅ `frontend/src/pages/NewDashboard.tsx` - Dashboard (gerekli)
- ✅ `frontend/src/pages/ChatPage.tsx` - AI Assistant (gerekli)
- ✅ `frontend/src/pages/ForumPage.tsx` - Forum (gerekli, ama güncellenecek)
- ✅ `frontend/src/pages/SettingsPage.tsx` - Settings (gerekli, ama güncellenecek)
- ✅ `frontend/src/pages/VerifyEmailPage.tsx` - Email verification (gerekli)

---

## 🎯 ÖNCELİK SIRASI

1. **Yüksek Öncelik:** Document ve Course sistemlerini tamamen kaldır
2. **Orta Öncelik:** Frontend sayfalarını ve route'ları temizle
3. **Düşük Öncelik:** Test dosyalarını ve dokümantasyonu temizle

---

## ⚠️ UYARI

**ÖNCE BACKUP AL!** Bu temizlik işleminden önce:
1. Git commit yap (mevcut durumu kaydet)
2. Branch oluştur (`cleanup` branch)
3. Değişiklikleri test et
4. Her adımı commit'le

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026

