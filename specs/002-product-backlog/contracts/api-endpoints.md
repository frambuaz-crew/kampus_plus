# API Contracts - Product Backlog Feature

**Status**: Contract Specifications Complete  
**Date**: 2025-12-24  
**Framework**: FastAPI (OpenAPI 3.0)  
**Authentication**: JWT Bearer Token (all endpoints except /auth/register and /auth/login)

---

## Authentication Contracts

### 1. User Registration Endpoint (US-01)

**Route**: `POST /api/v1/auth/register`  
**Requirement**: FR-001 (Secure registration with email verification)  
**Authentication**: None (public endpoint)

**Request**:
```json
{
  "email": "student@university.edu",
  "password": "SecurePass123!@#",
  "first_name": "John",
  "last_name": "Doe",
  "student_id": "STU123456",
  "role": "student"
}
```

**Validation**:
- `email`: Must be valid university domain (@university.edu), max 255 chars
- `password`: Min 12 chars, must contain uppercase, lowercase, digit, special char
- `first_name`, `last_name`: 1-100 chars, no special chars
- `student_id`: 6-50 alphanumeric (optional for non-students)
- `role`: Enum: "student" | "instructor" | "admin"

**Response (201 Created)**:
```json
{
  "id": 12345,
  "email": "student@university.edu",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "is_verified": false,
  "created_at": "2025-12-24T10:00:00Z",
  "message": "Registration successful. Please check your email for verification link."
}
```

**Response (400 Bad Request)**:
```json
{
  "detail": "Email already registered",
  "error_code": "EMAIL_EXISTS"
}
```

**Response (422 Unprocessable Entity)**:
```json
{
  "detail": [
    {
      "loc": ["body", "password"],
      "msg": "Password must contain at least one special character",
      "type": "value_error"
    }
  ]
}
```

**Side Effects**:
- Account created with `is_verified=false`
- Verification email sent (SendGrid, <2 min delivery, SC-001)
- Verification token expires 24 hours
- Log: User registration event (no PII in AI logs)

**Acceptance Scenarios**: Maps to US-01 scenarios 1-5

---

### 2. Email Verification Endpoint (US-01)

**Route**: `POST /api/v1/auth/verify-email`  
**Requirement**: FR-001 (24-hour verification)  
**Authentication**: None

**Request**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK)**:
```json
{
  "id": 12345,
  "email": "student@university.edu",
  "is_verified": true,
  "verified_at": "2025-12-24T10:05:00Z",
  "message": "Email verified successfully. You can now login."
}
```

**Response (400 Bad Request - Expired)**:
```json
{
  "detail": "Verification link has expired",
  "error_code": "TOKEN_EXPIRED",
  "action": "resend"
}
```

**Response (400 Bad Request - Invalid)**:
```json
{
  "detail": "Invalid verification token",
  "error_code": "INVALID_TOKEN"
}
```

**Side Effects**:
- User.is_verified = true
- User.verified_at = NOW()
- Email verification attempt logged (audit trail)

---

### 3. Resend Verification Email Endpoint (US-01)

**Route**: `POST /api/v1/auth/resend-verification`  
**Requirement**: FR-001 (Email resend)  
**Authentication**: None

**Request**:
```json
{
  "email": "student@university.edu"
}
```

**Rate Limiting**: 3 resend attempts per hour per email

**Response (200 OK)**:
```json
{
  "message": "Verification email sent",
  "resend_available_after": "2025-12-24T10:10:00Z"
}
```

**Response (429 Too Many Requests)**:
```json
{
  "detail": "Too many resend attempts. Try again later.",
  "retry_after": 3600
}
```

---

### 4. Login Endpoint (US-01)

**Route**: `POST /api/v1/auth/login`  
**Requirement**: FR-001 (Authentication)  
**Authentication**: None

**Request**:
```json
{
  "email": "student@university.edu",
  "password": "SecurePass123!@#"
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 12345,
    "email": "student@university.edu",
    "first_name": "John",
    "role": "student"
  }
}
```

**Response (401 Unauthorized)**:
```json
{
  "detail": "Invalid email or password",
  "error_code": "INVALID_CREDENTIALS"
}
```

