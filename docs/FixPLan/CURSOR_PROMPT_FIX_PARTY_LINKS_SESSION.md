# CURSOR PROMPT: Fix Party Links, Session Cookie & Wizard Flow

## 🦈 SHARKS TO KILL

| # | Issue | Root Cause | Priority |
|---|-------|------------|----------|
| 1 | **Can't send party links** | Report in `draft`, needs `determination_complete` | 🔴 P0 |
| 2 | **Session cookie parse error** | Missing `decodeURIComponent` before `atob` | 🟠 P1 |
| 3 | **Entity type not showing** | ✅ Actually working - no fix needed | ✅ Done |
| 4 | **Confirmation number** | Using UUID slice - acceptable for demo | 🟡 P3 |

---

## THE CORE PROBLEM

```
Current Broken Flow:
────────────────────
Staff reaches Party Setup (report.status = "draft")
    ↓
Staff clicks "Send Links"
    ↓
❌ API rejects: "Cannot create party links for report in 'draft' status"
    ↓
Staff confused - what do they need to do?


The Missing Step:
─────────────────
Staff must click "Run Determination" first
    ↓
POST /reports/{id}/determine
    ↓
report.status = "determination_complete"
    ↓
NOW party links can be sent
```

**The problem:** This isn't obvious in the UI. Staff can navigate to Party Setup without realizing determination needs to be explicitly run.

---

## FIX 1: Auto-Run Determination When Sending Party Links

**Strategy:** If report is still in `draft` when sending party links, auto-run determination first.

**File:** `api/app/routes/reports.py`

Find the `create_party_links` endpoint and update:

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
    
    # ==========================================================================
    # UPDATED: Auto-run determination if still in draft
    # ==========================================================================
    
    if report.status == "draft":
        # Auto-run determination before creating party links
        from app.services.determination import determine_reportability
        
        wizard_data = report.wizard_data or {}
        determination_data = wizard_data.get("determination", {})
        
        # Check if we have enough determination data
        if not determination_data:
            raise HTTPException(
                status_code=400,
                detail="Please complete the determination questions before sending party links"
            )
        
        # Run determination
        is_reportable, determination_result, reasoning = determine_reportability(
            wizard_data=wizard_data,
            determination_answers=determination_data
        )
        
        # Update report with determination result
        report.determination = determination_result
        report.determination_reasoning = reasoning
        
        if is_reportable:
            report.status = "determination_complete"
        else:
            report.status = "exempt"
            raise HTTPException(
                status_code=400,
                detail="This transaction has been determined exempt from reporting. Party links are not needed."
            )
    
    # Original check - now also allows determination_complete
    if report.status not in ["determination_complete", "collecting"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot create party links for report in '{report.status}' status. Please complete determination first."
        )
    
    # ... rest of endpoint unchanged ...
```

**Alternative simpler approach** - just allow draft status:

```python
# If auto-determination is too complex, simply allow draft:
if report.status not in ["draft", "determination_complete", "collecting"]:
    raise HTTPException(
        status_code=400,
        detail=f"Cannot create party links for report in '{report.status}' status"
    )

# The status will transition to "collecting" when links are created (this already happens)
```

**Recommendation:** Use the simpler approach for demo - allow `draft` status. The status will auto-transition to `collecting` when links are sent.

---

## FIX 2: Session Cookie Parse Error

**File:** `web/app/(app)/layout.tsx`

Find the cookie parsing code and add URL decoding:

```typescript
// BEFORE (broken):
if (cookie) {
  try {
    const data = JSON.parse(atob(cookie.split("=")[1]));
    // ...
  } catch (e) {
    console.error("Failed to parse session cookie:", e);
  }
}

// AFTER (fixed):
if (cookie) {
  try {
    const cookieValue = cookie.split("=")[1];
    // Add URL decode step before base64 decode
    const decodedValue = decodeURIComponent(cookieValue);
    const data = JSON.parse(atob(decodedValue));
    setSession({
      role: data.role || "client_user",
      companyId: data.companyId || null,
    });
  } catch (e) {
    console.error("Failed to parse session cookie:", e);
    // Set default session on error
    setSession({
      role: "client_user",
      companyId: null,
    });
  }
}
```

**Also check these files for the same issue:**

1. **`web/components/app-sidebar.tsx`** - If it parses cookies
2. **`web/context/sidebar-badge-context.tsx`** - The new badge context
3. **`web/components/app-layout-client.tsx`** - If this exists

**Create a shared utility function:**

**File:** `web/lib/session.ts` (NEW or update existing)

```typescript
export interface DemoSession {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string | null;
  companyName: string;
}

