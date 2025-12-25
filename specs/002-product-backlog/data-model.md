# Phase 1a: Data Model - Product Backlog

**Status**: Design Complete  
**Date**: 2025-12-24  
**Feature**: 002-product-backlog (14 user stories)

---

## Data Model Overview

The Kampus Plus platform manages users, courses, materials, interactions (forum, messaging, mentorship), and AI-driven features (recommendations, knowledge base). All entities support FERPA-compliant data handling with privacy-first design.

**Database**: PostgreSQL 14+  
**ORM**: SQLAlchemy 2.0+  
**Migrations**: Alembic  
**Connection Pooling**: pgBouncer (100 connections max)

---

## Core Entities

### 1. User Entity

**Purpose**: Authentication, authorization, profile management  
**Used By**: US-01 (Registration), all user-facing features

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  
  -- Profile
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  student_id VARCHAR(50) UNIQUE,  -- For students
  bio TEXT,
  avatar_url VARCHAR(512),
  
  -- Role & Permissions
  role ENUM('student', 'instructor', 'admin') NOT NULL DEFAULT 'student',
  permissions JSONB DEFAULT '{}',  -- Role-specific permissions
  
  -- Verification (US-01)
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token_hash VARCHAR(64),  -- SHA256 of token
  verification_token_expires_at TIMESTAMP,
  verified_at TIMESTAMP,
  
  -- Activity & Engagement
  last_login_at TIMESTAMP,
  last_active_at TIMESTAMP,
  login_count INT DEFAULT 0,
  
  -- Preferences (US-13)
  widget_preferences JSONB DEFAULT '{
    "visible": ["active_courses", "gpa_card", "upcoming_assignments"],
    "order": [0, 1, 2],
    "settings": {}
  }',
  
  -- Account Status
  status ENUM('active', 'suspended', 'archived') DEFAULT 'active',
  suspend_until TIMESTAMP,
  violation_count INT DEFAULT 0,  -- For moderation (US-05)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_users_role ON users(role);
  CREATE INDEX idx_users_student_id ON users(student_id);
);
```

**Fields Breakdown**:
- `email`: Used for login and verification (SC-001: <2 min verification)
- `hashed_password`: Bcrypt hash (min 12 rounds), never plaintext
- `role`: Controls access (student, instructor, admin)
- `permissions`: JSONB allows role-specific capabilities (extensible design)
- `verification_token_*`: 24-hour expiring token for email verification (US-01)
- `widget_preferences`: Customizable dashboard (US-13)
- `violation_count`: Track moderation violations (US-05)
- `suspend_until`: Timestamp for suspension duration

**State Transitions**:
```
Registration → is_verified=false → Email sent
  ↓
User clicks verification link → is_verified=true, verified_at=now
  ↓
Login allowed → last_login_at=now, login_count+=1
  ↓
Forum violation → violation_count+=1
  ↓
