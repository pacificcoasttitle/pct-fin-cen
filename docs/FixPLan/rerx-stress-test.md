RERX Stress Test — End-to-End Scenario Validation Script

Create a comprehensive test script that simulates every party type combination,
runs the full pipeline (party_data → sync → RERX XML → validate), and outputs
results in a clear table.

====================================================================
STEP 0: DIAGNOSTIC (read before building)
====================================================================

# Understand the data structures
grep -n "class.*Report\|class.*ReportParty\|class.*FilingSubmission" api/app/models/*.py | head -10

# Understand what the RERX builder expects
grep -n "def build_rerx_xml" api/app/services/fincen/rerx_builder.py | head -5
grep -B 5 -A 30 "def build_rerx_xml" api/app/services/fincen/rerx_builder.py | head -40

# Understand party_data_sync
grep -n "def sync_party_data" api/app/services/party_data_sync.py | head -5
grep -B 3 -A 20 "def sync_party_data" api/app/services/party_data_sync.py | head -30

# Understand structural validation
cat api/app/scripts/rerx_validate_xsd.py

# Understand the existing dry run script
cat api/app/scripts/rerx_dry_run.py

# What env vars are needed
grep -n "TRANSMITTER_TIN\|TRANSMITTER_TCC\|SDTM" api/app/config.py | head -10

====================================================================
CREATE: api/app/scripts/rerx_stress_test.py
====================================================================

Script structure:

```python
#!/usr/bin/env python
"""
RERX Stress Test — Validates every party type combination through the
full pipeline: party_data → sync → RERX XML → structural validation.

Usage:
    python -m app.scripts.rerx_stress_test
    python -m app.scripts.rerx_stress_test --verbose
    python -m app.scripts.rerx_stress_test --save-xml   # saves each XML to /tmp/
"""
```

The script should NOT require a database connection. It should create
mock Report and ReportParty objects in memory with realistic data,
then run them through the real sync and builder functions.

====================================================================
TEST SCENARIOS (10 scenarios)
====================================================================

Each scenario defines: buyer type, seller type, special conditions,
and the expected RERX output characteristics.

SCENARIO 1: Individual Buyer + Individual Seller (baseline)
  buyer_party_data:
    entity_type: "individual"
    first_name: "Michael", last_name: "Chen", middle_name: "J"
    date_of_birth: "1985-03-15"
    ssn: "123-45-6789"
    citizenship: "US"
    id_type: "ssn", id_number: "123-45-6789"
    address: {street: "456 Oak Avenue", city: "Pasadena", state: "CA", zip: "91101", country: "US"}
    payment_sources: [{
      source_type: "personal_funds", amount: 850000,
      payment_method: "wire_transfer",
      institution_name: "Wells Fargo Bank",
      account_last4: "4532"
    }]
  seller_party_data:
    entity_type: "individual"
    first_name: "Sarah", last_name: "Williams"
    date_of_birth: "1972-08-22"
    ssn: "987-65-4321"
    address: {street: "742 Evergreen Terrace", city: "Glendora", state: "CA", zip: "91740", country: "US"}
  Expected:
    - Party 67 (Transferee): Michael J Chen, SSN, address
    - Party 69 (Transferor): Sarah Williams, SSN, address
    - ValueTransferActivity: $850,000, wire, Wells Fargo
    - No Party 68 (no BOs for individual)

SCENARIO 2: Entity Buyer (LLC) + Individual Seller
  buyer_party_data:
    entity_type: "entity"
    entity_name: "Golden State Holdings LLC"
    entity_subtype: "llc"
    ein: "83-1234567"
    formation_state: "CA", formation_date: "2020-06-15"
    address: {street: "100 Wilshire Blvd", unit: "Suite 500", city: "Los Angeles", state: "CA", zip: "90017", country: "US"}
    signer_name: "Robert Kim", signer_title: "Managing Member"
    beneficial_owners: [
      {
        first_name: "Robert", last_name: "Kim",
        date_of_birth: "1978-11-03", ssn: "111-22-3333",
        citizenship: "US",
        address: {street: "789 Pine St", city: "Arcadia", state: "CA", zip: "91006", country: "US"},
        ownership_percentage: 60,
        is_control_person: true, control_type: "managing_member"
      },
      {
        first_name: "Lisa", last_name: "Park",
        date_of_birth: "1982-04-19", ssn: "444-55-6666",
        citizenship: "US",
        address: {street: "321 Elm Dr", city: "Monrovia", state: "CA", zip: "91016", country: "US"},
        ownership_percentage: 40,
        is_control_person: false
      }
    ]
    payment_sources: [
      {source_type: "business_funds", amount: 1200000, payment_method: "wire_transfer", institution_name: "Bank of America", account_last4: "8901"},
      {source_type: "loan", amount: 300000, payment_method: "wire_transfer", institution_name: "Pacific Premier Trust", account_last4: "2345"}
    ]
  seller_party_data: (same individual seller as scenario 1)
  Expected:
    - Party 67: Golden State Holdings LLC (entity), EIN
    - Party 68 x2: Robert Kim (60%), Lisa Park (40%)
    - Party 69: Sarah Williams
    - ValueTransferActivity: 2 payment sources totaling $1,500,000

SCENARIO 3: Entity Buyer (Corporation) + Individual Seller
  buyer: domestic corporation, 1 BO, 1 payment source
  Expected: Party 67 with corporation indicator, Party 68 x1

SCENARIO 4: Trust Buyer + Individual Seller
  buyer_party_data:
    entity_type: "trust"
    trust_name: "The Chen Family Trust dated March 15, 2018"
    trust_type: "revocable_living_trust"
    trust_ein: "77-8899001"
    trust_date: "2018-03-15"
    is_revocable: true
    address: {street: "456 Oak Avenue", city: "Pasadena", state: "CA", zip: "91101", country: "US"}
    trustees: [
      {
        type: "individual",
        individual: {
          first_name: "Michael", last_name: "Chen",
          date_of_birth: "1985-03-15", ssn: "123-45-6789",
          citizenship: "US",
          address: {street: "456 Oak Avenue", city: "Pasadena", state: "CA", zip: "91101", country: "US"},
          phone: "626-555-0100", email: "michael@example.com"
        },
        role: "trustee"
      }
    ]
    settlors: [{name: "Michael Chen", relationship: "grantor"}]
    beneficiaries: [{name: "Emily Chen"}, {name: "David Chen"}]
    payment_sources: [{source_type: "trust_funds", amount: 950000, payment_method: "wire_transfer", institution_name: "Charles Schwab", account_last4: "7890"}]
  Expected:
    - Party 67: Trust with RevocableTrustIndicator=Y, EIN
    - Party 68: Michael Chen (trustee)
    - ValueTransferActivity: $950,000

SCENARIO 5: Individual Buyer + Entity Seller
  buyer: simple individual
  seller: entity_type: "entity", entity_name: "ABC Investments LLC", ein: "88-7766554"
  Expected: Party 69 as entity with EIN

SCENARIO 6: Individual Buyer + Trust Seller
  seller: trust with trustee association
  Expected: Party 69 as trust, Party 70 (trustee association)

SCENARIO 7: Entity Buyer + Entity Seller (both sides complex)
  Both entity, both with full data
  Expected: All party types populated

SCENARIO 8: Trust Buyer + Trust Seller (maximum complexity)
  Both trust, both with trustees
  Expected: Maximum party count, all elements present

SCENARIO 9: Entity Buyer + Multiple Payment Sources
  3 payment sources: personal funds + business funds + loan
  Expected: 3 ValueTransferActivityDetail elements, correct total

SCENARIO 10: Foreign Individual Buyer (passport, no SSN)
  buyer:
    citizenship: "GB"
    id_type: "foreign_passport", id_number: "GB12345678"
    id_jurisdiction: "GB"
    NO ssn field
  Expected:
    - Party 67 with foreign passport ID (type 6 or 9)
    - No SSN-based identification
    - OtherIssuerCountryText = "GB"

====================================================================
FOR EACH SCENARIO, THE SCRIPT MUST:
====================================================================

1. CREATE mock objects:
   - Mock Report with wizard_data containing reportingPerson + propertyAddress + closingDate
   - Mock ReportParty objects for buyer and seller with party_data

2. RUN party_data_sync:
   - Call the sync function (or simulate it) to merge party_data into wizard_data
   - Capture the synced wizard_data

3. RUN RERX builder:
   - Call build_rerx_xml() with the synced report
   - Capture XML output or PreflightError
   - Capture debug_summary

4. VALIDATE XML structurally:
   - Parse XML
   - Check for required parties (35, 37, 67, 69)
   - Check Party 68 count matches expected
   - Check ValueTransferActivity present
   - Check payment source count matches expected
   - Check all SeqNums unique
   - Check ActivityCount attribute
   - Check no "Unknown Transferee" appears
   - Check no "UNKNOWN" or "N/A" placeholders

5. RECORD results:
   - scenario_name
   - sync_status: PASS/FAIL
   - xml_generated: PASS/FAIL
   - preflight_error: None or message
   - xml_valid: PASS/FAIL
   - party_67_present: Y/N + name
   - party_68_count: number
   - party_69_present: Y/N + name
   - payment_source_count: number
   - total_amount: number
   - warnings: list
   - xml_size_bytes: number

====================================================================
OUTPUT FORMAT
====================================================================

Print a summary table after all scenarios:

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    RERX STRESS TEST RESULTS                                    ║
║                    Date: 2026-02-12                                            ║
║                    Scenarios: 10                                               ║
╠══════════════════════════════════════════════════════════════════════════════════╣

┌────┬──────────────────────────────┬──────┬──────┬──────┬─────┬─────┬─────┬──────┐
│ #  │ Scenario                     │ Sync │  XML │Valid │P-67 │P-68 │P-69 │ Pmts │
├────┼──────────────────────────────┼──────┼──────┼──────┼─────┼─────┼─────┼──────┤
│  1 │ Individual ↔ Individual      │  ✅  │  ✅  │  ✅  │  1  │  0  │  1  │   1  │
│  2 │ Entity(LLC) ↔ Individual     │  ✅  │  ✅  │  ✅  │  1  │  2  │  1  │   2  │
│  3 │ Entity(Corp) ↔ Individual    │  ✅  │  ✅  │  ✅  │  1  │  1  │  1  │   1  │
│  4 │ Trust ↔ Individual           │  ✅  │  ✅  │  ✅  │  1  │  1  │  1  │   1  │
│  5 │ Individual ↔ Entity          │  ✅  │  ✅  │  ✅  │  1  │  0  │  1  │   1  │
│  6 │ Individual ↔ Trust           │  ✅  │  ✅  │  ✅  │  1  │  0  │  1  │   1  │
│  7 │ Entity ↔ Entity              │  ✅  │  ✅  │  ✅  │  1  │  2  │  1  │   2  │
│  8 │ Trust ↔ Trust                │  ✅  │  ✅  │  ✅  │  1  │  1  │  1  │   1  │
│  9 │ Entity + Multi-Payment       │  ✅  │  ✅  │  ✅  │  1  │  1  │  1  │   3  │
│ 10 │ Foreign Individual           │  ✅  │  ✅  │  ✅  │  1  │  0  │  1  │   1  │
└────┴──────────────────────────────┴──────┴──────┴──────┴─────┴─────┴─────┴──────┘

PASSED: 10/10
FAILED: 0/10
WARNINGS: 2

Warnings:
  - Scenario 6: FI country is US (FBARX guide says FI should be non-US)
  - Scenario 10: Foreign passport used, verify OtherIssuerCountryText

```

If --verbose flag, also print for each scenario:
  - Full party_data (before sync)
  - Full wizard_data (after sync)
  - debug_summary from builder
  - XML snippet (first 50 lines)
  - Validation details

If --save-xml flag, save each XML to:
  /tmp/rerx_stress_test_scenario_{N}.xml

====================================================================
MOCK REPORT TEMPLATE
====================================================================

Every scenario needs a base Report mock with:

wizard_data = {
    "determination": {
        "buyerType": "individual",  # varies per scenario
        "isReportable": true,
        "exemptions": []
    },
    "collection": {
        "closingDate": "2026-01-15",
        "purchasePrice": 850000,  # varies
        "propertyAddress": {
            "street": "742 Evergreen Terrace",
            "city": "Glendora",
            "state": "CA",
            "zip": "91740",
            "county": "Los Angeles",
            "country": "US"
        },
        "reportingPerson": {
            "companyName": "Pacific Coast Title Company",
            "contactName": "Jennifer Walsh",
            "email": "admin@demotitle.com",
            "phone": "626-555-0100",
            "licenseNumber": "PCT-12345",
            "address": {
                "street": "100 N Garfield Ave",
                "city": "Alhambra",
                "state": "CA",
                "zip": "91801",
                "country": "US"
            }
        }
    }
}

Transmitter env vars (use test values):
  TRANSMITTER_TIN = "123456789"
  TRANSMITTER_TCC = "PTESTCC1" (or "TBSATEST" for sandbox)

====================================================================
IMPORTANT IMPLEMENTATION NOTES
====================================================================

- The script must work WITHOUT a database connection
- Mock the Report and ReportParty objects with SimpleNamespace or dataclass
- Make sure mock objects have all attributes the builder/sync expects
  (id, wizard_data, parties, status, company_id, etc.)
- Import the REAL builder and sync functions — don't re-implement
- If imports fail due to DB dependencies, mock the minimum needed
- Set test env vars before importing config:
    os.environ.setdefault("TRANSMITTER_TIN", "123456789")
    os.environ.setdefault("TRANSMITTER_TCC", "TBSATEST")
- Auto-load .env file for local development
- Exit code 0 if all pass, exit code 1 if any fail

Run with: python -m app.scripts.rerx_stress_test
