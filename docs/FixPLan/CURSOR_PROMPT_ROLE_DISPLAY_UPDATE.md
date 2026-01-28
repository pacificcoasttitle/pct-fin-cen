# CURSOR PROMPT: Update PCT Staff/Admin to FinClear (Display Only)

## OBJECTIVE

Update all **display text** references from "PCT Staff" and "PCT Admin" to "FinClear Staff" and "FinClear Admin" respectively.

**⚠️ CRITICAL: This is a DISPLAY-ONLY change. Do NOT modify:**
- Database values
- Role constants/enums in code
- API request/response field values
- Authentication logic
- Authorization checks
- Route guards
- Middleware

---

## WHAT TO CHANGE vs. WHAT TO PRESERVE

### ✅ CHANGE (Display/UI Only)

| Find | Replace With |
|------|--------------|
| `"PCT Staff"` | `"FinClear Staff"` |
| `"PCT Admin"` | `"FinClear Admin"` |
| `"PCT User"` | `"FinClear User"` |
| `"PCT Manager"` | `"FinClear Manager"` |
| `"PCT Client"` | `"FinClear Client"` |
| `"PCT Team"` | `"FinClear Team"` |

These appear in:
- Login page buttons/labels
- User role badges
- Dashboard headers
- Dropdown menus
- Tooltips
- Help text
- Email content

### ❌ DO NOT CHANGE (Functional Code)

```typescript
// DO NOT CHANGE these - they are functional values
role: "staff"           // Keep as is
role: "admin"           // Keep as is
role: "user"            // Keep as is
role: "manager"         // Keep as is

// DO NOT CHANGE authorization checks
if (user.role === "admin")     // Keep as is
if (user.role === "staff")     // Keep as is

// DO NOT CHANGE database queries
.filter(User.role == "staff")  // Keep as is

// DO NOT CHANGE API responses
{ "role": "admin" }            // Keep as is

// DO NOT CHANGE route guards
requiredRole: "admin"          // Keep as is
```

---

## PART 1: Login Page Updates

**File:** `web/app/login/page.tsx` (or similar)

### Find login buttons/options like:

```tsx
// BEFORE
<Button>Login as PCT Staff</Button>
<Button>Login as PCT Admin</Button>
<span>PCT Staff Portal</span>

// AFTER
<Button>Login as FinClear Staff</Button>
<Button>Login as FinClear Admin</Button>
<span>FinClear Staff Portal</span>
```

### Demo login section (if exists):

```tsx
// BEFORE
const demoUsers = [
  { label: "PCT Staff", email: "staff@demo.com", role: "staff" },
  { label: "PCT Admin", email: "admin@demo.com", role: "admin" },
];

// AFTER - Only change the label, NOT the role value
const demoUsers = [
  { label: "FinClear Staff", email: "staff@demo.com", role: "staff" },  // role stays "staff"
  { label: "FinClear Admin", email: "admin@demo.com", role: "admin" },  // role stays "admin"
];
```

---

## PART 2: Role Badge Display

**File:** `web/components/ui/role-badge.tsx` (or wherever role badges are defined)

### Update display mapping:

```tsx
// BEFORE
const roleDisplayNames: Record<string, string> = {
  admin: "PCT Admin",
  staff: "PCT Staff",
  manager: "PCT Manager",
  user: "PCT User",
};

// AFTER
const roleDisplayNames: Record<string, string> = {
  admin: "FinClear Admin",
  staff: "FinClear Staff", 
  manager: "FinClear Manager",
  user: "FinClear User",
};

// The function still receives "admin", "staff" etc. - that's correct!
export function getRoleDisplayName(role: string): string {
  return roleDisplayNames[role] || role;
}
```

---

## PART 3: User Profile / Settings

**File:** `web/app/(app)/app/settings/page.tsx` (or profile components)

```tsx
// BEFORE
<p className="text-sm text-muted-foreground">
  You are logged in as a PCT Staff member
</p>

// AFTER
<p className="text-sm text-muted-foreground">
  You are logged in as a FinClear Staff member
</p>
```

---

## PART 4: Admin Dashboard Headers

**File:** `web/app/(app)/app/admin/*` pages

```tsx
// BEFORE
<h1>PCT Admin Dashboard</h1>
<p>Welcome to the PCT administration panel</p>

// AFTER
<h1>FinClear Admin Dashboard</h1>
<p>Welcome to the FinClear administration panel</p>
```

---

## PART 5: Navigation / Sidebar Labels

**File:** `web/components/app-sidebar.tsx`

```tsx
// BEFORE
const navItems = [
  { label: "PCT Dashboard", href: "/app/dashboard" },
  { label: "PCT Reports", href: "/app/reports" },
];

// AFTER
const navItems = [
  { label: "Dashboard", href: "/app/dashboard" },  // Remove PCT prefix
  { label: "Reports", href: "/app/reports" },      // Remove PCT prefix
];
```

---

## PART 6: Email Content

