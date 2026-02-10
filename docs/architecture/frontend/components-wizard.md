# Wizard Component

> `web/components/rrer-questionnaire.tsx` (3,214 lines)
> Main questionnaire component for report determination and collection.

## Overview

The wizard component handles the complete report workflow from property information through filing. It's the largest single component in the frontend and contains all the form logic, validation, and step navigation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  RRER QUESTIONNAIRE                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   STEP NAVIGATION                    │    │
│  │  [Property] [Financing] [Buyer] [Exemptions] [...]  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    STEP CONTENT                      │    │
│  │                                                      │    │
│  │  <CurrentStepComponent />                           │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    NAVIGATION                        │    │
│  │          [Back]              [Next/Continue]        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Phases and Steps

### Phase 1: Determination

| Step ID | Title | Purpose |
|---------|-------|---------|
| `property` | Property Information | Property type, address |
| `intent-to-build` | Construction | Intent to build check |
| `financing` | Financing | Cash vs. financed |
| `buyer-type` | Buyer Type | Individual, entity, trust |
| `entity-exemptions` | Entity Exemptions | 15 entity exemption checks |
| `trust-exemptions` | Trust Exemptions | 4 trust exemption checks |
| `determination-result` | Result | Reportable or exempt |

### Phase 2: Collection

| Step ID | Title | Purpose |
|---------|-------|---------|
| `transaction-property` | Transaction Details | Sale price, dates |
| `seller-info` | Seller Information | Transferor details |
| `buyer-info` | Buyer Information | Transferee details |
| `beneficial-owners` | Beneficial Owners | 25%+ owners (entity) |
| `payment-info` | Payment Information | Payment sources |

### Phase 3: Summary

| Step ID | Title | Purpose |
|---------|-------|---------|
| `generate-links` | Generate Links | Create party portal links |
| `file-report` | File Report | Submit to FinCEN |

---

## State Management

### Main State

```typescript
const [state, setState] = useState<QuestionnaireState>({
  phase: 'determination',
  currentStep: 'property',
  determination: {
    isResidential: undefined,
    hasFinancing: undefined,
    buyerType: undefined,
    entityExemptions: [],
    trustExemptions: [],
    // ...
  },
  collection: {
    property: null,
    sellers: [],
    buyers: [],
    beneficialOwners: [],
    paymentSources: [],
    // ...
  }
})
```

### Step Navigation

```typescript
const goToStep = (stepId: string) => {
  setState(prev => ({
    ...prev,
    currentStep: stepId
  }))
  triggerSave()
}

const goNext = () => {
  const nextStep = getNextStep(state.currentStep)
  if (nextStep) goToStep(nextStep)
}

const goBack = () => {
  const prevStep = getPreviousStep(state.currentStep)
  if (prevStep) goToStep(prevStep)
}
```

### Auto-Save

```typescript
const triggerSave = useMemo(
  () => debounce(async () => {
    await saveWizard(reportId, state.currentStep, state)
  }, 1500),
  [reportId, state]
)

// Called on every state change
useEffect(() => {
  if (isDirty) {
    triggerSave()
  }
}, [state, isDirty])
```

---

## Step Components

### Property Step

```tsx
<Card>
  <CardHeader>
    <CardTitle>Property Information</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <FormField label="Property Type">
        <Select
          value={state.determination.propertyType}
          onValueChange={v => updateDetermination('propertyType', v)}
        >
          {PROPERTY_TYPES.map(type => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </Select>
      </FormField>

      <FormField label="Property Address">
        <AddressInput
          value={state.collection.property?.address}
          onChange={address => updateCollection('property.address', address)}
        />
      </FormField>
    </div>
  </CardContent>
</Card>
```

### Entity Exemptions Step

