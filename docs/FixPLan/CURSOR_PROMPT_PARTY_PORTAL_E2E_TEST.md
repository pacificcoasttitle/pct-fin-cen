# CURSOR PROMPT: Party Portal Data Bridge — End-to-End Validation Test

## Context

Shark #57 (Party Portal Data Bridge) has been implemented. The sync function `sync_party_data_to_wizard()` now bridges `ReportParty.party_data` → `wizard_data.collection` so the RERX builder can consume portal-submitted data.

**This prompt runs the end-to-end validation to confirm it works.**

We are replicating the same dry-run + structural validation pattern we used successfully for the RERX builder (18/18 checks passed). This time we're confirming the FULL pipeline: portal data → sync → wizard_data → RERX builder → valid XML.

---

## STEP 1: Check What Data Exists

First, understand what we're working with.

```bash
cd api

# Load environment
export $(cat .env 2>/dev/null | grep -v '^#' | xargs) 2>/dev/null

# Check for reports with submitted parties
python -c "
from app.database import SessionLocal
from app.models.report import Report
from app.models.report_party import ReportParty
import json

db = SessionLocal()

# Find all ReportParty records
parties = db.query(ReportParty).all()
print(f'=== TOTAL ReportParty RECORDS: {len(parties)} ===')
for p in parties:
    pd = p.party_data or {}
    print(f'  Party: {p.id}')
    print(f'    report_id: {p.report_id}')
    print(f'    role: {p.party_role}, type: {p.entity_type}')
    print(f'    display_name: {p.display_name}')
    print(f'    status: {p.status}')
    print(f'    party_data keys: {list(pd.keys()) if pd else \"EMPTY\"}')
    print()

# Find reports that have parties
report_ids_with_parties = [p.report_id for p in parties]
unique_report_ids = list(set(str(rid) for rid in report_ids_with_parties))
print(f'=== REPORTS WITH PARTIES: {len(unique_report_ids)} ===')
for rid in unique_report_ids:
    report = db.query(Report).filter(Report.id == rid).first()
    if report:
        wd = report.wizard_data or {}
        collection = wd.get('collection', {})
        print(f'  Report: {report.id}')
        print(f'    status: {report.status}')
        print(f'    wizard_data keys: {list(wd.keys())}')
        print(f'    collection keys: {list(collection.keys())}')
        print(f'    _portal_synced_at: {collection.get(\"_portal_synced_at\", \"NOT SYNCED\")}')
        print(f'    buyerType (determination): {wd.get(\"determination\", {}).get(\"buyerType\", \"NOT SET\")}')
        print(f'    reportingPerson present: {\"reportingPerson\" in collection}')
        print(f'    propertyAddress present: {\"propertyAddress\" in collection}')
        print(f'    closingDate present: {\"closingDate\" in collection}')
        print()

db.close()
"
```

**Decision point based on output:**

- **If there ARE submitted parties with party_data** → proceed to Step 2
- **If there are parties but party_data is empty** → we need test data (go to Step 1B)
- **If there are NO ReportParty records at all** → we need to create a full test scenario (go to Step 1B)

---

## STEP 1B: Create Test Data (If Needed)

If the database doesn't have a report with portal-submitted party data, create one. This simulates what happens when a party fills out the portal form.

