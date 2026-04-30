# Teknik Değişiklik Raporu — Admin Dropdown Kilit & Veri Bütünlüğü Düzeltmeleri

**Tarih:** 2026-04-30  
**Kapsam:** 12 dosya — Backend (3) + Seed (1) + Frontend (8)  
**Amaç:** Üniversite admin kullanıcısının modal'da yanlış/boş üniversite görmesi, fakülte dropdown'ının kilitli modda sonsuz döngüye girmesi ve Kampusplus hayalet verilerinin sistemden temizlenmesi.

---

## 1. BACKEND DEĞİŞİKLİKLERİ

### 1.1 `backend/src/api/routes/auth.py` — Eksik ID Alanlarının Eklenmesi

**Sorun:** Login endpoint'i `UserResponse` içinde `university_id` ve `faculty_id` alanlarını döndürmüyordu. Frontend bu UUID'lere ihtiyaç duyuyor ancak bunları tahmin etmek zorunda kalıyordu.

**Değişiklikler:**

```python
# ÖNCE (Pydantic şeması)
class UserResponse(BaseModel):
    university: Optional[str]
    department_id: Optional[str] = None
    department: Optional[str] = None

# SONRA
class UserResponse(BaseModel):
    university: Optional[str]
    university_id: Optional[str] = None      # YENİ: Üniversite UUID'si
    department_id: Optional[str] = None
    department: Optional[str] = None
    faculty_id: Optional[str] = None         # YENİ: Fakülte UUID'si
```

Login response builder'a eklenenler:

```python
# ÖNCE
university=official_university_name,
department_id=user.department_id,

# SONRA
university=official_university_name,
university_id=user.university_id,                                       # UUID direkt DB'den
department_id=user.department_id,
faculty_id=user.department_rel.faculty_id if user.department_rel else None,  # İlişkiden
```

**Etki:** Frontend artık login anında `university_id` ve `faculty_id`'yi bilir; hiçbir ek API çağrısı veya isim bazlı arama yapmak zorunda kalmaz.

---

### 1.2 `backend/src/services/university_service.py` — JSONB Cast Sorunu

**Sorun:** `email_domains` sütunu PostgreSQL'de `JSONB` tipindedir. SQLAlchemy'nin `.like()` operatörü JSONB üzerinde `operator does not exist: jsonb ~~ unknown` hatası fırlatıyordu; çünkü JSONB doğrudan string operatörlerine uymaz.

**Değişiklik:**

```python
# ÖNCE — JSONB üzerinde .like() → runtime hatası
University.email_domains.like(f'%"{full_domain}"%'),
University.email_domains.like(f'%"{normalized_domain}"%'),

# SONRA — önce String'e cast, sonra ilike (büyük/küçük harf duyarsız)
cast(University.email_domains, String).ilike(f"%{full_domain}%"),
cast(University.email_domains, String).ilike(f"%{normalized_domain}%"),
```

**Import değişikliği:**
```python
from sqlalchemy import select, or_, cast, String   # cast ve String eklendi
```

**Etki:** Üniversite email domain eşleştirmesi artık büyük/küçük harf bağımsız çalışır ve PostgreSQL'de tip hatası almaz.

---

### 1.3 `backend/src/api/routes/academic.py` — ID-to-Name Çözümlemesi ve Onay Akışı

#### 1.3.1 Üniversite Adı Çözümleme (ID → İsim)

**Sorun:** Takvim olayları ve ders programları yanıtlarında `university` alanı ham UUID (`university_id`) döndürülüyordu. Frontend bunu okunabilir bir üniversite adıymış gibi gösteriyordu.

**Çözüm:** Her liste ve tekil kayıt endpoint'ine `University` modeli import edildi, UUID'ler bir `uni_map` dict üzerinden isme dönüştürüldü.

```python
# Yeni yardımcı fonksiyon imzası
def build_schedule_response(
    schedule: CourseSchedule,
    university_name: Optional[str] = None   # YENİ parametre
) -> CourseScheduleResponse:
    return CourseScheduleResponse(
        university=university_name or (schedule.university_id or ""),
        ...
    )
```

**Toplu çözümleme pattern'i** (liste endpoint'leri için):
```python
uni_ids = {ev.university_id for ev in events if ev.university_id}
uni_map: dict[str, str] = {}
if uni_ids:
    uni_res = await session.execute(
        select(University).where(University.id.in_(list(uni_ids)))
    )
    for u in uni_res.scalars().all():
        uni_map[u.id] = u.name
```

