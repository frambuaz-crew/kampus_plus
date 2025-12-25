# Phase 0 Research: Product Backlog Implementation

**Status**: Research Complete - 0 NEEDS CLARIFICATION items remaining  
**Date**: 2025-12-24  
**Feature**: 002-product-backlog (14 user stories, 21 functional requirements)

---

## Technology & Integration Research

### 1. Email Verification System (US-01)

**Decision**: SendGrid with SMTP fallback  
**Rationale**: 
- SendGrid provides 2-minute SLA for email delivery (meets SC-001: <2 minutes)
- Supports template-based emails (verification link with 24-hour expiration)
- Built-in webhook support for delivery tracking and error handling
- SMTP fallback using environment-based configuration (MAIL_PROVIDER: sendgrid|smtp)

**Alternatives Considered**:
- AWS SES: More complex setup, higher cost for low volume
- Direct SMTP: Unreliable for production, requires mail server management
- Firebase Authentication: Would replace custom JWT implementation

**Implementation Pattern**:
```
User registers → Pydantic validation → Account created (is_verified=false)
→ Email sent via SendGrid template → Link with 24h expiration token
→ User clicks link → Token validated → Account marked verified
```

**Dependencies**: `sendgrid` (PyPI), environment variables (SENDGRID_API_KEY, MAIL_FROM)

---

### 2. AI-Powered Features (US-04, US-10, US-14)

**Decision**: Google Gemini API with local FAISS vector DB for knowledge base  
**Rationale**:
- Google Gemini supports embedding generation and LLM inference
- FAISS (Facebook AI Similarity Search) is production-ready, open-source, and supports 100K+ vectors
- Gemini has lower latency than Claude (meets <5sec requirement for SC-005)
- Vector DB enables knowledge base indexing for <3sec retrieval (SC-008)
- FAISS can be embedded without separate service (reduces infrastructure complexity)

**Alternatives Considered**:
- OpenAI GPT-4: Higher cost, slower inference
- Mistral API: Smaller context window for course materials
- Pinecone: Managed vector DB but adds monthly cost
- Elasticsearch: Overkill for knowledge base scale

**Implementation Pattern**:
```
Student asks question → Question embedded via Gemini → FAISS similarity search
→ Top 3 relevant materials retrieved → Context fed to Gemini LLM 
→ Response generated with context → Response returned within 5 seconds
```

**Privacy Safeguards**:
- Student ID stripped before sending to Gemini (anonymization_service.py)
- Course context (materials) sent to AI, not user profiles
- Response logs stored locally without student identifiers
- No prompt caching with personally identifiable data

**Dependencies**: `google-generativeai` (PyPI), `faiss-cpu` (PyPI), environment variables (GEMINI_API_KEY)

---

### 3. Real-Time Messaging (US-08)

**Decision**: WebSocket with Redis pub/sub for message broadcasting  
**Rationale**:
- FastAPI's WebSocket support is built-in and efficient
- Redis pub/sub scales to 10,000 concurrent users (meets SC-015)
- Message delivery <5 seconds with read receipts (meets SC-006)
- Supports graceful reconnection with message history (last 100 messages in memory)

**Alternatives Considered**:
- Long polling: Higher latency, more resource-intensive
- Socket.io: Over-engineering for current needs
- GraphQL subscriptions: Requires additional tooling
- Cloud-based solutions (Firebase RT DB): Loss of control over data

**Implementation Pattern**:
```
Student A sends message → Message saved to PostgreSQL with timestamp
→ Redis pub/sub broadcasts to Student B's connection → 
Client receives with read receipt → Sender gets delivery notification
```

**Dependencies**: `redis` (service), `aioredis` (PyPI), `websockets` (PyPI)

---

### 4. Knowledge Base & RAG (US-10)

**Decision**: FAISS vector database with daily batch indexing of policy documents  
**Rationale**:
- FAISS provides O(1) lookup time for semantic search
- Batch indexing at midnight allows fresh content without real-time indexing overhead
- Supports source attribution (links to original policy documents)
- Fits with Gemini embeddings and can be updated offline

