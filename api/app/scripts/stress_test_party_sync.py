#!/usr/bin/env python3
"""
STRESS TEST: Party Data Sync
==============================
Tests every mapper in party_data_sync.py.
Silent data loss here = FinCEN rejection.

Tests that portal data (snake_case) correctly maps to
wizard_data.collection (camelCase) for the RERX builder.

Usage:
    python -m app.scripts.stress_test_party_sync
    python -m app.scripts.stress_test_party_sync --verbose
"""

import os
import sys
import argparse
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# ══════════════════════════════════════════════════════════════════════════════
# ENV SETUP
# ══════════════════════════════════════════════════════════════════════════════

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ══════════════════════════════════════════════════════════════════════════════
# APP IMPORTS — Direct mapper functions (no DB needed)
# ══════════════════════════════════════════════════════════════════════════════

from app.services.party_data_sync import (
    _map_entity_buyer,
    _map_trust_buyer,
    _map_individual_buyer,
    _map_seller,
    _map_beneficial_owner,
    _map_trustee,
    _map_settlor,
    _map_beneficiary,
    _map_payment_sources,
    _map_signing_individuals,
    _map_address,
    _map_entity_type_to_buyer_type,
    _strip_hyphens,
    _normalize_phone,
    _country_to_iso2,
)


# ══════════════════════════════════════════════════════════════════════════════
# VALIDATION HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def check_field(output: dict, path: str, expected: Any, checks: list) -> bool:
    """
    Check a field in a nested dict by dot-notation path.
    Returns True if match, False if mismatch.
    Appends detail to checks list.
    """
    parts = path.split(".")
    current = output
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit():
            idx = int(part)
            current = current[idx] if idx < len(current) else None
        else:
            checks.append(f"FAIL: {path} -> path not found")
            return False
    
    if current == expected:
        checks.append(f"OK: {path} = {repr(expected)}")
        return True
    else:
        checks.append(f"FAIL: {path} -> expected {repr(expected)}, got {repr(current)}")
        return False


def check_field_exists(output: dict, path: str, checks: list) -> bool:
    """Check that a field exists and is not None/empty."""
    parts = path.split(".")
    current = output
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit():
            idx = int(part)
            current = current[idx] if idx < len(current) else None
        else:
            checks.append(f"FAIL: {path} -> path not found")
            return False
    
    if current is not None and current != "":
        checks.append(f"OK: {path} exists ({repr(current)[:40]})")
        return True
    else:
        checks.append(f"FAIL: {path} -> is None or empty")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# SCENARIOS
# ══════════════════════════════════════════════════════════════════════════════

def get_scenarios() -> List[dict]:
    scenarios = []
    
    # ═══════════════════════════════════════════════════════════════════════
    # GROUP A — Individual Fields
    # ═══════════════════════════════════════════════════════════════════════
    
    # 1. Individual buyer: all fields present
    scenarios.append({
        "name": "Individual buyer (all fields)",
        "group": "A",
        "test": "individual_buyer_full",
    })
    
    # 2. Individual seller: all fields
    scenarios.append({
        "name": "Individual seller (all fields)",
        "group": "A",
        "test": "individual_seller_full",
    })
    
    # 3. Individual with only SSN (no passport)
    scenarios.append({
        "name": "Individual SSN only (no passport)",
        "group": "A",
        "test": "individual_ssn_only",
    })
    
    # 4. Individual with only passport (no SSN, foreign)
    scenarios.append({
        "name": "Individual passport only (foreign)",
        "group": "A",
        "test": "individual_passport_only",
    })
    
    # 5. Individual with missing optional fields
    scenarios.append({
        "name": "Individual minimal (no middle/suffix)",
        "group": "A",
        "test": "individual_minimal",
    })
    
    # ═══════════════════════════════════════════════════════════════════════
    # GROUP B — Entity Fields
    # ═══════════════════════════════════════════════════════════════════════
    
    # 6. Entity buyer with 2 BOs
    scenarios.append({
        "name": "Entity buyer + 2 BOs",
        "group": "B",
        "test": "entity_two_bos",
    })
    
    # 7. Entity buyer with 0 BOs
    scenarios.append({
        "name": "Entity buyer + 0 BOs",
        "group": "B",
        "test": "entity_zero_bos",
    })
    
    # 8. Entity with all subtype fields
    scenarios.append({
        "name": "Entity all subtype fields",
        "group": "B",
        "test": "entity_all_fields",
    })
    
    # ═══════════════════════════════════════════════════════════════════════
    # GROUP C — Trust Fields
    # ═══════════════════════════════════════════════════════════════════════
    
    # 9. Trust buyer with trustees[]
    scenarios.append({
        "name": "Trust buyer + trustees",
        "group": "C",
        "test": "trust_with_trustees",
    })
    
    # 10. Trust with is_revocable=true → "yes"
    scenarios.append({
        "name": "Trust revocable=true -> 'yes'",
        "group": "C",
        "test": "trust_revocable",
    })
    
    # 11. Trust with settlors and beneficiaries
    scenarios.append({
        "name": "Trust + settlors + beneficiaries",
        "group": "C",
        "test": "trust_settlors_beneficiaries",
    })
    
    # ═══════════════════════════════════════════════════════════════════════
    # GROUP D — Payment & Cross-Cutting
    # ═══════════════════════════════════════════════════════════════════════
    
    # 12. Multiple payment sources
    scenarios.append({
        "name": "Multiple payment sources",
        "group": "D",
        "test": "multi_payment",
    })
    
    # 13. Payment source with third-party payer
    scenarios.append({
        "name": "Payment with third-party payer",
        "group": "D",
        "test": "third_party_payment",
    })
    
    # 14. SSN with hyphens → stripped
    scenarios.append({
        "name": "SSN hyphen stripping",
        "group": "D",
        "test": "ssn_hyphens",
    })
    
    # 15. Phone formatting normalization
    scenarios.append({
        "name": "Phone normalization",
        "group": "D",
        "test": "phone_normalization",
    })
    
    # 16. Empty party_data {} → no crash
    scenarios.append({
        "name": "Empty party_data (no crash)",
        "group": "D",
        "test": "empty_data",
    })
    
    # 17. Country name → ISO-2 conversion
    scenarios.append({
        "name": "Country name -> ISO-2",
        "group": "D",
        "test": "country_conversion",
    })
    
    # 18. Entity type → buyer type mapping
    scenarios.append({
        "name": "Entity type -> buyer type mapping",
        "group": "D",
        "test": "entity_type_mapping",
    })
    
    # 19. Signing individuals mapping
    scenarios.append({
        "name": "Signing individuals",
        "group": "D",
        "test": "signing_individuals",
    })
    
    # 20. Entity seller mapping
    scenarios.append({
        "name": "Entity seller mapping",
        "group": "D",
        "test": "entity_seller",
    })
    
    # 21. Trust seller mapping
    scenarios.append({
        "name": "Trust seller + trustees",
        "group": "D",
        "test": "trust_seller",
    })
    
    return scenarios


