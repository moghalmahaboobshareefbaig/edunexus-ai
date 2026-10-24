import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  HeartHandshake,
  Mail,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { StudentJourneyProfileResponse } from '../../types';

interface StudentProfileHeaderProps {
  profile: StudentJourneyProfileResponse;
  onOpenIntervention: () => void;
}

export const StudentProfileHeader: React.FC<StudentProfileHeaderProps> = ({
  profile,
  onOpenIntervention,
}) => {
  const { student, department, risk_profile } = profile;
  const initials = `${student.first_name[0] || ''}${student.last_name[0] || ''}`.toUpperCase();

  const riskVariant = ({
    insufficient_data: 'neutral',
    critical: 'danger',
    high: 'warning',
    moderate: 'warning',
    medium: 'warning',
    low: 'success',
  }[risk_profile.overall_risk] || 'warning') as 'danger' | 'warning' | 'success';

  return (
      <div className="min-w-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-md border border-slate-800 space-y-4">
      {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant={riskVariant} size="sm">
            {(risk_profile?.overall_risk || 'low').toUpperCase()} PRIORITY
          </Badge>
          <span className="text-xs text-slate-300 font-mono">
            Risk Index: <strong className="text-white">{risk_profile.risk_score}</strong>/100
          </span>
        </div>
      </div>

      {/* Main Profile Info Row */}
      <div className="flex min-w-0 flex-col justify-between gap-5 pt-1 md:flex-row md:items-center">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/60 border border-indigo-400/40 flex items-center justify-center text-white text-xl font-black shadow-inner select-none shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h2 className="min-w-0 break-words text-xl font-bold tracking-tight text-white">
                {student.first_name} {student.last_name}
              </h2>
              <span className="shrink-0 font-mono text-xs px-2.5 py-0.5 rounded-md bg-white/10 text-indigo-200 border border-white/15">
                {student.student_id}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {student.status.toUpperCase()}
              </span>
              {student.cgpa != null && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                  CGPA: {typeof student.cgpa === 'number' ? student.cgpa.toFixed(2) : student.cgpa} / 10
                </span>
              )}
              {student.backlogs != null && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                    student.backlogs > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  }`}
                >
                  {student.backlogs === 0 ? '0 Backlogs' : `${student.backlogs} ${student.backlogs === 1 ? 'Backlog' : 'Backlogs'}`}
                </span>
              )}
            </div>

            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300">
              <span className="flex min-w-0 items-start gap-1">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <span className="min-w-0 break-words">{department || student.department || 'General'}</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="min-w-0 break-words">
                {student.current_grade || student.grade || 'Current Cohort'} {student.academic_term ? `(${student.academic_term})` : ''}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="min-w-0">Section {student.section || 'A'}</span>
              {student.gender && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="min-w-0 text-slate-300">Gender: {student.gender}</span>
                </>
              )}
            </p>

            <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1 pt-0.5 text-[11px] text-slate-400">
              <span className="flex min-w-0 items-start gap-1">
                <Mail className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                <span className="min-w-0 break-all">{student.email || `${student.student_id.toLowerCase()}@edunexus-demo.example`}</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex min-w-0 items-start gap-1">
                <Calendar className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                <span className="min-w-0 break-words">Enrolled: {student.enrollment_date}</span>
              </span>
              {student.date_of_birth && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="min-w-0 break-words">DOB: {student.date_of_birth}</span>
                </>
              )}
            </div>

            {student.notes && (
              <p className="text-[11px] text-indigo-200/80 italic pt-0.5 truncate">
                Advisory note: {student.notes}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            onClick={onOpenIntervention}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm font-semibold"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Create Support Plan</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
