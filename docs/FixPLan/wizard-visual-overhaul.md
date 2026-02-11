# Wizard Visual Overhaul — Layout, Progress, & UX

## Goals

1. **Wider layout** — Use horizontal space. Stop stacking everything vertically in a narrow column.
2. **Better progress bar** — Show the full journey, not just the current step. Users need orientation.
3. **SiteX loading feedback** — Tell the user what's happening during property lookup.
4. **Polish** — Make this feel like a professional compliance tool, not a basic form.

---

## Change 1: Widen the Container

### File: `web/components/wizard/WizardContainer.tsx`

The layout is constrained by `max-w-2xl` (672px) for step content and `max-w-3xl` for progress. This wastes half the screen on desktop.

Find the return JSX (around line 394). Change the container widths:

```tsx
// BEFORE
return (
  <div className="min-h-screen bg-background flex flex-col">
    {/* Header with Progress */}
    <div className="sticky top-0 z-10 border-b bg-card">
      <div className="container max-w-3xl py-4 px-4">
        <WizardProgress ... />
      </div>
    </div>
    
    {/* Step Content */}
    <div className="flex-1 container max-w-2xl py-8 px-4">
      {renderStep()}
    </div>
    
    {/* Bottom Navigation */}
    ...
      <div className="container max-w-2xl py-4 px-4">
```

```tsx
// AFTER
return (
  <div className="min-h-screen bg-background flex flex-col">
    {/* Header with Progress */}
    <div className="sticky top-0 z-10 border-b bg-card shadow-sm">
      <div className="container max-w-5xl py-4 px-6">
        <WizardProgress ... />
      </div>
    </div>
    
    {/* Step Content */}
    <div className="flex-1 container max-w-4xl py-8 px-6">
      {renderStep()}
    </div>
    
    {/* Bottom Navigation */}
    ...
      <div className="container max-w-4xl py-4 px-6">
```

Changes:
- Progress header: `max-w-3xl` → `max-w-5xl`
- Step content: `max-w-2xl` → `max-w-4xl` (now ~896px — room for 2-column layouts)
- Nav: `max-w-2xl` → `max-w-4xl`
- Padding: `px-4` → `px-6` (slightly more breathing room)
- Added `shadow-sm` on the sticky header for visual separation

---

## Change 2: Redesign TransactionReferenceStep Layout

### File: `web/components/wizard/shared/TransactionReferenceStep.tsx`

The biggest win is here. Currently everything stacks vertically. We'll use a 2-column grid for the smaller fields while keeping address and legal description full-width.

Replace the return JSX inside the `<StepCard>` (the `<div className="space-y-6">` block). Keep all the state/handlers above unchanged.

