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
```

### Migrations on Deploy

The `build.sh` script automatically runs `alembic upgrade head` on every deployment, ensuring the database schema is always up to date.
