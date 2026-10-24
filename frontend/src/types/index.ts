// EduNexus AI — TypeScript interfaces

export interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  grade?: string;
  current_grade?: string;
  academic_term?: string;
  section?: string;
  department?: string;
  cgpa?: number | null;
  backlogs?: number | null;
  gender?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
  advisor_id?: string | null;
  user_id?: string | null;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred' | 'withdrawn' | 'suspended' | 'on_leave';
  created_at?: string;
  updated_at?: string;
  // Computed
  attendance_rate?: number | null;
  avg_score?: number | null;
  risk_level?: RiskLevel;
}

export type RiskLevel = 'insufficient_data' | 'low' | 'moderate' | 'medium' | 'high' | 'critical';

export interface StudentDetail extends Student {
  attendance: AttendanceRecord[];
  assessments: AssessmentRecord[];
  engagements: EngagementRecord[];
  risk: RiskScore | null;
  interventions: Intervention[];
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  remarks?: string;
  session_date: string;
  date?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  created_at?: string;
}

export interface AssessmentRecord {
  id: string;
  student_id: string;
  subject: string;
  assessment_type: string;
  score: number;
  max_score: number;
  assessment_date: string;
  date?: string;
  created_at?: string;
}

export interface EngagementRecord {
  id: string;
  student_id: string;
  event_type: string;
  title: string;
  event_timestamp: string;
  activity_type?: string;
  description?: string;
  duration_minutes?: number;
  date?: string;
  created_at?: string;
}

