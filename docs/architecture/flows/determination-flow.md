# Determination Flow

> FinCEN RRER reportability determination logic.

## Overview

The determination flow evaluates whether a real estate transaction requires reporting to FinCEN under the Real Estate Reporting Requirements (RRER).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       DETERMINATION FLOW                                 │
│                                                                         │
│  PROPERTY ──► FINANCING ──► BUYER TYPE ──► EXEMPTIONS ──► RESULT       │
│      │            │              │              │              │        │
│      ▼            ▼              ▼              ▼              ▼        │
│  Residential?  Cash/Non-     Individual    Check 15+      REPORTABLE   │
│               financed?      Entity        exemptions        or        │
│                              Trust                        EXEMPT       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Decision Tree

```
START
  │
  ▼
┌─────────────────────────────────────┐
│ Q1: Is property residential?        │
│                                     │
│ Types: 1-4 family, condo, townhome, │
│        coop, vacant residential land│
└─────────────────────────────────────┘
  │
  ├── NO ──────────────────────────────────► EXEMPT (Non-residential)
  │
  YES
  │
  ▼
┌─────────────────────────────────────┐
│ Q2: Is there financing?             │
│                                     │
│ Check: conventional mortgage,       │
│        FHA, VA, other regulated     │
└─────────────────────────────────────┘
  │
  ├── YES (Conventional) ──────────────────► EXEMPT (Regulated financing)
  ├── YES (FHA/VA) ────────────────────────► EXEMPT (Government-backed)
  │
  NO / Cash / Seller-financed
  │
  ▼
┌─────────────────────────────────────┐
│ Q3: Who is the buyer?               │
│                                     │
│ Types: Individual, Entity, Trust    │
└─────────────────────────────────────┘
  │
  ├── INDIVIDUAL ─────────────────────────► Check Individual Exemptions
  ├── ENTITY ─────────────────────────────► Check Entity Exemptions
  └── TRUST ──────────────────────────────► Check Trust Exemptions
```

---

## Exemption Checks

### Individual Exemptions (8)

```
┌─────────────────────────────────────┐
│ Individual Exemption Checks         │
│                                     │
│ ☐ Transfer between spouses          │
│ ☐ Court-ordered transfer            │
│ ☐ Gift or devise (inheritance)      │
│ ☐ Bankruptcy proceeding             │
│ ☐ Foreclosure                       │
│ ☐ Tax sale                          │
│ ☐ Condemnation                      │
│ ☐ Employer relocation               │
└─────────────────────────────────────┘
  │
  ├── Any checked? ─────────────────────► EXEMPT (with reason)
  │
  └── None checked ─────────────────────► REPORTABLE
```

### Entity Exemptions (15)

```
┌─────────────────────────────────────┐
│ Entity Exemption Checks             │
│                                     │
│ ☐ Publicly traded company           │
│ ☐ Regulated financial institution   │
│ ☐ Government entity                 │
│ ☐ 501(c)(3) nonprofit               │
│ ☐ Bank subsidiary                   │
│ ☐ Insurance company                 │
│ ☐ SEC investment company            │
│ ☐ Venture capital fund              │
│ ☐ CPA firm                          │
│ ☐ Public utility                    │
│ ☐ Pooled investment vehicle         │
│ ☐ Tax-exempt entity                 │
│ ☐ Employee benefit plan (ERISA)     │
│ ☐ Bank holding company              │
│ ☐ Foreign pooled investment         │
└─────────────────────────────────────┘
  │
  ├── Any checked? ─────────────────────► EXEMPT (with code)
  │
  └── None checked ─────────────────────► REPORTABLE
```

### Trust Exemptions (4)

```
┌─────────────────────────────────────┐
│ Trust Exemption Checks              │
│                                     │
│ ☐ Statutory trust                   │
│ ☐ Business trust                    │
│ ☐ Common law trust (non-reporting)  │
│ ☐ Foreign trust with US trustee     │
└─────────────────────────────────────┘
  │
  ├── Any checked? ─────────────────────► EXEMPT (with code)
  │
  └── None checked ─────────────────────► REPORTABLE
```

---

## API Implementation

### Request

```
POST /reports/{id}/determine

(No body - uses stored wizard_data)
```

### Response (Reportable)

```json
{
  "report_id": "uuid",
  "is_reportable": true,
  "status": "determination_complete",
  "determination": {
    "is_reportable": true,
    "exemption_code": null,
    "required_parties": [
      "transferee",
      "transferor",
      "beneficial_owner"
    ]
  },
  "reasoning": [
    "Transaction is residential real estate (1-4 family)",
    "Transaction is cash or has no regulated financing",
    "Transferee is an LLC (entity)",
    "Entity does not qualify for any exemptions",
    "Report is REQUIRED"
  ]
}
```

### Response (Exempt)

```json
{
  "report_id": "uuid",
  "is_reportable": false,
  "status": "exempt",
  "determination": {
    "is_reportable": false,
    "exemption_code": "GOVERNMENT_ENTITY",
    "exemption_reason": "Transferee is a government entity"
  },
  "reasoning": [
    "Transaction is residential real estate",
    "Transaction is cash",
    "Transferee is an entity",
    "Entity is a government entity - EXEMPT"
  ]
}
```

---

## Service Implementation

