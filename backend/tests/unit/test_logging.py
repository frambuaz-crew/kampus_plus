"""
Unit tests for structured JSON logging.

Tests:
- JsonFormatter outputs valid JSON with correct fields
- SensitiveDataFilter redacts passwords, tokens, PII
- RequestIDMiddleware generates and propagates request IDs
- setup_logging configures root logger correctly

Requirements: FR-039, FR-040, FR-041
"""

import json
import logging
import uuid
from io import StringIO

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.core.logging import (
    JsonFormatter,
    RequestIDMiddleware,
    SensitiveDataFilter,
    get_request_id,
    request_id_var,
    setup_logging,
)


class TestJsonFormatter:
    """Test suite for JsonFormatter class."""
    
    def test_format_basic_log_record(self):
        """Test that formatter outputs valid JSON with required fields."""
        # Arrange
        formatter = JsonFormatter()
        logger = logging.getLogger("test_logger")
        logger.setLevel(logging.INFO)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Act
        logger.info("Test message")
        
        # Assert
        output = stream.getvalue()
        log_data = json.loads(output)
        
        assert log_data["level"] == "INFO"
        assert log_data["message"] == "Test message"
        assert log_data["module"] == "test_logging"
        assert "timestamp" in log_data
        assert "function" in log_data
        assert "line" in log_data
        
        # Cleanup
        logger.removeHandler(handler)
    
    def test_format_with_request_id(self):
        """Test that formatter includes request ID from context."""
        # Arrange
        formatter = JsonFormatter()
        logger = logging.getLogger("test_logger_request_id")
        logger.setLevel(logging.INFO)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        test_request_id = str(uuid.uuid4())
        request_id_var.set(test_request_id)
        
        # Act
        logger.info("Test with request ID")
        
        # Assert
        output = stream.getvalue()
        log_data = json.loads(output)
        
        assert log_data["request_id"] == test_request_id
        
        # Cleanup
        logger.removeHandler(handler)
        request_id_var.set(None)
    
    def test_format_with_exception(self):
        """Test that formatter includes exception info."""
        # Arrange
        formatter = JsonFormatter()
        logger = logging.getLogger("test_logger_exception")
        logger.setLevel(logging.ERROR)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Act
        try:
            raise ValueError("Test exception")
        except ValueError:
            logger.exception("Error occurred")
        
        # Assert
        output = stream.getvalue()
        log_data = json.loads(output)
        
        assert log_data["level"] == "ERROR"
        assert "exception" in log_data
        assert "ValueError: Test exception" in log_data["exception"]
        
        # Cleanup
        logger.removeHandler(handler)
    
    def test_format_with_extra_fields(self):
        """Test that formatter includes extra fields."""
        # Arrange
        formatter = JsonFormatter()
        logger = logging.getLogger("test_logger_extra")
        logger.setLevel(logging.INFO)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Act
        logger.info("Test with extra", extra={"user_id": 123, "action": "login"})
        
        # Assert
        output = stream.getvalue()
        log_data = json.loads(output)
        
        assert "extra" in log_data
        assert log_data["extra"]["user_id"] == 123
        assert log_data["extra"]["action"] == "login"
        
        # Cleanup
        logger.removeHandler(handler)


class TestSensitiveDataFilter:
    """Test suite for SensitiveDataFilter class."""
    
    def test_redact_password(self):
        """Test that filter redacts password fields."""
        # Arrange
        log_filter = SensitiveDataFilter()
        logger = logging.getLogger("test_logger_password")
        logger.setLevel(logging.INFO)
        logger.addFilter(log_filter)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        
        # Act
        logger.info("User login with password=secret123")
        
        # Assert
        output = stream.getvalue()
        assert "secret123" not in output
        assert "***REDACTED***" in output
        
        # Cleanup
        logger.removeHandler(handler)
        logger.removeFilter(log_filter)
    
    def test_redact_token(self):
        """Test that filter redacts token fields."""
        # Arrange
        log_filter = SensitiveDataFilter()
        logger = logging.getLogger("test_logger_token")
        logger.setLevel(logging.INFO)
        logger.addFilter(log_filter)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        
        # Act
        logger.info("API call with token=abc123xyz")
        
        # Assert
        output = stream.getvalue()
        assert "abc123xyz" not in output
        assert "***REDACTED***" in output
        
        # Cleanup
        logger.removeHandler(handler)
        logger.removeFilter(log_filter)
    
    def test_redact_api_key(self):
        """Test that filter redacts API key fields."""
        # Arrange
        log_filter = SensitiveDataFilter()
        logger = logging.getLogger("test_logger_apikey")
        logger.setLevel(logging.INFO)
        logger.addFilter(log_filter)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        
        # Act
        logger.info("Config loaded with api_key=sk-123456789")
        
        # Assert
        output = stream.getvalue()
        assert "sk-123456789" not in output
        assert "***REDACTED***" in output
        
        # Cleanup
        logger.removeHandler(handler)
        logger.removeFilter(log_filter)
    
    def test_redact_email(self):
        """Test that filter redacts email addresses (PII)."""
        # Arrange
        log_filter = SensitiveDataFilter()
        logger = logging.getLogger("test_logger_email")
        logger.setLevel(logging.INFO)
        logger.addFilter(log_filter)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        
        # Act
        logger.info("User registered: user@example.com")
        
        # Assert
        output = stream.getvalue()
        assert "user@example.com" not in output
        assert "***EMAIL_REDACTED***" in output
        
        # Cleanup
        logger.removeHandler(handler)
        logger.removeFilter(log_filter)
    
    def test_redact_jwt_token(self):
        """Test that filter redacts JWT tokens."""
        # Arrange
        log_filter = SensitiveDataFilter()
        logger = logging.getLogger("test_logger_jwt")
        logger.setLevel(logging.INFO)
        logger.addFilter(log_filter)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        
        # Act
        logger.info("Auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U")
        
        # Assert
        output = stream.getvalue()
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in output
        assert "***JWT_REDACTED***" in output
        
        # Cleanup
        logger.removeHandler(handler)
        logger.removeFilter(log_filter)
    
    def test_no_redaction_for_safe_content(self):
        """Test that filter does not modify safe log messages."""
        # Arrange
        log_filter = SensitiveDataFilter()
        logger = logging.getLogger("test_logger_safe")
        logger.setLevel(logging.INFO)
        logger.addFilter(log_filter)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        
        safe_message = "User logged in successfully"
        
        # Act
        logger.info(safe_message)
        
        # Assert
        output = stream.getvalue()
        assert safe_message in output
        assert "REDACTED" not in output
        
        # Cleanup
        logger.removeHandler(handler)
        logger.removeFilter(log_filter)