# ══════════════════════════════════════════════════════════════════════════════
# TEST IMPLEMENTATIONS
# ══════════════════════════════════════════════════════════════════════════════

def run_test(scenario: dict, verbose: bool) -> dict:
    """Route to the correct test implementation."""
    test_name = scenario["test"]
    test_fn = TEST_REGISTRY.get(test_name)
    
    if not test_fn:
        return {
            "passed": False,
            "fields_ok": 0,
            "fields_total": 0,
            "format_ok": False,
            "details": f"Unknown test: {test_name}",
            "checks": [],
            "errors": [f"No test function for '{test_name}'"],
        }
    
    try:
        return test_fn(verbose)
    except Exception as e:
        return {
            "passed": False,
            "fields_ok": 0,
            "fields_total": 0,
            "format_ok": False,
            "details": f"Exception: {e}",
            "checks": [],
            "errors": [f"{type(e).__name__}: {e}"],
        }


def _make_result(checks: list, errors: list = None, details: str = "") -> dict:
    """Build a standard result dict from check list."""
    ok_count = sum(1 for c in checks if c.startswith("OK:"))
    total = len(checks)
    all_ok = all(c.startswith("OK:") for c in checks) and total > 0
    
    return {
        "passed": all_ok and not (errors or []),
        "fields_ok": ok_count,
        "fields_total": total,
        "format_ok": all_ok,
        "details": details,
        "checks": checks,
        "errors": errors or [],
    }


# ── Test implementations ─────────────────────────────────────────────────────

