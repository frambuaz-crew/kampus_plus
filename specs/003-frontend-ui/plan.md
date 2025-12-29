# Implementation Plan: Modern React Frontend UI & UX

**Branch**: `003-frontend-ui` | **Date**: 2025-12-29 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/003-frontend-ui/spec.md`

**Constitution**: [Frontend Constitution](constitution.md) | [Project Constitution](../../.specify/memory/constitution.md)

---

## Summary

Build a modern, production-grade React 18+ frontend application for KAMPÜS+ AI Platform using TypeScript, Tailwind CSS, and a carefully curated ecosystem of libraries optimized for performance (<500KB bundle), accessibility (WCAG 2.1 AA), and developer experience. The application delivers 6 core user journeys (authentication, AI chat with streaming, document management, discussion forum, user profiles, admin dashboard) with mobile-first responsive design (375px-1920px), sub-2-second page loads, and Lighthouse 90+ scores.

**Technical Approach**: Component-driven architecture with atomic design patterns, Zustand for global state, React Query for server state with automatic caching/sync, code splitting at route level, and comprehensive testing strategy (Vitest for unit tests, React Testing Library for components, Playwright for E2E). Security-first with JWT tokens in httpOnly cookies, XSS prevention via DOMPurify, CSRF protection on mutations, and Content Security Policy compliance.

## Technical Context

**Language/Version**: TypeScript 5.0+ (strict mode enabled)  
**Primary Dependencies**: 
- React 18.2+ (Concurrent Features: useTransition, useDeferredValue)
- Vite 5.0+ (build tool - faster than Webpack, optimized HMR)
- Tailwind CSS 3.4+ (JIT compiler, utility-first styling)
- React Router v6.20+ (declarative routing, code splitting)
- Zustand 4.4+ (lightweight global state - 3KB)
- React Query 5.0+ (TanStack Query - server state management)
- React Hook Form 7.48+ (performant uncontrolled forms)
- Zod 3.22+ (TypeScript-first schema validation)

**Storage**: 
- Frontend: localStorage for preferences (theme, drafts), sessionStorage for temporary data
- Server State: React Query cache (in-memory with persistence to localStorage)
- Backend Integration: PostgreSQL (via API), MinIO S3 (document storage), FAISS (vector search)

**Testing**: 
- Unit: Vitest 1.0+ (fast, Vite-native, ESM support)
- Component: React Testing Library 14.0+ (user-centric testing)
- API Mocking: MSW 2.0+ (Mock Service Worker)
- E2E: Playwright 1.40+ (cross-browser, mobile emulation)
- Accessibility: axe-core via jest-axe

**Target Platform**: 
- Desktop: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (1024px-1920px)
- Tablet: 640px-1023px
- Mobile: iOS 14+ Safari, Android 10+ Chrome (375px-639px)
- Web Standards: ES6+, CSS Grid, Flexbox

**Project Type**: Web Application (SPA with potential SSR in Phase 2)

**Performance Goals**:
- Initial page load: <2 seconds on 3G connection
- First Contentful Paint (FCP): <1.5 seconds
- Time to Interactive (TTI): <3.5 seconds
- Lighthouse Performance Score: ≥90 (mobile & desktop)
- Total JavaScript bundle: <500KB gzipped (excluding vendor chunks)
- Page transitions: <300ms
- AI query response start: <5 seconds (p95)

**Constraints**:
- Bundle Size: <500KB gzipped (hard limit)
- Browser Support: No IE11 (modern browsers only)
- Accessibility: WCAG 2.1 Level AA compliance (mandatory)
- Security: httpOnly cookies for JWT (no localStorage for tokens)
- API Integration: Must align with 001-ai-platform backend contracts
- Design: Mobile-first responsive (375px base)

**Scale/Scope**:
- Expected Users: 10,000+ concurrent users (based on 001-ai-platform targets)
- Components: 40+ reusable components (15 atoms, 10 molecules, 15 organisms)
- Routes: 15-20 pages (auth, chat, documents, forum, profile, admin)
- LOC Estimate: 15,000-20,000 lines of TypeScript/TSX
- Features: 6 major user stories (authentication, AI chat, documents, forum, profile, admin)
- Test Coverage: ≥80% for components, ≥90% for utils/hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [Frontend Constitution](constitution.md) and [Project Constitution](../../.specify/memory/constitution.md):

- [x] **Test-First Development**: Comprehensive testing strategy defined - Vitest for unit tests, React Testing Library for components, MSW for API mocking, Playwright for E2E, jest-axe for accessibility
- [x] **Integration Testing**: API contracts aligned with 001-ai-platform backend, TypeScript interfaces for all endpoints, Zod schemas for validation matching backend contracts
- [x] **Security by Default**: JWT tokens in httpOnly cookies (NOT localStorage), XSS prevention via DOMPurify, CSRF tokens on mutations, Content Security Policy headers, no sensitive data in console logs
- [x] **Component Architecture**: Atomic design pattern enforced (Atoms → Molecules → Organisms → Templates → Pages), Single Responsibility Principle, composition over inheritance
- [x] **TypeScript-First**: Strict mode enabled (noImplicitAny, strictNullChecks, strictFunctionTypes), 95%+ type coverage target, no any types allowed
- [x] **Performance-First**: Code splitting at route level (React.lazy), lazy loading for heavy components, virtual scrolling for large lists, React Query caching (5-min stale time), bundle size <500KB
- [x] **Accessibility-First**: WCAG 2.1 Level AA compliance, keyboard navigation, ARIA labels, screen reader support, axe-core automated testing, color contrast ≥4.5:1
- [x] **Mobile-First Responsive**: Design from 375px upward, hamburger menu on mobile, icon sidebar on tablet, full sidebar on desktop, tested on real devices
- [x] **State Management Philosophy**: Zustand for global state (auth, UI prefs), React Query for server state, Context for theme/i18n, local state for UI-only
- [x] **Branch Strategy**: Feature branch `003-frontend-ui` follows naming convention
- [x] **Observability**: Sentry for error tracking, Google Analytics 4 for user analytics, React Query DevTools for cache inspection, performance monitoring via Sentry Performance
- [x] **Technology Stack**: React 18+ (frontend), FastAPI (backend from 001-ai-platform), Vite 5+ (build tool), TypeScript 5+ (language), Tailwind CSS 3.4+ (styling)
- [x] **Code Review**: PR approval process defined, ESLint + Prettier pre-commit hooks via Husky, automated testing gates, Lighthouse CI checks on PR
- [x] **Dependencies Philosophy**: Minimized external dependencies, bundle size evaluation before adding packages, npm audit weekly, tree-shakeable imports only

**Result**: ✅ **ALL CONSTITUTION CHECKS PASSED** - Ready for Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/003-frontend-ui/
├── plan.md              # This file (implementation plan)
├── constitution.md      # Frontend-specific governing principles
├── research.md          # Phase 0: Technical decisions & rationale
├── data-model.md        # Phase 1: Component architecture & TypeScript interfaces
├── quickstart.md        # Phase 1: Developer onboarding guide
├── contracts/           # Phase 1: TypeScript API contracts + Zod schemas
│   ├── auth.types.ts       # Authentication API contracts
│   ├── chat.types.ts       # Chat/AI API contracts
│   ├── document.types.ts   # Document management contracts
│   ├── forum.types.ts      # Forum API contracts
│   ├── user.types.ts       # User/profile contracts
│   └── admin.types.ts      # Admin API contracts
├── checklists/          # Quality validation checklists
│   └── requirements.md     # ✅ Specification quality checklist (passed)
└── tasks.md             # Phase 2: Detailed task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── public/                      # Static assets (favicon, robots.txt, manifest.json)
├── src/
│   ├── assets/                  # Images, fonts, SVGs
│   │   ├── images/
│   │   ├── fonts/               # Inter variable font
│   │   └── icons/               # Custom SVG icons (if needed beyond Lucide)
│   ├── components/
│   │   ├── common/              # Reusable UI atoms & molecules (40+ components)
│   │   │   ├── atoms/           # Button, Input, Badge, Avatar, Spinner, etc. (15)
│   │   │   ├── molecules/       # FormField, SearchBar, Card, Alert, Toast, etc. (10)
│   │   │   └── organisms/       # Navbar, Sidebar, Modal, Table, FileUpload, etc. (15)
│   │   ├── layout/              # Layout templates
│   │   │   ├── AuthLayout.tsx       # Centered card for login/register
│   │   │   ├── MainLayout.tsx       # Navbar + Sidebar + Content + Footer
│   │   │   └── AdminLayout.tsx      # Dense sidebar for admin
│   │   └── features/            # Feature-specific components
│   │       ├── auth/                # LoginForm, RegisterForm, PasswordReset
│   │       ├── chat/                # ChatMessage, ChatInput, ConversationList
│   │       ├── documents/           # DocumentCard, UploadArea, DocumentPreview
│   │       ├── forum/               # ForumPost, ReplyList, RichTextEditor
│   │       ├── profile/             # ProfileCard, AvatarUpload, ActivityFeed
│   │       └── admin/               # UserTable, ModQueue, AnalyticsChart
│   ├── pages/                   # Route pages (lazy loaded)
│   │   ├── auth/                    # Login, Register, ForgotPassword, VerifyEmail
│   │   ├── chat/                    # ChatPage (main AI interface)
│   │   ├── documents/               # DocumentsPage, DocumentDetailPage
│   │   ├── forum/                   # ForumHome, ForumThread, NewPost
│   │   ├── profile/                 # ProfilePage, SettingsPage
│   │   ├── admin/                   # AdminDashboard, UserManagement, Analytics
│   │   ├── HomePage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── ForbiddenPage.tsx
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts               # Authentication state & actions
│   │   ├── useDebounce.ts           # Debounce for search inputs
│   │   ├── useMediaQuery.ts         # Responsive breakpoint detection
│   │   ├── useLocalStorage.ts       # Type-safe localStorage wrapper
│   │   ├── useIntersectionObserver.ts  # Lazy loading, infinite scroll
│   │   └── useKeyboardShortcut.ts   # Ctrl+K, Esc, etc.
│   ├── services/                # API service layer (axios instances)
│   │   ├── api.ts                   # Base axios instance with interceptors
│   │   ├── authService.ts           # Login, register, logout, refresh token
│   │   ├── chatService.ts           # Start conversation, send message (SSE)
│   │   ├── documentService.ts       # Upload, list, download, delete
│   │   ├── forumService.ts          # Posts, replies, upvote, search
│   │   ├── userService.ts           # Profile, settings, activity
│   │   └── adminService.ts          # User mgmt, moderation, analytics
│   ├── store/                   # Zustand stores
│   │   ├── authStore.ts             # { user, isAuthenticated, login(), logout() }
│   │   └── uiStore.ts               # { theme, sidebarOpen, modal, toast }
│   ├── types/                   # TypeScript types and interfaces
│   │   ├── auth.types.ts            # User, LoginRequest, RegisterRequest
│   │   ├── chat.types.ts            # Conversation, Message, AIResponse
│   │   ├── document.types.ts        # Document, UploadProgress, ScanStatus
│   │   ├── forum.types.ts           # Post, Reply, Category, Vote
│   │   ├── user.types.ts            # Profile, Settings, ActivityItem
│   │   ├── admin.types.ts           # AdminUser, AuditLog, Analytics
│   │   └── common.types.ts          # ApiResponse, PaginatedResponse, ErrorResponse
│   ├── utils/                   # Helper functions
│   │   ├── formatDate.ts            # Date formatting utilities
│   │   ├── classNames.ts            # clsx + tailwind-merge wrapper
│   │   ├── validators.ts            # Custom validation functions
│   │   ├── constants.ts             # App constants (ROUTES, API_BASE_URL)
│   │   └── errorHandling.ts         # Error message mapping, recovery suggestions
│   ├── routes/                  # Route configuration
│   │   ├── ProtectedRoute.tsx       # Auth guard for protected routes
│   │   ├── RoleRoute.tsx            # Role-based route guard (admin, instructor)
│   │   └── index.tsx                # Route definitions
│   ├── contexts/                # React Context providers
│   │   ├── ThemeContext.tsx         # Light/dark mode provider
│   │   └── I18nContext.tsx          # Localization provider (future)
│   ├── App.tsx                  # Root component (providers, router)
│   ├── main.tsx                 # Entry point (React.StrictMode, render)
│   └── vite-env.d.ts            # Vite type declarations
├── tests/
│   ├── unit/                    # Unit tests for utils, hooks
│   │   ├── utils/
│   │   └── hooks/
│   ├── components/              # Component tests (React Testing Library)
│   │   ├── common/
│   │   └── features/
│   ├── integration/             # Integration tests (multi-component flows)
│   │   ├── auth.integration.test.tsx
│   │   ├── chat.integration.test.tsx
│   │   └── documents.integration.test.tsx
│   ├── e2e/                     # Playwright E2E tests
│   │   ├── auth.spec.ts             # Login, register, password reset
│   │   ├── chat.spec.ts             # AI chat flow end-to-end
│   │   ├── documents.spec.ts        # Upload, preview, download flow
│   │   ├── forum.spec.ts            # Post, reply, upvote flow
│   │   └── fixtures/                # Test data, helpers
│   ├── setup.ts                 # Global test setup
│   └── mocks/                   # MSW handlers, mock data
│       ├── handlers.ts              # API mocking with MSW
│       └── data.ts                  # Mock response data
├── .storybook/                  # Storybook configuration
│   ├── main.ts
│   ├── preview.ts
│   └── manager.ts
├── .husky/                      # Git hooks
│   ├── pre-commit               # Run lint-staged (ESLint, Prettier, tsc)
│   └── commit-msg               # Validate commit message format
├── .github/
│   └── workflows/
│       ├── ci.yml               # ESLint, Prettier, TypeScript check, tests
│       ├── lighthouse.yml       # Lighthouse CI performance audit
│       └── deploy.yml           # Vercel deployment
├── .eslintrc.cjs                # ESLint configuration (airbnb-typescript)
├── .prettierrc                  # Prettier configuration
├── tailwind.config.js           # Tailwind CSS configuration (theme, plugins)
├── vite.config.ts               # Vite build configuration
├── vitest.config.ts             # Vitest test configuration
├── playwright.config.ts         # Playwright E2E configuration
├── tsconfig.json                # TypeScript configuration (strict mode)
├── tsconfig.node.json           # TypeScript config for Vite/Node files
├── package.json                 # Dependencies, scripts
├── .env.example                 # Example environment variables
├── .env.local                   # Local environment variables (gitignored)
├── README.md                    # Project overview, setup instructions
└── CHANGELOG.md                 # Version history (conventional commits)
```

