<!--
SYNC IMPACT REPORT
==================
Version Change: Initial → 1.0.0
Rationale: Initial constitution for 003-frontend-ui feature - extends project-wide constitution with frontend-specific principles

Modified Principles: N/A (initial creation)
Added Sections: 
  - Frontend-specific core principles (Component Architecture, Performance-First, Accessibility-First)
  - Modern React & TypeScript stack requirements
  - Frontend testing strategy
  - UI/UX standards and design system
  - Frontend security measures
  - State management philosophy
  - Frontend development workflow

Removed Sections: None

Templates Requiring Updates:
✅ specs/003-frontend-ui/spec.md - will reference these principles for feature requirements
✅ specs/003-frontend-ui/plan.md - will implement these technical choices
✅ specs/003-frontend-ui/tasks.md - will include testing and quality checks per principles

Follow-up TODOs: 
  - Ensure alignment with backend API contracts from 001-ai-platform
  - Validate user story coverage from 002-product-backlog
-->

# Frontend UI & UX Feature Constitution

**Feature ID**: 003-frontend-ui  
**Feature Name**: Modern React UI & UX Design  
**Version**: 1.0.0  
**Status**: Planning  
**Ratified**: 2025-12-29  
**Last Amended**: 2025-12-29  
**Depends On**: 001-ai-platform (backend API), 002-product-backlog (requirements)

---

## Feature Vision & Purpose

Build a modern, responsive, and accessible React-based frontend for KAMPÜS+ AI Platform that provides excellent user experience across all features (authentication, AI chat, document management, forum, admin dashboard). The frontend must feel like a modern SaaS application (Linear, Notion, Vercel Dashboard) with smooth animations, delightful micro-interactions, and zero friction in user flows.

**Success Definition**: An intuitive, fast (Lighthouse 90+), and accessible (WCAG 2.1 AA) web application that students and instructors love to use daily.

---

## Core Principles

### I. Component-Driven Architecture (MANDATORY)

All UI development MUST follow atomic design methodology:

- **Atoms**: Basic building blocks (Button, Input, Icon, Badge, Avatar)
- **Molecules**: Simple combinations (SearchBar, FormField, CardHeader)
- **Organisms**: Complex UI sections (Navbar, ChatMessage, DocumentCard)
- **Templates**: Page layouts (AuthLayout, MainLayout, AdminLayout)
- **Pages**: Complete routes (LoginPage, ChatPage, DocumentsPage)

**Component Rules**:
- Single Responsibility Principle - one component, one job
- Composition over inheritance - build complex from simple
- Shared components in `/src/components/common`
- Feature-specific components in `/src/components/features`
- No prop drilling - use Context API or component composition
- All props MUST be TypeScript typed (no `any`)

**Rationale**: Component-driven development ensures reusability, testability, maintainability, and consistency across the application. Storybook documentation becomes the living design system.

---

### II. TypeScript-First Development (NON-NEGOTIABLE)

All code MUST be written in TypeScript with strict configuration:

- **TypeScript strict mode enabled** in tsconfig.json
- **No implicit `any` types** - all variables, functions, props MUST be explicitly typed
- **95%+ type coverage** - verified with `tsc --noEmit`
- **Interface-based contracts** for API responses (aligned with backend OpenAPI spec)
- **Zod schemas** for runtime validation (forms, API data)
- **Generic types** for reusable components (List<T>, Modal<T>, etc.)

**Configuration Requirements**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Rationale**: TypeScript catches errors at compile time, improves IDE autocomplete, enables confident refactoring, and serves as inline documentation. Type safety is critical for large React applications.

---

### III. Test-Driven Development for Frontend (TDD ADAPTED)

Testing MUST follow this hierarchy:

1. **Unit Tests (Vitest)**: Custom hooks, utility functions, pure logic
   - **Coverage target**: 90%+ for utils and hooks
   - Test pure functions in isolation
   - Mock external dependencies

2. **Component Tests (React Testing Library)**: User interactions and rendering
   - **Coverage target**: 80%+ for components
   - Test user-facing behavior, not implementation
   - Follow "queries by accessibility" pattern (getByRole, getByLabelText)
   - Test keyboard navigation and screen reader compatibility
   - Mock API calls with MSW (Mock Service Worker)

3. **Integration Tests**: Multi-component flows (form submission, modal interactions)
   - **Coverage target**: Critical user paths (login, chat, upload)
   - Test real component interactions
   - Use MSW for realistic API mocking

