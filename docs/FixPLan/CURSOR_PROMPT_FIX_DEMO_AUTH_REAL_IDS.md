# CURSOR PROMPT: Fix Demo Auth — Replace Hardcoded IDs with Real Database Records

## Context

The demo login system uses **hardcoded strings** instead of real database UUIDs for user and company IDs. This breaks everything for client-side roles because the backend can't find a company with ID `demo-client-company`.

**Symptoms observed (as client_admin):**
1. `/companies/me` → 404 (endpoint may not exist yet, but would fail anyway)
2. `/sidebar/counts?role=client_admin&company_id=demo-client-company` → CORS error / 500
3. `/billing/my/stats` → 401
4. `/billing/my/invoices` → 401
5. `/billing/my/activity` → 401
6. Company settings page: "No company found — Your account is not associated with a company"

**Root Cause:** The demo login stores a fake company_id like `demo-client-company` in the session cookie instead of the actual UUID from the database. When backend endpoints try to look up that company, it doesn't exist.

**This is a critical fix.** Without it, NO client-side features work — billing, company settings, sidebar counts, filing status, nothing.

---

## INVESTIGATION: Trace the Demo Auth Flow

### Step 1: Find ALL auth-related files

```bash
# Frontend auth
cat web/app/login/page.tsx
cat web/app/api/auth/login/route.ts
cat web/app/api/auth/logout/route.ts

# Find session/cookie handling
grep -rn "pct_demo_session\|demo_session\|session\|cookie\|Cookie" web/ --include="*.ts" --include="*.tsx" -l
grep -rn "pct_demo_session\|demo_session\|session\|cookie" web/app/api/ --include="*.ts" --include="*.tsx"

# Find where company_id is set in the session
grep -rn "demo-client-company\|company_id\|companyId" web/app/api/auth/ --include="*.ts"
grep -rn "demo-client-company\|company_id\|companyId" web/app/login/ --include="*.tsx"

# Find where session is READ on the frontend
grep -rn "company_id\|companyId\|user_id\|userId" web/lib/ --include="*.ts" --include="*.tsx" -l
grep -rn "getSession\|parseSession\|decodeSession\|getCookie" web/ --include="*.ts" --include="*.tsx" -l

# Find backend auth/session handling
grep -rn "demo_session\|pct_demo\|current_user\|get_current_user\|require_auth" api/app/ --include="*.py" -l
grep -rn "company_id.*demo\|demo.*company" api/app/ --include="*.py"

# Find the demo seed data to get actual IDs
cat api/app/services/demo_seed.py
```

### Step 2: Understand the Cookie Structure

The session cookie is `pct_demo_session`, base64-encoded. Find:
- What data is stored in it (user_id, email, role, company_id, name?)
- Where it's created (login route)
- Where it's decoded (middleware or per-endpoint)
- Is the data hardcoded in the login page or fetched from the backend?

### Step 3: Understand How the Backend Gets Current User

```bash
# How does the backend identify the current user?
grep -rn "def get_current_user\|def require_auth\|Depends.*current_user\|Depends.*auth" api/app/ --include="*.py"
grep -rn "X-User\|x-user\|Authorization\|Bearer" api/app/ --include="*.py"
```

Is the backend:
- (A) Decoding the cookie itself?
- (B) Receiving user info in headers from the frontend?
- (C) Looking up the user by email/ID on every request?

### Step 4: Trace the Sidebar Counts Endpoint

```bash
# Find sidebar counts
grep -rn "sidebar.*count\|sidebar_count" api/app/ --include="*.py"
grep -rn "sidebar/counts\|sidebar-counts" api/app/ --include="*.py"
grep -rn "sidebar.*count\|sidebarCount" web/ --include="*.ts" --include="*.tsx" -l
```

This endpoint is being called with `company_id=demo-client-company` — a string, not a UUID. Fix it to use the real company UUID.

### Step 5: Trace the CORS Configuration

```bash
# Find CORS config
grep -rn "CORS\|cors\|CORSMiddleware\|allow_origin" api/app/ --include="*.py"
```

The CORS errors on `/sidebar/counts` suggest either:
- The endpoint is crashing (500) before CORS headers are added
- OR the origin `https://www.fincenclear.com` is not in the allowed origins list

