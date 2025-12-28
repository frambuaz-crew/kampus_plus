# Quickstart Guide: KAMPÜS+ Development

**Feature**: KAMPÜS+ AI-Powered Hybrid Intelligence Platform  
**Date**: 2025-11-11  
**Audience**: Developers joining the project

## Overview

This quickstart guide helps you set up the KAMPÜS+ development environment and understand the codebase structure. Follow these steps to go from zero to running the full stack locally in under 30 minutes.

---

## Prerequisites

Ensure you have the following installed:

- **Git**: Version 2.x+
- **Docker**: Version 24.x+
- **Docker Compose**: Version 2.x+
- **Node.js**: Version 18.x+ (for frontend development)
- **Python**: Version 3.11+ (for backend development)
- **Code Editor**: VS Code recommended (with Python, ESLint, Prettier extensions)

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/kampus_plus.git
cd kampus_plus
```

### 2. Checkout Feature Branch

```bash
git checkout 001-ai-platform
```

### 3. Environment Configuration

Copy environment template and fill in secrets:

```bash
cp .env.example .env
```

Edit `.env` and set the following required variables:

```env
# Database
POSTGRES_DB=kampus_plus
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<generate-strong-password>
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/kampus_plus

# JWT Authentication
JWT_SECRET_KEY=<generate-64-char-random-string>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Google Gemini API
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_EMBEDDING_MODEL=text-embedding-004

# AWS S3
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_S3_BUCKET=kampus-plus-dev
AWS_REGION=eu-west-1

# Application
APP_ENV=development
DEBUG=true
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

**Security Note**: Never commit `.env` to Git. It's in `.gitignore`.

---

## Running with Docker Compose

### Start All Services

```bash
docker-compose up -d
```

This starts:
- **backend**: FastAPI on `http://localhost:8000`
- **frontend**: React on `http://localhost:3000`
- **postgres**: PostgreSQL on `localhost:5432`
- **nginx**: Reverse proxy on `http://localhost` (port 80)

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Services

```bash
docker-compose down
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

---

## Local Development (Without Docker)

For faster iteration during development, you can run services locally.

### Backend Setup

1. **Create Virtual Environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run Database Migrations**:
   ```bash
   alembic upgrade head
   ```

4. **Start Backend**:
   ```bash
   uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Access API Docs**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Frontend Setup

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```

3. **Access Frontend**:
   - Application: http://localhost:3000
   - Hot reload enabled for instant feedback

---

## Database Management

### Run Migrations

```bash
cd backend
alembic upgrade head
```

### Create New Migration

```bash
alembic revision --autogenerate -m "description of changes"
```

### Rollback Migration

```bash
alembic downgrade -1  # Rollback one migration
alembic downgrade base  # Rollback all migrations
```

### Seed Development Data

```bash
python scripts/seed_data.py
```

This creates:
- Test users (student, admin)
- Sample courses
- Mock official documents

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/unit/test_auth_service.py

# Run with verbose output
pytest -v

# Run in watch mode (requires pytest-watch)
ptw
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- ChatInterface.test.jsx

# Run in watch mode (default)
npm test
```

### Integration Tests

```bash
cd backend

# Requires services running (Docker Compose recommended)
pytest tests/integration/ -v
```

### E2E Tests

```bash
cd frontend

# Requires all services running
npm run test:e2e
```

---

## Development Workflow

### 1. Test-First Development (Constitutional Requirement)

Before implementing any feature:

1. Write tests that define expected behavior
2. Run tests and verify they fail (Red phase)
3. Implement feature to make tests pass (Green phase)
4. Refactor code while keeping tests green (Refactor phase)

### 2. Making Code Changes

**Backend**:
1. Create/modify code in `backend/src/`
2. Write unit tests in `backend/tests/unit/`
3. Run tests: `pytest`
4. Check code quality: `black .`, `flake8 .`
5. Commit changes

**Frontend**:
1. Create/modify components in `frontend/src/components/`
2. Write component tests in `__tests__/` subdirectory
3. Run tests: `npm test`
4. Check code quality: `npm run lint`
5. Commit changes

