# Notification System Documentation

Complete trace of every notification event in the FinClear platform — who gets notified, when, how, and what the email/notification contains.

---

## Part 1: Email Templates Inventory (8 Total)

### 1. `send_party_invite()` — Party Portal Invitation

| Property | Value |
|----------|-------|
| **Location** | `api/app/services/email_service.py:414` |
| **Trigger** | Staff clicks "Send Party Links" in wizard |
| **Recipient** | Party (buyer/seller/etc.) |
| **Subject** | `Action Required: Information Needed for Real Estate Transaction` |
| **Key Content** | Party name, role, property address, portal link (expires 14 days), company name |
| **HTML Template** | `get_party_invite_html()` at line 98 |

**Sample Content:**
```
Dear [Party Name],

You are receiving this email because you are listed as the [Role] in a real 
estate transaction on behalf of [Company Name].

Property: [Property Address]

→ Complete your information: [Portal Link]

Your information is due within 14 days and typically takes 5-10 minutes.
```

---

### 2. `send_party_confirmation()` — Party Submission Confirmation

| Property | Value |
|----------|-------|
| **Location** | `api/app/services/email_service.py:694` |
| **Trigger** | Party clicks "Submit" on portal |
| **Recipient** | Party (the person who submitted) |
| **Subject** | `Confirmed: Your Information Has Been Received` |
| **Key Content** | Party name, property address, confirmation ID |
| **HTML Template** | `get_confirmation_html()` at line 275 |

**Sample Content:**
```
Your information has been successfully received.

Property: [Property Address]
Confirmation ID: PCT-2026-XXXXX

Please save this confirmation ID for your records.
No further action is required from you at this time.
```

---

### 3. `send_party_submitted_notification()` — Staff Alert on Party Submission

| Property | Value |
|----------|-------|
| **Location** | `api/app/services/email_service.py:729` |
| **Trigger** | Party submits portal form |
| **Recipient** | Staff email (configurable) |
| **Subject** | `Party Submitted: [Name] ([Role])` or `✅ All Parties Complete — Ready for Review: [Address]` |
| **Key Content** | Party name, role, property address, report link, all_complete flag |

**Sample Content (Individual):**
```
Party Submitted

John Smith (Buyer) has submitted their information for:
123 Main Street, Anytown CA

→ View Report
```

**Sample Content (All Complete):**
```
✅ All Parties Complete

John Smith (Buyer) has submitted their information for:
123 Main Street, Anytown CA

🎉 All parties have now submitted. This report is ready for review and filing.

→ View Report
```

---

### 4. `send_invoice_email()` — Invoice Notification

| Property | Value |
|----------|-------|
| **Location** | `api/app/services/email_service.py:643` |
| **Trigger** | Admin clicks "Send Invoice" in billing admin |
| **Recipient** | Company billing contact email |
| **Subject** | `Invoice [INV-NUMBER] - $[AMOUNT] Due [DATE]` |
| **Key Content** | Company name, invoice number, total amount, due date, billing period, view link |
| **HTML Template** | `get_invoice_email_html()` at line 456 |

**Sample Content:**
```
Invoice Ready — INV-2026-02-0001

Dear Demo Title Company,

Your invoice for FinCEN filing services is now available.

Invoice Number: INV-2026-02-0001
Billing Period: Feb 1, 2026 - Feb 28, 2026
Due Date: Mar 15, 2026
Amount Due: $1,250.00

→ View Invoice

Payment Options: ACH Transfer • Wire Transfer • Check
```

---

### 5. `send_inquiry_notification()` — New Lead Notification (to Team)

| Property | Value |
|----------|-------|
| **Location** | `api/app/routes/inquiries.py:139` |
| **Trigger** | Prospect submits inquiry form on website |
| **Recipient** | `clear@fincenclear.com` (fixed) |
| **Subject** | `New FinClear Inquiry: [Company Name]` |
| **Key Content** | Name, email, company, phone, monthly volume estimate, message |

**Sample Content:**
```
🔔 New Client Inquiry

Name: Jane Doe
Email: jane@acmetitle.com
Company: Acme Title Co
Phone: (555) 123-4567
Est. Monthly Volume: 50-100 transactions

Message:
"We're evaluating compliance solutions for the FinCEN deadline..."

→ Reply to Jane
```

---

### 6. `send_inquiry_confirmation()` — Lead Auto-Response

| Property | Value |
|----------|-------|
| **Location** | `api/app/routes/inquiries.py:161` |
| **Trigger** | Prospect submits inquiry form (auto-sent) |
| **Recipient** | Prospect's email |
| **Subject** | `We received your inquiry — FinClear` |
| **Key Content** | First name, thank you message, contact info |