```bash
python -c "
from app.database import SessionLocal
from app.models.report import Report
from app.models.report_party import ReportParty
from datetime import datetime, timedelta
import uuid, json

db = SessionLocal()

# Find a report we can use — prefer one with wizard_data already populated
report = db.query(Report).filter(
    Report.wizard_data != None
).first()

if not report:
    # Find ANY report
    report = db.query(Report).first()

if not report:
    print('ERROR: No reports in database at all. Run demo seed first.')
    exit(1)

print(f'Using report: {report.id} (status: {report.status})')

# Check if this report already has parties
existing = db.query(ReportParty).filter(ReportParty.report_id == report.id).all()
print(f'Existing parties: {len(existing)}')

# If no transferee exists, create one (entity buyer with BOs)
transferee = None
for p in existing:
    if p.party_role == 'transferee':
        transferee = p
        break

if not transferee:
    print('Creating test TRANSFEREE (entity buyer)...')
    transferee = ReportParty(
        id=uuid.uuid4(),
        report_id=report.id,
        party_role='transferee',
        entity_type='entity',
        display_name='Test Entity Buyer LLC',
        status='submitted',
        party_data={
            'entity_name': 'Pacific Ventures Holdings LLC',
            'entity_dba': 'Pacific Ventures',
            'entity_type': 'llc_multi',
            'ein': '83-1234567',
            'formation_state': 'CA',
            'formation_date': '2019-06-15',
            'address': {
                'street': '1000 Wilshire Blvd Suite 1500',
                'city': 'Los Angeles',
                'state': 'CA',
                'zip': '90017',
                'country': 'United States'
            },
            'phone': '(310) 555-0142',
            'email': 'legal@pacificventures.com',
            'beneficial_owners': [
                {
                    'id': str(uuid.uuid4()),
                    'first_name': 'Margaret',
                    'middle_name': 'Anne',
                    'last_name': 'Chen',
                    'suffix': '',
                    'date_of_birth': '1972-08-14',
                    'citizenship': 'us_citizen',
                    'id_type': 'ssn',
                    'id_number': '567-89-0123',
                    'id_jurisdiction': '',
                    'ownership_percentage': 65,
                    'control_type': ['senior_officer'],
                    'is_indirect_owner': False,
                    'indirect_entity_name': '',
                    'trust_role': '',
                    'address': {
                        'street': '456 Ocean Ave',
                        'city': 'Santa Monica',
                        'state': 'CA',
                        'zip': '90402',
                        'country': 'United States'
                    }
                },
                {
                    'id': str(uuid.uuid4()),
                    'first_name': 'Robert',
                    'middle_name': 'James',
                    'last_name': 'Kim',
                    'suffix': 'Jr',
                    'date_of_birth': '1985-03-22',
                    'citizenship': 'us_citizen',
                    'id_type': 'ssn',
                    'id_number': '234-56-7890',
                    'id_jurisdiction': '',
                    'ownership_percentage': 35,
                    'control_type': [],
                    'is_indirect_owner': True,
                    'indirect_entity_name': 'Kim Family Trust',
                    'trust_role': '',
                    'address': {
                        'street': '789 Sunset Blvd',
                        'city': 'West Hollywood',
                        'state': 'CA',
                        'zip': '90069',
                        'country': 'United States'
                    }
                }
            ],
            'payment_sources': [
                {
                    'id': str(uuid.uuid4()),
                    'source_type': 'business_funds',
                    'amount': 1250000,
                    'payment_method': 'wire',
                    'institution_name': 'First Republic Bank',
                    'account_last_four': '4589',
                    'is_third_party': False,
                    'third_party_name': ''
                },
                {
                    'id': str(uuid.uuid4()),
                    'source_type': 'personal_funds',
                    'amount': 250000,
                    'payment_method': 'cashiers_check',
                    'institution_name': 'Chase Bank',
                    'account_last_four': '7821',
                    'is_third_party': False,
                    'third_party_name': ''
                }
            ],
            'signer_name': 'Margaret Chen',
            'signer_title': 'Managing Member',
            'signer_dob': '1972-08-14',
            'certified': True,
            'certification_signature': 'Margaret A. Chen',
            'certification_date': '2026-02-03'
        }
    )
    db.add(transferee)
    print(f'  Created transferee: {transferee.id}')

# If no transferor exists, create one (individual seller)
transferor = None
for p in existing:
    if p.party_role == 'transferor':
        transferor = p
        break

if not transferor:
    print('Creating test TRANSFEROR (individual seller)...')
    transferor = ReportParty(
        id=uuid.uuid4(),
        report_id=report.id,
        party_role='transferor',
        entity_type='individual',
        display_name='James Wilson',
        status='submitted',
        party_data={
            'first_name': 'James',
            'middle_name': 'Edward',
            'last_name': 'Wilson',
            'suffix': '',
            'date_of_birth': '1958-11-30',
            'ssn': '456-78-9012',
            'citizenship': 'us_citizen',
            'id_type': '',
            'id_number': '',
            'id_jurisdiction': '',
            'address': {
                'street': '2200 Pacific Coast Highway',
                'city': 'Malibu',
                'state': 'CA',
                'zip': '90265',
                'country': 'United States'
            },
            'phone': '(310) 555-0198',
            'email': 'jwilson@email.com',
            'certified': True,
            'certification_signature': 'James E. Wilson',
            'certification_date': '2026-02-03'
        }
    )
    db.add(transferor)
    print(f'  Created transferor: {transferor.id}')

# Ensure wizard_data has the non-party fields the builder needs
wd = report.wizard_data or {}
collection = wd.setdefault('collection', {})
determination = wd.setdefault('determination', {})

needs_update = False

# Ensure reportingPerson exists
if 'reportingPerson' not in collection or not collection['reportingPerson'].get('companyName'):
    collection['reportingPerson'] = {
        'companyName': 'Pacific Coast Title Company',
        'contactName': 'Sarah Mitchell',
        'licenseNumber': 'CA-12345',
        'address': {
            'street': '3200 Park Center Drive Suite 200',
            'city': 'Costa Mesa',
            'state': 'CA',
            'zip': '92626',
            'country': 'United States'
        },
        'phone': '(714) 555-0100',
        'email': 'admin@pctfincen.com'
    }
    needs_update = True
    print('Added reportingPerson to wizard_data')

# Ensure propertyAddress exists
if 'propertyAddress' not in collection or not collection['propertyAddress'].get('street'):
    collection['propertyAddress'] = {
        'street': '8750 Mulholland Drive',
        'unit': '',
        'city': 'Los Angeles',
        'state': 'CA',
        'zip': '90046',
        'country': 'US'
    }
    needs_update = True
    print('Added propertyAddress to wizard_data')

# Ensure closingDate exists
if 'closingDate' not in collection:
    collection['closingDate'] = '2026-01-15'
    needs_update = True
    print('Added closingDate to wizard_data')

# Ensure purchasePrice exists
if 'purchasePrice' not in collection:
    collection['purchasePrice'] = 1500000
    needs_update = True
    print('Added purchasePrice to wizard_data')

if needs_update:
    report.wizard_data = wd
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(report, 'wizard_data')

db.commit()
print()
print(f'=== TEST DATA READY ===')
print(f'Report ID: {report.id}')
print(f'Report status: {report.status}')
print(f'Transferee: {transferee.id} ({transferee.display_name})')
print(f'Transferor: {transferor.id if transferor else \"existing\"}')
print(f'=== Copy the Report ID for the next steps ===')

db.close()
"
```

