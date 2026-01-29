# 📘 FinClear Solutions Master Plan

> **Last Updated:** January 28, 2026  
> **Brand:** FinClear Solutions (formerly PCT FinCEN Solutions)  
> **Domain:** fincenclear.com

## Purpose
Authoritative north star describing **what we are building, why, and in what order**. This document changes slowly.

## Product Objective
FinClear Solutions is a full‑service FinCEN RRER compliance platform that:
- Determines reportability via smart wizard
- Collects required data from all parties via secure portal
- Submits RRER filings via SDTM (BSA E‑Filing) - *staging: mock*
- Tracks acceptance, rejection, and acknowledgements
- Invoices clients per successful filing

## Non‑Negotiable Principles
- Wizard + Party Portal are the core product
- No external dependency may block a closing
- All actions are auditable
- All integrations are adapter‑based and replaceable
- Demo ≠ Production, but they share seams

## System Architecture (High Level)
**Core - IMPLEMENTED ✅**
- Wizard Engine (determine + collect)
- Party Portal (token‑based)
- Filing Engine (adapter‑based, mock in staging)
- Notification Engine (outbox → SendGrid)
- Admin Ops Console
- Billing / Invoicing Engine

**External**
- Auth: Cookie-based demo auth (Clerk: future)
- Email: SendGrid
- FinCEN BSA E‑Filing: SDTM via SFTP (future)
- Internal accounting: Invoice system implemented

## Filing Strategy (Production - Future)
- SDTM SFTP batch XML
- **One report per XML file (Day 1)**
- Async lifecycle: transmitted → messages received (accepted/rejected) → acknowledgement received (BSA IDs)

## Accounting Model
- FinClear Solutions invoices client companies
- Bill on RRER acceptance ($75 per filing)
- Invoice generation with line items
- Stripe later (external clients)

## Phased Delivery Status
- ✅ Phase 5: Demo Hardening - COMPLETE
- ✅ Phase 6: Auth + Company Scoping - COMPLETE (demo auth + companies table)
- ✅ Phase 7: SendGrid Notifications - COMPLETE
- 🔲 Phase 8: SDTM Filing Adapter - PENDING (mock filing works)
- ✅ Phase 9: Billing + Invoicing - COMPLETE
- 🔲 Phase 10: Security & Compliance Hardening - PENDING

---

# ✅ FinClear Solutions Accomplished Log

## Purpose
Immutable ledger of what is **already real, tested, and decided**. This document only grows.

## Status as of January 28, 2026

### Backend (API) - FULLY IMPLEMENTED ✅
- FastAPI on Render (https://pct-fin-cen-staging.onrender.com)
- PostgreSQL database
- 13 data models: Company, User, SubmissionRequest, Report, ReportParty, PartyLink, BillingEvent, Invoice, AuditLog, NotificationEvent, FilingSubmission, Document
- 10 route files: submission_requests, reports, parties, companies, users, invoices, sidebar, demo, admin
- Demo environment support (`ENVIRONMENT=staging`)
- Secure demo endpoints with `X-DEMO-SECRET`
- Demo seed service with 6 scenarios
- JSONB compatibility layer (Postgres + SQLite)
- CORS configured for fincenclear.com

### Frontend (Web) - FULLY IMPLEMENTED ✅
- Next.js 14 on Vercel (https://fincenclear.com)
- Tailwind CSS + shadcn/ui components
- Role-based navigation with dynamic badges
- Demo authentication via cookies

### Core Workflows - COMPLETE ✅
1. **Client Submission Flow**
   - New Request form (full validation)
   - Dashboard with stats
   - Request tracking with rich status

2. **Staff Wizard Flow**
   - Determination phase (23 entity + 4 trust exemptions)
   - Pre-filled data from submissions
   - Party setup with pre-populated info
   - Link generation and sending
   - Party progress monitoring
   - Ready check and filing

3. **Party Portal**
   - Secure token access
   - Dynamic forms by party type
   - Individual, Entity, Trust forms
   - Beneficial owner collection
   - Payment source tracking
   - Buyer Trust form with trustees/settlors/beneficiaries

4. **Admin Features**
   - Company management (CRUD)
   - User management (CRUD, invite)
   - Request oversight
   - Report management

5. **Billing**
   - Auto BillingEvent on filing ($75)
   - Invoice generation
   - Invoice detail with line items

### Status Tracking - COMPLETE ✅
- SubmissionRequest: pending → in_progress → completed
- Report: draft → determination_complete → collecting → ready_to_file → filed
- ReportParty: pending → link_sent → opened → submitted
- Status sync between models (filing completes both)

### UI/UX Features - COMPLETE ✅
- My Queue with tabs (Needs Setup / Collecting / Ready)
- Dynamic sidebar badges (color-coded by urgency)
- Inline action buttons (Start Wizard, Continue)
- Urgency indicators (≤5 days amber, overdue red)
- Session utilities for cookie parsing
- FinClear branding throughout

### Architecture Decisions (Locked)
- Adapter‑based filing model
- Outbox‑first notification design
- Party portal: public, token‑based
- Cookie-based demo auth (Clerk integration: future)

---

# 🔜 FinClear Solutions Next Steps

## Purpose
Execution playbook: **what we do next, in what order, and why**.

## Completed ✅
All major demo requirements are implemented:
- [x] End-to-end flow works
- [x] All 5 user roles functional
- [x] Billing system complete
- [x] Party portal with all form types
- [x] Status tracking accurate
- [x] Dynamic badges implemented

## Remaining (P3 - Polish)
- [ ] Form validation enhancements
- [ ] `refreshCounts()` after key actions
- [ ] Human-readable confirmation numbers

## Short Term (Post-Demo)
### 1. Production Authentication
- Replace demo auth with Clerk
- Implement real user sessions
- SSO support

### 2. SDTM Filing Adapter
- SFTP transmit job to FinCEN
- Poll `/acks` folder
- Parse MESSAGES.XML
- Store real BSA IDs
- Handle rejections

### 3. Enhanced Notifications
- Real-time in-app notifications
- Reminder automation
- SMS support

## Medium Term
### 4. Compliance Hardening
- Field‑level encryption (SSN, EIN)
- Signed document uploads
- Retention enforcement
- Rate limiting
- Immutable audit trail export

### 5. External Clients
- Stripe billing integration
- Multi-org RBAC
- White-labeling options

## Explicitly Not Yet
- BOI standalone filing
- Mobile app
- AI-powered determination suggestions

---

## 📊 Key Metrics (Current)

| Metric | Count |
|--------|-------|
| API Endpoints | 50+ |
| Data Models | 13 |
| User Roles | 5 |
| Demo Scenarios | 6 |
| Sharks Killed 🦈 | 33 |

---

*For detailed API reference and data models, see `/docs/NORTH_STAR.md`*
