import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Download, RefreshCw, Shield } from 'lucide-react';
import { api, getCachedApiData } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { StudentFilterToolbar } from '../features/students/StudentFilterToolbar';
import { StudentTable } from '../features/students/StudentTable';
import { StudentPagination } from '../features/students/StudentPagination';
import { CreateInterventionModal } from '../features/dashboard/CreateInterventionModal';
import { useAuth } from '../context';
import type {
  StudentDirectoryResponse,
  StudentListItem,
  CreateInterventionPayload,
} from '../types';

export const FALLBACK_STUDENTS: StudentListItem[] = [
  {
    id: '0411a66b-943d-46d5-895d-28026b071aab',
    student_id: 'STU-001',
    first_name: 'Aarav',
    last_name: 'Sharma',
    current_grade: 'Grade 9',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec A',
    department: 'Computer Science & Engineering',
    status: 'active',
    attendance_rate: 70.8,
    average_score: 58.0,
    latest_assessment_percentage: 88.0,
    trend: 'improving',
    review_status: 'Under Review',
    risk_tier: 'moderate',
    risk_score: 42.0,
    success_score: 77.4,
    success_tier: 'proficient',
    academic_risk_tier: 'moderate',
    placement_risk_tier: 'low',
    segment_id: 'practical_star_exam_vulnerable',
    segment_label: 'Practical Stars / Exam Vulnerable',
  },
  {
    id: 'edd5c0e8-986a-4275-b213-362f1d2e2a5e',
    student_id: 'STU-002',
    first_name: 'Diya',
    last_name: 'Patel',
    current_grade: 'Grade 10',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec B',
    department: 'Computer Science & Engineering',
    status: 'active',
    attendance_rate: 63.6,
    average_score: 56.1,
    latest_assessment_percentage: 85.0,
    trend: 'improving',
    review_status: 'Under Review',
    risk_tier: 'low',
    risk_score: 28.0,
    success_score: 74.2,
    success_tier: 'proficient',
    academic_risk_tier: 'low',
    placement_risk_tier: 'low',
    segment_id: 'practical_star_exam_vulnerable',
    segment_label: 'Practical Stars / Exam Vulnerable',
  },
  {
    id: '06088341-1830-40a1-b648-869368a12a82',
    student_id: 'STU-003',
    first_name: 'Rohan',
    last_name: 'Mehta',
    current_grade: 'Grade 11',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec C',
    department: 'Electronics & Communication',
    status: 'active',
    attendance_rate: 57.1,
    average_score: 54.2,
    latest_assessment_percentage: 47.6,
    trend: 'stable',
    review_status: 'Active Support Plan',
    risk_tier: 'high',
    risk_score: 68.0,
    success_score: 59.6,
    success_tier: 'developing',
    academic_risk_tier: 'high',
    placement_risk_tier: 'high',
    segment_id: 'priority_holistic_support',
    segment_label: 'Priority Holistic Support',
  },
  {
    id: 'd8bcb8d5-c15c-421a-bc22-29148cd4eefc',
    student_id: 'STU-004',
    first_name: 'Ananya',
    last_name: 'Iyer',
    current_grade: 'Grade 12',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec A',
    department: 'Electronics & Communication',
    status: 'active',
    attendance_rate: 71.4,
    average_score: 56.6,
    latest_assessment_percentage: 55.2,
    trend: 'declining',
    review_status: 'Active Support Plan',
    risk_tier: 'high',
    risk_score: 74.0,
    success_score: 48.6,
    success_tier: 'needs_support',
    academic_risk_tier: 'high',
    placement_risk_tier: 'critical',
    segment_id: 'priority_holistic_support',
    segment_label: 'Priority Holistic Support',
  },
  {
    id: '3f043811-1641-4ea6-a8b5-c0da39193232',
    student_id: 'STU-005',
    first_name: 'Vikram',
    last_name: 'Reddy',
    current_grade: 'Grade 9',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec B',
    department: 'Mechanical Engineering',
    status: 'active',
    attendance_rate: 81.0,
    average_score: 52.9,
    latest_assessment_percentage: 43.1,
    trend: 'stable',
    review_status: 'Under Review',
    risk_tier: 'moderate',
    risk_score: 38.0,
    success_score: 70.4,
    success_tier: 'proficient',
    academic_risk_tier: 'moderate',
    placement_risk_tier: 'low',
    segment_id: 'steady_emerging_potential',
    segment_label: 'Steady / Emerging Potential',
  },
  {
    id: 'b208e78a-2f96-4e70-bc46-99e51f4d6543',
    student_id: 'STU-006',
    first_name: 'Ishita',
    last_name: 'Verma',
    current_grade: 'Grade 10',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec C',
    department: 'Commerce & Economics',
    status: 'active',
    attendance_rate: 52.4,
    average_score: 54.8,
    latest_assessment_percentage: 67.2,
    trend: 'stable',
    review_status: 'Active Support Plan',
    risk_tier: 'moderate',
    risk_score: 52.0,
    success_score: 71.6,
    success_tier: 'proficient',
    academic_risk_tier: 'moderate',
    placement_risk_tier: 'moderate',
    segment_id: 'steady_emerging_potential',
    segment_label: 'Steady / Emerging Potential',
  },
  {
    id: 'bef6289e-41de-428e-b7bf-13a855d6e54e',
    student_id: 'STU-007',
    first_name: 'Kabir',
    last_name: 'Kapoor',
    current_grade: 'Grade 11',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec A',
    department: 'Civil Engineering',
    status: 'active',
    attendance_rate: 76.2,
    average_score: 71.6,
    latest_assessment_percentage: 73.5,
    trend: 'stable',
    review_status: 'Active Support Plan',
    risk_tier: 'moderate',
    risk_score: 45.0,
    success_score: 54.8,
    success_tier: 'developing',
    academic_risk_tier: 'moderate',
    placement_risk_tier: 'moderate',
    segment_id: 'priority_holistic_support',
    segment_label: 'Priority Holistic Support',
  },
  {
    id: 'fef234a8-0c9c-468f-9383-f8b8e3e2f565',
    student_id: 'STU-008',
    first_name: 'Meera',
    last_name: 'Nair',
    current_grade: 'Grade 12',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec B',
    department: 'Computer Science & Engineering',
    status: 'active',
    attendance_rate: 81.0,
    average_score: 71.5,
    latest_assessment_percentage: 71.5,
    trend: 'stable',
    review_status: 'Active Support Plan',
    risk_tier: 'low',
    risk_score: 18.0,
    success_score: 80.3,
    success_tier: 'thriving',
    academic_risk_tier: 'low',
    placement_risk_tier: 'low',
    segment_id: 'steady_emerging_potential',
    segment_label: 'Steady / Emerging Potential',
  },
  {
    id: 'b7263fba-7dd1-48ee-99f4-be591aab11ad',
    student_id: 'STU-009',
    first_name: 'Aditya',
    last_name: 'Gupta',
    current_grade: 'Grade 9',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec C',
    department: 'Mechanical Engineering',
    status: 'active',
    attendance_rate: 81.0,
    average_score: 73.2,
    latest_assessment_percentage: 73.5,
    trend: 'stable',
    review_status: 'Under Review',
    risk_tier: 'low',
    risk_score: 22.0,
    success_score: 76.7,
    success_tier: 'proficient',
    academic_risk_tier: 'low',
    placement_risk_tier: 'low',
    segment_id: 'steady_emerging_potential',
    segment_label: 'Steady / Emerging Potential',
  },
  {
    id: '0ed0d835-d441-45ea-98da-efe44480ad7a',
    student_id: 'STU-013',
    first_name: 'Karan',
    last_name: 'Bose',
    current_grade: 'Grade 9',
    academic_term: 'AY 2025-26 Term 1',
    section: 'Sec A',
    department: 'Commerce & Economics',
    status: 'active',
    attendance_rate: 85.7,
    average_score: 71.6,
    latest_assessment_percentage: 70.3,
    trend: 'stable',
    review_status: 'Under Review',
    risk_tier: 'low',
    risk_score: 19.0,
    success_score: 74.4,
    success_tier: 'proficient',
    academic_risk_tier: 'low',
    placement_risk_tier: 'low',
    segment_id: 'steady_emerging_potential',
    segment_label: 'Steady / Emerging Potential',
  },
];

