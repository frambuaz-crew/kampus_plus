# Quickstart Guide - Product Backlog Implementation

**Feature**: 002-product-backlog (14 user stories, 21 functional requirements)  
**Branch**: `002-product-backlog`  
**Date**: 2025-12-24  
**Target Audience**: Development team setting up local environment and running first tests

---

## Prerequisites

**System Requirements**:
- Python 3.11+ (backend)
- Node.js 18+ (frontend)
- Docker & Docker Compose (for services)
- Git (version control)
- PostgreSQL 14+ (database)

**Environment Setup**:
```bash
# Clone repository
git clone https://github.com/university/kampus-plus.git
cd kampus-plus

# Switch to feature branch
git checkout 002-product-backlog

# Create virtual environment (backend)
python3.11 -m venv venv_backend
source venv_backend/bin/activate  # On Windows: venv_backend\Scripts\activate

# Create node environment (frontend)
cd frontend
npm install --legacy-peer-deps
cd ..
```

---

## Local Development Setup

### 1. Backend Setup

**Install dependencies**:
```bash
cd backend
pip install -r requirements.txt
pip install -e .  # Editable install for development
```

**Configure environment**:
```bash
# Copy template
cp .env.example .env

# Edit .env with local values
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://kampus_user:kampus_pass@localhost:5432/kampus_plus_dev

# Email
MAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025  # Mailhog for local testing
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=noreply@kampus.local

# AI Services
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=kampus-materials

# JWT
SECRET_KEY=your_secret_key_here_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Environment
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
EOF
```

**Initialize database**:
```bash
# Run migrations
alembic upgrade head

# Seed test data (optional)
python scripts/seed_data.py
```

**Start backend server**:
```bash
# Development mode with auto-reload
cd src
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or use Docker
cd ..
docker-compose up -d backend
```

**Verify backend is running**:
```bash
# Health check
curl http://localhost:8000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-12-24T10:00:00Z",
  "version": "0.1.0"
}

# API docs
curl http://localhost:8000/docs  # Swagger UI
```

---

### 2. Frontend Setup

**Install dependencies**:
```bash
cd frontend
npm install --legacy-peer-deps
```

**Configure environment**:
```bash
# Copy template
cp .env.example .env.local

# Edit .env.local
cat > .env.local << 'EOF'
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_ENVIRONMENT=development
VITE_LOG_LEVEL=debug
EOF
```

**Start frontend server**:
```bash
# Development mode with Vite
npm run dev

# Expected output
VITE v[version] ready in [time] ms

➜  Local:   http://localhost:5173/
```

**Verify frontend is running**:
```bash
curl http://localhost:5173/
```

---

### 3. Docker Compose Services

**Start all services**:
```bash
cd /workspace/root
docker-compose up -d

# Expected services
# - backend: http://localhost:8000
# - frontend: http://localhost:3000
# - postgres: localhost:5432
# - redis: localhost:6379
# - minio: http://localhost:9000
# - mailhog: http://localhost:1025 (SMTP) / http://localhost:8025 (UI)
```

**Verify all services**:
```bash
# Check container status
docker-compose ps

# Expected output
NAME                COMMAND             STATUS          PORTS
kampus-backend      "uvicorn ..."       Up 2 minutes    0.0.0.0:8000->8000/tcp
kampus-frontend     "npm run dev"       Up 2 minutes    0.0.0.0:3000->3000/tcp
kampus-postgres     "postgres ..."      Up 5 minutes    5432/tcp
kampus-redis        "redis-server"      Up 5 minutes    6379/tcp
kampus-minio        "minio server"      Up 5 minutes    0.0.0.0:9000->9000/tcp
mailhog             "MailHog"           Up 5 minutes    0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

**Access services**:
```
Backend API:    http://localhost:8000
Frontend:       http://localhost:3000  (or 5173 for Vite)
API Docs:       http://localhost:8000/docs
Postgres:       psql postgresql://kampus_user:kampus_pass@localhost:5432/kampus_plus_dev
Redis:          redis-cli -h localhost -p 6379
MinIO:          http://localhost:9000 (key: minioadmin, secret: minioadmin)
Mailhog:        http://localhost:8025 (catch emails locally)
```

---

## Running Tests

### 1. Backend Tests

**Unit Tests**:
```bash
cd backend

# Run all unit tests
pytest tests/unit -v

# Run specific test
pytest tests/unit/test_auth_service.py::test_password_validation -v

# With coverage
pytest tests/unit --cov=src --cov-report=html
# → Open htmlcov/index.html in browser
```

**Integration Tests**:
```bash
cd backend

# Requires running services (postgres, redis, minio)
pytest tests/integration -v

# Run with pytest markers
pytest -m "integration" -v

# Run with specific user story
pytest tests/integration -k "US-01" -v
```

**Contract Tests** (API response validation):
```bash
cd backend

# Test all API contracts
pytest tests/contract -v

# Test specific endpoint
pytest tests/contract/test_auth_endpoints.py::test_register_success -v
```

**All Tests Together**:
```bash
cd backend

# Run full test suite with coverage
pytest --cov=src tests/ -v --tb=short

