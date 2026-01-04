"""
YÖK Atlas'tan üniversite bilgilerini çeken script.

Bu script:
1. YÖK Atlas sayfasından tüm üniversiteleri çeker
2. Her üniversitenin: isim, tip (devlet/vakıf), şehir bilgilerini alır
3. Üniversitelerin web sitelerinden email domain'lerini tespit eder
4. Veritabanına kaydeder

Kullanım:
    python scripts/fetch_yok_universities.py
"""

import asyncio
import json
import re
import sys
import warnings
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

# SSL uyarılarını bastır (development için)
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

# Backend path'ini ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session_factory
from src.models.university import University


class YOKScraper:
    """YÖK Atlas scraper."""
    
    BASE_URL = "https://yokatlas.yok.gov.tr"
    UNIVERSITIES_URL = f"{BASE_URL}/universite.php"
    
    def __init__(self):
        # SSL doğrulamasını devre dışı bırak (Windows SSL sertifika sorunları için)
        # NOT: Production'da bu kullanılmamalı!
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            verify=False,  # SSL doğrulamasını atla (development için)
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
    
    async def fetch_all_universities(self) -> List[Dict]:
        """YÖK Atlas'tan tüm üniversiteleri çeker."""
        print("🔍 YÖK Atlas'tan üniversite listesi çekiliyor...")
        
        try:
            response = await self.client.get(self.UNIVERSITIES_URL)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            universities = []
            
            # YÖK Atlas sayfası <ul id="myUl"> içinde <li class="unilist"> yapısı kullanıyor
            ul_list = soup.find('ul', id='myUl')
            
            if not ul_list:
                # Alternatif: tüm unilist class'larını bul
                print("⚠️  myUl bulunamadı, alternatif yapı deneniyor...")
                list_items = soup.find_all('li', class_='unilist')
            else:
                list_items = ul_list.find_all('li', class_='unilist')
            
            print(f"📋 {len(list_items)} üniversite elementi bulundu")
            
            for item in list_items:
                try:
                    # Üniversite ismi - <h3 class="baslik">
                    name_elem = item.find('h3', class_='baslik')
                    if not name_elem:
                        continue
                    
                    name = name_elem.get_text(strip=True)
                    if not name:
                        continue
                    
                    # Üniversite türü - <span class="tur">
                    type_elem = item.find('span', class_='tur')
                    university_type = "bilinmiyor"
                    if type_elem:
                        type_text = type_elem.get_text(strip=True).lower()
                        if "devlet" in type_text:
                            university_type = "devlet"
                        elif "vakıf" in type_text:
                            university_type = "vakıf"
                        elif "özel" in type_text:
                            university_type = "özel"
                    
                    # Şehir - <span class="sehir">
                    city_elem = item.find('span', class_='sehir')
                    city = city_elem.get_text(strip=True) if city_elem else None
                    
                    # Web sitesi URL - <a> içinde
                    url = None
                    web_link = item.find('a', href=True, target='_blank')
                    if web_link:
                        url = web_link.get('href', '').strip()
                        if url and not url.startswith('http'):
                            url = f"https://{url}"
                    
                    universities.append({
                        "name": name,
                        "type": university_type,
                        "city": city,
                        "url": url,
                    })
                    
                except Exception as e:
                    print(f"  ⚠️  Üniversite parse edilemedi: {e}")
                    continue
            
            print(f"✅ {len(universities)} üniversite başarıyla çekildi")
            if universities:
                print(f"📌 İlk 3 örnek:")
                for uni in universities[:3]:
                    print(f"   - {uni['name']} ({uni['type']}) - {uni.get('city', 'N/A')}")
            
            return universities
            
        except Exception as e:
            print(f"❌ Hata: {e}")
            import traceback
            traceback.print_exc()
            # Hata durumunda sayfa kaynağını kaydet
            try:
                with open("yok_page.html", "w", encoding="utf-8") as f:
                    f.write(response.text)
                print("📄 Sayfa kaynağı 'yok_page.html' dosyasına kaydedildi")
            except:
                pass
            return []
    
    async def detect_email_domain(self, university_url: Optional[str]) -> List[str]:
        """Üniversite web sitesinden email domain'lerini tespit eder."""
        if not university_url:
            return []
        
        domains = []
        
        try:
            # URL'i normalize et
            if not university_url.startswith('http'):
                university_url = f"https://{university_url}"
            
            response = await self.client.get(university_url, timeout=10.0)
            response.raise_for_status()
            
            # HTML'den email adreslerini bul
            email_pattern = r'\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b'
            emails = re.findall(email_pattern, response.text)
            
            # .edu.tr domain'lerini filtrele
            edu_domains = [d for d in emails if d.endswith('.edu.tr')]
            
            # Domain'den ana domain'i çıkar (örn: ogr.selcuk.edu.tr -> selcuk.edu.tr)
            main_domains = set()
            for domain in edu_domains:
                main_domains.add(domain)
                # ogr. prefix'ini kaldır
                if domain.startswith('ogr.'):
                    main_domains.add(domain.replace('ogr.', '', 1))
            
            domains = list(main_domains)
            
        except Exception as e:
            print(f"  ⚠️  Domain tespit edilemedi: {e}")
        
        return domains
    
    async def close(self):
        """HTTP client'ı kapat."""
        await self.client.aclose()


