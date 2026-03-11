# KAMPÜS+ Backend Dockerfile
# Multi-stage build ile optimize edilmiş image boyutu

# Stage 1: Builder (Bağımlılık kurulumu)
FROM python:3.11-slim as builder

WORKDIR /build

# Build bağımlılıkları kur
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Requirements kopyala ve Python paketlerini kur
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime (Production image)
FROM python:3.11-slim

# Runtime bağımlılıkları (healthcheck için curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root kullanıcı oluştur (güvenlik)
# NOT: Local storage kullanılır (uploads klasörü), S3/MinIO yok
RUN useradd -m -u 1000 kampus && \
    mkdir -p /app/data/vectors /app/data/raw_docs /app/uploads && \
    chown -R kampus:kampus /app

WORKDIR /app

# Builder'dan Python paketlerini kopyala
COPY --from=builder /root/.local /home/kampus/.local

# Uygulama kodunu kopyala
COPY --chown=kampus:kampus src ./src
COPY --chown=kampus:kampus alembic ./alembic
COPY --chown=kampus:kampus scripts ./scripts
COPY --chown=kampus:kampus alembic.ini .
COPY --chown=kampus:kampus entrypoint.sh .
# CRLF → LF dönüşümü (Windows'ta düzenlenen dosyalar için) + çalıştırma izni
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Environment değişkenleri
ENV PATH=/home/kampus/.local/bin:$PATH \
    PYTHONPATH=/app:$PYTHONPATH \
    PYTHONUNBUFFERED=1

# Non-root kullanıcıya geç
USER kampus

# Port aç
EXPOSE 8000

# Başlangıç: migration → seed → vektör → ingest → uvicorn
# docker-compose'da CMD override'ı hâlâ çalışır; ENTRYPOINT yerine kullanılır
CMD ["./entrypoint.sh"]
