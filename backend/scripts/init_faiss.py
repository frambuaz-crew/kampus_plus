"""
FAISS Index Başlatma Script'i

Vector store'lar için boş FAISS index'leri oluşturur:
- VDB_Official: Resmi üniversite belgeleri
- VDB_User: Kullanıcı yüklemeleri
- VDB_Social: Forum içerikleri

Kullanım:
    python scripts/init_faiss.py

Gereksinimler:
    - faiss-cpu kurulu olmalı
    - data/vectors dizini otomatik oluşturulur
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import faiss


# Google Gemini text-embedding-004 için vector boyutu
EMBEDDING_DIMENSION = 768

# Storage paths
DATA_DIR = Path(__file__).parent.parent / "data" / "vectors"
INDEXES = {
    "VDB_Official": DATA_DIR / "vdb_official.index",
    "VDB_User": DATA_DIR / "vdb_user.index",
    "VDB_Social": DATA_DIR / "vdb_social.index",
}


def create_index(path: Path, name: str) -> None:
    """Boş FAISS index oluştur veya mevcut olanı yükle."""
    if path.exists():
        existing_index = faiss.read_index(str(path))
        print(f"   ⚠️  {name} zaten mevcut ({existing_index.ntotal} vector)")
        return
    
    index = faiss.IndexFlatL2(EMBEDDING_DIMENSION)
    faiss.write_index(index, str(path))
    print(f"   ✅ {name} oluşturuldu (0 vector)")


def init_indexes() -> None:
    """Boş FAISS index'lerini başlat."""
    print("=" * 60)
    print("🔧 FAISS Index Başlatma")
    print("=" * 60)
    
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📁 Data dizini: {DATA_DIR.absolute()}\n")
    
    for name, path in INDEXES.items():
        print(f"📊 {name}:")
        create_index(path, name)
    
    print("\n" + "=" * 60)
    print("✅ FAISS başlatma tamamlandı!")
    print("=" * 60)
    print(f"\n📝 Index dosyaları:")
    for name, path in INDEXES.items():
        print(f"   - {path}")


if __name__ == "__main__":
    init_indexes()
