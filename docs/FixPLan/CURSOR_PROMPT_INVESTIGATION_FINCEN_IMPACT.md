# CURSOR PROMPT: Investigation - FinCEN Requirements Impact Analysis

## 🎯 MISSION

Analyze our current wizard and submission flows to understand how the comprehensive FinCEN Real Estate Report requirements will affect our existing implementation.

**Context:** We've researched the full FinCEN reporting requirements and discovered we need to collect FAR more data than currently implemented, including:
- Beneficial ownership information (for entities/trusts)
- Payment source tracking (where is the money coming from?)
- Government ID collection (SSN, EIN, passport)
- Signing individual information
- Trustee information (for trusts)

---

## INVESTIGATION AREAS

### AREA 1: Client Submission Form (New Request)

**File:** `web/app/(app)/app/requests/new/page.tsx`

**Questions:**

1. What fields are currently collected when a client submits a new request?
2. Do we collect buyer TYPE (individual vs entity vs trust)?
3. Do we collect any beneficial owner information?
4. Do we collect payment method/source information?
5. What is the current data structure being sent to the API?

**Show:**
- The form fields/schema
- The submission payload structure
- Any TypeScript interfaces for the form data

---

### AREA 2: Submission Request Model

**File:** `api/app/models/submission_request.py`

**Questions:**

1. What fields exist on the SubmissionRequest model?
2. Is there a `buyer_type` field?
3. Is there a `buyer_info` or `party_info` JSONB field?
4. How is buyer information currently stored?
5. What fields flow from SubmissionRequest → Report?

**Show:**
- The complete model definition
- All columns and their types

---

### AREA 3: Wizard - Party Setup Phase

**File:** `web/components/rrer-questionnaire.tsx` (or wherever party setup is)
**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

**Questions:**

1. What party information does the wizard currently collect?
2. Is there a "Party Setup" step/phase?
3. What fields are collected for buyers?
4. What fields are collected for sellers?
5. Is there any distinction between individual/entity/trust buyers?
6. How does party data flow into the party portal links?

**Show:**
- The party setup UI code
- The data structure for parties
- How parties are created/saved

---

### AREA 4: Party Portal (Buyer/Seller Forms)

**File:** `web/app/party/[token]/page.tsx` (or similar)
**File:** Look for party portal components

**Questions:**

1. What is the current party portal URL structure?
2. What form fields exist for buyers to fill out?
3. What form fields exist for sellers to fill out?
4. Is there any conditional logic based on party type?
5. What data is submitted when a party completes their form?
6. Is there any ID upload functionality?

**Show:**
- The complete party form
- The submission payload
- Any validation logic

---

### AREA 5: Report Party Model

**File:** `api/app/models/report_party.py` (or similar)

**Questions:**

1. What is the structure of the ReportParty model?
2. Is there a `party_data` JSONB field?
3. What is the expected structure of `party_data`?
4. Is there a `party_type` field (buyer/seller)?
5. Is there an `entity_type` field (individual/entity/trust)?
6. How are beneficial owners stored (if at all)?

**Show:**
- The complete model definition
- Any related Pydantic schemas

---

### AREA 6: Party Links Creation

**File:** `api/app/routes/reports.py` (or party-links endpoint)

**Questions:**

1. What data is required to create party links?
2. What data is pre-filled when creating links?
3. How much party information comes from wizard vs portal?
4. What validation exists on party link creation?

**Show:**
- The party-links endpoint
- The request schema
- The response structure

---

### AREA 7: Data Flow Diagram

Based on investigation, document:

```
Client Request → SubmissionRequest
      ↓
Staff Wizard → Report + ReportParties
      ↓
Party Links → Parties fill portal
      ↓
All Data → FinCEN Report
```

**Questions:**
1. At which point is buyer TYPE determined?
2. At which point are beneficial owners collected?
3. At which point is payment information collected?
4. Where does ID information get captured?

---

## OUTPUT FORMAT

