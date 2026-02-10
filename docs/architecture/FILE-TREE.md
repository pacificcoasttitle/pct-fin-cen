# FinClear File Tree

> Generated: 2026-02-10
> Use this to quickly locate files when making changes.

## Backend (`api/`)

```
api/
├── app/
│   ├── __init__.py                    # Package marker
│   ├── main.py                        # FastAPI app entry point (111 lines)
│   ├── config.py                      # Environment configuration (30 lines)
│   ├── database.py                    # Database connection + session (42 lines)
│   ├── db_types.py                    # Cross-DB JSON compatibility (25 lines)
│   │
│   ├── models/
│   │   ├── __init__.py                # Model exports (20 lines)
│   │   ├── report.py                  # Report entity (66 lines)
│   │   ├── report_party.py            # ReportParty entity (75 lines)
│   │   ├── party_link.py              # PartyLink tokens (76 lines)
│   │   ├── document.py                # Uploaded documents (53 lines)
│   │   ├── audit_log.py               # Audit trail (70 lines)
│   │   ├── notification_event.py      # Email outbox (75 lines)
│   │   └── filing_submission.py       # Filing lifecycle (101 lines)
│   │
│   ├── routes/
│   │   ├── __init__.py                # Route exports (14 lines)
│   │   ├── reports.py                 # /reports/* CRUD + wizard + filing (532 lines)
│   │   ├── parties.py                 # /party/* token-based portal (213 lines)
│   │   ├── admin.py                   # /admin/* ops console (342 lines)
│   │   └── demo.py                    # /demo/* staging tools (245 lines)
│   │
│   ├── schemas/
│   │   ├── __init__.py                # Schema exports (38 lines)
│   │   ├── common.py                  # Shared schemas (37 lines)
│   │   ├── report.py                  # Report schemas (87 lines)
│   │   └── party.py                   # Party schemas (71 lines)
│   │
│   └── services/
│       ├── __init__.py                # Service exports (46 lines)
│       ├── determination.py           # FinCEN determination logic (164 lines)
│       ├── filing.py                  # Mock filing provider (83 lines)
│       ├── filing_lifecycle.py        # Filing state machine (395 lines)
│       ├── notifications.py           # Notification outbox (121 lines)
│       └── demo_seed.py               # Demo data seeding (370 lines)
│
├── alembic/
│   ├── env.py                         # Migration environment
│   └── versions/
│       ├── 20260126_000001_init_initial_schema.py
│       ├── 20260126_000002_add_notification_events.py
│       ├── 20260126_000003_add_filing_fields.py
│       └── 20260126_000004_add_filing_submissions.py
│
├── scripts/
│   ├── __init__.py
│   └── seed_demo.py                   # CLI demo seeding
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py                    # Pytest fixtures
│   ├── test_api_flow.py               # E2E API tests
│   ├── test_demo_endpoints.py         # Demo endpoint tests
│   ├── test_determination.py          # Determination logic tests
│   ├── test_filing.py                 # Filing tests
│   ├── test_filing_lifecycle.py       # Lifecycle state tests
│   ├── test_health.py                 # Health endpoint tests
│   ├── test_models.py                 # Model tests
│   ├── test_notifications.py          # Notification tests
│   ├── test_party_tokens.py           # Token auth tests
│   └── test_ready_check.py            # Ready check tests
│
├── requirements.txt                   # Python dependencies
├── pytest.ini                         # Pytest configuration
├── alembic.ini                        # Alembic configuration
├── Makefile                           # Development commands
└── build.sh                           # Build script
```

**Backend Totals:**
- Python files: 30+
- Lines of code: ~5,400
- Test files: 11 (101 tests passing)

---

## Frontend (`web/`)

