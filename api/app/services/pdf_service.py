"""
PDF Generation Service using PDFShift API

Generates professional PDF invoices from HTML templates.
When PDFShift is not configured, falls back to returning HTML only.
"""

import os
import base64
import logging
from typing import Optional, Tuple
from datetime import datetime

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# Brand Configuration
BRAND_NAME = "FinClear"
BRAND_TAGLINE = "FinCEN Compliance Made Simple"
BRAND_WEBSITE = "https://fincenclear.com"


class PDFResult:
    """Result of a PDF generation attempt."""
    def __init__(
        self,
        success: bool,
        pdf_bytes: Optional[bytes] = None,
        html_content: Optional[str] = None,
        error: Optional[str] = None
    ):
        self.success = success
        self.pdf_bytes = pdf_bytes
        self.html_content = html_content
        self.error = error
    
    def to_dict(self):
        return {
            "success": self.success,
            "has_pdf": self.pdf_bytes is not None,
            "error": self.error
        }


def generate_invoice_html(
    invoice_number: str,
    company_name: str,
    company_address: dict,
    billing_email: str,
    period_start: str,
    period_end: str,
    due_date: str,
    line_items: list,
    subtotal_cents: int,
    tax_cents: int,
    discount_cents: int,
    total_cents: int,
    status: str,
    payment_terms_days: int = 30,
    notes: Optional[str] = None,
) -> str:
    """Generate HTML for invoice PDF."""
    
    # Format currency
    def fmt_currency(cents: int) -> str:
        return f"${cents / 100:,.2f}"
    
    # Format date
    def fmt_date(date_str: str) -> str:
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime("%B %d, %Y")
        except:
            return date_str
    
    # Build address string
    addr = company_address or {}
    address_lines = []
    if addr.get("street"):
        address_lines.append(addr["street"])
    city_state_zip = []
    if addr.get("city"):
        city_state_zip.append(addr["city"])
    if addr.get("state"):
        city_state_zip.append(addr["state"])
    if addr.get("zip"):
        city_state_zip.append(addr["zip"])
    if city_state_zip:
        address_lines.append(", ".join(city_state_zip))
    address_html = "<br>".join(address_lines) if address_lines else "Address on file"
    
    # Build line items HTML
    line_items_html = ""
    for idx, item in enumerate(line_items, 1):
        item_total = item.get("total_cents", item.get("amount_cents", 0) * item.get("quantity", 1))
        line_items_html += f"""
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">{idx}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">{item.get('description', 'Filing Fee')}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item.get('quantity', 1)}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">{fmt_currency(item.get('amount_cents', 0))}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">{fmt_currency(item_total)}</td>
        </tr>
        """
    
    # Status badge color
    status_colors = {
        "draft": ("bg-slate-100", "#475569"),
        "sent": ("bg-blue-100", "#1d4ed8"),
        "paid": ("bg-green-100", "#15803d"),
        "overdue": ("bg-red-100", "#dc2626"),
        "void": ("bg-gray-100", "#6b7280"),
    }
    status_bg, status_color = status_colors.get(status, ("bg-slate-100", "#475569"))
    
    # Notes section
    notes_html = ""
    if notes:
        notes_html = f"""
        <div style="margin-top: 30px; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Notes:</strong> {notes}
            </p>
        </div>
        """
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {invoice_number}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            background-color: #ffffff;
        }}
        @page {{ size: A4; margin: 0; }}
    </style>
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto; padding: 40px;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 30px;">
            <div>
                <h1 style="font-size: 32px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">
                    {BRAND_NAME}
                </h1>
                <p style="font-size: 14px; color: #6b7280;">{BRAND_TAGLINE}</p>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">{BRAND_WEBSITE}</p>
            </div>
            <div style="text-align: right;">
                <div style="display: inline-block; padding: 8px 16px; border-radius: 8px; background-color: {status_bg.replace('bg-', '')};">
                    <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: {status_color};">
                        {status.upper()}
                    </span>
                </div>
                <h2 style="font-size: 28px; font-weight: 700; color: #1f2937; margin-top: 12px;">
                    INVOICE
                </h2>
                <p style="font-size: 18px; font-weight: 600; color: #1e40af; font-family: monospace;">
                    {invoice_number}
                </p>
            </div>
        </div>
        
        <!-- Bill To & Invoice Details -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
            <div style="flex: 1;">
                <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 8px;">
                    Bill To
                </p>
                <p style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                    {company_name}
                </p>
                <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
                    {address_html}
                </p>
                <p style="font-size: 14px; color: #4b5563; margin-top: 8px;">
                    {billing_email}
                </p>
            </div>
            <div style="text-align: right;">
                <table style="font-size: 14px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 12px; color: #6b7280;">Invoice Date:</td>
                        <td style="padding: 4px 0; font-weight: 500;">{fmt_date(period_end)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 12px; color: #6b7280;">Billing Period:</td>
                        <td style="padding: 4px 0; font-weight: 500;">{fmt_date(period_start)} - {fmt_date(period_end)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 12px; color: #6b7280;">Payment Terms:</td>
                        <td style="padding: 4px 0; font-weight: 500;">Net {payment_terms_days}</td>
                    </tr>
                    <tr style="background-color: #fef3c7; border-radius: 4px;">
                        <td style="padding: 8px 12px; color: #92400e; font-weight: 600;">Due Date:</td>
                        <td style="padding: 8px 0; font-weight: 700; color: #92400e;">{fmt_date(due_date)}</td>
                    </tr>
                </table>
            </div>
        </div>
        
        <!-- Line Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
                <tr style="background-color: #1e40af;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; width: 50px;">#</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff;">Description</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; width: 80px;">Qty</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; width: 120px;">Rate</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; width: 120px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                {line_items_html}
            </tbody>
        </table>
        
        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
            <table style="width: 300px; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 16px; font-size: 14px; color: #6b7280;">Subtotal</td>
                    <td style="padding: 8px 16px; font-size: 14px; text-align: right; font-weight: 500;">{fmt_currency(subtotal_cents)}</td>
                </tr>
                {"<tr><td style='padding: 8px 16px; font-size: 14px; color: #6b7280;'>Tax</td><td style='padding: 8px 16px; font-size: 14px; text-align: right;'>" + fmt_currency(tax_cents) + "</td></tr>" if tax_cents else ""}
                {"<tr><td style='padding: 8px 16px; font-size: 14px; color: #15803d;'>Discount</td><td style='padding: 8px 16px; font-size: 14px; text-align: right; color: #15803d;'>-" + fmt_currency(discount_cents) + "</td></tr>" if discount_cents else ""}
                <tr style="border-top: 2px solid #1e40af;">
                    <td style="padding: 16px; font-size: 18px; font-weight: 700; color: #1e40af;">Total Due</td>
                    <td style="padding: 16px; font-size: 24px; text-align: right; font-weight: 700; color: #1e40af;">{fmt_currency(total_cents)}</td>
                </tr>
            </table>
        </div>
        
        {notes_html}
        
        <!-- Payment Instructions -->
        <div style="margin-top: 40px; padding: 24px; background-color: #f0f9ff; border-radius: 12px; border: 1px solid #bae6fd;">
            <h3 style="font-size: 16px; font-weight: 600; color: #0369a1; margin-bottom: 12px;">
                Payment Information
            </h3>
            <div style="font-size: 14px; color: #0c4a6e;">
                <p style="margin-bottom: 8px;"><strong>ACH/Wire Transfer:</strong></p>
                <p style="margin-bottom: 4px;">Bank: Pacific Coast Bank</p>
                <p style="margin-bottom: 4px;">Account Name: Pacific Coast Title Company</p>
                <p style="margin-bottom: 4px;">Routing: XXXXXXXXX</p>
                <p style="margin-bottom: 12px;">Account: XXXXXXXXX</p>
                <p><strong>Reference:</strong> Please include invoice number <strong>{invoice_number}</strong> with your payment.</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af;">
                Thank you for your business! Questions? Contact billing@pctitle.com
            </p>
            <p style="font-size: 11px; color: #d1d5db; margin-top: 8px;">
                {BRAND_NAME} • {BRAND_TAGLINE}
            </p>
        </div>
        
    </div>
</body>
</html>
"""


async def generate_pdf(html_content: str) -> PDFResult:
    """
    Convert HTML to PDF using PDFShift API.
    
    If PDFShift is not configured, returns the HTML content for fallback display.
    """
    settings = get_settings()
    
    if not settings.pdfshift_configured:
        logger.info("[PDF] PDFShift not configured, returning HTML only")
        return PDFResult(
            success=True,
            html_content=html_content,
            error="PDFShift not configured - HTML returned instead"
        )
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.pdfshift.io/v3/convert/pdf",
                auth=(settings.PDFSHIFT_API_KEY, ""),
                json={
                    "source": html_content,
                    "landscape": False,
                    "format": "A4",
                    "margin": "0",
                },
            )
            
            if response.status_code == 200:
                logger.info("[PDF] Successfully generated PDF")
                return PDFResult(
                    success=True,
                    pdf_bytes=response.content,
                    html_content=html_content
                )
            else:
                error_msg = f"PDFShift API error: {response.status_code} - {response.text}"
                logger.error(f"[PDF] {error_msg}")
                return PDFResult(
                    success=False,
                    html_content=html_content,
                    error=error_msg
                )
                
    except Exception as e:
        error_msg = f"PDF generation failed: {str(e)}"
        logger.error(f"[PDF] {error_msg}")
        return PDFResult(
            success=False,
            html_content=html_content,
            error=error_msg
        )


def generate_certificate_html(
    certificate_id: str,
    property_address: str,
    purchase_price: float,
    buyer_name: str,
    escrow_number: Optional[str],
    exemption_reasons: list,
    determination_timestamp: str,
    determination_method: str,
    # Additional fields from wizard Step 0
    county: Optional[str] = None,
    apn: Optional[str] = None,
    legal_description: Optional[str] = None,
    closing_date: Optional[str] = None,
) -> str:
    """Generate HTML for FinCEN exemption certificate PDF with FinClear branding."""
    
    def fmt_currency(amount: float) -> str:
        return f"${amount:,.0f}"
    
    def fmt_date(date_str: str) -> str:
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime("%B %d, %Y")
        except:
            return date_str
    
    # Build exemption reasons HTML
    reasons_html = ""
    for reason in exemption_reasons:
        display = reason if isinstance(reason, str) else reason.get("display", str(reason))
        reasons_html += f"""
                        <li style="font-size: 14px; color: #334155; margin-bottom: 6px;">
                            {display}
                        </li>"""
    
    # Legal description — truncate if very long
    legal_desc_display = ""
    if legal_description:
        legal_desc_display = legal_description if len(legal_description) <= 80 else legal_description[:80] + "..."
    
    method_display = "Automated Client Submission Form" if determination_method == "auto_client_form" else determination_method
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exemption Certificate {certificate_id}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #334155;
            background-color: #ffffff;
        }}
        @page {{ size: A4; margin: 0; }}
    </style>
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto;">
        
        <!-- FinClear Header -->
        <div style="background-color: #0f172a; color: #ffffff; padding: 24px 40px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="vertical-align: middle;">
                        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin: 0;">
                            {BRAND_NAME}
                        </h1>
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">FinCEN Compliance Solutions</p>
                    </td>
                    <td style="text-align: right; vertical-align: middle;">
                        <p style="font-size: 13px; color: #94a3b8;">Exemption Certificate</p>
                        <p style="font-size: 11px; color: #64748b; margin-top: 4px;">
                            ID: {certificate_id}
                        </p>
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="padding: 40px;">
            
            <!-- Status Banner -->
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 24px; text-align: center; margin-bottom: 32px;">
                <p style="font-size: 18px; font-weight: 600; color: #92400e; margin: 0;">
                    Transaction Exempt from FinCEN Reporting
                </p>
                <p style="font-size: 13px; color: #b45309; margin-top: 4px;">
                    Per 31 CFR Part 1031 — Real Estate Reporting Rule
                </p>
            </div>
            
            <!-- Property Information -->
            <div style="margin-bottom: 28px;">
                <p style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px;">
                    Property Information
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px 0; width: 50%; vertical-align: top;">
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">Property Address</p>
                            <p style="font-size: 14px; font-weight: 500; color: #334155;">{property_address or '—'}</p>
                        </td>
                        <td style="padding: 6px 0; width: 50%; vertical-align: top;">
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">County</p>
                            <p style="font-size: 14px; font-weight: 500; color: #334155;">{county or '—'}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; vertical-align: top;">
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">APN</p>
                            <p style="font-size: 14px; font-weight: 500; color: #334155;">{apn or '—'}</p>
                        </td>
                        <td style="padding: 6px 0; vertical-align: top;">
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">Legal Description</p>
                            <p style="font-size: 14px; font-weight: 500; color: #334155;" title="{legal_description or ''}">{legal_desc_display or '—'}</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Transaction Details -->
            <div style="margin-bottom: 28px;">
                <p style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px;">
                    Transaction Details
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px 0; width: 33%; vertical-align: top;">
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">Escrow / File Number</p>
                            <p style="font-size: 14px; font-weight: 500; color: #334155;">{escrow_number or '—'}</p>
                        </td>
                        <td style="padding: 6px 0; width: 33%; vertical-align: top;">
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">Purchase Price</p>
                            <p style="font-size: 14px; font-weight: 500; color: #334155;">{fmt_currency(purchase_price) if purchase_price else '—'}</p>
                        </td>
                        <td style="padding: 6px 0; width: 33%; vertical-align: top;">
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">Closing Date</p>
                            <p style="font-size: 14px; font-weight: 500; color: #334155;">{closing_date or '—'}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; vertical-align: top;" colspan="3">
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">Buyer</p>
                            <p style="font-size: 14px; font-weight: 500; color: #334155;">{buyer_name or '—'}</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Exemption Determination -->
            <div style="margin-bottom: 28px;">
                <p style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px;">
                    Exemption Determination
                </p>
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px 24px;">
                    <p style="font-size: 14px; font-weight: 500; color: #334155; margin-bottom: 8px;">Reason(s):</p>
                    <ul style="padding-left: 20px; margin: 0;">
                        {reasons_html}
                    </ul>
                </div>
            </div>
            
            <!-- Certification Statement -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-bottom: 24px;">
                <p style="font-size: 13px; color: #64748b; line-height: 1.7;">
                    This certificate confirms that the above transaction was evaluated using the FinClear
                    compliance wizard on
                    <strong style="color: #334155;">{fmt_date(determination_timestamp)}</strong>
                    and determined to be exempt from FinCEN Real Estate Transaction reporting
                    requirements under 31 CFR Part 1031. This certificate should be retained with 
                    transaction records for a minimum of 5 years.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="font-size: 11px; color: #94a3b8;">
                            Generated by {BRAND_NAME} — {BRAND_WEBSITE}
                        </td>
                        <td style="font-size: 11px; color: #94a3b8; text-align: right;">
                            Certificate ID: {certificate_id}
                        </td>
                    </tr>
                </table>
            </div>
            
        </div>
    </div>
</body>
</html>"""


async def generate_certificate_pdf(
    certificate_id: str,
    property_address: str,
    purchase_price: float,
    buyer_name: str,
    escrow_number: Optional[str],
    exemption_reasons: list,
    determination_timestamp: str,
    determination_method: str,
    county: Optional[str] = None,
    apn: Optional[str] = None,
    legal_description: Optional[str] = None,
    closing_date: Optional[str] = None,
) -> PDFResult:
    """Generate a complete exemption certificate PDF."""
    html_content = generate_certificate_html(
        certificate_id=certificate_id,
        property_address=property_address,
        purchase_price=purchase_price,
        buyer_name=buyer_name,
        escrow_number=escrow_number,
        exemption_reasons=exemption_reasons,
        determination_timestamp=determination_timestamp,
        determination_method=determination_method,
        county=county,
        apn=apn,
        legal_description=legal_description,
        closing_date=closing_date,
    )
    return await generate_pdf(html_content)


async def generate_invoice_pdf(
    invoice_number: str,
    company_name: str,
    company_address: dict,
    billing_email: str,
    period_start: str,
    period_end: str,
    due_date: str,
    line_items: list,
    subtotal_cents: int,
    tax_cents: int,
    discount_cents: int,
    total_cents: int,
    status: str,
    payment_terms_days: int = 30,
    notes: Optional[str] = None,
) -> PDFResult:
    """
    Generate a complete invoice PDF.
    
    Returns PDFResult with pdf_bytes if successful, or html_content as fallback.
    """
    html_content = generate_invoice_html(
        invoice_number=invoice_number,
        company_name=company_name,
        company_address=company_address,
        billing_email=billing_email,
        period_start=period_start,
        period_end=period_end,
        due_date=due_date,
        line_items=line_items,
        subtotal_cents=subtotal_cents,
        tax_cents=tax_cents,
        discount_cents=discount_cents,
        total_cents=total_cents,
        status=status,
        payment_terms_days=payment_terms_days,
        notes=notes,
    )
    
    return await generate_pdf(html_content)
