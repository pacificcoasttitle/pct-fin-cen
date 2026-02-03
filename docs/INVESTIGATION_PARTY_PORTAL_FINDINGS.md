# Party Portal Investigation Findings

**Investigation Date:** February 3, 2026  
**Days to FinCEN Deadline:** 26  
**Investigator:** Cursor AI  

---

## Executive Summary

The Party Portal (`/p/{token}`) is a **functional and comprehensive** system for collecting party information. The core infrastructure exists and works:
- Token generation, validation, and expiration ✅
- Email delivery of invitation links ✅
- Party status tracking and real-time updates ✅
- Form submission and autosave ✅
- Post-submission confirmation ✅

**Critical Finding:** There is a **data contract mismatch** between what the portal collects and what the RERX builder expects. The portal stores data directly in `ReportParty.party_data`, but the RERX builder reads from `report.wizard_data.collection`. This means **party-submitted data may not flow to the XML generator**.

---

## Part 1: Portal Infrastructure Findings

### Token System

| Attribute | Value |
|-----------|-------|
| **Token Model** | `PartyLink` (`api/app/models/party_link.py`) |
| **Token Generation** | `secrets.token_urlsafe(32)` — 43-char URL-safe base64 |
| **Token Entropy** | 256 bits — cryptographically secure |
| **Token Expiration** | Configurable, default 7 days |
| **Token → Party Mapping** | `PartyLink.report_party_id` FK → `ReportParty.id` |

**PartyLink Fields:**
```python
id: UUID (primary key)
report_party_id: UUID (FK → report_parties)
token: String(64), unique, indexed
expires_at: DateTime
status: String ("active", "used", "expired", "revoked")
created_at: DateTime
opened_at: DateTime (when party first opened)
submitted_at: DateTime (when party submitted)
```

**ReportParty Fields:**
```python
id: UUID (primary key)
report_id: UUID (FK → reports)
party_role: String ("transferee", "transferor", "beneficial_owner")
entity_type: String ("individual", "entity", "trust")
display_name: String(255)
party_data: JSONB (flexible schema - stores all form data)
status: String ("pending", "link_sent", "in_progress", "submitted", "verified")
created_at: DateTime
updated_at: DateTime
```

### Link Delivery

| Feature | Status | Location |
|---------|--------|----------|
| Email integration | ✅ YES | `api/app/services/email_service.py` lines 414-450 |
| SendGrid enabled | ✅ YES | Via `SENDGRID_ENABLED` env var |
| Manual copy/paste | ✅ YES | Link URL returned in API response |
| Resend capability | 🔴 NO | No endpoint to regenerate/resend links |

**Email Template Features:**
- Branded HTML email with property address card
- Role display (Buyer, Seller)
- 7-day expiration warning
- FAQ section explaining FinCEN requirements
- Mobile-responsive design

### Portal Route

| Attribute | Value |
|-----------|-------|
| **URL Pattern** | `/p/{token}` |
| **Frontend Route** | `web/app/p/[token]/page.tsx` |
| **Backend Validation** | `GET /party/{token}` |
| **Auth Mechanism** | Token-only (no additional verification) |
| **Data Returned** | `party_id`, `party_role`, `entity_type`, `display_name`, `party_data`, `status`, `report_summary` |

---

## Part 2: Form Coverage Findings

### Form Components Inventory

