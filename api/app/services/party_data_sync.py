"""
Party Portal → wizard_data sync.

Maps ReportParty.party_data into the wizard_data.collection structure
that the RERX builder expects. Called:
  1. Automatically when a party submits via the portal
  2. As a pre-filing safety net before RERX generation

The RERX builder reads from:
  - collection.buyerEntity.entity (entity buyer info)
  - collection.buyerEntity.beneficialOwners[] (BOs)
  - collection.buyerTrust.trust (trust buyer info)
  - collection.buyerTrust.trustees[] (trustees)
  - collection.sellers[] (seller info with .individual/.entity/.trust sub-objects)
  - collection.signingIndividuals[] (signers)
  - collection.paymentSources[] (payment info)
  - determination.buyerType (to know which buyer fields to read)

The portal writes to ReportParty.party_data using snake_case field names.
This function converts and maps them to the camelCase wizard_data structure.
"""
import logging
import re
from datetime import datetime
from typing import Dict, List, Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Report, ReportParty

logger = logging.getLogger(__name__)


def sync_party_data_to_wizard(db: Session, report_id: str) -> dict:
    """
    Syncs all ReportParty.party_data into report.wizard_data.collection.
    
    Args:
        db: Database session
        report_id: Report UUID (string or UUID)
        
    Returns:
        {
            "synced": True/False,
            "parties_synced": 3,
            "transferees": 1,
            "transferors": 2,
            "fields_mapped": ["buyerEntity", "sellers", "paymentSources"],
            "warnings": ["SSN format converted for seller John Smith"],
            "errors": []  # non-fatal issues
        }
    """
    result = {
        "synced": False,
        "parties_synced": 0,
        "transferees": 0,
        "transferors": 0,
        "fields_mapped": [],
        "warnings": [],
        "errors": [],
    }
    
    try:
        # Load report
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            result["errors"].append(f"Report {report_id} not found")
            return result
        
        # Load all parties for this report
        parties = db.query(ReportParty).filter(
            ReportParty.report_id == report_id
        ).all()
        
        if not parties:
            result["warnings"].append("No parties found for this report")
            result["synced"] = True
            return result
        
        # Initialize wizard_data if needed
        wizard_data = dict(report.wizard_data or {})
        collection = dict(wizard_data.get("collection", {}))
        determination = dict(wizard_data.get("determination", {}))
        
        # Separate parties by role
        transferees = [p for p in parties if p.party_role == "transferee"]
        transferors = [p for p in parties if p.party_role == "transferor"]
        
        result["transferees"] = len(transferees)
        result["transferors"] = len(transferors)
        
        logger.info(f"[SYNC] report={report_id} found {len(transferees)} transferees, {len(transferors)} transferors")
        
        # ═══════════════════════════════════════════════════════════════════════
        # SYNC TRANSFEREE (BUYER) DATA
        # ═══════════════════════════════════════════════════════════════════════
        
        if transferees:
            # Typically there's one buyer. Use the first one.
            buyer = transferees[0]
            party_data = buyer.party_data or {}
            
            # Set buyer type in determination
            buyer_type = _map_entity_type_to_buyer_type(buyer.entity_type)
            determination["buyerType"] = buyer_type
            result["fields_mapped"].append("determination.buyerType")
            
            if buyer.entity_type == "entity":
                # Map entity buyer
                buyer_entity = _map_entity_buyer(party_data, result)
                collection["buyerEntity"] = buyer_entity
                result["fields_mapped"].append("buyerEntity")
                
                # Payment sources go to collection level
                if party_data.get("payment_sources"):
                    collection["paymentSources"] = _map_payment_sources(party_data["payment_sources"], result)
                    result["fields_mapped"].append("paymentSources")
                
                # Signing individuals
                if party_data.get("signer_name"):
                    collection["signingIndividuals"] = _map_signing_individuals(party_data, result)
                    result["fields_mapped"].append("signingIndividuals")
                    
            elif buyer.entity_type == "trust":
                # Map trust buyer
                buyer_trust = _map_trust_buyer(party_data, result)
                collection["buyerTrust"] = buyer_trust
                result["fields_mapped"].append("buyerTrust")
                
                # Payment sources
                if party_data.get("payment_sources"):
                    collection["paymentSources"] = _map_payment_sources(party_data["payment_sources"], result)
                    result["fields_mapped"].append("paymentSources")
                    
            elif buyer.entity_type == "individual":
                # Map individual buyer
                buyer_individual = _map_individual_buyer(party_data, result)
                collection["buyerIndividual"] = buyer_individual
                result["fields_mapped"].append("buyerIndividual")
                
                # Payment sources
                if party_data.get("payment_sources"):
                    collection["paymentSources"] = _map_payment_sources(party_data["payment_sources"], result)
                    result["fields_mapped"].append("paymentSources")
            
            result["parties_synced"] += 1
        
        # ═══════════════════════════════════════════════════════════════════════
        # SYNC TRANSFEROR (SELLER) DATA
        # ═══════════════════════════════════════════════════════════════════════
        
        if transferors:
            sellers = []
            for seller_party in transferors:
                party_data = seller_party.party_data or {}
                seller_type = seller_party.entity_type
                
                seller_entry = _map_seller(party_data, seller_type, result)
                if seller_entry:
                    sellers.append(seller_entry)
                    result["parties_synced"] += 1
            
            if sellers:
                collection["sellers"] = sellers
                result["fields_mapped"].append("sellers")
        
        # ═══════════════════════════════════════════════════════════════════════
        # WRITE BACK TO WIZARD_DATA
        # ═══════════════════════════════════════════════════════════════════════
        
        # Add sync timestamp
        collection["_portal_synced_at"] = datetime.utcnow().isoformat()
        
        # Update wizard_data
        wizard_data["collection"] = collection
        wizard_data["determination"] = determination
        
        # Assign back to report (use a new dict to trigger SQLAlchemy change detection)
        report.wizard_data = dict(wizard_data)
        report.updated_at = datetime.utcnow()
        
        db.flush()
        
        result["synced"] = True
        logger.info(f"[SYNC] report={report_id} completed. Fields: {result['fields_mapped']}")
        
    except Exception as e:
        logger.exception(f"[SYNC] Error syncing report {report_id}: {e}")
        result["errors"].append(str(e))
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# BUYER MAPPERS
# ═══════════════════════════════════════════════════════════════════════════════


