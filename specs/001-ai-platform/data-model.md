# Data Model: KAMPÜS+ AI Platform

**Feature**: KAMPÜS+ AI-Powered Hybrid Intelligence Platform  
**Date**: 2025-11-11  
**Phase**: Phase 1 - Design

## Overview

This document defines all entities, their attributes, relationships, and validation rules for the KAMPÜS+ platform. The data model supports dual vector databases (official + user content), anonymous forum identities, JWT-based authentication, and AI conversation tracking.

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│    User     │──────<│  Enrollment  │>──────│     Course      │
│             │       └──────────────┘       │                 │
│ - id        │                              │ - id            │
│ - email     │                              │ - code          │
│ - role      │                              │ - name          │
└──────┬──────┘                              │ - instructor_id │
       │                                     └────────┬────────┘
       │                                              │
       │ 1:N                                          │ 1:N
       ▼                                              ▼
┌─────────────────┐                      ┌──────────────────────┐
│  UserDocument   │                      │  OfficialDocument    │
│                 │                      │                      │
│ - id            │                      │ - id                 │
│ - user_id       │                      │ - course_id          │
│ - s3_key        │                      │ - source_system      │
│ - vector_ids    │                      │ - vector_ids         │
└─────────────────┘                      └──────────────────────┘
       │                                              │
       │                                              │
       └──────────────┬───────────────────────────────┘
                      │ referenced by
                      ▼
              ┌──────────────────┐
              │ VectorEmbedding  │
              │                  │
              │ - id             │
              │ - document_id    │
              │ - vector_store   │
              │ - embedding      │
              └──────────────────┘

┌──────────────────┐       ┌─────────────────┐
│ ConversationSession│─────<│   ChatMessage   │
│                  │       │                 │
│ - id             │       │ - id            │
│ - user_id        │       │ - session_id    │
│ - created_at     │       │ - role          │
└──────────────────┘       │ - content       │
                           │ - sources       │
                           └─────────────────┘

┌──────────────┐       ┌──────────────────┐
│   ForumPost  │──────<│ AnonymousMapping │
│              │       │                  │
│ - id         │       │ - thread_id      │
│ - thread_id  │       │ - anonymous_id   │
│ - author_id  │       │ - user_id        │
│ - content    │       └──────────────────┘
└──────────────┘

┌──────────────┐
│   SyncJob    │
│              │
│ - id         │
│ - source     │
│ - status     │
│ - last_run   │
└──────────────┘
```

---

## Core Entities

### 1. User

Represents students, instructors, and administrators in the system.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | University email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| role | ENUM | NOT NULL | `student`, `instructor`, `admin` |
| first_name | VARCHAR(100) | NOT NULL | User's first name |
| last_name | VARCHAR(100) | NOT NULL | User's last name |
| student_id | VARCHAR(50) | UNIQUE, NULLABLE | University student/staff ID |
| is_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| created_at | TIMESTAMP | NOT NULL | Account creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| last_login | TIMESTAMP | NULLABLE | Last login timestamp |

**Validation Rules:**
- `email` MUST match pattern `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- `email` MUST be from university domain (validated during registration via ALLOWED_EMAIL_DOMAINS config: `["university.edu.tr", "*.university.edu.tr"]` - supports wildcards for subdomains)
- `password_hash` MUST be bcrypt with cost factor ≥12
- `role` MUST be one of: `student`, `admin`
- `first_name` and `last_name` MUST be 2-100 characters
- `student_id` format depends on university (e.g., `2021xxxxxxx`)