def test_individual_buyer_full(verbose: bool) -> dict:
    """Individual buyer with all fields present."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "first_name": "Michael",
        "last_name": "Chen",
        "middle_name": "J",
        "suffix": "Jr",
        "date_of_birth": "1985-03-15",
        "ssn": "123-45-6789",
        "citizenship": "US",
        "id_type": "ssn",
        "id_number": "123-45-6789",
        "id_jurisdiction": "US",
        "phone": "(626) 555-0100",
        "email": "michael@example.com",
        "address": {
            "street": "456 Oak Avenue",
            "unit": "Apt 3B",
            "city": "Pasadena",
            "state": "CA",
            "zip": "91101",
            "country": "US",
        },
    }
    
    output = _map_individual_buyer(party_data, result_ctx)
    checks = []
    
    check_field(output, "firstName", "Michael", checks)
    check_field(output, "lastName", "Chen", checks)
    check_field(output, "middleName", "J", checks)
    check_field(output, "suffix", "Jr", checks)
    check_field(output, "dateOfBirth", "1985-03-15", checks)
    check_field(output, "ssn", "123456789", checks)  # Hyphens stripped
    check_field(output, "citizenship", "US", checks)
    check_field(output, "idType", "ssn", checks)
    check_field(output, "idNumber", "123456789", checks)  # Hyphens stripped
    check_field(output, "idJurisdiction", "US", checks)
    check_field(output, "phone", "6265550100", checks)  # Normalized
    check_field(output, "email", "michael@example.com", checks)
    check_field(output, "address.street", "456 Oak Avenue", checks)
    check_field(output, "address.unit", "Apt 3B", checks)
    check_field(output, "address.city", "Pasadena", checks)
    check_field(output, "address.state", "CA", checks)
    check_field(output, "address.zip", "91101", checks)
    check_field(output, "address.country", "US", checks)
    
    return _make_result(checks, details="18 fields mapped")


def test_individual_seller_full(verbose: bool) -> dict:
    """Individual seller with all fields."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "first_name": "Sarah",
        "last_name": "Williams",
        "middle_name": "A",
        "suffix": "",
        "date_of_birth": "1972-08-22",
        "ssn": "987-65-4321",
        "address": {
            "street": "742 Evergreen Terrace",
            "city": "Glendora",
            "state": "CA",
            "zip": "91740",
            "country": "US",
        },
    }
    
    output = _map_seller(party_data, "individual", result_ctx)
    checks = []
    
    check_field(output, "type", "individual", checks)
    check_field(output, "individual.firstName", "Sarah", checks)
    check_field(output, "individual.lastName", "Williams", checks)
    check_field(output, "individual.middleName", "A", checks)
    check_field(output, "individual.dateOfBirth", "1972-08-22", checks)
    check_field(output, "individual.ssn", "987654321", checks)  # Stripped
    check_field(output, "individual.address.street", "742 Evergreen Terrace", checks)
    check_field(output, "individual.address.city", "Glendora", checks)
    check_field(output, "individual.address.state", "CA", checks)
    
    return _make_result(checks, details="9 fields mapped")


def test_individual_ssn_only(verbose: bool) -> dict:
    """Individual with SSN, no passport fields."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "first_name": "John",
        "last_name": "Smith",
        "ssn": "555-44-3333",
        "id_type": "ssn",
        "id_number": "555-44-3333",
        "address": {"street": "100 Main St", "city": "LA", "state": "CA", "zip": "90001", "country": "US"},
    }
    
    output = _map_individual_buyer(party_data, result_ctx)
    checks = []
    
    check_field(output, "ssn", "555443333", checks)
    check_field(output, "idType", "ssn", checks)
    check_field(output, "idNumber", "555443333", checks)
    check_field(output, "idJurisdiction", "", checks)  # Not set for domestic
    
    return _make_result(checks, details="SSN mapped, no passport")


def test_individual_passport_only(verbose: bool) -> dict:
    """Foreign individual with passport, no SSN."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "first_name": "Nigel",
        "last_name": "Thornberry",
        "citizenship": "GB",
        "id_type": "foreign_passport",
        "id_number": "GB12345678",
        "id_jurisdiction": "GB",
        # No SSN field at all
        "address": {"street": "10 Downing St", "city": "London", "state": "", "zip": "SW1A2AA", "country": "GB"},
    }
    
    output = _map_individual_buyer(party_data, result_ctx)
    checks = []
    
    check_field(output, "firstName", "Nigel", checks)
    check_field(output, "lastName", "Thornberry", checks)
    check_field(output, "citizenship", "GB", checks)
    check_field(output, "idType", "foreign_passport", checks)
    check_field(output, "idNumber", "GB12345678", checks)
    check_field(output, "idJurisdiction", "GB", checks)
    check_field(output, "ssn", "", checks)  # Empty, no SSN
    check_field(output, "address.country", "GB", checks)
    
    return _make_result(checks, details="Foreign ID mapped, SSN empty")