**Sample Content:**
```
Hi Jane,

Thank you for your interest in FinClear. We've received your inquiry 
and a member of our team will be in touch within one business day.

In the meantime, if you have any questions, don't hesitate to reply 
to this email or reach us at clear@fincenclear.com.

PCT FinCEN Solutions — A subsidiary of Pacific Coast Title Company
www.fincenclear.com
```

---

### 7. `log_notification()` — Filing Receipt (Logged, Not Emailed)

| Property | Value |
|----------|-------|
| **Location** | `api/app/services/filing_lifecycle.py:178` |
| **Trigger** | Filing accepted by FinCEN (mock or SDTM) |
| **Type** | `filing_receipt` |
| **Subject** | `FinCEN Filing Accepted - [Property Address]` |
| **Key Content** | Receipt ID, filed_at timestamp, status |

> **Note:** This creates a NotificationEvent record but does NOT send an email currently. The email delivery is not implemented yet for filing receipts.

---

### 8. `log_notification()` — Filing Rejection Alert (Logged, Not Emailed)

| Property | Value |
|----------|-------|
| **Location** | `api/app/services/filing_lifecycle.py:234` |
| **Trigger** | Filing rejected by FinCEN |
| **Type** | `internal_alert` |
| **Subject** | `FinCEN Filing Rejected - [Property Address]` |
| **Key Content** | Rejection code, rejection message, status |

> **Note:** Creates a NotificationEvent record for audit purposes. No email delivery implemented yet.

---

## Part 2: Notification Events Matrix

| Event | Email Sent? | Recipient | Function | Trigger Location |
|-------|-------------|-----------|----------|------------------|
| **Client submits new request** | ❌ No | — | — | `api/app/routes/submission_requests.py` |
| **Request marked exempt** | ❌ No | — | — | `api/app/routes/submission_requests.py` |
| **Request marked reportable** | ❌ No | — | — | `api/app/routes/submission_requests.py` |
| **Report created from request** | ❌ No | — | — | Manual in UI |
| **Party link generated** | ✅ Yes | Party | `send_party_invite_notification()` | `api/app/routes/reports.py:700` |
| **Party link generated (no email)** | 📝 Logged | — | `log_notification()` | `api/app/routes/reports.py:715` |
| **Party opens portal** | ❌ No | — | — | Opens via public link |
| **Party saves progress** | ❌ No | — | — | `api/app/routes/parties.py` |
| **Party submits form** | ✅ Yes | Party | `send_party_confirmation_notification()` | `api/app/routes/parties.py:234` |
| **Party submits (no email)** | 📝 Logged | — | `log_notification()` | `api/app/routes/parties.py:245` |
| **All parties complete** | ⚠️ Partial | Staff | `send_party_submitted_notification()` | Not currently called |
| **Report ready to file** | ❌ No | — | — | Status change only |
| **Filing submitted to FinCEN** | ❌ No | — | — | `api/app/services/filing_lifecycle.py` |
| **Filing accepted (BSA ID)** | 📝 Logged | — | `log_notification()` | `api/app/services/filing_lifecycle.py:178` |
| **Filing rejected** | 📝 Logged | — | `log_notification()` | `api/app/services/filing_lifecycle.py:234` |
| **Filing needs review** | ❌ No | — | — | Status change only |
| **Invoice generated** | ❌ No | — | — | Auto-generated monthly |
| **Invoice sent** | ✅ Yes | Company | `send_invoice_email()` | `api/app/routes/billing.py:883` |
| **Inquiry received** | ✅ Yes | Team | `send_inquiry_notification()` | `api/app/routes/inquiries.py:204` |
| **Inquiry auto-reply** | ✅ Yes | Prospect | `send_inquiry_confirmation()` | `api/app/routes/inquiries.py:208` |

**Legend:**
- ✅ Yes = Email sent via SendGrid
- 📝 Logged = NotificationEvent created but no email sent
- ❌ No = No notification at all
- ⚠️ Partial = Code exists but not wired up

---

## Part 3: Recipient Matrix by Role

| Event | COO | Admin | Staff | Client Admin | Client User | Party |
|-------|:---:|:-----:|:-----:|:------------:|:-----------:|:-----:|
| New request submitted | — | — | — | — | — | — |
| Request marked exempt | — | — | — | — | — | — |
| Party link sent | — | — | — | — | — | ✅ |
| Party submits | — | — | ⚠️¹ | — | — | ✅ |
| All parties complete | — | — | ⚠️¹ | — | — | — |
| Filing accepted | — | — | — | — | — | — |
| Filing rejected | — | — | — | — | — | — |
| Invoice ready | — | — | — | ✅ | — | — |
| Inquiry received | — | ✅² | — | — | — | — |

