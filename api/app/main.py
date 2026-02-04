"""
PCT FinCEN API - FastAPI Backend
"""
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db, SessionLocal
from app.routes import reports_router, parties_router, demo_router, admin_router, submission_requests_router, invoices_router, companies_router, users_router, sidebar_router, documents_router, audit_router, property_router, billing_router, auth_router, inquiries_router

settings = get_settings()


def auto_seed_if_empty():
    """
    Auto-seed demo data if the users table is empty.
    Only runs in staging environment.
    
    This ensures demo accounts exist on first deploy without manual intervention.
    """
    import traceback
    
    if settings.ENVIRONMENT != "staging":
        print(f"⏭️  Auto-seed skipped: ENVIRONMENT={settings.ENVIRONMENT} (not staging)")
        return
    
    print("🔍 Checking if auto-seed is needed...")
    
    db = SessionLocal()
    try:
        # Check if users table is empty
        from app.models.user import User
        user_count = db.query(User).count()
        print(f"   Current user count: {user_count}")
        
        if user_count == 0:
            print("🌱 Users table is empty — auto-seeding demo data...")
            from app.services.demo_seed import seed_demo_data
            result = seed_demo_data(db)
            
            # Verify it worked
            new_count = db.query(User).count()
            print(f"✅ Auto-seed complete!")
            print(f"   - Users created: {new_count}")
            print(f"   - Requests: {result.get('requests_created', 0)}")
            print(f"   - Reports: {result.get('reports_created', 0)}")
        else:
            print(f"✅ Database has {user_count} users — skipping auto-seed")
    except Exception as e:
        print(f"❌ Auto-seed FAILED: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        try:
            db.rollback()
        except:
            pass
    finally:
        try:
            db.close()
        except:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup/shutdown events.
    """
    # Startup
    print(f"🚀 Starting PCT FinCEN API (environment: {settings.ENVIRONMENT})")
    auto_seed_if_empty()
    
    yield
    
    # Shutdown
    print("👋 Shutting down PCT FinCEN API")


app = FastAPI(
    title="PCT FinCEN API",
    description="Backend API for Pacific Coast Title FinCEN BOIR Questionnaire",
    version=settings.APP_VERSION,
    lifespan=lifespan,
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
app.include_router(property_router)
app.include_router(billing_router)
app.include_router(auth_router)
app.include_router(inquiries_router)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "PCT FinCEN API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint for monitoring and load balancers."""
    # Quick check of user count for debugging
    try:
        from app.models.user import User
        user_count = db.query(User).count()
    except Exception:
        user_count = -1  # Error querying
    
    return {
        "status": "ok",
        "users": user_count,
        "environment": settings.ENVIRONMENT,
    }


@app.post("/seed-now")
async def seed_now(db: Session = Depends(get_db)):
    """
    Emergency seed endpoint - creates demo users if table is empty.
    
    No authentication required (safe because it only creates if empty).
    This is a temporary endpoint to bootstrap staging environments.
    """
    from app.models.user import User
    from app.models.company import Company
    
    user_count = db.query(User).count()
    
    if user_count > 0:
        return {
            "seeded": False,
            "message": f"Database already has {user_count} users. No action taken.",
            "user_count": user_count,
        }
    
    # Run the seed
    try:
        from app.services.demo_seed import seed_demo_data
        result = seed_demo_data(db)
        
        new_user_count = db.query(User).count()
        company_count = db.query(Company).count()
        
        return {
            "seeded": True,
            "message": "Demo data created successfully!",
            "user_count": new_user_count,
            "company_count": company_count,
            "details": {
                "requests_created": result.get("requests_created", 0),
                "reports_created": result.get("reports_created", 0),
            }
        }
    except Exception as e:
        import traceback
        return {
            "seeded": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


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
