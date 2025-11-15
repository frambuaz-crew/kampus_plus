"""
Structured JSON logging configuration with request ID tracking and sensitive data filtering.

This module provides:
- JsonFormatter: Custom logging formatter for structured JSON output
- SensitiveDataFilter: Redacts passwords, tokens, and PII from logs
- RequestIDMiddleware: FastAPI middleware for request ID generation
- setup_logging(): Configures root logger with JSON handler and filters

Requirements: FR-039, FR-040, FR-041
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

# Context variable for request ID tracking across async operations
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class JsonFormatter(logging.Formatter):
    """
    Custom formatter that outputs log records as JSON.
    
    Output format:
    {
        "timestamp": "2025-11-15T10:30:45.123Z",
        "level": "INFO",
        "message": "User logged in",
        "request_id": "550e8400-e29b-41d4-a716-446655440000",
        "module": "auth",
        "function": "login",
        "line": 42,
        "extra": {...}
    }
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON string.
        
        Args:
            record: LogRecord to format
            
        Returns:
            JSON string representation of log record
        """
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add request ID if available
        request_id = request_id_var.get()
        if request_id:
            log_data["request_id"] = request_id
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields from LogRecord
        extra_fields = {
            key: value
            for key, value in record.__dict__.items()
            if key not in [
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "message", "pathname", "process", "processName", "relativeCreated",
                "thread", "threadName", "exc_info", "exc_text", "stack_info"
            ]
        }
        if extra_fields:
            log_data["extra"] = extra_fields
        
        return json.dumps(log_data)


class SensitiveDataFilter(logging.Filter):
    """
    Logging filter that redacts sensitive data from log messages.
    
    Redacts:
    - Passwords (password=..., pwd=..., etc.)
    - Tokens (token=..., bearer=..., authorization=..., etc.)
    - API keys (api_key=..., apikey=..., etc.)
    - Email addresses (PII)
    - Credit card numbers
    - Turkish ID numbers (TC Kimlik No)
    """
    
    # Patterns for sensitive data
    PATTERNS = [
        # Password patterns
        (re.compile(r"(password|passwd|pwd|pass)\s*[=:]\s*['\"]?([^'\"\s,}]+)['\"]?", re.IGNORECASE), r"\1=***REDACTED***"),
        # Token patterns
        (re.compile(r"(token|bearer|authorization|auth)\s*[=:]\s*['\"]?([^'\"\s,}]+)['\"]?", re.IGNORECASE), r"\1=***REDACTED***"),
        # API key patterns
        (re.compile(r"(api_key|apikey|api-key|key)\s*[=:]\s*['\"]?([^'\"\s,}]+)['\"]?", re.IGNORECASE), r"\1=***REDACTED***"),
        # Email addresses (PII)
        (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "***EMAIL_REDACTED***"),
        # Credit card numbers (simplified - matches 13-19 digit sequences)
        (re.compile(r"\b\d{13,19}\b"), "***CARD_REDACTED***"),
        # Turkish ID numbers (11 digits)
        (re.compile(r"\b\d{11}\b"), "***TC_ID_REDACTED***"),
        # JWT tokens (format: xxx.yyy.zzz)
        (re.compile(r"\b[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b"), "***JWT_REDACTED***"),
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter log record by redacting sensitive data from message.
        
        Args:
            record: LogRecord to filter
            
        Returns:
            True (always pass record through after redaction)
        """
        # Redact sensitive data from message
        message = record.getMessage()
        for pattern, replacement in self.PATTERNS:
            message = pattern.sub(replacement, message)
        
        # Update record message
        record.msg = message
        record.args = ()
        
        return True


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware that generates a unique request ID for each request.
    
    The request ID is:
    1. Generated as a UUID4
    2. Stored in contextvars for access in logging
    3. Added to response headers as X-Request-ID
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request and add request ID.
        
        Args:
            request: Incoming request
            call_next: Next middleware/handler in chain
            
        Returns:
            Response with X-Request-ID header
        """
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # Store in context variable
        request_id_var.set(request_id)
        
        # Process request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None
) -> None:
    """
    Configure structured JSON logging with sensitive data filtering.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path (logs to stdout if None)
    """
    # Create root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers
    root_logger.handlers = []
    
    # Create handler (file or stdout)
    if log_file:
        handler = logging.FileHandler(log_file)
    else:
        handler = logging.StreamHandler()
    
    # Set formatter and filter
    handler.setFormatter(JsonFormatter())
    handler.addFilter(SensitiveDataFilter())
    
    # Add handler to root logger
    root_logger.addHandler(handler)
    
    # Log startup message
    logging.info("Structured JSON logging initialized", extra={"level": level})


def get_request_id() -> Optional[str]:
    """
    Get current request ID from context.
    
    Returns:
        Request ID if available, None otherwise
    """
    return request_id_var.get()