**Response (403 Forbidden - Unverified)**:
```json
{
  "detail": "Please verify your email address before logging in",
  "error_code": "EMAIL_NOT_VERIFIED",
  "action": "resend_verification"
}
```

**Response (403 Forbidden - Suspended)**:
```json
{
  "detail": "Your account is suspended until 2025-12-31",
  "error_code": "ACCOUNT_SUSPENDED"
}
```

**Side Effects**:
- User.last_login_at = NOW()
- User.login_count += 1
- Login event logged

---

## Course Management Contracts

### 5. Upload Course Material Endpoint (US-03)

**Route**: `POST /api/v1/courses/{course_id}/materials`  
**Requirement**: FR-003 (Upload PDF, DOCX, PPTX, XLSX with categories)  
**Authentication**: JWT Bearer, role must be instructor  
**Authorization**: User must be course instructor

**Request** (multipart/form-data):
```
Content-Type: multipart/form-data

file: <binary PDF/DOCX/PPTX/XLSX>
title: "Lecture 1 - Introduction"
category: "lecture"
topic: "Chapter 1"
description: "Welcome to the course"
```

**File Validation**:
- Max size: 500MB
- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-powerpoint, application/vnd.ms-excel
- Extension whitelist: .pdf, .docx, .pptx, .xlsx

**Response (201 Created)**:
```json
{
  "id": 5001,
  "course_id": 101,
  "title": "Lecture 1 - Introduction",
  "category": "lecture",
  "topic": "Chapter 1",
  "file_size_bytes": 2048576,
  "mime_type": "application/pdf",
  "is_searchable": true,
  "created_at": "2025-12-24T10:00:00Z",
  "file_url": "/api/v1/materials/5001/download"
}
```

**Response (413 Payload Too Large)**:
```json
{
  "detail": "File exceeds 500MB limit",
  "error_code": "FILE_TOO_LARGE"
}
```

**Response (422 Unprocessable Entity)**:
```json
{
  "detail": "File type not supported. Use PDF, DOCX, PPTX, or XLSX",
  "error_code": "INVALID_FILE_TYPE"
}
```

**Side Effects**:
- File uploaded to MinIO S3 (file_key: courses/{course_id}/{material_id}.{ext})
- Material record created with metadata
- OCR triggered asynchronously (if image/PDF)
- Embedding queued for knowledge base (if applicable)
- Storage used incremented

**Performance**: SC-003 (95%+ uploads within 30 seconds)

---

### 6. List Course Materials Endpoint (US-03)

**Route**: `GET /api/v1/courses/{course_id}/materials`  
**Requirement**: FR-004 (Filter and sort materials)  
**Authentication**: JWT Bearer

**Query Parameters**:
```
category=lecture&sort=date&order=desc&limit=20&offset=0
```

**Response (200 OK)**:
```json
{
  "materials": [
    {
      "id": 5001,
      "title": "Lecture 1 - Introduction",
      "category": "lecture",
      "topic": "Chapter 1",
      "file_size_bytes": 2048576,
      "uploaded_by": "Dr. Smith",
      "uploaded_at": "2025-12-24T10:00:00Z",
      "file_url": "/api/v1/materials/5001/download"
    },
    {
      "id": 5002,
      "title": "Exercise Sheet 1",
      "category": "exercise",
      "topic": "Chapter 1 Exercises",
      "file_size_bytes": 512000,
      "uploaded_by": "Dr. Smith",
      "uploaded_at": "2025-12-23T15:30:00Z",
      "file_url": "/api/v1/materials/5002/download"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0,
  "has_next": true
}
```

---

## Chat & AI Contracts

### 7. AI Chat Endpoint (US-04)

**Route**: `POST /api/v1/courses/{course_id}/chat`  
**Requirement**: FR-005 (AI responses within 5 seconds), FR-006 (No PII in logs)  
**Authentication**: JWT Bearer, role=student  
**Rate Limit**: 10 requests/minute per user

**Request**:
```json
{
  "question": "How do I solve quadratic equations?",
  "context": "We're studying Chapter 3"
}
```