**Notes:**
1. ⚠️¹ Staff notification for party submission exists (`send_party_submitted_notification`) but is NOT currently wired into the submission flow
2. ✅² Inquiry notifications go to `clear@fincenclear.com`, not individual admins

---

## Part 4: In-App Notifications

### Does a NotificationEvent model exist?
**Yes.** Located at `api/app/models/notification_event.py`

```python
class NotificationEvent(Base):
    __tablename__ = "notification_events"
    
    id = Column(UUID)
    created_at = Column(DateTime)
    report_id = Column(UUID, nullable=True)
    party_id = Column(UUID, nullable=True)
    party_token = Column(String, nullable=True)
    type = Column(String)  # party_invite, party_submitted, internal_alert, filing_receipt
    to_email = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    body_preview = Column(Text, nullable=True)
    meta = Column(JSONB)
    delivery_status = Column(String)  # pending, sent, failed, disabled
    provider_message_id = Column(String, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
```

### Is there a notifications inbox/panel in the UI?
**Yes.** Admin can view the notification outbox at:
- Path: `/app/admin/notifications`
- Component: `web/app/(app)/app/admin/notifications/page.tsx`
- Access: Requires `DEMO_SECRET` to view

**Features:**
- View all logged notifications
- Filter by type (party_invite, party_submitted, internal_alert, filing_receipt)
- See delivery status (sent, failed, disabled, pending)
- Expand rows to see full metadata

### Are notifications real-time (websocket) or polling?
**Neither.** 
- No WebSocket implementation found
- No polling mechanism for real-time updates
- Notifications are fetched on-demand when admin visits the page
- Users do NOT receive real-time alerts (no bell icon, no toast notifications for events)

### Notification Types Configured in UI:

| Type | Label | Color | Icon |
|------|-------|-------|------|
| `party_invite` | Party Invite | Blue | Send |
| `party_submitted` | Party Submitted | Green | FileCheck |
| `internal_alert` | Internal Alert | Amber | Bell |
| `filing_receipt` | Filing Receipt | Purple | FileText |

---

## Part 5: Audit Trail

### What events create audit log entries?

**AuditLog Model:** `api/app/models/audit_log.py`

The audit service (`api/app/services/audit.py`) defines these standard event types:

#### Submission Request Events
| Event | Constant |
|-------|----------|
| Submission created | `EVENT_SUBMISSION_CREATED` |
| Submission updated | `EVENT_SUBMISSION_UPDATED` |
| Submission status changed | `EVENT_SUBMISSION_STATUS_CHANGED` |
| Determination completed | `EVENT_SUBMISSION_DETERMINED` |
| Certified exempt | `EVENT_SUBMISSION_CERTIFIED_EXEMPT` |

#### Report Events
| Event | Constant |
|-------|----------|
| Report created | `EVENT_REPORT_CREATED` |
| Report updated | `EVENT_REPORT_UPDATED` |
| Report status changed | `EVENT_REPORT_STATUS_CHANGED` |
| Wizard step completed | `EVENT_WIZARD_STEP_COMPLETED` |
| Wizard completed | `EVENT_WIZARD_COMPLETED` |
| Determination complete | `EVENT_DETERMINATION_COMPLETE` |
| Ready check passed | `EVENT_READY_CHECK_PASSED` |
| Ready check failed | `EVENT_READY_CHECK_FAILED` |

#### Party Events
| Event | Constant |
|-------|----------|
| Party created | `EVENT_PARTY_CREATED` |
| Party data saved | `EVENT_PARTY_DATA_SAVED` |
| Party submitted | `EVENT_PARTY_SUBMITTED` |
| Party validation failed | `EVENT_PARTY_VALIDATION_FAILED` |

#### Party Link Events
| Event | Constant |
|-------|----------|
| Party link created | `EVENT_PARTY_LINK_CREATED` |
| Party link sent | `EVENT_PARTY_LINK_SENT` |
| Party link opened | `EVENT_PARTY_LINK_OPENED` |
| Party link expired | `EVENT_PARTY_LINK_EXPIRED` |
| Party link regenerated | `EVENT_PARTY_LINK_REGENERATED` |

