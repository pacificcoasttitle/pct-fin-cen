# Investigation: Status Accuracy & Wizard Action Prominence

## Executive Summary

**Two main issues found:**
1. **Status Sync Gap:** When a report is filed, the SubmissionRequest status is NOT updated to "completed"
2. **Button Prominence:** Buttons are reasonably visible, but My Queue only shows "collecting" status reports (misses draft)

---

## Status Values Found

### SubmissionRequest Statuses

**Source:** `api/app/models/submission_request.py` line 55

| Status | When Set | Displayed As | Badge Color |
|--------|----------|--------------|-------------|
| `pending` | Initial creation | "Pending" / "Pending Review" | Amber/Yellow |
| `assigned` | Manual assignment (rarely used) | "Assigned" | Blue |
| `in_progress` | When "Start Wizard" creates report | "In Progress" | Blue |
| `completed` | ⚠️ **NEVER SET** (should be when filed) | "Completed" | Green |
| `cancelled` | Manual cancellation | "Cancelled" | Slate/Gray |

### Report Statuses

**Source:** `api/app/models/report.py` line 25-30

| Status | When Set | Displayed As | Badge Color |
|--------|----------|--------------|-------------|
| `draft` | Report created (Start Wizard) | "Draft" | Gray |
| `determination_complete` | After `POST /determine` | N/A (transitions quickly) | N/A |
| `collecting` | After party links sent | "Collecting" | Amber |
| `ready_to_file` | After ready-check passes | "Ready" | Green |
| `filed` | After `POST /file` succeeds | "Filed" | Green |
| `exempt` | After determination finds not reportable | "Exempt" | Slate |

---

## Status Transition Map

### SubmissionRequest Lifecycle

```
[Client submits]
       ↓
    pending ─────────────────────────────┐
       ↓                                  │
[Staff: Start Wizard]                    │
       ↓                                  │
  in_progress ←──────────────────────────┤
       ↓                                  │
[Report filed] ← ⚠️ NO STATUS UPDATE!    │
       ↓                                  │
   (should be)                           │
   completed ← MISSING TRANSITION         │
                                         │
            cancelled ←───────────────────┘
```

### Report Lifecycle

```
[Created from submission]
       ↓
    draft
       ↓
[POST /party-links]
       ↓
  collecting
       ↓
[All parties submit + ready check]
       ↓
 ready_to_file
       ↓
[POST /file]
       ↓
    filed

Alternative path:
    draft
       ↓
[POST /determine - not reportable]
       ↓
   exempt
```

### Cross-Model Sync

| Event | SubmissionRequest Status | Report Status |
|-------|-------------------------|---------------|
| Start Wizard clicked | `pending` → `in_progress` | Created as `draft` |
| Party links sent | — | `draft` → `collecting` |
| All parties submit | — | — |
| Ready check passes | — | `collecting` → `ready_to_file` |
| Report filed | ⚠️ **NO CHANGE** | `ready_to_file` → `filed` |

**🐛 BUG: When report is filed, SubmissionRequest should become `completed` but it stays `in_progress`!**

---

## Button Prominence Findings

### All Requests Page (`web/app/(app)/app/admin/requests/page.tsx`)

**Start Wizard Button Location:**
- Located in `RequestDetailSheet` (slide-out panel)
- Must click on a row first, THEN click "Start Wizard" in the sheet
- Button style: Primary blue button with Play icon

**Current Flow:**
```
1. See table of requests
2. Click row to open detail sheet
3. In sheet, click "Start Wizard" button
```

**Issues:**
- ⚠️ Requires 2 clicks to start wizard
- ⚠️ "Start Wizard" not visible in the main table
- Button IS prominent when sheet is open (full-width, blue, top of actions)

**Code Location:** `web/components/admin/request-detail-sheet.tsx` lines 420-434

### My Queue Page (`web/app/(app)/app/staff/queue/page.tsx`)

**Critical Issue Found:**
```typescript
// Line 67: Only fetches "collecting" status!
const res = await fetch(`${API_BASE_URL}/reports/queue/with-parties?status=collecting&limit=50`);
```

**This means:**
- ❌ Draft reports NOT shown in queue
- ❌ Reports waiting for determination NOT shown
- ✅ Only shows reports currently collecting party data

**Button in Queue:**
- "View" for in-progress items (outline style)
- "Review" for ready items (primary style)
- Button is inline in table, visible without clicking

**Code Location:** Lines 302-320

```tsx
<Button 
  size="sm"
  onClick={() => handleStartWizard(report)}
  variant={report.all_parties_complete ? "default" : "outline"}
>
  {report.all_parties_complete ? (
    <>
      <CheckCircle className="mr-1 h-3 w-3" />
      Review
    </>
  ) : (
    <>
      <Eye className="mr-1 h-3 w-3" />
      View
    </>
  )}
</Button>
```

### Client Requests Page (`web/app/(app)/app/requests/page.tsx`)

