# CURSOR PROMPT: Investigate Platform Traceability

## 🎯 MISSION

**INVESTIGATE ONLY - DO NOT FIX YET.**

Audit the entire PCT FinCEN platform to determine what traceability and visibility we currently have across all user roles. Report findings so we can plan fixes.

---

## INVESTIGATION SCOPE

### 1. AUDIT LOG SYSTEM

**Questions to Answer:**
- Does an `AuditLog` model exist? Where?
- What fields does it have?
- Is there an audit service/helper for logging events?
- Which routes currently call the audit logger?
- Which routes are MISSING audit logging?

**Files to Check:**
```
api/app/models/audit_log.py (or similar)
api/app/services/audit.py (or similar)
api/app/routes/*.py (all route files)
```

**Report Format:**
```
AUDIT LOG SYSTEM:
- Model exists: YES/NO
- Location: [path]
- Fields: [list]
- Service exists: YES/NO
- Routes with logging: [list]
- Routes WITHOUT logging: [list]
```

---

### 2. FEATURE VISIBILITY BY ROLE

For EACH feature below, investigate what each role can currently see:

#### A. Submission Requests
- Client Dashboard: What submission data is shown?
- Staff Queue: What submission data is shown?
- Admin List: What submission data is shown? Filters available?
- Admin Detail: Full data visible? Audit trail?

**Files to Check:**
```
web/app/(app)/app/dashboard/page.tsx
web/app/(app)/app/requests/page.tsx
web/app/(app)/app/staff/queue/page.tsx
web/app/(app)/app/admin/reports/page.tsx (or submissions)
api/app/routes/submissions.py
api/app/schemas/submission.py
```

#### B. Determination (Exempt/Reportable)
- Is determination data stored on submissions?
- Is it visible in client dashboard?
- Is it visible in staff views?
- Is it visible in admin views?
- Are there filters for determination status?

**Files to Check:**
```
api/app/models/submission_request.py
api/app/services/determination.py (or early_determination.py)
```

#### C. Reports
- Staff Wizard: What data is shown?
- Admin List: What report data is shown?
- Admin Detail: Full wizard data visible?

**Files to Check:**
```
web/app/(app)/app/reports/[id]/wizard/page.tsx
web/app/(app)/app/admin/reports/page.tsx
web/app/(app)/app/admin/reports/[id]/page.tsx
api/app/routes/reports.py
```

#### D. Parties (Buyers/Sellers)
- Party Portal: What can parties see/edit?
- Staff Queue: Party status visible?
- Staff Wizard: Party data visible?
- Admin: Full party data visible?
- Client Dashboard: Party status visible?

**Files to Check:**
```
web/app/p/[token]/page.tsx (or /party/)
web/components/party-portal/*.tsx
web/components/party/*.tsx
api/app/routes/parties.py
api/app/models/report_party.py
```

#### E. Party Links
- Are link events tracked (created, sent, opened, submitted)?
- Is link status visible to staff?
- Is link status visible to admin?
- Is link status visible to client?

**Files to Check:**
```
api/app/models/party_link.py
api/app/routes/parties.py (or party_links.py)
```

#### F. Documents (ID Uploads)
- Document model exists?
- Documents visible in staff views?
- Documents visible in admin views?
- Download tracking?

**Files to Check:**
```
api/app/models/party_document.py
api/app/routes/documents.py
web/components/party-portal/DocumentUpload.tsx
web/components/documents/*.tsx
```

#### G. Filing (FinCEN Submission)
- Filing status visible to staff?
- Filing status visible to admin?
- Filing history/attempts tracked?
- Rejection details visible?

**Files to Check:**
```
api/app/models/filing_submission.py
api/app/routes/reports.py (filing endpoints)
web/app/(app)/app/admin/filings/page.tsx
```

#### H. Notifications
- Notification events logged?
- Visible in admin?
- Delivery status tracked?

**Files to Check:**
```
api/app/models/notification_event.py
api/app/routes/admin.py (notifications endpoint)
web/app/(app)/app/admin/notifications/page.tsx
```

#### I. Billing/Invoices
- Invoice model exists?
- Visible to clients?
- Visible to admin?

**Files to Check:**
```
api/app/models/invoice.py (or billing.py)
api/app/routes/billing.py
```

---

### 3. EXECUTIVE DASHBOARD

**Questions to Answer:**
- Does an executive dashboard exist?
- What aggregate stats are shown?
- What's missing?

**Files to Check:**
```
web/app/(app)/app/executive/page.tsx
web/app/(app)/app/admin/overview/page.tsx
api/app/routes/admin.py (stats endpoints)
```

---

### 4. API RESPONSE ANALYSIS

For key endpoints, check what data is returned:

```
GET /submissions - What fields?
GET /submissions/{id} - Full detail or limited?
GET /reports - What fields?
GET /reports/{id} - Full detail?
GET /reports/{id}/parties - What party data?
GET /admin/reports - Different from /reports?
GET /admin/stats - What stats available?
```

---

## OUTPUT FORMAT

Create a report with this structure:

```markdown
# TRACEABILITY INVESTIGATION REPORT

## Executive Summary
- Overall traceability score: X/10
- Critical gaps: [list]
- Quick wins: [list]

## 1. Audit Log System
- Status: [EXISTS/MISSING/PARTIAL]
- Details: ...
- Gaps: ...

## 2. Feature Visibility Matrix

### Submissions
| Data Point | Client | Staff | Admin | Status |
|------------|--------|-------|-------|--------|
| ...        | ✅/❌  | ✅/❌ | ✅/❌ | OK/GAP |

### Determinations
[same format]

### Reports
[same format]

### Parties
[same format]

### Party Links
[same format]

### Documents
[same format]

### Filing
[same format]

### Notifications
[same format]

### Billing
[same format]

## 3. Executive Dashboard
- Status: [EXISTS/MISSING/PARTIAL]
- Current metrics: ...
- Missing metrics: ...

## 4. API Response Gaps
- Endpoint: [gap description]
- ...

## 5. Recommended Fixes (Priority Order)
1. [Critical] ...
2. [High] ...
3. [Medium] ...
4. [Low] ...

## 6. Files That Need Changes
- [file]: [what needs to change]
- ...
```

---

## IMPORTANT

- **DO NOT MAKE ANY CHANGES** during this investigation
- **DO NOT CREATE ANY FILES** (except the report)
- **ONLY READ AND ANALYZE** existing code
- Report findings clearly so we can plan fixes

---

## AFTER INVESTIGATION

Once you provide the report, we will:
1. Review the gaps together
2. Prioritize fixes
3. Create targeted prompts to fix specific gaps
4. Implement fixes one area at a time

**Start the investigation now. Be thorough.**
