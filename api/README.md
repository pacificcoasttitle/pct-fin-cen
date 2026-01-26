# PCT FinCEN API

FastAPI backend for the Pacific Coast Title FinCEN BOIR Questionnaire application.

## Project Structure

```
api/
├── alembic/              # Database migrations
│   ├── versions/         # Migration scripts
│   └── env.py           # Alembic environment config
├── app/
│   ├── models/          # SQLAlchemy models
│   │   ├── report.py
│   │   ├── report_party.py
│   │   ├── party_link.py
│   │   ├── document.py
│   │   └── audit_log.py
│   ├── config.py        # Settings from env vars
│   ├── database.py      # DB connection setup
│   └── main.py          # FastAPI app
├── tests/               # Pytest tests
├── alembic.ini          # Alembic configuration
├── Makefile             # CLI shortcuts
├── requirements.txt     # Python dependencies
└── build.sh             # Render build script
```

## Local Development

### Prerequisites

- Python 3.11+
- PostgreSQL (or use SQLite for testing)

### Setup

1. Create and activate virtual environment:

```bash
cd api
python -m venv venv

# Windows PowerShell
.\venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
# or
make install
```

3. Set environment variables (create `.env` file):

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/fincen_db
APP_BASE_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
APP_VERSION=1.0.0
ENVIRONMENT=development
```

4. Run migrations:

```bash
alembic upgrade head
# or
make migrate
```

5. Start the server:

```bash
uvicorn app.main:app --reload --port 8000
# or
make dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/version` | Version info |
| GET | `/db-check` | DB connectivity (staging only) |
| GET | `/docs` | Swagger UI documentation |
| POST | `/demo/reset` | Reset demo data (staging only, requires secret) |
| POST | `/demo/create-report` | Create demo report (staging only, requires secret) |

## Demo Endpoints (Staging Only)

Demo endpoints are protected by two security layers:
1. **Environment check**: Only works when `ENVIRONMENT=staging`
2. **Secret header**: Requires `X-DEMO-SECRET` header matching `DEMO_SECRET` env var

If either check fails, endpoints return `404 Not Found` (not `401` or `403`) to avoid discovery.

### Configuration

Add to your environment variables:

```bash
ENVIRONMENT=staging
DEMO_SECRET=your-secure-random-secret
```

### POST /demo/reset

Clears all data and re-seeds with 6 demo reports (3 exempt, 3 reportable).

```bash
curl -X POST "$API_BASE_URL/demo/reset" \
  -H "X-DEMO-SECRET: $DEMO_SECRET"
```

Response:
```json
{
  "ok": true,
  "reports_created": 6,
  "timestamp": "2026-01-26T12:00:00.000000",
  "environment": "staging"
}
```

### POST /demo/create-report

Creates a single demo report and returns the wizard URL.

```bash
curl -X POST "$API_BASE_URL/demo/create-report" \
  -H "X-DEMO-SECRET: $DEMO_SECRET"
```

Response:
```json
{
  "ok": true,
  "report_id": "550e8400-e29b-41d4-a716-446655440000",
  "wizard_url": "https://your-app.vercel.app/app/reports/550e8400-e29b-41d4-a716-446655440000/wizard",
  "timestamp": "2026-01-26T12:00:00.000000"
}
```

## Database Models

### Reports
Core entity for FinCEN RRER filings. Tracks wizard progress, determination results, and filing status.

### Report Parties
Parties involved in a report (transferees, transferors, beneficial owners).

### Party Links
Secure, time-limited links for party self-service data collection.

### Documents
Uploaded documents (ID photos, etc.) associated with parties.

### Audit Log
Compliance audit trail - all actions logged for 5-year retention.

## Testing

```bash
# Run all tests
pytest tests/ -v
# or
make test

# Run with coverage
make test-cov
```

## Migrations

```bash
# Apply all pending migrations
make migrate

# Create new migration
make migrate-new msg="add new field"

# View migration history
make migrate-history

# Rollback last migration
make migrate-down
```

## Deployment (Render)

### Configuration

- **Root Directory:** `api`
- **Build Command:** `./build.sh`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables

```
DATABASE_URL=<postgres connection string>
APP_BASE_URL=https://pct-fin-cen.vercel.app
CORS_ORIGINS=https://pct-fin-cen.vercel.app,http://localhost:3000
APP_VERSION=1.0.0
ENVIRONMENT=staging
DEMO_SECRET=<secure random string for demo endpoint access>
```

### Migrations on Deploy

The `build.sh` script automatically runs `alembic upgrade head` on every deployment, ensuring the database schema is always up to date.
