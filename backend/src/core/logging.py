"""Yapılandırılmış JSON logging - Request ID takibi ve hassas veri filtreleme.

Bu modül şunları sağlar:
- JsonFormatter: Yapılandırılmış JSON çıktısı için özel formatter
- SensitiveDataFilter: Şifre, token ve PII'yi log'lardan gizler
- RequestIDMiddleware: Her istek için benzersiz request ID oluşturur
- setup_logging(): JSON handler ve filtrelerle root logger'ı yapılandırır
"""

import json
import logging
import re
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


# Async işlemler arasında request ID takibi için context variable
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class JsonFormatter(logging.Formatter):
    """Log kayıtlarını JSON formatında çıktı veren özel formatter."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Log kaydını JSON string'e dönüştür."""
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        request_id = request_id_var.get()
        if request_id:
            log_data["request_id"] = request_id
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # LogRecord'dan extra field'ları ekle
        excluded_keys = {
            "name", "msg", "args", "created", "filename", "funcName",
            "levelname", "levelno", "lineno", "module", "msecs",
            "message", "pathname", "process", "processName", "relativeCreated",
            "thread", "threadName", "exc_info", "exc_text", "stack_info"
        }
        extra_fields = {
            key: value
            for key, value in record.__dict__.items()
            if key not in excluded_keys
        }
        if extra_fields:
            log_data["extra"] = extra_fields
        
        return json.dumps(log_data)


class SensitiveDataFilter(logging.Filter):
    """Log mesajlarından hassas verileri gizleyen logging filter.
    
    Gizlenen veriler:
    - Şifreler (password, pwd, pass)
    - Token'lar (token, bearer, authorization)
    - API key'ler (api_key, apikey)
    - Email adresleri (PII)
    - TC Kimlik No (11 haneli)
    - JWT token'ları
    """
    
    PATTERNS = [
        # Şifre pattern'leri
        (re.compile(r"(password|passwd|pwd|pass)\s*[=:]\s*['\"]?([^'\"\s,}]+)['\"]?", re.IGNORECASE), r"\1=***REDACTED***"),
        # Token pattern'leri
        (re.compile(r"(token|bearer|authorization|auth)\s*[=:]\s*['\"]?([^'\"\s,}]+)['\"]?", re.IGNORECASE), r"\1=***REDACTED***"),
        # API key pattern'leri
        (re.compile(r"(api_key|apikey|api-key|key)\s*[=:]\s*['\"]?([^'\"\s,}]+)['\"]?", re.IGNORECASE), r"\1=***REDACTED***"),
        # Email adresleri (PII)
        (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "***EMAIL_REDACTED***"),
        # TC Kimlik No (11 haneli)
        (re.compile(r"\b\d{11}\b"), "***TC_ID_REDACTED***"),
        # JWT token'ları (format: xxx.yyy.zzz)
        (re.compile(r"\b[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b"), "***JWT_REDACTED***"),
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Log kaydından hassas verileri gizle."""
        message = record.getMessage()
        for pattern, replacement in self.PATTERNS:
            message = pattern.sub(replacement, message)
        
        record.msg = message
        record.args = ()
        return True


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Her istek için benzersiz request ID oluşturan FastAPI middleware.
    
    Request ID:
    1. UUID4 olarak oluşturulur
    2. Logging için contextvars'da saklanır
    3. Response header'ına X-Request-ID olarak eklenir
    """
    
    async def dispatch(self, request: Request, call_next):
        """İsteği işle ve request ID ekle."""
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request_id_var.set(request_id)
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None
) -> None:
    """Yapılandırılmış JSON logging'i hassas veri filtreleme ile yapılandır.
    
    Args:
        level: Log seviyesi (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Opsiyonel log dosyası yolu (None ise stdout'a yazar)
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    root_logger.handlers = []
    
    handler = logging.FileHandler(log_file) if log_file else logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    handler.addFilter(SensitiveDataFilter())
    
    root_logger.addHandler(handler)
    logging.info("Yapılandırılmış JSON logging başlatıldı", extra={"level": level})


def get_request_id() -> Optional[str]:
    """Context'ten mevcut request ID'yi al."""
    return request_id_var.get()