| Component | File | Handles Party Type |
|-----------|------|--------------------|
| `DynamicPartyForm` | `index.tsx` | Router/selector |
| `SellerIndividualForm` | `SellerIndividualForm.tsx` | Seller (individual) |
| `SellerEntityForm` | `SellerEntityForm.tsx` | Seller (entity/LLC) |
| `SellerTrustForm` | `SellerTrustForm.tsx` | Seller (trust) |
| `BuyerEntityForm` | `BuyerEntityForm.tsx` | Buyer (entity/LLC) |
| `BuyerTrustForm` | `BuyerTrustForm.tsx` | Buyer (trust) |
| `GenericIndividualForm` | `index.tsx` | Buyer (individual) - fallback |
| `BeneficialOwnerCard` | `BeneficialOwnerCard.tsx` | BO sub-form |
| `PaymentSourceCard` | `PaymentSourceCard.tsx` | Payment sub-form |
| `TrusteeCard` | `TrusteeCard.tsx` | Trustee sub-form |
| `DocumentUpload` | `DocumentUpload.tsx` | Document uploads (R2) |
| `CertificationSection` | `CertificationSection.tsx` | Certification checkbox |

### Individual Seller Coverage (Party 69)

| RERX Required Field | Collected? | Portal Field | Required in Form? |
|---------------------|-----------|--------------|-------------------|
| First name | ✅ YES | `first_name` | ✅ Required |
| Middle name | ✅ YES | `middle_name` | Optional |
| Last name | ✅ YES | `last_name` | ✅ Required |
| Suffix | ✅ YES | `suffix` | Optional |
| Date of birth | ✅ YES | `date_of_birth` | ✅ Required |
| SSN/ITIN | ✅ YES | `ssn` | ✅ Required |
| Citizenship | ✅ YES | `citizenship` | ✅ Required |
| Alt ID Type | ✅ YES | `id_type` | Conditional |
| Alt ID Number | ✅ YES | `id_number` | Conditional |
| Alt ID Jurisdiction | ✅ YES | `id_jurisdiction` | Conditional |
| Street Address | ✅ YES | `address.street` | ✅ Required |
| City | ✅ YES | `address.city` | ✅ Required |
| State | ✅ YES | `address.state` | ✅ Required |
| ZIP | ✅ YES | `address.zip` | ✅ Required |
| Country | ✅ YES | `address.country` | Default "US" |
| Phone | ✅ YES | `phone` | Optional |
| Email | ✅ YES | `email` | Pre-filled, disabled |

### Entity Buyer Coverage (Party 67)

| RERX Required Field | Collected? | Portal Field | Required in Form? |
|---------------------|-----------|--------------|-------------------|
| Entity legal name | ✅ YES | `entity_name` | ✅ Required |
| DBA / trade name | ✅ YES | `entity_dba` | Optional |
| Entity subtype | ✅ YES | `entity_type` | ✅ Required |
| EIN | ✅ YES | `ein` | ✅ Required |
| State of formation | ✅ YES | `formation_state` | ✅ Required |
| Date of formation | ✅ YES | `formation_date` | Optional |
| Principal address | ✅ YES | `address` | ✅ Required |
| Phone | ✅ YES | `phone` | ✅ Required |
| Email | ✅ YES | `email` | ✅ Required |
| TransferPartyEntityIndicator | 🔴 NO | — | Must be "Y" |

### Beneficial Owner Coverage (Party 68)

| RERX Required Field | Collected? | Portal Field | Required in Form? |
|---------------------|-----------|--------------|-------------------|
| First name | ✅ YES | `first_name` | ✅ Required |
| Middle name | ✅ YES | `middle_name` | Optional |
| Last name | ✅ YES | `last_name` | ✅ Required |
| Suffix | ✅ YES | `suffix` | Optional |
| Date of birth | ✅ YES | `date_of_birth` | ✅ Required |
| SSN / ID Number | ✅ YES | `id_number` | ✅ Required |
| ID Type | ✅ YES | `id_type` | ✅ Required |
| ID Jurisdiction | ✅ YES | `id_jurisdiction` | Conditional |
| Citizenship | ✅ YES | `citizenship` | ✅ Required |
| Ownership % | ✅ YES | `ownership_percentage` | Optional |
| Control type | ✅ YES | `control_type` | Optional |
| Indirect ownership | ✅ YES | `is_indirect_owner` | Optional |
| Indirect entity name | ✅ YES | `indirect_entity_name` | Conditional |
| Trust role | ✅ YES | `trust_role` | Conditional (trust) |
| Address | ✅ YES | `address` | ✅ Required |