def test_individual_minimal(verbose: bool) -> dict:
    """Individual with minimal fields — no middle name, no suffix."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "first_name": "Jane",
        "last_name": "Doe",
        "date_of_birth": "1990-01-01",
        "ssn": "111223333",  # Already no hyphens
        "address": {"street": "1 Main St", "city": "NYC", "state": "NY", "zip": "10001", "country": "US"},
    }
    
    output = _map_individual_buyer(party_data, result_ctx)
    checks = []
    
    check_field(output, "firstName", "Jane", checks)
    check_field(output, "lastName", "Doe", checks)
    check_field(output, "middleName", "", checks)  # Empty, not crash
    check_field(output, "suffix", "", checks)  # Empty
    check_field(output, "ssn", "111223333", checks)
    
    return _make_result(checks, details="Minimal fields, no crash")


def test_entity_two_bos(verbose: bool) -> dict:
    """Entity buyer with 2 beneficial owners."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "entity_name": "Golden State Holdings LLC",
        "ein": "83-1234567",
        "entity_type": "entity",
        "formation_state": "CA",
        "address": {"street": "100 Wilshire Blvd", "city": "LA", "state": "CA", "zip": "90017", "country": "US"},
        "beneficial_owners": [
            {
                "first_name": "Robert",
                "last_name": "Kim",
                "date_of_birth": "1978-11-03",
                "ssn": "111-22-3333",
                "citizenship": "US",
                "id_type": "ssn",
                "ownership_percentage": 60,
                "is_control_person": True,
                "control_type": "managing_member",
                "address": {"street": "789 Pine St", "city": "Arcadia", "state": "CA", "zip": "91006", "country": "US"},
            },
            {
                "first_name": "Lisa",
                "last_name": "Park",
                "date_of_birth": "1982-04-19",
                "ssn": "444-55-6666",
                "citizenship": "US",
                "id_type": "ssn",
                "ownership_percentage": 40,
                "address": {"street": "321 Elm Dr", "city": "Monrovia", "state": "CA", "zip": "91016", "country": "US"},
            },
        ],
    }
    
    output = _map_entity_buyer(party_data, result_ctx)
    checks = []
    
    check_field(output, "entity.legalName", "Golden State Holdings LLC", checks)
    check_field(output, "entity.tin", "831234567", checks)  # Hyphens stripped
    check_field(output, "entity.ein", "831234567", checks)
    check_field(output, "entity.formationState", "CA", checks)
    check_field(output, "entity.address.street", "100 Wilshire Blvd", checks)
    
    # Check BOs array
    bos = output.get("beneficialOwners", [])
    if len(bos) == 2:
        checks.append("OK: beneficialOwners count = 2")
    else:
        checks.append(f"FAIL: beneficialOwners count -> expected 2, got {len(bos)}")
    
    # Check first BO
    if len(bos) >= 1:
        check_field(bos[0], "firstName", "Robert", checks)
        check_field(bos[0], "lastName", "Kim", checks)
        check_field(bos[0], "ssn", "111223333", checks)  # Stripped
        check_field(bos[0], "ownershipPercentage", 60, checks)
        check_field(bos[0], "address.city", "Arcadia", checks)
    
    # Check second BO
    if len(bos) >= 2:
        check_field(bos[1], "firstName", "Lisa", checks)
        check_field(bos[1], "lastName", "Park", checks)
        check_field(bos[1], "ownershipPercentage", 40, checks)
    
    return _make_result(checks, details=f"2 BOs mapped")


def test_entity_zero_bos(verbose: bool) -> dict:
    """Entity buyer with 0 BOs — should not crash."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "entity_name": "Empty Entity LLC",
        "ein": "99-0000000",
        "address": {"street": "1 St", "city": "LA", "state": "CA", "zip": "90001", "country": "US"},
        # No beneficial_owners key at all
    }
    
    output = _map_entity_buyer(party_data, result_ctx)
    checks = []
    
    check_field(output, "entity.legalName", "Empty Entity LLC", checks)
    bos = output.get("beneficialOwners", [])
    if len(bos) == 0:
        checks.append("OK: beneficialOwners = [] (empty)")
    else:
        checks.append(f"FAIL: beneficialOwners -> expected [], got {len(bos)} items")
    
    return _make_result(checks, details="0 BOs, no crash")


def test_entity_all_fields(verbose: bool) -> dict:
    """Entity with all subtype fields."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "entity_name": "Pacific Ventures Inc.",
        "entity_dba": "Pacific Group",
        "entity_type": "entity",
        "ein": "92-7654321",
        "formation_state": "DE",
        "formation_date": "2019-01-10",
        "formation_country": "US",
        "phone": "949-555-1234",
        "email": "info@pacificventures.com",
        "address": {"street": "555 Corporate Plaza", "city": "Irvine", "state": "CA", "zip": "92614", "country": "US"},
        "beneficial_owners": [],
    }
    
    output = _map_entity_buyer(party_data, result_ctx)
    checks = []
    
    check_field(output, "entity.legalName", "Pacific Ventures Inc.", checks)
    check_field(output, "entity.dbaName", "Pacific Group", checks)
    check_field(output, "entity.ein", "927654321", checks)
    check_field(output, "entity.formationState", "DE", checks)
    check_field(output, "entity.formationDate", "2019-01-10", checks)
    check_field(output, "entity.formationCountry", "US", checks)
    check_field(output, "entity.phone", "9495551234", checks)  # Normalized
    check_field(output, "entity.email", "info@pacificventures.com", checks)
    
    return _make_result(checks, details="All entity subtype fields")


