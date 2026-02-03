#!/usr/bin/env python3
"""
Dry-run RERX XML generator.
Builds a complete RERX XML from an existing report WITHOUT submitting to FinCEN.
Outputs the XML to stdout and saves to a file for inspection/validation.

Usage:
    python -m app.scripts.rerx_dry_run                    # Uses most recent filed/complete report
    python -m app.scripts.rerx_dry_run --report-id UUID   # Uses specific report
    python -m app.scripts.rerx_dry_run --show-data        # Show wizard_data summary
"""

import sys
import os
import json
import argparse
from datetime import datetime

# Load .env for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app.config import get_settings
from app.database import SessionLocal
from app.models.report import Report
from app.models.filing_submission import FilingSubmission
from app.services.fincen.rerx_builder import build_rerx_xml, PreflightError


def find_best_report(db):
    """Find the most suitable report for a dry run."""
    # Try reports with status that indicates complete data
    for status in ["filed", "ready_to_file", "collecting", "determination_complete"]:
        report = (
            db.query(Report)
            .filter(Report.status == status)
            .filter(Report.wizard_data.isnot(None))
            .order_by(Report.updated_at.desc())
            .first()
        )
        if report:
            return report

    # Fallback: any report with wizard_data
    report = (
        db.query(Report)
        .filter(Report.wizard_data.isnot(None))
        .order_by(Report.updated_at.desc())
        .first()
    )
    return report


def main():
    parser = argparse.ArgumentParser(description="RERX XML Dry Run Generator")
    parser.add_argument("--report-id", type=str, help="Specific report UUID to use")
    parser.add_argument("--output", type=str, default="rerx_dry_run_output.xml", help="Output filename")
    parser.add_argument("--show-data", action="store_true", help="Print wizard_data summary before building")
    args = parser.parse_args()

    settings = get_settings()

    print("=" * 60)
    print("RERX DRY RUN - XML Generation (No Submission)")
    print("=" * 60)
    print()

    # Check config
    print("Configuration:")
    print(f"  FINCEN_ENV: {settings.FINCEN_ENV}")
    print(f"  TRANSMITTER_TIN: {settings.TRANSMITTER_TIN or 'NOT SET'}")
    print(f"  TRANSMITTER_TCC: {settings.TRANSMITTER_TCC or 'NOT SET'}")
    print(f"  SDTM_USERNAME: {settings.SDTM_USERNAME or 'NOT SET'}")
    print()

    db = SessionLocal()
    try:
        # Find report
        if args.report_id:
            from uuid import UUID
            try:
                report_uuid = UUID(args.report_id)
            except ValueError:
                print(f"[FAIL] Invalid UUID format: {args.report_id}")
                sys.exit(1)
            report = db.query(Report).filter(Report.id == report_uuid).first()
            if not report:
                print(f"[FAIL] Report {args.report_id} not found")
                sys.exit(1)
        else:
            report = find_best_report(db)
            if not report:
                print("[FAIL] No reports with wizard_data found in database")
                print("   Create a report through the wizard first, then re-run.")
                sys.exit(1)

        print(f"Using Report: {report.id}")
        print(f"  Status: {report.status}")
        print(f"  Created: {report.created_at}")
        print(f"  Updated: {report.updated_at}")
        print()

        # Show wizard_data summary if requested
        if args.show_data:
            wd = report.wizard_data or {}
            collection = wd.get("collection", {})
            determination = wd.get("determination", {})
            print("Wizard Data Summary:")
            print(f"  Has determination: {bool(determination)}")
            print(f"  Has collection: {bool(collection)}")
            print(f"  Buyer type: {determination.get('buyerType', 'NOT SET')}")
            print(f"  Closing date: {collection.get('closingDate', 'MISSING')}")
            print(f"  Reporting person: {collection.get('reportingPerson', {}).get('companyName', 'MISSING')}")
            print(f"  Property address: {collection.get('propertyAddress', {}).get('street', 'MISSING')}")
            print(f"  Payment sources: {len(collection.get('paymentSources', []))}")
            print(f"  Sellers: {len(collection.get('sellers', []))}")
            print()

            # Show parties
            parties = list(report.parties) if hasattr(report, 'parties') and report.parties else []
            print(f"  Report parties: {len(parties)}")
            for p in parties:
                print(f"    - {p.party_role}: {p.id}")
            print()

        # Create a mock FilingSubmission for the builder
        mock_submission = FilingSubmission(
            report_id=report.id,
            status="dry_run",
            payload_snapshot={"transport": "dry_run", "artifacts": {}}
        )

        # BUILD THE XML
        print("Building RERX XML...")
        print("-" * 40)

        try:
            xml_string, debug_summary = build_rerx_xml(report, mock_submission, settings)

            print("[OK] XML generated successfully!")
            print()
            print("Debug Summary:")
            # Print a cleaner summary
            print(f"  Form type: {debug_summary.get('form_type', 'N/A')}")
            print(f"  Report ID: {debug_summary.get('report_id', 'N/A')}")
            print(f"  Generated at: {debug_summary.get('generated_at', 'N/A')}")
            print(f"  Final seq count: {debug_summary.get('final_seq_count', 'N/A')}")
            print(f"  XML length: {debug_summary.get('xml_length', 'N/A')} bytes")
            
            if debug_summary.get('warnings'):
                print(f"  Warnings: {len(debug_summary['warnings'])}")
                for w in debug_summary['warnings']:
                    print(f"    - {w}")
            
            computed = debug_summary.get('computed_values', {})
            if computed:
                print("  Computed values:")
                for k, v in computed.items():
                    print(f"    - {k}: {v}")
            print()

            # Save to file
            output_path = os.path.join(os.path.dirname(__file__), "..", "..", args.output)
            output_path = os.path.abspath(output_path)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(xml_string)

            print(f"XML saved to: {output_path}")
            print(f"XML size: {len(xml_string)} bytes")
            print(f"XML lines: {xml_string.count(chr(10)) + 1}")
            print()

            # Print first 80 lines as preview
            lines = xml_string.split("\n")
            preview_lines = min(80, len(lines))
            print(f"Preview (first {preview_lines} lines):")
            print("-" * 40)
            for line in lines[:preview_lines]:
                print(line)
            if len(lines) > preview_lines:
                print(f"... ({len(lines) - preview_lines} more lines)")

            return 0

        except PreflightError as e:
            print(f"[FAIL] Preflight validation FAILED: {e.message}")
            print()
            if e.errors:
                print("Errors:")
                for err in e.errors:
                    print(f"  - {err}")
            print()
            print("Common causes:")
            print("  - Missing TRANSMITTER_TIN or TRANSMITTER_TCC in env")
            print("  - Missing reporting person company name in wizard_data")
            print("  - Missing buyer identification (SSN/EIN)")
            print("  - Missing property address")
            print("  - Missing payment sources or closing date")
            print()
            print("Fix the data issue and re-run.")
            return 1

        except Exception as e:
            print(f"[FAIL] XML generation FAILED: {type(e).__name__}: {e}")
            print()
            print("Full traceback:")
            import traceback
            traceback.print_exc()
            return 1

    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
