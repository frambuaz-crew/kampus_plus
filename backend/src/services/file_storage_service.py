"""Dosya depolama servisi - Local storage.

Spec: specs/007-marketplace, specs/005-forum-page, specs/010-profile

NOT: Bu proje LOCAL STORAGE kullanır (backend/uploads/).
S3, MinIO veya cloud storage kullanılmaz.
Tüm dosyalar backend sunucusunun disk'inde saklanır.
"""

import logging
import shutil
from pathlib import Path
from typing import BinaryIO, Optional
from uuid import UUID

from src.core.config import get_settings

logger = logging.getLogger(__name__)


class FileStorageService:
    """Local dosya depolama servisi."""
    
    def __init__(self):
        """Dosya depolama servisini başlat."""
        self.settings = get_settings()
        # Absolute path kullan (proje root'una göre)
        self.upload_dir = self.settings.get_upload_dir_absolute()
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"FileStorageService initialized: upload_dir={self.upload_dir}")
    
    def _generate_file_path(self, category: str, user_id: UUID, resource_id: UUID, filename: str) -> Path:
        """Dosya yolu oluştur.
        
        Format: uploads/{category}/{user_id}/{resource_id}/{filename}
        
        Args:
            category: Kategori (marketplace, forum, profiles, academic)
            user_id: Kullanıcı UUID
            resource_id: Kaynak UUID (listing_id, post_id, vb.)
            filename: Dosya adı
        
        Returns:
            Dosya yolu (Path)
        """
        safe_filename = Path(filename).name
        file_path = self.upload_dir / category / str(user_id) / str(resource_id) / safe_filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        return file_path
    
    def _generate_url(self, file_path: Path) -> str:
        """Dosya URL'i oluştur.
        
        Format: /uploads/{category}/{user_id}/{resource_id}/{filename}
        """
        relative_path = file_path.relative_to(self.upload_dir)
        return f"/uploads/{relative_path.as_posix()}"
    
    async def upload_file(
        self,
        file: BinaryIO,
        category: str,
        user_id: UUID,
        resource_id: UUID,
        filename: str,
    ) -> str:
        """Dosyayı local storage'a yükle.
        
        Args:
            file: Dosya objesi
            category: Kategori (marketplace, forum, profiles, academic)
            user_id: Kullanıcı UUID
            resource_id: Kaynak UUID
            filename: Dosya adı
        
        Returns:
            Dosya URL'i (/uploads/...)
        """
        file_path = self._generate_file_path(category, user_id, resource_id, filename)
        
        try:
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file, f)
            
            url = self._generate_url(file_path)
            logger.info(f"Dosya yüklendi: {url}")
            return url
            
        except Exception as e:
            logger.error(f"Dosya yükleme hatası: {e}", exc_info=True)
            raise
    
    async def delete_file(self, file_url: str) -> bool:
        """Dosyayı sil.
        
        Args:
            file_url: Dosya URL'i (/uploads/...)
        
        Returns:
            Başarılıysa True
        """
        try:
            # URL'den dosya yolunu çıkar
            relative_path = file_url.replace("/uploads/", "")
            file_path = self.upload_dir / relative_path
            
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Dosya silindi: {file_url}")
                return True
            else:
                logger.warning(f"Dosya bulunamadı: {file_url}")
                return False
                
        except Exception as e:
            logger.error(f"Dosya silme hatası: {file_url} - {e}", exc_info=True)
            return False
    
    def file_exists(self, file_url: str) -> bool:
        """Dosyanın var olup olmadığını kontrol et.
        
        Args:
            file_url: Dosya URL'i (/uploads/...)
        
        Returns:
            Dosya varsa True
        """
        try:
            relative_path = file_url.replace("/uploads/", "")
            file_path = self.upload_dir / relative_path
            return file_path.exists()
        except Exception:
            return False
    
    def get_file_path(self, file_url: str) -> Optional[Path]:
        """Dosya yolunu al.
        
        Args:
            file_url: Dosya URL'i (/uploads/...)
        
        Returns:
            Dosya yolu (Path) veya None
        """
        try:
            relative_path = file_url.replace("/uploads/", "")
            file_path = self.upload_dir / relative_path
            return file_path if file_path.exists() else None
        except Exception:
            return None


_file_storage_service: Optional[FileStorageService] = None


def get_file_storage_service() -> FileStorageService:
    """Dosya depolama servisi singleton instance'ı al veya oluştur."""
    global _file_storage_service
    if _file_storage_service is None:
        _file_storage_service = FileStorageService()
    return _file_storage_service

