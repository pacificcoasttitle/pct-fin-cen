"""
FinCEN SDTM (Secure Direct Transfer Mode) integration services.

This module provides:
- SFTP client for SDTM file transfer
- RERX XML builder for generating Residential Real Estate Report XML
- Response processor for parsing MESSAGES.XML and .ACK files
- Utility functions for compression and hashing

Note: RERX (Real Estate Report) replaced FBARX as of Dec 2025 FinCEN spec.
"""
from app.services.fincen.utils import (
    gzip_b64_encode,
    gzip_b64_decode,
    sha256_hex,
)
from app.services.fincen.sdtm_client import SdtmClient
from app.services.fincen.response_processor import (
    parse_messages_xml,
    parse_acked_xml,
)
from app.services.fincen.rerx_builder import (
    build_rerx_xml,
    PreflightError,
    generate_rerx_filename,
)

__all__ = [
    "gzip_b64_encode",
    "gzip_b64_decode",
    "sha256_hex",
    "SdtmClient",
    "parse_messages_xml",
    "parse_acked_xml",
    "build_rerx_xml",
    "PreflightError",
    "generate_rerx_filename",
]