/**
 * Safely parse the demo session cookie
 * Handles URL encoding and base64 decoding
 */
export function parseSessionCookie(): DemoSession | null {
  if (typeof document === "undefined") return null;
  
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("pct_demo_session="));
  
  if (!cookie) return null;
  
  try {
    const cookieValue = cookie.split("=")[1];
    if (!cookieValue) return null;
    
    // Step 1: URL decode (handles %3D, %2B, etc.)
    const urlDecoded = decodeURIComponent(cookieValue);
    
    // Step 2: Base64 decode
    const base64Decoded = atob(urlDecoded);
    
    // Step 3: JSON parse
    const data = JSON.parse(base64Decoded);
    
    return {
      id: data.id || "",
      email: data.email || "",
      name: data.name || "",
      role: data.role || "client_user",
      companyId: data.companyId || null,
      companyName: data.companyName || "",
    };
  } catch (e) {
    console.error("Failed to parse session cookie:", e);
    return null;
  }
}

/**
 * Get just the role from session (common use case)
 */
export function getSessionRole(): string {
  const session = parseSessionCookie();
  return session?.role || "client_user";
}

/**
 * Get company ID from session
 */
export function getSessionCompanyId(): string | null {
  const session = parseSessionCookie();
  return session?.companyId || null;
}
```

**Then update all files to use this utility:**

```typescript
import { parseSessionCookie, getSessionRole, getSessionCompanyId } from "@/lib/session";

// Instead of inline cookie parsing:
const session = parseSessionCookie();
const role = session?.role || "client_user";
```

---

## FIX 3: Update SidebarBadgeProvider to Use Session Utility

**File:** `web/context/sidebar-badge-context.tsx`

```typescript
import { parseSessionCookie } from "@/lib/session";

