# Cursor Prompt: Client Inquiry Form — "Get Started" Component

## Context

FinClear (fincenclear.com) currently uses `mailto:clear@fincenclear.com` links for all "Contact Us" CTAs. This is a missed opportunity. We need a polished, professional inquiry form that:

- Captures key information so our COO can qualify and follow up
- Feels welcoming and low-pressure — NOT a 15-field enterprise lead gen form
- Sends the inquiry to our team via email (SendGrid already configured)
- Gives the user a warm confirmation
- Works as both an embedded section on the homepage AND as a standalone modal/dialog

**Our audience:** Title company executives evaluating compliance solutions. They're busy professionals, not casual browsers. Respect their time. Make it easy. Make it professional.

**Support email:** `clear@fincenclear.com`

---

## PART 1: Frontend — Inquiry Form Component

### Create: `web/components/inquiry-form.tsx`

Build a clean, professional form component with the following specifications:

**Design Principles:**
- Clean, minimal, not cluttered
- Match the existing site design (check other components for color palette, fonts, spacing)
- Subtle card with light border or shadow — not a heavy modal unless triggered as one
- Form should feel like a conversation, not a government form
- Mobile-responsive
- No asterisks on fields — use subtle "Optional" labels where needed instead

**Fields (in this order):**

```
1. Full Name
   - Type: text input
   - Required: yes
   - Placeholder: "Your name"

2. Email
   - Type: email input
   - Required: yes
   - Placeholder: "you@yourcompany.com"

3. Company Name
   - Type: text input
   - Required: yes
   - Placeholder: "Your title company"

4. Phone
   - Type: tel input
   - Required: no
   - Placeholder: "(555) 555-5555"
   - Label note: "Optional"

5. Estimated Monthly Transactions
   - Type: select dropdown
   - Required: no
   - Options:
     - "" (placeholder: "Select range")
     - "1-10" → "1–10 transactions"
     - "11-50" → "11–50 transactions"
     - "51-100" → "51–100 transactions"
     - "100+" → "100+ transactions"
   - Label note: "Optional — helps us recommend the right plan"

6. Message
   - Type: textarea (3-4 rows)
   - Required: no
   - Placeholder: "Tell us about your compliance needs or any questions you have..."
   - Label note: "Optional"
```

**Form Header:**
```
Title: "Let's Get You Started"
Subtitle: "Tell us a bit about your company and we'll reach out within one business day."
```

**Submit Button:**
```
Text: "Send Inquiry"
Loading text: "Sending..."
Style: Primary button matching site CTA style
```

**Below the form (small text):**
```
"Or email us directly at clear@fincenclear.com"
"We typically respond within one business day."
```

**Success State:**

After successful submission, replace the form with a confirmation message:

```
Icon: ✓ checkmark (green)
Title: "Thank you, {name}!"
Message: "We've received your inquiry and will be in touch within one business day. 
          Keep an eye on {email} for our response."
Secondary: "In the meantime, feel free to explore our platform demo."
Button: "Try the Demo" → link to /login
Secondary link: "Back to Home" → link to /
```

**Error State:**

If submission fails, show an inline error:
```
"Something went wrong. Please try again or email us directly at clear@fincenclear.com"
```

**Form Validation:**
- Name: required, min 2 characters
- Email: required, valid email format
- Company: required, min 2 characters
- Phone: optional, if provided validate it looks like a phone number
- Client-side validation with friendly messages (not red angry text — use subtle amber/yellow)
- Disable submit button until required fields are valid

**Component Props:**

```typescript
interface InquiryFormProps {
  variant?: "standalone" | "embedded" | "modal"
  // standalone: full page with padding
  // embedded: no outer padding, meant to be placed inside a section
  // modal: compact layout for dialog/sheet
  onSuccess?: () => void
  // callback after successful submission (e.g., close modal)
}
```

### API Call

The form should POST to `/api/inquiry` (Next.js API route):

```typescript
const response = await fetch("/api/inquiry", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    email,
    company,
    phone: phone || null,
    monthly_transactions: monthlyTransactions || null,
    message: message || null,
  }),
})
```

---

## PART 2: Next.js API Route

### Create: `web/app/api/inquiry/route.ts`

This route receives the form data and sends a formatted email to `clear@fincenclear.com` via the backend, OR directly via SendGrid if a frontend SendGrid key is available.

**Preferred approach: Proxy to backend API**

