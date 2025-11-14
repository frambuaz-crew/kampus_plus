# Research & Technical Decisions: KAMPÜS+ AI Platform

**Feature**: KAMPÜS+ AI-Powered Hybrid Intelligence Platform  
**Date**: 2025-11-11  
**Phase**: Phase 0 - Research & Architecture

## Executive Summary

This document consolidates research findings and technical decisions for implementing the KAMPÜS+ platform. Key architectural choices include: dual FAISS vector databases for hybrid RAG, LangChain for AI orchestration, APScheduler for data synchronization, and AWS S3 for document storage. All decisions align with constitutional requirements for security, privacy, and testability.

---

## 1. Dual Vector Database Architecture (FAISS)

### Decision
Use two separate FAISS vector stores:
- **VDB_Official**: Official university data (UZEM, announcements, schedules)
- **VDB_Social**: User-generated content (uploaded PDFs, forum discussions)

### Rationale
1. **Source Separation**: Official data has higher authority than user content; keeping them separate allows clear citation and trust indicators
2. **Access Control**: VDB_Official is read-only for students, writable only by sync scheduler; VDB_Social has user-level isolation
3. **Anonymization Compliance**: User data can be anonymized before vectorization without affecting official data
4. **Performance**: Smaller, focused indexes improve retrieval speed and relevance
5. **Scalability**: Each vector store can be scaled independently based on growth patterns

### Alternatives Considered
- **Single unified vector store**: Rejected because it complicates access control, makes source attribution harder, and mixes trust levels
- **Pinecone/Weaviate (cloud vector DBs)**: Rejected for MVP due to added cost and external dependency; FAISS provides sufficient performance for 1-5k users
- **PostgreSQL pgvector extension**: Considered but rejected due to less mature ecosystem and lower performance for large-scale vector search

### Implementation Details
- FAISS index type: IndexFlatL2 for accuracy (can upgrade to IndexIVFFlat for performance if needed)
- Embedding model: OpenAI text-embedding-ada-002 (1536 dimensions)
- Chunk size: 512 tokens with 50-token overlap for context preservation
- Persistence: Both indexes serialized to disk, backed up to S3 daily

---

## 2. LangChain for RAG Pipeline

### Decision
Use LangChain as the orchestration framework for the Retrieval-Augmented Generation (RAG) pipeline, integrating with OpenAI GPT-4 for generation.

### Rationale
1. **Abstraction**: LangChain provides clean abstractions for vector stores, LLMs, and chains
2. **Hybrid Search**: Built-in support for querying multiple vector stores and merging results
3. **Context Management**: Conversation memory and context window management out-of-the-box
4. **Prompt Engineering**: Template system for consistent prompt structure and source citation
5. **Observability**: Integration with LangSmith for debugging (optional, not required for MVP)

### Alternatives Considered
- **Custom RAG implementation**: Rejected due to development time and maintenance burden
- **Haystack**: Good alternative but LangChain has better OpenAI integration and larger community
- **LlamaIndex**: More focused on document indexing; LangChain better for conversational AI

### Implementation Details
- Chain type: ConversationalRetrievalChain with source citation
- Retriever: Custom hybrid retriever querying both VDB_Official and VDB_Social
- Memory: ConversationBufferWindowMemory (last 5 exchanges for context)
- Prompt template: System prompt enforces source citation, Turkish language support, and anonymization

---

## 3. APScheduler for Data Synchronization

### Decision
Use APScheduler (Advanced Python Scheduler) for automated synchronization of official university data.

### Rationale
1. **Lightweight**: Runs in-process with FastAPI, no separate service required
2. **Flexible Scheduling**: Supports cron-like schedules (e.g., "sync every 2 hours during business hours")
3. **Persistence**: Jobs can persist across restarts using PostgreSQL job store
4. **Error Handling**: Built-in retry logic and failure notifications
5. **Python Native**: Seamless integration with FastAPI async environment

### Alternatives Considered
- **Celery + Redis**: Rejected as over-engineered for MVP; adds complexity and infrastructure cost
- **Cron jobs + scripts**: Rejected due to poor error handling and lack of visibility
- **Airflow**: Enterprise-grade but excessive for simple scheduled tasks

