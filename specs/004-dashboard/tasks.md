# 004 - Dashboard - Implementation Tasks

## 📋 Genel Bakış

Bu doküman, Dashboard özelliğinin implementasyon task'lerini içerir. Task'ler Phase bazında organize edilmiştir ve bağımlılıklar dikkate alınarak sıralanmıştır.

---

## 📊 Proje Özeti

| Özellik | Süre Tahmini | Zorluk | Öncelik |
|---------|--------------|---------|---------|
| Dashboard Layout & Hero | 3-4 gün | Orta | Yüksek |

**Toplam Task Sayısı:** 24  
**Tahmini Süre:** 3-4 gün (1 developer)

---

## 🎯 Phase 0: Hazırlık (Setup)

### Task 0.1: Frontend Proje Yapısını Oluştur
**Süre:** 30 dakika  
**Atanan:** Frontend Developer

**Açıklama:**  
Dashboard için gerekli klasör yapısını ve boş dosyaları oluştur.

**Alt Task'ler:**
```bash
src/
├── components/
│   ├── Layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainContent.tsx
│   ├── Dashboard/
│   │   ├── HeroSection.tsx
│   │   └── GreetingMessage.tsx
│   └── Common/
│       ├── ProfileDropdown.tsx
│       ├── NotificationBell.tsx
│       └── SearchBar.tsx
├── pages/
│   └── Dashboard/
│       ├── HomePage.tsx
│       ├── AIAssistantPage.tsx
│       ├── ForumPage.tsx
│       └── MarketplacePage.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useGreeting.ts
│   └── useCurrentTime.ts
├── contexts/
│   └── AuthContext.tsx
└── styles/
    └── dashboard.css
```

**Test Kriterleri:**
- Tüm dosyalar oluşturuldu
- Import/export hataları yok

---

### Task 0.2: Backend Router Yapısını Oluştur
**Süre:** 20 dakika  
**Atanan:** Backend Developer

**Açıklama:**  
Dashboard için backend router ve schema dosyalarını oluştur.

**Dosyalar:**
```python
app/
├── routers/
│   └── dashboard.py         # Yeni router
├── schemas/
│   └── dashboard.py         # Response schema'ları
└── core/
    └── auth.py              # get_current_verified_user (zaten var)
```

**Test Kriterleri:**
- Router import edilebiliyor
- FastAPI app'e register edildi

---

## 🎨 Phase 1: Backend - Dashboard API (1 gün)

### Task 1.1: Dashboard Schema Oluştur
**Süre:** 30 dakika  
**Atanan:** Backend Developer

**Açıklama:**  
`app/schemas/dashboard.py` dosyasında Pydantic schema'ları tanımla.

**Schema'lar:**
```python
from pydantic import BaseModel
from typing import Literal

class DashboardUser(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    university: str | None
    department: str
    student_number: str

class DashboardWelcomeResponse(BaseModel):
    user: DashboardUser
    greeting: str
    emoji: str
    time_of_day: Literal["morning", "afternoon", "evening", "night"]
```

**Test Kriterleri:**
- Schema'lar import edilebiliyor
- Type validation çalışıyor

---

### Task 1.2: Dinamik Selamlaşma Fonksiyonu
**Süre:** 45 dakika  
**Atanan:** Backend Developer

**Açıklama:**  
Saate göre dinamik selamlaşma mesajı dönen yardımcı fonksiyon.

**Konum:** `app/utils/greeting.py`

**Fonksiyon:**
```python
from datetime import datetime
from typing import Tuple, Literal

def get_greeting_message() -> Tuple[str, str, Literal["morning", "afternoon", "evening", "night"]]:
    """
    Saate göre selamlaşma mesajı döner.
    
    Returns:
        (greeting, emoji, time_of_day)
    """
    current_hour = datetime.now().hour
    
    if 5 <= current_hour < 12:
        return ("Günaydın", "🌅", "morning")
    elif 12 <= current_hour < 18:
        return ("İyi günler", "☀️", "afternoon")
    elif 18 <= current_hour < 22:
        return ("İyi akşamlar", "🌆", "evening")
    else:
        return ("İyi geceler", "🌙", "night")
```