class TestRequestIDMiddleware:
    """Test suite for RequestIDMiddleware class."""
    
    def test_middleware_generates_request_id(self):
        """Test that middleware generates request ID for new requests."""
        # Arrange
        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)
        
        @app.get("/test")
        async def test_endpoint():
            return {"request_id": get_request_id()}
        
        client = TestClient(app)
        
        # Act
        response = client.get("/test")
        
        # Assert
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        
        request_id = response.headers["X-Request-ID"]
        assert request_id is not None
        assert len(request_id) == 36  # UUID4 format
        
        # Request ID should be in response body too
        assert response.json()["request_id"] == request_id
    
    def test_middleware_preserves_existing_request_id(self):
        """Test that middleware uses X-Request-ID from incoming request."""
        # Arrange
        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)
        
        @app.get("/test")
        async def test_endpoint():
            return {"request_id": get_request_id()}
        
        client = TestClient(app)
        existing_request_id = str(uuid.uuid4())
        
        # Act
        response = client.get("/test", headers={"X-Request-ID": existing_request_id})
        
        # Assert
        assert response.status_code == 200
        assert response.headers["X-Request-ID"] == existing_request_id
        assert response.json()["request_id"] == existing_request_id
    
    def test_middleware_propagates_request_id_to_logs(self):
        """Test that middleware makes request ID available for logging."""
        # Arrange
        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)
        
        logger = logging.getLogger("test_middleware_logs")
        logger.setLevel(logging.INFO)
        
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        
        @app.get("/test")
        async def test_endpoint():
            logger.info("Processing request")
            return {"status": "ok"}
        
        client = TestClient(app)
        
        # Act
        response = client.get("/test")
        
        # Assert
        assert response.status_code == 200
        
        output = stream.getvalue()
        log_data = json.loads(output)
        
        assert "request_id" in log_data
        assert log_data["request_id"] == response.headers["X-Request-ID"]
        
        # Cleanup
        logger.removeHandler(handler)


class TestSetupLogging:
    """Test suite for setup_logging function."""
    
    def test_setup_logging_configures_root_logger(self):
        """Test that setup_logging configures root logger with JSON formatter."""
        # Arrange
        stream = StringIO()
        
        # Act
        setup_logging(level="DEBUG")
        root_logger = logging.getLogger()
        
        # Replace handler stream for testing
        root_logger.handlers[0].stream = stream
        
        # Log test message
        logging.info("Test setup logging")
        
        # Assert
        output = stream.getvalue()
        log_data = json.loads(output)
        
        assert log_data["level"] == "INFO"
        assert log_data["message"] == "Test setup logging"
        assert root_logger.level == logging.DEBUG
    
    def test_setup_logging_applies_sensitive_data_filter(self):
        """Test that setup_logging applies SensitiveDataFilter."""
        # Arrange
        stream = StringIO()
        
        # Act
        setup_logging(level="INFO")
        root_logger = logging.getLogger()
        
        # Replace handler stream for testing
        root_logger.handlers[0].stream = stream
        
        # Log message with sensitive data
        logging.info("Login with password=secret123")
        
        # Assert
        output = stream.getvalue()
        assert "secret123" not in output
        assert "***REDACTED***" in output


class TestGetRequestId:
    """Test suite for get_request_id function."""
    
    def test_get_request_id_returns_none_when_not_set(self):
        """Test that get_request_id returns None when no request ID set."""
        # Arrange
        request_id_var.set(None)
        
        # Act
        result = get_request_id()
        
        # Assert
        assert result is None
    
    def test_get_request_id_returns_set_value(self):
        """Test that get_request_id returns value from context."""
        # Arrange
        test_request_id = str(uuid.uuid4())
        request_id_var.set(test_request_id)
        
        # Act
        result = get_request_id()
        
        # Assert
        assert result == test_request_id
        
        # Cleanup
        request_id_var.set(None)