```
web/
├── app/
│   ├── layout.tsx                     # Root layout (62 lines)
│   ├── globals.css                    # Global styles
│   │
│   ├── (marketing)/
│   │   └── page.tsx                   # Marketing home page (37 lines)
│   │
│   ├── login/
│   │   └── page.tsx                   # Login page (171 lines)
│   │
│   ├── p/
│   │   └── [token]/
│   │       └── page.tsx               # Party portal (513 lines)
│   │
│   ├── (app)/
│   │   ├── layout.tsx                 # App layout + sidebar (281 lines)
│   │   └── app/
│   │       ├── dashboard/
│   │       │   └── page.tsx           # User dashboard (371 lines)
│   │       │
│   │       ├── reports/
│   │       │   ├── page.tsx           # Reports list (288 lines)
│   │       │   ├── new/
│   │       │   │   └── page.tsx       # Create report (44 lines)
│   │       │   └── [id]/
│   │       │       └── wizard/
│   │       │           └── page.tsx   # Wizard wrapper (560 lines)
│   │       │
│   │       ├── admin/
│   │       │   ├── overview/
│   │       │   │   └── page.tsx       # Admin dashboard (352 lines)
│   │       │   ├── reports/
│   │       │   │   ├── page.tsx       # Admin reports list (336 lines)
│   │       │   │   └── [id]/
│   │       │   │       └── page.tsx   # Report detail (525 lines)
│   │       │   ├── filings/
│   │       │   │   └── page.tsx       # Filing management (324 lines)
│   │       │   ├── notifications/
│   │       │   │   └── page.tsx       # Notification history (422 lines)
│   │       │   └── users/
│   │       │       └── page.tsx       # User management (271 lines)
│   │       │
│   │       ├── settings/
│   │       │   └── page.tsx           # User settings (248 lines)
│   │       │
│   │       └── demo-tools/
│   │           └── page.tsx           # Demo utilities (274 lines)
│   │
│   ├── reports/                       # Public report routes (redirects)
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/wizard/page.tsx
│   │
│   └── api/
│       └── auth/
│           ├── login/
│           │   └── route.ts           # Login endpoint (57 lines)
│           └── logout/
│               └── route.ts           # Logout endpoint (35 lines)
│
├── components/
│   ├── rrer-questionnaire.tsx         # Main wizard component (3214 lines) ⭐
│   ├── theme-provider.tsx             # Theme support (11 lines)
│   │
│   ├── header.tsx                     # Marketing header (104 lines)
│   ├── hero-section.tsx               # Hero banner (148 lines)
│   ├── countdown-section.tsx          # Launch countdown (97 lines)
│   ├── problem-section.tsx            # Problem statement (77 lines)
│   ├── solution-section.tsx           # Solution overview (100 lines)
│   ├── features-section.tsx           # Feature grid (76 lines)
│   ├── comparison-section.tsx         # Comparison table (138 lines)
│   ├── pricing-section.tsx            # Pricing tiers (160 lines)
│   ├── security-section.tsx           # Security certs (79 lines)
│   ├── about-section.tsx              # About company (75 lines)
│   ├── faq-section.tsx                # FAQ accordion (79 lines)
│   ├── cta-section.tsx                # Call-to-action (46 lines)
│   ├── mobile-cta-bar.tsx             # Mobile CTA (13 lines)
│   └── footer.tsx                     # Footer (137 lines)
│   │
│   └── ui/                            # shadcn/ui components (47 files)
│       ├── accordion.tsx
│       ├── alert.tsx
│       ├── alert-dialog.tsx           # (157 lines)
│       ├── aspect-ratio.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── button.tsx
│       ├── button-group.tsx
│       ├── calendar.tsx               # (213 lines)
│       ├── card.tsx
│       ├── carousel.tsx               # (241 lines)
│       ├── chart.tsx                  # (353 lines)
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── command.tsx                # (184 lines)
│       ├── context-menu.tsx           # (252 lines)
│       ├── dialog.tsx                 # (143 lines)
│       ├── drawer.tsx
│       ├── dropdown-menu.tsx          # (257 lines)
│       ├── empty.tsx
│       ├── field.tsx                  # (244 lines)
│       ├── form.tsx                   # (167 lines)
│       ├── hover-card.tsx
│       ├── input.tsx
│       ├── input-group.tsx            # (169 lines)
│       ├── input-otp.tsx
│       ├── item.tsx                   # (193 lines)
│       ├── kbd.tsx
│       ├── label.tsx
│       ├── menubar.tsx                # (276 lines)
│       ├── navigation-menu.tsx        # (166 lines)
│       ├── pagination.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── resizable.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx                 # (185 lines)
│       ├── separator.tsx
│       ├── sheet.tsx                  # (139 lines)
│       ├── sidebar.tsx                # (726 lines)
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── sonner.tsx
│       ├── spinner.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       ├── toggle.tsx
│       ├── toggle-group.tsx
│       ├── tooltip.tsx
│       ├── use-mobile.tsx
│       └── use-toast.ts               # (191 lines)
│
├── hooks/
│   ├── use-mobile.ts                  # Mobile detection (19 lines)
│   └── use-toast.ts                   # Toast notifications (191 lines)
│
├── lib/
│   ├── api.ts                         # API client (482 lines) ⭐
│   ├── rrer-types.ts                  # Types + constants (682 lines) ⭐
│   └── utils.ts                       # Utility functions (6 lines)
│
├── middleware.ts                      # Auth routing (49 lines)
│
├── _imports/                          # Template copies
│   ├── questionnaire/
│   └── website/
│
├── public/                            # Static assets
├── styles/                            # Additional styles
│
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
├── next.config.mjs                    # Next.js config
├── postcss.config.mjs                 # PostCSS config
├── components.json                    # shadcn config
└── next-env.d.ts                      # TypeScript env
```

**Frontend Totals:**
- Page routes: 18
- Components: 60+ (13 custom + 47 UI)
- Lines of code: ~10,000+
- Key files:
  - `rrer-questionnaire.tsx`: 3,214 lines (main wizard)
  - `api.ts`: 482 lines (API client)
  - `rrer-types.ts`: 682 lines (types)

---

## Configuration Files (Root)

```
zen-raman/
├── .gitignore
├── .python-version                    # Python 3.13.5
├── pnpm-lock.yaml                     # Package lockfile
├── package.json                       # Root package config
├── tsconfig.json                      # Root TypeScript config
├── next.config.mjs                    # Root Next.js config
├── postcss.config.mjs                 # PostCSS config
├── components.json                    # shadcn/ui config
│
├── pct_fin_cen_solutions_sources_of_truth_committed.md  # Master spec
│
└── docs/
    └── architecture/                  # This documentation
        ├── INDEX.md
        ├── FILE-TREE.md               # (this file)
        ├── GLOSSARY.md
        ├── backend/
        ├── frontend/
        └── flows/
```

---

## Quick Reference: File by Purpose

| I need to... | Look in... |
|--------------|------------|
| Add API endpoint | `api/app/routes/` |
| Add database model | `api/app/models/` + migration |
| Modify wizard logic | `web/components/rrer-questionnaire.tsx` |
| Add determination rule | `api/app/services/determination.py` |
| Modify filing logic | `api/app/services/filing_lifecycle.py` |
| Add frontend page | `web/app/(app)/app/` |
| Add API client function | `web/lib/api.ts` |
| Modify types/constants | `web/lib/rrer-types.ts` |
| Add UI component | `web/components/ui/` |
| Modify auth flow | `web/middleware.ts` |
| Add notification | `api/app/services/notifications.py` |
| Modify demo data | `api/app/services/demo_seed.py` |