**Response (200 OK)**:
```json
{
  "answer": "To solve quadratic equations, use the quadratic formula: x = (-b ± √(b²-4ac)) / 2a. This works for equations in the form ax² + bx + c = 0. Let me explain each part...",
  "sources": [
    {
      "material_id": 5001,
      "title": "Lecture 3 - Quadratic Equations",
      "url": "/api/v1/materials/5001/download"
    }
  ],
  "response_time_ms": 3200,
  "model": "gemini-1.5-pro",
  "timestamp": "2025-12-24T10:00:00Z"
}
```

**Response (408 Request Timeout)**:
```json
{
  "detail": "AI response took too long (>5 seconds)",
  "error_code": "AI_TIMEOUT"
}
```

**Response (429 Too Many Requests)**:
```json
{
  "detail": "Rate limit exceeded: 10 requests/minute",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 6
}
```

**Side Effects**:
- Question anonymized (no student ID/name sent to Gemini)
- Question + response logged locally (hashed, no PII)
- Response time tracked (performance metrics)
- Vector embedding generated for future knowledge base

**Performance**: SC-005 (Responses within 5 seconds with ≥80% user satisfaction)

---

### 8. Knowledge Base Query Endpoint (US-10)

**Route**: `GET /api/v1/knowledge-base/search`  
**Requirement**: FR-015 (Answers with sources within 3 seconds)  
**Authentication**: JWT Bearer  
**Rate Limit**: 10 requests/minute per user

**Query Parameters**:
```
q=What+is+the+add+drop+deadline&limit=3
```

**Response (200 OK)**:
```json
{
  "query": "What is the add drop deadline?",
  "results": [
    {
      "id": 1001,
      "title": "Add/Drop Deadline Policy",
      "excerpt": "The deadline for adding or dropping courses is March 15, 2025 at 11:59 PM EST.",
      "category": "academic",
      "source_url": "https://registrar.university.edu/policies/add-drop",
      "confidence": 0.98,
      "last_updated": "2025-12-20T00:00:00Z"
    },
    {
      "id": 1002,
      "title": "Registration and Course Changes",
      "excerpt": "Students may add courses until March 15 and drop courses until April 15.",
      "category": "academic",
      "source_url": "https://registrar.university.edu/policies/registration",
      "confidence": 0.92,
      "last_updated": "2025-12-20T00:00:00Z"
    }
  ],
  "response_time_ms": 1800,
  "total": 2
}
```

**Response (408 Request Timeout)**:
```json
{
  "detail": "Knowledge base search took too long (>3 seconds)",
  "error_code": "KB_TIMEOUT"
}
```

**Side Effects**:
- Query embedding generated (semantic search)
- FAISS similarity search executed
- Results ranked by relevance + recency
- Query logged for analytics (no PII)

**Performance**: SC-008 (Within 3 seconds, 100% of responses include sources)

---

## Forum Contracts

### 9. Create Forum Topic Endpoint (US-05, US-09)

**Route**: `POST /api/v1/courses/{course_id}/forum`  
**Requirement**: FR-012 (Anonymous posting support)  
**Authentication**: JWT Bearer

**Request**:
```json
{
  "title": "How to approach problem set 3?",
  "content": "I'm stuck on question 5. Can anyone help?",
  "is_anonymous": true
}
```

**Response (201 Created)**:
```json
{
  "id": 4001,
  "course_id": 101,
  "title": "How to approach problem set 3?",
  "content": "I'm stuck on question 5. Can anyone help?",
  "author_name": "a3f8d2e1c4b9",
  "is_anonymous": true,
  "reply_count": 0,
  "created_at": "2025-12-24T10:00:00Z"
}
```

**Privacy Note**: If `is_anonymous=true`, `author_name` is anonymous ID (SHA256 hash consistent per course)

---

### 10. Flag Forum Post Endpoint (US-05)

**Route**: `POST /api/v1/forum-posts/{post_id}/flag`  
**Requirement**: FR-007 (Flag for moderation)  
**Authentication**: JWT Bearer

**Request**:
```json
{
  "reason": "Offensive content"
}
```

**Response (200 OK)**:
```json
{
  "id": 4001,
  "is_flagged": true,
  "flagged_at": "2025-12-24T10:05:00Z",
  "message": "Post flagged for review"
}
```

---

### 11. Moderation Queue Endpoint (US-05)

**Route**: `GET /api/v1/admin/moderation-queue`  
**Requirement**: FR-007 (Admin moderation panel)  
**Authentication**: JWT Bearer, role=admin

