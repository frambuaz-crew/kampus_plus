#!/bin/sh
# KAMPÜS+ Backend — Sıralı Başlangıç Scripti
# Kritik adımlar (migration) hata verirse container duruyor.
# Opsiyonel adımlar (seed, vektör, ingest) hata verse de uvicorn başlıyor.

set -e  # Kritik adımlar için: hata → container dur

echo "========================================="
echo "  KAMPÜS+ Backend Başlatılıyor..."
echo "========================================="
echo ""

# Runtime flags (compose/env ile override edilebilir)
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-true}"
RUN_BOOTSTRAP_TASKS="${RUN_BOOTSTRAP_TASKS:-false}"
RUN_VECTOR_SEED="${RUN_VECTOR_SEED:-false}"
RUN_DOCS_INGEST="${RUN_DOCS_INGEST:-false}"
UVICORN_RELOAD="${UVICORN_RELOAD:-false}"

# -------------------------------------------------------
# 1) Alembic — KRİTİK: başarısız olursa container durur
# -------------------------------------------------------
if [ "$RUN_DB_MIGRATIONS" = "true" ]; then
  echo "📦 [1/4] Alembic migration çalıştırılıyor..."
  python -m alembic upgrade head
  echo "✅ Migration tamamlandı."
else
  echo "⏭️  [1/4] Alembic migration atlandı (RUN_DB_MIGRATIONS=false)"
fi

# Bundan sonraki adımlar opsiyonel — set +e ile devam
set +e

# -------------------------------------------------------
# 2) Seed Data
# -------------------------------------------------------
if [ "$RUN_BOOTSTRAP_TASKS" = "true" ]; then
  echo ""
  echo "🌱 [2/4] Seed data yükleniyor..."
  python scripts/seed_data.py
  if [ $? -ne 0 ]; then
    echo "⚠️  Seed hatası (zaten yüklenmiş veya DB boş değil — devam ediliyor)"
  fi
else
  echo "⏭️  [2/4] Seed atlandı (RUN_BOOTSTRAP_TASKS=false)"
fi

# -------------------------------------------------------
# 3) Konya Vektör Hafızası (FAISS)
# -------------------------------------------------------
if [ "$RUN_BOOTSTRAP_TASKS" = "true" ] && [ "$RUN_VECTOR_SEED" = "true" ]; then
  echo ""
  echo "🧠 [3/4] Konya vektör hafızası yükleniyor..."
  python scripts/vector_seed_konya.py
  if [ $? -ne 0 ]; then
    echo "⚠️  Vektör seed hatası (index zaten mevcut olabilir — devam ediliyor)"
  fi
else
  echo "⏭️  [3/4] Vector seed atlandı (RUN_BOOTSTRAP_TASKS/RUN_VECTOR_SEED=false)"
fi

# -------------------------------------------------------
# 4) Doküman Ingest
# -------------------------------------------------------
if [ "$RUN_BOOTSTRAP_TASKS" = "true" ] && [ "$RUN_DOCS_INGEST" = "true" ]; then
  echo ""
  echo "📄 [4/4] raw_docs klasörü ingest ediliyor..."
  python scripts/ingest_docs.py
  if [ $? -ne 0 ]; then
    echo "⚠️  Doküman ingest hatası (devam ediliyor)"
  fi
else
  echo "⏭️  [4/4] Docs ingest atlandı (RUN_BOOTSTRAP_TASKS/RUN_DOCS_INGEST=false)"
fi

# Uvicorn kritik, set -e geri açıldı
set -e

echo ""
echo "========================================="
echo "  ✅ FastAPI başlatılıyor — port 8000"
echo "========================================="
echo ""

# exec: Docker sinyallerini (SIGTERM, SIGINT) uvicorn'a iletir.
# Bu olmadan Ctrl-C veya docker stop container'ı düzgün durduramaz.
if [ "$UVICORN_RELOAD" = "true" ]; then
  exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/src --log-level info
else
  exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --log-level info
fi