Bu pattern şu endpoint'lere eklendi:
- `GET /academic/calendar/events`
- `GET /academic/calendar/upcoming`
- `GET /admin/calendars/pending`
- `GET /admin/calendars/approved`
- `GET /admin/schedules/pending`
- `GET /admin/schedules/approved`
- `PATCH /admin/calendars/{id}/approve`
- `PATCH /admin/calendars/{id}`
- `POST /admin/calendars`
- `PATCH /admin/schedules/{id}/approve`
- `PATCH /admin/schedules/{id}`

#### 1.3.2 Onay Filtrelerinin Kaldırılması

**Sorun:** Yüklenen belgeler öğrencilere gösterilmiyordu çünkü `is_approved` filtresi tüm yeni yüklemeleri gizliyordu.

```python
# ÖNCE — sadece onaylı kayıtlar kullanıcıya gösteriliyordu
conditions = [AcademicCalendarEvent.is_approved.is_(True)]

# SONRA — filtre kaldırıldı, tüm kayıtlar görünür
conditions = []
```

**Yükleme sırasında `is_approved` değişikliği:**
```python
# ÖNCE — sadece admin rolleri anında onaylıydı
is_approved_val = current_user.role in (UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN)

# SONRA — tüm yüklemeler anında aktif
is_approved_val = True
```

**Etki:** Yükleme → anında görünüm. Ayrı bir "Onayla" adımı artık gerekmiyor.

---

## 2. SEED SİSTEMİ

### `backend/scripts/ensure_initial_data.py` — Admin-Üniversite Bağlama Mantığı

#### 2.1 Kampusplus Hayalet Üniversitesinin Kaldırılması

**Sorun:** Super admin ve test hesapları var olmayan "Kampusplus" isimli bir üniversiteye bağlıydı. Bu üniversite seed script'i içinde `_ensure_super_admin_university()` ile yaratılıyordu — gerçek üniversitelerden tamamen bağımsız sahte bir kayıt.

```python
# ÖNCE — hayalet veri
SUPER_ADMIN_UNIVERSITY_NAME = "Kampusplus"
SUPER_ADMIN_FACULTY_NAME = "Genel"
SUPER_ADMIN_DEPARTMENT_NAME = "Genel"

# SONRA — gerçek üniversiteye bağlama
SUPER_ADMIN_UNIVERSITY_NAME = "Konya Gıda ve Tarım Üniversitesi"
```

`_ensure_super_admin_university()`, `_ensure_super_admin_faculty()`, `_ensure_super_admin_department()` fonksiyonları artık kullanılmıyor; bunların yerine `_get_university_by_name_required()` çağrılıyor.

#### 2.2 Email Domain Temizliği

```python
# ÖNCE
"kgtu_admin@kampusplus.edu.tr"
"kgtu_student@kampusplus.edu.tr"
"selcuk_student@kampusplus.edu.tr"

# SONRA — gerçek domain yapısı
"kgtu_admin@kgtu.edu.tr"
"kgtu_student@kgtu.edu.tr"
"selcuk_student@selcuk.edu.tr"
```

#### 2.3 Idempotent Güncelleme Mantığı

**Sorun:** Script daha önce var olan kullanıcıları hiç güncellemiyordu (`SKIP`). Yanlış `university_id` ile kayıtlı kullanıcılar düzeltilmiyordu.

**Yeni davranış:** Belirli hesaplar için `university_id` düzeltmesi yapılır:

```python
# Mevcut kullanıcı varsa
if existing_user:
    if account.email == "kgtu_admin@kgtu.edu.tr":
        # ILIKE ile esnek üniversite araması
        kgtu_university = await _get_university_by_name_ilike_required(session, KGTU_UNI_NAME)
        existing_user.university = kgtu_university.name
        existing_user.university_id = kgtu_university.id
        # department_id yoksa ekle
        if not existing_user.department_id:
            _, department_id = uni_dep_map[account.university_name]
            existing_user.department_id = department_id
        await session.commit()
        updated_count += 1
    elif account.email == SUPER_ADMIN_EMAIL:
        university_id, department_id = uni_dep_map[account.university_name]
        existing_user.university_id = university_id
        ...
    else:
        skipped_count += 1   # diğer hesaplar dokunulmaz
```

