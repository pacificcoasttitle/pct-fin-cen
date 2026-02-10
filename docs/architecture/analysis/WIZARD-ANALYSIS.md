# Wizard Component Analysis

> `web/components/rrer-questionnaire.tsx` — 3214 lines

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Lines** | 3,214 |
| **useState Calls** | 9 |
| **useMemo Calls** | ~8 |
| **useEffect Calls** | 2 |
| **console.log** | 0 |
| **TODO/FIXME/HACK** | 0 |
| **className Occurrences** | 417 |
| **Longest className** | 119 chars |

**Verdict:** The file is clean (no debug code) but suffers from **massive duplication** in form sections. Approximately **40-50% of the file** consists of repeated patterns that could be extracted into reusable components.

---

## Section Breakdown

### Lines 1-134: Imports & Helper Components (134 lines)

| Range | Content |
|-------|---------|
| 1-65 | Imports (React, UI components, icons, types) |
| 66-78 | Constants: `initialDetermination`, `initialCollection` |
| 80-117 | **TooltipIcon** helper component (already extracted inline) |
| 119-133 | More import-related declarations |

### Lines 135-235: Extracted Helpers (100 lines)

| Component | Lines | Purpose |
|-----------|-------|---------|
| **AddressFields** | 135-213 | Reusable address form (street, city, state, zip) |
| **SectionHeader** | 215-235 | Card header with step label, title, description |

These are **already extracted** — good patterns to replicate.

### Lines 237-285: Component Setup (48 lines)

| Range | Content |
|-------|---------|
| 237-255 | `RRERQuestionnaireProps` interface definition |
| 256-271 | **9 useState declarations** (see State Audit below) |
| 273-285 | **2 useEffect hooks** (auto-save, props sync) |

### Lines 287-572: Business Logic (285 lines)

| Range | Content | Complexity |
|-------|---------|------------|
| 287-364 | `determinationResult` useMemo | HIGH — 77 lines of nested conditionals |
| 366-412 | `relevantDeterminationSteps` useMemo | MEDIUM |
| 414-440 | `collectionSteps` useMemo | LOW |
| 442-458 | `progress` useMemo | LOW |
| 460-490 | Navigation handlers (`goToNext...`, `goToPrevious...`) | LOW |
| 492-510 | `canProceed` validation | MEDIUM |
| 512-530 | `toggleExemption` handler | LOW |
| 532-550 | `paymentTotal`, `paymentRemaining` useMemo | LOW |
| 552-572 | `sectionCompletion` useMemo | MEDIUM |

### Lines 574-1113: PHASE 1 — Determination UI (539 lines)

| Step | Lines | Size |
|------|-------|------|
| property | 590-650 | 60 |
| intent-to-build | 652-700 | 48 |
| financing | 702-780 | 78 |
| lender-aml | 782-830 | 48 |
| buyer-type | 832-920 | 88 |
| individual-exemptions | 922-980 | 58 |
| entity-exemptions | 982-1040 | 58 |
| trust-exemptions | 1042-1080 | 38 |
| determination-result | 1082-1113 | 31 |

**Duplication:** The three exemption steps are nearly identical (checkbox lists with different data).

### Lines 1115-1232: Transaction/Property Section (117 lines)

Basic form fields for property address, sale price, closing date. Uses `AddressFields` component.

### Lines 1234-1508: Seller Info Section (274 lines)

| Seller Type | Lines | Pattern |
|-------------|-------|---------|
| Individual | 1286-1350 | Name fields + AddressFields + SSN |
| Entity | 1352-1420 | Entity fields + AddressFields + EIN |
| Trust | 1422-1490 | Trust fields + AddressFields + EIN |

**MAJOR DUPLICATION:** Each seller type repeats:
- Name/entity name field pattern (~15 lines)
- AddressFields invocation (~5 lines)
- TIN/SSN/EIN field pattern (~20 lines)
- Delete button pattern (~10 lines)

### Lines 1510-2189: Buyer Info Section (679 lines)

| Buyer Type | Lines | Subsections |
|------------|-------|-------------|
| Entity | 1520-1850 | Entity info + Beneficial Owners list |
| Trust | 1852-2189 | Trust info + Trustees + Settlors + Beneficiaries |

**MASSIVE DUPLICATION:**
- Beneficial owner forms repeat individual pattern (~80 lines each)
- Trustee forms repeat individual/entity pattern (~100 lines each)
- Settlor forms repeat individual/entity pattern (~100 lines each)