3+ violations → status='suspended', suspend_until=now+30days
```

**Validation Rules**:
- `email`: Must match university domain (regex or allowlist)
- `first_name`, `last_name`: 1-100 characters, no special chars
- `student_id`: 6-50 alphanumeric characters (format varies by institution)
- `password` (not stored): Min 12 chars, must include uppercase, lowercase, digit, special char
- `role`: Must be one of enum values
- `widget_preferences`: Must be valid JSON structure

**Relationships**:
- Courses (many-to-many): As student or instructor
- Messages (one-to-many): As sender/recipient
- ForumPosts (one-to-many): As author
- Mentorships (one-to-many): As mentor/mentee
- Recommendations (one-to-many): Receives personalized suggestions

---

### 2. Course Entity

**Purpose**: Academic offerings with content, enrollment, grading  
**Used By**: US-03 (Upload), US-06 (Discovery), US-09, US-14 (Recommendations)

```sql
CREATE TABLE courses (
  id BIGSERIAL PRIMARY KEY,
  
  -- Course Info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id BIGINT NOT NULL REFERENCES users(id),
  
  -- Metadata
  department VARCHAR(100),
  course_code VARCHAR(50) UNIQUE,  -- e.g., "CS101"
  semester VARCHAR(10),  -- e.g., "Fall2024"
  credits INT DEFAULT 3,
  
  -- Metrics (US-06: Course cards)
  enrollment_count INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,  -- Average rating (1-5)
  review_count INT DEFAULT 0,
  
  -- Content & Policies
  syllabus_url VARCHAR(512),
  prerequisites VARCHAR(255),
  max_students INT,
  
  -- Status
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  published_at TIMESTAMP,
  start_date DATE,
  end_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
  CREATE INDEX idx_courses_status ON courses(status);
  CREATE INDEX idx_courses_semester ON courses(semester);
  CREATE INDEX idx_courses_rating ON courses(rating DESC);
);
```

**Fields Breakdown**:
- `instructor_id`: Foreign key to User (instructor role)
- `enrollment_count`: Cached count for performance (updated on student add/remove)
- `rating`: Average student rating (1-5 stars), updated nightly
- `status`: Controls visibility (draft = instructor only, published = visible, archived = read-only)

**Validation Rules**:
- `title`: 1-255 characters
- `course_code`: Unique per semester
- `max_students`: Optional (null = unlimited)
- `prerequisites`: Free-text field (formatted as string)

**Relationships**:
- Instructor (User): Many courses per instructor
- Materials (one-to-many): Course content (US-03)
- Students (many-to-many): Enrollment
- ForumTopics (one-to-many): Course discussions
- Grades (one-to-many): Per student
- Recommendations (reverse): Recommended to which students

---

### 3. Material Entity

**Purpose**: Course content (PDFs, slides, handouts, etc.)  
**Used By**: US-03 (Upload), US-04 (AI context), US-10 (Knowledge base indexing), US-11 (OCR)

```sql
CREATE TABLE materials (
  id BIGSERIAL PRIMARY KEY,
  
  -- Course & Owner
  course_id BIGINT NOT NULL REFERENCES courses(id),
  uploader_id BIGINT NOT NULL REFERENCES users(id),  -- Instructor
  
  -- File Info
  title VARCHAR(255) NOT NULL,
  file_key VARCHAR(512) NOT NULL,  -- S3 path in MinIO (US-03)
  file_size_bytes INT NOT NULL,
  mime_type VARCHAR(100),  -- e.g., "application/pdf"
  original_filename VARCHAR(255),
  
  -- Organization (US-03, US-04)
  category ENUM('lecture', 'exercise', 'assignment', 'reading', 'exam_prep') NOT NULL,
  topic VARCHAR(255),  -- Optional: "Chapter 3 - Functions"
  
  -- OCR & Indexing (US-11)
  ocr_text TEXT,  -- Extracted text from images
  ocr_confidence DECIMAL(3,2),  -- 0-1 confidence score
  is_searchable BOOLEAN DEFAULT TRUE,  -- Can appear in search
  
  -- AI Processing (US-04, US-10)
  embedding_id VARCHAR(256),  -- Reference to FAISS vector index
  embedding_model_version INT,  -- Track which model generated embedding
  embedding_updated_at TIMESTAMP,  -- When embedding was last updated
  
  -- Metadata
  description TEXT,
  tags JSONB DEFAULT '[]',  -- ["functions", "algebra"]
  
  -- Access & Visibility
  is_public BOOLEAN DEFAULT TRUE,  -- Visible to all enrolled students
  is_archived BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CREATE INDEX idx_materials_course_id ON materials(course_id);
  CREATE INDEX idx_materials_category ON materials(category);
  CREATE INDEX idx_materials_is_searchable ON materials(is_searchable);
  CREATE INDEX idx_materials_embedding_id ON materials(embedding_id);
);
```

**Fields Breakdown**:
- `file_key`: S3 path for retrieval (e.g., "courses/CS101/lecture-01.pdf")
- `category`: Enables filtering (US-03: "Filter by Lecture")
- `ocr_text`: Extracted text from images (US-11), enables full-text search
- `embedding_id`: Reference to FAISS vector index for semantic search (US-10)
- `embedding_model_version`: Allows index updates without full recomputation

**Validation Rules**:
- `title`: 1-255 characters
- `file_size_bytes`: Max 500MB (configurable)
- `mime_type`: Whitelist (application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc.)
- `category`: Must match enum values
- `ocr_confidence`: 0-1 decimal (null if no OCR attempted)

**Relationships**:
- Course (many-to-one): Material belongs to single course
- Uploader (User: many-to-one): Instructor who uploaded
- OCRResults (one-to-many): Historical OCR results if re-processing
- VectorEmbeddings (many-to-one): Reference to FAISS embedding

---

### 4. ForumPost Entity

**Purpose**: Forum discussions with moderation and anonymity  
**Used By**: US-05 (Moderation), US-09 (Anonymous posts)

```sql
CREATE TABLE forum_posts (
  id BIGSERIAL PRIMARY KEY,
  
  -- Hierarchy
  course_id BIGINT NOT NULL REFERENCES courses(id),
  topic_id BIGINT REFERENCES forum_posts(id),  -- null = top-level topic
  author_id BIGINT NOT NULL REFERENCES users(id),
  parent_id BIGINT REFERENCES forum_posts(id),  -- null = top-level or topic
  
  -- Content
  title VARCHAR(255),  -- null for replies
  content TEXT NOT NULL,
  
  -- Anonymity (US-09)
  is_anonymous BOOLEAN DEFAULT FALSE,
  anonymous_id VARCHAR(64),  -- SHA256(user_id + salt), consistent per course
  
  -- Moderation (US-05)
  is_flagged BOOLEAN DEFAULT FALSE,
  is_removed BOOLEAN DEFAULT FALSE,
  removal_reason VARCHAR(255),
  moderated_by_id BIGINT REFERENCES users(id),  -- Admin who removed
  
  -- Engagement
  reply_count INT DEFAULT 0,  -- Cached count
  helpful_count INT DEFAULT 0,  -- Users marked as helpful
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,  -- Soft delete for audit
  
  CREATE INDEX idx_forum_posts_course_id ON forum_posts(course_id);
  CREATE INDEX idx_forum_posts_topic_id ON forum_posts(topic_id);
  CREATE INDEX idx_forum_posts_is_removed ON forum_posts(is_removed);
  CREATE INDEX idx_forum_posts_is_flagged ON forum_posts(is_flagged);
);
```

**Fields Breakdown**:
- `topic_id`: Identifies top-level topic (topic_id = NULL for topics, topic_id = parent.topic_id for replies)
- `is_anonymous`: If true, display anonymous_id instead of author name
- `anonymous_id`: SHA256(user_id + course_id + salt) - consistent within course, varies across courses
- `is_removed`: Soft delete for audit trail (post not visible to students)
- `moderated_by_id`: Track which admin removed post

**State Transitions**:
```
Post created (is_flagged=false, is_removed=false)
  ↓
