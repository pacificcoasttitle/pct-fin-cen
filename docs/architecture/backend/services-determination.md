# Determination Service

> `api/app/services/determination.py` (164 lines)
> FinCEN RRER determination logic per 31 CFR 1031.320

## Overview

The determination service evaluates transaction data to decide if a FinCEN RRER filing is required. It implements the regulatory logic from the Bank Secrecy Act and FinCEN's Real Estate Reporting Requirements.

## Main Functions

### determine_reportability()

Evaluates wizard data and returns reportability decision.

```python
def determine_reportability(wizard_data: dict) -> tuple[bool, dict, list[str]]:
    """
    Returns:
        - is_reportable: bool
        - determination_details: dict with exemption info
        - reasoning: list of human-readable explanations
    """
```

### determine_required_parties()

Based on determination, returns which parties must provide information.

```python
def determine_required_parties(wizard_data: dict) -> list[str]:
    """
    Returns list of required party roles:
        - "transferee" (always if reportable)
        - "transferor" (always if reportable)
        - "beneficial_owner" (if entity transferee)
        - "trustee" (if trust transferee)
        - "settlor" (if trust transferee)
        - "beneficiary" (if trust transferee)
    """
```

---

## Determination Logic Flow

```
                    START
                      │
                      ▼
┌─────────────────────────────────────────┐
│ Check 1: Is transaction residential?     │
│                                         │
│ wizard_data.property.type in:           │
│ - 1-4_family                           │
│ - condominium                          │
│ - townhome                             │
│ - coop                                 │
│ - vacant_land (residential zoning)     │
└─────────────────────────────────────────┘
                      │
              NO ─────┴───── YES
              │               │
              ▼               ▼
        ┌─────────┐   ┌─────────────────────────────────┐
        │ EXEMPT  │   │ Check 2: Financing type?        │
        │ (non-   │   │                                 │
        │ resident│   │ wizard_data.financing.type      │
        │ ial)    │   └─────────────────────────────────┘
        └─────────┘           │
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        conventional    cash/crypto      seller
        mortgage       /unfinanced       financing
              │               │               │
              ▼               ▼               ▼
        ┌─────────┐   ┌───────────┐   ┌───────────┐
        │ EXEMPT  │   │ Continue  │   │ Check if  │
        │ (regulated  │ to Check  │   │ regulated │
        │ financing)  │   3       │   │           │
        └─────────┘   └───────────┘   └───────────┘
                              │
                              ▼
              ┌─────────────────────────────────┐
              │ Check 3: Transferee type?       │
              │                                 │
              │ individual / entity / trust     │
              └─────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         individual      entity (LLC,     trust
              │           Corp, etc.)        │
              │               │               │
              ▼               ▼               ▼
        ┌─────────┐   ┌───────────┐   ┌───────────┐
        │ Check   │   │ Check     │   │ Check     │
        │ indiv.  │   │ entity    │   │ trust     │
        │ exempts │   │ exempts   │   │ exempts   │
        └─────────┘   └───────────┘   └───────────┘
                              │
                              ▼
              ┌─────────────────────────────────┐
              │ No exemption found              │
              │                                 │
              │ → REPORTABLE                    │
              └─────────────────────────────────┘
```

---

## Exemption Categories

### Individual Exemptions

| Code | Description |
|------|-------------|
| `TRANSFER_BETWEEN_SPOUSES` | Transfer between spouses/domestic partners |
| `COURT_ORDERED` | Court-ordered transfer |
| `GIFT_OR_DEVISE` | Gift or inheritance |
| `BANKRUPTCY` | Bankruptcy proceeding |
| `FORECLOSURE` | Foreclosure proceeding |
| `TAX_SALE` | Tax sale |
| `CONDEMNATION` | Government condemnation |
| `RELOCATION` | Employer relocation |

### Entity Exemptions

