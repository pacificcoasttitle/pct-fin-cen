# Modernize Wizard UI — Match Website Theme

## Goal

Update the RRER Wizard UI to match the beautiful, modern theme of the FinClear website. 
**Critical: Preserve ALL functionality. This is a visual refresh only.**

---

## Phase 1: Extract Website Theme

### Analyze the landing page / marketing site

```bash
# Find the main landing page
cat web/app/page.tsx | head -200

# Find global styles
cat web/app/globals.css

# Find Tailwind config for theme colors
cat tailwind.config.ts

# Find any theme or design system files
find web -name "theme*" -o -name "design*" -o -name "colors*" | head -10
ls web/lib/
```

### Document the theme elements

**Extract these from the website:**

| Element | Current Value | Location |
|---------|---------------|----------|
| Primary color | ? | tailwind.config.ts |
| Secondary color | ? | tailwind.config.ts |
| Accent color | ? | tailwind.config.ts |
| Background | ? | globals.css |
| Card style | ? | Landing page components |
| Button style | ? | ui/button.tsx |
| Typography | ? | globals.css / tailwind |
| Border radius | ? | tailwind.config.ts |
| Shadows | ? | tailwind.config.ts |
| Spacing scale | ? | tailwind.config.ts |

### Capture the visual language

```bash
# Check existing UI components
ls web/components/ui/

# See button variants
cat web/components/ui/button.tsx

# See card component
cat web/components/ui/card.tsx

# See input styling
cat web/components/ui/input.tsx
```

---

## Phase 2: Audit Current Wizard

### Examine wizard structure

```bash
# Full wizard component
cat web/components/rrer-questionnaire.tsx

# Count lines to understand scope
wc -l web/components/rrer-questionnaire.tsx

# Find all UI components used
grep -n "import.*from.*ui\|Card\|Button\|Input\|Select" web/components/rrer-questionnaire.tsx | head -30
```

### Document current wizard UI patterns

**Catalog what exists:**
- [ ] Progress indicator (steps/phases)
- [ ] Section headers
- [ ] Form field layouts
- [ ] Help text / tooltips
- [ ] Validation messages
- [ ] Navigation buttons (Next/Back)
- [ ] Summary/review sections
- [ ] Status badges
- [ ] Cards for grouping
- [ ] Accordions / collapsibles

### Identify related wizard components

```bash
# Find all wizard-related components
find web/components -name "*wizard*" -o -name "*questionnaire*" -o -name "*party*" | head -20

# Party portal forms (should match wizard style)
ls web/components/party-portal/

# Find form components
find web/components -name "*Form*" -o -name "*form*" | head -20
```

---

## Phase 3: Design System Alignment

### Create consistent component patterns

**Before making changes, define the target patterns:**

#### Cards
```tsx
// Standard card for wizard sections
<Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
    <CardTitle className="text-xl font-semibold text-gray-900">
      Section Title
    </CardTitle>
    <CardDescription className="text-gray-600">
      Helper text explaining this section
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6 space-y-6">
    {/* Form fields */}
  </CardContent>
</Card>
```

#### Form Fields
```tsx
// Consistent field wrapper
<div className="space-y-2">
  <Label className="text-sm font-medium text-gray-700">
    Field Label
    {required && <span className="text-red-500 ml-1">*</span>}
  </Label>
  <Input 
    className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
    placeholder="Placeholder text..."
  />
  <p className="text-sm text-gray-500">Help text if needed</p>
</div>
```

#### Progress Indicator
```tsx
// Modern step indicator
<div className="flex items-center justify-between mb-8">
  {steps.map((step, index) => (
    <div key={step.id} className="flex items-center">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
        index < currentStep 
          ? "bg-green-500 text-white" 
          : index === currentStep
          ? "bg-blue-600 text-white ring-4 ring-blue-100"
          : "bg-gray-100 text-gray-400"
      )}>
        {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
      </div>
      {index < steps.length - 1 && (
        <div className={cn(
          "w-full h-1 mx-2",
          index < currentStep ? "bg-green-500" : "bg-gray-200"
        )} />
      )}
    </div>
  ))}
</div>
```

