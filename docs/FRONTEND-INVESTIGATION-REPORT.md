# Frontend Investigation Report
## Public-Facing Pages Audit — FinClear
**Generated:** February 2026  
**Status:** INVESTIGATION COMPLETE — DO NOT MODIFY FILES YET

---

# A. Route Map

## Public Routes (Not Behind Auth)

| Route | File Path | Description | Lines |
|-------|-----------|-------------|-------|
| `/` (Homepage) | `web/app/(marketing)/page.tsx` | Marketing landing page | 38 |
| `/login` | `web/app/login/page.tsx` | Demo login page | 261 |
| `/help` | `web/app/help/page.tsx` | Help & Support page | 138 |
| `/p/[token]` | `web/app/p/[token]/page.tsx` | Party Portal (secure link access) | ~500 |

## Auth-Protected Routes (Behind `/app/`)

All routes under `web/app/(app)/app/` are protected by authentication.

## Missing Public Routes

| Expected Route | Status |
|----------------|--------|
| `/terms` | ❌ MISSING |
| `/privacy` | ❌ MISSING |
| `/contact` | ❌ MISSING |
| `/about` | Uses anchor `#about` on homepage |
| `/signup` | ❌ DOES NOT EXIST (correct — our model is invite-only) |

---

# B. Copy Audit — Problems Found

## 🚨 CRITICAL: "Free Trial" Language (MUST REMOVE)

### `web/components/header.tsx`
```
Line 96: "Start Free Trial" ← REMOVE (desktop CTA button)
Line 125: "Start Free Trial" ← REMOVE (mobile menu CTA button)
```

### `web/components/hero-section.tsx`
```
Line 47: "Start Free Trial" ← REMOVE (main hero CTA)
Line 63: "No credit card required" ← REMOVE (trust indicator)
```

### `web/components/cta-section.tsx`
```
Line 31: "Start Your Free Trial" ← REMOVE
Line 45: "No credit card required • Setup in 5 minutes • Cancel anytime" ← REMOVE
```

### `web/components/comparison-section.tsx`
```
Line 132: "Start Your Free Trial" ← REMOVE
```

### `web/components/pricing-section.tsx`
```
Line 24: cta: "Start Free Trial" ← CHANGE to "Contact Us"
Line 43: cta: "Start Free Trial" ← CHANGE to "Contact Us"
```

### `web/components/mobile-cta-bar.tsx`
```
Line 9: "Start Free Trial" ← REMOVE entire component or change to "Contact Us"
```

## 📧 Incorrect Support Email

### `web/app/help/page.tsx`
```
Line 35-36: "support@pctfincen.com" ← CHANGE to "clear@fincenclear.com"
Line 56-57: "(555) 123-4567" ← PLACEHOLDER - needs real phone number
```

### `web/app/(app)/app/admin/settings/page.tsx`
```
Line 79: defaultValue="support@pctfincen.com" ← CHANGE to "clear@fincenclear.com"
```

### `web/app/(app)/app/settings/page.tsx`
```
Line 235: "mailto:support@pacificcoasttitle.com" ← CHANGE to "clear@fincenclear.com"
```

### `web/lib/brand.ts`
```
Line 16: supportEmail: "support@fincenclear.com" ← CHANGE to "clear@fincenclear.com"
```

## ⚠️ Self-Service Signup Language (Needs Context Review)

These are in admin/internal pages so may be acceptable, but review:

### `web/app/(app)/app/settings/team/page.tsx`
```
Line 433: "Invite your first team member to get started" ← OK (admin context)
```

### `web/app/(app)/app/admin/companies/page.tsx`
```
Line 1077: "Get started by adding your first client company" ← OK (admin context)
```

---

# C. Footer Audit

**File:** `web/components/footer.tsx`

## Product Links
| Link Text | href | Status |
|-----------|------|--------|
| Features | `#features` | ✅ WORKING (anchor) |
| Pricing | `#pricing` | ✅ WORKING (anchor) |
| Security | `#security` | ✅ WORKING (anchor) |
| Integrations | `#` | ⚠️ PLACEHOLDER (shows "Coming Soon" badge) |
| API Documentation | `#` | ⚠️ PLACEHOLDER (shows "Coming Soon" badge) |

## Resource Links
| Link Text | href | Status |
|-----------|------|--------|
| FinCEN Compliance Guide | `#` | ❌ PLACEHOLDER — needs page or removal |
| Exemption Checker Tool | `#` | ❌ PLACEHOLDER — needs page or removal |
| Webinars & Training | `#` | ❌ PLACEHOLDER — needs page or removal |
| Blog | `#` | ❌ PLACEHOLDER — needs page or removal |
| FAQ | `#` | ⚠️ PLACEHOLDER — `#faq` anchor exists on homepage |

