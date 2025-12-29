# Performance & Load Testing Suite (T165-T167)

This directory contains performance and load testing suites for the KAMPÜS+ AI Platform.

## Test Files

### 1. `test_ai_performance.py` (T165)
**Purpose**: Tests AI query response time and system performance

**Targets**:
- AI query response time: <5 seconds
- Non-AI operations: <200ms
- Vector search: <1 second
- End-to-end chat flow: <10 seconds

**Test Classes**:
- `TestAIQueryPerformance`: AI chatbot response time tests (7 tests)
- `TestVectorSearchPerformance`: FAISS vector retrieval tests (2 tests)
- `TestDatabaseQueryPerformance`: Database query performance (3 tests)

**Usage**:
```bash
# Run all AI performance tests
pytest backend/tests/performance/test_ai_performance.py -v

# Run with benchmark statistics
pytest backend/tests/performance/test_ai_performance.py -v --benchmark-only

# Run specific test
pytest backend/tests/performance/test_ai_performance.py::TestAIQueryPerformance::test_ai_query_response_time_simple -v
```

**Requirements**:
- `pytest-benchmark==4.0.0`

---

### 2. `test_load.py` (T166)
**Purpose**: Load testing with Locust to simulate concurrent users

**Targets**:
- 500+ concurrent users
- p95 latency <200ms for non-AI endpoints
- p95 latency <5s for AI endpoints
- Failure rate <1%

**User Classes**:
- `KampusPlusUser`: Simulates typical user behavior (browsing, chat, documents, forum)
  - 40% Health/Info endpoints
  - 30% Forum browsing
  - 20% Document management
  - 10% AI chat
- `AuthOnlyUser`: Tests authentication endpoints under high load

**Usage**:
```bash
# Web UI mode (interactive dashboard)
locust -f backend/tests/performance/test_load.py --host=http://localhost:8000
# Then open http://localhost:8089

# Headless mode with 500 users (T166 target)
locust -f backend/tests/performance/test_load.py --host=http://localhost:8000 \
       --users=500 --spawn-rate=10 --run-time=10m --headless

# Quick test with 50 users
locust -f backend/tests/performance/test_load.py --host=http://localhost:8000 \
       --users=50 --spawn-rate=5 --run-time=2m

# Generate CSV reports
locust -f backend/tests/performance/test_load.py --host=http://localhost:8000 \
       --users=500 --spawn-rate=10 --run-time=10m --headless --csv=results

# Test auth endpoints only
locust -f backend/tests/performance/test_load.py --host=http://localhost:8000 \
       --users=200 --spawn-rate=10 AuthOnlyUser
```

**Metrics to Monitor**:
- Requests per second (RPS)
- Response times (min, max, avg, median, p95, p99)
- Failure rate
- CPU and memory usage
- Database connection pool utilization

**Requirements**:
- `locust==2.31.8`

---

### 3. `test_pdf_performance.py` (T167)
**Purpose**: Tests PDF upload and processing pipeline performance

**Targets**:
- 10MB PDF processed in <2 minutes (PRIMARY TARGET)
- 5MB PDF processed in <90 seconds
- 1MB PDF processed in <30 seconds
- Upload times: <5s (1MB), <10s (5MB), <15s (10MB)

**Test Classes**:
- `TestPDFUploadPerformance`: Upload endpoint performance (3 tests)
- `TestPDFProcessingPerformance`: Complete processing pipeline (4 tests)
  - Text extraction
  - Chunking
  - Embedding generation
  - Vectorization

**Usage**:
```bash
# Run all PDF performance tests
pytest backend/tests/performance/test_pdf_performance.py -v

# Run T167 primary test (10MB PDF in <2 minutes)
pytest backend/tests/performance/test_pdf_performance.py::TestPDFProcessingPerformance::test_pdf_processing_time_large -v

# Run fast tests only (skip slow processing tests)
pytest backend/tests/performance/test_pdf_performance.py -v -m "not slow"

# Run slow tests only
pytest backend/tests/performance/test_pdf_performance.py -v -m slow

# With benchmark statistics
pytest backend/tests/performance/test_pdf_performance.py -v --benchmark-only
```

**Requirements**:
- `pytest-benchmark==4.0.0`
- `reportlab==4.2.5`

---

## Installation

Install all performance testing dependencies:

```bash
cd backend
pip install pytest-benchmark==4.0.0 locust==2.31.8 reportlab==4.2.5
```

Or install from requirements.txt:

```bash
cd backend
pip install -r requirements.txt
```

---

## Running All Performance Tests

```bash
# Run pytest-based tests (T165, T167)
pytest backend/tests/performance/ -v

# Skip slow tests for quick validation
pytest backend/tests/performance/ -v -m "not slow"

# Run locust load tests separately (T166)
locust -f backend/tests/performance/test_load.py --host=http://localhost:8000
```

---

## Success Criteria

### T165: AI Performance Tests
✅ All AI queries respond within <5 seconds  
✅ Non-AI operations respond within <200ms  
✅ Vector search completes within <1 second  
✅ End-to-end chat flow completes within <10 seconds

### T166: Load Tests
✅ System handles 500+ concurrent users  
✅ p95 latency <200ms for non-AI endpoints  
✅ p95 latency <5s for AI endpoints  
✅ Failure rate <1%  
✅ System remains stable for 10+ minute runs

### T167: PDF Processing Tests
✅ 10MB PDF processes in <2 minutes  
✅ 5MB PDF processes in <90 seconds  
✅ 1MB PDF processes in <30 seconds  
✅ System handles concurrent PDF uploads

---

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/performance.yml
- name: Run Performance Tests
  run: |
    pytest backend/tests/performance/test_ai_performance.py -v --benchmark-only
    pytest backend/tests/performance/test_pdf_performance.py -v -m "not slow"

- name: Run Load Tests
  run: |
    locust -f backend/tests/performance/test_load.py --host=http://localhost:8000 \
           --users=100 --spawn-rate=5 --run-time=2m --headless
```

---

## Troubleshooting

### Slow Test Execution
- Use `-m "not slow"` to skip long-running tests
- Run load tests with fewer users: `--users=50`
- Check database connection pool settings
- Monitor system resources (CPU, memory, disk I/O)

### AI Query Timeouts
- Check OpenAI/Gemini API rate limits
- Verify vector database indexes are loaded
- Check LangChain configuration
- Review anonymization service performance

### PDF Processing Timeouts
- Ensure background task processor is running
- Check S3/MinIO connectivity
- Verify ClamAV is running for malware scanning
- Monitor FAISS index write performance

---

## Constitution Compliance

These tests validate:
- **NFR-001**: Performance targets (500+ concurrent users, <200ms p95)
- **NFR-002**: AI response time (<5s)
- **NFR-003**: PDF processing time (<2 minutes for 10MB)
- **FR-007**: AI service monitoring
- **FR-011**: Document processing pipeline

---

**Last Updated**: 2025-12-28  
**Tasks**: T165, T166, T167  
**Status**: All tests implemented and ready for execution
