# CURSOR PROMPT: Demo Data Investigation - What Do We Have?

## MISSION

Before we fix anything, we need to understand the current state. Answer these questions by examining the codebase.

---

## INVESTIGATION 1: Data Models & Relationships

### Questions:

1. **SubmissionRequest Model**
   - File location?
   - What fields exist?
   - Does it have a `report_id` or link to Report?
   - What are the possible `status` values?

2. **Report Model**
   - File location?
   - Does it have `submission_request_id` field?
   - What are the possible `status` values?
   - Does it have `company_id` and `created_by_id`?

3. **How are they linked?**
   - One SubmissionRequest → One Report?
   - Or One SubmissionRequest → Many Reports?
   - Is the link created when "Start Wizard" is clicked?

---

## INVESTIGATION 2: Current Seed Data

### Questions:

1. **Where is seed data created?**
   - File location(s)?
   - Function name(s)?

2. **What does current seed data include?**
   - SubmissionRequests? How many? What statuses?
   - Reports? How many? What statuses?
   - Are they linked to each other?
   - ReportParties? PartyLinks?

3. **When is seed data called?**
   - On `/demo/reset`?
   - On app startup?
   - Manually?

---

## INVESTIGATION 3: Dashboard Data Sources

### Questions:

1. **Client Dashboard (`/app/dashboard` or `/app/requests`)**
   - What API endpoint(s) does it call?
   - Does it show SubmissionRequests, Reports, or both?
   - What cards/stats are displayed?

2. **Staff Dashboard**
   - What API endpoint(s)?
   - What data is shown?
   - How are counts calculated?

3. **Admin Dashboard**
   - What API endpoint(s)?
   - Does it aggregate across all users/companies?
   - What stats cards exist?

4. **COO View (if exists)**
   - Is there a separate COO dashboard?
   - Or is it the same as Admin?

---

## INVESTIGATION 4: Invoice & PDF Features

### Questions:

1. **Invoice View**
   - Does an invoice page/component exist?
   - File location?
   - What data does it display?
   - Is it functional or placeholder?

2. **PDF Generation**
   - Is there PDF generation code?
   - What library (if any)? react-pdf? jspdf? server-side?
   - What PDFs can be generated? (Invoice? Filing receipt? Report summary?)
   - File location(s)?

3. **What's missing?**
   - Is Invoice View just not wired up?
   - Is PDF generation not implemented?

---

## INVESTIGATION 5: Role-Based Views

### Questions:

1. **What user roles exist?**
   - List all roles in the system
   - Where are they defined?

2. **What does each role see?**
   - Client: What pages/data?
   - Staff: What pages/data?
   - Admin: What pages/data?
   - COO/Manager: What pages/data?

3. **Are there route guards?**
   - How is access controlled?
   - Middleware? Component-level checks?

---

## INVESTIGATION 6: Current Gaps

### After investigating, list:

1. **Data Chain Gaps**
   - Any seeded SubmissionRequests without Reports?
   - Any seeded Reports without proper party data?
   - Any broken links?

2. **Dashboard Gaps**
   - Any cards showing wrong counts?
   - Any missing data displays?
   - Any "Coming Soon" placeholders?

3. **Feature Gaps**
   - Invoice: Working / Partial / Missing?
   - PDF: Working / Partial / Missing?
   - Any other incomplete features?

---

## OUTPUT FORMAT

Please provide your findings in this format:

```markdown
## Findings

### 1. Data Models
- SubmissionRequest: [location], [key fields], [statuses]
- Report: [location], [key fields], [statuses]
- Link: [how they connect]

### 2. Seed Data
- Location: [file]
- Creates: [what]
- Gaps: [what's missing]

### 3. Dashboards
- Client: [endpoint], [shows what]
- Staff: [endpoint], [shows what]
- Admin: [endpoint], [shows what]

### 4. Invoice/PDF
- Invoice: [status]
- PDF: [status]
- Missing: [what]

### 5. Roles
- Defined roles: [list]
- Access control: [how]

### 6. Recommended Fixes
1. [First priority fix]
2. [Second priority fix]
3. [etc.]
```

---

## WHY THIS MATTERS

We need to know:
- What harpoons to use (what code exists)
- Where the sharks are (what's broken)
- How deep the water is (how much work)

**Don't fix anything yet - just investigate and report back.**
