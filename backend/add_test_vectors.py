"""
Quick script to add sample course data to vector store for testing RAG.
"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from src.services.vector_service import VectorStoreService


async def add_sample_data():
    """Add sample course documents to official vector store."""
    print("🔧 Adding sample course data to vector store...")
    
    vs = VectorStoreService()
    
    # Sample course documents
    documents = [
        {
            "title": "BİL101 - Programlamaya Giriş Dersi",
            "text": "BİL101 Programlamaya Giriş dersi Pazartesi saat 10:00'da A1-205 sınıfında yapılmaktadır. Dersin hocası Dr. Ayşe Yılmaz'dır. Bu derste Python programlama dili öğretilmektedir."
        },
        {
            "title": "MAT101 - Matematik I Ders Programı",
            "text": "MAT101 Matematik I dersi Salı ve Perşembe günleri saat 14:00'te B2-301 sınıfında gerçekleşmektedir. Dersin sorumlusu Prof. Dr. Mehmet Demir'dir. Konu başlıkları: Türev, integral, limit."
        },
        {
            "title": "FİZ101 - Fizik I Laboratuvar",
            "text": "FİZ101 Fizik I laboratuvar dersi Çarşamba günü saat 09:00'da C3-Lab1'de yapılmaktadır. Laboratuvar asistanı Arş. Gör. Zeynep Kaya'dır."
        },
        {
            "title": "İNG101 - İngilizce I Ders Saatleri",
            "text": "İNG101 İngilizce I dersi Pazartesi, Çarşamba ve Cuma günleri saat 16:00'da D1-102 sınıfında yapılmaktadır. Okutman: Dr. John Smith."
        },
        {
            "title": "BİL101 - Vize Sınavı Duyurusu",
            "text": "BİL101 Programlamaya Giriş dersi vize sınavı 15 Kasım 2024 Cuma günü saat 13:00'te Konferans Salonu'nda yapılacaktır. Sınav süresi 90 dakikadır."
        },
        {
            "title": "MAT101 - Final Sınavı Bilgilendirmesi",
            "text": "MAT101 Matematik I dersi final sınavı 10 Ocak 2025 Cuma günü saat 10:00'da Spor Salonu'nda gerçekleştirilecektir. Hesap makinesi getirilmesi zorunludur."
        },
        {
            "title": "Akademik Takvim 2024-2025 Güz Dönemi",
            "text": "2024-2025 Güz Dönemi akademik takvimi: Ders kayıtları 16-20 Eylül, dersler 23 Eylül'de başlıyor, vize sınavları 11-15 Kasım, final sınavları 6-20 Ocak tarihleri arasında yapılacaktır."
        },
        {
            "title": "Öğrenci İşleri Çalışma Saatleri",
            "text": "Öğrenci İşleri Hafta içi (Pazartesi-Cuma) 09:00-17:00 saatleri arasında açıktır. Öğle arası 12:00-13:00. İletişim: ogrenci@university.edu.tr, Tel: (0312) 123 45 67"
        },
        {
            "title": "Kütüphane Açılış Saatleri",
            "text": "Merkez Kütüphane Hafta içi 08:00-22:00, Cumartesi 10:00-18:00 saatleri arasında hizmet vermektedir. Pazar günleri kapalıdır."
        },
        {
            "title": "BİL101 - Ödev Teslim Tarihi",
            "text": "BİL101 Programlamaya Giriş dersi 1. ödev teslim tarihi 25 Ekim 2024 Cuma saat 23:59'dur. Ödevler kampüs sistemine PDF olarak yüklenecektir."
        }
    ]
    
    print(f"📝 {len(documents)} döküman eklenecek...")
    
    # Add to official store
    texts = [doc["text"] for doc in documents]
    metadata_list = [
        {
            "title": doc["title"],
            "source_type": "official",
            "text": doc["text"]
        }
        for doc in documents
    ]
    
    index_ids = await vs.add_to_official(
        texts=texts,
        start_index=0,
        metadata=metadata_list
    )
    
    print(f"✅ {len(index_ids)} döküman eklendi!")
    print(f"📊 Official store: {vs.vdb_official.ntotal} vektör")
    print(f"📊 Metadata count: {len(vs.official_metadata)}")
    
    # Show sample metadata
    print("\n🔍 İlk 3 dökümanın metadata'sı:")
    for i in range(min(3, len(index_ids))):
        idx = index_ids[i]
        meta = vs.official_metadata.get(idx, {})
        print(f"  [{idx}] {meta.get('title', 'N/A')}")


if __name__ == "__main__":
    asyncio.run(add_sample_data())
