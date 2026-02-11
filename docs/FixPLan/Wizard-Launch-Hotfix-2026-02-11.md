# Wizard Launch — Hotfix Report (2026-02-11)

## Summary

After deploying the new wizard (Day 1–4 rebuild + AddressAutocomplete wiring), two errors appeared immediately on "New Request":

| # | Error | Severity | Root Cause | Fix |
|---|-------|----------|------------|-----|
| 1 | `PUT /reports/{id}/wizard` → **422** | Blocking | Backend schema rejects `wizard_step: 0` | Changed `ge=1` → `ge=0` in `WizardUpdate` |
| 2 | `POST /api/property/lookup` → **404** | Blocking | Wrong URL path — backend has no `/api` prefix | Reverted `propertyEndpoint` to `/property/lookup` |

---

## Issue 1: 422 on Wizard Auto-Save

### Symptom
```
PUT https://pct-fin-cen-staging.onrender.com/reports/{id}/wizard 422 (Unprocessable Content)
Auto-save failed: [object Object]
```
Fires immediately when the wizard loads for a new report.

### Root Cause
The new wizard introduces **Step 0: Transaction Reference** — the first thing users see. The `useAutoSave` hook fires 1.5 seconds after mount and sends:

```json
{ "wizard_step": 0, "wizard_data": { "determination": {...}, "collection": {...} } }
```

The backend Pydantic schema (`api/app/schemas/report.py`) had:
```python
wizard_step: int = Field(..., ge=1, le=10)  # ← rejects 0
```

### Fix
**File:** `api/app/schemas/report.py` (line 177)

```python
# BEFORE
wizard_step: int = Field(..., ge=1, le=10)

# AFTER
wizard_step: int = Field(..., ge=0, le=10)
```

**Commit:** `56cba64` — deployed to Render (build in progress at time of writing).

### Deploy Note
This is a **backend-only** fix. The Render deploy must complete before the 422 stops. Render Starter plan Python builds take ~5–8 minutes.

---

## Issue 2: 404 on SiteX Property Lookup

### Symptom
```
POST https://pct-fin-cen-staging.onrender.com/api/property/lookup 404 (Not Found)
Property lookup failed: Error: Lookup failed
```
Fires when a user selects an address from the Google Places autocomplete.

### Root Cause
The `AddressAutocomplete` component constructs the SiteX lookup URL as:

```typescript
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";  // "https://pct-fin-cen-staging.onrender.com"
const url = `${apiBase}${endpoint}`;                          // endpoint = propertyEndpoint prop
```

The backend property router is:
```python
# api/app/routes/property.py
router = APIRouter(prefix="/property", tags=["property"])

# api/app/main.py — mounted directly, NO /api prefix
app.include_router(property_router)
```

So the actual backend route is:
```
POST https://pct-fin-cen-staging.onrender.com/property/lookup  ← CORRECT
```

An earlier fix attempt incorrectly changed the default `propertyEndpoint` prop from `/property/lookup` to `/api/property/lookup`, producing:
```
POST https://pct-fin-cen-staging.onrender.com/api/property/lookup  ← 404
```

### Fix
**File:** `web/components/AddressAutocomplete.tsx` (line 40)

```typescript
// BEFORE (incorrect)
propertyEndpoint = "/api/property/lookup",

// AFTER (correct)
propertyEndpoint = "/property/lookup",
```

**Commit:** `5db5cdd` — pushed to GitHub, Render deploy queued.

### Why This Happened
The original fix instruction assumed the backend had a global `/api` prefix. It does not. All FastAPI routers are mounted directly on the app:

```python
app.include_router(reports_router)     # → /reports/...
app.include_router(property_router)    # → /property/...
app.include_router(companies_router)   # → /companies/...
```

The regular `apiFetch()` function in `web/lib/api.ts` uses the same `NEXT_PUBLIC_API_BASE_URL` and calls endpoints like `/reports/{id}/wizard` (no `/api` prefix), which confirms the pattern.

---

## Non-Issues Investigated

### Long `uf/uc` Call Stack in Console
The repeating `uf`/`uc` entries in the browser console are **React production minified function names** (fiber reconciliation internals). This is the normal call stack depth from nested components — **not an infinite loop**.

### `runtime.lastError: A listener indicated an asynchronous response...`
This is a **browser extension** error (Chrome extensions intercepting messages). Not related to our code.

---

## Deploy Status (as of writing)

| Component | Commit | Status |
|-----------|--------|--------|
| **Backend (Render)** | `56cba64` — `ge=0` fix | `build_in_progress` |
| **Backend (Render)** | `5db5cdd` — no backend change | `queued` |
| **Frontend (Vercel)** | `5db5cdd` — revert propertyEndpoint | Auto-deploying |

### Expected Resolution
- **422 error**: Resolves when Render backend finishes deploying `56cba64` (~5 min)
- **404 error**: Resolves when Vercel finishes deploying `5db5cdd` (~1-2 min)

---

## Verification Steps

After both deploys are live:

1. **Hard refresh** the frontend (`Ctrl+Shift+R`)
2. Click **"New Request"**
3. Verify:
   - [ ] No 422 errors in console (auto-save succeeds silently)
   - [ ] Transaction Reference step loads (address, escrow, price, date fields)
4. Type an address in the autocomplete field
5. Select from Google Places dropdown
6. Verify:
   - [ ] No 404 errors in console
   - [ ] SiteX property data card appears (if configured)
   - [ ] Legal description auto-fills (if SiteX returns data)
   - [ ] APN badge appears (if SiteX returns data)

---

## Lessons Learned

1. **Always verify backend route prefixes before changing endpoints.** The backend has no global `/api` prefix — check `main.py` include_router calls.
2. **Backend deploys on Render Starter plan take 5–8 minutes.** Don't assume the fix is live immediately after push.
3. **The `useAutoSave` hook fires on mount.** Any validation error in the backend schema will surface immediately when the wizard loads, even before the user interacts.
