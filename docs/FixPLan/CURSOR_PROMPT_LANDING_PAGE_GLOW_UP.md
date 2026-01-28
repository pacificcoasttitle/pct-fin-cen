# CURSOR PROMPT: Landing Page Glow-Up - Match the App's Professional Polish

## MISSION

The landing page hero is great, but the color scheme feels disconnected from our sharp, professional user/admin dashboards. Let's give the marketing page a glow-up so it feels like it belongs to the same premium product.

**Current Issue:** Landing page uses Navy + Gold, but the app uses Navy + Teal with a modern, bubbly tech aesthetic.

**Goal:** Unified brand identity from landing → login → app. Premium, trustworthy, modern.

---

## PART 1: Updated Color System

### Current App Design System (What Works)
```
Primary Navy: #1E3A5F
Accent Teal: #0D9488 (primary accent)
Success: #10B981 (Emerald)
Warning: #F59E0B (Amber)
Background: #F8FAFC (Slate)
Cards: White with subtle shadows
```

### Landing Page Should Adopt
```css
/* Primary Palette */
--primary-navy: #1E3A5F;      /* Keep - strong, trustworthy */
--accent-teal: #0D9488;        /* Replace gold with teal */
--accent-teal-light: #14B8A6;  /* Lighter teal for hovers */
--accent-teal-dark: #0F766E;   /* Darker teal for depth */

/* Supporting Colors */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;

/* Neutrals */
--background: #F8FAFC;
--card-bg: #FFFFFF;
--text-primary: #1E293B;
--text-secondary: #64748B;
--text-muted: #94A3B8;
--border: #E2E8F0;

/* Gradients */
--gradient-hero: linear-gradient(135deg, #1E3A5F 0%, #0D9488 100%);
--gradient-cta: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%);
--gradient-subtle: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%);
```

---

## PART 2: Hero Section Refresh

**File:** `web/app/page.tsx` or `web/components/marketing/hero.tsx`

### Current Hero (Keep the Content, Update the Style)

The hero layout and content is good. Update the styling:

```tsx
// Hero Section with Updated Colors
<section className="relative min-h-[90vh] flex items-center overflow-hidden">
  {/* Background with gradient */}
  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
    {/* Subtle animated gradient overlay */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent" />
    
    {/* Animated grid pattern */}
    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
    
    {/* Floating orbs for depth */}
    <div className="absolute top-20 right-20 w-72 h-72 bg-teal-500/30 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-20 left-20 w-96 h-96 bg-navy-500/20 rounded-full blur-3xl" />
  </div>

  <div className="container relative z-10 mx-auto px-4 py-20">
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* Left Content */}
      <div className="text-white space-y-8">
        {/* Urgency Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          New Regulation Effective March 1, 2026
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
          FinCEN Compliance
          <span className="block mt-2 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Made Simple
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-slate-300 max-w-xl leading-relaxed">
          The most comprehensive compliance platform for title companies. 
          Determine requirements in <span className="text-teal-400 font-semibold">2 minutes</span>. 
          File in <span className="text-teal-400 font-semibold">10 minutes</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 pt-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-2 border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl backdrop-blur-sm"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Watch Demo
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center gap-8 pt-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-400" />
            <span>SOC 2 Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-teal-400" />
            <span>256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-teal-400" />
            <span>FinCEN Compliant</span>
          </div>
        </div>
      </div>

      {/* Right Side - App Preview */}
      <div className="relative hidden lg:block">
        <div className="relative">
          {/* Glow effect behind */}
          <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 rounded-3xl blur-2xl" />
          
          {/* App screenshot/mockup */}
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-md px-3 py-1 text-xs text-slate-400 text-center">
                  app.pctfincen.com
                </div>
              </div>
            </div>
            {/* Screenshot placeholder or actual dashboard image */}
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100">
              {/* Add actual dashboard screenshot or illustration here */}
              <img 
                src="/dashboard-preview.png" 
                alt="PCT FinCEN Dashboard" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## PART 3: Countdown Banner Update

```tsx
// Countdown Banner with Teal Accent
<section className="bg-gradient-to-r from-slate-900 to-slate-800 py-4 border-y border-teal-500/20">
  <div className="container mx-auto px-4">
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
      <span className="text-white font-medium">
        ⏰ Time until FinCEN reporting requirement:
      </span>
      <div className="flex gap-3">
        {[
          { value: days, label: "Days" },
          { value: hours, label: "Hours" },
          { value: minutes, label: "Min" },
          { value: seconds, label: "Sec" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="bg-teal-500/20 border border-teal-500/30 rounded-lg px-3 py-2 min-w-[60px]">
              <span className="text-2xl font-bold text-teal-400 font-mono">
                {String(item.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">{item.label}</span>
          </div>
        ))}
      </div>
      <Button 
        size="sm" 
        className="bg-teal-500 hover:bg-teal-600 text-white"
      >
        Get Compliant Now
      </Button>
    </div>
  </div>
</section>
```

---

## PART 4: Features Section Update

```tsx
// Features Grid with Teal Accents
<section className="py-24 bg-slate-50">
  <div className="container mx-auto px-4">
    <div className="text-center max-w-3xl mx-auto mb-16">
      <span className="text-teal-600 font-semibold text-sm uppercase tracking-wider">
        Why Choose PCT
      </span>
      <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4">
        Everything You Need for
        <span className="text-teal-600"> FinCEN Compliance</span>
      </h2>
      <p className="text-xl text-slate-600 mt-6">
        Built by title industry professionals who understand your workflow.
      </p>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {features.map((feature) => (
        <Card 
          key={feature.title}
          className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <CardContent className="p-8">
            {/* Icon with gradient background */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <feature.icon className="h-7 w-7 text-white" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              {feature.title}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {feature.description}
            </p>
          </CardContent>
          
          {/* Hover accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>
      ))}
    </div>
  </div>
</section>
```

---

## PART 5: Pricing Section Update

```tsx
// Pricing with Teal-focused Design
<section className="py-24 bg-white">
  <div className="container mx-auto px-4">
    <div className="text-center max-w-3xl mx-auto mb-16">
      <span className="text-teal-600 font-semibold text-sm uppercase tracking-wider">
        Pricing
      </span>
      <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4">
        Simple, Transparent Pricing
      </h2>
      <p className="text-xl text-slate-600 mt-6">
        Choose the plan that fits your volume. No hidden fees.
      </p>
    </div>

    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {plans.map((plan, index) => (
        <Card 
          key={plan.name}
          className={cn(
            "relative overflow-hidden transition-all duration-300 hover:-translate-y-2",
            plan.popular 
              ? "border-2 border-teal-500 shadow-xl shadow-teal-500/10" 
              : "border border-slate-200 hover:border-teal-200"
          )}
        >
          {/* Popular Badge */}
          {plan.popular && (
            <div className="absolute top-0 right-0">
              <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                Most Popular
              </div>
            </div>
          )}
          
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            <p className="text-slate-600 mt-2 text-sm">{plan.description}</p>
            
            <div className="mt-6 mb-8">
              <span className="text-5xl font-bold text-slate-900">${plan.price}</span>
              <span className="text-slate-500 ml-2">/filing</span>
            </div>
            
            <Button 
              className={cn(
                "w-full py-6 text-lg rounded-xl",
                plan.popular
                  ? "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/25"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              )}
            >
              Get Started
            </Button>
            
            <ul className="mt-8 space-y-4">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-teal-500 shrink-0" />
                  <span className="text-slate-600">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</section>
```

---

## PART 6: CTA Section Update

```tsx
// Final CTA with Teal Gradient
<section className="py-24 relative overflow-hidden">
  {/* Background */}
  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent" />
  </div>
  
  <div className="container relative z-10 mx-auto px-4 text-center">
    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
      Ready to Get Compliant?
    </h2>
    <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
      Join hundreds of title companies who trust PCT FinCEN Solutions for their compliance needs.
    </p>
    
    <div className="flex flex-wrap justify-center gap-4">
      <Button 
        size="lg"
        className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-10 py-6 text-lg rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
      >
        Start Free Trial
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
      <Button 
        size="lg"
        variant="outline"
        className="border-2 border-white/30 text-white hover:bg-white/10 px-10 py-6 text-lg rounded-xl"
      >
        Schedule Demo
      </Button>
    </div>
    
    <p className="text-slate-400 text-sm mt-8">
      No credit card required • Free 14-day trial • Cancel anytime
    </p>
  </div>
</section>
```

---

## PART 7: Global Style Updates

**File:** `web/app/globals.css` or `web/styles/marketing.css`

```css
/* Marketing Page Specific Styles */

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Custom animations */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(13, 148, 136, 0.3); }
  50% { box-shadow: 0 0 40px rgba(13, 148, 136, 0.5); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

/* Gradient text utility */
.gradient-text {
  @apply bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent;
}

/* Button hover lift */
.hover-lift {
  @apply transition-all duration-300 hover:-translate-y-1 hover:shadow-lg;
}

/* Card hover effects */
.card-hover {
  @apply transition-all duration-300 hover:-translate-y-2 hover:shadow-xl;
}

/* Section padding standardization */
.section-padding {
  @apply py-20 md:py-24 lg:py-32;
}

/* Container max-width for marketing */
.marketing-container {
  @apply container mx-auto px-4 max-w-7xl;
}
```

---

## PART 8: Navigation Bar Update

```tsx
// Navbar with Updated Styling
<nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg">PCT FinCEN</span>
      </Link>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        <Link href="#features" className="text-slate-300 hover:text-white transition-colors">
          Features
        </Link>
        <Link href="#pricing" className="text-slate-300 hover:text-white transition-colors">
          Pricing
        </Link>
        <Link href="#about" className="text-slate-300 hover:text-white transition-colors">
          About
        </Link>
        <Link href="#faq" className="text-slate-300 hover:text-white transition-colors">
          FAQ
        </Link>
      </div>

      {/* CTA Buttons */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          className="text-slate-300 hover:text-white hover:bg-white/10"
          asChild
        >
          <Link href="/login">Log In</Link>
        </Button>
        <Button 
          className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
          asChild
        >
          <Link href="/login">Get Started</Link>
        </Button>
      </div>
    </div>
  </div>
</nav>
```

---

## PART 9: Footer Update

```tsx
// Footer with Teal Accents
<footer className="bg-slate-900 text-white pt-16 pb-8">
  <div className="container mx-auto px-4">
    <div className="grid md:grid-cols-4 gap-12 mb-12">
      {/* Brand Column */}
      <div className="md:col-span-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl">PCT FinCEN</span>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">
          The most comprehensive FinCEN Real Estate Reporting compliance platform for title companies.
        </p>
        <div className="flex gap-4 mt-6">
          <a href="#" className="text-slate-400 hover:text-teal-400 transition-colors">
            <Linkedin className="h-5 w-5" />
          </a>
          <a href="#" className="text-slate-400 hover:text-teal-400 transition-colors">
            <Twitter className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Links Columns */}
      {footerLinks.map((column) => (
        <div key={column.title}>
          <h4 className="font-semibold text-white mb-4">{column.title}</h4>
          <ul className="space-y-3">
            {column.links.map((link) => (
              <li key={link.name}>
                <Link 
                  href={link.href}
                  className="text-slate-400 hover:text-teal-400 transition-colors text-sm"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {/* Bottom Bar */}
    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <p className="text-slate-400 text-sm">
        © 2026 PCT FinCEN Solutions. All rights reserved.
      </p>
      <div className="flex items-center gap-6">
        <Link href="/privacy" className="text-slate-400 hover:text-teal-400 text-sm">
          Privacy Policy
        </Link>
        <Link href="/terms" className="text-slate-400 hover:text-teal-400 text-sm">
          Terms of Service
        </Link>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Shield className="h-4 w-4 text-teal-400" />
          <span>SOC 2 Certified</span>
        </div>
      </div>
    </div>
  </div>
</footer>
```

---

## VERIFICATION CHECKLIST

After implementing:

- [ ] Hero uses Navy/Slate + Teal gradient (no gold)
- [ ] All accent colors are teal (#0D9488) not gold
- [ ] CTA buttons use teal gradient
- [ ] Feature icons have teal backgrounds
- [ ] Pricing "popular" tier has teal border
- [ ] Countdown timer uses teal accents
- [ ] Navbar CTA button is teal
- [ ] Footer social hovers are teal
- [ ] Animations are smooth (hover lifts, transitions)
- [ ] Visual consistency with app dashboards
- [ ] Mobile responsive
- [ ] Dark sections use slate-900/800 (not pure black)

---

## UPDATE KilledSharks.md

```markdown
---

### 13. Landing Page Color Scheme Glow-Up ✅

**Problem:** Landing page used Navy + Gold color scheme, while the app dashboards evolved to Navy + Teal with modern "bubbly tech" aesthetic. Visual disconnect between marketing and product.

**Impact:** 
- Brand inconsistency
- Marketing didn't match the premium feel of the app
- Demo flow felt disjointed

**Solution:** Complete color refresh of landing page to match app:

| Element | Before | After |
|---------|--------|-------|
| Primary Accent | Gold #C9A227 | Teal #0D9488 |
| CTA Buttons | Gold gradient | Teal gradient |
| Feature Icons | Gold backgrounds | Teal backgrounds |
| Hover States | Gold accents | Teal accents |
| Countdown Timer | Gold numbers | Teal numbers |

**Additional Improvements:**
- Refined gradient backgrounds (slate-900 → teal-900)
- Added floating orb effects for depth
- Consistent border radius (rounded-xl)
- Improved shadow system (shadow-teal-500/25)
- Better animation timing
- Glassmorphism accents on dark sections

**Files Changed:**
- `web/app/page.tsx` (or marketing component)
- `web/app/globals.css` (new utility classes)
- Any marketing-specific components

**Visual Result:**
Landing → Login → Dashboard now feels like ONE premium product

**Status:** ✅ Killed
```

---

## DESIGN SYSTEM SUMMARY

### The PCT FinCEN Brand (Unified)

| Element | Value |
|---------|-------|
| **Primary** | Navy #1E3A5F |
| **Accent** | Teal #0D9488 |
| **Success** | Emerald #10B981 |
| **Warning** | Amber #F59E0B |
| **Background** | Slate #F8FAFC |
| **Dark BG** | Slate-900 #0F172A |
| **Border Radius** | rounded-xl (12px) |
| **Font** | Inter |
| **Style** | Modern, bubbly, professional |

### Flow Consistency

```
Marketing (Teal accents) → Login (Teal accents) → App (Teal accents)
        ↓                        ↓                      ↓
   Professional              Welcoming              Sharp & Clean
   Trustworthy              Secure                  Efficient
```

**This is brand cohesion done right.** 🎨
