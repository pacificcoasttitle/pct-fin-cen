# 🚨 URGENT: Party Links 422 Error - Demo Blocker

## THE ERROR

```
POST /reports/{id}/party-links → 422 (Unprocessable Entity)
Failed to send party links: [object Object]
```

**Impact:** Staff cannot send party links. Wizard gets stuck on "Loading party status" forever.

**This blocks the entire demo workflow.**

---

## INVESTIGATION 1: Party Links Endpoint Schema

**File:** `api/app/routes/reports.py`

### Questions:

1. Find `POST /reports/{id}/party-links` endpoint
2. What is the **request schema** (Pydantic model)?
3. Show the full schema with ALL required fields
4. What validation is happening that could cause 422?

### Look for:
```python
class PartyLinkCreate(BaseModel):
    # What fields are REQUIRED?
    # What types are expected?
    # What validation rules exist?
```

---

## INVESTIGATION 2: Frontend Payload

**File:** `web/components/rrer-questionnaire.tsx`

### Questions:

1. Find the `handleSendPartyLinks` or `onSendPartyLinks` function
2. What payload is being sent to the API?
3. Show the exact data structure being sent
4. Is it matching what the API expects?

### Look for:
```typescript
const handleSendPartyLinks = async () => {
  // What's in the request body?
  const parties = [...];
  
  await fetch(`/reports/${id}/party-links`, {
    method: "POST",
    body: JSON.stringify(???),  // What's here?
  });
};
```

---

## INVESTIGATION 3: Data Transformation

### Questions:

1. How is party data transformed from wizard state to API payload?
2. Are there any fields being dropped?
3. Are there type mismatches (string vs number, etc.)?

### Common 422 causes:
- Missing required field
- Wrong field name (camelCase vs snake_case)
- Wrong type (string instead of array)
- Empty array when at least 1 required
- Null where value required

---

## INVESTIGATION 4: API Validation Details

**File:** `api/app/routes/reports.py`

### Questions:

1. What happens inside the endpoint before creating parties?
2. Are there additional validation checks beyond Pydantic?
3. Can you add logging to see what payload is received?

### Test directly:
```bash
# Try calling the API directly with minimal payload
curl -X POST "https://pct-fin-cen-staging.onrender.com/reports/{id}/party-links" \
  -H "Content-Type: application/json" \
  -d '{
    "parties": [
      {
        "role": "buyer",
        "name": "Test Buyer",
        "email": "test@example.com",
        "type": "individual"
      }
    ]
  }'
```

What error message comes back?

---

## INVESTIGATION 5: Party Setup State

**File:** `web/components/rrer-questionnaire.tsx`

### Questions:

1. What does `partySetup` state look like when "Send Links" is clicked?
2. Console.log the state right before the API call
3. Are buyers and sellers properly populated?

### Add debug logging:
```typescript
const handleSendPartyLinks = async () => {
  console.log("Party Setup State:", partySetup);
  console.log("Buyers:", partySetup.buyers);
  console.log("Sellers:", partySetup.sellers);
  
  // ... rest of function
};
```

---

## OUTPUT FORMAT

```markdown
## Party Links 422 Error Findings

### API Schema (What's Expected)
```python
class PartyLinkCreate(BaseModel):
    [show full schema]
```

### Frontend Payload (What's Sent)
```typescript
const payload = {
    [show actual payload]
};
```

### Mismatch Found
| Field | API Expects | Frontend Sends | Issue |
|-------|-------------|----------------|-------|
| | | | |

### Root Cause
[Why the 422 is happening]

### Fix Required
[What needs to change]
```

---

## LIKELY CULPRITS

Based on the error pattern, check these:

### 1. Field Name Mismatch
```
API expects: party_type
Frontend sends: type

API expects: party_role
Frontend sends: role
```

### 2. Required Field Missing
```
API expects: phone (required)
Frontend sends: phone: undefined (missing)
```

### 3. Array Structure Wrong
```
API expects: { parties: [...] }
Frontend sends: { buyers: [...], sellers: [...] }
```

### 4. Type Validation
```
API expects: type: "individual" | "entity" | "trust"
Frontend sends: type: "Individual" (wrong case)
```

### 5. Empty Validation
```
API expects: at least 1 party
Frontend sends: parties: [] (empty)
```

---

## QUICK FIX PATTERN

Once root cause is found, the fix is usually:

### If field name mismatch:
```typescript
// Transform frontend names to API names
const parties = [
  ...partySetup.buyers.map(b => ({
    party_role: "buyer",           // Not "role"
    party_type: b.type,            // Not "type"  
    name: b.name,
    email: b.email,
    phone: b.phone || "",          // Provide default
  })),
  ...partySetup.sellers.map(s => ({
    party_role: "seller",
    party_type: s.type,
    name: s.name,
    email: s.email,
    phone: s.phone || "",
  })),
];

await fetch(url, {
  body: JSON.stringify({ parties }),
});
```

### If schema structure wrong:
```typescript
// Make sure wrapper object matches API
const payload = {
  parties: parties,  // Not { buyers, sellers }
};
```

---

## VERIFICATION STEPS

After fix:

1. [ ] Click "Send Links" in wizard
2. [ ] Check Network tab - should be 200/201, not 422
3. [ ] Party links should be created
4. [ ] Status should transition to "collecting"
5. [ ] Party status cards should show (not "Loading...")

---

**THIS IS A DEMO BLOCKER - PRIORITIZE THIS FIX**