# Expected output: 100+ passing tests, 80%+ coverage
```

---

### 2. Frontend Tests

**Component Tests**:
```bash
cd frontend

# Run all React component tests
npm run test

# Run in watch mode
npm run test -- --watch

# Run with coverage
npm run test -- --coverage

# Test specific component
npm run test -- Sidebar.test.tsx
```

**Build Check**:
```bash
cd frontend

# Verify TypeScript compilation
npm run build

# Check bundle size
npm run analyze  # If available
```

---

### 3. End-to-End (E2E) Tests

**Setup**:
```bash
cd backend
# Ensure services running: docker-compose up

# Install Playwright (one-time)
pip install playwright
playwright install

# Or use Cypress (if configured)
cd frontend
npm install --save-dev cypress
```

**Run E2E Tests**:
```bash
cd backend

# Run E2E tests for US-01 (Registration)
pytest tests/e2e -k "US-01" -v

# Run all E2E tests
pytest tests/e2e -v --tb=short

# Run against live servers
pytest tests/e2e -v --base-url http://localhost:3000
```

**Expected E2E Scenarios**:
- US-01: Student registration and email verification flow
- US-03: Course material upload and filtering
- US-04: AI chat and response validation
- US-08: Direct messaging and read receipts
- US-10: Knowledge base search

---

## Common Development Workflows

### Adding a New Feature (Example: US-04 AI Chat)

**1. Create feature branch**:
```bash
git checkout 002-product-backlog
git pull origin 002-product-backlog