4. **E2E Tests (Playwright)**: Complete user journeys
   - **Coverage target**: 5-10 critical flows
   - Login → Chat → Ask AI question → Receive response
   - Register → Email verification → First login
   - Upload document → View in list → Preview → Download
   - Forum → Browse → Post → Reply
   - Run across browsers (Chrome, Firefox, Safari, Edge)
   - Mobile responsive testing (iOS Safari, Android Chrome)

**TDD Workflow**:
- Write test describing desired behavior
- Run test and verify it fails (Red)
- Implement minimal code to pass test (Green)
- Refactor while keeping tests green (Refactor)
- **Note**: For UI components, "test-first" may mean writing Storybook stories first, then implementing component to match

**Rationale**: Frontend TDD ensures components work as expected from user perspective, catches regressions during refactoring, and provides confidence during deployment.

---

### IV. Performance-First Mindset (MANDATORY)

All pages MUST meet these performance targets:

- **Initial page load**: <2 seconds on 3G connection (throttled testing)
- **First Contentful Paint (FCP)**: <1.5 seconds
- **Time to Interactive (TTI)**: <3.5 seconds
- **Lighthouse Performance Score**: ≥90 (mobile & desktop)
- **Total bundle size**: <500KB gzipped (excluding images/fonts)
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): <2.5s
  - FID (First Input Delay): <100ms
  - CLS (Cumulative Layout Shift): <0.1

**Performance Strategies**:
- **Code Splitting**: Lazy load routes with `React.lazy()`
- **Component Lazy Loading**: Heavy components (charts, rich text editor) load on-demand
- **Image Optimization**: WebP format with PNG fallback, lazy loading, responsive sizes
- **Font Optimization**: Variable fonts (Inter), preload critical fonts, font-display: swap
- **API Response Caching**: React Query with 5-minute stale time for frequently accessed data
- **Virtual Scrolling**: Use `react-window` for lists with >100 items
- **Bundle Analysis**: Run `vite-bundle-visualizer` monthly to identify bloat
- **Tree Shaking**: Ensure all imports are tree-shakeable (avoid default exports for libraries)

**Performance Monitoring**:
- Lighthouse CI runs on every PR (blocks merge if score drops below 85)
- Real User Monitoring (RUM) with Sentry Performance
- Core Web Vitals tracked in Google Analytics

**Rationale**: Users abandon slow websites. Educational platforms compete with instant gratification apps (social media, games). Performance = user retention.

---

### V. Accessibility-First Development (WCAG 2.1 AA MANDATORY)

All UI components MUST be accessible to users with disabilities:

**Keyboard Navigation**:
- All interactive elements accessible via Tab key
- Focus indicators visible (3px outline, high contrast)
- Logical tab order (matches visual hierarchy)
- Keyboard shortcuts for power users (Ctrl+K for search, Esc to close modals)

**Screen Reader Support**:
- Semantic HTML5 elements (`<nav>`, `<main>`, `<article>`, `<button>`)
- ARIA labels for custom components (`aria-label`, `aria-describedby`, `aria-live`)
- Live region announcements for dynamic content (chat messages, notifications)
- Skip links for keyboard users ("Skip to main content")

**Visual Accessibility**:
- **Color contrast ratio**: ≥4.5:1 for normal text, ≥3:1 for large text
- **Focus indicators**: Never remove outline without replacement
- **Color not sole indicator**: Use icons + text (not just red for errors)
- **Responsive text**: Font size scalable (use rem, not px)

**Form Accessibility**:
- All inputs have associated `<label>` or `aria-label`
- Error messages linked with `aria-describedby`
- Required fields indicated with `aria-required="true"` + visual indicator
- Form validation provides clear, actionable error messages

**Testing Requirements**:
- **Automated**: Run `axe-core` via jest-axe on all components (0 violations)
- **Manual keyboard testing**: Navigate entire app with Tab/Shift+Tab/Enter/Escape
- **Screen reader testing**: Test with NVDA (Windows) or VoiceOver (Mac) for critical flows
- **Color contrast**: Use browser DevTools "Accessibility Inspector"

**Rationale**: 15% of the world has a disability. Accessibility is a legal requirement in many jurisdictions (ADA, Section 508). Accessible design benefits all users (keyboard shortcuts, clear labels, high contrast).

---

### VI. Mobile-First Responsive Design (MANDATORY)

All pages MUST be designed for mobile first, then enhanced for larger screens:

**Breakpoint Strategy** (Tailwind CSS):
- **Mobile (default)**: 375px - 639px (sm breakpoint)
- **Tablet**: 640px - 1023px (md breakpoint)
- **Desktop**: 1024px+ (lg, xl, 2xl breakpoints)

**Responsive Rules**:
- Design for 375px width first (iPhone SE, Android budget phones)
- Test on real devices (iOS, Android) via BrowserStack or physical devices
- Touch targets ≥44px x 44px (Apple HIG / Material Design standard)
- Navigation: Hamburger menu on mobile, sidebar on desktop
- Typography: Scales up for larger screens (base 16px, lg 18px)
- Images: Responsive with `srcset` for different resolutions

**Mobile Optimizations**:
- Reduce cognitive load (fewer options per screen)
- Bottom navigation for mobile (easier thumb reach)
- Swipe gestures where intuitive (swipe to delete, pull to refresh)
- Native-like interactions (smooth scrolling, fast transitions)

**Testing Requirements**:
- Playwright mobile emulation (iOS Safari, Android Chrome)
- Real device testing on 3+ devices before production
- Test landscape and portrait orientations

**Rationale**: 60%+ of web traffic is mobile. Educational platforms are used on-the-go (commuting, between classes). Mobile-first forces prioritization of essential features.

---

### VII. Security & Privacy for Frontend (MANDATORY)

Frontend MUST implement these security measures:

**Authentication & Session Management**:
- **JWT tokens in httpOnly cookies** (NOT localStorage - vulnerable to XSS)
- **CSRF tokens** for all mutations (POST, PUT, DELETE)
- **Secure cookie flags**: httpOnly, Secure (HTTPS only), SameSite=Strict
- **Token refresh logic**: Silent refresh before expiration
- **Session timeout**: Auto-logout after 30 minutes of inactivity
- **Re-authentication** for sensitive operations (password change, delete account)

**XSS Prevention**:
- **React's built-in escaping**: JSX automatically escapes user input
- **DOMPurify** for user-generated HTML (forum posts, rich text)
- **Content Security Policy (CSP)**: Restrict inline scripts, only allow trusted sources
- **Sanitize URLs**: Use `URL` constructor to validate before opening in new tab

