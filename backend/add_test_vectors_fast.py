"""
Quick script to add sample course data to vector store WITHOUT OpenAI embeddings.
Uses random embeddings for fast testing (not production quality!).
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import faiss
import numpy as np

# Vector dimension
EMBEDDING_DIM = 1536

# Storage paths
DATA_DIR = Path(__file__).parent / "data" / "vectors"
OFFICIAL_INDEX_PATH = DATA_DIR / "vdb_official.index"


def add_sample_data_fast():
    """Add sample course documents to official vector store with random embeddings."""
    print("🔧 Adding sample course data to vector store (FAST MODE - random embeddings)...")
    
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
    
    # Create new index (overwrite existing)
    index = faiss.IndexFlatL2(EMBEDDING_DIM)
    
    # Generate random embeddings (normalized)
    np.random.seed(42)  # For reproducibility
    embeddings = []
    for i in range(len(documents)):
        # Random embedding
        emb = np.random.randn(EMBEDDING_DIM).astype(np.float32)
        # Normalize to unit length
        emb = emb / np.linalg.norm(emb)
        embeddings.append(emb)
    
    embeddings_array = np.array(embeddings, dtype=np.float32)
    
    # Add to FAISS
    index.add(embeddings_array)
    
    # Save index
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(OFFICIAL_INDEX_PATH))
    
    print(f"✅ {len(documents)} döküman eklendi!")
    print(f"📊 Official store: {index.ntotal} vektör")
    print(f"💾 Index saved to: {OFFICIAL_INDEX_PATH}")
    
    # Save metadata as Python file (will be imported by service)
    metadata_file = DATA_DIR / "metadata_official.py"
    with open(metadata_file, "w", encoding="utf-8") as f:
        f.write("# Auto-generated metadata\n")
        f.write("OFFICIAL_METADATA = {\n")
        for i, doc in enumerate(documents):
            f.write(f"    {i}: {{\n")
            f.write(f'        "title": "{doc["title"]}",\n')
            f.write(f'        "text": """{doc["text"]}""",\n')
            f.write(f'        "source_type": "official",\n')
            f.write(f'        "index_id": {i}\n')
            f.write(f"    }},\n")
        f.write("}\n")
    
    print(f"📝 Metadata saved to: {metadata_file}")
    
    print("\n🔍 İlk 3 döküman:")
    for i in range(min(3, len(documents))):
        print(f"  [{i}] {documents[i]['title']}")


if __name__ == "__main__":
    add_sample_data_fast()
