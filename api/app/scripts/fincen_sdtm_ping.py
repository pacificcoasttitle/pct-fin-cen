#!/usr/bin/env python3
"""
FinCEN SDTM Connectivity Test

Tests SFTP connectivity to FinCEN SDTM server and lists directory contents.

Usage:
    python -m app.scripts.fincen_sdtm_ping
    
Environment variables:
    SDTM_HOST, SDTM_PORT, SDTM_USERNAME, SDTM_PASSWORD: SFTP credentials
    
Exit codes:
    0: Connection successful
    1: Connection failed
"""
import logging
import sys
import json

# Load .env file for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required in production

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("fincen_sdtm_ping")


def main():
    """Main entry point for the ping test."""
    from app.config import get_settings
    from app.services.fincen import SdtmClient
    
    settings = get_settings()
    
    logger.info("=" * 60)
    logger.info("FinCEN SDTM Connectivity Test")
    logger.info("=" * 60)
    logger.info(f"Host: {settings.SDTM_HOST}")
    logger.info(f"Port: {settings.SDTM_PORT}")
    logger.info(f"Username: {settings.SDTM_USERNAME[:3]}***" if settings.SDTM_USERNAME else "NOT SET")
    logger.info(f"Environment: {settings.FINCEN_ENV}")
    logger.info("=" * 60)
    
    # Check configuration
    if not settings.SDTM_USERNAME:
        logger.error("SDTM_USERNAME not configured")
        return 1
    
    if not settings.SDTM_PASSWORD:
        logger.error("SDTM_PASSWORD not configured")
        return 1
    
    # Attempt connection
    client = SdtmClient.from_settings()
    success, info = client.ping()
    
    if success:
        logger.info("✅ CONNECTION SUCCESSFUL")
        logger.info("")
        logger.info(f"Submissions directory: {info.get('submissions_count', 0)} files")
        if info.get('submissions_files'):
            for f in info['submissions_files'][:5]:
                logger.info(f"  - {f}")
            if info['submissions_count'] > 5:
                logger.info(f"  ... and {info['submissions_count'] - 5} more")
        
        logger.info("")
        logger.info(f"Acks directory: {info.get('acks_count', 0)} files")
        if info.get('acks_files'):
            for f in info['acks_files'][:5]:
                logger.info(f"  - {f}")
            if info['acks_count'] > 5:
                logger.info(f"  ... and {info['acks_count'] - 5} more")
        
        logger.info("")
        logger.info("=" * 60)
        return 0
    else:
        logger.error("❌ CONNECTION FAILED")
        logger.error(f"Error: {info.get('error', 'Unknown error')}")
        logger.info("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