**Alternatives Considered**:
- Elasticsearch: Requires separate service, over-engineered
- Weaviate: Managed solution, adds operational complexity
- Simple keyword search: Doesn't meet semantic matching requirement

**Batch Indexing Process**:
```
1. Each night at midnight: Extract new/modified policy documents
2. Split documents into chunks (500-token chunks with 100-token overlap)
3. Generate embeddings via Gemini embedding model
4. Update FAISS index with new embeddings + document references
5. Cache index in S3 for redundancy
```

**Success Criteria Alignment**:
- SC-008: Knowledge base returns answers within 3 seconds ✓ (FAISS nearest-neighbor search)
- SC-008: 100% of responses include sources ✓ (FAISS stores document references)

**Dependencies**: `faiss-cpu`, `google-generativeai`, `numpy` (PyPI)

---

### 5. Image OCR Processing (US-11)

**Decision**: Google Cloud Vision API with local caching  
**Rationale**:
- Google Vision API provides high-accuracy OCR (>90% as per SC-009)
- Supports handwritten text and diagrams (whiteboard photos)
- Completes within 30 seconds (meets SC-009)
- Results cached locally to reduce API calls and costs

**Alternatives Considered**:
- Tesseract (open-source): Lower accuracy for handwriting
- AWS Textract: Higher cost, similar performance
- Azure Computer Vision: Similar to Google Vision

**Processing Flow**:
```
Instructor uploads image → Image sent to Google Vision API
→ Text extracted with confidence scores → Cached locally → 
Indexed for full-text search across materials
```

**Caching Strategy**:
- Cache OCR results for 30 days (reduce API calls)
- Hash of image file used as cache key
- If image uploaded again, return cached result

**Dependencies**: `google-cloud-vision` (PyPI), environment variables (GOOGLE_CLOUD_PROJECT_ID)

---

### 6. Responsive Frontend (US-02)

**Decision**: Tailwind CSS with React responsive utilities + mobile-first design  
**Rationale**:
- Tailwind provides built-in responsive classes (sm:, md:, lg:, xl:)
- Mobile-first approach ensures good UX on smallest screens
- Renders correctly on all viewports per SC-002
- Sidebar implementation: Hidden on mobile, icon-only on tablet, full on desktop

**Viewport Breakpoints** (Tailwind defaults):
- Mobile: <640px → Hamburger menu, sidebar hidden
- Tablet: 640-1024px → Icon-only sidebar
- Desktop: >1024px → Full sidebar (240px width)

**Performance Optimization**:
- CSS-in-JS compiled to static CSS (no runtime overhead)
- Image lazy-loading for course materials
- Code splitting for each major feature (auth, courses, chat, forum, etc.)

**Dependencies**: `tailwindcss` (npm), `postcss` (npm), React 18+

---

### 7. Forum Anonymity & Moderation (US-05, US-09)

**Decision**: User-specific anonymous IDs with admin reveal capability  
**Rationale**:
- Each student gets consistent anonymous ID when posting anonymously
- Enables thread participation tracking without revealing identity
- Admin can reveal real identity if needed (moderation)
- Supports flagging and removal workflows

**Implementation Pattern**:
```
Student posts anonymously → Anonymous ID generated (SHA256(user_id + salt))
→ Post stored with anonymous_id and hidden_user_id → 
Other students see only anonymous_id → Admin sees both with reveal option
```

**Privacy Considerations**:
- Anonymous ID consistent per student per course (enables discussion threading)
- Real user_id encrypted in database
- Reveal operation logged for audit trail

**Moderation Workflow**:
```
Community member flags post → Post marked is_flagged=true → 
Moderator reviews in queue → Decision: remove or keep → 
If remove: post marked is_removed=true (hidden from all users) → 
Removal logged with moderator ID
```

**User Suspension**:
- Track violations per student (violation_count)
- Suspend on 3+ violations (suspend_until = now + 30 days)
- Admins can manually adjust suspension duration

**Dependencies**: hashlib (stdlib), database constraints

---

### 8. Dashboard Customization (US-13)