```tsx
return (
  <StepCard
    title="Transaction Reference"
    description="Enter the property and transaction details for the exemption certificate or FinCEN report."
  >
    <div className="space-y-6">
      {/* ===== SECTION 1: Property Address (full width) ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Property Address *</Label>
          <button
            type="button"
            onClick={() => setShowManualAddress(!showManualAddress)}
            className="text-sm text-primary hover:underline"
          >
            {showManualAddress ? "Use autocomplete" : "Enter manually"}
          </button>
        </div>

        {!showManualAddress ? (
          <AddressAutocomplete
            onSelect={handleAddressSelect}
            fetchPropertyData={true}
            showPropertyCard={true}
            placeholder="Start typing property address..."
          />
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={address.street}
                  onChange={(e) => handleAddressChange("street", e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={address.unit || ""}
                  onChange={(e) => handleAddressChange("unit", e.target.value)}
                  placeholder="Apt 4B"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Select
                  value={address.state}
                  onValueChange={(v) => handleAddressChange("state", v)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={address.zip}
                  onChange={(e) => handleAddressChange("zip", e.target.value)}
                  placeholder="90210"
                />
              </div>
              <div>
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  value={address.county || ""}
                  onChange={(e) => handleAddressChange("county", e.target.value)}
                  placeholder="Los Angeles"
                />
              </div>
            </div>
          </div>
        )}

        {/* Auto-filled badges */}
        {(value.apn || value.siteXData?.county) && (
          <div className="flex items-center gap-3 flex-wrap">
            {value.apn && (
              <Badge variant="secondary" className="text-xs">
                APN: {value.apn}
              </Badge>
            )}
            {value.siteXData?.county && (
              <Badge variant="secondary" className="text-xs">
                County: {value.siteXData.county}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">Auto-filled from title plant</span>
          </div>
        )}
      </div>

      {/* ===== SECTION 2: Transaction Details (2-column grid) ===== */}
      <div className="border-t pt-6">
        <Label className="text-base font-medium mb-4 block">Transaction Details</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Escrow Number */}
          <div className="space-y-1.5">
            <Label htmlFor="escrowNumber">Escrow / File Number *</Label>
            <Input
              id="escrowNumber"
              value={value.escrowNumber || ""}
              onChange={(e) => onChange({ escrowNumber: e.target.value })}
              placeholder="2026-001234"
            />
            <p className="text-xs text-muted-foreground">
              Your internal reference number
            </p>
          </div>
          
          {/* Purchase Price */}
          <div className="space-y-1.5">
            <Label htmlFor="purchasePrice">Purchase Price *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="purchasePrice"
                type="text"
                className="pl-7"
                value={value.purchasePrice ? value.purchasePrice.toLocaleString() : ""}
                onChange={(e) => {
                  const numValue = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                  onChange({ purchasePrice: isNaN(numValue) ? null : numValue });
                }}
                placeholder="500,000"
              />
            </div>
          </div>
          
          {/* Closing Date */}
          <div className="space-y-1.5">
            <Label htmlFor="closingDate">Closing Date *</Label>
            <Input
              id="closingDate"
              type="date"
              value={value.closingDate || ""}
              onChange={(e) => onChange({ closingDate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Filed within 30 days of close
            </p>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: Legal Description (2-column: type + text) ===== */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-medium">Legal Description</Label>
          {value.siteXData?.legal_description && (
            <Badge variant="secondary" className="text-xs">
              Auto-filled from title plant
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Description Type — takes 1 column */}
          <div className="space-y-1.5">
            <Label htmlFor="legalDescriptionType">Description Type *</Label>
            <Select
              value={value.legalDescriptionType || undefined}
              onValueChange={(v) => onChange({ legalDescriptionType: v })}
            >
              <SelectTrigger id="legalDescriptionType">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_DESCRIPTION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Format of the legal description
            </p>
          </div>
          
          {/* Description Text — takes 2 columns */}
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="legalDescription">Legal Description *</Label>
            <Textarea
              id="legalDescription"
              value={value.legalDescription || ""}
              onChange={(e) => {
                const text = e.target.value.slice(0, 1000);
                onChange({ legalDescription: text });
              }}
              placeholder="Enter the legal description from the deed or title report..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {(value.legalDescription?.length || 0)} / 1,000 characters
            </p>
          </div>
        </div>
      </div>
    </div>
  </StepCard>
);
```

**What changed:**
- Transaction Details (escrow, price, date) now sit in a **3-column row** on desktop
- Legal Description is a **1 + 2 column** split (type selector left, textarea right)
- Manual address entry uses **4-column grid** (city/state/zip/county on one row)
- Section headers with `border-t` dividers for visual grouping
- Tighter spacing: `space-y-1.5` inside field groups, `space-y-6` between sections
- APN and County badges shown together in a flex row

---

## Change 3: Redesign WizardProgress — Full Journey Visible

### File: `web/components/wizard/WizardProgress.tsx`

Replace the entire file. The new design shows:
- A **two-phase header** (Determination / Collection) — always visible so the user sees the full journey
- **Step dots** within the current phase that progressively reveal
- Current phase is highlighted, future phase is grayed but visible

