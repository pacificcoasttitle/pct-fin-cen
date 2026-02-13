#!/usr/bin/env python3
"""
STRESS TEST: Determination Logic
=================================
Tests every branch of the FinCEN RRER determination engine.
A wrong answer = missed filing (federal violation) or unnecessary filing.

Tests THREE determination functions:
  A. _evaluate_determination()          — New wizard (6-check, camelCase)
  B. determine_reporting_requirement()  — Early form (parameter-based)
  C. determine_reportability()          — Legacy step-based

Usage:
    python -m app.scripts.stress_test_determination
    python -m app.scripts.stress_test_determination --verbose
"""

import os
import sys
import argparse
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# ══════════════════════════════════════════════════════════════════════════════
# ENV SETUP — Must happen before any app imports
# ══════════════════════════════════════════════════════════════════════════════

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
os.environ.setdefault("TRANSMITTER_TIN", "123456789")
os.environ.setdefault("TRANSMITTER_TCC", "TBSATEST")
os.environ.setdefault("FINCEN_ENV", "sandbox")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ══════════════════════════════════════════════════════════════════════════════
# APP IMPORTS
# ══════════════════════════════════════════════════════════════════════════════

from app.routes.reports import _evaluate_determination
from app.services.early_determination import determine_reporting_requirement
from app.services.determination import determine_reportability

# FastAPI's HTTPException is raised for incomplete data
from fastapi import HTTPException


# ══════════════════════════════════════════════════════════════════════════════
# SCENARIO DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