#### 2.4 `_get_university_by_name_ilike_required()` — Yeni Yardımcı

Kesin eşleşme bulunamadığında büyük/küçük harf ve kısmi eşleşme toleranslı arama:

```python
async def _get_university_by_name_ilike_required(session, university_name: str) -> University:
    result = await session.execute(
        select(University).where(University.name.ilike(f"%{university_name}%"))
    )
    university = result.scalar_one_or_none()
    if not university:
        raise RuntimeError(...)
    return university
```

**Log çıktısı:**
```
[UPDATE] kgtu_admin@kgtu.edu.tr university_id guncellendi.
[DONE] created=0, updated=2, skipped=1
```

---

## 3. FRONTEND DROPDOWN MANTIĞI

### `frontend/src/components/institution/CascadingInstitutionSelect.tsx`

Bu bileşen, oturumun en karmaşık değişikliklerini aldı. Üç ayrı hata aynı anda mevcuttu.

#### 3.1 Sonsuz Döngü Sorunu

**Kök Neden:** `selectedUnivId` state'i başlangıçta `''` olarak başlıyor, ancak `useEffect` içinde `setSelectedUnivId(match.id)` çağrılıyordu. Bu `onChange` tetikleyicisi üst bileşenlerde yeni `initialUniversityId` prop'u üretiyordu → yeni prop yeni render → yeni effect → döngü.

**Çözüm — `hasInitializedRef`:**
```typescript
const hasInitializedRef = React.useRef(false);

useEffect(() => {
  if (!initialUniversityId || hasInitializedRef.current) return;
  hasInitializedRef.current = true;   // Sadece BİR KERE çalış
  setSelectedUnivId(initialUniversityId);
  loadFaculties(initialUniversityId);
  ...
}, [initialUniversityId, lockedUniversity]);
```

**`selectedUnivId` başlangıç değeri düzeltmesi:**
```typescript
// ÖNCE — her zaman boş başlıyordu
const [selectedUnivId, setSelectedUnivId] = useState('');

// SONRA — prop varsa doğrudan başlat
const [selectedUnivId, setSelectedUnivId] = useState<string>(initialUniversityId || '');
```

#### 3.2 Kilit Mekanizması (`isPrefilledUniversity`)

**Sorun:** `initialUniversityId` verildiğinde bile bileşen tüm üniversite listesini API'den çekip seçili olanı aramaya çalışıyordu. Bu hem gereksiz bir network isteğiydi hem de yanlış üniversiteyle eşleşme riski taşıyordu.

**Çözüm:**
```typescript
const isPrefilledUniversity = Boolean(initialUniversityId);

// Üniversite listesi yükleme effect'i
useEffect(() => {
  if (initialUniversityId) {    // ID varsa listeyi hiç çekme
    setLoadingUni(false);
    return;
  }
  // ... getUniversities() API çağrısı
}, [...]);

// Üniversite değişim effect'i
useEffect(() => {
  if (!isPrefilledUniversity) {
    loadFaculties(selectedUnivId);   // Sadece serbest modda fakülte çek
  }
}, [selectedUnivId, isPrefilledUniversity]);
```

**`loadFaculties` ayrı fonksiyon olarak çıkarıldı:**
Daha önce her effect kendi içinde `getFaculties()` çağırıyordu, bu da mantık çoğalmasına yol açıyordu. Şimdi tek bir `loadFaculties(universityId)` fonksiyonu tüm durumları yönetiyor.

#### 3.3 Akıllı Fallback (KGTU Admin Tespiti)

`defaultUniversity` prop'u boş geldiğinde ve üniversite listesinde eşleşme bulunamadığında, `localStorage`'daki kullanıcı emailini okuyarak KGTU admin tespiti yapılır:

```typescript
const isKgtuAdmin = storedUserEmail.includes('kgtu');
const kgtuName = 'Konya Gıda ve Tarım Üniversitesi';
const kgtuMatch = isKgtuAdmin
  ? data.find((u) => u.name.toLowerCase() === kgtuName.toLowerCase())
  : undefined;

if (!initialUniversityId && kgtuMatch) {
  setSelectedUnivId((prev) => prev || kgtuMatch.id);
  onChange({ universityId: kgtuMatch.id, universityName: kgtuMatch.name });
  loadFaculties(kgtuMatch.id);
}
```

Bu fallback sadece `initialUniversityId` yoksa devreye girer; ID varsa atlınır.

