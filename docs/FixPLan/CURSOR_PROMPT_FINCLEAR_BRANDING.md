# CURSOR PROMPT: FinClear Branding Update - Logos & Name Everywhere

## OBJECTIVE

Update the entire application with the new FinClear branding:
- **Logo (dark text):** `logo_2x.png` → Use on light/white backgrounds
- **Logo (white text):** `logo-white_2x.png` → Use on dark backgrounds
- **Dashboard Logo:** `dash-logo_2x.png` → Use in sidebar/compact spaces

**Brand Name:** FinClear (was "PCT FinCEN Solutions")

---

## PART 1: Add Logo Files to Public Directory

### Copy logos to the correct location:

```
web/public/
├── logo.png              (rename from logo_2x.png - dark text, light bg)
├── logo-white.png        (rename from logo-white_2x.png - white text, dark bg)
├── logo-icon.png         (rename from dash-logo_2x.png - sidebar/compact)
├── favicon.ico           (generate from logo-icon or create)
└── og-image.png          (create OpenGraph image with logo)
```

**File placement:**
```bash
# In web/public/
logo.png          # Full logo for light backgrounds
logo-white.png    # Full logo for dark backgrounds  
logo-icon.png     # Compact "FC" logo for sidebar
```

---

## PART 2: Update Brand Name Constants

### Create a central brand config file:

**File:** `web/lib/brand.ts`

```typescript
export const BRAND = {
  name: "FinClear",
  legalName: "FinClear Solutions",
  tagline: "FinCEN Compliance Made Simple",
  domain: "fincenclear.com",
  supportEmail: "support@fincenclear.com",
  
  // Logo paths
  logo: "/logo.png",              // Light backgrounds
  logoWhite: "/logo-white.png",   // Dark backgrounds
  logoIcon: "/logo-icon.png",     // Sidebar/compact
  
  // Social
  twitter: "@finclear",
  linkedin: "finclear",
} as const;

export type Brand = typeof BRAND;
```

---

## PART 3: Update Landing Page / Marketing

**File:** `web/app/page.tsx` (or marketing components)

### Navbar Logo (dark background):
```tsx
import { BRAND } from "@/lib/brand";

// In navbar (dark background)
<Link href="/" className="flex items-center gap-2">
  <img 
    src={BRAND.logoWhite} 
    alt={BRAND.name} 
    className="h-8 w-auto"
  />
</Link>
```

### Footer Logo (dark background):
```tsx
// In footer (dark background)
<div className="flex items-center gap-2">
  <img 
    src={BRAND.logoWhite} 
    alt={BRAND.name} 
    className="h-10 w-auto"
  />
</div>
<p className="text-slate-400 text-sm mt-4">
  © 2026 {BRAND.legalName}. All rights reserved.
</p>
```

### Hero Section:
```tsx
// Update any text references
<h1>
  FinCEN Compliance
  <span className="gradient-text">Made Simple</span>
</h1>

// Trust indicators
<span>Powered by {BRAND.name}</span>
```

---

## PART 4: Update App Sidebar

**File:** `web/components/app-sidebar.tsx` (or similar)

### Sidebar Logo (compact icon):
```tsx
import { BRAND } from "@/lib/brand";

// Sidebar header - use compact logo
<div className="flex items-center gap-3 px-4 py-4 border-b">
  <img 
    src={BRAND.logoIcon} 
    alt={BRAND.name} 
    className="h-8 w-8"
  />
  <span className="font-bold text-lg text-slate-900">
    {BRAND.name}
  </span>
</div>

// Or if sidebar is collapsible:
{isCollapsed ? (
  <img 
    src={BRAND.logoIcon} 
    alt={BRAND.name} 
    className="h-8 w-8"
  />
) : (
  <img 
    src={BRAND.logo} 
    alt={BRAND.name} 
    className="h-8 w-auto"
  />
)}
```

---

## PART 5: Update Login Page

**File:** `web/app/login/page.tsx` (or auth pages)

### Login - typically has dark left panel:
```tsx
import { BRAND } from "@/lib/brand";

// Left side (dark background)
<div className="bg-slate-900 p-12">
  <img 
    src={BRAND.logoWhite} 
    alt={BRAND.name} 
    className="h-12 w-auto mb-8"
  />
  <h2 className="text-3xl font-bold text-white">
    {BRAND.tagline}
  </h2>
</div>

// Right side (light background) - form area
<div className="bg-white p-12">
  <h1 className="text-2xl font-bold">Welcome to {BRAND.name}</h1>
  ...
</div>
```

---

## PART 6: Update Party Portal

**File:** `web/app/p/[token]/page.tsx`