#### Buttons
```tsx
// Primary action
<Button 
  className="h-12 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/25"
>
  Continue
  <ArrowRight className="w-4 h-4 ml-2" />
</Button>

// Secondary action
<Button 
  variant="outline"
  className="h-12 px-8 rounded-xl border-2 font-semibold"
>
  <ArrowLeft className="w-4 h-4 mr-2" />
  Back
</Button>
```

---

## Phase 4: Modernization Checklist

### Global Changes (apply everywhere)

- [ ] **Border radius:** Change from `rounded-md` to `rounded-xl` or `rounded-2xl`
- [ ] **Shadows:** Add `shadow-lg` or `shadow-xl` to cards
- [ ] **Input height:** Increase to `h-12` for better touch targets
- [ ] **Spacing:** Use `space-y-6` instead of `space-y-4` for breathing room
- [ ] **Colors:** Use gradient backgrounds for headers
- [ ] **Typography:** Increase heading sizes, use font-semibold

### Progress Indicator

- [ ] Replace basic steps with visual stepper (circles + connecting lines)
- [ ] Show completed steps with checkmarks
- [ ] Add step labels below circles
- [ ] Animate transitions between steps

### Section Headers

- [ ] Add subtle gradient backgrounds
- [ ] Include descriptive subtitles
- [ ] Add relevant icons next to titles
- [ ] Use consistent heading hierarchy

### Form Fields

- [ ] Larger input fields (h-12)
- [ ] Rounded corners (rounded-xl)
- [ ] Clear focus states with ring
- [ ] Inline validation with icons
- [ ] Help text below fields

### Buttons

- [ ] Primary: Gradient background with shadow
- [ ] Secondary: Outlined with hover fill
- [ ] Add icons (arrows, checkmarks)
- [ ] Consistent sizing (h-12)
- [ ] Loading states with spinners

### Cards & Containers

- [ ] Remove harsh borders, use shadows instead
- [ ] Add subtle background gradients
- [ ] Increase padding
- [ ] Group related fields visually

### Party/Beneficial Owner Cards

- [ ] Card-based layout for each party
- [ ] Status indicator (badge)
- [ ] Expandable details
- [ ] Action buttons (edit, remove, resend link)

### Review/Summary Sections

- [ ] Clean data display grid
- [ ] Checkmarks for completed items
- [ ] Warning badges for missing data
- [ ] Clear call-to-action for filing

---

## Phase 5: Specific Component Updates

### Update rrer-questionnaire.tsx

```tsx
// Add these imports if not present
import { cn } from "@/lib/utils";
import { 
  ArrowRight, ArrowLeft, Check, AlertCircle, 
  Building2, User, FileText, CreditCard, Home 
} from "lucide-react";

// Wrap the entire wizard in a container
<div className="max-w-4xl mx-auto px-4 py-8">
  {/* Progress indicator */}
  <WizardProgress currentStep={currentStep} steps={steps} />
  
  {/* Main content card */}
  <Card className="border-0 shadow-xl rounded-2xl overflow-hidden mt-8">
    <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-xl">
          <StepIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <CardTitle className="text-xl">{stepTitle}</CardTitle>
          <CardDescription>{stepDescription}</CardDescription>
        </div>
      </div>
    </CardHeader>
    
    <CardContent className="p-8">
      {/* Step content */}
    </CardContent>
    
    <CardFooter className="bg-gray-50 border-t px-8 py-4 flex justify-between">
      <Button variant="outline" onClick={goBack} disabled={isFirstStep}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <Button onClick={goNext} className="bg-gradient-to-r from-blue-600 to-indigo-600">
        {isLastStep ? "Review & Submit" : "Continue"}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </CardFooter>
  </Card>
</div>
```

### Create WizardProgress component

