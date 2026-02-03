#!/usr/bin/env python3
"""
Validate RERX XML against the official FinCEN XSD schema.

Usage:
    python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml
    python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --xsd path/to/schema.xsd
    python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --structural-only
"""

import sys
import os
import re
import argparse


def validate_with_lxml(xml_path, xsd_path):
    """Validate XML against XSD using lxml."""
    try:
        from lxml import etree
    except ImportError:
        print("[FAIL] lxml not installed. Run: pip install lxml")
        sys.exit(1)

    print(f"Loading XSD: {xsd_path}")
    try:
        with open(xsd_path, "rb") as f:
            schema_doc = etree.parse(f)
        schema = etree.XMLSchema(schema_doc)
        print("[OK] XSD loaded successfully")
    except etree.XMLSchemaParseError as e:
        print(f"[FAIL] XSD parse error: {e}")
        print("The XSD file may be invalid or reference other schemas not present.")
        print("Try downloading any imported/included schemas as well.")
        sys.exit(1)
    except FileNotFoundError:
        print(f"[FAIL] XSD file not found: {xsd_path}")
        sys.exit(1)

    print(f"Loading XML: {xml_path}")
    try:
        with open(xml_path, "rb") as f:
            xml_doc = etree.parse(f)
        print("[OK] XML is well-formed")
    except etree.XMLSyntaxError as e:
        print(f"[FAIL] XML syntax error: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"[FAIL] XML file not found: {xml_path}")
        sys.exit(1)

    print()
    print("Validating XML against XSD...")
    print("-" * 40)

    is_valid = schema.validate(xml_doc)

    if is_valid:
        print("[OK] XML is VALID against the RERX schema!")
        print()
        print("This means:")
        print("  - All required elements are present")
        print("  - Element ordering is correct")
        print("  - Data types match the schema")
        print("  - Namespace declarations are correct")
        print()
        print("You are ready for sandbox submission.")
    else:
        print("[FAIL] XML is INVALID against the RERX schema")
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
            print(f"Missing/Required Elements ({len(element_errors)}):")
            for e in element_errors[:20]:
                print(f"  Line {e.line}: {e.message}")
            print()

        if order_errors:
            print(f"Element Ordering Issues ({len(order_errors)}):")
            for e in order_errors[:20]:
                print(f"  Line {e.line}: {e.message}")
            print()

        if type_errors:
            print(f"Data Type Issues ({len(type_errors)}):")
            for e in type_errors[:20]:
                print(f"  Line {e.line}: {e.message}")
            print()

        if other_errors:
            print(f"Other Issues ({len(other_errors)}):")
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
    print(f"Running structural validation on: {xml_path}")
    print("-" * 40)

    try:
        with open(xml_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"[FAIL] File not found: {xml_path}")
        return False

    issues = []
    passes = []

    # Check 1: Well-formed XML
    try:
        import xml.etree.ElementTree as ET
        root = ET.fromstring(content)
        passes.append("Well-formed XML")
    except Exception as e:
        issues.append(f"NOT well-formed XML: {e}")
        print("[FAIL] XML is not well-formed, cannot continue structural checks")
        return False

    # Check 2: FormTypeCode
    if "<fc2:FormTypeCode>RERX</fc2:FormTypeCode>" in content:
        passes.append("FormTypeCode = RERX")
    elif "RERX" in content:
        passes.append("RERX found (but check FormTypeCode tag)")
    else:
        issues.append("FormTypeCode RERX not found - is this still FBARX?")

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
        # Look for ActivityPartyTypeCode with this value
        pattern = rf"<fc2:ActivityPartyTypeCode>{code}</fc2:ActivityPartyTypeCode>"
        if re.search(pattern, content):
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
    elif re.search(r"P[A-Z0-9]{7}", content):
        passes.append("Production-style TCC present - verify FINCEN_ENV matches!")
    else:
        issues.append("No recognizable TCC value found")

    # Check 8: TIN format (9 digits)
    tin_match = re.search(r"<fc2:PartyIdentificationTypeCode>4</fc2:PartyIdentificationTypeCode>\s*<fc2:PartyIdentificationNumberText>(\d+)</fc2:PartyIdentificationNumberText>", content)
    if tin_match:
        tin_value = tin_match.group(1)
        if len(tin_value) == 9:
            passes.append(f"Transmitter TIN present ({tin_value[:2]}*****{tin_value[-2:]})")
        else:
            issues.append(f"Transmitter TIN is {len(tin_value)} digits (should be 9)")
    else:
        issues.append("Transmitter TIN (type 4) not found in expected format")

    # Check 9: Namespace
    if "www.fincen.gov/base" in content:
        passes.append("FinCEN namespace present")
    else:
        issues.append("FinCEN namespace (www.fincen.gov/base) missing")

    # Check 10: SeqNum uniqueness
    seq_nums = re.findall(r'SeqNum="(\d+)"', content)
    if seq_nums:
        unique_seq = set(seq_nums)
        if len(seq_nums) == len(unique_seq):
            passes.append(f"SeqNum values are unique ({len(seq_nums)} elements)")
        else:
            duplicate_count = len(seq_nums) - len(unique_seq)
            issues.append(f"SeqNum has {duplicate_count} duplicate values")
    else:
        issues.append("No SeqNum attributes found")

    # Check 11: ActivityCount attribute
    activity_count_match = re.search(r'ActivityCount="(\d+)"', content)
    if activity_count_match:
        passes.append(f"ActivityCount attribute present ({activity_count_match.group(1)})")
    else:
        issues.append("ActivityCount attribute missing from root element")

    # Print results
    print()
    for p in passes:
        print(f"  [OK] {p}")
    for i in issues:
        print(f"  [FAIL] {i}")

    print()
    print(f"Passed: {len(passes)}/{len(passes) + len(issues)}")

    if issues:
        print()
        print("[WARNING] Fix the issues above before attempting sandbox submission.")
        return False
    else:
        print()
        print("[SUCCESS] All structural checks passed!")
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
            print(f"[INFO] XSD file not found at: {args.xsd}")
            print("   Falling back to structural validation only.")
            print("   To run full XSD validation, download the schema first.")
            print()
        success = validate_structural(args.xml_file)
        return 0 if success else 1
    else:
        # Run both
        print("Phase 1: XSD Validation")
        print("=" * 40)
        xsd_valid = validate_with_lxml(args.xml_file, args.xsd)
        print()
        print("Phase 2: Structural Validation")
        print("=" * 40)
        struct_valid = validate_structural(args.xml_file)
        return 0 if (xsd_valid and struct_valid) else 1


if __name__ == "__main__":
    sys.exit(main())
