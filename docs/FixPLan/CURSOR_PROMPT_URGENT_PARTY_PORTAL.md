# 🚨 URGENT: Party Portal Issues - Demo Blocker

## THE PROBLEMS

### Problem 1: No Data Hydration
When buyer clicks their portal link, the form should be PRE-FILLED with:
- Name (from wizard party setup)
- Email (from wizard party setup)
- Party type (individual/entity/trust)

**Current:** Form is empty - buyer has to re-enter everything

### Problem 2: Email Field Broken
- Email field is empty
- Cannot type in it (disabled? readonly?)
- Blocks form submission

**Impact:** Buyers CANNOT complete their submission. Demo is blocked.

---

## INVESTIGATION 1: Party Portal Data Flow

### The Expected Flow:

```
1. Staff adds buyer in wizard:
   { name: "John Doe", email: "john@example.com", type: "individual" }
   
2. Staff clicks "Send Links"
   → POST /reports/{id}/party-links
   → Creates ReportParty records with party_data
   → Generates secure token for each party
   
3. Buyer clicks email link:
   → GET /parties/{token}
   → Returns party data including name, email, type
   
4. Party portal loads:
   → Pre-fills form with returned data
   → Email shown but maybe readonly (they shouldn't change it)
   → Name pre-filled
   → Type determines which form sections show
```

### Questions:

**File:** `api/app/routes/parties.py` (or similar)

1. What does `GET /parties/{token}` return?
2. Is `party_data` included in the response?
3. What fields are in `party_data`?
4. Show the full response structure

---

## INVESTIGATION 2: ReportParty Creation

**File:** `api/app/routes/reports.py`

Find where party links are created (POST /party-links):

### Questions:

1. When creating ReportParty records, what goes into `party_data`?
2. Is the buyer's name, email, type being saved?
3. Show the code that creates ReportParty

### Expected:
```python
party = ReportParty(
    report_id=report.id,
    role="buyer",  # or "seller"
    party_data={
        "name": party_input.name,
        "email": party_input.email,
        "type": party_input.type,  # individual/entity/trust
    },
    token=generate_secure_token(),
    status="pending",
)
```

---

## INVESTIGATION 3: Party Portal Frontend

**File:** `web/app/party/[token]/page.tsx` (or similar path)

### Questions:

1. How does the portal fetch party data?
2. What API endpoint does it call?
3. How does it initialize form state from the response?
4. Show the data fetching and form initialization code

### Look for:
```typescript
// Fetching
const response = await fetch(`/api/parties/${token}`);
const partyData = await response.json();

// Initialization
const [formData, setFormData] = useState({
  name: partyData.name || "",        // Should pre-fill
  email: partyData.email || "",      // Should pre-fill
  type: partyData.type || "individual",
});
```

---

## INVESTIGATION 4: Email Field Rendering

**File:** Party portal form component

### Questions:

1. How is the email field rendered?
2. Is it `disabled`, `readonly`, or `readOnly`?
3. Is there conditional logic hiding/disabling it?
4. Show the email input JSX

### Common issues:
```tsx
// Accidentally disabled
<Input value={email} disabled />  // Can't type!

// Readonly without visual indication
<Input value={email} readOnly />  // Can't type!

// Value but no onChange
<Input value={email} />  // Controlled but can't change!

// Conditional render issue
{email && <Input value={email} />}  // Only shows if email exists!
```

---

## INVESTIGATION 5: Form Validation Blocking Submit

**File:** Party portal form component

### Questions:

1. What validation runs on submit?
2. Is email required?
3. What error is shown (if any) when trying to submit?
4. Show the form submission handler

### Look for:
```typescript
const handleSubmit = () => {
  // Is this checking email?
  if (!formData.email) {
    setError("Email is required");
    return;
  }
  // ...
};
```

---

## INVESTIGATION 6: API Response Verification

### Direct API Test:

If you have a party token, test directly:

```bash
curl "https://pct-fin-cen-staging.onrender.com/parties/{token}"
```

### Questions:
1. What does the response look like?
2. Is `name` present?
3. Is `email` present?
4. Is `type` present?

### Expected response:
```json
{
  "id": "xxx",
  "token": "xxx",
  "role": "buyer",
  "status": "pending",
  "party_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "type": "individual"
  },
  "report": {
    "property_address": "123 Main St",
    "escrow_number": "12345"
  }
}
```

---

## OUTPUT FORMAT

```markdown
## Party Portal Investigation Findings

### Data Flow Trace

1. **Party Creation (POST /party-links)**
   - party_data saved: [yes/no]
   - Fields included: [list]
   - Code: [snippet]

2. **Party Fetch (GET /parties/{token})**
   - Response includes party_data: [yes/no]
   - Fields returned: [list]
   - Code: [snippet]

3. **Portal Initialization**
   - Fetches data: [yes/no]
   - Pre-fills form: [yes/no]
   - Code: [snippet]

### Email Field Issue

- Rendered as: [Input / disabled Input / readonly / etc]
- Has onChange: [yes/no]
- Has value binding: [yes/no]
- Conditional rendering: [yes/no]
- Code: [snippet]

### Root Causes

1. **No Hydration:** [reason]
2. **Email Broken:** [reason]

### Recommended Fixes

#### Fix 1: [Data Hydration]
[solution]

#### Fix 2: [Email Field]
[solution]
```

---

## LIKELY ROOT CAUSES

### No Hydration:
1. `party_data` not being saved when creating party links
2. `party_data` not being returned by GET endpoint
3. Frontend not reading `party_data` from response
4. Frontend not setting form initial values from response

### Email Field Broken:
1. Field is `disabled` or `readOnly` 
2. Missing `onChange` handler
3. Value set but no way to update
4. Conditional render hiding field when email is empty/undefined
5. CSS making field appear disabled

---

## QUICK DEBUG STEPS

### Step 1: Check Network Tab
1. Open party portal link
2. Open DevTools → Network
3. Find the GET request to `/parties/{token}`
4. Check Response - is party_data there with name/email?

### Step 2: Check Form State
1. In party portal, open DevTools → Console
2. If React DevTools installed, check component state
3. Or add `console.log(formData)` to see what's initialized

### Step 3: Check Email Field
1. Right-click email field → Inspect
2. Check for `disabled`, `readonly`, `readOnly` attributes
3. Check if it has an `onChange` handler

---

## VERIFICATION AFTER FIX

- [ ] Open party link
- [ ] Name is pre-filled
- [ ] Email is pre-filled (editable or readonly with value showing)
- [ ] Party type is correct
- [ ] Can fill out remaining form fields
- [ ] Can submit successfully
- [ ] Status updates to "submitted"

---

**THIS IS A DEMO BLOCKER - PARTIES CANNOT SUBMIT WITHOUT THIS FIX**
