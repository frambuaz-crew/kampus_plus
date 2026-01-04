# Tasks: Global Search Page Implementation

**Module:** 019-global-search  
**Status:** Ready for Development  
**Estimated Time:** 2 gün (Backend 1 gün + Frontend 1 gün)

---

## Task Breakdown

### Phase 1: Backend Implementation (1 gün)

#### Task 1.1: Search Endpoint

**Süre:** 4 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Global arama endpoint'ini oluştur.

**Dosya:** `backend/src/api/routes/search.py` (yeni)

**Endpoint:** `GET /api/v1/search`

**Query Parameters:**
- `q`: string (required) - Arama terimi
- `type`: string (optional) - Filtre: `all` | `forum` | `users` (default: `all`)
- `page`: integer (optional) - Sayfa numarası (default: 1)
- `limit`: integer (optional) - Sayfa başına sonuç (default: 10)

**Response Model:**
```python
class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: Dict[str, SearchCategoryResult]

class SearchCategoryResult(BaseModel):
    count: int
    items: List[Union[ForumTopicResult, UserResult]]
    has_more: bool
```

**Logic:**
1. Arama terimini al ve validate et
2. Filtre tipini kontrol et
3. Forum araması (eğer `type` = `all` veya `forum`):
   - ForumTopic tablosunda arama (title, content)
   - ILIKE query (case-insensitive)
   - Pagination (limit, offset)
4. Kullanıcı araması (eğer `type` = `all` veya `users`):
   - User tablosunda arama (first_name, last_name, username)
   - ILIKE query
   - Pagination
5. Sonuçları formatla ve döndür

**Adımlar:**
- [ ] Route dosyasını oluştur (`search.py`)
- [ ] Endpoint'i ekle
- [ ] Request/Response modelleri oluştur
- [ ] Forum arama logic'i
- [ ] Kullanıcı arama logic'i
- [ ] Pagination logic
- [ ] Response formatlama
- [ ] Error handling
- [ ] Test: Endpoint çalışıyor

---

#### Task 1.2: Forum Search Logic

**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Forum konularında arama yapma logic'i.

**SQL Query:**
```python
forum_query = db.query(ForumTopic).filter(
    ForumTopic.is_deleted == False
).filter(
    or_(
        ForumTopic.title.ilike(f'%{search_term}%'),
        ForumTopic.content.ilike(f'%{search_term}%')
    )
).order_by(ForumTopic.created_at.desc())

# Pagination
total = forum_query.count()
items = forum_query.offset((page - 1) * limit).limit(limit).all()
```

**Response Format:**
```python
{
    "id": 456,
    "title": "React Hooks nedir?",
    "category": "Genel",
    "category_id": 1,
    "author": {
        "id": 123,
        "username": "ali_yilmaz",
        "first_name": "Ali",
        "last_name": "Yılmaz"
    },
    "reply_count": 15,
    "helpful_count": 3,
    "created_at": "2025-01-02T10:30:00Z",
    "url": "/dashboard/forum/topic/456"
}
```

**Adımlar:**
- [ ] Forum arama query'si
- [ ] ILIKE search (title, content)
- [ ] Author bilgilerini join et
- [ ] Reply count ve helpful count hesapla
- [ ] Response formatla
- [ ] Test: Forum araması çalışıyor

---

#### Task 1.3: User Search Logic

**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Kullanıcılarda arama yapma logic'i.

**SQL Query:**
```python
user_query = db.query(User).filter(
    User.is_active == True,
    User.is_verified == True
).filter(
    or_(
        User.first_name.ilike(f'%{search_term}%'),
        User.last_name.ilike(f'%{search_term}%'),
        User.username.ilike(f'%{search_term}%')
    )
).order_by(User.created_at.desc())

# Pagination
total = user_query.count()
items = user_query.offset((page - 1) * limit).limit(limit).all()
```

**Response Format:**
```python
{
    "id": 789,
    "username": "react_developer",
    "first_name": "Ali",
    "last_name": "Yılmaz",
    "university": "Konya Gıda ve Tarım Üniversitesi",
    "profile_picture_url": "https://...",
    "url": "/dashboard/profile/789"
}
```

**Adımlar:**
- [ ] Kullanıcı arama query'si
- [ ] ILIKE search (first_name, last_name, username)
- [ ] Active ve verified kullanıcılar
- [ ] University bilgisini join et
- [ ] Response formatla
- [ ] Test: Kullanıcı araması çalışıyor

---

### Phase 2: Frontend Implementation (1 gün)

#### Task 2.1: Search Page Component

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Ana sayfa component'ini oluştur.

**Dosya:** `frontend/src/pages/dashboard/SearchPage.tsx`

**Özellikler:**
- [ ] Query parameter'dan arama terimi al
- [ ] API çağrısı yap
- [ ] Loading state
- [ ] Results state management
- [ ] Filter state management
- [ ] Empty state