```tsx
// web/components/wizard/WizardProgress.tsx

interface WizardProgressProps {
  currentStep: number;
  steps: { id: string; title: string; icon: React.ComponentType }[];
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  return (
    <div className="relative">
      {/* Progress bar background */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
      
      {/* Progress bar fill */}
      <div 
        className="absolute top-5 left-0 h-0.5 bg-blue-600 transition-all duration-500"
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      />
      
      {/* Step indicators */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                isComplete && "bg-green-500 text-white",
                isCurrent && "bg-blue-600 text-white ring-4 ring-blue-100",
                !isComplete && !isCurrent && "bg-gray-100 text-gray-400"
              )}>
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span className={cn(
                "mt-2 text-xs font-medium",
                isCurrent ? "text-blue-600" : "text-gray-500"
              )}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Phase 6: Preserve Functionality Checklist

**DO NOT CHANGE these behaviors:**

- [ ] Step navigation logic (next/back/skip)
- [ ] Form validation rules
- [ ] API calls and data submission
- [ ] Conditional step logic (exemption paths)
- [ ] Auto-save functionality
- [ ] Party portal link generation
- [ ] Filing submission flow
- [ ] Status transitions
- [ ] Error handling

**ONLY CHANGE:**

- [ ] CSS classes (colors, spacing, radius)
- [ ] Component structure (wrappers, containers)
- [ ] Visual indicators (progress, status)
- [ ] Button text and icons
- [ ] Layout and spacing
- [ ] Typography sizing

---

## Phase 7: Testing After Changes

### Visual regression check

1. Go through every wizard step
2. Screenshot each step before/after
3. Verify all form fields render
4. Verify all buttons work
5. Verify conditional logic still works

### Functional regression check

1. Complete a full wizard flow (reportable path)
2. Complete a full wizard flow (exempt path)
3. Add parties and send portal links
4. Verify party portal matches new style
5. Complete filing submission

### Responsive check

1. Test on desktop (1920px)
2. Test on laptop (1366px)
3. Test on tablet (768px)
4. Test on mobile (375px)

---

## Phase 8: Party Portal Alignment

The party portal (`/p/[token]`) should match the wizard style.

```bash
# Find party portal components
ls web/app/p/
cat web/app/p/\[token\]/page.tsx | head -100

# Find party portal form components
ls web/components/party-portal/
```

Apply the same styling:
- Same card styles
- Same input styles
- Same button styles
- Same progress indicators
- Same color scheme

---

## Summary: Files to Modify

| File | Changes |
|------|---------|
| `web/components/rrer-questionnaire.tsx` | Main wizard styling |
| `web/components/wizard/WizardProgress.tsx` | New progress component |
| `web/components/party-portal/*.tsx` | Match wizard style |
| `web/app/(app)/app/reports/new/page.tsx` | Entry form styling |
| `web/app/(app)/app/reports/[id]/wizard/page.tsx` | Wrapper styling |
| `tailwind.config.ts` | Verify theme colors |

---

## Quick Reference: Design Tokens

Use these consistently throughout:

```tsx
// Colors
const colors = {
  primary: "blue-600",
  primaryHover: "blue-700", 
  primaryGradient: "from-blue-600 to-indigo-600",
  success: "green-500",
  warning: "amber-500",
  error: "red-500",
  background: "slate-50",
  cardBg: "white",
  border: "gray-200",
  text: "gray-900",
  textMuted: "gray-500",
};

// Spacing
const spacing = {
  cardPadding: "p-6 md:p-8",
  sectionGap: "space-y-6",
  fieldGap: "space-y-2",
};

// Radii
const radii = {
  button: "rounded-xl",
  card: "rounded-2xl",
  input: "rounded-xl",
  badge: "rounded-full",
};

// Shadows
const shadows = {
  card: "shadow-xl",
  button: "shadow-lg shadow-blue-500/25",
  input: "shadow-sm",
};
```

---

## Final Note

**Start with the main wizard component (`rrer-questionnaire.tsx`).** 

Once that looks good, propagate the same patterns to:
1. Entry form (`/app/reports/new`)
2. Party portal forms
3. Review pages
4. Any other wizard-related UI

Keep functionality intact. Only change visuals. Test thoroughly.
