import json
import logging
from typing import Optional, Dict
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.university import University

logger = logging.getLogger(__name__)

class UniversityService:
    """Üniversite servisi - Email domain'lerinden temiz isimler çıkarır."""

    # 🚀 Öncelikli Eşleştirme (Veritabanında olmayan veya özel isimler için)
    # Burası veritabanından her zaman daha öncelikli çalışır.
    SPECIAL_OVERRIDES: Dict[str, str] = {
        "gidatarim": "Konya Gıda ve Tarım Üniversitesi",
        "selcuk": "Selçuk Üniversitesi",
        "metu": "Orta Doğu Teknik Üniversitesi",
        "odtu": "Orta Doğu Teknik Üniversitesi",
        "itu": "İstanbul Teknik Üniversitesi"
    }

    def _get_clean_domain_parts(self, email: str) -> tuple[str, str]:
        """Email'den tam domain'i ve temizlenmiş kök domain'i döner."""
        full_domain = email.split("@")[1].lower().strip()
        
        # Temizleme işlemi (ogr., std. gibi ekleri atar)
        root_domain = full_domain
        prefixes = ["ogr.", "std.", "ogrenci.", "mail.", "posta."]
        for pref in prefixes:
            if root_domain.startswith(pref):
                root_domain = root_domain.replace(pref, "", 1)
        
        # Kök isim (örn: selcuk.edu.tr -> selcuk)
        root_name = root_domain.split(".")[0]
        
        return full_domain, root_name

    async def get_university_from_email(
        self,
        email: str,
        session: AsyncSession,
    ) -> str:
        """Email adresinden üniversite ismini optimize bir şekilde çıkarır."""
        if not email or "@" not in email:
            return "Bilinmeyen Üniversite"
        
        full_domain, root_name = self._get_clean_domain_parts(email)
        
        # 💡 ADIM 1: Özel Mapping Kontrolü (Hızlı sonuç)
        if root_name in self.SPECIAL_OVERRIDES:
            return self.SPECIAL_OVERRIDES[root_name]

        # 💡 ADIM 2: Veritabanında Akıllı Arama
        # Tüm üniversiteleri çekmek yerine sadece domain eşleşeni arıyoruz.
        try:
            # email_domains bir JSON string olduğu için LIKE ile içinde arıyoruz
            # Örn: %"selcuk.edu.tr"% araması JSON array içindeki tam eşleşmeyi yakalar
            stmt = select(University).where(
                University.is_active == True,
                or_(
                    University.email_domains.like(f'%"%{full_domain}%"'),
                    University.name.ilike(f"%{root_name}%")
                )
            ).limit(1)
            
            result = await session.execute(stmt)
            uni = result.scalar_one_or_none()
            
            if uni:
                return uni.name
        except Exception as e:
            logger.error(f"Üniversite aranırken DB hatası: {e}")

        # 💡 ADIM 3: Fallback (Hiçbir yerde bulunamazsa otomatik oluştur)
        return self._generate_fallback_name(root_name)
    
    def _generate_fallback_name(self, root_name: str) -> str:
        """Format: Selcuk -> Selçuk Üniversitesi"""
        # Manuel düzeltmeler
        corrections = {
            "selcuk": "Selçuk",
            "gidatarim": "Gıda ve Tarım",
            "istanbul": "İstanbul",
            "marmara": "Marmara",
            "hacettepe": "Hacettepe"
        }
        
        name = corrections.get(root_name, root_name.capitalize())
        return f"{name} Üniversitesi"

# Global instance
_university_service = UniversityService()

def get_university_service() -> UniversityService:
    return _university_service