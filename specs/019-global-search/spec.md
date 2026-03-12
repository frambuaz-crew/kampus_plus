# Feature Specification: Global Search Page

**Module**: 019-global-search  
**Created**: 2 Ocak 2026  
**Status**: Ready for Development  
**Priority**: P2 - Medium

---

## Overview

Dashboard header'ındaki arama çubuğundan yapılan aramaların sonuçlarını gösteren sayfa. Platform genelinde arama yapılmasını sağlar ve sonuçları kategorilere göre gruplar.

**Erişim:** Authenticated (Dashboard içinde)  
**URL:** `/dashboard/search?q=arama_kelimesi`  
**Layout:** Dashboard içinde (sidebar sabit kalır)

---

## User Story

**"Dashboard'da arama yapan bir kullanıcı olarak, arama sonuçlarını kategorilere göre görmek ve ilgili içeriklere hızlıca erişmek istiyorum."**

**Kabul Kriterleri:**
1. ✅ Dashboard header'ındaki arama çubuğuna yazıp Enter'a basınca `/dashboard/search?q=...` sayfası açılır
2. ✅ Dashboard sidebar sabit kalır (diğer sayfalar gibi)
3. ✅ Arama sonuçları kategorilere göre gruplanır (Forum, Kullanıcılar)
4. ✅ Her kategori için sonuç sayısı gösterilir
5. ✅ Sonuçlar scroll edilebilir ve pagination vardır
6. ✅ Filtreleme yapılabilir (type: forum, users)
7. ✅ Sonuçlara tıklayınca ilgili sayfaya yönlendirilir

---

## Page Structure

### Layout

```
┌─────────────────────────────────────────────────┐
│  [Logo]  [🔍 Arama çubuğu]  [🔔] [💬] [👤]    │ ← Header (sabit)
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │   🔍 Arama Sonuçları                │
│ (SABİT)  │   "arama_kelimesi"                  │
│          │                                      │
│ Forum    │   ┌─ Filtreler ──────────────────┐ │
│ Pazar    │   │ [Tümü] [Forum] [Kullanıcılar] │ │
│ Kariyer  │   └───────────────────────────────┘ │
│ AI       │                                      │
│ Profilim │   📝 Forum Konuları (12 sonuç)      │
│ Ayarlar  │   ┌──────────────────────────────┐ │
│          │   │ • Konu başlığı 1             │ │
│          │   │   Kategori • 2 saat önce     │ │
│          │   │   15 cevap • 3 beğeni       │ │
│          │   ├──────────────────────────────┤ │
│          │   │ • Konu başlığı 2             │ │
│          │   │   Kategori • 5 saat önce     │ │
│          │   │   8 cevap • 1 beğeni        │ │
│          │   └──────────────────────────────┘ │
│          │   [Daha Fazla Yükle]               │
│          │                                      │
│          │   👥 Kullanıcılar (3 sonuç)        │
│          │   ┌──────────────────────────────┐ │
│          │   │ [Avatar] @username           │ │
│          │   │ Ad Soyad • Üniversite        │ │
│          │   ├──────────────────────────────┤ │
│          │   │ [Avatar] @username2          │ │
│          │   │ Ad Soyad • Üniversite        │ │
│          │   └──────────────────────────────┘ │
│          │   [Daha Fazla Yükle]               │
│          │                                      │
│          │   Sonuç bulunamadı?                 │
│          │   [Yeni Konu Oluştur]               │
└──────────┴──────────────────────────────────────┘
```

---

### 1. Search Header

```
┌─────────────────────────────────────┐
│  🔍 Arama Sonuçları                │
│  "arama_kelimesi"                   │
│  (12 sonuç bulundu)                 │
└─────────────────────────────────────┘
```

**Özellikler:**
- Arama terimi gösterilir (tırnak içinde)
- Toplam sonuç sayısı
- Arama çubuğu (tekrar arama yapmak için, opsiyonel)

---

### 2. Filters

```
┌─────────────────────────────────────┐
│  [Tümü] [Forum] [Kullanıcılar]     │
└─────────────────────────────────────┘
```

