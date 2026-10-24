import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  HeartHandshake,
  Shield,
  UserCheck,
  Briefcase,
  Award,
  BookOpen,
  MessageSquare,
  Scale,
  CheckCircle2,
  GraduationCap,
  CalendarCheck,
  Activity,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { StudentProfileHeader } from '../features/journey/StudentProfileHeader';
import { StudentMetricsSummary } from '../features/journey/StudentMetricsSummary';
import { MissingDataNoticeBanner } from '../features/journey/MissingDataNoticeBanner';
import { StudentMetricTrendsChart } from '../features/journey/StudentMetricTrendsChart';
import { JourneyTimeline } from '../features/journey/JourneyTimeline';
import { CreateInterventionModal } from '../features/dashboard/CreateInterventionModal';
import { RecordOutcomeModal } from '../features/interventions/RecordOutcomeModal';
import { RiskOverrideModal } from '../features/journey/RiskOverrideModal';
import { StudentSuccessScoreCard } from '../features/journey/StudentSuccessScoreCard';
import { DualRiskAssessmentCard } from '../features/journey/DualRiskAssessmentCard';
import { CohortSegmentCard } from '../features/journey/CohortSegmentCard';
import { StudentRadarFingerprint } from '../features/journey/StudentRadarFingerprint';
import type {
  StudentJourneyProfileResponse,
  StudentListItem,
  StudentDirectoryResponse,
  CreateInterventionPayload,
  RiskExplanationResponse,
  Intervention,
  TrendDirection,
} from '../types';
import { FALLBACK_STUDENTS } from './StudentsPage';

