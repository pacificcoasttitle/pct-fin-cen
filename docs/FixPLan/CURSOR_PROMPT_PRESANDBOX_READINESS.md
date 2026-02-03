# CURSOR PROMPT: Pre-Sandbox Readiness — ACK Fix, RERX Dry Run, XSD Validation

## Context

SDTM connectivity to FinCEN production is confirmed. Sandbox access is pending (FinCEN needs to enable it). While we wait, we're doing three critical pre-flight tasks:

1. Fix the `.ACK` vs `.ACKED` file extension bug
2. Generate a dry-run RERX XML from real report data (no submission)
3. Validate the generated XML against the official RERX XSD schema

These tasks ensure that when sandbox opens, we can submit immediately with confidence.

---

## TASK 1: Fix `.ACK` vs `.ACKED` File Extension

### Background

FinCEN's official SDTM documentation confirms the acknowledgement file extension is **`.ACK`**, NOT **`.ACKED`**.

Actual FinCEN file naming (from their onboarding email):
```
CTRXST.20240609153015.sdtmuserid.xml.MESSAGES.XML   ← status response
CTRXST.20240609153015.sdtmuserid.xml.ACK             ← acknowledgement with BSA IDs
```

Our RERX equivalent should be:
```
RERXST.20260202143000.sdtmjan0726a.xml.MESSAGES.XML
RERXST.20260202143000.sdtmjan0726a.xml.ACK
```

If our code looks for `.ACKED` instead of `.ACK`, the poller will **never** find acknowledgement files. Filings will silently appear stuck forever.

### Step 1: Search the entire codebase

```bash
cd api
echo "=== Searching for ACKED references ==="
grep -rn "ACKED\|\.acked\|acked" --include="*.py" .
echo ""
echo "=== Searching for .ACK references ==="
grep -rn "\.ACK\|\.ack" --include="*.py" .
echo ""
echo "=== Searching in docs ==="
grep -rn "ACKED\|\.ACK" --include="*.md" ../docs/
```

### Step 2: Files most likely affected

Check each of these files specifically:

| File | What to look for |
|------|-----------------|
| `api/app/services/fincen/response_processor.py` | `parse_acked_xml` function, any `.ACKED` string |
| `api/app/services/filing_lifecycle.py` | `poll_sdtm_responses()` — the filename pattern for finding ACK files |
| `api/app/services/fincen/sdtm_client.py` | Any hardcoded `.ACKED` in download logic |
| `api/app/routes/admin.py` | Artifact download endpoint, artifact type names |
| `api/app/services/fincen/__init__.py` | Exports |
| `api/app/scripts/poll_fincen_sdtm.py` | Poller script |
| `api/tests/test_fincen_services.py` | Test fixtures and assertions |
| `docs/KilledSharks-2.md` | Documentation references |

### Step 3: What to fix

**SFTP filename patterns (CRITICAL — these touch the wire):**
- Any code building the SFTP path to look for the ACK file must use `.ACK` not `.ACKED`
- Example: `filename + ".ACKED"` → `filename + ".ACK"`
- In `poll_sdtm_responses`: the line that checks for the acknowledgement file on the SFTP server

**Internal naming (LOW RISK — cosmetic, but fix for consistency):**
- `payload_snapshot["artifacts"]["acked"]` — this is internal-only and doesn't affect SFTP. You CAN rename to `"ack"` for consistency, but it's not a functional bug. Your call.
- Function name `parse_acked_xml` — same, internal only. Rename if you want clarity.

**Documentation:**
- Update any references in `docs/KilledSharks-2.md` that say `.ACKED` to `.ACK`

### Step 4: Verify the fix

After making changes:

```bash
cd api
echo "=== Verify: No more .ACKED references in SFTP paths ==="
grep -rn "\.ACKED" --include="*.py" .
echo ""
echo "If the above is empty (or only internal dict keys), the fix is clean."
```

### Deliverable for Task 1

- [ ] All SFTP filename lookups use `.ACK` not `.ACKED`
- [ ] `poll_sdtm_responses` looks for `filename + ".ACK"`
- [ ] Documentation updated
- [ ] Tests updated if they reference `.ACKED` file patterns
- [ ] List every file changed and what was changed

---

## TASK 2: Dry-Run RERX XML Generation

### Goal

Generate a complete RERX XML document from real report data in the database, **without** uploading it to FinCEN. Save the XML to disk for inspection and XSD validation.

### Step 1: Create dry-run script

Create `api/app/scripts/rerx_dry_run.py`:

