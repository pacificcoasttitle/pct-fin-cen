# Investigation: Party Links & Report Status Flow

## Executive Summary

**Critical Issue Found:** Staff cannot send party links because the report is in `draft` status, but the endpoint only allows `determination_complete` or `collecting` status.

**Root Cause:** The wizard's "Run Determination" step must be completed (calling the API) before party links can be sent, but this isn't obvious in the UI.

---

## Issue 1: Can't Send Party Links in Draft Status

### Current Endpoint Code

**File:** `api/app/routes/reports.py` (lines 414-430)

```python
@router.post("/{report_id}/party-links", response_model=PartyLinkResponse)
def create_party_links(
    report_id: UUID,
    party_links_in: PartyLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create parties and their collection links."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # ⚠️ THIS IS THE BLOCKER
    if report.status not in ["determination_complete", "collecting"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot create party links for report in '{report.status}' status"
        )
```

### Status Check Logic

| Status | Allowed to Send Links |
|--------|----------------------|
| `draft` | ❌ NO |
| `determination_complete` | ✅ YES |
| `collecting` | ✅ YES |
| `ready_to_file` | ❌ NO |
| `filed` | ❌ NO |
| `exempt` | ❌ NO |

### Root Cause

**The determination API must be called to transition from `draft` → `determination_complete`**

From `api/app/routes/reports.py` (lines 380-388):
```python
# In POST /reports/{id}/determine endpoint
report.determination = determination
if is_reportable:
    report.status = "determination_complete"  # ← Status changes here
else:
    report.status = "exempt"
```

**The workflow expects:**
1. Staff completes determination questions in wizard
2. Staff clicks "Run Determination" button → calls `POST /reports/{id}/determine`
3. Backend updates status to `determination_complete`
4. NOW staff can send party links

**The problem:** Users may not realize they need to explicitly "Run Determination" before proceeding to Party Setup.

---

## Issue 2: Report Status Transitions

### Valid Statuses (from Report model comment)

| Status | When Set | Meaning |
|--------|----------|---------|
| `draft` | Report created | Initial state, wizard in progress |
| `determination_complete` | After `POST /determine` returns reportable | Determination done, ready for collection |
| `collecting` | After party links sent | Waiting for parties to submit |
| `ready_to_file` | After ready-check passes | All data collected, ready to file |
| `filed` | After filing | Filed with FinCEN |
| `exempt` | After `POST /determine` returns not reportable | No filing required |

### Transition Triggers

```
draft ──[POST /determine (reportable)]──> determination_complete
      └─[POST /determine (not reportable)]──> exempt

determination_complete ──[POST /party-links]──> collecting

collecting ──[ready-check passes, manual?]──> ready_to_file

ready_to_file ──[POST /file]──> filed
```

### Status Update in Party Links

**File:** `api/app/routes/reports.py` (lines 509-510)
```python
# After creating party links:
report.status = "collecting"
report.updated_at = datetime.utcnow()
```

✅ This is correct - status auto-updates when links are sent.

---

## Issue 3: Wizard Frontend Flow

### How "Send Links" Works

**File:** `web/components/rrer-questionnaire.tsx` (lines 436-486)

```typescript
const handleSendPartyLinks = async () => {
  // Validate party data
  if (partySetup.sellers.length === 0 && partySetup.buyers.length === 0) {
    toast({ title: "Add at least one party", variant: "destructive" })
    return
  }
  
  setSendingLinks(true)
  
  try {
    // Transform to API format
    const parties = [
      ...partySetup.sellers.map(s => ({ ... })),
      ...partySetup.buyers.map(b => ({ ... })),
    ]

    // Call the API via prop
    if (onSendPartyLinks) {
      await onSendPartyLinks(parties)  // ← This calls POST /party-links
    }
    
    // Move to monitor-progress step
    setCollectionStep("monitor-progress")
  } catch (error) {
    toast({ title: "Failed to Send Links", variant: "destructive" })
  }
}
```

### Gap Found

The wizard doesn't check report status before showing the Party Setup step. Users can navigate to Party Setup while still in `draft` status, then get an error when trying to send links.

---

## Issue 4: Entity Type Flow

### In create-report endpoint

**File:** `api/app/routes/submission_requests.py`

```python
initial_buyers.append({
    "name": submission.buyer_name,
    "email": submission.buyer_email or "",
    "type": submission.buyer_type or "individual",  # ✅ Type IS included
    "phone": submission.buyer_phone or "",
})
```

✅ **buyer_type IS being transferred**

### In wizard initialization

**File:** `web/components/rrer-questionnaire.tsx` (lines 362-375)

```typescript
const buyers = (initialParties.buyers || [])
  .filter(b => b.name)
  .map(b => ({
    id: generateId(),
    name: b.name || "",
    email: b.email || "",
    type: (b.type || "individual") as "individual" | "entity" | "trust",  // ✅ Type IS read
    entityName: undefined,
  }))
```

✅ **Entity type IS being read correctly**

---

## Issue 5: Session Cookie Parse Error

### Current Parse Code

**File:** `web/hooks/use-demo.ts` (lines 41-44)
```typescript
// Decode URL encoding first, then base64
const decodedValue = decodeURIComponent(sessionValue);
const decoded = atob(decodedValue);
const userData = JSON.parse(decoded) as DemoUser;
```

