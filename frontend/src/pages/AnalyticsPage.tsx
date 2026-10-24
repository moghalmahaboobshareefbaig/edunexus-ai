import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Users,
  Award,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { DualRiskMatrixCard } from '../features/dashboard/DualRiskMatrixCard';
import { TelemetryGovernanceCard } from '../features/dashboard/TelemetryGovernanceCard';

export function AnalyticsPage() {
  const { data, loading, error, refetch } = useDashboardData();

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" label="Synthesizing cohort analytics, department benchmarks, and student segmentation…" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Synthesizing cohort analytics, department benchmarks, and student segmentation…
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Analytics Service Unavailable</h3>
              <p className="text-xs text-slate-600 mt-1">{error}</p>
            </div>
            <Button onClick={refetch} variant="primary" size="sm" className="mx-auto flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>Retry Analytics Query</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const cohorts = data.cohort_comparisons || [];
  const segments = data.segmentation_distribution || [];
  const summary = data.summary;
  const dualRisk = data.dual_risk_matrix;

  const segmentColorMap: Record<string, { bg: string; text: string; border: string; badge: string; accent: string }> = {
    emerald: {
      bg: 'bg-emerald-50/60',
      text: 'text-emerald-900',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      accent: 'text-emerald-700',
    },
    blue: {
      bg: 'bg-blue-50/60',
      text: 'text-blue-900',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      accent: 'text-blue-700',
    },
    amber: {
      bg: 'bg-amber-50/60',
      text: 'text-amber-900',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      accent: 'text-amber-700',
    },
    rose: {
      bg: 'bg-rose-50/60',
      text: 'text-rose-900',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      accent: 'text-rose-700',
    },
    purple: {
      bg: 'bg-purple-50/60',
      text: 'text-purple-900',
      border: 'border-purple-200',
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      accent: 'text-purple-700',
    },
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header & Dataset Context ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Campus Analytics & Strategic Segmentation
            </h2>
            {data.metadata.is_demo ? (
              <Badge variant="warning" size="sm" dot>
                Demo Dataset
              </Badge>
            ) : (
              <Badge variant="success" size="sm" dot>
                Live Database
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-departmental benchmarks, decoupled risk matrix distribution, and actionable student cohort segments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={refetch}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Analytics</span>
          </Button>
        </div>
      </div>

      {/* ── Analytics KPI Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Cohort */}
        <Card hoverable className="border-slate-200 dark:border-[#35433B]">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-[#8FA89B] uppercase tracking-wider">
                Total Enrolled Cohort
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#E2ECE6]">
                  {summary.total_students}
                </h3>
                <span className="text-xs font-medium text-slate-500 dark:text-[#8FA89B]">
                  ({summary.active_students} active)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8FA89B]">
                100% telemetry cataloged
              </p>
            </div>
            <div className="w-10 h-10 rounded-none bg-indigo-50 dark:bg-[#1D332A] text-indigo-600 dark:text-[#56B594] flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Average Success Score */}
        <Card hoverable className="border-slate-200 dark:border-[#35433B]">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-[#8FA89B] uppercase tracking-wider">
                Cohort Average Success
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#E2ECE6]">
                  {summary.average_success_score ?? 'Under Review'}
                </h3>
                {summary.average_success_score != null && (
                  <span className="text-xs font-medium text-slate-500 dark:text-[#8FA89B]">
                    / 100
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-[#5EEAD4] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>KPMG 7-domain composite</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-none bg-teal-50 dark:bg-[#122824] text-teal-600 dark:text-[#5EEAD4] flex items-center justify-center shrink-0 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Active Segments */}
        <Card hoverable className="border-slate-200 dark:border-[#35433B]">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-[#8FA89B] uppercase tracking-wider">
                Behavioral Segments
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#E2ECE6]">
                  {segments.length}
                </h3>
                <span className="text-xs font-medium text-slate-500 dark:text-[#8FA89B]">
                  actionable pathways
                </span>
              </div>
              <p className="text-xs text-indigo-600 dark:text-[#56B594] font-medium">
                Tailored intervention protocols
              </p>
            </div>
            <div className="w-10 h-10 rounded-none bg-purple-50 dark:bg-[#172A30] text-purple-600 dark:text-[#9BD3DC] flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Priority Dual Risk */}
        <Card hoverable className="border-slate-200 dark:border-[#35433B]">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-[#8FA89B] uppercase tracking-wider">
                Priority Dual Risk
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-rose-600 dark:text-[#F87171]">
                  {dualRisk?.academic_high_placement_high ?? 0}
                </h3>
                <span className="text-xs font-semibold text-rose-600 dark:text-[#F87171]">
                  urgent cases
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-[#F6D289] font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simultaneous exam & career deficits</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-none bg-rose-50 dark:bg-[#281618] text-rose-600 dark:text-[#F87171] flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Departmental Comparison Analysis ─────────────────────────── */}
      <Card className="border-2 border-indigo-100 dark:border-[#35433B] shadow-md rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-500" />
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-[#E2ECE6] flex items-center gap-2">
                  Departmental Performance & Success Benchmark
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-[#8FA89B]">
                  Comparative analysis across academic assessment scores, class attendance, and composite success ratings
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <Link
                to="/data-hub"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-200 hover:-translate-y-0.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Add Department Data (CSV)</span>
              </Link>

              <Badge variant="neutral" className="bg-indigo-50 dark:bg-[#1D2722] text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-[#35433B] text-xs font-semibold shrink-0">
                {cohorts.length} Departments Tracked
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {cohorts.length > 0 ? (
            <>
              {/* Vibrant KPI Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50/50 dark:from-[#1A2420] dark:to-[#17201B] border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Trophy className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block tracking-wider">Top Benchmark</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                      {cohorts.reduce((max, c) => ((c.average_success_score || 0) > (max.average_success_score || 0) ? c : max), cohorts[0])?.department || 'Engineering'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-[#1A2420] dark:to-[#17201B] border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block tracking-wider">Mean Attendance</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      {Math.round(cohorts.reduce((acc, c) => acc + (c.average_attendance || 0), 0) / cohorts.length)}% Institutional Rate
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-[#1A2420] dark:to-[#17201B] border border-amber-100 dark:border-amber-900/40 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block tracking-wider">Total Enrolled Cohort</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      {cohorts.reduce((acc, c) => acc + (c.count || 0), 0)} Enrolled Students
                    </span>
                  </div>
                </div>
              </div>

              {/* Luminous Recharts Bar Chart */}
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cohorts}
                    margin={{ top: 10, right: 15, left: -20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="successGradBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818CF8" />
                        <stop offset="100%" stopColor="#4F46E5" />
                      </linearGradient>
                      <linearGradient id="attendanceGradBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="assessmentGradBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FBBF24" />
                        <stop offset="100%" stopColor="#EA580C" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="department"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #ffffff)',
                        borderRadius: '12px',
                        border: '1px solid var(--tooltip-border, #e2e8f0)',
                        color: 'var(--tooltip-text, #1e293b)',
                        boxShadow: '0 8px 16px -2px rgb(0 0 0 / 0.12)',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                      formatter={(val: any, name: any) => [
                        val != null ? `${val}%` : 'Not recorded',
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="average_success_score"
                      name="Student Success Score"
                      fill="url(#successGradBar)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="average_attendance"
                      name="Attendance Rate (%)"
                      fill="url(#attendanceGradBar)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="average_assessment"
                      name="Assessment Average (%)"
                      fill="url(#assessmentGradBar)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Metrics Table with Mini Progress Bars */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#35433B] mt-2 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EEF2F6] dark:bg-[#1D2722] border-b border-slate-200 dark:border-[#35433B] text-slate-700 dark:text-[#CBD5CF] font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Students</th>
                      <th className="py-2.5 px-3">Success Score</th>
                      <th className="py-2.5 px-3">Avg Attendance</th>
                      <th className="py-2.5 px-3">Avg Assessment</th>
                      <th className="py-2.5 px-3 text-right">Directory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#25322B] text-slate-700 dark:text-[#CBD5CF]">
                    {cohorts.map((c) => (
                      <tr key={c.department} className="hover:bg-indigo-50/40 dark:hover:bg-[#1D2722]/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-[#E2ECE6] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <span>{c.department}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-[#CBD5CF]">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                            {c.count} students
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <span className="font-bold text-indigo-700 dark:text-indigo-400">
                              {c.average_success_score != null ? `${c.average_success_score} / 100` : '—'}
                            </span>
                            {c.average_success_score != null && (
                              <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, c.average_success_score))}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {c.average_attendance != null ? `${c.average_attendance}%` : '—'}
                            </span>
                            {c.average_attendance != null && (
                              <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, c.average_attendance))}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              {c.average_assessment != null ? `${c.average_assessment}%` : '—'}
                            </span>
                            {c.average_assessment != null && (
                              <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, c.average_assessment))}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to={`/students?search=${encodeURIComponent(c.department)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 transition-colors"
                          >
                            <span>Filter</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-[#8FA89B]">
              No departmental comparison records available in the active dataset.
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-[#8FA89B] italic pt-1">
            * Note: Averages strictly exclude missing domain telemetry. Cohorts with differing data coverage depths may not be directly comparable.
          </p>
        </CardContent>
      </Card>

      {/* ── Dual-Risk Matrix Quadrant Card ───────────────────────────── */}
      <DualRiskMatrixCard dualRiskMatrix={data.dual_risk_matrix} />

      {/* ── Actionable Strategic Student Segmentation Pathways ──────── */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#E2ECE6]">
              Strategic Student Segmentation Pathways
            </h3>
            <Badge variant="primary" size="sm">
              {segments.length} Distinct Cohorts
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#8FA89B] mt-0.5">
            Decoupled risk and multi-domain behavioral personas with tailored institutional support recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {segments.map((segment) => {
            const style = segmentColorMap[segment.badge_color] || segmentColorMap.purple;

            return (
              <div
                key={segment.segment_id}
                className={`p-5 rounded-none border ${style.border} ${style.bg} flex flex-col justify-between hover:shadow-md transition-all space-y-4`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none border ${style.badge}`}
                    >
                      {segment.tagline}
                    </span>
                    <Badge variant="neutral" size="sm" className="font-bold text-slate-900 dark:text-[#E2ECE6]">
                      {segment.count} ({segment.percentage}%)
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-[#E2ECE6] leading-snug">
                    {segment.label}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-[#CBD5CF] leading-relaxed">
                    {segment.description}
                  </p>

                  <div className="p-2.5 rounded-none bg-white/80 dark:bg-[#1D2722]/80 border border-slate-200/70 dark:border-[#35433B] text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-[#E2ECE6] mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-[#F6D289]" />
                      <span>Recommended Intervention:</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${style.accent}`}>
                      {segment.recommended_action}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-[#35433B]">
                  <Link
                    to={`/students?segment=${encodeURIComponent(segment.segment_id)}`}
                    className="inline-flex items-center justify-between w-full text-xs font-semibold text-slate-800 dark:text-[#CBD5CF] hover:text-indigo-600 dark:hover:text-[#56B594] transition-colors"
                  >
                    <span>View {segment.count} Matching Students</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Seven-Domain Telemetry Coverage & Governance ──────────────── */}
      <TelemetryGovernanceCard
        domainCoverage={data.domain_coverage}
        totalStudents={summary.total_students}
        academicRiskDistribution={data.academic_risk_distribution}
        placementRiskDistribution={data.placement_risk_distribution}
      />
    </div>
  );
}
export default AnalyticsPage;