```tsx
"use client";

import { StepId } from "./types";
import { DETERMINATION_STEPS, COLLECTION_STEPS } from "./constants";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

interface WizardProgressProps {
  phase: "determination" | "collection";
  currentStep: StepId;
  visibleSteps: StepId[];
  onStepClick?: (step: StepId) => void;
}

export function WizardProgress({
  phase,
  currentStep,
  visibleSteps,
  onStepClick,
}: WizardProgressProps) {
  const currentIndex = visibleSteps.indexOf(currentStep);

  // Get visible steps for current phase only
  const determinationVisible = DETERMINATION_STEPS.filter(s => visibleSteps.includes(s.id));
  const collectionVisible = COLLECTION_STEPS.filter(s => visibleSteps.includes(s.id));

  // Determine phase completion
  const determinationComplete = phase === "collection";
  const collectionStarted = phase === "collection";

  // Progress within current phase
  const currentPhaseSteps = phase === "determination" ? determinationVisible : collectionVisible;
  const currentPhaseIndex = currentPhaseSteps.findIndex(s => s.id === currentStep);
  const phaseProgress = currentPhaseSteps.length > 1
    ? ((currentPhaseIndex) / (currentPhaseSteps.length - 1)) * 100
    : currentPhaseIndex === 0 ? 0 : 100;

  return (
    <div className="space-y-3">
      {/* ===== Phase Header — Always shows both phases ===== */}
      <div className="flex items-center gap-2">
        {/* Determination Phase Pill */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            phase === "determination"
              ? "bg-blue-100 text-blue-700"
              : determinationComplete
                ? "bg-blue-50 text-blue-400"
                : "bg-muted text-muted-foreground"
          )}
          onClick={() => {
            if (determinationComplete && determinationVisible.length > 0) {
              onStepClick?.(determinationVisible[0].id);
            }
          }}
          disabled={!determinationComplete}
        >
          {determinationComplete && <CheckCircle2 className="h-3 w-3" />}
          Determination
        </button>

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />

        {/* Collection Phase Pill */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            phase === "collection"
              ? "bg-green-100 text-green-700"
              : "bg-muted text-muted-foreground/50"
          )}
        >
          {!collectionStarted && <Circle className="h-3 w-3" />}
          Collection & Filing
        </div>

        {/* Step Counter — right aligned */}
        <div className="ml-auto text-xs text-muted-foreground">
          Step {currentIndex + 1} of {visibleSteps.length}
        </div>
      </div>

      {/* ===== Progress Bar ===== */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            phase === "determination" ? "bg-blue-500" : "bg-green-500"
          )}
          style={{ width: `${phaseProgress}%` }}
        />
      </div>

      {/* ===== Step Dots — Desktop Only ===== */}
      <div className="hidden md:flex items-center justify-between">
        {currentPhaseSteps.map((step, idx) => {
          const stepIndex = visibleSteps.indexOf(step.id);
          const isComplete = stepIndex < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = stepIndex <= currentIndex && onStepClick;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-1.5 text-xs transition-all group",
                isClickable ? "cursor-pointer" : "cursor-default",
                isCurrent
                  ? "text-foreground font-medium"
                  : isComplete
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40"
              )}
            >
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-all",
                  isCurrent
                    ? phase === "determination"
                      ? "bg-blue-500 text-white shadow-sm shadow-blue-200"
                      : "bg-green-500 text-white shadow-sm shadow-green-200"
                    : isComplete
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground/40"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className="max-w-[90px] text-center leading-tight">
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== Mobile: Current Step Title ===== */}
      <div className="md:hidden text-center">
        <p className="text-sm font-medium">
          {currentPhaseSteps.find(s => s.id === currentStep)?.title}
        </p>
      </div>
    </div>
  );
}
```