User flags post → is_flagged=true
  ↓
Moderator reviews → Decision: Keep or Remove
  ↓
If removed: is_removed=true, moderated_by_id=admin_id, removal_reason set
```

**Anonymity Logic**:
```python
# When posting anonymously
salt = course_id + timestamp  # Ensures same user gets same ID per course
anonymous_id = SHA256(user_id + salt)

# Display
if is_anonymous:
  display_name = anonymous_id[:12]  # "a3f8d2e1c4b9"
else:
  display_name = author.first_name + " " + author.last_name
```

**Moderation Workflow**:
```
Post flagged by community → is_flagged=true
→ Admin views moderation queue (WHERE is_flagged=true)
→ Admin click "Remove" → is_removed=true, moderated_by_id=admin_id
→ Post hidden from student view (WHERE is_removed=false)
→ Audit log: removal_reason, timestamp, admin_id
```

**Validation Rules**:
- `title`: 1-255 characters (required for topics, null for replies)
- `content`: 1-10,000 characters
- `anonymous_id`: Must match format if is_anonymous=true

**Relationships**:
- Course (many-to-one): Post belongs to course
- Author (User: many-to-one): Who created post
- Topic (ForumPost: many-to-one): Top-level topic (recursive)
- Parent (ForumPost: many-to-one): Direct parent (recursive)
- Replies (ForumPost: one-to-many): Child posts (recursive)
- Flags (one-to-many): Flag records from users

---

### 5. Message Entity

**Purpose**: Direct 1-on-1 messaging  
**Used By**: US-08 (Messaging), US-12 (Mentor communication)

```sql
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  
  -- Participants
  sender_id BIGINT NOT NULL REFERENCES users(id),
  recipient_id BIGINT NOT NULL REFERENCES users(id),
  
  -- Conversation Threading
  conversation_id VARCHAR(64) NOT NULL,  -- SHA256(min(sender_id, recipient_id) + max(sender_id, recipient_id))
  
  -- Content
  content TEXT NOT NULL,
  
  -- Read Status (US-08: Read receipts)
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CREATE INDEX idx_messages_recipient_id_is_read ON messages(recipient_id, is_read);
  CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
  CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
);
```

**Fields Breakdown**:
- `conversation_id`: Deterministic hash ensures both directions use same thread
- `is_read`, `read_at`: Track read status for notifications
- Indexed on (recipient_id, is_read) for efficient notification queries

**Conversation Logic**:
```python
# Deterministic conversation ID
participant_ids = sorted([sender_id, recipient_id])
conversation_id = SHA256(f"{participant_ids[0]}:{participant_ids[1]}")