```python
"""
Dry-run RERX XML generator.
Builds a complete RERX XML from an existing report WITHOUT submitting to FinCEN.
Outputs the XML to stdout and saves to a file for inspection/validation.

Usage:
    python -m app.scripts.rerx_dry_run                    # Uses most recent filed/complete report
    python -m app.scripts.rerx_dry_run --report-id UUID   # Uses specific report
"""

import sys
import os
import json
import argparse
from datetime import datetime

# Ensure the api directory is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.config import settings
from app.database import SessionLocal
from app.models.report import Report
from app.models.filing_submission import FilingSubmission
from app.services.fincen.rerx_builder import build_rerx_xml


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

    print("=" * 60)
    print("RERX DRY RUN — XML Generation (No Submission)")
    print("=" * 60)
    print()

    # Check config
    print("Configuration:")
    print(f"  FINCEN_ENV: {settings.FINCEN_ENV}")
    print(f"  TRANSMITTER_TIN: {settings.TRANSMITTER_TIN}")
    print(f"  TRANSMITTER_TCC: {settings.TRANSMITTER_TCC}")
    print(f"  SDTM_USERNAME: {settings.SDTM_USERNAME}")
    print()

    db = SessionLocal()
    try:
        # Find report
        if args.report_id:
            report = db.query(Report).filter(Report.id == args.report_id).first()
            if not report:
                print(f"❌ Report {args.report_id} not found")
                sys.exit(1)
        else:
            report = find_best_report(db)
            if not report:
                print("❌ No reports with wizard_data found in database")
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
            print(f"  Closing date: {collection.get('closingDate', 'MISSING')}")
            print(f"  Reporting person: {collection.get('reportingPerson', {}).get('companyName', 'MISSING')}")
            print(f"  Property address: {collection.get('propertyAddress', {}).get('street', 'MISSING')}")
            print(f"  Payment sources: {len(collection.get('paymentSources', []))}")
            print(f"  Sellers: {len(collection.get('sellers', []))}")
            print()

            # Show parties
            parties = report.parties if hasattr(report, 'parties') else []
            print(f"  Report parties: {len(parties)}")
            for p in parties:
                print(f"    - {p.party_role}: {p.id}")
            print()

        # Create a mock FilingSubmission for the builder
        # (The builder needs this for SeqNum generation but doesn't save it)
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

            print("✅ XML generated successfully!")
            print()
            print(f"Debug Summary:")
            print(json.dumps(debug_summary, indent=2, default=str))
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

            # Print first 100 lines as preview
            lines = xml_string.split("\n")
            preview_lines = min(100, len(lines))
            print(f"Preview (first {preview_lines} lines):")
            print("-" * 40)
            for line in lines[:preview_lines]:
                print(line)
            if len(lines) > preview_lines:
                print(f"... ({len(lines) - preview_lines} more lines)")

        except Exception as e:
            error_type = type(e).__name__
            print(f"❌ XML generation FAILED: [{error_type}] {e}")
            print()

            if error_type == "PreflightError":
                print("This is a preflight validation failure.")
                print("The builder detected missing or invalid data before generating XML.")
                print()
                print("Common causes:")
                print("  - Missing TRANSMITTER_TIN or TRANSMITTER_TCC in env")
                print("  - Missing reporting person company name in wizard_data")
                print("  - Missing buyer identification (SSN/EIN)")
                print("  - Missing property address")
                print("  - Missing payment sources or closing date")
                print()
                print("Fix the data issue and re-run.")
            else:
                print("This is an unexpected error in the builder.")
                print("Full traceback:")
                import traceback
                traceback.print_exc()

            sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()
```

### Step 2: Run the dry run

```bash
cd api

# Basic run — finds best available report automatically
python -m app.scripts.rerx_dry_run --show-data

# Or target a specific report
python -m app.scripts.rerx_dry_run --report-id "YOUR-REPORT-UUID" --show-data

# Custom output filename
python -m app.scripts.rerx_dry_run --output my_test_rerx.xml --show-data
```

### Step 3: Inspect the output

After generation, manually inspect the XML for:

```bash
# Check the root element and namespaces
head -5 rerx_dry_run_output.xml

# Check FormTypeCode
grep "FormTypeCode" rerx_dry_run_output.xml

# Check all party types present
grep "ActivityPartyTypeCode" rerx_dry_run_output.xml

# Check for required sections
grep -c "AssetsAttribute" rerx_dry_run_output.xml
grep -c "ValueTransferActivity" rerx_dry_run_output.xml

# Check transmitter TCC value
grep -A2 "PartyIdentificationTypeCode.*28" rerx_dry_run_output.xml

# Check filename format
grep "RERXST" rerx_dry_run_output.xml
```