---

## STEP 2: Run the Sync

Now trigger the sync function to map party_data → wizard_data.collection:

```bash
python -c "
from app.database import SessionLocal
from app.services.party_data_sync import sync_party_data_to_wizard
from app.models.report import Report
import json

db = SessionLocal()

# Use the report from Step 1 — replace with actual ID if needed
# Or find the one with parties:
from app.models.report_party import ReportParty
party = db.query(ReportParty).filter(ReportParty.status == 'submitted').first()
if not party:
    print('ERROR: No submitted parties found')
    exit(1)

report_id = str(party.report_id)
print(f'Syncing report: {report_id}')

# Run the sync
result = sync_party_data_to_wizard(db, report_id)
print()
print('=== SYNC RESULT ===')
print(json.dumps(result, indent=2, default=str))

# Verify the sync worked by checking wizard_data
report = db.query(Report).filter(Report.id == report_id).first()
wd = report.wizard_data or {}
collection = wd.get('collection', {})

print()
print('=== POST-SYNC WIZARD_DATA CHECK ===')
print(f'_portal_synced_at: {collection.get(\"_portal_synced_at\", \"MISSING\")}')
print(f'buyerType: {wd.get(\"determination\", {}).get(\"buyerType\", \"MISSING\")}')

# Check buyer data landed
buyer_entity = collection.get('buyerEntity', {})
if buyer_entity:
    entity = buyer_entity.get('entity', {})
    bos = buyer_entity.get('beneficialOwners', [])
    print(f'buyerEntity.entity.legalName: {entity.get(\"legalName\", \"MISSING\")}')
    print(f'buyerEntity.entity.ein: {entity.get(\"ein\", \"MISSING\")}')
    print(f'buyerEntity.beneficialOwners count: {len(bos)}')
    for i, bo in enumerate(bos):
        print(f'  BO[{i}]: {bo.get(\"firstName\", \"?\")} {bo.get(\"lastName\", \"?\")} - SSN: {bo.get(\"idNumber\", \"MISSING\")[:4]}...')
else:
    # Check for individual buyer
    buyer_ind = collection.get('buyerIndividual', {})
    if buyer_ind:
        print(f'buyerIndividual.firstName: {buyer_ind.get(\"firstName\", \"MISSING\")}')
    else:
        print('WARNING: No buyer data found in wizard_data after sync!')

# Check sellers
sellers = collection.get('sellers', [])
print(f'sellers count: {len(sellers)}')
for i, s in enumerate(sellers):
    stype = s.get('type', 'unknown')
    if stype == 'individual':
        print(f'  Seller[{i}]: {s.get(\"firstName\", \"?\")} {s.get(\"lastName\", \"?\")} ({stype})')
    else:
        print(f'  Seller[{i}]: {s.get(\"entityName\", s.get(\"trustName\", \"?\"))} ({stype})')

# Check payment sources
payments = collection.get('paymentSources', [])
print(f'paymentSources count: {len(payments)}')
for i, p in enumerate(payments):
    print(f'  Payment[{i}]: \${p.get(\"amount\", 0):,.0f} via {p.get(\"paymentMethod\", \"?\")} at {p.get(\"institutionName\", \"?\")}')

db.commit()
db.close()

print()
print('=== SYNC VALIDATION COMPLETE ===')
"
```

