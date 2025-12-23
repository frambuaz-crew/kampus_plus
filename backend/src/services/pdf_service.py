"""
PDF Processing Service for KAMPÜS+ AI Platform.

Handles:
- Text extraction from PDF files (PyPDF2 primary, pdfplumber fallback)
- Text chunking with token-based segmentation (512 tokens, 50 token overlap)
- Security validation (magic bytes, size limits)
- Performance optimization (batching, async operations)

Note: Embedding generation is now handled by VectorStoreService (Google Gemini)

Constitutional Requirements:
- Must handle Turkish UTF-8 characters correctly
- Must complete 10MB PDF processing within 2 minutes (SC-005)
- Must sanitize metadata for security
"""

import io
import logging
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
import asyncio

import PyPDF2
import pdfplumber
import tiktoken

from src.core.config import settings

logger = logging.getLogger(__name__)


class PDFService:
    """Service for PDF processing and text extraction."""
    
    # Quality threshold for PyPDF2 extraction (characters per page)
    PYPDF2_QUALITY_THRESHOLD = 100
    
    def __init__(self):
        """Initialize PDF service with tokenizer."""
        self._encoding = None  # Lazy load to avoid download during initialization
        self.chunk_size = settings.pdf_chunk_size
        self.chunk_overlap = settings.pdf_chunk_overlap
    
    @property
    def encoding(self):
        """Lazy load tiktoken encoding."""
        if self._encoding is None:
            try:
                self._encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
            except Exception as e:
                logger.error(f"Failed to load tiktoken encoding: {e}")
                # Fallback to cl100k_base encoding
                try:
                    self._encoding = tiktoken.get_encoding("cl100k_base")
                except Exception:
                    raise RuntimeError(
                        "Could not load tiktoken encoding. Please check internet connection "
                        "or pre-download encoding files."
                    )
        return self._encoding
    
    def validate_pdf(
        self, 
        file_content: bytes, 
        max_size_mb: Optional[int] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate PDF file before processing.
        
        Args:
            file_content: Raw PDF file bytes
            max_size_mb: Maximum file size in MB (defaults to config)
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        max_size = max_size_mb if max_size_mb is not None else settings.max_file_size_mb
        max_bytes = max_size * 1024 * 1024
        
        # Check file size
        if len(file_content) > max_bytes:
            return False, f"File size exceeds maximum allowed size of {max_size}MB"
        
        # Check PDF magic bytes
        if not file_content.startswith(b'%PDF'):
            return False, "Invalid PDF format: missing PDF header"
        
        # Try to open with PyPDF2 to verify it's a valid PDF
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            # Try to access pages
            _ = len(pdf_reader.pages)
        except Exception as e:
            return False, f"Invalid PDF file: {str(e)}"
        
        return True, None
    
    def extract_text(self, file_content: bytes) -> str:
        """
        Extract text from PDF using PyPDF2 (primary) with pdfplumber fallback.
        
        Args:
            file_content: Raw PDF file bytes
            
        Returns:
            Extracted text as string
            
        Raises:
            Exception: If PDF extraction fails with both methods
        """
        pdf_file = io.BytesIO(file_content)
        
        try:
            # Primary method: PyPDF2
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            pages = pdf_reader.pages
            
            if not pages:
                logger.warning("PDF has no pages")
                return ""
            
            # Extract text from all pages
            text_parts = []
            for page in pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                except Exception as e:
                    logger.warning(f"Failed to extract text from page: {e}")
                    continue
            
            extracted_text = "\n".join(text_parts)
            
            # Check extraction quality
            avg_chars_per_page = len(extracted_text) / len(pages) if pages else 0
            
            if avg_chars_per_page < self.PYPDF2_QUALITY_THRESHOLD:
                logger.warning(
                    f"PyPDF2 extraction quality poor ({avg_chars_per_page:.1f} chars/page), "
                    f"falling back to pdfplumber"
                )
                # Fallback to pdfplumber
                pdf_file.seek(0)
                return self._extract_with_pdfplumber(file_content)
            
            return extracted_text
            
        except Exception as e:
            logger.error(f"PyPDF2 extraction failed: {e}, trying pdfplumber fallback")
            try:
                return self._extract_with_pdfplumber(file_content)
            except Exception as fallback_error:
                logger.error(f"pdfplumber fallback also failed: {fallback_error}")
                raise Exception(f"PDF text extraction failed: {fallback_error}")
    
    def _extract_with_pdfplumber(self, file_content: bytes) -> str:
        """
        Extract text using pdfplumber (better for scanned PDFs).
        
        Args:
            file_content: Raw PDF file bytes
            
        Returns:
            Extracted text as string
        """
        pdf_file = io.BytesIO(file_content)
        text_parts = []
        
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        
        return "\n".join(text_parts)
    
    def chunk_text(
        self, 
        text: str, 
        chunk_size: Optional[int] = None,
        overlap: Optional[int] = None
    ) -> List[str]:
        """
        Chunk text into segments with token-based splitting and overlap.
        
        Args:
            text: Text to chunk
            chunk_size: Maximum tokens per chunk (defaults to config)
            overlap: Token overlap between chunks (defaults to config)
            
        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []
        
        chunk_size = chunk_size if chunk_size is not None else self.chunk_size
        overlap = overlap if overlap is not None else self.chunk_overlap
        
        # Simple word-based chunking (approximate tokens: ~1.3 words per token)
        # This avoids tiktoken SSL timeout issues during background processing
        words = text.split()
        approx_words_per_chunk = int(chunk_size * 1.3)
        approx_overlap_words = int(overlap * 1.3)
        
        # If text is shorter than chunk size, return as single chunk
        if len(words) <= approx_words_per_chunk:
            return [text]
        
        chunks = []
        start_idx = 0
        
        while start_idx < len(words):
            # Get chunk words
            end_idx = min(start_idx + approx_words_per_chunk, len(words))
            chunk_words = words[start_idx:end_idx]
            
            # Join back to text
            chunk_text = " ".join(chunk_words)
            chunks.append(chunk_text)
            
            # Move start position with overlap
            start_idx = end_idx - approx_overlap_words
            
            # Prevent infinite loop if we're at the end
            if end_idx >= len(words):
                break
        
        return chunks
    
    # ============================================================================
    # DEPRECATED: Embedding generation moved to VectorStoreService (Gemini)
    # ============================================================================
    
    async def generate_embeddings_for_chunks(
        self, 
        chunks: List[str]
    ) -> List[List[float]]:
        """
        DEPRECATED: Use VectorStoreService.generate_embeddings_batch() instead.
        
        This method is kept for backward compatibility but should not be used.
        Embedding generation is now handled by VectorStoreService using Google Gemini.
        """
        raise NotImplementedError(
            "Embedding generation moved to VectorStoreService. "
            "Use vector_service.generate_embeddings_batch(chunks) instead."
        )
    
    async def process_pdf(
        self, 
        file_content: bytes,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        DEPRECATED: Use extract_text() and chunk_text() separately.
        
        Complete PDF processing is now handled by background tasks
        that use VectorStoreService for embeddings.
        """
        raise NotImplementedError(
            "Complete PDF processing moved to background tasks. "
            "Use extract_text() and chunk_text() separately, "
            "then VectorStoreService for embeddings."
        )
    
    def _sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, str]:
        """
        Sanitize PDF metadata to prevent XSS and other security issues.
        
        Args:
            metadata: Raw PDF metadata dictionary
            
        Returns:
            Sanitized metadata dictionary
        """
        sanitized = {}
        
        # Common metadata fields
        safe_fields = ['/Title', '/Author', '/Subject', '/Creator', '/Producer']
        
        for field in safe_fields:
            if field in metadata:
                value = str(metadata[field])
                # Remove potential HTML/script tags
                value = value.replace('<', '&lt;').replace('>', '&gt;')
                # Limit length
                value = value[:500]
                sanitized[field.lstrip('/')] = value
        
        return sanitized