**Key Directory Decisions**:

1. **Components organized by Atomic Design**: Atoms → Molecules → Organisms hierarchy ensures reusability
2. **Feature-specific components separate**: Prevents monolithic `components/` folder, improves code navigation
3. **Pages lazy-loaded**: Each route dynamically imported to reduce initial bundle size
4. **Services layer abstracts API**: All backend communication isolated, easy to mock in tests
5. **Types co-located with features**: But also centralized in `/types` for shared contracts
6. **Comprehensive test structure**: Mirrors `src/` structure for easy discovery
7. **Storybook for component docs**: Living documentation + visual testing

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

---

## Development Phases

### Phase 0: Technical Research (Duration: 1-2 days)

**Goal**: Resolve all technical unknowns, validate library choices, establish architectural patterns

**Deliverables**: esearch.md document with decisions, rationales, and alternatives considered

**Research Areas**:

1. **State Management Architecture**
   - Decision: Zustand + React Query combination
   - Rationale: Zustand (3KB) for simple global state, React Query for complex server state with auto-caching
   - Alternatives: Redux Toolkit (too heavy), Context API only (no caching, re-render issues), Jotai (less mature)

2. **Form Management Strategy**
   - Decision: React Hook Form + Zod validation
   - Rationale: Uncontrolled components = better performance, Zod aligns with backend TypeScript contracts
   - Alternatives: Formik (slower, controlled components), plain React state (no validation framework)

