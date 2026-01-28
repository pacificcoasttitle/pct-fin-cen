# CURSOR PROMPT: Investigation - SubmissionRequest → Report Data Flow

## 🔴 CRITICAL ISSUE

When staff clicks "Start Wizard" on a submission request, most data is NOT carrying over to the Report/Wizard.

**What carries over:** Property address ✅
**What's LOST:**
- ❌ Financing type (cash/financed)
- ❌ Buyer name and email
- ❌ Buyer type (individual/entity/trust)
- ❌ Seller name and email
- ❌ Purchase price
- ❌ Escrow number
- ❌ Expected closing date
- ❌ Any notes

**This is a major gap** - the client took time to fill out this information, and staff has to re-enter it manually.

---

## INVESTIGATION 1: SubmissionRequest Model

**File:** `api/app/models/submission_request.py`

### Questions:
1. List ALL fields on the SubmissionRequest model
2. Which fields contain the data we need to transfer?
   - `financing_type`?
   - `buyer_name`, `buyer_email`, `buyer_type`?
   - `seller_name`, `seller_email`?
   - `purchase_price_cents`?
   - `escrow_number`?
   - `expected_closing_date`?
   - `property_address` (JSONB)?

---

## INVESTIGATION 2: Create Report Endpoint

**File:** `api/app/routes/submission_requests.py`

### Find the endpoint:
```
POST /submission-requests/{id}/create-report
```

### Questions:
1. Show the FULL code for this endpoint
2. What data is being copied from SubmissionRequest to Report?
3. What data is being put into `wizard_data`?
4. Is `wizard_data.collection` being populated?
5. Is `wizard_data.determination` being pre-filled based on financing_type?

### Expected Data Transfer:
The endpoint SHOULD be doing this:

```python
# Create report with pre-filled wizard_data
report = Report(
    # ... basic fields ...
    wizard_data={
        "collection": {
            "purchasePrice": submission.purchase_price_cents / 100,
            "escrowNumber": submission.escrow_number,
            "closingDate": submission.expected_closing_date.isoformat(),
            "financingType": submission.financing_type,
            "propertyAddress": submission.property_address,
        },
        "determination": {
            # Pre-fill based on financing_type
            "isNonFinanced": "yes" if submission.financing_type == "cash" else "no",
        },
        "parties": {
            "buyers": [{
                "name": submission.buyer_name,
                "email": submission.buyer_email,
                "type": submission.buyer_type,
            }],
            "sellers": [{
                "name": submission.seller_name,
                "email": submission.seller_email,
                "type": "individual",  # Default, can be changed
            }],
        },
    },
)
```

---

## INVESTIGATION 3: Report Model

**File:** `api/app/models/report.py`

### Questions:
1. What is the structure of the `wizard_data` JSONB field?
2. Are there any comments or documentation about expected schema?
3. Is there a separate `determination` field?

---

## INVESTIGATION 4: Wizard Frontend

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

### Questions:
1. How does the wizard read initial data?
2. Does it fetch the report on load?
3. How does it populate form fields from `wizard_data`?
4. What's the expected structure of `wizard_data` that the wizard uses?

Show the relevant code that:
- Fetches report data
- Initializes form state from wizard_data
- Specifically how it reads:
  - `wizard_data.collection.purchasePrice`
  - `wizard_data.collection.financingType`
  - `wizard_data.parties.buyers`
  - `wizard_data.parties.sellers`

---

## INVESTIGATION 5: Client Submission Form

**File:** `web/app/(app)/app/requests/new/page.tsx`

### Questions:
1. What fields does the client form collect?
2. What's the payload sent to `POST /submission-requests`?
3. Show the form fields and their mapping to API payload

Expected fields:
- Property address (street, city, state, zip)
- Purchase price
- Expected closing date
- Escrow number
- Financing type (cash/financed/partial)
- Buyer name, email, type (individual/entity/trust)
- Seller name, email
- Notes

---

## INVESTIGATION 6: API Payload Verification

### Questions:
1. When creating a SubmissionRequest, are all fields being saved?
2. Check the POST endpoint - does it accept all these fields?
3. Is there any validation dropping fields?

**Test this:** 
- Submit a new request with all fields filled
- Query the database to see what was actually saved
- Check if any fields are NULL that shouldn't be

---

## OUTPUT FORMAT

```markdown
## Data Flow Findings

### SubmissionRequest Fields Available
| Field | Type | Sample Value |
|-------|------|--------------|
| financing_type | | |
| buyer_name | | |
| buyer_email | | |
| buyer_type | | |
| seller_name | | |
| seller_email | | |
| purchase_price_cents | | |
| escrow_number | | |
| expected_closing_date | | |
| property_address | | |

### Create Report Endpoint Analysis
**File:** [path]
**Current behavior:**
[Show what data IS being transferred]

**Missing transfers:**
1. [field not being copied]
2. [field not being copied]

**Relevant code:**
```python
[show the endpoint code]
```

### Wizard Data Structure Expected
```json
{
  "collection": { ... },
  "determination": { ... },
  "parties": { ... }
}
```

### Gap Analysis
| Data Point | In SubmissionRequest | Transferred to Report | Used by Wizard |
|------------|---------------------|----------------------|----------------|
| Financing Type | ✅ | ❌ | ✅ |
| Buyer Name | ✅ | ❌ | ✅ |
| ... | | | |

### Root Cause
[Explain why data isn't flowing through]

### Recommended Fix
[What needs to change in the create-report endpoint]
```

---

## WHY THIS MATTERS

The submission request is the **foundation of the workflow**:

```
Client fills detailed form (5-10 minutes of their time)
        ↓
Data should flow seamlessly
        ↓
Staff sees pre-filled wizard
        ↓
Staff just validates and proceeds
        ↓
Parties get accurate info in their portal links
```

**Without this data transfer:**
- Staff re-enters everything manually
- Risk of typos and errors
- Wastes client's effort
- Slower processing time
- Poor user experience

---

**Investigate thoroughly - this is a core workflow issue.**