**Test Kriterleri:**
- [x] 05:00 → "Günaydın" + "🌅" + "morning"
- [x] 12:00 → "İyi günler" + "☀️" + "afternoon"
- [x] 18:00 → "İyi akşamlar" + "🌆" + "evening"
- [x] 22:00 → "İyi geceler" + "🌙" + "night"

---

### Task 1.3: GET /api/v1/dashboard/welcome Endpoint
**Süre:** 1 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.1, 1.2

**Açıklama:**  
Kullanıcının dashboard bilgilerini dönen endpoint.

**Konum:** `app/routers/dashboard.py`

**Implementasyon:**
```python
from fastapi import APIRouter, Depends
from app.core.auth import get_current_verified_user
from app.schemas.dashboard import DashboardWelcomeResponse, DashboardUser
from app.utils.greeting import get_greeting_message
from app.models.user import User

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/welcome", response_model=DashboardWelcomeResponse)
async def get_dashboard_welcome(
    current_user: User = Depends(get_current_verified_user)
):
    """
    Kullanıcının dashboard bilgilerini döner.
    
    - Email doğrulanmış olmalı
    - JWT token gerekli
    """
    greeting, emoji, time_of_day = get_greeting_message()
    
    return DashboardWelcomeResponse(
        user=DashboardUser(
            id=str(current_user.id),
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            email=current_user.email,
            university=current_user.university,
            department=current_user.department,
            student_number=current_user.student_number,
        ),
        greeting=greeting,
        emoji=emoji,
        time_of_day=time_of_day,
    )
```

**Test Kriterleri:**
- [x] Valid token + verified user → 200 OK + user data
- [x] Valid token + unverified user → 401 Unauthorized
- [x] Invalid token → 401 Unauthorized
- [x] No token → 401 Unauthorized
- [x] `greeting`, `emoji`, `time_of_day` saate göre değişiyor

---

### Task 1.4: Router'ı FastAPI App'e Register Et
**Süre:** 10 dakika  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.3

**Açıklama:**  
Dashboard router'ını main FastAPI uygulamasına ekle.

**Konum:** `app/main.py`

```python
from app.routers import auth, dashboard

app = FastAPI()

app.include_router(auth.router)
app.include_router(dashboard.router)  # YENİ
```

**Test Kriterleri:**
- [x] `/docs` sayfasında `/api/v1/dashboard/welcome` endpoint'i görünüyor
- [x] Endpoint çağrılabiliyor

---

### Task 1.5: Backend Unit Test'leri
**Süre:** 1 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.1-1.4

**Açıklama:**  
Dashboard endpoint'leri için unit test'ler yaz.

**Konum:** `tests/test_dashboard.py`

**Test Senaryoları:**
```python
import pytest
from fastapi.testclient import TestClient

def test_dashboard_welcome_success(client: TestClient, verified_user_token):
    """Email doğrulanmış kullanıcı dashboard bilgilerini alabilir"""
    response = client.get(
        "/api/v1/dashboard/welcome",
        headers={"Authorization": f"Bearer {verified_user_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "greeting" in data
    assert data["user"]["first_name"] == "Test"

def test_dashboard_welcome_unverified(client: TestClient, unverified_user_token):
    """Email doğrulanmamış kullanıcı 401 alır"""
    response = client.get(
        "/api/v1/dashboard/welcome",
        headers={"Authorization": f"Bearer {unverified_user_token}"}
    )
    assert response.status_code == 401
    assert "Email doğrulaması gerekiyor" in response.json()["detail"]

def test_dashboard_welcome_no_token(client: TestClient):
    """Token olmadan 401 alır"""
    response = client.get("/api/v1/dashboard/welcome")
    assert response.status_code == 401

def test_greeting_message_morning():
    """Sabah selamlaşması doğru"""
    # Mock datetime to 8 AM
    ...
    
def test_greeting_message_afternoon():
    """Öğlen selamlaşması doğru"""
    ...
```

