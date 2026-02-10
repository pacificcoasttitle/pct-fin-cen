# FinClear Glossary

> Terms, status codes, and definitions used throughout the platform.

## FinCEN Terms

| Term | Definition |
|------|------------|
| **RRER** | Real Estate Reporting Requirements - FinCEN regulation requiring certain real estate transactions to be reported |
| **BSA** | Bank Secrecy Act - Federal law requiring financial institutions to assist government agencies in detecting money laundering |
| **SDTM** | Secure Data Transfer Mode - FinCEN's secure file transfer protocol for batch submissions |
| **E-Filing** | Electronic filing system for submitting reports to FinCEN |
| **Transferee** | The buyer in a real estate transaction (receives property) |
| **Transferor** | The seller in a real estate transaction (transfers property) |
| **Beneficial Owner** | Individual who owns 25%+ or exercises substantial control over an entity |
| **Reporting Person** | Title company or designee submitting the report to FinCEN |
| **TIN** | Taxpayer Identification Number (SSN for individuals, EIN for entities) |

## Report Statuses

| Status | Description | Next Action |
|--------|-------------|-------------|
| `draft` | Report created, wizard not started | Complete determination |
| `determination_complete` | Determination finished, reportable | Begin collection phase |
| `collecting` | Collection phase started | Complete all party info |
| `awaiting_parties` | Party links sent, waiting for responses | Wait for party submissions |
| `ready_to_file` | All data collected, ready for filing | Certify and file |
| `filed` | Successfully submitted to FinCEN | Monitor for acceptance |
| `exempt` | Transaction determined not reportable | Archive |
| `cancelled` | Report cancelled | - |

## Party Statuses

| Status | Description |
|--------|-------------|
| `pending` | Party created, no link sent yet |
| `link_sent` | Portal link has been generated/sent |
| `in_progress` | Party has started filling form |
| `submitted` | Party has submitted their information |
| `verified` | Staff has verified party information |

## Party Link Statuses

| Status | Description |
|--------|-------------|
| `active` | Link is valid and can be used |
| `used` | Link has been used to submit data |
| `expired` | Link has passed its expiration date |
| `revoked` | Link has been manually invalidated |

## Filing Submission Statuses

| Status | Description |
|--------|-------------|
| `not_started` | Filing not yet initiated |
| `queued` | Queued for submission |
| `submitted` | Submitted to FinCEN (pending response) |
| `accepted` | FinCEN accepted the filing |
| `rejected` | FinCEN rejected the filing |
| `needs_review` | Requires staff review before retry |

## Party Roles

| Role | Description |
|------|-------------|
| `transferee` | Buyer of the property |
| `transferor` | Seller of the property |
| `beneficial_owner` | Owner of 25%+ of an entity |
| `reporting_person` | Person submitting the report |

## Entity Types

| Type | Description |
|------|-------------|
| `individual` | Natural person |
| `llc` | Limited Liability Company |
| `corporation` | C-Corporation or S-Corporation |
| `trust` | Legal trust arrangement |
| `partnership` | General or Limited Partnership |
| `other` | Other legal entity type |

## Trust Types

| Type | Description |
|------|-------------|
| `revocable-living` | Revocable living trust (can be modified) |
| `irrevocable` | Irrevocable trust (cannot be modified) |
| `testamentary` | Trust created by will after death |
| `special-needs` | Trust for disabled beneficiary |
| `charitable` | Trust for charitable purposes |
| `other` | Other trust type |

## Property Types

| Type | Description |
|------|-------------|
| `1-4_family` | Single-family to four-family residential |
| `condominium` | Condominium unit |
| `townhome` | Townhouse |
| `coop` | Cooperative housing |
| `vacant_land` | Vacant residential land |

## Payment Source Types

| Type | Description |
|------|-------------|
| `wire` | Wire transfer |
| `check` | Personal or business check |
| `cashiers_check` | Cashier's check |
| `cash` | Physical cash |
| `cryptocurrency` | Digital currency |
| `other_electronic` | Other electronic payment |
| `other` | Other payment method |

