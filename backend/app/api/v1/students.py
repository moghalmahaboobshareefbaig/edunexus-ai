"""
EduNexus AI — Students API Router
Directory search, multi-factor filtering, sorting, pagination, authorization,
and comprehensive chronological Student Journey profiles.
"""

from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Header, status, Depends
from pydantic import BaseModel, Field, field_validator

from app.schemas.student import (
    StudentCreate,
    StudentResponse,
    StudentInDB,
    StudentJourneyProfileResponse,
    JourneyTimelineEvent,
    MissingDataNotice,
)
from app.schemas.success_score import (
    StudentComprehensiveDossier,
    StudentSuccessScoreResponse,
    IndependentRiskSignal,
    StudentSegmentProfile,
)
from app.services.database_service import database_service
from app.services.dashboard_service import dashboard_service
from app.services.risk_engine import (
    risk_engine,
    RiskExplanationResponse,
    HumanOverrideRecord,
)
from app.services.success_score_engine import success_score_engine
from app.services.dual_risk_engine import dual_risk_engine
from app.services.segmentation_engine import segmentation_engine
from app.core.risk_config import default_risk_config
from app.core.auth import (
    AuthenticatedUser,
    get_current_user,
    require_staff_user,
    verify_read_authorization as verify_staff_authorization,
    STAFF_ROLES,
)
from app.db.client import is_database_configured

router = APIRouter()

# Realistic fictional departments mapped to student cohorts
DEPARTMENTS = [
    "Computer Science & Engineering",
    "Electronics & Communication",
    "Commerce & Economics",
    "Mechanical Engineering",
    "Civil Engineering",
]


class StudentListEnvelope(BaseModel):
    students: List[StudentResponse]
    total: int
    page: int
    page_size: int
    departments: List[str]
    semesters: List[str]


from app.services.student_analytics_service import _compute_student_metrics