### Party Portal Header:
```tsx
import { BRAND } from "@/lib/brand";

// Portal typically has light header
<header className="bg-white border-b px-6 py-4">
  <div className="flex items-center justify-between max-w-4xl mx-auto">
    <img 
      src={BRAND.logo} 
      alt={BRAND.name} 
      className="h-8 w-auto"
    />
    <div className="text-sm text-muted-foreground">
      Secure Compliance Portal
    </div>
  </div>
</header>

// Footer
<footer className="bg-slate-50 border-t px-6 py-8 mt-12">
  <div className="max-w-4xl mx-auto text-center">
    <img 
      src={BRAND.logo} 
      alt={BRAND.name} 
      className="h-6 w-auto mx-auto mb-4 opacity-50"
    />
    <p className="text-sm text-muted-foreground">
      Powered by {BRAND.name} • {BRAND.tagline}
    </p>
    <p className="text-xs text-muted-foreground mt-2">
      Questions? Contact {BRAND.supportEmail}
    </p>
  </div>
</footer>
```

---

## PART 7: Update Email Templates

**File:** `api/app/services/email.py` (or email templates)

### Email Header with Logo:
```python
import os

BRAND_NAME = "FinClear"
BRAND_TAGLINE = "FinCEN Compliance Made Simple"
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://fincenclear.com")
LOGO_URL = f"{FRONTEND_URL}/logo.png"
SUPPORT_EMAIL = "support@fincenclear.com"

def get_email_header():
    return f"""
    <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
        <img src="{LOGO_URL}" alt="{BRAND_NAME}" style="height: 40px; width: auto;" />
    </div>
    """

def get_email_footer():
    return f"""
    <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; margin-top: 32px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
            Powered by {BRAND_NAME} • {BRAND_TAGLINE}
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
            Questions? Contact <a href="mailto:{SUPPORT_EMAIL}" style="color: #0d9488;">{SUPPORT_EMAIL}</a>
        </p>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 16px;">
            © 2026 {BRAND_NAME}. All rights reserved.
        </p>
    </div>
    """
```

### Party Invitation Email:
```python
def send_party_invitation(party_email: str, party_name: str, token: str, property_address: str, party_role: str):
    portal_link = f"{FRONTEND_URL}/p/{token}"
    
    subject = f"Action Required: Complete Your {BRAND_NAME} Compliance Form"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            {get_email_header()}
            
            <div style="padding: 32px 24px;">
                <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 16px 0;">
                    Hello {party_name},
                </h1>
                
                <p style="color: #475569; margin: 0 0 24px 0;">
                    You are listed as the <strong>{party_role}</strong> in a real estate transaction 
                    and are required to provide information for FinCEN compliance reporting.
                </p>
                
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 4px 0;">Property Address</p>
                    <p style="color: #1e293b; font-weight: 600; margin: 0;">{property_address}</p>
                </div>
                
                <p style="color: #475569; margin: 0 0 24px 0;">
                    Please click the button below to access your secure form. This typically takes 5-10 minutes to complete.
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="{portal_link}" 
                       style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); 
                              color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; 
                              font-weight: 600; font-size: 16px;">
                        Complete Your Form
                    </a>
                </div>
                
                <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0 0;">
                    This link is unique to you and expires in 30 days. Please do not share it.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                    If the button doesn't work, copy and paste this link into your browser:<br/>
                    <a href="{portal_link}" style="color: #0d9488; word-break: break-all;">{portal_link}</a>
                </p>
            </div>
            
            {get_email_footer()}
            
        </div>
    </body>
    </html>
    """
    
    # Send via SendGrid
    send_email(to=party_email, subject=subject, html_content=html_content)
```

---

## PART 8: Update Metadata & Favicon

**File:** `web/app/layout.tsx`

```tsx
import { BRAND } from "@/lib/brand";
import { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BRAND.domain}`),
  title: {
    default: `${BRAND.name} - ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: `The most comprehensive FinCEN Real Estate Reporting compliance platform for title companies. Determine requirements in 2 minutes. File in 10 minutes.`,
  icons: {
    icon: "/logo-icon.png",
    shortcut: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `https://${BRAND.domain}`,
    siteName: BRAND.name,
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: `The most comprehensive FinCEN Real Estate Reporting compliance platform for title companies.`,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: `The most comprehensive FinCEN Real Estate Reporting compliance platform for title companies.`,
    images: ["/og-image.png"],
  },
};
```

---

## PART 9: Search and Replace Old Names

### Find and replace these strings throughout the codebase:

| Find | Replace With |
|------|--------------|
| `PCT FinCEN Solutions` | `FinClear` |
| `PCT FinCEN` | `FinClear` |
| `PCT-FinCEN` | `FinClear` |
| `pct-fincen` | `finclear` (in URLs, file names) |
| `pctfincen` | `finclear` |

### Files to check:
- All page titles
- All component text
- Error messages
- Toast notifications
- Email subjects/content
- Console logs (if user-facing)
- Alt text on images
- Placeholder text

### Search command:
```bash
# Find all occurrences
grep -ri "PCT FinCEN" web/
grep -ri "PCT-FinCEN" web/
grep -ri "pct-fincen" web/
grep -ri "pctfincen" web/

# In API
grep -ri "PCT FinCEN" api/
grep -ri "PCT-FinCEN" api/
```

---

## PART 10: Update Admin & Dashboard Headers

**File:** `web/components/dashboard-header.tsx` (or similar)

```tsx
import { BRAND } from "@/lib/brand";

