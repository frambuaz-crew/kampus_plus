# ============================================================================
# Kampus+ Backend Dockerfile
# Multi-stage build for optimal image size
# ============================================================================

# ============================================================================
# Stage 1: Builder (Dependencies Installation)
# ============================================================================
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ============================================================================
# Stage 2: Runtime (Production Image)
# ============================================================================
FROM python:3.11-slim

# Install runtime dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (security best practice)
RUN useradd -m -u 1000 kampus && \
    mkdir -p /app/data/vectors /app/scripts && \
    chown -R kampus:kampus /app

WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /home/kampus/.local

# Copy application code
COPY --chown=kampus:kampus src ./src
COPY --chown=kampus:kampus alembic ./alembic
COPY --chown=kampus:kampus scripts ./scripts
COPY --chown=kampus:kampus data ./data
COPY --chown=kampus:kampus alembic.ini .
COPY --chown=kampus:kampus pytest.ini .

# Environment variables
ENV PATH=/home/kampus/.local/bin:$PATH \
    PYTHONPATH=/app:$PYTHONPATH \
    PYTHONUNBUFFERED=1

# Switch to non-root user
USER kampus

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
