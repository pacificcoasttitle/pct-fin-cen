"""
FinCEN SDTM (Secure Direct Transfer Mode) integration services.

This module provides:
- SFTP client for SDTM file transfer
- FBARX XML builder for generating compliant XML
- Response processor for parsing MESSAGES.XML and ACKED files
- Utility functions for compression and hashing
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
from app.services.fincen.fbarx_builder import (
    build_fbarx_xml,
    PreflightError,
)

__all__ = [
    "gzip_b64_encode",
    "gzip_b64_decode",
    "sha256_hex",
    "SdtmClient",
    "parse_messages_xml",
    "parse_acked_xml",
    "build_fbarx_xml",
    "PreflightError",
]
