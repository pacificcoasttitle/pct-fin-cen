# CURSOR PROMPT: Party Portal Data Bridge + End-to-End Validation (Shark #57)

## Context

Investigation confirmed the Party Portal is **fully functional** — tokens, forms, email delivery, autosave, status tracking, validation — all working. The portal collects every field the RERX builder needs.

**The single problem:** The portal writes to `ReportParty.party_data`, but the RERX builder reads from `report.wizard_data.collection`. There is no sync between them. This means portal-submitted data never reaches the XML generator.

**This is a plumbing fix, not a feature build.**

## Architecture Decision: Option B — Sync Function

We are NOT rewriting the RERX builder (Option A). The builder passed 18/18 structural validation checks. We are keeping it untouched.

Instead, we add a **sync function** that copies `ReportParty.party_data` into the correct locations in `report.wizard_data.collection` — so the builder finds exactly what it expects.

**Why Option B:**
- Zero changes to the validated RERX builder
- Single point of transformation, easy to debug
- Can be called on party submit AND as a pre-filing safety net
- If the portal data shape changes later, only the sync function needs updating

---

## PHASE 1: The Sync Function

### Create `api/app/services/party_data_sync.py` (NEW FILE)

This function takes a Report, loads all its ReportParty records, and maps their `party_data` into `wizard_data.collection`.

```python
"""
Party Portal → wizard_data sync.

Maps ReportParty.party_data into the wizard_data.collection structure
that the RERX builder expects. Called:
  1. Automatically when a party submits via the portal
  2. As a pre-filing safety net before RERX generation
"""
```

### Mapping Rules

The sync function must handle these party types and map them to the EXACT structure the RERX builder reads:

#### Transferee (Buyer) — Individual

**Source:** `ReportParty` where `party_role="transferee"` and `entity_type="individual"`
**Target:** `wizard_data.collection` fields

```python
# Portal party_data field → wizard_data.collection field
{
    "first_name"     → collection["buyerIndividual"]["firstName"]  # or wherever the builder reads individual buyer
    "middle_name"    → collection["buyerIndividual"]["middleName"]
    "last_name"      → collection["buyerIndividual"]["lastName"]
    "suffix"         → collection["buyerIndividual"]["suffix"]
    "date_of_birth"  → collection["buyerIndividual"]["dateOfBirth"]
    "ssn"            → collection["buyerIndividual"]["ssn"]  # strip hyphens: "123-45-6789" → "123456789"
    "citizenship"    → collection["buyerIndividual"]["citizenship"]
    "id_type"        → collection["buyerIndividual"]["idType"]
    "id_number"      → collection["buyerIndividual"]["idNumber"]
    "id_jurisdiction"→ collection["buyerIndividual"]["idJurisdiction"]
    "address.street" → collection["buyerIndividual"]["address"]["street"]
    "address.city"   → collection["buyerIndividual"]["address"]["city"]
    "address.state"  → collection["buyerIndividual"]["address"]["state"]
    "address.zip"    → collection["buyerIndividual"]["address"]["zip"]
    "address.country"→ collection["buyerIndividual"]["address"]["country"]
    "phone"          → collection["buyerIndividual"]["phone"]
    "email"          → collection["buyerIndividual"]["email"]
}
```

**IMPORTANT:** Before mapping, you MUST look at the actual RERX builder code (`api/app/services/fincen/rerx_builder.py`) to see the EXACT field paths it reads for each buyer type. The mapping above is illustrative — use the real paths from the builder. Grep for every `.get(` call in the builder to find the exact keys.

#### Transferee (Buyer) — Entity

**Source:** `ReportParty` where `party_role="transferee"` and `entity_type="entity"`
**Target:** `wizard_data.collection.buyerEntity`

