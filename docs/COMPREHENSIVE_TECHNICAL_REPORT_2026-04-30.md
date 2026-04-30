# KAMPUS+ Comprehensive Technical Documentation Report

Date: 2026-04-30
Scope: Entire repository at project root
Audience: Engineers and AI assistants requiring full project context

## 1) Project Overview

KAMPUS+ is a full-stack student platform designed for university communities. It combines academic workflows, community interaction, marketplace features, career modules, messaging, and an AI assistant into one system.

Primary goals observed from code and specifications:
- Provide a single platform for students to manage campus-related activities.
- Support university-scoped data and role-aware access patterns.
- Offer AI-assisted discovery using retrieval over uploaded/ingested official documents.
- Enable social and collaborative features: forum, direct messaging, friendships, course notes.
- Keep local development simple with Docker Compose and seeded data.

Operational intent visible in repository:
- Backend API with FastAPI and async SQLAlchemy.
- Frontend SPA with React + TypeScript + Vite.
- Dockerized local stack with PostgreSQL, backend, frontend, Mailhog.
- Feature-first specification workflow in specs/001-020.

## 2) Tech Stack and Languages

### Languages
- Python (backend)
- TypeScript (frontend)
- JavaScript (config/runtime build files)
- SQL (through Alembic migrations and SQLAlchemy models)
- Shell/Bash (backend startup scripts)
- Batch (Windows setup)
- YAML (Docker Compose)
- Markdown (documentation/specs)

### Backend runtime and libraries (from backend/requirements.txt)
- fastapi
- uvicorn[standard]
- python-multipart
- pydantic
- pydantic-settings
- sqlalchemy
- alembic
- asyncpg
- psycopg2-binary
- aiosqlite
- python-jose[cryptography]
- passlib[bcrypt]
- bcrypt
- python-dotenv
- google-genai>=1.0.0
- faiss-cpu
- langchain==0.2.16
- langchain-core==0.2.43
- langchain-community==0.2.17
- langchain-google-genai==1.0.8
- langchain-text-splitters==0.2.2
- pypdf
- httpx
- beautifulsoup4
- email-validator
- pytest
- pytest-asyncio
- ruff
- black

### Frontend runtime and libraries (from frontend/package.json)
Core:
- react ^19.2.4
- react-dom ^19.2.4
- react-router-dom ^7.9.6
- axios ^1.13.2
- react-markdown ^10.1.0
- remark-gfm ^4.0.1

