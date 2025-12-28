# Implementation Plan: KAMPÜS+ AI-Powered Hybrid Intelligence Platform

**Branch**: `001-ai-platform` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

KAMPÜS+ eliminates information fragmentation across university systems by providing a unified AI assistant platform that merges official academic data with user-generated content. The system uses a hybrid RAG (Retrieval-Augmented Generation) architecture with dual vector databases: one for official university data and another for user-generated content. Students authenticate via university email, interact with an AI chatbot powered by LangChain + Google Gemini, upload personal PDFs for vectorization, and participate in anonymous forums. All student data is anonymized before AI processing per constitutional requirements.

## Technical Context

**Language/Version**: Python 3.11+ (backend), JavaScript/TypeScript (frontend with React.js)
**Primary Dependencies**: 
- Backend: FastAPI, LangChain, OpenAI API, APScheduler, SQLAlchemy, FAISS, boto3 (AWS S3)
- Frontend: React.js, TailwindCSS, Axios/Fetch API
- Database: PostgreSQL 15+
- Vector Store: FAISS (dual databases: VDB_Official, VDB_Social)
- Container: Docker, Docker Compose

**Storage**: 
- Structured Data: PostgreSQL (users, courses, forum posts, metadata)
- Vector Embeddings: FAISS (official content + user documents)
- File Storage: AWS S3 (uploaded PDFs, documents)

**Testing**: 
- Backend: pytest, pytest-asyncio, pytest-cov
- Frontend: Jest, React Testing Library
- Integration: pytest with TestClient (FastAPI), Playwright/Cypress for E2E
- Contract: OpenAPI schema validation

**Target Platform**: Linux server (Docker containers), web browsers (Chrome, Firefox, Safari, Edge)

**Project Type**: Web application (full-stack: backend API + frontend SPA)

**Performance Goals**: 
- API response time: <200ms p95 for non-AI queries, <5s for AI queries (clarified 2025-11-15)
- Concurrent users: 500+ during peak times
- PDF processing: <2 minutes for 10MB documents
- Vector search: <1s for similarity retrieval

**Constraints**: 
- Student data anonymization required before LLM processing (constitutional)
- No LLM prompt log persistence (constitutional)
- HTTPS mandatory, JWT token-based auth
- Turkish language support (UTF-8)
- Single university deployment (not multi-tenant for MVP)
- Malware scanning: ClamAV synchronous scanning during PDF upload (clarified 2025-11-15)
- Rate limiting: 100 req/min per user, 10 AI queries/min per user, 1000 req/min per IP (clarified 2025-11-15)

**Scale/Scope**: 
- Initial: 1,000-5,000 students per university
- Database: ~100,000 documents, ~1,000,000 vector embeddings (clarified 2025-11-15)
- Storage: ~50GB for PDFs, ~10GB for vectors
- API endpoints: ~30-40 REST endpoints
- Observability: Structured JSON logging with request ID tracking and sensitive data filtering (clarified 2025-11-15)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [Kampus Plus Constitution](../../.specify/memory/constitution.md):

- [x] **Test-First Development**: Test strategy defined (pytest + React Testing Library + Jest)
- [x] **Integration Testing**: API contracts, auth flows, AI service integration, DB migrations planned
- [x] **Security by Default**: HTTPS mandatory, JWT auth, input validation, encryption at rest, rate limiting
- [x] **AI Ethics & Privacy**: Student data anonymization before LLM, no prompt log persistence, consent required
- [x] **Branch Strategy**: Feature branch `001-ai-platform` follows naming convention
- [x] **Observability**: JSON structured logging, health endpoints, error tracking, performance metrics planned
- [x] **Technology Stack**: Python 3.11+/FastAPI, React.js/TailwindCSS, PostgreSQL, Docker Compose
- [x] **Code Review**: PR approval process from team leads, automated testing gates, 80%+ coverage target

**Constitution Compliance**: ✅ ALL GATES PASSED

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── openapi.yaml     # OpenAPI 3.0 spec for all REST endpoints
│   └── schemas/         # Request/response schemas
└── checklists/
    └── requirements.md  # Spec quality checklist (already created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── routes/           # API endpoint definitions
│   │   │   ├── auth.py       # Authentication endpoints (JWT)
│   │   │   ├── chat.py       # AI chatbot endpoints
│   │   │   ├── documents.py  # PDF upload/management
│   │   │   ├── forum.py      # Anonymous forum endpoints
│   │   │   └── admin.py       # Admin panel endpoints
│   │   ├── middleware.py     # Auth, CORS, logging middleware
│   │   └── dependencies.py   # Shared dependencies (DB, auth)
│   ├── models/
│   │   ├── user.py           # User, Student models
│   │   ├── course.py         # Course, Enrollment models
│   │   ├── document.py       # OfficialDocument, UserDocument
│   │   ├── conversation.py   # Chat session models
│   │   ├── forum.py          # ForumPost, AnonymousIdentity
│   │   └── sync.py           # SyncJob, SyncLog models
│   ├── services/
│   │   ├── auth_service.py   # JWT generation, password hashing
│   │   ├── ai_service.py     # LangChain RAG pipeline
│   │   ├── vector_service.py # FAISS operations (dual DBs)
│   │   ├── pdf_service.py    # PDF extraction, vectorization
│   │   ├── forum_service.py  # Anonymous identity management
│   │   └── s3_service.py     # AWS S3 upload/download
│   ├── core/
│   │   ├── config.py         # Settings, environment variables
│   │   ├── database.py       # PostgreSQL connection pool
│   │   ├── security.py       # Password hashing, token validation
│   │   └── logging.py        # Structured JSON logging
│   ├── schedulers/
│   tests/
│   ├── unit/                 # Unit tests (pytest)
│   │   ├── test_auth_service.py
│   │   ├── test_ai_service.py
│   │   ├── test_vector_service.py
│   │   └── test_pdf_service.py
│   ├── integration/          # Integration tests (pytest + TestClient)
│   │   ├── test_auth_flow.py
│   │   ├── test_chat_flow.py
│   │   ├── test_upload_flow.py
│   │   └── test_sync_flow.py
│   └── contract/             # API contract tests (OpenAPI validation)
│       └── test_forumapi_compliance.py
├── alembic/                  # Database migrations
│   └── versions/
├── requirements.txt          # Python dependencies
├── pyproject.toml            # Poetry/build configuration
└── Dockerfile                # Backend container image

