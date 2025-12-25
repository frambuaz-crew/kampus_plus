# Tasks: Product Backlog Management (Feature 002)

**Branch**: 002-product-backlog  
**Spec**: specs/002-product-backlog/spec.md  
**Plan**: specs/002-product-backlog/plan.md  
**Context**: 14 user stories (P1→P2→P3), 21 FRs, 77 acceptance scenarios

---

## Phase 1 — Setup (Shared Infrastructure)
Team Assignments (5 engineers):
- Engineer A: T001, T004, T006, T007
- Engineer B: T002
- Engineer C: T003, T005
- Engineer D: T008, T009
- Engineer E: T010

- [ ] T001 Initialize backend env files (.env) with required keys in backend/.env
- [ ] T002 Configure Docker Compose services (postgres, redis, minio, mailhog) in docker-compose.yml
- [ ] T003 Create SendGrid/SMTP email service stub in backend/src/services/email_service.py
- [ ] T004 Configure structured JSON logging levels in backend/src/core/logging.py
- [ ] T005 [P] Add health/status endpoints in backend/src/api/routes/health.py
- [ ] T006 Configure CORS origins in backend/src/core/config.py
- [ ] T007 [P] Add JWT security helpers in backend/src/core/security.py
- [ ] T008 Create frontend .env.local with API base URL in frontend/.env.local
- [ ] T009 Set up Tailwind CSS and responsive config in frontend/tailwind.config.cjs
- [ ] T010 Add global API client wrapper in frontend/src/api/config.ts

## Phase 2 — Foundational (Blocking Prerequisites)
Team Assignments (5 engineers):
- Engineer A: T011, T016
- Engineer B: T012
- Engineer C: T013
- Engineer D: T014, T017
- Engineer E: T015, T018

- [ ] T011 Add Alembic migrations baseline in backend/alembic/versions/
- [ ] T012 Implement database connection pooling in backend/src/core/database.py
- [ ] T013 [P] Wire MinIO S3 client in backend/src/services/s3_service.py
- [ ] T014 [P] Wire FAISS vector service in backend/src/services/vector_service.py
- [ ] T015 [P] Wire anonymization pipeline in backend/src/services/anonymization_service.py
- [ ] T016 Add test fixtures (db, auth, clients) in backend/tests/conftest.py
- [ ] T017 Add frontend app layout shell in frontend/src/App.tsx
- [ ] T018 [P] Implement responsive Sidebar component in frontend/src/components/layout/Sidebar.tsx

---

## Phase 3 — User Story 1 (P1): Student Registration & Email Verification [US1]
Team Assignments (5 engineers):
- Engineer A: T019, T020, T023, T024, T025
- Engineer B: T021, T022
- Engineer C: T028
- Engineer D: T026, T027
- Engineer E: T029

Goal: Secure registration with 24-hour email verification; block login until verified

Independent Test Criteria: Registration → email sent → verify → login allowed; expired link → resend works