```python
# Portal party_data field → wizard_data.collection field
{
    "entity_name"       → collection["buyerEntity"]["entity"]["legalName"]
    "entity_dba"        → collection["buyerEntity"]["entity"]["dba"]
    "entity_type"       → collection["buyerEntity"]["entity"]["entityType"]  # or entitySubtype
    "ein"               → collection["buyerEntity"]["entity"]["ein"]  # strip hyphens
    "formation_state"   → collection["buyerEntity"]["entity"]["formationState"]
    "formation_date"    → collection["buyerEntity"]["entity"]["formationDate"]
    "address"           → collection["buyerEntity"]["entity"]["address"]
    "phone"             → collection["buyerEntity"]["entity"]["phone"]
    "email"             → collection["buyerEntity"]["entity"]["email"]
}

# Beneficial owners
"beneficial_owners"  → collection["buyerEntity"]["beneficialOwners"]

# Each BO needs mapping:
portal BO field          → wizard_data BO field
"first_name"             → "firstName"
"last_name"              → "lastName"
"middle_name"            → "middleName"
"suffix"                 → "suffix"
"date_of_birth"          → "dateOfBirth"
"id_type"                → "idType"
"id_number"              → "idNumber"  # strip hyphens if SSN
"id_jurisdiction"        → "idJurisdiction"
"citizenship"            → "citizenship"
"ownership_percentage"   → "ownershipPercentage"
"control_type"           → "controlType"
"is_indirect_owner"      → "isIndirectOwner"
"indirect_entity_name"   → "indirectEntityName"
"trust_role"             → "trustRole"
"address"                → "address"

# Payment sources
"payment_sources"  → collection["paymentSources"]

# Each payment needs mapping:
portal payment field     → wizard_data payment field
"source_type"            → "sourceType"  # or "type"
"amount"                 → "amount"
"payment_method"         → "paymentMethod"
"institution_name"       → "institutionName"
"account_last_four"      → "accountNumberLast4"
"is_third_party"         → "isThirdParty"
"third_party_name"       → "thirdPartyName"

# Signing individual (from entity form)
"signer_name"            → collection["signingIndividuals"][0]["name"]  # or however builder reads it
"signer_title"           → collection["signingIndividuals"][0]["title"]
"signer_dob"             → collection["signingIndividuals"][0]["dateOfBirth"]
```

#### Transferee (Buyer) — Trust

**Source:** `ReportParty` where `party_role="transferee"` and `entity_type="trust"`
**Target:** `wizard_data.collection.buyerTrust`

```python
{
    "trust_name"    → collection["buyerTrust"]["trust"]["trustName"]
    "trust_type"    → collection["buyerTrust"]["trust"]["trustType"]
    "trust_date"    → collection["buyerTrust"]["trust"]["executionDate"]
    "trust_ein"     → collection["buyerTrust"]["trust"]["ein"]
    "is_revocable"  → collection["buyerTrust"]["trust"]["isRevocable"]
    "trustees"      → collection["buyerTrust"]["trustees"]
    "settlors"      → collection["buyerTrust"]["settlors"]
    "beneficiaries" → collection["buyerTrust"]["beneficiaries"]
}

# Each trustee needs mapping similar to BO fields:
portal trustee field     → wizard_data trustee field
"first_name"             → "firstName"
"last_name"              → "lastName"
... (same pattern as BO)
```

#### Transferor (Seller) — All Types

**Source:** `ReportParty` records where `party_role="transferor"`
**Target:** `wizard_data.collection.sellers[]`

There may be MULTIPLE sellers. Each `ReportParty` with `party_role="transferor"` becomes one entry in `collection.sellers[]`.

```python
# For individual seller:
{
    "first_name"     → sellers[i]["firstName"]
    "last_name"      → sellers[i]["lastName"]
    "middle_name"    → sellers[i]["middleName"]
    "suffix"         → sellers[i]["suffix"]
    "date_of_birth"  → sellers[i]["dateOfBirth"]
    "ssn"            → sellers[i]["ssn"]  # strip hyphens
    "address"        → sellers[i]["address"]
    "type"           → sellers[i]["type"]  = "individual"
}

# For entity seller:
{
    "entity_name"    → sellers[i]["entityName"]  # or however builder reads
    "ein"            → sellers[i]["ein"]
    "address"        → sellers[i]["address"]
    "type"           → sellers[i]["type"]  = "entity"
}

# For trust seller:
{
    "trust_name"     → sellers[i]["trustName"]
    "trust_date"     → sellers[i]["executionDate"]
    "trustees"       → sellers[i]["trustees"]
    "type"           → sellers[i]["type"]  = "trust"
}
```

### Critical Implementation Rules

1. **READ THE BUILDER FIRST.** Before writing ANY mapping code, `cat api/app/services/fincen/rerx_builder.py` and trace every `.get()` call. The mappings above are ILLUSTRATIVE — the real field names in wizard_data may use camelCase, snake_case, or nested structures. Match EXACTLY what the builder reads.

2. **Do NOT modify wizard_data fields that the portal doesn't own.** The sync must only write to the party-related sections. Never overwrite:
   - `collection.reportingPerson` (staff-entered)
   - `collection.propertyAddress` (wizard-entered)
   - `collection.purchasePrice` (wizard-entered)
   - `collection.closingDate` (wizard-entered)
   - `determination.*` (wizard logic)