**Relationships:**
- User has many Enrollments (if student)
- User has many UserDocuments
- User has many ConversationSessions
- User has many ForumPosts (via AnonymousMapping)

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`
- INDEX on `role` (for role-based queries)
- INDEX on `is_active` (for filtering active accounts)

---

### 2. RefreshToken

Stores JWT refresh tokens for secure session management and token rotation.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK (User.id), NOT NULL | Token owner |
| token_hash | VARCHAR(255) | NOT NULL | SHA-256 hash of refresh token |
| expires_at | TIMESTAMP | NOT NULL | Token expiration timestamp |
| created_at | TIMESTAMP | NOT NULL | Token creation timestamp |
| is_revoked | BOOLEAN | DEFAULT FALSE | Revocation status |
| device_fingerprint | VARCHAR(255) | NULLABLE | Device identifier for security |
| ip_address | VARCHAR(45) | NULLABLE | IP address of token creation |

**Validation Rules:**
- `token_hash` MUST be SHA-256 hashed (64 characters hex)
- `expires_at` MUST be 7 days from creation (configurable)
- `device_fingerprint` generated from User-Agent + IP hash
- Expired tokens (expires_at < NOW) should be periodically cleaned

**Relationships:**
- RefreshToken belongs to one User (many-to-one)

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `user_id`
- INDEX on `token_hash` (for fast lookup)
- INDEX on `expires_at` (for cleanup jobs)
- UNIQUE INDEX on `student_id` (where not NULL)
- INDEX on `role` (for filtering)
- INDEX on `is_active` (for filtering)

---

### 2. Course

Represents university courses from UZEM or scheduling system.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Course code (e.g., "CS101") |
| name | VARCHAR(255) | NOT NULL | Course name |
| description | TEXT | NULLABLE | Course description |
| department | VARCHAR(100) | NOT NULL | Academic department |
| semester | VARCHAR(20) | NOT NULL | e.g., "2024-Fall" |
| credits | INTEGER | NOT NULL | Credit hours |
| schedule | JSONB | NULLABLE | Schedule details (times, locations) |
| syllabus_url | VARCHAR(500) | NULLABLE | Link to syllabus document |
| is_active | BOOLEAN | DEFAULT TRUE | Course is currently offered |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Validation Rules:**
- `code` MUST be uppercase alphanumeric (e.g., "CS101", "MATH201")
- `name` MUST be 5-255 characters
- `credits` MUST be 1-10
- `semester` MUST match pattern `^\d{4}-(Fall|Spring|Summer)$`
- `schedule` MUST be valid JSON if present

**Relationships:**
- Course has many Enrollments
- Course has many OfficialDocuments

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `code`
- INDEX on `semester`
- INDEX on `is_active`

---

### 3. Enrollment

Join table linking students to courses.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK → User(id), NOT NULL | Student |
| course_id | UUID | FK → Course(id), NOT NULL | Enrolled course |
| enrolled_at | TIMESTAMP | NOT NULL | Enrollment date |
| status | ENUM | NOT NULL | `active`, `dropped`, `completed` |
| grade | VARCHAR(5) | NULLABLE | Final grade |

**Validation Rules:**
- `user_id` MUST reference a User with role=student
- Unique constraint on (`user_id`, `course_id`) per semester
- `status` MUST be one of: `active`, `dropped`, `completed`
- `grade` MUST match pattern `^(A|B|C|D|F|W|I|P)[\+\-]?$` if present

**Relationships:**
- Enrollment belongs to one User (student)
- Enrollment belongs to one Course

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on (`user_id`, `course_id`)
- INDEX on `user_id`
- INDEX on `course_id`
- INDEX on `status`

---

### 4. OfficialDocument

Official university content from UZEM, announcements, schedules.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| source_system | ENUM | NOT NULL | `announcement`, `manual`, `schedule` |
| source_id | VARCHAR(255) | NULLABLE | External system identifier |
| document_type | VARCHAR(50) | NOT NULL | e.g., "syllabus", "lecture", "announcement" |
| title | VARCHAR(500) | NOT NULL | Document title |
| content | TEXT | NOT NULL | Extracted text content |
| metadata | JSONB | NULLABLE | Additional metadata (author, date, tags) |
| course_id | UUID | FK → Course(id), NULLABLE | Associated course (if applicable) |
| publication_date | TIMESTAMP | NOT NULL | When published/created |
| sync_job_id | UUID | FK → SyncJob(id), NULLABLE | Sync job that fetched this |
| is_active | BOOLEAN | DEFAULT TRUE | Document is current/relevant |
| created_at | TIMESTAMP | NOT NULL | First synced timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last synced timestamp |

**Validation Rules:**
- `source_system` MUST be one of: `announcement`, `manual`, `schedule`
- `title` MUST be 5-500 characters
- `content` MUST be at least 10 characters
- `metadata` MUST be valid JSON if present

**Relationships:**
- OfficialDocument may belong to one Course
- OfficialDocument has many VectorEmbeddings
- OfficialDocument belongs to one SyncJob

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `source_system`
- INDEX on `course_id`
- INDEX on `publication_date`
- INDEX on `is_active`
- UNIQUE INDEX on (`source_system`, `source_id`) if source_id not NULL

---

### 5. UserDocument

Student-uploaded PDFs for personal knowledge base.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK → User(id), NOT NULL | Document owner |
| filename | VARCHAR(255) | NOT NULL | Original filename |
| s3_key | VARCHAR(500) | UNIQUE, NOT NULL | S3 object key |
| s3_bucket | VARCHAR(100) | NOT NULL | S3 bucket name |
| file_size | BIGINT | NOT NULL | File size in bytes |
| mime_type | VARCHAR(50) | NOT NULL | MIME type (application/pdf) |
| processing_status | ENUM | NOT NULL | `pending`, `processing`, `completed`, `failed` |
| error_message | TEXT | NULLABLE | Error details if processing failed |
| page_count | INTEGER | NULLABLE | Number of pages (after processing) |
| chunk_count | INTEGER | NULLABLE | Number of chunks (after processing) |
| uploaded_at | TIMESTAMP | NOT NULL | Upload timestamp |
| processed_at | TIMESTAMP | NULLABLE | Processing completion timestamp |

**Validation Rules:**
- `filename` MUST end with `.pdf` (case-insensitive)
- `file_size` MUST be ≤ 26214400 bytes (25 MB)
- `mime_type` MUST be `application/pdf`
- `processing_status` MUST be one of: `pending`, `processing`, `completed`, `failed`
- `s3_key` format: `uploads/{user_id}/{document_id}.pdf`

**Relationships:**
- UserDocument belongs to one User
- UserDocument has many VectorEmbeddings

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `user_id`
- INDEX on `processing_status`
- UNIQUE INDEX on `s3_key`

---

### 6. VectorEmbedding

Stores metadata about vectors in FAISS indexes (actual vectors in FAISS).

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| vector_store | ENUM | NOT NULL | `official`, `user` |
| faiss_index | INTEGER | NOT NULL | Index in FAISS vector store |
| document_id | UUID | NOT NULL | Related document (Official or User) |
| document_type | ENUM | NOT NULL | `official`, `user` |
| chunk_text | TEXT | NOT NULL | Original text chunk |
| chunk_index | INTEGER | NOT NULL | Chunk position in document |
| embedding_model | VARCHAR(100) | NOT NULL | Model identifier (e.g., "text-embedding-004", "text-embedding-3-small") |
| model_provider | VARCHAR(50) | NOT NULL | Provider name ("google", "openai") |
| embedding_dimension | INTEGER | NOT NULL | Vector dimensionality (768 for Gemini, 1536 for OpenAI) |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

**Validation Rules:**
- `vector_store` MUST be one of: `official`, `user`
- `document_type` MUST be one of: `official`, `user`
- `vector_store` = `official` IF document_type = `official`
- `vector_store` = `user` IF document_type = `user`
- `faiss_index` MUST be unique within each vector_store
- `chunk_index` starts at 0 for each document
- `embedding_dimension` MUST be 768 (Gemini text-embedding-004) or 1536 (OpenAI text-embedding-3-small)
- `embedding_model` + `model_provider` combination MUST be valid: ("text-embedding-004", "google") OR ("text-embedding-3-small", "openai")

**Relationships:**
- VectorEmbedding references one OfficialDocument or UserDocument (polymorphic)

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on (`vector_store`, `faiss_index`)
- INDEX on (`document_id`, `document_type`)
- INDEX on `vector_store`

---

### 7. ConversationSession

AI chat sessions for tracking conversation context.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK → User(id), NOT NULL | Session owner |
| title | VARCHAR(255) | NULLABLE | Session title (first query) |
| context_window | INTEGER | DEFAULT 5 | Number of messages for context |
| is_active | BOOLEAN | DEFAULT TRUE | Session still active |
| created_at | TIMESTAMP | NOT NULL | Session start timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last message timestamp |

**Validation Rules:**
- `context_window` MUST be 1-20
- `title` MUST be ≤255 characters if present

**Relationships:**
- ConversationSession belongs to one User
- ConversationSession has many ChatMessages

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `user_id`
- INDEX on `is_active`
- INDEX on `updated_at` (for sorting recent sessions)

---

### 8. ChatMessage

Individual messages in AI conversation sessions.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| session_id | UUID | FK → ConversationSession(id), NOT NULL | Parent session |
| role | ENUM | NOT NULL | `user`, `assistant`, `system` |
| content | TEXT | NOT NULL | Message content |
| anonymized_content | TEXT | NULLABLE | PII-anonymized version (if role=user) |
| sources | JSONB | NULLABLE | Source citations (if role=assistant) |
| token_count | INTEGER | NULLABLE | Token count for LLM usage tracking |
| response_time_ms | INTEGER | NULLABLE | AI response time (if role=assistant) |
| created_at | TIMESTAMP | NOT NULL | Message timestamp |

**Validation Rules:**
- `role` MUST be one of: `user`, `assistant`, `system`
- `content` MUST be 1-10000 characters
- `sources` MUST be valid JSON array if present: `[{"type": "official|user", "id": "uuid", "title": "...", "relevance": 0.0-1.0}]`
- `anonymized_content` REQUIRED if role=user (constitutional requirement)

**Relationships:**
- ChatMessage belongs to one ConversationSession

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `session_id`
- INDEX on `created_at`

---

### 9. ForumPost

Anonymous student forum posts and replies.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| thread_id | UUID | NULLABLE | Parent thread (NULL if root post) |
| author_id | UUID | FK → User(id), NOT NULL | Real user (for moderation) |
| anonymous_id | VARCHAR(50) | NOT NULL | Public anonymous identifier |
| title | VARCHAR(500) | NULLABLE | Thread title (NULL if reply) |
| content | TEXT | NOT NULL | Post content |
| is_flagged | BOOLEAN | DEFAULT FALSE | Flagged for moderation |
| flag_reason | TEXT | NULLABLE | Reason for flag |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| upvote_count | INTEGER | DEFAULT 0 | Number of upvotes |
| created_at | TIMESTAMP | NOT NULL | Post timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last edit timestamp |

**Validation Rules:**
- `title` REQUIRED if thread_id is NULL (root post)
- `title` MUST be ≤500 characters if present
- `content` MUST be 10-10000 characters
- `anonymous_id` format: `Anonim_{12_char_hash}`

**Relationships:**
- ForumPost has one author (User, hidden from public)
- ForumPost may have one parent thread (ForumPost)
- ForumPost has many replies (ForumPost)
- ForumPost has one AnonymousMapping

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `thread_id` (for fetching replies)
- INDEX on `author_id` (for moderation)
- INDEX on `is_flagged`
- INDEX on `is_deleted`
- INDEX on `created_at`

---

### 10. AnonymousMapping

Secure mapping between anonymous identifiers and real users.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| thread_id | UUID | FK → ForumPost(id), NOT NULL | Forum thread |
| anonymous_id | VARCHAR(50) | NOT NULL | Public anonymous identifier |
| user_id | UUID | FK → User(id), NOT NULL | Real user identity |
| created_at | TIMESTAMP | NOT NULL | Mapping creation timestamp |

**Validation Rules:**
- UNIQUE constraint on (`thread_id`, `user_id`) - same user same ID per thread
- `anonymous_id` generation: `HMAC-SHA256(user_id + thread_id + server_secret)[:12]`

**Relationships:**
- AnonymousMapping belongs to one User
- AnonymousMapping belongs to one ForumPost (thread)

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on (`thread_id`, `user_id`)
- INDEX on `anonymous_id` (for lookups)
- INDEX on `user_id` (for moderation)

**Security:**
- Table access restricted to `admin` and `moderator` roles only
- All identity reveals logged in audit table

---

### 11. SyncJob

Tracks automated synchronization of official university data.

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| source_system | ENUM | NOT NULL | `uzem`, `announcement`, `schedule` |
| status | ENUM | NOT NULL | `pending`, `running`, `completed`, `failed` |
| started_at | TIMESTAMP | NULLABLE | Job start timestamp |
| completed_at | TIMESTAMP | NULLABLE | Job completion timestamp |
| documents_synced | INTEGER | DEFAULT 0 | Number of documents processed |
| documents_added | INTEGER | DEFAULT 0 | New documents added |
| documents_updated | INTEGER | DEFAULT 0 | Existing documents updated |
| error_message | TEXT | NULLABLE | Error details if failed |
| retry_count | INTEGER | DEFAULT 0 | Number of retries attempted |
| next_retry_at | TIMESTAMP | NULLABLE | Scheduled retry time |
| created_at | TIMESTAMP | NOT NULL | Job creation timestamp |

**Validation Rules:**
- `source_system` MUST be one of: `uzem`, `announcement`, `schedule`
- `status` MUST be one of: `pending`, `running`, `completed`, `failed`
- `retry_count` MUST be ≤3 (max retries)

**Relationships:**
- SyncJob has many OfficialDocuments

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `source_system`
- INDEX on `status`
- INDEX on `created_at`

---

## Additional Tables

### 12. RefreshToken (for JWT refresh)

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK → User(id), NOT NULL | Token owner |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | Hashed refresh token |
| expires_at | TIMESTAMP | NOT NULL | Token expiration |
| is_revoked | BOOLEAN | DEFAULT FALSE | Token revoked status |
| created_at | TIMESTAMP | NOT NULL | Token creation timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `token_hash`
- INDEX on `user_id`
- INDEX on `expires_at`

---

### 13. AuditLog (for security tracking)

**Attributes:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| user_id | UUID | FK → User(id), NULLABLE | User who performed action |
| action | VARCHAR(100) | NOT NULL | Action type (e.g., "login", "upload", "reveal_identity") |
| resource_type | VARCHAR(50) | NULLABLE | Resource affected (e.g., "ForumPost") |
| resource_id | UUID | NULLABLE | Resource ID |
| ip_address | VARCHAR(45) | NOT NULL | Client IP address |
| user_agent | TEXT | NULLABLE | Browser user agent |
| metadata | JSONB | NULLABLE | Additional context |
| created_at | TIMESTAMP | NOT NULL | Event timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `user_id`
- INDEX on `action`
- INDEX on `created_at`

---

## State Transitions

### UserDocument Processing States
```
pending → processing → completed
                    ↘ failed
