# Frontend Architecture Overview

> Next.js 16 frontend for FinClear platform

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 16.0.7 | React framework with App Router |
| UI Library | React 19.2.0 | Component library |
| Components | shadcn/ui | Pre-built accessible components |
| Styling | Tailwind CSS 4.1.9 | Utility-first CSS |
| Forms | React Hook Form + Zod | Form handling + validation |
| Icons | Lucide React | Icon library |
| Charts | Recharts | Data visualization |
| Themes | next-themes | Dark mode support |
| Analytics | Vercel Analytics | Usage tracking |

## Directory Structure

```
web/
├── app/                    # Next.js App Router
│   ├── (app)/              # Protected routes
│   ├── (marketing)/        # Public marketing
│   ├── login/              # Login page
│   ├── p/[token]/          # Party portal
│   └── api/auth/           # Auth endpoints
├── components/
│   ├── rrer-questionnaire.tsx  # Main wizard (3214 lines)
│   ├── ui/                 # shadcn components (47)
│   └── [marketing]/        # Marketing sections
├── lib/
│   ├── api.ts              # API client (482 lines)
│   ├── rrer-types.ts       # Types (682 lines)
│   └── utils.ts            # Utilities
├── hooks/
│   ├── use-toast.ts        # Toast notifications
│   └── use-mobile.ts       # Mobile detection
└── middleware.ts           # Auth routing
```

## Route Structure

```
/                           # Marketing home
/login                      # Login page
/p/[token]                  # Party portal (public, token-based)

/app/dashboard              # User dashboard
/app/reports                # Reports list
/app/reports/new            # Create report
/app/reports/[id]/wizard    # Report wizard
/app/settings               # User settings

/app/admin/overview         # Admin dashboard
/app/admin/reports          # Admin report list
/app/admin/reports/[id]     # Report detail
/app/admin/filings          # Filing management
/app/admin/notifications    # Notification history
/app/admin/users            # User management

/app/demo-tools             # Demo utilities (staging)
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE.TS                             │
│                                                              │
│  /app/*  ──► Check pct_demo_session cookie ──► Protected    │
│                      │                                       │
│                      ▼                                       │
│              No cookie? Redirect to /login                   │
│                                                              │
│  /login  ──► Has cookie? Redirect to /app/dashboard         │
│                                                              │
│  /p/*    ──► Public (token-based auth in API)               │
│                                                              │
│  /       ──► Public (marketing)                              │
└─────────────────────────────────────────────────────────────┘
```

### Demo Auth

Current implementation uses cookie-based session:

```typescript
// Login: POST /api/auth/login
// Sets cookie: pct_demo_session=1

// Logout: POST /api/auth/logout
// Clears cookie
```

### Production Auth (Planned)

Will integrate Clerk for:
- Real user accounts
- Role-based access control
- Company/team scoping

## Key Components

### Main Wizard (rrer-questionnaire.tsx)

The core component handling the entire report workflow:

| Phase | Steps | Purpose |
|-------|-------|---------|
| Determination | 6 | Property, financing, buyer type, exemptions |
| Collection | 5 | Seller, buyer, BOs, payment, review |
| Filing | 2 | Generate links, file report |

### Layouts

| Layout | Path | Features |
|--------|------|----------|
| Root | `app/layout.tsx` | Fonts, analytics, staging banner |
| App | `app/(app)/layout.tsx` | Sidebar, header, user menu |

### Pages by Category

| Category | Count | Purpose |
|----------|-------|---------|
| Client | 6 | Dashboard, reports, settings |
| Admin | 5 | Overview, reports, filings, notifications, users |
| Portal | 1 | Party submission |
| Auth | 1 | Login |
| Marketing | 1 | Home page |

## State Management

### Wizard State

- React `useState` for local form state
- Auto-save to API with 1500ms debounce
- State persisted in `wizard_data` JSONB field

### API State

- Direct API calls via `lib/api.ts`
- No global state management (Redux, Zustand)
- Component-level data fetching with `useEffect`

### Form State

- React Hook Form for form handling
- Zod schemas for validation
- Field-level error messages

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT                                 │
│                                                              │
│  useState() ──► Form Fields ──► onChange ──► Local State    │
│                                      │                       │
│                                      ▼ (1500ms debounce)     │
│                               saveWizard(id, step, data)    │
│                                      │                       │
│                                      ▼                       │
│                              lib/api.ts                      │
│                                      │                       │
│                                      ▼                       │
│                              PUT /reports/{id}/wizard        │
└─────────────────────────────────────────────────────────────┘
```

## API Client

All API calls go through `lib/api.ts`:

```typescript
// Base configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// Error handling
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// Example function
export async function getReport(id: string): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports/${id}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

## Styling

### Tailwind CSS

- Utility-first approach
- Custom color palette
- Responsive breakpoints: `sm`, `md`, `lg`, `xl`

### shadcn/ui

- 47 pre-built components
- Radix UI primitives
- Customizable via `components.json`

### Theme Support

```typescript
// ThemeProvider wraps app
<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | API endpoint |
| `NEXT_PUBLIC_ENV_LABEL` | Environment label |
| `NEXT_PUBLIC_DEMO_LOGIN_EMAIL` | Demo credentials |
| `NEXT_PUBLIC_DEMO_LOGIN_PASSWORD` | Demo credentials |
| `NEXT_PUBLIC_DEMO_SECRET` | Demo API secret |

## Development Commands

```bash
# Start dev server
pnpm dev

# Production build
pnpm build

# Type checking
pnpm typecheck

# Linting (no config currently)
pnpm lint
```

## Related Documentation

- [Client Pages](./pages-client.md)
- [Admin Pages](./pages-admin.md)
- [Portal Pages](./pages-portal.md)
- [Wizard Component](./components-wizard.md)
- [UI Components](./components-ui.md)
- [API Client](./lib-api.md)
- [Types & Constants](./lib-types.md)