def get_wizard_scenarios() -> List[dict]:
    """
    Scenarios for _evaluate_determination() — the active wizard logic.
    
    This function uses the FinCEN 6-check decision tree:
      1. Transfer-level exemptions
      2. Non-residential + no intent to build
      3. Lender has AML program
      4. Individual buyer
      5. Entity exemptions (including statutory trusts)
      6. Trust exemptions (non-statutory trusts)
    """
    scenarios = []
    
    # ═══════════════════════════════════════════════════════════════════════
    # GROUP A — Should be REPORTABLE
    # ═══════════════════════════════════════════════════════════════════════
    
    # 1. Entity buyer (LLC), no exemptions
    scenarios.append({
        "name": "Entity(LLC) - no exemptions",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "hasIntentToBuild": None,
            "isNonFinanced": "yes",
            "lenderHasAml": None,
            "buyerType": "entity",
            "isStatutoryTrust": None,
            "entityExemptions": ["none"],
            "trustExemptions": [],
        },
        "expected_exempt": False,
        "group": "A",
        "rule": "Non-exempt entity buyer, all cash",
    })
    
    # 2. Trust buyer (non-statutory), no trust exemptions
    scenarios.append({
        "name": "Trust - no exemptions",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "hasIntentToBuild": None,
            "isNonFinanced": "yes",
            "lenderHasAml": None,
            "buyerType": "trust",
            "isStatutoryTrust": False,
            "entityExemptions": [],
            "trustExemptions": ["none"],
        },
        "expected_exempt": False,
        "group": "A",
        "rule": "Non-exempt trust buyer, all cash",
    })
    
    # 3. Statutory trust, entity exemptions = "none"
    scenarios.append({
        "name": "Statutory trust - no exemptions",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "hasIntentToBuild": None,
            "isNonFinanced": "yes",
            "lenderHasAml": None,
            "buyerType": "trust",
            "isStatutoryTrust": True,
            "entityExemptions": ["none"],
            "trustExemptions": [],
        },
        "expected_exempt": False,
        "group": "A",
        "rule": "Statutory trust uses entity exemption path, none apply",
    })
    
    # 4. Entity, residential, lender has AML=no
    scenarios.append({
        "name": "Entity - AML lender=no",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "hasIntentToBuild": None,
            "isNonFinanced": "no",
            "lenderHasAml": "no",
            "buyerType": "entity",
            "isStatutoryTrust": None,
            "entityExemptions": ["none"],
            "trustExemptions": [],
        },
        "expected_exempt": False,
        "group": "A",
        "rule": "Lender does NOT have AML, entity has no exemptions",
    })
    
    # 5. Entity + AML lender=unknown
    scenarios.append({
        "name": "Entity - AML lender=unknown",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "hasIntentToBuild": None,
            "isNonFinanced": "no",
            "lenderHasAml": "unknown",
            "buyerType": "entity",
            "isStatutoryTrust": None,
            "entityExemptions": ["none"],
            "trustExemptions": [],
        },
        "expected_exempt": False,
        "group": "A",
        "rule": "AML=unknown does NOT trigger exemption (conservative)",
    })
    
    # ═══════════════════════════════════════════════════════════════════════
    # GROUP B — Should be EXEMPT
    # ═══════════════════════════════════════════════════════════════════════
    
    # 6. Transfer exemption: death
    scenarios.append({
        "name": "Transfer exempt: death",
        "input": {
            "transferExemptions": ["death"],
            "isResidential": "yes",
            "buyerType": "entity",
            "entityExemptions": [],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "31 CFR 1031.320 - Transfer from death exempt",
    })
    
    # 7. Transfer exemption: divorce
    scenarios.append({
        "name": "Transfer exempt: divorce",
        "input": {
            "transferExemptions": ["divorce"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "31 CFR 1031.320 - Divorce/dissolution exempt",
    })
    
    # 8. Transfer exemption: 1031 exchange
    scenarios.append({
        "name": "Transfer exempt: 1031 exchange",
        "input": {
            "transferExemptions": ["1031-exchange"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "31 CFR 1031.320 - 1031 exchange exempt",
    })
    
    # 9. Transfer exemption: bankruptcy
    scenarios.append({
        "name": "Transfer exempt: bankruptcy",
        "input": {
            "transferExemptions": ["bankruptcy"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "31 CFR 1031.320 - Bankruptcy estate exempt",
    })
    
    # 10. Transfer exemption: court-supervised
    scenarios.append({
        "name": "Transfer exempt: court order",
        "input": {
            "transferExemptions": ["court-supervised"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "31 CFR 1031.320 - Court-supervised transfer exempt",
    })
    
    # 11. Transfer exemption: self-settled trust
    scenarios.append({
        "name": "Transfer exempt: self-settled trust",
        "input": {
            "transferExemptions": ["self-settled-trust"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "31 CFR 1031.320 - Self-settled trust exempt",
    })
    
    # 12. Non-residential + no intent to build
    scenarios.append({
        "name": "Non-residential, no intent",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "no",
            "hasIntentToBuild": "no",
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 2 - Non-residential + no intent to build residential",
    })
    
    # 13. Lender has AML program
    scenarios.append({
        "name": "AML lender = yes",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "yes",
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 3 - AML-covered lender handles reporting",
    })
    
    # 14. Individual buyer
    scenarios.append({
        "name": "Individual buyer",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "individual",
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 4 - Individual buyer not reportable under RRE",
    })
    
    # 15. Entity buyer with entity exemption (bank)
    scenarios.append({
        "name": "Entity exempt: bank",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "entity",
            "entityExemptions": ["bank"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 5 - Bank entity is exempt",
    })
    
    # 16. Entity buyer with entity exemption (government)
    scenarios.append({
        "name": "Entity exempt: government",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "entity",
            "entityExemptions": ["government"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 5 - Government entity is exempt",
    })
    
    # 17. Entity buyer with entity exemption (securities-issuer)
    scenarios.append({
        "name": "Entity exempt: publicly traded",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "entity",
            "entityExemptions": ["securities-issuer"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 5 - Securities reporting issuer is exempt",
    })
    
    # 18. Statutory trust with entity exemption
    scenarios.append({
        "name": "Statutory trust exempt: bank",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "trust",
            "isStatutoryTrust": True,
            "entityExemptions": ["bank"],
            "trustExemptions": [],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 5 - Statutory trust uses entity exemption path",
    })
    
    # 19. Non-statutory trust with trust exemption
    scenarios.append({
        "name": "Trust exempt: exempt-owned",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "trust",
            "isStatutoryTrust": False,
            "entityExemptions": [],
            "trustExemptions": ["exempt-owned"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 6 - Trust owned by exempt entity is exempt",
    })
    
    # ═══════════════════════════════════════════════════════════════════════
    # GROUP C — Edge Cases
    # ═══════════════════════════════════════════════════════════════════════
    
    # 20. Multiple transfer exemptions (still exempt)
    scenarios.append({
        "name": "Multi transfer exemptions",
        "input": {
            "transferExemptions": ["death", "court-supervised"],
        },
        "expected_exempt": True,
        "group": "C",
        "rule": "Multiple exemptions = still exempt",
    })
    
    # 21. transferExemptions=["none"] but individual buyer → still exempt
    scenarios.append({
        "name": "None + individual buyer",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "individual",
        },
        "expected_exempt": True,
        "group": "C",
        "rule": "No transfer exemption but individual = exempt at check 4",
    })
    
    # 22. isResidential=no but hasIntentToBuild=yes → NOT exempt from check 2
    #     Falls through to check 3+. If entity with no exemptions = reportable.
    scenarios.append({
        "name": "Non-res + intent to build",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "no",
            "hasIntentToBuild": "yes",
            "lenderHasAml": "no",
            "buyerType": "entity",
            "entityExemptions": ["none"],
        },
        "expected_exempt": False,
        "group": "C",
        "rule": "Non-residential but intent to build = NOT exempt from check 2",
    })
    
    # 23. Transfer exemption: easement
    scenarios.append({
        "name": "Transfer exempt: easement",
        "input": {
            "transferExemptions": ["easement"],
        },
        "expected_exempt": True,
        "group": "C",
        "rule": "Easement-only transfer is exempt",
    })
    
    # 24. Transfer exemption: no-reporting-person
    scenarios.append({
        "name": "No reporting person",
        "input": {
            "transferExemptions": ["no-reporting-person"],
        },
        "expected_exempt": True,
        "group": "C",
        "rule": "No reporting person = exempt",
    })
    
    # 25. Empty determination → should raise (incomplete)
    scenarios.append({
        "name": "Empty determination (error)",
        "input": {},
        "expected_exempt": None,  # Should raise error
        "expect_error": True,
        "group": "C",
        "rule": "Empty data should fail gracefully, not crash",
    })
    
    # 26. Entity buyer, entityExemptions=[] (empty array, not "none")
    #     → should raise (incomplete — user didn't answer the question)
    scenarios.append({
        "name": "Entity, empty exemptions (error)",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "entity",
            "entityExemptions": [],
            "trustExemptions": [],
        },
        "expected_exempt": None,
        "expect_error": True,
        "group": "C",
        "rule": "Entity buyer with empty exemption array = incomplete",
    })
    
    # 27. Trust with multiple trust exemptions
    scenarios.append({
        "name": "Trust multi-exemptions",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "trust",
            "isStatutoryTrust": False,
            "trustExemptions": ["trust-securities-issuer", "exempt-owned"],
        },
        "expected_exempt": True,
        "group": "C",
        "rule": "Multiple trust exemptions = still exempt",
    })
    
    # 28. All 8 transfer exemption IDs (one at a time tested above, all together)
    scenarios.append({
        "name": "All transfer exemptions",
        "input": {
            "transferExemptions": [
                "easement", "death", "divorce", "bankruptcy",
                "court-supervised", "self-settled-trust",
                "1031-exchange", "no-reporting-person",
            ],
        },
        "expected_exempt": True,
        "group": "C",
        "rule": "All 8 transfer exemptions at once = exempt",
    })
    
    # 29. Entity with insurance-company exemption
    scenarios.append({
        "name": "Entity exempt: insurance",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "entity",
            "entityExemptions": ["insurance-company"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 5 - Insurance company is exempt entity",
    })
    
    # 30. Entity with exempt-subsidiary exemption
    scenarios.append({
        "name": "Entity exempt: subsidiary",
        "input": {
            "transferExemptions": ["none"],
            "isResidential": "yes",
            "lenderHasAml": "no",
            "buyerType": "entity",
            "entityExemptions": ["exempt-subsidiary"],
        },
        "expected_exempt": True,
        "group": "B",
        "rule": "Check 5 - Subsidiary of exempt entity is exempt",
    })
    
    return scenarios


def get_early_scenarios() -> List[dict]:
    """
    Scenarios for determine_reporting_requirement() — the early form submission.
    """
    return [
        # E1. Cash + entity + residential → reportable
        {
            "name": "Cash entity residential",
            "input": {
                "financing_type": "cash",
                "buyer_type": "entity",
                "entity_subtype": "llc",
                "property_type": "single_family",
            },
            "expected_result": "reportable",
            "expected_reasons": [],
            "group": "E",
        },
        # E2. Conventional financing → exempt
        {
            "name": "Conventional financing",
            "input": {
                "financing_type": "conventional",
                "buyer_type": "entity",
                "entity_subtype": "llc",
                "property_type": "single_family",
            },
            "expected_result": "exempt",
            "expected_reasons": ["financing_involved"],
            "group": "E",
        },
        # E3. Individual buyer → exempt
        {
            "name": "Individual buyer",
            "input": {
                "financing_type": "cash",
                "buyer_type": "individual",
                "entity_subtype": None,
                "property_type": "single_family",
            },
            "expected_result": "exempt",
            "expected_reasons": ["buyer_is_individual"],
            "group": "E",
        },
        # E4. Government entity → exempt
        {
            "name": "Government entity",
            "input": {
                "financing_type": "cash",
                "buyer_type": "entity",
                "entity_subtype": "government",
                "property_type": "single_family",
            },
            "expected_result": "exempt",
            "expected_reasons": ["exempt_entity_government"],
            "group": "E",
        },
        # E5. Commercial property → exempt
        {
            "name": "Commercial property",
            "input": {
                "financing_type": "cash",
                "buyer_type": "entity",
                "entity_subtype": "llc",
                "property_type": "commercial",
            },
            "expected_result": "exempt",
            "expected_reasons": ["exempt_property_commercial"],
            "group": "E",
        },
        # E6. Public company → exempt
        {
            "name": "Public company",
            "input": {
                "financing_type": "cash",
                "buyer_type": "entity",
                "entity_subtype": "public_company",
                "property_type": "single_family",
            },
            "expected_result": "exempt",
            "expected_reasons": ["exempt_entity_public_company"],
            "group": "E",
        },
        # E7. Vacant land → exempt
        {
            "name": "Vacant land",
            "input": {
                "financing_type": "cash",
                "buyer_type": "entity",
                "entity_subtype": "llc",
                "property_type": "land",
            },
            "expected_result": "exempt",
            "expected_reasons": ["exempt_property_land"],
            "group": "E",
        },
        # E8. All None → reportable (no exemption detected)
        {
            "name": "All fields None",
            "input": {
                "financing_type": None,
                "buyer_type": None,
                "entity_subtype": None,
                "property_type": None,
            },
            "expected_result": "reportable",
            "expected_reasons": [],
            "group": "E",
        },
        # E9. Bank entity → exempt
        {
            "name": "Bank entity",
            "input": {
                "financing_type": "cash",
                "buyer_type": "entity",
                "entity_subtype": "bank",
                "property_type": "single_family",
            },
            "expected_result": "exempt",
            "expected_reasons": ["exempt_entity_bank"],
            "group": "E",
        },
        # E10. Nonprofit entity → exempt
        {
            "name": "Nonprofit entity",
            "input": {
                "financing_type": "cash",
                "buyer_type": "entity",
                "entity_subtype": "nonprofit",
                "property_type": "single_family",
            },
            "expected_result": "exempt",
            "expected_reasons": ["exempt_entity_nonprofit"],
            "group": "E",
        },
    ]


def get_legacy_scenarios() -> List[dict]:
    """
    Scenarios for determine_reportability() — legacy step-based.
    """
    return [
        # L1. Residential + cash + entity + no exemptions → reportable
        {
            "name": "Legacy: standard reportable",
            "input": {
                "step1": {"is_residential": True},
                "step2": {"is_cash_transaction": True, "financing_type": "none"},
                "step3": {"transferee_type": "llc"},
                "step4": {"exemptions": {}},
            },
            "expected_reportable": True,
            "group": "L",
        },
        # L2. Not residential → exempt
        {
            "name": "Legacy: non-residential",
            "input": {
                "step1": {"is_residential": False},
                "step2": {},
                "step3": {},
                "step4": {},
            },
            "expected_reportable": False,
            "group": "L",
        },
        # L3. Financed → exempt
        {
            "name": "Legacy: financed",
            "input": {
                "step1": {"is_residential": True},
                "step2": {"is_cash_transaction": False, "financing_type": "conventional"},
                "step3": {},
                "step4": {},
            },
            "expected_reportable": False,
            "group": "L",
        },
        # L4. Entity with regulated exemption → exempt
        {
            "name": "Legacy: exempt entity",
            "input": {
                "step1": {"is_residential": True},
                "step2": {"is_cash_transaction": True, "financing_type": "none"},
                "step3": {"transferee_type": "llc"},
                "step4": {"exemptions": {"is_regulated_entity": True}},
            },
            "expected_reportable": False,
            "group": "L",
        },
        # L5. Missing fields → incomplete (is_reportable=False, result=incomplete)
        {
            "name": "Legacy: incomplete",
            "input": {
                "step1": {},
                "step2": {},
                "step3": {},
                "step4": {},
            },
            "expected_reportable": False,
            "expected_result": "incomplete",
            "group": "L",
        },
    ]


# ══════════════════════════════════════════════════════════════════════════════
# RUNNER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def run_wizard_scenario(idx: int, scenario: dict, verbose: bool) -> dict:
    """Run a single _evaluate_determination scenario."""
    result = {
        "num": idx + 1,
        "name": scenario["name"],
        "group": scenario["group"],
        "expected": "EXEMPT" if scenario.get("expected_exempt") else (
            "ERROR" if scenario.get("expect_error") else "REPORT"
        ),
        "actual": "",
        "passed": False,
        "reason": "",
        "errors": [],
    }
    
    try:
        is_exempt, reason = _evaluate_determination(scenario["input"])
        result["actual"] = "EXEMPT" if is_exempt else "REPORT"
        result["reason"] = reason or ""
        
        if scenario.get("expect_error"):
            # We expected an error but got a result
            result["passed"] = False
            result["errors"].append("Expected error but got a result")
        else:
            result["passed"] = is_exempt == scenario["expected_exempt"]
        
        if verbose:
            print(f"    Result: {'EXEMPT' if is_exempt else 'REPORTABLE'}")
            print(f"    Reason: {reason}")
    
    except HTTPException as e:
        result["actual"] = "ERROR"
        result["reason"] = f"HTTP {e.status_code}: {e.detail}"
        
        if scenario.get("expect_error"):
            result["passed"] = True
        else:
            result["passed"] = False
            result["errors"].append(f"Unexpected HTTPException: {e.detail}")
        
        if verbose:
            print(f"    HTTPException: {e.status_code} - {e.detail}")
    
    except Exception as e:
        result["actual"] = "ERROR"
        result["reason"] = f"{type(e).__name__}: {e}"
        
        if scenario.get("expect_error"):
            result["passed"] = True
        else:
            result["passed"] = False
            result["errors"].append(f"{type(e).__name__}: {e}")
        
        if verbose:
            print(f"    Exception: {e}")
    
    return result


def run_early_scenario(idx: int, scenario: dict, verbose: bool) -> dict:
    """Run a single determine_reporting_requirement scenario."""
    result = {
        "num": idx + 1,
        "name": scenario["name"],
        "group": scenario["group"],
        "expected": scenario["expected_result"].upper(),
        "actual": "",
        "passed": False,
        "reason": "",
        "errors": [],
    }
    
    try:
        inp = scenario["input"]
        actual_result, reasons = determine_reporting_requirement(
            financing_type=inp.get("financing_type"),
            buyer_type=inp.get("buyer_type"),
            entity_subtype=inp.get("entity_subtype"),
            property_type=inp.get("property_type"),
            purchase_price_cents=inp.get("purchase_price_cents"),
        )
        
        result["actual"] = actual_result.upper()
        result["reason"] = ", ".join(reasons) if reasons else "(none)"
        
        # Check result matches
        result_match = actual_result == scenario["expected_result"]
        
        # Check expected reasons are present
        expected_reasons = scenario.get("expected_reasons", [])
        reasons_match = all(r in reasons for r in expected_reasons)
        
        result["passed"] = result_match and reasons_match
        
        if not result_match:
            result["errors"].append(
                f"Result mismatch: expected {scenario['expected_result']}, got {actual_result}"
            )
        if not reasons_match:
            missing = [r for r in expected_reasons if r not in reasons]
            result["errors"].append(f"Missing reasons: {missing}")
        
        if verbose:
            print(f"    Result: {actual_result}")
            print(f"    Reasons: {reasons}")
    
    except Exception as e:
        result["actual"] = "ERROR"
        result["reason"] = f"{type(e).__name__}: {e}"
        result["errors"].append(f"{type(e).__name__}: {e}")
        
        if verbose:
            print(f"    Exception: {e}")
    
    return result


def run_legacy_scenario(idx: int, scenario: dict, verbose: bool) -> dict:
    """Run a single determine_reportability scenario."""
    result = {
        "num": idx + 1,
        "name": scenario["name"],
        "group": scenario["group"],
        "expected": "REPORT" if scenario["expected_reportable"] else "EXEMPT",
        "actual": "",
        "passed": False,
        "reason": "",
        "errors": [],
    }
    
    try:
        is_reportable, details, reasoning = determine_reportability(scenario["input"])
        
        result["actual"] = "REPORT" if is_reportable else "EXEMPT"
        result["reason"] = details.get("final_result", "")
        
        # Check reportable matches
        result_match = is_reportable == scenario["expected_reportable"]
        
        # Check expected final_result if specified
        expected_result = scenario.get("expected_result")
        if expected_result:
            result_match = result_match and (details.get("final_result") == expected_result)
        
        result["passed"] = result_match
        
        if not result_match:
            result["errors"].append(
                f"Expected {'reportable' if scenario['expected_reportable'] else 'exempt'}, "
                f"got {'reportable' if is_reportable else details.get('final_result', 'exempt')}"
            )
        
        if verbose:
            print(f"    Result: {'REPORTABLE' if is_reportable else 'EXEMPT'}")
            print(f"    Details: {details.get('final_result')}")
            for r in reasoning:
                print(f"    - {r}")
    
    except Exception as e:
        result["actual"] = "ERROR"
        result["reason"] = f"{type(e).__name__}: {e}"
        result["errors"].append(f"{type(e).__name__}: {e}")
        
        if verbose:
            print(f"    Exception: {e}")
    
    return result


# ══════════════════════════════════════════════════════════════════════════════
# TABLE OUTPUT
# ══════════════════════════════════════════════════════════════════════════════

def ok(val: bool) -> str:
    return " OK " if val else "FAIL"


def print_section_results(title: str, results: List[dict]) -> None:
    """Print a results table for one section."""
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    
    print()
    print(f"  {title}")
    print(f"  {'=' * 78}")
    
    hdr = (
        f"  {'#':>3}  "
        f"{'Grp':^3}  "
        f"{'Scenario':<32}  "
        f"{'Expected':^8}  "
        f"{'Actual':^8}  "
        f"{'Result':^6}"
    )
    sep = "  " + "-" * 76
    
    print(hdr)
    print(sep)
    
    for r in results:
        row = (
            f"  {r['num']:>3}  "
            f"{r['group']:^3}  "
            f"{r['name']:<32}  "
            f"{r['expected']:^8}  "
            f"{r['actual']:^8}  "
            f"{ok(r['passed']):^6}"
        )
        print(row)
    
    print(sep)
    print(f"  PASSED: {passed}/{total}")
    
    # Print errors for failed
    failed = [r for r in results if not r["passed"]]
    if failed:
        print()
        for r in failed:
            print(f"  FAIL #{r['num']} ({r['name']}):")
            for e in r["errors"]:
                print(f"    - {e}")
    
    print()
    return passed, total


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Determination Logic Stress Test")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    parser.add_argument("--section", "-s", choices=["wizard", "early", "legacy", "all"],
                        default="all", help="Run only a specific section")
    args = parser.parse_args()
    
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    
    print()
    print("  DETERMINATION LOGIC STRESS TEST")
    print(f"  Date: {now}")
    print("  Tests every branch of the FinCEN RRER determination engine")
    print()
    
    total_passed = 0
    total_scenarios = 0
    
    # ── Section A: Wizard (_evaluate_determination) ──────────────────────
    if args.section in ("wizard", "all"):
        scenarios = get_wizard_scenarios()
        results = []
        
        for i, s in enumerate(scenarios):
            if args.verbose:
                print(f"\n  [{i+1}] {s['name']} (Group {s['group']})")
                print(f"      Rule: {s.get('rule', '')}")
            else:
                print(f"  Running W-{i+1}: {s['name']:<36}", end="", flush=True)
            
            r = run_wizard_scenario(i, s, verbose=args.verbose)
            results.append(r)
            
            if not args.verbose:
                print(f"  {'OK' if r['passed'] else 'FAIL'}")
        
        p, t = print_section_results(
            "SECTION A: _evaluate_determination (Active Wizard - 6 Checks)",
            results
        )
        total_passed += p
        total_scenarios += t
    
    # ── Section B: Early Determination ───────────────────────────────────
    if args.section in ("early", "all"):
        scenarios = get_early_scenarios()
        results = []
        
        for i, s in enumerate(scenarios):
            if args.verbose:
                print(f"\n  [E-{i+1}] {s['name']}")
            else:
                print(f"  Running E-{i+1}: {s['name']:<36}", end="", flush=True)
            
            r = run_early_scenario(i, s, verbose=args.verbose)
            results.append(r)
            
            if not args.verbose:
                print(f"  {'OK' if r['passed'] else 'FAIL'}")
        
        p, t = print_section_results(
            "SECTION B: determine_reporting_requirement (Early Form)",
            results
        )
        total_passed += p
        total_scenarios += t
    
    # ── Section C: Legacy Determination ──────────────────────────────────
    if args.section in ("legacy", "all"):
        scenarios = get_legacy_scenarios()
        results = []
        
        for i, s in enumerate(scenarios):
            if args.verbose:
                print(f"\n  [L-{i+1}] {s['name']}")
            else:
                print(f"  Running L-{i+1}: {s['name']:<36}", end="", flush=True)
            
            r = run_legacy_scenario(i, s, verbose=args.verbose)
            results.append(r)
            
            if not args.verbose:
                print(f"  {'OK' if r['passed'] else 'FAIL'}")
        
        p, t = print_section_results(
            "SECTION C: determine_reportability (Legacy Step-Based)",
            results
        )
        total_passed += p
        total_scenarios += t
    
    # ── Summary ──────────────────────────────────────────────────────────
    print("=" * 82)
    print(f"  TOTAL: {total_passed}/{total_scenarios} PASSED")
    
    if total_passed < total_scenarios:
        print(f"  FAILED: {total_scenarios - total_passed}")
    
    print("=" * 82)
    print()
    
    return 0 if total_passed == total_scenarios else 1


if __name__ == "__main__":
    sys.exit(main())
