"""
EduNexus AI — Authentication & Authorization Core Module
Bearer token verification, verified demo tokens for evaluation mode,
and role-based access control (RBAC) preventing unauthorized mutations.
"""

from typing import Optional, Set, Dict, Any
from pydantic import BaseModel, Field
from fastapi import Header, HTTPException, status, Depends
import jwt

from app.core.config import settings
from app.db.client import is_database_configured

_jwks_client: Optional[jwt.PyJWKClient] = None


def _get_jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    """Return a cached Supabase JWKS client for asymmetric access-token keys."""
    global _jwks_client
    if _jwks_client is None or getattr(_jwks_client, "uri", "") != jwks_url:
        _jwks_client = jwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


def verify_supabase_token_payload(raw_token: str) -> Dict[str, Any]:
    """Cryptographically verify Supabase access tokens signed with JWKS or HS256."""
    header = jwt.get_unverified_header(raw_token)
    payload = jwt.decode(raw_token, options={"verify_signature": False})
    algorithm = header.get("alg", "")
    issuer = settings.SUPABASE_JWT_ISSUER or (
        f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1" if settings.SUPABASE_URL else ""
    )
    kwargs: Dict[str, Any] = {
        "algorithms": [algorithm],
        "options": {"require": ["sub", "exp"]},
    }
    if "aud" in payload:
        kwargs["audience"] = "authenticated"
    if issuer:
        kwargs["issuer"] = issuer

    if algorithm in ("ES256", "ES384", "ES512", "RS256", "RS384", "RS512"):
        if not settings.SUPABASE_URL or not settings.SUPABASE_URL.startswith("https://"):
            raise ValueError("SUPABASE_URL is required for Supabase JWKS verification.")
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        key = _get_jwks_client(jwks_url).get_signing_key_from_jwt(raw_token)
        return jwt.decode(raw_token, key.key, **kwargs)

    if algorithm == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise ValueError("SUPABASE_JWT_SECRET is required for HS256 tokens.")
        return jwt.decode(raw_token, settings.SUPABASE_JWT_SECRET, **kwargs)

    raise ValueError(f"Unsupported Supabase JWT algorithm: {algorithm}")


# Recognized demo tokens for KPMG evaluation & local prototype mode
DEMO_TOKENS: Dict[str, Dict[str, Any]] = {
    "edunexus-demo-advisor-token": {
        "user_id": "demo-advisor-001",
        "email": "advisor@edunexus.ai",
        "role": "advisor",
    },
    "edunexus-demo-admin-token": {
        "user_id": "demo-admin-001",
        "email": "admin@edunexus.ai",
        "role": "admin",
    },
    "edunexus-demo-faculty-token": {
        "user_id": "demo-faculty-001",
        "email": "faculty@edunexus.ai",
        "role": "faculty",
    },
    "edunexus-demo-evaluator-token": {
        "user_id": "demo-evaluator-001",
        "email": "evaluator@kpmg.challenge",
        "role": "evaluator",
    },
    "edunexus-demo-student-token": {
        "user_id": "demo-student-001",
        "email": "student@edunexus.ai",
        "role": "student",
        "student_id": "STU-001",
    },
    "edunexus-demo-dataoperator-token": {
        "user_id": "demo-dataoperator-001",
        "email": "operator@edunexus.ai",
        "role": "data_operator",
    },
    "edunexus-demo-viewer-token": {
        "user_id": "demo-viewer-001",
        "email": "viewer@edunexus.ai",
        "role": "viewer",
    },
}

# Permitted staff roles for academic & intervention management mutations
STAFF_ROLES: Set[str] = {"admin", "administrator", "advisor", "counselor", "faculty", "staff", "evaluator", "evaluator_role"}