**If sync fails or data is missing:** The sync function has a bug. Check the error output, fix the field mapping, and re-run.

**If sync succeeds:** Proceed to Step 3.

---

## STEP 3: RERX Dry Run

Generate the XML from the synced data:

```bash
# Run the dry run with the same report
# The script should auto-find the best report, or specify by ID:
python -m app.scripts.rerx_dry_run --show-data

# If you need a specific report:
# python -m app.scripts.rerx_dry_run --report-id "REPORT_UUID" --show-data
```

**Expected output:**
- XML file generated (saved to `rerx_dry_run_output.xml` or similar)
- No PreflightError
- Debug summary shows all parties mapped
- You should see Party 67 (Transferee), Party 68 (BOs), Party 69 (Transferor) in the summary

**If PreflightError occurs:** Read the error message. Common causes:
- Missing buyer identification → sync didn't map EIN/SSN correctly
- Missing seller → sync didn't map sellers array
- Missing address → sync didn't map address fields
Fix the sync, re-run Step 2, then retry Step 3.

---

## STEP 4: Structural Validation

Validate the generated XML passes all checks:

```bash
# Find the output file from Step 3
ls -la rerx_dry_run*.xml 2>/dev/null || ls -la /tmp/rerx*.xml 2>/dev/null || echo "Check dry run output path"

# Run structural validation
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --structural-only
```

**Expected: 18/18 structural checks pass.** Specifically verify:

| # | Check | Expected |
|---|-------|----------|
| 1 | Well-formed XML | ✅ PASS |
| 2 | FormTypeCode = RERX | ✅ PASS |
| 3 | Schema location present | ✅ PASS |
| 4 | Party 31 (Reporting Person) exists | ✅ PASS |
| 5 | Party 67 (Transferee/Buyer) exists | ✅ PASS — **FROM PORTAL DATA** |
| 6 | Party 68 (Associated Persons/BOs) exists | ✅ PASS — **FROM PORTAL DATA** |
| 7 | Party 69 (Transferor/Seller) exists | ✅ PASS — **FROM PORTAL DATA** |
| 8 | Party 35 (Transmitter) exists | ✅ PASS |
| 9 | Party 37 (Transmitter Contact) exists | ✅ PASS |
| 10 | FilingDateText present | ✅ PASS |
| 11 | ActivityAssociation present | ✅ PASS |
| 12 | AssetsAttribute present | ✅ PASS |
| 13 | ValueTransferActivity present | ✅ PASS — **PAYMENT FROM PORTAL DATA** |
| 14 | Filing date valid range | ✅ PASS |
| 15 | TCC value present | ✅ PASS |
| 16 | Transmitter TIN present | ✅ PASS |
| 17 | SeqNum uniqueness | ✅ PASS |
| 18 | ActivityCount attribute | ✅ PASS |

---

## STEP 5: Inspect the XML Content

Even if structural checks pass, eyeball the actual XML to confirm portal data made it through:

```bash
python -c "
import xml.etree.ElementTree as ET

tree = ET.parse('rerx_dry_run_output.xml')
root = tree.getroot()

# Strip namespace for easier searching
ns = root.tag.split('}')[0] + '}' if '}' in root.tag else ''

print('=== PARTY INSPECTION ===')
for activity in root.iter(f'{ns}Activity'):
    for party in activity.iter(f'{ns}Party'):
        seq = party.get('SeqNum', '?')
        # Find party type code
        type_code = ''
        for at in party.iter(f'{ns}ActivityPartyTypeCode'):
            type_code = at.text
        
        # Find name
        name = ''
        for n in party.iter(f'{ns}RawPartyFullName'):
            name = n.text
        for n in party.iter(f'{ns}RawIndividualFirstName'):
            first = n.text or ''
        for n in party.iter(f'{ns}RawEntityIndividualLastName'):
            last = n.text or ''
            if not name:
                name = f'{first} {last}'.strip()
        
        # Find ID
        id_val = ''
        for pid in party.iter(f'{ns}PartyIdentificationNumberText'):
            id_val = pid.text[:4] + '...' if pid.text and len(pid.text) > 4 else (pid.text or '')
        
        party_labels = {
            '31': 'Reporting Person',
            '35': 'Transmitter',
            '37': 'Transmitter Contact',
            '67': 'TRANSFEREE (BUYER)',
            '68': 'ASSOCIATED PERSON (BO)',
            '69': 'TRANSFEROR (SELLER)',
            '70': 'Seller Trustee',
            '41': 'Financial Institution'
        }
        label = party_labels.get(type_code, f'Type {type_code}')
        
        print(f'  Party {seq}: [{type_code}] {label}')
        print(f'    Name: {name}')
        if id_val:
            print(f'    ID: {id_val}')
        print()

# Check ValueTransferActivity
print('=== PAYMENT / VALUE TRANSFER ===')
for vta in root.iter(f'{ns}ValueTransferActivity'):
    for amount in vta.iter(f'{ns}TotalConsiderationPaidAmountText'):
        print(f'  Total Consideration: \${amount.text}')
    for detail in vta.iter(f'{ns}ValueTransferActivityDetail'):
        for pa in detail.iter(f'{ns}PaymentAmountText'):
            print(f'  Payment: \${pa.text}')
    for closing in vta.iter(f'{ns}TransactionClosingDateText'):
        print(f'  Closing Date: {closing.text}')

# Check property
print()
print('=== PROPERTY ===')
for asset in root.iter(f'{ns}AssetsAttribute'):
    for street in asset.iter(f'{ns}RawStreetAddress1Text'):
        print(f'  Street: {street.text}')
    for city in asset.iter(f'{ns}RawCityText'):
        print(f'  City: {city.text}')
    for state in asset.iter(f'{ns}RawStateCodeText'):
        print(f'  State: {state.text}')
    for zip in asset.iter(f'{ns}RawZIPCode'):
        print(f'  ZIP: {zip.text}')

print()
print('=== VALIDATION SUMMARY ===')
print('Check that:')
print('  - Party 67 name matches portal entity_name (Pacific Ventures Holdings LLC)')
print('  - Party 68 names match portal beneficial_owners (Margaret Chen, Robert Kim)')
print('  - Party 69 name matches portal seller (James Wilson)')
print('  - Payment amounts match portal payment_sources (1250000 + 250000)')
print('  - EIN/SSN values are digits-only (no hyphens)')
"
```