**Test Kriterleri:**
- [x] Tüm test'ler pass ediyor
- [x] Coverage %90+

---

## 🖼️ Phase 2: Frontend - Layout Components (1 gün)

### Task 2.1: AuthContext ve useAuth Hook
**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Kullanıcı authentication state'ini yöneten context ve hook.

**Konum:** `src/contexts/AuthContext.tsx`, `src/hooks/useAuth.ts`

**AuthContext:**
```typescript
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  university: string | null;
  department: string;
  student_number: string;
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (check localStorage for token)
    const token = localStorage.getItem('access_token');
    if (token) {
      // Validate token & fetch user info
      fetchUserInfo(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    fetchUserInfo(accessToken);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**Test Kriterleri:**
- [x] Login sonrası `user` state'i doluyor
- [x] Logout sonrası `user` null oluyor
- [x] Token localStorage'da saklanıyor

---

### Task 2.2: ProtectedRoute Component
**Süre:** 45 dakika  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 2.1

**Açıklama:**  
Dashboard route'larını koruyan HOC component.

**Konum:** `src/components/ProtectedRoute.tsx`

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireVerified = true 
}: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !user?.is_verified) {
    return <Navigate to="/login" state={{ 
      error: "Email adresinizi doğrulamanız gerekiyor" 
    }} replace />;
  }

  return <>{children}</>;
};
```

**Test Kriterleri:**
- [x] Authenticated + verified → children render
- [x] Authenticated + unverified → redirect to /login
- [x] Not authenticated → redirect to /login

---

### Task 2.3: Header Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 2.1

**Açıklama:**  
Dashboard üst bar bileşeni (logo, arama, bildirim, profil dropdown).

**Konum:** `src/components/Layout/Header.tsx`

**Bileşenler:**
- Logo (sol)
- SearchBar (orta)
- NotificationBell (sağ)
- ProfileDropdown (sağ)