@router.get(
    "/me/dashboard",
    summary="Get the authenticated student's own dashboard",
    description="Returns only the verified student's own academic and support summary. Students cannot select another student record.",
)
async def get_my_student_dashboard(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return an intentionally narrow, student-owned view of the student's records."""
    if current_user.role.lower() != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This dashboard is available only to student accounts.",
        )

    data = dashboard_service._load_synthetic_data()
    students = data.get("students", [])
    linked_id = (current_user.student_id or "").strip()

    # Only a server-managed app_metadata link or server-side demo-token mapping
    # can select a record. Do not guess from email or accept a client-supplied ID.
    student = None
    if linked_id:
        student = next(
            (
                row for row in students
                if linked_id in (str(row.get("id", "")), str(row.get("student_id", "")))
            ),
            None,
        )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No student record is linked to this account. Ask your institution "
                "to link your verified login to a student record."
            ),
        )

    student_uuid = str(student.get("id", ""))
    student_code = str(student.get("student_id", ""))
    owned_ids = {student_uuid, student_code}

    def own_rows(table: str) -> List[Dict[str, Any]]:
        return [
            row for row in data.get(table, [])
            if str(row.get("student_id", "")) in owned_ids
        ]

    attendance = own_rows("attendance")
    assessments = own_rows("assessments")
    engagements = own_rows("engagement_events")
    interventions = own_rows("interventions")
    # The in-memory supplemental demo plans are also filtered to this student.
    interventions.extend(
        row for row in dashboard_service._demo_interventions
        if str(row.get("student_id", "")) in owned_ids
    )
    placements = own_rows("placement_records")
    skills = own_rows("skills_records")
    feedback = own_rows("feedback_records")
    lms = own_rows("lms_activity_records")

    def latest(rows: List[Dict[str, Any]], date_key: str) -> Dict[str, Any]:
        if not rows:
            return {}
        return max(
            rows,
            key=lambda row: (str(row.get(date_key, "")), str(row.get("updated_at", ""))),
        )

    placement = latest(placements, "evaluated_at")
    skill = latest(skills, "last_assessed_date")
    feedback_record = latest(feedback, "recorded_at")
    lms_record = latest(lms, "recorded_at")

    metrics = _compute_student_metrics(
        student,
        {student_uuid: attendance},
        {student_uuid: assessments},
        {student_uuid: engagements},
        {student_uuid: interventions},
        0,
        {student_uuid: placement} if placement else {},
        {student_uuid: skill} if skill else {},
        {student_uuid: feedback_record} if feedback_record else {},
        {student_uuid: lms_record} if lms_record else {},
    )
    success_profile = metrics.get("success_profile") or {}
    domain_breakdowns = success_profile.get("domain_breakdowns") or []

    recent_assessments = []
    for row in sorted(
        assessments,
        key=lambda item: str(item.get("assessment_date", item.get("date", ""))),
        reverse=True,
    )[:8]:
        max_score = float(row.get("max_score") or 0)
        score = float(row.get("score") or 0)
        recent_assessments.append({
            "subject": row.get("subject", "Assessment"),
            "assessment_type": row.get("assessment_type", "Assessment"),
            "score": score,
            "max_score": max_score,
            "percentage": round(score / max_score * 100, 1) if max_score > 0 else None,
            "date": row.get("assessment_date", row.get("date")),
        })

    recent_attendance = [
        {
            "date": row.get("session_date", row.get("date")),
            "status": row.get("status", "not recorded"),
        }
        for row in sorted(
            attendance,
            key=lambda item: str(item.get("session_date", item.get("date", ""))),
            reverse=True,
        )[:8]
    ]

    support_plans = [
        {
            "id": str(row.get("id", "")),
            "title": row.get("title") or row.get("intervention_type") or "Student support plan",
            "status": row.get("status", "planned"),
            "priority": row.get("priority", "medium"),
            "start_date": row.get("start_date"),
            "follow_up_date": row.get("follow_up_date"),
        }
        for row in sorted(
            interventions,
            key=lambda item: str(item.get("created_at", "")),
            reverse=True,
        )[:8]
    ]

    from app.db.client import is_database_configured

    # Intentionally return a limited, own-record projection. Do not expose
    # cohort summaries, other students, private notes, or staff-only workflows.
    return {
        "data_source": "Supabase PostgreSQL" if is_database_configured() else "Synthetic demo data",
        "student": {
            "student_id": student_code,
            "first_name": student.get("first_name", ""),
            "last_name": student.get("last_name", ""),
            "current_grade": student.get("current_grade"),
            "academic_term": student.get("academic_term"),
            "section": student.get("section"),
            "department": student.get("department") or "Not recorded",
            "status": student.get("status", "active"),
        },
        "metrics": {
            "attendance_rate": metrics.get("attendance_rate"),
            "average_score": metrics.get("average_score"),
            "latest_assessment_percentage": metrics.get("latest_assessment_percentage"),
            "trend": metrics.get("trend", "stable"),
            "review_status": metrics.get("review_status", "Awaiting data review"),
            "success_score": metrics.get("success_score"),
            "success_tier": metrics.get("success_tier"),
            "risk_tier": metrics.get("risk_tier"),
            "academic_risk_tier": metrics.get("academic_risk_tier"),
            "placement_risk_tier": metrics.get("placement_risk_tier"),
            "active_interventions_count": metrics.get("active_interventions_count", 0),
            "domain_coverage_pct": success_profile.get("data_coverage_pct", 0),
            "available_domains_count": success_profile.get("available_domains_count", 0),
            "missing_domains": success_profile.get("missing_domains", []),
            "segment_label": (metrics.get("segment_profile") or {}).get("segment_label"),
        },
        "domains": [
            {
                "name": row.get("domain", "unknown"),
                "score": row.get("raw_score"),
                "is_missing": row.get("is_missing", False),
                "normalized_weight": row.get("normalized_weight", 0),
            }
            for row in domain_breakdowns
        ],
        "recent_assessments": recent_assessments,
        "recent_attendance": recent_attendance,
        "support_plans": support_plans,
    }


