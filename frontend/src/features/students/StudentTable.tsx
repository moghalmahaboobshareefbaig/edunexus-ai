import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  HeartHandshake,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { StudentListItem } from '../../types';

interface StudentTableProps {
  students: StudentListItem[];
  onOpenIntervention?: (student: StudentListItem) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onOpenIntervention,
}) => {
  return (
    <div className="bg-white dark:bg-[#151C19] rounded-2xl border border-slate-200 dark:border-[#35433B] overflow-hidden shadow-xs">
      <div className="overflow-x-auto w-full">
        <table className="min-w-[1100px] w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#2D3C33] bg-gradient-to-r from-slate-50 via-slate-100/70 to-indigo-50/40 dark:from-[#1D2722] dark:to-[#17221C] text-slate-700 dark:text-[#CBD5CF] font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
              <th className="py-3.5 px-4">Student & ID</th>
              <th className="py-3.5 px-4">Department & Cohort</th>
              <th className="py-3.5 px-4 text-center">Success Score</th>
              <th className="py-3.5 px-4 text-center">Attendance %</th>
              <th className="py-3.5 px-4 text-center">Latest Eval %</th>
              <th className="py-3.5 px-4 text-center">Trajectory Trend</th>
              <th className="py-3.5 px-4 text-center">Decoupled Risks</th>
              <th className="py-3.5 px-4">Review Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#25322B] text-slate-700 dark:text-[#CBD5CF]">
            {students.map((student) => {
              const acadRisk = (student.academic_risk_tier || student.risk_tier || 'low').toLowerCase();
              const acadRiskVariant = {
                insufficient_data: 'neutral',
                critical: 'danger',
                high: 'danger',
                moderate: 'warning',
                medium: 'warning',
                low: 'success',
              }[acadRisk] as 'danger' | 'warning' | 'success' | 'neutral';

              const placeRisk = (student.placement_risk_tier || 'low').toLowerCase();
              const placeRiskVariant = {
                insufficient_data: 'neutral',
                critical: 'danger',
                high: 'danger',
                moderate: 'warning',
                medium: 'warning',
                low: 'success',
              }[placeRisk] as 'danger' | 'warning' | 'success' | 'neutral';

              const trendIcon = {
                improving: <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-[#5EEAD4]" />,
                declining: <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-[#F87171]" />,
                stable: <Minus className="w-3.5 h-3.5 text-slate-400 dark:text-[#8FA89B]" />,
              }[student.trend || 'stable'];

              const trendBadgeClass = {
                improving: 'bg-emerald-50 dark:bg-[#142820] text-emerald-700 dark:text-[#5EEAD4] border-emerald-200 dark:border-[#1D4633]',
                declining: 'bg-rose-50 dark:bg-[#281618] text-rose-700 dark:text-[#F87171] border-rose-200 dark:border-[#4A1E24]',
                stable: 'bg-slate-50 dark:bg-[#1D2722] text-slate-600 dark:text-[#CBD5CF] border-slate-200 dark:border-[#35433B]',
              }[student.trend || 'stable'];

              const initials = `${student.first_name[0] || ''}${student.last_name[0] || ''}`.toUpperCase();

              const successScore = student.success_score;
              const hasScore = successScore !== null && successScore !== undefined;

              const successPillClass =
                !hasScore
                  ? 'text-slate-500 bg-slate-100 dark:bg-[#1D2722] border-slate-200'
                  : successScore >= 80
                  ? 'text-emerald-700 dark:text-[#5EEAD4] bg-emerald-50 dark:bg-[#142820] border-emerald-200 dark:border-[#1D4633]'
                  : successScore >= 65
                  ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-[#17202A] border-indigo-200 dark:border-indigo-900/60'
                  : successScore >= 50
                  ? 'text-amber-700 dark:text-[#F6D289] bg-amber-50 dark:bg-[#261F14] border-amber-200 dark:border-[#45331C]'
                  : 'text-rose-700 dark:text-[#F87171] bg-rose-50 dark:bg-[#281618] border-rose-200 dark:border-[#4A1E24]';

              return (
                <tr
                  key={student.id}
                  className="hover:bg-indigo-50/40 dark:hover:bg-[#1D2722]/60 transition-colors group whitespace-nowrap"
                >
                  {/* 1. Student & ID (Streamlined in One Sleek Row) */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs select-none">
                        {initials}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/journey?student_id=${student.id}`}
                          className="font-bold text-slate-900 dark:text-[#E2ECE6] group-hover:text-indigo-600 dark:group-hover:text-[#56B594] transition-colors hover:underline text-xs"
                        >
                          {student.first_name} {student.last_name}
                        </Link>

                        <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                          {student.student_id}
                        </span>

                        {student.segment_label && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              student.segment_badge_color === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#142820] dark:text-[#5EEAD4] dark:border-[#1D4633]'
                                : student.segment_badge_color === 'blue'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-[#14252E] dark:text-[#7DD3FC] dark:border-[#1E3A4B]'
                                : student.segment_badge_color === 'amber'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-[#261F14] dark:text-[#F6D289] dark:border-[#45331C]'
                                : student.segment_badge_color === 'rose'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-[#281618] dark:text-[#F87171] dark:border-[#4A1E24]'
                                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-[#172A30] dark:text-[#9BD3DC] dark:border-[#284C55]'
                            }`}
                          >
                            {student.segment_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 2. Department & Cohort (Clean Single Line) */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-[#E2ECE6]">
                        {student.department || 'General Academics'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-[11px] text-slate-500 dark:text-[#8FA89B]">
                        {student.current_grade} (Sec {student.section || 'A'})
                      </span>
                    </div>
                  </td>

                  {/* 3. Student Success Score (Inline Pill) */}
                  <td className="py-3 px-4 text-center">
                    {hasScore ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold shadow-2xs">
                        <span className="font-mono">{successScore.toFixed(1)}/100</span>
                        <span className={`text-[10px] uppercase tracking-wide font-extrabold px-1.5 py-0.2 rounded-full border ${successPillClass}`}>
                          {student.success_tier || 'active'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Insufficient Data
                      </span>
                    )}
                  </td>

                  {/* 4. Attendance Rate % (Inline Metric + Status Pill) */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <span
                        className={`font-bold font-mono text-xs ${
                          (student.attendance_rate || 0) < 80.0
                            ? 'text-amber-600 dark:text-[#F6D289]'
                            : 'text-emerald-600 dark:text-[#5EEAD4]'
                        }`}
                      >
                        {student.attendance_rate != null ? `${student.attendance_rate.toFixed(1)}%` : 'N/A'}
                      </span>
                      {student.attendance_rate != null && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            student.attendance_rate < 80
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {student.attendance_rate < 80 ? 'Below 80%' : 'Met'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 5. Latest Assessment Score % (Inline Score & Average) */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs">
                      <span className="font-bold font-mono text-slate-900 dark:text-[#E2ECE6]">
                        {student.latest_assessment_percentage != null
                          ? `${student.latest_assessment_percentage.toFixed(1)}%`
                          : student.average_score == null
                          ? 'N/A'
                          : `${student.average_score.toFixed(1)}%`}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        (Avg {student.average_score == null ? '—' : `${student.average_score.toFixed(1)}%`})
                      </span>
                    </div>
                  </td>

                  {/* 6. Performance Trajectory Trend (Sleek Pill) */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${trendBadgeClass}`}
                    >
                      {trendIcon}
                      <span className="capitalize">{student.trend || 'stable'}</span>
                    </span>
                  </td>

                  {/* 7. Decoupled Risks: Both Academic & Placement Side-by-Side in ONE Row */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Acad:</span>
                        <Badge variant={acadRiskVariant} size="sm">
                          {acadRisk.toUpperCase()}
                        </Badge>
                      </span>

                      <span className="text-slate-300 dark:text-slate-600">•</span>

                      <span className="inline-flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Place:</span>
                        <Badge variant={placeRiskVariant} size="sm">
                          {placeRisk.toUpperCase()}
                        </Badge>
                      </span>
                    </div>
                  </td>

                  {/* 8. Review Status (Clean Status Pill) */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        student.review_status === 'Needs Review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                          : student.review_status === 'Active Support Plan'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          student.review_status === 'Needs Review'
                            ? 'bg-amber-500'
                            : student.review_status === 'Active Support Plan'
                            ? 'bg-indigo-600'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span>{student.review_status || 'On Track'}</span>
                    </span>
                  </td>

                  {/* 9. Actions (Inline Buttons) */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenIntervention && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenIntervention(student)}
                          title="Assign Student Support Plan"
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 p-1.5 h-8 w-8 rounded-lg"
                        >
                          <HeartHandshake className="w-4 h-4" />
                        </Button>
                      )}
                      <Link to={`/journey?student_id=${student.id}`}>
                        <Button
                          size="sm"
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs px-2.5 h-8 rounded-lg flex items-center gap-1 font-semibold dark:bg-[#1D332A] dark:text-[#56B594] dark:border-[#1D4633]"
                        >
                          <span>Journey</span>
                          <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
