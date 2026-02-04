# Cursor Prompt: Frontend Remediation — Copy, Footer, Email, CTAs

## Context

FinClear (fincenclear.com) is a compliance SaaS platform launching March 1, 2026. A frontend investigation revealed critical issues:

- 11 instances of "Start Free Trial" across 6 files
- 2 instances of "No credit card required"
- Wrong support email in 4+ places
- Placeholder footer links to nonexistent pages
- No legal pages (Terms, Privacy)
- Support email `clear@fincenclear.com` not visible in header or footer

**Our business model is NOT self-service.**  
Users do NOT sign up on their own. Our COO creates company accounts. Users receive credentials after onboarding.  
There is no free trial. There is no signup page. This is intentional.

**Support email:** `clear@fincenclear.com`  
**Support phone:** (leave as empty/hidden until Jerry provides a real number — do NOT use a placeholder like 555-xxx)

---

## TASK 1: Remove All "Free Trial" and Self-Service Language

### File: `web/components/header.tsx`

**Line ~96 (desktop CTA button):**
- Change "Start Free Trial" → "Contact Us"
- Make it a link: `<a href="mailto:clear@fincenclear.com">` or `<Link href="/contact">`
- Keep the button styling but change the intent

**Line ~125 (mobile menu CTA button):**
- Same change: "Start Free Trial" → "Contact Us"
- Same link behavior

### File: `web/components/hero-section.tsx`

**Line ~47 (main hero CTA):**
- Change "Start Free Trial" → "Get Started"
- Link to `mailto:clear@fincenclear.com` or scroll to `#contact`
- Alternative copy options: "Request Access" or "Schedule a Demo" or "Talk to Our Team"

**Line ~63:**
- REMOVE the entire "No credit card required" trust indicator line
- Replace with: "Trusted by title companies across California" or similar credibility line
- Or simply remove and leave the space clean

### File: `web/components/cta-section.tsx`

**Line ~31:**
- Change "Start Your Free Trial" → "Get Started Today"
- Link to `mailto:clear@fincenclear.com`

**Line ~45:**
- REMOVE entire line: "No credit card required • Setup in 5 minutes • Cancel anytime"
- Replace with: "Contact us at clear@fincenclear.com to schedule your onboarding"
- Or: "Our team will have you up and running in 24 hours"

### File: `web/components/comparison-section.tsx`

**Line ~132:**
- Change "Start Your Free Trial" → "Contact Us"
- Link to `mailto:clear@fincenclear.com`

### File: `web/components/pricing-section.tsx`

**Line ~24 (Essentials tier CTA):**
- Change `cta: "Start Free Trial"` → `cta: "Contact Us"`

**Line ~43 (Complete tier CTA):**
- Change `cta: "Start Free Trial"` → `cta: "Contact Us"`

**Enterprise tier:** Already says "Contact Sales" — leave it, but change to "Contact Us" for consistency.

**All pricing CTA buttons:**
- Link to `mailto:clear@fincenclear.com`
- Or if you prefer, add `onClick` that opens a contact modal or scrolls to a contact section

### File: `web/components/mobile-cta-bar.tsx`

**Line ~9:**
- Change "Start Free Trial" → "Contact Us"
- Link to `mailto:clear@fincenclear.com`
- Or: Remove this entire component if it feels too aggressive for our model. Our users aren't impulse-buying — they're title companies evaluating compliance tools.

---

## TASK 2: Fix Support Email Everywhere

The correct support email is: **`clear@fincenclear.com`**

### File: `web/lib/brand.ts`
**Line ~16:**
```typescript
// BEFORE:
supportEmail: "support@fincenclear.com"

// AFTER:
supportEmail: "clear@fincenclear.com"
```

### File: `web/app/help/page.tsx`
**Line ~35-36:**
```
// BEFORE: 
"support@pctfincen.com"

// AFTER:
"clear@fincenclear.com"
```

**Line ~56-57:**
```
// BEFORE:
"(555) 123-4567"

// AFTER:
Remove the phone number entirely OR replace with a comment:
// Phone number hidden until real number provided
```
Do NOT display a placeholder phone number. Either show a real number or don't show one at all. Leave the phone section structure in place but hide/comment it so it can be re-enabled later.

