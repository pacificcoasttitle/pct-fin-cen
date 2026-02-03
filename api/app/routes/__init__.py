"""
API Routes.
"""
from app.routes.reports import router as reports_router
from app.routes.parties import router as parties_router
from app.routes.demo import router as demo_router
from app.routes.admin import router as admin_router
from app.routes.submission_requests import router as submission_requests_router
from app.routes.invoices import router as invoices_router
from app.routes.companies import router as companies_router
from app.routes.users import router as users_router
from app.routes.sidebar import router as sidebar_router
from app.routes.documents import router as documents_router
from app.routes.audit import router as audit_router
from app.routes.property import router as property_router
from app.routes.billing import router as billing_router
from app.routes.auth import router as auth_router

__all__ = [
    "reports_router",
    "parties_router",
    "demo_router",
    "admin_router",
    "submission_requests_router",
    "invoices_router",
    "companies_router",
    "users_router",
    "sidebar_router",
    "documents_router",
    "audit_router",
    "property_router",
    "billing_router",
    "auth_router",
]