### Trust Buyer Coverage (Party 67 + 68)

| RERX Required Field | Collected? | Portal Field | Required in Form? |
|---------------------|-----------|--------------|-------------------|
| Trust name | ✅ YES | `trust_name` | ✅ Required |
| Trust type | ✅ YES | `trust_type` | ✅ Required |
| Execution date | ✅ YES | `trust_date` | ✅ Required |
| EIN | ✅ YES | `trust_ein` | Optional |
| Is revocable | ✅ YES | `is_revocable` | Optional |
| Trustees | ✅ YES | `trustees[]` | ✅ Required (1+) |
| Settlors | ✅ YES | `settlors[]` | Optional |
| Beneficiaries | ✅ YES | `beneficiaries[]` | Optional |
| TransferPartyTrustIndicator | 🔴 NO | — | Must be "Y" |

### Payment Source Coverage

| RERX Required Field | Collected? | Portal Field |
|---------------------|-----------|--------------|
| Amount | ✅ YES | `amount` |
| Source type | ✅ YES | `source_type` |
| Payment method | ✅ YES | `payment_method` |
| Institution name | ✅ YES | `institution_name` |
| Account last 4 | ✅ YES | `account_last_four` |
| Is third party | ✅ YES | `is_third_party` |
| Third party name | ✅ YES | `third_party_name` |

---

## Part 3: Data Flow Findings

### Submission Path

```
Frontend submit handler → POST /party/{token}/submit
                        → Backend handler in parties.py (lines 158-263)
                        → Updates ReportParty.status = "submitted"
                        → Updates PartyLink.status = "used"
                        → Generates confirmation_id
                        → Sends confirmation email
```

### Storage Location — ⚠️ CRITICAL FINDING

| Operation | Location | Model |
|-----------|----------|-------|
| Portal WRITES to | `ReportParty.party_data` | JSONB |
| RERX builder READS from | `report.wizard_data.collection` | JSONB |
| **MATCH?** | 🔴 **NO** | — |

**The Data Gap:**
1. Portal saves party data directly to `ReportParty.party_data`
2. RERX builder reads from `report.wizard_data.collection.buyerEntity`, `collection.sellers`, etc.
3. There is **no sync** between these two locations

**For the RERX builder to work**, data must be in:
- `wizard_data.collection.buyerEntity.entity` (entity details)
- `wizard_data.collection.buyerEntity.beneficialOwners[]`
- `wizard_data.collection.sellers[]`
- `wizard_data.collection.paymentSources[]`

**But portal writes to:**
- `ReportParty.party_data.entity_name`
- `ReportParty.party_data.beneficial_owners[]`
- `ReportParty.party_data.payment_sources[]`

### Payload Shape (from portal)

