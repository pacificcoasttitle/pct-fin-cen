Party Portal — Comprehensive Data Collection (RERX Compliance)

THIS IS THE MOST CRITICAL FEATURE. If the portal doesn't collect everything
RERX needs, filings get rejected by FinCEN. Every missing field = rejection.

====================================================================
STRATEGY: Hybrid Stepper + Existing Comprehensive Components
====================================================================

Keep the stepper framework (clean UX, step-by-step flow).
Make steps ROLE-AWARE and TYPE-AWARE.
Reuse existing comprehensive components (BeneficialOwnerCard,
PaymentSourceCard, TrusteeCard) — they already collect the right data.

====================================================================
STEP 0: FULL DIAGNOSTIC
====================================================================

Before making ANY changes, read everything:

# 1. The current stepper page
cat web/app/p/\[token\]/page.tsx

# 2. ALL stepper step components
ls web/components/party-portal/steps/
cat web/components/party-portal/steps/PersonalInfoStep.tsx
cat web/components/party-portal/steps/AddressStep.tsx
cat web/components/party-portal/steps/DocumentsStep.tsx
cat web/components/party-portal/steps/CertificationStep.tsx

# 3. The EXISTING comprehensive forms (already built, not currently used)
cat web/components/party-portal/BuyerEntityForm.tsx
cat web/components/party-portal/BuyerTrustForm.tsx
cat web/components/party-portal/SellerIndividualForm.tsx
cat web/components/party-portal/BeneficialOwnerCard.tsx
cat web/components/party-portal/PaymentSourceCard.tsx
cat web/components/party-portal/TrusteeCard.tsx 2>/dev/null || echo "No TrusteeCard"

# 4. The shared types
cat web/components/party-portal/types.ts

# 5. The data sync layer (what field names it expects)
cat api/app/services/party_data_sync.py

# 6. What the RERX builder reads
grep -n "beneficial_owners\|beneficialOwners\|payment_sources\|paymentSources\|trustees\|settlors\|revocable\|individual.*buyer\|buyerIndividual" api/app/services/fincen/rerx_builder.py | head -30

# 7. The party portal index exports
cat web/components/party-portal/index.tsx 2>/dev/null || cat web/components/party-portal/index.ts 2>/dev/null

# 8. How party_data is structured when saved
grep -B 3 -A 20 "def.*save\|party_data\|PartySubmission" api/app/routes/parties.py | head -60

====================================================================
STEP 1: NEW STEPPER STRUCTURE
====================================================================

The stepper steps should be DYNAMIC based on party_role and entity_type.

For ALL parties:
  Step 0: Personal/Entity Info (type-aware)
  Step 1: Address
  Step 2: Documents (ID + entity docs)
  Step 3: Review & Certify

For BUYERS ONLY (add between Address and Documents):
  Step 2: Beneficial Owners / Trustees (entity/trust buyers only)
  Step 3: Payment Sources (ALL buyers)
  Step 4: Documents
  Step 5: Review & Certify

Full matrix:

| Party Type              | Steps                                                    |
|-------------------------|----------------------------------------------------------|
| Individual Buyer        | Info → Address → Payment → Docs → Certify                |
| Entity Buyer            | Info → Address → BOs → Payment → Docs → Certify          |
| Trust Buyer             | Info → Address → Trustees → Payment → Docs → Certify     |
| Individual Seller       | Info → Address → Docs → Certify                          |
| Entity Seller           | Info → Address → Docs → Certify                          |
| Trust Seller            | Info → Address → Docs → Certify                          |

Implementation:
- In the stepper page (web/app/p/[token]/page.tsx), compute the steps array
  dynamically based on party_role and entity_type from the API response
- Each step has: id, label, component

====================================================================
STEP 2: ENHANCE PersonalInfoStep (Step 0)
====================================================================

PersonalInfoStep must be enhanced based on party type:

FOR INDIVIDUAL (buyer or seller):
  Current fields are mostly fine. ADD:
  - ID Type selector: SSN, US Passport, Foreign Passport, State ID, ITIN
  - ID Number field (SSN field becomes conditional based on ID type)
  - ID Jurisdiction (issuing state for state ID, country for passport)
  - These map to: id_type, id_number, id_jurisdiction in party_data

