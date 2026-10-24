"""
EduNexus AI — Main FastAPI Application
Student Success & Journey Intelligence Platform API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import setup_exception_handlers
from app.schemas.health import HealthResponse, DatabaseHealthResponse
from app.db.client import verify_database_connection
from app.api import api_v1_router


def create_application() -> FastAPI:
    """Application factory for FastAPI."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Configure CORS - allows local development origins, Render, and Vercel frontends
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_origin_regex=r"^https://.*(\.onrender\.com|\.vercel\.app)$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register global uniform error handlers
    setup_exception_handlers(app)

    # Root health check endpoint (GET /health)
    @app.get(
        "/health",
        response_model=HealthResponse,
        tags=["System"],
        summary="Service Health Check",
        description="Verify service liveness, current version, and environment.",
    )
    async def health_check() -> HealthResponse:
        return HealthResponse(
            status="healthy",
            service=settings.PROJECT_NAME,
            version=settings.VERSION,
            environment=settings.ENVIRONMENT,
        )

    # Root database probe endpoint (GET /health/db)
    @app.get(
        "/health/db",
        response_model=DatabaseHealthResponse,
        tags=["System"],
        summary="Database Health Check",
        description="Verify Supabase PostgreSQL connection status and latency.",
    )
    async def database_health_check() -> DatabaseHealthResponse:
        info = verify_database_connection()
        is_connected = bool(info.get("connected", False))
        return DatabaseHealthResponse(
            status="healthy" if is_connected else ("degraded" if info.get("configured") else "unconfigured"),
            database="Supabase PostgreSQL",
            configured=bool(info.get("configured", False)),
            connected=is_connected,
            verified=bool(info.get("verified", False)),
            latency_ms=info.get("latency_ms"),
            total_students_detected=info.get("total_students_detected"),
            message=str(info.get("message", "Database check completed")),
            environment=settings.ENVIRONMENT,
        )

    # Root index endpoint
    @app.get("/", tags=["System"], summary="API Root")
    async def root_index():
        return {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "operational",
            "docs": "/docs",
            "health": "/health",
        }

    # Mount API v1 router
    app.include_router(api_v1_router, prefix=settings.API_V1_STR)

    return app


app = create_application()
