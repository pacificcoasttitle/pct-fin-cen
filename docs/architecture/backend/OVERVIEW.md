# Backend Architecture Overview

> FastAPI backend for FinClear platform

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | FastAPI 0.115+ | Async web framework |
| Server | Uvicorn 0.30+ | ASGI server |
| ORM | SQLAlchemy 2.0.36+ | Database abstraction |
| Migrations | Alembic 1.14+ | Schema versioning |
| Validation | Pydantic 2.10+ | Request/response validation |
| Database | PostgreSQL / SQLite | Production / Development |
| Testing | pytest 8.0+ | Unit and integration tests |

## Directory Structure

```
api/
├── app/
│   ├── main.py           # App entry, CORS, routers
│   ├── config.py         # Environment settings
│   ├── database.py       # DB connection
│   ├── db_types.py       # Cross-DB compatibility
│   ├── models/           # SQLAlchemy models
│   ├── routes/           # API endpoints
│   ├── schemas/          # Pydantic schemas
│   └── services/         # Business logic
├── alembic/              # Migrations
├── scripts/              # CLI utilities
└── tests/                # Test suite
```

## Request Flow

```
Request → FastAPI → Router → Service → Model → Database
                      ↓
                  Pydantic Schema (validation)
                      ↓
                  Response
```

## Core Modules

### Routes (API Endpoints)

| Module | Prefix | Purpose | Lines |
|--------|--------|---------|-------|
| `reports.py` | `/reports` | Report CRUD, wizard, filing | 532 |
| `admin.py` | `/admin` | Admin operations console | 342 |
| `demo.py` | `/demo` | Demo/staging utilities | 245 |
| `parties.py` | `/party` | Party portal (token-based) | 213 |

### Services (Business Logic)

| Module | Purpose | Lines |
|--------|---------|-------|
| `filing_lifecycle.py` | Filing state machine | 395 |
| `demo_seed.py` | Demo data generation | 370 |
| `determination.py` | FinCEN determination logic | 164 |
| `notifications.py` | Email outbox | 121 |
| `filing.py` | Mock filing provider | 83 |

### Models (Database)

| Model | Table | Purpose |
|-------|-------|---------|
| `Report` | `reports` | Core filing entity |
| `ReportParty` | `report_parties` | Parties in a report |
| `PartyLink` | `party_links` | Portal access tokens |
| `Document` | `documents` | Uploaded files |
| `FilingSubmission` | `filing_submissions` | Filing lifecycle |
| `AuditLog` | `audit_logs` | Compliance trail |
| `NotificationEvent` | `notification_events` | Email outbox |

## Authentication

### Demo Mode (Current)
- Cookie-based session (`pct_demo_session`)
- No backend authentication middleware
- Frontend handles session via Next.js middleware

### Demo Endpoints
- Protected by `X-DEMO-SECRET` header
- Only available when `ENVIRONMENT=staging`
- Returns 404 on auth failure (no endpoint discovery)

### Production Mode (Planned)
- Clerk authentication integration
- JWT token validation
- Role-based access control

## API Versioning

Currently unversioned. All endpoints are at root:
- `/reports/*`
- `/party/*`
- `/admin/*`
- `/demo/*`

## Error Handling

```python
# Standard error response
{
    "detail": "Error message here"
}

# Validation error response
{
    "detail": [
        {
            "loc": ["body", "field_name"],
            "msg": "field required",
            "type": "value_error.missing"
        }
    ]
}
```

## CORS Configuration

```python
# From config.py
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

# Applied in main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Database Connections

### Development (SQLite)
```python
DATABASE_URL = "sqlite:///./test.db"
```

### Production (PostgreSQL)
```python
DATABASE_URL = "postgresql://user:pass@host:5432/dbname"
```

### Connection Handling
```python
# Dependency injection pattern
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## Key Patterns

### Dependency Injection
```python
@router.get("/reports/{id}")
def get_report(id: str, db: Session = Depends(get_db)):
    ...
```

### IP Address Extraction
```python
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host or "unknown"
```

### JSONB Compatibility
```python
# db_types.py - Works with both PostgreSQL and SQLite
class JSONBType(TypeDecorator):
    impl = JSON

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())
```

## Testing

```bash
# Run all tests
cd api && pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_determination.py

# Run specific test
pytest tests/test_determination.py::test_cash_llc_is_reportable
```

### Test Database
- Uses separate SQLite database
- Created fresh for each test session
- Fixtures in `conftest.py`

## Development Commands

```bash
# Start development server
make dev
# or
uvicorn app.main:app --reload --port 8000

# Run migrations
alembic upgrade head

# Create migration
alembic revision --autogenerate -m "description"

# Seed demo data
python -m scripts.seed_demo
```

## Related Documentation

- [Models](./models.md)
- [Routes: Reports](./routes-reports.md)
- [Routes: Parties](./routes-parties.md)
- [Routes: Admin](./routes-admin.md)
- [Routes: Demo](./routes-demo.md)
- [Services: Determination](./services-determination.md)
- [Services: Filing](./services-filing.md)
- [Services: Notifications](./services-notifications.md)
