# CURSOR PROMPT: Local Development Environment Setup

## OBJECTIVE

Create a complete local development environment that mirrors staging/production exactly. Once it works locally, it WILL work on Render/Vercel.

```
LOCAL (instant feedback) → STAGING (verify) → PRODUCTION (ship)
     2 seconds                3 minutes           deploy
```

---

## PART 1: Project Structure Verification

First, verify the project structure:

```
pct-fin-cen/
├── api/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── requirements.txt
│   └── .env               # ← CREATE THIS
├── web/                    # Next.js frontend
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── .env.local         # ← CREATE THIS
└── docker-compose.yml      # ← OPTIONAL (for Postgres)
```

---

## PART 2: API Local Setup

### 2.1 Create API Environment File

**File:** `api/.env`

```bash
# Database - Use SQLite for simplicity, or Postgres for parity with staging
# Option A: SQLite (simplest)
DATABASE_URL=sqlite:///./local_dev.db

# Option B: Local Postgres (matches staging exactly)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pct_fincen_dev

# Environment
ENVIRONMENT=development

# Demo/Testing
DEMO_SECRET=local-dev-secret

# Email (mock in development)
SENDGRID_API_KEY=mock-key-for-local-dev
EMAIL_FROM=noreply@localhost

# Optional: Set to "true" to see SQL queries
DEBUG=true
```

### 2.2 Create API Setup Script

**File:** `api/setup_local.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Setting up PCT FinCEN API locally..."

# Check Python version
python3 --version || { echo "❌ Python 3 required"; exit 1; }

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
DATABASE_URL=sqlite:///./local_dev.db
ENVIRONMENT=development
DEMO_SECRET=local-dev-secret
SENDGRID_API_KEY=mock-key-for-local-dev
EMAIL_FROM=noreply@localhost
DEBUG=true
EOF
fi

# Run database migrations (if using Alembic)
if [ -d "alembic" ]; then
    echo "🗄️ Running database migrations..."
    alembic upgrade head
fi

# Or create tables directly
echo "🗄️ Creating database tables..."
python -c "
from app.main import app
from app.database import engine, Base
from app.models import *  # Import all models
Base.metadata.create_all(bind=engine)
print('✅ Database tables created')
"

# Seed demo data
echo "🌱 Seeding demo data..."
python -c "
import requests
# Will seed when server starts via /demo/reset
print('✅ Demo data ready (call POST /demo/reset after server starts)')
"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the API server:"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --reload --port 8000"
echo ""
echo "API will be available at: http://localhost:8000"
echo "API docs at: http://localhost:8000/docs"
```

### 2.3 Create Windows Setup Script

**File:** `api/setup_local.bat`

```batch
@echo off
echo 🚀 Setting up PCT FinCEN API locally...

REM Check Python
python --version || (echo ❌ Python 3 required & exit /b 1)

REM Create virtual environment
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt

REM Create .env if not exists
if not exist ".env" (
    echo 📝 Creating .env file...
    (
        echo DATABASE_URL=sqlite:///./local_dev.db
        echo ENVIRONMENT=development
        echo DEMO_SECRET=local-dev-secret
        echo SENDGRID_API_KEY=mock-key-for-local-dev
        echo EMAIL_FROM=noreply@localhost
        echo DEBUG=true
    ) > .env
)

echo.
echo ✅ Setup complete!
echo.
echo To start the API server:
echo   venv\Scripts\activate
echo   uvicorn app.main:app --reload --port 8000
echo.
echo API will be available at: http://localhost:8000
```

### 2.4 Database Initialization Script

**File:** `api/init_db.py`

```python
"""
Initialize local database with tables and seed data.
Run: python init_db.py
"""

import os
import sys

# Ensure we can import from app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from app.database import Base, engine, SessionLocal
from app.models import *  # Import all models to register them

def init_database():
    print("🗄️ Initializing database...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created")
    
    # Create session for seeding
    db = SessionLocal()
    
    try:
        # Check if demo company exists
        from app.models.company import Company
        demo_company = db.query(Company).filter(Company.code == "DEMO").first()
        
        if not demo_company:
            print("🏢 Creating demo company...")
            demo_company = Company(
                name="Demo Title Company",
                code="DEMO",
                is_active=True,
            )
            db.add(demo_company)
            db.commit()
            print(f"✅ Demo company created (ID: {demo_company.id})")
        else:
            print(f"✅ Demo company exists (ID: {demo_company.id})")
        
        # Check if demo user exists
        from app.models.user import User
        demo_user = db.query(User).filter(User.email == "demo@pct.com").first()
        
        if not demo_user:
            print("👤 Creating demo user...")
            demo_user = User(
                email="demo@pct.com",
                name="Demo User",
                company_id=demo_company.id,
                role="staff",
                is_active=True,
            )
            db.add(demo_user)
            db.commit()
            print(f"✅ Demo user created (ID: {demo_user.id})")
        else:
            print(f"✅ Demo user exists (ID: {demo_user.id})")
            
        print("")
        print("🎉 Database initialized successfully!")
        print("")
        print("You can now start the server:")
        print("  uvicorn app.main:app --reload --port 8000")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
```

---

## PART 3: Frontend Local Setup

### 3.1 Create Frontend Environment File

**File:** `web/.env.local`

```bash
# API URL - Point to local API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Demo mode indicator
NEXT_PUBLIC_DEMO_MODE=true

# Disable Vercel Analytics locally
NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED=false
```

### 3.2 Create Frontend Setup Script

