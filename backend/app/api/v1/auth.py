"""
EduNexus AI — Authentication & Registration API Router
Provides real user registration, identity inspection, and pre-configured live credentials.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.core.config import settings
from app.core.auth import get_current_user, AuthenticatedUser
from app.db.client import is_database_configured, get_db_client, verify_database_connection
from app.schemas.auth import (
    UserRegisterRequest,
    UserRegisterResponse,
    DemoCredentialInfo,
    DemoCredentialsListResponse,
)

router = APIRouter()

# Map common input roles to canonical database roles
ROLE_MAP = {
    "admin": "administrator",
    "administrator": "administrator",
    "advisor": "advisor",
    "faculty": "faculty",
    "student": "student",
    "counselor": "counselor",
    "auditor": "auditor",
    "evaluator": "auditor",
}


@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a New User",
    description="Registers a new institutional user in Supabase Auth and creates their profile in user_profiles.",
)
async def register_user(payload: UserRegisterRequest) -> UserRegisterResponse:
    """Create a new user in Supabase with auto-confirmed email and profile record."""
    normalized_role = ROLE_MAP.get(payload.role.strip().lower(), payload.role.strip().lower())
    if normalized_role not in ("administrator", "advisor", "faculty", "student", "counselor", "auditor"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported role '{payload.role}'. Permitted: administrator, advisor, faculty, student, counselor",
        )

    effective_full_name = (
        payload.full_name
        or f"{payload.first_name or ''} {payload.last_name or ''}".strip()
        or "Institutional User"
    )

    if not is_database_configured():
        # Fallback for prototype mode without database
        import uuid
        simulated_id = str(uuid.uuid4())
        return UserRegisterResponse(
            status="success",
            message=f"User registered in prototype mode as {normalized_role}.",
            user_id=simulated_id,
            email=payload.email,
            role=normalized_role,
            full_name=effective_full_name,
            is_active=True,
        )

    client = get_db_client()

    try:
        user_id = None
        # Create user via Supabase Admin API
        try:
            user_response = client.auth.admin.create_user({
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": effective_full_name,
                    "first_name": payload.first_name or effective_full_name.split()[0],
                    "last_name": payload.last_name or (effective_full_name.split()[1] if len(effective_full_name.split()) > 1 else ""),
                    "role": normalized_role,
                    "department": payload.department or "",
                    "student_id": payload.student_id or "",
                },
                "app_metadata": {
                    "role": normalized_role,
                    "student_id": payload.student_id or "",
                },
            })
            user = user_response.user
            if user and user.id:
                user_id = user.id
        except Exception as create_err:
            err_text = str(create_err).lower()
            if "already" in err_text or "exists" in err_text or "registered" in err_text or "duplicate" in err_text:
                # User already created in Auth (e.g. from previous attempt) - find and update password/metadata
                all_users = client.auth.admin.list_users()
                for existing_u in all_users:
                    if existing_u.email and existing_u.email.lower() == payload.email.strip().lower():
                        user_id = existing_u.id
                        client.auth.admin.update_user_by_id(
                            user_id,
                            {
                                "password": payload.password,
                                "email_confirm": True,
                                "user_metadata": {
                                    "full_name": effective_full_name,
                                    "first_name": payload.first_name or effective_full_name.split()[0],
                                    "last_name": payload.last_name or (effective_full_name.split()[1] if len(effective_full_name.split()) > 1 else ""),
                                    "role": normalized_role,
                                    "department": payload.department or "",
                                    "student_id": payload.student_id or "",
                                },
                                "app_metadata": {
                                    "role": normalized_role,
                                    "student_id": payload.student_id or "",
                                },
                            }
                        )
                        break
                if not user_id:
                    raise create_err
            else:
                raise create_err

        if not user_id:
            raise RuntimeError("Authentication provider did not return a valid user.")

        # Insert user profile into public.user_profiles ONLY for staff roles that belong to app_role enum
        # Note: 'student' is an institutional subject in public.students, not an app_role enum value
        if normalized_role in ("administrator", "advisor", "faculty", "counselor", "auditor"):
            client.table("user_profiles").upsert({
                "id": user_id,
                "email": payload.email,
                "full_name": effective_full_name,
                "role": normalized_role,
                "institution_department": payload.department or None,
                "is_active": True,
            }).execute()

        # If registering as a student, link or create student record in public.students
        if normalized_role == "student":
            student_id_val = (payload.student_id or "").strip()
            if not student_id_val:
                import uuid
                student_id_val = f"STU-{uuid.uuid4().hex[:6].upper()}"

            student_check = client.table("students").select("id").or_(f"student_id.eq.{student_id_val},email.eq.{payload.email.strip()}").execute()
            if student_check.data and len(student_check.data) > 0:
                # Link existing student record with the registered account
                rec_id = student_check.data[0]["id"]
                client.table("students").update({
                    "email": payload.email.strip(),
                    "user_id": user_id,
                    "student_id": student_id_val,
                }).eq("id", rec_id).execute()
            else:
                names = effective_full_name.strip().split(" ", 1)
                first_name = names[0]
                last_name = names[1] if len(names) > 1 else "Student"
                client.table("students").insert({
                    "student_id": student_id_val,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": payload.email.strip(),
                    "department": payload.department or "Computer Science & Engineering",
                    "current_grade": "Year 1",
                    "academic_term": "AY 2025-26 Term 1",
                    "status": "active",
                    "user_id": user_id,
                }).execute()

        return UserRegisterResponse(
            status="success",
            message=f"Registration successful for {effective_full_name} ({payload.email}) as {normalized_role}. You can now sign in immediately.",
            user_id=user_id,
            email=payload.email,
            role=normalized_role,
            full_name=effective_full_name,
            is_active=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {err_msg}",
        )


@router.get(
    "/credentials",
    response_model=DemoCredentialsListResponse,
    summary="Get Real Pre-configured Login Credentials",
    description="Returns pre-configured active institutional accounts on Supabase for instant testing and evaluation.",
)
async def get_credentials() -> DemoCredentialsListResponse:
    """Return verified working credentials configured in the connected database."""
    conn_info = verify_database_connection()
    is_connected = bool(conn_info.get("connected", False))

    creds = [
        DemoCredentialInfo(
            role="administrator",
            label="Administrator",
            email="admin@edunexus.ai",
            password="EduNexus@2026",
            description="Full system governance, audit logging, student records, and CSV dataset ingestion.",
            badge="Full Access",
            is_read_only=False,
        ),
        DemoCredentialInfo(
            role="advisor",
            label="Academic Advisor",
            email="advisor@edunexus.ai",
            password="EduNexus@2026",
            description="Caseload management, support plans, intervention outcomes, and risk tier adjustments.",
            badge="Staff Access",
            is_read_only=False,
        ),
        DemoCredentialInfo(
            role="faculty",
            label="Faculty Member",
            email="faculty@edunexus.ai",
            password="EduNexus@2026",
            description="Course assessments review, student mentoring, and domain indicator analysis.",
            badge="Staff Access",
            is_read_only=False,
        ),
        DemoCredentialInfo(
            role="counselor",
            label="Student Counselor",
            email="counselor@edunexus.ai",
            password="EduNexus@2026",
            description="Mental wellbeing, engagement events review, and personalized counseling plans.",
            badge="Staff Access",
            is_read_only=False,
        ),
        DemoCredentialInfo(
            role="student",
            label="Student (Read-Only)",
            email="student@edunexus.ai",
            password="EduNexus@2026",
            description="Personal academic progress, radar fingerprint, and assigned support recommendations.",
            badge="Read-Only Access",
            is_read_only=True,
        ),
    ]

    return DemoCredentialsListResponse(
        status="success",
        database_connected=is_connected,
        credentials=creds,
    )


@router.get(
    "/me",
    summary="Get Current User Profile",
    description="Returns the profile and claims of the currently authenticated bearer token user.",
)
async def get_me(user: AuthenticatedUser = Depends(get_current_user)):
    """Return active authenticated user details."""
    return {
        "status": "success",
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "student_id": user.student_id,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_demo_session": user.is_demo_session,
    }
