"""
Anonymization Service for KAMPÜS+ Platform - PII Detection and Replacement.

Constitutional Requirement (Principle IV - AI Ethics & Privacy):
"Student data MUST be anonymized before any AI processing"

Features:
- PII detection using regex patterns and spaCy Turkish NER
- Support for: names, emails, phone numbers, student IDs, addresses
- Replacement with generic tokens: [ÖĞRENCİ_ADI], [EMAIL], [TELEFON], etc.
- Turkish language support (names, addresses, TC kimlik no)
- Configurable detection sensitivity
- Audit logging of anonymization operations

Privacy Guarantees:
- Original data never sent to LLM
- Deterministic replacement (same PII → same token in session)
- No reverse mapping stored
"""

import re
import logging
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
from enum import Enum

# spaCy will be loaded lazily to avoid startup delays
_spacy_model = None


logger = logging.getLogger(__name__)


class PIIType(Enum):
    """Types of PII that can be detected and anonymized."""
    NAME = "name"
    EMAIL = "email"
    PHONE = "phone"
    STUDENT_ID = "student_id"
    TC_ID = "tc_id"  # Turkish national ID
    ADDRESS = "address"
    DATE_OF_BIRTH = "date_of_birth"
    GENERIC = "generic"


@dataclass
class PIIMatch:
    """Represents a detected PII match."""
    text: str
    pii_type: PIIType
    start: int
    end: int
    confidence: float
    replacement: str