FOR ENTITY (buyer or seller):
  Current fields are mostly fine. ADD:
  - Entity subtype selector (LLC, Corporation, Partnership, Other)
    Maps to: entity_subtype
  - State of formation (already may exist, verify)
  - Date of formation (already may exist, verify)

FOR TRUST (buyer or seller):
  Current fields: trust_name, trust_type, trust_date, trust_ein
  ADD:
  - Revocable/Irrevocable toggle
    Maps to: is_revocable (boolean)
  - Trust execution date (if not already collected as trust_date)

All field names must match what party_data_sync.py expects.
Check sync layer for exact field names:
  grep -n "id_type\|id_number\|id_jurisdiction\|entity_subtype\|is_revocable\|formation" api/app/services/party_data_sync.py | head -20

If sync layer doesn't handle new fields, add mappings there too.

====================================================================
STEP 3: NEW BeneficialOwnersStep (Entity Buyers Only)
====================================================================

Create: web/components/party-portal/steps/BeneficialOwnersStep.tsx

This step collects beneficial owners for entity buyers.
REUSE the existing BeneficialOwnerCard component.

Features:
- "Add Beneficial Owner" button
- Minimum 1 BO required (show validation message)
- Each BO card collects:
  - Full name (first, middle, last, suffix)
  - Date of birth
  - SSN or other ID (with type selector)
  - Citizenship / country
  - Residential address (full)
  - Ownership percentage
  - Control person indicator (senior officer, authorized individual, other)
  - Indirect ownership checkbox + entity name if indirect
- Remove button on each card (except if only 1)
- Data saved as array: beneficial_owners[] in party_data

Check BeneficialOwnerCard for exact props/interface:
  grep -n "interface\|Props\|BeneficialOwner" web/components/party-portal/BeneficialOwnerCard.tsx | head -15

If BeneficialOwnerCard expects specific prop shapes, match them exactly.
The party_data_sync.py layer must map these to wizard_data.collection.buyerEntity.beneficialOwners[]

====================================================================
STEP 4: NEW TrusteesStep (Trust Buyers Only)
====================================================================

Create: web/components/party-portal/steps/TrusteesStep.tsx

Collects structured trustee information for trust buyers.
Check if TrusteeCard exists:
  ls web/components/party-portal/Trustee*
  
If it exists, reuse it. If not, create inline.

Each trustee needs:
- Type: Individual or Entity
- If individual:
  - Full name, DOB, SSN, citizenship
  - Residential address
  - Phone, email
  - Trustee role (trustee, co-trustee, successor trustee)
- If entity:
  - Entity name, type, EIN
  - Business address
  - Contact person name + title

Also collect in this step:
- Settlors/Grantors (who created the trust) — at least name
- Beneficiaries — at least names (may be "as described in trust agreement")

Data saved as:
  trustees[] in party_data
  settlors[] in party_data (can be simpler: just name + relationship)
  beneficiaries[] in party_data (can be simpler: just name)

====================================================================
STEP 5: NEW PaymentSourcesStep (ALL Buyers)
====================================================================

Create: web/components/party-portal/steps/PaymentSourcesStep.tsx

REUSE the existing PaymentSourceCard component.

This step collects how the buyer is paying for the property.

Features:
- "Add Payment Source" button
- Minimum 1 payment source required
- Each card collects:
  - Source type: Personal Funds, Business Funds, Loan/Mortgage,
    Gift, Inheritance, Sale of Property, Other
  - Amount (USD)
  - Payment method: Wire Transfer, Cashier's Check, Personal Check,
    Cash, Cryptocurrency, Other
  - Financial institution name
  - Account number (last 4 digits only)
  - If third-party source: payer name, relationship, payer address
- Remove button on each card (except if only 1)

Data saved as: payment_sources[] in party_data

Check PaymentSourceCard for exact props:
  grep -n "interface\|Props\|PaymentSource" web/components/party-portal/PaymentSourceCard.tsx | head -15

The party_data_sync.py layer must map these to wizard_data.collection.paymentSources[]

====================================================================
STEP 6: UPDATE party_data_sync.py
====================================================================

