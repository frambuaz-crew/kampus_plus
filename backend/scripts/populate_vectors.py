"""
Vector veritabanını metadata'dan doldurma script'i.

metadata_official.py dosyasından test verilerini okur ve FAISS vector store'a ekler.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.services.vector_service import VectorStoreService


async def populate_official_vectors():
    """Resmi vector store'u test verilerinden doldur."""
    print("=" * 60)
    print("🔧 Vector Store Doldurma")
    print("=" * 60)
    
    service = VectorStoreService()
    metadata_list = list(service.official_metadata.values())
    
    if not metadata_list:
        print("❌ Metadata bulunamadı!")
        return
    
    texts = [meta.get("text", "") for meta in metadata_list if meta.get("text")]
    
    if not texts:
        print("❌ Metin içeriği bulunamadı!")
        return
    
    print(f"📊 {len(texts)} belge bulundu, ekleniyor...")
    
    try:
        ids = await service.add_to_official(
            texts=texts,
            metadata=metadata_list
        )
        
        print(f"✅ {len(ids)} vector eklendi")
        print(f"📈 Toplam vector: {service.vdb_official.ntotal}")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Hata: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(populate_official_vectors())
