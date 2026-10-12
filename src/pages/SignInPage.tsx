import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface SignInPageProps {
  onNavigateRegister: () => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onNavigateRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const parts = cleanEmail.split('@');
    const isAllowedDomain = parts.length === 2 && (parts[1] === 'nmiet.edu.in' || parts[1].endsWith('.demo'));

    if (!isAllowedDomain) {
      setErrorMsg('Access restricted: Only official college email addresses ending with @nmiet.edu.in are permitted.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(cleanEmail, password);
      setSuccessMsg('Authentication successful! Loading portal...');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full max-w-md mx-auto py-8 px-4 animate-fade-in">
      {/* Top Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium mb-3 shadow-xs">
        <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          verified_user
        </span>
        <span>College Grievance Portal</span>
      </div>

      {/* Main Logo & Title */}
      <a href="/" className="flex flex-col items-center group cursor-pointer" aria-label="CampusFix Home">
        <img
          src="/campusfix-logo.png"
          alt="CampusFix AI Logo"
          className="w-16 h-16 rounded-2xl object-cover shadow-md mb-2 select-none group-hover:scale-105 transition-transform"
        />
        <h1 className="text-[24px] font-bold text-on-surface tracking-tight text-center">
          CampusFix AI
        </h1>
      </a>

      <p className="text-[13px] text-secondary text-center max-w-xs mt-1 leading-snug">
        AI-Powered College Grievance Management
      </p>

      {/* Tagline */}
      <div className="w-full mt-3 px-3 py-2 rounded-lg bg-surface-container text-primary font-medium text-[13px] flex items-center justify-center gap-1.5 border border-surface-container-high">
        <span className="material-symbols-outlined text-[17px]">build_circle</span>
        <span>Report and track campus problems easily.</span>
      </div>

      {/* Form Card */}
      <div className="w-full mt-4 bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-[12px] flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[16px] text-error shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 text-[12px] flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-semibold text-on-surface" htmlFor="collegeEmail">
                College Email Address
              </label>
              <span className="text-[11px] font-medium text-primary">@nmiet.edu.in</span>
            </div>
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
                placeholder="yourname@nmiet.edu.in"
                className="w-full h-12 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-xs transition-all"
              />
            </div>
            <span className="text-[11px] text-secondary mt-1">
              Must be your official college email (<strong className="text-on-surface font-medium">@nmiet.edu.in</strong>)
            </span>
          </div>

          {/* Password */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-semibold text-on-surface" htmlFor="passwordInput">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSent(false);
                  setShowForgotModal(true);
                }}
                className="text-[11px] text-primary hover:underline cursor-pointer"
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
                className="w-full h-12 pl-10 pr-12 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-xs transition-all"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-secondary hover:text-on-surface active:scale-95 transition-transform cursor-pointer"
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
                className="font-medium text-primary hover:underline ml-0.5 cursor-pointer"
              >
                Create student account
              </button>
            </p>
          </div>
        </form>
      </div>

      {/* Emergency Assistance Links */}
      <div className="mt-6 flex flex-col items-center gap-1.5 text-center text-[12px] text-secondary">
        <span>Need urgent campus help?</span>
        <div className="flex items-center gap-4">
          <a
            href="tel:+919822044910"
            className="text-primary hover:underline font-mono inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">call</span>
            <span>+91 98220 44910</span>
          </a>
          <span>&middot;</span>
          <a
            href="mailto:grievance@nmiet.edu.in"
            className="text-primary hover:underline font-mono inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">mail</span>
            <span>grievance@nmiet.edu.in</span>
          </a>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-surface-container relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            <div className="flex items-center gap-2 text-primary font-bold text-[18px] mb-2">
              <span className="material-symbols-outlined text-[24px]">lock_reset</span>
              <h2>Reset Password</h2>
            </div>

            {forgotSent ? (
              <div className="flex flex-col gap-3 py-2 animate-fade-in">
                <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 text-[13px] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
                  <span>A secure reset link has been dispatched to <strong>{forgotEmail}</strong>.</span>
                </div>
                <p className="text-[12px] text-secondary">
                  Check your college inbox or spam folder. For demo accounts (student@nmiet.demo), the default password is <strong>campus123</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-2 w-full h-10 rounded-xl bg-primary text-on-primary font-semibold text-[13px] cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-3 mt-1">
                <p className="text-[13px] text-secondary leading-relaxed">
                  Enter your official college email address to receive password instructions.
                </p>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="yourname@nmiet.edu.in"
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-primary text-on-primary font-semibold text-[14px] cursor-pointer hover:opacity-95 mt-1"
                >
                  Send Recovery Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
