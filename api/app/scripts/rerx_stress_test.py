#!/usr/bin/env python3
"""
RERX Stress Test -- Validates every party type combination through the
full pipeline: party_data -> sync -> RERX XML -> structural validation.

Usage:
    python -m app.scripts.rerx_stress_test
    python -m app.scripts.rerx_stress_test --verbose
    python -m app.scripts.rerx_stress_test --save-xml
"""

import os
import sys
import json
import argparse
import uuid
import xml.etree.ElementTree as ET
from copy import deepcopy
from datetime import datetime, date
from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Tuple

# ══════════════════════════════════════════════════════════════════════════════
# ENV SETUP — Must happen before any app imports
# ══════════════════════════════════════════════════════════════════════════════

os.environ.setdefault("TRANSMITTER_TIN", "123456789")
os.environ.setdefault("TRANSMITTER_TCC", "TBSATEST")
os.environ.setdefault("FINCEN_ENV", "sandbox")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ══════════════════════════════════════════════════════════════════════════════
# APP IMPORTS
# ══════════════════════════════════════════════════════════════════════════════

from app.config import get_settings
from app.services.fincen.rerx_builder import build_rerx_xml, PreflightError
from app.services.party_data_sync import (
    _map_entity_buyer,
    _map_trust_buyer,
    _map_individual_buyer,
    _map_seller,
    _map_payment_sources,
    _map_signing_individuals,
    _map_entity_type_to_buyer_type,
)


# ══════════════════════════════════════════════════════════════════════════════
# NAMESPACE (fc2)
# ══════════════════════════════════════════════════════════════════════════════

NS = "{www.fincen.gov/base}"


# ══════════════════════════════════════════════════════════════════════════════
# BASE WIZARD DATA TEMPLATE
# ══════════════════════════════════════════════════════════════════════════════