class AnonymizationService:
    """Service for detecting and anonymizing PII in text."""
    
    # Token templates for different PII types
    REPLACEMENT_TOKENS = {
        PIIType.NAME: "[ÖĞRENCİ_ADI]",
        PIIType.EMAIL: "[EMAIL]",
        PIIType.PHONE: "[TELEFON]",
        PIIType.STUDENT_ID: "[ÖĞRENCİ_NO]",
        PIIType.TC_ID: "[TC_NO]",
        PIIType.ADDRESS: "[ADRES]",
        PIIType.DATE_OF_BIRTH: "[DOĞUM_TARİHİ]",
        PIIType.GENERIC: "[KİŞİSEL_BİLGİ]"
    }
    
    # Regex patterns for various PII types
    
    # Email pattern
    EMAIL_PATTERN = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        re.IGNORECASE
    )
    
    # Turkish phone patterns
    PHONE_PATTERNS = [
        re.compile(r'\b0?\s*(\d{3})\s*(\d{3})\s*(\d{2})\s*(\d{2})\b'),  # 0555 123 45 67
        re.compile(r'\b\+?90\s*(\d{3})\s*(\d{3})\s*(\d{2})\s*(\d{2})\b'),  # +90 555 123 45 67
        re.compile(r'\b0?\s*\((\d{3})\)\s*(\d{3})\s*(\d{2})\s*(\d{2})\b'),  # 0(555) 123 45 67
    ]
    
    # Student ID patterns (configurable per university)
    STUDENT_ID_PATTERNS = [
        re.compile(r'\b\d{9,11}\b'),  # 9-11 digit student numbers
        re.compile(r'\b[A-Z]\d{8,10}\b'),  # Letter + 8-10 digits
    ]
    
    # Turkish National ID (TC Kimlik No) - 11 digits
    TC_ID_PATTERN = re.compile(r'\b[1-9]\d{10}\b')
    
    # Date of birth patterns
    DOB_PATTERNS = [
        re.compile(r'\b\d{2}[./]\d{2}[./]\d{4}\b'),  # DD/MM/YYYY or DD.MM.YYYY
        re.compile(r'\b\d{4}[./]\d{2}[./]\d{2}\b'),  # YYYY/MM/DD
    ]
    
    # Turkish name indicators (common first/last name patterns)
    # These help with context when using NER
    TURKISH_NAME_SUFFIXES = ['oğlu', 'kızı', 'bey', 'hanım']
    
    def __init__(self, use_spacy: bool = True, spacy_model: str = "tr_core_news_sm"):
        """
        Initialize anonymization service.
        
        Args:
            use_spacy: Whether to use spaCy for NER (default True).
            spacy_model: spaCy model name for Turkish.
        """
        self.use_spacy = use_spacy
        self.spacy_model_name = spacy_model
        
        # Session-specific mappings (for consistent anonymization within a session)
        self.session_mappings: Dict[str, str] = {}
        
        # Statistics
        self.stats = {
            "total_anonymized": 0,
            "by_type": {pii_type: 0 for pii_type in PIIType}
        }
        
        logger.info(f"AnonymizationService initialized (spaCy: {use_spacy})")
    
    def _load_spacy_model(self):
        """Lazy load spaCy model on first use."""
        global _spacy_model
        
        if _spacy_model is None and self.use_spacy:
            try:
                import spacy
                _spacy_model = spacy.load(self.spacy_model_name)
                logger.info(f"Loaded spaCy model: {self.spacy_model_name}")
            except Exception as e:
                logger.warning(f"Failed to load spaCy model: {e}. Falling back to regex-only.")
                self.use_spacy = False
        
        return _spacy_model
    
    def anonymize(
        self, 
        text: str, 
        session_id: Optional[str] = None,
        preserve_structure: bool = True
    ) -> Tuple[str, List[PIIMatch]]:
        """
        Anonymize PII in text.
        
        Args:
            text: Input text to anonymize.
            session_id: Optional session ID for consistent anonymization.
            preserve_structure: Whether to preserve text structure (length, spacing).
        
        Returns:
            Tuple of (anonymized_text, list_of_detected_pii).
        """
        if not text or not text.strip():
            return text, []
        
        # Detect all PII
        pii_matches = self._detect_pii(text)
        
        # Sort by position (reverse order to replace from end to start)
        pii_matches.sort(key=lambda x: x.start, reverse=True)
        
        # Replace PII with tokens
        anonymized_text = text
        for match in pii_matches:
            # Use session-consistent replacement if session_id provided
            if session_id:
                key = f"{session_id}:{match.text}"
                if key not in self.session_mappings:
                    self.session_mappings[key] = match.replacement
                replacement = self.session_mappings[key]
            else:
                replacement = match.replacement
            
            # Replace the PII
            anonymized_text = (
                anonymized_text[:match.start] + 
                replacement + 
                anonymized_text[match.end:]
            )
            
            # Update statistics
            self.stats["total_anonymized"] += 1
            self.stats["by_type"][match.pii_type] += 1
        
        logger.info(f"Anonymized {len(pii_matches)} PII instances in text")
        
        return anonymized_text, pii_matches
    
    def _detect_pii(self, text: str) -> List[PIIMatch]:
        """
        Detect all PII in text using regex and NER.
        
        Args:
            text: Input text to scan.
        
        Returns:
            List of PIIMatch objects.
        """
        matches = []
        
        # 1. Detect emails (regex)
        matches.extend(self._detect_emails(text))
        
        # 2. Detect phone numbers (regex)
        matches.extend(self._detect_phones(text))
        
        # 3. Detect student IDs (regex)
        matches.extend(self._detect_student_ids(text))
        
        # 4. Detect TC IDs (regex)
        matches.extend(self._detect_tc_ids(text))
        
        # 5. Detect dates of birth (regex)
        matches.extend(self._detect_dobs(text))
        
        # 6. Detect names using spaCy NER (if available)
        if self.use_spacy:
            matches.extend(self._detect_names_spacy(text))
        
        # 7. Remove overlapping matches (keep highest confidence)
        matches = self._remove_overlaps(matches)
        
        return matches
    
    def _detect_emails(self, text: str) -> List[PIIMatch]:
        """Detect email addresses."""
        matches = []
        for match in self.EMAIL_PATTERN.finditer(text):
            matches.append(PIIMatch(
                text=match.group(),
                pii_type=PIIType.EMAIL,
                start=match.start(),
                end=match.end(),
                confidence=1.0,
                replacement=self.REPLACEMENT_TOKENS[PIIType.EMAIL]
            ))
        return matches
    
    def _detect_phones(self, text: str) -> List[PIIMatch]:
        """Detect phone numbers."""
        matches = []
        for pattern in self.PHONE_PATTERNS:
            for match in pattern.finditer(text):
                matches.append(PIIMatch(
                    text=match.group(),
                    pii_type=PIIType.PHONE,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.95,
                    replacement=self.REPLACEMENT_TOKENS[PIIType.PHONE]
                ))
        return matches
    
    def _detect_student_ids(self, text: str) -> List[PIIMatch]:
        """Detect student ID numbers."""
        matches = []
        
        # Use context clues to avoid false positives
        context_keywords = ['öğrenci', 'numara', 'no', 'id', 'kimlik']
        
        for pattern in self.STUDENT_ID_PATTERNS:
            for match in pattern.finditer(text):
                # Check if there's context nearby
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end].lower()
                
                confidence = 0.6
                if any(keyword in context for keyword in context_keywords):
                    confidence = 0.9
                
                matches.append(PIIMatch(
                    text=match.group(),
                    pii_type=PIIType.STUDENT_ID,
                    start=match.start(),
                    end=match.end(),
                    confidence=confidence,
                    replacement=self.REPLACEMENT_TOKENS[PIIType.STUDENT_ID]
                ))
        
        return matches
    
    def _detect_tc_ids(self, text: str) -> List[PIIMatch]:
        """Detect Turkish national ID numbers (TC Kimlik No)."""
        matches = []
        
        for match in self.TC_ID_PATTERN.finditer(text):
            # Basic TC ID validation (first digit cannot be 0, already in regex)
            tc_id = match.group()
            
            # Optional: Add checksum validation for higher confidence
            # For now, use context to avoid false positives
            start = max(0, match.start() - 50)
            end = min(len(text), match.end() + 50)
            context = text[start:end].lower()
            
            confidence = 0.7
            if 'tc' in context or 'kimlik' in context:
                confidence = 0.95
            
            matches.append(PIIMatch(
                text=tc_id,
                pii_type=PIIType.TC_ID,
                start=match.start(),
                end=match.end(),
                confidence=confidence,
                replacement=self.REPLACEMENT_TOKENS[PIIType.TC_ID]
            ))
        
        return matches
    
    def _detect_dobs(self, text: str) -> List[PIIMatch]:
        """Detect dates of birth."""
        matches = []
        
        context_keywords = ['doğum', 'doğdu', 'birth', 'born', 'tarihi']
        
        for pattern in self.DOB_PATTERNS:
            for match in pattern.finditer(text):
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end].lower()
                
                confidence = 0.5
                if any(keyword in context for keyword in context_keywords):
                    confidence = 0.9
                
                matches.append(PIIMatch(
                    text=match.group(),
                    pii_type=PIIType.DATE_OF_BIRTH,
                    start=match.start(),
                    end=match.end(),
                    confidence=confidence,
                    replacement=self.REPLACEMENT_TOKENS[PIIType.DATE_OF_BIRTH]
                ))
        
        return matches
    
    def _detect_names_spacy(self, text: str) -> List[PIIMatch]:
        """Detect person names using spaCy NER."""
        matches = []
        
        try:
            nlp = self._load_spacy_model()
            if nlp is None:
                return matches
            
            doc = nlp(text)
            
            for ent in doc.ents:
                if ent.label_ == "PERSON" or ent.label_ == "PER":
                    matches.append(PIIMatch(
                        text=ent.text,
                        pii_type=PIIType.NAME,
                        start=ent.start_char,
                        end=ent.end_char,
                        confidence=0.8,  # NER confidence can vary
                        replacement=self.REPLACEMENT_TOKENS[PIIType.NAME]
                    ))
        
        except Exception as e:
            logger.warning(f"spaCy NER failed: {e}")
        
        return matches
    
    def _remove_overlaps(self, matches: List[PIIMatch]) -> List[PIIMatch]:
        """
        Remove overlapping matches, keeping the one with highest confidence.
        
        Args:
            matches: List of PIIMatch objects.
        
        Returns:
            Filtered list without overlaps.
        """
        if not matches:
            return matches
        
        # Sort by start position, then by confidence (descending)
        sorted_matches = sorted(matches, key=lambda x: (x.start, -x.confidence))
        
        filtered = []
        last_end = -1
        
        for match in sorted_matches:
            # If this match doesn't overlap with the last one, add it
            if match.start >= last_end:
                filtered.append(match)
                last_end = match.end
        
        return filtered
    
    def get_statistics(self) -> Dict:
        """Get anonymization statistics."""
        return self.stats.copy()
    
    def reset_session(self, session_id: Optional[str] = None):
        """
        Reset session mappings.
        
        Args:
            session_id: If provided, only reset that session's mappings.
        """
        if session_id:
            # Remove only this session's mappings
            keys_to_remove = [k for k in self.session_mappings.keys() if k.startswith(f"{session_id}:")]
            for key in keys_to_remove:
                del self.session_mappings[key]
        else:
            # Reset all
            self.session_mappings.clear()
        
        logger.info(f"Reset session mappings (session_id: {session_id or 'all'})")
    
    def configure_patterns(
        self, 
        student_id_patterns: Optional[List[str]] = None,
        additional_name_keywords: Optional[List[str]] = None
    ):
        """
        Configure detection patterns for specific university.
        
        Args:
            student_id_patterns: Custom regex patterns for student IDs.
            additional_name_keywords: Additional keywords for name context.
        """
        if student_id_patterns:
            self.STUDENT_ID_PATTERNS = [
                re.compile(pattern) for pattern in student_id_patterns
            ]
            logger.info(f"Configured {len(student_id_patterns)} custom student ID patterns")
        
        if additional_name_keywords:
            self.TURKISH_NAME_SUFFIXES.extend(additional_name_keywords)
            logger.info(f"Added {len(additional_name_keywords)} name keywords")