### File: `web/app/(app)/app/admin/settings/page.tsx`
**Line ~79:**
```
// BEFORE:
defaultValue="support@pctfincen.com"

// AFTER:
defaultValue="clear@fincenclear.com"
```

### File: `web/app/(app)/app/settings/page.tsx`
**Line ~235:**
```
// BEFORE:
"mailto:support@pacificcoasttitle.com"

// AFTER:
"mailto:clear@fincenclear.com"
```

### ALSO: Global search for any remaining wrong emails
```bash
grep -rn "support@pctfincen\|support@fincenclear\|support@pacificcoast" web/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"
```
Fix ALL results to use `clear@fincenclear.com`.

---

## TASK 3: Footer Cleanup

### File: `web/components/footer.tsx`

**REMOVE these placeholder links entirely (delete the `<li>` or `<Link>` elements):**

From "Product" section:
- ❌ Remove "Integrations" (Coming Soon placeholder)
- ❌ Remove "API Documentation" (Coming Soon placeholder)

From "Resources" section:
- ❌ Remove "FinCEN Compliance Guide" (placeholder `#` link)
- ❌ Remove "Exemption Checker Tool" (placeholder `#` link)
- ❌ Remove "Webinars & Training" (placeholder `#` link)
- ❌ Remove "Blog" (placeholder `#` link)
- ✅ Keep "FAQ" but fix href from `#` to `/#faq`

From "Company" section:
- ✅ Keep "About Us" → `#about`
- ❌ Remove "Careers" (Coming Soon placeholder)
- ✅ Keep "Privacy Policy" → change href from `#` to `/privacy`
- ✅ Keep "Terms of Service" → change href from `#` to `/terms`
- ⚠️ "Contact" → change href from `#` to `mailto:clear@fincenclear.com`

**REMOVE social media links:**
- ❌ Remove LinkedIn placeholder
- ❌ Remove Twitter/X placeholder
(We can add these back when real accounts exist)

**ADD support email to footer:**

After the existing footer content (or in the "Company" section), add a visible support email:

```tsx
<div className="mt-6 pt-6 border-t border-gray-700">
  <p className="text-sm text-gray-400">
    Questions? Reach us at{" "}
    <a 
      href="mailto:clear@fincenclear.com" 
      className="text-blue-400 hover:text-blue-300 font-medium"
    >
      clear@fincenclear.com
    </a>
  </p>
</div>
```

**After cleanup, the footer should have these sections:**

**Product:**
- Features → `#features`
- Pricing → `#pricing`
- Security → `#security`

**Resources:**
- FAQ → `/#faq`
- Help & Support → `/help`

**Company:**
- About Us → `#about`
- Contact → `mailto:clear@fincenclear.com`
- Privacy Policy → `/privacy`
- Terms of Service → `/terms`

**Bottom bar:**
- © 2026 PCT FinCEN Solutions. All rights reserved.
- Support: clear@fincenclear.com

---

## TASK 4: Add Support Email to Header

### File: `web/components/header.tsx`

Add the support email somewhere visible in the header. Options:

**Option A (Preferred): Slim top bar above main nav**
```tsx
{/* Add above the main header */}
<div className="bg-gray-900 text-gray-300 text-xs py-1.5 text-center border-b border-gray-800">
  <span>Support: </span>
  <a href="mailto:clear@fincenclear.com" className="text-blue-400 hover:text-blue-300">
    clear@fincenclear.com
  </a>
  <span className="mx-2">•</span>
  <span>FinCEN compliance deadline: March 1, 2026</span>
</div>
```

**Option B: In the nav area, right-aligned before Login**
Add a small email link next to the Login button.

Use Option A — it's the cleanest and most visible. It also reinforces the deadline urgency.

---

## TASK 5: Fix Help Page

### File: `web/app/help/page.tsx`

1. Change all email references to `clear@fincenclear.com`
2. Remove or hide the placeholder phone number `(555) 123-4567`
   - Do NOT replace with another fake number
   - Either show nothing or show "Email us for fastest response"