// Dashboard header (light background)
<header className="bg-white border-b px-6 py-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <img 
        src={BRAND.logo} 
        alt={BRAND.name} 
        className="h-8 w-auto hidden md:block"
      />
      {/* Mobile: show icon only */}
      <img 
        src={BRAND.logoIcon} 
        alt={BRAND.name} 
        className="h-8 w-8 md:hidden"
      />
    </div>
    {/* ... rest of header */}
  </div>
</header>
```

---

## PART 11: Loading & Error States

Update any loading screens or error pages:

**File:** `web/app/loading.tsx`
```tsx
import { BRAND } from "@/lib/brand";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <img 
          src={BRAND.logoIcon} 
          alt={BRAND.name} 
          className="h-12 w-12 mx-auto mb-4 animate-pulse"
        />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
```

**File:** `web/app/not-found.tsx`
```tsx
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <img 
          src={BRAND.logo} 
          alt={BRAND.name} 
          className="h-10 w-auto mx-auto mb-8 opacity-50"
        />
        <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
        <p className="text-muted-foreground mb-8">Page not found</p>
        <Button asChild>
          <Link href="/">Back to {BRAND.name}</Link>
        </Button>
      </div>
    </div>
  );
}
```

---

## PART 12: Create OpenGraph Image

Create a simple OG image for social sharing:

**File:** `web/public/og-image.png`

Should be 1200x630 pixels with:
- FinClear logo (white version)
- Dark gradient background (slate-900 to teal-900)
- Tagline: "FinCEN Compliance Made Simple"

Can create programmatically or design in Figma/Canva.

---

## VERIFICATION CHECKLIST

After implementing, verify logos appear correctly:

### Light Backgrounds (use logo.png):
- [ ] Login page - right side (form area)
- [ ] Party portal header
- [ ] Party portal footer
- [ ] Dashboard header
- [ ] Request success pages
- [ ] Error pages
- [ ] Email templates (header)

### Dark Backgrounds (use logo-white.png):
- [ ] Landing page navbar
- [ ] Landing page footer
- [ ] Login page - left side (branding area)
- [ ] Hero sections
- [ ] Dark CTA sections

### Compact/Sidebar (use logo-icon.png):
- [ ] App sidebar (collapsed state)
- [ ] Mobile header
- [ ] Favicon
- [ ] Loading states
- [ ] Small UI elements

### Name Updates:
- [ ] Page titles say "FinClear"
- [ ] Navbar shows "FinClear"
- [ ] Footer shows "FinClear"
- [ ] Emails show "FinClear"
- [ ] No "PCT FinCEN" text remaining

---

## UPDATE KilledSharks.md

```markdown
---

### 15. FinClear Branding Update ✅

**Task:** Replace all PCT FinCEN Solutions branding with new FinClear brand

**Logo Files:**
- `logo.png` - Full logo, dark text (light backgrounds)
- `logo-white.png` - Full logo, white text (dark backgrounds)
- `logo-icon.png` - Compact "FC" coin icon (sidebar, favicon)

**Usage Guidelines Implemented:**

| Context | Logo Used |
|---------|-----------|
| Light backgrounds | logo.png |
| Dark backgrounds | logo-white.png |
| Sidebar/compact | logo-icon.png |
| Favicon | logo-icon.png |
| Email headers | logo.png |
| Social/OpenGraph | logo-white.png on dark bg |

**Files Created:**
- `web/lib/brand.ts` - Central brand constants
- `web/public/logo.png`
- `web/public/logo-white.png`
- `web/public/logo-icon.png`
- `web/public/og-image.png`

**Files Updated:**
- `web/app/layout.tsx` (metadata, favicon)
- `web/app/page.tsx` (landing page)
- `web/app/login/page.tsx`
- `web/app/p/[token]/page.tsx` (party portal)
- `web/components/app-sidebar.tsx`
- `web/components/dashboard-header.tsx`
- `api/app/services/email.py` (email templates)
- All pages with "PCT FinCEN" text

**Search & Replace:**
- "PCT FinCEN Solutions" → "FinClear"
- "PCT FinCEN" → "FinClear"

**Status:** ✅ Killed
```

---

## SUMMARY

| Location | Logo | Variable |
|----------|------|----------|
| Landing navbar (dark) | logo-white.png | `BRAND.logoWhite` |
| Landing footer (dark) | logo-white.png | `BRAND.logoWhite` |
| Login left panel (dark) | logo-white.png | `BRAND.logoWhite` |
| Login form area (light) | logo.png | `BRAND.logo` |
| App sidebar | logo-icon.png | `BRAND.logoIcon` |
| Dashboard header (light) | logo.png | `BRAND.logo` |
| Party portal (light) | logo.png | `BRAND.logo` |
| Emails | logo.png | via URL |
| Favicon | logo-icon.png | `BRAND.logoIcon` |
| OpenGraph | logo-white.png | on dark bg |

**Brand name:** FinClear (everywhere!)
