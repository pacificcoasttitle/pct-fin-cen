# TRACEABILITY INVESTIGATION REPORT

**Generated:** January 29, 2026  
**Investigator:** AI Assistant

---

## Executive Summary

- **Overall Traceability Score: 6.5/10**
- **Critical Gaps:**
  1. Audit logging is incomplete - only 4 actions logged
  2. Client has no visibility into party status
  3. Document download/view tracking missing
  4. No admin page for managing invoices
  5. Submission requests lack individual audit logs
- **Quick Wins:**
  1. Add audit logging to existing routes (low effort, high value)
  2. Add party status to client dashboard
  3. Add document list view to admin pages

---

## 1. Audit Log System

**Status: PARTIAL**

### Model Details
- **Location:** `api/app/models/audit_log.py`
- **Exists:** YES ✓

### Fields
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| report_id | UUID | Optional report association |
| actor_type | String | system, staff, party, api |
| actor_user_id | UUID | User who performed action |
| action | String | Action code (e.g., report.created) |
| details | JSONB | Additional action details |
| ip_address | String | Client IP |
| created_at | DateTime | Timestamp |

### Audit Service
- **Dedicated Service:** NO - inline logging in routes
- **Reusable Helper:** NO

### Routes with Audit Logging
| Route File | Actions Logged |
|------------|----------------|
| `reports.py` | `report.created`, `report.determined`, `party_links.created` |
| `parties.py` | `party.submitted` |

### Routes WITHOUT Audit Logging
| Route File | Missing Actions |
|------------|-----------------|
| `submission_requests.py` | submission.created, submission.status_changed, report.created_from_submission |
| `documents.py` | document.uploaded, document.downloaded, document.deleted |
| `invoices.py` | invoice.generated, invoice.sent, invoice.paid, invoice.voided |
| `companies.py` | company.created, company.updated |
| `users.py` | user.created, user.role_changed, user.login, user.logout |
| `admin.py` | filing.retry_requested, demo.reset |

### Gap Analysis
- **Total actions that should be logged:** ~20
- **Actions currently logged:** 4
- **Coverage:** 20%

---

## 2. Feature Visibility Matrix

### A. Submission Requests

| Data Point | Client | Staff | Admin | Status |
|------------|--------|-------|-------|--------|
| List of submissions | ✅ | ❌ (uses Reports) | ✅ | PARTIAL |
| Submission status | ✅ | ❌ | ✅ | PARTIAL |
| Determination result | ✅ | ❌ | ✅ | PARTIAL |
| Exemption certificate | ✅ | ❌ | ✅ | PARTIAL |
| Property address | ✅ | ❌ | ✅ | OK |
| Buyer/seller names | ✅ | ❌ | ✅ | OK |
| Linked report status | ✅ | N/A | ✅ | OK |
| Audit trail | ❌ | ❌ | ❌ | **GAP** |

**Files:**
- Client: `web/app/(app)/app/dashboard/page.tsx`, `web/app/(app)/app/requests/page.tsx`
- Admin: `web/app/(app)/app/admin/requests/page.tsx`
- API: `api/app/routes/submission_requests.py`

---

### B. Determinations (Exempt/Reportable)

| Data Point | Client | Staff | Admin | Status |
|------------|--------|-------|-------|--------|
| Determination result | ✅ | ❌ | ✅ | PARTIAL |
| Exemption reasons | ✅ | ❌ | ✅ | PARTIAL |
| Certificate ID | ✅ | ❌ | ✅ | PARTIAL |
| Determination timestamp | ✅ | ❌ | ✅ | PARTIAL |
| Exemption rate stats | ❌ | ❌ | ✅ | OK |
| Filter by determination | ✅ | ❌ | ✅ | PARTIAL |

**Note:** Staff work from Reports, not SubmissionRequests, so they don't see determination data directly - only reportable submissions become Reports.

**Files:**
- Model: `api/app/models/submission_request.py`
- Service: `api/app/services/early_determination.py`

---

### C. Reports

