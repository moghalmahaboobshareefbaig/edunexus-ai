"""
EduNexus AI — API v1 Router Aggregator
"""

from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.students import router as students_router
from app.api.v1.interventions import router as interventions_router
from app.api.v1.csv import router as csv_router

api_v1_router = APIRouter()

# Register health check under v1 as well
api_v1_router.include_router(health_router, prefix="", tags=["System"])

# Mount Authentication & Registration Routes
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication & Registration"])

# Mount Stage 3 Core Analytics & Dashboard Routes
api_v1_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_v1_router.include_router(students_router, prefix="/students", tags=["Students"])
api_v1_router.include_router(interventions_router, prefix="/interventions", tags=["Interventions"])
api_v1_router.include_router(csv_router, prefix="/csv", tags=["CSV Ingestion & Demo Data"])
