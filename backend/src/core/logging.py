"""Yapılandırılmış logging — Konsol (renkli) ve JSON formatter desteği.

Bu modül şunları sağlar:
- ConsoleFormatter: ANSI renkli, kısa terminal çıktısı
- JsonFormatter: Yapılandırılmış JSON çıktısı
- SensitiveDataFilter: Şifre, token ve PII'yi log'lardan gizler
- RequestIDMiddleware: Her istek için benzersiz request ID oluşturur
- setup_logging(): Seçilen stile göre handler'ları yapılandırır
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


# ---------------------------------------------------------------------------
# ANSI Renk Kodları
# ---------------------------------------------------------------------------

_RESET  = "\033[0m"
_BOLD   = "\033[1m"
_GREY   = "\033[90m"
_GREEN  = "\033[92m"
_YELLOW = "\033[93m"
_RED    = "\033[91m"
_BLUE   = "\033[94m"
_BRED   = "\033[1;91m"

_LEVEL_COLORS = {
    "DEBUG":    _BLUE,
    "INFO":     _GREEN,
    "WARNING":  _YELLOW,
    "ERROR":    _RED,
    "CRITICAL": _BRED,
}


class ConsoleFormatter(logging.Formatter):
    """ANSI renkli, kısa ve okunabilir konsol formatter.

    Format: [SS:DD:SS] [SEVİYE ] [modül] Mesaj
    """

    def format(self, record: logging.LogRecord) -> str:
        zaman = datetime.fromtimestamp(record.created).strftime("%H:%M:%S")
        seviye = record.levelname.ljust(8)
        renk = _LEVEL_COLORS.get(record.levelname, "")
        modul = record.name.split(".")[-1][:16].ljust(16)

        mesaj = record.getMessage()

        satir = (
            f"{_GREY}[{zaman}]{_RESET} "
            f"{renk}{_BOLD}[{seviye}]{_RESET} "
            f"{_GREY}[{modul}]{_RESET} "
            f"{mesaj}"
        )

        if record.exc_info:
            satir += "\n" + self.formatException(record.exc_info)

        return satir


class JsonFormatter(logging.Formatter):
    """Log kayıtlarını JSON formatında çıktı veren özel formatter."""

    def format(self, record: logging.LogRecord) -> str:
        """Log kaydını JSON string'e dönüştür."""
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
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
    log_file: Optional[str] = None,
    log_style: str = "console",
) -> None:
    """Logging altyapısını yapılandır.

    Args:
        level: Log seviyesi (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Opsiyonel log dosyası yolu (None ise stdout'a yazar)
        log_style: "console" → renkli terminal | "json" → yapısal JSON
    """
    # ---- Root logger ----
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    root_logger.handlers = []

    # ---- Formatter seç ----
    formatter: logging.Formatter
    if log_style == "console":
        formatter = ConsoleFormatter()
    else:
        formatter = JsonFormatter()

    # ---- Handler oluştur ----
    handler = logging.FileHandler(log_file, encoding="utf-8") if log_file else logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataFilter())

    root_logger.addHandler(handler)

    # ---- Gürültülü logger'ları sustur / yönlendir ----
    # uvicorn — kendi handler'larını temizle, bizimkini ekle
    for name in ("uvicorn", "uvicorn.error"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.addHandler(handler)
        lg.propagate = False

    # uvicorn.access — her 200 isteğini basmasın; sadece uyarı ve üstü
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.handlers = []
    access_logger.addHandler(handler)
    access_logger.setLevel(logging.WARNING)
    access_logger.propagate = False

    # sqlalchemy.engine — SQL sorgularını sustur
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)

    logging.info("Logging başlatıldı (stil: %s, seviye: %s)", log_style, level)


def get_request_id() -> Optional[str]:
    """Context'ten mevcut request ID'yi al."""
    return request_id_var.get()