def test_trust_with_trustees(verbose: bool) -> dict:
    """Trust buyer with trustees[] mapped."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "trust_name": "The Chen Family Trust dated March 15, 2018",
        "trust_type": "revocable_living_trust",
        "trust_ein": "77-8899001",
        "trust_date": "2018-03-15",
        "is_revocable": True,
        "address": {"street": "456 Oak Ave", "city": "Pasadena", "state": "CA", "zip": "91101", "country": "US"},
        "trustees": [
            {
                "type": "individual",
                "full_name": "Michael Chen",
                "date_of_birth": "1985-03-15",
                "ssn": "123-45-6789",
                "citizenship": "US",
                "address": {"street": "456 Oak Ave", "city": "Pasadena", "state": "CA", "zip": "91101", "country": "US"},
                "phone": "(626) 555-0100",
                "email": "michael@example.com",
            },
        ],
    }
    
    output = _map_trust_buyer(party_data, result_ctx)
    checks = []
    
    check_field(output, "trust.legalName", "The Chen Family Trust dated March 15, 2018", checks)
    check_field(output, "trust.tin", "778899001", checks)  # Stripped
    check_field(output, "trust.dateExecuted", "2018-03-15", checks)
    check_field(output, "trust.isRevocable", "yes", checks)  # Converted!
    
    trustees = output.get("trustees", [])
    if len(trustees) == 1:
        checks.append("OK: trustees count = 1")
    else:
        checks.append(f"FAIL: trustees count -> expected 1, got {len(trustees)}")
    
    if trustees:
        t = trustees[0]
        check_field(t, "type", "individual", checks)
        check_field(t, "individual.fullName", "Michael Chen", checks)
        check_field(t, "individual.ssn", "123456789", checks)  # Stripped
        check_field(t, "individual.phone", "6265550100", checks)  # Normalized
    
    return _make_result(checks, details="1 trustee mapped")


def test_trust_revocable(verbose: bool) -> dict:
    """Trust is_revocable=True -> 'yes', False -> 'no'."""
    result_ctx = {"warnings": [], "errors": []}
    
    # Test True -> "yes"
    pd_true = {"trust_name": "Rev Trust", "is_revocable": True, "address": {}}
    out_true = _map_trust_buyer(pd_true, result_ctx)
    
    # Test False -> "no"
    pd_false = {"trust_name": "Irrev Trust", "is_revocable": False, "address": {}}
    out_false = _map_trust_buyer(pd_false, result_ctx)
    
    # Test None -> "no" (falsy)
    pd_none = {"trust_name": "Unknown Trust", "address": {}}
    out_none = _map_trust_buyer(pd_none, result_ctx)
    
    checks = []
    check_field(out_true, "trust.isRevocable", "yes", checks)
    check_field(out_false, "trust.isRevocable", "no", checks)
    check_field(out_none, "trust.isRevocable", "no", checks)
    
    return _make_result(checks, details="Boolean -> 'yes'/'no' conversion")


def test_trust_settlors_beneficiaries(verbose: bool) -> dict:
    """Trust with settlors and beneficiaries mapped."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "trust_name": "Family Trust",
        "trust_ein": "11-2233445",
        "trust_date": "2020-01-01",
        "is_revocable": True,
        "address": {"street": "1 St", "city": "LA", "state": "CA", "zip": "90001", "country": "US"},
        "trustees": [],
        "settlors": [
            {"full_name": "Henry Wong", "relationship": "grantor", "date_of_birth": "1965-05-20"},
        ],
        "beneficiaries": [
            {"full_name": "Alice Wong", "interest_nature": "income", "percentage_interest": 50},
            {"full_name": "Brian Wong", "interest_nature": "income", "percentage_interest": 50},
        ],
    }
    
    output = _map_trust_buyer(party_data, result_ctx)
    checks = []
    
    settlors = output.get("settlors", [])
    if len(settlors) == 1:
        checks.append("OK: settlors count = 1")
    else:
        checks.append(f"FAIL: settlors count -> expected 1, got {len(settlors)}")
    
    if settlors:
        check_field(settlors[0], "fullName", "Henry Wong", checks)
        check_field(settlors[0], "relationship", "grantor", checks)
        check_field(settlors[0], "dateOfBirth", "1965-05-20", checks)
    
    beneficiaries = output.get("beneficiaries", [])
    if len(beneficiaries) == 2:
        checks.append("OK: beneficiaries count = 2")
    else:
        checks.append(f"FAIL: beneficiaries count -> expected 2, got {len(beneficiaries)}")
    
    if len(beneficiaries) >= 2:
        check_field(beneficiaries[0], "fullName", "Alice Wong", checks)
        check_field(beneficiaries[0], "percentageInterest", 50, checks)
        check_field(beneficiaries[1], "fullName", "Brian Wong", checks)
    
    return _make_result(checks, details="1 settlor + 2 beneficiaries")


def test_multi_payment(verbose: bool) -> dict:
    """Multiple payment sources mapped correctly."""
    result_ctx = {"warnings": [], "errors": []}
    
    payment_sources = [
        {
            "source_type": "personal_funds",
            "amount": 500000,
            "payment_method": "wire_transfer",
            "institution_name": "Wells Fargo",
            "account_last_four": "1234",
        },
        {
            "source_type": "business_funds",
            "amount": 750000,
            "payment_method": "wire_transfer",
            "institution_name": "Chase Bank",
            "account_last_four": "5678",
        },
        {
            "source_type": "loan",
            "amount": 250000,
            "payment_method": "wire_transfer",
            "institution_name": "Private Lender",
            "account_last_four": "9012",
        },
    ]
    
    output = _map_payment_sources(payment_sources, result_ctx)
    checks = []
    
    if len(output) == 3:
        checks.append("OK: paymentSources count = 3")
    else:
        checks.append(f"FAIL: paymentSources count -> expected 3, got {len(output)}")
    
    if len(output) >= 3:
        check_field(output[0], "sourceType", "personal_funds", checks)
        check_field(output[0], "amount", 500000, checks)
        check_field(output[0], "institutionName", "Wells Fargo", checks)
        check_field(output[0], "accountNumberLast4", "1234", checks)
        
        check_field(output[1], "sourceType", "business_funds", checks)
        check_field(output[1], "amount", 750000, checks)
        
        check_field(output[2], "sourceType", "loan", checks)
        check_field(output[2], "amount", 250000, checks)
    
    return _make_result(checks, details="3 payments mapped")


