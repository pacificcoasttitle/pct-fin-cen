"""
FinCEN RRER Determination Logic.

Implements the determination flowchart per 31 CFR 1031.320.
"""
from typing import Dict, Any, List, Tuple


def determine_reportability(wizard_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], List[str]]:
    """
    Determine if a transaction is reportable under FinCEN RRER rules.
    
    Args:
        wizard_data: Dictionary containing wizard form responses
        
    Returns:
        Tuple of (is_reportable, determination_details, reasoning_list)
    """
    reasoning = []
    details = {
        "checks_performed": [],
        "exemptions_checked": [],
        "final_result": None,
    }
    
    # Extract wizard data with defaults
    step1 = wizard_data.get("step1", {})
    step2 = wizard_data.get("step2", {})
    step3 = wizard_data.get("step3", {})
    step4 = wizard_data.get("step4", {})
    
    # ===== CHECK 1: Is this a residential transaction? =====
    is_residential = step1.get("is_residential", None)
    details["checks_performed"].append({
        "check": "residential_property",
        "value": is_residential,
        "result": "pass" if is_residential else "exempt"
    })
    
    if is_residential is False:
        reasoning.append("Transaction is NOT residential (not 1-4 family). EXEMPT from RRER.")
        details["final_result"] = "exempt"
        details["exemption_reason"] = "non_residential"
        return False, details, reasoning
    
    if is_residential is None:
        reasoning.append("Residential status not determined yet.")
        details["final_result"] = "incomplete"
        return False, details, reasoning
    
    reasoning.append("Transaction IS residential (1-4 family structure).")
    
    # ===== CHECK 2: Is it a cash/non-financed transaction? =====
    is_cash_transaction = step2.get("is_cash_transaction", None)
    financing_type = step2.get("financing_type", None)
    
    details["checks_performed"].append({
        "check": "financing_type",
        "value": {"is_cash": is_cash_transaction, "type": financing_type},
        "result": "pass" if is_cash_transaction else "check_financing"
    })
    
    # If financed by regulated lender, exempt
    if is_cash_transaction is False and financing_type in ["conventional", "fha", "va", "usda"]:
        reasoning.append(f"Transaction is financed via {financing_type} (regulated lender). EXEMPT from RRER.")
        details["final_result"] = "exempt"
        details["exemption_reason"] = "regulated_financing"
        return False, details, reasoning
    
    if is_cash_transaction is True or financing_type in ["seller_financing", "private_loan", "none"]:
        reasoning.append("Transaction is cash or non-regulated financing. Continues to next check.")
    elif is_cash_transaction is None:
        reasoning.append("Financing type not determined yet.")
        details["final_result"] = "incomplete"
        return False, details, reasoning
    
    # ===== CHECK 3: Transferee entity type =====
    transferee_type = step3.get("transferee_type", None)
    
    details["checks_performed"].append({
        "check": "transferee_type",
        "value": transferee_type,
        "result": "check_exemptions" if transferee_type else "incomplete"
    })
    
    if transferee_type is None:
        reasoning.append("Transferee type not specified yet.")
        details["final_result"] = "incomplete"
        return False, details, reasoning
    
    reasoning.append(f"Transferee is a {transferee_type}.")
    
    # ===== CHECK 4: Entity exemptions (per 31 CFR 1031.320) =====
    exemptions = step4.get("exemptions", {})
    
    # Check the 23 exemption categories
    exemption_checks = [
        ("is_publicly_traded", "Publicly traded company"),
        ("is_regulated_entity", "Regulated financial institution"),
        ("is_government_entity", "Government entity"),
        ("is_501c3", "501(c)(3) tax-exempt organization"),
        ("is_bank_subsidiary", "Subsidiary of regulated bank"),
        ("is_insurance_company", "Regulated insurance company"),
        ("is_registered_investment", "SEC registered investment company"),
        ("is_venture_capital", "Registered venture capital fund"),
        ("is_accounting_firm", "CPA firm subject to AICPA oversight"),
        ("is_public_utility", "Regulated public utility"),
        ("is_pooled_investment", "Pooled investment vehicle"),
    ]
    
    for exemption_key, exemption_name in exemption_checks:
        is_exempt = exemptions.get(exemption_key, False)
        details["exemptions_checked"].append({
            "exemption": exemption_key,
            "name": exemption_name,
            "value": is_exempt
        })
        
        if is_exempt:
            reasoning.append(f"Transferee qualifies for exemption: {exemption_name}. EXEMPT from RRER.")
            details["final_result"] = "exempt"
            details["exemption_reason"] = exemption_key
            return False, details, reasoning
    
    reasoning.append("No exemptions apply. Transaction IS REPORTABLE.")
    
    # ===== FINAL RESULT: REPORTABLE =====
    details["final_result"] = "reportable"
    details["required_parties"] = determine_required_parties(wizard_data)
    
    return True, details, reasoning


def determine_required_parties(wizard_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Determine which parties need to be collected for a reportable transaction.
    
    Returns list of required party definitions.
    """
    required = []
    step3 = wizard_data.get("step3", {})
    
    transferee_type = step3.get("transferee_type", "individual")
    transferee_count = step3.get("transferee_count", 1)
    
    # Transferees (buyers)
    for i in range(transferee_count):
        required.append({
            "party_role": "transferee",
            "entity_type": transferee_type,
            "description": f"Transferee {i + 1}" if transferee_count > 1 else "Transferee (Buyer)"
        })
    
    # If entity, need beneficial owners
    if transferee_type in ["llc", "corporation", "trust", "partnership"]:
        bo_count = step3.get("beneficial_owner_count", 1)
        for i in range(bo_count):
            required.append({
                "party_role": "beneficial_owner",
                "entity_type": "individual",
                "description": f"Beneficial Owner {i + 1}"
            })
    
    return required