# Create working branch from feature branch
git checkout -b 002-ai-chat
```

**2. Write failing test first** (TDD):
```python
# tests/contract/test_chat_endpoints.py
def test_chat_endpoint_returns_ai_response():
    """US-04: Student receives AI response within 5 seconds"""
    client = TestClient(app)
    
    response = client.post(
        "/api/v1/courses/101/chat",
        json={"question": "How do I solve quadratic equations?"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    
    assert response.status_code == 200
    assert "answer" in response.json()
    assert response.elapsed.total_seconds() < 5
```

**Run the test** (should fail):
```bash
pytest tests/contract/test_chat_endpoints.py::test_chat_endpoint_returns_ai_response -v
# FAILED ❌
```

**3. Implement the feature**:
```python
# backend/src/api/routes/chat.py
from fastapi import APIRouter, Depends, HTTPException
from services.ai_service import AIService
from core.security import get_current_user

router = APIRouter(prefix="/courses/{course_id}/chat", tags=["chat"])

@router.post("")
async def chat(
    course_id: int,
    question: dict,
    current_user: User = Depends(get_current_user),
    ai_service: AIService = Depends()
):
    """
    US-04: AI-Powered Study Assistant
    FR-005: AI Assistant MUST retrieve context and provide answers within 5 seconds
    """
    # Get course materials for context
    materials = db.query(Material).filter(
        Material.course_id == course_id
    ).all()
    
    # Anonymize question before sending to AI
    anonymized_question = anonymization_service.remove_pii(question)
    
    # Get AI response (FR-006: no PII in logs)
    response = await ai_service.generate_response(
        question=anonymized_question,
        context=materials,
        timeout_seconds=5
    )
    
    return {"answer": response, "sources": [...]}
```

**Run the test again** (should pass):
```bash
pytest tests/contract/test_chat_endpoints.py::test_chat_endpoint_returns_ai_response -v
# PASSED ✅
```

**4. Commit and push**:
```bash
git add -A
git commit -m "feat(chat): implement AI-powered study assistant (US-04)

- Add POST /api/v1/courses/{course_id}/chat endpoint
- Integrate Google Gemini API for LLM responses
- Anonymize student questions before AI processing
- Response time <5 seconds (SC-005)
- Test coverage: contract + integration tests"

git push origin 002-ai-chat
```

**5. Create pull request** (via GitHub):
```
Title: feat(chat): AI-Powered Study Assistant (US-04)

Description:
Implements user story US-04 from product backlog (002-product-backlog).

Features:
- Students can ask questions about course content
- AI responds with explanations within 5 seconds
- Student privacy maintained (anonymized before AI processing)
- 80%+ user satisfaction target

Tests:
- Contract tests: API response format validation
- Integration tests: AI service + course context retrieval
- End-to-end: Full user workflow

Acceptance Criteria:
✅ All 4 acceptance scenarios pass
✅ <5 second response time (SC-005)
✅ No PII in AI logs (FR-006)
✅ 80%+ test coverage
```

---

### Database Schema Changes

**Create migration**:
```bash
cd backend

# Auto-generate from model changes
alembic revision --autogenerate -m "add_widget_preferences_to_users"

# Review generated migration
cat alembic/versions/xxx_add_widget_preferences_to_users.py
```

**Test migration**:
```bash
cd backend

# Test upgrade
alembic upgrade head

# Test downgrade
alembic downgrade -1

# Test upgrade again
alembic upgrade head
```

**Run migrations in Docker**:
```bash
docker-compose exec backend alembic upgrade head
```

---

### Debugging

**Backend Debug Mode**:
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with VS Code debugger
# .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI Backend",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload"],
      "cwd": "${workspaceFolder}/backend/src"
    }
  ]
}
```

**Frontend Debug Mode**:
```bash
# Browser DevTools: F12 in Chrome/Firefox
# React Developer Tools extension recommended

# Check API requests: Network tab in DevTools
# Check component state: React DevTools component inspector
```

**Database Inspection**:
```bash
# Connect to PostgreSQL
psql postgresql://kampus_user:kampus_pass@localhost:5432/kampus_plus_dev

# List tables
\dt

# Inspect specific table
\d users

# Run query
SELECT * FROM users LIMIT 5;

# Check recent migrations
SELECT * FROM alembic_version;
```

**Redis Inspection**:
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# Check keys
KEYS *

# Inspect specific key
GET key_name

# Monitor commands in real-time
MONITOR
```

**Email Testing** (Mailhog):
```
Open http://localhost:8025 in browser
→ All emails sent via SMTP appear in Mailhog UI
→ Click email to view content
→ Useful for testing verification links
```

---

## Deployment Checklist

**Before Pushing to Staging**:
```bash
# 1. Run all tests locally
cd backend && pytest tests/ --cov=src
cd ../frontend && npm run test

# 2. Check code quality
cd ../backend && black . && flake8 . && isort .
cd ../frontend && npm run lint

# 3. Build frontend for production
npm run build

# 4. Verify no secrets in code
git diff HEAD~1 | grep -i "key\|secret\|password"  # Should be empty

# 5. Update documentation
# → Verify SETUP_GUIDE.md is current
# → Verify QUICK_START.md is current
# → Update API_DOCUMENTATION.md with new endpoints

# 6. Create commit and PR
git commit -m "chore(deploy): prepare v0.2.0 release for staging"
git push origin 002-product-backlog
```

**CI/CD Pipeline** (GitHub Actions):
```yaml
# Runs automatically on push/PR
- Run unit tests (backend)
- Run integration tests (backend)
- Run component tests (frontend)
- Build frontend
- Check code coverage (80%+ requirement)
- Security scanning (dependency vulnerabilities)
```

---

## Performance Checklist

**After Implementation**:
```bash
# 1. Response time testing (load testing)
cd backend
pip install locust

# Create load test
cat > locustfile.py << 'EOF'
from locust import HttpUser, task

class ChatUser(HttpUser):
    @task
    def chat(self):
        self.client.post(
            "/api/v1/courses/101/chat",
            json={"question": "How do I solve quadratic equations?"},
            headers={"Authorization": "Bearer ..."}
        )
EOF

# Run load test
locust -f locustfile.py -u 100 -r 10 -t 5m --headless -H http://localhost:8000
# → Verify P95 latency < 5 seconds
```

**Database Performance**:
```bash
# Check slow queries
psql postgresql://...
# Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100;  # 100ms threshold
SELECT pg_reload_conf();

# Check query plans
EXPLAIN ANALYZE SELECT * FROM materials WHERE course_id = 101 AND is_searchable = true;
# → Verify index is used
```

---

## Troubleshooting

**Issue**: `ModuleNotFoundError: No module named 'uvicorn'`
```bash
# Solution
cd backend
pip install -r requirements.txt
```

**Issue**: `Connection refused: Cannot connect to PostgreSQL`
```bash
# Solution: Start PostgreSQL
docker-compose up -d postgres

# Verify connection
psql postgresql://kampus_user:kampus_pass@localhost:5432/kampus_plus_dev -c "SELECT 1;"
```

**Issue**: Frontend shows blank page
```bash
# Solution 1: Clear browser cache
# Ctrl+Shift+Delete (Chrome/Firefox) or Cmd+Shift+Delete (Mac)

# Solution 2: Check backend is running
curl http://localhost:8000/docs

# Solution 3: Check console for errors
F12 → Console tab → Check for red errors
```

**Issue**: Tests timeout on AI service calls
```bash
# Solution: Mock Gemini API in tests
# Use pytest fixtures to mock
@pytest.fixture
def mock_gemini(monkeypatch):
    def mock_generate_response(*args, **kwargs):
        return "Mock AI response"
    monkeypatch.setattr(ai_service, "generate_response", mock_generate_response)
```

---

## Next Steps

1. **Complete Setup** (this file)
2. **Read Data Model** ([data-model.md](data-model.md))
3. **Review API Contracts** ([contracts/api-endpoints.md](contracts/api-endpoints.md))
4. **Check Research Phase** ([research.md](research.md))
5. **Start Implementation**:
   - Begin with US-01 (Registration) - foundation for all other features
   - Follow Test-First Development (TDD): Write failing test → Implement → Pass test
   - Run tests after each feature: `pytest tests/ -v`
   - Commit frequently with meaningful messages

**Expected Timeline**:
- US-01, US-02, US-03 (P1 Critical): 2 weeks
- US-04, US-05, US-06, US-08, US-10 (P2 High): 4 weeks
- US-07, US-09, US-11, US-12, US-13, US-14 (P3 Enhancement): 2+ weeks

---

**Quickstart Complete**: Ready for implementation! 🚀
