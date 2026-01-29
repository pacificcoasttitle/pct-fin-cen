# CURSOR PROMPT: Investigation - Status Accuracy & Wizard Action Prominence

## 🎯 MISSION

Two concerns to investigate:

1. **Status Accuracy** - Are statuses displaying correctly and reflecting the actual step in the process?
2. **Action Prominence** - "Start Wizard" and "Continue" buttons need to be more visible/prominent

---

## INVESTIGATION 1: Status Display Mapping

### Questions:

**What statuses exist and what do they mean?**

We need a complete map of:

| Model | Status Field | All Possible Values | What Each Means |
|-------|--------------|---------------------|-----------------|
| SubmissionRequest | `status` | ? | ? |
| Report | `status` | ? | ? |

### Files to Examine:

**`api/app/models/submission_request.py`**
1. What are ALL valid status values for SubmissionRequest?
2. Is there an enum or comment listing them?
3. Show the status field definition

**`api/app/models/report.py`**
1. What are ALL valid status values for Report?
2. Is there an enum or comment listing them?
3. Show the status field definition

---

## INVESTIGATION 2: Status Transitions

### Questions:

**When does each status change?**

Map out the complete lifecycle:

```
SubmissionRequest Lifecycle:
pending → ? → ? → ?

Report Lifecycle:
draft → ? → ? → ? → filed
```

### Files to Examine:

**`api/app/routes/submission_requests.py`**
1. When does status change from `pending` to `in_progress`?
2. When does status change to `completed`?
3. Is there a status update when "Start Wizard" is clicked?

**`api/app/routes/reports.py`**
1. When does `draft` → `determination_complete`?
2. When does `determination_complete` → `collecting`?
3. When does `collecting` → `ready_to_file`?
4. When does `ready_to_file` → `filed`?
5. When does a report become `exempt`?

---

## INVESTIGATION 3: Frontend Status Display

### Questions:

**How are statuses displayed to users?**

**File:** `web/app/(app)/app/admin/requests/page.tsx` (All Requests page)
1. How is SubmissionRequest status displayed?
2. What badge colors/labels are used?
3. Is there a status config mapping?
4. Show the status display code

**File:** `web/app/(app)/app/staff/queue/page.tsx` (My Queue page)
1. How is Report status displayed?
2. What badge colors/labels are used?
3. Is the status accurate to the actual wizard step?
4. Show the status display code

**File:** `web/app/(app)/app/requests/page.tsx` (Client Requests page)
1. How do clients see their request status?
2. Is the display client-friendly (not technical terms)?

---

## INVESTIGATION 4: Status Sync Issues

### Potential Problems to Check:

1. **SubmissionRequest vs Report status mismatch**
   - When Report is created, does SubmissionRequest status update?
   - When Report is filed, does SubmissionRequest become "completed"?

2. **Wizard step vs Report status mismatch**
   - Report might show "collecting" but wizard is on determination step
   - Report might show "draft" but wizard is almost complete

3. **Stale status display**
   - Does the UI refresh after actions?
   - Are there polling/refetch mechanisms?

### Files to Check:

**`api/app/routes/submission_requests.py`** - `create_report_from_submission` endpoint
1. Does it update the SubmissionRequest status when report is created?
2. What status does it set? (`in_progress`?)

**`api/app/routes/reports.py`** - filing endpoint
1. When report is filed, does it update the linked SubmissionRequest?
2. Does SubmissionRequest become "completed"?

---

## INVESTIGATION 5: My Queue Page - Button Prominence

**File:** `web/app/(app)/app/staff/queue/page.tsx`

### Questions:

1. **Where is "Start Wizard" button?**
   - Is it in a dropdown menu? (hidden)
   - Is it a primary button? (prominent)
   - Is it visible without clicking anything?

2. **Where is "Continue" button?**
   - For reports already started, how does staff continue?
   - Is it obvious or buried?