3. **Handle field format differences:**
   - SSN: Portal stores `"123-45-6789"`, builder may expect `"123456789"` → strip hyphens
   - EIN: Portal stores `"12-3456789"`, builder may expect `"123456789"` → strip hyphens
   - Phone: Portal stores `"(555) 123-4567"`, builder may expect digits only → strip to digits
   - Country: Portal stores `"United States"`, builder may expect `"US"` → map to ISO-2
   - Dates: Portal stores `"1970-05-15"`, builder may expect `"YYYYMMDD"` → check which format

4. **Merge, don't clobber.** If wizard_data.collection already has some data (e.g., staff partially entered buyer info before sending portal link), the sync should OVERWRITE the party-specific fields with portal data (portal is authoritative for party info) but PRESERVE non-party fields.

5. **Set buyerType in determination.** The builder reads `determination.buyerType` to decide which buyer fields to use. The sync should ensure this is set based on the transferee's `entity_type`:
   - `entity_type="individual"` → `determination.buyerType = "individual"`
   - `entity_type="entity"` → `determination.buyerType = "entity"`
   - `entity_type="trust"` → `determination.buyerType = "trust"`

6. **Add a `synced_at` timestamp.** After sync, set `wizard_data.collection._portal_synced_at = datetime.utcnow().isoformat()` so we can tell when the last sync happened.

7. **Log everything.** Log which fields were synced, which were skipped, any format conversions applied. Use `logger.info(f"[SYNC] report={report_id} ...")`.

### Function Signature

```python
def sync_party_data_to_wizard(db: Session, report_id: str) -> dict:
    """
    Syncs all ReportParty.party_data into report.wizard_data.collection.
    
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
```

---

## PHASE 2: Wire the Sync Into Party Submit

### Edit `api/app/routes/parties.py`

In the party submit handler (the endpoint that handles `POST /party/{token}/submit`):

**After** the party_data is saved to `ReportParty.party_data` and the status is set to `"submitted"`:

```python
from app.services.party_data_sync import sync_party_data_to_wizard

# ... existing submit logic ...
party.status = "submitted"
party_link.status = "used"
db.flush()

# ===== NEW: Sync portal data to wizard_data for RERX builder =====
sync_result = sync_party_data_to_wizard(db, str(party.report_id))
logger.info(f"[PARTY_SUBMIT] Portal data synced: {sync_result}")
# ===== END NEW =====

db.commit()
```

This means every time a party submits, the wizard_data is immediately updated. The RERX builder will always see the latest data.

---

## PHASE 3: Pre-Filing Safety Net

### Edit `api/app/services/filing_lifecycle.py`

In `perform_sdtm_submit()` (or wherever the RERX builder is called), add a safety-net sync BEFORE building XML:

```python
from app.services.party_data_sync import sync_party_data_to_wizard

def perform_sdtm_submit(db, report_id, ip_address):
    # ... existing idempotency checks ...
    
    # ===== NEW: Safety-net sync before XML generation =====
    sync_result = sync_party_data_to_wizard(db, report_id)
    logger.info(f"[SDTM_SUBMIT] Pre-filing sync: {sync_result}")
    if sync_result.get("errors"):
        logger.warning(f"[SDTM_SUBMIT] Sync warnings: {sync_result['errors']}")
    # ===== END NEW =====
    
    # build_rerx_xml(report, submission, config) — unchanged
    ...
```

This is belt-AND-suspenders. Even if the on-submit sync missed something (race condition, old data), this catches it right before filing.

---

## PHASE 4: Auto-Transition to ready_to_file

### Edit `api/app/routes/parties.py`

After the sync, check if ALL parties for this report are now `"submitted"`:

```python
# After sync_party_data_to_wizard...

# ===== NEW: Check if all parties are complete =====
all_parties = db.query(ReportParty).filter(
    ReportParty.report_id == party.report_id
).all()

all_submitted = all(p.status in ("submitted", "verified") for p in all_parties)

if all_submitted and len(all_parties) > 0:
    report = db.query(Report).get(party.report_id)
    if report and report.status == "collecting":
        report.status = "ready_to_file"
        logger.info(f"[PARTY_SUBMIT] All {len(all_parties)} parties submitted. "
                     f"Report {report.id} → ready_to_file")
        
        # TODO: Send notification to staff (Phase 6)
# ===== END NEW =====
```

---

## PHASE 5: Link Resend + Small Fixes

### 5A: Add Link Resend Endpoint

**Edit `api/app/routes/parties.py`** (or `reports.py` — wherever party link management lives):