```python
# api/app/services/determination.py

def determine_reportability(wizard_data: dict) -> tuple[bool, dict, list[str]]:
    """
    Returns:
        - is_reportable: bool
        - determination_details: dict
        - reasoning: list of strings
    """
    reasoning = []

    # Check 1: Residential property
    property_type = wizard_data.get("property", {}).get("type")
    if property_type not in RESIDENTIAL_TYPES:
        return False, {
            "is_reportable": False,
            "exemption_code": "NON_RESIDENTIAL",
            "exemption_reason": "Property is not residential"
        }, ["Property is not residential - EXEMPT"]

    reasoning.append(f"Transaction is residential ({property_type})")

    # Check 2: Financing
    financing = wizard_data.get("financing", {})
    financing_type = financing.get("type")

    if financing_type in EXEMPT_FINANCING:
        return False, {
            "is_reportable": False,
            "exemption_code": "REGULATED_FINANCING",
            "exemption_reason": f"Transaction has {financing_type}"
        }, reasoning + [f"Transaction has {financing_type} - EXEMPT"]

    reasoning.append("Transaction is cash or non-financed")

    # Check 3: Buyer type
    buyer_type = wizard_data.get("transferee", {}).get("type")
    reasoning.append(f"Transferee is {buyer_type}")

    # Check 4: Exemptions
    exemptions = wizard_data.get("transferee", {}).get("exemptions", [])

    if exemptions:
        exemption = exemptions[0]  # Use first matching
        return False, {
            "is_reportable": False,
            "exemption_code": exemption,
            "exemption_reason": EXEMPTION_DESCRIPTIONS[exemption]
        }, reasoning + [f"Exemption: {exemption} - EXEMPT"]

    # No exemptions - reportable
    reasoning.append("No exemptions apply - REPORTABLE")

    required_parties = determine_required_parties(wizard_data)

    return True, {
        "is_reportable": True,
        "exemption_code": None,
        "required_parties": required_parties
    }, reasoning
```

---

## Required Parties Logic

Based on buyer type, different parties are required:

| Buyer Type | Required Parties |
|------------|------------------|
| Individual | transferee, transferor |
| Entity (LLC, Corp) | transferee, transferor, beneficial_owner |
| Trust | transferee, transferor, trustee, settlor, beneficiary |

```python
def determine_required_parties(wizard_data: dict) -> list[str]:
    parties = ["transferee", "transferor"]

    buyer_type = wizard_data.get("transferee", {}).get("type")

    if buyer_type in ["llc", "corporation", "partnership"]:
        parties.append("beneficial_owner")

    if buyer_type == "trust":
        parties.extend(["trustee", "settlor", "beneficiary"])

    return parties
```

---

## Wizard Steps

### Step 1: Property

```tsx
<Card>
  <CardHeader>
    <CardTitle>Property Information</CardTitle>
  </CardHeader>
  <CardContent>
    <FormField label="Property Type">
      <Select options={PROPERTY_TYPES} />
    </FormField>

    <FormField label="Is this a residential property?">
      <RadioGroup>
        <RadioItem value="yes">Yes</RadioItem>
        <RadioItem value="no">No</RadioItem>
      </RadioGroup>
    </FormField>
  </CardContent>
</Card>
```

### Step 2: Financing

```tsx
<Card>
  <CardHeader>
    <CardTitle>Financing</CardTitle>
  </CardHeader>
  <CardContent>
    <FormField label="How is this purchase being financed?">
      <RadioGroup>
        <RadioItem value="cash">Cash / No Financing</RadioItem>
        <RadioItem value="conventional">Conventional Mortgage</RadioItem>
        <RadioItem value="fha">FHA Loan</RadioItem>
        <RadioItem value="va">VA Loan</RadioItem>
        <RadioItem value="seller">Seller Financing</RadioItem>
      </RadioGroup>
    </FormField>
  </CardContent>
</Card>
```

### Step 3: Buyer Type

```tsx
<Card>
  <CardHeader>
    <CardTitle>Buyer Type</CardTitle>
  </CardHeader>
  <CardContent>
    <FormField label="Who is the buyer?">
      <RadioGroup>
        <RadioItem value="individual">Individual Person</RadioItem>
        <RadioItem value="entity">Business Entity (LLC, Corp, etc.)</RadioItem>
        <RadioItem value="trust">Trust</RadioItem>
      </RadioGroup>
    </FormField>

    {buyerType === "entity" && (
      <FormField label="Entity Type">
        <Select options={ENTITY_TYPES} />
      </FormField>
    )}
  </CardContent>
</Card>
```

### Step 4: Exemptions

```tsx
<Card>
  <CardHeader>
    <CardTitle>Exemption Check</CardTitle>
    <CardDescription>
      Select any exemptions that apply to this buyer.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {ENTITY_EXEMPTIONS.map(exemption => (
      <div key={exemption.value}>
        <Checkbox
          checked={exemptions.includes(exemption.value)}
          onCheckedChange={checked => toggleExemption(exemption.value)}
        />
        <Label>{exemption.label}</Label>
        <Tooltip content={exemption.description} />
      </div>
    ))}
  </CardContent>
</Card>
```

### Step 5: Result

```tsx
<Card className={isReportable ? "border-amber-200" : "border-green-200"}>
  <CardHeader>
    <CardTitle>
      {isReportable ? (
        <><AlertTriangle /> Report Required</>
      ) : (
        <><CheckCircle /> Exempt - No Report Required</>
      )}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <h4>Determination Reasoning:</h4>
    <ul>
      {reasoning.map((r, i) => <li key={i}>{r}</li>)}
    </ul>

    {isReportable && (
      <Alert>
        <p>A FinCEN RRER filing is required for this transaction.</p>
        <p>Please continue to provide additional information.</p>
      </Alert>
    )}
  </CardContent>
</Card>
```

---

## Key Files

| Purpose | File |
|---------|------|
| Determination service | `api/app/services/determination.py` |
| API endpoint | `api/app/routes/reports.py` → `determine` |
| Wizard UI | `web/components/rrer-questionnaire.tsx` |
| Exemption constants | `web/lib/rrer-types.ts` |
