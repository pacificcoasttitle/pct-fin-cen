# CURSOR PROMPT: Investigation - Sidebar Badge Logic

## MISSION

Investigate how sidebar navigation badges work and identify gaps in the notification logic.

**Current Observation:**
- FinClear Staff sees a badge on "Queue" 
- NO badge appears on "All Requests" (where new pending requests land)

**Expected Behavior:**
- "All Requests" should show badge for NEW pending requests needing attention
- "Queue" should show badge for items actively being processed (collecting, ready to file)

---

## INVESTIGATION 1: Sidebar Component

### Files to Examine:
- `web/components/app-sidebar.tsx`
- `web/components/sidebar-nav.tsx` (if exists)
- `web/lib/navigation.ts`

### Questions:

1. **Where is the sidebar defined?**
   - File location?
   - Component name?

2. **How are navigation items structured?**
   - Show the nav item structure/type
   - What fields exist (label, href, icon, badge, etc.)?

3. **How are badges rendered?**
   - Is there a `badge` or `count` property?
   - Is it static or dynamic (fetched from API)?
   - Show the badge rendering code

4. **What API endpoints are called for badge counts?**
   - Is there a dedicated `/counts` or `/stats` endpoint?
   - When is it fetched (on mount, polling, etc.)?

---

## INVESTIGATION 2: Current Badge Implementation

### Questions:

1. **What badges currently exist?**
   - List all nav items that have badges
   - What triggers each badge?

2. **Queue badge logic:**
   - What makes the Queue badge light up?
   - What count does it show?
   - What API endpoint provides this data?

3. **All Requests badge logic:**
   - Does it have a badge at all?
   - If yes, what triggers it?
   - If no, why not?

---

## INVESTIGATION 3: API Endpoints for Counts

### Files to Examine:
- `api/app/routes/submission_requests.py`
- `api/app/routes/reports.py`

### Questions:

1. **Does a counts/stats endpoint exist for submission requests?**
   - `GET /submission-requests/stats`?
   - `GET /submission-requests/counts`?
   - What does it return?

2. **Does a counts/stats endpoint exist for reports?**
   - `GET /reports/stats`?
   - `GET /reports/queue/counts`?
   - What does it return?

3. **What counts should each badge show?**

| Nav Item | Badge Should Show |
|----------|-------------------|
| All Requests | Pending requests (status="pending") |
| Queue | Reports in collecting/ready_to_file |
| My Requests | (for clients) Their pending requests |

---

## INVESTIGATION 4: Badge by Role

### Questions:

1. **Do badges differ by role?**
   - What should COO see?
   - What should pct_admin see?
   - What should pct_staff see?
   - What should client_admin see?
   - What should client_user see?

2. **Is badge fetching role-aware?**
   - Does it filter by company for clients?
   - Does it show all for FinClear staff?

---

## INVESTIGATION 5: Polling/Refresh Logic

### Questions:

1. **How often are badge counts refreshed?**
   - On page load only?
   - Polling interval?
   - On navigation?

2. **Is there a central state for badge counts?**
   - React context?
   - Zustand/Redux store?
   - Local component state?

---

## OUTPUT FORMAT

```markdown
## Sidebar Badge Findings

### Component Structure
- Sidebar file: [path]
- Nav items defined in: [path]
- Badge component: [description]

### Current Badge Implementation

#### Queue Badge
- Shows: [what count]
- Source: [API endpoint]
- Trigger: [what makes it appear]
- Code snippet: [relevant code]

#### All Requests Badge  
- Exists: [yes/no]
- If yes: [what it shows]
- If no: [why missing]

### API Endpoints for Counts
| Endpoint | Returns | Used By |
|----------|---------|---------|
| | | |

### Badge Refresh Logic
- Method: [polling/on-load/manual]
- Interval: [if polling]
- State management: [how stored]

### Identified Gaps
1. [gap 1]
2. [gap 2]

### Recommended Fix
[description of what needs to change]
```

---

## WHY THIS MATTERS

**User Experience Issue:**
- New requests come in → Staff doesn't see notification
- Staff only notices items already in their queue
- Requests could sit unnoticed

**Expected Flow:**
```
New Request Submitted → Badge on "All Requests" (🔴 1)
                              ↓
Staff clicks "Start Wizard" → Badge moves to "Queue" 
                              ↓
                        "All Requests" badge clears (or decrements)
```

**Investigate thoroughly so we can fix the notification flow.**
