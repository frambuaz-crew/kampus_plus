# KAMPÜS+ Platform - API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:8000/v1` (Development)  
**Production URL**: `https://api.kampusplus.edu.tr/v1`  
**Last Updated**: 2025-01-XX

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Swagger UI](#swagger-ui)
8. [Code Examples](#code-examples)

---

## Overview

KAMPÜS+ API is a RESTful API built with FastAPI supporting 14 user stories across authentication, content management, AI assistance, community engagement, and personalization. All endpoints (except authentication) require JWT Bearer token authentication. The API follows OpenAPI 3.0 specification and provides automatic interactive documentation via Swagger UI.

### Feature Coverage

**Priority P1 (Critical)**:
- US-01: Student Registration & Email Verification
- US-02: Responsive Navigation Sidebar (frontend-only)
- US-03: Course Content Upload & Organization
- US-08: Direct Messaging System
- US-10: Knowledge Base & AI-Powered Q&A

**Priority P2 (High)**:
- US-04: AI-Powered Study Assistant
- US-05: Forum Moderation & Content Management
- US-06: Course Discovery & Enrollment
- US-09: Anonymous Forum Discussion
- US-13: Dashboard with Personalized Widgets

**Priority P3 (Enhancement)**:
- US-07: Career Resources & Job Referral System
- US-11: Image Extraction & Document OCR
- US-12: Mentor Matching & Mentorship Network
- US-14: AI-Powered Course Recommendations

### Base Information

- **API Version**: v1
- **Content-Type**: `application/json`
- **Authentication**: JWT Bearer token (except `/auth/*` endpoints)
- **Response Format**: JSON
- **Character Encoding**: UTF-8

### Quick Links

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Spec**: `specs/001-ai-platform/contracts/openapi.yaml`

---

## Authentication

### JWT Token Flow

1. **Login**: `POST /v1/auth/login` → Returns access token + refresh token cookie
2. **Access Protected Endpoints**: Include `Authorization: Bearer {access_token}` header
3. **Token Expiry**: Access token expires in 15 minutes
4. **Refresh Token**: Call `POST /v1/auth/refresh` to get new access token
5. **Logout**: `POST /v1/auth/logout` → Revokes refresh token

### Authentication Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Structure

**Access Token (JWT)**:
```json
{
  "sub": "user-uuid",
  "email": "student@university.edu.tr",
  "role": "student",
  "exp": 1234567890,
  "iat": 1234567800
}
```

---

## API Endpoints

### Authentication Endpoints

#### Register User

```http
POST /v1/auth/register
```

**Request Body**:
```json
{
  "email": "student@university.edu.tr",
  "password": "SecurePassword123!",
  "first_name": "Ahmet",
  "last_name": "Yılmaz",
  "role": "student",
  "student_id": "20211234567"
}
```

**Response** (201 Created):
```json
{
  "message": "User created successfully. Please check your email for verification.",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email format or password too weak
- `409 Conflict`: Email already registered

---

#### Login

```http
POST /v1/auth/login
```

**Request Body**:
```json
{
  "email": "student@university.edu.tr",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@university.edu.tr",
    "role": "student",
    "first_name": "Ahmet",
    "last_name": "Yılmaz"
  }
}
```

**Headers**:
- `Set-Cookie`: `refresh_token=...; HttpOnly; Secure; SameSite=Strict`

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Email not verified or account inactive

---

#### Refresh Token

```http
POST /v1/auth/refresh
```

**Request**: No body required (uses refresh token from cookie)

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token

---

#### Logout

```http
POST /v1/auth/logout
```

**Request**: Requires authentication

**Response** (204 No Content)

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

---

#### Verify Email

```http
POST /v1/auth/verify-email
```

**Request Body**:
```json
{
  "token": "email-verification-token-from-email"
}
```

**Response** (200 OK):
```json
{
  "message": "Email verified successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid or expired token

---

#### Resend Verification Email

```http
POST /v1/auth/resend-verification
```

**Request Body**:
```json
{
  "email": "student@university.edu.tr"
}
```

**Response** (200 OK):
```json
{
  "message": "If the email exists and is not verified, a verification email has been sent."
}
```

**Note**: Always returns 200 to prevent email enumeration attacks.

**Error Responses**:
- `400 Bad Request`: Email already verified

---

#### Forgot Password

```http
POST /v1/auth/forgot-password
```

**Request Body**:
```json
{
  "email": "student@university.edu.tr"
}
```

**Response** (200 OK):
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

**Note**: Always returns 200 to prevent email enumeration attacks.

---

#### Reset Password

```http
POST /v1/auth/reset-password
```

**Request Body**:
```json
{
  "token": "password-reset-token-from-email",
  "new_password": "NewSecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid token or password too weak

---

### Chat Endpoints

#### Create Chat Session

```http
POST /v1/chat/sessions
```

**Request Body** (optional):
```json
{
  "title": "My Chat Session"
}
```

**Response** (201 Created):
```json
{
  "session_id": "660e8400-e29b-41d4-a716-446655440000",
  "title": "My Chat Session",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

#### List Chat Sessions

```http
GET /v1/chat/sessions?limit=20&offset=0&include_inactive=false
```

**Query Parameters**:
- `limit` (optional): Number of sessions to return (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `include_inactive` (optional): Include soft-deleted sessions (default: false)

**Response** (200 OK):
```json
{
  "sessions": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "title": "My Chat Session",
      "message_count": 5,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T11:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

#### Get Chat Session

```http
GET /v1/chat/sessions/{session_id}
```

**Response** (200 OK):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "title": "My Chat Session",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T11:00:00Z",
  "messages": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "role": "user",
      "content": "BİL101 dersi ne zaman?",
      "created_at": "2025-01-15T10:31:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "role": "assistant",
      "content": "BİL101 dersi Pazartesi ve Çarşamba günleri 10:00-12:00 saatleri arasında yapılmaktadır.",
      "sources": [
        {
          "type": "official",
          "id": "990e8400-e29b-41d4-a716-446655440000",
          "title": "BİL101 Ders Programı",
          "relevance": 0.95,
          "page_number": 1
        }
      ],
      "created_at": "2025-01-15T10:31:05Z"
    }
  ]
}
```

**Error Responses**:
- `403 Forbidden`: Session belongs to another user
- `404 Not Found`: Session not found

---

#### Send Message

```http
POST /v1/chat/sessions/{session_id}/messages
```

**Request Body**:
```json
{
  "content": "BİL101 dersi ne zaman?"
}
```

**Response** (200 OK):
```json
{
  "message_id": "880e8400-e29b-41d4-a716-446655440000",
  "role": "assistant",
  "content": "BİL101 dersi Pazartesi ve Çarşamba günleri 10:00-12:00 saatleri arasında yapılmaktadır.",
  "sources": [
    {
      "type": "official",
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "title": "BİL101 Ders Programı",
      "relevance": 0.95,
      "page_number": 1,
      "url": null
    }
  ],
  "created_at": "2025-01-15T10:31:05Z"
}
```

**Processing Time**: Typically 2-5 seconds (AI query + RAG retrieval)

**Error Responses**:
- `403 Forbidden`: Session belongs to another user
- `404 Not Found`: Session not found
- `429 Too Many Requests`: Rate limit exceeded (10 AI queries/minute)

---

#### Delete Chat Session

```http
DELETE /v1/chat/sessions/{session_id}
```

**Response** (204 No Content)

**Error Responses**:
- `403 Forbidden`: Session belongs to another user
- `404 Not Found`: Session not found

---

### Course Endpoints

#### Get My Courses

```http
GET /v1/courses/my-courses
```

**Response** (200 OK):
```json
{
  "courses": [
    {
      "id": "110e8400-e29b-41d4-a716-446655440000",
      "code": "BİL101",
      "name": "Bilgisayar Bilimlerine Giriş",
      "department": "Bilgisayar Mühendisliği",
      "semester": "2024-Fall",
      "credits": 3,
      "instructor_name": "Prof. Dr. Mehmet Demir",
      "schedule": {
        "days": ["Monday", "Wednesday"],
        "time": "10:00-12:00",
        "location": "A-101"
      }
    }
  ]
}
```

---

#### Course Discovery (US-06)

```http
GET /v1/courses?limit=20&offset=0&rating_min=4.5&sort_by=popular
```

**Query Parameters**:
- `limit` (optional): Number of courses (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `rating_min` (optional): Minimum rating filter (1.0-5.0)
- `sort_by` (optional): Sort order (`popular`, `rating`, `newest`, `alphabetical`)

**Response** (200 OK):
```json
{
  "courses": [
    {
      "id": "110e8400-e29b-41d4-a716-446655440000",
      "code": "BİL101",
      "name": "Bilgisayar Bilimlerine Giriş",
      "instructor_name": "Prof. Dr. Mehmet Demir",
      "rating": 4.7,
      "enrollment_count": 245,
      "review_count": 32,
      "department": "Bilgisayar Mühendisliği",
      "credits": 3
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

#### Enroll in Course (US-06)

```http
POST /v1/courses/{course_id}/enroll
```

**Response** (200 OK):
```json
{
  "message": "Successfully enrolled in course",
  "enrollment_id": "220e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:
- `403 Forbidden`: Course is full or enrollment closed
- `409 Conflict`: Already enrolled

---

#### Upload Course Material (US-03) - Instructor Only

```http
POST /v1/courses/{course_id}/materials
Content-Type: multipart/form-data
```

**Request Body** (multipart/form-data):
- `file`: PDF/DOCX/PPTX/XLSX file (max 25MB)
- `title`: Material title
- `category`: `lecture`, `exercise`, `assignment`, `reading`, `exam_prep`

**Response** (201 Created):
```json
{
  "material_id": "330e8400-e29b-41d4-a716-446655440000",
  "title": "Lecture 1: Introduction",
  "category": "lecture",
  "file_size": 1048576,
  "uploaded_at": "2025-01-15T10:30:00Z"
}
```

---

#### List Course Materials (US-03)

```http
GET /v1/courses/{course_id}/materials?category=lecture&sort_by=latest
```

**Query Parameters**:
- `category` (optional): Filter by category
- `sort_by` (optional): `latest` or `oldest`

**Response** (200 OK):
```json
{
  "materials": [
    {
      "id": "330e8400-e29b-41d4-a716-446655440000",
      "title": "Lecture 1: Introduction",
      "category": "lecture",
      "uploaded_at": "2025-01-15T10:30:00Z",
      "file_size": 1048576
    }
  ]
}
```

---

### Document Endpoints (Phase 5 - Planned)

#### Upload Document

```http
POST /v1/documents
Content-Type: multipart/form-data
```

**Request Body** (multipart/form-data):
- `file`: PDF file (max 25MB)
- `title` (optional): Document title

**Response** (202 Accepted):
```json
{
  "document_id": "220e8400-e29b-41d4-a716-446655440000",
  "filename": "lecture_notes.pdf",
  "file_size": 1048576,
  "processing_status": "pending",
  "uploaded_at": "2025-01-15T10:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid file type, size exceeded, or malware detected
- `413 Payload Too Large`: File exceeds 25MB or user storage quota exceeded

---

#### List Documents

```http
GET /v1/documents?limit=20&offset=0&status=completed
```

**Query Parameters**:
- `limit` (optional): Number of documents (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (`pending`, `processing`, `completed`, `failed`)

**Response** (200 OK):
```json
{
  "documents": [
    {
      "id": "220e8400-e29b-41d4-a716-446655440000",
      "filename": "lecture_notes.pdf",
      "file_size": 1048576,
      "processing_status": "completed",
      "page_count": 10,
      "chunk_count": 25,
      "uploaded_at": "2025-01-15T10:30:00Z",
      "processed_at": "2025-01-15T10:32:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

#### Get Document

```http
GET /v1/documents/{document_id}
```

**Response** (200 OK):
```json
{
  "id": "220e8400-e29b-41d4-a716-446655440000",
  "filename": "lecture_notes.pdf",
  "file_size": 1048576,
  "processing_status": "completed",
  "page_count": 10,
  "chunk_count": 25,
  "uploaded_at": "2025-01-15T10:30:00Z",
  "processed_at": "2025-01-15T10:32:00Z"
}
```

**Error Responses**:
- `403 Forbidden`: Document belongs to another user
- `404 Not Found`: Document not found

---

#### Download Document

```http
GET /v1/documents/{document_id}/download
```

**Response** (200 OK):
```json
{
  "download_url": "https://s3.amazonaws.com/bucket/path?X-Amz-Algorithm=...",
  "expires_at": "2025-01-15T10:45:00Z"
}
```

**Note**: Pre-signed URL expires in 15 minutes.

---

#### Delete Document

```http
DELETE /v1/documents/{document_id}
```

**Response** (204 No Content)

**Error Responses**:
- `403 Forbidden`: Document belongs to another user
- `404 Not Found`: Document not found

---

### Forum Endpoints (US-05, US-09)

#### Create Thread

```http
POST /v1/forum/threads
```

**Request Body**:
```json
{
  "title": "Question about assignment",
  "content": "I have a question about the homework...",
  "is_anonymous": true,
  "course_id": "110e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (201 Created):
```json
{
  "thread_id": "cc0e8400-e29b-41d4-a716-446655440000",
  "title": "Question about assignment",
  "anonymous_id": "a3f8d2e1c4b9",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Note**: If `is_anonymous=true`, the same user will have the same `anonymous_id` within the same course.

---

#### List Threads

```http
GET /v1/forum/threads?limit=20&offset=0&course_id={course_id}
```

**Query Parameters**:
- `limit` (optional): Number of threads (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `course_id` (optional): Filter by course

**Response** (200 OK):
```json
{
  "threads": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440000",
      "title": "Question about assignment",
      "author": "a3f8d2e1c4b9",
      "reply_count": 5,
      "last_activity": "2025-01-15T11:00:00Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

#### Get Thread

```http
GET /v1/forum/threads/{thread_id}
```

**Response** (200 OK):
```json
{
  "thread": {
    "id": "cc0e8400-e29b-41d4-a716-446655440000",
    "title": "Question about assignment",
    "content": "I have a question...",
    "author": "a3f8d2e1c4b9",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "replies": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440000",
      "content": "Here's the answer...",
      "author": "b4g9e3f2d5a0",
      "created_at": "2025-01-15T10:35:00Z"
    }
  ]
}
```

---

#### Reply to Thread

```http
POST /v1/forum/threads/{thread_id}/replies
```

**Request Body**:
```json
{
  "content": "Here's my answer...",
  "is_anonymous": true
}
```

**Response** (201 Created):
```json
{
  "reply_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "anonymous_id": "a3f8d2e1c4b9",
  "created_at": "2025-01-15T10:35:00Z"
}
```

---

#### Search Forum

```http
GET /v1/forum/search?q=assignment&limit=20
```

**Query Parameters**:
- `q`: Search query
- `limit` (optional): Number of results (default: 20)

**Response** (200 OK):
```json
{
  "results": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440000",
      "title": "Question about assignment",
      "content_snippet": "...assignment...",
      "author": "a3f8d2e1c4b9",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 10
}
```

---

#### Flag Post (US-05)

```http
POST /v1/forum/posts/{post_id}/flag
```

**Request Body**:
```json
{
  "reason": "inappropriate_content"
}
```

**Response** (200 OK):
```json
{
  "message": "Post flagged for moderation"
}
```

---

#### Reveal Anonymous Identity (US-05) - Admin Only

```http
POST /v1/forum/posts/{post_id}/reveal
```

**Response** (200 OK):
```json
{
  "user_id": "440e8400-e29b-41d4-a716-446655440000",
  "user_name": "Ahmet Yılmaz",
  "user_email": "ahmet@university.edu.tr"
}
```

**Error Responses**:
- `403 Forbidden`: Admin role required

---

#### Get Moderation Queue (US-05) - Admin/Moderator Only

```http
GET /v1/admin/moderation-queue?limit=20&offset=0
```

**Response** (200 OK):
```json
{
  "flagged_posts": [
    {
      "post_id": "cc0e8400-e29b-41d4-a716-446655440000",
      "reason": "inappropriate_content",
      "flagged_at": "2025-01-15T10:30:00Z",
      "anonymous_id": "a3f8d2e1c4b9"
    }
  ],
  "total": 5
}
```

---

#### Remove Post (US-05) - Admin Only

```http
POST /v1/admin/forum-posts/{post_id}/remove
```

**Request Body**:
```json
{
  "removal_reason": "Violates community guidelines"
}
```

**Response** (200 OK):
```json
{
  "message": "Post removed successfully"
}
```

---

### Direct Messaging Endpoints (US-08)

#### Send Message

```http
POST /v1/messages
```

**Request Body**:
```json
{
  "recipient_id": "440e8400-e29b-41d4-a716-446655440000",
  "content": "Merhaba, ders hakkında bir sorum var."
}
```

**Response** (201 Created):
```json
{
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "conversation_id": "660e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Processing Time**: <5 seconds (SC-006)

---

#### List Conversations

```http
GET /v1/messages/conversations?limit=20&offset=0
```

**Response** (200 OK):
```json
{
  "conversations": [
    {
      "user_id": "440e8400-e29b-41d4-a716-446655440000",
      "user_name": "Ahmet Yılmaz",
      "last_message": "Merhaba, ders hakkında bir sorum var.",
      "last_message_at": "2025-01-15T10:30:00Z",
      "unread_count": 2
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

#### Get Conversation Thread

```http
GET /v1/messages/conversations/{user_id}?limit=50&offset=0
```

**Response** (200 OK):
```json
{
  "conversation_id": "660e8400-e29b-41d4-a716-446655440000",
  "participant": {
    "id": "440e8400-e29b-41d4-a716-446655440000",
    "name": "Ahmet Yılmaz"
  },
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "sender_id": "440e8400-e29b-41d4-a716-446655440000",
      "content": "Merhaba, ders hakkında bir sorum var.",
      "is_read": true,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

#### Mark Message as Read

```http
POST /v1/messages/{message_id}/read
```

**Response** (200 OK):
```json
{
  "message": "Message marked as read"
}
```

---

#### Get Unread Count

```http
GET /v1/messages/unread-count
```

**Response** (200 OK):
```json
{
  "unread_count": 5
}
```

---

### Knowledge Base Endpoints (US-10)

#### Search Knowledge Base

```http
POST /v1/knowledge-base/search
```

**Request Body**:
```json
{
  "query": "What is the add/drop deadline?"
}
```

**Response** (200 OK):
```json
{
  "answer": "The add/drop deadline for the Fall 2024 semester is March 22, 2024. Students can modify their course schedules until this date without penalty.",
  "sources": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "title": "Academic Calendar 2024",
      "source_url": "https://university.edu.tr/calendar",
      "relevance": 0.95,
      "category": "academic"
    }
  ],
  "response_time_ms": 2850
}
```

**Processing Time**: <3 seconds (SC-008)

**Error Responses**:
- `400 Bad Request`: Query too short or invalid
- `503 Service Unavailable`: Knowledge base temporarily unavailable

---

### Mentorship Endpoints (US-12)

#### Browse Mentors

```http
GET /v1/mentors?expertise=career-planning&available=true
```

**Query Parameters**:
- `expertise` (optional): Filter by expertise tag
- `available` (optional): Filter by availability

**Response** (200 OK):
```json
{
  "mentors": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "name": "Dr. Ayşe Kaya",
      "bio": "Senior software engineer with 10 years experience",
      "expertise": ["career-planning", "software-engineering"],
      "rating": 4.8,
      "availability": "available"
    }
  ]
}
```

---

#### Request Mentorship

```http
POST /v1/mentors/{mentor_id}/request
```

**Request Body**:
```json
{
  "description": "I need guidance on choosing my specialization",
  "expertise_tags": ["career-planning"]
}
```

**Response** (201 Created):
```json
{
  "mentorship_id": "990e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

#### Accept Mentorship Request

```http
POST /v1/mentorships/{mentorship_id}/accept
```

**Response** (200 OK):
```json
{
  "message": "Mentorship request accepted",
  "status": "active",
  "messaging_channel_opened": true
}
```

---

### Recommendations Endpoints (US-14)

#### Get Course Recommendations

```http
GET /v1/recommendations?limit=5
```

**Response** (200 OK):
```json
{
  "recommendations": [
    {
      "course_id": "110e8400-e29b-41d4-a716-446655440000",
      "course_name": "Machine Learning Fundamentals",
      "relevance_score": 0.92,
      "reason": "Matches your interest in AI",
      "ranking": 1
    }
  ]
}
```

**Note**: Recommendations update daily at 2 AM UTC based on user behavior.

---

#### Track Recommendation Click

```http
POST /v1/recommendations/{recommendation_id}/click
```

**Response** (200 OK):
```json
{
  "message": "Click tracked"
}
```

---

### Dashboard Endpoints (US-13)

#### Get Dashboard Data

```http
GET /v1/dashboard
```

**Response** (200 OK):
```json
{
  "active_courses": [
    {
      "id": "110e8400-e29b-41d4-a716-446655440000",
      "name": "Bilgisayar Bilimlerine Giriş",
      "code": "BİL101"
    }
  ],
  "gpa": 3.75,
  "upcoming_assignments": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "title": "Homework 3",
      "due_date": "2025-01-20T23:59:00Z",
      "course_name": "BİL101"
    }
  ],
  "widget_preferences": {
    "visible": ["active_courses", "gpa_card", "upcoming_assignments"],
    "order": [0, 1, 2]
  }
}
```

---

#### Update Widget Preferences

```http
PUT /v1/dashboard/widgets
```

**Request Body**:
```json
{
  "visible": ["active_courses", "gpa_card", "upcoming_assignments"],
  "order": [0, 1, 2],
  "settings": {}
}
```

**Response** (200 OK):
```json
{
  "message": "Widget preferences updated"
}
```

---

### Career Endpoints (US-07)

#### Browse Job Referrals

```http
GET /v1/career/referrals?role=software-engineer&employment_type=full-time
```

**Query Parameters**:
- `role` (optional): Filter by job role
- `employment_type` (optional): `full-time`, `part-time`, `internship`, `contract`
- `company` (optional): Filter by company name

**Response** (200 OK):
```json
{
  "referrals": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "company_name": "Tech Corp",
      "job_title": "Software Engineer",
      "location": "Istanbul",
      "salary_range_min": 50000,
      "salary_range_max": 70000,
      "employment_type": "full-time",
      "required_skills": ["Python", "React"],
      "apply_by_date": "2025-02-15"
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

---

#### Get Referral Details

```http
GET /v1/career/referrals/{referral_id}
```

**Response** (200 OK):
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440000",
  "company_name": "Tech Corp",
  "job_title": "Software Engineer",
  "job_description": "Full job description...",
  "location": "Istanbul",
  "salary_range_min": 50000,
  "salary_range_max": 70000,
  "application_url": "https://techcorp.com/apply",
  "contact_name": "HR Department",
  "contact_email": "hr@techcorp.com",
  "required_skills": ["Python", "React", "PostgreSQL"]
}
```

---

### Health Check Endpoints

#### Basic Health Check

```http
GET /health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "0.1.0"
}
```

---

#### Readiness Probe

```http
GET /health/ready
```

**Response** (200 OK):
```json
{
  "status": "ready",
  "checks": {
    "database": "connected",
    "vector_store_official": "loaded",
    "vector_store_user": "loaded"
  }
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "not_ready",
  "checks": {
    "database": "disconnected",
    "vector_store_official": "loaded",
    "vector_store_user": "loaded"
  }
}
```

---

#### Liveness Probe

```http
GET /health/live
```

**Response** (200 OK):
```json
{
  "status": "alive"
}
```

---

## Request/Response Formats

### Request Headers

**Required Headers** (for authenticated endpoints):
```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Optional Headers**:
```http
X-Request-ID: {uuid}  # For request tracing (auto-generated if not provided)
```

### Response Headers

```http
Content-Type: application/json
X-Request-ID: {uuid}  # Request ID for tracing
```

### Pagination

All list endpoints support pagination:

**Query Parameters**:
- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

**Response Format**:
```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

### Timestamps

All timestamps are in ISO 8601 format with UTC timezone:
```
2025-01-15T10:30:00Z
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "reason": "Must be a valid university email address"
    }
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PUT request |
| 201 | Created | Successful POST request (resource created) |
| 202 | Accepted | Request accepted for async processing |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 413 | Payload Too Large | File size exceeds limit |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (check logs) |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Codes

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `UNAUTHORIZED` | Missing or invalid token | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

---

## Rate Limiting

**Planned Implementation** (Phase 10):

- **Per User**: 100 requests/minute (burst: 120)
- **AI Queries**: 10 queries/minute per user (burst: 12)
- **Per IP**: 1000 requests/minute (burst: 1200)

**Rate Limit Headers** (when implemented):
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

**Rate Limit Exceeded Response** (429):
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## Swagger UI

### Access

**Development**: http://localhost:8000/docs  
**Production**: https://api.kampusplus.edu.tr/docs

### Features

- **Interactive API Testing**: Test endpoints directly from browser
- **Request/Response Examples**: See example payloads for all endpoints
- **Authentication**: Click "Authorize" button to add JWT token
- **Schema Documentation**: View all request/response models

### Using Swagger UI

1. **Open Swagger UI**: Navigate to `/docs` endpoint
2. **Authenticate**: Click "Authorize" → Enter `Bearer {token}` → Click "Authorize"
3. **Test Endpoint**: Click on endpoint → "Try it out" → Enter parameters → "Execute"
4. **View Response**: See response body, headers, and status code

---

## Code Examples

### JavaScript/TypeScript (Axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  localStorage.setItem('access_token', response.data.access_token);
  return response.data;
};

// Send chat message
const sendMessage = async (sessionId: string, content: string) => {
  const response = await api.post(`/chat/sessions/${sessionId}/messages`, {
    content,
  });
  return response.data;
};
```

### Python (requests)

```python
import requests

BASE_URL = "http://localhost:8000/v1"

# Login
def login(email: str, password: str) -> dict:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    response.raise_for_status()
    return response.json()

# Send chat message
def send_message(session_id: str, content: str, access_token: str) -> dict:
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.post(
        f"{BASE_URL}/chat/sessions/{session_id}/messages",
        json={"content": content},
        headers=headers
    )
    response.raise_for_status()
    return response.json()

# Example usage
token_data = login("student@university.edu.tr", "password123")
access_token = token_data["access_token"]

message_response = send_message(
    session_id="660e8400-e29b-41d4-a716-446655440000",
    content="BİL101 dersi ne zaman?",
    access_token=access_token
)
print(message_response)
```

### cURL

```bash
# Login
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@university.edu.tr","password":"password123"}'

# Send chat message (with token)
curl -X POST http://localhost:8000/v1/chat/sessions/{session_id}/messages \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{"content":"BİL101 dersi ne zaman?"}'
```

---

## Additional Resources

- **OpenAPI Specification**: `specs/001-ai-platform/contracts/openapi.yaml`
- **Architecture Documentation**: `docs/ARCHITECTURE.md`
- **Data Model**: `specs/001-ai-platform/data-model.md`
- **Feature Specification**: `specs/001-ai-platform/spec.md`

---

**Last Updated**: 2025-12-24  
**Maintained By**: KAMPÜS+ Development Team