The sync layer needs to handle ALL new fields. Check what's already mapped:
  cat api/app/services/party_data_sync.py

Add mappings for any missing fields:
- beneficial_owners[] → buyerEntity.beneficialOwners[]
- payment_sources[] → collection.paymentSources[]
- trustees[] → buyerTrust.trustees[]
- settlors[] → buyerTrust.settlors[]
- beneficiaries[] → buyerTrust.beneficiaries[]
- is_revocable → buyerTrust.isRevocable
- id_type → appropriate field per party type
- id_number → appropriate field per party type
- id_jurisdiction → appropriate field per party type
- entity_subtype → buyerEntity.entity.entitySubtype

Each field must snake_case → camelCase conversion.
Each field must match what rerx_builder.py reads.

====================================================================
STEP 7: FIX RERX BUILDER — Individual Buyer Handler
====================================================================

The RERX builder currently outputs "Unknown Transferee" for individual buyers:

  grep -B 5 -A 10 "Unknown Transferee" api/app/services/fincen/rerx_builder.py

Fix this to properly map individual buyer data:
- Read from wizard_data.collection for individual buyer fields
  (first_name, last_name, dob, ssn, address)
- Map to Party 67 with proper name, DOB, ID, address
- This is critical — individual buyers are common transactions

====================================================================
STEP 8: STEPPER UI POLISH
====================================================================

The stepper should:
- Show step count reflecting actual steps for this party type
  (e.g., "Step 3 of 6" for entity buyer, "Step 3 of 5" for individual buyer)
- Step labels should be descriptive:
  "Personal Info" → "Address" → "Beneficial Owners" → "Payment Details" → "Documents" → "Review & Submit"
- Progress bar should reflect dynamic step count
- Each step should have a brief description/helper text at the top:
  - BOs: "FinCEN requires information about individuals who own 25% or more
    of the purchasing entity, or who exercise substantial control."
  - Payment: "Please provide details about how this property purchase is being funded."
  - Trustees: "Please provide information about each trustee of the trust."

====================================================================
STEP 9: VALIDATION PER STEP
====================================================================

Each step should validate before allowing "Continue":

PersonalInfoStep:
- Name required
- DOB required (buyers)
- At least one ID (SSN, passport, etc.) required
- Entity: entity_name + EIN required
- Trust: trust_name required

AddressStep:
- Street, city, state, zip required

BeneficialOwnersStep:
- At least 1 BO with name + DOB + ID + address
- Ownership percentages should be filled (warn if they don't sum to ~100%)

PaymentSourcesStep:
- At least 1 source with type + amount + method
- Total amount should be filled

DocumentsStep:
- Government ID required for individuals
- Formation docs required for entities
- Trust agreement required for trusts

CertificationStep:
- Acknowledgment checkbox checked
- Signature name filled

====================================================================
DO NOT
====================================================================

- Do not delete or break existing step components — enhance them
- Do not change the certification/submission endpoint
- Do not change the party_data column structure (it's JSONB, flexible)
- Do not change the R2 upload flow (just fixed)
- Do not change the autosave mechanism
- Do not remove the stepper UX — enhance it with more steps
- Do not hardcode party types — use the party_role and entity_type from API
- Do not change the party portal token-based auth
- Preserve backward compatibility: if a party already started with the old
  4-step flow, their saved data should still load in the new flow

====================================================================
FILE SUMMARY
====================================================================

New files to create:
- web/components/party-portal/steps/BeneficialOwnersStep.tsx
- web/components/party-portal/steps/PaymentSourcesStep.tsx
- web/components/party-portal/steps/TrusteesStep.tsx

Files to modify:
- web/app/p/[token]/page.tsx (dynamic step computation)
- web/components/party-portal/steps/PersonalInfoStep.tsx (add ID type, entity subtype, revocable)
- web/components/party-portal/types.ts (ensure all field types defined)
- api/app/services/party_data_sync.py (new field mappings)
- api/app/services/fincen/rerx_builder.py (individual buyer fix)

Files to reuse (import from, do not modify):
- web/components/party-portal/BeneficialOwnerCard.tsx
- web/components/party-portal/PaymentSourceCard.tsx