### 3. Commit Message Format

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
```
feat(auth): add JWT refresh token rotation
fix(chat): resolve anonymization issue with Turkish characters
test(documents): add integration tests for PDF upload
docs(api): update OpenAPI spec for forum endpoints
```

### 4. Pull Request Process

1. Create feature branch: `git checkout -b feature/your-feature-name`
2. Make changes and commit
3. Push to remote: `git push origin feature/your-feature-name`
4. Open PR on GitHub
5. Ensure CI tests pass
6. Request review from team lead
7. Address review comments
8. Merge after approval

---

## Common Tasks

### Add New API Endpoint

1. **Define Route** (`backend/src/api/routes/`):
   ```python
   from fastapi import APIRouter, Depends
   from src.api.dependencies import get_current_user
   
   router = APIRouter(prefix="/api/v1/example", tags=["example"])
   
   @router.get("/")
   async def get_examples(user=Depends(get_current_user)):
       return {"examples": []}
   ```

2. **Register Router** (`backend/src/main.py`):
   ```python
   from src.api.routes import example
   app.include_router(example.router)
   ```

3. **Write Tests** (`backend/tests/integration/test_example.py`):
   ```python
   def test_get_examples(client, auth_headers):
       response = client.get("/api/v1/example/", headers=auth_headers)
       assert response.status_code == 200
   ```

4. **Update OpenAPI Spec**: Add endpoint to `specs/001-ai-platform/contracts/openapi.yaml`

### Add New React Component

1. **Create Component** (`frontend/src/components/Example/Example.jsx`):
   ```jsx
   import React from 'react';
   
   const Example = ({ data }) => {
     return <div>{data}</div>;
   };
   
   export default Example;
   ```

2. **Write Tests** (`frontend/src/components/Example/__tests__/Example.test.jsx`):
   ```jsx
   import { render, screen } from '@testing-library/react';
   import Example from '../Example';
   
   test('renders data', () => {
     render(<Example data="test" />);
     expect(screen.getByText('test')).toBeInTheDocument();
   });
   ```

3. **Add Styles**: Use TailwindCSS utility classes

### Add Database Migration

1. **Modify Models** (`backend/src/models/`):
   ```python
   from sqlalchemy import Column, String
   
   class Example(Base):
       __tablename__ = "examples"
       id = Column(UUID, primary_key=True)
       name = Column(String(255), nullable=False)
   ```

2. **Generate Migration**:
   ```bash
   alembic revision --autogenerate -m "add examples table"
   ```

3. **Review Migration**: Check `backend/alembic/versions/*.py`

4. **Apply Migration**:
   ```bash
   alembic upgrade head
   ```

### Configure New Environment Variable

1. **Add to `.env.example`**:
   ```env
   NEW_FEATURE_ENABLED=false
   ```

2. **Add to Config** (`backend/src/core/config.py`):
   ```python
   from pydantic_settings import BaseSettings
   
   class Settings(BaseSettings):
       new_feature_enabled: bool = False
       
       class Config:
           env_file = ".env"
   ```

3. **Use in Code**:
   ```python
   from src.core.config import settings
   
   if settings.new_feature_enabled:
       # Feature code
   ```

---

## Troubleshooting

### Port Already in Use

**Symptom**: `Error: bind: address already in use`

