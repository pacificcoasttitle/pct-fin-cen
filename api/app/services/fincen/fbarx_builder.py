"""
FBARX XML Builder for FinCEN SDTM submissions.

Maps PCT FinClear wizard_data and party_data to FBARX schema.

NOTE: This maps RRER-style data (Real Estate Report) pragmatically to FBARX structure
for SDTM transport and schema validation. The mapping is:
- reportingPerson → Transmitter (Party 35)
- reportingPerson.contactName → Transmitter Contact (Party 37)
- buyer (transferee) → Foreign Account Filer (Party 15)
- paymentSources[0].institutionName → Financial Institution (Party 41)
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


# FBARX namespaces
FBARX_NAMESPACE = "https://www.fincen.gov/fbar"
XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance"


def build_fbarx_xml(
    report: Any,
    submission: Any,
    config: Any = None,
) -> Tuple[str, dict]:
    """
    Build FBARX-compliant XML from report data.
    
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
    
    # Find transferee (buyer) party
    transferee_party = None
    for party in parties:
        if party.party_role == "transferee":
            transferee_party = party
            break
    
    debug_summary["party_counts"] = {
        "total_parties": len(parties),
        "transferee_found": transferee_party is not None,
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 2: Validate transmitter configuration
    # ═══════════════════════════════════════════════════════════════════════════
    
    transmitter_tin = config.TRANSMITTER_TIN
    transmitter_tcc = config.TRANSMITTER_TCC
    
    if not transmitter_tin:
        errors.append("TRANSMITTER_TIN not configured (required for Party 35)")
    elif len(digits_only(transmitter_tin)) != 9:
        errors.append(f"TRANSMITTER_TIN must be 9 digits, got: {len(digits_only(transmitter_tin))}")
    
    if not transmitter_tcc:
        errors.append("TRANSMITTER_TCC not configured (required for Party 35)")
    elif not transmitter_tcc.startswith("P") or len(transmitter_tcc) != 8:
        errors.append(f"TRANSMITTER_TCC must start with 'P' and be 8 chars, got: {transmitter_tcc}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 3: Extract reporting person (Transmitter)
    # ═══════════════════════════════════════════════════════════════════════════
    
    reporting_person = collection.get("reportingPerson", {})
    
    company_name, valid = sanitize_text(reporting_person.get("companyName", ""))
    if not valid or not company_name:
        errors.append("reportingPerson.companyName is required for Transmitter")
    
    contact_name = reporting_person.get("contactName", "") or f"{company_name} Contact"
    rp_address = reporting_person.get("address", {})
    rp_phone = reporting_person.get("phone", "")
    
    debug_summary["computed_values"]["transmitter_name"] = company_name
    debug_summary["computed_values"]["transmitter_contact"] = contact_name
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 4: Determine buyer/filer type and extract data
    # ═══════════════════════════════════════════════════════════════════════════
    
    buyer_type = determination.get("buyerType") or collection.get("buyerType")
    filer_data = {}
    filer_type_indicator = None
    filer_type_other_text = None
    
    if buyer_type == "individual":
        # Individual buyer - rare in RRER but supported
        filer_type_indicator = "FilerTypeIndividualIndicator"
        filer_data = _extract_individual_filer(
            transferee_party, collection, errors, debug_summary
        )
    elif buyer_type == "entity":
        # Entity buyer
        filer_type_indicator = "FilerTypeFiduciaryOtherIndicator"
        entity_subtype = determination.get("entitySubtype", "llc")
        filer_type_other_text = _entity_subtype_to_text(entity_subtype)
        filer_data = _extract_entity_filer(
            transferee_party, collection, errors, debug_summary
        )
    elif buyer_type == "trust":
        # Trust buyer
        filer_type_indicator = "FilerTypeFiduciaryOtherIndicator"
        filer_type_other_text = "trust"
        filer_data = _extract_trust_filer(
            transferee_party, collection, errors, debug_summary
        )
    else:
        errors.append(f"Invalid or missing buyer type: {buyer_type}")
    
    debug_summary["computed_values"]["buyer_type"] = buyer_type
    debug_summary["computed_values"]["filer_type_indicator"] = filer_type_indicator
    debug_summary["computed_values"]["filer_type_other_text"] = filer_type_other_text
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 5: Extract payment/account data
    # ═══════════════════════════════════════════════════════════════════════════
    
    payment_sources = collection.get("paymentSources", [])
    purchase_price = collection.get("purchasePrice", 0)
    
    account_data = _extract_account_data(
        payment_sources, purchase_price, str(report.id), errors, debug_summary
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 6: Compute calendar year
    # ═══════════════════════════════════════════════════════════════════════════
    
    closing_date_str = collection.get("closingDate", "")
    if closing_date_str:
        try:
            closing_date = datetime.strptime(closing_date_str, "%Y-%m-%d")
            calendar_year = closing_date.year
        except ValueError:
            calendar_year = datetime.utcnow().year - 1
    elif report.closing_date:
        calendar_year = report.closing_date.year
    else:
        calendar_year = datetime.utcnow().year - 1
    
    debug_summary["computed_values"]["calendar_year"] = calendar_year
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PREFLIGHT CHECK
    # ═══════════════════════════════════════════════════════════════════════════
    
    if errors:
        raise PreflightError(
            f"Preflight validation failed with {len(errors)} error(s)",
            errors=errors
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 7: Build XML
    # ═══════════════════════════════════════════════════════════════════════════
    
    seq_counter = [0]  # Mutable counter for sequence numbers
    
    def next_seq() -> str:
        seq_counter[0] += 1
        return str(seq_counter[0])
    
    # Root element with namespaces
    root = Element("EFilingBatchXML")
    root.set("xmlns", FBARX_NAMESPACE)
    root.set("xmlns:xsi", XSI_NAMESPACE)
    
    # Activity element
    activity = SubElement(root, "Activity")
    activity.set("SeqNum", next_seq())
    
    # --- Party 35: Transmitter ---
    party35 = SubElement(activity, "Party")
    party35.set("SeqNum", next_seq())
    SubElement(party35, "ActivityPartyTypeCode").text = "35"
    
    party35_name = SubElement(party35, "PartyName")
    party35_name.set("SeqNum", next_seq())
    SubElement(party35_name, "RawPartyFullName").text = company_name
    
    _add_address_element(party35, rp_address, next_seq, debug_summary)
    _add_phone_element(party35, rp_phone, next_seq)
    
    # Transmitter TIN (Type 4)
    party35_id1 = SubElement(party35, "PartyIdentification")
    party35_id1.set("SeqNum", next_seq())
    SubElement(party35_id1, "PartyIdentificationTypeCode").text = "4"
    SubElement(party35_id1, "PartyIdentificationNumberText").text = digits_only(transmitter_tin)
    
    # Transmitter TCC (Type 28)
    party35_id2 = SubElement(party35, "PartyIdentification")
    party35_id2.set("SeqNum", next_seq())
    SubElement(party35_id2, "PartyIdentificationTypeCode").text = "28"
    SubElement(party35_id2, "PartyIdentificationNumberText").text = transmitter_tcc
    
    # --- Party 37: Transmitter Contact ---
    party37 = SubElement(activity, "Party")
    party37.set("SeqNum", next_seq())
    SubElement(party37, "ActivityPartyTypeCode").text = "37"
    
    party37_name = SubElement(party37, "PartyName")
    party37_name.set("SeqNum", next_seq())
    SubElement(party37_name, "RawPartyFullName").text = contact_name
    
    # --- Party 15: Foreign Account Filer ---
    party15 = SubElement(activity, "Party")
    party15.set("SeqNum", next_seq())
    SubElement(party15, "ActivityPartyTypeCode").text = "15"
    
    # Filer type indicator
    SubElement(party15, filer_type_indicator).text = "Y"
    if filer_type_other_text:
        SubElement(party15, "FilerTypeOtherText").text = filer_type_other_text
    
    # Filer flags
    SubElement(party15, "FilerFinancialInterest25ForeignAccountIndicator").text = "N"
    SubElement(party15, "SignatureAuthoritiesIndicator").text = "N"
    
    # Filer name
    _add_filer_name_element(party15, filer_data, buyer_type, next_seq)
    
    # Filer address
    _add_address_element(party15, filer_data.get("address", {}), next_seq, debug_summary)
    
    # Filer identification
    _add_filer_identification(party15, filer_data, next_seq)
    
    # --- ForeignAccountActivity ---
    faa = SubElement(activity, "ForeignAccountActivity")
    faa.set("SeqNum", next_seq())
    SubElement(faa, "ReportCalendarYearText").text = str(calendar_year)
    
    # --- Account ---
    account_elem = SubElement(faa, "Account")
    account_elem.set("SeqNum", next_seq())
    SubElement(account_elem, "EFilingAccountTypeCode").text = "141"  # Separately Owned
    SubElement(account_elem, "AccountTypeCode").text = account_data["account_type_code"]
    SubElement(account_elem, "AccountNumberText").text = account_data["account_number"]
    
    if account_data.get("max_value"):
        SubElement(account_elem, "AccountMaximumValueAmountText").text = str(account_data["max_value"])
    else:
        SubElement(account_elem, "UnknownMaximumValueIndicator").text = "Y"
    
    # Account owner count (set to 0 as we don't include 42/43/44 parties)
    SubElement(account_elem, "AccountJointOwnerQuantityText").text = "0"
    SubElement(account_elem, "NoUSPersonsOwnAccountIndicator").text = "N"
    
    # --- Party 41: Financial Institution ---
    party41 = SubElement(account_elem, "Party")
    party41.set("SeqNum", next_seq())
    SubElement(party41, "ActivityPartyTypeCode").text = "41"
    
    party41_name = SubElement(party41, "PartyName")
    party41_name.set("SeqNum", next_seq())
    SubElement(party41_name, "RawPartyFullName").text = account_data["institution_name"]
    
    # FI Address - use reporting person address if no specific FI address
    fi_address = rp_address.copy()
    fi_address["_is_fi"] = True
    _add_address_element(party41, fi_address, next_seq, debug_summary)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 8: Finalize and validate
    # ═══════════════════════════════════════════════════════════════════════════
    
    # Add root-level counts
    root.set("TotalActivityCount", "1")
    root.set("TotalPartyCount", "4")  # Parties 35, 37, 15, 41
    root.set("TotalAccountCount", "1")
    
    # Generate XML string
    xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'
    rough_string = tostring(root, encoding="unicode")
    
    # Pretty print
    try:
        dom = minidom.parseString(rough_string)
        pretty_xml = dom.toprettyxml(indent="  ")
        # Remove extra XML declaration from minidom
        lines = pretty_xml.split('\n')
        if lines[0].startswith('<?xml'):
            lines = lines[1:]
        xml_content = xml_declaration + '\n'.join(lines)
    except Exception:
        xml_content = xml_declaration + rough_string
    
    debug_summary["final_seq_count"] = seq_counter[0]
    debug_summary["xml_length"] = len(xml_content)
    
    logger.info(
        f"FBARX XML built: report={report.id}, "
        f"seq_count={seq_counter[0]}, length={len(xml_content)}"
    )
    
    return xml_content, debug_summary


def _extract_individual_filer(
    party: Any,
    collection: dict,
    errors: List[str],
    debug: dict,
) -> dict:
    """Extract filer data for individual buyer."""
    data = {}
    
    # Try party_data first, then fall back to collection
    party_data = party.party_data if party and hasattr(party, 'party_data') else {}
    
    # Look for individual info
    individual = party_data.get("individual", {})
    if not individual:
        # Fall back to collection.buyerEntity for edge cases
        buyer_entity = collection.get("buyerEntity", {})
        if buyer_entity:
            # This shouldn't happen for individual, but handle gracefully
            errors.append("Individual buyer but buyerEntity found - data structure mismatch")
    
    data["first_name"] = individual.get("firstName", "")
    data["middle_name"] = individual.get("middleName", "")
    data["last_name"] = individual.get("lastName", "")
    data["suffix"] = individual.get("suffix", "")
    data["date_of_birth"] = individual.get("dateOfBirth", "")
    data["address"] = individual.get("address", {})
    
    # Identification
    ssn = individual.get("ssn", "")
    passport = individual.get("passport", "") or individual.get("idNumber", "")
    foreign_tin = individual.get("foreignTin", "")
    
    if ssn:
        data["id_type"] = "1"  # SSN/ITIN
        data["id_number"] = digits_only(ssn)
    elif passport:
        data["id_type"] = "6"  # Passport
        data["id_number"] = passport
        data["id_country"] = individual.get("issuingJurisdiction", "")
    elif foreign_tin:
        data["id_type"] = "9"  # Foreign TIN
        data["id_number"] = foreign_tin
        data["id_country"] = individual.get("citizenship", "")
    else:
        errors.append("Individual buyer missing identification (SSN, passport, or foreign TIN)")
    
    # Validation
    if not data["last_name"]:
        errors.append("Individual buyer missing last name")
    if not data["first_name"]:
        errors.append("Individual buyer missing first name")
    if not data.get("address", {}).get("street"):
        errors.append("Individual buyer missing address")
    
    debug["computed_values"]["filer_name"] = f"{data['first_name']} {data['last_name']}"
    
    return data


def _extract_entity_filer(
    party: Any,
    collection: dict,
    errors: List[str],
    debug: dict,
) -> dict:
    """Extract filer data for entity buyer."""
    data = {}
    
    # Try party_data first
    party_data = party.party_data if party and hasattr(party, 'party_data') else {}
    
    # Look for entity info
    entity = party_data.get("entity", {})
    if not entity:
        # Fall back to collection.buyerEntity
        buyer_entity = collection.get("buyerEntity", {})
        entity = buyer_entity.get("entity", {})
    
    data["entity_name"] = entity.get("legalName", "") or entity.get("name", "")
    data["dba_name"] = entity.get("dbaName", "")
    data["address"] = entity.get("address", {})
    
    # Identification - EIN preferred
    ein = entity.get("tin", "") or entity.get("ein", "")
    foreign_tin = entity.get("foreignTin", "")
    
    if ein:
        data["id_type"] = "2"  # EIN
        data["id_number"] = digits_only(ein)
    elif foreign_tin:
        data["id_type"] = "9"  # Foreign TIN
        data["id_number"] = foreign_tin
        data["id_country"] = entity.get("countryOfFormation", "")
    else:
        errors.append("Entity buyer missing identification (EIN or foreign TIN)")
    
    # Validation
    if not data["entity_name"]:
        errors.append("Entity buyer missing legal name")
    if not data.get("address", {}).get("street"):
        errors.append("Entity buyer missing address")
    
    debug["computed_values"]["filer_name"] = data["entity_name"]
    
    return data


def _extract_trust_filer(
    party: Any,
    collection: dict,
    errors: List[str],
    debug: dict,
) -> dict:
    """Extract filer data for trust buyer."""
    data = {}
    
    # Try party_data first
    party_data = party.party_data if party and hasattr(party, 'party_data') else {}
    
    # Look for trust info
    trust = party_data.get("trust", {})
    if not trust:
        # Fall back to collection.buyerTrust
        buyer_trust = collection.get("buyerTrust", {})
        trust = buyer_trust.get("trust", {})
    
    data["trust_name"] = trust.get("legalName", "") or trust.get("name", "")
    data["address"] = trust.get("address", {})
    
    # Identification - Trust EIN
    ein = trust.get("tin", "") or trust.get("ein", "")
    
    if ein:
        # Determine if EIN-like (9 digits) or foreign style
        ein_digits = digits_only(ein)
        if len(ein_digits) == 9:
            data["id_type"] = "2"  # EIN
            data["id_number"] = ein_digits
        else:
            data["id_type"] = "9"  # Foreign TIN
            data["id_number"] = ein
    else:
        errors.append("Trust buyer missing identification (EIN)")
    
    # Validation
    if not data["trust_name"]:
        errors.append("Trust buyer missing legal name")
    if not data.get("address", {}).get("street"):
        errors.append("Trust buyer missing address")
    
    debug["computed_values"]["filer_name"] = data["trust_name"]
    
    return data


def _extract_account_data(
    payment_sources: List[dict],
    purchase_price: float,
    report_id: str,
    errors: List[str],
    debug: dict,
) -> dict:
    """Extract account data from payment sources."""
    data = {}
    
    if payment_sources and len(payment_sources) > 0:
        payment = payment_sources[0]
        data["institution_name"] = payment.get("institutionName", "Unknown Financial Institution")
        
        # Account type
        account_type = payment.get("accountType", "").lower()
        data["account_type_code"] = "2" if "securities" in account_type else "1"
        
        # Account number - last 4 or generated
        last4 = payment.get("accountNumberLast4", "")
        if last4:
            data["account_number"] = f"XXXX{last4}"
        else:
            data["account_number"] = f"ACCT{report_id.replace('-', '')[:12].upper()}"
        
        # Amount
        amount = payment.get("amount", 0) or purchase_price
        if amount:
            data["max_value"] = int(amount)
        else:
            data["max_value"] = None
    else:
        # Fallback with purchase price
        data["institution_name"] = "Unknown Financial Institution"
        data["account_type_code"] = "1"
        data["account_number"] = f"ACCT{report_id.replace('-', '')[:12].upper()}"
        data["max_value"] = int(purchase_price) if purchase_price else None
        
        debug["warnings"].append("No payment sources found, using defaults")
    
    debug["computed_values"]["institution_name"] = data["institution_name"]
    debug["computed_values"]["account_number"] = data["account_number"]
    
    return data


def _entity_subtype_to_text(subtype: str) -> str:
    """Convert entity subtype to FBARX FilerTypeOtherText."""
    mapping = {
        "llc": "limited liability company",
        "corporation_domestic": "domestic corporation",
        "corporation_foreign": "foreign corporation",
        "partnership": "partnership",
        "pension_plan": "pension plan",
        "other": "other entity",
    }
    return mapping.get(subtype, "limited liability company")


def _add_address_element(
    parent: Element,
    address: dict,
    next_seq,
    debug: dict,
) -> None:
    """Add address sub-elements to parent."""
    if not address:
        return
    
    is_fi = address.get("_is_fi", False)
    
    addr_elem = SubElement(parent, "Address")
    addr_elem.set("SeqNum", next_seq())
    
    # Street
    street = address.get("street", "")
    unit = address.get("unit", "")
    if unit:
        street = f"{street}, {unit}"
    if street:
        SubElement(addr_elem, "RawStreetAddress1Text").text = street[:100]
    
    # City
    city = address.get("city", "")
    if city:
        SubElement(addr_elem, "RawCityText").text = city[:50]
    
    # Country
    country = country_to_iso2(address.get("country", "US"))
    SubElement(addr_elem, "CountryCodeText").text = country
    
    # State - only include for US, CA, MX per FBARX guide
    # For FI addresses, omit state if not US/CA/MX
    state = address.get("state", "")
    if state and country in ("US", "CA", "MX"):
        SubElement(addr_elem, "RawStateCodeText").text = state[:2].upper()
    elif state and not is_fi:
        # Non-FI addresses can include state
        SubElement(addr_elem, "RawStateCodeText").text = state[:2].upper()
    
    # ZIP
    zipcode = normalize_zip(address.get("zip", ""))
    if zipcode:
        SubElement(addr_elem, "RawZIPCode").text = zipcode[:10]


def _add_phone_element(parent: Element, phone: str, next_seq) -> None:
    """Add phone number element."""
    if not phone:
        return
    
    phone_digits = normalize_phone(phone)
    if phone_digits:
        phone_elem = SubElement(parent, "PhoneNumber")
        phone_elem.set("SeqNum", next_seq())
        SubElement(phone_elem, "PhoneNumberText").text = phone_digits[:15]


def _add_filer_name_element(
    parent: Element,
    filer_data: dict,
    buyer_type: str,
    next_seq,
) -> None:
    """Add appropriate name element based on buyer type."""
    name_elem = SubElement(parent, "PartyName")
    name_elem.set("SeqNum", next_seq())
    
    if buyer_type == "individual":
        # Individual name fields
        last_name = filer_data.get("last_name", "")
        first_name = filer_data.get("first_name", "")
        middle_name = filer_data.get("middle_name", "")
        suffix = filer_data.get("suffix", "")
        
        SubElement(name_elem, "RawEntityIndividualLastName").text = last_name[:150]
        SubElement(name_elem, "RawIndividualFirstName").text = first_name[:35]
        if middle_name:
            SubElement(name_elem, "RawIndividualMiddleName").text = middle_name[:25]
        if suffix:
            SubElement(name_elem, "RawIndividualNameSuffixText").text = suffix[:5]
        
        # DOB
        dob = filer_data.get("date_of_birth", "")
        if dob:
            try:
                dob_parsed = datetime.strptime(dob, "%Y-%m-%d")
                dob_formatted = dob_parsed.strftime("%Y%m%d")
                SubElement(parent, "IndividualBirthDateText").text = dob_formatted
            except ValueError:
                pass
    else:
        # Entity/Trust name
        full_name = (
            filer_data.get("entity_name", "") or
            filer_data.get("trust_name", "") or
            "Unknown Entity"
        )
        SubElement(name_elem, "RawPartyFullName").text = full_name[:150]


def _add_filer_identification(parent: Element, filer_data: dict, next_seq) -> None:
    """Add filer identification element."""
    id_type = filer_data.get("id_type")
    id_number = filer_data.get("id_number")
    
    if not id_type or not id_number:
        return
    
    id_elem = SubElement(parent, "PartyIdentification")
    id_elem.set("SeqNum", next_seq())
    SubElement(id_elem, "PartyIdentificationTypeCode").text = id_type
    SubElement(id_elem, "PartyIdentificationNumberText").text = id_number
    
    # Add issuer country for foreign IDs
    id_country = filer_data.get("id_country", "")
    if id_type in ("6", "9") and id_country:
        country_code = country_to_iso2(id_country)
        if country_code != "US":
            SubElement(id_elem, "OtherIssuerCountryText").text = country_code


def generate_sdtm_filename(
    org_name: str,
    submission_id: str,
    timestamp: datetime = None,
) -> str:
    """
    Generate SDTM-compliant filename.
    
    Format: FBARXST.YYYYMMDDhhmmss.<OrgName>.<submission_short>.xml
    
    Args:
        org_name: Organization name (sanitized alphanumeric)
        submission_id: Submission UUID
        timestamp: Optional timestamp (defaults to now)
        
    Returns:
        Filename string
    """
    if timestamp is None:
        timestamp = datetime.utcnow()
    
    ts_str = timestamp.strftime("%Y%m%d%H%M%S")
    
    # Sanitize org name
    org_clean = re.sub(r'[^a-zA-Z0-9]', '', org_name)[:20] or "UNNAMED"
    
    # Short submission ID
    sub_short = str(submission_id).replace("-", "")[:12].lower()
    
    return f"FBARXST.{ts_str}.{org_clean}.{sub_short}.xml"
