"""
Party Validation Service

Provides validation and summary calculation for party data
to support visibility across all user roles.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import re


def validate_ein(ein: str) -> bool:
    """Validate EIN format: XX-XXXXXXX (9 digits)."""
    if not ein:
        return False
    cleaned = re.sub(r'\D', '', ein)
    return len(cleaned) == 9


def validate_ssn(ssn: str) -> bool:
    """Validate SSN format and basic rules."""
    if not ssn:
        return False
    cleaned = re.sub(r'\D', '', ssn)
    if len(cleaned) != 9:
        return False
    
    # Area number can't be 000, 666, or 900-999
    area = int(cleaned[:3])
    if area == 0 or area == 666 or area >= 900:
        return False
    
    # Group number can't be 00
    group = int(cleaned[3:5])
    if group == 0:
        return False
    
    # Serial number can't be 0000
    serial = int(cleaned[5:9])
    if serial == 0:
        return False
    
    return True


def calculate_completion_percentage(party_role: str, entity_type: str, data: Dict) -> int:
    """
    Calculate how complete the party's data is.
    
    Returns a percentage (0-100) based on required fields.
    """
    if not data:
        return 0
    
    required_fields = []
    completed_fields = []
    
    # Common fields for all parties
    common_fields = ["email"]
    required_fields.extend(common_fields)
    
    is_buyer = party_role in ("buyer", "transferee")
    is_seller = party_role in ("seller", "transferor")
    
    if entity_type == "individual":
        required_fields.extend([
            "first_name", "last_name", "date_of_birth", 
            "address", "id_type", "id_number"
        ])
        if is_seller:
            required_fields.append("certified")
    
    elif entity_type in ("entity", "llc", "llc_single", "llc_multi", 
                         "corporation", "corporation_c", "corporation_s",
                         "partnership", "partnership_general", "partnership_lp", "partnership_llp"):
        required_fields.extend([
            "entity_name", "ein", "formation_state", "address"
        ])
        # Signing individual
        if data.get("signer_name") or data.get("first_name"):
            required_fields.append("signer_title" if data.get("signer_name") else "first_name")
        
        if is_buyer:
            # Buyers need beneficial owners and payment sources
            required_fields.extend(["beneficial_owners", "payment_sources"])
        
        required_fields.append("certified")
    
    elif entity_type == "trust":
        required_fields.extend([
            "trust_name", "trust_type", "trust_date", "trustees"
        ])
        
        if is_buyer:
            required_fields.append("payment_sources")
        
        required_fields.append("certified")
    
    # Check which fields are complete
    for field in required_fields:
        value = data.get(field)
        if value is not None:
            if isinstance(value, list):
                if len(value) > 0:
                    completed_fields.append(field)
            elif isinstance(value, dict):
                # For address, check if it has street and city
                if value.get("street") and value.get("city"):
                    completed_fields.append(field)
            elif isinstance(value, bool):
                completed_fields.append(field)
            elif str(value).strip():
                completed_fields.append(field)
    
    if not required_fields:
        return 100
    
    return int((len(completed_fields) / len(required_fields)) * 100)


def validate_party_data(party_role: str, entity_type: str, data: Dict) -> List[str]:
    """
    Validate party data and return list of errors.
    """
    errors = []
    
    if not data:
        errors.append("No data provided")
        return errors
    
    is_buyer = party_role in ("buyer", "transferee")
    
    # Individual validation
    if entity_type == "individual":
        if not data.get("first_name"):
            errors.append("First name is required")
        if not data.get("last_name"):
            errors.append("Last name is required")
        if not data.get("date_of_birth"):
            errors.append("Date of birth is required")
        if not data.get("id_number"):
            errors.append("ID number is required")
        elif data.get("id_type") == "ssn" and not validate_ssn(data.get("id_number", "")):
            errors.append("Invalid SSN format")
        
        if not data.get("address") or not data["address"].get("street"):
            errors.append("Address is required")
    
    # Entity validation
    elif entity_type in ("entity", "llc", "llc_single", "llc_multi",
                         "corporation", "corporation_c", "corporation_s",
                         "partnership", "partnership_general", "partnership_lp", "partnership_llp"):
        if not data.get("entity_name"):
            errors.append("Entity name is required")
        if not data.get("ein"):
            errors.append("EIN is required")
        elif not validate_ein(data.get("ein", "")):
            errors.append("Invalid EIN format")
        if not data.get("formation_state"):
            errors.append("State of formation is required")
        
        # Signing individual
        if not data.get("signer_name") and not data.get("first_name"):
            errors.append("Signing individual name is required")
        
        if is_buyer:
            # Beneficial owners required
            bos = data.get("beneficial_owners", [])
            if not bos:
                errors.append("At least one beneficial owner is required")
            else:
                total_ownership = sum(bo.get("ownership_percentage", 0) for bo in bos)
                if total_ownership > 100:
                    errors.append("Total ownership exceeds 100%")
                
                for i, bo in enumerate(bos, 1):
                    if not bo.get("first_name"):
                        errors.append(f"Beneficial Owner {i}: First name required")
                    if not bo.get("last_name"):
                        errors.append(f"Beneficial Owner {i}: Last name required")
                    if not bo.get("id_number"):
                        errors.append(f"Beneficial Owner {i}: ID number required")
            
            # Payment sources required
            payments = data.get("payment_sources", [])
            if not payments:
                errors.append("At least one payment source is required")
    
    # Trust validation
    elif entity_type == "trust":
        if not data.get("trust_name"):
            errors.append("Trust name is required")
        if not data.get("trust_type"):
            errors.append("Trust type is required")
        if not data.get("trust_date"):
            errors.append("Trust execution date is required")
        
        trustees = data.get("trustees", [])
        if not trustees:
            errors.append("At least one trustee is required")
        
        if is_buyer:
            payments = data.get("payment_sources", [])
            if not payments:
                errors.append("At least one payment source is required")
    
    # Certification check
    if not data.get("certified"):
        errors.append("Certification is required")
    
    return errors


def get_party_warnings(party_role: str, entity_type: str, data: Dict) -> List[str]:
    """
    Get warnings (non-blocking issues) for party data.
    """
    warnings = []
    
    if not data:
        return warnings
    
    is_buyer = party_role in ("buyer", "transferee")
    
    # Age check
    if data.get("date_of_birth"):
        try:
            dob = datetime.fromisoformat(data["date_of_birth"].replace("Z", "+00:00"))
            age = (datetime.now() - dob).days // 365
            if age < 18:
                warnings.append("Individual appears to be under 18")
            if age > 100:
                warnings.append("Please verify date of birth")
        except:
            pass
    
    # Beneficial owner ownership check
    if is_buyer and entity_type in ("entity", "llc", "corporation"):
        bos = data.get("beneficial_owners", [])
        if bos:
            total_ownership = sum(bo.get("ownership_percentage", 0) for bo in bos)
            if total_ownership < 75 and total_ownership > 0:
                warnings.append(f"Only {total_ownership}% ownership listed. Ensure all owners with 25%+ are included.")
    
    # Trust date check
    if entity_type == "trust" and data.get("trust_date"):
        try:
            trust_date = datetime.fromisoformat(data["trust_date"].replace("Z", "+00:00"))
            days_old = (datetime.now() - trust_date).days
            if days_old < 30:
                warnings.append("This trust was created recently (less than 30 days ago)")
        except:
            pass
    
    return warnings


def calculate_party_summary(party) -> Dict[str, Any]:
    """
    Calculate summary fields from a ReportParty model.
    
    Returns dict with:
    - completion_percentage
    - beneficial_owners_count
    - trustees_count
    - payment_sources_count
    - payment_sources_total
    - documents_count
    - has_validation_errors
    - validation_error_count
    """
    data = party.party_data or {}
    party_role = party.party_role
    entity_type = party.entity_type
    
    # Count beneficial owners
    bos = data.get("beneficial_owners", [])
    bo_count = len(bos) if entity_type in ("entity", "llc", "llc_single", "llc_multi",
                                            "corporation", "corporation_c", "corporation_s",
                                            "partnership") else None
    
    # Count trustees
    trustees = data.get("trustees", [])
    trustee_count = len(trustees) if entity_type == "trust" else None
    
    # Count and sum payment sources (buyers only)
    is_buyer = party_role in ("buyer", "transferee")
    payments = data.get("payment_sources", [])
    payment_count = len(payments) if is_buyer else None
    payment_total = sum(p.get("amount", 0) for p in payments) if is_buyer and payments else None
    
    # Count documents
    docs_count = len(party.documents) if hasattr(party, 'documents') and party.documents else 0
    
    # Calculate completion percentage
    completion = calculate_completion_percentage(party_role, entity_type, data)
    
    # Validate
    errors = validate_party_data(party_role, entity_type, data)
    
    return {
        "completion_percentage": completion,
        "beneficial_owners_count": bo_count,
        "trustees_count": trustee_count,
        "payment_sources_count": payment_count,
        "payment_sources_total": payment_total,
        "documents_count": docs_count,
        "has_validation_errors": len(errors) > 0,
        "validation_error_count": len(errors),
    }