## Company Links
| Link Text | href | Status |
|-----------|------|--------|
| About Us | `#about` | ✅ WORKING (anchor) |
| Contact | `#` | ❌ PLACEHOLDER — needs page with clear@fincenclear.com |
| Careers | `#` | ⚠️ PLACEHOLDER (shows "Coming Soon" badge) |
| Privacy Policy | `#` | ❌ MISSING PAGE |
| Terms of Service | `#` | ❌ MISSING PAGE |

## Social Links
| Platform | href | Status |
|----------|------|--------|
| LinkedIn | `#` | ❌ PLACEHOLDER |
| X (Twitter) | `#` | ❌ PLACEHOLDER |

---

# D. Header/Nav Audit

**File:** `web/components/header.tsx`

## Navigation Links
| Link Text | href | Status |
|-----------|------|--------|
| Features | `#features` | ✅ WORKING |
| Pricing | `#pricing` | ✅ WORKING |
| Security | `#security` | ✅ WORKING |
| About | `#about` | ✅ WORKING |

## CTA Buttons
| Button Text | href/action | Status |
|-------------|-------------|--------|
| Login | `/login` | ✅ WORKING |
| Start Free Trial | (no href - button) | 🚨 MUST CHANGE — should be "Contact Us" linking to contact page or mailto |

---

# E. Legal Pages Status

| Page | Status | Notes |
|------|--------|-------|
| Terms of Service | ❌ MISSING | Referenced in footer but page doesn't exist |
| Privacy Policy | ❌ MISSING | Referenced in footer but page doesn't exist |
| Terms & Conditions | ❌ MISSING | No reference |
| User Agreement | ❌ MISSING | No reference |
| Disclaimer | ❌ MISSING | No reference |
| Cookie Policy | ❌ MISSING | No reference |

**ACTION REQUIRED:** Create at minimum:
1. `/terms` - Terms of Service
2. `/privacy` - Privacy Policy

---

# F. Support Email Visibility

| Location | Present? | Email Shown | Status |
|----------|----------|-------------|--------|
| Header | ❌ No | — | Should add |
| Footer | ❌ No | — | Should add |
| Contact Page | ❌ No page exists | — | Create page |
| Login Page | ❌ No | — | Could add |
| Help Page | ✅ Yes | `support@pctfincen.com` | ⚠️ WRONG EMAIL |
| Error Pages | ❓ Unknown | — | Check |
| 404 Page | ❓ Unknown | — | Check/Create |

**Required Email:** `clear@fincenclear.com`

---

# G. Signup/Login Flow

## Current State

### Public Signup Page
- **Does `/signup` exist?** ❌ NO — CORRECT (matches our invite-only model)

### Public Login Page
- **Location:** `/login`
- **What it shows:** Demo accounts with role descriptions
- **Copy issues:** None — demo mode is clear

### "Get Started" / "Sign Up" CTAs

| Location | Text | Action | Status |
|----------|------|--------|--------|
| Header (desktop) | "Start Free Trial" | No action (button) | 🚨 REMOVE |
| Header (mobile) | "Start Free Trial" | No action (button) | 🚨 REMOVE |
| Hero | "Start Free Trial" | No action (button) | 🚨 REMOVE |
| Hero | "Watch Demo" | No action (button) | ✅ OK (could link to video) |
| Comparison | "Start Your Free Trial" | No action (button) | 🚨 REMOVE |
| CTA Section | "Start Your Free Trial" | No action (button) | 🚨 REMOVE |
| CTA Section | "Schedule a Demo" | No action (button) | ✅ OK |
| Pricing (Essentials) | "Start Free Trial" | No action (button) | 🚨 CHANGE to "Contact Us" |
| Pricing (Complete) | "Start Free Trial" | No action (button) | 🚨 CHANGE to "Contact Us" |
| Pricing (Enterprise) | "Contact Sales" | No action (button) | ✅ OK |
| Mobile CTA Bar | "Start Free Trial" | No action (button) | 🚨 REMOVE/CHANGE |

---

# H. Component Inventory (Public-Facing)

| Component | File Path | Purpose | Issues |
|-----------|-----------|---------|--------|
| Header | `web/components/header.tsx` | Navigation + CTAs | "Free Trial" buttons |
| Footer | `web/components/footer.tsx` | Links + legal | Placeholder links, missing legal pages |
| HeroSection | `web/components/hero-section.tsx` | Above-fold hero | "Free Trial", "No credit card" |
| CountdownSection | `web/components/countdown-section.tsx` | March 2026 countdown | ✅ OK |
| ProblemSection | `web/components/problem-section.tsx` | Pain points | ✅ OK |
| SolutionSection | `web/components/solution-section.tsx` | How FinClear helps | ✅ OK |
| FeaturesSection | `web/components/features-section.tsx` | Feature list | ✅ OK |
| ComparisonSection | `web/components/comparison-section.tsx` | vs. competitors table | "Free Trial" CTA |
| PricingSection | `web/components/pricing-section.tsx` | Pricing tiers | "Free Trial" CTAs |
| SecuritySection | `web/components/security-section.tsx` | Security features | ✅ OK |
| AboutSection | `web/components/about-section.tsx` | About company | ✅ OK |
| FAQSection | `web/components/faq-section.tsx` | FAQ accordion | ✅ OK |
| CTASection | `web/components/cta-section.tsx` | Final CTA block | "Free Trial", "No credit card" |
| MobileCTABar | `web/components/mobile-cta-bar.tsx` | Sticky mobile CTA | "Free Trial" |

