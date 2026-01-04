"""Üniversite servisi - Email domain'lerinden üniversite isimlerini çıkarır.

Veritabanından üniversite bilgilerini çeker ve email domain'leriyle eşleştirir.
"""

import json
import logging
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.university import University

logger = logging.getLogger(__name__)


class UniversityService:
    """Üniversite servisi."""
    
    async def get_university_from_email(
        self,
        email: str,
        session: AsyncSession,
    ) -> str:
        """Email adresinden üniversite ismini çıkarır.
        
        Args:
            email: Kullanıcı email adresi (örn: student@selcuk.edu.tr)
            session: Veritabanı oturumu
        
        Returns:
            Üniversite ismi (örn: "Selçuk Üniversitesi")
        """
        if not email or "@" not in email:
            return self._generate_fallback_name(email or "unknown")
        
        # Email'den domain'i çıkar
        domain = email.split("@")[1].lower().strip()
        
        # 1. Veritabanında ara (email_domains JSON field'ında)
        try:
            result = await session.execute(
                select(University)
                .where(
                    and_(
                        University.is_active == True
                    )
                )
            )
            universities = result.scalars().all()
            
            # Her üniversitenin email_domains'ini kontrol et
            for uni in universities:
                if not uni.email_domains:
                    continue
                
                try:
                    domains = json.loads(uni.email_domains)
                    if isinstance(domains, list):
                        # Tam eşleşme
                        if domain in domains:
                            return uni.name
                        
                        # "ogr." prefix'ini kaldır ve tekrar kontrol et
                        if domain.startswith("ogr."):
                            domain_without_ogr = domain.replace("ogr.", "", 1)
                            if domain_without_ogr in domains:
                                return uni.name
                        
                        # Domain'in bir kısmı eşleşiyor mu? (örn: selcuk.edu.tr -> selcuk)
                        for stored_domain in domains:
                            if domain.endswith(stored_domain) or stored_domain.endswith(domain):
                                return uni.name
                except (json.JSONDecodeError, TypeError):
                    continue
            
            # 2. Domain'den üniversite ismini tahmin et (basit eşleştirme)
            # Örn: selcuk.edu.tr -> "Selçuk" araması
            domain_parts = domain.replace(".edu.tr", "").replace("ogr.", "").split(".")
            if domain_parts:
                search_term = domain_parts[-1]  # Son kısım (örn: "selcuk")
                
                # Üniversite isimlerinde arama yap
                for uni in universities:
                    # İsimde arama terimi var mı? (case-insensitive)
                    if search_term.lower() in uni.name.lower():
                        return uni.name
        except Exception as e:
            logger.error(f"Database lookup failed for domain {domain}: {e}", exc_info=True)
        
        # 3. Fallback: Domain'den otomatik isim oluştur
        return self._generate_fallback_name(domain)
    
    def _generate_fallback_name(self, domain: str) -> str:
        """Domain'den otomatik üniversite ismi oluştur.
        
        Örnekler:
        - "selcuk.edu.tr" -> "Selçuk Üniversitesi"
        - "ogr.selcuk.edu.tr" -> "Selçuk Üniversitesi"
        """
        if not domain:
            return "Bilinmeyen Üniversite"
        
        # ".edu.tr" suffix'ini kaldır
        if domain.endswith(".edu.tr"):
            domain = domain.replace(".edu.tr", "")
        
        # "ogr." prefix'ini kaldır
        if domain.startswith("ogr."):
            domain = domain.replace("ogr.", "", 1)
        
        # Domain'i parçalara ayır
        parts = domain.split(".")
        
        # Son kısmı al (ana domain)
        if parts:
            main_part = parts[-1]
            
            # Bilinen kısaltmalar için özel isimler
            known_abbreviations = {
                "metu": "Orta Doğu Teknik Üniversitesi",
                "boun": "Boğaziçi Üniversitesi",
                "itu": "İstanbul Teknik Üniversitesi",
                "ku": "Koç Üniversitesi",
                "sabanciuniv": "Sabancı Üniversitesi",
            }
            
            if main_part.lower() in known_abbreviations:
                return known_abbreviations[main_part.lower()]
            
            # Normal durum: İlk harfi büyük yap ve "Üniversitesi" ekle
            university_name = main_part.title()
            return f"{university_name} Üniversitesi"
        
        return "Bilinmeyen Üniversite"


# Global service instance
_university_service = UniversityService()


def get_university_service() -> UniversityService:
    """Üniversite servisi instance'ını döndür."""
    return _university_service