```markdown
# FinCEN Impact Analysis Findings

## Current State Summary

### Client Submission Form
- Fields collected: [list]
- Buyer type collected: [yes/no]
- Payment info collected: [yes/no]
- Missing for FinCEN: [list]

### Submission Request Model
```python
[show model]
```
- Has buyer_type: [yes/no]
- Has payment_info: [yes/no]
- Missing fields: [list]

### Wizard Party Setup
- Current fields: [list]
- Individual vs Entity distinction: [yes/no]
- Beneficial owner collection: [yes/no]
- Missing for FinCEN: [list]

### Party Portal
- Current fields: [list]
- Type-specific forms: [yes/no]
- ID upload: [yes/no]
- Payment source collection: [yes/no]
- Missing for FinCEN: [list]

### Report Party Model
```python
[show model]
```
- party_data structure: [show]
- Missing fields: [list]

---

## Gap Analysis

### CRITICAL GAPS (Must fix for compliance)

| Gap | Current State | Required State | Affected Components |
|-----|---------------|----------------|---------------------|
| Buyer Type | Not collected | Individual/Entity/Trust | Submission, Wizard, Portal |
| Beneficial Owners | Not collected | Required for Entity/Trust | Wizard, Portal, Model |
| Payment Sources | Not collected | Required with bank details | Portal, Model |
| Government ID | Not collected | SSN/EIN/Passport required | Portal, Model |
| Signing Individual | Not collected | Required for Entity/Trust | Portal, Model |

### MODERATE GAPS (Should fix)

| Gap | Description | Affected Components |
|-----|-------------|---------------------|
| ... | ... | ... |

### MINOR GAPS (Nice to have)

| Gap | Description | Affected Components |
|-----|-------------|---------------------|
| ... | ... | ... |

---

## Recommended Changes

### Phase 1: Data Model Updates

```python
# Suggested model changes
```

### Phase 2: Client Submission Updates

```typescript
// Suggested form changes
```

### Phase 3: Wizard Updates

```typescript
// Suggested wizard changes
```

### Phase 4: Party Portal Updates

```typescript
// Suggested portal changes
```

---

## Data Flow (Current vs Required)

### Current Flow
```
[diagram]
```

### Required Flow
```
[diagram]
```

---

## Ripple Effect Summary

| Component | Impact Level | Changes Needed |
|-----------|-------------|----------------|
| Client Submission | 🟡 Medium | Add buyer type selection |
| Submission Model | 🟡 Medium | Add buyer_type, payment_method fields |
| Wizard | 🔴 High | Major party setup enhancement |
| Party Portal | 🔴 High | Complete redesign for entity/trust |
| Report Party Model | 🔴 High | Expand party_data schema |
| Party Links API | 🟡 Medium | Update to pass type info |
| FinCEN Export | 🔴 High | New feature needed |

---

## Questions for Product Decision

1. Should buyer type be collected at submission or wizard?
2. Should we support multiple beneficial owners in Phase 1?
3. Do we require ID upload or just ID numbers?
4. How do we handle payment sources changing at closing?
```

---

## KEY FILES TO EXAMINE

```
# Frontend
web/app/(app)/app/requests/new/page.tsx      # Client submission
web/app/(app)/app/reports/[id]/wizard/       # Wizard
web/components/rrer-questionnaire.tsx        # Wizard questionnaire
web/app/party/[token]/page.tsx               # Party portal (find exact path)

# Backend
api/app/models/submission_request.py         # Submission model
api/app/models/report.py                     # Report model
api/app/models/report_party.py               # Party model (find exact name)
api/app/routes/submission_requests.py        # Submission endpoints
api/app/routes/reports.py                    # Report/party endpoints

# Schemas
api/app/schemas/                             # Pydantic schemas
```

---

## WHAT WE NEED TO COLLECT (Reference)

### For Individual Buyer:
- Full name (first, middle, last, suffix)
- Date of birth
- Citizenship
- Residential address
- SSN/ITIN or Foreign ID

### For Entity Buyer (LLC, Corp):
- All above for signing individual
- Entity name, type, DBA
- EIN or Foreign ID
- Principal place of business
- **ALL Beneficial Owners** (name, DOB, address, citizenship, ID, ownership %)

### For Trust Buyer:
- Trust name, date executed, revocable?
- TIN
- **ALL Beneficial Owners** (trustees, beneficiaries, grantors)
- Trustee entities (if any)

### For ALL Buyers:
- Payment sources (amount, method, bank, account, payor)
- Certification/signature

---

**This investigation will reveal how much work is needed to achieve full FinCEN compliance.**
