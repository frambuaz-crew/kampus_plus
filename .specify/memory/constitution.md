<!--
SYNC IMPACT REPORT
==================
Version Change: Initial → 1.0.0
Rationale: First complete constitution for Kampus Plus project

Modified Principles: N/A (initial creation)
Added Sections: All core principles, Technology Stack, Security & Privacy, Development Workflow, Governance
Removed Sections: None

Templates Requiring Updates:
✅ .specify/templates/plan-template.md - constitution checks will reference new principles
✅ .specify/templates/spec-template.md - testing requirements align with Test-First principle
✅ .specify/templates/tasks-template.md - task organization reflects new workflow

Follow-up TODOs: None
-->

# Kampus Plus Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

All code MUST be developed following Test-Driven Development (TDD) methodology:
- Tests are written and approved by stakeholders before implementation begins
- Tests MUST fail initially (Red phase)
- Implementation proceeds only after failing tests are confirmed (Green phase)
- Code is refactored only after tests pass (Refactor phase)
- No feature is considered complete without comprehensive test coverage

**Rationale**: TDD ensures code quality, prevents regression, facilitates refactoring, and provides living documentation. For an educational platform handling student data, reliability is paramount.

### II. Full-Stack Integration Testing

Integration tests are REQUIRED for:
- API contract changes between backend and frontend
- Inter-service communication (if microservices are introduced)
- Database schema migrations and data integrity
- Authentication and authorization flows
- Third-party service integrations (AI/LLM services)

**Rationale**: Kampus Plus is a full-stack web application where frontend (React) and backend (FastAPI) must work seamlessly together. Integration tests catch interface mismatches early.

### III. Security by Default

Security MUST be built into every layer:
- HTTPS is mandatory for all connections (no HTTP fallback)
- JWT-based authentication is required for all protected endpoints
- Input validation and sanitization at both frontend and backend
- SQL injection and XSS protection via framework best practices
- Regular dependency vulnerability scans

**Rationale**: Educational platforms are attractive targets for attackers. Student data breaches have severe legal and reputational consequences.

### IV. AI Ethics & Privacy

When working with AI/LLM features, the following are NON-NEGOTIABLE:
- Student data MUST be anonymized before any AI processing
- LLM prompt logs MUST NOT be persisted
- User consent is required before any AI feature usage
- AI-generated content must be clearly labeled as such
- Regular audits of AI feature behavior for bias

**Rationale**: Ethical AI usage builds trust with students and educators. Privacy violations in education have long-term consequences for users.

### V. Branch Strategy & Version Control

Git workflow MUST follow these rules:
- `main` branch is the production-ready branch (protected, requires PR approval)
- Feature branches follow `feature/###-descriptive-name` naming convention
- All changes require pull request review before merging
- Commit messages follow conventional commits format
- No direct commits to `main` branch

**Rationale**: Clear branching strategy prevents merge conflicts, enables parallel development, and maintains a clean deployment pipeline.

### VI. Observability & Debugging

All services MUST implement:
- Structured logging (JSON format) with appropriate log levels
- Health check endpoints for monitoring
- Request tracing for debugging distributed issues
- Performance metrics collection
- Error tracking and alerting

**Rationale**: When issues occur in production, quick diagnosis is critical. Structured observability reduces mean time to resolution (MTTR).

## Technology Stack

The following technology choices are MANDATORY and MUST be used consistently across the project:

**Backend**:
- Language: Python 3.11+
- Framework: FastAPI
- Testing: pytest with pytest-asyncio for async tests
- API Documentation: FastAPI automatic OpenAPI/Swagger generation

**Frontend**:
- Language: TypeScript (preferred) or JavaScript
- Framework: React 18+
- Testing: React Testing Library + Jest
- State Management: Context API or Redux (to be decided per feature complexity)

**Deployment & Infrastructure**:
- Containerization: Docker with Docker Compose for local development
- Container orchestration: Docker Compose (production orchestration TBD)
- Database: PostgreSQL (or specify if different)
- Cache: Redis (if needed)

**Development Tools**:
- Version Control: Git + GitHub
- CI/CD: GitHub Actions (recommended)
- Code Quality: ESLint (frontend), Black + Flake8 (backend)

## Security & Privacy

### Authentication & Authorization
- JWT tokens with appropriate expiration times
- Refresh token rotation for security
- Role-based access control (RBAC) implementation
- Session management with secure cookies

### Data Protection
- Student personally identifiable information (PII) MUST be encrypted at rest
- Sensitive data in transit MUST use TLS 1.3+
- Database access credentials MUST be stored in environment variables, never in code
- Regular backups with encryption

### AI/LLM Security
- API keys for AI services MUST be rotated regularly
- Rate limiting on AI endpoints to prevent abuse
- Prompt injection attack prevention
- Data minimization: only send necessary context to AI services

## Development Workflow

### Team Structure & Responsibilities
- **Backend & AI Lead**: Python/FastAPI development, AI integration, database design
- **Frontend Lead**: React development, UI/UX implementation, state management
- **DevOps**: Docker/deployment, CI/CD pipelines, infrastructure monitoring
- **Project Manager**: Requirements gathering, sprint planning, stakeholder communication

### Code Review Process
1. All code changes MUST be submitted via pull request
2. At least one approval from relevant team lead required
3. Automated tests MUST pass before merge
4. PR description MUST reference related issue/feature spec
5. Code review checklist includes: test coverage, security review, constitution compliance

### Testing Gates
- **Unit Tests**: MUST pass before PR creation
- **Integration Tests**: MUST pass before merge to `main`
- **E2E Tests** (if applicable): MUST pass before production deployment
- Test coverage target: 80%+ for critical paths, 60%+ overall

### Definition of Done
A task is complete when:
1. Implementation matches acceptance criteria from spec
2. Unit and integration tests written and passing
3. Code reviewed and approved
4. Documentation updated (API docs, README, etc.)
5. No security vulnerabilities introduced
6. Constitution compliance verified

## Governance

### Amendment Process
1. Proposed amendments MUST be documented with rationale
2. Team review and discussion (async or in meeting)
3. Approval requires consensus from team leads
4. Version number updated according to semantic versioning:
   - **MAJOR**: Breaking changes to principles or workflow
   - **MINOR**: New principles or sections added
   - **PATCH**: Clarifications, typo fixes, non-breaking updates
5. Migration plan created for any breaking changes
6. All affected templates and documentation updated within same PR

### Compliance Review
- Constitution compliance is checked during every pull request review
- Monthly retrospective to assess if principles are being followed
- Team members can flag constitution violations anonymously
- Persistent violations trigger team discussion and process improvement

### Precedence
This constitution supersedes all other project practices and guidelines. When in doubt, refer to this document. For runtime development guidance beyond what's covered here, consult team leads or create a proposal for constitution amendment.

**Version**: 1.0.0 | **Ratified**: 2025-11-11 | **Last Amended**: 2025-11-11