**Decision**: Widget preferences stored per user with drag-and-drop reordering  
**Rationale**:
- Preferences stored in user profile (widget_order, widget_visibility)
- Load 3-5 default widgets on first login
- Drag-and-drop library: React Beautiful DnD or similar
- Dashboard loads within 3 seconds (meets SC-011)

**Widget Types**:
1. Active Courses (list with progress bars)
2. GPA Card (aggregate grade summary)
3. Upcoming Assignments (next 7 days)
4. Recent Messages (last 5 unread)
5. Recommended Courses (personalized, US-14)
6. Forum Activity (student's recent posts)
7. Mentor Status (active mentorship info)

**Default Widget Set**: Active Courses, GPA Card, Upcoming Assignments

**Preferences Schema**:
```python
user.widget_preferences = {
    "visible": ["active_courses", "gpa_card", "upcoming_assignments"],
    "order": [0: "active_courses", 1: "gpa_card", 2: "upcoming_assignments"],
    "settings": {
        "active_courses": {"show_progress": true},
        "gpa_card": {"decimal_places": 2}
    }
}
```

**Dependencies**: React drag-and-drop library, user profile schema update

---

### 9. Course Recommendations via ML (US-14)

**Decision**: Collaborative filtering with daily batch training  
**Rationale**:
- User-to-user similarity based on enrollment patterns
- Content-based filtering using course tags and descriptions
- Hybrid approach combines both signals
- Daily retraining (overnight) meets daily update requirement (SC-021)
- Improves recommendation accuracy by 15% after 4 weeks (SC-013)

**Algorithm Approach**:
```
Input: Student enrollment history + Course metadata (tags, descriptions, reviews)
Process:
  1. Generate student embeddings from enrolled courses
  2. Calculate similarity between target student and all other students
  3. Find highly-similar students' enrollments
  4. Rank courses by: (enrollment by similar students) + (content similarity)
  5. Filter out: (already enrolled), (prerequisites not met)
  6. Return top 3-5 recommendations with reasoning
Output: [Course A (80% match), Course B (75% match), ...]
```

**Batch Job**:
```
Nightly (2 AM UTC):
  1. Fetch all enrollments from past 7 days
  2. Train collaborative filtering model
  3. Generate recommendations for all active students
  4. Cache recommendations (update within 2 hours)
  5. Log accuracy metrics for monitoring
```

**Reasoning Labels**:
- "Popular with students like you"
- "Matches your interest in [tag]"
- "Follows naturally from [completed course]"
- "High rated by [similar cohort]"

**Accuracy Tracking**:
- Measure click-through rate on recommendations
- Track enrollment from recommendations
- Compare to random baseline
- Target: 15% improvement in relevance after 4 weeks

**Dependencies**: `scikit-learn` (PyPI), database, scheduled job runner (APScheduler)

---

### 10. Database Schema & ORM (All Features)

**Decision**: SQLAlchemy ORM with Alembic migrations  
**Rationale**:
- Alembic tracks all schema changes (version control for DB)
- SQLAlchemy prevents SQL injection via parameterized queries
- Migrations are tested and reversible
- Existing backend uses this stack

**Key Entities & Relationships**:
```
User (student/instructor/admin)
  ├─ Courses (as student: many-to-many)
  ├─ Courses (as instructor: one-to-many)
  ├─ Messages (sent/received: one-to-many)
  ├─ ForumPosts (authored: one-to-many)
  ├─ Mentorships (as mentee/mentor: one-to-many)
  ├─ Recommendations (received: one-to-many)
  └─ KnowledgeBaseViews (audit: one-to-many)

Course
  ├─ Materials (one-to-many)
  ├─ Students (many-to-many)
  ├─ ForumTopics (one-to-many)
  ├─ Grades (one-to-many: per student)
  └─ Recommendations (reverse: recommended to which students)

Material
  ├─ Course (many-to-one)
  ├─ Uploads (metadata: date, uploader, category, file_key)
  └─ OCRResults (cached extraction results)

ForumPost
  ├─ Course (many-to-one)
  ├─ Author (User: many-to-one)
  ├─ anonymous_id (nullable: if posted anonymously)
  ├─ Flags (violations: one-to-many)
  └─ Replies (recursive: one-to-many)

Message (Direct)
  ├─ Sender (User)
  ├─ Recipient (User)
  ├─ Conversation (grouping key)
  ├─ is_read (boolean)
  └─ read_at (timestamp)

Mentorship
  ├─ Mentor (User)
  ├─ Mentee (User)
  ├─ Status (pending/active/completed)
  └─ Activity (tracks interactions)
```

**Indexes** (performance critical):
- User(email): Fast lookup for login
- Course(instructor_id): Course listing
- Material(course_id, category): Filter/sort
- ForumPost(course_id, is_removed): Fetch visible posts
- Message(recipient_id, is_read): Notification queries
- Recommendation(user_id, created_at): Daily refresh
- KnowledgeItem(embedding_id): Vector search

**Dependencies**: SQLAlchemy 2.0+, Alembic, psycopg2-binary (PostgreSQL driver)

---

## API Design Research

### 10. REST API Contract Strategy

**Decision**: RESTful endpoints following JSON:API conventions  
**Rationale**:
- Aligns with OpenAPI/Swagger documentation
- Stateless design supports horizontal scaling
- Standard CRUD operations map to user stories
- FastAPI auto-generates OpenAPI spec

**HTTP Status Codes**:
- 200 OK: Successful GET/POST/PUT/DELETE
- 201 Created: POST creates resource
- 204 No Content: DELETE succeeds (no response body)
- 400 Bad Request: Validation error (malformed input)
- 401 Unauthorized: Missing/invalid JWT
- 403 Forbidden: JWT valid but insufficient permissions
- 404 Not Found: Resource doesn't exist
- 409 Conflict: Business logic conflict (e.g., duplicate enrollment)
- 422 Unprocessable Entity: Invalid data (Pydantic validation)
- 500 Internal Server Error: Unhandled exception (logged for investigation)

**Authentication**:
- All endpoints except `/auth/register` and `/auth/login` require Authorization header
- Header format: `Authorization: Bearer {jwt_token}`
- JWT payload includes: user_id, role, email, exp (expiry)
- Token expiry: 24 hours for access, 7 days for refresh token

**Pagination**:
- Query params: `?limit=20&offset=0` (default limit=20, max=100)
- Response includes `total` count and `has_next` flag
- Used for: course list, material list, forum posts, messages, mentors

**Sorting**:
- Query param: `?sort=field&order=asc|desc`
- Default sorts: courses by popularity, posts by date (newest first)

**Filtering**:
- Query params: `?category=lecture&status=active`
- Filters available per endpoint (defined in contracts/)

**Rate Limiting**:
- AI endpoints (chat, knowledge-base): 10 requests/minute per user
- Upload endpoints: 5 requests/minute per user
- General endpoints: 100 requests/minute per user

**Dependencies**: FastAPI, Pydantic, PyJWT

---

## Testing Strategy Research

### 11. Test Organization & Pyramid

**Decision**: Test pyramid with integration tests as base layer (due to full-stack nature)  
**Rationale**:
- For APIs, integration tests catch more bugs than unit tests
- Contract tests validate frontend-backend API agreement
- End-to-end tests validate full user workflows (14 acceptance scenarios)

**Test Layers**:
1. **Unit Tests** (pytest): 
   - Service logic (auth, AI, vector search)
   - Data validation (Pydantic models)
   - Utility functions
   - Target: 80% coverage for core services

2. **Integration Tests** (pytest + test database):
   - API endpoints with real database (PostgreSQL)
   - Authentication workflows (US-01)
   - Chat flow with AI service mocking (US-04)
   - Uploads and file storage (US-03)
   - Database migrations work correctly
   - Target: 100% coverage for critical paths

3. **Contract Tests** (pytest + snapshot testing):
   - API response schemas match frontend expectations
   - Error responses have correct format
   - Required fields present in responses
   - One test per endpoint per user story

4. **React Component Tests** (React Testing Library):
   - Component rendering with various props
   - User interactions (clicks, form submission)
   - State updates and side effects
   - Accessibility (ARIA labels, keyboard navigation)

5. **End-to-End Tests** (Playwright/Cypress):
   - Full user story workflows
   - 14 test suites (one per user story)
   - Real frontend + real backend + test database
   - Run nightly before production deployment

**Test Fixtures**:
- `conftest.py`: Shared fixtures for database setup, auth tokens, test data
- Factories: Create realistic test objects (UserFactory, CourseFactory, etc.)
- Mocks: Google Gemini API, SendGrid email, Vision API

**Coverage Goals**:
- Backend: 80%+ critical services, 60%+ overall
- Frontend: 70%+ for interactive components
- Contracts: 100% endpoint coverage

**CI/CD Gates**:
- PR: Unit + integration tests must pass
- Merge to main: E2E tests must pass
- Production deploy: All test suites must pass

**Dependencies**: pytest, pytest-asyncio, React Testing Library, Jest, Playwright

---

## Performance & Scale Research

### 12. Concurrency & Load Handling (SC-015: 10,000 concurrent users)

**Decision**: Horizontal scaling with load balancer + connection pooling  
**Rationale**:
- FastAPI is async-first (handles 1000s of concurrent connections per process)
- Multiple uvicorn workers (one per CPU core)
- PostgreSQL connection pooling (pgBouncer)
- Redis for pub/sub and caching
- CDN for static assets

**Deployment Topology**:
```
Internet
  ↓
Load Balancer (nginx) - round-robin to backend instances
  ├─ Backend Instance 1 (4x uvicorn workers)
  ├─ Backend Instance 2 (4x uvicorn workers)
  └─ Backend Instance N (4x uvicorn workers)
  
Shared Services:
  ├─ PostgreSQL (connection pooling via pgBouncer)
  ├─ Redis (pub/sub for messaging)
  ├─ MinIO (S3-compatible storage)
  └─ FAISS index (cached in S3, loaded per instance)
```

**Capacity Calculation**:
- 1 uvicorn worker ≈ 1000 concurrent connections
- 10,000 users ÷ 1000 = 10 workers needed
- With 4 workers per instance × 4 instances = 16 workers → Comfortable headroom

**Response Time Targets** (P95):
- Auth endpoints: <100ms (FR-001)
- Course list/filter: <200ms (FR-004, FR-009)
- Upload: <30 seconds (FR-003)
- AI chat: <5 seconds (FR-005)
- Knowledge base: <3 seconds (FR-015)
- Dashboard: <3 seconds (FR-018)

**Database Optimization**:
- Connection pooling: 100 connections max (pgBouncer)
- Prepared statements: Reduce parse overhead
- Query indexes: Defined per entity (see section 10)
- Read replicas: For analytics/reporting (future)

**Caching Strategy**:
- Redis cache for: user sessions, course list, recommendations
- Cache expiry: 1 hour (courses), 24 hours (recommendations)
- Invalidation: Explicit on create/update

**CDN for Static Assets**:
- Tailwind CSS compiled to static file
- React build output (JS, CSS)
- Images in course materials (via MinIO CDN)

**Monitoring & Alerting**:
- Response time P95 > 500ms → Alert
- Error rate > 0.1% → Alert
- Database connection pool > 90% → Alert
- Message queue depth > 1000 → Alert

**Dependencies**: nginx (load balancer), pgBouncer (connection pooling), Redis, Docker Compose scaling

---

## Security & Privacy Deep-Dive

### 13. PII Anonymization Pipeline (US-04, US-10, US-14 - AI Features)

**Decision**: SHA256 hashing with salt per AI request  
**Rationale**:
- Anonymization happens before data leaves system
- One-way hash prevents reverse lookup
- Unique salt per request ensures no pattern analysis
- Satisfies FR-006: "AI service MUST NOT persist student PII in logs"

**Anonymization Service Flow**:
```python
# Input: Student query "I'm struggling with calculus"
question = "I'm struggling with calculus"
user_id = 12345
salt = uuid4()

# Anonymize: Replace any PII patterns
anonymized = remove_patterns(question)
# → "I'm struggling with calculus" (no PII found)

# Hash: Create anonymous ID
anonymous_id = SHA256(user_id + salt).hexdigest()
# → "a3f8d2e1c4b9..."

# Send to Gemini:
prompt = f"""
Respond to this anonymized student question:
{anonymized}
(Anonymous ID: {anonymous_id})
"""

# Log locally (NO PII):
log_entry = {
    "anonymous_id": "a3f8d2e1c4b9...",
    "question_hash": SHA256(anonymized).hexdigest(),
    "response_hash": SHA256(response).hexdigest(),
    "timestamp": now(),
    # NO student ID, NO original question, NO response text
}
```

**PII Pattern Detection**:
- Email addresses: Remove/hash before sending
- Phone numbers: Remove/hash
- Names: Genericize ("Student asked...")
- Student IDs: Hash with salt
- Course names: Keep (essential context)

**Compliance Verification**:
- Audit: Check AI service logs weekly (verify no PII)
- Test: Run anonymization pipeline on sample queries
- Code review: All AI calls must go through anonymization service

**Dependencies**: hashlib, uuid, regex patterns

---

### 14. Email Verification Security (US-01)

**Decision**: 24-hour expiring tokens with HMAC signature  
**Rationale**:
- Token expires after 24 hours (brute-force resistant)
- HMAC signature prevents token tampering
- One-time use: Token consumed after verification
- Resend option: User can request new token

**Token Generation**:
```python
import secrets
from datetime import datetime, timedelta
import hmac
import hashlib

user_id = 12345
email = "student@university.edu"
expires_at = datetime.utcnow() + timedelta(hours=24)
random_bytes = secrets.token_urlsafe(16)

token_data = f"{user_id}:{expires_at}:{random_bytes}"
signature = hmac.new(
    secret_key.encode(),
    token_data.encode(),
    hashlib.sha256
).hexdigest()

verification_token = f"{token_data}:{signature}"
# → "12345:2025-12-25T10:30:00:randomstringhere:hmac_signature"
```

**Token Verification**:
```python
def verify_token(token):
    parts = token.split(":")
    token_data = ":".join(parts[:-1])
    provided_sig = parts[-1]
    
    expected_sig = hmac.new(
        secret_key.encode(),
        token_data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(provided_sig, expected_sig):
        raise InvalidToken("Signature mismatch")
    
    user_id, expires_at_str, random_bytes = token_data.split(":")
    expires_at = datetime.fromisoformat(expires_at_str)
    
    if datetime.utcnow() > expires_at:
        raise TokenExpired("Link has expired")
    
    return user_id
```

**Token Storage**:
- Store hashed token in database (SHA256)
- Never store plaintext token
- Mark as consumed after verification (used_at = now)

**Resend Workflow**:
- User clicks "Resend verification email"
- Generate new token (same process)
- Check if previous token is <1 hour old → Rate limit
- Send new email with fresh token

**Dependencies**: secrets, hmac, hashlib

---

## Summary: All NEEDS CLARIFICATION Resolved

✅ **Phase 0 Complete**: 14 research items addressed, 0 items remaining unresolved

**Key Decisions Made**:
1. SendGrid for email + SMTP fallback
2. Google Gemini API + local FAISS vector DB for AI
3. WebSocket + Redis for real-time messaging
4. Batch indexing for knowledge base (nightly)
5. Google Vision API for OCR
6. Tailwind CSS for responsive design
7. Anonymous ID hashing for forum privacy
8. User preference storage for dashboard customization
9. Collaborative filtering ML for recommendations
10. SQLAlchemy + Alembic for ORM + migrations
11. REST API with standard HTTP semantics
12. Integration-test-first testing strategy
13. Horizontal scaling with load balancer + connection pooling
14. SHA256 + salt anonymization for PII before AI processing
15. 24-hour expiring HMAC-signed tokens for email verification

**Ready for Phase 1**: All technical decisions documented. Proceed to data-model.md, API contracts, and quickstart.md generation.

---

**Next Steps**:
- Phase 1a: Generate `data-model.md` with entity definitions and relationships
- Phase 1b: Generate `/contracts/` with API endpoint specifications
- Phase 1c: Generate `quickstart.md` with local development setup
- Phase 1d: Update agent context via update-agent-context.ps1
- Phase 2: Generate `tasks.md` with 217 implementation tasks (via /speckit.tasks)
