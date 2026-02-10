# FinCEN Residential Real Estate Reporting
## Wizard Decision Engine Specification

**Purpose**
This document defines the authoritative decision logic the wizard MUST follow to comply with FinCEN’s Residential Real Estate Reporting (RRE) rule. This file is intended to be used directly by Cursor to audit, refactor, and enforce correct wizard behavior.

This spec is derived solely from:
- FinCEN General Fact Sheet
- FinCEN Exceptions Fact Sheet
- FinCEN Real Estate Reporting FAQs

---

## CORE RULE (NON‑NEGOTIABLE)

A transfer is **reportable** ONLY if **ALL FOUR** conditions below are true:

1. The property is residential real property
2. The transfer is non‑financed
3. The transferee is a non‑exempt entity or trust
4. No exception applies

If **ANY** condition fails, the wizard MUST stop data collection and mark the transfer as **NOT REPORTABLE**.

---

## SECTION 1 — TRANSFER‑LEVEL EXEMPTION CHECK (FIRST SCREEN)

> These checks MUST occur before asking about entities, trusts, ownership, or payments.

### 1.1 Exempt Transfer Types

If ANY of the following are true, the transfer is **EXEMPT** and **NO REPORT IS FILED**:

| Exempt Scenario | Wizard Action |
|----------------|---------------|
| Easement grant, transfer, or revocation | Exit wizard |
| Transfer resulting from death (will, trust, TOD, intestate, contract) | Exit wizard |
| Transfer incidental to divorce or dissolution | Exit wizard |
| Transfer to a bankruptcy estate | Exit wizard |
| Transfer supervised by a U.S. court | Exit wizard |
| No‑consideration transfer by individual to self‑settled trust | Exit wizard |
| Transfer to a qualified intermediary (1031 exchange) | Exit wizard |
| No reporting person exists | Exit wizard |

**Cursor Rule:**
```
IF transfer.exempt == TRUE:
    SET reportable = FALSE
    TERMINATE wizard
```

---

## SECTION 2 — RESIDENTIAL PROPERTY DETERMINATION

### 2.1 Residential Real Property Definition

Property is **residential** if it is located in the United States AND meets ANY of the following:

- Structure designed principally for occupancy by 1–4 families
- Land intended for construction of a 1–4 family structure
- Residential unit within a larger structure (condo, co‑op)
- Shares in a cooperative housing corporation

**Cursor Rule:**
```
IF property.is_residential != TRUE:
    SET reportable = FALSE
    TERMINATE wizard
```

---

## SECTION 3 — NON‑FINANCED TRANSFER TEST

### 3.1 Non‑Financed Definition

A transfer is **non‑financed** if it does NOT involve credit that is BOTH:

- Secured by the property; AND
- Extended by a financial institution subject to AML program AND SAR filing requirements

**Important:**
- Hard‑money loans and private lenders generally FAIL the AML/SAR test
- Such loans are treated as **NON‑FINANCED** under the rule

**Cursor Rule:**
```
IF lender.AML_SAR_covered == TRUE:
    SET reportable = FALSE
ELSE:
    CONTINUE
```

---

## SECTION 4 — TRANSFEREE CLASSIFICATION

### 4.1 Transferee Types

| Transferee | Handling |
|-----------|----------|
| Individual | NOT reportable |
| Entity | Continue evaluation |
| Trust | Continue evaluation |

**Cursor Rule:**
```
IF transferee.type == INDIVIDUAL:
    SET reportable = FALSE
    TERMINATE wizard
```

---

## SECTION 5 — ENTITY EXEMPTION LOGIC

### 5.1 Exempt Entity Types (16)

Transfers to the following entity types are **EXEMPT**:

- Securities reporting issuer
- Governmental authority
- Bank
- Credit union
- Depository institution holding company
- Money services business
- Broker or dealer in securities
- Securities exchange or clearing agency
- Other Exchange Act registered entity
- Insurance company
- State‑licensed insurance producer
- Commodity Exchange Act registered entity
- Public utility
- Financial market utility
- Registered investment company
- Subsidiary of an exempt entity

**Important:**
- If MULTIPLE transferees exist, and AT LEAST ONE is non‑exempt → filing continues
- ONLY non‑exempt transferees are reported

**Cursor Rule:**
```
FOR each transferee:
    IF transferee.entity_exempt == TRUE:
        SKIP data collection
    ELSE:
        MARK reportable_transferee
```

---

## SECTION 6 — TRUST EXEMPTION LOGIC

### 6.1 Trust Classification

| Trust Type | Treatment |
|-----------|-----------|
| Statutory trust | Treated as ENTITY |
| Trust with SEC reporting issuer trustee | Exempt |
| Subsidiary of exempt trust | Exempt |

**Critical Rule:**
Statutory trusts are NOT treated as trusts for RRE purposes.

**Cursor Rule:**
```
IF trust.type == STATUTORY:
    ROUTE to ENTITY logic
```

---

## SECTION 7 — REQUIRED ENTITY DATA (NON‑EXEMPT ONLY)

Collect ONLY if entity is non‑exempt:

| Field | Required |
|------|----------|
| Legal name | Yes |
| Jurisdiction | Yes |
| Entity type | Yes |
| Taxpayer ID (TIN) | Yes |
| Principal address | Yes |

---

## SECTION 8 — BENEFICIAL OWNERSHIP (ENTITIES)

### 8.1 Who Must Be Reported

An individual is a beneficial owner if they:

- Own or control ≥ 25% of the entity; OR
- Exercise substantial control

### 8.2 Required Fields per Individual

- Full legal name
- Date of birth
- Residential address
- Citizenship
- SSN / ITIN / Passport

---

## SECTION 9 — BENEFICIAL OWNERSHIP (TRUSTS)

### 9.1 Reportable Trust Roles

Collect information for any individual who is:

- Trustee
- Trust protector / asset controller
- Beneficiary with withdrawal rights
- Grantor or settlor with revocation rights

### 9.2 Required Fields per Individual

(Same as entity beneficial owners)

---

## SECTION 10 — REASONABLE RELIANCE & CERTIFICATION

- Information may be collected from transferee or representative
- Beneficial ownership data requires written certification
- Certification must be retained for 5 years

---

## SECTION 11 — FINAL FILING DECISION

**Wizard must explicitly mark one of:**

- REPORTABLE → generate Real Estate Report
- NOT REPORTABLE → record reason and exit

**Cursor Rule:**
```
IF reportable == TRUE:
    ENABLE XML generation
ELSE:
    LOCK submission
```

---

## DESIGN INTENT

- Exemptions short‑circuit the wizard
- Filing logic is centralized, not page‑driven
- Data collection is conditional, not blanket
- No BOI questions before exemption resolution

**Any deviation from this spec is a compliance defect.**

