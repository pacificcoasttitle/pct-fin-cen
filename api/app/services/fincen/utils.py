"""
Utility functions for FinCEN SDTM integration.

Provides helpers for:
- Gzip compression/decompression with base64 encoding
- SHA256 hashing for artifact verification
"""
import gzip
import base64
import hashlib
from typing import Union


def gzip_b64_encode(data: Union[str, bytes]) -> str:
    """
    Compress data with gzip and encode as base64.
    
    Used for storing XML artifacts in payload_snapshot without
    bloating the database with raw XML.
    
    Args:
        data: String or bytes to compress
        
    Returns:
        Base64-encoded gzipped data
    """
    if isinstance(data, str):
        data = data.encode("utf-8")
    compressed = gzip.compress(data)
    return base64.b64encode(compressed).decode("ascii")


def gzip_b64_decode(encoded: str) -> bytes:
    """
    Decode base64 and decompress gzip data.
    
    Args:
        encoded: Base64-encoded gzipped string
        
    Returns:
        Original bytes
    """
    compressed = base64.b64decode(encoded)
    return gzip.decompress(compressed)


def sha256_hex(data: Union[str, bytes]) -> str:
    """
    Compute SHA256 hash of data and return as hex string.
    
    Used for artifact integrity verification.
    
    Args:
        data: String or bytes to hash
        
    Returns:
        64-character hex string
    """
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def digits_only(value: str) -> str:
    """
    Strip all non-digit characters from a string.
    
    Used for normalizing TIN, SSN, EIN, phone numbers, etc.
    
    Args:
        value: String that may contain hyphens, spaces, etc.
        
    Returns:
        String containing only digits
    """
    return "".join(c for c in value if c.isdigit())


def normalize_phone(phone: str) -> str:
    """
    Normalize phone number to digits only for FBARX.
    
    Args:
        phone: Phone number string (may contain dashes, parentheses, etc.)
        
    Returns:
        Digits-only phone string
    """
    return digits_only(phone)


def normalize_zip(zipcode: str) -> str:
    """
    Normalize ZIP code (remove hyphens/spaces).
    
    Args:
        zipcode: ZIP code string (may be "12345" or "12345-6789")
        
    Returns:
        Normalized ZIP (e.g., "123456789" for ZIP+4)
    """
    return digits_only(zipcode) or zipcode


def country_to_iso2(country: str) -> str:
    """
    Convert country name to ISO 3166-1 alpha-2 code.
    
    Args:
        country: Country name (e.g., "United States", "USA", "US")
        
    Returns:
        Two-letter country code (e.g., "US")
    """
    # Normalize input
    normalized = country.strip().upper() if country else "US"
    
    # Common mappings
    mappings = {
        "UNITED STATES": "US",
        "UNITED STATES OF AMERICA": "US",
        "USA": "US",
        "U.S.A.": "US",
        "U.S.": "US",
        "AMERICA": "US",
        "CANADA": "CA",
        "MEXICO": "MX",
        "UNITED KINGDOM": "GB",
        "UK": "GB",
        "GREAT BRITAIN": "GB",
        # Add more as needed
    }
    
    # If already 2 chars, assume it's an ISO code
    if len(normalized) == 2:
        return normalized
    
    return mappings.get(normalized, "US")  # Default to US


def sanitize_text(value: str, forbidden_patterns: list = None) -> tuple[str, bool]:
    """
    Sanitize text field and check for forbidden placeholders.
    
    Args:
        value: Text to sanitize
        forbidden_patterns: List of forbidden strings (case-insensitive)
        
    Returns:
        (sanitized_value, is_valid) tuple
    """
    if not value:
        return "", False
    
    if forbidden_patterns is None:
        forbidden_patterns = [
            "UNKNOWN", "N/A", "NONE", "NOT APPLICABLE",
            "SEE ABOVE", "TBD", "XXX", "PLACEHOLDER"
        ]
    
    sanitized = value.strip()
    upper = sanitized.upper()
    
    for pattern in forbidden_patterns:
        if pattern.upper() in upper:
            return sanitized, False
    
    return sanitized, True