**File:** `web/app/(app)/layout.tsx` (lines 22-23)
```typescript
// ⚠️ MISSING URL decode!
const data = JSON.parse(atob(cookie.split("=")[1]));
```

### Root Cause

The `layout.tsx` is NOT URL-decoding the cookie value before base64 decode!

When cookies contain special characters, browsers URL-encode them. The sequence should be:
1. Read raw cookie value
2. URL decode (`decodeURIComponent`)
3. Base64 decode (`atob`)
4. JSON parse

The `use-demo.ts` hook does this correctly, but `layout.tsx` skips step 2.

---

## Issue 6: Confirmation Number Display

### API Response

**File:** `api/app/routes/submission_requests.py`

The `POST /submission-requests` endpoint returns:
```python
return submission_to_response(submission)
# Which returns:
{
    "id": str(submission.id),  # UUID
    "status": submission.status,
    "property_address": ...,
    # ... other fields
}
```

❌ **No confirmation_number field** - only the UUID `id` is returned.

### Frontend Display

**File:** `web/app/(app)/app/requests/new/page.tsx` (lines 263-264, 295)

```typescript
const result = await response.json();
setRequestId(result.id);  // ← Stores UUID

// Later displays:
<p className="text-xl font-mono font-bold text-green-700">
  {requestId?.slice(0, 8).toUpperCase() || "..."}  // ← Shows first 8 chars of UUID
</p>
```

### Current Behavior

The frontend shows the first 8 characters of the UUID in uppercase, like `A1B2C3D4`.

### Gap

- ❌ No human-readable confirmation number (like "SR-2026-00042")
- ❌ Model doesn't have a `confirmation_number` field
- ⚠️ The UUID truncation is a reasonable workaround but not ideal

---

## Recommended Fixes

### Fix 1: Allow Party Links from Draft (with auto-determination)

**Option A: Auto-run determination when party setup is reached**

```python
# In party-links endpoint, add:
if report.status == "draft":
    # Auto-run determination first
    is_reportable, determination, reasoning = determine_reportability(report.wizard_data)
    report.determination = determination
    if is_reportable:
        report.status = "determination_complete"
    else:
        raise HTTPException(400, "Report determined to be exempt - cannot send party links")
```

**Option B: Allow draft status to send links (status transitions on link send)**

```python
# Change the check:
if report.status not in ["draft", "determination_complete", "collecting"]:
    raise HTTPException(...)

# Then after creating links:
report.status = "collecting"  # This already happens
```

**Recommendation:** Option A is safer - ensures determination is complete before sending links.

### Fix 2: Session Cookie Parsing in layout.tsx

```typescript
// In web/app/(app)/layout.tsx
if (cookie) {
  try {
    // Add URL decode step
    const cookieValue = cookie.split("=")[1];
    const decodedValue = decodeURIComponent(cookieValue);  // ← Add this
    const data = JSON.parse(atob(decodedValue));
    setSession({
      role: data.role || "client_user",
      companyId: data.companyId || null,
    });
  } catch (e) {
    console.error("Failed to parse session cookie:", e);
  }
}
```

### Fix 3: Add Confirmation Number (Optional Enhancement)

**Model:** Add to `SubmissionRequest`:
```python
confirmation_number = Column(String(50), unique=True, index=True)

# Auto-generate on create:
def generate_confirmation_number():
    year = datetime.utcnow().year
    # Get next sequence number
    return f"SR-{year}-{sequence:05d}"
```

**For now:** The UUID slice approach is acceptable for demo purposes.

### Fix 4: UI Feedback for Required Determination

Add a warning in the Party Setup step if determination hasn't been run:

```tsx
{report.status === "draft" && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Determination Required</AlertTitle>
    <AlertDescription>
      Please complete the determination phase before sending party links.
      <Button onClick={handleRunDetermination}>Run Determination</Button>
    </AlertDescription>
  </Alert>
)}
```

---

## Summary Table

| Issue | Root Cause | Recommended Fix | Priority |
|-------|------------|-----------------|----------|
| Can't send party links | Status is `draft`, not `determination_complete` | Auto-run determination OR allow draft | P0 |
| Session cookie error | Missing `decodeURIComponent` in layout.tsx | Add URL decode step | P1 |
| Entity type not showing | N/A - Working correctly | No fix needed | ✅ |
| Confirmation number | Using UUID, no dedicated field | Optional: Add confirmation_number | P3 |

---

## The Fixed Workflow

```
1. Client submits request (status: pending)
         ↓
2. Staff clicks "Start Wizard" 
   → Report created (status: draft)
         ↓
3. Staff completes Determination questions
         ↓
4. Staff clicks "Run Determination" (or auto-triggered)
   → POST /reports/{id}/determine
   → Report status: draft → determination_complete
         ↓
5. Staff reaches Party Setup
   → Sees buyer/seller from submission
         ↓
6. Staff clicks "Send Party Links"
   → POST /reports/{id}/party-links (NOW ALLOWED)
   → Report status: determination_complete → collecting
   → Party links generated
   → Emails sent
         ↓
7. Parties complete their forms
         ↓
8. Staff reviews, runs ready-check
   → Report status: collecting → ready_to_file
         ↓
9. Staff files to FinCEN
   → Report status: ready_to_file → filed
```

---

*Investigation completed: January 28, 2026*
