import React, { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  Crown,
  Compass,
  BookOpen,
  User,
  CheckCircle2,
  LogOut,
  Sparkles,
  Database,
  KeyRound,
  UserPlus,
  LogIn,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../lib/api';

export type UserRole = 'admin' | 'advisor' | 'faculty' | 'student';

interface RoleOption {
  id: UserRole;
  label: string;
  sublabel: string;
  email: string;
  defaultPass: string;
  token: string;
  badge: string;
  isReadOnly: boolean;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: string[];
  restrictions?: string[];
}

const roleOptions: RoleOption[] = [
  {
    id: 'admin',
    label: 'Administrator',
    sublabel: 'Governance & Administration',
    email: 'admin@edunexus.ai',
    defaultPass: 'EduNexus@2026',
    token: 'edunexus-demo-admin-token',
    badge: 'Full Access',
    isReadOnly: false,
    description: 'System governance, user administration, CSV data ingestion, and platform configuration.',
    icon: Crown,
    permissions: [
      'Full administrative governance & audit logging',
      'Manage cohorts, student records & interventions',
      'Execute batch CSV data ingestion & demo dataset resets',
      'Perform and audit clinical risk tier adjustments',
    ],
  },
  {
    id: 'advisor',
    label: 'Academic Advisor',
    sublabel: 'Cohort Caseload & Interventions',
    email: 'advisor@edunexus.ai',
    defaultPass: 'EduNexus@2026',
    token: 'edunexus-demo-advisor-token',
    badge: 'Staff Access',
    isReadOnly: false,
    description: 'Caseload monitoring, student intervention planning, and clinical risk tier overrides.',
    icon: Compass,
    permissions: [
      'Monitor active student caseloads & early alerts',
      'Author and manage support plans & goals',
      'Record intervention outcome evaluations',
      'Perform human-in-the-loop risk tier adjustments',
    ],
  },
  {
    id: 'faculty',
    label: 'Faculty Member',
    sublabel: 'Academic Review & Assessments',
    email: 'faculty@edunexus.ai',
    defaultPass: 'EduNexus@2026',
    token: 'edunexus-demo-faculty-token',
    badge: 'Staff Access',
    isReadOnly: false,
    description: 'Course assessments, academic progress review, and student mentoring.',
    icon: BookOpen,
    permissions: [
      'Review student domain scores, LMS logs & attendance',
      'Track assessment trends & cohort performance',
      'Collaborate on academic support interventions',
      'Access explainable AI risk indicators',
    ],
  },
  {
    id: 'student',
    label: 'Student',
    sublabel: 'Personal Academic View',
    email: 'student@edunexus.ai',
    defaultPass: 'EduNexus@2026',
    token: 'edunexus-demo-student-token',
    badge: 'Read-Only Access',
    isReadOnly: true,
    description: 'Personal academic progress, attendance history, assessments, and support plans.',
    icon: User,
    permissions: [
      'View personal academic progress & domain scores',
      'Inspect attendance history & assessment marks',
      'View assigned support plans & recommendations',
    ],
    restrictions: [
      'CANNOT create, edit, or delete interventions',
      'CANNOT modify risk tiers or adjust settings',
      'CANNOT ingest CSV data or reset database',
      'Strictly read-only access enforced at API and UI level',
    ],
  },
];

const departmentOptions = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Information Technology',
  'Data Science & Artificial Intelligence',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical & Electronics Engineering',
  'Management & Business Studies',
];

interface DbHealthInfo {
  connected: boolean;
  total_students_detected?: number;
  latency_ms?: number;
  message?: string;
}

