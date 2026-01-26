# PCT FinCEN API

FastAPI backend for the Pacific Coast Title FinCEN BOIR Questionnaire application.

## Local Development

### Prerequisites

- Python 3.11+
- pip

### Setup

1. Create a virtual environment:

```bash
cd api
python -m venv venv
```

2. Activate the virtual environment:

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file (optional for local development):

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/fincen_db
APP_BASE_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
APP_VERSION=1.0.0
ENVIRONMENT=development
```

### Running Locally

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/version` | Version info |

## Deployment (Render)

This API is deployed on Render with the following configuration:

- **Root Directory:** `api`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables (Render)

```
DATABASE_URL=<postgres connection string>
APP_BASE_URL=https://pct-fin-cen.vercel.app
CORS_ORIGINS=https://pct-fin-cen.vercel.app,http://localhost:3000
APP_VERSION=1.0.0
ENVIRONMENT=production
```