| Code | Description |
|------|-------------|
| `PUBLICLY_TRADED` | Publicly traded company |
| `REGULATED_FINANCIAL` | Regulated financial institution |
| `GOVERNMENT_ENTITY` | Federal, state, local government |
| `501C3` | 501(c)(3) nonprofit organization |
| `BANK_SUBSIDIARY` | Subsidiary of a bank |
| `INSURANCE_COMPANY` | Regulated insurance company |
| `SEC_INVESTMENT_COMPANY` | SEC-registered investment company |
| `VENTURE_CAPITAL` | Venture capital fund |
| `CPA_FIRM` | CPA firm |
| `PUBLIC_UTILITY` | Regulated public utility |
| `POOLED_INVESTMENT` | Pooled investment vehicle |
| `TAX_EXEMPT` | Other tax-exempt entity |
| `EMPLOYEE_BENEFIT_PLAN` | ERISA employee benefit plan |
| `BANK_HOLDING` | Bank holding company |
| `FOREIGN_POOLED` | Foreign pooled investment |

### Trust Exemptions

| Code | Description |
|------|-------------|
| `STATUTORY_TRUST` | Statutory/business trust |
| `BUSINESS_TRUST` | Business trust |
| `COMMON_LAW_TRUST` | Common law trust (non-reporting) |
| `FOREIGN_TRUST` | Foreign trust with US trustee |

---

## Usage Example

```python
from app.services.determination import determine_reportability

wizard_data = {
    "property": {
        "type": "1-4_family",
        "address": {...}
    },
    "financing": {
        "type": "cash"
    },
    "transferee": {
        "entity_type": "llc",
        "exemptions": []  # No exemptions checked
    }
}

is_reportable, details, reasoning = determine_reportability(wizard_data)

# Result:
# is_reportable = True
# details = {
#     "is_reportable": True,
#     "exemption_code": None,
#     "required_parties": ["transferee", "transferor", "beneficial_owner"]
# }
# reasoning = [
#     "Transaction is residential real estate",
#     "Transaction is cash or has no regulated financing",
#     "Transferee is an LLC (entity)",
#     "Entity does not qualify for any exemptions"
# ]
```

---

## Exempt Example

```python
wizard_data = {
    "property": {"type": "1-4_family"},
    "financing": {"type": "conventional_mortgage"}
}

is_reportable, details, reasoning = determine_reportability(wizard_data)

# Result:
# is_reportable = False
# details = {
#     "is_reportable": False,
#     "exemption_code": "CONVENTIONAL_MORTGAGE",
#     "exemption_reason": "Transaction has regulated conventional mortgage"
# }
# reasoning = [
#     "Transaction is residential real estate",
#     "Transaction has conventional mortgage financing - EXEMPT"
# ]
```

---

## Integration Points

### Called From

- `POST /reports/{id}/determine` endpoint
- Demo seed service when creating reports

### Consumes

- `wizard_data` from Report model
- Specifically:
  - `wizard_data.property.type`
  - `wizard_data.financing.type`
  - `wizard_data.transferee.entity_type`
  - `wizard_data.transferee.exemptions[]`

### Produces

- `determination` field on Report model
- Status change to `determination_complete` or `exempt`
- Audit log entry

---

## Regulatory Reference

Based on:
- **31 CFR 1031.320** - Real Estate Reporting Requirements
- **FinCEN RRER Final Rule** (effective date varies)
- **Bank Secrecy Act** requirements

Key thresholds:
- Applies to residential real estate
- Non-financed or cash transactions
- Entity or trust transferees
- Beneficial ownership reporting (25%+ or substantial control)

---

## Related Files

- **Route:** `api/app/routes/reports.py` → `determine` endpoint
- **Model:** `api/app/models/report.py` → `determination` field
- **Frontend:** `web/components/rrer-questionnaire.tsx` → determination steps
- **Types:** `web/lib/rrer-types.ts` → exemption constants