### Implementation Details
- Scheduler type: BackgroundScheduler (runs in background thread)
- Job store: PostgreSQL (persists job state)
- Sync frequency: Every 2 hours during 08:00-22:00 (configurable)
- Sync sources: UZEM API, announcements RSS/API, schedule CSV/API
- Error handling: Max 3 retries with exponential backoff, admin email notification on persistent failure

---

## 4. AWS S3 for Document Storage

### Decision
Use AWS S3 for storing uploaded PDF documents, with metadata stored in PostgreSQL.

### Rationale
1. **Scalability**: S3 handles 50GB+ storage with automatic scaling
2. **Durability**: 99.999999999% durability (11 nines)
3. **Security**: Encryption at rest (AES-256), IAM role-based access
4. **Cost-Effective**: ~$0.023/GB/month, much cheaper than block storage
5. **Integration**: boto3 library provides mature Python SDK

### Alternatives Considered
- **Local file system**: Rejected due to scaling limitations and backup complexity
- **PostgreSQL bytea**: Rejected due to database bloat and poor performance for large files
- **MinIO (self-hosted S3)**: Good for on-premises deployment; AWS S3 chosen for MVP simplicity

### Implementation Details
- Bucket structure: `kampus-plus-{env}/uploads/{user_id}/{doc_id}.pdf`
- Access: Pre-signed URLs for secure time-limited access (15 minutes)
- Lifecycle: Versioning disabled for MVP (can enable later)
- Metadata: File name, size, upload date, processing status stored in PostgreSQL
- Security: Server-side encryption (SSE-S3), no public access

---

## 5. University Data Sync Strategy

### Decision
Implement adapter pattern for each data source (UZEM, announcements, schedules) with standardized output format.

### Rationale
1. **Flexibility**: Universities have different APIs/data formats; adapters isolate integration logic
2. **Testability**: Each adapter can be mocked and tested independently
3. **Maintainability**: Changes to university APIs only affect specific adapters
4. **Future-Proofing**: Easy to add new data sources or support multiple universities

### Implementation Details

#### UZEM Adapter
- **Input**: UZEM API (REST or web scraping if no API)
- **Output**: Standardized `OfficialDocument` model with course metadata
- **Frequency**: Every 2 hours
- **Challenges**: May require web scraping if API not available; implement rate limiting and caching

#### Announcements Adapter
- **Input**: RSS feed or HTML scraping from university announcement page
- **Output**: `OfficialDocument` with announcement text, date, category
- **Frequency**: Every hour
- **Parsing**: BeautifulSoup for HTML, feedparser for RSS

#### Schedule Adapter
- **Input**: CSV export or iCal format from university scheduling system
- **Output**: `Course` model with schedule details (time, location, instructor)
- **Frequency**: Daily or on-demand when schedule changes detected
- **Parsing**: pandas for CSV, icalendar library for iCal format

### Error Handling
- Graceful degradation: If sync fails, use cached data from last successful sync
- Notification: Log errors to structured logging, send alert if sync fails 3+ times consecutively
- Retry: Exponential backoff (1min, 5min, 15min) before giving up

---

## 6. Authentication & Authorization Flow

### Decision
JWT (JSON Web Token) based authentication with university email verification.

### Rationale
1. **Stateless**: No server-side session storage required
2. **Constitutional Compliance**: JWT is mandated by constitution
3. **Scalability**: Tokens can be verified without database lookup
4. **Standard**: Well-supported by FastAPI and frontend libraries

### Implementation Details

#### Token Structure
- **Access Token**: Short-lived (15 minutes), contains user_id, role, email
- **Refresh Token**: Long-lived (7 days), stored in httpOnly cookie
- **Signing**: HS256 algorithm with secret from environment variable

#### Authentication Flow
1. User submits university email + password
2. Backend validates against PostgreSQL (hashed password via bcrypt)
3. If valid, issue access + refresh tokens
4. Frontend stores access token in memory, refresh token in httpOnly cookie
5. On access token expiry, use refresh token to get new access token

#### Authorization
- Role-based: `student`, `instructor`, `admin`
- Route protection: FastAPI dependency injection checks JWT and role
- Frontend: React Context API stores auth state, protected routes redirect to login

