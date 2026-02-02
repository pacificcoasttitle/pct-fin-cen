#!/usr/bin/env python3
"""
FinCEN SDTM Response Poller

Polls for MESSAGES.XML and ACKED response files for submitted filings.

Usage:
    python -m app.scripts.poll_fincen_sdtm
    
Environment variables:
    DATABASE_URL: PostgreSQL connection string
    SDTM_HOST, SDTM_PORT, SDTM_USERNAME, SDTM_PASSWORD: SFTP credentials
    
This script should be run periodically (e.g., via cron or Render Cron Job).
Recommended schedule: Every 15 minutes during business hours.
"""
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("poll_fincen_sdtm")


def main():
    """Main entry point for the poller."""
    from app.database import SessionLocal
    from app.config import get_settings
    from app.services.filing_lifecycle import (
        list_pending_polls,
        poll_sdtm_responses,
    )
    
    settings = get_settings()
    
    logger.info("=" * 60)
    logger.info("FinCEN SDTM Response Poller Starting")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"SDTM Host: {settings.SDTM_HOST}")
    logger.info("=" * 60)
    
    # Check configuration
    if settings.FINCEN_TRANSPORT != "sdtm":
        logger.warning(f"FINCEN_TRANSPORT is '{settings.FINCEN_TRANSPORT}', not 'sdtm'. Nothing to poll.")
        return 0
    
    if not settings.sdtm_configured:
        logger.error("SDTM not fully configured. Check SDTM_* and TRANSMITTER_* env vars.")
        return 1
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Get pending submissions
        pending = list_pending_polls(db, limit=50)
        logger.info(f"Found {len(pending)} submissions ready for polling")
        
        if not pending:
            logger.info("No submissions to poll. Exiting.")
            return 0
        
        # Poll each submission
        success_count = 0
        error_count = 0
        
        for submission in pending:
            report_id = submission.report_id
            logger.info(f"Polling submission for report {report_id}...")
            
            try:
                status, result = poll_sdtm_responses(db, report_id)
                db.commit()
                
                if status == "accepted":
                    logger.info(f"  Report {report_id}: ACCEPTED (BSA ID: {result.get('bsa_id', 'N/A')})")
                elif status == "rejected":
                    logger.warning(f"  Report {report_id}: REJECTED")
                elif status == "needs_review":
                    logger.warning(f"  Report {report_id}: NEEDS_REVIEW")
                else:
                    logger.info(f"  Report {report_id}: Still pending ({status})")
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"  Report {report_id}: Poll error - {e}")
                error_count += 1
                db.rollback()
        
        # Summary
        logger.info("=" * 60)
        logger.info(f"Polling complete: {success_count} successful, {error_count} errors")
        logger.info("=" * 60)
        
        return 0 if error_count == 0 else 1
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