```python
@router.post("/reports/{report_id}/parties/{party_id}/resend-link")
def resend_party_link(report_id: str, party_id: str, db: Session = Depends(get_db)):
    """Resend or regenerate a party portal link."""
    # 1. Find the ReportParty
    # 2. Check if existing PartyLink is still active
    #    - If active and not expired: resend same link via email
    #    - If expired or used: generate NEW token, create new PartyLink, 
    #      revoke old link, send new email
    # 3. Reset party status to "link_sent" if it was "submitted" (allow resubmission)
    # 4. Return the new/existing link URL
```

**Requires:** Staff/admin role check (only staff can resend links)

### 5B: TransferPartyEntityIndicator / TransferPartyTrustIndicator

These are RERX XML flags, NOT data collected from the portal. The RERX builder should set them programmatically.

**Check `api/app/services/fincen/rerx_builder.py`:**

```bash
grep -n "TransferPartyEntityIndicator\|TransferPartyTrustIndicator" api/app/services/fincen/rerx_builder.py
```

If these are NOT already being set:

In the builder, when generating Party 67 (Transferee):
- If buyer is entity → add `<TransferPartyEntityIndicator>Y</TransferPartyEntityIndicator>`
- If buyer is trust → add `<TransferPartyTrustIndicator>Y</TransferPartyTrustIndicator>`

This is a **builder-side fix**, not a portal fix. These indicators are derived from the buyer type, not entered by the party.

### 5C: Improve Server-Side Validation

Investigation found server-side validation is minimal (only checks name fields). Before March 1, add validation for:
- SSN format (if provided, must be 9 digits after stripping)
- EIN format (if provided, must be 9 digits after stripping)
- Date of birth format (must be valid date)
- Address completeness (street, city, state, zip all required)

Add this to the party submit handler, returning 400 with specific field errors.

---

## PHASE 6: Staff Notification on Party Submit

### Edit `api/app/routes/parties.py`

After a party submits (and especially when ALL parties complete):

```python
from app.services.email_service import send_party_submitted_notification

# After party submits:
# Send notification to assigned staff member
if report.assigned_to:  # or however staff assignment works
    send_party_submitted_notification(
        staff_email=report.assigned_to.email,  # adjust to actual field
        party_name=party.display_name,
        party_role=party.party_role,
        report_id=str(report.id),
        all_complete=all_submitted
    )
```

### Add Email Template in `api/app/services/email_service.py`

```python
def send_party_submitted_notification(staff_email, party_name, party_role, report_id, all_complete):
    """Notify staff when a party submits their portal form."""
    subject = "All Parties Complete" if all_complete else f"Party Submitted: {party_name}"
    # Simple notification email — property address, party name, role, 
    # link to report in admin UI
    # If all_complete, emphasize "Ready for review"
```

---

## PHASE 7: Validate End-to-End with Dry Run

After ALL the above changes are implemented, run the RERX dry-run to validate:

### Step 1: Find a report with portal-submitted party data

```bash
# Find reports that have ReportParty records with submitted status
python -c "
from app.models import Report, ReportParty
from app.database import SessionLocal
db = SessionLocal()

parties = db.query(ReportParty).filter(ReportParty.status == 'submitted').all()
for p in parties:
    print(f'Report: {p.report_id}, Role: {p.party_role}, Type: {p.entity_type}, Name: {p.display_name}')
    print(f'  party_data keys: {list(p.party_data.keys()) if p.party_data else \"EMPTY\"}')
"
```

If no submitted parties exist, create test data:

```bash
# Use the demo seed or manually create a report with parties
python -c "
from app.services.demo_seed import seed_demo_data
# Or create a specific test report with party data
"
```

### Step 2: Run the sync manually on that report

```bash
python -c "
from app.services.party_data_sync import sync_party_data_to_wizard
from app.database import SessionLocal

db = SessionLocal()
result = sync_party_data_to_wizard(db, 'REPORT_UUID_HERE')
print(json.dumps(result, indent=2))
db.commit()
"
```

### Step 3: Run RERX dry run

```bash
python -m app.scripts.rerx_dry_run --report-id "REPORT_UUID_HERE" --show-data
```

### Step 4: Validate the XML

```bash
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --structural-only
```

**Expected outcome:** ALL checks pass, including:
- ✅ Party 67 (Transferee) has correct name, EIN/SSN, address from portal data
- ✅ Party 68 (Associated Persons / BOs) populated from portal BO data
- ✅ Party 69 (Transferor) has correct seller info from portal data
- ✅ Payment sources mapped correctly
- ✅ TransferPartyEntityIndicator / TransferPartyTrustIndicator present
- ✅ All 18 structural checks pass

### Step 5: If validation fails

Document which checks fail and what data is missing. The issue will be one of:
1. **Mapping key mismatch** — the sync used the wrong field name (fix the sync)
2. **Format mismatch** — SSN still has hyphens, date in wrong format (fix the conversion)
3. **Missing data** — party didn't fill a required field (fix form validation)

