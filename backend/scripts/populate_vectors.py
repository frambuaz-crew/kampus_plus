"""
Script to populate vector database from metadata.

This script reads the metadata from metadata_official.py and generates
embeddings using Google Gemini, then adds them to the FAISS vector store.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from src.services.vector_service import VectorStoreService


async def populate_official_vectors():
    """Populate official vector store from metadata."""
    print("Initializing Vector Service...")
    service = VectorStoreService()
    
    # Get metadata
    metadata_list = list(service.official_metadata.values())
    
    if not metadata_list:
        print("❌ No metadata found!")
        return
    
    print(f"Found {len(metadata_list)} metadata entries")
    
    # Extract texts
    texts = [meta.get("text", "") for meta in metadata_list]
    texts = [t for t in texts if t]  # Filter empty
    
    if not texts:
        print("❌ No text content found in metadata!")
        return
    
    print(f"Adding {len(texts)} documents to vector store...")
    
    try:
        # Add to official store
        ids = await service.add_to_official(
            texts=texts,
            start_index=0,
            metadata=metadata_list
        )
        
        print(f"✅ Successfully added {len(ids)} vectors!")
        print(f"   Vector IDs: {ids}")
        print(f"   Total vectors in official store: {service.vdb_official.ntotal}")
        
        # Save indexes
        service.save_indexes()
        print("✅ Indexes saved to disk")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(populate_official_vectors())