# Ensures Message(A→B) and Message(B→A) are in same thread
```

**Performance Optimization**:
- Message delivery: <5 seconds (SC-006)
- Notification delivery: <2 minutes (SC-006)
- Achieved via: WebSocket push + Redis pub/sub

**Validation Rules**:
- `content`: 1-5,000 characters
- `sender_id` ≠ `recipient_id` (cannot message self)

**Relationships**:
- Sender (User: many-to-one)
- Recipient (User: many-to-one)
- Conversation (virtual grouping via conversation_id)

---

### 6. Mentorship Entity

**Purpose**: Mentor-mentee relationship tracking  
**Used By**: US-12 (Mentor network)

```sql
CREATE TABLE mentorships (
  id BIGSERIAL PRIMARY KEY,
  
  -- Relationship
  mentor_id BIGINT NOT NULL REFERENCES users(id),
  mentee_id BIGINT NOT NULL REFERENCES users(id),
  
  -- Status
  status ENUM('pending', 'active', 'completed', 'rejected') DEFAULT 'pending',
  
  -- Metadata
  expertise_tags JSONB DEFAULT '[]',  -- ["career-planning", "coursework"]
  description TEXT,  -- What mentee is seeking
  
  -- Interaction Tracking (US-12: Reminder on inactivity)
  last_interaction_at TIMESTAMP,
  interaction_count INT DEFAULT 0,
  
  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  CREATE INDEX idx_mentorships_mentor_id ON mentorships(mentor_id);
  CREATE INDEX idx_mentorships_mentee_id ON mentorships(mentee_id);
  CREATE INDEX idx_mentorships_status ON mentorships(status);
);
```

**Fields Breakdown**:
- `status`: "pending" = awaiting mentor approval, "active" = ongoing, "completed" = finished
- `last_interaction_at`: Used to trigger inactivity reminders
- `expertise_tags`: Helps match mentors with relevant expertise

**State Machine**:
```
Mentee requests → status='pending'
  ↓
Mentor accepts → status='active', accepted_at=now
  OR
Mentor rejects → status='rejected'
  ↓
Either party ends → status='completed', completed_at=now
```

**Inactivity Reminder** (US-12):
```
WHERE status='active' 
  AND last_interaction_at < NOW() - INTERVAL 30 days
→ Send reminder to both parties
→ Update last_interaction_at to avoid duplicate reminders
```

**Validation Rules**:
- `mentor_id` ≠ `mentee_id` (cannot mentor self)
- `mentor_id`: Must have mentor role or sufficient experience flag

**Relationships**:
- Mentor (User: many-to-one)
- Mentee (User: many-to-one)

---

### 7. Recommendation Entity

**Purpose**: AI-generated personalized course suggestions  
**Used By**: US-14 (Course recommendations), US-13 (Dashboard widget)

```sql
CREATE TABLE recommendations (
  id BIGSERIAL PRIMARY KEY,
  
  -- Target
  user_id BIGINT NOT NULL REFERENCES users(id),
  recommended_course_id BIGINT NOT NULL REFERENCES courses(id),
  
  -- Ranking
  relevance_score DECIMAL(5,4),  -- 0-1 score (0.95 = 95% match)
  reason VARCHAR(255),  -- "Popular with students like you"
  ranking INT,  -- 1-5 (1 = most relevant)
  
  -- ML Model Info
  model_version INT,  -- Which ML model generated this
  algorithm VARCHAR(50),  -- "collaborative_filtering", "content_based", "hybrid"
  
  -- Engagement Tracking
  is_clicked BOOLEAN DEFAULT FALSE,
  is_enrolled BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP,
  enrolled_at TIMESTAMP,
  
  -- Generation
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CREATE INDEX idx_recommendations_user_id_created_at ON recommendations(user_id, created_at DESC);
  CREATE INDEX idx_recommendations_user_id_is_enrolled ON recommendations(user_id, is_enrolled);
);
```

**Fields Breakdown**:
- `relevance_score`: 0-1 (0.95 = 95% confident recommendation)
- `reason`: Displayed to user ("Matches your interest in AI")
- `ranking`: 1-5 (sorted by relevance)
- `model_version`: Track which ML model (for A/B testing)
- `is_clicked`, `is_enrolled`: Engagement metrics for accuracy tracking (SC-013)

**Daily Batch Recommendation Generation** (overnight 2 AM UTC):
```
FOR each active student:
  1. Fetch recent enrollments (past 7 days)
  2. Generate collaborative filtering scores
  3. Generate content-based scores
  4. Combine (hybrid) and rank top 5
  5. Store with relevance scores and reasoning
  6. DELETE old recommendations (keep 7 days)