async def fetch_and_save_universities(detect_domains: bool = False):
    """YÖK'tan üniversiteleri çek ve veritabanına kaydet.
    
    Args:
        detect_domains: Email domain'lerini tespit et (zaman alabilir, default: False)
    """
    scraper = YOKScraper()
    
    try:
        # Üniversiteleri çek
        universities = await scraper.fetch_all_universities()
        
        if not universities:
            print("❌ Hiç üniversite bulunamadı. Sayfa yapısı değişmiş olabilir.")
            return
        
        # Veritabanı bağlantısı
        session_factory = get_session_factory()
        
        async with session_factory() as session:
            # Mevcut üniversiteleri kontrol et
            result = await session.execute(select(University))
            existing = {uni.name: uni for uni in result.scalars().all()}
            
            saved_count = 0
            updated_count = 0
            
            for uni_data in universities:
                name = uni_data['name']
                
                # Mevcut üniversiteyi kontrol et
                if name in existing:
                    university = existing[name]
                    updated = False
                    
                    # Güncelle
                    if university.university_type != uni_data['type']:
                        university.university_type = uni_data['type']
                        updated = True
                    if university.city != uni_data.get('city'):
                        university.city = uni_data.get('city')
                        updated = True
                    
                    # Email domain'lerini tespit et (eğer yoksa ve detect_domains aktifse)
                    if detect_domains and not university.email_domains and uni_data.get('url'):
                        print(f"  🔍 Domain tespit ediliyor: {name}...")
                        domains = await scraper.detect_email_domain(uni_data['url'])
                        if domains:
                            university.email_domains = json.dumps(domains)
                            updated = True
                            print(f"    ✅ {len(domains)} domain bulundu")
                    
                    if updated:
                        await session.commit()
                        updated_count += 1
                        if detect_domains and university.email_domains:
                            print(f"  ✅ Güncellendi: {name} - {len(json.loads(university.email_domains))} domain")
                        else:
                            print(f"  ✅ Güncellendi: {name}")
                else:
                    # Yeni üniversite oluştur
                    # Email domain'lerini tespit et (opsiyonel, zaman alabilir)
                    domains = []
                    if detect_domains and uni_data.get('url'):
                        print(f"  🔍 Domain tespit ediliyor: {name}...")
                        domains = await scraper.detect_email_domain(uni_data['url'])
                        if domains:
                            print(f"    ✅ {len(domains)} domain bulundu")
                    
                    university = University(
                        name=name,
                        university_type=uni_data['type'],
                        city=uni_data.get('city'),
                        email_domains=json.dumps(domains) if domains else None,
                        yok_data=json.dumps(uni_data),
                        is_active=True,
                    )
                    
                    session.add(university)
                    await session.commit()
                    saved_count += 1
                    if detect_domains:
                        print(f"  ✅ Kaydedildi: {name} ({uni_data['type']}) - {len(domains)} domain")
                    else:
                        print(f"  ✅ Kaydedildi: {name} ({uni_data['type']})")
            
            print(f"\n✅ Toplam: {saved_count} yeni, {updated_count} güncellendi")
            if not detect_domains:
                print("💡 Email domain'lerini tespit etmek için script'i --detect-domains ile çalıştırın")
    
    finally:
        await scraper.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="YÖK Atlas'tan üniversite bilgilerini çek")
    parser.add_argument(
        "--detect-domains",
        action="store_true",
        help="Email domain'lerini tespit et (zaman alabilir)"
    )
    args = parser.parse_args()
    
    print("🚀 YÖK Atlas Üniversite Çekici Başlatılıyor...\n")
    asyncio.run(fetch_and_save_universities(detect_domains=args.detect_domains))

