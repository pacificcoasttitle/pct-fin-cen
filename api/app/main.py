"""
PCT FinCEN API - FastAPI Backend
"""
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.routes import reports_router, parties_router, demo_router, admin_router, submission_requests_router, invoices_router, companies_router, users_router, sidebar_router, documents_router, audit_router

settings = get_settings()

app = FastAPI(
    title="PCT FinCEN API",
    description="Backend API for Pacific Coast Title FinCEN BOIR Questionnaire",
    version=settings.APP_VERSION,
)

# Configure CORS
# Allow specific origins + all Vercel preview deployments via regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # All Vercel deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(reports_router)
app.include_router(parties_router)
app.include_router(demo_router)
app.include_router(admin_router)
app.include_router(submission_requests_router)
app.include_router(invoices_router)
app.include_router(companies_router)
app.include_router(users_router)
app.include_router(sidebar_router)
app.include_router(documents_router)
app.include_router(audit_router)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "PCT FinCEN API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {"status": "ok"}


@app.get("/version")
async def version():
    """Version endpoint returning build/version information."""
    return {
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/db-check")
async def db_check(db: Session = Depends(get_db)):
    """
    Database connectivity check (staging/development only).
    
    Runs a simple SELECT 1 to verify database connectivity.
    Returns error details in non-production environments.
    """
    # Only allow in non-production environments
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403, 
            detail="Endpoint disabled in production"
        )
    
    try:
        # Simple connectivity check
        result = db.execute(text("SELECT 1 as check_value"))
        row = result.fetchone()
        
        # Get database info (safe query - handle SQLite which doesn't have version())
        db_version = "unknown"
        try:
            version_result = db.execute(text("SELECT version()")).fetchone()
            db_version = version_result[0] if version_result else "unknown"
        except Exception:
            # SQLite doesn't support version() - use sqlite_version() instead
            try:
                version_result = db.execute(text("SELECT sqlite_version()")).fetchone()
                db_version = f"SQLite {version_result[0]}" if version_result else "SQLite"
            except Exception:
                db_version = "unknown"
        
        return {
            "status": "ok",
            "database": "connected",
            "check_value": row[0] if row else None,
            "db_version": db_version,
            "environment": settings.ENVIRONMENT,
        }
    except Exception as e:
        # Return error details in staging
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e),
            "environment": settings.ENVIRONMENT,
        }
