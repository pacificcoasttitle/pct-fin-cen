# CURSOR PROMPT: Billing System Finalization — Investigation + PDF Invoices + Email Delivery

## Context

Billing Phase 1 is complete (Shark #48). We now need to finalize the billing system for March 1, 2026 launch. This prompt covers four objectives:

1. **Investigate** what's already in place across the full billing stack
2. **PDF invoice generation** using PDFShift
3. **Email delivery** using SendGrid
4. **Cross-role visibility** — every user level sees appropriate billing info

### Billing Tier Model

Our companies fall into three billing categories:

| Tier | Name | Behavior |
|------|------|----------|
| `invoice_only` | Trusted | Invoice sent. Payment on their terms (Net 30). No card required. |
| `hybrid` | Standard | Invoice sent with Net 10. If unpaid after terms, auto-charge card on file via Stripe. |
| `subscription` | Subscription | Monthly flat fee + per-filing overages. **LOWEST PRIORITY — NOT IN THIS PROMPT.** |

This prompt covers `invoice_only` and `hybrid` tiers. Subscription is Phase 2 (later).

---

## PART 1: INVESTIGATION — What Exists Today

### Instructions

Search the entire codebase and answer every question below with file paths, line numbers, and actual code. Do NOT guess — show what's real.

---

### 1A: Company Model & Billing Fields

```bash
# Show the Company model with all fields
grep -n "class Company" api/app/models/company.py
cat api/app/models/company.py
```

**Answer:**
- Does `Company` have `filing_fee_cents`? (Expected: yes, from Shark #48)
- Does `Company` have `payment_terms_days`? (Expected: yes)
- Does `Company` have `billing_notes`? (Expected: yes)
- Does `Company` have a `billing_type` field? (Expected: probably not — we need to add this)
- Does `Company` have any Stripe-related fields? (`stripe_customer_id`, `stripe_payment_method_id`, etc.)
- Does `Company` have email fields for invoice delivery? (`billing_email`, `billing_contact_name`)

### 1B: Invoice Model

```bash
# Find and show the Invoice model
grep -rn "class Invoice" api/app/models/ --include="*.py"
# Show full model
cat api/app/models/invoice.py  # or wherever it lives
```

**Answer:**
- What fields exist on the Invoice model?
- Is there a `pdf_url` or `pdf_path` field?
- Is there a `sent_at` field?
- Is there a `sent_to_email` field?
- Is there a `paid_at` field?
- Is there a `stripe_payment_intent_id` field?
- What statuses are supported? (draft, pending, sent, paid, overdue, void?)
- Is there an `invoice_number` field? What format?

### 1C: BillingEvent Model

```bash
grep -rn "class BillingEvent" api/app/models/ --include="*.py"
cat api/app/models/billing_event.py  # or wherever it lives
```

**Answer:**
- What fields exist?
- Is there a link to Invoice? (`invoice_id` FK?)
- Is there a `bsa_id` / `receipt_id` field for linking to filings?
- What event types exist? (`filing_fee`, `credit`, `adjustment`?)

### 1D: Billing API Endpoints

```bash
cat api/app/routes/billing.py
```

**Answer — for each endpoint, show:**
- Route, method, function name
- What it queries
- What it returns
- Any gaps (e.g., missing PDF generation, missing email sending)

### 1E: Billing Frontend Pages

```bash
# Client billing page
cat web/app/\(app\)/app/billing/page.tsx

# Admin billing page  
cat web/app/\(app\)/app/admin/billing/page.tsx
```

**Answer:**
- What tabs/sections exist on each page?
- Is there an "Email Invoice" action?
- Is there a "Download PDF" action?
- Is there a "Mark as Paid" action?
- Is there an invoice detail view/dialog?
- Can admin see which invoices have been sent vs unsent?
- Can admin see which invoices are overdue?

### 1F: Existing Email Infrastructure

```bash
# Search for SendGrid or email-related code
grep -rn "sendgrid\|SendGrid\|SENDGRID\|send_email\|email_service\|sgMail\|@sendgrid" api/ --include="*.py"
grep -rn "SENDGRID" api/app/config.py

# Check requirements
grep -n "sendgrid" api/requirements.txt
```

**Answer:**
- Is SendGrid SDK installed?
- Is there an email service module?
- Are there SendGrid env vars configured?
- Are there any email templates?
- What emails does the system currently send? (party invitations, notifications, etc.)

### 1G: Existing PDF Infrastructure

```bash
# Search for PDF generation
grep -rn "pdf\|PDF\|pdfshift\|weasyprint\|reportlab\|wkhtmltopdf" api/ --include="*.py"
grep -rn "pdfshift\|PDFSHIFT" api/app/config.py
grep -n "pdfshift\|weasyprint\|reportlab" api/requirements.txt
```

**Answer:**
- Is any PDF library installed?
- Is PDFShift configured?
- Are there any PDF generation utilities?

### 1H: Stripe Infrastructure

```bash
grep -rn "stripe\|Stripe\|STRIPE" api/ --include="*.py"
grep -n "stripe" api/requirements.txt
```

**Answer:**
- Is Stripe SDK installed?
- Are there Stripe env vars?
- Is there a Stripe customer/payment service?
- Any existing Stripe integration at all?

### 1I: Environment Variables

```bash
grep -n "SENDGRID\|STRIPE\|PDFSHIFT\|BILLING\|INVOICE" api/app/config.py
```

**Answer:**
- List all billing-related env vars currently defined
- List what's missing that we'll need to add

---

### PART 1 OUTPUT FORMAT

```markdown
## Billing System Investigation Results

### Models
| Model | File | Key Fields | Missing Fields Needed |
|-------|------|------------|----------------------|

### API Endpoints
| Method | Path | Status | Gaps |
|--------|------|--------|------|

### Frontend Pages
| Page | File | Features Present | Features Missing |
|------|------|-----------------|-----------------|

### Infrastructure
| Service | Status | Details |
|---------|--------|---------|
| SendGrid | ✅/❌ | ... |
| PDFShift | ✅/❌ | ... |
| Stripe | ✅/❌ | ... |

### Environment Variables
| Variable | Status | Purpose |
|----------|--------|---------|
```

---

## PART 2: DATABASE & MODEL UPDATES

Based on investigation, most billing fields already exist. Only add what's actually missing.

### 2A: Company Model — Add Billing Tier + Stripe Fields ONLY

**File:** `api/app/models/company.py`

**ALREADY EXISTS (do NOT re-add):**
- `filing_fee_cents` (line 36, default 7500)
- `payment_terms_days` (line 37, default 30)
- `billing_notes` (line 38)
- `billing_email` (line 30)
- `billing_contact_name` (line 31)

**ADD ONLY THESE NEW FIELDS:**

```python
# Billing tier — determines payment collection behavior
billing_type = Column(String(50), default="hybrid", nullable=False)
# Values: "invoice_only" (trusted, Net 30, no card)
#          "hybrid" (Net 10, auto-charge card if unpaid)
#          "subscription" (future, monthly flat fee)

# Stripe (for hybrid tier auto-charge — Phase 3)
stripe_customer_id = Column(String(255), nullable=True)
stripe_payment_method_id = Column(String(255), nullable=True)
```

### 2B: Invoice Model — Add Email Tracking + Stripe Fields ONLY

**File:** `api/app/models/invoice.py`

**ALREADY EXISTS (do NOT re-add):**
- `invoice_number` (line 24)
- `period_start`, `period_end` (lines 25-26)
- `subtotal_cents`, `tax_cents`, `discount_cents`, `total_cents` (lines 29-32)
- `status` (line 35 — draft/sent/paid/void/overdue)
- `due_date` (line 38)
- `sent_at` (line 39)
- `paid_at` (line 40)
- `voided_at` (line 41)
- `payment_method` (line 44)
- `payment_reference` (line 45)
- `pdf_url` (line 48 — exists but never populated, we'll use it)

**ADD ONLY THESE NEW FIELDS:**

```python
# Email delivery tracking
sent_to_email = Column(String(255), nullable=True)  # Where invoice was sent
email_message_id = Column(String(255), nullable=True)  # SendGrid message ID for tracking

# PDF generation tracking
pdf_generated_at = Column(DateTime, nullable=True)  # When PDF was generated

# Stripe payment tracking (for hybrid tier — Phase 3)
stripe_payment_intent_id = Column(String(255), nullable=True)
```

### 2C: BillingEvent Model — NO CHANGES NEEDED

**File:** `api/app/models/billing_event.py`

Investigation confirms all fields already exist: `company_id`, `report_id`, `submission_request_id`, `event_type`, `description`, `amount_cents`, `quantity`, `bsa_id`, `invoice_id`, `invoiced_at`. ✅ Complete.

### 2D: Create Migration

```bash
cd api
alembic revision --autogenerate -m "add_billing_type_email_tracking_stripe_fields"
alembic upgrade head
```

**Expected migration creates:**
- `companies.billing_type` (String, default "hybrid")
- `companies.stripe_customer_id` (String, nullable)
- `companies.stripe_payment_method_id` (String, nullable)
- `invoices.sent_to_email` (String, nullable)
- `invoices.email_message_id` (String, nullable)
- `invoices.pdf_generated_at` (DateTime, nullable)
- `invoices.stripe_payment_intent_id` (String, nullable)

That's it — 7 columns total. Verify the migration only adds these columns before running.

---

## PART 3: PDF INVOICE GENERATION (PDFShift)

### 3A: Configuration

**Add to `api/app/config.py`:**

```python
PDFSHIFT_API_KEY: str = ""  # Required for PDF generation
PDFSHIFT_SANDBOX: bool = True  # Use sandbox mode for testing
```

**No new pip dependencies needed** — PDFShift is a simple REST API, and `requests` is already installed.

**NOTE:** `Invoice.pdf_url` field already exists (line 48) but is never populated. We will use this field to store the reference to the generated PDF.

### 3B: Create Invoice HTML Template

**Create:** `api/app/templates/invoice.html`

This is the HTML template that PDFShift will convert to PDF. Design a professional invoice:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Clean, professional invoice styling */
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 0; padding: 40px; }
    
    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-info { }
    .company-name { font-size: 24px; font-weight: 700; color: #1a365d; }
    .company-detail { font-size: 12px; color: #666; margin-top: 4px; }
    
    .invoice-meta { text-align: right; }
    .invoice-number { font-size: 28px; font-weight: 700; color: #1a365d; }
    .invoice-date { font-size: 12px; color: #666; margin-top: 4px; }
    
    .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .address-block { }
    .address-label { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 8px; }
    .address-name { font-size: 14px; font-weight: 600; }
    .address-line { font-size: 12px; color: #666; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { 
      background: #f7fafc; 
      border-bottom: 2px solid #e2e8f0; 
      padding: 12px; 
      text-align: left; 
      font-size: 11px; 
      text-transform: uppercase; 
      color: #666; 
      letter-spacing: 0.5px;
    }
    .items-table td { 
      padding: 12px; 
      border-bottom: 1px solid #f0f0f0; 
      font-size: 13px; 
    }
    .items-table .amount { text-align: right; }
    .items-table .total-row td { 
      border-top: 2px solid #1a365d; 
      font-weight: 700; 
      font-size: 15px;
      padding-top: 16px;
    }
    
    .payment-info {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }
    .payment-title { font-weight: 600; margin-bottom: 8px; }
    .payment-detail { font-size: 12px; color: #666; margin: 4px 0; }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #999;
      text-align: center;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-paid { background: #c6f6d5; color: #276749; }
    .status-pending { background: #fefcbf; color: #975a16; }
    .status-overdue { background: #fed7d7; color: #9b2c2c; }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div class="company-info">
      <div class="company-name">PCT FinCEN Solutions</div>
      <div class="company-detail">A subsidiary of Pacific Coast Title Company</div>
      <div class="company-detail">{{ from_address_line1 }}</div>
      <div class="company-detail">{{ from_address_line2 }}</div>
      <div class="company-detail">{{ from_phone }} | {{ from_email }}</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">{{ invoice_number }}</div>
      <div class="invoice-date">
        Date: {{ invoice_date }}<br>
        Due: {{ due_date }}<br>
        Terms: Net {{ payment_terms_days }}
      </div>
    </div>
  </div>
  
  <div class="addresses">
    <div class="address-block">
      <div class="address-label">Bill To</div>
      <div class="address-name">{{ client_company_name }}</div>
      <div class="address-line">{{ client_billing_contact }}</div>
      <div class="address-line">{{ client_billing_email }}</div>
    </div>
    <div class="address-block">
      <div class="address-label">Status</div>
      <span class="status-badge status-{{ status_class }}">{{ status_label }}</span>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Property / BSA ID</th>
        <th>Date</th>
        <th>Qty</th>
        <th class="amount">Rate</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      {% for item in line_items %}
      <tr>
        <td>{{ item.description }}</td>
        <td>{{ item.reference }}</td>
        <td>{{ item.date }}</td>
        <td>{{ item.quantity }}</td>
        <td class="amount">${{ item.rate }}</td>
        <td class="amount">${{ item.amount }}</td>
      </tr>
      {% endfor %}
      
      {% if credits %}
      {% for credit in credits %}
      <tr style="color: #276749;">
        <td>{{ credit.description }}</td>
        <td></td>
        <td>{{ credit.date }}</td>
        <td></td>
        <td class="amount"></td>
        <td class="amount">-${{ credit.amount }}</td>
      </tr>
      {% endfor %}
      {% endif %}
      
      <tr class="total-row">
        <td colspan="5">Total Due</td>
        <td class="amount">${{ total_dollars }}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="payment-info">
    <div class="payment-title">Payment Information</div>
    <div class="payment-detail">Payment Terms: Net {{ payment_terms_days }} days</div>
    <div class="payment-detail">Due Date: {{ due_date }}</div>
    {% if payment_link %}
    <div class="payment-detail" style="margin-top: 12px;">
      <strong>Pay Online:</strong> <a href="{{ payment_link }}">{{ payment_link }}</a>
    </div>
    {% endif %}
    {% if billing_type == "hybrid" %}
    <div class="payment-detail" style="margin-top: 8px; color: #975a16;">
      Note: If payment is not received by {{ due_date }}, your card on file will be charged automatically.
    </div>
    {% endif %}
  </div>
  
  <div class="footer">
    PCT FinCEN Solutions — Powered by Pacific Coast Title Company<br>
    Questions? Contact {{ from_email }}
  </div>
</body>
</html>
```

### 3C: Create PDF Service

**Create:** `api/app/services/pdf_service.py`

```python
"""
PDF generation service using PDFShift.
Converts HTML to PDF via PDFShift API.
"""

import requests
import base64
import logging
from jinja2 import Environment, FileSystemLoader
from app.config import settings

logger = logging.getLogger(__name__)

PDFSHIFT_API_URL = "https://api.pdfshift.io/v3/convert/pdf"

# Template directory
template_env = Environment(
    loader=FileSystemLoader("app/templates"),
    autoescape=True
)


def render_invoice_html(invoice_data: dict) -> str:
    """Render invoice HTML from template with data."""
    template = template_env.get_template("invoice.html")
    return template.render(**invoice_data)


def generate_pdf(html_content: str) -> bytes:
    """Convert HTML to PDF via PDFShift API."""
    if not settings.PDFSHIFT_API_KEY:
        raise ValueError("PDFSHIFT_API_KEY not configured")
    
    response = requests.post(
        PDFSHIFT_API_URL,
        auth=("api", settings.PDFSHIFT_API_KEY),
        json={
            "source": html_content,
            "landscape": False,
            "use_print": True,
            "margin": {
                "top": "20mm",
                "bottom": "20mm",
                "left": "15mm",
                "right": "15mm"
            },
            "sandbox": settings.PDFSHIFT_SANDBOX
        },
        timeout=30
    )
    
    if response.status_code != 200:
        logger.error(f"PDFShift error: {response.status_code} - {response.text}")
        raise Exception(f"PDF generation failed: {response.status_code}")
    
    return response.content


def generate_invoice_pdf(invoice, line_items, company) -> bytes:
    """
    Generate a PDF for an invoice.
    
    Args:
        invoice: Invoice model instance
        line_items: List of BillingEvent items on this invoice
        company: Company model instance
    
    Returns:
        PDF file bytes
    """
    # Build template data
    invoice_data = {
        # From (PCT FinCEN Solutions)
        "from_address_line1": "123 Main Street, Suite 100",  # TODO: Configure
        "from_address_line2": "Los Angeles, CA 90001",
        "from_phone": "(800) 555-0100",
        "from_email": "billing@pctfincen.com",
        
        # Invoice meta
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.created_at.strftime("%B %d, %Y"),
        "due_date": invoice.due_date.strftime("%B %d, %Y") if invoice.due_date else "Upon Receipt",
        "payment_terms_days": company.payment_terms_days or 30,
        
        # Client
        "client_company_name": company.name,
        "client_billing_contact": company.billing_contact_name or "",
        "client_billing_email": company.billing_email or "",
        
        # Status
        "status_label": invoice.status.title(),
        "status_class": _status_class(invoice.status),
        
        # Billing type
        "billing_type": company.billing_type or "invoice_only",
        
        # Payment link (Stripe - will be None until Stripe is integrated)
        "payment_link": None,
        
        # Line items
        "line_items": [
            {
                "description": item.description or "FinCEN Filing Fee",
                "reference": item.bsa_id or "",
                "date": item.created_at.strftime("%m/%d/%Y"),
                "quantity": item.quantity or 1,
                "rate": f"{item.amount_cents / 100:.2f}",
                "amount": f"{(item.amount_cents * (item.quantity or 1)) / 100:.2f}",
            }
            for item in line_items
            if item.amount_cents >= 0
        ],
        
        # Credits (negative amounts)
        "credits": [
            {
                "description": item.description or "Credit",
                "date": item.created_at.strftime("%m/%d/%Y"),
                "amount": f"{abs(item.amount_cents) / 100:.2f}",
            }
            for item in line_items
            if item.amount_cents < 0
        ],
        
        # Total
        "total_dollars": f"{invoice.total_cents / 100:.2f}",
    }
    
    html = render_invoice_html(invoice_data)
    pdf_bytes = generate_pdf(html)
    
    return pdf_bytes


def _status_class(status: str) -> str:
    """Map invoice status to CSS class."""
    return {
        "paid": "paid",
        "draft": "pending",
        "pending": "pending",
        "sent": "pending",
        "overdue": "overdue",
        "void": "pending",
    }.get(status, "pending")
```

### 3D: Add PDF Endpoints

**Add to `api/app/routes/billing.py`** (which already has 9 admin + 4 client endpoints):

```python
# --- ADMIN PDF ENDPOINTS ---

@router.post("/admin/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf_endpoint(invoice_id: str, current_user = Depends(require_pct_admin)):
    """Generate PDF for an invoice via PDFShift and store reference."""
    # 1. Load invoice + its BillingEvents (where invoice_id matches) + company
    # 2. Call generate_invoice_pdf(invoice, line_items, company)
    # 3. Store PDF bytes (gzip+base64 in a new column, or upload to cloud storage)
    # 4. Update invoice.pdf_url with storage reference
    # 5. Update invoice.pdf_generated_at = now
    # 6. Return PDF bytes with Content-Type: application/pdf

@router.get("/admin/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user = Depends(require_pct_admin)):
    """Download previously generated PDF (or generate on-the-fly if not cached)."""
    # If pdf_url exists and is recent, return stored PDF
    # Otherwise, generate fresh, store, and return

# --- CLIENT PDF ENDPOINT ---

@router.get("/my/invoices/{invoice_id}/pdf")
async def download_my_invoice_pdf(invoice_id: str, current_user = Depends(require_client_admin)):
    """Client admin downloads their invoice PDF."""
    # 1. Load invoice
    # 2. Verify invoice.company_id == current_user.company_id (CRITICAL security check)
    # 3. Generate or return cached PDF
    # 4. Return with Content-Type: application/pdf
```

**IMPORTANT:** The existing `/billing/my/invoices/{id}` endpoint (line 281) already loads invoice detail for clients. The PDF endpoint follows the same pattern but returns binary PDF instead of JSON.

---

## PART 4: EMAIL INVOICE DELIVERY (SendGrid)

### 4A: Configuration

**SendGrid is ALREADY configured:**
- SDK installed: `sendgrid` in requirements.txt (line 20)
- Service exists: `api/app/services/email_service.py` (~489 lines)
- `send_email()` function exists (line 44-95)
- `SENDGRID_API_KEY` defined (line 21 of email_service.py)
- `SENDGRID_FROM_EMAIL` defined (line 22)
- `SENDGRID_ENABLED` toggle exists (line 24, default: false)
- Existing templates: `get_party_invite_html()`, `get_confirmation_html()`

**No new env vars needed for SendGrid.** Follow the existing pattern in email_service.py.

**Add to `api/app/config.py`** (if not already there — check first):
```python
# Only if SENDGRID vars are not already accessible from config
# They may live only in email_service.py currently
INVOICE_FROM_NAME: str = "PCT FinCEN Solutions - Billing"
```

### 4B: EXTEND Existing Email Service

**EXTEND (do NOT recreate):** `api/app/services/email_service.py`

This file already exists (~489 lines) with `send_email()`, party invite templates, etc. Add the following functions to the EXISTING file:

```python
# ============================================================
# ADD these functions to the EXISTING email_service.py file
# Place them AFTER the existing template functions
# ============================================================


def get_invoice_email_html(
    to_name: str,
    company_name: str,
    invoice_number: str,
    total_dollars: str,
    due_date: str,
    payment_terms_days: int,
    billing_type: str,
    line_items_count: int,
    from_email: str,
) -> str:
    """Generate HTML body for invoice email."""
    hybrid_warning = ""
    if billing_type == "hybrid":
        hybrid_warning = f"""
        <p style="color: #975a16; background: #fefcbf; padding: 12px; border-radius: 4px;">
            ⚠️ If payment is not received by {due_date}, your card on file will be charged automatically.
        </p>
        """
    
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Invoice {invoice_number}</h2>
        <p>Dear {to_name},</p>
        <p>Please find attached your invoice from PCT FinCEN Solutions.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f7fafc;">
                <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Invoice Number</strong></td>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">{invoice_number}</td>
            </tr>
            <tr>
                <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Amount Due</strong></td>
                <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 18px; font-weight: bold;">${total_dollars}</td>
            </tr>
            <tr style="background: #f7fafc;">
                <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Items</strong></td>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">{line_items_count} filing(s)</td>
            </tr>
            <tr>
                <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Due Date</strong></td>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">{due_date}</td>
            </tr>
            <tr style="background: #f7fafc;">
                <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Terms</strong></td>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">Net {payment_terms_days}</td>
            </tr>
        </table>
        
        {hybrid_warning}
        
        <p>Please review the attached PDF for full details.</p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
            PCT FinCEN Solutions — A subsidiary of Pacific Coast Title Company<br>
            Questions? Reply to this email or contact us at {from_email}
        </p>
    </div>
    """


def send_invoice_email(
    to_email: str,
    to_name: str,
    company_name: str,
    invoice_number: str,
    total_dollars: str,
    due_date: str,
    payment_terms_days: int,
    billing_type: str,
    pdf_bytes: bytes,
    line_items_count: int,
) -> dict:
    """
    Send an invoice email with PDF attachment via SendGrid.
    
    USES the existing send_email() pattern and SendGrid configuration
    already defined in this file.
    
    Returns: {"status": "sent", "message_id": "..."} or {"status": "failed", "error": "..."}
    """
    # Use SENDGRID_ENABLED check (same pattern as existing send_email)
    if not SENDGRID_ENABLED:
        logger.warning("SendGrid not enabled — skipping invoice email")
        return {"status": "skipped", "error": "SendGrid not enabled"}
    
    html_body = get_invoice_email_html(
        to_name=to_name,
        company_name=company_name,
        invoice_number=invoice_number,
        total_dollars=total_dollars,
        due_date=due_date,
        payment_terms_days=payment_terms_days,
        billing_type=billing_type,
        line_items_count=line_items_count,
        from_email=SENDGRID_FROM_EMAIL,  # Use existing constant
    )
    
    message = Mail(
        from_email=(SENDGRID_FROM_EMAIL, "PCT FinCEN Solutions - Billing"),
        to_emails=[(to_email, to_name)],
        subject=f"Invoice {invoice_number} from PCT FinCEN Solutions — ${total_dollars}",
    )
    message.html_content = html_body
    
    # Attach PDF
    encoded_pdf = base64.b64encode(pdf_bytes).decode()
    attachment = Attachment(
        FileContent(encoded_pdf),
        FileName(f"Invoice-{invoice_number}.pdf"),
        FileType("application/pdf"),
        Disposition("attachment")
    )
    message.attachment = attachment
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)  # Use existing constant
        response = sg.send(message)
        logger.info(f"Invoice email sent: {invoice_number} to {to_email} (status: {response.status_code})")
        return {
            "status": "sent",
            "status_code": response.status_code,
            "message_id": response.headers.get("X-Message-Id", ""),
        }
    except Exception as e:
        logger.error(f"Invoice email failed: {invoice_number} to {to_email} — {e}")
        return {"status": "failed", "error": str(e)}
```

**IMPORTANT:** The existing file already imports `SendGridAPIClient`, `Mail`, etc. and defines `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_ENABLED` as module-level constants. You must:
1. Add `Attachment, FileContent, FileName, FileType, Disposition` to the existing SendGrid imports
2. Add `import base64` if not already imported
3. Place the new functions AFTER the existing ones — do NOT reorganize the file

### 4C: Add Email Endpoints

**Add to `api/app/routes/billing.py`** (alongside the PDF endpoints from Part 3D):

```python
@router.post("/admin/invoices/{invoice_id}/send-email")
async def send_invoice_email_endpoint(invoice_id: str, current_user = Depends(require_pct_admin)):
    """Generate PDF (if not cached) and email invoice to client."""
    # 1. Load invoice + BillingEvents + company
    # 2. Validate company has billing_email — if not, return 400 with clear message
    # 3. Generate PDF if invoice.pdf_generated_at is None (call generate_invoice_pdf)
    # 4. Call send_invoice_email() from email_service.py
    # 5. Update invoice:
    #    - status = "sent" (only if currently "draft")
    #    - sent_at = now
    #    - sent_to_email = company.billing_email
    #    - email_message_id = result["message_id"]
    # 6. Create audit log: "invoice.sent" with invoice_number + recipient
    # 7. Return {"ok": True, "sent_to": company.billing_email, "message_id": "..."}

@router.post("/admin/invoices/{invoice_id}/resend-email")
async def resend_invoice_email_endpoint(invoice_id: str, current_user = Depends(require_pct_admin)):
    """Resend a previously sent invoice (re-generates PDF)."""
    # Same as send-email but:
    # - Always regenerates PDF (fresh data)
    # - Does NOT change status (it's already "sent")
    # - Updates sent_at to now
    # - Creates audit log: "invoice.resent"
```

**IMPORTANT:** The investigation found the endpoint path convention uses hyphens (e.g., `send-email`, not `send_email`). Match the existing `/admin/invoices/{id}/status` pattern.

---

## PART 5: CROSS-ROLE VISIBILITY

Every user role needs appropriate billing visibility. Here's what to add/update:

### 5A: COO Dashboard (`/app/executive`)

**Add to executive stats:**
- Outstanding invoices total
- Overdue invoices count and amount
- Monthly collected amount (from actual BillingEvents, NOT hardcoded)
- Invoices sent this month vs pending

**Alert banner if overdue invoices exist:**
```
⚠️ 3 invoices overdue ($2,250 outstanding) — View Billing
```

### 5B: Admin Billing Page (`/app/admin/billing`)

**ALREADY EXISTS (confirmed by investigation):**
- Stats cards ✅
- Invoices tab with filters ✅
- Billing events tab ✅
- Company rates tab ✅
- Generate invoice dialog ✅
- Add billing event dialog ✅
- Edit rate dialog ✅
- Mark as Sent / Mark as Paid / Void ✅

**ADD ONLY THESE to Invoices tab:**
- "Send Email" button per invoice (calls `/admin/invoices/{id}/send-email`)
- "Download PDF" button per invoice (calls `/admin/invoices/{id}/pdf`)
- "Resend" option for already-sent invoices (calls `/admin/invoices/{id}/resend-email`)
- Overdue badge: red indicator if `status !== "paid"` and `due_date < today`
- Bulk action: "Send All Unsent Invoices" (iterates unsent invoices, calls send for each)

**ADD to Invoice detail dialog (already exists but enhance):**
- Email delivery status: show `sent_to_email` and `sent_at` if sent
- PDF download button
- Send/Resend button within dialog
- Billing type indicator showing "Invoice Only" vs "Hybrid" per company

**ADD to Company Rates tab (already exists but enhance):**
- Show `billing_type` per company with editable dropdown
- Show `billing_email` per company (editable)
- Visual indicator for companies with no billing_email set (warning icon)

**BUG FIX:** Investigation found line 108 has `float` instead of `number` in TypeScript interface. Fix this while editing the file.

### 5C: Client Admin Billing Page (`/app/billing`)

**ALREADY EXISTS (confirmed by investigation):**
- Stats cards (Outstanding, Paid YTD, Pending Charges, Your Rate) ✅
- Invoices tab ✅
- Activity tab ✅
- Invoice detail dialog ✅
- View line items ✅

**ADD ONLY THESE:**
- "Download PDF" button per invoice in the invoices table (calls `/billing/my/invoices/{id}/pdf`)
- "Download PDF" button in invoice detail dialog
- Due date prominently displayed in invoice rows
- Overdue indicator: red text/badge if past due_date and not paid
- If company `billing_type == "hybrid"`: show amber notice in invoice detail dialog:
  `"Note: If payment is not received by [due_date], your card on file will be charged automatically."`
- Invoice status with clear labels:
  - `draft` → "Pending" (gray)
  - `sent` → "Sent" (blue)
  - `paid` → "Paid" (green)
  - `overdue` → "Overdue" (red)
  - `void` → "Void" (gray, strikethrough)

### 5D: Client User

- **No billing access** (unchanged)
- Should NOT see any billing-related nav items

### 5E: Staff

- **No billing access** (unchanged)
- Should NOT see any billing-related nav items

### 5F: Party Portal

- **No billing visibility** (unchanged, correct)

---

## PART 6: AUTO-INVOICE CRON JOB

### 6A: Create Monthly Invoice Generation Script

**Create:** `api/app/scripts/generate_monthly_invoices.py`

```python
"""
Monthly invoice generator.
Run as a cron job on the 1st of each month.

Behavior:
- For each company with unbilled BillingEvents from the previous month:
  - Generate an invoice
  - Generate PDF
  - If company has billing_email: send via SendGrid
  - Log results

Usage:
    python -m app.scripts.generate_monthly_invoices
    python -m app.scripts.generate_monthly_invoices --dry-run  # Preview only
    python -m app.scripts.generate_monthly_invoices --month 2026-02  # Specific month
"""
```

**Key behavior:**
- Finds all BillingEvents where `invoice_id IS NULL` and `created_at` is within the target month
- Groups by company
- Generates one invoice per company
- Generates PDF for each invoice
- Sends email if company has `billing_email` configured
- Skips companies with no unbilled events
- `--dry-run` flag shows what would be generated without doing it
- Idempotent: won't create duplicate invoices for same period

**Render Cron Job:**
```
0 8 1 * *  python -m app.scripts.generate_monthly_invoices
```
(Runs at 8 AM on the 1st of each month)

---

## PART 7: DOCUMENT IN KILLEDSHARKS-2.md

**Append** to `docs/KilledSharks-2.md`:

```markdown
### 52. Billing Phase 2 — PDF Invoices + Email Delivery + Auto-Generation ✅

**Date:** February 3, 2026

**Problem:** 
- No way to generate professional invoice documents
- No way to email invoices to clients
- No auto-generation of monthly invoices
- Billing tiers (trusted vs hybrid) not reflected in system
- COO dashboard had no billing/overdue visibility
- Clients couldn't download invoice PDFs

**Solution:** Complete billing pipeline from generation to delivery.

#### Billing Tiers Implemented

| Tier | Behavior |
|------|----------|
| `invoice_only` | Invoice sent via email. Payment on client's terms. No card required. |
| `hybrid` | Invoice sent with Net 10. Auto-charge card on file if unpaid past due date. |
| `subscription` | Deferred to Phase 3 (post-launch). |

#### New Infrastructure

| Service | Purpose | Config |
|---------|---------|--------|
| PDFShift | HTML → PDF conversion | `PDFSHIFT_API_KEY` |
| SendGrid | Invoice email delivery | `SENDGRID_API_KEY` |

#### Database Changes

| Table | New Fields |
|-------|-----------|
| `companies` | `billing_type`, `billing_email`, `billing_contact_name`, `stripe_customer_id`, `stripe_payment_method_id` |
| `invoices` | `pdf_url`, `pdf_generated_at`, `sent_at`, `sent_to_email`, `email_status`, `paid_at`, `payment_method`, `stripe_payment_intent_id`, `is_overdue`, `overdue_notified_at` |

#### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/billing/admin/invoices/{id}/generate-pdf` | Generate PDF for invoice |
| GET | `/billing/admin/invoices/{id}/pdf` | Download invoice PDF (admin) |
| GET | `/billing/my/invoices/{id}/pdf` | Download invoice PDF (client) |
| POST | `/billing/admin/invoices/{id}/send` | Email invoice to client |
| POST | `/billing/admin/invoices/{id}/resend` | Re-email invoice |

#### Cross-Role Visibility

| Role | What They See |
|------|--------------|
| COO | Overdue alerts, outstanding totals, monthly collection stats |
| Admin | Full invoice management — generate, send, download, mark paid |
| Staff | No billing access |
| Client Admin | Download PDFs, view invoice status, payment due dates |
| Client User | No billing access |
| Party Portal | No billing access |

#### Files Created
| File | Purpose |
|------|---------|
| `api/app/services/pdf_service.py` | PDFShift integration + invoice HTML rendering |
| `api/app/templates/invoice.html` | Professional invoice HTML template |
| `api/app/scripts/generate_monthly_invoices.py` | Monthly auto-generation cron |
| `api/alembic/versions/YYYYMMDD_add_billing_type_email_tracking.py` | Migration |

#### Files Modified
| File | Change |
|------|--------|
| `api/app/models/company.py` | Added: `billing_type`, `stripe_customer_id`, `stripe_payment_method_id` |
| `api/app/models/invoice.py` | Added: `sent_to_email`, `email_message_id`, `pdf_generated_at`, `stripe_payment_intent_id` |
| `api/app/services/email_service.py` | Added: `send_invoice_email()`, `get_invoice_email_html()` (EXTENDED, not replaced) |
| `api/app/routes/billing.py` | Added: PDF generate/download + email send/resend endpoints |
| `api/app/config.py` | Added: `PDFSHIFT_API_KEY`, `PDFSHIFT_SANDBOX` |
| `web/app/(app)/app/admin/billing/page.tsx` | Added: Send Email, Download PDF, Resend buttons, overdue badges, billing_type in rates |
| `web/app/(app)/app/billing/page.tsx` | Added: Download PDF button, overdue indicators, hybrid warning |
| `web/app/(app)/app/executive/page.tsx` | Added: Overdue alerts, real billing stats |

**Status:** ✅ Killed (BILLING SHARK 🦈)
```

**Update the Summary table at the top of KilledSharks-2.md.**

---

## EXECUTION ORDER

1. **Part 1** — Investigation (understand what exists)
2. **Part 2** — Database & model updates (foundation)
3. **Part 3** — PDF generation with PDFShift (core deliverable)
4. **Part 4** — Email delivery with SendGrid (delivery pipeline)
5. **Part 5** — Cross-role visibility (frontend updates)
6. **Part 6** — Auto-invoice cron (automation)
7. **Part 7** — KilledSharks documentation (always last)

---

## ENVIRONMENT VARIABLES NEEDED

```env
# PDFShift (NEW — must add)
PDFSHIFT_API_KEY=your_pdfshift_api_key
PDFSHIFT_SANDBOX=true  # Set false for production

# SendGrid (ALREADY CONFIGURED — verify these are set in your environment)
# SENDGRID_API_KEY=already_exists
# SENDGRID_FROM_EMAIL=already_exists
# SENDGRID_ENABLED=set_to_true  # Currently defaults to false!
```

**CRITICAL:** The investigation shows `SENDGRID_ENABLED` defaults to `false`. You MUST set `SENDGRID_ENABLED=true` in Render environment variables for invoice emails to actually send.

---

## VERIFICATION CHECKLIST

### Database (New)
- [ ] Company model has `billing_type` field with correct enum values
- [ ] Company model has `stripe_customer_id` and `stripe_payment_method_id`
- [ ] Invoice model has `sent_to_email` and `email_message_id`
- [ ] Invoice model has `pdf_generated_at`
- [ ] Invoice model has `stripe_payment_intent_id`
- [ ] Migration runs cleanly (only 7 new columns)

### PDF Generation (New)
- [ ] PDFShift generates a valid PDF from invoice HTML template
- [ ] Invoice PDF looks professional and includes all required info
- [ ] PDF includes BSA receipt IDs on filing line items
- [ ] PDF includes hybrid card-charge warning when applicable
- [ ] PDF includes company-specific rate (not hardcoded $75)
- [ ] `Invoice.pdf_url` gets populated after generation
- [ ] `Invoice.pdf_generated_at` gets set

### Email Delivery (Extending Existing)
- [ ] `send_invoice_email()` added to EXISTING email_service.py
- [ ] `get_invoice_email_html()` added to EXISTING email_service.py
- [ ] SendGrid Attachment imports added to existing imports
- [ ] SendGrid sends invoice email with PDF attachment
- [ ] Email includes invoice summary in body (not just attachment)
- [ ] Email includes hybrid warning when applicable
- [ ] `SENDGRID_ENABLED=true` is set in environment

### Admin UI (Enhancing Existing)
- [ ] Admin can generate PDF from billing page
- [ ] Admin can send invoice email from billing page
- [ ] Admin can download PDF from billing page
- [ ] Admin can resend invoice
- [ ] Admin can see overdue badges on past-due invoices
- [ ] Admin can edit billing_type per company in rates tab
- [ ] Admin can edit billing_email per company in rates tab
- [ ] TypeScript float bug fixed (line 108)

### Client UI (Enhancing Existing)
- [ ] Client admin can download their invoice PDFs
- [ ] Client admin sees due dates in invoice rows
- [ ] Client admin sees overdue indicators
- [ ] Client admin sees hybrid card-charge warning when applicable

### COO Dashboard (Enhancing Existing)
- [ ] COO dashboard shows overdue invoice alerts
- [ ] COO dashboard shows real collected revenue (not hardcoded $75)

### Cron / Automation
- [ ] Auto-invoice script generates correct invoices for previous month
- [ ] Auto-invoice script is idempotent (no duplicates)
- [ ] Auto-invoice --dry-run works correctly

### Documentation
- [ ] KilledSharks-2.md updated with Shark #52

### Unchanged (Verify No Regression)
- [ ] No billing access for client_user, pct_staff, party portal
- [ ] Existing billing endpoints still work
- [ ] Existing Mark as Sent / Paid / Void still work
- [ ] TypeScript compiles without errors

---

## DO NOT
- ❌ Do not implement Stripe integration in this prompt (Phase 3, separate prompt)
- ❌ Do not implement subscription billing (Phase 4, post-launch)
- ❌ Do not modify SDTM, RERX, or filing lifecycle code
- ❌ Do not remove existing billing endpoints — extend them
- ❌ Do not remove or rewrite existing KilledSharks entries — append only