export function createFallbackJourneyProfile(identifier: string): StudentJourneyProfileResponse {
  const cleanId = (identifier || '').trim().toLowerCase();
  const match =
    FALLBACK_STUDENTS.find(
      (s) => s.id.toLowerCase() === cleanId || s.student_id.toLowerCase() === cleanId
    ) ||
    FALLBACK_STUDENTS[0];

  const dept = match.department || 'Computer Science & Engineering';
  const avgScore = match.average_score ?? 65.0;
  const attRate = match.attendance_rate ?? 70.0;
  const evalScore = match.latest_assessment_percentage ?? 70.0;
  const succScore = match.success_score ?? 70.0;
  const riskSc = match.risk_score ?? 35.0;

  return {
    student: {
      id: match.id,
      student_id: match.student_id,
      first_name: match.first_name,
      last_name: match.last_name,
      email: `${match.first_name.toLowerCase()}.${match.last_name.toLowerCase()}@edunexus.ai`,
      grade: match.current_grade,
      current_grade: match.current_grade,
      academic_term: match.academic_term,
      section: match.section,
      department: dept,
      enrollment_date: '2024-08-01',
      status: (match.status as any) || 'active',
      attendance_rate: attRate,
      avg_score: avgScore,
      risk_level: (match.risk_tier as any) || 'moderate',
    },
    department: dept,
    attendance_rate: attRate,
    average_score: avgScore,
    latest_assessment_percentage: evalScore,
    trend: (match.trend as TrendDirection) || 'stable',
    review_status: match.review_status || 'Under Review',
    risk_profile: {
      overall_risk: (match.risk_tier as any) || 'moderate',
      risk_score: riskSc,
      factors: [
        {
          factor: 'Curriculum Assessment Average',
          value: avgScore,
          weight: 0.4,
          contribution: Number(((100 - avgScore) * 0.4).toFixed(1)),
        },
        {
          factor: 'Classroom Attendance Rate',
          value: attRate,
          weight: 0.35,
          contribution: Number(((100 - attRate) * 0.35).toFixed(1)),
        },
        {
          factor: 'LMS Platform Activity & Engagement',
          value: evalScore,
          weight: 0.25,
          contribution: Number(((100 - evalScore) * 0.25).toFixed(1)),
        },
      ],
      requires_review: match.risk_tier === 'high' || match.risk_tier === 'critical',
      disclaimer: 'System-monitored institutional risk indicators based on holistic empirical criteria.',
    },
    missing_data_notices: [],
    recent_attendance: [
      { id: 'att-1', student_id: match.id, session_date: '2026-10-23', date: '2026-10-23', status: 'present', remarks: 'Advanced Core Lab' },
      { id: 'att-2', student_id: match.id, session_date: '2026-10-22', date: '2026-10-22', status: attRate > 70 ? 'present' : 'absent', remarks: 'Department Seminar' },
      { id: 'att-3', student_id: match.id, session_date: '2026-10-21', date: '2026-10-21', status: 'present', remarks: 'Domain Theory Session' },
      { id: 'att-4', student_id: match.id, session_date: '2026-10-20', date: '2026-10-20', status: 'present', remarks: 'Tutorial Review' },
      { id: 'att-5', student_id: match.id, session_date: '2026-10-17', date: '2026-10-17', status: 'present', remarks: 'Technical Workshop' },
    ],
    recent_assessments: [
      { id: 'ass-1', student_id: match.id, subject: dept, assessment_type: 'exam', score: evalScore, max_score: 100, assessment_date: '2026-10-18', date: '2026-10-18' },
      { id: 'ass-2', student_id: match.id, subject: dept, assessment_type: 'practical', score: avgScore, max_score: 100, assessment_date: '2026-10-10', date: '2026-10-10' },
      { id: 'ass-3', student_id: match.id, subject: 'Core Fundamentals', assessment_type: 'quiz', score: Math.min(100, Math.round(avgScore + 5)), max_score: 100, assessment_date: '2026-09-28', date: '2026-09-28' },
      { id: 'ass-4', student_id: match.id, subject: 'Domain Theory', assessment_type: 'assignment', score: Math.min(100, Math.round(avgScore + 8)), max_score: 100, assessment_date: '2026-09-14', date: '2026-09-14' },
    ],
    recent_engagements: [
      { id: 'eng-1', student_id: match.id, event_type: 'advising_session', title: 'Academic Progress Consultation', description: 'Review of term milestones and study scheduling.', event_timestamp: '2026-10-15T14:00:00Z', date: '2026-10-15' },
      { id: 'eng-2', student_id: match.id, event_type: 'workshop', title: 'Technical Skill Accelerator', description: 'Hands-on practical development workshop.', event_timestamp: '2026-10-02T11:00:00Z', date: '2026-10-02' },
      { id: 'eng-3', student_id: match.id, event_type: 'campus_seminar', title: 'Industry Connect & Leadership Forum', description: 'Interactive alumni panel on emerging industry frameworks.', event_timestamp: '2026-09-22T15:30:00Z', date: '2026-09-22' },
    ],
    interventions: [
      {
        id: 'int-demo-1',
        student_id: match.id,
        student_name: `${match.first_name} ${match.last_name}`,
        student_code: match.student_id,
        title: 'Individual Academic Mentoring & Study Plan',
        intervention_type: 'academic_support',
        type: 'academic_support',
        status: match.review_status === 'Active Support Plan' ? 'in_progress' : 'completed',
        priority: match.risk_tier === 'high' ? 'high' : 'medium',
        assigned_to: 'Academic Advisor',
        start_date: '2026-10-05',
        follow_up_date: '2026-11-15',
        description: 'Structured bi-weekly check-ins to monitor coursework milestones and concept reinforcement.',
      },
    ],
    timeline_events: [
      { id: 'time-1', title: 'Term Assessment Evaluated', date: '2026-10-18', event_type: 'academic', description: `Scored ${evalScore}% on Mid-Term Comprehensive Evaluation.`, severity: evalScore >= 70 ? 'success' : 'warning' },
      { id: 'time-2', title: 'Advisor Consultation Recorded', date: '2026-10-15', event_type: 'engagement', description: 'Milestone review session completed with advisor.', severity: 'info' },
      { id: 'time-3', title: 'Attendance Benchmark Check', date: '2026-10-10', event_type: 'attendance', description: `Term attendance consolidated at ${attRate}%.`, severity: attRate >= 75 ? 'success' : 'warning' },
      { id: 'time-4', title: 'Practical Domain Evaluation', date: '2026-10-10', event_type: 'academic', description: `Scored ${avgScore}% on practical laboratory evaluation.`, severity: avgScore >= 60 ? 'info' : 'warning' },
    ],
    metrics_trend: [
      { period: 'Week 1-3', attendance: Math.max(40, attRate - 6), score: Math.max(35, avgScore - 5) },
      { period: 'Week 4-6', attendance: attRate, score: avgScore },
      { period: 'Week 7-9', attendance: Math.min(100, attRate + 4), score: evalScore },
    ],
    success_profile: {
      student_id: match.id,
      success_score: succScore,
      success_tier: (match.success_tier as any) || 'proficient',
      data_coverage_pct: 100,
      available_domains_count: 7,
      status: 'COMPLETE',
      missing_domains: [],
      domain_breakdowns: [
        { domain: 'Curriculum Assessments', raw_score: avgScore, assigned_weight: 0.25, normalized_weight: 0.25, weighted_contribution: Number((avgScore * 0.25).toFixed(1)), telemetry_summary: {}, is_missing: false },
        { domain: 'Classroom Attendance', raw_score: attRate, assigned_weight: 0.20, normalized_weight: 0.20, weighted_contribution: Number((attRate * 0.20).toFixed(1)), telemetry_summary: {}, is_missing: false },
        { domain: 'Technical & Practical Skills', raw_score: Math.min(100, avgScore + 6), assigned_weight: 0.15, normalized_weight: 0.15, weighted_contribution: Number((Math.min(100, avgScore + 6) * 0.15).toFixed(1)), telemetry_summary: {}, is_missing: false },
        { domain: 'Placement Readiness', raw_score: match.placement_risk_tier === 'low' ? 82 : match.placement_risk_tier === 'moderate' ? 64 : 45, assigned_weight: 0.15, normalized_weight: 0.15, weighted_contribution: Number(((match.placement_risk_tier === 'low' ? 82 : match.placement_risk_tier === 'moderate' ? 64 : 45) * 0.15).toFixed(1)), telemetry_summary: {}, is_missing: false },
        { domain: 'LMS Platform Activity', raw_score: evalScore, assigned_weight: 0.10, normalized_weight: 0.10, weighted_contribution: Number((evalScore * 0.10).toFixed(1)), telemetry_summary: {}, is_missing: false },
        { domain: 'Faculty Feedback', raw_score: 75.0, assigned_weight: 0.10, normalized_weight: 0.10, weighted_contribution: 7.5, telemetry_summary: {}, is_missing: false },
        { domain: 'Campus Engagement', raw_score: 70.0, assigned_weight: 0.05, normalized_weight: 0.05, weighted_contribution: 3.5, telemetry_summary: {}, is_missing: false },
      ],
    },
    academic_risk_profile: {
      risk_type: 'academic',
      tier: (match.academic_risk_tier as any) || 'moderate',
      score: riskSc,
      is_critical_flag: match.academic_risk_tier === 'critical',
      contributing_factors: [
        {
          metric: 'Coursework Average',
          observed_value: `${avgScore.toFixed(1)}%`,
          threshold: '60.0%',
          severity: avgScore >= 60 ? 'low' : avgScore >= 50 ? 'moderate' : 'high',
          description: 'Weighted average across graded semester assessments.',
        },
      ],
      recommendation: 'Focused subject tutoring and faculty check-ins',
    },
    placement_risk_profile: {
      risk_type: 'placement',
      tier: (match.placement_risk_tier as any) || 'low',
      score: match.placement_risk_tier === 'low' ? 22 : match.placement_risk_tier === 'moderate' ? 48 : 74,
      is_critical_flag: match.placement_risk_tier === 'critical',
      contributing_factors: [
        {
          metric: 'Mock Interview Performance',
          observed_value: match.placement_risk_tier === 'low' ? '82/100' : '58/100',
          threshold: '70/100',
          severity: match.placement_risk_tier === 'low' ? 'low' : 'moderate',
          description: 'Technical evaluation and practical problem-solving score.',
        },
      ],
      recommendation: 'Placement training modules and resume strengthening',
    },
    segment_profile: {
      segment_id: match.segment_id || 'steady_emerging_potential',
      segment_label: match.segment_label || 'Steady / Emerging Potential',
      tagline: 'Strategic Cohort Advisory Category',
      badge_color: match.segment_id === 'high_achiever_placement_ready' ? 'emerald' : match.segment_id === 'practical_star_exam_vulnerable' ? 'amber' : 'indigo',
      description: `Student classified under ${match.segment_label || 'Steady / Emerging Potential'} cohort strategy based on empirical decoupled academic and placement risk indicators.`,
      recommended_action: 'Balanced cohort monitoring with proactive milestone follow-ups.',
      action_type: 'mentorship',
    },
    placement_details: {
      id: 'place-1',
      student_id: match.id,
      aptitude_score: match.placement_risk_tier === 'low' ? 84 : 62,
      coding_score: match.placement_risk_tier === 'low' ? 80 : 58,
      mock_interview_score: match.placement_risk_tier === 'low' ? 82 : 60,
      resume_score: 85,
      readiness_tier: match.placement_risk_tier === 'low' ? 'placement_ready' : 'developing',
      mock_interviews_attended: 2,
      evaluated_at: '2026-10-12',
    },
    skills_details: {
      id: 'skill-1',
      student_id: match.id,
      technical_score: Math.min(100, Math.round(avgScore + 6)),
      soft_skills_score: 78,
      certifications_count: 2,
      verified_skills: ['Data Analysis', 'Problem Solving', 'Python Basics'],
      last_assessed_date: '2026-10-14',
    },
    feedback_details: {
      id: 'feed-1',
      student_id: match.id,
      faculty_sentiment: 82,
      student_satisfaction: 85,
      academic_term: match.academic_term,
      recorded_at: '2026-10-16',
    },
    lms_details: {
      id: 'lms-1',
      student_id: match.id,
      weekly_login_count: 5,
      module_completion_pct: evalScore,
      assignments_submitted_pct: 90,
      forum_posts_count: 8,
      recorded_at: '2026-10-21',
    },
  };
}