```

**Accuracy Tracking** (SC-013: 15% improvement after 4 weeks):
```
Metric: CTR (Click-Through Rate) = clicked / displayed
Target: Improve from baseline 10% to 15% by week 4
Tracked via: is_clicked, clicked_at timestamps
```

**Validation Rules**:
- `relevance_score`: 0-1 decimal
- `ranking`: 1-5 integer
- `user_id` ≠ `recommended_course_id` instructor (avoid self-promotion)

**Relationships**:
- User (many-to-one): Receives recommendations
- Course (many-to-one): Recommended course

---

### 8. KnowledgeItem Entity

**Purpose**: Indexed policy documents for AI Q&A  
**Used By**: US-10 (Knowledge base), US-14 (AI recommendations)

```sql
CREATE TABLE knowledge_items (
  id BIGSERIAL PRIMARY KEY,
  
  -- Document
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  source_url VARCHAR(512),  -- Link to original policy
  
  -- Categorization
  category VARCHAR(100),  -- "admissions", "policies", "academic", "financial"
  tags JSONB DEFAULT '[]',  -- ["deadline", "registration"]
  
  -- Embedding (US-10)
  embedding_id VARCHAR(256),  -- Reference to FAISS vector
  chunk_index INT DEFAULT 0,  -- If document split into chunks
  chunk_count INT,  -- Total chunks for this document
  embedding_model_version INT,
  
  -- Freshness
  source_last_updated TIMESTAMP,  -- When original policy was updated
  indexed_at TIMESTAMP DEFAULT NOW(),
  
  -- Version Control
  version INT DEFAULT 1,
  is_latest BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CREATE INDEX idx_knowledge_items_category ON knowledge_items(category);
  CREATE INDEX idx_knowledge_items_embedding_id ON knowledge_items(embedding_id);
  CREATE INDEX idx_knowledge_items_is_latest ON knowledge_items(is_latest);
);
```

**Fields Breakdown**:
- `source_url`: Returned in knowledge base answers (SC-008: 100% of responses include sources)
- `embedding_id`: Reference to FAISS embedding for semantic search
- `chunk_index`: For large documents split into 500-token chunks with overlap
- `is_latest`: Only query latest version to avoid outdated information
- `embedding_model_version`: Track model version for retraining

**Batch Indexing Workflow** (nightly 12 AM UTC):
```
1. Fetch updated policy documents from source (LMS API, Google Drive, etc.)
2. FOR each document:
     a. Split into 500-token chunks with 100-token overlap
     b. Generate embeddings via Gemini API
     c. Insert KnowledgeItem records (is_latest=true)
     d. Mark previous version as is_latest=false
3. Rebuild FAISS index with all latest embeddings
4. Cache FAISS index to S3 (backup + fast restore)
```

**Knowledge Base Query** (US-10):
```
Student query: "What is the add/drop deadline?"
  → Embed query via Gemini
  → FAISS similarity search (top 3 matches)
  → Retrieve associated KnowledgeItems
  → Gemini LLM generates answer with context
  → Return answer + source_url + created_at
  (Response time <3 seconds, SC-008)