| Data Point | Client | Staff | Admin | Status |
|------------|--------|-------|-------|--------|
| Report list | ❌ | ✅ (queue) | ✅ | OK |
| Report status | ❌ | ✅ | ✅ | OK |
| Property address | ❌ | ✅ | ✅ | OK |
| Wizard data | ❌ | ✅ | ✅ | OK |
| Determination data | ❌ | ✅ | ✅ | OK |
| Filing status | ❌ | ✅ | ✅ | OK |
| Receipt ID | ❌ | ✅ | ✅ | OK |
| Party count/status | ❌ | ✅ | ✅ | OK |
| Audit trail | ❌ | ❌ | ✅ | OK |

**Files:**
- Staff: `web/app/(app)/app/staff/queue/page.tsx`, `web/app/(app)/app/reports/[id]/wizard/page.tsx`
- Admin: `web/app/(app)/app/admin/reports/page.tsx`
- API: `api/app/routes/reports.py`, `api/app/routes/admin.py`

---

### D. Parties (Buyers/Sellers)

| Data Point | Client | Staff | Admin | Party Portal | Status |
|------------|--------|-------|-------|--------------|--------|
| Party list | ❌ | ✅ | ✅ | N/A | **GAP** |
| Party role/type | ❌ | ✅ | ✅ | ✅ | **GAP** |
| Party status | ❌ | ✅ | ✅ | ✅ | **GAP** |
| Submission status | ❌ | ✅ | ✅ | ✅ | **GAP** |
| Party data (PII) | ❌ | ✅ | ✅ | ✅ | OK |
| Beneficial owners | ❌ | ✅ | ✅ | ✅ | OK |
| Completion % | ❌ | ✅ | ❌ | ✅ | PARTIAL |
| Document count | ❌ | ✅ | ❌ | ✅ | PARTIAL |

**Critical Gap:** Clients cannot see party submission status for their transactions!

**Files:**
- Party Portal: `web/app/p/[token]/page.tsx`, `web/components/party-portal/`
- Staff: `web/components/party/`
- API: `api/app/routes/parties.py`, `api/app/models/report_party.py`

---

### E. Party Links

| Data Point | Client | Staff | Admin | Status |
|------------|--------|-------|-------|--------|
| Link created | ❌ | ❌ | ✅ (audit) | PARTIAL |
| Link URL | ❌ | ✅ | ✅ | OK |
| Link status | ❌ | ✅ | ✅ | **GAP** |
| Link expiration | ❌ | ✅ | ✅ | OK |
| Link opened | ❌ | ❌ | ❌ | **GAP** |
| Link used | ❌ | ✅ | ✅ | OK |

**Gap:** No tracking of when links are opened (clicked). Only submitted_at is tracked.

**Files:**
- Model: `api/app/models/party_link.py`
- API: `api/app/routes/reports.py` (party-links endpoint)

---

### F. Documents (ID Uploads)

| Data Point | Client | Staff | Admin | Party Portal | Status |
|------------|--------|-------|-------|--------------|--------|
| Document list | ❌ | ❌ | ❌ | ✅ | **GAP** |
| Upload status | ❌ | ❌ | ❌ | ✅ | **GAP** |
| Download URL | ❌ | ✅ | ❌ | ✅ | **GAP** |
| Verification status | ❌ | ❌ | ❌ | ❌ | **GAP** |
| View/download tracking | ❌ | ❌ | ❌ | ❌ | **GAP** |

**Critical Gap:** No admin document management view. Staff cannot easily review uploaded documents.

**Files:**
- Model: `api/app/models/document.py`
- API: `api/app/routes/documents.py`
- Component: `web/components/party-portal/DocumentUpload.tsx`

---

### G. Filing (FinCEN Submission)

| Data Point | Client | Staff | Admin | Status |
|------------|--------|-------|-------|--------|
| Filing status | ❌ | ✅ | ✅ | OK |
| Receipt ID | ❌ | ✅ | ✅ | OK |
| Filed date | ❌ | ✅ | ✅ | OK |
| Rejection code | ❌ | ✅ | ✅ | OK |
| Rejection message | ❌ | ✅ | ✅ | OK |
| Retry count | ❌ | ✅ | ✅ | OK |
| Demo outcome | ❌ | ✅ | ✅ | OK |