frontend/
├── src/
│   ├── components/
│   │   ├── auth/             # Login, Register components
│   │   ├── chat/             # ChatInterface, MessageList
│   │   ├── documents/        # DocumentUpload, DocumentList
│   │   ├── forum/            # ForumThread, ForumPost
│   │   └── common/           # Shared components (Button, Input)
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── InstructorDashboard.jsx
│   │   ├── ForumPage.jsx
│   │   └── DocumentsPage.jsx
│   ├── services/
│   │   ├── api.js            # Axios instance with JWT interceptor
│   │   ├── authService.js    # Login, logout, token management
│   │   ├── chatService.js    # AI query API calls
│   │   └── documentService.js # Upload, list, delete documents
│   ├── hooks/
│   │   ├── useAuth.js        # Authentication hook
│   │   ├── useChat.js        # Chat state management
│   │   └── useDocuments.js   # Document management hook
│   ├── store/                # State management (Context API or Redux)
│   │   ├── AuthContext.jsx
│   │   └── ChatContext.jsx
│   ├── utils/
│   │   ├── constants.js      # API URLs, config
│   │   └── helpers.js        # Utility functions
│   ├── App.jsx               # Root component with routing
│   ├── index.jsx             # Entry point
│   └── index.css             # TailwindCSS imports
├── public/
│   └── index.html
├── tests/
│   ├── components/           # Component tests (React Testing Library)
│   │   ├── ChatInterface.test.jsx
│   │   └── DocumentUpload.test.jsx
│   └── integration/          # E2E tests (Playwright/Cypress)
│       └── auth.spec.js
├── package.json
├── tailwind.config.js
└── Dockerfile                # Frontend container image

docker-compose.yml            # Multi-container orchestration
.env.example                  # Environment variable template
.gitignore
README.md
```

**Structure Decision**: Web application architecture selected. Backend (FastAPI) and frontend (React) are separate services with dedicated directories. PostgreSQL, FAISS vector stores, and AWS S3 are external dependencies managed via Docker Compose. This structure supports independent development/testing of frontend and backend per constitutional requirements, enables clear separation of concerns, and facilitates the dual vector database architecture (VDB_Official + VDB_Social).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: ✅ No violations - all constitution checks passed

---

## Phase Completion Summary

### Phase 0: Research ✅ COMPLETE
- [x] Technical decisions documented in `research.md`
- [x] All NEEDS CLARIFICATION items resolved
- [x] Architecture patterns selected (dual FAISS, LangChain RAG, APScheduler)
- [x] Technology stack confirmed (FastAPI, React, PostgreSQL, FAISS, AWS S3, OpenAI)

### Phase 1: Design ✅ COMPLETE
- [x] Data model documented in `data-model.md` (13 entities with relationships)
- [x] API contracts defined in `contracts/openapi.yaml` (40+ endpoints)
- [x] Quickstart guide created in `quickstart.md`
- [x] Agent context updated (GitHub Copilot)
- [x] Constitution check re-verified - ALL GATES PASSED

### Phase 2: Task Breakdown ⏭️ NEXT
- [ ] Run `/speckit.tasks` to generate `tasks.md`
- [ ] Tasks will be organized by user story (6 stories, P1-P3)
- [ ] Test-first approach for each task per constitutional requirement

---

## Phase Completion Summary

### Phase 0: Research ✅ COMPLETE
- `research.md`: 15 technical decisions documented (~6500 words)
- Architecture choices finalized (dual FAISS, LangChain, APScheduler, AWS S3)
- Constitutional compliance verified

### Phase 1: Design ✅ COMPLETE  
- `data-model.md`: 13 entities with complete schema and validation rules
- `contracts/openapi.yaml`: 40+ REST endpoints with full OpenAPI 3.0 spec
- `quickstart.md`: Developer onboarding guide with setup, testing, workflows
- Agent context updated in `.github/copilot-instructions.md`

### Phase 2: Task Breakdown ✅ COMPLETE
- `tasks.md`: 217 tasks organized by user story with test-first approach
- 59 test tasks marked MANDATORY (constitution compliance)
- Task structure: Phase 1 Setup (20 tasks) → Phase 2 Foundational (14 tasks) → Phase 3-8 User Stories (US1-US6, 139 tasks) → Phase 9 Integration Testing (22 tasks) → Phase 10 Deployment (42 tasks)
- MVP recommendation: Phases 1-4 (US1 Auth + US2 AI Chat) = 60 tasks, 4-6 weeks
- Independent deployment strategy defined per user story

### ⏭️ NEXT: Begin Implementation
**Command**: Start with Phase 1 tasks (T001-T020) - Project Setup & Infrastructure
**Team Action**: Assign tasks to developers, begin parallel execution of [P] tasks
**Constitutional Reminder**: Write tests FIRST (Red), verify they fail, then implement (Green)
