"""Vector store servisi - Doküman embedding'leri ve benzerlik araması.

Spec: specs/009-ai-assistant/spec.md
Sadece resmi dokümanlar için FAISS vector store.
"""

import logging
import importlib.util
from pathlib import Path
from typing import List, Optional, Tuple, Dict

import faiss
import numpy as np
from google import genai as google_genai

from src.core.config import get_settings


logger = logging.getLogger(__name__)


class VectorStoreService:
    """FAISS vector store ve Google Gemini embedding yönetimi servisi."""
    
    EMBEDDING_DIMENSION = 768
    
    def __init__(self):
        """Vector store servisini başlat."""
        self.settings = get_settings()
        
        self._genai_client = google_genai.Client(api_key=self.settings.google_api_key)

        self.data_dir = Path(self.settings.vector_store_path)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.official_index_path = self.data_dir / "vdb_official.index"
        
        self.vdb_official = self._load_or_create_index(
            self.official_index_path,
            "VDB_Official"
        )
        
        self.official_metadata: Dict[int, Dict] = {}
        
        self._load_metadata_from_file()
        
        logger.info(
            f"VectorStoreService initialized. "
            f"Official: {self.vdb_official.ntotal} vectors ({len(self.official_metadata)} metadata)"
        )
    
    def _load_or_create_index(self, path: Path, name: str) -> faiss.IndexFlatL2:
        """Mevcut FAISS index'i yükle veya yeni oluştur."""
        if path.exists():
            try:
                index = faiss.read_index(str(path))
                logger.info(f"{name} yüklendi: {path} ({index.ntotal} vektör)")
                return index
            except Exception as e:
                logger.warning(f"{name} yüklenemedi: {e}. Yeni index oluşturuluyor.")
        
        index = faiss.IndexFlatL2(self.EMBEDDING_DIMENSION)
        logger.info(f"Yeni {name} index'i oluşturuldu")
        return index
    
    def _load_metadata_from_file(self) -> None:
        """Test verileri için metadata dosyasını yükle."""
        scripts_dir = Path(__file__).parent.parent.parent / "scripts"
        metadata_file = scripts_dir / "metadata_official.py"
        
        if metadata_file.exists():
            try:
                spec = importlib.util.spec_from_file_location("metadata_official", metadata_file)
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    self.official_metadata = getattr(module, "OFFICIAL_METADATA", {})
                    logger.info(f"Test verilerinden {len(self.official_metadata)} metadata yüklendi")
            except Exception as e:
                logger.warning(f"Metadata dosyası yüklenemedi: {e}")
    
    def save_indexes(self) -> None:
        """Tüm index'leri diske kaydet."""
        try:
            faiss.write_index(self.vdb_official, str(self.official_index_path))
            logger.info("Vector index'leri diske kaydedildi")
        except Exception as e:
            logger.error(f"Index kaydetme hatası: {e}")
            raise
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Google Gemini API ile embedding vektörü oluştur."""
        try:
            result = self._genai_client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
            )
            return result.embeddings[0].values
        except Exception as e:
            logger.error(f"Embedding oluşturma hatası: {e}")
            raise
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Birden fazla metin için embedding oluştur."""
        if not texts:
            return []
        
        try:
            embeddings = []
            for text in texts:
                result = self._genai_client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=text,
                )
                embeddings.append(result.embeddings[0].values)
            return embeddings
        except Exception as e:
            logger.error(f"Batch embedding oluşturma hatası: {e}")
            raise
    
    async def add_to_official(
        self,
        texts: List[str],
        metadata: Optional[List[Dict]] = None
    ) -> List[int]:
        """Resmi dokümanları vector store'a ekle.
        
        Args:
            texts: Eklenecek metin parçaları listesi
            metadata: Her metin için opsiyonel metadata
        
        Returns:
            Her metne atanan FAISS index ID'leri listesi
        """
        if not texts:
            return []
        
        embeddings = await self.generate_embeddings_batch(texts)
        vectors = np.array(embeddings, dtype=np.float32)
        
        current_size = self.vdb_official.ntotal
        
        self.vdb_official.add(vectors)
        
        assigned_ids = list(range(current_size, current_size + len(texts)))
        
        if metadata:
            for idx, meta, text in zip(assigned_ids, metadata, texts):
                meta_with_text = {**meta, "text": text}
                self.official_metadata[idx] = meta_with_text
        else:
            for idx, text in zip(assigned_ids, texts):
                self.official_metadata[idx] = {"text": text}
        
        self.save_indexes()
        
        logger.info(f"{len(texts)} vektör VDB_Official'e eklendi (ID'ler: {assigned_ids[0]}-{assigned_ids[-1]})")
        
        return assigned_ids
    
    async def search_official(
        self,
        query_text: str,
        k: int = 5
    ) -> List[Tuple[int, float]]:
        """Resmi dokümanlarda benzerlik araması yap.
        
        Args:
            query_text: Arama sorgusu
            k: Döndürülecek sonuç sayısı (varsayılan 5)
        
        Returns:
            (index_id, distance) tuple'ları listesi, benzerliğe göre sıralı
        """
        if self.vdb_official.ntotal == 0:
            return []
        
        try:
            query_embedding = await self.generate_embedding(query_text)
            query_vector = np.array([query_embedding], dtype=np.float32)
            
            distances, indices = self.vdb_official.search(query_vector, k)
        except Exception as e:
            logger.warning(f"Embedding oluşturma hatası: {e}. MOCK MODE kullanılıyor")
            results = [(i, float(i) * 0.1) for i in range(min(k, self.vdb_official.ntotal))]
            return results
        
        results = [
            (int(idx), float(dist))
            for idx, dist in zip(indices[0], distances[0])
            if idx != -1
        ]
        
        return results
    
    def get_official_stats(self) -> Dict[str, int]:
        """Resmi vector store istatistiklerini al."""
        return {
            "total_vectors": self.vdb_official.ntotal,
            "dimension": self.EMBEDDING_DIMENSION,
            "metadata_count": len(self.official_metadata)
        }


_vector_service_instance: Optional[VectorStoreService] = None


def get_vector_service() -> VectorStoreService:
    """VectorStoreService singleton instance'ı al veya oluştur."""
    global _vector_service_instance
    
    if _vector_service_instance is None:
        _vector_service_instance = VectorStoreService()
    
    return _vector_service_instance