**Files:**
- Model: `api/app/models/filing_submission.py`
- Admin: `web/app/(app)/app/admin/filings/page.tsx`
- API: `api/app/routes/admin.py`

---

### H. Notifications

| Data Point | Client | Staff | Admin | Status |
|------------|--------|-------|-------|--------|
| Notification list | ❌ | ❌ | ✅ | OK |
| Delivery status | ❌ | ❌ | ✅ | OK |
| Email content | ❌ | ❌ | ✅ | OK |
| Sent timestamp | ❌ | ❌ | ✅ | OK |
| Error messages | ❌ | ❌ | ✅ | OK |
| Provider message ID | ❌ | ❌ | ✅ | OK |

**Files:**
- Model: `api/app/models/notification_event.py`
- Admin: `web/app/(app)/app/admin/notifications/page.tsx`
- Service: `api/app/services/notifications.py`

---

### I. Billing/Invoices

| Data Point | Client | Staff | Admin | Status |
|------------|--------|-------|-------|--------|
| Invoice list | ✅* | ❌ | ❌ | **GAP** |
| Invoice detail | ❌ | ❌ | ❌ | **GAP** |
| Line items | ❌ | ❌ | ❌ | **GAP** |
| Payment status | ✅* | ❌ | ❌ | **GAP** |
| Generate invoice | ❌ | ❌ | ❌ | **GAP** |
| Mark paid | ❌ | ❌ | ❌ | **GAP** |

*Client invoice page exists but uses filed reports as proxy, not actual Invoice model.

**Critical Gap:** No admin interface for invoice management despite full API existing!

**Files:**
- Models: `api/app/models/invoice.py`, `api/app/models/billing_event.py`
- API: `api/app/routes/invoices.py` (FULL API exists!)
- Client: `web/app/(app)/app/invoices/page.tsx` (uses reports, not invoices API)

---

## 3. Executive Dashboard

**Status: EXISTS ✓**

### Current Metrics
| Metric | Source | Status |
|--------|--------|--------|
| Total Reports | Report count | ✅ |
| Filed Reports | Report status=filed | ✅ |
| Exempt Reports | Report status=exempt | ✅ |
| Pending Reports | Report status in (draft, collecting, ready_to_file) | ✅ |
| Filed This Month | Report filed_at >= month start | ✅ |
| MTD Revenue | Filed count × $75 | ✅ |
| Compliance Rate | Mock 98.2% | ⚠️ |
| Avg Completion Days | Mock 3.2 | ⚠️ |
| Exemption Rate | exempt_submissions / total_submissions | ✅ |
| Total Submissions | SubmissionRequest count | ✅ |
| Exempt Submissions | determination_result=exempt | ✅ |
| Reportable Submissions | determination_result=reportable | ✅ |

### Missing Metrics
- **By Company:** Breakdown of filings per client company
- **Trends:** Week-over-week, month-over-month comparisons
- **Processing Time:** Real avg from created_at to filed_at
- **Rejection Rate:** Rejected / (Accepted + Rejected)
- **Party Completion Time:** Avg time from link sent to submitted
- **Queue Depth Over Time:** Historical queue size

**Files:**
- Page: `web/app/(app)/app/executive/page.tsx`
- API: `api/app/routes/reports.py` (get_executive_stats)

---

## 4. API Response Gaps

| Endpoint | Gap Description |
|----------|-----------------|
| `GET /submission-requests/{id}` | Missing linked report status, audit trail |
| `GET /submission-requests/my-requests` | Missing party status summary |
| `GET /reports/queue/with-parties` | Good coverage - no major gaps |
| `GET /admin/reports/{id}` | Missing full party data, document list |
| `GET /invoices` | Not used by frontend - client uses reports instead |
| `GET /documents/party/{id}` | Works but no admin visibility UI |
| `GET /audit-log` | No endpoint to fetch all audit logs |

---

## 5. Recommended Fixes (Priority Order)

### 🔴 Critical (Blocks Demo/Compliance)

