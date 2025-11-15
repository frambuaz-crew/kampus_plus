# ============================================================================
# Stage 1: Builder (dependencies kurulumu)
# ============================================================================
FROM python:3.11-slim as builder

# Çalışma dizini
WORKDIR /app

# Build dependencies (C compiler vb. gerekirse)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies'i kopyala ve kur
COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# ============================================================================
# Stage 2: Runtime (production image)
# ============================================================================
FROM python:3.11-slim

# Non-root user oluştur (security best practice)
RUN useradd -m -u 1000 kampus && \
    mkdir -p /app /app/data/vectors && \
    chown -R kampus:kampus /app

# Çalışma dizini
WORKDIR /app

# Stage 1'den dependencies'leri kopyala
COPY --from=builder /root/.local /home/kampus/.local

# Application code'u kopyala
COPY --chown=kampus:kampus . .

# Python path'e user site-packages ekle
ENV PATH=/home/kampus/.local/bin:$PATH
ENV PYTHONPATH=/app/src:$PYTHONPATH

# Non-root user'a geç
USER kampus

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Port expose
EXPOSE 8000

# Uvicorn ile FastAPI'yi başlat
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