## Account Types

| Type | Description |
|------|-------------|
| `personal_checking` | Personal checking account |
| `personal_savings` | Personal savings account |
| `business_checking` | Business checking account |
| `business_savings` | Business savings account |
| `money_market` | Money market account |
| `investment` | Investment account |
| `other` | Other account type |

## Signing Capacities

| Capacity | Description |
|----------|-------------|
| `member-manager` | LLC member-manager |
| `member` | LLC member (non-manager) |
| `officer` | Corporate officer |
| `partner` | Partnership partner |
| `trustee` | Trust trustee |
| `beneficiary` | Trust beneficiary |
| `agent` | Authorized agent |
| `attorney-in-fact` | Power of attorney holder |

## Actor Types (Audit Log)

| Type | Description |
|------|-------------|
| `system` | Automated system action |
| `staff` | Staff user action |
| `party` | Party portal action |
| `api` | External API action |

## Notification Types

| Type | Description |
|------|-------------|
| `party_invite` | Invitation to party portal |
| `party_submitted` | Party completed submission |
| `internal_alert` | Internal staff alert |
| `filing_receipt` | Filing confirmation |

## Determination Exemptions

### Individual Exemptions
| Code | Description |
|------|-------------|
| `TRANSFER_BETWEEN_SPOUSES` | Transfer between spouses or domestic partners |
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
| `GOVERNMENT_ENTITY` | Government entity |
| `501C3` | 501(c)(3) nonprofit |
| `BANK_SUBSIDIARY` | Bank subsidiary |
| `INSURANCE_COMPANY` | Insurance company |
| `SEC_INVESTMENT_COMPANY` | SEC-registered investment company |
| `VENTURE_CAPITAL` | Venture capital fund |
| `CPA_FIRM` | CPA firm |
| `PUBLIC_UTILITY` | Public utility |
| `POOLED_INVESTMENT` | Pooled investment vehicle |
| `TAX_EXEMPT` | Other tax-exempt entity |
| `EMPLOYEE_BENEFIT_PLAN` | Employee benefit plan |
| `BANK_HOLDING` | Bank holding company |
| `FOREIGN_POOLED` | Foreign pooled investment |

### Trust Exemptions
| Code | Description |
|------|-------------|
| `STATUTORY_TRUST` | Statutory trust |
| `BUSINESS_TRUST` | Business trust |
| `COMMON_LAW_TRUST` | Common law trust (non-reporting) |
| `FOREIGN_TRUST` | Foreign trust with US trustee |

## API Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad request - invalid input |
| `401` | Unauthorized - authentication required |
| `403` | Forbidden - insufficient permissions |
| `404` | Not found - resource doesn't exist |
| `409` | Conflict - resource state conflict |
| `422` | Validation error - schema validation failed |
| `500` | Internal server error |

## UI Status Categories

| Category | Report Statuses |
|----------|-----------------|
| Active | `draft`, `determination_complete`, `collecting`, `awaiting_parties` |
| Ready to File | `ready_to_file` |
| Filed | `filed` |
| Exempt | `exempt` |
| Drafts | `draft`, `determination_complete` |

## Receipt ID Format

```
RRER-YYYY-XXXXXXXX
```
- `RRER`: Report type prefix
- `YYYY`: Four-digit year
- `XXXXXXXX`: 8-character alphanumeric ID

## Party Link Token

- 64-character URL-safe token
- Generated using `secrets.token_urlsafe(48)`
- Default expiration: 14 days

## Filing Deadline Calculation

Two options (selected in wizard):
1. **Option 1**: 30 calendar days from closing date
2. **Option 2**: Last day of the month following closing

Example: Closing on Feb 15, 2026
- Option 1: March 17, 2026 (30 days)
- Option 2: March 31, 2026 (end of following month)