1. **Add audit logging to all routes**
   - Files: All route files in `api/app/routes/`
   - Actions: Create helper function, add to all write operations
   - Effort: Medium
   - Value: High (compliance requirement)

2. **Add party status visibility to client dashboard**
   - Files: `web/app/(app)/app/requests/page.tsx`, API
   - Show: "2/3 parties submitted" for each request
   - Effort: Low
   - Value: High (client experience)

### 🟠 High (Improves Usability)

3. **Create admin invoice management page**
   - Files: New `web/app/(app)/app/admin/invoices/page.tsx`
   - API already exists at `/invoices`
   - Effort: Medium
   - Value: High (billing operations)

4. **Add document review page for admin/staff**
   - Files: New admin page, update API
   - Show all documents with verification status
   - Effort: Medium
   - Value: High (staff workflow)

5. **Track party link opens**
   - Files: `api/app/routes/parties.py`, `api/app/models/party_link.py`
   - Add `opened_at` field, update on GET /party/data
   - Effort: Low
   - Value: Medium

### 🟡 Medium (Nice to Have)

6. **Add company-level report breakdown to executive dashboard**
   - Files: `api/app/routes/reports.py`, `web/app/(app)/app/executive/page.tsx`
   - Show top clients, revenue per company
   - Effort: Medium
   - Value: Medium

7. **Calculate real compliance rate and processing time**
   - Files: `api/app/routes/reports.py`
   - Replace mock values with real calculations
   - Effort: Low
   - Value: Medium

8. **Add document download tracking**
   - Files: `api/app/routes/documents.py`, new AuditLog entries
   - Log who downloaded what document
   - Effort: Low
   - Value: Medium

### 🟢 Low (Future Enhancements)

9. **Add audit log search/filter API**
   - New endpoint with filters by action, actor, date range
   - Effort: Medium
   - Value: Low (internal tool)

10. **Add real-time queue depth tracking**
    - Store historical snapshots
    - Show trends on executive dashboard
    - Effort: High
    - Value: Low

---

## 6. Files That Need Changes

### Backend (API)

| File | Changes Needed |
|------|----------------|
| `api/app/routes/submission_requests.py` | Add audit logging for create, status_change, create_report |
| `api/app/routes/documents.py` | Add audit logging for upload, download, delete |
| `api/app/routes/invoices.py` | Add audit logging for generate, send, pay, void |
| `api/app/routes/companies.py` | Add audit logging for CRUD |
| `api/app/routes/users.py` | Add audit logging for CRUD, role changes |
| `api/app/routes/reports.py` | Add audit logging for status changes, filing |
| `api/app/routes/parties.py` | Add link opened tracking |
| `api/app/models/party_link.py` | Add `opened_at` field |
| New: `api/app/services/audit.py` | Create reusable audit helper |

### Frontend (Web)

| File | Changes Needed |
|------|----------------|
| `web/app/(app)/app/requests/page.tsx` | Add party status column |
| `web/app/(app)/app/dashboard/page.tsx` | Add party status to recent requests |
| `web/app/(app)/app/invoices/page.tsx` | Wire to real invoices API |
| New: `web/app/(app)/app/admin/invoices/page.tsx` | Create invoice management page |
| New: `web/app/(app)/app/admin/documents/page.tsx` | Create document review page |
| `web/app/(app)/app/executive/page.tsx` | Add company breakdown, real metrics |

---

## Appendix: Model Summary

### Models with Good Coverage
- ✅ Report
- ✅ ReportParty
- ✅ PartyLink
- ✅ FilingSubmission
- ✅ NotificationEvent
- ✅ SubmissionRequest (with early determination)

### Models with Gaps
- ⚠️ AuditLog (exists but underutilized)
- ⚠️ Document (exists but no admin visibility)
- ⚠️ Invoice (API exists but frontend disconnected)
- ⚠️ BillingEvent (created but not surfaced)

### Models that Don't Exist (May Need)
- ❌ AuditLogSearch (for filtering/pagination)
- ❌ QueueSnapshot (for historical trends)
- ❌ UserSession (for login tracking)
