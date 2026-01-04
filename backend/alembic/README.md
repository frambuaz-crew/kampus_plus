# Alembic Migration Klasörü

Alembic veritabanı migration'larını yönetir.

## Dosyalar

### `env.py`
Alembic migration ortam konfigürasyonu. Veritabanı bağlantısı, model import'ları ve migration çalıştırma fonksiyonlarını içerir.

### `script.py.mako`
Yeni migration dosyaları oluşturulurken kullanılan template.

### `versions/`
Migration dosyaları bu klasörde saklanır. Her migration dosyası:
- `upgrade()` fonksiyonu ile şema değişikliklerini uygular
- `downgrade()` fonksiyonu ile değişiklikleri geri alır

## Kullanım

### Yeni Migration Oluştur
```bash
# Otomatik algılama ile
alembic revision --autogenerate -m "migration açıklaması"

# Manuel
alembic revision -m "migration açıklaması"
```

### Migration'ları Uygula
```bash
# Son migration'a kadar uygula
alembic upgrade head

# Belirli bir revision'a uygula
alembic upgrade <revision_id>
```

### Migration'ı Geri Al
```bash
# Bir önceki migration'a geri dön
alembic downgrade -1

# Belirli bir revision'a geri dön
alembic downgrade <revision_id>
```

### Migration Geçmişi
```bash
# Tüm migration'ları listele
alembic history

# Mevcut revision'ı göster
alembic current
```

## Notlar

- Migration dosyaları `versions/` klasöründe saklanır
- Her migration benzersiz bir revision ID'ye sahiptir
- `env.py` dosyası tüm modelleri import etmelidir (autogenerate için)
- Veritabanı URL'i environment variable'lardan alınır

