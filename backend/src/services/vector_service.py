"""Vector store service for FAISS-based document embeddings.

This module manages dual vector stores:
- VDB_Official: Official university documents (UZEM, announcements, schedules)
- VDB_User: User-uploaded PDFs (personal notes, materials)

Uses FAISS IndexFlatL2 for similarity search with OpenAI embeddings.
"""

import os
from pathlib import Path
from typing import List, Tuple

import faiss
import numpy as np
from openai import AsyncOpenAI

from src.core.config import get_settings


class VectorStoreService:
    """Manages FAISS vector stores for document embeddings."""
    
    # Vector dimension for OpenAI text-embedding-3-small
    EMBEDDING_DIMENSION = 1536
    
    def __init__(self):
        """Initialize vector store service."""
        settings = get_settings()
        
        # OpenAI client
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.embedding_model = "text-embedding-3-small"
        
        # Storage paths
        self.data_dir = Path("data/vectors")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.official_index_path = self.data_dir / "vdb_official.index"
        self.user_index_path = self.data_dir / "vdb_user.index"
        
        # FAISS indexes
        self.vdb_official: faiss.IndexFlatL2 | None = None
        self.vdb_user: faiss.IndexFlatL2 | None = None
        
        # Load or create indexes
        self._initialize_indexes()
    
    def _initialize_indexes(self) -> None:
        """Load existing indexes from disk or create new ones."""
        # Official documents index
        if self.official_index_path.exists():
            self.vdb_official = faiss.read_index(str(self.official_index_path))
            print(f"✅ Loaded VDB_Official: {self.vdb_official.ntotal} vectors")
        else:
            self.vdb_official = faiss.IndexFlatL2(self.EMBEDDING_DIMENSION)
            print(f"✅ Created new VDB_Official (empty)")
        
        # User documents index
        if self.user_index_path.exists():
            self.vdb_user = faiss.read_index(str(self.user_index_path))
            print(f"✅ Loaded VDB_User: {self.vdb_user.ntotal} vectors")
        else:
            self.vdb_user = faiss.IndexFlatL2(self.EMBEDDING_DIMENSION)
            print(f"✅ Created new VDB_User (empty)")
    
    def save_indexes(self) -> None:
        """Persist indexes to disk."""
        if self.vdb_official is not None:
            faiss.write_index(self.vdb_official, str(self.official_index_path))
            print(f"💾 Saved VDB_Official: {self.vdb_official.ntotal} vectors")
        
        if self.vdb_user is not None:
            faiss.write_index(self.vdb_user, str(self.user_index_path))
            print(f"💾 Saved VDB_User: {self.vdb_user.ntotal} vectors")
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text using OpenAI.
        
        Args:
            text: Text to embed.
        
        Returns:
            List of floats representing the embedding vector.
        """
        response = await self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=text,
        )
        return response.data[0].embedding
    
    async def add_to_official(
        self,
        texts: List[str],
        start_index: int,
    ) -> List[int]:
        """Add embeddings to official documents vector store.
        
        Args:
            texts: List of text chunks to embed and add.
            start_index: Starting FAISS index ID.
        
        Returns:
            List of FAISS index IDs for the added vectors.
        """
        # Generate embeddings
        embeddings = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            embeddings.append(embedding)
        
        # Convert to numpy array
        vectors = np.array(embeddings, dtype=np.float32)
        
        # Add to index
        self.vdb_official.add(vectors)
        
        # Return assigned indexes
        faiss_ids = list(range(start_index, start_index + len(texts)))
        
        # Auto-save after adding
        self.save_indexes()
        
        return faiss_ids
    
    async def add_to_user(
        self,
        texts: List[str],
        start_index: int,
    ) -> List[int]:
        """Add embeddings to user documents vector store.
        
        Args:
            texts: List of text chunks to embed and add.
            start_index: Starting FAISS index ID.
        
        Returns:
            List of FAISS index IDs for the added vectors.
        """
        # Generate embeddings
        embeddings = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            embeddings.append(embedding)
        
        # Convert to numpy array
        vectors = np.array(embeddings, dtype=np.float32)
        
        # Add to index
        self.vdb_user.add(vectors)
        
        # Return assigned indexes
        faiss_ids = list(range(start_index, start_index + len(texts)))
        
        # Auto-save after adding
        self.save_indexes()
        
        return faiss_ids
    
    async def search_official(
        self,
        query: str,
        k: int = 5,
    ) -> List[Tuple[int, float]]:
        """Search official documents vector store.
        
        Args:
            query: Search query text.
            k: Number of nearest neighbors to return.
        
        Returns:
            List of (faiss_index_id, distance) tuples, sorted by distance.
        """
        # Generate query embedding
        query_embedding = await self.generate_embedding(query)
        query_vector = np.array([query_embedding], dtype=np.float32)
        
        # Search
        distances, indices = self.vdb_official.search(query_vector, k)
        
        # Return results as list of tuples
        results = [
            (int(idx), float(dist))
            for idx, dist in zip(indices[0], distances[0])
            if idx != -1  # Filter out padding results
        ]
        
        return results
    
    async def search_user(
        self,
        query: str,
        k: int = 5,
    ) -> List[Tuple[int, float]]:
        """Search user documents vector store.
        
        Args:
            query: Search query text.
            k: Number of nearest neighbors to return.
        
        Returns:
            List of (faiss_index_id, distance) tuples, sorted by distance.
        """
        # Generate query embedding
        query_embedding = await self.generate_embedding(query)
        query_vector = np.array([query_embedding], dtype=np.float32)
        
        # Search
        distances, indices = self.vdb_user.search(query_vector, k)
        
        # Return results as list of tuples
        results = [
            (int(idx), float(dist))
            for idx, dist in zip(indices[0], distances[0])
            if idx != -1  # Filter out padding results
        ]
        
        return results
    
    async def search_both(
        self,
        query: str,
        k_per_store: int = 5,
    ) -> Tuple[List[Tuple[int, float]], List[Tuple[int, float]]]:
        """Search both vector stores and return separate results.
        
        Args:
            query: Search query text.
            k_per_store: Number of results from each store.
        
        Returns:
            Tuple of (official_results, user_results).
        """
        official_results = await self.search_official(query, k_per_store)
        user_results = await self.search_user(query, k_per_store)
        
        return official_results, user_results
    
    def remove_from_official(self, faiss_ids: List[int]) -> None:
        """Remove vectors from official store.
        
        Note: FAISS IndexFlatL2 doesn't support direct removal.
        This method is a placeholder for future implementation
        using IDMap or reconstruction.
        
        Args:
            faiss_ids: List of FAISS index IDs to remove.
        """
        raise NotImplementedError(
            "FAISS IndexFlatL2 doesn't support removal. "
            "Consider using IndexIDMap wrapper for this feature."
        )
    
    def remove_from_user(self, faiss_ids: List[int]) -> None:
        """Remove vectors from user store.
        
        Note: FAISS IndexFlatL2 doesn't support direct removal.
        This method is a placeholder for future implementation
        using IDMap or reconstruction.
        
        Args:
            faiss_ids: List of FAISS index IDs to remove.
        """
        raise NotImplementedError(
            "FAISS IndexFlatL2 doesn't support removal. "
            "Consider using IndexIDMap wrapper for this feature."
        )
    
    def get_stats(self) -> dict:
        """Get statistics about vector stores.
        
        Returns:
            Dictionary with store statistics.
        """
        return {
            "vdb_official": {
                "total_vectors": self.vdb_official.ntotal if self.vdb_official else 0,
                "dimension": self.EMBEDDING_DIMENSION,
                "file_exists": self.official_index_path.exists(),
            },
            "vdb_user": {
                "total_vectors": self.vdb_user.ntotal if self.vdb_user else 0,
                "dimension": self.EMBEDDING_DIMENSION,
                "file_exists": self.user_index_path.exists(),
            },
            "embedding_model": self.embedding_model,
        }


# Global service instance
_vector_service: VectorStoreService | None = None


def get_vector_service() -> VectorStoreService:
    """Get or create the global vector service instance.
    
    Returns:
        VectorStoreService: Singleton instance.
    """
    global _vector_service
    
    if _vector_service is None:
        _vector_service = VectorStoreService()
    
    return _vector_service