---

## THE FIX

There are two approaches depending on what the investigation reveals. Read the code first, then apply the correct approach.

### Approach A: If the login page has hardcoded demo accounts

The login page likely has something like:

```typescript
// WRONG — hardcoded fake data
const demoAccounts = [
  { email: "coo@demo.com", role: "coo", name: "Demo COO", company_id: null },
  { email: "admin@demo.com", role: "pct_admin", name: "Demo Admin", company_id: null },
  { email: "client@demo.com", role: "client_admin", name: "Demo Client", company_id: "demo-client-company" },
  // ...
];
```

**Fix:** The login flow must query the backend to get REAL user data, then store real IDs in the session.

### Approach B: If the login calls the backend but the backend returns fake data

The backend login endpoint might be returning hardcoded data instead of querying the database.

**Fix:** The backend login must query the User table and return real UUIDs.

---

### Fix Part 1: Backend Login Endpoint

**File:** Find the backend login endpoint. Likely in `api/app/routes/auth.py` or handled inline.

The backend login should:

```python
@router.post("/auth/login")
async def demo_login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Demo login — look up user by email, return real data from database.
    In production, this would verify password/token. In demo mode, email match is sufficient.
    """
    # Look up real user from database
    user = db.query(User).filter(
        User.email == request.email.lower().strip(),
        User.status == "active"
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Get real company data if client user
    company = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
    
    # Update last_login_at
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return {
        "user_id": str(user.id),           # REAL UUID
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "company_id": str(user.company_id) if user.company_id else None,  # REAL UUID
        "company_name": company.name if company else None,
        "company_code": company.code if company else None,
    }
```

**CRITICAL:** The response must include the REAL `user.id` (UUID) and REAL `user.company_id` (UUID), NOT hardcoded strings.

### Fix Part 2: Frontend Login API Route

**File:** `web/app/api/auth/login/route.ts`

This Next.js API route receives the login request, calls the backend, and sets the session cookie.

**It must:**
1. Call the backend login endpoint with the email
2. Get back REAL user data (UUIDs)
3. Encode that real data into the session cookie
4. Set the cookie

```typescript
export async function POST(request: Request) {
  const { email } = await request.json();
  
  // Call backend to get REAL user data
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://pct-fin-cen-staging.onrender.com";
  const res = await fetch(`${backendUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  
  if (!res.ok) {
    return Response.json({ error: "Login failed" }, { status: 401 });
  }
  
  const userData = await res.json();
  
  // Encode REAL data into session cookie
  const sessionData = {
    user_id: userData.user_id,           // Real UUID from database
    email: userData.email,
    name: userData.name,
    role: userData.role,
    company_id: userData.company_id,     // Real UUID from database (or null)
    company_name: userData.company_name,
    company_code: userData.company_code,
  };
  
  const encoded = Buffer.from(JSON.stringify(sessionData)).toString("base64");
  
  // Set cookie
  const response = Response.json({ ok: true, user: sessionData });
  response.headers.set(
    "Set-Cookie",
    `pct_demo_session=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${8 * 60 * 60}`
  );
  
  return response;
}
```

**If the frontend login currently does NOT call the backend at all** (i.e., it generates the session entirely on the frontend with hardcoded data), then:
- Either add a backend call, OR
- Have the frontend call `GET /users?email={email}` to look up the real user, then use that data

The key principle: **real UUIDs from the database must end up in the session cookie.**

### Fix Part 3: Frontend Login Page

**File:** `web/app/login/page.tsx`

If this page has hardcoded demo accounts with fake company IDs, those fake IDs need to go. The demo account selector can keep the EMAIL list (that's fine for a demo picker), but the login action must go through the backend to get real data.

```tsx
// Demo accounts for the picker UI — only emails needed here
const demoAccounts = [
  { label: "COO", email: "coo@finclear.demo", description: "Executive dashboard" },
  { label: "Admin", email: "admin@finclear.demo", description: "Full admin access" },
  { label: "Staff", email: "staff@finclear.demo", description: "Filing workflow" },
  { label: "Client Admin", email: "client.admin@demo.com", description: "Company billing & team" },
  { label: "Client User", email: "client.user@demo.com", description: "Submit requests" },
];