**Özellikler:**
- Sticky (scroll'da üstte kalır)
- Responsive (mobilde hamburger menü)
- Yükseklik: 64px

**Test Kriterleri:**
- [x] Logo tıklanınca `/dashboard` sayfasına gider
- [x] Profil dropdown açılıyor
- [x] Çıkış butonu logout fonksiyonunu çağırıyor
- [x] Scroll'da sticky kalıyor

---

### Task 2.4: Sidebar Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Sol menü bileşeni (Ana Sayfa, AI, Forum, Pazar).

**Konum:** `src/components/Layout/Sidebar.tsx`

**Menü Öğeleri:**
```typescript
const menuItems = [
  { icon: '🏠', label: 'Ana Sayfa', path: '/dashboard' },
  { icon: '🤖', label: 'AI Asistanım', path: '/dashboard/ai-assistant' },
  { icon: '💬', label: 'Forum', path: '/dashboard/forum' },
  { icon: '🛒', label: 'Pazar', path: '/dashboard/marketplace' },
];
```

**Özellikler:**
- Aktif sayfa highlight (mavi arka plan)
- Hover efekti (açık gri)
- Sticky
- Responsive (mobilde hamburger ile açılır)

**Test Kriterleri:**
- [x] Aktif sayfa doğru highlight ediliyor
- [x] Tıklayınca sayfa değişiyor
- [x] Hover efekti çalışıyor
- [x] Mobilde hamburger menü ile açılıyor

---

### Task 2.5: DashboardLayout Component
**Süre:** 1 saat  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 2.3, 2.4

**Açıklama:**  
Header + Sidebar + MainContent wrapper bileşeni.

**Konum:** `src/components/Layout/DashboardLayout.tsx`

```typescript
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <Header />
      <div className="dashboard-body">
        <Sidebar />
        <MainContent>
          {children}
        </MainContent>
      </div>
    </div>
  );
};
```

**Test Kriterleri:**
- [x] Header her zaman görünüyor
- [x] Sidebar solda sabit
- [x] Children MainContent'te render ediliyor

---

### Task 2.6: ProfileDropdown Component
**Süre:** 1 saat  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 2.1

**Açıklama:**  
Header'daki profil dropdown menüsü.

**Konum:** `src/components/Common/ProfileDropdown.tsx`

**Menü Öğeleri:**
- 👤 Profilim → `/dashboard/profile`
- ⚙️ Ayarlar → `/dashboard/settings`
- 🚪 Çıkış Yap → `logout()` + redirect to `/`

**Özellikler:**
- Click outside'da kapanır
- Kullanıcı adı + email gösterir
- Avatar (ilk harf)

**Test Kriterleri:**
- [x] Tıklayınca açılıyor
- [x] Click outside'da kapanıyor
- [x] Menü öğeleri doğru çalışıyor
- [x] Çıkış yap token'ları temizliyor

---

## 🎨 Phase 3: Frontend - Dashboard Home Page (1 gün)

### Task 3.1: useGreeting Hook
**Süre:** 30 dakika  
**Atanan:** Frontend Developer

**Açıklama:**  
Saate göre dinamik selamlaşma mesajı dönen custom hook.

**Konum:** `src/hooks/useGreeting.ts`

```typescript
import { useState, useEffect } from 'react';

interface Greeting {
  message: string;
  emoji: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export const useGreeting = (): Greeting => {
  const [greeting, setGreeting] = useState<Greeting>({
    message: 'Merhaba',
    emoji: '👋',
    timeOfDay: 'morning',
  });

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();

      if (hour >= 5 && hour < 12) {
        setGreeting({ message: 'Günaydın', emoji: '🌅', timeOfDay: 'morning' });
      } else if (hour >= 12 && hour < 18) {
        setGreeting({ message: 'İyi günler', emoji: '☀️', timeOfDay: 'afternoon' });
      } else if (hour >= 18 && hour < 22) {
        setGreeting({ message: 'İyi akşamlar', emoji: '🌆', timeOfDay: 'evening' });
      } else {
        setGreeting({ message: 'İyi geceler', emoji: '🌙', timeOfDay: 'night' });
      }
    };

    updateGreeting();

    // Her saat başı güncelle
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  return greeting;
};
```

**Test Kriterleri:**
- [x] Sabah → "Günaydın" + "🌅"
- [x] Öğlen → "İyi günler" + "☀️"
- [x] Akşam → "İyi akşamlar" + "🌆"
- [x] Gece → "İyi geceler" + "🌙"

---

### Task 3.2: GreetingMessage Component
**Süre:** 30 dakika  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 3.1

**Açıklama:**  
Dinamik selamlaşma mesajı komponenti.

**Konum:** `src/components/Dashboard/GreetingMessage.tsx`

```typescript
import { useAuth } from '../../hooks/useAuth';
import { useGreeting } from '../../hooks/useGreeting';

export const GreetingMessage = () => {
  const { user } = useAuth();
  const { message, emoji } = useGreeting();

  return (
    <h1 className="greeting-title">
      {emoji} {message}, {user?.first_name}!
    </h1>
  );
};
```

**Test Kriterleri:**
- [x] Kullanıcı adı doğru gösteriliyor
- [x] Dinamik selamlaşma çalışıyor

---

### Task 3.3: HeroSection Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 3.2

**Açıklama:**  
Dashboard ana sayfası hero bölümü (gradient animasyon + selamlaşma).

**Konum:** `src/components/Dashboard/HeroSection.tsx`

```typescript
import GreetingMessage from './GreetingMessage';

export const HeroSection = () => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <GreetingMessage />
        <p className="hero-subtitle">
          Bugün ne öğrenmek istersin?
        </p>
      </div>
    </section>
  );
};
```

**CSS (Gradient Animation):**
```css
.hero-section {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  background-size: 200% 200%;
  animation: gradient-shift 8s ease infinite;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.hero-content {
  text-align: center;
}

.greeting-title {
  font-size: 3rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #e0e0e0;
}

@media (max-width: 768px) {
  .greeting-title {
    font-size: 2rem;
  }
  .hero-subtitle {
    font-size: 1.25rem;
  }
}
```

**Test Kriterleri:**
- [x] Gradient animasyon akıcı çalışıyor
- [x] Ortalanmış görünüm
- [x] Responsive (mobilde yazı boyutu küçülüyor)

---

### Task 3.4: Dashboard HomePage Component
**Süre:** 1 saat  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 3.3

**Açıklama:**  
Dashboard ana sayfası (şimdilik sadece Hero section).

**Konum:** `src/pages/Dashboard/HomePage.tsx`

```typescript
import HeroSection from '../../components/Dashboard/HeroSection';

export const DashboardHomePage = () => {
  return (
    <div className="dashboard-home">
      <HeroSection />
      {/* Gelecekte buraya widget'lar eklenebilir */}
    </div>
  );
};
```

**Test Kriterleri:**
- [x] Sayfa render ediliyor
- [x] Hero section görünüyor

---

### Task 3.5: React Router Setup
**Süre:** 1 saat  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 2.2, 2.5, 3.4

**Açıklama:**  
Dashboard route'larını tanımla.

**Konum:** `src/App.tsx` veya `src/routes/index.tsx`

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import DashboardHomePage from './pages/Dashboard/HomePage';
import AIAssistantPage from './pages/Dashboard/AIAssistantPage';
import ForumPage from './pages/Dashboard/ForumPage';
import MarketplacePage from './pages/Dashboard/MarketplacePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected dashboard routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute requireVerified={true}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHomePage />} />
          <Route path="ai-assistant" element={<AIAssistantPage />} />
          <Route path="forum" element={<ForumPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Test Kriterleri:**
- [x] `/dashboard` → Dashboard home
- [x] `/dashboard/ai-assistant` → AI sayfası
- [x] `/dashboard/forum` → Forum sayfası
- [x] `/dashboard/marketplace` → Pazar sayfası
- [x] Doğrulanmamış kullanıcı → `/login` redirect

---

## 🧪 Phase 4: Testing & Polish (0.5 gün)

### Task 4.1: Frontend Component Test'leri
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
React Testing Library ile bileşen test'leri yaz.

**Test Dosyaları:**
```
tests/
├── components/
│   ├── Header.test.tsx
│   ├── Sidebar.test.tsx
│   ├── ProfileDropdown.test.tsx
│   └── HeroSection.test.tsx
└── pages/
    └── DashboardHomePage.test.tsx
```

**Test Senaryoları:**
- Header render
- Sidebar aktif item highlight
- ProfileDropdown açılma/kapanma
- HeroSection selamlaşma mesajı
- ProtectedRoute redirect

**Test Kriterleri:**
- [x] Tüm test'ler pass
- [x] Coverage %80+

---

### Task 4.2: E2E Test (Dashboard Flow)
**Süre:** 1 saat  
**Atanan:** QA / Frontend Developer

**Açıklama:**  
Cypress veya Playwright ile dashboard kullanıcı akışı test et.

**Test Senaryosu:**
```javascript
describe('Dashboard Flow', () => {
  it('User logs in and sees dashboard', () => {
    // 1. Login yap
    cy.visit('/login');
    cy.get('input[name="email"]').type('ali@selcuk.edu.tr');
    cy.get('input[name="password"]').type('Password123');
    cy.get('button[type="submit"]').click();

    // 2. Dashboard'a yönlendirildi mi?
    cy.url().should('include', '/dashboard');

    // 3. Hero section görünüyor mu?
    cy.contains('Günaydın, Ali').should('be.visible');

    // 4. Sidebar görünüyor mu?
    cy.contains('Ana Sayfa').should('be.visible');
    cy.contains('Forum').should('be.visible');

    // 5. Profil dropdown çalışıyor mu?
    cy.get('[data-testid="profile-dropdown"]').click();
    cy.contains('Profilim').should('be.visible');
    cy.contains('Çıkış Yap').should('be.visible');
  });
});
```

**Test Kriterleri:**
- [x] Login → Dashboard flow çalışıyor
- [x] Tüm bileşenler görünüyor

---

### Task 4.3: Responsive Test (Mobil/Tablet)
**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Farklı ekran boyutlarında dashboard'u test et.

**Test Ekranları:**
- 📱 Mobile (375px)
- 📱 Tablet (768px)
- 💻 Desktop (1024px)
- 🖥️ Wide (1440px)

**Test Kriterleri:**
- [x] Mobilde sidebar hamburger ile açılıyor
- [x] Hero section yazı boyutu küçülüyor
- [x] Header scroll'da sticky kalıyor
- [x] Tüm ekran boyutlarında düzgün görünüyor

---

### Task 4.4: Performance Optimization
**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Dashboard performansını optimize et.

**Optimizasyonlar:**
- React.memo() ile gereksiz re-render'ları önle
- Lazy loading (React.lazy) ile sayfa bileşenlerini lazy yükle
- useCallback/useMemo kullan
- Gradient animasyonu GPU'da çalıştır (will-change: transform)

**Test Kriterleri:**
- [x] Lighthouse Performance Score > 90
- [x] First Contentful Paint < 1.5s
- [x] Time to Interactive < 2s

---

### Task 4.5: Accessibility (A11y) Test
**Süre:** 1 saat  
**Atanan:** Frontend Developer

**Açıklama:**  
Dashboard erişilebilirlik standartlarına uygun mu test et.

**Kontroller:**
- [x] Keyboard navigation çalışıyor (Tab, Enter, Esc)
- [x] Focus state'leri görünüyor
- [x] ARIA label'ları ekli
- [x] Color contrast WCAG AA standardına uygun
- [x] Screen reader ile test edildi

**Tool'lar:**
- axe DevTools
- WAVE
- Lighthouse Accessibility Audit

---

## 📝 Phase 5: Documentation & Deployment (0.5 gün)

### Task 5.1: API Dokümantasyonu
**Süre:** 30 dakika  
**Atanan:** Backend Developer

**Açıklama:**  
FastAPI otomatik docs'a ek açıklamalar ekle.

**Endpoint Açıklamaları:**
```python
@router.get(
    "/welcome",
    response_model=DashboardWelcomeResponse,
    summary="Dashboard Karşılama Bilgileri",
    description="""
    Kullanıcının dashboard sayfası için gerekli bilgileri döner.
    
    - Kullanıcı bilgileri (ad, soyad, email, vs.)
    - Dinamik selamlaşma mesajı (saate göre)
    - Email doğrulaması gereklidir
    """,
    responses={
        200: {"description": "Başarılı"},
        401: {"description": "Yetkilendirme hatası veya email doğrulanmamış"},
    }
)
```

**Test Kriterleri:**
- [x] `/docs` sayfasında açıklamalar görünüyor

---

### Task 5.2: Frontend README
**Süre:** 30 dakika  
**Atanan:** Frontend Developer

**Açıklama:**  
Dashboard bileşenleri için README yaz.

**Konum:** `src/components/Layout/README.md`

**İçerik:**
- Bileşen yapısı
- Props açıklamaları
- Kullanım örnekleri
- Tasarım sistemi referansları

---

### Task 5.3: Deployment Hazırlıkları
**Süre:** 1 saat  
**Atanan:** DevOps / Full-Stack Developer

**Açıklama:**  
Dashboard'u production'a deploy etmek için gerekli ayarları yap.

**Kontroller:**
- [x] Environment variables (.env.production)
- [x] API base URL production'a ayarlı
- [x] Build script'leri çalışıyor
- [x] Static asset'ler optimize edilmiş (minify, gzip)
- [x] CORS ayarları production domain'i için yapıldı

**Test Kriterleri:**
- [x] Production build oluşturuluyor
- [x] Deployed dashboard çalışıyor

---

### Task 5.4: Final QA & Bug Fixes
**Süre:** 2 saat  
**Atanan:** Tüm Ekip

**Açıklama:**  
Son test turunu yap ve bulduğun bugları düzelt.

**Kontroller:**
- [x] Tüm özellikler çalışıyor
- [x] UI/UX sorunları yok
- [x] Console error'ları yok
- [x] Network request'leri optimize
- [x] Tarayıcı uyumluluğu (Chrome, Firefox, Safari, Edge)

---

## ✅ Definition of Done (DoD)

Dashboard özelliği aşağıdaki kriterleri karşılamalıdır:

### Fonksiyonel Gereksinimler
- [ ] Login sonrası dashboard'a yönlendirme çalışıyor
- [ ] Hero section kullanıcı adını gösteriyor
- [ ] Dinamik selamlaşma saate göre değişiyor (4 farklı mesaj)
- [ ] Sidebar tüm sayfalarda görünüyor ve aktif sayfa highlight ediliyor
- [ ] Header sticky (scroll'da üstte kalıyor)
- [ ] Profil dropdown çalışıyor (Profil, Ayarlar, Çıkış)
- [ ] Çıkış yapma token'ları temizliyor ve landing page'e yönlendiriyor
- [ ] Doğrulanmamış kullanıcılar dashboard'a erişemiyor

### Teknik Gereksinimler
- [ ] Backend API endpoint'i çalışıyor ve test edildi
- [ ] Frontend routing doğru çalışıyor
- [ ] Auth middleware çalışıyor (backend + frontend)
- [ ] Unit test'ler yazıldı ve pass ediyor (%80+ coverage)
- [ ] E2E test'ler yazıldı ve pass ediyor

### Tasarım Gereksinimleri
- [ ] Gradient animasyon akıcı çalışıyor
- [ ] Responsive tasarım mobil/tablet/desktop'ta düzgün
- [ ] Renk paleti ve tipografi tutarlı
- [ ] Hover efektleri ve transitions düzgün

### Performans
- [ ] Dashboard ilk yüklenme < 2 saniye
- [ ] Sidebar navigasyon < 100ms
- [ ] API response time < 500ms
- [ ] Lighthouse Performance Score > 90

### Güvenlik
- [ ] JWT token validation çalışıyor
- [ ] Email doğrulaması kontrolü backend'de yapılıyor
- [ ] XSS saldırılarına karşı korumalı
- [ ] Token'lar güvenli şekilde saklanıyor

### Dokümantasyon
- [ ] API dokümantasyonu tamamlandı
- [ ] Component README'leri yazıldı
- [ ] Code review yapıldı

---

## 📊 Task Özeti

| Phase | Task Sayısı | Tahmini Süre |
|-------|-------------|--------------|
| Phase 0: Hazırlık | 2 | 1 saat |
| Phase 1: Backend API | 5 | 1 gün |
| Phase 2: Frontend Layout | 6 | 1 gün |
| Phase 3: Frontend Home | 5 | 1 gün |
| Phase 4: Testing | 5 | 0.5 gün |
| Phase 5: Docs & Deploy | 4 | 0.5 gün |
| **TOPLAM** | **27** | **3-4 gün** |

---

## 🎯 Başarı Metrikleri

### Kullanıcı Deneyimi
- ✅ Login sonrası dashboard'a ulaşma < 3 saniye
- ✅ Sidebar navigasyon anında geçiş
- ✅ Hero section animasyonu akıcı (60 FPS)

### Teknik Metrikler
- ✅ API response time < 500ms
- ✅ Frontend bundle size < 500 KB (gzipped)
- ✅ Test coverage > 80%
- ✅ Zero console errors

### İş Metrikleri
- ✅ 100% doğrulanmış kullanıcılar dashboard'a erişebiliyor
- ✅ Çıkış yapma başarı oranı 100%
- ✅ Sidebar navigasyon kullanım oranı yüksek

---

**Hazırlayan:** AI Assistant  
**Versiyon:** 1.0  
**Son Güncelleme:** 2026-01-01

