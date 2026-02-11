"""
RERX XML Builder for FinCEN SDTM submissions.

Generates Residential Real Estate Report (RERX) XML per Dec 2025 FinCEN spec.

Maps PCT FinClear wizard_data and party_data to RERX schema:
- reportingPerson → Reporting Person Party (31)
- transferee → Transferee Party (67) + Associated Persons (68)
- transferor → Transferor Party (69)
- transmitter → Transmitter (35) + Contact (37)
- propertyAddress → AssetsAttribute
- paymentSources → ValueTransferActivity
"""
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

from app.config import get_settings
from app.services.fincen.utils import (
    digits_only,
    normalize_phone,
    normalize_zip,
    country_to_iso2,
    sanitize_text,
)

logger = logging.getLogger(__name__)


class PreflightError(Exception):
    """
    Raised when preflight validation fails.
    
    The caller should mark_needs_review with this message and NOT transmit.
    """
    def __init__(self, message: str, errors: List[str] = None):
        super().__init__(message)
        self.message = message
        self.errors = errors or []


# RERX Schema constants
RERX_NAMESPACE = "www.fincen.gov/base"
XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance"
RERX_SCHEMA_LOCATION = "www.fincen.gov/base https://bsaefiling.fincen.gov/resources/EFL_RERXBatchSchema.xsd"

# Sandbox TCC per spec
SANDBOX_TCC = "TBSATEST"