**Input Validation**:
- **Client-side validation** with Zod schemas (same as backend contracts)
- **Never trust client-side** - backend MUST re-validate
- **Prevent SQL injection** via parameterized queries (backend responsibility, but frontend shouldn't construct raw SQL strings)

**Data Exposure Prevention**:
- **No sensitive data in console.log** (API keys, tokens, PII)
- **No sensitive data in error boundaries** (mask tokens in error messages)
- **Redact PII in analytics** (Google Analytics, Sentry)

**Dependencies Security**:
- **npm audit** runs weekly (fix critical/high vulnerabilities)
- **Renovate bot** for automatic dependency updates
- **Subresource Integrity (SRI)** for CDN resources

**Rationale**: Frontend is the attack surface. XSS and CSRF are common vulnerabilities. Educational platforms handle student PII (FERPA compliance). Security breaches = loss of trust.

---

### VIII. State Management Philosophy (MANDATORY)

Use the right tool for the right job:

**1. Zustand (Global State)**: Lightweight, Redux-like without boilerplate
   - **Use for**: Auth state (user, token), UI preferences (theme, sidebar open), global modals
   - **Store structure**:
     ```typescript
     authStore: { user, isAuthenticated, login(), logout() }
     uiStore: { theme, sidebarOpen, modal, toast }
     ```

**2. React Query (Server State)**: Automatic caching, refetching, synchronization
   - **Use for**: All API data (documents, chats, forum posts, user profiles)
   - **Query keys**: `['feature', 'action', ...params]` (e.g., `['chat', 'conversations', userId]`)
   - **Cache strategy**: 
     - Stale time: 5 minutes (data considered fresh)
     - Cache time: 10 minutes (data kept in memory)
     - Refetch on window focus: true (for real-time-ish updates)
   - **Mutations**: Automatic invalidation of related queries (e.g., post message → invalidate conversation list)
   - **Optimistic updates**: Instant UI feedback (like button, upvote) before server confirms

**3. React Context (Theme & Localization)**: Built-in, simple for read-heavy data
   - **Use for**: Theme context (light/dark mode), localization (i18n)
   - **Context providers**: Wrap at App level

**4. Local Component State (useState/useReducer)**: UI-only state
   - **Use for**: Form inputs, modal open/closed, dropdown selected, loading states
   - **Rule**: If data doesn't need to be shared with siblings/parents, keep it local

**Anti-Patterns to AVOID**:
- ❌ Prop drilling (passing props through 3+ levels)
- ❌ Storing server data in Zustand (use React Query)
- ❌ Overusing Context (causes unnecessary re-renders)
- ❌ Redux (unnecessary complexity for this app size)

**Rationale**: Clear separation of concerns. Zustand for global UI state (simple), React Query for server state (automatic sync), Context for cross-cutting concerns (theme), local state for ephemeral UI.

---

## Technology Stack (LOCKED IN)

**Core Framework**:
- React 18.2+ (Concurrent Features: useTransition, useDeferredValue)
- TypeScript 5.0+ (strict mode)
- Vite 5.0+ (build tool - faster than Webpack)

**Styling & UI**:
- Tailwind CSS 3.4+ (utility-first, JIT compiler)
- Headless UI 2.0+ (accessible unstyled components: Dialog, Menu, Transition)
- Lucide React 0.300+ (icons - tree-shakeable, <50KB)
- clsx + tailwind-merge (conditional className utilities)

**Routing**:
- React Router v6.20+ (declarative routing, code splitting, protected routes)

**State Management**:
- Zustand 4.4+ (global state - 3KB library)
- React Query 5.0+ (server state - caching, sync, mutations)

**Forms & Validation**:
- React Hook Form 7.48+ (performant uncontrolled forms)
- Zod 3.22+ (TypeScript-first schema validation)

**Data Visualization**:
- Recharts 2.10+ (admin dashboard charts - composable, responsive)

**Rich Text Editing**:
- Tiptap 2.1+ (forum posts - headless, extensible, Markdown support)

**HTTP Client**:
- Axios 1.6+ (with interceptors for JWT, CSRF, retry logic)

**Testing Stack**:
- Vitest 1.0+ (unit tests - fast, Vite-native, ESM support)
- React Testing Library 14.0+ (component tests - user-centric)
- MSW 2.0+ (API mocking - Mock Service Worker)
- Playwright 1.40+ (E2E tests - cross-browser, mobile emulation)
- jest-axe (accessibility tests - axe-core integration)

**Code Quality**:
- ESLint 8.55+ (with airbnb-typescript, react-hooks, jsx-a11y plugins)
- Prettier 3.1+ (code formatting)
- Husky 8.0+ + lint-staged (pre-commit hooks)

**Performance Tools**:
- Lighthouse CI (automated audits in GitHub Actions)
- vite-bundle-visualizer (bundle size analysis)
- react-window (virtual scrolling for large lists)

**Security**:
- DOMPurify (sanitize user-generated HTML - XSS prevention)

**Development Tools**:
- Storybook 7.6+ (component development + visual testing)
- React DevTools (debugging component tree)
- React Query DevTools (cache inspection)

**Deployment & Monitoring**:
- Vercel (hosting - zero-config, global CDN, automatic HTTPS)
- Sentry (error tracking + performance monitoring)
- Google Analytics 4 (privacy-compliant analytics)

---

## Component Architecture Standards

### Design System Requirements

**Color Palette** (Tailwind config):
- **Primary**: Blue (`primary-50` to `primary-900`)
- **Secondary**: Gray (`gray-50` to `gray-900`)
- **Success**: Green (`green-500`, `green-600`)
- **Error**: Red (`red-500`, `red-600`)
- **Warning**: Yellow (`yellow-500`, `yellow-600`)
- **Info**: Blue (`blue-500`, `blue-600`)

**Typography**:
- **Font Family**: Inter (variable font) - modern, readable, open-source
- **Font Sizes**: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px)
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

**Spacing Scale** (Tailwind default): 4px base unit
- 1 (4px), 2 (8px), 3 (12px), 4 (16px), 6 (24px), 8 (32px), 12 (48px), 16 (64px)

**Border Radius**:
- sm (4px), md (8px), lg (12px), xl (16px), 2xl (24px), full (9999px - circular)

**Shadows**:
- sm, md, lg, xl (Tailwind defaults - subtle, not overwhelming)

**Breakpoints**:
- sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

### Component Library (Must Implement)