### Lines 2191-2423: Signing Individuals (232 lines)

Repeated individual info forms with capacity selection.

### Lines 2425-2664: Payment Info Section (239 lines)

Payment source forms with nested array updates.

### Lines 2666-2846: Reporting Person Section (180 lines)

Designation agreement logic with conditional fields.

### Lines 2848-3021: Certifications Section (173 lines)

| Certification | Lines |
|---------------|-------|
| Buyer Certification | 2856-2938 |
| Seller Certification | 2940-3006 |

**DUPLICATION:** Both certification forms are nearly identical (~80 lines each with same structure).

### Lines 3023-3214: Summary & Footer (191 lines)

Filing summary, deadline calculations, document generation options, footer.

---

## Duplicate Pattern Analysis

### Pattern 1: Individual Info Form (~80 lines repeated 8+ times)

```
Locations:
- Seller Individual: 1286-1350
- Beneficial Owner: 1600-1680 (per BO)
- Trustee Individual: 1900-1960
- Settlor Individual: 2000-2060
- Trust Beneficiary: 2080-2140
- Signing Individual: 2200-2280
```

**Fields repeated:**
- First Name, Middle Name, Last Name, Suffix
- Date of Birth
- SSN (last 4)
- AddressFields
- Phone, Email

**Extraction opportunity:** `<IndividualInfoForm value={} onChange={} />`

### Pattern 2: Entity Info Form (~60 lines repeated 4+ times)

```
Locations:
- Seller Entity: 1352-1420
- Buyer Entity: 1520-1600
- Trustee Entity: 1960-2000
- Settlor Entity: 2060-2100
```

**Fields repeated:**
- Legal Name
- Entity Type (Select)
- EIN
- Formation State, Formation Date
- AddressFields

**Extraction opportunity:** `<EntityInfoForm value={} onChange={} />`

### Pattern 3: Trust Info Form (~50 lines repeated 2+ times)

```
Locations:
- Seller Trust: 1422-1490
- Buyer Trust: 1852-1920
```

**Extraction opportunity:** `<TrustInfoForm value={} onChange={} />`

### Pattern 4: Exemption Checkbox List (~40 lines repeated 3 times)

```
Locations:
- Individual Exemptions: 922-980
- Entity Exemptions: 982-1040
- Trust Exemptions: 1042-1080
```

**Extraction opportunity:** `<ExemptionChecklist type="entity" selected={} onToggle={} />`

### Pattern 5: Certification Form (~80 lines repeated 2 times)

```
Locations:
- Buyer Certification: 2856-2938
- Seller Certification: 2940-3006
```

**Extraction opportunity:** `<CertificationForm title="" items={} value={} onChange={} />`

### Pattern 6: Nested Array Update (~10 lines repeated 30+ times)

```typescript
// This pattern appears everywhere:
setCollection(prev => ({
  ...prev,
  arrayField: (prev.arrayField || []).map(item =>
    item.id === targetId ? { ...item, field: newValue } : item
  )
}))
```

**Extraction opportunity:** Generic `updateArrayItem(setCollection, 'arrayField', id, { field: value })`

---

## State Variable Audit

| Variable | Type | Lines Used | Purpose |
|----------|------|------------|---------|
| `phase` | `'determination' \| 'collection' \| 'summary'` | ~50 | Current wizard phase |
| `determinationStep` | `DeterminationStepId` | ~30 | Current step in Phase 1 |
| `collectionStep` | `CollectionStepId` | ~40 | Current step in Phase 2 |
| `determination` | `DeterminationState` | ~100 | Phase 1 form data |
| `collection` | `CollectionData` | ~500+ | Phase 2 form data (massive) |
| `isAutoSaving` | `boolean` | 5 | Auto-save indicator |
| `showExitDialog` | `boolean` | 3 | Exit confirmation modal |
| `expandedSections` | `Set<string>` | 0 | **UNUSED** — appears declared but never used |
| `filingDeadline` | `object \| null` | ~20 | Calculated deadline |

**Finding:** `expandedSections` may be dead state.

---

## Inline Style Analysis

| Pattern | Count | Examples |
|---------|-------|----------|
| `className="..."` | 417 | All over |
| Longest className | 119 chars | Complex utility strings |
| Conditional classes | ~50 | `${condition ? "..." : "..."}` |
| Template literals | ~30 | `` className={`...`} `` |

**No inline `style={}` props found** — all styling via Tailwind.

**Long className examples:**
```
"flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
"grid gap-4 md:grid-cols-2 lg:grid-cols-3"
```