#### Document Events
| Event | Constant |
|-------|----------|
| Document upload started | `EVENT_DOCUMENT_UPLOAD_STARTED` |
| Document uploaded | `EVENT_DOCUMENT_UPLOADED` |
| Document verified | `EVENT_DOCUMENT_VERIFIED` |
| Document rejected | `EVENT_DOCUMENT_REJECTED` |
| Document downloaded | `EVENT_DOCUMENT_DOWNLOADED` |
| Document deleted | `EVENT_DOCUMENT_DELETED` |

#### Filing Events
| Event | Constant |
|-------|----------|
| Filing queued | `EVENT_FILING_QUEUED` |
| Filing submitted | `EVENT_FILING_SUBMITTED` |
| Filing accepted | `EVENT_FILING_ACCEPTED` |
| Filing rejected | `EVENT_FILING_REJECTED` |
| Filing needs review | `EVENT_FILING_NEEDS_REVIEW` |
| Filing retry | `EVENT_FILING_RETRY` |
| BSA ID received | `EVENT_BSA_ID_RECEIVED` |

#### Invoice Events
| Event | Constant |
|-------|----------|
| Invoice created | `EVENT_INVOICE_CREATED` |
| Invoice generated | `EVENT_INVOICE_GENERATED` |
| Invoice sent | `EVENT_INVOICE_SENT` |
| Invoice paid | `EVENT_INVOICE_PAID` |
| Invoice voided | `EVENT_INVOICE_VOIDED` |

#### Company & User Events
| Event | Constant |
|-------|----------|
| Company created | `EVENT_COMPANY_CREATED` |
| Company updated | `EVENT_COMPANY_UPDATED` |
| Company status changed | `EVENT_COMPANY_STATUS_CHANGED` |
| User created | `EVENT_USER_CREATED` |
| User updated | `EVENT_USER_UPDATED` |
| User role changed | `EVENT_USER_ROLE_CHANGED` |
| User deactivated | `EVENT_USER_DEACTIVATED` |
| User reactivated | `EVENT_USER_REACTIVATED` |
| User invited | `EVENT_USER_INVITED` |

### Is the audit log exposed in the UI?

**Yes.** Via API endpoints:

| Endpoint | Description | Access |
|----------|-------------|--------|
| `GET /audit` | List audit logs with filtering | Admin |
| `GET /audit/entity/{type}/{id}` | Get audit trail for specific entity | Admin |
| `GET /audit/report/{report_id}` | Get all audit events for a report | Admin |
| `GET /audit/stats` | Aggregate statistics for dashboard | Admin |

**Filtering Options:**
- `entity_type`: Filter by entity type
- `entity_id`: Filter by specific entity
- `event_type`: Filter by action type
- `actor_type`: Filter by who performed action (system, staff, party, api)
- `actor_id`: Filter by specific user
- `report_id`: Filter by report
- `start_date` / `end_date`: Date range filtering

### Audit Log Schema

```python
class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(UUID)
    report_id = Column(UUID, nullable=True)  # Optional report association
    
    # Actor information
    actor_type = Column(String)  # system, staff, party, api
    actor_user_id = Column(UUID, nullable=True)
    
    # Action details
    action = Column(String)  # e.g., "report.created", "party.submitted"
    details = Column(JSONB)  # Additional action details
    
    # Request context
    ip_address = Column(String, nullable=True)
    
    created_at = Column(DateTime)
```

**Compliance Note:** Required for FinCEN compliance — must retain for 5 years.

---

## Notification Flow Diagrams

### Flow 1: New Request → Exempt

```
┌─────────────────────┐
│ Client Submits      │
│ Request             │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Early Determination │
│ Runs                │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Result: EXEMPT      │
│ Certificate ID      │
│ Generated           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ ❌ No Email Sent    │
│ (Gap: Client should │
│  get confirmation)  │
└─────────────────────┘
```

### Flow 2: New Request → Reportable → Filed

```
┌─────────────────────┐
│ Client Submits      │
│ Request             │
└─────────┬───────────┘
          │ ❌ No notification
          ▼
┌─────────────────────┐
│ Staff Creates       │
│ Report              │
└─────────┬───────────┘
          │ ❌ No notification
          ▼
┌─────────────────────┐
│ Staff Completes     │
│ Wizard Phase 1      │
└─────────┬───────────┘
          │ ❌ No notification
          ▼
┌─────────────────────┐
│ Staff Sends Party   │
│ Links               │
└─────────┬───────────┘
          │ ✅ send_party_invite()
          │ → To each party
          ▼
┌─────────────────────┐
│ Party Submits       │
│ Portal Form         │
└─────────┬───────────┘
          │ ✅ send_party_confirmation()
          │ → To party
          │ 
          │ ⚠️ Staff notification
          │   function exists but
          │   NOT currently called
          ▼
┌─────────────────────┐
│ All Parties         │
│ Complete            │
└─────────┬───────────┘
          │ ❌ No notification
          │ (Report auto-transitions
          │  to ready_to_file)
          ▼
┌─────────────────────┐
│ Staff Files to      │
│ FinCEN              │
└─────────┬───────────┘
          │ 📝 NotificationEvent logged
          │ ❌ No email sent
          ▼
┌─────────────────────┐
│ Filing Accepted     │
│ BSA ID Received     │
└─────────┬───────────┘
          │ 📝 NotificationEvent logged
          │ ❌ No email sent
          │ (Gap: Client should
          │  get notification)
          ▼
┌─────────────────────┐
│ COMPLETE            │
└─────────────────────┘
```