// On click: call login API with just the email — let the backend resolve everything else
async function handleDemoLogin(email: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  
  if (res.ok) {
    router.push("/app/dashboard");
  }
}
```

**IMPORTANT:** The demo account emails in the login page MUST exactly match the emails created in `demo_seed.py`. Verify this. If the seed creates `client_admin@pacific.demo` but the login page shows `client@demo.com`, the lookup will fail.

```bash
# Verify: what emails does the seed create?
grep -n "email" api/app/services/demo_seed.py
```

Make sure they match. If they don't, update the login page to use the seeded emails.

### Fix Part 4: Session Reading — Frontend

**Find where the frontend reads the session cookie and passes data to components/API calls.**

```bash
grep -rn "pct_demo_session\|getSession\|parseSession\|decodeSession" web/ --include="*.ts" --include="*.tsx"
grep -rn "company_id\|companyId" web/lib/ --include="*.ts" --include="*.tsx"
```

Wherever the frontend reads `company_id` from the session to pass to API calls (like `/sidebar/counts?company_id=...`), it must be reading the REAL UUID from the cookie, not a hardcoded fallback.

**Watch for patterns like:**
```typescript
// WRONG — hardcoded fallback
const companyId = session?.company_id || "demo-client-company";

// RIGHT — use what's in the session (which now has real UUIDs)
const companyId = session?.company_id || null;
```

Search for and remove ALL instances of hardcoded strings like:
- `"demo-client-company"`
- `"demo-company"`
- `"demo-user"`
- `"demo-client"`
- Any string that looks like a fake ID rather than a UUID

```bash
grep -rn "demo-client-company\|demo-company\|demo-user\|demo-client" web/ --include="*.ts" --include="*.tsx"
grep -rn "demo-client-company\|demo-company\|demo-user\|demo-client" api/app/ --include="*.py"
```

Replace ALL of them with references to real data from the session or database.

### Fix Part 5: Backend Auth Middleware / Headers

**Find how the backend identifies the current user on protected endpoints.**

```bash
grep -rn "current_user\|get_current_user\|X-User\|x-user" api/app/ --include="*.py" | head -30
```

The backend likely receives user info via:
- (A) Headers like `X-User-Id`, `X-User-Role`, `X-Company-Id` sent by the frontend
- (B) The session cookie forwarded to the backend
- (C) A token in the Authorization header

**Whatever the mechanism, the company_id being sent must be a real UUID.**

If the frontend sends headers:
```typescript
// The frontend probably does something like this when making API calls:
const headers = {
  "Content-Type": "application/json",
  "X-User-Id": session.user_id,
  "X-User-Role": session.role,
  "X-Company-Id": session.company_id,  // THIS must be a real UUID
};
```

Verify the backend dependency injection for `current_user` correctly reads these and that the types match (string UUID, not random strings).

### Fix Part 6: CORS Configuration

**File:** Likely `api/app/main.py` or wherever CORS middleware is configured.

```bash
grep -rn "CORS\|cors\|allow_origin" api/app/main.py
```

Ensure `https://www.fincenclear.com` is in the allowed origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://www.fincenclear.com",      # Production frontend
        "https://fincenclear.com",           # Without www
        "https://pct-fincen.vercel.app",     # Vercel preview
        # Add any other frontend domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Or if using a wildcard or env var pattern, verify it covers the production domain.**

The CORS errors are likely caused by the endpoint crashing (500 error means CORS headers never get sent), but verify the config is correct regardless.

### Fix Part 7: Sidebar Counts Endpoint

**Find and fix the sidebar counts endpoint:**

```bash
grep -rn "sidebar.*count\|sidebar/counts" api/app/ --include="*.py"
```

This endpoint receives `company_id` as a query parameter. It's currently getting `demo-client-company` (a string) and trying to query the database with it, which fails.

Once the session fix is in place, this will receive a real UUID. But also add defensive validation:

```python
# Validate company_id is a real UUID, not a fake string
from uuid import UUID

@router.get("/sidebar/counts")
async def get_sidebar_counts(role: str, company_id: Optional[str] = None):
    if company_id:
        try:
            UUID(company_id)  # Validate it's a real UUID
        except ValueError:
            # Bad company_id — return empty counts instead of crashing
            return {"requests": 0, "reports": 0, "filings": 0}
    
    # ... rest of logic
```