These are fine — Tailwind utility classes are verbose by design.

---

## Dead/Debug Code Audit

| Check | Result |
|-------|--------|
| `console.log` | 0 found |
| `console.warn` | 0 found |
| `console.error` | 0 found |
| `debugger` | 0 found |
| `TODO` comments | 0 found |
| `FIXME` comments | 0 found |
| `HACK` comments | 0 found |
| `@ts-ignore` | 0 found |
| Commented-out code blocks | 0 found |

**Verdict:** No debug code present. File is production-ready from a debug perspective.

---

## Component Extraction Opportunities

### Priority 1: High-Impact Extractions

| Component | Est. Lines | Reduces File By | Locations |
|-----------|-----------|-----------------|-----------|
| `IndividualInfoForm` | 80 | ~500 lines | 6+ locations |
| `EntityInfoForm` | 60 | ~200 lines | 4+ locations |
| `TrustInfoForm` | 50 | ~100 lines | 2+ locations |
| `ExemptionChecklist` | 40 | ~80 lines | 3 locations |

### Priority 2: Medium-Impact Extractions

| Component | Est. Lines | Reduces File By | Locations |
|-----------|-----------|-----------------|-----------|
| `CertificationForm` | 80 | ~80 lines | 2 locations |
| `PaymentSourceForm` | 100 | ~100 lines | 1 location (but complex) |
| `SigningIndividualForm` | 80 | ~80 lines | 1 location |

### Priority 3: Utility Extractions

| Utility | Purpose |
|---------|---------|
| `useArrayField(setState, field)` | Generic nested array update hook |
| `useAutoSave(data, onSave)` | Debounced auto-save hook |

---

## Recommended Refactoring Order

1. **Extract `IndividualInfoForm`** — Highest ROI, used 6+ times
2. **Extract `EntityInfoForm`** — Used 4+ times
3. **Extract `ExemptionChecklist`** — Simple, used 3 times
4. **Create `useArrayField` hook** — Eliminates 30+ repetitive update patterns
5. **Extract `TrustInfoForm`** — Used 2+ times
6. **Extract `CertificationForm`** — Used 2 times
7. **Move business logic to custom hook** — `useDetermination()` for lines 287-572

---

## Estimated Post-Refactor Size

| Phase | Current | After Extraction |
|-------|---------|------------------|
| Imports & Setup | 285 | 150 |
| Business Logic | 285 | 100 (moved to hooks) |
| Determination UI | 539 | 300 |
| Collection UI | 1,800+ | 600 |
| Summary UI | 200 | 150 |
| **Total** | **3,214** | **~1,300** |

**Projected reduction: ~60%**

---

## File Structure Recommendation

```
web/components/rrer/
├── questionnaire.tsx          # Main orchestrator (~1,300 lines)
├── forms/
│   ├── individual-info.tsx    # IndividualInfoForm
│   ├── entity-info.tsx        # EntityInfoForm
│   ├── trust-info.tsx         # TrustInfoForm
│   ├── address-fields.tsx     # Already exists inline
│   ├── payment-source.tsx     # PaymentSourceForm
│   ├── certification.tsx      # CertificationForm
│   └── signing-individual.tsx # SigningIndividualForm
├── steps/
│   ├── determination/
│   │   ├── property.tsx
│   │   ├── financing.tsx
│   │   ├── buyer-type.tsx
│   │   └── exemptions.tsx     # Unified exemption checklist
│   ├── collection/
│   │   ├── seller-info.tsx
│   │   ├── buyer-info.tsx
│   │   ├── payment-info.tsx
│   │   └── certifications.tsx
│   └── summary.tsx
├── hooks/
│   ├── use-determination.ts   # Determination logic
│   ├── use-auto-save.ts       # Auto-save with debounce
│   └── use-array-field.ts     # Nested array updates
└── types.ts                   # (already exists as rrer-types.ts)
```

---

## Summary

The wizard component is **functionally complete** and **production-ready** from a feature perspective. It has:
- Zero debug code
- Zero TODO markers
- Consistent patterns throughout

However, it suffers from **severe code duplication** that makes it:
- Hard to maintain (changes require updates in 6+ places)
- Risk-prone (easy to update one form but forget others)
- Unnecessarily large (3,214 lines vs estimated 1,300 after refactor)

**Recommendation:** Prioritize extracting `IndividualInfoForm` and `EntityInfoForm` as they would eliminate ~700 lines of duplication alone.