**File:** `web/setup_local.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Setting up PCT FinCEN Frontend locally..."

# Check Node version
node --version || { echo "❌ Node.js required"; exit 1; }

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Create .env.local if not exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED=false
EOF
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the frontend:"
echo "  npm run dev"
echo ""
echo "Frontend will be available at: http://localhost:3000"
```

---

## PART 4: Combined Start Scripts

### 4.1 Root Start Script (Both Services)

**File:** `start_local.sh` (in project root)

```bash
#!/bin/bash

echo "🚀 Starting PCT FinCEN locally..."
echo ""

# Check if we're in the right directory
if [ ! -d "api" ] || [ ! -d "web" ]; then
    echo "❌ Run this from the project root (where api/ and web/ folders are)"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $API_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    exit 0
}
trap cleanup INT TERM

# Start API
echo "🔧 Starting API server..."
cd api
source venv/bin/activate 2>/dev/null || { echo "Run api/setup_local.sh first"; exit 1; }
uvicorn app.main:app --reload --port 8000 &
API_PID=$!
cd ..

# Wait for API to be ready
echo "⏳ Waiting for API to start..."
sleep 3

# Start Frontend
echo "🎨 Starting Frontend..."
cd web
npm run dev &
WEB_PID=$!
cd ..

echo ""
echo "✅ Both services starting!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔧 API:      http://localhost:8000"
echo "  📚 API Docs: http://localhost:8000/docs"
echo "  🎨 Frontend: http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for processes
wait
```

### 4.2 Windows Combined Script

**File:** `start_local.bat` (in project root)

```batch
@echo off
echo 🚀 Starting PCT FinCEN locally...
echo.

REM Start API in new window
echo 🔧 Starting API server...
start "PCT API" cmd /k "cd api && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

REM Wait for API
timeout /t 3 /nobreak > nul

REM Start Frontend in new window
echo 🎨 Starting Frontend...
start "PCT Frontend" cmd /k "cd web && npm run dev"

echo.
echo ✅ Both services starting in separate windows!
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   🔧 API:      http://localhost:8000
echo   📚 API Docs: http://localhost:8000/docs
echo   🎨 Frontend: http://localhost:3000
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Close the terminal windows to stop the services
```

---

## PART 5: Docker Compose (Optional - Full Parity)

For complete parity with staging (using Postgres):

**File:** `docker-compose.yml` (in project root)

```yaml
version: '3.8'

services:
  # PostgreSQL Database (matches Render)
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: pct_fincen_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # API Service
  api:
    build: ./api
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/pct_fincen_dev
      ENVIRONMENT: development
      DEMO_SECRET: local-dev-secret
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./api:/app
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  # Frontend Service
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:8000
      NEXT_PUBLIC_DEMO_MODE: "true"
    depends_on:
      - api
    volumes:
      - ./web:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
```

**Run with Docker:**
```bash
docker-compose up
```

---

## PART 6: Quick Reference Card

### First Time Setup

```bash
# 1. Setup API
cd api
chmod +x setup_local.sh
./setup_local.sh
python init_db.py

# 2. Setup Frontend
cd ../web
chmod +x setup_local.sh
./setup_local.sh

# 3. Start both
cd ..
chmod +x start_local.sh
./start_local.sh
```

### Daily Development

```bash
# From project root
./start_local.sh

# Or manually in two terminals:

# Terminal 1 - API
cd api && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd web && npm run dev
```

### Seed Demo Data

```bash
# After API is running
curl -X POST http://localhost:8000/demo/reset \
  -H "X-DEMO-SECRET: local-dev-secret"
```

### Test API Directly

```bash
# Check health
curl http://localhost:8000/health

# List submissions
curl http://localhost:8000/submission-requests

# View API docs
open http://localhost:8000/docs
```

---

## PART 7: Switching Between Environments

### Point Frontend to Local API
```bash
# web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Point Frontend to Staging API
```bash
# web/.env.local
NEXT_PUBLIC_API_BASE_URL=https://pct-fin-cen-staging.onrender.com
```

### Check Current Configuration
```bash
# In browser console on frontend
console.log(process.env.NEXT_PUBLIC_API_BASE_URL)
```

---

## PART 8: Troubleshooting

### API won't start
```bash
# Check if port is in use
lsof -i :8000
# Kill process using it
kill -9 <PID>
```

### Database errors
```bash
# Reset local database
cd api
rm local_dev.db
python init_db.py
```

### Frontend can't reach API
```bash
# Check API is running
curl http://localhost:8000/health

# Check .env.local points to right URL
cat web/.env.local

# Restart frontend after changing .env.local
```

### CORS errors locally
The API should allow localhost. If not, check `api/app/main.py`:
```python
allow_origins=[
    "http://localhost:3000",  # ← Must include this
    ...
]
```

---

## VERIFICATION CHECKLIST

After setup, verify:

- [ ] `http://localhost:8000/health` returns OK
- [ ] `http://localhost:8000/docs` shows Swagger UI
- [ ] `http://localhost:3000` loads frontend
- [ ] Submit form works (no CORS, no 422, no 500)
- [ ] Admin queue shows submissions
- [ ] Changes to API code reflect instantly (hot reload)
- [ ] Changes to Frontend code reflect instantly

---

## WORKFLOW

```
1. Make changes locally
2. Test locally (instant feedback)
3. Fix any issues
4. Repeat until working
5. Push to GitHub
6. Auto-deploy to Render/Vercel
7. Quick smoke test on staging
8. Done! ✅
```

This workflow means you only wait for Render/Vercel **once** per feature, not on every tiny fix.
