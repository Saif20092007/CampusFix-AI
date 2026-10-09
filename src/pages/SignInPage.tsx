import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CampusFixLogo } from '../components/CampusFixLogo';

interface SignInPageProps {
  onNavigateRegister: () => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onNavigateRegister }) => {
  const { login, switchDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);

  const checkEmailValidity = (val: string): boolean => {
    const clean = val.trim().toLowerCase();
    if (!clean) return true;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const parts = clean.split('@');
    if (!emailRegex.test(clean) || parts.length !== 2 || (parts[1] !== 'nmiet.edu.in' && parts[1] !== 'nmiet.demo')) {
      setErrorMsg(null);
      setShowDomainModal(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const parts = cleanEmail.split('@');
    if (!emailRegex.test(cleanEmail) || parts.length !== 2 || (parts[1] !== 'nmiet.edu.in' && parts[1] !== 'nmiet.demo')) {
      setErrorMsg(null);
      setShowDomainModal(true);
      return;
    }

    setErrorMsg(null);
    setStatusMsg(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await switchDemoUser(demoEmail);
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full max-w-md mx-auto py-8 px-4 animate-fade-in relative">
      {/* Top Corner Demo Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setShowDemoModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-primary border border-primary/20 text-[12px] font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          title="Open Demo Accounts"
        >
          <span className="material-symbols-outlined text-[16px]">switch_account</span>
          <span>Demo</span>
          <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
        </button>
      </div>

      {/* Top Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium mb-3 shadow-sm">
        <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          verified_user
        </span>
        <span>College Grievance Portal</span>
      </div>

      {/* Main Logo & Title */}
      <div className="mb-2">
        <CampusFixLogo size={56} />
      </div>

      <h1 className="text-[24px] font-bold text-on-surface tracking-tight text-center">
        CampusFix AI
      </h1>
      <p className="text-[13px] text-secondary text-center max-w-xs mt-1 leading-snug">
        AI-Powered College Grievance Management
      </p>

      {/* Tagline */}
      <div className="w-full mt-3 px-3 py-2 rounded-lg bg-surface-container text-primary font-medium text-[13px] flex items-center justify-center gap-1.5 border border-surface-container-high">
        <span className="material-symbols-outlined text-[17px]">build_circle</span>
        <span>Report and track campus problems easily.</span>
      </div>

      {/* Form Card */}
      <div className="w-full mt-4 bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container">
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-[12px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-error">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col">
            <label className="text-[12px] font-semibold text-on-surface mb-1" htmlFor="collegeEmail">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px] pointer-events-none">
                mail
              </span>
              <input
                id="collegeEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  if (email.trim()) checkEmailValidity(email);
                }}
                placeholder="e.g. yourname@nmiet.edu.in"
                className="w-full h-12 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-semibold text-on-surface" htmlFor="passwordInput">
                Password
              </label>
              <button
                type="button"
                onClick={() => setStatusMsg('Password reset instructions dispatched to your official college email.')}
                className="text-[11px] text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px] pointer-events-none">
                lock
              </span>
              <input
                id="passwordInput"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pl-10 pr-12 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-secondary hover:text-on-surface active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Remember session */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-primary-container focus:ring-0 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-[13px] text-on-surface cursor-pointer select-none">
              Remember my session on this device
            </label>
          </div>

          {/* Sign In CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-semibold text-[15px] flex items-center justify-center gap-2 active:opacity-90 transition-opacity shadow-sm mt-1 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>

          {/* Secondary Link: Create Account */}
          <div className="text-center pt-1">
            <p className="text-[13px] text-secondary">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onNavigateRegister}
                className="font-medium text-primary hover:underline ml-0.5"
              >
                Create student account
              </button>
            </p>
          </div>
        </form>
      </div>

      {/* Demo Persona Modal (Student, HOD, Principal) */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-surface-container p-5 shadow-2xl text-on-surface space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">switch_account</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-on-surface">Choose Demo Account</h3>
                  <p className="text-[11px] text-secondary">Click any role to log in instantly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* 1. Student */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowDemoModal(false);
                  handleQuickDemo('student@nmiet.demo');
                }}
                className="w-full p-3 rounded-xl border border-surface-container hover:border-primary/50 bg-surface-container-low hover:bg-surface-container flex items-center gap-3 transition-all text-left cursor-pointer active:scale-98 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">school</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-on-surface">Student</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300">NMIET</span>
                  </div>
                  <p className="text-[12px] text-secondary truncate mt-0.5">Saif Sayyad · SY Computer Eng</p>
                </div>
              </button>

              {/* 2. HOD */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowDemoModal(false);
                  handleQuickDemo('officer@nmiet.demo');
                }}
                className="w-full p-3 rounded-xl border border-surface-container hover:border-primary/50 bg-surface-container-low hover:bg-surface-container flex items-center gap-3 transition-all text-left cursor-pointer active:scale-98 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">engineering</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-on-surface">HOD</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">Dept Head</span>
                  </div>
                  <p className="text-[12px] text-secondary truncate mt-0.5">Santosh Shinde · Electrical Maintenance</p>
                </div>
              </button>

              {/* 3. Principal */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowDemoModal(false);
                  handleQuickDemo('cell@nmiet.demo');
                }}
                className="w-full p-3 rounded-xl border border-surface-container hover:border-primary/50 bg-surface-container-low hover:bg-surface-container flex items-center gap-3 transition-all text-left cursor-pointer active:scale-98 group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-on-surface">Principal</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">Grievance Cell</span>
                  </div>
                  <p className="text-[12px] text-secondary truncate mt-0.5">Dr. Mahesh Wankhede · Central Authority</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

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
                  const input = document.getElementById('collegeEmail');
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