```tsx
<Card>
  <CardHeader>
    <CardTitle>Entity Exemptions</CardTitle>
    <CardDescription>
      Select any exemptions that apply to the buyer entity.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {ENTITY_EXEMPTIONS.map(exemption => (
        <div key={exemption.value} className="flex items-start space-x-3">
          <Checkbox
            checked={state.determination.entityExemptions.includes(exemption.value)}
            onCheckedChange={checked => toggleExemption(exemption.value, checked)}
          />
          <div>
            <Label>{exemption.label}</Label>
            <p className="text-sm text-muted-foreground">{exemption.description}</p>
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

### Determination Result Step

```tsx
<Card className={isReportable ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      {isReportable ? (
        <>
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Report Required
        </>
      ) : (
        <>
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Exempt - No Report Required
        </>
      )}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <h4>Reasoning:</h4>
    <ul className="list-disc pl-5 space-y-1">
      {reasoning.map((reason, i) => (
        <li key={i}>{reason}</li>
      ))}
    </ul>
  </CardContent>
</Card>
```

---

## Form Patterns

### Address Input

```tsx
interface AddressInputProps {
  value: Address
  onChange: (address: Address) => void
}

function AddressInput({ value, onChange }: AddressInputProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Input
          placeholder="Street Address"
          value={value.street}
          onChange={e => onChange({ ...value, street: e.target.value })}
        />
      </div>
      <Input
        placeholder="City"
        value={value.city}
        onChange={e => onChange({ ...value, city: e.target.value })}
      />
      <Select
        value={value.state}
        onValueChange={state => onChange({ ...value, state })}
      >
        {US_STATES.map(state => (
          <SelectItem key={state.value} value={state.value}>
            {state.label}
          </SelectItem>
        ))}
      </Select>
      <Input
        placeholder="ZIP Code"
        value={value.zip}
        onChange={e => onChange({ ...value, zip: e.target.value })}
      />
    </div>
  )
}
```

### Repeating Items (Sellers, Buyers, BOs)

```tsx
function SellersSection({ sellers, onChange }) {
  const addSeller = () => {
    onChange([...sellers, createEmptySeller()])
  }

  const removeSeller = (index: number) => {
    onChange(sellers.filter((_, i) => i !== index))
  }

  const updateSeller = (index: number, data: Partial<SellerData>) => {
    const updated = [...sellers]
    updated[index] = { ...updated[index], ...data }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {sellers.map((seller, index) => (
        <Card key={seller.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Seller {index + 1}</CardTitle>
              {sellers.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeSeller(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <SellerForm
              value={seller}
              onChange={data => updateSeller(index, data)}
            />
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addSeller}>
        <Plus className="h-4 w-4 mr-2" />
        Add Another Seller
      </Button>
    </div>
  )
}
```

---

## API Integration

### Determination

```typescript
const runDetermination = async () => {
  setLoading(true)
  try {
    const result = await determine(reportId)
    setDeterminationResult(result)

    if (result.is_reportable) {
      goToStep('transaction-property')
    } else {
      // Show exempt result
      goToStep('determination-result')
    }
  } finally {
    setLoading(false)
  }
}
```

### Generate Party Links

```typescript
const generateLinks = async () => {
  const parties = [
    ...state.collection.buyers.map(b => ({
      party_role: 'transferee',
      entity_type: b.entityType,
      display_name: b.legalName || b.firstName + ' ' + b.lastName
    })),
    ...state.collection.sellers.map(s => ({
      party_role: 'transferor',
      entity_type: s.entityType,
      display_name: s.legalName || s.firstName + ' ' + s.lastName
    }))
  ]

  const response = await createPartyLinks(reportId, { parties })
  setPartyLinks(response.links)
}
```

### File Report

```typescript
const fileReport = async () => {
  // First check if ready
  const readyCheck = await readyCheck(reportId)
  if (!readyCheck.is_ready) {
    setMissing(readyCheck.missing)
    return
  }

  // File it
  const result = await fileReport(reportId)
  setFilingResult(result)
}
```

---

## Props

```typescript
interface RrerQuestionnaireProps {
  reportId: string
  initialData?: QuestionnaireState
  initialStep?: string
  onSave?: (step: string, data: QuestionnaireState) => void
  onComplete?: (result: FilingResult) => void
}
```

---

## Key Constants (from rrer-types.ts)

- `PROPERTY_TYPES` - 5 property types
- `ENTITY_TYPES` - 9 entity types
- `TRUST_TYPES` - 6 trust types
- `ENTITY_EXEMPTIONS` - 15 exemptions
- `TRUST_EXEMPTIONS` - 4 exemptions
- `PAYMENT_SOURCE_TYPES` - 7 types
- `US_STATES` - 50 states + DC
- `SIGNING_CAPACITIES` - 8 roles

---

## Related Files

- **Types:** `web/lib/rrer-types.ts`
- **API Client:** `web/lib/api.ts`
- **Page Wrapper:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`
- **Backend:**
  - `api/app/routes/reports.py`
  - `api/app/services/determination.py`