### Expected Required Parties (per RERX spec)

The XML MUST contain all of these:

| Party Code | Role | Count |
|-----------|------|-------|
| 31 | Reporting Person | Exactly 1 |
| 67 | Transferee (Buyer) | At least 1 |
| 68 | Associated Person of Transferee | As needed for BOs |
| 69 | Transferor (Seller) | At least 1 |
| 35 | Transmitter | Exactly 1 |
| 37 | Transmitter Contact | Exactly 1 |

### Expected Sections

| Section | Required |
|---------|----------|
| `FilingDateText` | Yes — YYYYMMDD, not future, not before 20251201 |
| `ActivityAssociation` | Yes — with `InitialReportIndicator=Y` |
| `AssetsAttribute` | Yes — property address |
| `ValueTransferActivity` | Yes — payment details + closing date |

### If the dry run fails

Common issues and fixes:

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `PreflightError: TRANSMITTER_TIN missing` | Env var not set | Add to `.env` |
| `PreflightError: Missing buyer identification` | Test report has incomplete wizard_data | Fill in buyer data through the wizard |
| `PreflightError: Missing reporting person` | No company name in wizard_data | Complete the wizard reporting person step |
| `KeyError: 'collection'` | wizard_data doesn't have collection phase data | Use a report that's past determination |
| `AttributeError: 'NoneType'` | Report has no parties | Use a report with transferee/transferor parties created |

**If no reports have complete enough data**, create one through the wizard UI first, completing at least through the collection phase with buyer, seller, property, and payment info.

### Deliverable for Task 2

- [ ] `api/app/scripts/rerx_dry_run.py` created
- [ ] Script runs without crashing
- [ ] XML is generated (or clear error message if data is incomplete)
- [ ] XML saved to file for Task 3 validation
- [ ] Debug summary shows all expected parties and sections
- [ ] Output XML reviewed manually

---

## TASK 3: XSD Schema Validation

### Goal

Validate the generated RERX XML against the official FinCEN `EFL_RERXBatchSchema.xsd` to catch structural issues before submitting to the sandbox.

### Step 1: Obtain the XSD

The RERX schema should be available at:
```
https://bsaefiling.fincen.gov/resources/EFL_RERXBatchSchema.xsd
```

Download it:
```bash
cd api
curl -o rerx_schema.xsd https://bsaefiling.fincen.gov/resources/EFL_RERXBatchSchema.xsd

# Check if it downloaded successfully
head -20 rerx_schema.xsd

# If the URL doesn't work (FinCEN may restrict access), check if the schema
# was included in the Dec 2025 technical specifications PDF or zip package.
# Look in any project files or documentation Jerry may have downloaded:
find /mnt/user-data/uploads -name "*.xsd" 2>/dev/null
find . -name "*.xsd" 2>/dev/null
```

### Step 2: Install lxml (if not already present)

```bash
pip install lxml --break-system-packages
```

### Step 3: Create validation script

Create `api/app/scripts/rerx_validate_xsd.py`:

```python
"""
Validate RERX XML against the official FinCEN XSD schema.

Usage:
    python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml
    python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --xsd path/to/schema.xsd
"""

import sys
import os
import argparse

def validate_with_lxml(xml_path, xsd_path):
    """Validate XML against XSD using lxml."""
    try:
        from lxml import etree
    except ImportError:
        print("❌ lxml not installed. Run: pip install lxml")
        sys.exit(1)

    print(f"Loading XSD: {xsd_path}")
    try:
        with open(xsd_path, "rb") as f:
            schema_doc = etree.parse(f)
        schema = etree.XMLSchema(schema_doc)
        print("✅ XSD loaded successfully")
    except etree.XMLSchemaParseError as e:
        print(f"❌ XSD parse error: {e}")
        print("The XSD file may be invalid or reference other schemas not present.")
        print("Try downloading any imported/included schemas as well.")
        sys.exit(1)
    except FileNotFoundError:
        print(f"❌ XSD file not found: {xsd_path}")
        sys.exit(1)

    print(f"Loading XML: {xml_path}")
    try:
        with open(xml_path, "rb") as f:
            xml_doc = etree.parse(f)
        print("✅ XML is well-formed")
    except etree.XMLSyntaxError as e:
        print(f"❌ XML syntax error: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"❌ XML file not found: {xml_path}")
        sys.exit(1)

    print()
    print("Validating XML against XSD...")
    print("-" * 40)

    is_valid = schema.validate(xml_doc)

    if is_valid:
        print("✅ XML is VALID against the RERX schema!")
        print()
        print("This means:")
        print("  - All required elements are present")
        print("  - Element ordering is correct")
        print("  - Data types match the schema")
        print("  - Namespace declarations are correct")
        print()
        print("You are ready for sandbox submission.")
    else:
        print("❌ XML is INVALID against the RERX schema")
        print()
        print(f"Errors found: {len(schema.error_log)}")
        print()

        # Categorize errors
        element_errors = []
        type_errors = []
        order_errors = []
        other_errors = []

        for error in schema.error_log:
            msg = str(error)
            if "element" in msg.lower() and ("expected" in msg.lower() or "not expected" in msg.lower()):
                order_errors.append(error)
            elif "not a valid value" in msg.lower() or "type" in msg.lower():
                type_errors.append(error)
            elif "missing" in msg.lower() or "required" in msg.lower():
                element_errors.append(error)
            else:
                other_errors.append(error)

        if element_errors:
            print(f"📋 Missing/Required Elements ({len(element_errors)}):")
            for e in element_errors[:20]:
                print(f"  Line {e.line}: {e.message}")
            print()

        if order_errors:
            print(f"🔀 Element Ordering Issues ({len(order_errors)}):")
            for e in order_errors[:20]:
                print(f"  Line {e.line}: {e.message}")
            print()

        if type_errors:
            print(f"🔤 Data Type Issues ({len(type_errors)}):")
            for e in type_errors[:20]:
                print(f"  Line {e.line}: {e.message}")
            print()

        if other_errors:
            print(f"❓ Other Issues ({len(other_errors)}):")
            for e in other_errors[:20]:
                print(f"  Line {e.line}: {e.message}")
            print()

        total = len(schema.error_log)
        shown = min(20, len(element_errors)) + min(20, len(order_errors)) + min(20, len(type_errors)) + min(20, len(other_errors))
        if total > shown:
            print(f"... and {total - shown} more errors (showing first 20 per category)")

        print()
        print("Fix these issues in rerx_builder.py and re-run the dry run + validation.")

    return is_valid


def validate_structural(xml_path):
    """Basic structural validation without XSD (fallback if no XSD available)."""
    try:
        from lxml import etree
    except ImportError:
        import xml.etree.ElementTree as etree

    print(f"Running structural validation on: {xml_path}")
    print("-" * 40)

    with open(xml_path, "r") as f:
        content = f.read()

    issues = []
    passes = []

    # Check 1: Well-formed XML
    try:
        if hasattr(etree, 'fromstring'):
            root = etree.fromstring(content.encode())
        passes.append("Well-formed XML")
    except Exception as e:
        issues.append(f"NOT well-formed XML: {e}")
        print("❌ XML is not well-formed, cannot continue structural checks")
        return False

    # Check 2: FormTypeCode
    if "<fc2:FormTypeCode>RERX</fc2:FormTypeCode>" in content:
        passes.append("FormTypeCode = RERX")
    elif "RERX" in content:
        passes.append("RERX found (but check FormTypeCode tag)")
    else:
        issues.append("FormTypeCode RERX not found — is this still FBARX?")

    # Check 3: Schema location
    if "EFL_RERXBatchSchema.xsd" in content:
        passes.append("RERX schema location present")
    else:
        issues.append("RERX schema location missing")

    # Check 4: Required party types
    required_parties = {
        "31": "Reporting Person",
        "67": "Transferee (Buyer)",
        "69": "Transferor (Seller)",
        "35": "Transmitter",
        "37": "Transmitter Contact",
    }
    for code, name in required_parties.items():
        # Look for the party type code in the XML
        if f">{code}<" in content or f">{code} <" in content:
            passes.append(f"Party {code} ({name}) present")
        else:
            issues.append(f"Party {code} ({name}) MISSING")

    # Check 5: Required sections
    required_sections = [
        ("FilingDateText", "Filing Date"),
        ("ActivityAssociation", "Activity Association"),
        ("AssetsAttribute", "Assets/Property"),
        ("ValueTransferActivity", "Payment/Transfer Details"),
    ]
    for tag, name in required_sections:
        if tag in content:
            passes.append(f"{name} section present")
        else:
            issues.append(f"{name} section MISSING")

    # Check 6: Filing date range
    import re
    date_match = re.search(r"<fc2:FilingDateText>(\d{8})</fc2:FilingDateText>", content)
    if date_match:
        filing_date = date_match.group(1)
        if filing_date >= "20251201" and filing_date <= "20261231":
            passes.append(f"Filing date {filing_date} in valid range")
        else:
            issues.append(f"Filing date {filing_date} outside valid range (20251201-20261231)")
    else:
        issues.append("FilingDateText not found or not in YYYYMMDD format")

    # Check 7: TCC value
    if "TBSATEST" in content:
        passes.append("Sandbox TCC (TBSATEST) present")
    elif "PCTC5765" in content:
        passes.append("Production TCC (PCTC5765) present — make sure FINCEN_ENV matches!")
    else:
        issues.append("No recognizable TCC value found")

    # Check 8: TIN value
    if "952569776" in content:
        passes.append("Transmitter TIN present")
    else:
        issues.append("Transmitter TIN (952569776) not found in XML")

    # Check 9: Namespace
    if "www.fincen.gov/base" in content:
        passes.append("FinCEN namespace present")
    else:
        issues.append("FinCEN namespace (www.fincen.gov/base) missing")

    # Print results
    print()
    for p in passes:
        print(f"  ✅ {p}")
    for i in issues:
        print(f"  ❌ {i}")

    print()
    print(f"Passed: {len(passes)}/{len(passes) + len(issues)}")

    if issues:
        print()
        print("⚠️  Fix the issues above before attempting sandbox submission.")
        return False
    else:
        print()
        print("🎉 All structural checks passed!")
        return True


def main():
    parser = argparse.ArgumentParser(description="Validate RERX XML against XSD schema")
    parser.add_argument("xml_file", help="Path to the RERX XML file to validate")
    parser.add_argument("--xsd", type=str, default="rerx_schema.xsd", help="Path to the XSD schema file")
    parser.add_argument("--structural-only", action="store_true", help="Skip XSD, run structural checks only")
    args = parser.parse_args()

    print("=" * 60)
    print("RERX XML Validation")
    print("=" * 60)
    print()

    if args.structural_only or not os.path.exists(args.xsd):
        if not args.structural_only:
            print(f"⚠️  XSD file not found at: {args.xsd}")
            print("   Falling back to structural validation only.")
            print("   To run full XSD validation, download the schema first.")
            print()
        validate_structural(args.xml_file)
    else:
        # Run both
        print("Phase 1: XSD Validation")
        print("=" * 40)
        xsd_valid = validate_with_lxml(args.xml_file, args.xsd)
        print()
        print("Phase 2: Structural Validation")
        print("=" * 40)
        validate_structural(args.xml_file)


if __name__ == "__main__":
    main()
```

