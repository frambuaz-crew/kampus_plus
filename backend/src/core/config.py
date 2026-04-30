"""Yapılandırma yönetimi - Pydantic Settings kullanarak.

Environment variable'ları .env dosyasından yükler.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment variable'lardan yüklenen uygulama ayarları."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Uygulama
    app_name: str = "KAMPÜS+ AI Platform"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False
    
    # Veritabanı - PostgreSQL (ekip) veya SQLite (yerel)
    # Örnek PostgreSQL: postgresql+asyncpg://kampus:secret@postgres:5432/kampus_plus
    database_url: str = "sqlite+aiosqlite:///./data/kampus_plus.db"
    
    def get_database_url(self) -> str:
        """Async uygulama için veritabanı URL'ini al."""
        return self.database_url
    
    def get_database_url_sync(self) -> str:
        """Alembic migration'ları için sync veritabanı URL'ini al."""
        url = self.database_url
        if url.startswith("sqlite+aiosqlite"):
            return url.replace("sqlite+aiosqlite", "sqlite")
        if url.startswith("postgresql+asyncpg"):
            return url.replace("postgresql+asyncpg", "postgresql+psycopg2", 1)
        return url
    
    # JWT Kimlik Doğrulama
    jwt_secret_key: str = "dev_secret_key_change_me_in_production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    jwt_refresh_token_expire_days_remember_me: int = 30  # "Beni Hatırla" için 30 gün
    
    # AI Provider Ayarları
    ai_provider: str = "gemini"
    
    # Google Gemini
    google_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_temperature: float = 0.1
    gemini_max_tokens: int = 8192
    
    # Dosya Depolama - LOCAL STORAGE KULLANILIR
    # NOT: Bu proje S3, MinIO veya cloud storage kullanmaz.
    # Tüm dosyalar backend sunucusunun disk'inde saklanır (backend/uploads/).
    upload_dir: str = "backend/uploads"  # Local storage klasörü (relative to project root)
    
    def get_upload_dir_absolute(self) -> Path:
        """Upload dizininin absolute path'ini al.
        
        Docker container içinde veya local'de çalışabilir.
        - Docker: /app/uploads (container içinde)
        - Local: proje_root/backend/uploads
        """
        # Docker container içinde miyiz? (WORKDIR /app)
        if Path("/app").exists() and Path("/app/src").exists():
            # Docker container içindeyiz
            return Path("/app/uploads")
        
        # Local development: proje root'una göre
        # Backend klasörünü bul (config.py'nin bulunduğu yer: backend/src/core/)
        # 3 seviye yukarı çık: core -> src -> backend -> project_root
        backend_dir = Path(__file__).parent.parent.parent
        project_root = backend_dir.parent  # backend/ klasörünün bir üstü
        return project_root / self.upload_dir
    
    # FAISS Vector Store
    vector_store_path: str = "./data/vectors"
    faiss_index_official: str = "vdb_official.index"
    faiss_index_user: str = "vdb_user.index"
    vector_dimension: int = 3072  # Google Gemini gemini-embedding-001 için 3072
    vector_search_k: int = 5
    
    # PDF İşleme
    max_file_size_mb: int = 25
    allowed_file_types: str = "pdf"
    pdf_chunk_size: int = 512
    pdf_chunk_overlap: int = 50
    
    @property
    def max_file_size_bytes(self) -> int:
        """MB'ı byte'a çevir."""
        return self.max_file_size_mb * 1024 * 1024
    
    # Veri Senkronizasyonu
    sync_enabled: bool = True
    sync_interval_hours: int = 2
    sync_start_hour: int = 8
    sync_end_hour: int = 22
    uzem_api_url: str = ""
    uzem_api_key: str = ""
    announcements_rss_url: str = ""
    schedule_csv_url: str = ""
    
    # Güvenlik
    # Tüm yaygın geliştirme portları hem localhost hem 127.0.0.1 üzerinden dahil edildi.
    # Docker compose CORS_ORIGINS env var'ı ile üzerine yazılabilir.
    cors_origins: str = (
        "http://localhost:3000,"
        "http://localhost:5173,"
        "http://localhost:5174,"
        "http://127.0.0.1:3000,"
        "http://127.0.0.1:5173,"
        "http://127.0.0.1:5174,"
        "http://127.0.0.1:8001"
    )
    allowed_hosts: str = "localhost,127.0.0.1"
    rate_limit_per_minute: int = 100
    ai_rate_limit_per_minute: int = 10
    ENABLE_USAGE_LIMIT: bool = False
    DAILY_MESSAGE_LIMIT: int = 50
    
    @property
    def cors_origins_list(self) -> List[str]:
        """CORS origin'lerini virgülle ayrılmış string'den parse et."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def allowed_hosts_list(self) -> List[str]:
        """İzin verilen host'ları virgülle ayrılmış string'den parse et."""
        return [host.strip() for host in self.allowed_hosts.split(",")]
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    log_style: str = "console"    # "console" = renkli terminal | "json" = yapısal JSON
    log_sql_echo: bool = False     # True yapılırsa SQL sorguları terminale basılır
    enable_metrics: bool = True
    metrics_port: int = 9090
    
    # Email - SMTP (Resend için)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "KAMPÜS+ Platform"
    frontend_url: str = "http://localhost:5173"  # Email link'leri için
    
    # Üniversite Özel Ayarlar - Genel Türkiye Kapsamı
    university_name: str = "Kampüs+ Türkiye" # 👈 "Konya" kısıtlamasını kaldırdık
    support_email: str = "support@kgtu.edu.tr"
    
    # Kayıt için izin verilen email domain'leri
    allowed_email_domains: str = Field(
        default=".edu.tr", # 👈 Sadece uzantıyı yazdık
        description="Kayıt için izin verilen email domain'leri veya uzantıları"
    )
    
    @property
    def allowed_email_domains_list(self) -> List[str]:
        """İzin verilen email domain'lerini temiz bir liste olarak döner."""
        return [domain.strip().lower() for domain in self.allowed_email_domains.split(",") if domain.strip()]
    
    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Environment değerini doğrula."""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment şunlardan biri olmalı: {allowed}")
        return v
    
    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Log level değerini doğrula."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"Log level şunlardan biri olmalı: {allowed}")
        return v_upper


@lru_cache()
def get_settings() -> Settings:
    """Cache'lenmiş settings instance'ını al.
    
    Her çağrıda .env dosyasını yeniden yüklememek için lru_cache kullanır.
    """
    return Settings()


# Kolaylık export
settings = get_settings()