**What changed:**
- **Both phases always visible** as pills at the top (Determination → Collection & Filing)
- Determination pill shows ✓ when complete
- Collection pill is grayed until reached — user can see where they're headed
- Progress bar is color-coded per phase (blue = determination, green = collection)
- Step counter is right-aligned ("Step 3 of 8")
- Step dots are cleaner: smaller (h-7 w-7), subtle shadow on current, no heavy borders
- Progress bar is thinner (h-1.5 not h-2) for a more refined look

---

## Change 4: SiteX Loading Feedback

### File: `web/components/AddressAutocomplete.tsx`

Find where the SiteX property lookup is called (the `fetchPropertyData` flow). There should be a loading state when the API call is in flight.

Add a **status message below the input** that shows during lookup. Find the component's JSX and add this after the autocomplete input, before the property card:

Look for where `isLoadingProperty` or similar loading state is set (it may be called `isLookingUp` or `loading`). If no such state exists, add one:

```tsx
const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found" | "error">("idle");
```

Set it during the lookup flow:
```tsx
// Before API call
setLookupStatus("loading");

// On success with data
setLookupStatus("found");

// On success with no data
setLookupStatus("not_found");

// On error
setLookupStatus("error");

// Reset after 3 seconds on found/not_found
setTimeout(() => setLookupStatus("idle"), 3000);
```

Then render the status message below the input:

```tsx
{/* SiteX Lookup Status */}
{lookupStatus === "loading" && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in">
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
    <span>Looking up property records...</span>
  </div>
)}
{lookupStatus === "found" && (
  <div className="flex items-center gap-2 text-sm text-green-600 animate-in fade-in">
    <CheckCircle2 className="h-3.5 w-3.5" />
    <span>Property found — auto-filling details</span>
  </div>
)}
{lookupStatus === "not_found" && (
  <div className="flex items-center gap-2 text-sm text-amber-600 animate-in fade-in">
    <AlertCircle className="h-3.5 w-3.5" />
    <span>No property records found — enter details manually</span>
  </div>
)}
{lookupStatus === "error" && (
  <div className="flex items-center gap-2 text-sm text-red-500 animate-in fade-in">
    <AlertCircle className="h-3.5 w-3.5" />
    <span>Property lookup unavailable — enter details manually</span>
  </div>
)}
```

Make sure to import `Loader2`, `CheckCircle2`, `AlertCircle` from `lucide-react`.

Place this status block right after the `<AddressAutocomplete>` input and before the property card or auto-filled badges.

---

## Change 5: Polish the StepCard

### File: `web/components/wizard/shared/StepCard.tsx`

Small upgrade for a more refined feel:

```tsx
export function StepCard({ title, description, children, footer }: StepCardProps) {
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
      {footer && (
        <div className="border-t px-6 py-4 bg-muted/30">
          {footer}
        </div>
      )}
    </Card>
  );
}
```

Changes: Added `shadow-sm`, tightened header padding with `pb-4`, footer background slightly lighter (`bg-muted/30`).

---

## Summary

| File | Change | Impact |
|------|--------|--------|
| `WizardContainer.tsx` | Widen to `max-w-4xl` / `max-w-5xl` | All steps get more horizontal space |
| `TransactionReferenceStep.tsx` | 3-column transaction details, 1+2 legal description | Step 0 uses horizontal space properly |
| `WizardProgress.tsx` | Full rewrite — both phases visible, color-coded, step counter | User always sees where they are in the journey |
| `AddressAutocomplete.tsx` | Add `lookupStatus` state + status messages | User knows what's happening during SiteX lookup |
| `StepCard.tsx` | Minor polish — shadow, padding | Cleaner card appearance |

## DO NOT

- ❌ Change any determination logic or step visibility rules
- ❌ Change field names or data structures
- ❌ Remove the manual address entry toggle
- ❌ Change useWizardNavigation hook logic
- ❌ Modify useAutoSave
- ❌ Change any backend files
- ❌ Remove mobile responsive behavior