```

### SyncJob States
```
pending → running → completed
                 ↘ failed → pending (retry, max 3x)
```

### Enrollment States
```
active → dropped
      → completed
```

---

## Data Retention & Privacy

1. **User Data**: Retained until account deletion requested
2. **LLM Prompts**: NEVER persisted (constitutional requirement)
3. **Chat Messages**: Retained with anonymized_content only
4. **Forum Posts**: Soft-deleted (is_deleted=true) for moderation audit trail
5. **Sync Logs**: Retained for 90 days, then archived
6. **Audit Logs**: Retained for 2 years for compliance

---

## Database Constraints Summary

### Foreign Key Constraints
- All FK relationships enforce `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
- Enrollment: `ON DELETE CASCADE` (if user deleted, enrollments deleted)
- UserDocument: `ON DELETE CASCADE` (if user deleted, documents deleted)
- ForumPost: `ON DELETE SET NULL` for author_id (preserve posts, anonymize author)

### Check Constraints
- `User.role IN ('student', 'instructor', 'admin')`
- `Course.credits BETWEEN 1 AND 10`
- `UserDocument.file_size <= 26214400`
- `ChatMessage.role IN ('user', 'assistant', 'system')`
- `SyncJob.retry_count <= 3`

---

## Migrations Strategy

- Use Alembic for database migrations
- Each feature branch creates new migration file
- Migration naming: `{timestamp}_{feature}_{description}.py`
- Always include rollback logic
- Test migrations on copy of production data before deploying

---

## Conclusion

This data model supports all functional requirements from the specification while maintaining constitutional compliance (privacy, security, observability). The dual vector store design (official vs user content) is reflected in the `vector_store` enum. Anonymous forum identity management is secure yet auditable. All entities include appropriate indexes for query performance.

**Next Steps**: Generate API contracts based on this data model (Phase 1 continuation).