### University Email Verification
- **Initial Registration**: Email verification link sent to university email
- **Password Reset**: Verification link sent to registered email
- **Integration**: May integrate with university SSO in future (SAML/OAuth2)

---

## 7. Anonymous Forum Identity Management

### Decision
Use cryptographic hashing with per-thread salts to generate anonymous identifiers, with secure mapping stored in PostgreSQL.

### Rationale
1. **Privacy**: Students cannot reverse-engineer real identity from anonymous identifier
2. **Consistency**: Same student has same identifier within a thread for conversation continuity
3. **Accountability**: Moderators can reveal real identity if policy violations occur
4. **Simplicity**: No complex blockchain or zero-knowledge proofs needed for MVP

### Implementation Details

#### Anonymous Identifier Generation
```
anonymous_id = HMAC-SHA256(user_id + thread_id + server_secret)[:12]
display_name = "Anonim_" + anonymous_id
```

- Per-thread salt ensures students have different identities across threads
- 12-character truncation provides ~68 bits of entropy (collision-resistant for thread size)
- Server secret prevents rainbow table attacks

#### Mapping Storage
- Table: `anonymous_mappings(thread_id, anonymous_id, user_id, created_at)`
- Access: Only accessible to moderator role
- Audit: All identity reveals logged with moderator_id and reason

---

## 8. AI Anonymization Strategy (Constitutional Requirement)

### Decision
Strip personally identifiable information (PII) from student queries before sending to LLM, with anonymization applied at service layer.

### Rationale
1. **Constitutional Mandate**: "Student data MUST be anonymized before any AI processing"
2. **Privacy**: Minimizes risk of PII leakage to OpenAI
3. **Compliance**: Aligns with GDPR/KVKK principles (data minimization)

### Implementation Details

#### PII Detection & Removal
- **Email addresses**: Regex pattern matching, replace with `[EMAIL]`
- **Student IDs**: Pattern matching (e.g., 2021xxxxxxx format), replace with `[STUDENT_ID]`
- **Names**: NER (Named Entity Recognition) using spaCy Turkish model, replace with `[NAME]`
- **Phone numbers**: Regex pattern, replace with `[PHONE]`

