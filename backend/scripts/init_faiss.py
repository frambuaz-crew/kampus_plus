"""
FAISS Index Initialization Script

Creates empty FAISS indexes for vector stores:
- VDB_Official: Official university documents
- VDB_User: User-uploaded PDFs

Usage:
    python scripts/init_faiss.py

Requirements:
    - faiss-cpu installed
    - data/vectors directory will be created automatically
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import faiss


# Vector dimension for OpenAI text-embedding-3-small
EMBEDDING_DIMENSION = 1536

# Storage paths
DATA_DIR = Path(__file__).parent.parent / "data" / "vectors"
OFFICIAL_INDEX_PATH = DATA_DIR / "vdb_official.index"
USER_INDEX_PATH = DATA_DIR / "vdb_user.index"


def init_indexes() -> None:
    """Initialize empty FAISS indexes."""
    print("=" * 60)
    print("🔧 FAISS Index Initialization")
    print("=" * 60)
    
    # Create data directory if it doesn't exist
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📁 Data directory: {DATA_DIR.absolute()}")
    
    # Initialize VDB_Official
    print("\n📊 VDB_Official (Official Documents):")
    if OFFICIAL_INDEX_PATH.exists():
        existing_index = faiss.read_index(str(OFFICIAL_INDEX_PATH))
        print(f"   ⚠️  Index already exists with {existing_index.ntotal} vectors")
        overwrite = input("   Overwrite? (y/N): ").lower().strip()
        if overwrite != 'y':
            print(f"   ⏭️  Skipped")
        else:
            vdb_official = faiss.IndexFlatL2(EMBEDDING_DIMENSION)
            faiss.write_index(vdb_official, str(OFFICIAL_INDEX_PATH))
            print(f"   ✅ Created empty index (0 vectors)")
    else:
        vdb_official = faiss.IndexFlatL2(EMBEDDING_DIMENSION)
        faiss.write_index(vdb_official, str(OFFICIAL_INDEX_PATH))
        print(f"   ✅ Created empty index (0 vectors)")
    
    # Initialize VDB_User
    print("\n📊 VDB_User (User Documents):")
    if USER_INDEX_PATH.exists():
        existing_index = faiss.read_index(str(USER_INDEX_PATH))
        print(f"   ⚠️  Index already exists with {existing_index.ntotal} vectors")
        overwrite = input("   Overwrite? (y/N): ").lower().strip()
        if overwrite != 'y':
            print(f"   ⏭️  Skipped")
        else:
            vdb_user = faiss.IndexFlatL2(EMBEDDING_DIMENSION)
            faiss.write_index(vdb_user, str(USER_INDEX_PATH))
            print(f"   ✅ Created empty index (0 vectors)")
    else:
        vdb_user = faiss.IndexFlatL2(EMBEDDING_DIMENSION)
        faiss.write_index(vdb_user, str(USER_INDEX_PATH))
        print(f"   ✅ Created empty index (0 vectors)")
    
    print("\n" + "=" * 60)
    print("✅ FAISS initialization completed!")
    print("=" * 60)
    print(f"\n📝 Index files:")
    print(f"   - {OFFICIAL_INDEX_PATH}")
    print(f"   - {USER_INDEX_PATH}")


if __name__ == "__main__":
    init_indexes()
