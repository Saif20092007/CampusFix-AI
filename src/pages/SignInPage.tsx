import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
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
    <div className="flex-1 flex flex-col justify-center items-center w-full max-w-md mx-auto py-8 px-4 animate-fade-in">
      {/* Top Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium mb-3 shadow-sm">
        <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          verified_user
        </span>
        <span>College Grievance Portal</span>
      </div>

      {/* Main Logo & Title */}
      <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center mb-2 shadow-md">
        <span className="material-symbols-outlined text-[26px]">domain_verification</span>
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
                placeholder="e.g. saif.sayyad@nmiet.demo"
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

        {/* Quick Demo Login Grid for 3 Roles: Student, Officer, Grievance Cell */}
        <div className="mt-5 pt-4 border-t border-surface-container">
          <p className="text-[11px] font-semibold text-secondary uppercase tracking-wider text-center mb-2.5">
            NMIET Demo Accounts (password: campus123)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDemo('student@nmiet.demo')}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-center active:scale-95 transition-all text-[11px] flex flex-col items-center gap-0.5 border border-surface-container-high cursor-pointer"
            >
              <span className="font-semibold text-on-surface">Student</span>
              <span className="text-[10px] text-secondary">Saif Sayyad</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDemo('officer@nmiet.demo')}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-center active:scale-95 transition-all text-[11px] flex flex-col items-center gap-0.5 border border-surface-container-high cursor-pointer"
            >
              <span className="font-semibold text-on-surface">Officer</span>
              <span className="text-[10px] text-secondary">Electrical</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDemo('cell@nmiet.demo')}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-center active:scale-95 transition-all text-[11px] flex flex-col items-center gap-0.5 border border-surface-container-high cursor-pointer"
            >
              <span className="font-semibold text-on-surface">Grievance Cell</span>
              <span className="text-[10px] text-secondary">NMIET Cell</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