**Atoms** (15 components):
1. Button (Primary, Secondary, Outline, Ghost, Destructive, Loading states)
2. Input (Text, Email, Password, Number - with validation states)
3. TextArea (auto-resize option)
4. Select (native + custom with search)
5. Checkbox
6. Radio
7. Switch (toggle)
8. Badge (status indicators)
9. Avatar (with fallback initials)
10. Icon (Lucide React wrapper)
11. Spinner (loading indicator)
12. Divider
13. Link (with external icon for external links)
14. Label (form labels)
15. ErrorMessage (form error display)

**Molecules** (10 components):
1. FormField (Label + Input + ErrorMessage)
2. SearchBar (Input + Search icon + Clear button)
3. Card (Header + Body + Footer)
4. CardHeader (Title + Description + Actions)
5. Breadcrumbs (navigation trail)
6. Pagination (Previous, Page numbers, Next)
7. Alert (Success, Error, Warning, Info with dismiss button)
8. Toast (notification - auto-dismiss)
9. Tooltip (hover info)
10. ProgressBar (linear, circular, percentage)

**Organisms** (15 components):
1. Navbar (Logo, Navigation, User menu)
2. Sidebar (Collapsible, with navigation items)
3. Footer (Links, Copyright)
4. Modal (Centered, Full-screen, Drawer variants)
5. Dropdown (Menu, Context menu)
6. Tabs (Horizontal, Vertical navigation)
7. Table (Sortable, Filterable, Paginated)
8. DataGrid (advanced table with column customization)
9. EmptyState (No data message with CTA)
10. ErrorBoundary (fallback UI for crashes)
11. SkeletonLoader (loading placeholders)
12. FileUpload (Drag & drop area + file list)
13. RichTextEditor (Tiptap wrapper)
14. CodeBlock (Syntax highlighted code - Prism.js)
15. InfiniteScroll (load more on scroll - forum, documents)

**Templates** (3 layouts):
1. AuthLayout (Centered card for login/register)
2. MainLayout (Navbar + Sidebar + Content + Footer)
3. AdminLayout (Dense sidebar + Header + Content)

---

## User Experience Standards

### UX Principles (MANDATORY)

**1. 3-Click Rule**: Any feature must be reachable within 3 clicks from home
   - Home → Chat (1 click)
   - Home → Documents (1 click)
   - Home → Forum → Post (2 clicks)
   - Home → Profile → Settings (2 clicks)

**2. Loading States Everywhere**: Never show blank screen
   - **Skeleton screens** for data-heavy pages (preferred over spinners)
   - **Progress bars** for uploads (show percentage)
   - **Inline spinners** for quick actions (like, upvote)
   - **Optimistic updates** for instant feedback (React Query mutations)

**3. Clear Error Messages with Recovery**:
   - ❌ Bad: "Error 500"
   - ✅ Good: "Failed to load documents. This might be a temporary issue. [Retry] [Contact Support]"
   - Always provide actionable next steps

**4. Keyboard Shortcuts for Power Users**:
   - `Ctrl+K` (Cmd+K on Mac): Open search/command palette
   - `Esc`: Close modal/drawer
   - `Ctrl+Enter`: Submit form (chat message, forum post)
   - `/`: Focus search bar
   - `?`: Show keyboard shortcuts help modal

**5. Consistent Interaction Patterns**:
   - Confirm destructive actions (delete, logout) with modal
   - Show success toast after mutations (document uploaded, post created)
   - Auto-save drafts for long-form content (forum posts)
   - Preserve scroll position on navigation back

### Animation Guidelines

**Use Animations for**:
- Page transitions (subtle fade, 150ms)
- Modal entrance/exit (scale + fade, 200ms)
- Dropdown open/close (slide down, 150ms)
- Button hover (scale 1.05, background color change)
- Loading skeletons (shimmer effect)
- Toast notifications (slide in from top/bottom)

**Animation Rules**:
- Duration: 150-300ms (never >500ms - feels slow)
- Easing: ease-in-out (smooth start/end)
- Respect `prefers-reduced-motion` (disable for accessibility)
- Never animate layout shifts (causes CLS)

---

## Documentation Standards

### Required Documentation

**1. README.md** (Project root):
   - Project overview
   - Installation steps (Node.js, npm install, env variables)
   - Development commands (dev, build, test, lint)
   - Folder structure explanation
   - Contribution guidelines

**2. Storybook** (Component documentation):
   - Every common component MUST have story
   - Show all variants (Button: primary, secondary, disabled, loading)
   - Include interactive controls (Storybook Controls)
   - Accessibility checks (a11y addon)

