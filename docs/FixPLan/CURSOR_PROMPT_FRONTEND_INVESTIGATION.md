# Cursor Prompt: Frontend Investigation — Public-Facing Pages

## Context

We are preparing fincenclear.com for a March 1, 2026 production launch. The marketing site and public-facing pages need a thorough audit. We need to:

1. Remove all references to "free signup", "free trial", "trial period", or self-service signup
2. Our model: Users contact us → COO creates their company account on the admin side → Users receive login credentials
3. Support email `clear@fincenclear.com` must be prominently displayed
4. Footer needs cleanup (remove dead/placeholder links)
5. Legal pages (Terms, Privacy, User Agreement) need to be created or updated
6. Copy must be sharp, professional, and compliance-focused — not generic SaaS

## Your Task: INVESTIGATION ONLY (Do Not Modify Files Yet)

Read every file listed below and produce a structured report. Do NOT make any changes.

---

## Step 1: Find and Read All Public-Facing Pages

Read these files (and any others you discover in the public route structure):

```
# Homepage / Landing
web/app/page.tsx
web/app/layout.tsx

# Any marketing or public routes (check for these patterns)
web/app/(marketing)/
web/app/(public)/
web/app/(landing)/
web/app/about/
web/app/pricing/
web/app/features/
web/app/contact/
web/app/terms/
web/app/privacy/
web/app/legal/

# Login / Signup pages
web/app/login/
web/app/signup/
web/app/sign-up/
web/app/register/
web/app/api/auth/

# Components used on public pages
web/components/Header.tsx (or Navbar, Nav, TopBar, etc.)
web/components/Footer.tsx (or footer, SiteFooter, etc.)
web/components/Hero.tsx
web/components/CTA.tsx
web/components/Pricing*.tsx
web/components/Features*.tsx
web/components/landing/
web/components/marketing/
```

Also run:
```bash
# Find ALL page.tsx files to map the full route structure
find web/app -name "page.tsx" -type f | sort

# Find all layout.tsx files
find web/app -name "layout.tsx" -type f | sort

# Find any component with marketing/landing/hero/footer/header/cta in the name
find web/components -type f -name "*.tsx" | grep -iE "(header|footer|nav|hero|cta|pricing|feature|landing|marketing|banner|signup|login)" | sort

# Find all references to "free" or "trial" in the frontend
grep -rn -i "free\|trial\|sign.up\|signup\|register\|get.started" web/app/ web/components/ --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" | grep -v node_modules | grep -v ".next"

# Find all references to support email or contact info
grep -rn -i "email\|contact\|support\|@fincen\|@pct\|clear@" web/app/ web/components/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"

# Find all external links in footer or nav
grep -rn "href=" web/components/ --include="*.tsx" | grep -iE "(footer|nav|header)" | grep -v node_modules

# Find any terms/privacy/legal page references
grep -rn -i "terms\|privacy\|legal\|agreement\|policy\|disclaimer" web/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"
```

---

## Step 2: Produce This Report

### A. Route Map
List every public-facing route (not behind auth) with:
- File path
- What the page does
- Line count

### B. Copy Audit — Problems Found
For each file, list every instance of problematic copy:
- "Free" anything (free trial, free signup, free plan, etc.)
- "Trial" anything
- Self-service signup language ("Create your account", "Get started free", "Sign up now")
- Generic SaaS copy that doesn't match our model
- Missing or wrong contact information
- Placeholder text (Lorem ipsum, TODO, TBD, etc.)

Format:
```
FILE: web/app/page.tsx
  Line 45: "Start your free trial today" ← REMOVE
  Line 78: "Sign up in seconds" ← REWRITE (should be "Contact us to get started")
  Line 112: "No credit card required" ← REMOVE
```

### C. Footer Audit
List every link in the footer with:
- Link text
- href destination
- Status: WORKING / BROKEN / PLACEHOLDER / MISSING PAGE

### D. Header/Nav Audit
List every link in the header/navigation with:
- Link text
- href destination
- Status: WORKING / BROKEN / PLACEHOLDER

### E. Legal Pages Status
For each of these, report: EXISTS / MISSING / STUB
- Terms of Service / Terms & Conditions
- Privacy Policy
- User Agreement / Terms of Use
- Disclaimer
- Cookie Policy

If any exist, report their line count and whether they contain real content or placeholder text.

### F. Support Email Visibility
Report every place the support email appears (or should appear):
- Header? Y/N
- Footer? Y/N
- Contact page? Y/N (does contact page exist?)
- Login page? Y/N
- Error pages? Y/N
- 404 page? Y/N

### G. Signup/Login Flow
Document the current signup/login flow:
- Is there a public signup page? What does it say?
- Is there a public login page? What does it say?
- Are there any "Get Started" or "Sign Up" CTAs? Where?
- What happens when someone clicks them?

### H. Component Inventory (Public-Facing Only)
List every component used on public pages:
- Component name
- File path
- What it renders
- Any props that control copy/content

### I. Image/Asset Audit
```bash
# Find images used on public pages
find web/public -type f | sort
find web/assets -type f 2>/dev/null | sort
```
List any placeholder images, stock photos, or missing assets.

### J. Meta Tags / SEO
Check for:
- Page titles
- Meta descriptions
- OG tags
- Favicon

---

## Step 3: Summary Recommendations

After completing the audit, provide:

1. **Quick Wins** (< 30 min each) — copy fixes, link removals
2. **Medium Effort** (1-2 hours) — page rewrites, component updates
3. **Needs Creation** — pages or components that don't exist yet but should
4. **Legal Pages Needed** — which legal documents are missing

---

## IMPORTANT RULES

- **DO NOT modify any files.** This is investigation only.
- **Read every file completely** — don't skim or assume.
- **Be exact** — include line numbers for every issue found.
- **Be thorough** — check every route, every component, every link.
- If a file doesn't exist, say so explicitly.
- If you find something unexpected (like a page that shouldn't be public, or debug routes), flag it.