**Query Parameters**:
```
status=flagged&sort=created_at&order=asc&limit=20
```

**Response (200 OK)**:
```json
{
  "queue": [
    {
      "id": 4001,
      "post_title": "How to approach problem set 3?",
      "post_content": "I'm stuck on question 5. Can anyone help?",
      "author_name": "a3f8d2e1c4b9",
      "is_anonymous": true,
      "flag_reason": "Offensive content",
      "flagged_at": "2025-12-24T10:05:00Z",
      "flag_count": 3,
      "actions": ["approve", "remove", "suspend_user"]
    }
  ],
  "total": 15,
  "unreviewed_count": 3
}
```

---

### 12. Remove Forum Post Endpoint (US-05)

**Route**: `POST /api/v1/admin/forum-posts/{post_id}/remove`  
**Requirement**: FR-007 (Moderator removes post)  
**Authentication**: JWT Bearer, role=admin

**Request**:
```json
{
  "reason": "Offensive language violates community guidelines"
}
```

**Response (200 OK)**:
```json
{
  "id": 4001,
  "is_removed": true,
  "removal_reason": "Offensive language violates community guidelines",
  "moderated_by": "admin_id_12345",
  "removed_at": "2025-12-24T10:10:00Z",
  "message": "Post has been removed from the forum"
}
```

**Side Effects**:
- ForumPost.is_removed = true
- ForumPost.moderated_by_id = admin_id
- Post hidden from all student views
- Moderator action logged (audit trail)

---

## Messaging Contracts

### 13. Send Direct Message Endpoint (US-08)

**Route**: `POST /api/v1/messages`  
**Requirement**: FR-011 (1-on-1 messaging with read receipts)  
**Authentication**: JWT Bearer  
**Transport**: REST (for message creation), WebSocket (for real-time delivery)

**Request**:
```json
{
  "recipient_id": 12346,
  "content": "Hi, do you have notes from today's lecture?"
}
```

**Response (201 Created)**:
```json
{
  "id": 3001,
  "sender_id": 12345,
  "recipient_id": 12346,
  "content": "Hi, do you have notes from today's lecture?",
  "is_read": false,
  "created_at": "2025-12-24T10:00:00Z",
  "delivered_at": "2025-12-24T10:00:03Z"
}
```

**WebSocket Event** (sent to recipient within 2 minutes):
```json
{
  "event": "new_message",
  "message": {
    "id": 3001,
    "sender_id": 12345,
    "sender_name": "John Doe",
    "content": "Hi, do you have notes from today's lecture?",
    "created_at": "2025-12-24T10:00:00Z"
  }
}
```

**Performance**: SC-006 (Message delivery <5 seconds, notification <2 minutes)

---

### 14. Get Conversation Endpoint (US-08)

**Route**: `GET /api/v1/messages/conversations/{user_id}`  
**Requirement**: FR-011 (Message history persistence)  
**Authentication**: JWT Bearer

**Query Parameters**:
```
limit=50&offset=0
```

**Response (200 OK)**:
```json
{
  "messages": [
    {
      "id": 3001,
      "sender_id": 12345,
      "recipient_id": 12346,
      "content": "Hi, do you have notes from today's lecture?",
      "is_read": true,
      "read_at": "2025-12-24T10:02:00Z",
      "created_at": "2025-12-24T10:00:00Z"
    },
    {
      "id": 3002,
      "sender_id": 12346,
      "recipient_id": 12345,
      "content": "Yes! I'll send them to you after class.",
      "is_read": true,
      "read_at": "2025-12-24T10:05:00Z",
      "created_at": "2025-12-24T10:03:00Z"
    }
  ],
  "total": 15,
  "has_next": true,
  "unread_count": 0
}
```

---

### 15. Mark Message as Read Endpoint (US-08)

**Route**: `POST /api/v1/messages/{message_id}/read`  
**Requirement**: FR-011 (Read receipts)  
**Authentication**: JWT Bearer

**Request**: (empty body)

**Response (200 OK)**:
```json
{
  "id": 3001,
  "is_read": true,
  "read_at": "2025-12-24T10:02:00Z"
}
```