def test_third_party_payment(verbose: bool) -> dict:
    """Payment source with third-party payer fields."""
    result_ctx = {"warnings": [], "errors": []}
    
    payment_sources = [{
        "source_type": "third_party",
        "amount": 300000,
        "payment_method": "wire_transfer",
        "institution_name": "ABC Escrow",
        "account_last_four": "0000",
        "is_third_party": True,
        "third_party_name": "John's Parent Corp",
        "third_party_address": "100 Main St, LA CA 90001",
    }]
    
    output = _map_payment_sources(payment_sources, result_ctx)
    checks = []
    
    if len(output) == 1:
        checks.append("OK: paymentSources count = 1")
        check_field(output[0], "isThirdParty", True, checks)
        check_field(output[0], "thirdPartyName", "John's Parent Corp", checks)
        check_field(output[0], "thirdPartyAddress", "100 Main St, LA CA 90001", checks)
    else:
        checks.append(f"FAIL: paymentSources count -> expected 1, got {len(output)}")
    
    return _make_result(checks, details="Third-party fields mapped")


def test_ssn_hyphens(verbose: bool) -> dict:
    """SSN with hyphens should be stripped to digits only."""
    checks = []
    
    # _strip_hyphens tests
    check_field({"v": _strip_hyphens("123-45-6789")}, "v", "123456789", checks)
    check_field({"v": _strip_hyphens("987654321")}, "v", "987654321", checks)  # Already clean
    check_field({"v": _strip_hyphens("")}, "v", "", checks)  # Empty
    check_field({"v": _strip_hyphens("83-1234567")}, "v", "831234567", checks)  # EIN format
    
    # Also test through a mapper
    result_ctx = {"warnings": [], "errors": []}
    bo = {
        "first_name": "Test",
        "last_name": "User",
        "ssn": "999-88-7777",
        "id_type": "ssn",
    }
    mapped_bo = _map_beneficial_owner(bo, result_ctx)
    check_field(mapped_bo, "ssn", "999887777", checks)
    
    return _make_result(checks, details="All hyphens stripped")


def test_phone_normalization(verbose: bool) -> dict:
    """Phone numbers should be normalized to digits only."""
    checks = []
    
    check_field({"v": _normalize_phone("(626) 555-0100")}, "v", "6265550100", checks)
    check_field({"v": _normalize_phone("626-555-0100")}, "v", "6265550100", checks)
    check_field({"v": _normalize_phone("+1 626 555 0100")}, "v", "16265550100", checks)
    check_field({"v": _normalize_phone("6265550100")}, "v", "6265550100", checks)
    check_field({"v": _normalize_phone("")}, "v", "", checks)
    check_field({"v": _normalize_phone("N/A")}, "v", "", checks)  # No digits
    
    return _make_result(checks, details="All phone formats normalized")


def test_empty_data(verbose: bool) -> dict:
    """Empty party_data should return structure with empty strings, not crash."""
    result_ctx = {"warnings": [], "errors": []}
    checks = []
    
    # Individual buyer
    out = _map_individual_buyer({}, result_ctx)
    check_field(out, "firstName", "", checks)
    check_field(out, "lastName", "", checks)
    check_field(out, "ssn", "", checks)
    
    # Entity buyer
    out2 = _map_entity_buyer({}, result_ctx)
    check_field(out2, "entity.legalName", "", checks)
    if isinstance(out2.get("beneficialOwners"), list):
        checks.append("OK: beneficialOwners is list (empty)")
    else:
        checks.append("FAIL: beneficialOwners is not a list")
    
    # Trust buyer
    out3 = _map_trust_buyer({}, result_ctx)
    check_field(out3, "trust.legalName", "", checks)
    
    # Seller
    out4 = _map_seller({}, "individual", result_ctx)
    check_field(out4, "type", "individual", checks)
    check_field(out4, "individual.firstName", "", checks)
    
    return _make_result(checks, details="All mappers handle empty input")