```

**Version Control Example**:
```
Day 1: Insert "Add/Drop Deadline: March 15" version=1, is_latest=true
Day 8: Updated policy "Add/Drop Deadline: March 22"
  → Insert new record version=2, is_latest=true
  → Mark old record is_latest=false (still accessible for audit)
```

**Validation Rules**:
- `title`: 1-255 characters
- `content`: 1-50,000 characters (single chunk size)
- `category`: Enum: admissions, policies, academic, financial, safety
- `source_url`: Valid URL format (http/https)

**Relationships**:
- Query (reverse): Which queries returned this item

---

### 9. Referral Entity

**Purpose**: Career opportunities and job postings  
**Used By**: US-07 (Career resources)

```sql
CREATE TABLE referrals (
  id BIGSERIAL PRIMARY KEY,
  
  -- Opportunity
  company_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  job_description TEXT,
  
  -- Details
  location VARCHAR(255),
  employment_type ENUM('full-time', 'part-time', 'internship', 'contract'),
  salary_range_min DECIMAL(10,2),
  salary_range_max DECIMAL(10,2),
  
  -- Application
  application_url VARCHAR(512),
  apply_by_date DATE,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  
  -- Metadata
  industry VARCHAR(100),
  required_skills JSONB DEFAULT '[]',  -- ["Python", "React"]
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CREATE INDEX idx_referrals_company_name ON referrals(company_name);
  CREATE INDEX idx_referrals_employment_type ON referrals(employment_type);
);
```

**Fields Breakdown**:
- `salary_range_min/max`: Optional (null if not specified)
- `required_skills`: JSONB array for filtering
- `is_public`: Can be private (for specific students/cohorts)

**Career Resource Display** (US-07):
```
Student views Career tab → Browse referrals
  ↓
Display: Company | Job Title | Location | Salary | Skills | Apply button
  ↓
Filter by: Employment type, Salary, Skills, Company
  ↓
Student clicks apply → Redirected to application_url
```

**Validation Rules**:
- `company_name`: 1-255 characters
- `job_title`: 1-255 characters
- `salary_range_min` < `salary_range_max` (if both provided)
- `apply_by_date`: Must be in future

---

## Entity Relationships Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User                                 │
│  (id, email, first_name, role, is_verified, widget_prefs)   │
└────┬──────────────────────────┬──────────────────────────┬───┘
     │ (instructor)             │ (student)                │ (author)
     │                          │                          │
┌────▼──────────┐      ┌────────▼─────────┐       ┌──────┴──────────┐
│    Course     │      │  Enrollment      │       │   ForumPost     │
│  (title, dept)│◀─────│  (student←→course)│       │  (content, anon)│
└────┬──────────┘      └──────────────────┘       └──────┬──────────┘
     │                                                     │ (replies)
     │                                              ┌──────▼──────────┐
     │                                              │   ForumPost     │
     └─────────────────────┬──────────────────────┐ │  (nested)       │
                           │                      │ └─────────────────┘
                    ┌──────▼────────┐             │
                    │    Material   │             │
                    │  (file, emb)  │             │
                    └───────────────┘             │
                                                  │
┌──────────────┐  ┌──────────────────┐  ┌────────┴──────────────┐
│  Message     │  │  Mentorship      │  │   Recommendation      │
│ (sender, rec)│  │  (mentor, mentee) │  │  (user, course, score)│
└──────────────┘  └──────────────────┘  └───────────────────────┘

┌──────────────────┐
│  KnowledgeItem   │
│  (doc, emb, cat) │
└──────────────────┘

┌──────────────┐
│  Referral    │
│  (job, comp) │
└──────────────┘
```

---

## State Management & Transitions

### User Lifecycle
```
Registration
  → is_verified=false (email verification pending)
  → Email sent with verification_token
  → User clicks link
  → is_verified=true, verified_at=now
  → Can now login

Active user → Login
  → last_login_at=now, login_count++
  → last_active_at=now

Forum violation
  → violation_count++
  → If violation_count ≥ 3
    → status='suspended', suspend_until=now+30days
    → Cannot post/reply in forums

Suspension expires
  → status='active', violation_count reset
```

### Course Lifecycle
```
Instructor creates course
  → status='draft' (invisible to students)
  → Instructor uploads materials

Instructor publishes
  → status='published', published_at=now
  → Visible to all students
  → Students can enroll

Course ends
  → status='archived' (read-only access)
```

