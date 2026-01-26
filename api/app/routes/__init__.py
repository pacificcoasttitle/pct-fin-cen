"""
API Routes.
"""
from app.routes.reports import router as reports_router
from app.routes.parties import router as parties_router

__all__ = [
    "reports_router",
    "parties_router",
]