def test_country_conversion(verbose: bool) -> dict:
    """Country names should convert to ISO-2."""
    checks = []
    
    check_field({"v": _country_to_iso2("United States")}, "v", "US", checks)
    check_field({"v": _country_to_iso2("united states of america")}, "v", "US", checks)
    check_field({"v": _country_to_iso2("USA")}, "v", "US", checks)
    check_field({"v": _country_to_iso2("US")}, "v", "US", checks)
    check_field({"v": _country_to_iso2("Canada")}, "v", "CA", checks)
    check_field({"v": _country_to_iso2("United Kingdom")}, "v", "GB", checks)
    check_field({"v": _country_to_iso2("UK")}, "v", "GB", checks)
    check_field({"v": _country_to_iso2("Mexico")}, "v", "MX", checks)
    check_field({"v": _country_to_iso2("")}, "v", "US", checks)  # Default
    check_field({"v": _country_to_iso2("GB")}, "v", "GB", checks)  # Pass-through
    
    # Address mapper integration
    addr = _map_address({"street": "1 St", "city": "London", "country": "United Kingdom"})
    check_field(addr, "country", "GB", checks)
    
    return _make_result(checks, details="Country name -> ISO-2 mapping")


def test_entity_type_mapping(verbose: bool) -> dict:
    """Entity type to buyer type mapping."""
    checks = []
    
    check_field({"v": _map_entity_type_to_buyer_type("individual")}, "v", "individual", checks)
    check_field({"v": _map_entity_type_to_buyer_type("entity")}, "v", "entity", checks)
    check_field({"v": _map_entity_type_to_buyer_type("llc")}, "v", "entity", checks)
    check_field({"v": _map_entity_type_to_buyer_type("corporation")}, "v", "entity", checks)
    check_field({"v": _map_entity_type_to_buyer_type("partnership")}, "v", "entity", checks)
    check_field({"v": _map_entity_type_to_buyer_type("trust")}, "v", "trust", checks)
    check_field({"v": _map_entity_type_to_buyer_type("other")}, "v", "entity", checks)
    check_field({"v": _map_entity_type_to_buyer_type("unknown_xyz")}, "v", "individual", checks)  # Default
    
    return _make_result(checks, details="8 entity type mappings")


def test_signing_individuals(verbose: bool) -> dict:
    """Signing individuals mapping from entity signer fields."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "signer_name": "Robert Kim",
        "signer_title": "Managing Member",
        "signer_dob": "1978-11-03",
        "signer_is_bo": "yes",
        "signer_address": {"street": "789 Pine St", "city": "Arcadia", "state": "CA", "zip": "91006", "country": "US"},
    }
    
    output = _map_signing_individuals(party_data, result_ctx)
    checks = []
    
    if len(output) == 1:
        checks.append("OK: signingIndividuals count = 1")
        check_field(output[0], "name", "Robert Kim", checks)
        check_field(output[0], "fullName", "Robert Kim", checks)
        check_field(output[0], "title", "Managing Member", checks)
        check_field(output[0], "dateOfBirth", "1978-11-03", checks)
        check_field(output[0], "signerIsBo", "yes", checks)
    else:
        checks.append(f"FAIL: signingIndividuals count -> expected 1, got {len(output)}")
    
    # No signer
    output2 = _map_signing_individuals({}, result_ctx)
    if len(output2) == 0:
        checks.append("OK: no signer -> empty array")
    else:
        checks.append(f"FAIL: no signer -> expected [], got {len(output2)} items")
    
    return _make_result(checks, details="Signer mapped + empty test")


def test_entity_seller(verbose: bool) -> dict:
    """Entity seller mapping."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "entity_name": "ABC Investments LLC",
        "ein": "88-7766554",
        "address": {"street": "200 Main St", "city": "Alhambra", "state": "CA", "zip": "91801", "country": "US"},
    }
    
    output = _map_seller(party_data, "entity", result_ctx)
    checks = []
    
    check_field(output, "type", "entity", checks)
    check_field(output, "entity.legalName", "ABC Investments LLC", checks)
    check_field(output, "entity.tin", "887766554", checks)
    check_field(output, "entity.address.city", "Alhambra", checks)
    
    return _make_result(checks, details="Entity seller mapped")


def test_trust_seller(verbose: bool) -> dict:
    """Trust seller with trustees."""
    result_ctx = {"warnings": [], "errors": []}
    
    party_data = {
        "trust_name": "The Park Family Trust dated July 2010",
        "trust_ein": "11-2233445",
        "trust_date": "2010-07-15",
        "address": {"street": "600 Park Ave", "city": "Pasadena", "state": "CA", "zip": "91101", "country": "US"},
        "trustees": [
            {
                "type": "individual",
                "full_name": "Janet Park",
                "date_of_birth": "1970-11-30",
                "ssn": "222-11-0000",
            },
        ],
    }
    
    output = _map_seller(party_data, "trust", result_ctx)
    checks = []
    
    check_field(output, "type", "trust", checks)
    check_field(output, "trust.legalName", "The Park Family Trust dated July 2010", checks)
    check_field(output, "trust.tin", "112233445", checks)
    check_field(output, "trust.dateExecuted", "2010-07-15", checks)
    
    trustees = output.get("trustees", [])
    if len(trustees) == 1:
        checks.append("OK: trustees count = 1")
        check_field(trustees[0], "individual.fullName", "Janet Park", checks)
        check_field(trustees[0], "individual.ssn", "222110000", checks)
    else:
        checks.append(f"FAIL: trustees count -> expected 1, got {len(trustees)}")
    
    return _make_result(checks, details="Trust seller + 1 trustee")