### Recommendation Lifecycle
```
Daily batch job (2 AM UTC)
  → Generate recommendations for all users
  → Insert new Recommendation records
  → DELETE old recommendations >7 days
  → Score tracked: relevance_score, algorithm

User clicks recommendation
  → is_clicked=true, clicked_at=now
  → Track engagement for accuracy

User enrolls from recommendation
  → is_enrolled=true, enrolled_at=now
  → Track conversion for model evaluation
```

---

## Indexes & Performance

**Primary Indexes** (for query filtering):
```sql
-- Users
CREATE INDEX idx_users_email ON users(email);  -- Login
CREATE INDEX idx_users_role ON users(role);     -- Admin queries

-- Courses
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);  -- Course listing
CREATE INDEX idx_courses_status ON courses(status);  -- Filter published

-- Materials
CREATE INDEX idx_materials_course_id ON materials(course_id);  -- Course materials list
CREATE INDEX idx_materials_category ON materials(category);     -- Filter by type
CREATE INDEX idx_materials_is_searchable ON materials(is_searchable);  -- Full-text

-- ForumPosts
CREATE INDEX idx_forum_posts_course_id ON forum_posts(course_id);  -- Course forum
CREATE INDEX idx_forum_posts_is_removed ON forum_posts(is_removed);  -- Hide removed

-- Messages
CREATE INDEX idx_messages_recipient_id_is_read ON messages(recipient_id, is_read);  -- Notifications
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);  -- Thread load

-- Recommendations
CREATE INDEX idx_recommendations_user_id_created_at ON recommendations(user_id, created_at DESC);  -- Recent
CREATE INDEX idx_recommendations_user_id_ranking ON recommendations(user_id, ranking);  -- Top 5
```

**Performance Targets**:
- Course list (<200ms): Indexed on (status, instructor_id)
- Material filter (<200ms): Indexed on (course_id, category)
- Forum load (<500ms): Indexed on (course_id, is_removed)
- Message notification (<100ms): Indexed on (recipient_id, is_read)
- Recommendation display (<300ms): Indexed on (user_id, ranking)

---

## Migration Strategy

**Alembic Migration Process**:
```bash
# Developer creates migration
alembic revision --autogenerate -m "add_widget_preferences_to_users"

# Developer tests locally
pytest tests/integration/test_migrations.py

# Team reviews migration
# → Test on staging database
# → Verify backward compatibility
# → Plan rollback if needed

# Deploy to production
# → Run migration: alembic upgrade head
# → Monitor database performance
# → Verify application functionality
```

**Zero-Downtime Deployment** (for large tables):
```sql
-- Option 1: Add column with default (non-blocking)
ALTER TABLE users ADD COLUMN widget_preferences JSONB DEFAULT '{}';

-- Option 2: Add index in background
CREATE INDEX CONCURRENTLY idx_users_role ON users(role);

-- Option 3: Backfill data in batches (doesn't lock table)
UPDATE users SET widget_preferences = '{"visible": [...]}' 
WHERE widget_preferences IS NULL LIMIT 1000;
```

---

## Data Validation & Constraints

**Database Constraints**:
```sql
-- Unique constraints
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE(email);
ALTER TABLE courses ADD CONSTRAINT uq_courses_code UNIQUE(course_code, semester);

-- Foreign key constraints
ALTER TABLE courses ADD CONSTRAINT fk_courses_instructor_id 
  FOREIGN KEY(instructor_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Check constraints
ALTER TABLE recommendations ADD CONSTRAINT ck_relevance_score 
  CHECK (relevance_score >= 0 AND relevance_score <= 1);

-- Non-null constraints
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE courses ALTER COLUMN title SET NOT NULL;
```

**Application-Level Validation** (Pydantic models in backend):
```python
class UserCreate(BaseModel):
    email: EmailStr  # RFC 5321
    password: str  # min 12 chars, regex validation
    first_name: str  # 1-100 chars
    role: Literal["student", "instructor", "admin"]
    
    @field_validator("email")
    @classmethod
    def validate_university_email(cls, v):
        if not v.endswith("@university.edu"):
            raise ValueError("Must use university email")
        return v
```

---

**Data Model Complete**: Ready for API contract generation and quickstart setup