```typescript
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { name, email, company } = body
    if (!name || !email || !company) {
      return NextResponse.json(
        { error: "Name, email, and company are required" },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      )
    }

    // Forward to backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL
    const response = await fetch(`${API_URL}/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error("Backend inquiry error:", response.status)
      // Fallback: still return success to user, log for manual follow-up
      // We don't want a backend glitch to lose a lead
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Inquiry submission error:", error)
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    )
  }
}
```

---

## PART 3: Backend API Endpoint

### Create or add to: `api/app/routes/inquiries.py`

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inquiries", tags=["inquiries"])


class InquiryRequest(BaseModel):
    name: str
    email: EmailStr
    company: str
    phone: Optional[str] = None
    monthly_transactions: Optional[str] = None
    message: Optional[str] = None


@router.post("")
async def submit_inquiry(inquiry: InquiryRequest):
    """
    Receive a client inquiry and send notification email to clear@fincenclear.com.
    No auth required — this is a public endpoint.
    """
    try:
        # Send email notification to the team
        await send_inquiry_notification(inquiry)
        
        logger.info(f"Inquiry received: {inquiry.company} ({inquiry.email})")
        
        return {"success": True, "message": "Inquiry received"}
    except Exception as e:
        logger.error(f"Failed to process inquiry: {e}")
        # Still return success to user — we don't want to lose the lead
        # Log the error for manual follow-up
        return {"success": True, "message": "Inquiry received"}
```

### Add to: `api/app/services/email_service.py`

Add an inquiry notification email function:

```python
async def send_inquiry_notification(inquiry):
    """
    Send a formatted inquiry notification to clear@fincenclear.com.
    Uses SendGrid (already configured).
    """
    subject = f"New FinClear Inquiry: {inquiry.company}"
    
    # Build a clean HTML email for the team
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">New Client Inquiry</h2>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 160px;">Name</td>
                    <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">{inquiry.name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
                    <td style="padding: 8px 0; font-size: 14px;">
                        <a href="mailto:{inquiry.email}" style="color: #2563eb;">{inquiry.email}</a>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Company</td>
                    <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">{inquiry.company}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td>
                    <td style="padding: 8px 0; font-size: 14px;">{inquiry.phone or '—'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Est. Monthly Volume</td>
                    <td style="padding: 8px 0; font-size: 14px;">{inquiry.monthly_transactions or '—'}</td>
                </tr>
            </table>
            
            {"<div style='margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 6px;'><p style=\"color: #64748b; font-size: 13px; margin: 0 0 4px;\">Message</p><p style=\"font-size: 14px; margin: 0; white-space: pre-wrap;\">" + inquiry.message + "</p></div>" if inquiry.message else ""}
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <a href="mailto:{inquiry.email}?subject=Re: FinClear Inquiry from {inquiry.company}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
                    Reply to {inquiry.name}
                </a>
            </div>
        </div>
    </div>
    """
    
    # Plain text fallback
    text_content = f"""
New FinClear Inquiry

Name: {inquiry.name}
Email: {inquiry.email}
Company: {inquiry.company}
Phone: {inquiry.phone or 'Not provided'}
Monthly Transactions: {inquiry.monthly_transactions or 'Not provided'}

Message:
{inquiry.message or 'No message provided'}

---
Reply to this inquiry: mailto:{inquiry.email}
"""
    
    # Use existing SendGrid send function
    # Send TO clear@fincenclear.com
    # From: noreply@fincenclear.com (or whatever your SendGrid verified sender is)
    await send_email(
        to_email="clear@fincenclear.com",
        subject=subject,
        html_content=html_content,
        text_content=text_content,
    )
```

### Register the router

In `api/app/routes/__init__.py`, add:
```python
from .inquiries import router as inquiries_router
```

In `api/app/main.py`, register:
```python
app.include_router(inquiries_router)
```

**IMPORTANT: No authentication required on this endpoint.** It's a public contact form.

**Rate limiting consideration:** Add basic rate limiting to prevent spam. Simple approach:

```python
from datetime import datetime, timedelta
from collections import defaultdict

# Simple in-memory rate limit (resets on deploy)
_inquiry_timestamps: dict[str, list[datetime]] = defaultdict(list)
MAX_INQUIRIES_PER_EMAIL = 3  # per hour

@router.post("")
async def submit_inquiry(inquiry: InquiryRequest):
    # Basic rate limit by email
    now = datetime.utcnow()
    hour_ago = now - timedelta(hours=1)
    
    # Clean old entries
    _inquiry_timestamps[inquiry.email] = [
        t for t in _inquiry_timestamps[inquiry.email] if t > hour_ago
    ]
    
    if len(_inquiry_timestamps[inquiry.email]) >= MAX_INQUIRIES_PER_EMAIL:
        logger.warning(f"Rate limited inquiry from {inquiry.email}")
        # Still return success — don't reveal rate limiting to potential abusers
        return {"success": True, "message": "Inquiry received"}
    
    _inquiry_timestamps[inquiry.email].append(now)
    
    # ... rest of handler
```

---

## PART 4: Integration Points

### Homepage CTA Section

In `web/components/cta-section.tsx`, replace the current CTA buttons with the inquiry form embedded inline:

```tsx
import { InquiryForm } from "@/components/inquiry-form"

// In the CTA section, replace the buttons with:
<InquiryForm variant="embedded" />
```

Or if you prefer to keep the CTA section as a teaser and open a modal:

```tsx
import { useState } from "react"
import { InquiryForm } from "@/components/inquiry-form"
// Use whatever dialog/modal component is available (shadcn Dialog, or build a simple one)

const [showInquiry, setShowInquiry] = useState(false)

// CTA button:
<button onClick={() => setShowInquiry(true)}>
  Get Started
</button>

// Modal:
{showInquiry && (
  <Dialog open={showInquiry} onOpenChange={setShowInquiry}>
    <DialogContent className="max-w-lg">
      <InquiryForm 
        variant="modal" 
        onSuccess={() => {
          // Keep modal open to show success state
          // Or close after 3 seconds:
          // setTimeout(() => setShowInquiry(false), 3000)
        }} 
      />
    </DialogContent>
  </Dialog>
)}
```

### Header CTA

In `web/components/header.tsx`, the "Contact Us" button (formerly "Start Free Trial") should either:

**Option A: Scroll to inquiry form on homepage**
```tsx
<a href="#get-started" className="...">Get Started</a>
```
And give the CTA section an id:
```tsx
<section id="get-started">
  <InquiryForm variant="embedded" />
</section>
```

**Option B: Open modal**
Same modal pattern as above. This is better if you want the form accessible from any scroll position.

**Recommendation: Use Option A for homepage, Option B for header on non-homepage routes.**

When the user is on the homepage, "Get Started" scrolls to the form. When on other pages (help, terms, privacy), it opens a modal.

### Pricing Section CTAs

In `web/components/pricing-section.tsx`, change the "Contact Us" buttons to also trigger the inquiry form:

```tsx
// Each pricing tier CTA could scroll to #get-started
// OR open the modal
// The simplest approach: all "Contact Us" buttons scroll to the form
<a href="#get-started" className="...">
  Get Started
</a>
```

### Mobile CTA Bar

In `web/components/mobile-cta-bar.tsx`, change to:
```tsx
<a href="#get-started" className="...">
  Get Started
</a>
```

---

## PART 5: Create Contact Page (Optional but Recommended)

### Create: `web/app/(marketing)/contact/page.tsx`

A simple contact page that wraps the inquiry form:

```tsx
import { Metadata } from "next"
import { InquiryForm } from "@/components/inquiry-form"

export const metadata: Metadata = {
  title: "Contact Us | FinClear",
  description: "Get in touch with the FinClear team for FinCEN compliance solutions",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Talk to Our Team
          </h1>
          <p className="text-lg text-gray-600">
            Whether you're evaluating compliance solutions or ready to get started,
            we're here to help.
          </p>
        </div>
        
        <InquiryForm variant="standalone" />
        
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Prefer email? Reach us at{" "}
            <a href="mailto:clear@fincenclear.com" className="text-blue-600 hover:text-blue-700 font-medium">
              clear@fincenclear.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
```

Update the footer "Contact" link to point to `/contact` instead of the mailto.

---

## PART 6: Auto-Response Email to Inquirer (Optional Enhancement)

If time allows, also send a confirmation email TO the person who inquired:

```python
async def send_inquiry_confirmation(inquiry):
    """Send a confirmation email to the person who submitted the inquiry."""
    
    subject = "We received your inquiry — FinClear"
    
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 32px 24px;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">Hi {inquiry.name},</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Thank you for your interest in FinClear. We've received your inquiry 
                and a member of our team will be in touch within one business day.
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                In the meantime, if you have any questions, don't hesitate to reply 
                to this email or reach us at 
                <a href="mailto:clear@fincenclear.com" style="color: #2563eb;">clear@fincenclear.com</a>.
            </p>
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                    PCT FinCEN Solutions — A subsidiary of Pacific Coast Title Company<br>
                    <a href="https://www.fincenclear.com" style="color: #2563eb;">www.fincenclear.com</a>
                </p>
            </div>
        </div>
    </div>
    """
    
    await send_email(
        to_email=inquiry.email,
        subject=subject,
        html_content=html_content,
    )
```

Call this from the inquiry handler alongside the team notification.

---

## Verification Checklist

After implementation, verify:

- [ ] `InquiryForm` component renders correctly in all three variants (standalone, embedded, modal)
- [ ] Form validates required fields (name, email, company) before submission
- [ ] Email validation catches obvious invalid formats
- [ ] Submit button disables during submission
- [ ] Success state displays after successful submission with personalized name/email
- [ ] Error state displays on failure with fallback email
- [ ] Backend receives POST to `/inquiries` with correct payload
- [ ] Email arrives at `clear@fincenclear.com` with formatted HTML
- [ ] Email includes "Reply to" button/link
- [ ] Rate limiting prevents >3 submissions per email per hour
- [ ] Router registered in `__init__.py` and `main.py`
- [ ] No authentication required on `/inquiries` endpoint
- [ ] CTA section on homepage uses the form (embedded or modal)
- [ ] Header "Get Started" connects to the form
- [ ] Mobile CTA connects to the form
- [ ] `/contact` page exists and renders the form
- [ ] Form works on mobile
- [ ] No console errors

---

## DO NOT:
- Require a login to submit an inquiry
- Ask for sensitive info (SSN, EIN, account numbers)
- Add CAPTCHA (we're not getting that much traffic yet — rate limiting is enough)
- Make the phone or volume fields required
- Use a third-party form service (Typeform, Jotform, etc.)
- Store inquiries in the database (email delivery is sufficient for now — DB storage is a Phase 2 enhancement)