**Solution**:
```bash
# Find process using port
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Failed

**Symptom**: `sqlalchemy.exc.OperationalError: could not connect to server`

**Solution**:
1. Check PostgreSQL is running: `docker-compose ps`
2. Verify `DATABASE_URL` in `.env`
3. Restart database: `docker-compose restart postgres`

### OpenAI API Rate Limit

**Symptom**: `openai.error.RateLimitError: Rate limit exceeded`

**Solution**:
1. Check OpenAI API usage dashboard
2. Implement exponential backoff (already in `ai_service.py`)
3. Use caching for repeated queries
4. Consider GPT-3.5-turbo for development

### FAISS Index Not Found

**Symptom**: `FileNotFoundError: faiss_official.index`

**Solution**:
1. Initialize indexes: `python scripts/init_faiss.py`
2. Or run sync job to populate: `POST /api/v1/sync/jobs`

### Frontend Build Errors

**Symptom**: `Module not found` or dependency errors

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Tests Failing After Merge

**Symptom**: Tests pass locally but fail in CI

**Solution**:
1. Pull latest changes: `git pull origin main`
2. Rebuild dependencies: `pip install -r requirements.txt`, `npm install`
3. Reset test database: `docker-compose down -v && docker-compose up -d`
4. Run migrations: `alembic upgrade head`

---

## Useful Commands Reference

### Docker

```bash
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose down -v        # Stop and remove volumes
docker-compose logs -f        # Follow logs
docker-compose restart <svc>  # Restart specific service
docker-compose exec <svc> sh  # Shell into container
docker-compose ps             # List running containers
```

### Git

```bash
git checkout -b <branch>      # Create new branch
git add .                     # Stage all changes
git commit -m "message"       # Commit changes
git push origin <branch>      # Push to remote
git pull origin main          # Pull latest from main
git merge main                # Merge main into current branch
git stash                     # Stash uncommitted changes
git stash pop                 # Apply stashed changes
```

### Python/Backend

```bash
black .                       # Format code
flake8 .                      # Lint code
pytest                        # Run tests
pytest --cov                  # Run tests with coverage
alembic upgrade head          # Apply migrations
alembic downgrade -1          # Rollback migration
pip freeze > requirements.txt # Update dependencies
```

### Node/Frontend

```bash
npm start                     # Start dev server
npm test                      # Run tests
npm run build                 # Production build
npm run lint                  # Lint code
npm run lint:fix              # Auto-fix lint issues
npm audit fix                 # Fix security vulnerabilities
```

---

## Architecture Overview

### Request Flow

1. **User Action** (Frontend)
   - User interacts with React component
   - Component calls API service (`src/services/`)

2. **API Call**
   - Axios intercepts request, adds JWT token
   - Request sent to backend API

3. **Backend Processing**
   - Nginx routes to FastAPI
   - Middleware validates JWT token
   - Route handler processes request
   - Service layer contains business logic
   - Database/Vector store queries

4. **AI Pipeline** (for chat queries)
   - User query anonymized (PII removed)
   - LangChain queries dual FAISS indexes
   - Results merged and ranked
   - LLM generates response with citations
   - Response returned (no logging per constitution)

5. **Response**
   - JSON returned to frontend
   - React updates UI
   - User sees result

### Key Design Patterns

- **Dependency Injection**: FastAPI's `Depends` for DB sessions, auth
- **Repository Pattern**: Data access abstracted in service layer
- **Singleton**: FAISS indexes loaded once at startup

---

## Resources

### Documentation
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Feature Spec**: `specs/001-ai-platform/spec.md`
- **Data Model**: `specs/001-ai-platform/data-model.md`
- **API Contracts**: `specs/001-ai-platform/contracts/openapi.yaml`

### External Resources
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [LangChain Docs](https://python.langchain.com/)
- [FAISS Docs](https://github.com/facebookresearch/faiss/wiki)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### Team Contacts
- **Backend & AI Lead**: backend-lead@university.edu.tr
- **Frontend Lead**: frontend-lead@university.edu.tr
- **DevOps**: devops@university.edu.tr
- **Project Manager**: pm@university.edu.tr

---

## Next Steps

1. ✅ Set up development environment (you're here!)
2. ⏭️ Read the [Constitution](../../.specify/memory/constitution.md) (mandatory)
3. ⏭️ Review [Feature Specification](./spec.md)
4. ⏭️ Familiarize with [Data Model](./data-model.md)
5. ⏭️ Run through [Testing Strategy](./research.md#10-testing-strategy)
6. ⏭️ Pick your first task from `tasks.md` (will be generated next)
7. ⏭️ Write tests, implement feature, submit PR!

**Welcome to the KAMPÜS+ team! 🚀**