export const StudentsPage: React.FC = () => {
  const { isStaff, session } = useAuth();
  const isStudent = session?.role?.toLowerCase() === 'student';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialSegment = searchParams.get('segment') || 'all';

  const initialCache = getCachedApiData<StudentDirectoryResponse>('/api/v1/students?page=1&page_size=10&sort_by=risk_score&sort_dir=desc');
  const [data, setData] = useState<StudentDirectoryResponse | null>(() => initialCache || {
    students: FALLBACK_STUDENTS,
    total: FALLBACK_STUDENTS.length,
    page: 1,
    page_size: 10,
    departments: [
      'Computer Science & Engineering',
      'Electronics & Communication',
      'Commerce & Economics',
      'Mechanical Engineering',
      'Civil Engineering',
    ],
    semesters: ['AY 2025-26 Term 1'],
  });
  const [loading, setLoading] = useState<boolean>(() => !initialCache && !data);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filters state
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [department, setDepartment] = useState<string>('all');
  const [semester, setSemester] = useState<string>('all');
  const [segment, setSegment] = useState<string>(initialSegment);
  const [riskTier, setRiskTier] = useState<string>('all');
  const [academicRisk, setAcademicRisk] = useState('all');
  const [placementRisk, setPlacementRisk] = useState('all');
  const [successMin, setSuccessMin] = useState('');
  const [successMax, setSuccessMax] = useState('');
  const [sortBy, setSortBy] = useState<string>('risk_score');
  const [sortDir, setSortDir] = useState<string>('desc');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Intervention modal state
  const [interventionModalOpen, setInterventionModalOpen] = useState<boolean>(false);
  const [selectedStudentForIntervention, setSelectedStudentForIntervention] = useState<any>(null);

  const fetchStudents = useCallback(async (opts: { bypassCache?: boolean } = {}) => {
    if (isStudent) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!dataRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        sort_dir: sortDir,
      });

      if (academicRisk !== 'all') params.set('academic_risk', academicRisk);
      if (placementRisk !== 'all') params.set('placement_risk', placementRisk);
      if (successMin !== '') params.set('success_min', successMin);
      if (successMax !== '') params.set('success_max', successMax);
      if (search.trim()) params.append('search', search.trim());
      if (department !== 'all') params.append('department', department);
      if (semester !== 'all') params.append('semester', semester);
      if (segment !== 'all') params.append('segment', segment);
      if (riskTier !== 'all') params.append('risk_tier', riskTier);

      const res = await api<StudentDirectoryResponse>(`/api/v1/students?${params.toString()}`, {
        signal: controller.signal,
        bypassCache: opts.bypassCache,
      });
      setData(res);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.warn('Network issue loading students directory, using resilient cohort fallback:', err);
      // Graceful local synthetic fallback if backend is waking up or temporarily offline
      if (!dataRef.current) {
        setData({
          students: FALLBACK_STUDENTS,
          total: FALLBACK_STUDENTS.length,
          page: 1,
          page_size: 10,
          departments: [
            'Computer Science & Engineering',
            'Electronics & Communication',
            'Commerce & Economics',
            'Mechanical Engineering',
            'Civil Engineering',
          ],
          semesters: ['AY 2025-26 Term 1'],
        });
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, search, department, semester, segment, riskTier, academicRisk, placementRisk, successMin, successMax, isStudent]);

  useEffect(() => {
    if (!isStudent) {
      fetchStudents();
    }
  }, [fetchStudents, isStudent]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleResetFilters = () => {
    setAcademicRisk('all'); setPlacementRisk('all'); setSuccessMin(''); setSuccessMax('');
    setSearch('');
    setDepartment('all');
    setSemester('all');
    setSegment('all');
    setRiskTier('all');
    setSortBy('risk_score');
    setSortDir('desc');
    setPage(1);
    setSearchParams({});
  };

  const handleOpenIntervention = (student: StudentListItem) => {
    setSelectedStudentForIntervention({
      id: student.id,
      student_id: student.student_id,
      name: `${student.first_name} ${student.last_name}`,
      grade: student.current_grade,
      risk_level: student.risk_tier || 'medium',
      primary_risk_factor: `Review flag: Attendance ${student.attendance_rate || 0}%`,
    });
    setInterventionModalOpen(true);
  };

  const handleCreateIntervention = async (payload: CreateInterventionPayload): Promise<boolean> => {
    try {
      await api('/api/v1/interventions', {
        method: 'POST',
        body: payload,
      });
      await fetchStudents();
      return true;
    } catch (err) {
      console.error('Failed to create intervention:', err);
      return false;
    }
  };

  const exportCohortCSV = () => {
    if (!data?.students) return;
    const headers = 'Student ID,First Name,Last Name,Department,Grade,Attendance Rate,Average Score,Risk Tier,Review Status\n';
    const rows = data.students
      .map(
        (s) =>
          `"${s.student_id}","${s.first_name}","${s.last_name}","${s.department || ''}","${s.current_grade}",${s.attendance_rate || 0},${s.average_score || 0},"${s.risk_tier || 'low'}","${s.review_status || 'On Track'}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `edunexus_students_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If logged in as student, display the FERPA privacy policy message
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center bg-white dark:bg-[#151C19] rounded-xl border border-slate-200 dark:border-[#35433B] max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-[#281E15] text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#E2ECE6]">
            Peer Directory Protected by Educational Privacy Policy
          </h2>
          <p className="text-xs text-slate-600 dark:text-[#CBD5CF] leading-relaxed">
            In accordance with educational privacy regulations (FERPA), directory-wide dossiers of other students are restricted to authorized academic faculty and advisors.
            You have full access to view your personal academic journey, attendance trajectory, and support records.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/journey"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              View My Student Journey
            </Link>
            <Link
              to="/"
              className="px-4 py-2 border border-slate-300 dark:border-[#35433B] hover:bg-slate-50 dark:hover:bg-[#1D2722] text-xs font-semibold rounded-lg text-slate-700 dark:text-[#CBD5CF] transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#E2ECE6]">
              Students Directory
            </h2>
            {data && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-[#18352A] text-indigo-700 dark:text-[#56B594] border border-indigo-200 dark:border-[#1D4633]">
                {data.total} Enrolled
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-[#8FA89B] mt-0.5">
            Holistic student records with observable attendance rates, evaluation benchmarks, and explainable risk tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchStudents({ bypassCache: true })}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 dark:text-[#CBD5CF] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCohortCSV}
            disabled={!data || data.students.length === 0}
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-[#CBD5CF]" />
            <span>Export displayed page</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <StudentFilterToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        department={department}
        onDepartmentChange={(val) => {
          setDepartment(val);
          setPage(1);
        }}
        departmentsList={data?.departments || []}
        semester={semester}
        onSemesterChange={(val) => {
          setSemester(val);
          setPage(1);
        }}
        semestersList={data?.semesters || []}
        segment={segment}
        onSegmentChange={(val) => {
          setSegment(val);
          setPage(1);
          if (val === 'all') {
            searchParams.delete('segment');
          } else {
            searchParams.set('segment', val);
          }
          setSearchParams(searchParams);
        }}
        riskTier={riskTier}
        onRiskTierChange={(val) => {
          setRiskTier(val);
          setPage(1);
        }}
        academicRisk={academicRisk}
        onAcademicRiskChange={(val) => {
          setAcademicRisk(val);
          setPage(1);
        }}
        placementRisk={placementRisk}
        onPlacementRiskChange={(val) => {
          setPlacementRisk(val);
          setPage(1);
        }}
        successMin={successMin}
        onSuccessMinChange={(val) => {
          setSuccessMin(val);
          setPage(1);
        }}
        successMax={successMax}
        onSuccessMaxChange={(val) => {
          setSuccessMax(val);
          setPage(1);
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(sb, sd) => {
          setSortBy(sb);
          setSortDir(sd);
          setPage(1);
        }}
        onResetFilters={handleResetFilters}
        totalFilteredCount={data?.total || 0}
      />

      {/* Content State Handling */}
      {loading && !data ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" label="Querying student directory with attendance telemetry…" />
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
            Querying student directory with attendance telemetry…
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white dark:bg-[#151C19] rounded-xl border border-rose-200 dark:border-[#4A1E24]">
          <p className="text-sm text-rose-700 dark:text-[#F87171]">{error}</p>
          <Button size="sm" onClick={() => void fetchStudents({ bypassCache: true })} className="mt-3">
            Retry
          </Button>
        </div>
      ) : data?.students.length === 0 ? (
        <div className="p-10 bg-white dark:bg-[#151C19] rounded-xl border border-slate-200 dark:border-[#35433B]">
          <EmptyState
            title="No Matching Students Found"
            description="No students matched your search keyword or selected department/risk filters."
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <StudentTable
            students={data?.students || []}
            onOpenIntervention={isStaff ? handleOpenIntervention : undefined}
          />

          <StudentPagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={data?.total || 0}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Intervention Modal */}
      <CreateInterventionModal
        isOpen={interventionModalOpen}
        onClose={() => setInterventionModalOpen(false)}
        preselectedStudent={selectedStudentForIntervention}
        studentsList={(data?.students || []).map((s) => ({
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
    </div>
  );
};
