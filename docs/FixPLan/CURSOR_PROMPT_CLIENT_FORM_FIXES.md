# CURSOR PROMPT: Fix Client Submission Form Issues

## 3 Issues Found During Testing

---

## 🚨 ISSUE 1: CORS ERROR (BLOCKER - Fix First!)

**Error:**
```
Access to fetch at 'https://pct-fin-cen-staging.onrender.com/submission-requests' 
from origin 'https://pct-fin-cen-6wx3.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**File:** `api/app/main.py`

**Problem:** The CORS middleware isn't allowing requests from the Vercel frontend domain.

**Fix:** Update the CORS configuration to include the Vercel domain:

```python
from fastapi.middleware.cors import CORSMiddleware

# Find the existing CORS middleware and update it, or add if missing:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://pct-fin-cen-6wx3.vercel.app",      # Production frontend
        "https://pct-fincen.vercel.app",            # If using custom domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Alternative - Allow all Vercel preview deployments:**
```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
],
allow_origin_regex=r"https://.*\.vercel\.app",  # All Vercel deployments
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
```

**Test:** After deploying, the submission form should successfully POST to the API.

---

## 🎨 ISSUE 2: Wizard UX - Scrolling Defeats Purpose

**Problem:** The form has a wizard-style stepper at top, but all sections are visible and user must scroll. This defeats the wizard pattern - users expect to see ONE section at a time.

**File:** `web/app/(app)/app/requests/new/page.tsx`

**Current Behavior:**
```
┌─────────────────────────────────────┐
│  Step 1 ─ Step 2 ─ Step 3 ─ Step 4  │  ← Stepper at top
├─────────────────────────────────────┤
│  Section 1: Property Info           │
│  [fields...]                        │
│                                     │
│  Section 2: Transaction Info        │  ← User scrolls through ALL
│  [fields...]                        │
│                                     │
│  Section 3: Buyer Info              │
│  [fields...]                        │
│                                     │
│  Section 4: Seller Info             │
│  [fields...]                        │
│                                     │
│  [Submit]                           │
└─────────────────────────────────────┘
```

**Desired Behavior - Option A (Show One Step at a Time):**
```
┌─────────────────────────────────────┐
│  Step 1 ─ Step 2 ─ Step 3 ─ Step 4  │
├─────────────────────────────────────┤
│                                     │
│  Section 2: Transaction Info        │  ← Only current step visible
│                                     │
│  [fields for this section only]     │
│                                     │
│                                     │
│  [Back]              [Continue]     │
│                                     │
└─────────────────────────────────────┘
```

**Implementation - Show One Step at a Time:**

```tsx
const [currentStep, setCurrentStep] = useState(1);
const totalSteps = 4;

// Step content renderer
const renderStepContent = () => {
  switch (currentStep) {
    case 1:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Property Information</h2>
          {/* Property fields only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Address, City, State, ZIP, County fields */}
          </div>
        </div>
      );
    case 2:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Transaction Details</h2>
          {/* Transaction fields only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase price, closing date, escrow number, financing type */}
          </div>
        </div>
      );
    case 3:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Buyer Information</h2>
          {/* Buyer fields only */}
        </div>
      );
    case 4:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Seller Information</h2>
          {/* Seller fields only */}
        </div>
      );
    default:
      return null;
  }
};

// Navigation buttons
const canGoBack = currentStep > 1;
const canGoNext = currentStep < totalSteps;
const isLastStep = currentStep === totalSteps;

// Validation per step
const isStepValid = () => {
  switch (currentStep) {
    case 1:
      return formData.propertyAddress && formData.propertyCity && 
             formData.propertyState && formData.propertyZip;
    case 2:
      return formData.purchasePrice && formData.closingDate && 
             formData.financingType;
    case 3:
      return formData.buyerName && formData.buyerEmail && formData.buyerType;
    case 4:
      return formData.sellerName; // seller email optional
    default:
      return false;
  }
};

return (
  <div className="max-w-2xl mx-auto">
    {/* Progress Stepper */}
    <div className="mb-8">
      <div className="flex justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div 
            key={step}
            className={cn(
              "flex items-center",
              step < currentStep && "text-green-600",
              step === currentStep && "text-primary font-semibold",
              step > currentStep && "text-muted-foreground"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm",
              step < currentStep && "bg-green-100 text-green-600",
              step === currentStep && "bg-primary text-white",
              step > currentStep && "bg-muted"
            )}>
              {step < currentStep ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className="ml-2 hidden sm:inline">
              {["Property", "Transaction", "Buyer", "Seller"][step - 1]}
            </span>
          </div>
        ))}
      </div>
      <Progress value={(currentStep / totalSteps) * 100} className="mt-4" />
    </div>

    {/* Step Content */}
    <Card>
      <CardContent className="pt-6">
        {renderStepContent()}
      </CardContent>
    </Card>

    {/* Navigation Buttons */}
    <div className="flex justify-between mt-6">
      <Button
        variant="outline"
        onClick={() => setCurrentStep(s => s - 1)}
        disabled={!canGoBack}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {isLastStep ? (
        <Button 
          onClick={handleSubmit}
          disabled={!isStepValid() || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit Request
              <Send className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={() => setCurrentStep(s => s + 1)}
          disabled={!isStepValid()}
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  </div>
);
```

