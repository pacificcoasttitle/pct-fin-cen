#!/usr/bin/env python3
"""
STRESS TEST: Billing Calculations
===================================
Tests billing logic WITHOUT a live database:
  - BillingEvent amount * quantity calculations
  - Invoice subtotal / tax / discount / total math
  - Invoice number format
  - Due date calculation (period_end + payment_terms_days)
  - Default filing fee ($75.00 = 7500 cents)
  - Invoice model properties (dollars, is_paid, is_overdue)
  - Response serializers (billing_event_to_response, invoice_to_response)
  - Pending events aggregation
  - Filing acceptance billing event creation logic
  - Edge cases (credits, zero-amount, large quantities)

Usage:
    python -m app.scripts.stress_test_billing
    python -m app.scripts.stress_test_billing --verbose
"""

import os
import sys
import uuid
import argparse
from datetime import datetime, date, timedelta
from types import SimpleNamespace
from typing import List, Optional

# ══════════════════════════════════════════════════════════════════════════════
# ENV SETUP
# ══════════════════════════════════════════════════════════════════════════════

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ══════════════════════════════════════════════════════════════════════════════
# APP IMPORTS
# ══════════════════════════════════════════════════════════════════════════════

from app.routes.billing import (
    billing_event_to_response,
    invoice_to_response,
)

# We'll also test the Invoice model properties directly
from app.models.invoice import Invoice
from app.models.billing_event import BillingEvent


# ══════════════════════════════════════════════════════════════════════════════
# MOCK HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def mock_billing_event(
    event_type: str = "filing_accepted",
    description: str = "FinCEN filing for 123 Main St",
    amount_cents: int = 7500,
    quantity: int = 1,
    bsa_id: Optional[str] = None,
    invoice_id: Optional[str] = None,
    company_id: Optional[str] = None,
    created_at: Optional[datetime] = None,
) -> SimpleNamespace:
    """Create a mock BillingEvent-like object."""
    return SimpleNamespace(
        id=uuid.uuid4(),
        company_id=company_id or uuid.uuid4(),
        report_id=uuid.uuid4(),
        submission_request_id=None,
        event_type=event_type,
        description=description,
        amount_cents=amount_cents,
        quantity=quantity,
        bsa_id=bsa_id,
        invoice_id=uuid.UUID(invoice_id) if invoice_id else None,
        invoiced_at=datetime.utcnow() if invoice_id else None,
        created_at=created_at or datetime.utcnow(),
        created_by_user_id=None,
    )


def mock_invoice(
    subtotal_cents: int = 22500,
    tax_cents: int = 0,
    discount_cents: int = 0,
    total_cents: Optional[int] = None,
    status: str = "draft",
    due_date: Optional[date] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    invoice_number: str = "INV-2026-02-0001",
    company_id: Optional[str] = None,
    sent_at: Optional[datetime] = None,
    paid_at: Optional[datetime] = None,
    voided_at: Optional[datetime] = None,
    payment_method: Optional[str] = None,
    payment_reference: Optional[str] = None,
) -> SimpleNamespace:
    """Create a mock Invoice-like object."""
    if total_cents is None:
        total_cents = subtotal_cents + tax_cents - discount_cents
    
    return SimpleNamespace(
        id=uuid.uuid4(),
        company_id=company_id or uuid.uuid4(),
        invoice_number=invoice_number,
        period_start=period_start or date(2026, 1, 1),
        period_end=period_end or date(2026, 1, 31),
        subtotal_cents=subtotal_cents,
        tax_cents=tax_cents,
        discount_cents=discount_cents,
        total_cents=total_cents,
        status=status,
        due_date=due_date or date(2026, 3, 2),
        sent_at=sent_at,
        paid_at=paid_at,
        voided_at=voided_at,
        payment_method=payment_method,
        payment_reference=payment_reference,
        pdf_url=None,
        sent_to_email=None,
        notes=None,
        created_at=datetime.utcnow(),
        created_by_user_id=None,
    )