export interface RiskFactor {
  factor: string;
  detail: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface RiskScore {
  id: string;
  student_id: string;
  overall_risk: RiskLevel;
  risk_score: number | null;
  attendance_factor?: number;
  academic_factor?: number;
  engagement_factor?: number;
  explanation: RiskFactor[];
  computed_at?: string;
  requires_review: boolean;
}

export interface Intervention {
  id: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  title?: string;
  intervention_type: string;
  assigned_staff_name?: string;
  type?: string;
  description: string;
  assigned_to?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  follow_up_date?: string;
  completed_date?: string;
  notes?: string;
  is_overdue?: boolean;
  created_at?: string;
  updated_at?: string;
  outcomes?: Outcome[];
}

export interface Outcome {
  id: string;
  intervention_id: string;
  metric_name: string;
  baseline_value: number;
  post_value?: number;
  target_value?: number;
  outcome_status?: 'improved' | 'unchanged' | 'declined' | 'evaluating';
  measurement_date: string;
  absolute_change?: number;
  percentage_change?: number;
  interpretation?: string;
  evidence_notes?: string;
  causation_disclaimer: string;
  recorded_by?: string;
  created_at?: string;
  updated_at?: string;
  // Aliases for backwards compatibility
  baseline_metric_value?: number;
  follow_up_metric_value?: number;
  notes?: string;
}

export interface OverviewStats {
  total_students: number;
  active_students: number;
  average_attendance: number | null;
  at_risk_count: number;
  pending_interventions: number;
  risk_distribution: Record<RiskLevel, number>;
}

export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

export interface StudentListResponse {
  students: Student[];
  total: number;
  page: number;
  page_size: number;
}

export interface CsvRowError {
  line: number;
  column?: string;
  message: string;
  raw_value?: string;
}

export interface CsvPreviewResponse {
  file_name: string;
  data_type: string;
  total_rows: number;
  valid_rows: number;
  failed_rows: number;
  can_import: boolean;
  errors: CsvRowError[];
  sample_data: Record<string, string>[];
}

export interface CsvImportResult {
  status: string;
  imported: number;
  skipped: number;
  inserted: number;
  updated: number;
  rejected: number;
  storage_mode: string;
  message: string;
  total_processed: number;
  errors: CsvRowError[];
}

export interface RiskOverridePayload {
  override_tier: 'low' | 'moderate' | 'high' | 'critical';
  reason: string;
  staff_id?: string;
  staff_name?: string;
  reviewed_by?: string;
}

export interface HumanOverrideRecord {
  is_overridden: boolean;
  original_tier: RiskLevel;
  override_tier?: 'low' | 'moderate' | 'high' | 'critical';
  override_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface RiskFactorDetail {
  factor_name: string;
  measured_value: number | null;
  benchmark_value: number;
  sub_metric_score: number;
  weight: number;
  contribution_points: number;
  status: string;
  explanation: string;
}

export interface DataFreshnessNotice {
  category: string;
  latest_recorded_date?: string | null;
  total_records: number;
  freshness_status: string;
  notes: string;
}

export interface RiskFactorItem {
  name: string;
  value: number;
  benchmark: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface RiskExplanationResponse {
  student_id: string;
  composite_risk_score: number | null;
  support_priority_tier: RiskLevel;
  effective_priority_tier: RiskLevel;
  requires_human_review: boolean;
  contributing_factors: RiskFactorDetail[];
  data_freshness: DataFreshnessNotice[];
  missing_data_warnings: string[];
  recent_decline_flags: {
    attendance_decline: boolean;
    academic_decline: boolean;
  };
  human_override: HumanOverrideRecord;
  computed_at: string;
  decision_support_disclaimer: string;
  // Backward compatibility convenience accessors
  is_overridden?: boolean;
  override_details?: {
    original_tier: string;
    override_tier: string;
    reason: string;
    staff_name: string;
    recorded_at: string;
  };
  student_code?: string;
  student_name?: string;
  risk_score?: number | null;
  risk_tier?: string;
  requires_review?: boolean;
  factors?: RiskFactorItem[];
  missing_data_notices?: Array<{ category: string; message: string }>;
  disclaimer?: string;
}

// Stage 3 Executive Dashboard Analytics Interfaces
export interface KPISummary {
  total_students: number;
  active_students: number;
  requiring_review_count: number;
  review_percentage: number;
  average_attendance: number | null;
  attendance_status: string;
  active_interventions_count: number;
  follow_ups_due_count: number;
  cohort_avg_score: number | null;
  average_success_score: number | null;
}

export interface AttendanceTrendPoint {
  period: string;
  attendance_rate: number | null;
  threshold: number;
  total_sessions: number;
  present_sessions: number;
}

export interface AssessmentTrendPoint {
  period: string;
  average_score: number | null;
  subjects: Record<string, number>;
}

export interface RiskDistributionTier {
  tier: RiskLevel | string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
}

export interface RecentActivityItem {
  id: string;
  student_id: string;
  student_name: string;
  activity_type: 'attendance' | 'assessment' | 'engagement' | 'intervention';
  title: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
}

export interface FollowUpStudentItem {
  id: string;
  student_id: string;
  name: string;
  grade: string;
  section?: string;
  risk_level: RiskLevel;
  risk_score: number | null;
  primary_risk_factor: string;
  attendance_rate: number | null;
  avg_score: number | null;
  last_interaction: string;
  assigned_advisor?: string;
  status: string;
}

export interface InterventionStatusBreakdown {
  total: number;
  planned: number;
  in_progress: number;
  under_review: number;
  completed: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  completion_rate: number;
  upcoming_follow_ups: number;
}

export interface DashboardMetadata {
  is_demo: boolean;
  data_source: string;
  dataset_size: number;
  generated_at: string;
  disclaimer: string;
}

export interface DashboardOverviewResponse {
  summary: KPISummary;
  attendance_trend: AttendanceTrendPoint[];
  assessment_trend: AssessmentTrendPoint[];
  risk_distribution: RiskDistributionTier[];
  recent_activity: RecentActivityItem[];
  follow_up_students: FollowUpStudentItem[];
  intervention_summary: InterventionStatusBreakdown;
  metadata: DashboardMetadata;
  // KPMG 7-Domain Analytics
  domain_averages?: Record<string, number | null>;
  domain_coverage: Record<string, number>;
  academic_risk_distribution: RiskDistributionTier[];
  placement_risk_distribution: RiskDistributionTier[];
  cohort_comparisons: Array<{department: string; count: number; average_success_score: number | null; average_attendance: number | null; average_assessment: number | null}>;
  placement_readiness_summary?: {
    average_aptitude: number | null;
    average_coding: number | null;
    average_mock_interview: number | null;
    tier_distribution: Record<string, number>;
  };
  segmentation_distribution?: Array<{
    segment_id: string;
    label: string;
    count: number;
    percentage: number;
    badge_color: string;
    tagline: string;
    description: string;
    recommended_action: string;
  }>;
  dual_risk_matrix?: Record<string, number>;
}

export interface CreateInterventionPayload {
  student_id: string;
  title: string;
  description: string;
  intervention_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string;
  target_completion_date?: string;
  assigned_staff_name?: string;
  notes?: string;
}

// Stage 4 Students Directory & Student Journey Interfaces
export type TrendDirection = 'improving' | 'stable' | 'declining';
export type TimelineEventType = 'attendance' | 'academic' | 'intervention' | 'milestone' | 'engagement';

export interface StudentListItem {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  current_grade: string;
  academic_term: string;
  section?: string;
  department?: string;
  status: 'active' | 'inactive' | 'graduated' | 'withdrawn' | 'suspended' | 'on_leave';
  attendance_rate?: number | null;
  average_score?: number | null;
  latest_assessment_percentage?: number | null;
  trend?: TrendDirection;
  review_status?: string;
  risk_tier?: RiskLevel;
  risk_score?: number | null;
  active_interventions_count?: number;
  // KPMG 7-Domain & Dual-Risk Extensions
  success_score?: number | null;
  success_tier?: 'thriving' | 'proficient' | 'developing' | 'needs_support';
  academic_risk_tier?: RiskLevel;
  placement_risk_tier?: RiskLevel;
  segment_id?: string;
  segment_label?: string;
  segment_badge_color?: string;
}

export interface StudentDirectoryResponse {
  students: StudentListItem[];
  total: number;
  page: number;
  page_size: number;
  departments: string[];
  semesters: string[];
  segments?: string[];
}

export interface JourneyTimelineEvent {
  id: string;
  date: string;
  event_type: TimelineEventType;
  title: string;
  description: string;
  metric_badge?: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  is_data_gap?: boolean;
  gap_reason?: string;
}

export interface MissingDataNotice {
  category: string;
  metric: string;
  status: string;
  message: string;
  impact_on_scoring: string;
}

// KPMG 7-Domain Specific Schemas
export interface DomainScoreBreakdown {
  domain: string;
  raw_score: number | null;
  assigned_weight: number;
  normalized_weight: number;
  weighted_contribution: number;
  telemetry_summary: Record<string, any>;
  is_missing: boolean;
}

export interface SuccessScoreProfile {
  student_id: string;
  success_score: number | null;
  success_tier: 'thriving' | 'proficient' | 'developing' | 'needs_support' | null;
  data_coverage_pct: number;
  available_domains_count: number;
  status: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT_DATA';
  missing_domains: string[];
  domain_breakdowns: DomainScoreBreakdown[];
  missing_data_notice?: string | null;
}

export interface DualRiskFactor {
  metric: string;
  observed_value: any;
  threshold: any;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
}

export interface IndependentRiskSignal {
  risk_type: 'academic' | 'placement';
  tier: RiskLevel;
  score: number | null;
  is_critical_flag: boolean;
  contributing_factors: DualRiskFactor[];
  recommendation: string;
}

export interface StudentSegmentProfile {
  segment_id: string;
  segment_label: string;
  tagline: string;
  badge_color: string;
  description: string;
  recommended_action: string;
  action_type: 'mentorship' | 'placement_bootcamp' | 'academic_tutoring' | 'urgent_counseling' | 'skill_expansion';
}

export interface PlacementRecord {
  id: string;
  student_id: string;
  aptitude_score: number;
  coding_score: number;
  mock_interview_score: number;
  resume_score: number;
  readiness_tier: 'not_ready' | 'developing' | 'placement_ready' | 'advanced_hire';
  mock_interviews_attended: number;
  evaluated_at: string;
  notes?: string;
}

export interface SkillsRecord {
  id: string;
  student_id: string;
  technical_score: number;
  soft_skills_score: number;
  certifications_count: number;
  verified_skills: string[];
  last_assessed_date: string;
  notes?: string;
}

export interface FeedbackRecord {
  id: string;
  student_id: string;
  faculty_sentiment: number;
  student_satisfaction: number;
  mentor_notes?: string;
  academic_term: string;
  recorded_at: string;
}

export interface LMSActivityRecord {
  id: string;
  student_id: string;
  weekly_login_count: number;
  module_completion_pct: number;
  assignments_submitted_pct: number;
  forum_posts_count: number;
  last_login_date?: string;
  recorded_at: string;
}

export interface StudentJourneyProfileResponse {
  student: Student;
  department: string;
  attendance_rate: number | null;
  average_score: number | null;
  latest_assessment_percentage?: number | null;
  trend: TrendDirection;
  review_status: string;
  risk_profile: {
    overall_risk: RiskLevel;
    risk_score: number | null;
    factors: Array<{
      factor: string;
      value: number;
      weight: number;
      contribution: number;
    }>;
    requires_review: boolean;
    disclaimer: string;
  };
  missing_data_notices: MissingDataNotice[];
  recent_attendance: AttendanceRecord[];
  recent_assessments: AssessmentRecord[];
  recent_engagements: EngagementRecord[];
  interventions: Intervention[];
  timeline_events: JourneyTimelineEvent[];
  metrics_trend: Array<{
    period: string;
    attendance: number;
    score: number;
  }>;
  // KPMG 7-Domain Extensions
  success_profile?: SuccessScoreProfile;
  academic_risk_profile?: IndependentRiskSignal;
  placement_risk_profile?: IndependentRiskSignal;
  segment_profile?: StudentSegmentProfile;
  placement_details?: PlacementRecord;
  skills_details?: SkillsRecord;
  feedback_details?: FeedbackRecord;
  lms_details?: LMSActivityRecord;
}



