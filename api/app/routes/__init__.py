"""
API Routes.
"""
from app.routes.reports import router as reports_router
from app.routes.parties import router as parties_router
from app.routes.demo import router as demo_router
from app.routes.admin import router as admin_router
from app.routes.submission_requests import router as submission_requests_router
from app.routes.invoices import router as invoices_router

__all__ = [
    "reports_router",
    "parties_router",
    "demo_router",
    "admin_router",
    "submission_requests_router",
    "invoices_router",
]