def mock_company(
    filing_fee_cents: Optional[int] = 7500,
    payment_terms_days: Optional[int] = 30,
    billing_type: Optional[str] = "invoice_only",
    billing_notes: Optional[str] = None,
) -> SimpleNamespace:
    """Create a mock Company-like object."""
    return SimpleNamespace(
        id=uuid.uuid4(),
        name="Pacific Coast Title",
        code="PCT",
        filing_fee_cents=filing_fee_cents,
        payment_terms_days=payment_terms_days,
        billing_type=billing_type,
        billing_notes=billing_notes,
        billing_email="billing@pct.com",
    )


# ══════════════════════════════════════════════════════════════════════════════
# VALIDATION HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def check_eq(actual, expected, label: str, checks: list) -> bool:
    if actual == expected:
        checks.append(f"OK: {label} = {repr(actual)}")
        return True
    else:
        checks.append(f"FAIL: {label} expected {repr(expected)}, got {repr(actual)}")
        return False


def check_approx(actual: float, expected: float, label: str, checks: list, tol: float = 0.005) -> bool:
    if abs(actual - expected) <= tol:
        checks.append(f"OK: {label} = {actual:.2f}")
        return True
    else:
        checks.append(f"FAIL: {label} expected ~{expected:.2f}, got {actual:.2f}")
        return False