**WebSocket Event** (sent to sender):
```json
{
  "event": "message_read",
  "message_id": 3001,
  "read_by": 12346,
  "read_at": "2025-12-24T10:02:00Z"
}
```

---

## Dashboard Contracts

### 16. Get Dashboard Endpoint (US-13)

**Route**: `GET /api/v1/dashboard`  
**Requirement**: FR-018 (Display customizable widgets)  
**Authentication**: JWT Bearer

**Response (200 OK)**:
```json
{
  "widgets": {
    "active_courses": {
      "type": "active_courses",
      "title": "My Courses",
      "visible": true,
      "order": 1,
      "data": [
        {
          "course_id": 101,
          "course_name": "Data Structures",
          "instructor": "Dr. Smith",
          "progress_percentage": 65,
          "next_deadline": "2025-12-28T23:59:00Z"
        }
      ]
    },
    "gpa_card": {
      "type": "gpa_card",
      "title": "Academic Performance",
      "visible": true,
      "order": 2,
      "data": {
        "gpa": 3.75,
        "gpa_trend": "up",
        "courses_this_semester": 4
      }
    },
    "upcoming_assignments": {
      "type": "upcoming_assignments",
      "title": "Upcoming Work",
      "visible": true,
      "order": 3,
      "data": [
        {
          "assignment_id": 2001,
          "course_name": "Data Structures",
          "title": "Problem Set 5",
          "due_at": "2025-12-28T23:59:00Z",
          "days_remaining": 4
        }
      ]
    },
    "recommendations": {
      "type": "recommendations",
      "title": "Recommended for You",
      "visible": true,
      "order": 4,
      "data": [
        {
          "course_id": 105,
          "course_name": "Machine Learning Fundamentals",
          "reason": "Popular with students like you",
          "relevance_score": 0.92
        }
      ]
    }
  },
  "last_updated": "2025-12-24T10:00:00Z"
}
```

**Performance**: SC-011 (Dashboard loads with all widgets within 3 seconds)

---

### 17. Update Widget Preferences Endpoint (US-13)

**Route**: `PUT /api/v1/dashboard/widgets`  
**Requirement**: FR-019 (Customize widget visibility and order)  
**Authentication**: JWT Bearer

**Request**:
```json
{
  "widget_preferences": {
    "visible": ["active_courses", "gpa_card", "upcoming_assignments", "recommendations"],
    "order": [1, 2, 3, 4],
    "settings": {
      "active_courses": {"show_progress": true}
    }
  }
}
```

**Response (200 OK)**:
```json
{
  "message": "Preferences updated",
  "widget_preferences": {
    "visible": ["active_courses", "gpa_card", "upcoming_assignments", "recommendations"],
    "order": [1, 2, 3, 4],
    "settings": {
      "active_courses": {"show_progress": true}
    }
  }
}
```

---

## Course Discovery Contracts

### 18. List Courses Endpoint (US-06)

**Route**: `GET /api/v1/courses`  
**Requirement**: FR-009 (Course discovery cards with ratings and filtering)  
**Authentication**: JWT Bearer

**Query Parameters**:
```
search=Python&sort=rating&order=desc&min_rating=4.0&limit=20&offset=0
```

**Response (200 OK)**:
```json
{
  "courses": [
    {
      "id": 101,
      "title": "Introduction to Python",
      "instructor": "Dr. Smith",
      "department": "Computer Science",
      "rating": 4.85,
      "review_count": 120,
      "enrollment_count": 450,
      "description": "Learn Python programming from basics to intermediate concepts",
      "credits": 3,
      "enrollment_status": "not_enrolled"
    },
    {
      "id": 102,
      "title": "Advanced Python",
      "instructor": "Prof. Johnson",
      "department": "Computer Science",
      "rating": 4.72,
      "review_count": 95,
      "enrollment_count": 280,
      "enrollment_status": "enrolled"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0,
  "has_next": true
}
```

---

### 19. Enroll in Course Endpoint (US-06)

**Route**: `POST /api/v1/courses/{course_id}/enroll`  
**Requirement**: FR-010 (Immediate enrollment effect)  
**Authentication**: JWT Bearer, role=student

**Request**: (empty body)