**Alternative - Option B (Vertical Stepper):**

If you prefer to show all sections but with a vertical stepper on the left:

```tsx
<div className="flex gap-8">
  {/* Vertical Stepper - Sticky on left */}
  <div className="w-48 shrink-0">
    <div className="sticky top-24 space-y-4">
      {steps.map((step, index) => (
        <button
          key={step.id}
          onClick={() => scrollToSection(step.id)}
          className={cn(
            "flex items-center gap-3 w-full text-left p-2 rounded-lg",
            activeSection === step.id && "bg-primary/10 text-primary"
          )}
        >
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs",
            index < activeIndex && "bg-green-100 text-green-600",
            index === activeIndex && "bg-primary text-white",
            index > activeIndex && "bg-muted"
          )}>
            {index < activeIndex ? <Check className="h-3 w-3" /> : index + 1}
          </div>
          <span className="text-sm">{step.title}</span>
        </button>
      ))}
    </div>
  </div>

  {/* Form Content - Scrollable */}
  <div className="flex-1 space-y-8">
    {/* All sections with IDs for scroll-to */}
  </div>
</div>
```

**Recommendation:** Option A (one step at a time) is cleaner for this use case since the form isn't that long. It provides better UX and feels more guided.

---

## 🎨 ISSUE 3: Form Layout - Left Aligned Instead of Centered

**Problem:** The form content is left-aligned next to the sidebar instead of being centered in the available content area.

**File:** `web/app/(app)/app/requests/new/page.tsx`

**Fix:** Wrap the form in a centered container with max-width:

```tsx
// Find the main content wrapper and update:

// BEFORE (probably):
<div className="p-6">
  {/* form content */}
</div>

// AFTER:
<div className="p-6 flex justify-center">
  <div className="w-full max-w-2xl">
    {/* form content */}
  </div>
</div>

// Or if using a container:
<div className="container max-w-2xl mx-auto py-8 px-4">
  {/* form content */}
</div>
```

**Full layout structure should be:**
```tsx
export default function NewRequestPage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold">New Compliance Request</h1>
          <p className="text-muted-foreground">
            Submit property details for FinCEN reporting determination
          </p>
        </div>
      </div>

      {/* Form Content - Centered */}
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Wizard steps and form here */}
      </div>
    </div>
  );
}
```

---

## Testing After Fixes

1. **CORS Fix:** 
   - Deploy API to Render
   - Refresh frontend
   - Submit form → should NOT see CORS error

2. **Wizard UX:**
   - Only current step visible
   - Back/Continue buttons work
   - Progress bar updates
   - Final step shows Submit button

3. **Layout:**
   - Form is centered in content area
   - Not awkwardly left-aligned next to sidebar

---

## Priority Order

1. **FIX CORS FIRST** - Nothing works without this
2. Fix layout (quick CSS change)
3. Fix wizard UX (more involved but improves demo)

---

## Update KilledSharks.md

```markdown
### 9. Client Form Testing Fixes ✅

**Issues Found:**
1. CORS blocking API calls from Vercel frontend
2. Wizard shows all sections (defeats wizard purpose)
3. Form left-aligned instead of centered

**Fixes:**
- Added Vercel domain to CORS allow_origins
- Converted form to step-by-step wizard (one section at a time)
- Centered form with max-w-2xl container

**Files Changed:**
- `api/app/main.py` (CORS configuration)
- `web/app/(app)/app/requests/new/page.tsx` (wizard UX + layout)

**Status:** ✅ Killed
```
