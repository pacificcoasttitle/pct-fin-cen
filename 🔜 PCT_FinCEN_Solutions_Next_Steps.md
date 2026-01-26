🔜 PCT_FinCEN_Solutions_Next_Steps.md
Purpose

Execution playbook: what we do next, in what order, and why. This document changes frequently.

Immediate (Post‑Demo, Week 1)
1. Production Authentication

Replace demo auth with Clerk

Introduce companies table

Assign all users to Pacific Coast Title

Implement admin/manager/user roles

2. Notification Engine → SendGrid

Keep Outbox as source of truth

Add SendGrid worker

Delivery status + retries

Admin resend capability

Short Term (Weeks 2–4)
3. SDTM Filing Adapter

SFTP transmit job

Poll /acks

Parse MESSAGES.XML

Store acceptance/rejection detail

Expose in Admin Ops

4. Billing & Invoicing

Create billable_events on acceptance

Monthly invoice PDF generation

Admin billing view

Export for accounting

Medium Term (Weeks 5–8)
5. Compliance Hardening

Field‑level encryption

Signed uploads

Retention enforcement

Rate limiting

Immutable audit trail

Explicitly Not Yet

External clients

Stripe billing

Multi‑org RBAC complexity

White‑labeling

BOI standalone filing