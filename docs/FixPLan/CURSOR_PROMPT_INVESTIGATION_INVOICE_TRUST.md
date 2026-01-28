# CURSOR PROMPT: Investigation - Invoice System & Trust Form Current State

## MISSION

Before we build, we need to understand exactly what exists. Answer these questions by examining the codebase.

---

## INVESTIGATION 1: Invoice System

### 1.1 Invoice Page Current Implementation

**File to examine:** `web/app/(app)/app/invoices/page.tsx`

Questions:
1. What data source does it currently use?
   - Hardcoded mock array?
   - API call to `/invoices`?
   - API call to `/reports?status=filed`?
   - Something else?

2. What does the invoice table show?
   - What columns exist?
   - Is there pagination?
   - Is there filtering/sorting?

3. What actions are available?
   - View button - what does it do?
   - Download PDF - is it functional or disabled?
   - Any other actions?

### 1.2 Invoice Detail Sheet

**File to examine:** `web/components/admin/invoice-detail-sheet.tsx` (or similar)

Questions:
1. Does this component exist?
2. What data does it display?
3. Is it using mock data or real data?
4. What's the UI structure?

### 1.3 Invoice API Endpoints

**Files to examine:** `api/app/routes/` directory

Questions:
1. Does `invoices.py` route file exist?
2. If yes, what endpoints are defined?
   - `GET /invoices`?
   - `GET /invoices/{id}`?
   - `POST /invoices`?
3. Is there an Invoice model in `api/app/models/`?
4. If no dedicated invoice system, how are "invoices" being generated?
   - From filed reports?
   - Computed on the fly?

### 1.4 Invoice Data Model

**File to examine:** `api/app/models/` directory

Questions:
1. Does an `Invoice` model exist?
2. If yes, what fields does it have?
3. If no, should invoices be:
   - A separate table?
   - Derived from Reports (filed reports = invoices)?
   - Something else?

---

## INVESTIGATION 2: Trust Buyer Form

### 2.1 Current Party Portal Forms

**Files to examine:** `web/components/party-portal/`

Questions:
1. What form files currently exist?
   - List all files in this directory
2. Is there already a `TrustForm.tsx` or `BuyerTrustForm.tsx`?
3. How does `index.tsx` (DynamicPartyForm) handle trust types?
   - Does it have a case for `trust`?
   - Does it fall back to a generic form?

### 2.2 Trust Type Handling

**File to examine:** `web/components/party-portal/index.tsx`

Questions:
1. What's the form selection logic?
2. Show me the switch/if statement that picks forms based on:
   - `party_role` (buyer/seller)
   - `entity_type` (individual/entity/trust)
3. What happens when `entity_type === "trust"`?

### 2.3 Existing Trust Types Definition

**File to examine:** `web/components/party-portal/types.ts`

Questions:
1. Are trust-related types already defined?
   - `TrusteeData`?
   - `SettlorData`?
   - `BeneficiaryData`?
   - `TrustFormData`?
2. Is `TRUST_TYPES` constant defined?
3. What's currently in this file related to trusts?

### 2.4 Backend Trust Handling

**File to examine:** `api/app/models/report_party.py`

Questions:
1. Does the `entity_type` field accept "trust" as a value?
2. Is `party_data` JSONB flexible enough to store trust-specific fields?
3. Any trust-specific validation?

---

## INVESTIGATION 3: Connection Points

### 3.1 How Invoice Page Gets Data

Trace the data flow:
1. What function/hook fetches invoice data?
2. What API endpoint is called (if any)?
3. What's the response shape?
4. How is it rendered in the table?

### 3.2 How Party Portal Submits Trust Data

Trace the data flow:
1. When a trust form is submitted, what endpoint is called?
2. What's the payload shape?
3. How does the backend store it?

---

## OUTPUT FORMAT

Please provide findings in this format:

```markdown
## Invoice System Findings

### Current Implementation
- Data source: [mock/API/computed]
- File: [path]
- Key code snippet: [show relevant code]

### Table Structure
- Columns: [list]
- Actions: [list with status: working/disabled/missing]

### API Status
- Endpoint exists: [yes/no]
- Model exists: [yes/no]
- Current behavior: [description]

### Gaps Identified
1. [gap 1]
2. [gap 2]

---

## Trust Form Findings

### Current Implementation
- Trust form exists: [yes/no]
- Handling in DynamicPartyForm: [description]
- Falls back to: [what form]

### Types Defined
- Trust types: [yes/no, list if yes]
- Trustee types: [yes/no]

### Gaps Identified
1. [gap 1]
2. [gap 2]

---

## Recommended Approach

### For Invoices:
[recommendation]

### For Trust Form:
[recommendation]
```

---

## WHY THIS MATTERS

We need to know:
1. **Invoices:** Build new system vs. enhance existing vs. just wire up?
2. **Trust Form:** Create from scratch vs. fill in gaps vs. already done?

**Don't build anything yet - just investigate and report back.**