---

## VERIFICATION

After applying all fixes:

### Test 1: Login as each demo role

Log in as each demo account and verify the session cookie contains real UUIDs:

```javascript
// In browser console after login:
const cookie = document.cookie.split('; ').find(c => c.startsWith('pct_demo_session='));
const data = JSON.parse(atob(cookie.split('=')[1]));
console.log(data);
// Should show: { user_id: "real-uuid-...", company_id: "real-uuid-..." or null, ... }
```

**Verify:**
- [ ] COO login: user_id is a real UUID, company_id is null
- [ ] Admin login: user_id is a real UUID, company_id is null
- [ ] Staff login: user_id is a real UUID, company_id is null
- [ ] Client Admin login: user_id is a real UUID, **company_id is a real UUID**
- [ ] Client User login: user_id is a real UUID, **company_id is a real UUID**

### Test 2: Client Admin — Everything Works

While logged in as Client Admin:

- [ ] `/sidebar/counts` returns real numbers (no CORS error, no 500)
- [ ] `/billing/my/stats` returns 200 (not 401)
- [ ] `/billing/my/invoices` returns 200 (not 401)
- [ ] `/billing/my/activity` returns 200 (not 401)
- [ ] Dashboard loads with real data
- [ ] No console errors about "demo-client-company"

### Test 3: No Hardcoded Strings Remain

```bash
# These should return ZERO results:
grep -rn "demo-client-company" web/ --include="*.ts" --include="*.tsx"
grep -rn "demo-client-company" api/app/ --include="*.py"
```

### Test 4: All Roles Still Work

- [ ] COO can access executive dashboard
- [ ] Admin can access admin pages
- [ ] Staff can access queue
- [ ] Client Admin can access dashboard, billing, requests
- [ ] Client User can access dashboard, requests

### Test 5: Demo Login Page Still Works

- [ ] All demo account buttons appear
- [ ] Clicking each one logs in successfully
- [ ] Correct role-based redirect after login

---

## CORS Verification

- [ ] `https://www.fincenclear.com` is in CORS allowed origins
- [ ] `https://fincenclear.com` is in CORS allowed origins (no www)
- [ ] No CORS errors in browser console for any API call

---

## DO NOT

- ❌ Do not implement real password auth (separate effort)
- ❌ Do not change the demo seed data emails (just make login match them)
- ❌ Do not modify billing, filing, SDTM, or RERX code
- ❌ Do not remove the demo login functionality — fix it to use real data
- ❌ Do not add new demo accounts — fix the existing ones

## KILLEDSHARKS

**Append** to `docs/KilledSharks-2.md`:

```markdown
### 55. Demo Auth Fix — Real Database IDs ✅

**Date:** [date]

**Problem:**
Demo login stored hardcoded fake IDs in the session cookie (e.g., `company_id: "demo-client-company"` instead of a real UUID). This caused:
- All client-side API calls to fail (401, 404, 500)
- Sidebar counts endpoint crashing (CORS errors masking 500s)
- Billing endpoints returning 401 for client roles
- Company settings showing "No company found"
- Effectively, NO client-side features worked in demo mode

**Solution:**
- Demo login now queries the database for real user records
- Session cookie stores real UUIDs (user_id, company_id)
- Removed all hardcoded fake ID strings from frontend and backend
- Added UUID validation to sidebar counts endpoint (defensive)
- Verified CORS configuration includes production domain

**Files Modified:**
| File | Change |
|------|--------|
| [login route files] | Query backend for real user data |
| [session/cookie files] | Store real UUIDs, remove fake fallbacks |
| [sidebar counts endpoint] | UUID validation, graceful fallback |
| [CORS config] | Verified production domain included |
| `docs/KilledSharks-2.md` | This entry |

**Verification:**
- All 5 demo roles log in successfully with real UUIDs
- Client Admin sees real billing data, sidebar counts, company info
- Zero instances of "demo-client-company" remain in codebase
- No CORS errors in browser console

**Status:** ✅ Killed
```

**Update the Summary table at the top of KilledSharks-2.md.**
