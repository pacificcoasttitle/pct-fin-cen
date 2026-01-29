# CURSOR PROMPT: Ripple Effect Analysis (Pre-Implementation)

## 🎯 PURPOSE

**BEFORE implementing any new feature, run this analysis to identify ALL areas of the codebase that will be affected.**

This prevents:
- Broken integrations
- Missing visibility/traceability
- Orphaned data
- UI inconsistencies
- Incomplete implementations

---

## WHEN TO USE THIS

Run this analysis BEFORE implementing:
- New data models
- New features
- Major changes to existing features
- New user-facing workflows
- Changes to data flow

---

## THE ANALYSIS FRAMEWORK

### 1. DATA LAYER RIPPLES

**Question: What data changes are needed?**

```
NEW/CHANGED MODEL: [name]

Check impacts on:
□ Database schema (new tables? new columns?)
□ Existing models (new relationships? foreign keys?)
□ Migrations needed
□ Indexes needed for queries
□ Data validation rules
□ Default values for existing records
```

**Output Format:**
```
DATA LAYER IMPACTS:
- New table: [name] with columns [list]
- Modified table: [name] adding [columns]
- New relationship: [model A] → [model B]
- Migration required: YES/NO
- Backfill needed: YES/NO (for existing data)
```

---

### 2. API LAYER RIPPLES

**Question: What API changes are needed?**

```
Check impacts on:
□ New endpoints needed
□ Existing endpoints need new fields in response
□ Existing endpoints need new query parameters
□ Request schemas need updates
□ Response schemas need updates
□ Authentication/authorization changes
□ Rate limiting considerations
```

**Output Format:**
```
API LAYER IMPACTS:
- New endpoint: [method] [path] - [purpose]
- Modified endpoint: [path] - adding [fields/params]
- New schema: [name]
- Modified schema: [name] - adding [fields]
```

---

### 3. UI LAYER RIPPLES

**Question: What UI changes are needed across ALL roles?**

```
For EACH role, check:

PARTY PORTAL:
□ New forms/fields needed?
□ Existing forms need updates?
□ New pages needed?
□ Navigation changes?

CLIENT DASHBOARD:
□ New data to display?
□ Existing components need updates?
□ New pages needed?
□ Status indicators need updates?

STAFF VIEWS:
□ Queue needs new columns/filters?
□ Wizard needs new steps/fields?
□ Detail views need updates?
□ New actions needed?

ADMIN VIEWS:
□ List views need new columns/filters?
□ Detail views need updates?
□ New admin pages needed?
□ Stats/metrics need updates?

EXECUTIVE DASHBOARD:
□ New aggregate metrics needed?
□ New charts/visualizations?
□ Existing stats need updates?
```

**Output Format:**
```
UI LAYER IMPACTS:

Party Portal:
- [page/component]: [change needed]

Client Dashboard:
- [page/component]: [change needed]

Staff Views:
- [page/component]: [change needed]

Admin Views:
- [page/component]: [change needed]

Executive Dashboard:
- [metric/chart]: [change needed]
```

---

### 4. TRACEABILITY RIPPLES

**Question: What audit/visibility is needed?**

```
Check:
□ What events need to be logged?
□ What role sees what data?
□ Are there new statuses to track?
□ Do existing status flows change?
□ What shows up in audit trails?
□ What shows up in notifications?
```

**Output Format:**
```
TRACEABILITY IMPACTS:
- New audit events: [list]
- Visibility matrix:
  | Data Point | Party | Client | Staff | Admin | Exec |
  |------------|-------|--------|-------|-------|------|
  | [field]    | ✅/❌ | ✅/❌  | ✅/❌ | ✅/❌ | ✅/❌|
- New notification events: [list]
```

---

### 5. INTEGRATION RIPPLES

**Question: What existing features are affected?**

```
Check integrations with:
□ Submission flow
□ Determination logic
□ Report creation
□ Party link generation
□ Party portal
□ Filing process
□ Notification system
□ Billing system
□ Demo/seed data
□ Tests
```

**Output Format:**
```
INTEGRATION IMPACTS:
- [feature]: [how it's affected]
- [feature]: [how it's affected]

DEPENDENCIES:
- This feature depends on: [list]
- These features depend on this: [list]
```

---

### 6. EDGE CASES & RISKS

**Question: What could go wrong?**

```
Consider:
□ What if existing data doesn't have new fields?
□ What if the feature is partially complete?
□ What happens on error states?
□ What about concurrent operations?
□ What about permissions/access control?
□ Performance implications?
□ Data migration risks?
```

**Output Format:**
```
RISKS & EDGE CASES:
- Risk: [description]
  Mitigation: [approach]
  
- Edge case: [description]
  Handling: [approach]
```

---

## COMPLETE ANALYSIS TEMPLATE