# ══════════════════════════════════════════════════════════════════════════════
# TEST REGISTRY
# ══════════════════════════════════════════════════════════════════════════════

TEST_REGISTRY = {
    "individual_buyer_full": test_individual_buyer_full,
    "individual_seller_full": test_individual_seller_full,
    "individual_ssn_only": test_individual_ssn_only,
    "individual_passport_only": test_individual_passport_only,
    "individual_minimal": test_individual_minimal,
    "entity_two_bos": test_entity_two_bos,
    "entity_zero_bos": test_entity_zero_bos,
    "entity_all_fields": test_entity_all_fields,
    "trust_with_trustees": test_trust_with_trustees,
    "trust_revocable": test_trust_revocable,
    "trust_settlors_beneficiaries": test_trust_settlors_beneficiaries,
    "multi_payment": test_multi_payment,
    "third_party_payment": test_third_party_payment,
    "ssn_hyphens": test_ssn_hyphens,
    "phone_normalization": test_phone_normalization,
    "empty_data": test_empty_data,
    "country_conversion": test_country_conversion,
    "entity_type_mapping": test_entity_type_mapping,
    "signing_individuals": test_signing_individuals,
    "entity_seller": test_entity_seller,
    "trust_seller": test_trust_seller,
}


# ══════════════════════════════════════════════════════════════════════════════
# TABLE OUTPUT
# ══════════════════════════════════════════════════════════════════════════════

def ok(val: bool) -> str:
    return " OK " if val else "FAIL"


def print_results(results: List[dict]) -> None:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    total = len(results)
    passed = sum(1 for r in results if r["result"]["passed"])
    
    print()
    print("=" * 86)
    print(f"  PARTY DATA SYNC STRESS TEST RESULTS")
    print(f"  Date: {now}")
    print(f"  Scenarios: {total}")
    print("=" * 86)
    print()
    
    hdr = (
        f"  {'#':>3}  "
        f"{'Grp':^3}  "
        f"{'Scenario':<34}  "
        f"{'Sync':^6}  "
        f"{'Fields':^8}  "
        f"{'Fmt':^6}  "
        f"{'Details':<22}"
    )
    sep = "  " + "-" * 82
    
    print(hdr)
    print(sep)
    
    for r in results:
        res = r["result"]
        fields_str = f"{res['fields_ok']}/{res['fields_total']}"
        
        row = (
            f"  {r['num']:>3}  "
            f"{r['group']:^3}  "
            f"{r['name']:<34}  "
            f"{ok(res['passed']):^6}  "
            f"{fields_str:^8}  "
            f"{ok(res['format_ok']):^6}  "
            f"{res['details']:<22}"
        )
        print(row)
    
    print(sep)
    print()
    print(f"  PASSED: {passed}/{total}")
    
    failed = [r for r in results if not r["result"]["passed"]]
    if failed:
        print(f"  FAILED: {len(failed)}")
        print()
        for r in failed:
            print(f"  FAIL #{r['num']} ({r['name']}):")
            for e in r["result"]["errors"]:
                print(f"    Error: {e}")
            for c in r["result"]["checks"]:
                if c.startswith("FAIL:"):
                    print(f"    {c}")
    
    print()
    print("=" * 86)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Party Data Sync Stress Test")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed checks")
    parser.add_argument("--scenario", "-s", type=int, help="Run only scenario N")
    args = parser.parse_args()
    
    print()
    print("  PARTY DATA SYNC STRESS TEST")
    print("  Validates every mapper: portal snake_case -> wizard camelCase")
    print("  Silent data loss = FinCEN rejection")
    print()
    
    scenarios = get_scenarios()
    
    if args.scenario:
        if 1 <= args.scenario <= len(scenarios):
            scenarios = [scenarios[args.scenario - 1]]
        else:
            print(f"  Invalid scenario: {args.scenario} (valid: 1-{len(scenarios)})")
            return 1
    
    results = []
    for i, s in enumerate(scenarios):
        actual_idx = (args.scenario - 1) if args.scenario else i
        
        if args.verbose:
            print(f"\n  [{actual_idx + 1}] {s['name']} (Group {s['group']})")
        else:
            print(f"  Running {actual_idx + 1:>2}: {s['name']:<36}", end="", flush=True)
        
        test_result = run_test(s, verbose=args.verbose)
        
        entry = {
            "num": actual_idx + 1,
            "name": s["name"],
            "group": s["group"],
            "result": test_result,
        }
        results.append(entry)
        
        if args.verbose:
            for c in test_result["checks"]:
                status = "  OK " if c.startswith("OK:") else " FAIL"
                print(f"    [{status}] {c}")
        else:
            print(f"  {'OK' if test_result['passed'] else 'FAIL'}")
    
    print_results(results)
    
    all_pass = all(r["result"]["passed"] for r in results)
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