def _map_entity_buyer(party_data: dict, result: dict) -> dict:
    """
    Map portal party_data to buyerEntity structure.
    
    RERX builder reads:
        buyerEntity.entity.legalName
        buyerEntity.entity.dbaName
        buyerEntity.entity.tin / .ein
        buyerEntity.entity.address
        buyerEntity.beneficialOwners[]
    """
    entity = {
        "legalName": party_data.get("entity_name", ""),
        "name": party_data.get("entity_name", ""),  # Fallback name
        "dbaName": party_data.get("entity_dba", ""),
        "entityType": party_data.get("entity_type", ""),
        "tin": _strip_hyphens(party_data.get("ein", "")),
        "ein": _strip_hyphens(party_data.get("ein", "")),
        "formationState": party_data.get("formation_state", ""),
        "formationDate": party_data.get("formation_date", ""),
        "formationCountry": party_data.get("formation_country", "US"),
        "address": _map_address(party_data.get("address", {})),
        "phone": _normalize_phone(party_data.get("phone", "")),
        "email": party_data.get("email", ""),
    }
    
    buyer_entity = {
        "entity": entity,
        "beneficialOwners": [],
    }
    
    # Map beneficial owners
    portal_bos = party_data.get("beneficial_owners", [])
    if portal_bos:
        for bo in portal_bos:
            mapped_bo = _map_beneficial_owner(bo, result)
            buyer_entity["beneficialOwners"].append(mapped_bo)
        
        logger.info(f"[SYNC] Mapped {len(portal_bos)} beneficial owners")
    
    return buyer_entity