**Response (200 OK)**:
```json
{
  "course_id": 101,
  "status": "enrolled",
  "enrolled_at": "2025-12-24T10:00:00Z",
  "message": "You have been enrolled in Introduction to Python"
}
```

**Response (409 Conflict)**:
```json
{
  "detail": "Already enrolled in this course",
  "error_code": "ALREADY_ENROLLED"
}
```

**Performance**: SC-004 (Enrollment completes within 1 minute)

---

## Mentorship Contracts

### 20. Request Mentorship Endpoint (US-12)

**Route**: `POST /api/v1/mentors/{mentor_id}/request`  
**Requirement**: FR-017 (Mentorship requests)  
**Authentication**: JWT Bearer, role=student

**Request**:
```json
{
  "expertise_tags": ["career-planning", "resume-review"],
  "description": "Looking for guidance on transitioning to tech careers"
}
```

**Response (201 Created)**:
```json
{
  "id": 6001,
  "mentor_id": 12346,
  "mentee_id": 12345,
  "status": "pending",
  "expertise_tags": ["career-planning", "resume-review"],
  "description": "Looking for guidance on transitioning to tech careers",
  "created_at": "2025-12-24T10:00:00Z",
  "message": "Mentorship request sent to Dr. Smith"
}
```

---

### 21. Mentorship Response Endpoint (US-12)

**Route**: `POST /api/v1/mentorships/{mentorship_id}/accept`  
**Requirement**: FR-017 (Mentor approval)  
**Authentication**: JWT Bearer, role must be mentor

**Request**: (empty body)

**Response (200 OK)**:
```json
{
  "id": 6001,
  "status": "active",
  "accepted_at": "2025-12-24T10:05:00Z",
  "message": "Mentorship request accepted. Messaging channel opened."
}
```

**Side Effects**:
- Mentorship.status = 'active'
- Direct messaging channel opened automatically
- Notification sent to mentee

---

## Recommendations Contracts

### 22. Get Personalized Recommendations Endpoint (US-14)

**Route**: `GET /api/v1/recommendations`  
**Requirement**: FR-020 (Personalized course suggestions)  
**Authentication**: JWT Bearer, role=student

**Query Parameters**:
```
limit=5
```

**Response (200 OK)**:
```json
{
  "recommendations": [
    {
      "course_id": 105,
      "course_name": "Machine Learning Fundamentals",
      "instructor": "Prof. Chen",
      "rating": 4.8,
      "reason": "Popular with students like you",
      "relevance_score": 0.95,
      "ranking": 1
    },
    {
      "course_id": 106,
      "course_name": "Data Science with Python",
      "instructor": "Dr. Brown",
      "rating": 4.7,
      "reason": "Matches your interest in AI",
      "relevance_score": 0.91,
      "ranking": 2
    }
  ],
  "model_version": 5,
  "generated_at": "2025-12-24T02:00:00Z",
  "engagement_metrics": {
    "click_through_rate": 0.12,
    "enrollment_rate": 0.08
  }
}
```

**Performance**: SC-012 (Recommendations shown to 90%+ of active students), SC-013 (Accuracy improves 15% after 4 weeks)

---

## Common Response Patterns

### Error Response (400, 401, 403, 404, 500)

**Generic Error Format**:
```json
{
  "detail": "Human-readable error message",
  "error_code": "MACHINE_READABLE_CODE",
  "timestamp": "2025-12-24T10:00:00Z",
  "request_id": "req-12345abcde",
  "path": "/api/v1/endpoint",
  "method": "POST"
}
```

### Pagination Response (for list endpoints)

**All list endpoints include**:
```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 40,
  "has_next": true,
  "has_previous": true,
  "next_offset": 60,
  "prev_offset": 20
}
```

### Authentication Header

**All authenticated endpoints require**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**JWT Payload**:
```json
{
  "sub": "user_id_12345",
  "email": "student@university.edu",
  "role": "student",
  "iat": 1703325600,
  "exp": 1703412000
}
```

---

## OpenAPI/Swagger Documentation

All endpoints auto-documented via FastAPI:
```
GET /api/v1/docs              → Swagger UI
GET /api/v1/redoc             → ReDoc
GET /api/v1/openapi.json      → OpenAPI 3.0 schema
```

---

**API Contracts Complete**: 22 endpoints covering all 14 user stories, ready for implementation.
