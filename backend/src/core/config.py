"""
Configuration management using Pydantic Settings.
Loads environment variables from .env file.
"""
from functools import lru_cache
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application
    app_name: str = "KAMPÜS+ AI Platform"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False
    
    # Database
    database_url: str | None = None  # Can be set directly for SQLite or other databases
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "kampus_plus"
    postgres_user: str = "kampus_user"
    postgres_password: str | None = None
    
    def get_database_url(self) -> str:
        """Get database URL - either from DATABASE_URL env or construct from postgres settings."""
        if self.database_url:
            return self.database_url
        
        # Fallback to PostgreSQL construction
        if not self.postgres_password:
            raise ValueError("Either DATABASE_URL or postgres_password must be set")
        
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
    
    def get_database_url_sync(self) -> str:
        """Get sync database URL for Alembic migrations."""
        if self.database_url:
            # Convert async SQLite URL to sync for Alembic
            if self.database_url.startswith("sqlite+aiosqlite"):
                return self.database_url.replace("sqlite+aiosqlite", "sqlite")
            return self.database_url
        
        # Fallback to PostgreSQL construction
        if not self.postgres_password:
            raise ValueError("Either DATABASE_URL or postgres_password must be set")
        
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
    
    # JWT Authentication
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    
    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4"
    openai_embedding_model: str = "text-embedding-ada-002"
    openai_max_tokens: int = 2000
    openai_temperature: float = 0.7
    
    # AWS S3
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str = "eu-central-1"
    aws_s3_bucket: str
    s3_presigned_url_expiry_seconds: int = 900
    
    # FAISS Vector Store
    vector_store_path: str = "./data/vectors"
    faiss_index_official: str = "vdb_official.index"
    faiss_index_user: str = "vdb_user.index"
    vector_dimension: int = 1536
    vector_search_k: int = 5
    
    # PDF Processing
    max_file_size_mb: int = 25
    allowed_file_types: str = "pdf"
    pdf_chunk_size: int = 512
    pdf_chunk_overlap: int = 50
    
    @property
    def max_file_size_bytes(self) -> int:
        """Convert MB to bytes."""
        return self.max_file_size_mb * 1024 * 1024
    
    # Data Sync
    sync_enabled: bool = True
    sync_interval_hours: int = 2
    sync_start_hour: int = 8
    sync_end_hour: int = 22
    uzem_api_url: str = ""
    uzem_api_key: str = ""
    announcements_rss_url: str = ""
    schedule_csv_url: str = ""
    
    # Security
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    allowed_hosts: str = "localhost,127.0.0.1"
    rate_limit_per_minute: int = 100
    ai_rate_limit_per_minute: int = 10
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def allowed_hosts_list(self) -> List[str]:
        """Parse allowed hosts from comma-separated string."""
        return [host.strip() for host in self.allowed_hosts.split(",")]
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    enable_metrics: bool = True
    metrics_port: int = 9090
    
    # Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "KAMPÜS+ Platform"
    
    # University Specific
    university_name: str = "Example University"
    university_email_domain: str = "example.edu.tr"
    support_email: str = "support@kampusplus.edu.tr"
    
    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of {allowed}")
        return v
    
    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"Log level must be one of {allowed}")
        return v_upper


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to avoid reloading .env on every call.
    """
    return Settings()


# Convenience export
settings = get_settings()
