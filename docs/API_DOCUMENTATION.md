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

KAMPÜS+ API is a RESTful API built with FastAPI. All endpoints (except authentication) require JWT Bearer token authentication. The API follows OpenAPI 3.0 specification and provides automatic interactive documentation via Swagger UI.

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