### Flow 3: Invoice Billing

```
┌─────────────────────┐
│ Month End           │
│ Invoice Generated   │
└─────────┬───────────┘
          │ ❌ No auto-notification
          ▼
┌─────────────────────┐
│ Admin Reviews       │
│ Invoice             │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Admin Clicks        │
│ "Send Invoice"      │
└─────────┬───────────┘
          │ ✅ send_invoice_email()
          │ → To company billing
          │   contact
          ▼
┌─────────────────────┐
│ SENT                │
└─────────────────────┘
```

---

## Gaps Identified

### Critical Gaps (Should Implement)

- [ ] **No notification when client submits a request** — Client gets no confirmation that their submission was received
- [ ] **No notification when request is determined exempt** — Client should receive exemption certificate via email
- [ ] **Staff not notified when party submits** — Function exists (`send_party_submitted_notification`) but is not wired up in the submission flow
- [ ] **No notification when filing is accepted** — Client should receive confirmation with BSA ID
- [ ] **No notification when filing is rejected** — Staff/Admin should be immediately alerted
- [ ] **No notification when all parties complete** — Staff should be alerted that report is ready

### Non-Critical Gaps (Nice to Have)

- [ ] **No real-time notifications** — No WebSocket or polling for live updates
- [ ] **No in-app notification bell** — Users must check email or visit admin panel
- [ ] **Invoice generated doesn't auto-send** — Requires manual "Send Invoice" click
- [ ] **Party link resend doesn't notify** — When staff regenerates a link, no email sent

### Already Implemented ✅

- [x] Party portal invitation emails
- [x] Party submission confirmation emails
- [x] Invoice emails (manual trigger)
- [x] Website inquiry notifications
- [x] Website inquiry auto-reply
- [x] NotificationEvent audit trail
- [x] AuditLog for compliance
- [x] Admin notification outbox viewer

---

## Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SENDGRID_API_KEY` | SendGrid API key | Required for email delivery |
| `SENDGRID_FROM_EMAIL` | From address | `clear@fincenclear.com` |
| `SENDGRID_FROM_NAME` | From display name | `FinClear` |
| `SENDGRID_ENABLED` | Enable/disable email sending | `false` |
| `FRONTEND_URL` | Base URL for links in emails | `https://fincenclear.com` |

### Brand Constants (email_service.py)

```python
BRAND_NAME = "FinClear"
BRAND_TAGLINE = "FinCEN Compliance Made Simple"
BRAND_SUPPORT_EMAIL = "support@fincenclear.com"
```

---

## Appendix: File Locations

| Function | File | Line |
|----------|------|------|
| `send_email()` | `api/app/services/email_service.py` | 44 |
| `send_party_invite()` | `api/app/services/email_service.py` | 414 |
| `send_party_confirmation()` | `api/app/services/email_service.py` | 694 |
| `send_party_submitted_notification()` | `api/app/services/email_service.py` | 729 |
| `send_invoice_email()` | `api/app/services/email_service.py` | 643 |
| `send_inquiry_notification()` | `api/app/routes/inquiries.py` | 139 |
| `send_inquiry_confirmation()` | `api/app/routes/inquiries.py` | 161 |
| `log_notification()` | `api/app/services/notifications.py` | 26 |
| `send_party_invite_notification()` | `api/app/services/notifications.py` | 100 |
| `send_party_confirmation_notification()` | `api/app/services/notifications.py` | 153 |
| `log_event()` | `api/app/services/audit.py` | 122 |
| `log_change()` | `api/app/services/audit.py` | 172 |
| **NotificationEvent Model** | `api/app/models/notification_event.py` | 16 |
| **AuditLog Model** | `api/app/models/audit_log.py` | 13 |

---

*Document generated: February 2026*
*Version: 1.0*