@router.get(
    "",
    response_model=StudentListEnvelope,
    summary="List Students Directory",
    description="Search, filter by department, semester, and risk category, with sorting and pagination.",
)
async def list_students(
    search: Optional[str] = Query(None, description="Search by student code (e.g. STU-001) or full name"),
    department: Optional[str] = Query(None, description="Filter by academic department"),
    semester: Optional[str] = Query(None, description="Filter by semester or grade level"),
    risk_tier: Optional[str] = Query(None, description="Filter by risk tier: low, medium, high, critical"),
    segment: Optional[str] = Query(None, description="Filter by student segment: high_achiever_placement_ready, academic_star_career_at_risk, practical_star_exam_vulnerable, priority_holistic_support, steady_emerging_potential"),
    academic_risk: Optional[str] = Query(None),
    placement_risk: Optional[str] = Query(None),
    success_min: Optional[float] = Query(None, ge=0, le=100),
    success_max: Optional[float] = Query(None, ge=0, le=100),
    sort_by: Literal["name", "student_id", "attendance_rate", "average_score", "risk_score", "success_score"] = Query("risk_score", description="Sort field: name, student_id, attendance_rate, average_score, risk_score, success_score"),
    sort_dir: Literal["asc", "desc"] = Query("desc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=100, description="Items per page"),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> StudentListEnvelope:
    """Retrieve filtered, paginated students directory."""
    try:
        user = verify_staff_authorization(authorization, x_user_role)
    except HTTPException:
        user = None

    try:
        if user and user.role.lower() in STAFF_ROLES and is_database_configured():
            data = dashboard_service._load_synthetic_data()
        else:
            data = dashboard_service._load_pure_synthetic_data()
    except Exception:
        data = dashboard_service._load_pure_synthetic_data()
    raw_students: List[Dict[str, Any]] = data.get("students", [])
    attendance_records = data.get("attendance", [])
    assessment_records = data.get("assessments", [])
    engagement_records = data.get("engagement_events", [])
    all_intvs = list(data.get("interventions", [])) + dashboard_service._demo_interventions

    placement_records = data.get("placement_records", [])
    skills_records = data.get("skills_records", [])
    feedback_records = data.get("feedback_records", [])
    lms_records = data.get("lms_activity_records", [])

    # Index by student ID
    student_att: Dict[str, List[Dict[str, Any]]] = {}
    for att in attendance_records:
        student_att.setdefault(str(att.get("student_id")), []).append(att)

    student_ass: Dict[str, List[Dict[str, Any]]] = {}
    for ass in assessment_records:
        student_ass.setdefault(str(ass.get("student_id")), []).append(ass)

    student_eng: Dict[str, List[Dict[str, Any]]] = {}
    for eng in engagement_records:
        student_eng.setdefault(str(eng.get("student_id")), []).append(eng)

    student_intvs: Dict[str, List[Dict[str, Any]]] = {}
    for intv in all_intvs:
        student_intvs.setdefault(str(intv.get("student_id")), []).append(intv)

    student_placement = {str(p.get("student_id")): p for p in sorted(placement_records, key=lambda r: (str(r.get("evaluated_at", "")), str(r.get("updated_at", ""))))}
    student_skills = {str(sk.get("student_id")): sk for sk in sorted(skills_records, key=lambda r: (str(r.get("last_assessed_date", "")), str(r.get("updated_at", ""))))}
    student_feedback = {str(fb.get("student_id")): fb for fb in sorted(feedback_records, key=lambda r: (str(r.get("recorded_at", "")), str(r.get("updated_at", ""))))}
    student_lms = {str(lm.get("student_id")): lm for lm in sorted(lms_records, key=lambda r: (str(r.get("recorded_at", "")), str(r.get("updated_at", ""))))}

    all_semesters = sorted(list(set(s.get("academic_term", "AY 2025-26 Term 1") for s in raw_students)))
    available_segments = [
        "high_achiever_placement_ready",
        "academic_star_career_at_risk",
        "practical_star_exam_vulnerable",
        "priority_holistic_support",
        "steady_emerging_potential",
    ]

    computed_students: List[StudentResponse] = []
    for idx, s in enumerate(raw_students):
        metrics = _compute_student_metrics(
            s,
            student_att,
            student_ass,
            student_eng,
            student_intvs,
            idx,
            student_placement,
            student_skills,
            student_feedback,
            student_lms,
        )

        # Apply search filter
        if search:
            q = search.lower().strip()
            name_match = (
                q in s.get("first_name", "").lower()
                or q in s.get("last_name", "").lower()
                or q in f"{s.get('first_name', '')} {s.get('last_name', '')}".lower()
            )
            code_match = q in s.get("student_id", "").lower()
            if not name_match and not code_match:
                continue

        # Apply department filter
        if department and department != "all" and metrics["department"] != department:
            continue

        # Apply semester / grade filter
        if semester and semester != "all":
            sem_match = (
                semester.lower() in s.get("academic_term", "").lower()
                or semester.lower() in s.get("current_grade", "").lower()
            )
            if not sem_match:
                continue

        # Apply risk category filter (supports both moderate and medium aliases)
        if risk_tier and risk_tier != "all":
            filter_tier = "moderate" if risk_tier in ("moderate", "medium") else risk_tier
            student_tier = "moderate" if metrics["risk_tier"] in ("moderate", "medium") else metrics["risk_tier"]
            if student_tier != filter_tier:
                continue

        # Apply cohort segment filter
        if segment and segment != "all" and metrics["segment_id"] != segment:
            continue

        if academic_risk and academic_risk != "all" and metrics["academic_risk_tier"] != academic_risk:
            continue
        if placement_risk and placement_risk != "all" and metrics["placement_risk_tier"] != placement_risk:
            continue
        score = metrics["success_score"]
        if success_min is not None and (score is None or score < success_min):
            continue
        if success_max is not None and (score is None or score > success_max):
            continue
        s_data = {k: v for k, v in s.items() if k != "department"}
        resp_obj = StudentResponse(
            **s_data,
            department=metrics["department"],
            attendance_rate=metrics["attendance_rate"],
            average_score=metrics["average_score"],
            latest_assessment_percentage=metrics["latest_assessment_percentage"],
            trend=metrics["trend"],
            review_status=metrics["review_status"],
            risk_tier=metrics["risk_tier"],
            risk_score=metrics["risk_score"],
            active_interventions_count=metrics["active_interventions_count"],
            success_score=metrics["success_score"],
            success_tier=metrics["success_tier"],
            academic_risk_tier=metrics["academic_risk_tier"],
            placement_risk_tier=metrics["placement_risk_tier"],
            segment_id=metrics["segment_id"],
            segment_label=metrics["segment_label"],
            segment_badge_color=metrics["segment_badge_color"],
        )
        computed_students.append(resp_obj)

    # Sorting
    reverse = sort_dir.lower() == "desc"
    if sort_by == "name":
        computed_students.sort(key=lambda x: f"{x.first_name} {x.last_name}", reverse=reverse)
    elif sort_by == "student_id":
        computed_students.sort(key=lambda x: x.student_id, reverse=reverse)
    elif sort_by == "attendance_rate":
        computed_students.sort(key=lambda x: x.attendance_rate or 0.0, reverse=reverse)
    elif sort_by == "average_score":
        computed_students.sort(key=lambda x: x.average_score or 0.0, reverse=reverse)
    elif sort_by == "success_score":
        computed_students.sort(key=lambda x: x.success_score or 0.0, reverse=reverse)
    else:  # default risk_score
        computed_students.sort(key=lambda x: x.risk_score or 0.0, reverse=reverse)

    total = len(computed_students)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paged = computed_students[start_idx:end_idx]

    return StudentListEnvelope(
        students=paged,
        total=total,
        page=page,
        page_size=page_size,
        departments=sorted({s["department"] for s in raw_students if s.get("department")}),
        semesters=all_semesters,
        segments=available_segments,
    )



@router.get(
    "/{student_id}",
    response_model=StudentJourneyProfileResponse,
    summary="Get Student Journey Profile",
    description="Retrieve comprehensive student dossier with chronological attendance, assessments, interventions, timeline events, and transparent missing data notices.",
)
async def get_student_journey_profile(
    student_id: str,
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> StudentJourneyProfileResponse:
    """Retrieve full student journey dossier."""
    try:
        user = verify_staff_authorization(authorization, x_user_role)
    except HTTPException:
        user = None

    try:
        if user and user.role.lower() in STAFF_ROLES and is_database_configured():
            data = dashboard_service._load_synthetic_data()
        else:
            data = dashboard_service._load_pure_synthetic_data()
    except Exception:
        data = dashboard_service._load_pure_synthetic_data()
    raw_students: List[Dict[str, Any]] = data.get("students", [])

    match = next(
        (s for idx, s in enumerate(raw_students) if str(s.get("id")) == student_id or s.get("student_id") == student_id),
        None,
    )
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record '{student_id}' does not exist in the institutional directory.",
        )

    matched_id = str(match.get("id"))
    student_idx = next((i for i, s in enumerate(raw_students) if str(s.get("id")) == matched_id), 0)

    # Gather source records
    attendance = [a for a in data.get("attendance", []) if str(a.get("student_id")) == matched_id]
    assessments = [a for a in data.get("assessments", []) if str(a.get("student_id")) == matched_id]
    engagements = [e for e in data.get("engagement_events", []) if str(e.get("student_id")) == matched_id]
    all_intvs = list(data.get("interventions", [])) + dashboard_service._demo_interventions
    interventions = [i for i in all_intvs if str(i.get("student_id")) == matched_id]

    placement_rec = next((r for r in sorted(data.get("placement_records", []), key=lambda r: (str(r.get("evaluated_at", "")), str(r.get("updated_at", ""))), reverse=True) if str(r.get("student_id")) == matched_id), None)
    skills_rec = next((r for r in sorted(data.get("skills_records", []), key=lambda r: (str(r.get("last_assessed_date", "")), str(r.get("updated_at", ""))), reverse=True) if str(r.get("student_id")) == matched_id), None)
    feedback_rec = next((r for r in sorted(data.get("feedback_records", []), key=lambda r: (str(r.get("recorded_at", "")), str(r.get("updated_at", ""))), reverse=True) if str(r.get("student_id")) == matched_id), None)
    lms_rec = next((r for r in sorted(data.get("lms_activity_records", []), key=lambda r: (str(r.get("recorded_at", "")), str(r.get("updated_at", ""))), reverse=True) if str(r.get("student_id")) == matched_id), None)

    # Metrics
    metrics = _compute_student_metrics(
        match,
        {matched_id: attendance},
        {matched_id: assessments},
        {matched_id: engagements},
        {matched_id: interventions},
        student_idx,
        {matched_id: placement_rec} if placement_rec else None,
        {matched_id: skills_rec} if skills_rec else None,
        {matched_id: feedback_rec} if feedback_rec else None,
        {matched_id: lms_rec} if lms_rec else None,
    )

    from app.services.history_service import build_history
    timeline_events, metrics_trend = build_history(match, attendance, assessments, engagements, interventions,
        [r for r in (placement_rec, skills_rec, feedback_rec, lms_rec) if r])
    missing_notices = [MissingDataNotice(category=domain.title(), metric=domain, status="Not recorded",
        message="No usable records for this domain; performance is unknown.",
        impact_on_scoring="Excluded from Success Score; available weights are rescaled.")
        for domain in metrics["success_profile"]["missing_domains"]]

    override = risk_engine._overrides_store.get(matched_id)
    effective_risk = (
        override.override_tier
        if (override and override.is_overridden and override.override_tier)
        else metrics["risk_tier"]
    )

    return StudentJourneyProfileResponse(
        student=StudentInDB(**match),
        department=metrics["department"],
        attendance_rate=metrics["attendance_rate"],
        average_score=metrics["average_score"],
        latest_assessment_percentage=metrics["latest_assessment_percentage"],
        trend=metrics["trend"],
        review_status=metrics["review_status"],
        risk_profile={**metrics["baseline_profile"], "overall_risk": effective_risk,
            "effective_tier": effective_risk, "baseline_tier": metrics["baseline_profile"]["support_priority_tier"],
            "risk_score": metrics["risk_score"], "is_overridden": bool(override and override.is_overridden),
            "requires_review": metrics["baseline_profile"]["requires_human_review"],
            "disclaimer": metrics["baseline_profile"]["decision_support_disclaimer"],
            "factors": [{"factor": f["factor_name"], "value": f["sub_metric_score"], "weight": f["weight"], "contribution": f["contribution_points"]} for f in metrics["baseline_profile"]["contributing_factors"]]},
        missing_data_notices=missing_notices,
        recent_attendance=attendance[:30],
        recent_assessments=assessments[:25],
        recent_engagements=engagements[:25],
        interventions=interventions,
        timeline_events=timeline_events,
        metrics_trend=metrics_trend,
        success_profile=metrics["success_profile"],
        academic_risk_profile=metrics["academic_risk_profile"],
        placement_risk_profile=metrics["placement_risk_profile"],
        segment_profile=metrics["segment_profile"],
        placement_details=metrics["placement_details"],
        skills_details=metrics["skills_details"],
        feedback_details=metrics["feedback_details"],
        lms_details=metrics["lms_details"],
    )


@router.get(
    "/{student_id}/comprehensive-dossier",
    response_model=StudentComprehensiveDossier,
    summary="Get 7-Domain Comprehensive Student Dossier",
    description="Retrieve unified KPMG 7-domain student dossier synthesizing Student Success Score, Academic Risk, Placement Risk, and Strategic Cohort Segment.",
)
async def get_student_comprehensive_dossier(
    student_id: str,
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> StudentComprehensiveDossier:
    """Retrieve 7-domain comprehensive dossier with success score, dual risks, and segment profile."""
    verify_staff_authorization(authorization, x_user_role)
    profile = await get_student_journey_profile(student_id, authorization, x_user_role)

    return StudentComprehensiveDossier(
        student_id=profile.student.student_id,
        full_name=f"{profile.student.first_name} {profile.student.last_name}",
        department=profile.department,
        current_term=profile.student.academic_term,
        success_score_profile=StudentSuccessScoreResponse(**(profile.success_profile or {})),
        academic_risk=IndependentRiskSignal(**(profile.academic_risk_profile or {})),
        placement_risk=IndependentRiskSignal(**(profile.placement_risk_profile or {})),
        segment=StudentSegmentProfile(**(profile.segment_profile or {})),
        ethical_disclaimer="Ethical AI Notice: Holistic campus decision-support index. Empirical indicators do not infer individual causal determinations.",
    )



@router.get(
    "/{student_id}/journey",
    response_model=List[JourneyTimelineEvent],
    summary="Get Student Journey Timeline Events",
    description="Retrieve only the chronological journey events stream for a student.",
)
async def get_student_journey_timeline(
    student_id: str,
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> List[JourneyTimelineEvent]:
    """Retrieve chronological journey timeline."""
    profile = await get_student_journey_profile(student_id, authorization, x_user_role)
    return profile.timeline_events


class RiskOverrideRequest(BaseModel):
    override_tier: Literal["low", "moderate", "high", "critical"]
    reason: str = Field(..., min_length=5, max_length=2000)

    @field_validator("reason")
    @classmethod
    def valid_reason(cls, value):
        if len(value.strip()) < 5:
            raise ValueError("Provide a meaningful review reason")
        return value.strip()
    reviewed_by: Optional[str] = None
    staff_name: Optional[str] = None
    staff_id: Optional[str] = None


@router.get(
    "/{student_id}/risk-explanation",
    response_model=RiskExplanationResponse,
    summary="Get Detailed Explainable Risk Dossier",
    description="Retrieve transparent mathematical decomposition of contributing factors, data freshness, and decision-support notices.",
)
async def get_student_risk_explanation(
    student_id: str,
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> RiskExplanationResponse:
    """Retrieve explainable risk indicator decomposition."""
    try:
        user = verify_staff_authorization(authorization, x_user_role)
    except HTTPException:
        user = None

    try:
        if user and user.role.lower() in STAFF_ROLES and is_database_configured():
            data = dashboard_service._load_synthetic_data()
        else:
            data = dashboard_service._load_pure_synthetic_data()
    except Exception:
        data = dashboard_service._load_pure_synthetic_data()
    raw_students: List[Dict[str, Any]] = data.get("students", [])

    match = next(
        (s for s in raw_students if str(s.get("id")) == student_id or s.get("student_id") == student_id),
        None,
    )
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record '{student_id}' does not exist.",
        )

    matched_id = str(match.get("id"))
    attendance = [a for a in data.get("attendance", []) if str(a.get("student_id")) == matched_id]
    assessments = [a for a in data.get("assessments", []) if str(a.get("student_id")) == matched_id]
    engagements = [e for e in data.get("engagement_events", []) if str(e.get("student_id")) == matched_id]

    return risk_engine.compute_student_risk(
        student_id=matched_id,
        attendance_records=attendance,
        assessment_records=assessments,
        engagement_records=engagements,
        explicit_missing_evaluations=[],
    )


@router.post(
    "/{student_id}/risk-override",
    response_model=HumanOverrideRecord,
    summary="Record Human Advisor Override",
    description="Allows authorized counselors and advisors to adjust support priority tier with mandatory audit reason.",
)
async def record_student_risk_override(
    student_id: str,
    req: RiskOverrideRequest,
    current_user: AuthenticatedUser = Depends(require_staff_user),
) -> HumanOverrideRecord:
    """Record auditable human advisor override."""
    data = dashboard_service._load_synthetic_data()
    raw_students = data.get("students", [])
    match = next(
        (s for s in raw_students if str(s.get("id")) == student_id or s.get("student_id") == student_id),
        None,
    )
    if not match:
        raise HTTPException(404, "Student not found")
    target_id = str(match["id"])
    baseline = risk_engine.compute_student_risk(target_id,
        [r for r in data.get("attendance", []) if r["student_id"] == target_id],
        [r for r in data.get("assessments", []) if r["student_id"] == target_id],
        [r for r in data.get("engagement_events", []) if r["student_id"] == target_id])
    # Read calculation directly for persistent mode to preserve the authenticated request context.
    from app.services.dataset_service import commit_records
    record = HumanOverrideRecord(is_overridden=True, original_tier=baseline.support_priority_tier,
        override_tier=req.override_tier, override_reason=req.reason, reviewed_by=current_user.email,
        reviewed_at=datetime.now().isoformat())
    existing = next((r for r in data.get("risk_overrides", []) if r["student_id"] == target_id), None)
    commit_records(data, "risk_overrides", [{"id": existing["id"] if existing else target_id,
        "student_id": target_id, **record.model_dump()}], current_user, "FLAG_REVIEW")
    risk_engine._overrides_store[target_id] = record
    return record


@router.delete(
    "/{student_id}/risk-override",
    summary="Clear Human Advisor Override",
    description="Resets risk tier back to baseline calculated indicator.",
)
async def clear_student_risk_override(
    student_id: str,
    current_user: AuthenticatedUser = Depends(require_staff_user),
) -> Dict[str, Any]:
    """Clears advisor override."""
    data = dashboard_service._load_synthetic_data()
    raw_students = data.get("students", [])
    match = next(
        (s for s in raw_students if str(s.get("id")) == student_id or s.get("student_id") == student_id),
        None,
    )
    if not match:
        raise HTTPException(404, "Student not found")
    target_id = str(match["id"])
    from app.services.dataset_service import commit_records
    existing = next((r for r in data.get("risk_overrides", []) if r["student_id"] == target_id), None)
    if existing:
        cleared = {**existing, "is_overridden": False, "override_tier": None}
        commit_records(data, "risk_overrides", [cleared], current_user, "FLAG_REVIEW")
    risk_engine.clear_human_override(target_id)
    return {"message": "Advisor override cleared successfully.", "student_id": student_id}