3. **Styling Approach**
   - Decision: Tailwind CSS with Headless UI for complex components
   - Rationale: JIT compiler keeps CSS minimal, utility-first speeds development, Headless UI ensures accessibility
   - Alternatives: CSS Modules (more boilerplate), Styled Components (runtime overhead), MUI (too opinionated)

4. **Testing Strategy**
   - Decision: Vitest (unit) + RTL (component) + Playwright (E2E) + MSW (API mocking)
   - Rationale: Vitest is Vite-native (faster), RTL aligns with user-centric testing, Playwright is cross-browser
   - Alternatives: Jest (slower with ES modules), Cypress (heavier than Playwright)

5. **Code Splitting & Performance**
   - Decision: Route-level lazy loading + component-level for heavy libs (Recharts, Tiptap)
   - Rationale: Reduces initial bundle, defers non-critical code
   - Pattern: React.lazy(() => import('./pages/AdminDashboard'))

6. **API Integration Pattern**
   - Decision: Axios with interceptors + React Query for caching/mutations
   - Rationale: Interceptors centralize auth token injection, error handling; React Query handles cache invalidation
   - Pattern: Separate service files per feature (uthService.ts, chatService.ts)

7. **Error Handling & Monitoring**
   - Decision: Sentry for error tracking, toast notifications for user-facing errors
   - Rationale: Sentry provides source maps, stack traces, release tracking; toasts are non-intrusive
   - Pattern: Error boundary at route level, centralized API error handler