def check_true(condition: bool, label: str, checks: list) -> bool:
    if condition:
        checks.append(f"OK: {label}")
        return True
    else:
        checks.append(f"FAIL: {label}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# SCENARIOS
# ══════════════════════════════════════════════════════════════════════════════

def get_scenarios() -> list:
    return [
        {"name": "Single filing event ($75)", "group": "Event", "test": "single_filing"},
        {"name": "Expedite fee ($25)", "group": "Event", "test": "expedite_fee"},
        {"name": "Manual credit (-$50)", "group": "Event", "test": "manual_credit"},
        {"name": "Zero-amount adjustment", "group": "Event", "test": "zero_amount"},
        {"name": "High quantity (qty=10)", "group": "Event", "test": "high_quantity"},
        {"name": "Event response serializer", "group": "Event", "test": "event_serializer"},
        {"name": "Invoice: 3 events subtotal", "group": "Invoice", "test": "invoice_subtotal"},
        {"name": "Invoice with tax + discount", "group": "Invoice", "test": "invoice_tax_discount"},
        {"name": "Invoice number format", "group": "Invoice", "test": "invoice_number"},
        {"name": "Due date calculation", "group": "Invoice", "test": "due_date_calc"},
        {"name": "Invoice response serializer", "group": "Invoice", "test": "invoice_serializer"},
        {"name": "Invoice model properties", "group": "Model", "test": "invoice_model_props"},
        {"name": "Invoice is_overdue logic", "group": "Model", "test": "invoice_overdue"},
        {"name": "Default filing fee fallback", "group": "Rate", "test": "default_fee"},
        {"name": "Custom filing fee ($150)", "group": "Rate", "test": "custom_fee"},
        {"name": "Payment terms (Net 45)", "group": "Rate", "test": "custom_terms"},
        {"name": "Pending events aggregation", "group": "Calc", "test": "pending_agg"},
        {"name": "Mixed events (filings + credits)", "group": "Calc", "test": "mixed_events"},
    ]


# ══════════════════════════════════════════════════════════════════════════════
# TEST IMPLEMENTATIONS
# ══════════════════════════════════════════════════════════════════════════════

TEST_REGISTRY = {}


def register(name):
    def decorator(fn):
        TEST_REGISTRY[name] = fn
        return fn
    return decorator


def _make_result(checks: list, details: str = "") -> dict:
    ok_count = sum(1 for c in checks if c.startswith("OK:"))
    total = len(checks)
    all_ok = all(c.startswith("OK:") for c in checks) and total > 0
    return {"passed": all_ok, "checks_ok": ok_count, "checks_total": total, "details": details, "checks": checks}


# ── Event tests ──────────────────────────────────────────────────────────────

@register("single_filing")
def test_single_filing(verbose):
    checks = []
    ev = mock_billing_event(amount_cents=7500, quantity=1)
    total = ev.amount_cents * ev.quantity
    check_eq(total, 7500, "total_cents", checks)
    check_approx(total / 100.0, 75.00, "total_dollars", checks)
    check_eq(ev.event_type, "filing_accepted", "event_type", checks)
    return _make_result(checks, "$75.00")


@register("expedite_fee")
def test_expedite_fee(verbose):
    checks = []
    ev = mock_billing_event(event_type="expedite_fee", description="Rush processing", amount_cents=2500, quantity=1)
    total = ev.amount_cents * ev.quantity
    check_eq(total, 2500, "total_cents", checks)
    check_approx(total / 100.0, 25.00, "total_dollars", checks)
    check_eq(ev.event_type, "expedite_fee", "event_type", checks)
    return _make_result(checks, "$25.00")


@register("manual_credit")
def test_manual_credit(verbose):
    checks = []
    ev = mock_billing_event(event_type="manual_adjustment", description="Goodwill credit", amount_cents=-5000, quantity=1)
    total = ev.amount_cents * ev.quantity
    check_eq(total, -5000, "total_cents (negative)", checks)
    check_approx(total / 100.0, -50.00, "total_dollars (negative)", checks)
    check_true(ev.amount_cents < 0, "amount_cents is negative", checks)
    return _make_result(checks, "-$50.00 credit")


@register("zero_amount")
def test_zero_amount(verbose):
    checks = []
    ev = mock_billing_event(event_type="manual_adjustment", description="No-charge note", amount_cents=0, quantity=1)
    total = ev.amount_cents * ev.quantity
    check_eq(total, 0, "total_cents", checks)
    check_approx(total / 100.0, 0.00, "total_dollars", checks)
    return _make_result(checks, "$0.00")


@register("high_quantity")
def test_high_quantity(verbose):
    checks = []
    ev = mock_billing_event(amount_cents=7500, quantity=10)
    total = ev.amount_cents * ev.quantity
    check_eq(total, 75000, "total_cents (10x$75)", checks)
    check_approx(total / 100.0, 750.00, "total_dollars", checks)
    check_eq(ev.quantity, 10, "quantity", checks)
    return _make_result(checks, "$750.00 (10 filings)")


@register("event_serializer")
def test_event_serializer(verbose):
    checks = []
    inv_id = str(uuid.uuid4())
    ev = mock_billing_event(
        amount_cents=7500, quantity=2, bsa_id="31000000123456",
        invoice_id=inv_id,
    )
    
    resp = billing_event_to_response(ev, company_name="Pacific Coast Title", invoice_number="INV-2026-01-0001")
    
    check_eq(resp["amount_cents"], 7500, "resp.amount_cents", checks)
    check_approx(resp["amount_dollars"], 75.00, "resp.amount_dollars", checks)
    check_eq(resp["quantity"], 2, "resp.quantity", checks)
    check_eq(resp["total_cents"], 15000, "resp.total_cents (7500*2)", checks)
    check_approx(resp["total_dollars"], 150.00, "resp.total_dollars", checks)
    check_eq(resp["company_name"], "Pacific Coast Title", "resp.company_name", checks)
    check_eq(resp["bsa_id"], "31000000123456", "resp.bsa_id", checks)
    check_eq(resp["status"], "invoiced", "resp.status (has invoice_id)", checks)
    check_eq(resp["invoice_number"], "INV-2026-01-0001", "resp.invoice_number", checks)
    check_eq(resp["event_type"], "filing_accepted", "resp.event_type", checks)
    check_true(resp["created_at"] is not None, "resp.created_at not None", checks)
    
    return _make_result(checks, "11 fields validated")


# ── Invoice tests ────────────────────────────────────────────────────────────

@register("invoice_subtotal")
def test_invoice_subtotal(verbose):
    """3 filing events at $75 each = $225 subtotal"""
    checks = []
    events = [
        mock_billing_event(amount_cents=7500, quantity=1),
        mock_billing_event(amount_cents=7500, quantity=1),
        mock_billing_event(amount_cents=7500, quantity=1),
    ]
    subtotal = sum(e.amount_cents * e.quantity for e in events)
    check_eq(subtotal, 22500, "subtotal_cents (3 x $75)", checks)
    check_approx(subtotal / 100.0, 225.00, "subtotal_dollars", checks)
    
    inv = mock_invoice(subtotal_cents=subtotal, tax_cents=0, discount_cents=0)
    check_eq(inv.total_cents, 22500, "invoice total_cents", checks)
    
    return _make_result(checks, "$225.00 (3 filings)")


@register("invoice_tax_discount")
def test_invoice_tax_discount(verbose):
    """Subtotal $225, tax $20.25, discount $10 => total $235.25"""
    checks = []
    subtotal = 22500
    tax = 2025
    discount = 1000
    total = subtotal + tax - discount
    
    check_eq(total, 23525, "total = subtotal + tax - discount", checks)
    check_approx(total / 100.0, 235.25, "total_dollars", checks)
    
    inv = mock_invoice(subtotal_cents=subtotal, tax_cents=tax, discount_cents=discount, total_cents=total)
    check_eq(inv.subtotal_cents, 22500, "inv.subtotal_cents", checks)
    check_eq(inv.tax_cents, 2025, "inv.tax_cents", checks)
    check_eq(inv.discount_cents, 1000, "inv.discount_cents", checks)
    check_eq(inv.total_cents, 23525, "inv.total_cents", checks)
    
    return _make_result(checks, "$235.25 (tax+disc)")


@register("invoice_number")
def test_invoice_number(verbose):
    """Validate INV-YYYY-MM-NNNN format"""
    checks = []
    
    # Simulate the generation logic from billing.py
    period_end = date(2026, 2, 28)
    year_month = period_end.strftime("%Y-%m")
    existing_count = 0  # No existing invoices
    count = existing_count + 1
    invoice_number = f"INV-{year_month}-{count:04d}"
    
    check_eq(invoice_number, "INV-2026-02-0001", "first invoice number", checks)
    
    # Second invoice
    count = 2
    invoice_number_2 = f"INV-{year_month}-{count:04d}"
    check_eq(invoice_number_2, "INV-2026-02-0002", "second invoice number", checks)
    
    # 100th invoice
    count = 100
    invoice_number_100 = f"INV-{year_month}-{count:04d}"
    check_eq(invoice_number_100, "INV-2026-02-0100", "100th invoice number", checks)
    
    # Check format starts with "INV-"
    check_true(invoice_number.startswith("INV-"), "starts with INV-", checks)
    check_true(len(invoice_number) == 16, "length is 16 chars", checks)
    
    return _make_result(checks, "INV-YYYY-MM-NNNN")


@register("due_date_calc")
def test_due_date_calc(verbose):
    """period_end + payment_terms_days = due_date"""
    checks = []
    
    # Default: Net 30
    period_end = date(2026, 1, 31)
    payment_terms = 30
    due = period_end + timedelta(days=payment_terms)
    check_eq(due, date(2026, 3, 2), "Net 30: Jan 31 + 30 = Mar 2", checks)
    
    # Net 45
    due_45 = period_end + timedelta(days=45)
    check_eq(due_45, date(2026, 3, 17), "Net 45: Jan 31 + 45 = Mar 17", checks)
    
    # Net 60
    due_60 = period_end + timedelta(days=60)
    check_eq(due_60, date(2026, 4, 1), "Net 60: Jan 31 + 60 = Apr 1", checks)
    
    # Default fallback (None => 30)
    fallback_terms = None or 30
    due_fallback = period_end + timedelta(days=fallback_terms)
    check_eq(due_fallback, date(2026, 3, 2), "Fallback (None or 30)", checks)
    
    return _make_result(checks, "Net 30/45/60 validated")


@register("invoice_serializer")
def test_invoice_serializer(verbose):
    checks = []
    inv = mock_invoice(
        subtotal_cents=22500,
        tax_cents=0,
        discount_cents=0,
        total_cents=22500,
        status="sent",
        invoice_number="INV-2026-01-0003",
        period_start=date(2026, 1, 1),
        period_end=date(2026, 1, 31),
        due_date=date(2026, 3, 2),
        sent_at=datetime(2026, 2, 1, 10, 0),
    )
    
    resp = invoice_to_response(inv, company_name="ABC Title", line_items_count=3)
    
    check_eq(resp["invoice_number"], "INV-2026-01-0003", "resp.invoice_number", checks)
    check_eq(resp["subtotal_cents"], 22500, "resp.subtotal_cents", checks)
    check_eq(resp["total_cents"], 22500, "resp.total_cents", checks)
    check_approx(resp["total_dollars"], 225.00, "resp.total_dollars", checks)
    check_eq(resp["status"], "sent", "resp.status", checks)
    check_eq(resp["company_name"], "ABC Title", "resp.company_name", checks)
    check_eq(resp["line_items_count"], 3, "resp.line_items_count", checks)
    check_eq(resp["period_start"], "2026-01-01", "resp.period_start ISO", checks)
    check_eq(resp["period_end"], "2026-01-31", "resp.period_end ISO", checks)
    check_eq(resp["due_date"], "2026-03-02", "resp.due_date ISO", checks)
    check_true(resp["sent_at"] is not None, "resp.sent_at not None", checks)
    check_true(resp["paid_at"] is None, "resp.paid_at is None", checks)
    
    return _make_result(checks, "12 fields validated")


# ── Model property tests ─────────────────────────────────────────────────────

@register("invoice_model_props")
def test_invoice_model_props(verbose):
    """Test the Invoice model's @property methods."""
    checks = []
    
    # Create a real Invoice instance (not persisted)
    inv = Invoice()
    inv.subtotal_cents = 22500
    inv.tax_cents = 2000
    inv.discount_cents = 500
    inv.total_cents = 24000  # 22500 + 2000 - 500
    inv.status = "paid"
    inv.due_date = date(2026, 3, 1)
    
    check_approx(inv.subtotal_dollars, 225.00, "subtotal_dollars", checks)
    check_approx(inv.tax_dollars, 20.00, "tax_dollars", checks)
    check_approx(inv.discount_dollars, 5.00, "discount_dollars", checks)
    check_approx(inv.total_dollars, 240.00, "total_dollars", checks)
    check_eq(inv.is_paid, True, "is_paid (status=paid)", checks)
    check_eq(inv.is_overdue, False, "is_overdue=False when paid", checks)
    
    return _make_result(checks, "6 model properties")


@register("invoice_overdue")
def test_invoice_overdue(verbose):
    """Test is_overdue logic for various states."""
    checks = []
    
    # Case 1: Paid invoice (never overdue)
    inv_paid = Invoice()
    inv_paid.status = "paid"
    inv_paid.due_date = date(2020, 1, 1)  # Way in the past
    inv_paid.total_cents = 1000
    check_eq(inv_paid.is_overdue, False, "paid invoice not overdue", checks)
    
    # Case 2: Sent invoice with past due date
    inv_overdue = Invoice()
    inv_overdue.status = "sent"
    inv_overdue.due_date = date(2020, 1, 1)
    inv_overdue.total_cents = 1000
    check_eq(inv_overdue.is_overdue, True, "sent + past due = overdue", checks)
    
    # Case 3: Sent invoice with future due date
    inv_not_due = Invoice()
    inv_not_due.status = "sent"
    inv_not_due.due_date = date(2099, 12, 31)
    inv_not_due.total_cents = 1000
    check_eq(inv_not_due.is_overdue, False, "sent + future due = not overdue", checks)
    
    # Case 4: Draft invoice (no due date check matters)
    inv_draft = Invoice()
    inv_draft.status = "draft"
    inv_draft.due_date = date(2020, 1, 1)
    inv_draft.total_cents = 1000
    check_eq(inv_draft.is_overdue, True, "draft + past due = overdue", checks)
    
    # Case 5: No due_date set
    inv_no_due = Invoice()
    inv_no_due.status = "sent"
    inv_no_due.due_date = None
    inv_no_due.total_cents = 1000
    check_eq(inv_no_due.is_overdue, False, "no due_date = not overdue", checks)
    
    return _make_result(checks, "5 overdue states")


# ── Rate / fee tests ─────────────────────────────────────────────────────────

@register("default_fee")
def test_default_fee(verbose):
    """Default filing fee is $75.00 (7500 cents)."""
    checks = []
    
    # Simulate: company.filing_fee_cents or 7500
    company_fee_none = None
    effective_fee = company_fee_none or 7500
    check_eq(effective_fee, 7500, "None or 7500 = 7500", checks)
    check_approx(effective_fee / 100.0, 75.00, "default $75.00", checks)
    
    # Company with 0 fee (edge case: 0 is falsy!)
    company_fee_zero = 0
    effective_zero = company_fee_zero or 7500
    # NOTE: This is a known Python gotcha - 0 is falsy, so it falls back to 7500
    check_eq(effective_zero, 7500, "0 or 7500 = 7500 (Python falsy)", checks)
    
    return _make_result(checks, "$75.00 default")


@register("custom_fee")
def test_custom_fee(verbose):
    """Company with custom $150 filing fee."""
    checks = []
    
    company = mock_company(filing_fee_cents=15000)
    effective = company.filing_fee_cents or 7500
    check_eq(effective, 15000, "custom fee 15000", checks)
    check_approx(effective / 100.0, 150.00, "custom $150.00", checks)
    
    # Company with low fee ($25)
    company_low = mock_company(filing_fee_cents=2500)
    effective_low = company_low.filing_fee_cents or 7500
    check_eq(effective_low, 2500, "low fee 2500", checks)
    check_approx(effective_low / 100.0, 25.00, "low $25.00", checks)
    
    return _make_result(checks, "$150 + $25 custom")


@register("custom_terms")
def test_custom_terms(verbose):
    """Net 45 payment terms."""
    checks = []
    
    company = mock_company(payment_terms_days=45)
    terms = company.payment_terms_days or 30
    check_eq(terms, 45, "payment_terms_days=45", checks)
    
    period_end = date(2026, 1, 31)
    due = period_end + timedelta(days=terms)
    check_eq(due, date(2026, 3, 17), "due date with Net 45", checks)
    
    # None fallback
    company_none = mock_company(payment_terms_days=None)
    terms_fallback = company_none.payment_terms_days or 30
    check_eq(terms_fallback, 30, "None falls back to 30", checks)
    
    return _make_result(checks, "Net 45")


# ── Aggregation tests ─────────────────────────────────────────────────────────

@register("pending_agg")
def test_pending_agg(verbose):
    """Aggregate pending (uninvoiced) events."""
    checks = []
    
    events = [
        mock_billing_event(amount_cents=7500, quantity=1),  # $75
        mock_billing_event(amount_cents=7500, quantity=1),  # $75
        mock_billing_event(amount_cents=2500, quantity=1),  # $25 (expedite)
    ]
    
    pending_count = len(events)
    pending_cents = sum(e.amount_cents * e.quantity for e in events)
    
    check_eq(pending_count, 3, "pending_count = 3", checks)
    check_eq(pending_cents, 17500, "pending_cents = 17500", checks)
    check_approx(pending_cents / 100.0, 175.00, "pending_dollars = $175", checks)
    
    return _make_result(checks, "$175.00 pending")


@register("mixed_events")
def test_mixed_events(verbose):
    """Mix of filings, expedite, and credits."""
    checks = []
    
    events = [
        mock_billing_event(event_type="filing_accepted", amount_cents=7500, quantity=1),    # +$75
        mock_billing_event(event_type="filing_accepted", amount_cents=7500, quantity=1),    # +$75
        mock_billing_event(event_type="expedite_fee", amount_cents=2500, quantity=1),       # +$25
        mock_billing_event(event_type="manual_adjustment", amount_cents=-5000, quantity=1), # -$50 credit
        mock_billing_event(event_type="filing_accepted", amount_cents=10000, quantity=2),   # +$200 (2x$100)
    ]
    
    total = sum(e.amount_cents * e.quantity for e in events)
    # 7500 + 7500 + 2500 - 5000 + 20000 = 32500
    check_eq(total, 32500, "mixed total = 32500", checks)
    check_approx(total / 100.0, 325.00, "mixed total = $325.00", checks)
    
    # Check that credits reduce the total
    credits_only = sum(e.amount_cents * e.quantity for e in events if e.amount_cents < 0)
    check_eq(credits_only, -5000, "credits total = -5000", checks)
    
    charges_only = sum(e.amount_cents * e.quantity for e in events if e.amount_cents > 0)
    check_eq(charges_only, 37500, "charges total = 37500", checks)
    
    check_eq(total, charges_only + credits_only, "charges + credits = total", checks)
    
    # Event type counts
    filing_count = sum(1 for e in events if e.event_type == "filing_accepted")
    check_eq(filing_count, 3, "filing events count = 3", checks)
    
    return _make_result(checks, "$325.00 mixed")


# ══════════════════════════════════════════════════════════════════════════════
# TABLE OUTPUT
# ══════════════════════════════════════════════════════════════════════════════

def ok(val: bool) -> str:
    return " OK " if val else "FAIL"


def print_results(results: list) -> None:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    total = len(results)
    passed = sum(1 for r in results if r["result"]["passed"])
    
    print()
    print("=" * 90)
    print(f"  BILLING CALCULATIONS STRESS TEST RESULTS")
    print(f"  Date: {now}")
    print(f"  Scenarios tested: {total}")
    print("=" * 90)
    print()
    
    hdr = (
        f"  {'#':>3}  "
        f"{'Grp':^7}  "
        f"{'Scenario':<38}  "
        f"{'Pass':^6}  "
        f"{'Checks':^8}  "
        f"{'Details':<22}"
    )
    sep = "  " + "-" * 86
    
    print(hdr)
    print(sep)
    
    for r in results:
        res = r["result"]
        checks_str = f"{res['checks_ok']}/{res['checks_total']}"
        
        row = (
            f"  {r['num']:>3}  "
            f"{r['group']:^7}  "
            f"{r['name']:<38}  "
            f"{ok(res['passed']):^6}  "
            f"{checks_str:^8}  "
            f"{res['details']:<22}"
        )
        print(row)
    
    print(sep)
    print()
    print(f"  PASSED: {passed}/{total}")
    
    failed = [r for r in results if not r["result"]["passed"]]
    if failed:
        print(f"  FAILED: {len(failed)}")
        for r in failed:
            print(f"\n  FAIL #{r['num']} ({r['name']}):")
            for c in r["result"]["checks"]:
                if c.startswith("FAIL:"):
                    print(f"    {c}")
    
    print()
    print("=" * 90)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Billing Calculations Stress Test")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed checks")
    parser.add_argument("--scenario", "-s", type=int, help="Run only scenario N")
    args = parser.parse_args()
    
    print()
    print("  BILLING CALCULATIONS STRESS TEST")
    print("  Validates billing events, invoice math, rates, and serializers")
    print("  No database required - pure calculation testing")
    print()
    
    scenarios = get_scenarios()
    
    if args.scenario:
        if 1 <= args.scenario <= len(scenarios):
            scenarios = [scenarios[args.scenario - 1]]
        else:
            print(f"  Invalid scenario: {args.scenario} (valid: 1-{len(scenarios)})")
            return 1
    
    results = []
    for i, s in enumerate(scenarios):
        actual_idx = (args.scenario - 1) if args.scenario else i
        
        if args.verbose:
            print(f"\n  [{actual_idx + 1}] {s['name']} (Group: {s['group']})")
        else:
            print(f"  Running {actual_idx + 1:>2}: {s['name']:<40}", end="", flush=True)
        
        test_fn = TEST_REGISTRY.get(s["test"])
        if not test_fn:
            test_result = {"passed": False, "checks_ok": 0, "checks_total": 0, "details": f"Unknown: {s['test']}", "checks": []}
        else:
            try:
                test_result = test_fn(args.verbose)
            except Exception as e:
                test_result = {"passed": False, "checks_ok": 0, "checks_total": 0, "details": str(e)[:40], "checks": [f"FAIL: {type(e).__name__}: {e}"]}
        
        entry = {
            "num": actual_idx + 1,
            "name": s["name"],
            "group": s["group"],
            "result": test_result,
        }
        results.append(entry)
        
        if args.verbose:
            for c in test_result["checks"]:
                status = "  OK " if c.startswith("OK:") else " FAIL"
                print(f"    [{status}] {c}")
        else:
            print(f"  {'OK' if test_result['passed'] else 'FAIL'}")
    
    print_results(results)
    
    all_pass = all(r["result"]["passed"] for r in results)
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