**Individual Seller:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "date_of_birth": "1970-05-15",
  "ssn": "123-45-6789",
  "citizenship": "us_citizen",
  "address": {
    "street": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001",
    "country": "United States"
  },
  "phone": "(555) 123-4567",
  "email": "john@example.com",
  "certified": true,
  "certification_signature": "John Smith",
  "certification_date": "February 3, 2026"
}
```

**Entity Buyer:**
```json
{
  "entity_name": "ABC Holdings LLC",
  "entity_dba": "ABC Properties",
  "entity_type": "llc_multi",
  "ein": "12-3456789",
  "formation_state": "CA",
  "formation_date": "2020-01-15",
  "address": { ... },
  "phone": "(555) 123-4567",
  "email": "contact@abc.com",
  "beneficial_owners": [
    {
      "id": "uuid",
      "first_name": "Jane",
      "last_name": "Doe",
      "date_of_birth": "1975-03-20",
      "citizenship": "us_citizen",
      "id_type": "ssn",
      "id_number": "987-65-4321",
      "ownership_percentage": 60,
      "control_type": ["senior_officer"],
      "is_indirect_owner": false,
      "address": { ... }
    }
  ],
  "payment_sources": [
    {
      "id": "uuid",
      "source_type": "business_funds",
      "amount": 425000,
      "payment_method": "wire",
      "institution_name": "First National Bank",
      "account_last_four": "1234",
      "is_third_party": false
    }
  ],
  "signer_name": "Jane Doe",
  "signer_title": "Managing Member",
  "signer_dob": "1975-03-20",
  "certified": true,
  "certification_signature": "Jane Doe",
  "certification_date": "February 3, 2026"
}
```

### Status Transitions

| Event | Party Status | PartyLink Status | Report Status |
|-------|-------------|------------------|---------------|
| Link created | `pending` | `active` | `collecting` |
| Form opened | `pending` | `active` (opened_at set) | No change |
| Form saved | `in_progress` | `active` | No change |
| Form submitted | `submitted` | `used` | No change |
| All parties done | `submitted` | `used` | **Manual** → `ready_to_file` |

**Gap:** There is no automatic transition when all parties complete. Staff must manually advance the report.

---

## Part 4: Post-Submission Findings

### Party Confirmation

| Feature | Status |
|---------|--------|
| Confirmation page | ✅ YES — Green success card with confirmation ID |
| Confirmation ID format | `PCT-{YEAR}-{party_id_last5}` |
| Edit after submit | 🔴 NO — Link invalidated |
| Re-access via token | 🔴 NO — Token status = "used", returns 410 |
| Email confirmation | ✅ YES — If email provided |

### Staff Visibility

| Feature | Status | Location |
|---------|--------|----------|
| Party status in wizard | ✅ YES | `web/app/(app)/app/reports/[id]/wizard/page.tsx` lines 499-735 |
| Party data viewable | ✅ YES | Review page shows submitted data |
| Party data editable | 🟡 PARTIAL | Staff can edit wizard_data, but not party_data directly |
| Real-time polling | ✅ YES | 15-second interval when in collecting mode |
| All-complete indicator | ✅ YES | Green checkmark when all submitted |

### Notifications

| Event | Email Sent? | Recipient | Audit Log? |
|-------|------------|-----------|------------|
| Link generated | ✅ YES (if email) | Party | ✅ YES |
| Party opens link | 🔴 NO | — | ✅ YES |
| Party submits form | ✅ YES (if email) | Party | ✅ YES |
| All parties complete | 🔴 NO | — | 🔴 NO |

---

## Part 5: RERX Builder ↔ Portal Data Contract

### Critical Mismatch Analysis

**RERX Builder reads from (`rerx_builder.py` lines 91-185):**

```python
wizard_data = report.wizard_data or {}
collection = wizard_data.get("collection", {})
determination = wizard_data.get("determination", {})

# Buyer
buyer_type = determination.get("buyerType") or collection.get("buyerType")
buyer_entity = collection.get("buyerEntity", {})
buyer_trust = collection.get("buyerTrust", {})
beneficial_owners = buyer_entity.get("beneficialOwners", [])
signing_individuals = collection.get("signingIndividuals", [])

# Seller
sellers = collection.get("sellers", [])