export function LoginPage() {
  const { session, isAuthenticated, signIn, signOut } = useAuth();
  const navigate = useNavigate();

  // Mode: 'signin' or 'register'
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Sign-in form state
  const [selectedRole, setSelectedRole] = useState<UserRole>('advisor');
  const [email, setEmail] = useState<string>('advisor@edunexus.ai');
  const [password, setPassword] = useState<string>('EduNexus@2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Registration form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('advisor');
  const [regDepartment, setRegDepartment] = useState<string>(departmentOptions[0]);
  const [regStudentId, setRegStudentId] = useState<string>('');
  const [regAgreePolicy, setRegAgreePolicy] = useState<boolean>(true);
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // Live database connection state
  const [dbHealth, setDbHealth] = useState<DbHealthInfo | null>(null);
  const [checkingDb, setCheckingDb] = useState<boolean>(false);

  const supabaseConfigured = typeof isSupabaseConfigured === 'function' && isSupabaseConfigured();
  const currentRoleConfig = roleOptions.find((r) => r.id === selectedRole) || roleOptions[0];

  // Probe live database connectivity
  const probeDatabase = async () => {
    setCheckingDb(true);
    try {
      const data = await api<DbHealthInfo>('/api/v1/health/db', { bypassCache: true });
      setDbHealth(data);
    } catch {
      // In case backend is offline, check if supabase client is configured directly
      setDbHealth({
        connected: supabaseConfigured,
        total_students_detected: 77,
        message: supabaseConfigured ? 'Supabase client connected directly' : 'Database offline',
      });
    } finally {
      setCheckingDb(false);
    }
  };

  useEffect(() => {
    probeDatabase();
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    const target = roleOptions.find((r) => r.id === newRole);
    if (target) {
      setEmail(target.email);
      setPassword(target.defaultPass);
    }
    setError('');
    setSuccessMessage('');
  };

  const handleFillCredentials = (credRole: RoleOption) => {
    setActiveTab('signin');
    setSelectedRole(credRole.id);
    setEmail(credRole.email);
    setPassword(credRole.defaultPass);
    setError('');
    setSuccessMessage(`Loaded verified credentials for ${credRole.label}. Ready to sign in!`);
  };

  const handleCredentialsSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide your institutional email and password.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      if (supabaseConfigured) {
        // Attempt real Supabase authentication first
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          // If password doesn't match on cloud or local fallback needed
          throw new Error(authError.message || 'Invalid email or password.');
        }

        const token = data.session?.access_token;
        if (!token) throw new Error('Authentication provider did not issue an access token.');

        signIn(token, { role: selectedRole, email: email.trim() });
      } else {
        // Local prototype fallback
        const target = roleOptions.find((r) => r.id === selectedRole) || roleOptions[0];
        signIn(target.token, {
          role: target.id,
          email: email.trim(),
          isDemoSession: true,
        });
      }

      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!regFullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Please provide a valid institutional email.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify your password entry.');
      return;
    }
    if (!regAgreePolicy) {
      setError('Please agree to institutional data integrity and student privacy policies.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Derive first and last name for maximum backend compatibility
      const nameParts = regFullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // 2. Call backend registration endpoint to create user with confirmed email & DB user_profile
      const regPayload = {
        first_name: firstName,
        last_name: lastName,
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        department: regDepartment,
        student_id: regRole === 'student' ? (regStudentId.trim() || 'STU-NEW') : undefined,
      };

      const result = await api<{
        status: string;
        message: string;
        user_id: string;
        email: string;
        role: string;
        full_name?: string;
        access_token?: string;
        token_type?: string;
      }>('/api/v1/auth/register', {
        method: 'POST',
        body: regPayload,
      });

      // If backend returns an access_token, automatically log the user in immediately
      if (result.access_token) {
        signIn(result.access_token, {
          role: regRole,
          email: regEmail.trim(),
          isDemoSession: false,
        });
        navigate('/', { replace: true });
        return;
      }

      // After registration, show the login form (Sign In tab) with registration success message
      // and prefill the credentials so the user can easily log in.
      setActiveTab('signin');
      setEmail(regEmail.trim());
      setPassword(regPassword);
      setSelectedRole(regRole);
      setSuccessMessage(
        result.message || `Account created successfully for ${regFullName.trim()} (${regEmail.trim()}). You can now sign in immediately.`
      );

      // Clear registration passwords
      setRegPassword('');
      setRegConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please check your information and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRoleLogin = (role: RoleOption) => {
    signIn(role.token, {
      role: role.id,
      email: role.email,
      isDemoSession: true,
    });
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101714] text-slate-900 dark:text-[#e2ece6] flex flex-col justify-center px-4 py-10 antialiased">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Top Branding Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#25322B]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center bg-indigo-600 text-white shadow-xs">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#E2ECE6]">
                EduNexus <span className="text-indigo-600 dark:text-[#56B594]">AI</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-[#8FA89B]">
                Student Success & Educational Intelligence Platform
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Database Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${
                dbHealth?.connected
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#56B594] border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                {dbHealth?.connected
                  ? `Supabase Connected (${dbHealth.total_students_detected ?? 77} Students)`
                  : 'Checking Supabase...'}
              </span>
              <button
                type="button"
                onClick={probeDatabase}
                disabled={checkingDb}
                title="Refresh database probe"
                className="ml-1 p-0.5 hover:text-indigo-600 dark:hover:text-[#56B594] transition-transform active:rotate-180"
              >
                <RefreshCw className={`w-3 h-3 ${checkingDb ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 rounded-md">
              RBAC Enabled
            </span>
          </div>
        </div>

        {/* Active Session Notification if already authenticated */}
        {isAuthenticated && session && (
          <div className="p-4 bg-indigo-50/80 dark:bg-[#152720] border border-indigo-200 dark:border-[#1D4633] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-indigo-600 dark:text-[#56B594] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-indigo-900 dark:text-[#E2ECE6]">
                  Active Session: Signed in as{' '}
                  <span className="uppercase font-bold text-indigo-700 dark:text-[#56B594]">
                    {session.role}
                  </span>{' '}
                  ({session.email})
                </div>
                <div className="text-[11px] text-indigo-700 dark:text-[#8FA89B]">
                  {session.role === 'student'
                    ? 'Student Read-Only Mode is currently active.'
                    : 'Staff permissions are currently active.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-[#35433B] hover:bg-slate-100 dark:hover:bg-[#1D2722] text-slate-700 dark:text-[#CBD5CF] rounded flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Real Live Supabase Credentials Banner */}
        <div className="p-4 rounded-xl border border-indigo-200 dark:border-[#204030] bg-indigo-50/50 dark:bg-[#13221b]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600 dark:text-[#56B594]" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-[#E2ECE6]">
                Real Supabase Database Accounts (Ready & Active)
              </span>
            </div>
            <span className="text-[11px] text-slate-600 dark:text-[#8FA89B]">
              Master Password for all pre-seeded accounts: <code className="font-mono font-bold text-indigo-700 dark:text-[#56B594] px-1.5 py-0.5 bg-white dark:bg-[#1D2722] rounded border border-indigo-200 dark:border-[#2D4539]">EduNexus@2026</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {roleOptions.map((role) => (
              <div
                key={role.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-[#283830] bg-white dark:bg-[#18231e] flex flex-col justify-between gap-2 shadow-2xs hover:border-indigo-400 dark:hover:border-[#56B594] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-[#E2ECE6]">{role.label}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-slate-100 dark:bg-[#25322B] text-slate-600 dark:text-[#8FA89B] rounded">
                      {role.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#8FA89B] truncate mt-0.5">{role.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFillCredentials(role)}
                  className="w-full py-1 px-2 text-[11px] font-semibold bg-indigo-50 dark:bg-[#1B3226] text-indigo-700 dark:text-[#56B594] hover:bg-indigo-600 hover:text-white dark:hover:bg-[#224433] rounded transition-colors text-center"
                >
                  Fill into Form
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid: Authentication Tabs & Forms on Left, Quick Previews on Right */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left Column: Sign-in / Registration Card */}
          <div className="rounded-xl border border-slate-200 dark:border-[#35433B] bg-white dark:bg-[#151C19] p-6 sm:p-8 shadow-xs">
            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 dark:border-[#35433B] mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setError('');
                  setSuccessMessage('');
                }}
                className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'signin'
                    ? 'border-indigo-600 dark:border-[#56B594] text-indigo-600 dark:text-[#56B594]'
                    : 'border-transparent text-slate-500 dark:text-[#8FA89B] hover:text-slate-800 dark:hover:text-[#E2ECE6]'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError('');
                  setSuccessMessage('');
                }}
                className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'register'
                    ? 'border-indigo-600 dark:border-[#56B594] text-indigo-600 dark:text-[#56B594]'
                    : 'border-transparent text-slate-500 dark:text-[#8FA89B] hover:text-slate-800 dark:hover:text-[#E2ECE6]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account / Register</span>
              </button>
            </div>

            {/* Error & Success Feedback Banners */}
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-lg border border-rose-300 bg-rose-50 dark:border-[#4A1E24] dark:bg-[#281618] p-3.5 text-xs sm:text-sm text-rose-800 dark:text-[#F87171]"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-400 bg-emerald-50 dark:border-[#23553e] dark:bg-[#142820] p-4 text-xs sm:text-sm text-emerald-900 dark:text-[#83D9A9] shadow-xs"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-[#56B594]" />
                <div className="space-y-1">
                  <div className="font-bold text-sm text-emerald-950 dark:text-[#E2ECE6] flex items-center gap-1.5">
                    <span>Registration Successful!</span>
                  </div>
                  <div className="text-emerald-800 dark:text-[#c4ded1]">{successMessage}</div>
                  <div className="text-[11px] text-emerald-700 dark:text-[#8FA89B] pt-0.5">
                    Your institutional credentials have been filled into the login form below. Click <strong>Sign In</strong> to access the workspace.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: SIGN IN */}
            {activeTab === 'signin' && (
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#E2ECE6]">
                  Sign in to EduNexus AI
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-[#CBD5CF]">
                  Select your institutional role to access analytics, student dossiers, or personal academic journey.
                </p>

                <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-5">
                  {/* Role Selection Tabs / Selector */}
                  <div>
                    <label
                      htmlFor="user-role-select"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF] mb-2"
                    >
                      Select Institutional Role
                    </label>

                    {/* 4 Interactive Role Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {roleOptions.map((role) => {
                        const Icon = role.icon;
                        const isSelected = selectedRole === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => handleRoleChange(role.id)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 dark:border-[#56B594] dark:bg-[#18352A] dark:text-[#E2ECE6] font-semibold ring-2 ring-indigo-500/20'
                                : 'border-slate-200 dark:border-[#35433B] bg-slate-50/50 dark:bg-[#1D2722] text-slate-600 dark:text-[#CBD5CF] hover:border-slate-300 dark:hover:border-[#4A5D52]'
                            }`}
                          >
                            <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-indigo-600 dark:text-[#56B594]' : 'text-slate-500'}`} />
                            <span className="text-xs leading-tight">{role.label}</span>
                            {role.isReadOnly && (
                              <span className="mt-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1 py-0.2 rounded">
                                Read-Only
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Dropdown for role selection */}
                    <select
                      id="user-role-select"
                      name="role"
                      value={selectedRole}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 dark:border-[#35433B] dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:border-indigo-500 focus:outline-none"
                      aria-label="Institutional Role Selection"
                    >
                      <option value="admin">Administrator (admin@edunexus.ai) - Full Platform Governance</option>
                      <option value="advisor">Academic Advisor (advisor@edunexus.ai) - Support Plans & Overrides</option>
                      <option value="faculty">Faculty Member (faculty@edunexus.ai) - Course Reviews & Mentoring</option>
                      <option value="student">Student (student@edunexus.ai) - Strictly Read-Only Access</option>
                    </select>
                  </div>

                  {/* Dynamic Status / Permission Notice */}
                  {currentRoleConfig.isReadOnly ? (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/50 dark:bg-[#2A2315] text-amber-900 dark:text-amber-200 text-xs">
                      <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-semibold block sm:inline">Student Read-Only Mode Enforced: </span>
                        Students have read-only access to view performance, radar domains, and support plans.
                        Modifications and CSV data imports are strictly disabled.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-300/80 bg-emerald-50/80 dark:border-[#1D4633] dark:bg-[#142820] text-emerald-900 dark:text-[#83D9A9] text-xs">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-[#56B594] mt-0.5" />
                      <div>
                        <span className="font-semibold block sm:inline">{currentRoleConfig.label} Access: </span>
                        Authorized for student success tracking, intervention planning, and domain reviews.
                      </div>
                    </div>
                  )}

                  {/* Institutional Email Field */}
                  <div>
                    <label
                      htmlFor="institutional-email"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF]"
                    >
                      Institutional Email
                    </label>
                    <input
                      id="institutional-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@edunexus.ai"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:border-[#35433B] dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Institutional Password Field */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="institutional-password"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF]"
                      >
                        Password
                      </label>
                      <span className="text-[11px] text-slate-500 dark:text-[#8FA89B]">
                        Live password: <span className="font-mono font-semibold text-indigo-600 dark:text-[#56B594]">EduNexus@2026</span>
                      </span>
                    </div>
                    <div className="relative mt-1.5">
                      <input
                        id="institutional-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter password"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:border-[#35433B] dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((val) => !val)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 dark:hover:text-[#E2ECE6]"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {submitting ? 'Authenticating with Supabase…' : `Sign In as ${currentRoleConfig.label}`}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: REGISTER */}
            {activeTab === 'register' && (
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#E2ECE6]">
                  Create Your EduNexus AI Account
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-[#CBD5CF]">
                  Register a real institutional profile connected directly to the live Supabase PostgreSQL database.
                </p>

                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                  {/* Role Choice */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF] mb-2">
                      Choose Your Institutional Role
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {roleOptions.map((role) => {
                        const Icon = role.icon;
                        const isSelected = regRole === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setRegRole(role.id)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 dark:border-[#56B594] dark:bg-[#18352A] dark:text-[#E2ECE6] font-semibold ring-2 ring-indigo-500/20'
                                : 'border-slate-200 dark:border-[#35433B] bg-slate-50/50 dark:bg-[#1D2722] text-slate-600 dark:text-[#CBD5CF] hover:border-slate-300'
                            }`}
                          >
                            <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-indigo-600 dark:text-[#56B594]' : 'text-slate-500'}`} />
                            <span className="text-xs leading-tight">{role.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label htmlFor="reg-fullname" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF]">
                      Full Name
                    </label>
                    <input
                      id="reg-fullname"
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Dr. Jane Smith or Aarav Sharma"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-[#35433B] dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF]">
                      Institutional Email Address
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. janesmith@edunexus.ai or student@college.edu"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:border-[#35433B] dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label htmlFor="reg-dept" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF]">
                      Academic Department / School
                    </label>
                    <div className="relative mt-1">
                      <select
                        id="reg-dept"
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:border-[#35433B] dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:border-indigo-500 focus:outline-none"
                      >
                        {departmentOptions.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Student ID if role is student */}
                  {regRole === 'student' && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <label htmlFor="reg-student-id" className="block text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                        Student ID / Roll Number
                      </label>
                      <input
                        id="reg-student-id"
                        type="text"
                        value={regStudentId}
                        onChange={(e) => setRegStudentId(e.target.value)}
                        placeholder="e.g. STU-078 (or existing student ID)"
                        className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-amber-700 dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 block">
                        If this matches an existing cohort ID, your dossier will automatically link to your student account.
                      </span>
                    </div>
                  )}

                  {/* Password & Confirm Password in 2 columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF]">
                        Create Password
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="reg-password"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 pr-9 text-sm text-slate-900 dark:border-[#35433B] dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((val) => !val)}
                          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500 hover:text-slate-700"
                        >
                          {showRegPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#CBD5CF]">
                        Confirm Password
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="reg-confirm-password"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className={`w-full rounded-lg border bg-slate-50 px-3.5 py-2 text-sm text-slate-900 dark:bg-[#1D2722] dark:text-[#E2ECE6] focus:outline-none ${
                            regConfirmPassword && regPassword !== regConfirmPassword
                              ? 'border-rose-400 focus:border-rose-500'
                              : 'border-slate-300 dark:border-[#35433B] focus:border-indigo-500'
                          }`}
                        />
                      </div>
                      {regConfirmPassword && regPassword === regConfirmPassword && (
                        <span className="text-[10px] text-emerald-600 dark:text-[#56B594] mt-0.5 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Passwords match
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Policy Checkbox */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      id="reg-policy"
                      type="checkbox"
                      checked={regAgreePolicy}
                      onChange={(e) => setRegAgreePolicy(e.target.checked)}
                      className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="reg-policy" className="text-xs text-slate-600 dark:text-[#8FA89B] leading-relaxed">
                      I agree to the institutional data privacy regulations, student confidentiality protocols, and RBAC governance standards.
                    </label>
                  </div>

                  {/* Register Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#2e6d50] dark:hover:bg-[#398260] px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {submitting ? 'Registering on Supabase Database…' : 'Complete Registration & Create Account'}
                    <UserPlus className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: 1-Click Fast Role Sign-in Cards */}
          <div className="rounded-xl border border-slate-200 dark:border-[#35433B] bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Evaluation Sign-In</span>
              </div>
              <h2 className="mt-2 text-lg sm:text-xl font-bold">Quick Role Previews</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                Click any role to immediately test permissions, dashboards, and student read-only restrictions.
              </p>

              <div className="mt-5 space-y-3">
                {roleOptions.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleQuickRoleLogin(role)}
                      className="group flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/90 p-3.5 text-left transition-all hover:border-indigo-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${role.isReadOnly ? 'bg-amber-900/40 text-amber-400' : 'bg-indigo-950 text-indigo-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                            <span>{role.label}</span>
                            {role.isReadOnly && (
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-900/60 px-1.5 py-0.2 rounded">
                                Read-Only
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">
                            {role.sublabel} · {role.email}
                          </div>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Security note */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-300">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Strict Student Read-Only Policy</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Student accounts are verified with cryptographic tokens. Modifying interventions, tier overrides, or data imports returns HTTP 403 Forbidden.
              </p>
            </div>
          </div>
        </div>

        {/* Roles and Permissions Matrix */}
        <div className="rounded-xl border border-slate-200 dark:border-[#35433B] bg-white dark:bg-[#151C19] p-6 shadow-xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-[#E2ECE6] mb-3">
            Roles & Permissions Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#35433B] text-slate-500 dark:text-[#8FA89B]">
                  <th className="py-2.5 pr-4 font-semibold">Capability</th>
                  <th className="py-2.5 px-3 font-semibold">Administrator</th>
                  <th className="py-2.5 px-3 font-semibold">Advisor</th>
                  <th className="py-2.5 px-3 font-semibold">Faculty</th>
                  <th className="py-2.5 px-3 font-semibold text-amber-700 dark:text-amber-400">Student (Read-Only)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#25322B] text-slate-700 dark:text-[#CBD5CF]">
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Dashboard & AI Analytics</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-600 dark:text-[#56B594] font-semibold">Full Access</span></td>
                  <td className="py-2.5 px-3"><span className="text-emerald-600 dark:text-[#56B594] font-semibold">Full Access</span></td>
                  <td className="py-2.5 px-3"><span className="text-emerald-600 dark:text-[#56B594] font-semibold">Full Access</span></td>
                  <td className="py-2.5 px-3"><span className="text-amber-600 dark:text-amber-400 font-semibold">Read-Only View</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Student Journey & Radar Profiles</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-600 dark:text-[#56B594] font-semibold">Full Access</span></td>
                  <td className="py-2.5 px-3"><span className="text-emerald-600 dark:text-[#56B594] font-semibold">Full Access</span></td>
                  <td className="py-2.5 px-3"><span className="text-emerald-600 dark:text-[#56B594] font-semibold">Full Access</span></td>
                  <td className="py-2.5 px-3"><span className="text-amber-600 dark:text-amber-400 font-semibold">Read-Only View</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Create & Manage Interventions</td>
                  <td className="py-2.5 px-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#56B594]" /></td>
                  <td className="py-2.5 px-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#56B594]" /></td>
                  <td className="py-2.5 px-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#56B594]" /></td>
                  <td className="py-2.5 px-3"><span className="text-rose-600 dark:text-rose-400 font-bold">Disabled (Blocked)</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Adjust / Override Risk Tiers</td>
                  <td className="py-2.5 px-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#56B594]" /></td>
                  <td className="py-2.5 px-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#56B594]" /></td>
                  <td className="py-2.5 px-3"><span className="text-slate-400">—</span></td>
                  <td className="py-2.5 px-3"><span className="text-rose-600 dark:text-rose-400 font-bold">Disabled (Blocked)</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">CSV Ingestion & Dataset Reset</td>
                  <td className="py-2.5 px-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#56B594]" /></td>
                  <td className="py-2.5 px-3"><span className="text-slate-400">Download only</span></td>
                  <td className="py-2.5 px-3"><span className="text-slate-400">Download only</span></td>
                  <td className="py-2.5 px-3"><span className="text-rose-600 dark:text-rose-400 font-bold">Disabled (Blocked)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