8. **Accessibility Implementation**
   - Decision: Headless UI primitives + ARIA labels + axe-core testing
   - Rationale: Headless UI is accessible by default, axe-core automates WCAG validation
   - Pattern: All custom components tested with jest-axe, manual screen reader testing for critical flows

9. **Real-time Chat Streaming**
   - Decision: Server-Sent Events (SSE) for AI responses
   - Rationale: Simpler than WebSocket for one-way server-to-client streaming, auto-reconnect
   - Pattern: EventSource API with fallback handling

10. **Mobile Responsiveness Strategy**
    - Decision: Mobile-first with Tailwind breakpoints (sm: 640px, md: 768px, lg: 1024px)
    - Rationale: Most users on mobile, easier to enhance than to strip down
    - Pattern: Base styles for mobile, md: prefix for tablet, lg: for desktop

11. **Theme System**
    - Decision: CSS variables + Tailwind dark mode with class strategy
    - Rationale: CSS vars enable runtime theme switching, class strategy avoids media query conflicts
    - Pattern: <html class="dark"> toggle, localStorage persistence

12. **Bundle Optimization**
    - Decision: Vite code splitting + tree-shaking + manual chunk splitting for vendors
    - Rationale: Automatic optimization with manual overrides for critical vendors (React, React Router)
    - Target: <500KB gzipped (200KB initial, 300KB lazy-loaded)