**Status Display:**
- User-friendly labels: "Pending Review", "In Progress", "Completed", "Cancelled"
- Good descriptions: "Waiting for PCT staff to begin processing"
- Clear status badges with icons

**No Action Buttons Needed:**
- Clients don't start wizards
- Only view their request status

---

## Identified Issues

### Status Accuracy Issues

1. **🔴 CRITICAL: SubmissionRequest not marked "completed" when filed**
   - When `POST /file` succeeds, SubmissionRequest stays `in_progress`
   - Client never sees their request as "Completed"
   - Dashboard stats will be wrong

2. **🟠 MEDIUM: My Queue only shows "collecting" reports**
   - Draft reports are invisible in staff queue
   - Staff can't see reports that need party setup

3. **🟡 LOW: Status display inconsistency**
   - "assigned" status exists but rarely used
   - Some statuses like "determination_complete" are transitional only

### Button Prominence Issues

1. **🟠 MEDIUM: "Start Wizard" requires 2 clicks in All Requests**
   - Could add inline button in table row
   - Currently requires opening detail sheet first

2. **🟢 OK: My Queue buttons are visible**
   - Buttons are inline in table
   - Good contrast between "View" and "Review"

3. **🟠 MEDIUM: No visual hierarchy for urgent items**
   - Pending requests with approaching deadlines look the same
   - No urgency indicators in queue

---

## Recommended Fixes

### Fix 1: Update SubmissionRequest to "completed" when filed (🔴 P0)

**File:** `api/app/routes/reports.py` - `file_report` endpoint

```python
# After successful filing (around line 708)
if outcome == "accepted" and report.company_id:
    # ... billing event creation ...
    
    # NEW: Update linked SubmissionRequest to completed
    if report.submission_request_id:
        submission_request = db.query(SubmissionRequest).filter(
            SubmissionRequest.id == report.submission_request_id
        ).first()
        if submission_request:
            submission_request.status = "completed"
            submission_request.updated_at = datetime.utcnow()
```

### Fix 2: Expand My Queue to include more statuses (🟠 P1)

**File:** `web/app/(app)/app/staff/queue/page.tsx`

```typescript
// Change from:
const res = await fetch(`${API_BASE_URL}/reports/queue/with-parties?status=collecting&limit=50`);

// To: Fetch multiple statuses
const res = await fetch(
  `${API_BASE_URL}/reports/queue/with-parties?limit=50`
  // Or add tabs for different status filters
);
```

Or add tabs:
```tsx
<Tabs defaultValue="collecting">
  <TabsList>
    <TabsTrigger value="needs_setup">Needs Setup ({draftCount})</TabsTrigger>
    <TabsTrigger value="collecting">Collecting ({collectingCount})</TabsTrigger>
    <TabsTrigger value="ready">Ready to File ({readyCount})</TabsTrigger>
  </TabsList>
</Tabs>
```

### Fix 3: Add inline "Start Wizard" button in All Requests table (🟡 P2)

**File:** `web/app/(app)/app/admin/requests/page.tsx`

Add a "Start" button directly in the Actions column for pending requests:

```tsx
<TableCell className="text-right">
  {request.status === "pending" && (
    <Button 
      size="sm" 
      onClick={() => handleStartWizard(request.id)}
      className="mr-2"
    >
      <Play className="h-3 w-3 mr-1" />
      Start
    </Button>
  )}
  <Button 
    size="sm" 
    variant="ghost"
    onClick={() => handleViewRequest(request)}
  >
    View
  </Button>
</TableCell>
```

### Fix 4: Add urgency indicators (🟡 P3)

For requests with approaching filing deadlines:

```tsx
{daysUntilDeadline < 5 && (
  <Badge variant="destructive" className="ml-2">
    {daysUntilDeadline}d left
  </Badge>
)}
```

---

## Status-to-Action Mapping (Expected vs Actual)

| Status | Expected Primary Action | Actual Implementation | Gap |
|--------|------------------------|----------------------|-----|
| SubmissionRequest: `pending` | "Start Wizard" (prominent) | In detail sheet only | ⚠️ Add inline |
| Report: `draft` | "Continue Wizard" | ❌ Not in My Queue | ⚠️ Missing |
| Report: `collecting` | "View Progress" | "View" button ✅ | OK |
| Report: `ready_to_file` | "Review & File" | "Review" button ✅ | OK |
| Report: `filed` | "View Details" | Can navigate ✅ | OK |

---

## Summary

| Issue | Priority | Impact |
|-------|----------|--------|
| SubmissionRequest not marked completed on filing | 🔴 P0 | Client dashboard shows wrong status |
| My Queue missing draft reports | 🟠 P1 | Staff can't see reports needing setup |
| Start Wizard needs 2 clicks | 🟡 P2 | Workflow friction |
| No urgency indicators | 🟡 P3 | May miss deadlines |

---

*Investigation completed: January 28, 2026*