3. **Show the current UI structure:**
   - What does a queue item row look like?
   - What actions are available?
   - How are they displayed?

4. **What's the call-to-action hierarchy?**
   - Primary action should be most prominent
   - For new items: "Start Wizard" should be PRIMARY
   - For in-progress: "Continue" should be PRIMARY

---

## INVESTIGATION 6: All Requests Page - Button Prominence

**File:** `web/app/(app)/app/admin/requests/page.tsx`

### Questions:

1. **Where is "Start Wizard" button for pending requests?**
   - Row action? Dropdown? Inline button?

2. **Is it clear which requests need action?**
   - Visual indicator for "needs attention"?
   - Sorting by status?

3. **Show the action buttons code**

---

## INVESTIGATION 7: Status-to-Action Mapping

### Expected UX:

| Status | Primary Action | Button Style |
|--------|---------------|--------------|
| SubmissionRequest: `pending` | "Start Wizard" | 🔵 Primary, prominent |
| Report: `draft` | "Continue Wizard" | 🔵 Primary |
| Report: `collecting` | "View Progress" / "Continue" | 🟡 Secondary |
| Report: `ready_to_file` | "Review & File" | 🟢 Success/Primary |
| Report: `filed` | "View Details" | ⚪ Ghost/Link |

### Questions:

1. Does the current UI follow this pattern?
2. Are primary actions visually prominent?
3. Can users immediately see what they need to do?

---

## OUTPUT FORMAT

```markdown
## Status Values Found

### SubmissionRequest Statuses
| Status | When Set | Displayed As | Badge Color |
|--------|----------|--------------|-------------|
| pending | | | |
| in_progress | | | |
| completed | | | |
| cancelled | | | |

### Report Statuses
| Status | When Set | Displayed As | Badge Color |
|--------|----------|--------------|-------------|
| draft | | | |
| determination_complete | | | |
| collecting | | | |
| ready_to_file | | | |
| filed | | | |
| exempt | | | |

---

## Status Transition Map

### SubmissionRequest Lifecycle
```
[diagram or description]
```

### Report Lifecycle
```
[diagram or description]
```

### Cross-Model Sync
- When Report created: SubmissionRequest → [status]
- When Report filed: SubmissionRequest → [status]

---

## Button Prominence Findings

### My Queue Page
- Start Wizard button location: [where]
- Continue button location: [where]
- Visibility: [prominent / hidden / buried in menu]
- Code snippet: [show the action buttons]

### All Requests Page
- Start Wizard button location: [where]
- Visibility: [prominent / hidden / buried in menu]
- Code snippet: [show the action buttons]

---

## Identified Issues

### Status Accuracy Issues
1. [issue]
2. [issue]

### Button Prominence Issues
1. [issue]
2. [issue]

---

## Recommended Fixes

### Status Fixes
1. [fix]

### Button Prominence Fixes
1. [fix]
```

---

## WHY THIS MATTERS

### Status Accuracy
- Users need to trust the status display
- Incorrect status = confusion and errors
- Status should reflect ACTUAL state, not stale data

### Button Prominence
- **"Start Wizard"** is the MOST IMPORTANT action for new requests
- If it's hidden in a dropdown, staff will miss it
- **"Continue"** for in-progress work should be ONE CLICK away
- Don't make users hunt for the next step

### The Goal

```
Staff opens My Queue
    ↓
Immediately sees what needs action
    ↓
ONE CLICK to start or continue work
    ↓
Clear status shows where each item stands
```

---

## VISUAL HIERARCHY PRINCIPLES

**Primary Actions (most prominent):**
- Start Wizard (for pending)
- Continue (for in-progress)
- File Report (for ready)

**Secondary Actions (less prominent):**
- View Details
- Edit
- Assign

**Tertiary Actions (dropdown/menu):**
- Cancel
- Archive
- Export

**Current concern:** Primary actions may be buried in secondary/tertiary positions.

---

**Investigate thoroughly - this affects daily workflow for every staff member.**
