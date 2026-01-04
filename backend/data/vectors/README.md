# Vector Store Klasörü

Bu klasör FAISS vector index dosyalarını içerir.

## Dosyalar

- `vdb_official.index` - Resmi üniversite belgeleri için vector index
- `vdb_user.index` - Kullanıcı yüklemeleri için vector index
- `vdb_social.index` - Forum içerikleri için vector index

## Notlar

- Bu dosyalar runtime'da otomatik oluşturulur
- `.gitignore` dosyasına eklenmelidir (büyük dosyalar)
- Index dosyaları Google Gemini text-embedding-004 kullanır (768 boyut)
- Test verileri `scripts/metadata_official.py` dosyasında bulunur

## Kullanım

Index'leri başlatmak için:
```bash
python scripts/init_faiss.py
```

Vector store'u doldurmak için:
```bash
python scripts/populate_vectors.py
```

