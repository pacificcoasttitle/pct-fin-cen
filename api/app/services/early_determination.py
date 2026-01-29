"""
Early Exemption Determination Service.

Determines if a transaction requires FinCEN Real Estate Reporting based on 
the answers provided in the client submission form.

FinCEN RRER Exemption Rules (31 CFR 1031):
- Transactions with financing (mortgage, loan) are EXEMPT
- Individual buyers (not entities/trusts) are EXEMPT
- Certain entity types are EXEMPT (public companies, banks, nonprofits, etc.)
- Commercial property and vacant land are EXEMPT
"""
from typing import Tuple, List, Optional
from datetime import datetime
import uuid


# =============================================================================
# EXEMPT ENTITY TYPES
# These buyer entity types are exempt from RRER requirements
# =============================================================================
EXEMPT_ENTITY_TYPES = [
    "public_company",      # SEC-reporting public company
    "bank",                # Bank or credit union
    "broker_dealer",       # Registered broker/dealer
    "insurance",           # Insurance company
    "government",          # Government entity
    "nonprofit",           # 501(c) nonprofit organization
    "investment_company",  # Registered investment company
    "pooled_investment",   # Pooled investment vehicle
]

# =============================================================================
# EXEMPT PROPERTY TYPES
# These property types are exempt from RRER requirements
# =============================================================================
EXEMPT_PROPERTY_TYPES = [
    "commercial",          # Commercial property (not residential)
    "land",                # Vacant land
    "industrial",          # Industrial property
    "agricultural",        # Agricultural/farm land
]

# =============================================================================
# FINANCING TYPES THAT TRIGGER EXEMPTION
# =============================================================================
FINANCING_TRIGGERS_EXEMPTION = [
    "conventional",        # Conventional mortgage
    "fha_va",              # FHA/VA loan
    "financed",            # Generic financing
    "seller_financing",    # Seller financing
    "other_financing",     # Other financing types
]

# =============================================================================
# EXEMPTION REASON DISPLAY NAMES
# =============================================================================
EXEMPTION_REASON_DISPLAY = {
    "financing_involved": "Transaction involves financing (mortgage, loan, or seller financing)",
    "buyer_is_individual": "Buyer is an individual person, not an entity or trust",
    "exempt_entity_public_company": "Buyer is a publicly traded company (SEC reporting)",
    "exempt_entity_bank": "Buyer is a bank or credit union",
    "exempt_entity_broker_dealer": "Buyer is a registered broker/dealer",
    "exempt_entity_insurance": "Buyer is an insurance company",
    "exempt_entity_government": "Buyer is a government entity",
    "exempt_entity_nonprofit": "Buyer is a 501(c) nonprofit organization",
    "exempt_entity_investment_company": "Buyer is a registered investment company",
    "exempt_entity_pooled_investment": "Buyer is a pooled investment vehicle",
    "exempt_property_commercial": "Property is commercial (not residential)",
    "exempt_property_land": "Property is vacant land",
    "exempt_property_industrial": "Property is industrial",
    "exempt_property_agricultural": "Property is agricultural/farm land",
}


def determine_reporting_requirement(
    financing_type: Optional[str],
    buyer_type: Optional[str],
    entity_subtype: Optional[str],
    property_type: Optional[str],
    purchase_price_cents: Optional[int] = None,
) -> Tuple[str, List[str]]:
    """
    Determine if a transaction requires FinCEN reporting.
    
    Args:
        financing_type: How transaction is financed ("cash", "conventional", "financed", etc.)
        buyer_type: Type of buyer ("individual", "entity", "trust")
        entity_subtype: Specific entity type if buyer_type is "entity" 
        property_type: Type of property ("single_family", "commercial", "land", etc.)
        purchase_price_cents: Purchase price in cents (for future threshold checks)
    
    Returns:
        Tuple of (result, reasons) where:
        - result: "exempt" | "reportable" | "needs_review"
        - reasons: list of exemption reason codes
    """
    reasons: List[str] = []
    
    # =========================================================================
    # CHECK 1: Financing Type
    # Any financing (mortgage, loan, seller financing) = EXEMPT
    # =========================================================================
    if financing_type:
        financing_lower = financing_type.lower()
        if financing_lower in FINANCING_TRIGGERS_EXEMPTION or financing_lower != "cash":
            reasons.append("financing_involved")
    
    # =========================================================================
    # CHECK 2: Buyer Type
    # Individual buyers are EXEMPT (only entities and trusts trigger reporting)
    # =========================================================================
    if buyer_type:
        buyer_type_lower = buyer_type.lower()
        if buyer_type_lower == "individual":
            reasons.append("buyer_is_individual")
    
    # =========================================================================
    # CHECK 3: Entity Subtype
    # Certain entity types are exempt (banks, public companies, etc.)
    # =========================================================================
    if entity_subtype:
        entity_subtype_lower = entity_subtype.lower()
        if entity_subtype_lower in EXEMPT_ENTITY_TYPES:
            reasons.append(f"exempt_entity_{entity_subtype_lower}")
    
    # =========================================================================
    # CHECK 4: Property Type
    # Commercial property and vacant land are EXEMPT
    # =========================================================================
    if property_type:
        property_type_lower = property_type.lower()
        if property_type_lower in EXEMPT_PROPERTY_TYPES:
            reasons.append(f"exempt_property_{property_type_lower}")
    
    # =========================================================================
    # DETERMINE RESULT
    # =========================================================================
    if reasons:
        return ("exempt", reasons)
    
    # If no exemptions found, the transaction is reportable
    return ("reportable", [])


def generate_exemption_certificate_id() -> str:
    """
    Generate a unique exemption certificate ID.
    
    Format: EXM-YYYYMMDD-XXXXXXXX
    Where XXXXXXXX is a random 8-character hex string.
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    unique = uuid.uuid4().hex[:8].upper()
    return f"EXM-{timestamp}-{unique}"


def get_exemption_reason_display(reason_code: str) -> str:
    """Get the human-readable display text for an exemption reason code."""
    return EXEMPTION_REASON_DISPLAY.get(reason_code, reason_code)


def get_all_exemption_reasons_display(reason_codes: List[str]) -> List[dict]:
    """
    Get display information for a list of exemption reason codes.
    
    Returns list of dicts with 'code' and 'display' keys.
    """
    return [
        {
            "code": code,
            "display": get_exemption_reason_display(code)
        }
        for code in reason_codes
    ]


# =============================================================================
# DETERMINATION SUMMARY FOR AUDIT
# =============================================================================

def create_determination_summary(
    result: str,
    reasons: List[str],
    method: str,
    form_data: dict,
) -> dict:
    """
    Create a complete summary of the determination for audit purposes.
    
    This captures all the input data and the resulting determination.
    """
    return {
        "result": result,
        "reasons": reasons,
        "reasons_display": get_all_exemption_reasons_display(reasons),
        "method": method,
        "timestamp": datetime.utcnow().isoformat(),
        "input_data": {
            "financing_type": form_data.get("financing_type"),
            "buyer_type": form_data.get("buyer_type"),
            "entity_subtype": form_data.get("entity_subtype"),
            "property_type": form_data.get("property_type"),
            "purchase_price_cents": form_data.get("purchase_price_cents"),
        }
    }