**Code Structure:**
```tsx
export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [filter, setFilter] = useState<'all' | 'forum' | 'users'>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // API çağrısı
  }, [query, filter]);

  // Render logic
};
```

**Adımlar:**
- [ ] Component dosyasını oluştur
- [ ] React Router hooks (useSearchParams)
- [ ] State management
- [ ] API çağrısı
- [ ] Loading/Error/Empty state handling
- [ ] Test: Component çalışıyor

---

#### Task 2.2: Search Header Component

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Arama başlığı component'ini oluştur.

**Dosya:** `frontend/src/pages/dashboard/SearchPage.tsx` (inline component)

**UI:**
```
🔍 Arama Sonuçları
"arama_kelimesi"
(12 sonuç bulundu)
```

**Adımlar:**
- [ ] Header component oluştur
- [ ] Arama terimi göster
- [ ] Toplam sonuç sayısı göster
- [ ] Styling
- [ ] Test: Header görünüyor

---

#### Task 2.3: Search Filters Component

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Filtreler component'ini oluştur.

**Dosya:** `frontend/src/pages/dashboard/SearchPage.tsx` (inline component)

**UI:**
```
[Tümü] [Forum] [Kullanıcılar]
```

**Özellikler:**
- [ ] Filter buttons (Tümü, Forum, Kullanıcılar)
- [ ] Active state (vurgulanmış)
- [ ] Filter change handler
- [ ] Filter değişince API çağrısı

**Adımlar:**
- [ ] Filters component oluştur
- [ ] Filter buttons
- [ ] Active state styling
- [ ] Click handlers
- [ ] Styling
- [ ] Test: Filtreler çalışıyor

---

#### Task 2.4: Forum Results Component

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Forum sonuçları component'ini oluştur.

**Dosya:** `frontend/src/pages/dashboard/SearchPage.tsx` (inline component)

**UI:**
```
📝 Forum Konuları (12 sonuç)

┌───────────────────────────────┐
│ • React Hooks nedir?          │
│   Genel • 2 saat önce         │
│   15 cevap • 3 beğeni        │
│   [Konuya Git →]              │
└───────────────────────────────┘
```

**Özellikler:**
- [ ] Section heading (sonuç sayısı ile)
- [ ] Result items list
- [ ] Her sonuç için: başlık, kategori, zaman, cevap/beğeni sayısı
- [ ] "Konuya Git" linki
- [ ] "Daha Fazla Yükle" butonu
- [ ] Pagination logic

**Adımlar:**
- [ ] ForumResults component oluştur
- [ ] Result item component
- [ ] Relative time helper
- [ ] Navigation linkleri
- [ ] Load more logic
- [ ] Styling
- [ ] Test: Forum sonuçları görünüyor

---

#### Task 2.5: User Results Component

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Kullanıcı sonuçları component'ini oluştur.

**Dosya:** `frontend/src/pages/dashboard/SearchPage.tsx` (inline component)

**UI:**
```
👥 Kullanıcılar (3 sonuç)

┌───────────────────────────────┐
│ [Avatar] @react_developer    │
│ Ali Yılmaz                    │
│ Konya Gıda ve Tarım Üniversitesi│
│ [Profili Gör →]              │
└───────────────────────────────┘
```

**Özellikler:**
- [ ] Section heading (sonuç sayısı ile)
- [ ] Result items list
- [ ] Her sonuç için: avatar, username, ad soyad, üniversite
- [ ] "Profili Gör" linki
- [ ] "Daha Fazla Yükle" butonu
- [ ] Pagination logic

**Adımlar:**
- [ ] UserResults component oluştur
- [ ] Result item component
- [ ] Avatar component (profil resmi veya initials)
- [ ] Navigation linkleri
- [ ] Load more logic
- [ ] Styling
- [ ] Test: Kullanıcı sonuçları görünüyor

---

#### Task 2.6: Search Empty Component

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Empty state component'ini oluştur.

**Dosya:** `frontend/src/pages/dashboard/SearchPage.tsx` (inline component)

**UI:**
```
🔍 Sonuç Bulunamadı

"arama_kelimesi" için sonuç
bulunamadı.

Öneriler:
• Farklı kelimeler deneyin
• Arama terimini kısaltın
• Filtreleri kaldırın

[Yeni Konu Oluştur]
[Ana Sayfaya Dön]
```

**Adımlar:**
- [ ] Empty component oluştur
- [ ] Empty state mesajı
- [ ] Öneriler listesi
- [ ] Action buttons
- [ ] Styling
- [ ] Test: Empty state görünüyor

---

#### Task 2.7: API Client Function

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Search API çağrısı için client function oluştur.

**Dosya:** `frontend/src/api/search.ts` (yeni)

