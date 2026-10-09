import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CampusFixLogo } from '../components/CampusFixLogo';

interface RegisterPageProps {
  onNavigateLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateLogin }) => {
  const { register } = useAuth();
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [academicYear, setAcademicYear] = useState('TE');
  const [academicDept, setAcademicDept] = useState('Computer Engineering');
  const [division, setDivision] = useState('Div B');
  const [enrolledCheck, setEnrolledCheck] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);

  const checkEmailValidity = (val: string): boolean => {
    const clean = val.trim().toLowerCase();
    if (!clean) return true;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const parts = clean.split('@');
    if (!emailRegex.test(clean) || parts.length !== 2 || parts[1] !== 'nmiet.edu.in') {
      setErrorMsg(null);
      setShowDomainModal(true);
      return false;
    }
    return true;
  };

  // Compute completion
  let filledCount = 0;
  if (fullname.trim()) filledCount++;
  if (email.trim()) filledCount++;
  if (password.length >= 8) filledCount++;
  if (academicYear) filledCount++;
  if (academicDept) filledCount++;
  if (division) filledCount++;
  if (enrolledCheck) filledCount++;
  const completionPct = Math.max(15, Math.round((filledCount / 7) * 100));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname || !email || !password) return;

    if (!enrolledCheck) {
      setErrorMsg('Please confirm enrollment verification.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const parts = cleanEmail.split('@');
    if (!emailRegex.test(cleanEmail) || parts.length !== 2 || parts[1] !== 'nmiet.edu.in') {
      setErrorMsg(null);
      setShowDomainModal(true);
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await register({
        name: fullname.trim(),
        email: email.trim(),
        password,
        year: academicYear,
        academic_department: academicDept,
        division,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto py-8 px-4 animate-fade-in">
      {/* Brand Header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <CampusFixLogo size={36} />
          <div>
            <p className="text-[11px] text-secondary tracking-wide uppercase font-semibold">
              CampusFix AI
            </p>
            <p className="text-[14px] font-semibold text-on-surface">Student Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full shadow-sm">
          <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <span className="text-[11px] font-semibold">Student Registry</span>
        </div>
      </div>

      {/* Header Card with Progress */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-4 shadow-sm mt-2 mb-4 border border-surface-container">
        <h1 className="text-[20px] font-bold text-on-surface tracking-tight">Create Student Account</h1>
        <p className="text-[13px] text-secondary mt-1 leading-snug">
          Register to report and track campus issues in real time.
        </p>

        {/* Progress Meter */}
        <div className="mt-3 pt-2 border-t border-surface-container flex items-center justify-between text-secondary">
          <span className="text-[11px]">Profile Completion</span>
          <span className="text-[11px] font-semibold text-primary">{completionPct}% Ready</span>
        </div>
        <div className="w-full bg-surface-container h-1.5 rounded-full mt-1 overflow-hidden">
          <div
            className="bg-primary-container h-full rounded-full transition-all duration-300"
            style={{ width: `${completionPct}%` }}
          ></div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-[12px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-error">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleRegister} className="flex flex-col gap-3.5 bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-sm">
        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-semibold text-on-surface" htmlFor="fullname">
            Full Name
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
              person
            </span>
            <input
              id="fullname"
              type="text"
              required
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="e.g. Saif Sayyad"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-semibold text-on-surface" htmlFor="email">
            Email Address
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
              alternate_email
            </span>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                if (email.trim()) checkEmailValidity(email);
              }}
              placeholder="e.g. yourname@nmiet.edu.in"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-semibold text-on-surface flex items-center justify-between" htmlFor="password">
            <span>Password</span>
            <span className="text-[11px] text-secondary font-normal">Min. 8 characters</span>
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
            />
            <button
              type="button"
              aria-label="Toggle password"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 w-10 h-11 flex items-center justify-center text-secondary"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Academic Year */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-semibold text-on-surface" htmlFor="academic-year">
            Academic Year
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
              calendar_month
            </span>
            <select
              id="academic-year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full h-11 pl-10 pr-8 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm appearance-none cursor-pointer"
            >
              <option value="FE">First Year (FE)</option>
              <option value="SE">Second Year (SE)</option>
              <option value="TE">Third Year (TE)</option>
              <option value="BE">Final Year (BE)</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 text-secondary pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* Academic Department */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-semibold text-on-surface" htmlFor="department">
            Academic Department
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
              account_balance
            </span>
            <select
              id="department"
              value={academicDept}
              onChange={(e) => setAcademicDept(e.target.value)}
              className="w-full h-11 pl-10 pr-8 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm appearance-none cursor-pointer"
            >
              <option value="Computer Engineering">Computer Engineering</option>
              <option value="AI & Data Science">AI & Data Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
              <option value="Civil Engineering">Civil Engineering</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 text-secondary pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* Division */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-semibold text-on-surface" htmlFor="division">
            Division
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
              groups
            </span>
            <select
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="w-full h-11 pl-10 pr-8 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm appearance-none cursor-pointer"
            >
              <option value="Div A">Div A</option>
              <option value="Div B">Div B</option>
              <option value="Div C">Div C</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 text-secondary pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* Verification Checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer pt-1 select-none">
          <input
            type="checkbox"
            checked={enrolledCheck}
            onChange={(e) => setEnrolledCheck(e.target.checked)}
            className="w-4 h-4 rounded text-primary-container focus:ring-0 mt-0.5 cursor-pointer"
          />
          <span className="text-[12px] text-on-surface leading-snug">
            I verify that I am currently enrolled at this institution.
          </span>
        </label>

        {/* Create Account CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary-container text-on-primary rounded-xl font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 active:bg-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>Registering Student...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>

        {/* Sign In Link */}
        <div className="flex items-center justify-center pt-1 text-center">
          <p className="text-[13px] text-secondary">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              className="font-medium text-primary hover:underline ml-0.5"
            >
              Sign In
            </button>
          </p>
        </div>
      </form>

      {/* Official College Email Domain Restriction Popup Modal */}
      {showDomainModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowDomainModal(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-2xl border border-surface-container flex flex-col items-center text-center space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">school</span>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-[18px] font-bold text-on-surface">College Email Required</h3>
              <p className="text-[14px] text-secondary leading-relaxed">
                Only official NMIET college email addresses are accepted. Please enter your college email address ending in <strong className="text-primary font-semibold">@nmiet.edu.in</strong> to continue.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-[12px] font-mono mt-1 border border-surface-container-high">
                <span className="text-secondary font-sans font-medium">Example:</span>
                <span className="font-semibold text-primary">yourname@nmiet.edu.in</span>
              </div>
            </div>

            <div className="w-full pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDomainModal(false);
                  const input = document.getElementById('email');
                  if (input) input.focus();
                }}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-semibold text-[14px] flex items-center justify-center gap-2 active:opacity-90 shadow-sm transition-all cursor-pointer"
              >
                <span>Enter @nmiet.edu.in Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
