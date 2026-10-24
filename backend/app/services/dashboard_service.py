"""
EduNexus AI — Dashboard Service
Aggregates student metrics, attendance trajectories, academic performance trends,
and explainable risk distributions from live Supabase or the verified synthetic seed dataset.
"""

import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from uuid import uuid4

from fastapi import HTTPException
from app.core.config import settings

from app.services.database_service import database_service
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    KPISummary,
    AttendanceTrendPoint,
    AssessmentTrendPoint,
    RiskDistributionTier,
    RecentActivityItem,
    FollowUpStudentItem,
    InterventionStatusBreakdown,
    DashboardMetadata,
)
from app.schemas.intervention import InterventionCreate, InterventionInDB
from app.core.risk_config import default_risk_config
from app.services.success_score_engine import success_score_engine
from app.services.dual_risk_engine import dual_risk_engine
from app.services.segmentation_engine import segmentation_engine

SEED_DATA_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "synthetic_seed.json"



class DashboardService:
    """Provides aggregated analytics with dual mode: Live Supabase vs Synthetic Demo."""

    def __init__(self):
        self._cached_synthetic_data: Optional[Dict[str, Any]] = None
        self._demo_interventions: List[Dict[str, Any]] = []

    def _load_pure_synthetic_data(self) -> Dict[str, Any]:
        """Loads and caches synthetic demonstration dataset from disk."""
        if self._cached_synthetic_data is None:
            if SEED_DATA_PATH.exists():
                try:
                    with open(SEED_DATA_PATH, "r", encoding="utf-8") as f:
                        self._cached_synthetic_data = json.load(f)
                except Exception:
                    self._cached_synthetic_data = {}
            else:
                self._cached_synthetic_data = {}

        self._hydrate_overrides(self._cached_synthetic_data or {})
        return self._cached_synthetic_data if self._cached_synthetic_data is not None else {}

    def _load_synthetic_data(self) -> Dict[str, Any]:
        """Loads live dataset if configured and allowed, or synthetic demo dataset."""
        from app.db.client import is_database_configured
        from app.services.dataset_service import read_live_dataset
        if is_database_configured():
            try:
                data = read_live_dataset()
                self._hydrate_overrides(data)
                return data
            except Exception:
                pass
        return self._load_pure_synthetic_data()

    def _hydrate_overrides(self, data):
        from app.services.risk_engine import risk_engine, HumanOverrideRecord
        risk_engine._overrides_store = {r['student_id']: HumanOverrideRecord(**r)
            for r in data.get('risk_overrides', []) if r.get('is_overridden')}

    def get_dashboard_overview(
        self, current_user: Optional[Any] = None
    ) -> DashboardOverviewResponse:
        """
        Generates full dashboard response.
        If user is verified staff AND database is configured, returns live Supabase analytics.
        Otherwise (for public unauthenticated visitors or demonstration mode),
        derives safe, clean aggregates dynamically from the synthetic seed dataset.
        """
        from app.db.client import is_database_configured
        from app.core.auth import STAFF_ROLES

        is_staff = current_user is not None and getattr(current_user, "role", "").lower() in STAFF_ROLES
        if is_staff and is_database_configured():
            from app.services.dataset_service import read_live_dataset
            data = read_live_dataset()
            self._hydrate_overrides(data)
            return self._generate_from_data(data, is_live_db=True)
        else:
            data = self._load_pure_synthetic_data()
            return self._generate_from_data(data, is_live_db=False)

    def _generate_from_synthetic(self) -> DashboardOverviewResponse:
        """Backward-compatible helper for synthetic overview."""
        from app.db.client import is_database_configured
        data = self._load_synthetic_data()
        return self._generate_from_data(data, is_live_db=is_database_configured())

    def _generate_from_data(self, data: Dict[str, Any], is_live_db: bool = False) -> DashboardOverviewResponse:
        """Aggregate the selected data source using the authoritative student engine."""
        from collections import defaultdict, Counter
        from app.services.student_analytics_service import _compute_student_metrics
        from app.services.history_service import build_history
        from app.services.risk_engine import risk_engine, HumanOverrideRecord
        # Never retain another data source's overrides.
        risk_engine._overrides_store = {r['student_id']: HumanOverrideRecord(**r)
            for r in data.get('risk_overrides', []) if r.get('is_overridden')}
        students = data.get('students', [])
        interventions = data.get('interventions', []) + self._demo_interventions
        groups = {}
        for table in ('attendance', 'assessments', 'engagement_events', 'interventions'):
            groups[table] = defaultdict(list)
            for r in interventions if table == 'interventions' else data.get(table, []):
                groups[table][str(r['student_id'])].append(r)
        latest = {}
        for table, date_key in [('placement_records', 'evaluated_at'), ('skills_records', 'last_assessed_date'),
                                ('feedback_records', 'recorded_at'), ('lms_activity_records', 'recorded_at')]:
            latest[table] = {str(r['student_id']): r for r in sorted(data.get(table, []),
                key=lambda r: (str(r.get(date_key, '')), str(r.get('updated_at', ''))))}
        metrics = [_compute_student_metrics(s, groups['attendance'], groups['assessments'],
            groups['engagement_events'], groups['interventions'], i, latest['placement_records'],
            latest['skills_records'], latest['feedback_records'], latest['lms_activity_records']) for i,s in enumerate(students)]
        def mean(values):
            values = [v for v in values if v is not None]
            return round(sum(values)/len(values), 1) if values else None
        def distribution(field):
            counts = Counter(m[field] for m in metrics)
            colors = {'low': '#0d9488', 'moderate': '#f59e0b', 'high': '#f97316', 'critical': '#ef4444', 'insufficient_data': '#64748b'}
            return [RiskDistributionTier(tier=t, label=t.replace('_', ' ').title(), count=counts[t],
                percentage=round(counts[t]/len(students)*100,1) if students else 0, color=c,
                description='Prototype indicator for human support review; see individual factors.')
                for t,c in colors.items() if t != 'insufficient_data' or counts[t]]
        attendance = data.get('attendance', [])
        assessments = data.get('assessments', [])
        daily_att, daily_ass = defaultdict(list), defaultdict(list)
        for r in attendance:
            daily_att[str(r['session_date'])[:10]].append(r)
        for r in assessments:
            daily_ass[str(r['assessment_date'])[:10]].append(r)
        att_trend = [AttendanceTrendPoint(period=d, attendance_rate=round(sum(r['status'] in ('present','late') for r in rows)/len(rows)*100,1),
            total_sessions=len(rows), present_sessions=sum(r['status'] in ('present','late') for r in rows)) for d,rows in sorted(daily_att.items())]
        ass_trend = []
        for d, rows in sorted(daily_ass.items()):
            subjects = defaultdict(list)
            for r in rows:
                subjects[r['subject']].append(r['score']/r['max_score']*100)
            ass_trend.append(AssessmentTrendPoint(period=d, average_score=mean([r['score']/r['max_score']*100 for r in rows]),
                subjects={k:mean(v) for k,v in subjects.items()}))
        status_counts = Counter(r['status'] for r in interventions)
        today = datetime.now(timezone.utc).date()
        due = sum(r.get('status') in ('planned','in_progress') and bool(r.get('follow_up_date')) and
            str(r['follow_up_date'])[:10] <= (today+timedelta(days=7)).isoformat() for r in interventions)
        int_summary = InterventionStatusBreakdown(total=len(interventions), planned=status_counts['planned'],
            in_progress=status_counts['in_progress'], under_review=status_counts['under_review'], completed=status_counts['completed'],
            by_type=dict(Counter(r['intervention_type'] for r in interventions)), by_priority=dict(Counter(r['priority'] for r in interventions)),
            completion_rate=round(status_counts['completed']/len(interventions)*100,1) if interventions else 0,
            upcoming_follow_ups=due)
        followups, activity = [], []
        for s,m in zip(students,metrics):
            sid = str(s['id'])
            events, _ = build_history(s, groups['attendance'][sid], groups['assessments'][sid], groups['engagement_events'][sid], groups['interventions'][sid])
            for e in events[:5]:
                activity.append(RecentActivityItem(id=e.id, student_id=s['student_id'], student_name=f"{s['first_name']} {s['last_name']}",
                    activity_type=e.event_type, title=e.title, description=e.description, timestamp=e.date, severity=e.severity))
            if m['risk_tier'] in ('moderate','high','critical'):
                factors = m['baseline_profile']['contributing_factors']
                primary = max(factors, key=lambda f:f['contribution_points'])
                followups.append(FollowUpStudentItem(id=sid, student_id=s['student_id'], name=f"{s['first_name']} {s['last_name']}",
                    grade=s['current_grade'], section=s.get('section'), risk_level=m['risk_tier'], risk_score=m['risk_score'],
                    primary_risk_factor=primary['explanation'], attendance_rate=m['attendance_rate'], avg_score=m['average_score'],
                    last_interaction=events[0].date if events else 'Not recorded',
                    assigned_advisor=f"{s.get('department')} Support Advisor" if s.get('department') else "Academic Support Team",
                    status=m['review_status']))
        domains = ('academic','attendance','placement','lms','engagement','skills','feedback')
        domain_values = {d:[next(b['raw_score'] for b in m['success_profile']['domain_breakdowns'] if b['domain']==d) for m in metrics] for d in domains}
        segs = {}
        for m in metrics:
            seg = m['segment_profile']
            item = segs.setdefault(seg['segment_id'], {'segment_id':seg['segment_id'], 'label':seg['segment_label'],
                'badge_color':seg['badge_color'], 'tagline':seg['tagline'], 'count':0, 'description':seg['description'], 'recommended_action':seg['recommended_action']})
            item['count'] += 1
        for item in segs.values():
            item['percentage'] = round(item['count']/len(students)*100,1) if students else 0
        matrix = dict.fromkeys(['academic_low_placement_low','academic_low_placement_high','academic_high_placement_low','academic_high_placement_high','moderate_quadrants','insufficient_data'],0)
        for m in metrics:
            a,p = m['academic_risk_tier'],m['placement_risk_tier']
            if 'insufficient_data' in (a,p): key='insufficient_data'
            elif 'moderate' in (a,p): key='moderate_quadrants'
            else: key=f"academic_{'low' if a=='low' else 'high'}_placement_{'low' if p=='low' else 'high'}"
            matrix[key] += 1
        placement = list(latest['placement_records'].values())
        cohorts = []
        for department in sorted({m['department'] for m in metrics}):
            members = [m for m in metrics if m['department']==department]
            cohorts.append({'department':department, 'count':len(members), 'average_success_score':mean([m['success_score'] for m in members]),
                'average_attendance':mean([m['attendance_rate'] for m in members]), 'average_assessment':mean([m['average_score'] for m in members])})
        avg_att = mean([m['attendance_rate'] for m in metrics])
        return DashboardOverviewResponse(
            summary=KPISummary(total_students=len(students), active_students=sum(s['status']=='active' for s in students),
                requiring_review_count=len(followups), review_percentage=round(len(followups)/len(students)*100,1) if students else 0,
                average_attendance=avg_att, attendance_status='No attendance records' if avg_att is None else 'Prototype benchmark: 80%',
                active_interventions_count=status_counts['planned']+status_counts['in_progress'], follow_ups_due_count=due,
                cohort_avg_score=mean([m['average_score'] for m in metrics]), average_success_score=mean([m['success_score'] for m in metrics])),
            attendance_trend=att_trend, assessment_trend=ass_trend, risk_distribution=distribution('risk_tier'),
            academic_risk_distribution=distribution('academic_risk_tier'), placement_risk_distribution=distribution('placement_risk_tier'),
            recent_activity=sorted(activity,key=lambda a:a.timestamp,reverse=True)[:10], follow_up_students=sorted(followups,key=lambda f:f.risk_score or 0,reverse=True),
            intervention_summary=int_summary,
            metadata=DashboardMetadata(
                is_demo=not is_live_db,
                data_source='Supabase PostgreSQL' if is_live_db else 'Public Demonstration (Synthetic Cohort)',
                dataset_size=len(students),
                generated_at=datetime.now(timezone.utc).isoformat(),
                disclaimer='Deterministic prototype indicators for human review. No predictive validation or causal effect is claimed.' if is_live_db else 'Public demonstration mode with safe fictional test data. Real student records require authenticated staff review.',
            ),
            domain_averages={d:mean(v) for d,v in domain_values.items()},
            domain_coverage={d:sum(v is not None for v in values) for d,values in domain_values.items()},
            placement_readiness_summary={'average_aptitude':mean([p.get('aptitude_score') for p in placement]), 'average_coding':mean([p.get('coding_score') for p in placement]),
                'average_mock_interview':mean([p.get('mock_interview_score') for p in placement]), 'tier_distribution':dict(Counter(p.get('readiness_tier') or 'not_recorded' for p in placement))},
            segmentation_distribution=list(segs.values()), dual_risk_matrix=matrix, cohort_comparisons=cohorts,
            success_distribution=[{'tier':t,'count':sum(m['success_tier']==t for m in metrics)} for t in ('thriving','proficient','developing','needs_support',None)])

    def create_intervention(self, intervention: InterventionCreate, actor=None) -> InterventionInDB:
        from app.services.dataset_service import commit_records
        data = self._load_synthetic_data()
        now = datetime.now(timezone.utc).isoformat()
        record = {**intervention.model_dump(mode="json"), "id": str(uuid4()),
                  "created_at": now, "updated_at": now}
        commit_records(data, "interventions", [record], actor, "CREATE")
        return InterventionInDB(**record)


dashboard_service = DashboardService()
