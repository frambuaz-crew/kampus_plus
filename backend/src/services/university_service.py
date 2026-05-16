import json
import logging
from typing import Optional, Dict
from sqlalchemy import select, or_, cast, String
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
        if not email or "@" not in email:
            return "Bilinmeyen Üniversite"
        
        full_domain, root_name = self._get_clean_domain_parts(email)
        
        # 🚀 1. Önce Özel Mapping (Hızlı Sonuç)
        if root_name in self.SPECIAL_OVERRIDES:
            return self.SPECIAL_OVERRIDES[root_name]

        # 🚀 2. VERİTABANI ARAMASI (GÜNCELLE)
        try:
            # Domain'i normalize edelim (ü -> u, ö -> o gibi)
            # YÖK scripti genellikle temiz domainler kaydeder.
            normalized_domain = full_domain.encode('idna').decode('ascii')

            # SQL LIKE sorgusunu daha temiz yapalım
            # JSON array içinde "domain.edu.tr" şeklinde arar
            stmt = select(University).where(
                University.is_active == True,
                or_(
                    cast(University.email_domains, String).ilike(f"%{full_domain}%"),
                    cast(University.email_domains, String).ilike(f"%{normalized_domain}%"),
                    University.name.ilike(f"%{root_name}%")
                )
            ).limit(1)
            
            result = await session.execute(stmt)
            uni = result.scalar_one_or_none()
            
            if uni:
                return uni.name # 🎯 Buldu! "Konya Teknik Üniversitesi" döner.
                
        except Exception as e:
            logger.error(f"Üniversite aranırken DB hatası: {e}")

        # 🚀 3. FALLBACK (Eğer DB'de yoksa)
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
