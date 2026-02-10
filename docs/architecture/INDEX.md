# FinClear Architecture

> Last updated: 2026-02-10
> This is the single source of truth for the FinClear platform.

## Quick Reference

### Where to Find Things

| I need to... | Look in... |
|--------------|------------|
| Add a new API endpoint | `api/app/routes/` |
| Modify database schema | `api/app/models/` + create migration |
| Change determination logic | `api/app/services/determination.py` |
| Update wizard steps | `web/components/rrer-questionnaire.tsx` |
| Add a new page | `web/app/(app)/app/` |
| Modify navigation | `web/app/(app)/layout.tsx` |
| Add API client function | `web/lib/api.ts` |
| Change filing logic | `api/app/services/filing_lifecycle.py` |
| Add email template | `api/app/services/notifications.py` |
| Add/modify types | `web/lib/rrer-types.ts` |

### Key Files (Most Frequently Modified)

| File | Purpose | Lines |
|------|---------|-------|
| `web/components/rrer-questionnaire.tsx` | Main wizard component | 3,214 |
| `web/lib/rrer-types.ts` | Types & constants | 682 |
| `api/app/routes/reports.py` | Report/filing endpoints | 532 |
| `web/lib/api.ts` | Frontend API client | 482 |
| `api/app/services/filing_lifecycle.py` | Filing state machine | 395 |
| `api/app/services/demo_seed.py` | Demo data seeding | 370 |
| `api/app/routes/admin.py` | Admin endpoints | 342 |
| `web/app/(app)/layout.tsx` | App layout + sidebar | 281 |
| `api/app/routes/demo.py` | Demo endpoints | 245 |
| `api/app/routes/parties.py` | Party portal endpoints | 213 |

### Status Codes

| Entity | Statuses |
|--------|----------|
| Report | `draft`, `determination_complete`, `collecting`, `awaiting_parties`, `ready_to_file`, `filed`, `exempt`, `cancelled` |
| Party | `pending`, `link_sent`, `in_progress`, `submitted`, `verified` |
| PartyLink | `active`, `used`, `expired`, `revoked` |
| Filing | `not_started`, `queued`, `submitted`, `accepted`, `rejected`, `needs_review` |
| AuditLog Actor | `system`, `staff`, `party`, `api` |

### User Roles (Demo)

| Role | Access |
|------|--------|
| Demo User | All features via cookie-based session |
| Party | Token-based portal access only |

### Future Roles (Post-Demo)

| Role | Access |
|------|--------|
| `client_user` | Own company reports only |
| `client_admin` | + Team, branches, billing, branding |
| `pct_staff` | All companies, work queue |
| `pct_admin` | + Admin functions |
| `coo` | Executive dashboard, all access |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                     (Next.js 16 / React 19)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Dashboard  │  │   Wizard    │  │ Party Portal│              │
│  │   /app/     │  │ /reports/   │  │    /p/      │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                    lib/api.ts                                    │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────┼───────────────────────────────────────┐
│                         API                                       │
│                     (FastAPI / Python)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   /reports  │  │   /party    │  │   /admin    │              │
│  │   Routes    │  │   Routes    │  │   Routes    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────┐              │
│  │              SERVICES                          │              │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ │              │
│  │  │Determination│ │  Filing   │ │Notification│ │              │
│  │  └────────────┘ └────────────┘ └────────────┘ │              │
│  └───────────────────────┬───────────────────────┘              │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────┐              │
│  │              MODELS (SQLAlchemy)              │              │
│  │  Report │ ReportParty │ PartyLink │ FilingSub │              │
│  │  Document │ AuditLog │ NotificationEvent       │              │
│  └───────────────────────┬───────────────────────┘              │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                       DATABASE                                    │
│                  (PostgreSQL / SQLite)                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.0.7 |
| UI Library | React | 19.2.0 |
| Components | shadcn/ui + Radix UI | 30+ primitives |
| Styling | Tailwind CSS | 4.1.9 |
| Forms | React Hook Form + Zod | 7.60+ |
| Backend | FastAPI | 0.115+ |
| ORM | SQLAlchemy | 2.0.36+ |
| Database | PostgreSQL (prod) / SQLite (dev) | - |
| Migrations | Alembic | 1.14+ |
| Package Manager | pnpm | - |
| Language | TypeScript / Python | 5+ / 3.13 |