**File:** `api/app/services/email.py`

```python
# BEFORE
subject = "PCT Staff has sent you a request"
body = "A PCT Staff member has requested..."

# AFTER  
subject = "FinClear Staff has sent you a request"
body = "A FinClear Staff member has requested..."
```

---

## PART 7: Toast / Notification Messages

**File:** Various components with toast notifications

```tsx
// BEFORE
toast({
  title: "PCT Admin Action",
  description: "You have been granted PCT Admin access",
});

// AFTER
toast({
  title: "Admin Action",
  description: "You have been granted FinClear Admin access",
});
```

---

## PART 8: Help Text / Tooltips

Search for any help text or tooltips:

```tsx
// BEFORE
<TooltipContent>
  Only PCT Staff members can perform this action
</TooltipContent>

// AFTER
<TooltipContent>
  Only FinClear Staff members can perform this action
</TooltipContent>
```

---

## SEARCH PATTERNS

Run these searches to find all instances:

```bash
# In frontend
grep -ri "PCT Staff" web/
grep -ri "PCT Admin" web/
grep -ri "PCT User" web/
grep -ri "PCT Manager" web/
grep -ri '"PCT ' web/        # Catches "PCT anything"
grep -ri "'PCT " web/        # Single quotes

# In backend
grep -ri "PCT Staff" api/
grep -ri "PCT Admin" api/
grep -ri '"PCT ' api/
```

---

## VERIFICATION CHECKLIST

After changes, verify:

### Display Changes ✓
- [ ] Login page shows "FinClear Staff" / "FinClear Admin"
- [ ] Role badges display "FinClear [Role]"
- [ ] Dashboard headers say "FinClear"
- [ ] Settings page shows "FinClear" role names
- [ ] Emails reference "FinClear"

### Functionality Preserved ✓
- [ ] Login still works for all user types
- [ ] Role-based access control still works
- [ ] Admin can access admin pages
- [ ] Staff can access staff pages
- [ ] API requests/responses unchanged
- [ ] Database values unchanged

### Test Logins
- [ ] Login as staff → Can access staff features
- [ ] Login as admin → Can access admin features
- [ ] Login as client → Can access client features
- [ ] Role badge shows correct display name
- [ ] Permissions work correctly

---

## WHAT NOT TO TOUCH

### Database Models (DO NOT CHANGE)
```python
# api/app/models/user.py
class User:
    role = Column(String)  # Values: "admin", "staff", "user" - KEEP AS IS
```

### Role Enums (DO NOT CHANGE)
```typescript
// web/lib/types.ts
type UserRole = "admin" | "staff" | "manager" | "user";  // KEEP AS IS
```

### Auth Checks (DO NOT CHANGE)
```typescript
// Any authorization logic
if (session.user.role === "admin") { ... }  // KEEP AS IS
```

### API Routes (DO NOT CHANGE)
```python
# Role checks in API
@require_role("admin")
def admin_endpoint():  # KEEP AS IS
```

---

## UPDATE KilledSharks.md

```markdown
---

### 16. PCT Staff/Admin → FinClear (Display Only) ✅

**Task:** Update display text from "PCT Staff/Admin" to "FinClear Staff/Admin"

**Scope:** Display/UI text ONLY - no functional changes

**Changes Made:**

| Location | Before | After |
|----------|--------|-------|
| Login buttons | "PCT Staff" | "FinClear Staff" |
| Login buttons | "PCT Admin" | "FinClear Admin" |
| Role badges | "PCT [Role]" | "FinClear [Role]" |
| Dashboard headers | "PCT Admin Dashboard" | "FinClear Admin Dashboard" |
| Email content | "PCT Staff member" | "FinClear Staff member" |
| Help text | References to "PCT" | References to "FinClear" |

**NOT Changed (Preserved):**
- Database role values ("admin", "staff", "user")
- Role type definitions
- Authorization checks
- API request/response payloads
- Route guards
- Middleware logic

**Files Updated:**
- `web/app/login/page.tsx`
- `web/components/ui/role-badge.tsx` (or equivalent)
- `web/app/(app)/app/admin/*.tsx`
- `web/app/(app)/app/settings/page.tsx`
- `api/app/services/email.py`

**Test Results:**
- ✅ Login works for all roles
- ✅ Role badges display correctly
- ✅ Admin access preserved
- ✅ Staff access preserved
- ✅ No authorization errors

**Status:** ✅ Killed
```

---

## SUMMARY

| Change Type | Action |
|-------------|--------|
| **UI Labels** | "PCT Staff" → "FinClear Staff" |
| **UI Labels** | "PCT Admin" → "FinClear Admin" |
| **Database Values** | ❌ NO CHANGE |
| **Role Enums** | ❌ NO CHANGE |
| **Auth Logic** | ❌ NO CHANGE |
| **API Payloads** | ❌ NO CHANGE |

**This is purely cosmetic. The app works exactly the same, just says "FinClear" instead of "PCT".**