**What to look for:**
- Party 67 should show "Pacific Ventures Holdings LLC" (from portal entity_name)
- Party 68 should show "Margaret Chen" and "Robert Kim" (from portal beneficial_owners)
- Party 69 should show "James Wilson" (from portal seller)
- EIN should be "831234567" (hyphens stripped)
- SSNs should be "567890123" etc. (hyphens stripped)
- Payment total should be $1,500,000

---

## STEP 6: Report Results

After all steps complete, output a summary:

```
=== PARTY PORTAL DATA BRIDGE — E2E TEST RESULTS ===

Step 1: Data check          [PASS/FAIL]
Step 2: Sync execution      [PASS/FAIL] — X parties synced, Y fields mapped
Step 3: RERX dry run        [PASS/FAIL] — XML generated, no preflight errors
Step 4: Structural checks   [PASS/FAIL] — XX/18 checks passed
Step 5: Content inspection  [PASS/FAIL] — Portal data visible in XML

OVERALL: [PASS/FAIL]

If PASS: Shark #57 is VALIDATED. Party portal data flows end-to-end to RERX XML.
If FAIL: Document which step failed and what the error was.
```

---

## IF ALL TESTS PASS

Update `docs/KilledSharks-2.md` with the Shark #57 entry confirming validation:

```markdown
### 57. Party Portal Data Bridge + End-to-End Validation ✅

**Date:** February [TODAY], 2026

**Problem:** Party portal collected all required RERX data but stored it in 
`ReportParty.party_data`. The RERX builder read from `report.wizard_data.collection`. 
No sync existed between these two locations, meaning portal-submitted data never 
reached the XML generator.

**Solution:** Created `party_data_sync.py` — a sync function that maps portal 
field names (snake_case) to wizard_data structure (camelCase). Strips SSN/EIN 
hyphens, normalizes phone numbers, converts country names to ISO-2 codes. 
Sync runs on party submit and as a pre-filing safety net.

**End-to-End Validation:**
- Synced entity buyer (2 BOs) + individual seller from portal data
- RERX dry-run generated valid XML with all portal-sourced parties
- Structural validation: 18/18 checks passed
- Party 67 (buyer), 68 (BOs), 69 (seller) all populated from portal data
- Payment sources correctly mapped
- EIN/SSN hyphens stripped, addresses normalized

**Additional Features:**
- Auto-transition report → ready_to_file when all parties submitted
- Link resend endpoint for staff
- Staff email notification on party submit

**Files Created:**
- `api/app/services/party_data_sync.py` (~450 lines)

**Files Modified:**
- `api/app/routes/parties.py` — sync on submit, auto-transition, resend endpoint
- `api/app/services/filing_lifecycle.py` — pre-filing safety-net sync
- `api/app/services/email_service.py` — staff notification template

**Status:** ✅ Killed (BRIDGE SHARK 🦈)
```