def _map_trust_buyer(party_data: dict, result: dict) -> dict:
    """
    Map portal party_data to buyerTrust structure.
    
    RERX builder reads:
        buyerTrust.trust.legalName / .name
        buyerTrust.trust.dateExecuted
        buyerTrust.trust.isRevocable
        buyerTrust.trust.tin
        buyerTrust.trust.address
        buyerTrust.trustees[]
    """
    trust = {
        "legalName": party_data.get("trust_name", ""),
        "name": party_data.get("trust_name", ""),
        "trustType": party_data.get("trust_type", ""),
        "dateExecuted": party_data.get("trust_date", ""),
        "executionDate": party_data.get("trust_date", ""),  # Alias
        "isRevocable": "yes" if party_data.get("is_revocable") else "no",
        "tin": _strip_hyphens(party_data.get("trust_ein", "")),
        "address": _map_address(party_data.get("address", {})),
    }
    
    buyer_trust = {
        "trust": trust,
        "trustees": [],
        "settlors": [],
        "beneficiaries": [],
    }
    
    # Map trustees
    portal_trustees = party_data.get("trustees", [])
    if portal_trustees:
        for trustee in portal_trustees:
            mapped_trustee = _map_trustee(trustee, result)
            buyer_trust["trustees"].append(mapped_trustee)
        logger.info(f"[SYNC] Mapped {len(portal_trustees)} trustees")
    
    # Map settlors
    portal_settlors = party_data.get("settlors", [])
    if portal_settlors:
        for settlor in portal_settlors:
            mapped_settlor = _map_settlor(settlor)
            buyer_trust["settlors"].append(mapped_settlor)
    
    # Map beneficiaries
    portal_beneficiaries = party_data.get("beneficiaries", [])
    if portal_beneficiaries:
        for beneficiary in portal_beneficiaries:
            mapped_beneficiary = _map_beneficiary(beneficiary)
            buyer_trust["beneficiaries"].append(mapped_beneficiary)
    
    return buyer_trust