13. **Type Safety for API Contracts**
    - Decision: TypeScript interfaces generated from OpenAPI spec + Zod runtime validation
    - Rationale: Compile-time safety + runtime validation catches backend contract changes
    - Pattern: contracts/ folder with .types.ts files, Zod schemas for validation

14. **Component Documentation**
    - Decision: Storybook 7.6+ with Autodocs + a11y addon
    - Rationale: Living documentation, visual regression testing, accessibility checks in UI
    - Pattern: Co-located stories (Button.stories.tsx next to Button.tsx)

15. **Deployment Strategy**
    - Decision: Vercel with automatic preview deployments per PR
    - Rationale: Zero-config, automatic HTTPS, global CDN, instant rollbacks
    - CI/CD: GitHub Actions for linting/testing, Vercel for deployment

**Output**: esearch.md document with full justification for all 15 decisions

---

### Phase 1: Data Model & API Contracts (Duration: 2-3 days)

**Goal**: Define component architecture, TypeScript interfaces, API contracts, and setup guide

**Deliverables**: 
- data-model.md - Component hierarchy, state shape, TypeScript interfaces
- contracts/*.types.ts - TypeScript interfaces for all backend API endpoints
- quickstart.md - Developer onboarding and setup instructions

#### Data Model Tasks:

1. **Component Architecture Diagram**
   - Define atomic design hierarchy (Atoms  Molecules  Organisms  Templates  Pages)
   - Document 40+ components with props interfaces
   - Example:
     `	ypescript
     // Atom: Button
     interface ButtonProps {
       variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
       size: 'sm' | 'md' | 'lg';
       isLoading?: boolean;
       disabled?: boolean;
       children: React.ReactNode;
       onClick?: () => void;
     }
     `

2. **State Management Schema**
   - Zustand stores:
     `	ypescript
     // authStore
     interface AuthStore {
       user: User | null;
       isAuthenticated: boolean;
       login: (credentials: LoginRequest) => Promise<void>;
       logout: () => void;
       refreshToken: () => Promise<void>;
     }
     
     // uiStore
     interface UIStore {
       theme: 'light' | 'dark';
       sidebarOpen: boolean;
       modal: { open: boolean; content: ReactNode } | null;
       toast: { show: boolean; message: string; type: 'success' | 'error' | 'info' } | null;
       setTheme: (theme: 'light' | 'dark') => void;
       toggleSidebar: () => void;
       showModal: (content: ReactNode) => void;
       hideModal: () => void;
       showToast: (message: string, type: ToastType) => void;
     }
     `

   - React Query keys:
     `	ypescript
     // Query key structure: ['feature', 'action', ...params]
     ['auth', 'me']
     ['chat', 'conversations', userId]
     ['chat', 'messages', conversationId]
     ['documents', 'list', { page, filter }]
     ['forum', 'posts', categoryId]
     ['admin', 'users', { search, page }]
     `

3. **TypeScript Type System**
   - Define all entity interfaces in /types directory
   - Align with backend contracts from 001-ai-platform
   - Use discriminated unions for variants:
     `	ypescript
     type Message = 
       | { role: 'user'; content: string; timestamp: Date }
       | { role: 'assistant'; content: string; isStreaming: boolean; timestamp: Date };
     `

4. **Form Schema with Zod**
   - Define validation schemas matching backend requirements:
     `	ypescript
     const RegisterSchema = z.object({
       username: z.string().min(3).max(50),
       email: z.string().email(),
       password: z.string()
         .min(8, "Password must be at least 8 characters")
         .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
         .regex(/[0-9]/, "Password must contain at least one number"),
     });
     `

#### API Contract Tasks:

Create TypeScript interfaces for all backend endpoints:

1. **contracts/auth.types.ts**:
   `	ypescript
   export interface LoginRequest {
     email: string;
     password: string;
     rememberMe?: boolean;
   }
   
   export interface LoginResponse {
     user: User;
     accessToken: string; // Note: Sent as httpOnly cookie, not in response body
   }
   
   export interface RegisterRequest {
     username: string;
     email: string;
     password: string;
   }
   // ... more auth interfaces
   `

2. **contracts/chat.types.ts**:
   - Conversation, Message, StreamResponse interfaces
   - Aligned with /api/v1/chat/* endpoints from 001-ai-platform

3. **contracts/document.types.ts**:
   - Document, UploadResponse, ScanStatus interfaces
   - Aligned with /api/v1/documents/* endpoints

4. **contracts/forum.types.ts**:
   - Post, Reply, Category, Vote interfaces
   - Anonymous identifier handling

5. **contracts/user.types.ts**:
   - Profile, Settings, ActivityItem interfaces

6. **contracts/admin.types.ts**:
   - AdminUser, AuditLog, Analytics, ModQueue interfaces

#### Quickstart Guide Tasks:

Create quickstart.md with:

1. **Prerequisites**: Node.js 18+, npm 9+, Git
2. **Installation**:
   `ash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with API_BASE_URL
   npm run dev  # Starts on http://localhost:5173
   `

3. **Available Scripts**:
   - 
pm run dev - Start dev server with HMR
   - 
pm run build - Production build
   - 
pm run preview - Preview production build
   - 
pm run test - Run Vitest unit tests
   - 
pm run test:ui - Vitest UI mode
   - 
pm run test:e2e - Run Playwright E2E tests
   - 
pm run lint - ESLint check
   - 
pm run format - Prettier format
   - 
pm run type-check - TypeScript check (tsc --noEmit)
   - 
pm run storybook - Start Storybook on http://localhost:6006

4. **Project Structure Overview**: Brief tour of key directories
5. **Development Workflow**: Feature branch  PR  CI checks  merge
6. **Troubleshooting**: Common issues (port conflicts, CORS errors, etc.)

**Output**: data-model.md, contracts/*.types.ts, quickstart.md

---

### Phase 2: Task Breakdown (Duration: NOT in /speckit.plan scope)

**Note**: Task breakdown is created by /speckit.tasks command, not by /speckit.plan.

**Next Command**: After Phase 1 complete, run /speckit.tasks to generate detailed task list with:
- 300-400 granular tasks (2-4 hours each)
- Organized by component type (atoms, molecules, organisms, pages)
- Test-driven development approach (write tests first)
- Dependencies between tasks
- Estimated completion timeline (8-10 weeks)

---

## Implementation Phases (High-Level Overview)

*Detailed tasks will be generated by /speckit.tasks command*

### Week 1-2: Project Setup & Design System
- Initialize Vite + React + TypeScript project
- Configure Tailwind CSS, ESLint, Prettier, Husky
- Setup testing infrastructure (Vitest, RTL, Playwright, MSW)
- Create Storybook configuration
- Build atomic design system (15 atoms, 10 molecules)
- Implement theme system (light/dark mode)

### Week 3-4: Authentication & Layout
- Build authentication pages (Login, Register, ForgotPassword)
- Implement auth service + Zustand store
- Create protected route wrapper
- Build main layout (Navbar, Sidebar, Footer)
- Implement mobile responsive navigation

### Week 5-6: AI Chat Interface
- Build chat page layout
- Implement message components (user, assistant, streaming)
- Integrate SSE for AI streaming responses
- Add file attachment support
- Build conversation history sidebar
- Implement chat export functionality

### Week 7-8: Document Management
- Build document upload interface (drag & drop)
- Implement upload progress tracking
- Create document list with filters and search
- Build document preview modal
- Integrate with backend document API

### Week 9-10: Discussion Forum
- Build forum home and category list
- Implement rich text editor (Tiptap)
- Create post and reply components
- Add upvote/downvote functionality
- Implement forum search

### Week 11-12: User Profile & Admin Dashboard
- Build user profile page with avatar upload
- Implement settings page (password, notifications, theme)
- Create activity history feed
- Build admin dashboard (user management, moderation, analytics)
- Implement Recharts data visualizations

### Week 13-14: Testing, Optimization & Launch
- Achieve 80%+ test coverage
- Run E2E test suite (Playwright)
- Perform accessibility audit (axe-core + manual)
- Optimize bundle size (<500KB target)
- Run Lighthouse audits (90+ score target)
- Performance testing (load times, Core Web Vitals)
- Security audit (XSS, CSRF, CSP)
- Deploy to Vercel production

---

## Dependencies & Integration Points

### Backend API (001-ai-platform)

**Base URL**: http://localhost:8000/api/v1 (dev), https://api.kampusplus.com/api/v1 (prod)

**Authentication**:
- POST /auth/register - Create new user account
- POST /auth/login - Authenticate user (sets httpOnly cookie)
- POST /auth/logout - Invalidate session
- POST /auth/refresh - Refresh JWT token
- POST /auth/password-reset - Request password reset email
- POST /auth/password-reset/confirm - Confirm password reset with token

**User**:
- GET /users/me - Get current user profile
- PATCH /users/me - Update user profile
- POST /users/me/change-password - Change password
- POST /users/me/avatar - Upload avatar image

**Chat**:
- POST /chat/conversations - Create new conversation
- GET /chat/conversations - List user's conversations
- POST /chat/conversations/{id}/messages - Send message (SSE response)
- GET /chat/conversations/{id} - Get conversation with messages
- DELETE /chat/conversations/{id} - Delete conversation
- GET /chat/export/{id} - Export conversation as Markdown

**Documents**:
- POST /documents/upload - Upload PDF (multipart/form-data)
- GET /documents - List user's documents (paginated, filterable)
- GET /documents/{id} - Get document metadata
- GET /documents/{id}/download - Download document file
- DELETE /documents/{id} - Delete document
- GET /documents/search?q={query} - Search documents

**Forum**:
- GET /forum/categories - List categories with post counts
- GET /forum/posts?category={id} - List posts in category
- POST /forum/posts - Create new post
- GET /forum/posts/{id} - Get post with replies
- POST /forum/posts/{id}/replies - Add reply to post
- POST /forum/posts/{id}/vote - Upvote/downvote post
- GET /forum/search?q={query} - Search posts and replies
- POST /forum/posts/{id}/bookmark - Bookmark thread

**Admin** (requires Admin role):
- GET /admin/users - List all users (paginated, searchable)
- PATCH /admin/users/{id} - Update user (role, status)
- DELETE /admin/users/{id} - Delete user
- GET /admin/moderation/queue - Get flagged content
- POST /admin/moderation/{id}/action - Approve/remove content
- GET /admin/analytics - Get system analytics data
- GET /admin/audit-logs - Get audit logs (filterable)
- PATCH /admin/settings - Update platform settings

### External Services (via backend proxy)

- **OpenAI/Gemini API**: AI responses (backend handles, frontend displays streaming)
- **MinIO S3**: Document storage (backend handles, frontend gets signed URLs)
- **ClamAV**: Malware scanning (backend handles, frontend displays status)
- **SMTP**: Email sending (backend handles, frontend triggers)

### Frontend-Only Services

- **Sentry**: Error tracking and performance monitoring
- **Google Analytics 4**: User interaction analytics
- **Vercel**: Hosting and deployment

---

## Risk Mitigation

### Risk 1: Bundle Size Exceeds 500KB

**Probability**: Medium  
**Impact**: High (fails performance target)  
**Mitigation**:
- Lazy load admin dashboard (admin users only)
- Lazy load Recharts (charts) and Tiptap (rich text editor)
- Manual vendor chunk splitting in Vite config
- Regular bundle analysis with ite-bundle-visualizer
- Avoid heavy libraries (moment.js  date-fns, lodash  individual imports)

### Risk 2: Accessibility Failures in axe-core Audits

**Probability**: Medium  
**Impact**: High (constitution violation)  
**Mitigation**:
- Use Headless UI for complex components (accessible by default)
- Run jest-axe on all components during development
- Manual screen reader testing for critical flows
- Color contrast checker in Tailwind config
- Focus management testing

### Risk 3: AI Streaming Interruptions

**Probability**: Medium  
**Impact**: Medium (poor UX)  
**Mitigation**:
- Implement retry logic with exponential backoff
- Save partial responses on error
- Clear error messages with recovery options
- Fallback to polling if SSE fails
- Connection status indicator

### Risk 4: Complex State Management Bugs

**Probability**: Medium  
**Impact**: Medium  
**Mitigation**:
- Use React Query DevTools for cache debugging
- Comprehensive unit tests for Zustand stores
- Clear separation: Zustand (global state) vs React Query (server state)
- Avoid prop drilling with composition patterns

### Risk 5: Cross-Browser Compatibility Issues

**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- Playwright tests run on Chrome, Firefox, Safari, Edge
- Use Autoprefixer via Tailwind
- Avoid cutting-edge CSS features
- Polyfill only if necessary (Vite legacy plugin)

---

## Success Metrics (Alignment with Specification)

From spec.md Success Criteria (SC-001 to SC-034):

**Performance** (SC-006 to SC-010):
-  Page transitions <300ms
-  AI responses streaming <5s (p95)
-  Initial page load <2s on 3G
-  Document preview <1s (p90)
-  Lighthouse Score 90

**User Experience** (SC-011 to SC-015):
-  85% primary task completion on first attempt
-  90% document search success rate
-  Forum post creation <3 minutes
-  95% understand error messages
-  User satisfaction 4.5/5

**Accessibility** (SC-016 to SC-020):
-  Zero critical axe-core violations
-  100% keyboard navigable
-  95% browser compatibility
-  99% responsive (375px-1920px)
-  Screen reader users <2x time

**Technical Quality** (SC-030 to SC-034):
-  TypeScript compiles (zero errors)
-  ESLint/Prettier zero violations
-  80% test coverage (critical paths)
-  100% E2E pass rate
-  <500KB bundle size

---

## Next Steps

1.  **Phase 0 Complete**: This plan.md document created
2.  **Generate research.md**: Document all 15 technical decisions
3.  **Generate data-model.md**: Component architecture + TypeScript interfaces
4.  **Generate contracts/**: API contract TypeScript interfaces
5.  **Generate quickstart.md**: Developer onboarding guide
6.  **Update agent context**: Run .specify/scripts/powershell/update-agent-context.ps1
7.  **Run /speckit.tasks**: Generate 300-400 detailed tasks with TDD approach

**Command to continue**:
`ash
# After reviewing this plan, proceed with:
/speckit.tasks
`

---

**Plan Status**:  PHASE 0 & 1 PLANNING COMPLETE  
**Ready For**: Phase 0 research.md generation  Phase 1 artifacts  /speckit.tasks  
**Estimated Implementation**: 12-14 weeks (3 developers)  
**Next Milestone**: Phase 1 artifacts (research.md, data-model.md, contracts/, quickstart.md)