#### Process Flow
1. User submits query: "Benim email adresim student@university.edu, ödevimi nasıl gönderebilirim?"
2. Anonymization service detects and replaces: "Benim email adresim [EMAIL], ödevimi nasıl gönderebilirim?"
3. Anonymized query sent to LangChain → OpenAI
4. Response returned (does not contain PII since it wasn't in the query)

#### Logging Compliance
- **No LLM Prompt Logs**: LangChain configured with `verbose=False`, no prompt/response logging to disk
- **Audit Logs**: Only log query timestamp, user_id, response time (no content)
- **Debugging**: Use request_id for tracing, ephemeral logs only (not persisted)

---

## 9. PDF Processing Pipeline

### Decision
Use PyPDF2/pdfplumber for text extraction, LangChain for chunking, and OpenAI embeddings for vectorization.

### Rationale
1. **Maturity**: PyPDF2 handles most PDF formats, pdfplumber better for OCR-scanned PDFs
2. **Performance**: Processing 10MB PDF in <2 minutes meets success criteria
3. **Integration**: LangChain's TextSplitter handles chunking with overlap

### Implementation Details

#### Processing Steps
1. **Upload**: Student uploads PDF → stored in S3 with unique doc_id
2. **Validation**: Check file size (<25MB limit), MIME type, malware scan (ClamAV integration optional)
3. **Extraction**: 
   - Try PyPDF2 first (fast for text-based PDFs)
   - Fallback to pdfplumber if extraction quality poor (detected by low character count)
4. **Chunking**: RecursiveCharacterTextSplitter (512 tokens, 50 overlap)
5. **Embedding**: OpenAI API batch embedding (max 100 chunks/request)
6. **Indexing**: Add to user's private FAISS index (VDB_Social partition)
7. **Status Update**: Mark document as "processed" in PostgreSQL

#### Error Handling
- Corrupted PDF: Return clear error message with troubleshooting tips
- OCR needed: Notify user that scanned PDFs may have lower quality (future: add OCR with Tesseract)
- Timeout: If processing >5 minutes, move to failed state and notify user

#### Security
- Malware scan: Integrate ClamAV or VirusTotal API before processing
- Sandboxing: Process PDFs in isolated environment (Docker container)
- Size limit: Hard limit at 25MB, soft limit at 10MB for optimal processing time

---

## 10. Testing Strategy

### Decision
Three-tier testing: unit tests (pytest), integration tests (pytest + TestClient), E2E tests (Playwright).

### Rationale
1. **Constitutional Requirement**: Test-First Development is NON-NEGOTIABLE
2. **Coverage**: Unit tests for services, integration for API contracts, E2E for critical user flows
3. **Speed**: Fast unit tests for TDD red-green-refactor, slower E2E for pre-merge validation

### Implementation Details

#### Unit Tests (pytest)
- **Scope**: Individual service functions (auth, AI, vector, PDF)
- **Mocking**: Mock external dependencies (OpenAI, S3, database)
- **Coverage Target**: 80%+ per constitutional requirement
- **Execution**: Run on every file save (watch mode for TDD)

#### Integration Tests (pytest + TestClient)
- **Scope**: API endpoints with real database (test DB), mocked external APIs
- **Fixtures**: Database seeded with test data, FAISS with test vectors
- **Coverage**: All API contracts, authentication flows, error cases
- **Execution**: Run before commit (pre-commit hook)

#### E2E Tests (Playwright)
- **Scope**: Critical user journeys (login, chat, upload, forum)
- **Environment**: Docker Compose with all services running
- **Coverage**: Happy path + major error scenarios
- **Execution**: Run on PR creation, before merge to main

#### Contract Tests
- **Tool**: OpenAPI schema validation (Schemathesis or Dredd)
- **Scope**: Verify API responses match OpenAPI spec
- **Execution**: Part of integration test suite

---

## 11. Observability & Monitoring

### Decision
Structured JSON logging (Python logging), Prometheus metrics, and health check endpoints.

### Rationale
1. **Constitutional Requirement**: Observability is mandatory
2. **Debugging**: JSON logs enable log aggregation (ELK stack, CloudWatch)
3. **Alerting**: Metrics allow proactive monitoring (e.g., high error rate, slow LLM responses)

### Implementation Details

#### Structured Logging
- **Format**: JSON with fields: timestamp, level, service, request_id, user_id, message, context
- **Levels**: DEBUG (dev only), INFO (normal operations), WARNING (degraded), ERROR (failures), CRITICAL (outages)
- **Sensitive Data**: Never log PII, passwords, or tokens; redact in formatter

#### Metrics (Prometheus)
- **Endpoint**: `/metrics` exposed by FastAPI
- **Key Metrics**:
  - Request count by endpoint and status code
  - Request duration (p50, p95, p99)
  - AI query response time
  - PDF processing time
  - Vector search latency
  - Database connection pool usage

#### Health Checks
- **Endpoint**: `/health` returns JSON with service status
- **Checks**: Database connection, FAISS index loaded, S3 accessible, OpenAI API reachable
- **Liveness**: `/health/live` (container should restart if fails)
- **Readiness**: `/health/ready` (container should not receive traffic if fails)

---

## 12. Deployment Strategy (Docker Compose)

### Decision
Multi-container Docker Compose setup for local development and initial deployment, with migration path to Kubernetes if scaling needed.

### Rationale
1. **Constitutional Requirement**: Docker Compose is mandated
2. **Simplicity**: Single docker-compose.yml file defines all services
3. **Portability**: Easy to deploy on university servers or cloud VMs
4. **Development**: Same environment for dev, staging, and production

### Implementation Details

#### Services
1. **backend**: FastAPI application (Python 3.11)
2. **frontend**: React SPA served by nginx
3. **postgres**: PostgreSQL 15 database
4. **redis** (optional): For caching and session storage if needed
5. **nginx** (reverse proxy): Routes traffic, handles SSL termination

#### Networking
- **Internal network**: Backend, database, redis communicate via internal Docker network
- **External access**: Only nginx exposes ports 80/443

#### Volumes
- **postgres-data**: Database persistence
- **faiss-indexes**: Vector store persistence
- **logs**: Centralized log directory

#### Environment Variables
- Stored in `.env` file (not committed to Git)
- Includes: database credentials, OpenAI API key, S3 credentials, JWT secret

#### Scaling Path
- Initial: Single VM running Docker Compose
- Future: Migrate to Kubernetes with Helm charts if >10k users

---

## 13. Technology Choices Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Backend Framework | FastAPI | 0.104+ | High performance, auto OpenAPI docs, async support |
| Frontend Framework | React | 18+ | Component-based, large ecosystem, constitutional requirement |
| UI Framework | TailwindCSS | 3+ | Utility-first, fast development, small bundle size |
| Database | PostgreSQL | 15+ | ACID compliance, JSON support, mature ecosystem |
| Vector Store | FAISS | Latest | Fast similarity search, local deployment, no external dependency |
| AI Orchestration | LangChain | 0.1+ | RAG abstractions, multi-retriever support, conversational memory |
| LLM Provider | OpenAI GPT-4 | gpt-4-turbo | Best quality, function calling, Turkish support |
| Embeddings | OpenAI | text-embedding-ada-002 | 1536 dims, cost-effective, good quality |
| Scheduler | APScheduler | 3.10+ | Lightweight, Python-native, job persistence |
| File Storage | AWS S3 | - | Scalable, durable, cost-effective |
| Authentication | JWT | - | Stateless, constitutional requirement |
| Password Hashing | bcrypt | - | Industry standard, slow hashing (resistance to brute force) |
| Testing (Backend) | pytest | 7+ | De facto Python test framework, fixtures, plugins |
| Testing (Frontend) | Jest + RTL | Latest | React community standard, component testing |
| E2E Testing | Playwright | 1.40+ | Cross-browser, reliable, fast |
| Logging | Python logging | - | Structured JSON output |
| Metrics | Prometheus | - | Time-series metrics, Grafana integration |
| Containerization | Docker | 24+ | Constitutional requirement |
| Orchestration | Docker Compose | 2+ | Multi-container management, constitutional requirement |

---

## 14. Open Questions & Future Considerations

### Open Questions (To be clarified during Phase 1)
1. **UZEM API Access**: Does university provide official API or will web scraping be required?
2. **Authentication Integration**: Should we integrate with university SSO (SAML/OAuth2) or build custom auth?
3. **Turkish NLP Model**: Which spaCy model for Turkish NER (anonymization)?
4. **File Size Limit**: Confirm 10MB (spec) vs 25MB (technical feasibility)
5. **LLM Cost Budget**: What is monthly OpenAI API budget for MVP?

### Future Enhancements (Out of Scope for MVP)
- **Multi-tenant Support**: Support multiple universities in single deployment
- **Advanced Analytics**: Student learning patterns, content recommendation
- **Real-time Collaboration**: Shared notes, study groups
- **Mobile Apps**: Native iOS/Android applications
- **Video/Audio Processing**: Lecture transcription and search
- **Offline Mode**: Progressive Web App with offline capabilities
- **Advanced RAG**: Fine-tuned models, hybrid search (keyword + semantic)

---

## 15. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OpenAI API rate limits | Medium | High | Implement exponential backoff, caching, fallback to cached responses |
| UZEM API changes/downtime | High | Medium | Adapter pattern isolates changes, cache last sync data |
| PDF processing timeout | Medium | Medium | Async processing with status updates, size limits, chunked processing |
| FAISS index corruption | Low | High | Daily backups to S3, index rebuild from PostgreSQL if corrupted |
| University email verification | Medium | Medium | Fallback to manual verification by admins, clear error messages |
| Anonymous forum abuse | Medium | Medium | Rate limiting, moderation tools, flag/report system |
| Data breach | Low | Critical | Encryption at rest/transit, security audits, PII anonymization |
| Scaling beyond 5k users | Low | High | Monitor metrics, prepare Kubernetes migration plan |

---

## Conclusion

All technical decisions align with constitutional requirements (Test-First, Security by Default, AI Ethics & Privacy). The architecture is designed for MVP simplicity while maintaining clear migration paths for scaling. Dual FAISS vector stores enable hybrid RAG with proper source attribution. AWS S3 and PostgreSQL provide scalable storage. LangChain + OpenAI deliver conversational AI quality. APScheduler handles automated data sync. Docker Compose ensures consistent deployment.

**Next Steps**: Proceed to Phase 1 (data-model.md, contracts/, quickstart.md).