### Step 4: Run validation

```bash
cd api

# Option A: Full XSD validation (if schema was downloaded)
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --xsd rerx_schema.xsd

# Option B: Structural validation only (if XSD unavailable)
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --structural-only
```

### Step 5: Interpret results

**If XSD validation passes:** You're in excellent shape. The XML structure matches what FinCEN expects.

**If XSD validation fails with element ordering errors:** The RERX spec is strict about element order within each container. Fix the order in `rerx_builder.py`.

**If XSD validation fails with missing elements:** Cross-reference against the RERX Minimum Required Sections checklist in KilledSharks-2.md.

**If XSD download fails:** The structural validation is a solid backup. It checks all the critical elements, party types, and values without needing the official schema.

---

## EXECUTION ORDER

Run these in sequence:

```bash
# 1. Fix .ACK extension
# (manual code review + grep + fix)

# 2. Generate dry-run XML
cd api
python -m app.scripts.rerx_dry_run --show-data

# 3. Validate the XML
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --structural-only

# 4. If XSD is available, run full validation too
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --xsd rerx_schema.xsd
```

---

## DELIVERABLES

After completing all three tasks:

- [ ] `.ACK` vs `.ACKED` — All SFTP file lookups corrected, list files changed
- [ ] `api/app/scripts/rerx_dry_run.py` — Created and functional
- [ ] `api/app/scripts/rerx_validate_xsd.py` — Created and functional
- [ ] Dry-run XML generated from real report data
- [ ] XML validated (XSD or structural)
- [ ] Any issues found documented with specific line references
- [ ] KilledSharks-2.md updated if any fixes were made

## DO NOT
- ❌ Do not submit anything to FinCEN (sandbox or production)
- ❌ Do not modify the RERX builder unless validation reveals a bug
- ❌ Do not change the SDTM client or filing lifecycle
- ❌ Do not modify environment variables on Render
- ❌ This is validation only — fix bugs found, but don't add new features