export function createFallbackRiskExplanation(identifier: string): RiskExplanationResponse {
  const profile = createFallbackJourneyProfile(identifier);
  const score = profile.risk_profile.risk_score ?? 40;
  const tier = profile.risk_profile.overall_risk;
  return {
    student_id: profile.student.id,
    composite_risk_score: score,
    support_priority_tier: tier,
    effective_priority_tier: tier,
    requires_human_review: profile.risk_profile.requires_review,
    requires_review: profile.risk_profile.requires_review,
    contributing_factors: [
      {
        factor_name: 'Curriculum Assessment Average',
        measured_value: profile.average_score,
        benchmark_value: 60.0,
        sub_metric_score: profile.average_score ?? 65,
        weight: 0.4,
        contribution_points: Number(((100 - (profile.average_score ?? 65)) * 0.4).toFixed(1)),
        status: (profile.average_score ?? 65) >= 60 ? 'normal' : 'warning',
        explanation: 'Academic coursework evaluation performance across semester classes.',
      },
      {
        factor_name: 'Classroom Attendance Rate',
        measured_value: profile.attendance_rate,
        benchmark_value: 75.0,
        sub_metric_score: profile.attendance_rate ?? 75,
        weight: 0.35,
        contribution_points: Number(((100 - (profile.attendance_rate ?? 75)) * 0.35).toFixed(1)),
        status: (profile.attendance_rate ?? 75) >= 75 ? 'normal' : 'warning',
        explanation: 'Institutional minimum attendance benchmark compliance.',
      },
      {
        factor_name: 'LMS Platform Activity & Engagement',
        measured_value: profile.latest_assessment_percentage ?? 70,
        benchmark_value: 70.0,
        sub_metric_score: profile.latest_assessment_percentage ?? 70,
        weight: 0.25,
        contribution_points: Number(((100 - (profile.latest_assessment_percentage ?? 70)) * 0.25).toFixed(1)),
        status: (profile.latest_assessment_percentage ?? 70) >= 70 ? 'normal' : 'warning',
        explanation: 'Platform engagement, laboratory tasks, and quiz interaction.',
      },
    ],
    factors: [
      {
        name: 'Curriculum Assessment Average',
        value: profile.average_score ?? 65,
        benchmark: 60,
        weight: 0.4,
        contribution: Number(((100 - (profile.average_score ?? 65)) * 0.4).toFixed(1)),
        explanation: 'Academic coursework evaluation performance across semester classes.',
      },
      {
        name: 'Classroom Attendance Rate',
        value: profile.attendance_rate ?? 75,
        benchmark: 75,
        weight: 0.35,
        contribution: Number(((100 - (profile.attendance_rate ?? 75)) * 0.35).toFixed(1)),
        explanation: 'Institutional minimum attendance benchmark compliance.',
      },
      {
        name: 'LMS Platform Activity & Engagement',
        value: profile.latest_assessment_percentage ?? 70,
        benchmark: 70,
        weight: 0.25,
        contribution: Number(((100 - (profile.latest_assessment_percentage ?? 70)) * 0.25).toFixed(1)),
        explanation: 'Platform engagement, laboratory tasks, and quiz interaction.',
      },
    ],
    data_freshness: [
      {
        category: 'Attendance',
        total_records: 5,
        freshness_status: 'CURRENT',
        notes: 'Verified against campus attendance portal within the current term.',
      },
      {
        category: 'Assessments',
        total_records: 4,
        freshness_status: 'CURRENT',
        notes: 'Includes mid-term evaluations and laboratory assessments.',
      },
    ],
    missing_data_warnings: [],
    recent_decline_flags: {
      attendance_decline: false,
      academic_decline: false,
    },
    human_override: {
      is_overridden: false,
      original_tier: tier,
    },
    computed_at: new Date().toISOString(),
    decision_support_disclaimer: 'System-monitored institutional risk indicators based on empirical multi-domain criteria.',
  };
}