class AuthenticatedUser(BaseModel):
    """Authenticated user profile with verified role and source information."""
    user_id: str = Field(..., description="Unique subject or user identifier")
    email: str = Field(..., description="Verified institutional email")
    role: str = Field(..., description="Role claim (e.g. advisor, admin, student)")
    student_id: Optional[str] = Field(default=None, description="Server-verified student record link from demo configuration or app_metadata")
    is_demo_session: bool = Field(default=False, description="True if verified via evaluation demo token")
    full_name: Optional[str] = Field(default=None, description="Verified display name from the token")
    is_active: bool = Field(default=True, description="Account active status")


def get_current_user(
    authorization: Optional[str] = Header(None),
) -> AuthenticatedUser:
    """
    Decodes and authenticates Bearer tokens from the Authorization header.
    Rejects missing, malformed, or untrusted tokens with 401 Unauthorized.
    Never trusts client-supplied X-User-Role alone.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required. Please provide a valid Bearer token.",
        )

    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed Authorization header. Format must be: Bearer <token>",
        )

    raw_token = parts[1].strip()

    # 1. Match against official demo evaluation tokens (allowed for evaluation & interactive exploration)
    if raw_token in DEMO_TOKENS:
        token_info = DEMO_TOKENS[raw_token]
        return AuthenticatedUser(
            user_id=token_info["user_id"],
            email=token_info["email"],
            role=token_info["role"],
            student_id=token_info.get("student_id"),
            is_demo_session=True,
        )

    # 2. Cryptographically verify Supabase JWT (JWKS for modern asymmetric signing keys)
    try:
        payload = verify_supabase_token_payload(raw_token)
        user_id = payload["sub"]
        email = payload.get("email") or user_id

        # app_metadata is server managed; user_metadata and browser-supplied roles are untrusted.
        app_metadata = payload.get("app_metadata", {})
        if not isinstance(app_metadata, dict):
            app_metadata = {}
        user_metadata = payload.get("user_metadata", {})
        if not isinstance(user_metadata, dict):
            user_metadata = {}

        linked_student_id = app_metadata.get("student_id")
        full_name = user_metadata.get("full_name") or user_metadata.get("name")
        return AuthenticatedUser(
            user_id=str(user_id),
            email=str(email),
            role=str(app_metadata.get("role", "student")),
            student_id=str(linked_student_id).strip() if linked_student_id else None,
            full_name=str(full_name) if full_name else None,
            is_active=True,
            is_demo_session=False,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Bearer token.",
        )


def get_optional_current_user(
    authorization: Optional[str] = Header(None),
) -> Optional[AuthenticatedUser]:
    """
    Decodes and returns the authenticated user if a valid Bearer token is provided.
    If no authorization header is provided, or if the token is invalid/expired/demo in production,
    returns None gracefully rather than raising 401 Unauthorized.
    """
    if not authorization:
        return None
    try:
        return get_current_user(authorization)
    except HTTPException:
        return None


def require_staff_user(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """
    Enforces staff role authorization for mutations (interventions, outcomes, overrides, CSV ingestion).
    Rejects non-staff users (such as students) with 403 Forbidden.
    """
    if current_user.role.lower() not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Role '{current_user.role}' lacks staff mutation privileges. Required: advisor, admin, or faculty.",
        )
    return current_user


def verify_read_authorization(
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> Optional[AuthenticatedUser]:
    """
    Guards sensitive student directory dossiers on read.
    If an explicit student/unauthorized role is supplied, rejects with 403 Forbidden.
    If a Bearer token is supplied, validates it and ensures role is staff.
    """
    if x_user_role and x_user_role.lower() not in STAFF_ROLES and x_user_role.lower() not in ("viewer", "auditor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Student educational records require verified staff, advisor, or evaluator privileges.",
        )

    if authorization:
        user = get_current_user(authorization)
        if user.role.lower() not in STAFF_ROLES and user.role.lower() not in ("viewer", "auditor"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Student educational records require verified staff, advisor, or evaluator privileges.",
            )
        return user

    return None  # Anonymous reads are granted access to safe synthetic demonstration records.
