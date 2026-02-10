# ✅ Client Experience — Verification Checklist

Run through this checklist to ensure everything is working correctly.

---

## 1. Navigation

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| "New Request" in nav | Look at sidebar | Shows "+ New Request" |  |
| "Requests" in nav | Look at sidebar | Shows "Requests" (not "Reports") |  |
| Badge counts | Look at sidebar | Numbers next to status items |  |
| Click "New Request" | Click button | Goes to `/app/reports/new` |  |
| Click "Requests" | Click nav item | Goes to `/app/requests` |  |

---

## 2. Requests Page — Tabs

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| 5 tabs visible | Look at top of page | Active, Ready to File, Filed, Exempt, Drafts |  |
| Tab counts | Look at tab badges | Shows count per status |  |
| Click each tab | Click tabs | Filters list correctly |  |
| URL updates | Click tab, check URL | Should show `?status=active` etc. |  |

---

## 3. Requests Page — Active Tab

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Shows collecting requests | Have a request in "collecting" | Appears in Active tab |  |
| Shows awaiting_parties | Have a request waiting | Appears in Active tab |  |
| **Party progress visible** | Look at table | Shows "2/3 parties" or similar |  |
| Progress bar | Look at party column | Visual progress indicator |  |
| Action button | Look at row | "Track" or "Continue" button |  |

---

## 4. Requests Page — Ready to File Tab

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Shows ready requests | Have a ready request | Appears in Ready tab |  |
| All parties complete | Look at party column | Shows "3/3 ✓" or similar |  |
| Action button | Look at row | "File Now" or "Review & File" |  |
| Click action | Click button | Goes to wizard file step |  |

---

## 5. Requests Page — Filed Tab

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Shows filed requests | Have a filed request | Appears in Filed tab |  |
| Receipt ID visible | Look at row | Shows FinCEN receipt ID |  |
| Action button | Look at row | "View" or "Certificate" |  |

---

## 6. Requests Page — Exempt Tab

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Shows exempt requests | Have an exempt request | Appears in Exempt tab |  |
| Exemption reason | Look at row | Shows why it's exempt |  |
| Action button | Look at row | "View Certificate" |  |

---

## 7. Requests Page — Drafts Tab

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Shows draft requests | Have a draft | Appears in Drafts tab |  |
| Action button | Look at row | "Continue" button |  |
| Click continue | Click button | Goes to wizard |  |

---

## 8. Search

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Search box visible | Look at top right | Search input exists |  |
| Search by address | Type "123 Main" | Filters to matching |  |
| Search by escrow # | Type escrow number | Filters to matching |  |
| Clear search | Delete text | Shows all items again |  |

---

## 9. Dashboard

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Shows "requests" text | Read dashboard | Says "requests" not "reports" |  |
| Status cards | Look at stat cards | 4 cards with counts |  |
| Click stat card | Click a card | Goes to filtered requests |  |
| Recent activity | Look at bottom | Shows recent requests |  |
| "Ready to file" banner | Have ready request | Shows green action banner |  |

---

## 10. Profile Page

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Profile link exists | Look at sidebar | Shows "My Profile" |  |
| Page loads | Go to `/app/profile` | Shows profile form |  |
| Shows user name | Look at form | Pre-filled with your name |  |
| Shows email | Look at form | Pre-filled with your email |  |
| Save works | Edit and save | Shows success toast |  |

---

## 11. Settings (Admin Only)

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Settings in nav | Login as client_admin | Shows "Settings" menu |  |
| Not visible to users | Login as client_user | No "Settings" visible |  |
| Sub-items work | Click each setting | Pages load correctly |  |

---

## 12. Redirects

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| /app/reports redirect | Go to `/app/reports` | Redirects to `/app/requests` |  |
| Wizard still works | Go to `/app/reports/{id}/wizard` | Wizard loads (no redirect) |  |
| New report works | Go to `/app/reports/new` | New request form loads |  |

---

## 13. Auto-Refresh

| Check | How to Test | Expected Result | ✓/✗ |
|-------|-------------|-----------------|-----|
| Data refreshes | Wait 60 seconds | List updates without reload |  |
| No flicker | Watch during refresh | Smooth update, no flash |  |

---

## Issues Found

Use this section to note any issues:

| Issue | Tab/Page | Description | Priority |
|-------|----------|-------------|----------|
| 1 | Active | Missing party progress | P0 |
| 2 |  |  |  |
| 3 |  |  |  |
| 4 |  |  |  |

---

## Summary

**Total Checks:** 45
**Passed:** ___ / 45
**Failed:** ___

### Critical Issues (P0):
- [ ] Party progress not showing in Active tab

### Minor Issues (P1-P2):
- [ ] ...