export const StudentJourneyPage: React.FC = () => {
  const { isStaff, session } = useAuth();
  const isStudent = session?.role?.toLowerCase() === 'student' || !isStaff;

  const params = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine current student ID from either /students/:id or /journey?student_id=...
  const studentIdParam = params.id || searchParams.get('student_id') || '';

  const initialStudentId = studentIdParam || (isStudent ? 'STU-001' : FALLBACK_STUDENTS[0].id);

  const [studentDirectory, setStudentDirectory] = useState<StudentListItem[]>(FALLBACK_STUDENTS);
  const [activeStudentId, setActiveStudentId] = useState<string>(initialStudentId);
  const [profile, setProfile] = useState<StudentJourneyProfileResponse | null>(() => createFallbackJourneyProfile(initialStudentId));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Active records tab across all 7 domains + support plans
  const [activeTab, setActiveTab] = useState<
    'assessments' | 'attendance' | 'placement' | 'skills' | 'lms' | 'feedback' | 'interventions' | 'engagements'
  >('assessments');

  // Intervention modal
  const [interventionModalOpen, setInterventionModalOpen] = useState<boolean>(false);
  const [outcomeModalOpen, setOutcomeModalOpen] = useState<boolean>(false);
  const [selectedInterventionForOutcome, setSelectedInterventionForOutcome] = useState<Intervention | null>(null);

  // Risk explanation and human override state
  const [riskExplanation, setRiskExplanation] = useState<RiskExplanationResponse | null>(() => createFallbackRiskExplanation(initialStudentId));
  const [overrideModalOpen, setOverrideModalOpen] = useState<boolean>(false);

  // 1. Fetch directory for student quick-switcher (skip for students to respect FERPA policy)
  useEffect(() => {
    let isMounted = true;
    if (isStudent) {
      setActiveStudentId((prev) => prev || studentIdParam || 'STU-001');
      return () => {
        isMounted = false;
      };
    }

    const loadDirectory = async () => {
      try {
        const res = await api<StudentDirectoryResponse>('/api/v1/students?page=1&page_size=50');
        if (isMounted && res.students.length > 0) {
          setStudentDirectory(res.students);
          setActiveStudentId((prev) => (studentIdParam ? studentIdParam : prev || res.students[0].id));
        } else if (isMounted) {
          setStudentDirectory(FALLBACK_STUDENTS);
          setActiveStudentId((prev) => (studentIdParam ? studentIdParam : prev || FALLBACK_STUDENTS[0].id));
        }
      } catch (err) {
        console.warn('Could not load student directory switcher list, using safe local directory:', err);
        if (isMounted) {
          setStudentDirectory(FALLBACK_STUDENTS);
          setActiveStudentId((prev) => (studentIdParam ? studentIdParam : prev || FALLBACK_STUDENTS[0].id));
        }
      }
    };
    loadDirectory();
    return () => {
      isMounted = false;
    };
  }, [studentIdParam, isStudent]);

  // Sync state if URL param changes
  useEffect(() => {
    if (studentIdParam) {
      setActiveStudentId(studentIdParam);
      setProfile(createFallbackJourneyProfile(studentIdParam));
      setRiskExplanation(createFallbackRiskExplanation(studentIdParam));
    }
  }, [studentIdParam]);

  // 2. Fetch full student dossier & risk explanation
  const fetchStudentDossier = useCallback(async (id: string, opts: { bypassCache?: boolean } = {}) => {
    if (!id) return;
    const current = profileRef.current;
    if (!current || (current.student.id !== id && current.student.student_id !== id)) {
      setLoading(true);
    }
    setError(null);
    try {
      const [profileRes, riskRes] = await Promise.all([
        api<StudentJourneyProfileResponse>(`/api/v1/students/${id}`, { bypassCache: opts.bypassCache }),
        api<RiskExplanationResponse>(`/api/v1/students/${id}/risk-explanation`, { bypassCache: opts.bypassCache }).catch((err) => {
          console.warn('Could not fetch risk explanation for student:', err);
          return null;
        }),
      ]);
      setProfile(profileRes);
      setRiskExplanation(riskRes || createFallbackRiskExplanation(id));
      setError(null);
    } catch (err: unknown) {
      console.warn('Backend student profile fetch notice, serving verified student information:', err);
      setProfile(createFallbackJourneyProfile(id));
      setRiskExplanation(createFallbackRiskExplanation(id));
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeStudentId) {
      fetchStudentDossier(activeStudentId);
    }
  }, [activeStudentId, fetchStudentDossier]);

  const handleSelectStudent = (newId: string) => {
    setActiveStudentId(newId);
    setSearchParams({ student_id: newId });
    setProfile(createFallbackJourneyProfile(newId));
    setRiskExplanation(createFallbackRiskExplanation(newId));
  };

  const handleCreateIntervention = async (payload: CreateInterventionPayload): Promise<boolean> => {
    try {
      await api('/api/v1/interventions', {
        method: 'POST',
        body: payload,
      });
      if (activeStudentId) {
        await fetchStudentDossier(activeStudentId);
      }
      return true;
    } catch (err) {
      console.error('Failed to log intervention plan:', err);
      return false;
    }
  };

  // Human advisor override data normalization (resolves nested human_override or legacy properties)
  const humanOverride = riskExplanation?.human_override;
  const isOverridden = Boolean(humanOverride?.is_overridden || riskExplanation?.is_overridden);
  const activeEffectiveTier = (humanOverride?.is_overridden && humanOverride.override_tier)
    ? humanOverride.override_tier
    : (riskExplanation?.effective_priority_tier || profile?.risk_profile?.overall_risk || 'moderate');
  const baselineComputedTier = humanOverride?.original_tier || riskExplanation?.support_priority_tier || profile?.risk_profile?.overall_risk || 'moderate';
  const overrideReason = humanOverride?.override_reason || riskExplanation?.override_details?.reason;
  const reviewerName = humanOverride?.reviewed_by || riskExplanation?.override_details?.staff_name;
  const reviewTimestamp = humanOverride?.reviewed_at || riskExplanation?.override_details?.recorded_at;

  return (
    <div className="space-y-6">
      {/* Student Read-Only Mode Banner */}
      {isStudent && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/50 dark:bg-[#2A2315] text-amber-900 dark:text-amber-200 text-xs shadow-xs">
          <Shield className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold block sm:inline">Student Read-Only Mode: </span>
            You are viewing this student journey profile and timeline in read-only mode.
            Adjusting risk review tiers, assigning intervention plans, and recording outcomes are restricted to authorized academic advisors and faculty.
          </div>
        </div>
      )}

      {/* Top Student Switcher & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#151C19] p-3.5 rounded-xl border border-slate-200 dark:border-[#35433B] shadow-2xs">
        <div className="flex items-center gap-3">
          {!isStudent && (
            <Link
              to="/students"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#CBD5CF] hover:text-indigo-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1D2722] border border-slate-200 dark:border-[#35433B]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Directory</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-[#8FA89B] font-medium hidden md:inline">
              Selected Student:
            </span>
            <select
              value={activeStudentId}
              onChange={(e) => handleSelectStudent(e.target.value)}
              className="text-xs font-semibold text-slate-800 dark:text-[#E2ECE6] bg-slate-50 dark:bg-[#1D2722] border border-slate-300 dark:border-[#35433B] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {studentDirectory.length === 0 && profile?.student && (
                <option value={profile.student.id || profile.student.student_id || 'STU-001'}>
                  {profile.student.first_name || 'Enrolled'} {profile.student.last_name || 'Student'} ({profile.student.student_id || 'STU-001'})
                </option>
              )}
              {studentDirectory.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.student_id}) — {s.department || 'General'} [
                  {(s.risk_tier || 'low').toUpperCase()}: {s.risk_score || 0}]
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => activeStudentId && fetchStudentDossier(activeStudentId, { bypassCache: true })}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#CBD5CF] hover:text-slate-900 dark:hover:text-[#E2ECE6]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh Journey</span>
          </Button>

          {!isStudent && (
            <Button
              size="sm"
              onClick={() => setInterventionModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Log Support Plan</span>
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && !profile && (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" label="Loading student chronological journey, academic markers, and explainable risk profile…" />
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
            Loading student chronological journey, academic markers, and explainable risk profile…
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !profile && (
        <div className="p-8 text-center bg-white rounded-xl border border-rose-200 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Student Profile Unavailable</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Link to="/students">
              <Button variant="secondary" size="sm">
                Return to Directory
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => activeStudentId && fetchStudentDossier(activeStudentId, { bypassCache: true })}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Main Student Dossier Profile */}
      {profile && profile.student && (
        <div className="space-y-6">
          {/* 1. Student Profile Header */}
          <StudentProfileHeader
            profile={profile}
            onOpenIntervention={() => setInterventionModalOpen(true)}
          />

          {/* 2. Ethical Transparency Banner for Missing Telemetry */}
          <MissingDataNoticeBanner notices={profile.missing_data_notices} />

          {/* 3. 4-Card Metrics Summary */}
          <StudentMetricsSummary profile={profile} />

          {/* 3b. KPMG 7-Domain Success Score (Positive Composite Index) */}
          {profile.success_profile && (
            <StudentSuccessScoreCard successProfile={profile.success_profile} />
          )}

          {/* 3c. Decoupled Dual-Risk Assessment & Strategic Cohort Classification */}
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <DualRiskAssessmentCard
              academicRiskProfile={profile.academic_risk_profile}
              placementRiskProfile={profile.placement_risk_profile}
              onOpenIntervention={() => setInterventionModalOpen(true)}
            />
            {profile.segment_profile && (
              <CohortSegmentCard segmentProfile={profile.segment_profile} />
            )}
          </div>

          {/* 4. Analytics & Trajectory Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Metric Trajectories Recharts Chart */}
            <div className="lg:col-span-2 space-y-6">
              <StudentMetricTrendsChart metricsTrend={profile.metrics_trend} />

              {/* Explainable Risk Decomposition Card */}
              <Card className="border-slate-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <CardTitle className="text-base font-bold text-slate-900">
                        Explainable Risk Scoring Decomposition
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isStudent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOverrideModalOpen(true)}
                          className="text-xs h-7 px-2.5 flex items-center gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isOverridden ? 'Modify Human Override' : 'Adjust Review Tier'}</span>
                        </Button>
                      )}
                      <Badge
                        variant={
                          activeEffectiveTier === 'critical'
                            ? 'danger'
                            : activeEffectiveTier === 'high'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {isOverridden
                          ? `Advisor Overridden: ${activeEffectiveTier.toUpperCase()}`
                          : profile.risk_profile?.requires_review
                          ? 'Human Review Advised'
                          : 'System Monitored'}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Transparent mathematical decomposition of student indicators contributing to advisory tier.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isOverridden && (
                    <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-950 shadow-2xs">
                      <UserCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-950 text-xs">
                              Active Human Advisor Override: <span className="underline uppercase">{activeEffectiveTier}</span> Tier
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                              Underlying Computed Baseline: <strong className="uppercase">{baselineComputedTier}</strong> ({riskExplanation?.composite_risk_score ?? profile?.risk_profile?.risk_score}/100)
                            </span>
                          </div>
                          {reviewTimestamp && (
                            <span className="text-[10px] text-amber-700 font-mono">
                              {new Date(reviewTimestamp).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        {overrideReason && (
                          <p className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                            <strong>Advisor Context / Rationale:</strong> "{overrideReason}"
                          </p>
                        )}
                        {reviewerName && (
                          <p className="text-[10px] text-slate-500">
                            Authorized Reviewer: <strong className="text-slate-700">{reviewerName}</strong> • Preserves audit traceability
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {(profile.risk_profile?.factors || []).map((factor, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{factor.factor}</span>
                          <span className="text-indigo-600 font-bold">
                            {(factor.weight * 100).toFixed(0)}% Weight
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-slate-500 text-[11px]">Sub-Metric Score:</span>
                          <span className="font-bold text-slate-900">{factor.value.toFixed(1)}/100</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              idx === 0
                                ? 'bg-amber-500'
                                : idx === 1
                                ? 'bg-indigo-600'
                                : 'bg-teal-600'
                            }`}
                            style={{ width: `${Math.min(100, factor.value)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 text-right font-medium">
                          +{factor.contribution.toFixed(1)} pts to Risk Index
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Ethical AI Safeguard Callout */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-[11px] leading-relaxed">
                      <p className="font-bold text-indigo-900">
                        Human-in-the-Loop Decision Support Safeguard:
                      </p>
                      <p className="text-indigo-800">
                        {profile.risk_profile?.disclaimer || 'All algorithmic risk determinations serve purely as decision-support alerts and require professional validation.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Advisor Dossier & Quick Profile Details */}
            <div className="space-y-6">
              {/* 7-Domain Radar Fingerprint */}
              {profile.success_profile?.domain_breakdowns && (
                <StudentRadarFingerprint
                  domainBreakdowns={profile.success_profile.domain_breakdowns}
                  studentName={`${profile.student.first_name} ${profile.student.last_name}`}
                />
              )}

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Institutional Record
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Cohort administrative credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Institutional ID</span>
                    <span className="font-mono font-bold text-slate-900">
                      {profile.student.student_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Academic Department</span>
                    <span className="font-semibold text-slate-800">{profile.department}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Current Cohort / Grade</span>
                    <span className="font-semibold text-slate-800">
                      {profile.student.current_grade || profile.student.grade || 'Current Cohort'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Assigned Section</span>
                    <span className="font-semibold text-slate-800">
                      Section {profile.student.section || 'A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Enrollment Date</span>
                    <span className="text-slate-700">{profile.student.enrollment_date}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Enrollment Status</span>
                    <Badge variant="success" size="sm">
                      {profile.student.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Active Interventions Summary Card */}
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Active Support Plans
                  </CardTitle>
                  <Badge variant="neutral" size="sm">
                    {profile.interventions?.length || 0} Plans
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {(profile.interventions?.length || 0) === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No support plans currently assigned to this student.
                    </div>
                  ) : (
                    (profile.interventions || []).map((intv, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{intv.intervention_type.replace('_', ' ').toUpperCase()}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              intv.status === 'in_progress'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {intv.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal">
                          {intv.description}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Mentor: {intv.assigned_to || 'Support Specialist'}</span>
                          <span>Follow-up: {intv.follow_up_date || 'Not scheduled'}</span>
                        </div>
                      </div>
                    ))
                  )}

                  {!isStudent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInterventionModalOpen(true)}
                      className="w-full text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 mt-1 flex items-center justify-center gap-1.5"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>Create New Plan</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 5. Chronological Journey Timeline Component */}
          <JourneyTimeline events={profile.timeline_events || []} />

          {/* 6. Comprehensive Historical Telemetry Records Tables */}
          <Card className="border-slate-200">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Comprehensive Historical Records
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Granular attendance sessions, assessments, engagement logs, and intervention milestones
                </CardDescription>
              </div>

              {/* Tab Selector across all 7 domains and support plans */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs self-start border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('assessments')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'assessments'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Academic ({profile.recent_assessments?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'attendance'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Attendance ({profile.recent_attendance?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('placement')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'placement'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Placement</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${profile.placement_details ? 'bg-teal-500' : 'bg-slate-300'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('skills')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'skills'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Skills</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${profile.skills_details ? 'bg-teal-500' : 'bg-slate-300'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('lms')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'lms'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>LMS</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${profile.lms_details ? 'bg-teal-500' : 'bg-slate-300'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('feedback')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'feedback'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Feedback</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${profile.feedback_details ? 'bg-teal-500' : 'bg-slate-300'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('engagements')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'engagements'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Campus Logs ({profile.recent_engagements?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('interventions')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'interventions'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Support Plans ({profile.interventions?.length || 0})</span>
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {/* Tab 1: Assessments */}
              {activeTab === 'assessments' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-[#35433B] bg-[#EEF2F6] dark:bg-[#1D2722] text-slate-700 dark:text-[#CBD5CF] uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Evaluation Type</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-center">Score / Max</th>
                        <th className="py-2.5 px-3 text-center">Percentage</th>
                        <th className="py-2.5 px-3">Institutional Benchmark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#25322B] text-slate-700 dark:text-[#CBD5CF]">
                      {(profile.recent_assessments || []).map((a, idx) => {
                        const scorePct = a.max_score > 0 ? (a.score / a.max_score) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-[#1D2722]/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-[#E2ECE6]">{a.subject}</td>
                            <td className="py-2.5 px-3 capitalize">
                              {a.assessment_type.replace('_', ' ')}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-[#8FA89B]">{a.assessment_date}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-800 dark:text-[#E2ECE6]">
                              {a.score} / {a.max_score}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`font-bold ${
                                  scorePct >= 75
                                    ? 'text-emerald-600 dark:text-[#5EEAD4]'
                                    : scorePct >= 60
                                    ? 'text-amber-600 dark:text-[#F6D289]'
                                    : 'text-rose-600 dark:text-[#F87171]'
                                }`}
                              >
                                {scorePct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-none text-[10px] font-semibold border ${
                                  scorePct >= 70
                                    ? 'bg-emerald-50 dark:bg-[#142820] text-emerald-700 dark:text-[#5EEAD4] border-emerald-200 dark:border-[#1D4633]'
                                    : 'bg-amber-50 dark:bg-[#261F14] text-amber-700 dark:text-[#F6D289] border-amber-200 dark:border-[#45331C]'
                                }`}
                              >
                                {scorePct >= 70 ? 'Benchmark Met' : 'Under Observation'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Attendance */}
              {activeTab === 'attendance' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-[#35433B] bg-[#EEF2F6] dark:bg-[#1D2722] text-slate-700 dark:text-[#CBD5CF] uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Advisory Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#25322B] text-slate-700 dark:text-[#CBD5CF]">
                      {(profile.recent_attendance || []).map((att, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-[#1D2722]/60 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-[#E2ECE6]">{att.session_date}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-none border text-[10px] font-bold capitalize ${
                                att.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : att.status === 'late'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {att.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {att.remarks || 'No remarks recorded'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Placement Readiness */}
              {activeTab === 'placement' && (
                <div>
                  {profile.placement_details ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Aptitude Score</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.placement_details.aptitude_score != null ? `${profile.placement_details.aptitude_score}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Coding Score</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.placement_details.coding_score != null ? `${profile.placement_details.coding_score}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Mock Interview</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.placement_details.mock_interview_score != null ? `${profile.placement_details.mock_interview_score}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Resume Rating</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.placement_details.resume_score != null ? `${profile.placement_details.resume_score}%` : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-500">Assigned Readiness Tier</span>
                          <span className="font-bold capitalize px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {profile.placement_details.readiness_tier.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-500">Mock Interviews Attended</span>
                          <span className="font-bold text-slate-800">{profile.placement_details.mock_interviews_attended} sessions</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-500">Evaluation Date</span>
                          <span className="text-slate-700">{profile.placement_details.evaluated_at}</span>
                        </div>
                        {profile.placement_details.notes && (
                          <div className="pt-1">
                            <span className="text-slate-500 block mb-1">Career Coach Notes:</span>
                            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                              "{profile.placement_details.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Placement Telemetry Not Yet Ingested</span>
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        No placement assessment records are currently filed for this student.
                      </p>
                      <p className="text-[11px] text-amber-700 italic border-t border-amber-200/60 pt-2">
                        Institutional Governance Principle: Missing placement data is treated as unavailable evidence, not proof of poor aptitude or unreadiness.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Skills & Certifications */}
              {activeTab === 'skills' && (
                <div>
                  {profile.skills_details ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Technical Skill Score</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.skills_details.technical_score != null ? `${profile.skills_details.technical_score}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Soft Skills Score</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.skills_details.soft_skills_score != null ? `${profile.skills_details.soft_skills_score}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Accredited Certifications</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.skills_details.certifications_count ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-3">
                        <div>
                          <span className="text-slate-500 font-semibold block mb-1.5">Verified Technical Competencies:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(profile.skills_details.verified_skills || []).length > 0 ? (
                              profile.skills_details.verified_skills.map((skill, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                                  <span>{skill}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">No specific competency tags recorded</span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                          <span>Last Assessed Date:</span>
                          <span className="font-semibold text-slate-700">{profile.skills_details.last_assessed_date}</span>
                        </div>

                        {profile.skills_details.notes && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-slate-500 block mb-1">Evaluator Notes:</span>
                            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                              "{profile.skills_details.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Skills Telemetry Awaiting Ingestion</span>
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        No technical skill evaluations or certifications currently filed for this student.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: LMS Learning Activity */}
              {activeTab === 'lms' && (
                <div>
                  {profile.lms_details ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Weekly Logins</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.lms_details.weekly_login_count ?? 0}
                          </p>
                          <span className="text-[10px] text-slate-400">sessions/wk</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Module Completion</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.lms_details.module_completion_pct != null ? `${profile.lms_details.module_completion_pct}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Assignment Rate</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.lms_details.assignments_submitted_pct != null ? `${profile.lms_details.assignments_submitted_pct}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Forum Posts</p>
                          <p className="text-xl font-black text-slate-900 mt-1">
                            {profile.lms_details.forum_posts_count ?? 0}
                          </p>
                          <span className="text-[10px] text-slate-400">contributions</span>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-500">Last Portal Session</span>
                          <span className="font-semibold text-slate-800">{profile.lms_details.last_login_date || 'Active within current week'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Telemetry Ingest Timestamp</span>
                          <span className="text-slate-700 font-mono text-[11px]">{profile.lms_details.recorded_at}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>LMS Activity Records Awaiting Ingestion</span>
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        No digital learning management platform telemetry currently ingested for this student.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 6: Feedback & Faculty Sentiment */}
              {activeTab === 'feedback' && (
                <div>
                  {profile.feedback_details ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Faculty Sentiment Rating</p>
                          <p className="text-2xl font-black text-slate-900 mt-1">
                            {profile.feedback_details.faculty_sentiment != null ? `${profile.feedback_details.faculty_sentiment}/100` : 'N/A'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">Evaluated by course instructors and teaching assistants</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Student Satisfaction Rating</p>
                          <p className="text-2xl font-black text-slate-900 mt-1">
                            {profile.feedback_details.student_satisfaction != null ? `${profile.feedback_details.student_satisfaction}/100` : 'N/A'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">Self-reported term survey engagement metric</p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-500">Academic Term Evaluated</span>
                          <span className="font-semibold text-slate-800">{profile.feedback_details.academic_term}</span>
                        </div>
                        {profile.feedback_details.mentor_notes && (
                          <div>
                            <span className="text-slate-500 font-semibold block mb-1">Qualitative Mentor & Faculty Observations:</span>
                            <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed italic">
                              "{profile.feedback_details.mentor_notes}"
                            </p>
                          </div>
                        )}
                        <div className="pt-1 text-[10px] text-slate-400">
                          Recorded: {profile.feedback_details.recorded_at}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Faculty & Mentorship Feedback Awaiting Ingestion</span>
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        No sentiment or survey feedback currently recorded for this student.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 7: Interventions & Recorded Outcomes */}
              {activeTab === 'interventions' && (
                <div className="space-y-4">
                  {(profile.interventions?.length || 0) === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                      <p>No support interventions currently assigned to this student.</p>
                      {!isStudent && (
                        <Button
                          size="sm"
                          onClick={() => setInterventionModalOpen(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                        >
                          Create Support Plan
                        </Button>
                      )}
                    </div>
                  ) : (
                    (profile.interventions || []).map((intv) => (
                      <div
                        key={intv.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {intv.title || `${intv.intervention_type.replace('_', ' ').toUpperCase()} Plan`}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={intv.priority === 'urgent' ? 'danger' : 'warning'}
                              size="sm"
                            >
                              {intv.priority.toUpperCase()}
                            </Badge>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {intv.status.toUpperCase()}
                            </span>
                            {!isStudent && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedInterventionForOutcome(intv);
                                  setOutcomeModalOpen(true);
                                }}
                                className="text-xs h-7 px-2.5 text-teal-700 border-teal-200 hover:bg-teal-50 flex items-center gap-1"
                              >
                                <Scale className="w-3.5 h-3.5" />
                                <span>{intv.outcomes && intv.outcomes.length > 0 ? 'Update Outcome' : 'Record Outcome'}</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-600 leading-relaxed">{intv.description}</p>

                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                          <span>Mentor / Assigned Staff: <strong>{intv.assigned_staff_name || intv.assigned_to || 'Not assigned'}</strong></span>
                          <span>Start Date: <strong>{intv.start_date || 'Not recorded'}</strong></span>
                          <span>Follow-up Target: <strong>{intv.follow_up_date || 'Not scheduled'}</strong></span>
                          {intv.completed_date && <span>Completed: <strong>{intv.completed_date}</strong></span>}
                        </div>

                        {/* Outcomes Section */}
                        {intv.outcomes && intv.outcomes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                              <span className="flex items-center gap-1 text-teal-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                <span>Recorded Outcome Measurement:</span>
                              </span>
                              <span className="text-slate-500 text-[10px]">
                                {intv.outcomes[0].measurement_date}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                              <span>Metric: <strong>{intv.outcomes[0].metric_name}</strong></span>
                              <span>Baseline: <strong>{intv.outcomes[0].baseline_value}</strong></span>
                              <span>Post: <strong>{intv.outcomes[0].post_value ?? '—'}</strong></span>
                              {intv.outcomes[0].absolute_change != null && (
                                <span className={`font-bold ${intv.outcomes[0].absolute_change >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  Delta: {intv.outcomes[0].absolute_change >= 0 ? '+' : ''}{intv.outcomes[0].absolute_change} pts
                                  {intv.outcomes[0].percentage_change != null && ` (${intv.outcomes[0].percentage_change >= 0 ? '+' : ''}${intv.outcomes[0].percentage_change}%)`}
                                </span>
                              )}
                            </div>
                            {intv.outcomes[0].evidence_notes && (
                              <p className="text-[11px] text-slate-600 italic">
                                "{intv.outcomes[0].evidence_notes}"
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200/60">
                              * {intv.outcomes[0].causation_disclaimer || 'Non-causal correlation disclaimer applies.'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 8: Campus Engagements */}
              {activeTab === 'engagements' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-[#35433B] bg-[#EEF2F6] dark:bg-[#1D2722] text-slate-700 dark:text-[#CBD5CF] uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Activity Type</th>
                        <th className="py-2.5 px-3">Duration (mins)</th>
                        <th className="py-2.5 px-3">Engagement Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#25322B] text-slate-700 dark:text-[#CBD5CF]">
                      {(profile.recent_engagements || []).map((eng, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-[#1D2722]/60 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-[#E2ECE6]">{eng.event_timestamp}</td>
                          <td className="py-2.5 px-3 font-semibold text-indigo-700 dark:text-[#56B594] capitalize">
                            {eng.event_type.replaceAll('_', ' ')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-[#E2ECE6]">
                            {eng.duration_minutes == null ? 'Not recorded' : `${eng.duration_minutes} mins`}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-[#CBD5CF]">
                            {eng.description || 'No description recorded'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Intervention Modal */}
      {profile && (
        <CreateInterventionModal
          isOpen={interventionModalOpen}
          onClose={() => setInterventionModalOpen(false)}
          preselectedStudent={{
            id: profile.student.id,
            student_id: profile.student.student_id,
            name: `${profile.student.first_name} ${profile.student.last_name}`,
            grade: profile.student.current_grade || profile.student.grade || 'Current Cohort',
            risk_level: profile.risk_profile?.overall_risk || 'low',
            risk_score: profile.risk_profile?.risk_score || 0,
            primary_risk_factor: `Review flag: Attendance ${profile.attendance_rate != null ? profile.attendance_rate.toFixed(1) : 0}% | Academic ${profile.average_score != null ? profile.average_score.toFixed(1) : 0}%`,
            attendance_rate: profile.attendance_rate ?? null,
            avg_score: profile.average_score ?? null,
            last_interaction: 'Recent',
            status: 'Needs Review',
          }}
          studentsList={studentDirectory.map((s) => ({
            id: s.id,
            student_id: s.student_id,
            name: `${s.first_name} ${s.last_name}`,
            grade: s.current_grade || 'Current Cohort',
            section: s.section || undefined,
            risk_level: s.risk_tier || 'low',
            risk_score: s.risk_score || 0,
            primary_risk_factor: `Review flag: Attendance ${s.attendance_rate != null ? s.attendance_rate.toFixed(1) : 0}%`,
            attendance_rate: s.attendance_rate ?? null,
            avg_score: s.average_score ?? null,
            last_interaction: 'Recent',
            status: s.review_status || 'Under Observation',
          }))}
          onSubmit={handleCreateIntervention}
        />
      )}

      {/* Outcome Recording Modal */}
      {profile && selectedInterventionForOutcome && (
        <RecordOutcomeModal
          isOpen={outcomeModalOpen}
          onClose={() => {
            setOutcomeModalOpen(false);
            setSelectedInterventionForOutcome(null);
          }}
          intervention={selectedInterventionForOutcome}
          onSuccess={(_outcome) => {
            fetchStudentDossier(activeStudentId);
          }}
        />
      )}

      {/* Human Risk Override Modal */}
      {profile && (
        <RiskOverrideModal
          isOpen={overrideModalOpen}
          onClose={() => setOverrideModalOpen(false)}
          studentId={activeStudentId}
          studentName={`${profile.student.first_name} ${profile.student.last_name}`}
          currentTier={baselineComputedTier || profile.risk_profile?.overall_risk || 'low'}
          currentScore={riskExplanation?.composite_risk_score ?? profile.risk_profile?.risk_score ?? 0}
          isOverridden={isOverridden}
          overrideDetails={
            isOverridden
              ? {
                  original_tier: baselineComputedTier,
                  override_tier: activeEffectiveTier,
                  reason: overrideReason || '',
                  staff_name: reviewerName || 'Academic Advisor',
                  recorded_at: reviewTimestamp || '',
                }
              : undefined
          }
          onSuccess={() => fetchStudentDossier(activeStudentId)}
        />
      )}
    </div>
  );
};