- [ ] T019 [US1] Create User model fields (is_verified, tokens) in backend/src/models/user.py
- [ ] T020 [US1] Add Alembic migration for user verification columns in backend/alembic/versions/*.py
- [ ] T021 [P] [US1] Implement AuthService.register() with validation in backend/src/services/auth_service.py
- [ ] T022 [P] [US1] Implement email token generation (24h, HMAC) in backend/src/services/auth_service.py
- [ ] T023 [US1] Add POST /auth/register in backend/src/api/routes/auth.py
- [ ] T024 [US1] Add POST /auth/verify-email in backend/src/api/routes/auth.py
- [ ] T025 [US1] Add POST /auth/resend-verification in backend/src/api/routes/auth.py
- [ ] T026 [US1] Build RegisterForm.tsx with validation in frontend/src/components/auth/RegisterForm.tsx
- [ ] T027 [US1] Build EmailVerification.tsx flow in frontend/src/components/auth/EmailVerification.tsx
- [ ] T028 [US1] Contract tests for auth endpoints in backend/tests/contract/test_auth_endpoints.py
- [ ] T029 [US1] Integration test: registration→email→verify→login in backend/tests/integration/test_auth_flow.py

---

## Phase 4 — User Story 2 (P1): Responsive Navigation Sidebar [US2]
Team Assignments (5 engineers):
- Engineer A: T030
- Engineer B: T031
- Engineer C: T032
- Engineer D: T033
- Engineer E: T034

Goal: Mobile/Tablet/Desktop adaptive navigation with active state and transitions

Independent Test Criteria: Correct rendering on <640px, 640–1024px, >1024px; open/close; route highlights

- [ ] T030 [US2] Build Sidebar.tsx with breakpoints in frontend/src/components/layout/Sidebar.tsx
- [ ] T031 [P] [US2] Add sidebar routes and active state in frontend/src/pages/*
- [ ] T032 [US2] Add hamburger menu toggles for mobile in frontend/src/components/layout/Sidebar.tsx
- [ ] T033 [US2] Accessibility: keyboard navigation/ARIA in frontend/src/components/layout/Sidebar.tsx
- [ ] T034 [US2] Component tests for sidebar viewports in frontend/src/__tests__/sidebar.test.tsx

---

## Phase 5 — User Story 3 (P1): Course Content Upload & Organization [US3]
Team Assignments (5 engineers):
- Engineer A: T035, T036
- Engineer B: T037
- Engineer C: T038, T039
- Engineer D: T040, T041
- Engineer E: T042, T043

Goal: Instructor uploads materials by category; students filter/sort

Independent Test Criteria: Upload → metadata set → filter "Lecture" → sort by date desc

- [ ] T035 [US3] Create Material model fields (category, file_key) in backend/src/models/material.py
- [ ] T036 [US3] Add migration for materials table in backend/alembic/versions/*.py
- [ ] T037 [P] [US3] Implement S3 upload flow in backend/src/services/s3_service.py
- [ ] T038 [P] [US3] Implement POST /courses/{id}/materials in backend/src/api/routes/courses.py
- [ ] T039 [US3] Implement GET list with filter/sort in backend/src/api/routes/courses.py
- [ ] T040 [US3] Build CourseUpload.tsx in frontend/src/components/courses/CourseUpload.tsx
- [ ] T041 [US3] Build CourseMaterialsList.tsx with filters in frontend/src/components/courses/CourseList.tsx
- [ ] T042 [US3] Contract tests for upload/list in backend/tests/contract/test_courses_endpoints.py
- [ ] T043 [US3] Integration test for upload→filter→sort in backend/tests/integration/test_upload_flow.py

---

## Phase 6 — User Story 8 (P1): Direct Messaging System [US8]
Team Assignments (5 engineers):
- Engineer A: T044, T045
- Engineer B: T046
- Engineer C: T047, T048, T049
- Engineer D: T050
- Engineer E: T051, T052

Goal: 1-on-1 messages with read receipts and notifications

Independent Test Criteria: New message → delivered <5s; read → receipt event; history persists

- [ ] T044 [US8] Create Message model (conversation_id, is_read) in backend/src/models/conversation.py
- [ ] T045 [US8] Migration for messages table in backend/alembic/versions/*.py
- [ ] T046 [P] [US8] Implement messaging service with Redis in backend/src/services/
- [ ] T047 [P] [US8] Add POST /messages in backend/src/api/routes/messages.py
- [ ] T048 [US8] Add GET /messages/conversations/{user_id} in backend/src/api/routes/messages.py
- [ ] T049 [US8] Add POST /messages/{id}/read in backend/src/api/routes/messages.py
- [ ] T050 [US8] Build DirectMessage.tsx UI in frontend/src/components/messages/DirectMessage.tsx
- [ ] T051 [US8] Contract tests for messaging endpoints in backend/tests/contract/test_chat_endpoints.py
- [ ] T052 [US8] Integration tests for send/read/history in backend/tests/integration/test_chat_flow.py

---

## Phase 7 — User Story 10 (P1): Knowledge Base & AI-Powered Q&A [US10]
Team Assignments (5 engineers):
- Engineer A: T053, T054
- Engineer B: T055
- Engineer C: T056
- Engineer D: T057
- Engineer E: T058, T059, T060

Goal: Semantic search answers with sources within 3 seconds

Independent Test Criteria: Query → FAISS search → answer + source URLs; timeout handled

- [ ] T053 [US10] Create KnowledgeItem model (embedding_id, source_url) in backend/src/models/document.py
- [ ] T054 [US10] Migration for knowledge_items table in backend/alembic/versions/*.py
- [ ] T055 [P] [US10] Implement vector_service search in backend/src/services/vector_service.py
- [ ] T056 [P] [US10] Implement GET /knowledge-base/search in backend/src/api/routes/knowledge_base.py
- [ ] T057 [US10] Implement nightly indexing script in backend/scripts/populate_vectors.py
- [ ] T058 [US10] Build KnowledgeBase.tsx UI in frontend/src/components/knowledge-base/KnowledgeBase.tsx
- [ ] T059 [US10] Contract tests for KB endpoints in backend/tests/contract/test_chat_endpoints.py
- [ ] T060 [US10] Integration tests for query→sources in backend/tests/integration/test_core_services.py

---

## Phase 8 — User Story 4 (P2): AI-Powered Study Assistant [US4]
Team Assignments (5 engineers):
- Engineer A: T061
- Engineer B: T062
- Engineer C: T063
- Engineer D: T064
- Engineer E: T065, T066

Goal: Course-aware AI explanations within 5 seconds, anonymized

Independent Test Criteria: Ask course question → AI answers <5s; no PII logged

- [ ] T061 [US4] Implement AIService with Gemini in backend/src/services/ai_service.py
- [ ] T062 [P] [US4] Add POST /courses/{id}/chat in backend/src/api/routes/chat.py
- [ ] T063 [US4] Wire anonymization in backend/src/services/anonymization_service.py
- [ ] T064 [US4] Build AIAssistant.tsx in frontend/src/components/chat/AIAssistant.tsx
- [ ] T065 [US4] Contract tests for chat in backend/tests/contract/test_chat_endpoints.py
- [ ] T066 [US4] Integration tests for chat flow in backend/tests/integration/test_chat_flow.py

---

## Phase 9 — User Story 5 (P2): Forum Moderation [US5]
Team Assignments (5 engineers):
- Engineer A: T067, T068
- Engineer B: T069, T070
- Engineer C: T071
- Engineer D: T072
- Engineer E: T073, T074

Goal: Flagged posts moderation (remove/suspend)

Independent Test Criteria: Flag → queue → remove → hidden; 3+ violations → suspend

- [ ] T067 [US5] Add moderation fields to ForumPost in backend/src/models/forum.py
- [ ] T068 [US5] Migration for forum_posts moderation columns in backend/alembic/versions/*.py
- [ ] T069 [P] [US5] Add POST /forum-posts/{id}/flag in backend/src/api/routes/forum.py
- [ ] T070 [P] [US5] Add GET /admin/moderation-queue in backend/src/api/routes/forum.py
- [ ] T071 [US5] Add POST /admin/forum-posts/{id}/remove in backend/src/api/routes/forum.py
- [ ] T072 [US5] Build ForumThread.tsx moderation UI in frontend/src/components/forum/ForumThread.tsx
- [ ] T073 [US5] Contract tests for moderation in backend/tests/contract/test_chat_endpoints.py
- [ ] T074 [US5] Integration tests for moderation flow in backend/tests/integration/test_core_services.py

---

## Phase 10 — User Story 6 (P2): Course Discovery & Enrollment [US6]
Team Assignments (5 engineers):
- Engineer A: T075
- Engineer B: T076
- Engineer C: T077
- Engineer D: T078
- Engineer E: T079, T080

Goal: Course cards with ratings, enrollment actions

Independent Test Criteria: Cards render → filter by rating → enroll action toggles state

- [ ] T075 [US6] Add fields (rating, enrollment_count) in backend/src/models/course.py
- [ ] T076 [US6] Add GET /courses with filters in backend/src/api/routes/courses.py
- [ ] T077 [US6] Add POST /courses/{id}/enroll in backend/src/api/routes/courses.py
- [ ] T078 [US6] Build CourseCards.tsx in frontend/src/components/courses/CourseCards.tsx
- [ ] T079 [US6] Contract tests for list/enroll in backend/tests/contract/test_courses_endpoints.py
- [ ] T080 [US6] Integration test for discovery→enroll in backend/tests/integration/test_core_services.py

---

## Phase 11 — User Story 9 (P2): Anonymous Forum Discussion [US9]
Team Assignments (5 engineers):
- Engineer A: T081
- Engineer B: T082
- Engineer C: T083
- Engineer D: T084
- Engineer E: T085, T086, T087

Goal: Anonymous posting with consistent ID per user per course

Independent Test Criteria: Anonymous post → consistent ID across replies; admin reveal

- [ ] T081 [US9] Add anonymity fields to ForumPost in backend/src/models/forum.py
- [ ] T082 [US9] Implement anonymous ID hash in backend/src/services/anonymization_service.py
- [ ] T083 [P] [US9] Add POST /courses/{id}/forum create in backend/src/api/routes/forum.py
- [ ] T084 [US9] Add admin reveal endpoint in backend/src/api/routes/forum.py
- [ ] T085 [US9] Build ForumThread.tsx anonymous UI in frontend/src/components/forum/ForumThread.tsx
- [ ] T086 [US9] Contract tests for forum create/reveal in backend/tests/contract/test_chat_endpoints.py
- [ ] T087 [US9] Integration tests for anonymous consistency in backend/tests/integration/test_core_services.py

---

## Phase 12 — User Story 13 (P2): Dashboard Widgets [US13]
Team Assignments (5 engineers):
- Engineer A: T088
- Engineer B: T089
- Engineer C: T090
- Engineer D: T091
- Engineer E: T092

Goal: Customizable dashboard with widgets and drag-and-drop

Independent Test Criteria: Default widgets render → drag reorder saves → toggle visibility persists

- [ ] T088 [US13] Add widget_preferences to User in backend/src/models/user.py
- [ ] T089 [US13] Add GET /dashboard in backend/src/api/routes/dashboard.py
- [ ] T090 [US13] Add PUT /dashboard/widgets in backend/src/api/routes/dashboard.py
- [ ] T091 [US13] Build Dashboard.tsx + Widgets.tsx in frontend/src/components/dashboard/Dashboard.tsx
- [ ] T092 [US13] Component tests for reorder/toggle in frontend/src/__tests__/dashboard.test.tsx

---

## Phase 13 — User Story 7 (P3): Career Resources [US7]
Team Assignments (5 engineers):
- Engineer A: T093
- Engineer B: T094
- Engineer C: T095
- Engineer D: T096
- Engineer E: Code review & support

Goal: Browse referrals, filter by role/company, salary ranges

Independent Test Criteria: List referrals → filter works → expand card details

- [ ] T093 [US7] Create Referral model in backend/src/models/referal.py
- [ ] T094 [US7] Add GET /career/referrals in backend/src/api/routes/referal.py
- [ ] T095 [US7] Build CareerReferrals.tsx in frontend/src/components/career/CareerReferrals.tsx
- [ ] T096 [US7] Contract tests for referrals list in backend/tests/contract/test_core_endpoints.py

---

## Phase 14 — User Story 11 (P3): Image OCR Processing [US11]
Team Assignments (5 engineers):
- Engineer A: T097
- Engineer B: T098
- Engineer C: T099
- Engineer D: T100
- Engineer E: Code review & support

Goal: OCR extract text for photos, searchability

Independent Test Criteria: Upload image → OCR text extracted (>90% confidence) → searchable

- [ ] T097 [US11] OCR fields in Material (ocr_text, ocr_confidence) in backend/src/models/material.py
- [ ] T098 [US11] Wire Google Vision API in backend/src/services/pdf_service.py
- [ ] T099 [US11] Build OCR indexing hook in backend/src/services/pdf_service.py
- [ ] T100 [US11] Contract tests for OCR endpoints in backend/tests/contract/test_pdf_service.py

---

## Phase 15 — User Story 12 (P3): Mentor Matching [US12]
Team Assignments (5 engineers):
- Engineer A: T101
- Engineer B: T102
- Engineer C: T103
- Engineer D: T104
- Engineer E: T105

Goal: Request mentor, approve, open messaging channel

Independent Test Criteria: Request → accept → messaging opens → inactivity reminder

- [ ] T101 [US12] Create Mentorship model in backend/src/models/sync.py
- [ ] T102 [US12] Add POST /mentors/{id}/request in backend/src/api/routes/mentors.py
- [ ] T103 [US12] Add POST /mentorships/{id}/accept in backend/src/api/routes/mentors.py
- [ ] T104 [US12] Build MentorNetwork.tsx in frontend/src/components/mentors/MentorNetwork.tsx
- [ ] T105 [US12] Contract tests for mentorship endpoints in backend/tests/contract/test_core_endpoints.py

---

## Phase 16 — User Story 14 (P3): AI Recommendations [US14]
Team Assignments (5 engineers):
- Engineer A: T106
- Engineer B: T107
- Engineer C: T108
- Engineer D: T109
- Engineer E: T110

Goal: Personalized course recommendations with reasoning labels

Independent Test Criteria: 3–5 courses shown → daily updates → reasoning displayed

- [ ] T106 [US14] Recommendation model fields in backend/src/models/recommendation.py
- [ ] T107 [US14] Add GET /recommendations in backend/src/api/routes/recommendations.py
- [ ] T108 [US14] Nightly batch job (ML) in backend/scripts/sync.py
- [ ] T109 [US14] Build Recommendations widget UI in frontend/src/components/dashboard/Widgets.tsx
- [ ] T110 [US14] Contract tests for recommendations in backend/tests/contract/test_core_endpoints.py

---

## Final Phase — Polish & Cross-Cutting
Team Assignments (5 engineers):
- Engineer A: T111
- Engineer B: T112
- Engineer C: T113
- Engineer D: T114
- Engineer E: T115

- [ ] T111 Add rate limiting middleware for AI endpoints in backend/src/core/security.py
- [ ] T112 Add request tracing (request_id) in backend/src/core/logging.py
- [ ] T113 Performance monitoring dashboards (P95 metrics) in docs/API_DOCUMENTATION.md
- [ ] T114 Security review: no PII in logs in backend/src/services/
- [ ] T115 E2E tests: 5 core flows in backend/tests/e2e/

---

## Dependencies & Execution Order

- US1 → US2 (optional), US3, US8, US10 (Auth prerequisite)
- US3 → US4 (AI Assistant needs course context)
- US10 independent after foundational vector setup
- US8 independent after Redis/WebSocket setup
- US5, US9 depend on forum model
- US13 depends on user preferences data
- US14 depends on courses + enrollments

---

## Parallel Execution Examples (5 Engineers)

- Engineer A: US1 backend (auth service, endpoints) — T019–T025
- Engineer B: US1 frontend (RegisterForm, EmailVerification) — T026–T027
- Engineer C: US3 backend (upload/list + S3) — T035–T039
- Engineer D: US2 frontend (Sidebar + routes) — T030–T034
- Engineer E: US8 backend/frontend (messaging) — T044–T052

Next sprint:
- A: US10 KB search (backend) — T053–T057
- B: US10 frontend — T058–T060
- C: US4 AI Assistant — T061–T066
- D: US5 Moderation — T067–T074
- E: US6 Course discovery — T075–T080

---

## MVP Scope Recommendation

- MVP: P1 stories only → US1 (Auth), US2 (Sidebar), US3 (Upload), US8 (Messaging), US10 (Knowledge Base)
- Each delivers independently testable value; together form a usable platform baseline

---

## Format Validation

- All tasks follow format: `- [ ] T### [P?] [US?] Description with file path`
- Story phases include [USn] labels
- Parallelizable tasks marked [P]
- All tasks reference concrete file paths
- Tasks are immediately executable without extra context