**3. API Integration Guide** (`/docs/api-integration.md`):
   - Base URL, authentication flow
   - Example requests/responses
   - Error handling patterns
   - React Query usage examples

**4. Deployment Guide** (`/docs/deployment.md`):
   - Vercel setup steps
   - Environment variables configuration
   - Build optimization checklist
   - Post-deployment validation

**5. Inline Comments** (Code):
   - JSDoc for public functions (exported utils, hooks)
   - Inline comments for complex business logic ONLY
   - Self-documenting code preferred (clear naming)

---

## Development Workflow

### Git Workflow

**Branch Strategy**:
- `main`: Production-ready code (protected, requires PR approval)
- `develop`: Integration branch for features
- `feature/003-task-name`: Feature branches for tasks
- `bugfix/issue-123`: Bug fix branches

**Commit Message Format** (Conventional Commits):
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore
**Example**:
```
feat(chat): add streaming response support

- Integrate Server-Sent Events for real-time AI responses
- Add loading skeleton during streaming
- Handle connection errors with retry logic

Closes #42
```

### Code Review Checklist

Before approving a PR, verify:
- [ ] Tests pass (unit, component, E2E)
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
- [ ] ESLint/Prettier checks pass
- [ ] Storybook stories updated (if component added/changed)
- [ ] Accessibility: No axe violations
- [ ] Performance: Lighthouse score ≥85 (if page changed)
- [ ] Security: No hardcoded secrets, no XSS vulnerabilities
- [ ] Mobile responsive: Tested on mobile viewport
- [ ] Browser compatibility: Tested on Chrome, Firefox, Safari
- [ ] Constitution compliance: Follows all principles above

### Definition of Done

A task is complete when:
1. ✅ Implementation matches acceptance criteria
2. ✅ Tests written and passing (80%+ coverage)
3. ✅ Code reviewed and approved
4. ✅ Storybook story added (if component)
5. ✅ Accessibility audit passed (axe-core 0 violations)
6. ✅ Performance check passed (no bundle bloat)
7. ✅ Documentation updated (if needed)
8. ✅ Deployed to staging and manually tested

---

## Governance

### Amendment Process

1. **Proposal**: Document proposed change with rationale (GitHub issue)
2. **Discussion**: Team reviews (async or in meeting)
3. **Approval**: Requires consensus from frontend lead + 1 other team member
4. **Versioning**:
   - **MAJOR** (2.0.0): Breaking changes (remove principle, change tech stack)
   - **MINOR** (1.1.0): New principles added, expanded guidance
   - **PATCH** (1.0.1): Clarifications, typos, non-breaking updates
5. **Propagation**: Update dependent docs (spec.md, plan.md, tasks.md) in same PR
6. **Announcement**: Notify team in Slack/Discord

### Compliance Review

- **Pull Request Review**: Constitution compliance checked on every PR
- **Monthly Retrospective**: Assess if principles are followed, identify friction
- **Anonymous Feedback**: Team members can flag violations anonymously
- **Process Improvement**: Persistent violations → constitution amendment or tooling fix

### Precedence

This constitution extends the project-wide constitution at `.specify/memory/constitution.md`. In case of conflict, feature-specific rules (this document) take precedence for frontend tasks. For cross-cutting concerns (security, testing philosophy), defer to project-wide constitution.

---

## Alignment with Existing Features

### 001-ai-platform (Backend API)

Frontend MUST align with backend contracts:
- **Authentication**: JWT tokens (httpOnly cookies), refresh token flow
- **API Endpoints**: OpenAPI spec at `/api/v1/docs` is source of truth
- **WebSocket/SSE**: AI chat streaming endpoint
- **Error Responses**: Standardized error format (HTTP status, message, details)

### 002-product-backlog (User Stories)

Frontend implements all 10 user stories:
- US1: User Registration & Login → Auth pages
- US2: AI-Powered Student Support → Chat interface
- US3: Lecture Materials Repository → Document management
- US4: Collaborative Learning Community → Forum pages
- US5: Course Management → (if applicable)
- US6-US10: (Reference product backlog for full list)

All user story acceptance criteria MUST have corresponding UI components and E2E tests.

---

**Constitution Status**: ✅ APPROVED FOR PLANNING  
**Next Step**: Create `spec.md` with detailed feature requirements  
**Review Date**: Before implementation starts (after spec + plan approval)

---

*This constitution serves as the guiding document for all frontend development decisions. When in doubt, refer to this document. For questions or proposed amendments, contact the frontend lead.*
