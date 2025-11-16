"""
PDF Processing Service for KAMPÜS+ AI Platform.

Handles:
- Text extraction from PDF files (PyPDF2 primary, pdfplumber fallback)
- Text chunking with token-based segmentation (512 tokens, 50 token overlap)
- OpenAI embedding generation for chunks
- Security validation (magic bytes, size limits)
- Performance optimization (batching, async operations)

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
from openai import AsyncOpenAI

from src.core.config import settings

logger = logging.getLogger(__name__)


class PDFService:
    """Service for PDF processing and text extraction."""
    
    # Quality threshold for PyPDF2 extraction (characters per page)
    PYPDF2_QUALITY_THRESHOLD = 100
    
    # OpenAI batch size for embedding generation
    EMBEDDING_BATCH_SIZE = 100
    
    def __init__(self):
        """Initialize PDF service with OpenAI client and tokenizer."""
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        self.chunk_size = settings.pdf_chunk_size
        self.chunk_overlap = settings.pdf_chunk_overlap
    
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
        
        # Tokenize the entire text
        tokens = self.encoding.encode(text)
        
        # If text is shorter than chunk size, return as single chunk
        if len(tokens) <= chunk_size:
            return [text]
        
        chunks = []
        start_idx = 0
        
        while start_idx < len(tokens):
            # Get chunk tokens
            end_idx = min(start_idx + chunk_size, len(tokens))
            chunk_tokens = tokens[start_idx:end_idx]
            
            # Decode back to text
            chunk_text = self.encoding.decode(chunk_tokens)
            chunks.append(chunk_text)
            
            # Move start position with overlap
            start_idx = end_idx - overlap
            
            # Prevent infinite loop if we're at the end
            if end_idx >= len(tokens):
                break
        
        return chunks
    
    async def generate_embeddings_for_chunks(
        self, 
        chunks: List[str]
    ) -> List[List[float]]:
        """
        Generate OpenAI embeddings for text chunks with batching.
        
        Args:
            chunks: List of text chunks
            
        Returns:
            List of embedding vectors (1536 dimensions each)
        """
        if not chunks:
            return []
        
        all_embeddings = []
        
        # Process in batches to avoid API limits
        for i in range(0, len(chunks), self.EMBEDDING_BATCH_SIZE):
            batch = chunks[i:i + self.EMBEDDING_BATCH_SIZE]
            
            try:
                batch_embeddings = await self._call_openai_embeddings(batch)
                all_embeddings.extend(batch_embeddings)
            except Exception as e:
                logger.error(f"Failed to generate embeddings for batch {i}: {e}")
                raise
        
        return all_embeddings
    
    async def _call_openai_embeddings(
        self, 
        texts: List[str]
    ) -> List[List[float]]:
        """
        Call OpenAI API to generate embeddings.
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embedding vectors
        """
        response = await self.openai_client.embeddings.create(
            model=settings.openai_embedding_model,
            input=texts
        )
        
        embeddings = [item.embedding for item in response.data]
        return embeddings
    
    async def process_pdf(
        self, 
        file_content: bytes,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Complete PDF processing pipeline: extract → chunk → embed.
        
        Args:
            file_content: Raw PDF file bytes
            include_metadata: Whether to include PDF metadata in result
            
        Returns:
            Dictionary containing:
                - chunks: List of (text, embedding) tuples
                - page_count: Number of pages in PDF
                - metadata: Sanitized PDF metadata (if include_metadata=True)
        """
        # Extract text
        logger.info("Extracting text from PDF")
        text = self.extract_text(file_content)
        
        if not text or not text.strip():
            raise ValueError("No text could be extracted from PDF")
        
        # Chunk text
        logger.info("Chunking text into segments")
        chunks = self.chunk_text(text)
        logger.info(f"Created {len(chunks)} chunks")
        
        # Generate embeddings
        logger.info("Generating embeddings for chunks")
        embeddings = await self.generate_embeddings_for_chunks(chunks)
        
        # Get page count and metadata
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        page_count = len(pdf_reader.pages)
        
        result = {
            "chunks": [
                {"text": chunk, "embedding": embedding}
                for chunk, embedding in zip(chunks, embeddings)
            ],
            "page_count": page_count,
            "chunk_count": len(chunks)
        }
        
        # Include sanitized metadata if requested
        if include_metadata and pdf_reader.metadata:
            result["metadata"] = self._sanitize_metadata(pdf_reader.metadata)
        
        return result
    
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