**Filtreler:**
- **Tümü:** Tüm kategorilerdeki sonuçlar
- **Forum:** Sadece forum konuları
- **Kullanıcılar:** Sadece kullanıcılar

**Active State:**
- Seçili filtre vurgulanır (primary color, underline veya background)

---

### 3. Forum Konuları Bölümü

```
┌─────────────────────────────────────┐
│  📝 Forum Konuları (12 sonuç)       │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ • React Hooks nedir?          │ │
│  │   Genel • 2 saat önce         │ │
│  │   15 cevap • 3 beğeni        │ │
│  │   [Konuya Git →]              │ │
│  ├───────────────────────────────┤ │
│  │ • React State Management      │ │
│  │   Programlama • 5 saat önce   │ │
│  │   8 cevap • 1 beğeni         │ │
│  │   [Konuya Git →]              │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Daha Fazla Yükle]                 │
└─────────────────────────────────────┘
```

**Her Sonuç İçin:**
- Konu başlığı (tıklanabilir)
- Kategori adı
- Zaman (relative: "2 saat önce")
- Cevap sayısı
- Beğeni sayısı
- "Konuya Git" linki → `/dashboard/forum/topic/{id}`

**Pagination:**
- İlk 10 sonuç gösterilir
- "Daha Fazla Yükle" butonu ile daha fazla yüklenir (20'şer)

---

### 4. Kullanıcılar Bölümü

```
┌─────────────────────────────────────┐
│  👥 Kullanıcılar (3 sonuç)         │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Avatar] @react_developer    │ │
│  │ Ali Yılmaz                    │ │
│  │ Konya Gıda ve Tarım Üniversitesi│
│  │ [Profili Gör →]              │ │
│  ├───────────────────────────────┤ │
│  │ [Avatar] @react_master        │ │
│  │ Ayşe Demir                    │ │
│  │ Selçuk Üniversitesi           │ │
│  │ [Profili Gör →]              │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Daha Fazla Yükle]                 │
└─────────────────────────────────────┘
```

**Her Sonuç İçin:**
- Avatar (profil resmi veya initials)
- Username (@username)
- Ad Soyad
- Üniversite adı
- "Profili Gör" linki → `/dashboard/profile/{user_id}`

**Pagination:**
- İlk 10 sonuç gösterilir
- "Daha Fazla Yükle" butonu ile daha fazla yüklenir (20'şer)

---

### 5. Empty State (Sonuç Yok)

```
┌─────────────────────────────────────┐
│                                     │
│      🔍 Sonuç Bulunamadı           │
│                                     │
│  "arama_kelimesi" için sonuç        │
│  bulunamadı.                        │
│                                     │
│  Öneriler:                          │
│  • Farklı kelimeler deneyin         │
│  • Arama terimini kısaltın          │
│  • Filtreleri kaldırın              │
│                                     │
│  [Yeni Konu Oluştur]                │
│  [Ana Sayfaya Dön]                  │
│                                     │
└─────────────────────────────────────┘
```

---

## Technical Requirements

### Functional Requirements

**FR-001:** Dashboard header'ındaki arama çubuğundan yönlendirme yapılmalı  
**FR-002:** URL query parameter'ından arama terimi alınmalı (`?q=...`)  
**FR-003:** Arama sonuçları backend'den çekilmeli  
**FR-004:** Sonuçlar kategorilere göre gruplanmalı (Forum, Kullanıcılar)  
**FR-005:** Filtreleme yapılabilmeli (type: forum, users, all)  
**FR-006:** Her kategori için sonuç sayısı gösterilmeli  
**FR-007:** Pagination olmalı ("Daha Fazla Yükle" butonu)  
**FR-008:** Sonuçlara tıklayınca ilgili sayfaya yönlendirilmeli  
**FR-009:** Empty state gösterilmeli (sonuç yoksa)  
**FR-010:** Loading state gösterilmeli (arama yapılırken)

---

### Non-Functional Requirements

**NFR-001:** Arama API response süresi < 500ms olmalı  
**NFR-002:** Sayfa yükleme süresi < 1 saniye olmalı  
**NFR-003:** Mobile responsive olmalı  
**NFR-004:** Dashboard sidebar sabit kalmalı (diğer sayfalar gibi)

---

## Backend API Endpoint

### GET /api/v1/search

**Query Parameters:**
- `q`: string (required) - Arama terimi
- `type`: string (optional) - Filtre: `all` | `forum` | `users` (default: `all`)
- `page`: integer (optional) - Sayfa numarası (default: 1)
- `limit`: integer (optional) - Sayfa başına sonuç (default: 10)

**Response (Success - 200 OK):**
```json
{
  "query": "react",
  "total_results": 15,
  "results": {
    "forum": {
      "count": 12,
      "items": [
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
      ],
      "has_more": true
    },
    "users": {
      "count": 3,
      "items": [
        {
          "id": 789,
          "username": "react_developer",
          "first_name": "Ali",
          "last_name": "Yılmaz",
          "university": "Konya Gıda ve Tarım Üniversitesi",
          "profile_picture_url": "https://...",
          "url": "/dashboard/profile/789"
        }
      ],
      "has_more": false
    }
  }
}
```

**Response (Empty - 200 OK):**
```json
{
  "query": "xyzabc123",
  "total_results": 0,
  "results": {
    "forum": {
      "count": 0,
      "items": [],
      "has_more": false
    },
    "users": {
      "count": 0,
      "items": [],
      "has_more": false
    }
  }
}
```

**Backend Logic:**
1. Arama terimini al (`q`)
2. Filtre tipini kontrol et (`type`)
3. Forum araması (eğer `type` = `all` veya `forum`):
   - ForumTopic tablosunda arama (title, content)
   - İlk 10 sonuç (pagination)
4. Kullanıcı araması (eğer `type` = `all` veya `users`):
   - User tablosunda arama (first_name, last_name, username)
   - İlk 10 sonuç (pagination)
5. Sonuçları grupla ve döndür

**Search Algorithm:**
- Basit LIKE query (MVP için yeterli)
- SQLite `LIKE` kullanılır (case-insensitive, SQLite'da `ILIKE` yok, `LIKE` kullanılır)
- **NOT:** Bu proje mezuniyet projesi için SQLite kullanır, PostgreSQL full-text search kullanılmaz

---

## Frontend Implementation

### Component Structure

```
search/
├── SearchPage.tsx              ← Ana sayfa component
├── SearchHeader.tsx            ← Arama başlığı
├── SearchFilters.tsx            ← Filtreler
├── ForumResults.tsx            ← Forum sonuçları
├── UserResults.tsx             ← Kullanıcı sonuçları
└── SearchEmpty.tsx             ← Empty state
```

### State Management

```typescript
interface SearchPageState {
  query: string;
  filter: 'all' | 'forum' | 'users';
  results: {
    forum: {
      count: number;
      items: ForumTopic[];
      hasMore: boolean;
    };
    users: {
      count: number;
      items: User[];
      hasMore: boolean;
    };
  };
  isLoading: boolean;
  currentPage: {
    forum: number;
    users: number;
  };
}
```

### User Flow

```
1. Kullanıcı dashboard header'ındaki arama çubuğuna yazar
   ↓
2. Enter'a basar
   ↓
3. /dashboard/search?q=arama_kelimesi sayfası açılır
   ↓
4. useEffect hook çalışır, query parameter alınır
   ↓
5. GET /api/v1/search?q=... çağrılır
   ↓
6. Loading state gösterilir
   ↓
7. Sonuçlar kategorilere göre gösterilir
   ↓
8. Kullanıcı filtre değiştirebilir
   ↓
9. "Daha Fazla Yükle" ile daha fazla sonuç yüklenir
```

### Code Example

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { search } from '@/api/search';

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [filter, setFilter] = useState<'all' | 'forum' | 'users'>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) return;

    setIsLoading(true);
    search(query, filter)
      .then((data) => {
        setResults(data.results);
      })
      .catch((error) => {
        console.error('Search failed:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query, filter]);

  if (isLoading) {
    return <SearchLoading />;
  }

  if (!results || results.total_results === 0) {
    return <SearchEmpty query={query} />;
  }

  return (
    <div className="search-page">
      <SearchHeader query={query} totalResults={results.total_results} />
      <SearchFilters filter={filter} onFilterChange={setFilter} />
      
      {filter === 'all' || filter === 'forum' ? (
        <ForumResults 
          results={results.forum} 
          onLoadMore={() => {/* Load more forum results */}}
        />
      ) : null}
      
      {filter === 'all' || filter === 'users' ? (
        <UserResults 
          results={results.users} 
          onLoadMore={() => {/* Load more user results */}}
        />
      ) : null}
    </div>
  );
};
```

---

## UI/UX Design

### Color Scheme

- Background: White / Light gray
- Text: Dark gray (#1F2937)
- Headings: Dark blue (#1E40AF)
- Links: Primary blue (#3B82F6)
- Active Filter: Primary blue background
- Results count: Gray (#6B7280)

### Typography

- **Page Title:** 24px, Bold
- **Section Headings:** 20px, Semi-Bold
- **Result Title:** 16px, Medium
- **Result Meta:** 14px, Regular, Gray
- **Result Count:** 14px, Regular, Gray

### Spacing

- Container: Max-width (dashboard content width)
- Section spacing: 32px
- Result item spacing: 16px
- Padding: 24px

### Responsive Design

- Mobile: Full width, single column
- Tablet: Full width, single column
- Desktop: Dashboard content width

---

## Search Algorithm (Backend)

### MVP: Simple LIKE Query

```python
# Forum araması
forum_query = db.query(ForumTopic).filter(
    ForumTopic.is_deleted == False
).filter(
    or_(
        ForumTopic.title.ilike(f'%{search_term}%'),
        ForumTopic.content.ilike(f'%{search_term}%')
    )
)

# Kullanıcı araması
user_query = db.query(User).filter(
    User.is_active == True
).filter(
    or_(
        User.first_name.ilike(f'%{search_term}%'),
        User.last_name.ilike(f'%{search_term}%'),
        User.username.ilike(f'%{search_term}%')
    )
)
```

### Future: Full-Text Search (Not in MVP)

**NOT:** Bu proje mezuniyet projesi için SQLite kullanır. PostgreSQL full-text search kullanılmaz.
Gelecekte production için PostgreSQL'e geçilirse full-text search eklenebilir.

---

## Integration Points

### Related Modules

- **004-dashboard:** Header'daki arama çubuğu bu sayfaya yönlendirir
- **005-forum-page:** Forum sonuçları forum sayfasına yönlendirir
- **010-profile:** Kullanıcı sonuçları profil sayfasına yönlendirir

### Dependencies

- React Router (useSearchParams, Link)
- API Client (search function)
- UI Components (Button, Card, Avatar, Loading Spinner)

---

## Future Enhancements (MVP Sonrası)

1. **Advanced Search:** Tarih aralığı, kategori, sıralama seçenekleri
2. **Full-Text Search:** Gelecekte production için PostgreSQL'e geçilirse full-text search eklenebilir (MVP'de yok)
3. **Search Suggestions:** Autocomplete önerileri
4. **Search History:** Son aramalar
5. **Saved Searches:** Arama kaydetme
6. **Marketplace/Career Results:** Pazar ve kariyer ilanları da aramaya dahil edilebilir

---

## Testing Scenarios

### Happy Path

1. ✅ Arama terimi ile sayfa açılır
2. ✅ Sonuçlar kategorilere göre gösterilir
3. ✅ Filtreleme çalışır
4. ✅ "Daha Fazla Yükle" çalışır
5. ✅ Sonuçlara tıklayınca ilgili sayfaya yönlendirilir

### Edge Cases

1. ✅ Boş arama terimi → Empty state
2. ✅ Sonuç yok → Empty state
3. ✅ Çok uzun arama terimi → Sonuçlar gösterilir
4. ✅ Özel karakterler → Escape edilir
5. ✅ Filtre değiştirme → Sonuçlar güncellenir

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2 Ocak 2026  
**Durum:** ✅ Ready for Development