3. Make sure the help page links to `/terms` and `/privacy` if it references them anywhere

---

## TASK 6: Create Legal Page Stubs

Create two new route files as stubs. The actual legal content will be added in a follow-up prompt.

### Create: `web/app/terms/page.tsx`

```tsx
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | FinClear",
  description: "Terms of Service for FinClear - PCT FinCEN Solutions",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header will be added via layout */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>
        <div id="terms-content" className="prose prose-gray max-w-none">
          {/* LEGAL CONTENT WILL BE INSERTED HERE IN NEXT PROMPT */}
          <p className="text-gray-600">Terms of Service content is being finalized. Please contact <a href="mailto:clear@fincenclear.com" className="text-blue-600 hover:text-blue-700">clear@fincenclear.com</a> with any questions.</p>
        </div>
      </div>
    </div>
  )
}
```

### Create: `web/app/privacy/page.tsx`

```tsx
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | FinClear",
  description: "Privacy Policy for FinClear - PCT FinCEN Solutions",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>
        <div id="privacy-content" className="prose prose-gray max-w-none">
          {/* LEGAL CONTENT WILL BE INSERTED HERE IN NEXT PROMPT */}
          <p className="text-gray-600">Privacy Policy content is being finalized. Please contact <a href="mailto:clear@fincenclear.com" className="text-blue-600 hover:text-blue-700">clear@fincenclear.com</a> with any questions.</p>
        </div>
      </div>
    </div>
  )
}
```

Make sure these pages use the same layout as the marketing pages (include Header and Footer components). Check how `web/app/(marketing)/page.tsx` includes them and replicate that pattern. If the marketing layout is in `web/app/(marketing)/layout.tsx`, consider either:
- Moving terms/privacy into the `(marketing)` group: `web/app/(marketing)/terms/page.tsx`
- Or importing Header/Footer directly

---

## TASK 7: Verify No Other "Free" or "Trial" References Remain

After making all changes, run:

```bash
# Final verification — should return ZERO results for public-facing files
grep -rn -i "free.trial\|start.free\|no.credit.card\|cancel.anytime\|setup.in.5.minutes" web/components/ web/app/(marketing)/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"

# Check for any remaining wrong emails
grep -rn "support@pctfincen\|support@pacificcoast\|support@fincenclear" web/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"

# Check for remaining placeholder links
grep -rn 'href="#"' web/components/footer.tsx web/components/header.tsx
```

All three commands should return empty results (or only acceptable `#section` anchors).

---

## TASK 8: Update brand.ts

### File: `web/lib/brand.ts`

Make sure the brand config reflects our actual information:

```typescript
export const brand = {
  name: "FinClear",
  fullName: "PCT FinCEN Solutions",
  parentCompany: "Pacific Coast Title Company",
  supportEmail: "clear@fincenclear.com",
  website: "https://www.fincenclear.com",
  // Only add phone when we have a real one:
  // supportPhone: "TBD",
}
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Zero instances of "Free Trial" in any public-facing component
- [ ] Zero instances of "No credit card required" anywhere
- [ ] `clear@fincenclear.com` is the ONLY support email shown anywhere
- [ ] No placeholder phone numbers (555-xxx-xxxx) visible
- [ ] Footer has NO links pointing to `href="#"` (except valid `#section` anchors)
- [ ] Footer links to `/terms` and `/privacy` (pages exist, even if stub content)
- [ ] Header shows support email (top bar or inline)
- [ ] Header CTA says "Contact Us" not "Free Trial"
- [ ] Pricing CTAs say "Contact Us"
- [ ] Mobile CTA bar says "Contact Us" or is removed
- [ ] `/terms` page loads without errors
- [ ] `/privacy` page loads without errors
- [ ] Help page shows `clear@fincenclear.com`
- [ ] brand.ts has correct supportEmail

---

## DO NOT:
- Add any new placeholder content
- Use fake phone numbers
- Create a signup page
- Add "Coming Soon" badges to new links
- Change any auth-protected (admin) pages beyond email fixes
- Modify the login page flow (demo accounts are fine for staging)