**Function:**
```typescript
export const search = async (
  query: string,
  type: 'all' | 'forum' | 'users' = 'all',
  page: number = 1,
  limit: number = 10
): Promise<SearchResponse> => {
  const response = await axios.get('/api/v1/search', {
    params: { q: query, type, page, limit }
  });
  return response.data;
};

interface SearchResponse {
  query: string;
  total_results: number;
  results: {
    forum: SearchCategoryResult;
    users: SearchCategoryResult;
  };
}
```

**Adımlar:**
- [ ] API client function oluştur
- [ ] TypeScript interface'leri tanımla
- [ ] Error handling
- [ ] Test: API çağrısı çalışıyor

---

#### Task 2.8: Route Setup

**Süre:** 0.5 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Search sayfası için route ekle.

**Dosya:** `frontend/src/App.tsx` (güncelle)

**Route:**
```tsx
<Route path="/dashboard/search" element={<SearchPage />} />
```

**Adımlar:**
- [ ] Route ekle
- [ ] Import SearchPage component
- [ ] Test: Route çalışıyor (`/dashboard/search?q=...`)

---

#### Task 2.9: Dashboard Header Search Integration

**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Dashboard header'ındaki arama çubuğunu search sayfasına yönlendir.

**Dosya:** `frontend/src/components/dashboard/DashboardHeader.tsx` (güncelle)

**Değişiklik:**
```tsx
const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  const searchTerm = searchInput.value;
  if (searchTerm.trim()) {
    navigate(`/dashboard/search?q=${encodeURIComponent(searchTerm)}`);
  }
};
```

**Adımlar:**
- [ ] DashboardHeader component'ini bul
- [ ] Search form handler ekle
- [ ] Navigation logic (useNavigate)
- [ ] URL encoding
- [ ] Test: Arama çubuğu çalışıyor

---

### Phase 3: Testing & Polish (0.5 gün)

#### Task 3.1: Backend Tests

**Süre:** 2 saat  
**Atanan:** Backend Developer

**Test Senaryoları:**
- [ ] Forum araması çalışıyor
- [ ] Kullanıcı araması çalışıyor
- [ ] Filtreleme çalışıyor (type parameter)
- [ ] Pagination çalışıyor
- [ ] Boş arama terimi → Empty results
- [ ] Sonuç yok → Empty results
- [ ] Case-insensitive search çalışıyor

**Adımlar:**
- [ ] Unit test'ler yaz
- [ ] Integration test'ler yaz
- [ ] Tüm senaryolar test edildi

---

#### Task 3.2: Frontend Tests

**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Test Senaryoları:**
- [ ] Query parameter'dan arama terimi alınıyor
- [ ] API çağrısı yapılıyor
- [ ] Loading state gösteriliyor
- [ ] Sonuçlar kategorilere göre gösteriliyor
- [ ] Filtreleme çalışıyor
- [ ] "Daha Fazla Yükle" çalışıyor
- [ ] Sonuçlara tıklayınca yönlendirme çalışıyor
- [ ] Empty state gösteriliyor
- [ ] Dashboard header arama çubuğu çalışıyor

**Adımlar:**
- [ ] Component test'leri yaz
- [ ] Integration test'leri yaz
- [ ] E2E test'leri yaz (opsiyonel)
- [ ] Tüm senaryolar test edildi

---

## ✅ Checklist

### Backend
- [ ] Search endpoint oluşturuldu
- [ ] Forum arama logic'i
- [ ] Kullanıcı arama logic'i
- [ ] Pagination
- [ ] Response modelleri
- [ ] Error handling
- [ ] Backend test'leri yazıldı

### Frontend
- [ ] SearchPage component oluşturuldu
- [ ] SearchHeader component
- [ ] SearchFilters component
- [ ] ForumResults component
- [ ] UserResults component
- [ ] SearchEmpty component
- [ ] API client function
- [ ] Route setup
- [ ] Dashboard header integration
- [ ] Frontend test'leri yazıldı

### Integration
- [ ] Dashboard header arama çubuğu çalışıyor
- [ ] Search sayfası açılıyor
- [ ] Sonuçlar gösteriliyor
- [ ] Navigation çalışıyor

---

## 📝 Notlar

1. **Search Algorithm:** MVP için basit LIKE query yeterli (SQLite kullanılır, ILIKE yok). Gelecekte production için PostgreSQL'e geçilirse full-text search eklenebilir.

2. **Pagination:** "Daha Fazla Yükle" butonu ile infinite scroll benzeri yapı.

3. **Dashboard Layout:** Search sayfası dashboard içinde, sidebar sabit kalır (diğer sayfalar gibi).

4. **Future Enhancements:** Marketplace ve Career sonuçları da eklenebilir (MVP sonrası).

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Tasks Tamamlandı - Ready for Development