export function SidebarBadgeProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<BadgeCounts>({
    requestsPending: 0,
    queueActive: 0,
    requestsActive: 0,
    loading: true,
  });

  const fetchCounts = async () => {
    // Use the safe session parser
    const session = parseSessionCookie();
    if (!session) {
      setCounts(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const params = new URLSearchParams({ role: session.role });
      if (session.companyId) {
        params.set("company_id", session.companyId);
      }

      const response = await fetch(`${API_BASE_URL}/sidebar/counts?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setCounts({
          requestsPending: data.requests_pending || 0,
          queueActive: data.queue_active || 0,
          requestsActive: data.requests_active || 0,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch sidebar counts:", error);
      setCounts(prev => ({ ...prev, loading: false }));
    }
  };

  // ... rest unchanged
}
```

---

## FIX 4: Add UI Feedback When Determination Not Complete (Optional Enhancement)

If we keep the requirement that determination must be complete, add visual feedback:

**File:** `web/components/rrer-questionnaire.tsx`

In the Party Setup step, add a check:

```tsx
// At the start of Party Setup step rendering
{report?.status === "draft" && (
  <Alert className="mb-6 border-amber-200 bg-amber-50">
    <AlertTriangle className="h-4 w-4 text-amber-600" />
    <AlertTitle className="text-amber-800">Determination Pending</AlertTitle>
    <AlertDescription className="text-amber-700">
      The determination phase will run automatically when you send party links.
      Make sure all determination questions are answered.
    </AlertDescription>
  </Alert>
)}
```

**If determination questions are incomplete:**

```tsx
const isDeterminationComplete = () => {
  const det = wizardData?.determination || {};
  // Check required determination fields
  return det.isNonFinanced !== undefined && 
         det.purchaserType !== undefined &&
         det.propertyType !== undefined;
};

{!isDeterminationComplete() && (
  <Alert variant="destructive" className="mb-6">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Incomplete Determination</AlertTitle>
    <AlertDescription>
      Please go back and complete all determination questions before sending party links.
      <Button variant="link" onClick={() => setPhase("determination")}>
        Go to Determination
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## FIX 5: Confirmation Number Enhancement (P3 - Optional)

For demo, the UUID slice is acceptable. But if you want proper confirmation numbers:

**File:** `api/app/models/submission_request.py`

```python
from sqlalchemy import Column, String, Integer, Sequence

class SubmissionRequest(Base):
    # Add confirmation number field
    confirmation_number = Column(String(50), unique=True, index=True)
    
    # Add sequence for auto-generation
    _confirmation_seq = Sequence('submission_request_confirmation_seq')
```

**File:** `api/app/routes/submission_requests.py`

In the create endpoint:

```python
from datetime import datetime

def generate_confirmation_number(db: Session) -> str:
    """Generate a human-readable confirmation number like SR-2026-00042"""
    year = datetime.utcnow().year
    
    # Get count of submissions this year
    count = db.query(SubmissionRequest).filter(
        func.extract('year', SubmissionRequest.created_at) == year
    ).count() + 1
    
    return f"SR-{year}-{count:05d}"

# In create endpoint:
submission = SubmissionRequest(
    # ... other fields ...
    confirmation_number=generate_confirmation_number(db),
)

# Return it in response:
return {
    "id": str(submission.id),
    "confirmation_number": submission.confirmation_number,
    # ... other fields ...
}
```

**File:** `web/app/(app)/app/requests/new/page.tsx`

```typescript
// Store confirmation number from response
const result = await response.json();
setConfirmationNumber(result.confirmation_number || result.id?.slice(0, 8).toUpperCase());

// Display it
<p className="text-xl font-mono font-bold text-green-700">
  {confirmationNumber}
</p>
```

---

## VERIFICATION CHECKLIST

### Party Links Fix
- [ ] Report in `draft` status can send party links
- [ ] Status transitions to `collecting` after links sent
- [ ] Error message is clear if determination questions incomplete
- [ ] Exempt reports cannot send party links (correct behavior)

### Session Cookie Fix
- [ ] No more `atob` errors in console
- [ ] Sidebar badges load correctly
- [ ] Session data accessible across all components
- [ ] Works with special characters in cookie values

### Optional Enhancements
- [ ] UI shows determination status in Party Setup
- [ ] Confirmation numbers are human-readable (if implemented)

---

## UPDATE KILLEDSHARKS.MD

```markdown
---

### 24. Party Links Status Block + Session Cookie Fix ✅

**Problem 1:** Staff couldn't send party links
- Error: "Cannot create party links for report in 'draft' status"
- Root cause: Endpoint only allowed `determination_complete` or `collecting`
- Staff didn't realize they needed to run determination first

**Problem 2:** Console errors parsing session cookie
- Error: "Failed to execute 'atob' on 'Window'"
- Root cause: Cookie value URL-encoded, but `atob` called without `decodeURIComponent` first

**Solution:**

**1. Allow Draft Status for Party Links** (`api/app/routes/reports.py`)
```python
# Changed from:
if report.status not in ["determination_complete", "collecting"]:

# To:
if report.status not in ["draft", "determination_complete", "collecting"]:
```
Status auto-transitions to `collecting` when links are sent.

**2. Created Session Parse Utility** (`web/lib/session.ts`)
```typescript
export function parseSessionCookie(): DemoSession | null {
  // 1. URL decode
  const urlDecoded = decodeURIComponent(cookieValue);
  // 2. Base64 decode
  const base64Decoded = atob(urlDecoded);
  // 3. JSON parse
  return JSON.parse(base64Decoded);
}
```

**3. Updated All Cookie Parsers**
- `web/app/(app)/layout.tsx`
- `web/context/sidebar-badge-context.tsx`
- `web/components/app-sidebar.tsx`
- All now use shared `parseSessionCookie()` utility

**4. Added UI Feedback** (optional)
- Shows alert in Party Setup if determination incomplete
- Clear guidance on what steps are needed

**Files Created:**
- `web/lib/session.ts` (NEW - shared session utility)

**Files Changed:**
- `api/app/routes/reports.py` (allow draft status)
- `web/app/(app)/layout.tsx` (use session utility)
- `web/context/sidebar-badge-context.tsx` (use session utility)

**Status:** ✅ Killed

---

### Updated Shark Count: 25 🦈
```

---

## SUMMARY

| Fix | Change | Impact |
|-----|--------|--------|
| **Party Links** | Allow `draft` status in endpoint | Staff can send links without extra steps |
| **Session Cookie** | Add `decodeURIComponent` before `atob` | No more console errors |
| **Session Utility** | Create shared `parseSessionCookie()` | Consistent, DRY code |
| **UI Feedback** | Show determination status in Party Setup | Clear user guidance |

**The simplest fix:** Change one line in the API to allow `draft` status. The status will auto-transition to `collecting` when links are sent anyway.

---

**This unblocks the critical workflow. Staff can now complete the full wizard!** 🦈
