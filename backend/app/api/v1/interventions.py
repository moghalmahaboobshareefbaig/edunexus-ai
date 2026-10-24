"""
EduNexus AI — Interventions & Outcomes API Router
Comprehensive, human-reviewed intervention lifecycle tracking, overdue detection,
and non-causative before/after outcome metric calculations.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import date, datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Header, status, Depends
from pydantic import BaseModel, Field

from app.schemas.intervention import (
    InterventionCreate,
    InterventionUpdate,
    InterventionInDB,
    InterventionWithOutcomes,
)
from app.schemas.outcome import (
    OutcomeCreate,
    OutcomeInDB,
    DEFAULT_CAUSATION_DISCLAIMER,
)
from app.services.dashboard_service import dashboard_service
from app.services.database_service import database_service
from app.core.auth import (
    AuthenticatedUser,
    require_staff_user,
    verify_read_authorization as verify_staff_authorization,
    STAFF_ROLES,
)
from app.db.client import is_database_configured

router = APIRouter()

from app.services.dataset_service import commit_records
from pydantic import ValidationError, ConfigDict


def _enrich_intervention_data(
    item: Dict[str, Any],
    students_map: Dict[str, Dict[str, Any]],
    outcomes_map: Dict[str, List[Dict[str, Any]]],
) -> InterventionWithOutcomes:
    """Enriches intervention dictionary with student metadata, overdue flags, and outcomes."""
    s_id = str(item.get("student_id"))
    intv_id = str(item.get("id"))
    student = students_map.get(s_id)

    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else "Enrolled Student"
    student_code = student.get("student_id", "STU-UNKNOWN") if student else "STU-UNKNOWN"

    # Check overdue condition: if in planned or in_progress, and follow_up_date < today
    is_overdue = False
    follow_up_str = str(item.get("follow_up_date") or item.get("target_completion_date") or "")
    status_val = str(item.get("status", "planned")).lower()

    if status_val in ("planned", "in_progress") and follow_up_str:
        try:
            fu_date = datetime.strptime(follow_up_str[:10], "%Y-%m-%d").date()
            if fu_date < date.today():
                is_overdue = True
        except Exception:
            pass

    # Gather outcomes
    raw_outcomes = sorted(
        outcomes_map.get(intv_id, []),
        key=lambda outcome: (
            str(outcome.get("measurement_date", "")),
            str(outcome.get("created_at", "")),
        ),
        reverse=True,
    )
    parsed_outcomes: List[OutcomeInDB] = []
    for o in raw_outcomes:
        base_val = float(o.get("baseline_value", 0.0))
        post_val = float(o.get("post_value")) if o.get("post_value") is not None else None

        abs_chg = round(post_val - base_val, 2) if post_val is not None else None
        pct_chg = round(((post_val - base_val) / base_val) * 100.0, 1) if (post_val is not None and base_val != 0) else None

        interp = o.get("interpretation")
        if not interp and post_val is not None:
            interp = (
                f"Observed change: {abs_chg:+.1f} pts ({str(pct_chg) + '%' if pct_chg is not None else 'N/A: zero baseline'}) from baseline ({base_val}) "
                f"to post-eval ({post_val}). Observed change during support period; direct causation not proven."
            )

        parsed_outcomes.append(
            OutcomeInDB(
                id=UUID(str(o.get("id"))),
                intervention_id=UUID(intv_id),
                metric_name=o.get("metric_name", "Academic Score"),
                baseline_value=base_val,
                post_value=post_val,
                target_value=float(o.get("target_value")) if o.get("target_value") is not None else None,
                measurement_date=o.get("measurement_date") or date.today(),
                outcome_status=o.get("outcome_status", "evaluating"),
                evidence_notes=o.get("evidence_notes"),
                causation_disclaimer=o.get("causation_disclaimer", DEFAULT_CAUSATION_DISCLAIMER),
                absolute_change=abs_chg,
                percentage_change=pct_chg,
                interpretation=interp,
                created_at=o.get("created_at") or datetime.now(timezone.utc),
                updated_at=o.get("updated_at") or datetime.now(timezone.utc),
            )
        )

    return InterventionWithOutcomes(
        id=UUID(intv_id),
        student_id=UUID(s_id),
        title=item.get("title") or "Personalized Support Plan",
        intervention_type=item.get("intervention_type") or "academic_tutoring",
        priority=item.get("priority", "medium"),
        status=item.get("status", "planned"),
        description=item.get("description", "Support plan recorded."),
        goals=item.get("goals"),
        assigned_staff_name=item.get("assigned_staff_name") or "Academic Support Team",
        start_date=item.get("start_date") or date.today(),
        target_completion_date=item.get("target_completion_date"),
        actual_completion_date=item.get("actual_completion_date"),
        follow_up_date=item.get("follow_up_date") or item.get("target_completion_date"),
        notes=item.get("notes"),
        student_name=student_name,
        student_code=student_code,
        is_overdue=is_overdue,
        updated_by=item.get("updated_by", "Faculty Advisor"),
        created_at=item.get("created_at") or datetime.now(timezone.utc),
        updated_at=item.get("updated_at") or datetime.now(timezone.utc),
        outcomes=parsed_outcomes,
    )


@router.get(
    "",
    response_model=List[InterventionWithOutcomes],
    summary="List Support Interventions with Outcomes",
    description="Retrieve all intervention plans with optional student, status, priority, or overdue filters.",
)
async def list_interventions(
    student_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    overdue_only: bool = Query(False, description="Filter strictly for interventions with past follow-up dates"),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> List[InterventionWithOutcomes]:
    """List all student support interventions with outcome comparisons and overdue alerts."""
    user = verify_staff_authorization(authorization, x_user_role)
    if user and user.role.lower() in STAFF_ROLES and is_database_configured():
        raw_data = dashboard_service._load_synthetic_data()
    else:
        raw_data = dashboard_service._load_pure_synthetic_data()
    all_intvs = list(raw_data.get("interventions", [])) + dashboard_service._demo_interventions
    students = raw_data.get("students", [])

    students_map = {str(s.get("id")): s for s in students}
    students_code_map = {str(s.get("student_id")): s for s in students}

    outcomes_map: Dict[str, List[Dict[str, Any]]] = {}
    for o in raw_data.get("intervention_outcomes", []):
        outcomes_map.setdefault(str(o.get("intervention_id")), []).append(o)

    results: List[InterventionWithOutcomes] = []
    for item in all_intvs:
        s_id = str(item.get("student_id"))
        # Match student_id by either UUID or student_id code
        if student_id:
            resolved_student = students_map.get(s_id) or students_code_map.get(s_id)
            if s_id != student_id and (resolved_student or {}).get("student_id") != student_id and item.get("student_id") != student_id:
                continue

        if status_filter and status_filter != "all" and item.get("status") != status_filter:
            continue

        if priority and priority != "all" and item.get("priority") != priority:
            continue

        enriched = _enrich_intervention_data(item, students_map, outcomes_map)
        if overdue_only and not enriched.is_overdue:
            continue

        results.append(enriched)

    # Sort interventions: overdue & urgent first, then newest
    results.sort(
        key=lambda x: (
            0 if x.is_overdue else 1,
            0 if x.priority == "urgent" else (1 if x.priority == "high" else 2),
            str(x.start_date),
        ),
        reverse=False,
    )
    return results


@router.post(
    "",
    response_model=InterventionWithOutcomes,
    status_code=status.HTTP_201_CREATED,
    summary="Create Support Intervention Plan",
    description="Logs a new intervention plan with target review date and assigned officer.",
)
async def create_intervention(
    intervention: InterventionCreate,
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> InterventionWithOutcomes:
    """Create a new validated intervention plan."""
    current_user: Optional[AuthenticatedUser] = None
    if authorization:
        try:
            current_user = get_current_user(authorization)
        except Exception:
            pass

    if not current_user:
        current_user = AuthenticatedUser(
            user_id="demo-advisor-001",
            email="advisor@edunexus.ai",
            role=x_user_role or "advisor",
            is_demo_session=True,
            full_name="Academic Support Officer",
        )

    raw_data = dashboard_service._load_synthetic_data()
    students = raw_data.get("students", [])
    students_map = {str(s.get("id")): s for s in students}

    # Verify student exists or register fallback
    if str(intervention.student_id) not in students_map:
        match = next((s for s in students if s.get("student_id") == str(intervention.student_id)), None)
        if match:
            students_map[str(intervention.student_id)] = match
        else:
            students_map[str(intervention.student_id)] = {
                "id": str(intervention.student_id),
                "student_id": str(intervention.student_id),
                "first_name": "Student",
                "last_name": str(intervention.student_id),
            }

    created_in_db = dashboard_service.create_intervention(intervention, current_user)

    item_dict = created_in_db.model_dump()
    item_dict["student_id"] = str(intervention.student_id)
    return _enrich_intervention_data(item_dict, students_map, {})


@router.get(
    "/{intervention_id}",
    response_model=InterventionWithOutcomes,
    summary="Get Single Intervention with Historical Outcomes",
)
async def get_intervention_detail(
    intervention_id: str,
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
) -> InterventionWithOutcomes:
    """Retrieve details and outcomes for an intervention."""
    user = verify_staff_authorization(authorization, x_user_role)
    if user and user.role.lower() in STAFF_ROLES and is_database_configured():
        raw_data = dashboard_service._load_synthetic_data()
    else:
        raw_data = dashboard_service._load_pure_synthetic_data()
    all_intvs = list(raw_data.get("interventions", [])) + dashboard_service._demo_interventions
    students_map = {str(s.get("id")): s for s in raw_data.get("students", [])}

    match = next((i for i in all_intvs if str(i.get("id")) == intervention_id), None)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention plan '{intervention_id}' was not found.",
        )

    outcomes_map: Dict[str, List[Dict[str, Any]]] = {}
    for o in raw_data.get("intervention_outcomes", []):
        outcomes_map.setdefault(str(o.get("intervention_id")), []).append(o)

    return _enrich_intervention_data(match, students_map, outcomes_map)


@router.patch(
    "/{intervention_id}",
    response_model=InterventionWithOutcomes,
    summary="Update Intervention Lifecycle Status & Milestones",
    description="Updates status (planned, in_progress, completed, cancelled), notes, or follow-up date.",
)
async def update_intervention(
    intervention_id: str,
    update_data: InterventionUpdate,
    current_user: AuthenticatedUser = Depends(require_staff_user),
) -> InterventionWithOutcomes:
    """Update intervention status and audit metadata."""
    raw_data = dashboard_service._load_synthetic_data()
    all_intvs = list(raw_data.get("interventions", [])) + dashboard_service._demo_interventions
    students_map = {str(s.get("id")): s for s in raw_data.get("students", [])}

    match = next((i for i in all_intvs if str(i.get("id")) == intervention_id), None)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention plan '{intervention_id}' was not found.",
        )

    transitions = {"planned": {"planned", "in_progress", "cancelled", "under_review"},
        "in_progress": {"in_progress", "completed", "cancelled", "under_review"},
        "under_review": {"under_review", "in_progress", "completed", "cancelled"},
        "completed": {"completed"}, "cancelled": {"cancelled"}}
    updates = update_data.model_dump(mode="json", exclude_unset=True)
    next_status = updates.get("status", match["status"])
    if next_status not in transitions[match["status"]]:
        raise HTTPException(409, "This intervention status transition is not permitted.")
    candidate = {**match, **updates, "updated_at": datetime.now(timezone.utc).isoformat()}
    if next_status == "completed" and not candidate.get("actual_completion_date"):
        candidate["actual_completion_date"] = date.today().isoformat()
    try:
        InterventionInDB(**candidate)
    except ValidationError as exc:
        raise HTTPException(422, "; ".join(e["msg"] for e in exc.errors()))
    commit_records(raw_data, "interventions", [candidate], current_user, "INTERVENTION_STATUS_CHANGE")
    match = candidate

    outcomes_map: Dict[str, List[Dict[str, Any]]] = {}
    for o in raw_data.get("intervention_outcomes", []):
        outcomes_map.setdefault(str(o.get("intervention_id")), []).append(o)

    return _enrich_intervention_data(match, students_map, outcomes_map)


class CreateOutcomePayload(BaseModel):
    """Payload to record an outcome observation."""
    model_config = ConfigDict(allow_inf_nan=False)
    metric_name: str = Field(..., min_length=2, max_length=100)
    baseline_value: float = Field(..., description="Observed value before intervention")
    post_value: float = Field(..., description="Observed value after intervention")
    target_value: Optional[float] = None
    measurement_date: date = Field(default_factory=date.today)
    evidence_notes: Optional[str] = None


@router.post(
    "/{intervention_id}/outcomes",
    response_model=OutcomeInDB,
    status_code=status.HTTP_201_CREATED,
    summary="Record Before/After Outcome Observation",
    description="Records quantitative outcome metrics and calculates absolute and percentage changes without claiming causation without evidence.",
)
async def record_intervention_outcome(
    intervention_id: str,
    payload: CreateOutcomePayload,
    current_user: AuthenticatedUser = Depends(require_staff_user),
) -> OutcomeInDB:
    """Record before/after outcome metrics with scientific non-causation safeguards."""

    raw_data = dashboard_service._load_synthetic_data()
    parent = next((i for i in raw_data.get("interventions", []) if str(i["id"]) == intervention_id), None)
    if parent is None:
        raise HTTPException(404, "Intervention not found")
    if payload.measurement_date < date.fromisoformat(str(parent["start_date"])[:10]):
        raise HTTPException(422, "Measurement date cannot precede intervention start date")

    # Calculate observed deltas
    abs_chg = round(payload.post_value - payload.baseline_value, 2)
    pct_chg = (
        round(((payload.post_value - payload.baseline_value) / payload.baseline_value) * 100.0, 1)
        if payload.baseline_value != 0
        else None
    )

    if abs_chg > 0:
        outcome_status = "improved"
    elif abs_chg == 0:
        outcome_status = "unchanged"
    else:
        outcome_status = "declined"

    pct_display = f"{pct_chg:+.1f}%" if pct_chg is not None else "N/A (zero baseline)"
    interpretation = (
        f"Observed change of {abs_chg:+.1f} points ({pct_display}) in {payload.metric_name} "
        f"from baseline ({payload.baseline_value}) to post-intervention measurement ({payload.post_value}). "
        f"This comparison represents an observed variation during the intervention timeline. "
        f"Direct causation cannot be asserted without an experimental control study."
    )

    outcome_record = {
        "id": str(uuid4()),
        "intervention_id": intervention_id,
        "metric_name": payload.metric_name,
        "baseline_value": payload.baseline_value,
        "post_value": payload.post_value,
        "target_value": payload.target_value,
        "measurement_date": payload.measurement_date,
        "outcome_status": outcome_status,
        "evidence_notes": payload.evidence_notes,
        "absolute_change": abs_chg,
        "percentage_change": pct_chg,
        "interpretation": interpretation,
        "causation_disclaimer": DEFAULT_CAUSATION_DISCLAIMER,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    persisted = OutcomeInDB(**outcome_record).model_dump(mode="json", exclude={"absolute_change", "percentage_change", "interpretation"})
    commit_records(raw_data, "intervention_outcomes", [persisted], current_user, "CREATE")

    return OutcomeInDB(
        id=UUID(outcome_record["id"]),
        intervention_id=UUID(intervention_id),
        metric_name=payload.metric_name,
        baseline_value=payload.baseline_value,
        post_value=payload.post_value,
        target_value=payload.target_value,
        measurement_date=payload.measurement_date,
        outcome_status=outcome_status,
        evidence_notes=payload.evidence_notes,
        causation_disclaimer=DEFAULT_CAUSATION_DISCLAIMER,
        absolute_change=abs_chg,
        percentage_change=pct_chg,
        interpretation=interpretation,
        created_at=outcome_record["created_at"],
        updated_at=outcome_record["updated_at"],
    )


@router.delete(
    "/{intervention_id}",
    summary="Cancel / Archive Intervention",
)
async def delete_or_cancel_intervention(
    intervention_id: str,
    current_user: AuthenticatedUser = Depends(require_staff_user),
) -> Dict[str, Any]:
    """Marks intervention as cancelled."""
    raw_data = dashboard_service._load_synthetic_data()
    all_intvs = list(raw_data.get("interventions", [])) + dashboard_service._demo_interventions
    match = next((i for i in all_intvs if str(i.get("id")) == intervention_id), None)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention plan '{intervention_id}' was not found.",
        )
    await update_intervention(intervention_id, InterventionUpdate(status="cancelled"), current_user)
    return {"message": "Intervention marked as cancelled.", "id": intervention_id}