---

# I. Image/Asset Audit

**Directory:** `web/public/`

| File | Purpose | Status |
|------|---------|--------|
| `logo.png` | Full logo (light bg) | ✅ OK |
| `logo-white.png` | Full logo (dark bg) | ✅ OK |
| `logo-icon.png` | Icon/favicon | ✅ OK |
| `icon.svg` | SVG icon | ✅ OK |
| `icon-dark-32x32.png` | Dark favicon | ✅ OK |
| `icon-light-32x32.png` | Light favicon | ✅ OK |
| `apple-icon.png` | Apple touch icon | ✅ OK |
| `placeholder-logo.png` | ⚠️ PLACEHOLDER | May need removal |
| `placeholder-logo.svg` | ⚠️ PLACEHOLDER | May need removal |
| `placeholder-user.jpg` | ⚠️ PLACEHOLDER | Review usage |
| `placeholder.jpg` | ⚠️ PLACEHOLDER | Review usage |
| `placeholder.svg` | ⚠️ PLACEHOLDER | Review usage |

---

# J. Meta Tags / SEO

**File:** `web/app/layout.tsx` (root layout)

| Meta Element | Status | Notes |
|--------------|--------|-------|
| Page Title | ⚠️ Check | Should be "FinClear - FinCEN Compliance Made Simple" |
| Meta Description | ⚠️ Check | Needs verification |
| OG Tags | ⚠️ Check | Needs verification |
| Favicon | ✅ Present | logo-icon.png |
| Canonical URL | ⚠️ Check | Should be fincenclear.com |

---

# Summary Recommendations

## 1. Quick Wins (< 30 min each)

| Task | Files | Effort |
|------|-------|--------|
| Remove all "Start Free Trial" buttons | header.tsx, hero-section.tsx, cta-section.tsx, comparison-section.tsx, mobile-cta-bar.tsx | 15 min |
| Change pricing CTAs to "Contact Us" | pricing-section.tsx | 5 min |
| Remove "No credit card required" | hero-section.tsx, cta-section.tsx | 5 min |
| Fix support email to `clear@fincenclear.com` | brand.ts, help/page.tsx, settings pages | 10 min |
| Fix FAQ link in footer | footer.tsx (change `#` to `#faq`) | 2 min |

## 2. Medium Effort (1-2 hours)

| Task | Description | Effort |
|------|-------------|--------|
| Add contact page | Create `/contact` with email, phone, form | 1-2 hours |
| Add support email to header/footer | Update components to show `clear@fincenclear.com` | 30 min |
| Remove/hide placeholder footer links | Remove FinCEN Guide, Exemption Checker, Webinars, Blog | 30 min |
| Update placeholder phone number | Replace (555) 123-4567 with real number | 5 min |
| Review and clean placeholder images | Check if placeholder-*.* files are used anywhere | 30 min |

## 3. Needs Creation

| Page/Feature | Priority | Effort |
|--------------|----------|--------|
| `/terms` - Terms of Service | 🔴 HIGH | Legal team needed |
| `/privacy` - Privacy Policy | 🔴 HIGH | Legal team needed |
| `/contact` - Contact page | 🟡 MEDIUM | 1-2 hours |
| 404 page with support info | 🟢 LOW | 30 min |
| Real social media links | 🟢 LOW | 5 min |

## 4. Legal Pages Needed

| Document | Status | Action |
|----------|--------|--------|
| Terms of Service | ❌ Missing | Create with legal counsel |
| Privacy Policy | ❌ Missing | Create with legal counsel |
| Cookie Policy | ❓ Optional | Consider if using cookies |

---

# Action Items for March 1 Launch

## Must-Do Before Launch
1. ✅ Remove ALL "Free Trial" references
2. ✅ Remove "No credit card required" references
3. ✅ Change CTAs to "Contact Us" → `mailto:clear@fincenclear.com`
4. ✅ Fix support email everywhere to `clear@fincenclear.com`
5. ✅ Create Terms of Service page
6. ✅ Create Privacy Policy page
7. ✅ Add support email to footer

## Nice-to-Have
1. Create dedicated Contact page
2. Fix placeholder footer links (remove or make real)
3. Add real phone number
4. Add real social media links
5. Review/remove placeholder images
6. Create custom 404 page

---

*Report generated for FinClear launch preparation*  
*Next step: Create CURSOR_PROMPT_FRONTEND_REMEDIATION.md with fix instructions*