---

## Documentation Index

### Core References
- [File Tree](./FILE-TREE.md) - Complete file inventory
- [Glossary](./GLOSSARY.md) - Terms, statuses, definitions

### Backend Documentation
- [Backend Overview](./backend/OVERVIEW.md) - Architecture summary
- [Models](./backend/models.md) - All SQLAlchemy models
- [Routes: Reports](./backend/routes-reports.md) - `/reports/*` endpoints
- [Routes: Parties](./backend/routes-parties.md) - `/party/*` endpoints
- [Routes: Admin](./backend/routes-admin.md) - `/admin/*` endpoints
- [Routes: Demo](./backend/routes-demo.md) - `/demo/*` endpoints
- [Services: Determination](./backend/services-determination.md) - FinCEN logic
- [Services: Filing](./backend/services-filing.md) - Filing lifecycle
- [Services: Notifications](./backend/services-notifications.md) - Outbox pattern

### Frontend Documentation
- [Frontend Overview](./frontend/OVERVIEW.md) - Architecture summary
- [Pages: Client](./frontend/pages-client.md) - Dashboard, reports, settings
- [Pages: Admin](./frontend/pages-admin.md) - Admin panel pages
- [Pages: Portal](./frontend/pages-portal.md) - Party portal
- [Components: Wizard](./frontend/components-wizard.md) - Main questionnaire
- [Components: UI](./frontend/components-ui.md) - Shared UI components
- [Lib: API](./frontend/lib-api.md) - API client functions
- [Lib: Types](./frontend/lib-types.md) - TypeScript types & constants

### Flow Diagrams
- [Report Lifecycle](./flows/report-lifecycle.md) - Full report flow
- [Party Portal Flow](./flows/party-portal-flow.md) - Party submission
- [Filing Flow](./flows/filing-flow.md) - FinCEN submission
- [Determination Flow](./flows/determination-flow.md) - Reportability logic

---

## Environment Variables

### Backend (`api/`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | Database connection string | SQLite in dev |
| `APP_BASE_URL` | Application base URL | `http://localhost:3000` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `APP_VERSION` | Application version | `0.1.0` |
| `ENVIRONMENT` | Environment name | `development` |
| `DEMO_SECRET` | Demo endpoint auth | Required in staging |

### Frontend (`web/`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | API endpoint | `http://localhost:8000` |
| `NEXT_PUBLIC_ENV_LABEL` | Environment label | - |
| `NEXT_PUBLIC_DEMO_LOGIN_EMAIL` | Demo login email | - |
| `NEXT_PUBLIC_DEMO_LOGIN_PASSWORD` | Demo login password | - |
| `NEXT_PUBLIC_DEMO_SECRET` | Demo API secret | - |

---

## Development Commands

### Backend
```bash
cd api
make dev          # Start development server
make test         # Run tests
make lint         # Run linter
make migrate      # Run migrations
make seed         # Seed demo data
```

### Frontend
```bash
cd web
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # Run linter
pnpm typecheck    # TypeScript check
```

---

## Deployment

- **Frontend**: Vercel (builds from `web/` subdirectory)
- **Backend**: Render (or similar)
- **Database**: PostgreSQL (managed)

---

## Phase Roadmap

| Phase | Status | Features |
|-------|--------|----------|
| 5 | ✅ Complete | Demo Hardening |
| 6 | Planned | Auth + Company Scoping (Clerk) |
| 7 | Planned | SendGrid Notifications |
| 8 | Planned | SDTM Filing Adapter |
| 9 | Planned | Billing + Invoicing |
| 10 | Planned | Security Hardening |