#### 3.4 Dropdown `disabled` Mantığı Düzeltmesi

```typescript
// ÖNCE — yüklenme spinner'ı ile bağlıydı
disabled={!selectedUnivId || loadingFac}

// SONRA — gerçek veri varlığına bağlı
disabled={!selectedUnivId || faculties.length === 0}
```

`loadingFac` ile disable etmek, fakülteler yüklenip bittiğinde bile dropdown'ı bazen kilitli bırakıyordu.

#### 3.5 DEBUG Console.log Temizliği

Stabilizasyon sürecinde eklenen 25+ `console.log` / `console.warn` / `console.error` satırı kaldırıldı. Hata yönetimi `catch(() => { /* ignore */ })` ile sessizleştirildi.

---

## 4. GÖRSEL DÜZELTMELER

### 4.1 `text-gray-900` Eksikliği

**Sorun:** Tailwind'in varsayılan `<select>` rengi bazı tarayıcılarda (özellikle macOS Safari ve Windows Chrome dark mode) gri veya şeffaf görünüyordu. Seçili option metni okunaksız kalıyordu.

**Etkilenen dosyalar ve değişiklik:**

| Dosya | Değişen class |
|---|---|
| `CascadingInstitutionSelect.tsx` | `text-sm` → `text-sm text-gray-900` (SELECT_CLS sabiti) |
| `CalendarPDFUploadModal.tsx` | Akademik yıl `<select>` — `text-gray-900` eklendi |
| `SchedulePDFUploadModal.tsx` | Sınıf ve dönem `<select>` — `text-gray-900` eklendi |

**Uygulama:** `SELECT_CLS` sabiti güncellendi; bu sabit tüm dropdown'larda paylaşıldığı için tek değişiklik üç dropdown'ı birden düzeltti.

### 4.2 Kilit Etiketi (Lock Badge)

**Kilitli üniversite gösterimi:**
```tsx
{lockedUniversity ? (
  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50">
    <span className="text-sm text-gray-700 font-medium flex-1 truncate">
      {lockedUniversity}
    </span>
    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
      Kilitli
    </span>
  </div>
) : (
  <select ...>
```

Eski `isUniversityAdmin` koşullu render kaldırıldı; `CascadingInstitutionSelect`'in kendi `lockedUniversity` prop'u bu görevi üstlendi. Modal'lar bu prop'u koşullu olarak besler:

```typescript
// Modal içi mantık
const lockedUniversityName =
  isLockedUniversityRole && resolvedUniversityName ? resolvedUniversityName : undefined;
const initialUniversityId =
  isLockedUniversityRole && resolvedUniversityId ? resolvedUniversityId : undefined;
```

---

## 5. KÖK NEDEN ANALİZİ

### 5.1 Sorunun Tam Tablosu

Sistemde tek bir hata yoktu; birbiriyle zincirleme ilişkili **dört bağımsız sorun** aynı anda mevcuttu:

```
┌─────────────────────────────────────────────────────────────────┐
│  HATA ZİNCİRİ                                                   │
│                                                                 │
│  1. Backend login → university_id ve faculty_id döndürmüyor     │
│          │                                                       │
│          ▼                                                       │
│  2. Frontend user objesi eksik → Modal UUID bilmiyor             │
│          │                                                       │
│          ▼                                                       │
│  3. CascadingSelect isim bazlı arama yapıyor                    │
│     → "Kampusplus" aranıyor → eşleşme yok → boş dropdown        │
│          │                                                       │
│          ▼                                                       │
│  4. Sonsuz döngü → onChange → yeni prop → yeni render → ...    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Sorun 1: Veri Uyuşmazlığı (Data Mismatch)

**Ne oldu:** Seed script'i kullanıcıları "Kampusplus" adlı hayalet üniversiteye atıyordu. Gerçek veritabanında bu isimde üniversite yoktu (KGTU vardı). Login endpoint'i `user.university` string'ini olduğu gibi döndürüyordu.

**Sonuç:** Frontend `university_id` olmadan modal açtığında isim bazlı arama yapıyor, "Kampusplus" ile eşleşen hiçbir kayıt bulamıyordu.

**Çözüm:** Seed'de `SUPER_ADMIN_UNIVERSITY_NAME = "Konya Gıda ve Tarım Üniversitesi"` ve mevcut kullanıcılar için `university_id` düzeltme döngüsü.

### 5.3 Sorun 2: Eksik ID Alanları (Missing IDs)

**Ne oldu:** `UserResponse` Pydantic şeması `university_id` ve `faculty_id` alanlarını içermiyordu. Frontend bu değerleri `localStorage`'dan okuyamıyordu.

**Sonuç:** `CascadingInstitutionSelect` `initialUniversityId=undefined` alıyor, isim bazlı fallback devreye giriyor, fallback başarısız oluyor.

**Çözüm:** `auth.py` şemasına `university_id` ve `faculty_id` eklendi; login response'da ilişki üzerinden (`department_rel.faculty_id`) dolduruldu.

### 5.4 Sorun 3: JSONB Operatör Hatası

**Ne oldu:** `University.email_domains` sütunu PostgreSQL'de `JSONB` tipindedir. SQLAlchemy'nin standart `.like()` string operatörü JSONB üzerinde desteklenmez.

**Hata mesajı:** `operator does not exist: jsonb ~~ unknown`

**Çözüm:** `cast(University.email_domains, String).ilike(...)` — JSONB text olarak cast edilip sonra `ilike` uygulandı. Ayrıca `%"domain"%` → `%domain%` (tırnak işareti çıkarıldı) ile JSON string sınırı bağımsız arama sağlandı.

### 5.5 Sorun 4: Sonsuz Döngü (Infinite Loop)

**Ne oldu:** Bileşen başlangıçta `selectedUnivId = ''` → effect `onChange({universityId: X})` çağırıyor → üst bileşen yeni `initialUniversityId` prop üretiyor → bileşen yeniden render → effect tekrar çalışıyor → döngü.

**Çözüm:** `hasInitializedRef` ile tek seferlik initialization; `isPrefilledUniversity` flag'i ile ID varken API listesi çağrısı engellendi.

---

## 6. DEĞİŞİKLİK ÖZET TABLOSU

| Dosya | Değişiklik Türü | Kritiklik |
|---|---|---|
| `backend/src/api/routes/auth.py` | Şema genişletme (`university_id`, `faculty_id`) | Yüksek |
| `backend/src/services/university_service.py` | JSONB cast düzeltmesi | Yüksek |
| `backend/src/api/routes/academic.py` | ID→İsim çözümleme, onay akışı sadeleşmesi | Orta |
| `backend/scripts/ensure_initial_data.py` | Hayalet veri temizleme, idempotent güncelleme | Yüksek |
| `frontend/src/types/auth.ts` | `faculty_id` tipi eklendi | Orta |
| `frontend/src/components/institution/CascadingInstitutionSelect.tsx` | Sonsuz döngü fix, kilit mekanizması, fallback, CSS | Yüksek |
| `frontend/src/components/academic/CalendarPDFUploadModal.tsx` | `initialUniversityId` prop aktarımı, CSS | Orta |
| `frontend/src/components/academic/SchedulePDFUploadModal.tsx` | `initialUniversityId` prop aktarımı, CSS | Orta |
| `frontend/src/pages/ProfilePage.tsx` | `university_id` ve `faculty_id` state'e besleme | Orta |
| `frontend/src/pages/admin/AdminAcademicPage.tsx` | Onay sekmesi kaldırıldı, tek liste | Düşük |
| `frontend/src/pages/admin/AdminSchedulePage.tsx` | Onay sekmesi kaldırıldı, tek liste | Düşük |
| `backend/src/core/config.py` | `support_email` domain güncellendi | Düşük |

---

## 7. GELECEKTE BENZER SORUN İÇİN KONTROL LİSTESİ

Bir admin kullanıcısı için dropdown boş veya kilitli görünüyorsa şu sırayla kontrol et:

1. **Backend login response'u incele** → `university_id` ve `faculty_id` alanları var mı?
2. **`localStorage.getItem('user')` parse et** → `university_id` dolu mu?
3. **`CascadingInstitutionSelect`'e gelen prop'ları logla** → `initialUniversityId` geliyor mu?
4. **Network sekmesinde `/api/institutions/universities` isteği var mı?** → Varsa `isPrefilledUniversity=false` demek; `initialUniversityId` prop boş gelmiş.
5. **DB'de kullanıcının `university_id`'si gerçek bir üniversiteye işaret ediyor mu?** → `ensure_initial_data.py` çalıştır.
6. **`University.email_domains` JSONB mi?** → `.like()` yerine `cast(..., String).ilike()` kullan.