def _map_individual_buyer(party_data: dict, result: dict) -> dict:
    """
    Map portal party_data to buyerIndividual structure.
    
    Note: The RERX builder may or may not have a specific path for individual buyers.
    This provides the structure in case it's needed.
    """
    return {
        "firstName": party_data.get("first_name", ""),
        "middleName": party_data.get("middle_name", ""),
        "lastName": party_data.get("last_name", ""),
        "suffix": party_data.get("suffix", ""),
        "dateOfBirth": party_data.get("date_of_birth", ""),
        "ssn": _strip_hyphens(party_data.get("ssn", "")),
        "citizenship": party_data.get("citizenship", ""),
        "idType": party_data.get("id_type", ""),
        "idNumber": _strip_hyphens(party_data.get("id_number", "")),
        "idJurisdiction": party_data.get("id_jurisdiction", ""),
        "address": _map_address(party_data.get("address", {})),
        "phone": _normalize_phone(party_data.get("phone", "")),
        "email": party_data.get("email", ""),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SELLER MAPPER
# ═══════════════════════════════════════════════════════════════════════════════


def _map_seller(party_data: dict, entity_type: str, result: dict) -> Optional[dict]:
    """
    Map portal party_data to seller entry.
    
    RERX builder reads sellers with structure:
        {
            "type": "individual" | "entity" | "trust",
            "individual": { firstName, lastName, ... },
            "entity": { legalName, ... },
            "trust": { legalName, ... }
        }
    """
    seller = {"type": entity_type}
    
    if entity_type == "individual":
        seller["individual"] = {
            "firstName": party_data.get("first_name", ""),
            "lastName": party_data.get("last_name", ""),
            "middleName": party_data.get("middle_name", ""),
            "suffix": party_data.get("suffix", ""),
            "dateOfBirth": party_data.get("date_of_birth", ""),
            "ssn": _strip_hyphens(party_data.get("ssn", "")),
            "address": _map_address(party_data.get("address", {})),
        }
        
        # Log SSN conversion if applicable
        if party_data.get("ssn") and "-" in party_data.get("ssn", ""):
            name = f"{party_data.get('first_name', '')} {party_data.get('last_name', '')}".strip()
            result["warnings"].append(f"SSN format converted for seller {name}")
            
    elif entity_type == "entity":
        seller["entity"] = {
            "legalName": party_data.get("entity_name", ""),
            "name": party_data.get("entity_name", ""),
            "tin": _strip_hyphens(party_data.get("ein", "")),
            "ein": _strip_hyphens(party_data.get("ein", "")),
            "address": _map_address(party_data.get("address", {})),
        }
        
    elif entity_type == "trust":
        seller["trust"] = {
            "legalName": party_data.get("trust_name", ""),
            "name": party_data.get("trust_name", ""),
            "dateExecuted": party_data.get("trust_date", ""),
            "executionDate": party_data.get("trust_date", ""),
            "tin": _strip_hyphens(party_data.get("trust_ein", "")),
            "address": _map_address(party_data.get("address", {})),
        }
        
        # Map trustees for trust sellers
        portal_trustees = party_data.get("trustees", [])
        if portal_trustees:
            seller["trustees"] = [_map_trustee(t, result) for t in portal_trustees]
    else:
        # Unknown type - try to include raw data
        result["warnings"].append(f"Unknown seller entity_type: {entity_type}")
        seller["name"] = party_data.get("entity_name") or party_data.get("trust_name") or \
                         f"{party_data.get('first_name', '')} {party_data.get('last_name', '')}".strip()
    
    return seller


# ═══════════════════════════════════════════════════════════════════════════════
# ASSOCIATED PERSON MAPPERS
# ═══════════════════════════════════════════════════════════════════════════════


def _map_beneficial_owner(bo: dict, result: dict) -> dict:
    """
    Map portal BO data to wizard_data BO structure.
    
    RERX builder reads both camelCase and snake_case with fallbacks:
        firstName / first_name
        lastName / last_name
        dateOfBirth / date_of_birth
        ssn / idNumber
    """
    # Strip SSN hyphens and log
    ssn = bo.get("id_number", "") or bo.get("ssn", "")
    if ssn and "-" in ssn:
        name = f"{bo.get('first_name', '')} {bo.get('last_name', '')}".strip()
        result["warnings"].append(f"SSN format converted for BO {name}")
    
    return {
        # Provide both formats for compatibility
        "firstName": bo.get("first_name", ""),
        "first_name": bo.get("first_name", ""),
        "lastName": bo.get("last_name", ""),
        "last_name": bo.get("last_name", ""),
        "middleName": bo.get("middle_name", ""),
        "middle_name": bo.get("middle_name", ""),
        "suffix": bo.get("suffix", ""),
        "dateOfBirth": bo.get("date_of_birth", ""),
        "date_of_birth": bo.get("date_of_birth", ""),
        "citizenship": bo.get("citizenship", ""),
        "idType": bo.get("id_type", ""),
        "idNumber": _strip_hyphens(ssn),
        "ssn": _strip_hyphens(ssn),
        "idJurisdiction": bo.get("id_jurisdiction", ""),
        "ownershipPercentage": bo.get("ownership_percentage"),
        "controlType": bo.get("control_type", []),
        "isIndirectOwner": bo.get("is_indirect_owner", False),
        "indirectEntityName": bo.get("indirect_entity_name", ""),
        "trustRole": bo.get("trust_role", ""),
        "address": _map_address(bo.get("address", {})),
    }


def _map_trustee(trustee: dict, result: dict) -> dict:
    """Map portal trustee data to wizard_data trustee structure."""
    trustee_type = trustee.get("type", "individual")
    
    mapped = {
        "type": trustee_type,
    }
    
    if trustee_type == "individual":
        mapped["individual"] = {
            "firstName": trustee.get("full_name", "").split()[0] if trustee.get("full_name") else "",
            "lastName": " ".join(trustee.get("full_name", "").split()[1:]) if trustee.get("full_name") else "",
            "fullName": trustee.get("full_name", ""),
            "name": trustee.get("full_name", ""),
            "dateOfBirth": trustee.get("date_of_birth", ""),
            "ssn": _strip_hyphens(trustee.get("ssn", "")),
            "citizenship": trustee.get("citizenship", ""),
            "address": _map_address(trustee.get("address", {})),
            "phone": _normalize_phone(trustee.get("phone", "")),
            "email": trustee.get("email", ""),
        }
    else:
        mapped["entity"] = {
            "legalName": trustee.get("entity_name", ""),
            "name": trustee.get("entity_name", ""),
            "entityType": trustee.get("entity_type", ""),
            "ein": _strip_hyphens(trustee.get("ein", "")),
            "address": _map_address(trustee.get("business_address", {})),
            "contactName": trustee.get("contact_name", ""),
            "contactPhone": _normalize_phone(trustee.get("contact_phone", "")),
            "contactEmail": trustee.get("contact_email", ""),
        }
    
    return mapped


def _map_settlor(settlor: dict) -> dict:
    """Map portal settlor data."""
    return {
        "fullName": settlor.get("full_name", ""),
        "name": settlor.get("full_name", ""),
        "dateOfBirth": settlor.get("date_of_birth", ""),
        "relationship": settlor.get("relationship", ""),
        "isBeneficiary": settlor.get("is_beneficiary", False),
    }


def _map_beneficiary(beneficiary: dict) -> dict:
    """Map portal beneficiary data."""
    return {
        "fullName": beneficiary.get("full_name", ""),
        "name": beneficiary.get("full_name", ""),
        "dateOfBirth": beneficiary.get("date_of_birth", ""),
        "interestNature": beneficiary.get("interest_nature", ""),
        "percentageInterest": beneficiary.get("percentage_interest"),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT MAPPER
# ═══════════════════════════════════════════════════════════════════════════════


def _map_payment_sources(payment_sources: list, result: dict) -> list:
    """
    Map portal payment_sources to wizard_data paymentSources structure.
    
    RERX builder reads:
        paymentSources[].amount
        paymentSources[].sourceType
        paymentSources[].institutionName
        paymentSources[].accountNumberLast4
    """
    mapped = []
    
    for ps in payment_sources:
        mapped.append({
            "amount": ps.get("amount", 0),
            "sourceType": ps.get("source_type", ""),
            "type": ps.get("source_type", ""),  # Alias
            "paymentMethod": ps.get("payment_method", ""),
            "institutionName": ps.get("institution_name", ""),
            "accountNumberLast4": ps.get("account_last_four", ""),
            "isThirdParty": ps.get("is_third_party", False),
            "thirdPartyName": ps.get("third_party_name", ""),
            "thirdPartyAddress": ps.get("third_party_address", ""),
        })
    
    logger.info(f"[SYNC] Mapped {len(mapped)} payment sources")
    return mapped


def _map_signing_individuals(party_data: dict, result: dict) -> list:
    """
    Map portal signer fields to signingIndividuals array.
    
    RERX builder reads:
        signingIndividuals[].name
        signingIndividuals[].title
        signingIndividuals[].dateOfBirth
    """
    signers = []
    
    if party_data.get("signer_name"):
        signers.append({
            "name": party_data.get("signer_name", ""),
            "fullName": party_data.get("signer_name", ""),
            "title": party_data.get("signer_title", ""),
            "dateOfBirth": party_data.get("signer_dob", ""),
            "address": _map_address(party_data.get("signer_address", {})),
            "signerIsBo": party_data.get("signer_is_bo", ""),
        })
        logger.info(f"[SYNC] Mapped signing individual: {party_data.get('signer_name')}")
    
    return signers


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════


def _map_address(address: dict) -> dict:
    """Map portal address to wizard_data address structure."""
    if not address:
        return {}
    
    return {
        "street": address.get("street", ""),
        "unit": address.get("unit", ""),
        "city": address.get("city", ""),
        "state": address.get("state", ""),
        "zip": address.get("zip", ""),
        "country": _country_to_iso2(address.get("country", "United States")),
    }


def _map_entity_type_to_buyer_type(entity_type: str) -> str:
    """Map ReportParty.entity_type to determination.buyerType."""
    mapping = {
        "individual": "individual",
        "entity": "entity",
        "llc": "entity",
        "corporation": "entity",
        "partnership": "entity",
        "trust": "trust",
        "other": "entity",
    }
    return mapping.get(entity_type, "individual")


def _strip_hyphens(value: str) -> str:
    """Remove hyphens from SSN/EIN strings."""
    if not value:
        return ""
    return value.replace("-", "")


def _normalize_phone(phone: str) -> str:
    """Extract digits from phone number."""
    if not phone:
        return ""
    return re.sub(r'\D', '', phone)


def _country_to_iso2(country: str) -> str:
    """Convert country name to ISO-2 code."""
    if not country:
        return "US"
    
    country_lower = country.lower().strip()
    
    mapping = {
        "united states": "US",
        "united states of america": "US",
        "usa": "US",
        "us": "US",
        "canada": "CA",
        "mexico": "MX",
        "united kingdom": "GB",
        "uk": "GB",
    }
    
    return mapping.get(country_lower, country[:2].upper() if len(country) >= 2 else "US")