def make_base_wizard_data(
    buyer_type: str = "individual",
    purchase_price: int = 850000,
) -> dict:
    """Create baseline wizard_data that every scenario shares."""
    return {
        "determination": {
            "buyerType": buyer_type,
            "isReportable": True,
            "exemptions": [],
        },
        "collection": {
            "closingDate": "2026-01-15",
            "purchasePrice": purchase_price,
            "propertyAddress": {
                "street": "742 Evergreen Terrace",
                "city": "Glendora",
                "state": "CA",
                "zip": "91740",
                "county": "Los Angeles",
                "country": "US",
            },
            "legalDescription": "Lot 5, Block 7, Tract 12345 in the City of Glendora",
            "legalDescriptionType": "lot_block_subdivision",
            "reportingPerson": {
                "companyName": "Pacific Coast Title Company",
                "contactName": "Jennifer Walsh",
                "email": "admin@demotitle.com",
                "phone": "626-555-0100",
                "licenseNumber": "PCT-12345",
                "category": "closing_settlement_agent",
                "address": {
                    "street": "100 N Garfield Ave",
                    "city": "Alhambra",
                    "state": "CA",
                    "zip": "91801",
                    "country": "US",
                },
            },
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# MOCK OBJECT FACTORIES
# ══════════════════════════════════════════════════════════════════════════════

def make_mock_party(
    party_role: str,
    entity_type: str,
    party_data: dict,
) -> SimpleNamespace:
    """Create a mock ReportParty-like object."""
    return SimpleNamespace(
        id=uuid.uuid4(),
        party_role=party_role,
        entity_type=entity_type,
        party_data=party_data,
        status="submitted",
    )


def make_mock_report(
    wizard_data: dict,
    parties: List[Any],
) -> SimpleNamespace:
    """Create a mock Report-like object."""
    return SimpleNamespace(
        id=uuid.uuid4(),
        status="ready_to_file",
        wizard_data=wizard_data,
        parties=parties,
        closing_date=date(2026, 1, 15),
        company_id=uuid.uuid4(),
        escrow_number="2026-00123",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


def make_mock_submission() -> SimpleNamespace:
    """Create a mock FilingSubmission-like object."""
    return SimpleNamespace(
        id=uuid.uuid4(),
        status="dry_run",
    )


# ══════════════════════════════════════════════════════════════════════════════
# SYNC SIMULATION (calls real mapper functions, no DB needed)
# ══════════════════════════════════════════════════════════════════════════════

def simulate_sync(
    wizard_data: dict,
    buyer_party: Optional[SimpleNamespace],
    seller_parties: List[SimpleNamespace],
) -> Tuple[dict, dict]:
    """
    Simulate party_data_sync without a database.
    Calls the REAL mapper functions from party_data_sync.py.
    
    Returns:
        (synced_wizard_data, sync_result)
    """
    wd = deepcopy(wizard_data)
    collection = wd.get("collection", {})
    determination = wd.get("determination", {})
    
    result = {
        "synced": True,
        "parties_synced": 0,
        "transferees": 0,
        "transferors": 0,
        "fields_mapped": [],
        "warnings": [],
        "errors": [],
    }
    
    # ── Sync buyer ────────────────────────────────────────────────────────
    if buyer_party:
        pd = buyer_party.party_data or {}
        buyer_type = _map_entity_type_to_buyer_type(buyer_party.entity_type)
        determination["buyerType"] = buyer_type
        result["fields_mapped"].append("determination.buyerType")
        result["transferees"] = 1
        
        if buyer_party.entity_type == "entity":
            collection["buyerEntity"] = _map_entity_buyer(pd, result)
            result["fields_mapped"].append("buyerEntity")
        elif buyer_party.entity_type == "trust":
            collection["buyerTrust"] = _map_trust_buyer(pd, result)
            result["fields_mapped"].append("buyerTrust")
        elif buyer_party.entity_type == "individual":
            collection["buyerIndividual"] = _map_individual_buyer(pd, result)
            result["fields_mapped"].append("buyerIndividual")
        
        # Payment sources
        if pd.get("payment_sources"):
            collection["paymentSources"] = _map_payment_sources(pd["payment_sources"], result)
            result["fields_mapped"].append("paymentSources")
        
        # Signing individuals (entity buyers)
        if pd.get("signer_name"):
            collection["signingIndividuals"] = _map_signing_individuals(pd, result)
            result["fields_mapped"].append("signingIndividuals")
        
        result["parties_synced"] += 1
    
    # ── Sync sellers ──────────────────────────────────────────────────────
    if seller_parties:
        sellers = []
        for sp in seller_parties:
            pd = sp.party_data or {}
            entry = _map_seller(pd, sp.entity_type, result)
            if entry:
                sellers.append(entry)
                result["parties_synced"] += 1
        if sellers:
            collection["sellers"] = sellers
            result["fields_mapped"].append("sellers")
        result["transferors"] = len(seller_parties)
    
    wd["collection"] = collection
    wd["determination"] = determination
    return wd, result


# ══════════════════════════════════════════════════════════════════════════════
# XML VALIDATION
# ══════════════════════════════════════════════════════════════════════════════

def validate_xml(
    xml_string: str,
    expected_p68_count: int,
    expected_payment_count: int,
) -> dict:
    """
    Structurally validate RERX XML and extract stats.
    
    Returns a validation dict with pass/fail for each check.
    """
    v = {
        "xml_valid": True,
        "parse_ok": False,
        "form_type_ok": False,
        "party_31_ok": False,
        "party_35_ok": False,
        "party_37_ok": False,
        "party_67_ok": False,
        "party_67_name": "",
        "party_68_count": 0,
        "party_69_ok": False,
        "party_69_name": "",
        "assets_ok": False,
        "vta_ok": False,
        "payment_count": 0,
        "total_consideration": "",
        "seq_unique": False,
        "no_unknown": True,
        "no_placeholder": True,
        "warnings": [],
        "errors": [],
        "xml_size": len(xml_string),
    }
    
    try:
        root = ET.fromstring(xml_string)
        v["parse_ok"] = True
    except ET.ParseError as e:
        v["errors"].append(f"XML parse error: {e}")
        v["xml_valid"] = False
        return v
    
    # FormTypeCode
    ftc = root.find(f".//{NS}FormTypeCode")
    v["form_type_ok"] = ftc is not None and ftc.text == "RERX"
    
    # Collect all parties by type
    parties_by_type: Dict[str, List] = {}
    for party in root.findall(f".//{NS}Party"):
        type_elem = party.find(f"{NS}ActivityPartyTypeCode")
        if type_elem is not None and type_elem.text:
            code = type_elem.text
            parties_by_type.setdefault(code, []).append(party)
    
    # Party 31 (Reporting Person)
    v["party_31_ok"] = "31" in parties_by_type
    
    # Party 35 (Transmitter)
    v["party_35_ok"] = "35" in parties_by_type
    
    # Party 37 (Transmitter Contact)
    v["party_37_ok"] = "37" in parties_by_type
    
    # Party 67 (Transferee)
    if "67" in parties_by_type:
        v["party_67_ok"] = True
        p67 = parties_by_type["67"][0]
        name_elem = p67.find(f".//{NS}RawPartyFullName")
        last_name = p67.find(f".//{NS}RawEntityIndividualLastName")
        first_name = p67.find(f".//{NS}RawIndividualFirstName")
        if name_elem is not None:
            v["party_67_name"] = name_elem.text or ""
        elif last_name is not None:
            fn = first_name.text if first_name is not None else ""
            v["party_67_name"] = f"{fn} {last_name.text}".strip()
    
    # Party 68 (Associated Persons)
    v["party_68_count"] = len(parties_by_type.get("68", []))
    
    # Party 69 (Transferor)
    if "69" in parties_by_type:
        v["party_69_ok"] = True
        p69 = parties_by_type["69"][0]
        name_elem = p69.find(f".//{NS}RawPartyFullName")
        last_name = p69.find(f".//{NS}RawEntityIndividualLastName")
        first_name = p69.find(f".//{NS}RawIndividualFirstName")
        if name_elem is not None:
            v["party_69_name"] = name_elem.text or ""
        elif last_name is not None:
            fn = first_name.text if first_name is not None else ""
            v["party_69_name"] = f"{fn} {last_name.text}".strip()
    
    # AssetsAttribute
    v["assets_ok"] = root.find(f".//{NS}AssetsAttribute") is not None
    
    # ValueTransferActivity
    vta = root.find(f".//{NS}ValueTransferActivity")
    v["vta_ok"] = vta is not None
    if vta is not None:
        total_elem = vta.find(f"{NS}TotalConsiderationPaidAmountText")
        if total_elem is not None:
            v["total_consideration"] = total_elem.text or ""
        v["payment_count"] = len(vta.findall(f"{NS}ValueTransferActivityDetail"))
    
    # SeqNum uniqueness
    seq_nums = []
    for elem in root.iter():
        sn = elem.get("SeqNum")
        if sn:
            seq_nums.append(sn)
    v["seq_unique"] = len(seq_nums) == len(set(seq_nums))
    if not v["seq_unique"]:
        v["errors"].append("Duplicate SeqNum values detected")
    
    # Check for "Unknown Transferee" / "Unknown Seller" / placeholders
    xml_upper = xml_string.upper()
    if "UNKNOWN TRANSFEREE" in xml_upper:
        v["no_unknown"] = False
        v["errors"].append("Contains 'Unknown Transferee'")
    if "UNKNOWN SELLER" in xml_upper:
        # This is acceptable only if there's legitimately no seller data (won't happen in stress test)
        v["warnings"].append("Contains 'Unknown Seller' — check if seller data was provided")
    
    # Check for N/A placeholders
    for bad in ["N/A</", "UNKNOWN</", "TBD</", "PLACEHOLDER</", "NOT APPLICABLE</"]:
        if bad in xml_upper:
            v["no_placeholder"] = False
            v["errors"].append(f"Contains placeholder text: {bad.split('<')[0]}")
    
    # Count errors for overall validity
    required_checks = [
        v["parse_ok"], v["form_type_ok"], v["party_31_ok"],
        v["party_35_ok"], v["party_37_ok"], v["party_67_ok"],
        v["party_69_ok"], v["assets_ok"], v["vta_ok"],
        v["seq_unique"], v["no_unknown"], v["no_placeholder"],
    ]
    v["xml_valid"] = all(required_checks)
    
    # Validate expected counts
    if v["party_68_count"] != expected_p68_count:
        v["warnings"].append(
            f"Party 68 count: expected {expected_p68_count}, got {v['party_68_count']}"
        )
    if v["payment_count"] != expected_payment_count:
        v["warnings"].append(
            f"Payment count: expected {expected_payment_count}, got {v['payment_count']}"
        )
    
    return v


# ══════════════════════════════════════════════════════════════════════════════
# SCENARIO DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

def get_scenarios() -> List[dict]:
    """Define all 10 test scenarios."""
    
    # Shared seller: individual
    seller_individual = {
        "entity_type": "individual",
        "first_name": "Sarah",
        "last_name": "Williams",
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
    
    scenarios = []
    
    # ── SCENARIO 1: Individual Buyer + Individual Seller ──────────────────
    scenarios.append({
        "name": "Individual <> Individual",
        "buyer": {
            "entity_type": "individual",
            "party_data": {
                "entity_type": "individual",
                "first_name": "Michael",
                "last_name": "Chen",
                "middle_name": "J",
                "date_of_birth": "1985-03-15",
                "ssn": "123-45-6789",
                "citizenship": "US",
                "id_type": "ssn",
                "id_number": "123-45-6789",
                "address": {
                    "street": "456 Oak Avenue",
                    "city": "Pasadena",
                    "state": "CA",
                    "zip": "91101",
                    "country": "US",
                },
                "payment_sources": [{
                    "source_type": "personal_funds",
                    "amount": 850000,
                    "payment_method": "wire_transfer",
                    "institution_name": "Wells Fargo Bank",
                    "account_last_four": "4532",
                }],
            },
        },
        "sellers": [{
            "entity_type": "individual",
            "party_data": deepcopy(seller_individual),
        }],
        "purchase_price": 850000,
        "expected_p68": 0,
        "expected_payments": 1,
    })
    
    # ── SCENARIO 2: Entity (LLC) Buyer + Individual Seller ────────────────
    scenarios.append({
        "name": "Entity(LLC) <> Individual",
        "buyer": {
            "entity_type": "entity",
            "party_data": {
                "entity_type": "entity",
                "entity_name": "Golden State Holdings LLC",
                "entity_subtype": "llc",
                "ein": "83-1234567",
                "formation_state": "CA",
                "formation_date": "2020-06-15",
                "address": {
                    "street": "100 Wilshire Blvd",
                    "unit": "Suite 500",
                    "city": "Los Angeles",
                    "state": "CA",
                    "zip": "90017",
                    "country": "US",
                },
                "signer_name": "Robert Kim",
                "signer_title": "Managing Member",
                "beneficial_owners": [
                    {
                        "first_name": "Robert",
                        "last_name": "Kim",
                        "date_of_birth": "1978-11-03",
                        "ssn": "111-22-3333",
                        "citizenship": "US",
                        "id_type": "ssn",
                        "address": {
                            "street": "789 Pine St",
                            "city": "Arcadia",
                            "state": "CA",
                            "zip": "91006",
                            "country": "US",
                        },
                        "ownership_percentage": 60,
                        "is_control_person": True,
                        "control_type": "managing_member",
                    },
                    {
                        "first_name": "Lisa",
                        "last_name": "Park",
                        "date_of_birth": "1982-04-19",
                        "ssn": "444-55-6666",
                        "citizenship": "US",
                        "id_type": "ssn",
                        "address": {
                            "street": "321 Elm Dr",
                            "city": "Monrovia",
                            "state": "CA",
                            "zip": "91016",
                            "country": "US",
                        },
                        "ownership_percentage": 40,
                        "is_control_person": False,
                    },
                ],
                "payment_sources": [
                    {
                        "source_type": "business_funds",
                        "amount": 1200000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Bank of America",
                        "account_last_four": "8901",
                    },
                    {
                        "source_type": "loan",
                        "amount": 300000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Pacific Premier Trust",
                        "account_last_four": "2345",
                    },
                ],
            },
        },
        "sellers": [{
            "entity_type": "individual",
            "party_data": deepcopy(seller_individual),
        }],
        "purchase_price": 1500000,
        "expected_p68": 3,  # 2 BOs + 1 signing individual
        "expected_payments": 2,
    })
    
    # ── SCENARIO 3: Entity (Corporation) Buyer + Individual Seller ────────
    scenarios.append({
        "name": "Entity(Corp) <> Individual",
        "buyer": {
            "entity_type": "entity",
            "party_data": {
                "entity_type": "entity",
                "entity_name": "Pacific Ventures Inc.",
                "entity_subtype": "corporation",
                "ein": "92-7654321",
                "formation_state": "DE",
                "formation_date": "2019-01-10",
                "address": {
                    "street": "555 Corporate Plaza",
                    "city": "Irvine",
                    "state": "CA",
                    "zip": "92614",
                    "country": "US",
                },
                "beneficial_owners": [
                    {
                        "first_name": "James",
                        "last_name": "Nguyen",
                        "date_of_birth": "1975-07-20",
                        "ssn": "555-66-7777",
                        "citizenship": "US",
                        "id_type": "ssn",
                        "address": {
                            "street": "101 Boardwalk",
                            "city": "Newport Beach",
                            "state": "CA",
                            "zip": "92663",
                            "country": "US",
                        },
                        "ownership_percentage": 100,
                        "is_control_person": True,
                        "control_type": "ceo",
                    },
                ],
                "payment_sources": [
                    {
                        "source_type": "business_funds",
                        "amount": 750000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Chase Bank",
                        "account_last_four": "1234",
                    },
                ],
            },
        },
        "sellers": [{
            "entity_type": "individual",
            "party_data": deepcopy(seller_individual),
        }],
        "purchase_price": 750000,
        "expected_p68": 1,
        "expected_payments": 1,
    })
    
    # ── SCENARIO 4: Trust Buyer + Individual Seller ───────────────────────
    scenarios.append({
        "name": "Trust <> Individual",
        "buyer": {
            "entity_type": "trust",
            "party_data": {
                "entity_type": "trust",
                "trust_name": "The Chen Family Trust dated March 15, 2018",
                "trust_type": "revocable_living_trust",
                "trust_ein": "77-8899001",
                "trust_date": "2018-03-15",
                "is_revocable": True,
                "address": {
                    "street": "456 Oak Avenue",
                    "city": "Pasadena",
                    "state": "CA",
                    "zip": "91101",
                    "country": "US",
                },
                "trustees": [
                    {
                        "type": "individual",
                        "individual": {
                            "first_name": "Michael",
                            "last_name": "Chen",
                            "date_of_birth": "1985-03-15",
                            "ssn": "123-45-6789",
                            "citizenship": "US",
                            "address": {
                                "street": "456 Oak Avenue",
                                "city": "Pasadena",
                                "state": "CA",
                                "zip": "91101",
                                "country": "US",
                            },
                            "phone": "626-555-0100",
                            "email": "michael@example.com",
                        },
                        "role": "trustee",
                    },
                ],
                "settlors": [{"full_name": "Michael Chen", "relationship": "grantor"}],
                "beneficiaries": [
                    {"full_name": "Emily Chen"},
                    {"full_name": "David Chen"},
                ],
                "payment_sources": [
                    {
                        "source_type": "trust_funds",
                        "amount": 950000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Charles Schwab",
                        "account_last_four": "7890",
                    },
                ],
            },
        },
        "sellers": [{
            "entity_type": "individual",
            "party_data": deepcopy(seller_individual),
        }],
        "purchase_price": 950000,
        "expected_p68": 1,  # 1 trustee
        "expected_payments": 1,
    })
    
    # ── SCENARIO 5: Individual Buyer + Entity Seller ──────────────────────
    scenarios.append({
        "name": "Individual <> Entity",
        "buyer": {
            "entity_type": "individual",
            "party_data": {
                "entity_type": "individual",
                "first_name": "David",
                "last_name": "Martinez",
                "date_of_birth": "1990-06-01",
                "ssn": "222-33-4444",
                "citizenship": "US",
                "id_type": "ssn",
                "id_number": "222-33-4444",
                "address": {
                    "street": "900 Sunset Blvd",
                    "city": "West Hollywood",
                    "state": "CA",
                    "zip": "90069",
                    "country": "US",
                },
                "payment_sources": [{
                    "source_type": "personal_funds",
                    "amount": 650000,
                    "payment_method": "wire_transfer",
                    "institution_name": "US Bank",
                    "account_last_four": "5678",
                }],
            },
        },
        "sellers": [{
            "entity_type": "entity",
            "party_data": {
                "entity_type": "entity",
                "entity_name": "ABC Investments LLC",
                "ein": "88-7766554",
                "address": {
                    "street": "200 Main St",
                    "city": "Alhambra",
                    "state": "CA",
                    "zip": "91801",
                    "country": "US",
                },
            },
        }],
        "purchase_price": 650000,
        "expected_p68": 0,
        "expected_payments": 1,
    })
    
    # ── SCENARIO 6: Individual Buyer + Trust Seller ───────────────────────
    scenarios.append({
        "name": "Individual <> Trust",
        "buyer": {
            "entity_type": "individual",
            "party_data": {
                "entity_type": "individual",
                "first_name": "Emily",
                "last_name": "Rodriguez",
                "date_of_birth": "1988-12-10",
                "ssn": "333-44-5555",
                "citizenship": "US",
                "id_type": "ssn",
                "id_number": "333-44-5555",
                "address": {
                    "street": "500 Palm Drive",
                    "city": "Beverly Hills",
                    "state": "CA",
                    "zip": "90210",
                    "country": "US",
                },
                "payment_sources": [{
                    "source_type": "personal_funds",
                    "amount": 1100000,
                    "payment_method": "wire_transfer",
                    "institution_name": "Citibank",
                    "account_last_four": "9012",
                }],
            },
        },
        "sellers": [{
            "entity_type": "trust",
            "party_data": {
                "entity_type": "trust",
                "trust_name": "The Rodriguez Family Trust",
                "trust_ein": "66-5544332",
                "trust_date": "2015-08-20",
                "is_revocable": False,
                "address": {
                    "street": "123 Trust Ave",
                    "city": "Santa Monica",
                    "state": "CA",
                    "zip": "90401",
                    "country": "US",
                },
                "trustees": [
                    {
                        "type": "individual",
                        "full_name": "Carlos Rodriguez",
                        "date_of_birth": "1955-03-01",
                        "ssn": "666-77-8888",
                    },
                ],
            },
        }],
        "purchase_price": 1100000,
        "expected_p68": 0,
        "expected_payments": 1,
    })
    
    # ── SCENARIO 7: Entity Buyer + Entity Seller ─────────────────────────
    scenarios.append({
        "name": "Entity <> Entity",
        "buyer": {
            "entity_type": "entity",
            "party_data": {
                "entity_type": "entity",
                "entity_name": "Coastal Realty Group LLC",
                "entity_subtype": "llc",
                "ein": "44-5566778",
                "formation_state": "CA",
                "formation_date": "2021-03-01",
                "address": {
                    "street": "800 Ocean Ave",
                    "city": "Long Beach",
                    "state": "CA",
                    "zip": "90802",
                    "country": "US",
                },
                "beneficial_owners": [
                    {
                        "first_name": "Anna",
                        "last_name": "Lee",
                        "date_of_birth": "1980-02-14",
                        "ssn": "777-88-9999",
                        "citizenship": "US",
                        "id_type": "ssn",
                        "address": {
                            "street": "1 Harbor Dr",
                            "city": "Long Beach",
                            "state": "CA",
                            "zip": "90802",
                            "country": "US",
                        },
                        "ownership_percentage": 50,
                        "is_control_person": True,
                        "control_type": "managing_member",
                    },
                    {
                        "first_name": "Tom",
                        "last_name": "Wong",
                        "date_of_birth": "1979-09-30",
                        "ssn": "888-99-0000",
                        "citizenship": "US",
                        "id_type": "ssn",
                        "address": {
                            "street": "2 Harbor Dr",
                            "city": "Long Beach",
                            "state": "CA",
                            "zip": "90802",
                            "country": "US",
                        },
                        "ownership_percentage": 50,
                        "is_control_person": True,
                        "control_type": "managing_member",
                    },
                ],
                "payment_sources": [
                    {
                        "source_type": "business_funds",
                        "amount": 2000000,
                        "payment_method": "wire_transfer",
                        "institution_name": "First Republic",
                        "account_last_four": "3456",
                    },
                    {
                        "source_type": "loan",
                        "amount": 500000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Wells Fargo",
                        "account_last_four": "7890",
                    },
                ],
            },
        },
        "sellers": [{
            "entity_type": "entity",
            "party_data": {
                "entity_type": "entity",
                "entity_name": "Sunset Properties Inc.",
                "ein": "55-6677889",
                "address": {
                    "street": "300 Sunset Strip",
                    "city": "Hollywood",
                    "state": "CA",
                    "zip": "90028",
                    "country": "US",
                },
            },
        }],
        "purchase_price": 2500000,
        "expected_p68": 2,
        "expected_payments": 2,
    })
    
    # ── SCENARIO 8: Trust Buyer + Trust Seller (max complexity) ──────────
    scenarios.append({
        "name": "Trust <> Trust",
        "buyer": {
            "entity_type": "trust",
            "party_data": {
                "entity_type": "trust",
                "trust_name": "Wong Family Irrevocable Trust",
                "trust_type": "irrevocable_trust",
                "trust_ein": "99-1122334",
                "trust_date": "2020-01-01",
                "is_revocable": False,
                "address": {
                    "street": "400 Trust Lane",
                    "city": "San Marino",
                    "state": "CA",
                    "zip": "91108",
                    "country": "US",
                },
                "trustees": [
                    {
                        "type": "individual",
                        "individual": {
                            "first_name": "Henry",
                            "last_name": "Wong",
                            "date_of_birth": "1965-05-20",
                            "ssn": "999-00-1111",
                            "citizenship": "US",
                            "address": {
                                "street": "400 Trust Lane",
                                "city": "San Marino",
                                "state": "CA",
                                "zip": "91108",
                                "country": "US",
                            },
                        },
                        "role": "trustee",
                    },
                ],
                "settlors": [
                    {"full_name": "Henry Wong", "relationship": "grantor"},
                ],
                "beneficiaries": [
                    {"full_name": "Alice Wong"},
                    {"full_name": "Brian Wong"},
                ],
                "payment_sources": [
                    {
                        "source_type": "trust_funds",
                        "amount": 1800000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Merrill Lynch",
                        "account_last_four": "5555",
                    },
                ],
            },
        },
        "sellers": [{
            "entity_type": "trust",
            "party_data": {
                "entity_type": "trust",
                "trust_name": "The Park Family Trust dated July 2010",
                "trust_ein": "11-2233445",
                "trust_date": "2010-07-15",
                "is_revocable": True,
                "address": {
                    "street": "600 Park Ave",
                    "city": "Pasadena",
                    "state": "CA",
                    "zip": "91101",
                    "country": "US",
                },
                "trustees": [
                    {
                        "type": "individual",
                        "full_name": "Janet Park",
                        "date_of_birth": "1970-11-30",
                        "ssn": "222-11-0000",
                    },
                ],
            },
        }],
        "purchase_price": 1800000,
        "expected_p68": 1,  # 1 buyer trustee
        "expected_payments": 1,
    })
    
    # ── SCENARIO 9: Entity + Multiple Payment Sources ────────────────────
    scenarios.append({
        "name": "Entity + Multi-Payment",
        "buyer": {
            "entity_type": "entity",
            "party_data": {
                "entity_type": "entity",
                "entity_name": "Triple Pay Holdings LLC",
                "ein": "33-4455667",
                "formation_state": "NV",
                "formation_date": "2022-06-01",
                "address": {
                    "street": "999 Vegas Blvd",
                    "city": "Las Vegas",
                    "state": "NV",
                    "zip": "89101",
                    "country": "US",
                },
                "beneficial_owners": [
                    {
                        "first_name": "Kevin",
                        "last_name": "Tanaka",
                        "date_of_birth": "1984-01-15",
                        "ssn": "111-00-2222",
                        "citizenship": "US",
                        "id_type": "ssn",
                        "address": {
                            "street": "100 Strip Ave",
                            "city": "Las Vegas",
                            "state": "NV",
                            "zip": "89101",
                            "country": "US",
                        },
                        "ownership_percentage": 100,
                        "is_control_person": True,
                        "control_type": "sole_member",
                    },
                ],
                "payment_sources": [
                    {
                        "source_type": "personal_funds",
                        "amount": 500000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Personal Savings - BofA",
                        "account_last_four": "1111",
                    },
                    {
                        "source_type": "business_funds",
                        "amount": 750000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Business Account - Chase",
                        "account_last_four": "2222",
                    },
                    {
                        "source_type": "loan",
                        "amount": 250000,
                        "payment_method": "wire_transfer",
                        "institution_name": "Private Lender Trust",
                        "account_last_four": "3333",
                    },
                ],
            },
        },
        "sellers": [{
            "entity_type": "individual",
            "party_data": deepcopy(seller_individual),
        }],
        "purchase_price": 1500000,
        "expected_p68": 1,
        "expected_payments": 3,
    })
    
    # ── SCENARIO 10: Foreign Individual Buyer (passport, no SSN) ─────────
    scenarios.append({
        "name": "Foreign Individual",
        "buyer": {
            "entity_type": "individual",
            "party_data": {
                "entity_type": "individual",
                "first_name": "Nigel",
                "last_name": "Thornberry",
                "middle_name": "A",
                "date_of_birth": "1975-04-12",
                "citizenship": "GB",
                "id_type": "foreign_passport",
                "id_number": "GB12345678",
                "id_jurisdiction": "GB",
                # NOTE: No SSN field — foreign buyer
                "address": {
                    "street": "10 Downing St",
                    "city": "London",
                    "state": "",
                    "zip": "SW1A2AA",
                    "country": "GB",
                },
                "payment_sources": [{
                    "source_type": "personal_funds",
                    "amount": 975000,
                    "payment_method": "wire_transfer",
                    "institution_name": "Barclays Bank",
                    "account_last_four": "0001",
                }],
            },
        },
        "sellers": [{
            "entity_type": "individual",
            "party_data": deepcopy(seller_individual),
        }],
        "purchase_price": 975000,
        "expected_p68": 0,
        "expected_payments": 1,
    })
    
    return scenarios


# ══════════════════════════════════════════════════════════════════════════════
# RUNNER
# ══════════════════════════════════════════════════════════════════════════════

def run_scenario(
    idx: int,
    scenario: dict,
    verbose: bool = False,
    save_xml: bool = False,
) -> dict:
    """
    Run a single test scenario through the full pipeline.
    
    Returns a result dict.
    """
    name = scenario["name"]
    buyer_spec = scenario["buyer"]
    seller_specs = scenario["sellers"]
    purchase_price = scenario.get("purchase_price", 850000)
    expected_p68 = scenario["expected_p68"]
    expected_payments = scenario["expected_payments"]
    
    result = {
        "num": idx + 1,
        "name": name,
        "sync_pass": False,
        "xml_pass": False,
        "valid_pass": False,
        "preflight_error": None,
        "p67_name": "",
        "p68_count": 0,
        "p69_name": "",
        "payment_count": 0,
        "total_amount": "",
        "xml_size": 0,
        "warnings": [],
        "errors": [],
    }
    
    try:
        # ── 1. Create mock parties ────────────────────────────────────────
        buyer_party = make_mock_party(
            party_role="transferee",
            entity_type=buyer_spec["entity_type"],
            party_data=buyer_spec["party_data"],
        )
        
        seller_parties = []
        for ss in seller_specs:
            sp = make_mock_party(
                party_role="transferor",
                entity_type=ss["entity_type"],
                party_data=ss["party_data"],
            )
            seller_parties.append(sp)
        
        all_parties = [buyer_party] + seller_parties
        
        # ── 2. Build base wizard_data ─────────────────────────────────────
        buyer_type_mapped = _map_entity_type_to_buyer_type(buyer_spec["entity_type"])
        wizard_data = make_base_wizard_data(
            buyer_type=buyer_type_mapped,
            purchase_price=purchase_price,
        )
        
        # ── 3. Simulate sync ─────────────────────────────────────────────
        synced_wd, sync_result = simulate_sync(wizard_data, buyer_party, seller_parties)
        
        result["sync_pass"] = sync_result["synced"] and not sync_result["errors"]
        if sync_result["warnings"]:
            result["warnings"].extend(sync_result["warnings"])
        
        if verbose:
            print(f"\n  [Scenario {idx+1}] Sync result:")
            print(f"    Fields mapped: {sync_result['fields_mapped']}")
            print(f"    Parties synced: {sync_result['parties_synced']}")
            if sync_result["warnings"]:
                for w in sync_result["warnings"]:
                    print(f"    Warning: {w}")
        
        # ── 4. Create mock report with synced data ────────────────────────
        report = make_mock_report(
            wizard_data=synced_wd,
            parties=all_parties,
        )
        submission = make_mock_submission()
        
        # ── 5. Build RERX XML ────────────────────────────────────────────
        config = get_settings()
        
        try:
            xml_string, debug_summary = build_rerx_xml(report, submission, config)
            result["xml_pass"] = True
            
            if verbose:
                print(f"    XML generated: {len(xml_string)} bytes, {debug_summary.get('final_seq_count', '?')} seqs")
                if debug_summary.get("warnings"):
                    for w in debug_summary["warnings"]:
                        print(f"    Builder warning: {w}")
            
            # ── 6. Validate XML ──────────────────────────────────────────
            validation = validate_xml(xml_string, expected_p68, expected_payments)
            
            result["valid_pass"] = validation["xml_valid"]
            result["p67_name"] = validation["party_67_name"]
            result["p68_count"] = validation["party_68_count"]
            result["p69_name"] = validation["party_69_name"]
            result["payment_count"] = validation["payment_count"]
            result["total_amount"] = validation["total_consideration"]
            result["xml_size"] = validation["xml_size"]
            result["warnings"].extend(validation["warnings"])
            result["errors"].extend(validation["errors"])
            
            if verbose:
                print(f"    Validation: {'PASS' if validation['xml_valid'] else 'FAIL'}")
                print(f"    P-67: {validation['party_67_name']}")
                print(f"    P-68 count: {validation['party_68_count']}")
                print(f"    P-69: {validation['party_69_name']}")
                print(f"    Payments: {validation['payment_count']}")
                if validation["warnings"]:
                    for w in validation["warnings"]:
                        print(f"    Val warning: {w}")
                if validation["errors"]:
                    for e in validation["errors"]:
                        print(f"    Val error: {e}")
            
            # ── 7. Optionally save XML ───────────────────────────────────
            if save_xml:
                save_dir = os.path.join(os.path.dirname(__file__), "..", "..", "stress_test_output")
                os.makedirs(save_dir, exist_ok=True)
                path = os.path.join(save_dir, f"scenario_{idx+1:02d}.xml")
                with open(path, "w", encoding="utf-8") as f:
                    f.write(xml_string)
                if verbose:
                    print(f"    Saved: {path}")
        
        except PreflightError as e:
            result["preflight_error"] = e.message
            result["errors"].extend(e.errors)
            if verbose:
                print(f"    PREFLIGHT FAIL: {e.message}")
                for err in e.errors:
                    print(f"      - {err}")
    
    except Exception as e:
        result["errors"].append(f"Exception: {type(e).__name__}: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
    
    return result


# ══════════════════════════════════════════════════════════════════════════════
# TABLE OUTPUT
# ══════════════════════════════════════════════════════════════════════════════

def ok(val: bool) -> str:
    return " OK " if val else "FAIL"


def print_results(results: List[dict]) -> None:
    """Print the summary table."""
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    total = len(results)
    passed = sum(1 for r in results if r["sync_pass"] and r["xml_pass"] and r["valid_pass"])
    failed = total - passed
    
    all_warnings = []
    for r in results:
        for w in r["warnings"]:
            all_warnings.append(f"Scenario {r['num']}: {w}")
    
    print()
    print("=" * 90)
    print(f"  RERX STRESS TEST RESULTS")
    print(f"  Date: {now}")
    print(f"  Scenarios: {total}")
    print("=" * 90)
    print()
    
    # Header
    hdr = (
        f"{'#':>3}  "
        f"{'Scenario':<28}  "
        f"{'Sync':^6}  "
        f"{'XML':^6}  "
        f"{'Valid':^6}  "
        f"{'P-67':^5}  "
        f"{'P-68':^5}  "
        f"{'P-69':^5}  "
        f"{'Pmts':^5}  "
        f"{'Size':>6}"
    )
    sep = "-" * len(hdr)
    
    print(hdr)
    print(sep)
    
    for r in results:
        overall = r["sync_pass"] and r["xml_pass"] and r["valid_pass"]
        
        p67_str = "Y" if r["p67_name"] else "N"
        p69_str = "Y" if r["p69_name"] else "N"
        
        row = (
            f"{r['num']:>3}  "
            f"{r['name']:<28}  "
            f"{ok(r['sync_pass']):^6}  "
            f"{ok(r['xml_pass']):^6}  "
            f"{ok(r['valid_pass']):^6}  "
            f"{'  ' + p67_str + '  ':^5}  "
            f"{r['p68_count']:^5}  "
            f"{'  ' + p69_str + '  ':^5}  "
            f"{r['payment_count']:^5}  "
            f"{r['xml_size']:>6}"
        )
        print(row)
    
    print(sep)
    print()
    print(f"  PASSED: {passed}/{total}")
    print(f"  FAILED: {failed}/{total}")
    
    if all_warnings:
        print(f"  WARNINGS: {len(all_warnings)}")
        print()
        print("  Warnings:")
        for w in all_warnings:
            print(f"    - {w}")
    
    # Print errors for failed scenarios
    failed_results = [r for r in results if not (r["sync_pass"] and r["xml_pass"] and r["valid_pass"])]
    if failed_results:
        print()
        print("  FAILURES:")
        for r in failed_results:
            print(f"    Scenario {r['num']} ({r['name']}):")
            if r["preflight_error"]:
                print(f"      Preflight: {r['preflight_error']}")
            for e in r["errors"]:
                print(f"      Error: {e}")
    
    print()
    print("=" * 90)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="RERX Stress Test - All Party Combinations")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output per scenario")
    parser.add_argument("--save-xml", action="store_true", help="Save generated XML files")
    parser.add_argument("--scenario", "-s", type=int, help="Run only scenario N (1-10)")
    args = parser.parse_args()
    
    print()
    print("  RERX STRESS TEST")
    print("  Validating every party type through full pipeline")
    print("  party_data -> sync -> RERX XML -> structural validation")
    print()
    
    # Config check
    config = get_settings()
    print(f"  Config:")
    print(f"    FINCEN_ENV:      {config.FINCEN_ENV}")
    print(f"    TRANSMITTER_TIN: {'*' * 5 + config.TRANSMITTER_TIN[-4:] if config.TRANSMITTER_TIN else 'NOT SET'}")
    print(f"    TRANSMITTER_TCC: {config.TRANSMITTER_TCC or 'NOT SET'}")
    print()
    
    scenarios = get_scenarios()
    
    if args.scenario:
        if 1 <= args.scenario <= len(scenarios):
            scenarios = [scenarios[args.scenario - 1]]
            print(f"  Running scenario {args.scenario} only")
        else:
            print(f"  Invalid scenario number: {args.scenario} (valid: 1-{len(scenarios)})")
            return 1
    
    results = []
    for i, scenario in enumerate(scenarios):
        actual_idx = (args.scenario - 1) if args.scenario else i
        if args.verbose:
            print(f"\n{'=' * 60}")
            print(f"  Scenario {actual_idx + 1}: {scenario['name']}")
            print(f"{'=' * 60}")
        else:
            status = "..."
            print(f"  Running scenario {actual_idx + 1}: {scenario['name']:<30}", end="", flush=True)
        
        r = run_scenario(actual_idx, scenario, verbose=args.verbose, save_xml=args.save_xml)
        results.append(r)
        
        if not args.verbose:
            overall = r["sync_pass"] and r["xml_pass"] and r["valid_pass"]
            print(f"  {'OK' if overall else 'FAIL'}")
    
    print_results(results)
    
    # Exit code
    all_pass = all(r["sync_pass"] and r["xml_pass"] and r["valid_pass"] for r in results)
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