def build_rerx_xml(
    report: Any,
    submission: Any,
    config: Any = None,
) -> Tuple[str, dict]:
    """
    Build RERX-compliant XML from report data.
    
    Args:
        report: Report model instance with wizard_data and parties
        submission: FilingSubmission model instance
        config: Optional settings override (defaults to get_settings())
        
    Returns:
        (xml_string, debug_summary) tuple
        
    Raises:
        PreflightError: If required data is missing or invalid
    """
    if config is None:
        config = get_settings()
    
    debug_summary = {
        "report_id": str(report.id),
        "submission_id": str(submission.id) if submission else None,
        "generated_at": datetime.utcnow().isoformat(),
        "form_type": "RERX",
        "warnings": [],
        "party_counts": {},
        "computed_values": {},
    }
    
    errors = []
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 1: Extract source data
    # ═══════════════════════════════════════════════════════════════════════════
    
    wizard_data = report.wizard_data or {}
    collection = wizard_data.get("collection", {})
    determination = wizard_data.get("determination", {})
    
    # Get parties from report.parties relationship
    parties = list(report.parties) if hasattr(report, 'parties') and report.parties else []
    
    # Find transferee (buyer) and transferor (seller) parties
    transferee_parties = [p for p in parties if p.party_role == "transferee"]
    transferor_parties = [p for p in parties if p.party_role == "transferor"]
    
    debug_summary["party_counts"] = {
        "total_parties": len(parties),
        "transferee_count": len(transferee_parties),
        "transferor_count": len(transferor_parties),
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 2: Validate transmitter configuration
    # ═══════════════════════════════════════════════════════════════════════════
    
    transmitter_tin = config.TRANSMITTER_TIN
    
    # TCC: Use TBSATEST for sandbox, configured TCC for production
    if config.FINCEN_ENV == "sandbox":
        transmitter_tcc = SANDBOX_TCC
        debug_summary["computed_values"]["tcc_source"] = "sandbox_required"
    else:
        transmitter_tcc = config.TRANSMITTER_TCC
        debug_summary["computed_values"]["tcc_source"] = "config"
    
    if not transmitter_tin:
        errors.append("TRANSMITTER_TIN not configured (required for Party 35)")
    elif len(digits_only(transmitter_tin)) != 9:
        errors.append(f"TRANSMITTER_TIN must be 9 digits, got: {len(digits_only(transmitter_tin))}")
    
    if not transmitter_tcc:
        errors.append("TRANSMITTER_TCC not configured (required for Party 35)")
    
    debug_summary["computed_values"]["transmitter_tcc"] = transmitter_tcc
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 3: Extract reporting person (Party 31)
    # ═══════════════════════════════════════════════════════════════════════════
    
    reporting_person = collection.get("reportingPerson", {})
    
    company_name, valid = sanitize_text(reporting_person.get("companyName", ""))
    if not valid or not company_name:
        errors.append("reportingPerson.companyName is required for Party 31")
    
    contact_name = reporting_person.get("contactName", "") or f"{company_name} Contact"
    rp_address = reporting_person.get("address", {})
    rp_phone = reporting_person.get("phone", "")
    rp_email = reporting_person.get("email", "")
    
    debug_summary["computed_values"]["reporting_person_name"] = company_name
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 4: Determine buyer/transferee type and extract data
    # ═══════════════════════════════════════════════════════════════════════════
    
    buyer_type = determination.get("buyerType") or collection.get("buyerType")
    
    if not transferee_parties and buyer_type not in ("entity", "trust"):
        errors.append("No transferee party found and buyer type not determined")
    
    debug_summary["computed_values"]["buyer_type"] = buyer_type
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 5: Extract sellers/transferors
    # ═══════════════════════════════════════════════════════════════════════════
    
    sellers = collection.get("sellers", [])
    if not transferor_parties and not sellers:
        errors.append("No transferor (seller) data found")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 6: Extract property/assets data
    # ═══════════════════════════════════════════════════════════════════════════
    
    property_address = collection.get("propertyAddress", {})
    legal_description = collection.get("legalDescription", "")
    legal_description_type = collection.get("legalDescriptionType", "")
    
    if not property_address.get("street"):
        errors.append("Property address is required for AssetsAttribute")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 7: Extract payment/value transfer data
    # ═══════════════════════════════════════════════════════════════════════════
    
    payment_sources = collection.get("paymentSources", [])
    purchase_price = collection.get("purchasePrice", 0)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 8: Compute filing date and closing date
    # ═══════════════════════════════════════════════════════════════════════════
    
    # Filing date: today, but not before Dec 1, 2025
    filing_date = datetime.utcnow()
    min_filing_date = datetime(2025, 12, 1)
    if filing_date < min_filing_date:
        filing_date = min_filing_date
    
    filing_date_str = filing_date.strftime("%Y%m%d")
    
    # Closing date from collection
    closing_date_str = collection.get("closingDate", "")
    if closing_date_str:
        try:
            closing_date = datetime.strptime(closing_date_str, "%Y-%m-%d")
            closing_date_formatted = closing_date.strftime("%Y%m%d")
        except ValueError:
            closing_date_formatted = filing_date_str
    elif report.closing_date:
        closing_date_formatted = report.closing_date.strftime("%Y%m%d")
    else:
        closing_date_formatted = filing_date_str
    
    debug_summary["computed_values"]["filing_date"] = filing_date_str
    debug_summary["computed_values"]["closing_date"] = closing_date_formatted
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PREFLIGHT CHECK
    # ═══════════════════════════════════════════════════════════════════════════
    
    if errors:
        raise PreflightError(
            f"Preflight validation failed with {len(errors)} error(s)",
            errors=errors
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 9: Build XML
    # ═══════════════════════════════════════════════════════════════════════════
    
    seq_counter = [0]
    
    def next_seq() -> str:
        seq_counter[0] += 1
        return str(seq_counter[0])
    
    # Root element with RERX namespaces
    root = Element("fc2:EFilingBatchXML")
    root.set("ActivityCount", "1")
    root.set("xmlns:fc2", RERX_NAMESPACE)
    root.set("xmlns:xsi", XSI_NAMESPACE)
    root.set("xsi:schemaLocation", RERX_SCHEMA_LOCATION)
    
    # FormTypeCode
    SubElement(root, "fc2:FormTypeCode").text = "RERX"
    
    # Activity element
    activity = SubElement(root, "fc2:Activity")
    activity.set("SeqNum", next_seq())
    
    # A) FilingDateText
    SubElement(activity, "fc2:FilingDateText").text = filing_date_str
    
    # B) ActivityAssociation with InitialReportIndicator
    activity_assoc = SubElement(activity, "fc2:ActivityAssociation")
    activity_assoc.set("SeqNum", next_seq())
    SubElement(activity_assoc, "fc2:InitialReportIndicator").text = "Y"
    
    # C) Party 31: Reporting Person
    _add_reporting_person_party(activity, reporting_person, company_name, contact_name, 
                                 rp_address, rp_phone, rp_email, next_seq, debug_summary)
    
    # D) Party 67: Transferee (buyer) + Associated Persons (68)
    _add_transferee_party(activity, transferee_parties, collection, buyer_type, 
                          next_seq, errors, debug_summary)
    
    # E) Party 69: Transferor(s) (seller)
    _add_transferor_parties(activity, transferor_parties, sellers, next_seq, debug_summary)
    
    # F) Party 35: Transmitter
    _add_transmitter_party(activity, transmitter_tin, transmitter_tcc, next_seq)
    
    # G) Party 37: Transmitter Contact
    _add_transmitter_contact_party(activity, contact_name, next_seq)
    
    # H) AssetsAttribute (property)
    _add_assets_attribute(activity, property_address, legal_description, legal_description_type, next_seq, debug_summary)
    
    # I) ValueTransferActivity (payments + closing)
    _add_value_transfer_activity(activity, payment_sources, purchase_price, 
                                  closing_date_formatted, next_seq, debug_summary)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 10: Generate XML string
    # ═══════════════════════════════════════════════════════════════════════════
    
    xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'
    rough_string = tostring(root, encoding="unicode")
    
    # Pretty print
    try:
        dom = minidom.parseString(rough_string)
        pretty_xml = dom.toprettyxml(indent="  ")
        lines = pretty_xml.split('\n')
        if lines[0].startswith('<?xml'):
            lines = lines[1:]
        xml_content = xml_declaration + '\n'.join(lines)
    except Exception:
        xml_content = xml_declaration + rough_string
    
    debug_summary["final_seq_count"] = seq_counter[0]
    debug_summary["xml_length"] = len(xml_content)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 11: Structural preflight validation
    # ═══════════════════════════════════════════════════════════════════════════
    
    structural_errors = _validate_rerx_structure(xml_content, debug_summary)
    if structural_errors:
        raise PreflightError(
            f"RERX structural validation failed with {len(structural_errors)} error(s)",
            errors=structural_errors
        )
    
    logger.info(
        f"RERX XML built and validated: report={report.id}, "
        f"seq_count={seq_counter[0]}, length={len(xml_content)}"
    )
    
    return xml_content, debug_summary


# ═══════════════════════════════════════════════════════════════════════════════
# PARTY BUILDERS
# ═══════════════════════════════════════════════════════════════════════════════


def _map_reporting_person_category(category: str) -> str:
    """Map frontend category to RERX ReportingPersonTypeCode per 31 CFR 1031.320."""
    mapping = {
        "closing_settlement_agent": "1",
        "closing_statement_preparer": "2",
        "deed_filer": "3",
        "title_insurer": "4",
        "disbursing_escrow_agent": "5",
        "title_evaluator": "6",
        "deed_preparer": "7",
    }
    return mapping.get(category, "1")  # Default to closing/settlement agent


def _add_reporting_person_party(
    activity: Element,
    rp_data: dict,
    company_name: str,
    contact_name: str,
    address: dict,
    phone: str,
    email: str,
    next_seq,
    debug: dict,
) -> None:
    """Add Party 31 (Reporting Person)."""
    party = SubElement(activity, "fc2:Party")
    party.set("SeqNum", next_seq())
    SubElement(party, "fc2:ActivityPartyTypeCode").text = "31"
    
    # Reporting person category/type code (per cascade priority)
    category = rp_data.get("category", "")
    if category:
        SubElement(party, "fc2:ReportingPersonTypeCode").text = _map_reporting_person_category(category)
    else:
        # Default to "1" (closing/settlement agent) — title companies are typically this
        SubElement(party, "fc2:ReportingPersonTypeCode").text = "1"
    
    # Party name
    party_name = SubElement(party, "fc2:PartyName")
    party_name.set("SeqNum", next_seq())
    SubElement(party_name, "fc2:RawPartyFullName").text = company_name[:150]
    
    # Address
    _add_address(party, address, next_seq)
    
    # Phone
    if phone:
        phone_elem = SubElement(party, "fc2:PhoneNumber")
        phone_elem.set("SeqNum", next_seq())
        SubElement(phone_elem, "fc2:PhoneNumberText").text = normalize_phone(phone)[:16]
    
    # Email
    if email:
        SubElement(party, "fc2:PartyEmailAddress").text = email[:100]


def _add_transferee_party(
    activity: Element,
    transferee_parties: List[Any],
    collection: dict,
    buyer_type: str,
    next_seq,
    errors: List[str],
    debug: dict,
) -> None:
    """Add Party 67 (Transferee) and associated persons (68)."""
    party = SubElement(activity, "fc2:Party")
    party.set("SeqNum", next_seq())
    SubElement(party, "fc2:ActivityPartyTypeCode").text = "67"
    
    # Get buyer data
    if buyer_type == "entity":
        buyer_entity = collection.get("buyerEntity", {})
        entity = buyer_entity.get("entity", {})
        
        SubElement(party, "fc2:TransferPartyEntityIndicator").text = "Y"
        
        # Entity name
        party_name = SubElement(party, "fc2:PartyName")
        party_name.set("SeqNum", next_seq())
        legal_name = entity.get("legalName", "") or entity.get("name", "Unknown Entity")
        SubElement(party_name, "fc2:RawPartyFullName").text = legal_name[:150]
        
        # DBA if present
        dba = entity.get("dbaName", "")
        if dba:
            dba_name = SubElement(party, "fc2:PartyName")
            dba_name.set("SeqNum", next_seq())
            SubElement(dba_name, "fc2:PartyNameTypeCode").text = "DBA"
            SubElement(dba_name, "fc2:RawPartyFullName").text = dba[:150]
        
        # Address
        _add_address(party, entity.get("address", {}), next_seq, address_type="1")
        
        # Identification
        ein = entity.get("tin", "") or entity.get("ein", "")
        if ein:
            _add_party_identification(party, "2", digits_only(ein), next_seq)  # EIN
        else:
            _add_party_identification(party, "42", "", next_seq)  # No identification
        
        # Associated persons (beneficial owners, signing individuals)
        beneficial_owners = buyer_entity.get("beneficialOwners", [])
        for bo in beneficial_owners:
            _add_associated_person(activity, party, bo, "68", next_seq, debug)
        
        signing_individuals = collection.get("signingIndividuals", [])
        for si in signing_individuals:
            _add_associated_person(activity, party, si, "68", next_seq, debug)
    
    elif buyer_type == "trust":
        buyer_trust = collection.get("buyerTrust", {})
        trust = buyer_trust.get("trust", {})
        
        SubElement(party, "fc2:TransferPartyTrustIndicator").text = "Y"
        
        # Trust name
        party_name = SubElement(party, "fc2:PartyName")
        party_name.set("SeqNum", next_seq())
        trust_name = trust.get("legalName", "") or trust.get("name", "Unknown Trust")
        SubElement(party_name, "fc2:RawPartyFullName").text = trust_name[:150]
        
        # Trust execution date
        execution_date = trust.get("dateExecuted", "")
        if execution_date:
            try:
                exec_dt = datetime.strptime(execution_date, "%Y-%m-%d")
                SubElement(party, "fc2:TrustInstrumentExecutionDateText").text = exec_dt.strftime("%Y%m%d")
            except ValueError:
                pass
        
        # Revocable indicator
        is_revocable = trust.get("isRevocable", "")
        if is_revocable == "yes":
            SubElement(party, "fc2:RevocableTrustIndicator").text = "Y"
        elif is_revocable == "no":
            SubElement(party, "fc2:RevocableTrustIndicator").text = "N"
        
        # Address
        _add_address(party, trust.get("address", {}), next_seq)
        
        # Identification
        tin = trust.get("tin", "")
        if tin:
            tin_digits = digits_only(tin)
            if len(tin_digits) == 9:
                _add_party_identification(party, "2", tin_digits, next_seq)  # EIN
            else:
                _add_party_identification(party, "42", "", next_seq)
        else:
            _add_party_identification(party, "42", "", next_seq)
        
        # Associated persons (trustees, beneficiaries)
        trustees = buyer_trust.get("trustees", [])
        for trustee in trustees:
            if trustee.get("type") == "individual" and trustee.get("individual"):
                _add_associated_person(activity, party, trustee["individual"], "68", next_seq, debug)
    
    else:
        # Individual buyer - still needs party 67
        party_name = SubElement(party, "fc2:PartyName")
        party_name.set("SeqNum", next_seq())
        SubElement(party_name, "fc2:RawPartyFullName").text = "Unknown Transferee"
        _add_party_identification(party, "42", "", next_seq)
    
    debug["computed_values"]["transferee_type"] = buyer_type


def _add_associated_person(
    activity: Element,
    parent_party: Element,
    person_data: dict,
    party_type: str,
    next_seq,
    debug: dict,
) -> None:
    """Add associated person party (68) with PartyAssociation."""
    # PartyAssociation on parent
    assoc = SubElement(parent_party, "fc2:PartyAssociation")
    assoc.set("SeqNum", next_seq())
    
    assoc_party_seq = next_seq()
    SubElement(assoc, "fc2:AssociatedPartySeqNum").text = assoc_party_seq
    
    # New party for the associated person
    person_party = SubElement(activity, "fc2:Party")
    person_party.set("SeqNum", assoc_party_seq)
    SubElement(person_party, "fc2:ActivityPartyTypeCode").text = party_type
    
    # Name
    first_name = person_data.get("firstName", "") or person_data.get("first_name", "")
    last_name = person_data.get("lastName", "") or person_data.get("last_name", "")
    
    person_name = SubElement(person_party, "fc2:PartyName")
    person_name.set("SeqNum", next_seq())
    
    if last_name:
        SubElement(person_name, "fc2:RawEntityIndividualLastName").text = last_name[:150]
    if first_name:
        SubElement(person_name, "fc2:RawIndividualFirstName").text = first_name[:35]
    
    middle = person_data.get("middleName", "") or person_data.get("middle_name", "")
    if middle:
        SubElement(person_name, "fc2:RawIndividualMiddleName").text = middle[:25]
    
    # DOB
    dob = person_data.get("dateOfBirth", "") or person_data.get("date_of_birth", "")
    if dob:
        try:
            dob_dt = datetime.strptime(dob, "%Y-%m-%d")
            SubElement(person_party, "fc2:IndividualBirthDateText").text = dob_dt.strftime("%Y%m%d")
        except ValueError:
            pass
    
    # Address
    address = person_data.get("address", {})
    if address:
        _add_address(person_party, address, next_seq)
    
    # Identification
    ssn = person_data.get("ssn", "") or person_data.get("idNumber", "")
    id_type = person_data.get("idType", "")
    
    if ssn and id_type in ("ssn", "1"):
        _add_party_identification(person_party, "1", digits_only(ssn), next_seq)
    elif ssn:
        _add_party_identification(person_party, "1", digits_only(ssn), next_seq)
    else:
        _add_party_identification(person_party, "42", "", next_seq)


def _add_transferor_parties(
    activity: Element,
    transferor_parties: List[Any],
    sellers: List[dict],
    next_seq,
    debug: dict,
) -> None:
    """Add Party 69 (Transferor) for each seller."""
    added_count = 0
    
    # First try parties
    for party_obj in transferor_parties:
        party_data = party_obj.party_data if hasattr(party_obj, 'party_data') else {}
        _add_single_transferor(activity, party_data, next_seq, debug)
        added_count += 1
    
    # Then try collection.sellers
    for seller in sellers:
        if added_count >= 10:  # Limit sellers
            break
        
        seller_type = seller.get("type", "individual")
        
        if seller_type == "individual" and seller.get("individual"):
            _add_single_transferor(activity, {"individual": seller["individual"]}, next_seq, debug)
        elif seller_type == "entity" and seller.get("entity"):
            _add_single_transferor(activity, {"entity": seller["entity"]}, next_seq, debug)
        elif seller_type == "trust" and seller.get("trust"):
            _add_single_transferor(activity, {"trust": seller["trust"]}, next_seq, debug)
        else:
            _add_single_transferor(activity, seller, next_seq, debug)
        
        added_count += 1
    
    # Ensure at least one transferor
    if added_count == 0:
        party = SubElement(activity, "fc2:Party")
        party.set("SeqNum", next_seq())
        SubElement(party, "fc2:ActivityPartyTypeCode").text = "69"
        party_name = SubElement(party, "fc2:PartyName")
        party_name.set("SeqNum", next_seq())
        SubElement(party_name, "fc2:RawPartyFullName").text = "Unknown Seller"
        added_count = 1
    
    debug["computed_values"]["transferor_count"] = added_count


def _add_single_transferor(activity: Element, data: dict, next_seq, debug: dict) -> None:
    """Add a single transferor party."""
    party = SubElement(activity, "fc2:Party")
    party.set("SeqNum", next_seq())
    SubElement(party, "fc2:ActivityPartyTypeCode").text = "69"
    
    individual = data.get("individual", {})
    entity = data.get("entity", {})
    trust = data.get("trust", {})
    
    if trust:
        SubElement(party, "fc2:TransferPartyTrustIndicator").text = "Y"
        party_name = SubElement(party, "fc2:PartyName")
        party_name.set("SeqNum", next_seq())
        SubElement(party_name, "fc2:RawPartyFullName").text = (trust.get("legalName", "") or "Unknown Trust")[:150]
        _add_address(party, trust.get("address", {}), next_seq)
    elif entity:
        party_name = SubElement(party, "fc2:PartyName")
        party_name.set("SeqNum", next_seq())
        SubElement(party_name, "fc2:RawPartyFullName").text = (entity.get("legalName", "") or "Unknown Entity")[:150]
        _add_address(party, entity.get("address", {}), next_seq)
    elif individual:
        party_name = SubElement(party, "fc2:PartyName")
        party_name.set("SeqNum", next_seq())
        first = individual.get("firstName", "")
        last = individual.get("lastName", "")
        if last:
            SubElement(party_name, "fc2:RawEntityIndividualLastName").text = last[:150]
        if first:
            SubElement(party_name, "fc2:RawIndividualFirstName").text = first[:35]
        _add_address(party, individual.get("address", {}), next_seq)
    else:
        # Fallback
        party_name = SubElement(party, "fc2:PartyName")
        party_name.set("SeqNum", next_seq())
        name = data.get("name", "") or data.get("fullName", "") or "Unknown Seller"
        SubElement(party_name, "fc2:RawPartyFullName").text = name[:150]


def _add_transmitter_party(
    activity: Element,
    tin: str,
    tcc: str,
    next_seq,
) -> None:
    """Add Party 35 (Transmitter)."""
    party = SubElement(activity, "fc2:Party")
    party.set("SeqNum", next_seq())
    SubElement(party, "fc2:ActivityPartyTypeCode").text = "35"
    
    # TIN (type 4)
    _add_party_identification(party, "4", digits_only(tin), next_seq)
    
    # TCC (type 28)
    _add_party_identification(party, "28", tcc, next_seq)


def _add_transmitter_contact_party(
    activity: Element,
    contact_name: str,
    next_seq,
) -> None:
    """Add Party 37 (Transmitter Contact)."""
    party = SubElement(activity, "fc2:Party")
    party.set("SeqNum", next_seq())
    SubElement(party, "fc2:ActivityPartyTypeCode").text = "37"
    
    party_name = SubElement(party, "fc2:PartyName")
    party_name.set("SeqNum", next_seq())
    SubElement(party_name, "fc2:RawPartyFullName").text = contact_name[:150]


# ═══════════════════════════════════════════════════════════════════════════════
# ASSETS & VALUE TRANSFER
# ═══════════════════════════════════════════════════════════════════════════════


def _map_legal_description_type(desc_type: str) -> str:
    """Map frontend legal description type to RERX code."""
    mapping = {
        "metes_and_bounds": "1",
        "lot_block_subdivision": "2",
        "other": "3",
    }
    return mapping.get(desc_type, "")


def _add_assets_attribute(
    activity: Element,
    property_address: dict,
    legal_description: str,
    legal_description_type: str,
    next_seq,
    debug: dict,
) -> None:
    """Add AssetsAttribute (property info)."""
    assets = SubElement(activity, "fc2:AssetsAttribute")
    assets.set("SeqNum", next_seq())
    
    # Address
    addr = SubElement(assets, "fc2:Address")
    addr.set("SeqNum", next_seq())
    
    street = property_address.get("street", "")
    unit = property_address.get("unit", "")
    if unit:
        street = f"{street}, {unit}"
    
    if street:
        SubElement(addr, "fc2:RawStreetAddress1Text").text = street[:100]
    
    city = property_address.get("city", "")
    if city:
        SubElement(addr, "fc2:RawCityText").text = city[:50]
    
    state = property_address.get("state", "")
    if state:
        SubElement(addr, "fc2:RawStateCodeText").text = state[:2].upper()
    
    zipcode = normalize_zip(property_address.get("zip", ""))
    if zipcode:
        SubElement(addr, "fc2:RawZIPCode").text = zipcode[:10]
    
    country = country_to_iso2(property_address.get("country", "US"))
    SubElement(addr, "fc2:CountryCodeText").text = country
    
    # Legal description type code
    if legal_description_type:
        type_code = _map_legal_description_type(legal_description_type)
        if type_code:
            SubElement(assets, "fc2:LegalDescriptionTypeCode").text = type_code
    
    # Legal description text
    if legal_description:
        SubElement(assets, "fc2:LegalDescriptionText").text = legal_description[:4000]
    
    debug["computed_values"]["property_address"] = street


def _add_value_transfer_activity(
    activity: Element,
    payment_sources: List[dict],
    purchase_price: float,
    closing_date: str,
    next_seq,
    debug: dict,
) -> None:
    """Add ValueTransferActivity."""
    vta = SubElement(activity, "fc2:ValueTransferActivity")
    vta.set("SeqNum", next_seq())
    
    # Total consideration
    total = int(purchase_price) if purchase_price else 0
    if total > 0:
        SubElement(vta, "fc2:TotalConsiderationPaidAmountText").text = str(total)
    else:
        SubElement(vta, "fc2:NoConsiderationPaidIndicator").text = "Y"
    
    # Closing date
    SubElement(vta, "fc2:TransactionClosingDateText").text = closing_date
    
    # Payment details
    for payment in payment_sources:
        detail = SubElement(vta, "fc2:ValueTransferActivityDetail")
        detail.set("SeqNum", next_seq())
        
        amount = payment.get("amount", 0)
        if amount:
            SubElement(detail, "fc2:PaymentAmountText").text = str(int(amount))
        
        # Payment method
        source_type = payment.get("sourceType", "").lower()
        asset_subtype = _map_payment_source_to_asset_subtype(source_type)
        
        asset = SubElement(detail, "fc2:Assets")
        asset.set("SeqNum", next_seq())
        SubElement(asset, "fc2:AssetSubtypeID").text = asset_subtype
        
        # Financial Institution (Party 41) if from account
        institution = payment.get("institutionName", "")
        account_last4 = payment.get("accountNumberLast4", "")
        
        if institution and account_last4:
            fi_party = SubElement(detail, "fc2:Party")
            fi_party.set("SeqNum", next_seq())
            SubElement(fi_party, "fc2:ActivityPartyTypeCode").text = "41"
            
            fi_name = SubElement(fi_party, "fc2:PartyName")
            fi_name.set("SeqNum", next_seq())
            SubElement(fi_name, "fc2:RawPartyFullName").text = institution[:150]
            
            SubElement(fi_party, "fc2:AccountNumberText").text = f"XXXX{account_last4}"
        elif not institution:
            SubElement(detail, "fc2:PaymentNotFromFinancialInstitutionAccountIndicator").text = "Y"
    
    debug["computed_values"]["total_consideration"] = total
    debug["computed_values"]["payment_count"] = len(payment_sources)


def _map_payment_source_to_asset_subtype(source_type: str) -> str:
    """Map payment source type to RERX AssetSubtypeID."""
    mapping = {
        "wire": "517",  # Wire transfer
        "check": "503",  # Cashier's check
        "cashiers_check": "503",
        "personal_check": "502",
        "certified_check": "504",
        "cash": "501",
        "cryptocurrency": "599",  # Other
        "virtual_currency": "599",
        "ach": "517",
        "electronic": "517",
    }
    return mapping.get(source_type, "599")  # Default to Other


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════


def _add_address(
    parent: Element,
    address: dict,
    next_seq,
    address_type: str = None,
) -> None:
    """Add address element."""
    if not address:
        return
    
    addr = SubElement(parent, "fc2:Address")
    addr.set("SeqNum", next_seq())
    
    if address_type:
        SubElement(addr, "fc2:AddressTypeCode").text = address_type
    
    street = address.get("street", "")
    unit = address.get("unit", "")
    if unit:
        street = f"{street}, {unit}"
    
    if street:
        SubElement(addr, "fc2:RawStreetAddress1Text").text = street[:100]
    
    city = address.get("city", "")
    if city:
        SubElement(addr, "fc2:RawCityText").text = city[:50]
    
    state = address.get("state", "")
    if state:
        SubElement(addr, "fc2:RawStateCodeText").text = state[:2].upper()
    
    zipcode = normalize_zip(address.get("zip", ""))
    if zipcode:
        SubElement(addr, "fc2:RawZIPCode").text = zipcode[:10]
    
    country = country_to_iso2(address.get("country", "US"))
    SubElement(addr, "fc2:CountryCodeText").text = country


def _add_party_identification(
    party: Element,
    id_type: str,
    id_number: str,
    next_seq,
) -> None:
    """Add PartyIdentification element."""
    party_id = SubElement(party, "fc2:PartyIdentification")
    party_id.set("SeqNum", next_seq())
    SubElement(party_id, "fc2:PartyIdentificationTypeCode").text = id_type
    if id_number:
        SubElement(party_id, "fc2:PartyIdentificationNumberText").text = id_number


def _validate_rerx_structure(xml_content: str, debug: dict) -> List[str]:
    """
    Validate RERX XML structure.
    
    Checks:
    - FormTypeCode = RERX
    - Required parties: 31, 67, 69, 35, 37
    - AssetsAttribute exists
    - ValueTransferActivity exists
    - SeqNum uniqueness
    """
    import xml.etree.ElementTree as ET
    
    errors = []
    
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        errors.append(f"XML parse error: {e}")
        return errors
    
    # Check FormTypeCode
    form_type = root.find(".//{www.fincen.gov/base}FormTypeCode")
    if form_type is None or form_type.text != "RERX":
        errors.append(f"FormTypeCode must be RERX, found: {form_type.text if form_type is not None else 'None'}")
    
    # Collect party types
    party_types = set()
    for party in root.findall(".//{www.fincen.gov/base}Party"):
        type_elem = party.find("{www.fincen.gov/base}ActivityPartyTypeCode")
        if type_elem is not None and type_elem.text:
            party_types.add(type_elem.text)
    
    # Required parties
    required = {"31", "67", "69", "35", "37"}
    missing = required - party_types
    if missing:
        errors.append(f"Missing required parties: {missing}")
    
    # AssetsAttribute
    assets = root.find(".//{www.fincen.gov/base}AssetsAttribute")
    if assets is None:
        errors.append("AssetsAttribute is required")
    
    # ValueTransferActivity
    vta = root.find(".//{www.fincen.gov/base}ValueTransferActivity")
    if vta is None:
        errors.append("ValueTransferActivity is required")
    
    # SeqNum uniqueness
    seq_nums = []
    for elem in root.iter():
        seq = elem.get("SeqNum")
        if seq:
            if not seq.isdigit():
                errors.append(f"Non-numeric SeqNum: {seq}")
            seq_nums.append(seq)
    
    if len(seq_nums) != len(set(seq_nums)):
        errors.append("Duplicate SeqNum values found")
    
    debug["structural_validation"] = {
        "party_types_found": list(party_types),
        "has_assets": assets is not None,
        "has_vta": vta is not None,
        "seq_count": len(seq_nums),
        "errors": errors,
    }
    
    return errors


def generate_rerx_filename(
    sdtm_username: str,
    submission_id: str = None,
    timestamp: datetime = None,
) -> str:
    """
    Generate RERX SDTM-compliant filename.
    
    Format per spec: RERXST.YYYYMMDDhhmmss.<SDTM-USERNAME>.xml
    
    Args:
        sdtm_username: SDTM username (required per spec as 3rd segment)
        submission_id: Optional submission UUID for uniqueness suffix
        timestamp: Optional timestamp (defaults to now)
        
    Returns:
        Filename string
    """
    if timestamp is None:
        timestamp = datetime.utcnow()
    
    ts_str = timestamp.strftime("%Y%m%d%H%M%S")
    
    # Clean username
    username_clean = re.sub(r'[^a-zA-Z0-9_-]', '', sdtm_username)[:50] or "UNNAMED"
    
    # Spec requires: RERXST.<timestamp>.<sdtm-username>.xml
    # Add suffix for uniqueness if submission_id provided
    if submission_id:
        suffix = str(submission_id).replace("-", "")[:8].lower()
        return f"RERXST.{ts_str}.{username_clean}.{suffix}.xml"
    
    return f"RERXST.{ts_str}.{username_clean}.xml"