# Payment
payment_sources = collection.get("paymentSources", [])
purchase_price = collection.get("purchasePrice", 0)
```

**Portal saves to:**

```python
party.party_data = {
    "entity_name": "...",
    "beneficial_owners": [...],  # Stored in party_data, NOT wizard_data!
    "payment_sources": [...],
}
```

### Field Mapping Gap Table

| RERX Builder Source | Portal Storage | Match? | Impact |
|---------------------|----------------|--------|--------|
| `collection.buyerEntity.entity.legalName` | `party_data.entity_name` | 🔴 NO | Entity name missing |
| `collection.buyerEntity.beneficialOwners[]` | `party_data.beneficial_owners[]` | 🔴 NO | BOs missing |
| `collection.sellers[]` | `party_data` (individual fields) | 🔴 NO | Sellers missing |
| `collection.paymentSources[]` | `party_data.payment_sources[]` | 🔴 NO | Payments missing |
| `report.parties[role=transferee]` | ✅ POPULATED | ✅ YES | Party exists |
| `party.party_data` | ✅ POPULATED | ✅ YES | Data exists |

**Root Cause:** The RERX builder was written to consume wizard-entered data (`wizard_data.collection`), not portal-submitted data (`ReportParty.party_data`).

### Preflight ↔ Portal Coverage

| Preflight Check | What It Validates | Portal Collects? | Gap? |
|-----------------|-------------------|------------------|------|
| Reporting person company name | `reportingPerson.companyName` | 🔴 NO | Portal doesn't collect this |
| Buyer has identification | EIN for entities | ✅ YES | — |
| Seller exists | At least one transferor | ✅ YES | But wrong location |
| Property address | `collection.propertyAddress` | 🔴 NO | Comes from wizard |
| Purchase price | `collection.purchasePrice` | 🔴 NO | Comes from wizard |

---

## Part 6: Edge Cases & Error Handling

### Partial Form Handling

| Scenario | Behavior |
|----------|----------|
| Partial fill, close browser | ✅ Data auto-saved via debounced `/save` endpoint |
| Return to same token | ✅ Can resume — data hydrates from `party_data` |
| Partial data stored | ✅ YES — `party.status = "in_progress"` |

### Validation

| Layer | Implementation |
|-------|----------------|
| Client-side | Comprehensive — `validation.ts` (500+ lines) |
| Server-side | Minimal — only checks `first_name`/`last_name` OR `entity_name` |
| Error messages | Client shows inline errors, server returns 400 with details |
| Can resubmit | 🔴 NO — link invalidated after first submit |

### Token Edge Cases

| Scenario | Behavior |
|----------|----------|
| Token expired | 410 Gone — "This link has expired" |
| Token invalid | 404 Not Found — "This link is invalid" |
| Token already used | 410 Gone — "This link has already been used" |
| Request new link | 🔴 NO — No self-service resend |

### Multiple Parties

| Scenario | Behavior |
|----------|----------|
| Multiple buyers | Each gets own `ReportParty` + `PartyLink` |
| Multiple sellers | Each gets own `ReportParty` + `PartyLink` |
| Adding parties after links sent | ✅ Can create more via `POST /reports/{id}/party-links` |
| Party sees each other's data | 🔴 NO — Tokens are unique per party |

### Staff Editing

| Scenario | Behavior |
|----------|----------|
| Edit after party submit | 🟡 PARTIAL — Can edit `wizard_data`, not `party_data` |
| Require party resubmit | 🔴 NO — No mechanism |

### Mobile Experience

| Feature | Status |
|---------|--------|
| Responsive design | ✅ YES — All forms use responsive grid (grid-cols-2 → grid-cols-1) |
| Touch-friendly inputs | ✅ YES — Standard HTML inputs |
| Date picker | ✅ YES — Native date input |
| Document upload | ✅ YES — Works on mobile |

---

## Part 7: Cross-Cutting Concerns

### Security

| Concern | Status | Notes |
|---------|--------|-------|
| SSN/EIN encrypted at rest | 🟡 PARTIAL | Stored as plain text in JSONB, DB encrypted at rest |
| Portal served over HTTPS | ✅ YES | Vercel forces HTTPS |
| Token entropy | ✅ SECURE | 256 bits (secrets.token_urlsafe(32)) |
| Brute force protection | 🔴 NO | No rate limiting on `/party/{token}` |
| Cross-party access | ✅ SECURE | Tokens unique, validated against party |

### Data Sensitivity Display

| Feature | Status |
|---------|--------|
| SSN masked in UI | ✅ YES — `type="password"` on input |
| SSN masked in staff view | 🟡 PARTIAL — Review page may show full |
| SSN stored full or masked | 🔴 FULL | Stored unmasked in party_data |

---

## CRITICAL GAPS SUMMARY

### 🔴 Blockers (Party portal won't work without these)

| Gap | Impact | Estimated Effort |
|-----|--------|------------------|
| **Portal data → wizard_data sync** | RERX builder cannot consume portal-submitted data. XML generation will fail or produce incomplete reports. | **HIGH** — Need data transformation layer or update RERX builder to read from `report.parties` |
| **Reporting person not collected in portal** | Required for Party 31. Currently comes from wizard, not party portal. | **LOW** — By design (staff enters this) |

### 🟡 Important (Should fix before March 1)

| Gap | Impact | Estimated Effort |
|-----|--------|------------------|
| **No link resend capability** | If party loses email, no self-service recovery | **LOW** — Add endpoint |
| **No "all parties complete" notification** | Staff must manually check | **LOW** — Add webhook/notification |
| **No auto-transition to ready_to_file** | Manual step required | **LOW** — Add check in submit handler |
| **No rate limiting on portal endpoints** | Potential abuse | **MEDIUM** — Add rate limiter |

### 🟢 Nice to Have (Post-launch)

| Gap | Impact | Estimated Effort |
|-----|--------|------------------|
| Staff edit party_data directly | Currently indirect via wizard | **MEDIUM** |
| Party resubmission flow | Edge case recovery | **MEDIUM** |
| SSN masking in storage | Defense in depth | **MEDIUM** |
| Party submission webhook to external systems | Integration | **LOW** |

---

## RERX DATA CONTRACT STATUS

### Fully Covered (portal collects → builder consumes → XML generated)

- ✅ Individual seller name (first, middle, last, suffix)
- ✅ Individual seller DOB
- ✅ Individual seller SSN
- ✅ Individual seller address
- ✅ Entity buyer name, EIN, formation state
- ✅ Beneficial owner name, DOB, ID, address, ownership %
- ✅ Trust name, execution date, EIN
- ✅ Trustee information
- ✅ Payment source amounts and methods

### Partially Covered (some fields missing or wrong location)

- 🟡 Entity buyer data — collected in `party_data`, builder reads from `wizard_data.collection.buyerEntity`
- 🟡 Seller data — collected in `party_data`, builder reads from `wizard_data.collection.sellers`
- 🟡 Payment sources — collected in `party_data.payment_sources`, builder reads from `wizard_data.collection.paymentSources`

### Not Covered (builder expects data that portal does not collect)

- 🔴 `TransferPartyEntityIndicator` / `TransferPartyTrustIndicator` — must be added programmatically
- 🔴 `reportingPerson` — comes from wizard, not portal (by design)
- 🔴 `propertyAddress` — comes from wizard, not portal (by design)
- 🔴 `purchasePrice` — comes from wizard, not portal (by design)

---

## Recommendations

### Immediate (This Week)

1. **Fix the data contract mismatch** — Either:
   - Option A: Update RERX builder to read from `report.parties` + `party.party_data`
   - Option B: Add a sync function that copies `party_data` to `wizard_data.collection` on submit

2. **Add "all parties complete" check** — When last party submits, optionally auto-transition report status

3. **Test end-to-end** — Create a test report, generate links, submit via portal, verify RERX XML generates correctly

### Pre-Launch (By Feb 28)

4. **Add link resend endpoint** — `POST /reports/{id}/party-links/{party_id}/resend`

5. **Add rate limiting** — Protect portal endpoints from abuse

6. **Verify mobile experience** — Test on actual phones

### Post-Launch

7. **Add staff notification on party submit** — Email or in-app alert

8. **Add SSN/EIN masking in storage** — Encrypt at application layer

9. **Add party resubmission flow** — For correction scenarios

---

**DO NOT FIX ANYTHING YET — This is investigation only.**

*Investigation complete: February 3, 2026*