---

## FILES TO CREATE

| File | Purpose |
|------|---------|
| `api/app/services/party_data_sync.py` | NEW — Sync function (estimated ~200-300 lines) |

## FILES TO MODIFY

| File | Change |
|------|--------|
| `api/app/routes/parties.py` | Call sync on submit, auto-transition, resend endpoint, improved validation |
| `api/app/services/filing_lifecycle.py` | Pre-filing safety-net sync call |
| `api/app/services/fincen/rerx_builder.py` | Add TransferPartyEntityIndicator/TrustIndicator if missing |
| `api/app/services/email_service.py` | Add staff notification email template |

## FILES TO READ FIRST (CRITICAL)

Before writing ANY code, you MUST read these files to understand the exact data structures:

```bash
# 1. What does the RERX builder actually read?
cat api/app/services/fincen/rerx_builder.py

# 2. What does the portal submit handler save?
cat api/app/routes/parties.py  # or wherever POST /party/{token}/submit lives

# 3. What does wizard_data.collection look like with wizard-entered data?
# Find a report that was filled via wizard (not portal) and inspect:
python -c "
from app.models import Report
from app.database import SessionLocal
import json
db = SessionLocal()
report = db.query(Report).filter(Report.status.in_(['filed','ready_to_file'])).first()
if report:
    wd = report.wizard_data or {}
    collection = wd.get('collection', {})
    print('=== WIZARD DATA COLLECTION KEYS ===')
    print(json.dumps(list(collection.keys()), indent=2))
    print('=== BUYER ENTITY STRUCTURE ===')
    print(json.dumps(collection.get('buyerEntity', {}), indent=2)[:2000])
    print('=== SELLERS STRUCTURE ===')
    print(json.dumps(collection.get('sellers', []), indent=2)[:2000])
    print('=== PAYMENT SOURCES STRUCTURE ===')
    print(json.dumps(collection.get('paymentSources', []), indent=2)[:2000])
"

# 4. What does party_data look like from the portal?
python -c "
from app.models import ReportParty
from app.database import SessionLocal
import json
db = SessionLocal()
parties = db.query(ReportParty).filter(ReportParty.party_data != None).limit(5).all()
for p in parties:
    print(f'=== {p.party_role} / {p.entity_type} ===')
    print(json.dumps(p.party_data, indent=2)[:2000])
"
```

**The sync function's field mappings MUST be based on what you find in steps 3 and 4 above. DO NOT guess. Match the exact keys.**

---

## VERIFICATION CHECKLIST

After implementation, verify ALL of the following:

- [ ] `party_data_sync.py` created with sync function
- [ ] Sync called on party submit (in parties.py submit handler)
- [ ] Sync called as safety net before RERX generation (in filing_lifecycle.py)
- [ ] Auto-transition to `ready_to_file` when all parties submitted
- [ ] Link resend endpoint works
- [ ] TransferPartyEntityIndicator set for entity buyers
- [ ] TransferPartyTrustIndicator set for trust buyers
- [ ] Server-side validation improved (SSN, EIN, DOB, address)
- [ ] Staff notification email template added
- [ ] RERX dry-run passes with portal-sourced data
- [ ] RERX structural validation passes (18/18 checks)
- [ ] No regressions: wizard-entered data still works (builder unchanged)
- [ ] Sync is idempotent (running twice produces same result)
- [ ] Sync preserves non-party wizard_data fields (reportingPerson, propertyAddress, etc.)

---

## KilledSharks Entry (for docs/KilledSharks-2.md)

### 57. Party Portal Data Bridge + Auto-Transition ✅

**Date:** February [TODAY], 2026

**Problem:** Party portal collected all required RERX data but stored it in `ReportParty.party_data`. The RERX builder read from `report.wizard_data.collection`. No sync existed between these two locations, meaning portal-submitted data never reached the XML generator.

**Solution:** Created `party_data_sync.py` that maps portal field names to wizard_data structure. Sync runs automatically on party submit and as a pre-filing safety net. Also added auto-transition to `ready_to_file`, link resend capability, and staff notifications.

**Files Created:**
- `api/app/services/party_data_sync.py`

**Files Modified:**
- `api/app/routes/parties.py` — sync on submit, auto-transition, resend endpoint, validation
- `api/app/services/filing_lifecycle.py` — pre-filing sync
- `api/app/services/fincen/rerx_builder.py` — TransferParty indicators
- `api/app/services/email_service.py` — staff notification template

**Status:** ✅ Killed (BRIDGE SHARK 🦈)