UI system and primitives:
- extensive @radix-ui/* component suite
- sonner (toasts)
- lucide/lucide-react (icons)
- class-variance-authority, clsx, tailwind-merge

Styling and build:
- tailwindcss ^3.4.18
- postcss ^8.5.6
- autoprefixer ^10.4.22
- vite ^7.2.2
- @vitejs/plugin-react ^5.1.0
- typescript ~5.9.3
- eslint ^9.39.1 + typescript-eslint

Data viz and utilities:
- recharts, date-fns, react-day-picker, embla-carousel-react, react-easy-crop

### Infrastructure and tooling
- Docker / Docker Compose
- PostgreSQL 15 (docker image postgres:15-alpine)
- Mailhog for local email inspection
- Nginx in frontend production container
- Alembic migration workflow
- Makefile + setup.bat onboarding

## 3) Architecture

### Architectural pattern
- System style: modular monolith (backend) + SPA frontend.
- Deployment style: multi-container local environment orchestrated via Docker Compose.
- Backend layering pattern:
  - API routes (transport/controller layer)
  - services (business logic)
  - models (data/ORM)
  - core (infrastructure/config/security/db)

### Communication model
- Frontend calls backend over REST JSON endpoints under /api/v1.
- Backend route handlers use dependency injection (session, current user, auth guards).
- Services orchestrate domain operations and external integrations (Gemini, vector search, email).
- ORM persists to PostgreSQL (compose) or SQLite (fallback/alt config).
- Static/user uploads served via backend endpoints and mounted static paths.

### Data and boundary decisions
- JWT auth with access + refresh flow.
- Multi-domain modules: auth, academic, forum, marketplace, career, ai, messages, notifications.
- AI module uses vector retrieval (FAISS files under backend/data/vectors).
- Local file storage strategy (no S3/MinIO in current implementation).

## 4) Directory Structure (every folder and file with responsibility)

Note: responsibilities for design/spec/task markdown and some asset placeholders are inferred from location and naming where code content is not executable logic.

### Root files
- .cursorignore - Cursor ignore patterns.
- .dockerignore - Docker build-context excludes.
- .eslintignore - ESLint ignore patterns.
- .gitattributes - git attributes and line endings.
- .gitignore - git ignore rules.
- README.md - root onboarding and project summary.
- docker-compose.yml - local multi-service orchestration.
- backend_logs.txt - captured backend log output.
- Makefile - convenience targets for startup.
- response_login.json - sample login payload/response artifact.
- setup.bat - Windows one-click setup.

### .claude
- .claude/settings.json - Claude tool/editor settings.
- .claude/settings.local.json - local override settings.

### .cursor
- .cursor/rules/task-distribution-role.mdc - team workflow/editor rule file.

### backend root
- backend/.env - active backend environment values.
- backend/.env.example - backend env template.
- backend/Dockerfile - backend container build/runtime.
- backend/alembic.ini - Alembic configuration.
- backend/pytest.ini - pytest configuration.
- backend/requirements.txt - Python dependency definitions.

### backend/alembic
- backend/alembic/README.md - Alembic usage docs.
- backend/alembic/env.py - migration runtime config.
- backend/alembic/script.py.mako - revision file template.

### backend/alembic/versions
- backend/alembic/versions/.gitkeep - directory placeholder.
- backend/alembic/versions/035600396283_forum_refactor_and_reports.py - forum/report schema migration.
- backend/alembic/versions/a07bd1037c4d_initial_postgres_schema.py - initial PostgreSQL schema migration.

### backend/data
- backend/data/kampus_plus.db - SQLite database file (if used).

### backend/data/vectors
- backend/data/vectors/metadata_official.pkl - serialized vector metadata.
- backend/data/vectors/vdb_official.index - FAISS index.

### backend/scripts
- backend/scripts/ensure_initial_data.py - idempotent seed/test account setup.
- backend/scripts/ingest_docs.py - document ingestion pipeline for vectors.
- backend/scripts/seed_konya_normalized.py - normalized institutional seed data.
- backend/scripts/start_dev.sh - container startup script (migrate/seed/run).
- backend/scripts/vector_seed.py - vector seed utility.
- backend/scripts/vector_seed_konya.py - Konya-focused vector seed utility.

### backend/src
- backend/src/main.py - FastAPI app entrypoint, middleware, static mounts, router registration.

### backend/src/api/routes
- backend/src/api/routes/academic.py - academic calendar/schedules/contributions/admin academic flows.
- backend/src/api/routes/auth.py - register/login/admin login/refresh/logout/verify/reset endpoints.
- backend/src/api/routes/career.py - career listings/apply/report flows.
- backend/src/api/routes/chat.py - AI conversation endpoints and message limits.
- backend/src/api/routes/course_notes.py - topics/entries/attachments lifecycle.
- backend/src/api/routes/forum.py - categories/topics/replies/helpful/reports/admin moderation.
- backend/src/api/routes/friendships.py - request/respond/friends/pending endpoints.
- backend/src/api/routes/health.py - liveness/readiness/health checks.
- backend/src/api/routes/institutions.py - universities/faculties/departments lookups.
- backend/src/api/routes/marketplace.py - marketplace listing CRUD operations.
- backend/src/api/routes/messages.py - direct and conversation messaging endpoints.
- backend/src/api/routes/notifications.py - list/read/read-all notifications.
- backend/src/api/routes/search.py - global search and suggest endpoint.
- backend/src/api/routes/users.py - profile updates, picture upload, favorites, password/email/account actions.

### backend/src/core
- backend/src/core/config.py - Pydantic settings and config helpers.
- backend/src/core/database.py - async engine/session lifecycle.
- backend/src/core/dependencies.py - auth/session dependency functions.
- backend/src/core/logging.py - logging setup + request id middleware.
- backend/src/core/security.py - hashing, JWT, token helper logic.

### backend/src/models
- backend/src/models/__init__.py - model exports for metadata/import aggregation.
- backend/src/models/academic.py - academic entities.
- backend/src/models/ai.py - AI conversation/settings/knowledge models.
- backend/src/models/base.py - declarative base.
- backend/src/models/career.py - career listing/application/report/message models.
- backend/src/models/course_notes.py - note topic/entry/attachment models.
- backend/src/models/department.py - department model.
- backend/src/models/direct.py - direct message model.
- backend/src/models/faculty.py - faculty model.
- backend/src/models/favorite.py - user favorites model.
- backend/src/models/forum.py - forum category/topic/reply/report models.
- backend/src/models/friendship.py - friendship relation model.
- backend/src/models/marketplace.py - marketplace listing/report/message models.
- backend/src/models/messages.py - conversation/thread envelope model.
- backend/src/models/notifications.py - notification model.
- backend/src/models/settings.py - settings/contact message model.
- backend/src/models/sync.py - audit/sync model.
- backend/src/models/university.py - university model.
- backend/src/models/user.py - user and refresh token models.

### backend/src/schemas
- backend/src/schemas/__init__.py - schema package init.
- backend/src/schemas/friendship.py - friendship DTO schemas.

### backend/src/services
- backend/src/services/__init__.py - service exports/factory helpers.
- backend/src/services/ai_service.py - Gemini + LangChain orchestration and tooling.
- backend/src/services/auth_service.py - authentication business rules.
- backend/src/services/email_service.py - outbound email logic.
- backend/src/services/file_storage_service.py - local file storage helpers.
- backend/src/services/friendship_service.py - friendship domain logic.
- backend/src/services/university_service.py - institution-related service logic.
- backend/src/services/vector_service.py - FAISS index operations.

### backend/tests
- backend/tests/test_ai_service_guardrail.py - AI safety guardrail test coverage.

### backend/tests/unit
- backend/tests/unit/.gitkeep - placeholder for additional unit tests.

### backend/uploads/course_notes
- backend/uploads/course_notes/391697d06fd8473cad27cbda6b3f0224.pdf - uploaded course-note PDF artifact.
- backend/uploads/course_notes/abff9da663ab47038532df18a474fca9.pdf - uploaded course-note PDF artifact.

### frontend root
- frontend/.dockerignore - frontend Docker ignores.
- frontend/.env - active frontend env.
- frontend/.env.example - frontend env template.
- frontend/.gitignore - frontend ignore rules.
- frontend/Dockerfile - frontend image build (dev/prod stages).
- frontend/README.md - frontend-specific setup docs.
- frontend/eslint.config.js - lint configuration.
- frontend/index.html - SPA host HTML.
- frontend/nginx.conf - production static hosting/routing rules.
- frontend/package-lock.json - pinned npm dependency graph.
- frontend/package.json - scripts and package dependencies.
- frontend/postcss.config.cjs - PostCSS/Tailwind pipeline config.
- frontend/tailwind.config.cjs - Tailwind theme/content scanning.
- frontend/tsconfig.app.json - app TypeScript config.
- frontend/tsconfig.json - base TypeScript project references.
- frontend/tsconfig.node.json - Node tooling TypeScript config.
- frontend/vite.config.ts - Vite dev/build behavior.

### frontend/public
- frontend/public/vite.svg - default Vite asset.

### frontend/public/assets
- frontend/public/assets/kampus-icon.png - branding icon.

### frontend/src root
- frontend/src/App.css - app-level styles.
- frontend/src/App.tsx - route graph and app composition.
- frontend/src/index.css - global css + Tailwind directives.
- frontend/src/main.tsx - React mount entrypoint.
- frontend/src/vite-env.d.ts - Vite type declarations.

### frontend/src/api
- frontend/src/api/academic.ts - academic API client calls.
- frontend/src/api/auth.ts - auth API calls.
- frontend/src/api/config.ts - axios base client + interceptors.
- frontend/src/api/course_notes.ts - course notes API calls.
- frontend/src/api/forum.ts - forum API calls.
- frontend/src/api/friendship.ts - friendship API calls.
- frontend/src/api/institutions.ts - institutions API calls.

### frontend/src/app/components
- frontend/src/app/components/AuthModal.tsx - auth modal component.
- frontend/src/app/components/ContentCard.tsx - dashboard content card component.
- frontend/src/app/components/DashboardHero.tsx - dashboard hero section component.
- frontend/src/app/components/Footer.tsx - footer component.
- frontend/src/app/components/Header.tsx - header/nav component.
- frontend/src/app/components/PreviewModal.tsx - preview modal component.
- frontend/src/app/components/Sidebar.tsx - sidebar component.

### frontend/src/app/data
- frontend/src/app/data/mockCards.ts - mock card dataset.

### frontend/src/components/academic
- frontend/src/components/academic/CalendarPDFUploadModal.tsx - calendar PDF upload UI.
- frontend/src/components/academic/SchedulePDFUploadModal.tsx - schedule PDF upload UI.

### frontend/src/components/auth
- frontend/src/components/auth/LoginForm.tsx - login form UI.
- frontend/src/components/auth/ProtectedRoute.tsx - route authorization wrapper.
- frontend/src/components/auth/RegisterForm.tsx - registration form UI.

### frontend/src/components/auth/__tests__
- frontend/src/components/auth/__tests__/.gitkeep - placeholder test folder.

### frontend/src/components/auth/login
- frontend/src/components/auth/login/EmailNotVerifiedError.tsx - verification error UI state.
- frontend/src/components/auth/login/index.ts - login submodule barrel.

### frontend/src/components/auth/register
- frontend/src/components/auth/register/index.ts - register submodule barrel.
- frontend/src/components/auth/register/RegisterSuccessMessage.tsx - post-registration success UI.

### frontend/src/components/chat
- frontend/src/components/chat/ChatInterface.tsx - chat interaction component.

### frontend/src/components/chat/__tests__
- frontend/src/components/chat/__tests__/.gitkeep - placeholder test folder.

### frontend/src/components/forum
- frontend/src/components/forum/CategoryCard.tsx - forum category card.
- frontend/src/components/forum/ImageLightbox.tsx - image modal/lightbox.
- frontend/src/components/forum/InlineComments.tsx - inline reply/comment section.
- frontend/src/components/forum/NewThreadForm.tsx - create-thread form.
- frontend/src/components/forum/PostCard.tsx - topic/post card.
- frontend/src/components/forum/ReplyForm.tsx - reply editor form.
- frontend/src/components/forum/SearchBar.tsx - forum search input.
- frontend/src/components/forum/ThreadList.tsx - thread list rendering.
- frontend/src/components/forum/ThreadView.tsx - single-thread detail rendering.

### frontend/src/components/forum/__tests__
- frontend/src/components/forum/__tests__/.gitkeep - placeholder test folder.

### frontend/src/components/institution
- frontend/src/components/institution/CascadingInstitutionSelect.tsx - university/faculty/department linked selector.

### frontend/src/components/layout
- frontend/src/components/layout/AdminLayout.tsx - admin shell layout.
- frontend/src/components/layout/Header.tsx - shared header.
- frontend/src/components/layout/MainLayout.tsx - main authenticated shell.
- frontend/src/components/layout/Sidebar.tsx - shared sidebar navigation.

### frontend/src/components/layout/__tests__
- frontend/src/components/layout/__tests__/.gitkeep - placeholder test folder.

### frontend/src/components/marketplace
- frontend/src/components/marketplace/ListingCard.tsx - listing summary card.
- frontend/src/components/marketplace/ListingDetailView.tsx - listing details UI.
- frontend/src/components/marketplace/NewListingForm.tsx - create listing form.

### frontend/src/components/ui
- frontend/src/components/ui/accordion.tsx - accordion primitive.
- frontend/src/components/ui/alert.tsx - alert primitive.
- frontend/src/components/ui/avatar.tsx - avatar primitive.
- frontend/src/components/ui/badge.tsx - badge primitive.
- frontend/src/components/ui/button.tsx - button primitive.
- frontend/src/components/ui/card.tsx - card primitive.
- frontend/src/components/ui/checkbox.tsx - checkbox primitive.
- frontend/src/components/ui/collapsible.tsx - collapsible primitive.
- frontend/src/components/ui/dialog.tsx - dialog primitive.
- frontend/src/components/ui/dropdown-menu.tsx - dropdown primitive.
- frontend/src/components/ui/input.tsx - input primitive.
- frontend/src/components/ui/label.tsx - label primitive.
- frontend/src/components/ui/popover.tsx - popover primitive.
- frontend/src/components/ui/progress.tsx - progress primitive.
- frontend/src/components/ui/radio-group.tsx - radio group primitive.
- frontend/src/components/ui/scroll-area.tsx - scroll area primitive.
- frontend/src/components/ui/select.tsx - select primitive.
- frontend/src/components/ui/separator.tsx - separator primitive.
- frontend/src/components/ui/sheet.tsx - sheet/drawer primitive.
- frontend/src/components/ui/skeleton.tsx - loading skeleton primitive.
- frontend/src/components/ui/slider.tsx - slider primitive.
- frontend/src/components/ui/sonner.tsx - toast wrapper.
- frontend/src/components/ui/switch.tsx - switch primitive.
- frontend/src/components/ui/tabs.tsx - tabs primitive.
- frontend/src/components/ui/textarea.tsx - textarea primitive.
- frontend/src/components/ui/tooltip.tsx - tooltip primitive.
- frontend/src/components/ui/utils.ts - ui helper utilities.

### frontend/src/contexts
- frontend/src/contexts/AuthContext.tsx - auth state and methods provider.

### frontend/src/hooks
- frontend/src/hooks/useAuth.ts - hook for auth context consumption.

### frontend/src/hooks/__tests__
- frontend/src/hooks/__tests__/.gitkeep - placeholder test folder.

### frontend/src/lib
- frontend/src/lib/use-mobile.ts - responsive/mobile detection hook.
- frontend/src/lib/utils.ts - shared utility functions.

### frontend/src/pages
- frontend/src/pages/AIAssistantPage.tsx - AI assistant page variant.
- frontend/src/pages/AcademicCalendarPage.tsx - academic calendar page.
- frontend/src/pages/AuthPage.tsx - unified auth page mode router.
- frontend/src/pages/CareerPage.tsx - career module page.
- frontend/src/pages/ChatPage.tsx - chat page.
- frontend/src/pages/CourseSchedulePage.tsx - course schedule page.
- frontend/src/pages/Error403Page.tsx - 403 page.
- frontend/src/pages/Error404Page.tsx - 404 page.
- frontend/src/pages/Error500Page.tsx - 500 page.
- frontend/src/pages/ForgotPasswordPage.tsx - forgot password page.
- frontend/src/pages/ForumPage.tsx - forum page.
- frontend/src/pages/GlobalSearchPage.tsx - global search page.
- frontend/src/pages/LandingPage.tsx - public landing page.
- frontend/src/pages/LoginPage.tsx - standalone login page.
- frontend/src/pages/MarketplacePage.tsx - marketplace page.
- frontend/src/pages/MessagesChatPage.tsx - chat thread page.
- frontend/src/pages/MessagesPage.tsx - conversation list page.
- frontend/src/pages/NewDashboard.tsx - authenticated dashboard page.
- frontend/src/pages/NotificationsPage.tsx - notifications page.
- frontend/src/pages/ProfilePage.tsx - profile page.
- frontend/src/pages/RegisterPage.tsx - standalone register page.
- frontend/src/pages/ResetPasswordPage.tsx - reset password page.
- frontend/src/pages/SettingsPage.tsx - settings page.
- frontend/src/pages/TermsOfServicePage.tsx - terms page.
- frontend/src/pages/VerifyEmailPage.tsx - email verification page.

### frontend/src/pages/__tests__
- frontend/src/pages/__tests__/.gitkeep - placeholder test folder.

### frontend/src/pages/admin
- frontend/src/pages/admin/AdminAcademicPage.tsx - academic admin page.
- frontend/src/pages/admin/AdminAIPage.tsx - AI admin page.
- frontend/src/pages/admin/AdminCareerPage.tsx - career admin page.
- frontend/src/pages/admin/AdminCourseNoteDetailPage.tsx - admin note detail moderation page.
- frontend/src/pages/admin/AdminCourseNotesPage.tsx - admin notes list moderation page.
- frontend/src/pages/admin/AdminDashboard.tsx - admin dashboard root.
- frontend/src/pages/admin/AdminForumPage.tsx - forum moderation page.
- frontend/src/pages/admin/AdminLoginPage.tsx - admin login page.
- frontend/src/pages/admin/AdminMarketplacePage.tsx - marketplace moderation page.
- frontend/src/pages/admin/AdminMessagesPage.tsx - admin messages oversight page.
- frontend/src/pages/admin/AdminSchedulePage.tsx - schedule admin page.
- frontend/src/pages/admin/AdminUsersPage.tsx - users admin page.

### frontend/src/pages/course-notes
- frontend/src/pages/course-notes/CourseNoteDetailPage.tsx - detailed note topic page.
- frontend/src/pages/course-notes/CourseNotesPage.tsx - note topics listing page.

### frontend/src/pages/Network
- frontend/src/pages/Network/NetworkPage.tsx - friendship/network page.

### frontend/src/services
- frontend/src/services/academic.ts - frontend-side academic transformations/helpers.
- frontend/src/services/messages.ts - message shaping/helper logic.

### frontend/src/types
- frontend/src/types/auth.ts - auth/user TS types.
- frontend/src/types/chat.ts - chat TS types.
- frontend/src/types/department.ts - institution TS types.
- frontend/src/types/forum.ts - forum TS types.
- frontend/src/types/marketplace.ts - marketplace TS types.

### frontend/src/utils
- frontend/src/utils/dateUtils.ts - date/time formatting helpers.
- frontend/src/utils/imageUrl.ts - image URL resolver helper.

### docs
- docs/TASK_DISTRIBUTION_5_PEOPLE.md - team ownership and merge-conflict mitigation plan.
- docs/TECH_STACK.md - selected stack and rationale documentation.

### specs root
- specs/SYSTEM_OVERVIEW.md - system-level feature and architecture specification.

### specs feature folders
- specs/001-landing-page/design-notes.md - design considerations for landing.
- specs/001-landing-page/spec.md - requirement spec for landing.
- specs/001-landing-page/tasks.md - implementation checklist for landing.
- specs/002-register-page/spec.md - registration requirements.
- specs/002-register-page/tasks.md - registration task list.
- specs/003-login-page/spec.md - login requirements.
- specs/003-login-page/tasks.md - login task list.
- specs/004-dashboard/spec.md - dashboard requirements.
- specs/004-dashboard/tasks.md - dashboard tasks.
- specs/005-forum-page/spec.md - forum requirements.
- specs/005-forum-page/tasks.md - forum tasks.
- specs/006-academic-features/spec.md - academic features requirements.
- specs/006-academic-features/tasks.md - academic tasks.
- specs/007-marketplace/spec.md - marketplace requirements.
- specs/007-marketplace/tasks.md - marketplace tasks.
- specs/008-career-page/spec.md - career requirements.
- specs/008-career-page/tasks.md - career tasks.
- specs/009-ai-assistant/spec.md - AI assistant requirements.
- specs/009-ai-assistant/tasks.md - AI assistant tasks.
- specs/010-profile/spec.md - profile requirements.
- specs/010-profile/tasks.md - profile tasks.
- specs/011-settings/spec.md - settings requirements.
- specs/011-settings/tasks.md - settings tasks.
- specs/012-notifications/spec.md - notifications requirements.
- specs/012-notifications/tasks.md - notifications tasks.
- specs/013-messages/spec.md - messages requirements.
- specs/013-messages/tasks.md - messages tasks.
- specs/014-admin-panel/ADMIN_ROLES.md - admin role model and permissions.
- specs/014-admin-panel/spec.md - admin panel requirements.
- specs/014-admin-panel/tasks.md - admin panel tasks.
- specs/015-email-verification/spec.md - email verification requirements.
- specs/015-email-verification/tasks.md - email verification tasks.
- specs/016-forgot-password/spec.md - forgot password requirements.
- specs/016-forgot-password/tasks.md - forgot password tasks.
- specs/017-reset-password/spec.md - reset password requirements.
- specs/017-reset-password/tasks.md - reset password tasks.
- specs/018-terms-of-service/spec.md - terms requirements.
- specs/018-terms-of-service/tasks.md - terms tasks.
- specs/019-global-search/spec.md - global search requirements.
- specs/019-global-search/tasks.md - global search tasks.
- specs/020-error-pages/spec.md - error pages requirements.
- specs/020-error-pages/tasks.md - error pages tasks.

## 5) Core Modules and Components

### Backend core modules
- main.py
  - Constructs FastAPI app and lifespan startup/shutdown.
  - Initializes DB and vector service at startup.
  - Registers middleware (request ID, CORS), exception handlers, and all routers.
  - Mounts upload/static/document directories.

- core/config.py
  - Defines strongly-typed settings via BaseSettings.
  - Handles DB URL conversion for async runtime and sync Alembic use.
  - Centralizes auth token durations, AI model settings, upload constraints, CORS, logging.

- core/database.py
  - Creates async engine/session factory.
  - Applies SQLite WAL pragmas in sqlite mode.
  - Exposes get_db dependency with transaction commit/rollback behavior.

- core/security.py
  - Password hashing/verification and JWT token utilities.
  - Token decoding and auth-related helper logic used by dependencies and services.

- core/dependencies.py
  - Current-user resolution from bearer token.
  - Role and session injection for route handlers.

- services/auth_service.py
  - Registration/login/refresh/reset/verification business rules.
  - User checks and token issuance orchestration.

- services/ai_service.py
  - Orchestrates AI assistant behavior, guardrails, retrieval and prompting.
  - Uses vector service + Gemini/LangChain stack.

- services/vector_service.py
  - Loads/saves/searches FAISS indexes.
  - Maps vector retrieval metadata.

- services/file_storage_service.py
  - Persists user uploads in local disk paths and returns URLs.

- services/email_service.py
  - Verification/reset and notification mail dispatch abstraction.

- API route modules under backend/src/api/routes
  - Implement domain-specific endpoint contracts.
  - Route layer generally performs request validation, permission checks, and calls services/ORM ops.

### Backend domain model groups
- Identity and institution: user.py, university.py, faculty.py, department.py.
- Discussion and moderation: forum.py.
- Commerce and careers: marketplace.py, career.py.
- Academic workflows: academic.py, course_notes.py.
- Messaging and social graph: messages.py, direct.py, friendship.py, notifications.py.
- AI persistence: ai.py.
- Utilities/audit/preferences: favorite.py, settings.py, sync.py.

### Frontend core modules
- src/main.tsx
  - React root mount.

- src/App.tsx
  - Complete route map.
  - Public routes, protected dashboard routes, protected admin subtree via AdminLayout.

- src/contexts/AuthContext.tsx
  - Startup auth restore, login/adminLogin/logout/register/updateUser.
  - Stores token/user in localStorage.

- src/api/config.ts
  - Axios client with base URL normalization.
  - request interceptor injects access token.
  - response interceptor handles 401 refresh workflow.

- src/components/auth/ProtectedRoute.tsx
  - Enforces authentication and role checks before route rendering.

- src/components/layout/*
  - Shared application shell (header/sidebar/layout variants).

- src/pages/*
  - Feature pages for each module (dashboard, forum, marketplace, career, AI, settings, etc.).

- src/components/ui/*
  - Reusable design-system primitives built around Radix/shadcn patterns.

## 6) Data Flow

### Authentication flow
1. User submits credentials in frontend auth pages/forms.
2. Frontend calls /api/v1/auth/login or /api/v1/auth/admin/login.
3. Backend validates credentials, returns access token and user payload; refresh handled via cookie endpoints.
4. Frontend stores access token and user in localStorage and sets header through axios interceptor.
5. On expired token, response interceptor calls /api/v1/auth/refresh, updates token, retries request.

### Request handling flow
1. Frontend API modules call axios client.
2. Backend route receives request under /api/v1/*.
3. FastAPI dependency chain injects db session and current user when required.
4. Route executes domain logic (directly or via service layer).
5. SQLAlchemy ORM persists/fetches data.
6. Response serialized to JSON and returned to frontend.

### File upload flow
1. Frontend sends multipart payload to domain endpoint (forum/academic/course notes/profile/etc.).
2. Backend validates type/size constraints from config.
3. file_storage_service writes to backend/uploads hierarchy.
4. Stored path/URL is persisted in model fields.
5. Files are served via /uploads/* endpoint in main.py.

### AI flow
1. Frontend chat page sends message to /api/v1/ai/* endpoints.
2. chat.py invokes ai_service orchestration.
3. ai_service can perform retrieval through vector_service over FAISS index files.
4. Model response + conversation records are persisted and returned.

### Search flow
- frontend global search page -> backend /api/v1/search + /api/v1/search/suggest.
- backend aggregates domain tables and returns unified result payload.

### Messaging flow
- direct or domain-context conversations managed under messages endpoints.
- conversation and message records stored in messages/direct/career/marketplace related models.
- notifications module complements unread and alert UX.

## 7) Configuration and Environment

### Root and container configuration
- docker-compose.yml defines db, backend, frontend, mailhog services.
- Makefile and setup.bat bootstrap .env files and run compose.

### Backend configuration surfaces
- backend/.env for runtime values.
- backend/.env.example as onboarding template.
- backend/src/core/config.py reads env and computes derived values.
- Alembic uses backend/alembic.ini + backend/alembic/env.py and sync DB URL conversion.

Key backend env groups:
- App mode: ENVIRONMENT, DEBUG.
- DB: DATABASE_URL.
- Auth: JWT_SECRET_KEY, JWT_* expiries.
- AI: AI_PROVIDER, GOOGLE_API_KEY, GEMINI_*.
- Storage/vector: UPLOAD_DIR, VECTOR_STORE_PATH, FAISS_INDEX_*, VECTOR_DIMENSION.
- Security/cors: CORS_ORIGINS, ALLOWED_HOSTS, rate limits.
- Email: SMTP_* and FRONTEND_URL.

### Frontend configuration surfaces
- frontend/.env and frontend/.env.example for VITE_API_URL.
- frontend/vite.config.ts controls dev host/port and watch behavior.
- frontend/nginx.conf controls production SPA serving behavior.

## 8) Entry Points and Routing Logic

### Backend entry points
- Primary app: backend/src/main.py.
- Runtime startup in container: backend/scripts/start_dev.sh.
- Health endpoints exposed under /health.

### Backend route mount strategy
- main.py mounts routers with prefix /api/v1 (except health which keeps /health prefix from router).
- Individual router prefixes:
  - /auth
  - /ai
  - /forum
  - /notifications
  - /messages
  - /marketplace
  - /career
  - /academic
  - /users
  - /friendships
  - /institutions
  - /course-notes
  - /search

### Frontend entry points
- App bootstrap: frontend/src/main.tsx.
- Route map: frontend/src/App.tsx.
- Public routes include landing/auth/verification/password reset/terms.
- Protected student routes are under /dashboard/*.
- Protected admin routes are under /admin/* with nested admin pages.
- Fallback route redirects to 404 page.

## 9) External Dependencies and Integrations

### External services and protocols
- Google Gemini API via google-genai and langchain-google-genai.
- FAISS local vector index files for retrieval.
- SMTP/Mailhog for email workflows in local stack.

### Internal integration points
- PostgreSQL 15 in Docker for team/dev parity.
- SQLite path support in config for alternate local mode.
- Static + upload serving integrated in FastAPI app.

### Build-time and UI integrations
- Radix primitives + Tailwind utility stack.
- React Router for navigation.
- Axios interceptors for auth lifecycle.

## 10) Notable Patterns, Conventions, and Design Decisions

- API namespace consistency: most business APIs grouped under /api/v1.
- Context-based frontend auth state with centralized axios refresh behavior.
- Separation of domain route modules in backend improves feature ownership.
- Explicit model package export list in backend/src/models/__init__.py centralizes metadata import.
- Test placeholders (.gitkeep in several frontend/backend test folders) indicate planned but incomplete coverage expansion.
- Local-first artifacts (uploads and vector index files committed/present) show development/test pragmatism.
- Specs-driven development process: each module has spec.md + tasks.md, and one includes design-notes.
- Team collaboration planning is documented (docs/TASK_DISTRIBUTION_5_PEOPLE.md) to minimize merge conflicts in shared files.

## Supplemental: Detectable Implementation Status

What is clearly implemented in codebase structure:
- End-to-end auth routes and frontend auth UX.
- Domain routes for forum/marketplace/career/academic/messages/notifications/search.
- Admin route tree and admin pages.
- AI service and vector storage scaffolding.
- Containerized local stack and seeding scripts.

What appears partially implemented or in-progress (from repo shape and placeholders):
- Expanded automated tests beyond current guardrail test.
- Some page-level features may still be iterative/stub-level depending on each page implementation detail.

---

This document is intended to be used as a deep operational context file for AI-assisted development and onboarding.