```markdown
# RIPPLE EFFECT ANALYSIS

## Feature: [NAME]
## Date: [DATE]
## Analyst: [CURSOR/HUMAN]

---

## 1. Feature Summary
[Brief description of what's being built]

---

## 2. Data Layer Impacts
[From section 1 above]

---

## 3. API Layer Impacts
[From section 2 above]

---

## 4. UI Layer Impacts
[From section 3 above]

---

## 5. Traceability Impacts
[From section 4 above]

---

## 6. Integration Impacts
[From section 5 above]

---

## 7. Risks & Edge Cases
[From section 6 above]

---

## 8. Implementation Order

Based on dependencies, implement in this order:
1. [First thing - usually data layer]
2. [Second thing - usually API]
3. [Third thing - usually core UI]
4. [Fourth thing - usually visibility/traceability]
5. [Fifth thing - usually polish/edge cases]

---

## 9. Verification Checklist

After implementation, verify:
- [ ] [Specific check 1]
- [ ] [Specific check 2]
- [ ] [Specific check 3]
- [ ] All roles can see appropriate data
- [ ] Audit events are logged
- [ ] Tests pass
- [ ] Demo flow works

---

## 10. Files To Be Changed

| File | Change Type | Description |
|------|-------------|-------------|
| [path] | NEW/MODIFY | [what changes] |
| [path] | NEW/MODIFY | [what changes] |
```

---

## EXAMPLE: Early Exemption Feature

```markdown
# RIPPLE EFFECT ANALYSIS

## Feature: Early Exemption Determination at Client Submission
## Date: 2026-01-29

---

## 1. Feature Summary
Enable client submission form to immediately determine if transaction requires FinCEN reporting. Exempt transactions get a certificate and end there. Reportable transactions continue to staff workflow.

---

## 2. Data Layer Impacts

- Modified table: `submission_requests` adding:
  - determination_result (string)
  - exemption_reasons (jsonb)
  - determination_timestamp (datetime)
  - determination_method (string)
  - exemption_certificate_id (string)
  - exemption_certificate_generated_at (datetime)
- Migration required: YES
- Backfill needed: YES (existing submissions = NULL or "needs_review")
- New index: exemption_certificate_id (for lookups)

---

## 3. API Layer Impacts

- Modified endpoint: POST /submissions - now returns determination
- New endpoint: GET /certificates/{id} - lookup by certificate
- New endpoint: GET /admin/stats/exemptions - exemption metrics
- Modified schema: SubmissionResponse adding determination fields
- New schema: ExemptionCertificateResponse

---

## 4. UI Layer Impacts

Party Portal:
- N/A (parties don't submit)

Client Dashboard:
- /submit/[id]/result - NEW page for showing result
- /app/requests - needs "Exempt" tab/filter
- ExemptionCertificate component - NEW
- Print/download certificate functionality

Staff Views:
- /app/staff/queue - default filter to "reportable" only
- Add "Exempt" tab for reference

Admin Views:
- /app/admin/reports - add determination filter
- /app/admin/reports/[id] - show determination details
- Add certificate lookup search

Executive Dashboard:
- Exemption rate metric
- Exemption reasons breakdown chart
- Trend over time

---

## 5. Traceability Impacts

New audit events:
- determination_auto
- determination_manual
- exemption_certified
- exemption_certificate_viewed
- exemption_certificate_downloaded

Visibility matrix:
| Data Point | Party | Client | Staff | Admin | Exec |
|------------|-------|--------|-------|-------|------|
| determination_result | ❌ | ✅ | ✅ | ✅ | ✅ rates |
| exemption_reasons | ❌ | ✅ | ✅ | ✅ | ✅ breakdown |
| certificate_id | ❌ | ✅ | ❌ | ✅ search | ❌ |

---

## 6. Integration Impacts

- Submission flow: Now branches based on determination
- Report creation: Only for reportable submissions
- Staff queue: Filtered by default
- Notification system: New event types
- Billing: Only bill reportable? Or all submissions?
- Demo seed: Need exempt + reportable examples

---

## 7. Risks & Edge Cases

- Risk: Existing submissions have no determination
  Mitigation: Migration sets to NULL, treat as "needs_review"

- Edge case: Client changes answers after submission
  Handling: Don't allow changes, or re-run determination

- Edge case: Borderline cases (uncertainty)
  Handling: "needs_review" status, staff decides

---

## 8. Implementation Order

1. Migration (add columns)
2. Determination service (logic)
3. API changes (submission endpoint)
4. Client result page + certificate
5. Client dashboard updates
6. Staff queue filtering
7. Admin views + search
8. Executive metrics
9. Audit logging
10. Tests + demo data

---

## 9. Verification Checklist

- [ ] Submit exempt transaction → shows certificate
- [ ] Submit reportable transaction → goes to staff queue
- [ ] Staff queue defaults to reportable only
- [ ] Admin can search by certificate ID
- [ ] Executive sees exemption rate
- [ ] Audit log shows determination event
- [ ] Print certificate works
- [ ] Download PDF works
```

---

## INSTRUCTIONS FOR CURSOR

When asked to analyze ripple effects:

1. **Read the feature spec thoroughly**
2. **Examine the existing codebase** for all touch points
3. **Complete the analysis template** above
4. **DO NOT implement anything** - analysis only
5. **Highlight any concerns** or questions

After analysis is approved, THEN proceed to implementation.

---

## USAGE

Before any new feature, say to Cursor:

> "Before implementing [FEATURE], run a ripple effect analysis using the framework in CURSOR_PROMPT_RIPPLE_EFFECT_ANALYSIS.md. Report findings before making any changes."
