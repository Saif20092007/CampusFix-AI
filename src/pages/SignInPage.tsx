import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CampusFixLogo } from '../components/CampusFixLogo';

interface SignInPageProps {
  onNavigateRegister: (prefillEmail?: string, role?: 'STUDENT' | 'TEACHER') => void;
  onNavigateTrack: (ticketRef?: string) => void;
  onNavigateHome?: () => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  onNavigateRegister,
  onNavigateTrack,
  onNavigateHome,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick ticket search state
  const [quickTicket, setQuickTicket] = useState('');

  // Unregistered user popup modal state
  const [showUnregisteredModal, setShowUnregisteredModal] = useState(false);
  const [unregisteredEmail, setUnregisteredEmail] = useState('');

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
    const isAllowedDomain = parts.length === 2 && parts[1] === 'nmiet.edu.in';

    // Remove credential immediately on login attempt
    const submittedPassword = password;
    setPassword('');

    if (!isAllowedDomain) {
      setUnregisteredEmail(cleanEmail);
      setShowUnregisteredModal(true);
      setErrorMsg('Access restricted: Please register your Student or Teacher account with your official @nmiet.edu.in email.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(cleanEmail, submittedPassword);
      setSuccessMsg('Authentication successful! Loading portal...');
    } catch (err: any) {
      setPassword(''); // Ensure password credential is wiped
      const isUnregistered =
        err.status === 404 ||
        err.code === 'USER_NOT_REGISTERED' ||
        (err.message && (
          err.message.toLowerCase().includes('register') ||
          err.message.toLowerCase().includes('not registered') ||
          err.message.toLowerCase().includes('no account') ||
          err.message.toLowerCase().includes('not found') ||
          err.message.toLowerCase().includes('does not exist')
        ));

      if (isUnregistered) {
        setUnregisteredEmail(cleanEmail);
        setShowUnregisteredModal(true);
        setErrorMsg('Account not registered yet. Please register your Student or Teacher account first.');
      } else {
        setErrorMsg(err.message || 'Invalid college email or password');
      }
      setIsSubmitting(false);
    }
  };



  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full max-w-5xl mx-auto py-6 sm:py-10 px-4 animate-fade-in">
      {/* Top Breadcrumb / Back Link */}
      <div className="w-full flex items-center justify-between mb-4">
        {onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Public Portal</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigateTrack()}
          className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">search</span>
          <span>Track Ticket Without Login</span>
        </button>
      </div>

      {/* Main Split-Panel Card — Inspired by Maharashtra State Portal (Screenshots 2 & 3) */}
      <div className="w-full bg-surface-container-lowest rounded-3xl shadow-xl border border-surface-container overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Column: Visual Guide & Checklist (5 cols) */}
        <div className="md:col-span-5 bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Background blurred glow circles */}
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-indigo-100 text-[11px] font-medium border border-white/20">
              <span className="material-symbols-outlined text-[15px] text-amber-300">verified</span>
              <span>NMIET Grievance Redressal</span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center p-1.5 border border-white/20 mb-3 shadow-sm">
                <CampusFixLogo size={32} />
              </div>
              <h2 className="text-[22px] sm:text-[26px] font-extrabold tracking-tight leading-snug text-white">
                File a campus grievance with CampusFix AI
              </h2>
              <p className="text-[13px] text-indigo-100/85 leading-relaxed">
                Your grievance reaches the department head and technician in real time — it takes about two minutes.
              </p>
            </div>

            {/* Steps Checklist matching Screenshot 2 & 3 */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white text-indigo-900 font-bold text-[12px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  1
                </span>
                <div className="text-[13px] leading-tight">
                  <span className="font-bold text-white block">Verify your account</span>
                  <span className="text-[11px] text-indigo-200">Sign in with your official college email</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white font-bold text-[12px] flex items-center justify-center shrink-0 mt-0.5 border border-white/30">
                  2
                </span>
                <div className="text-[13px] leading-tight">
                  <span className="font-bold text-white block">Describe the issue & add photos</span>
                  <span className="text-[11px] text-indigo-200">Speak or type problem & campus location</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white font-bold text-[12px] flex items-center justify-center shrink-0 mt-0.5 border border-white/30">
                  3
                </span>
                <div className="text-[13px] leading-tight">
                  <span className="font-bold text-white block">AI checks & submits to officer</span>
                  <span className="text-[11px] text-indigo-200">Routes to Electrical, IT, Civil or Hostel HOD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Helpline at bottom of left panel */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/15 text-[11px] text-indigo-200 flex items-center justify-between">
            <span>Need urgent help?</span>
            <a href="tel:+919822044910" className="text-white font-mono font-bold hover:underline">
              +91 98220 44910
            </a>
          </div>
        </div>

        {/* Right Column: Form Panel (7 cols) */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Horizontal Stepper matching Screenshot 2 */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-secondary mb-6 border-b border-surface-container pb-3">
              <div className="flex items-center gap-1.5 text-primary font-bold">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center">
                  1
                </span>
                <span>Verify</span>
              </div>
              <span className="text-surface-container-high">— — —</span>
              <div className="flex items-center gap-1.5 text-secondary opacity-60">
                <span className="w-5 h-5 rounded-full bg-surface-container text-secondary text-[10px] flex items-center justify-center">
                  2
                </span>
                <span>Details</span>
              </div>
              <span className="text-surface-container-high">— — —</span>
              <div className="flex items-center gap-1.5 text-secondary opacity-60">
                <span className="w-5 h-5 rounded-full bg-surface-container text-secondary text-[10px] flex items-center justify-center">
                  3
                </span>
                <span>File</span>
              </div>
            </div>

            {/* Header */}
            <div className="mb-5">
              <h1 className="text-[22px] font-bold text-on-surface tracking-tight">
                Sign in to continue
              </h1>
              <p className="text-[13px] text-secondary mt-0.5">
                Enter your official college email address to continue.
              </p>
            </div>



            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-error-container text-on-error-container text-[12px] flex items-center justify-between gap-2 animate-fade-in shadow-xs border border-error/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
                  <span>{errorMsg}</span>
                </div>
                {errorMsg.toLowerCase().includes('register') && (
                  <button
                    type="button"
                    onClick={() => onNavigateRegister(email.trim())}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-primary text-on-primary font-semibold text-[11px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                  >
                    <span>Register</span>
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </button>
                )}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 text-[12px] flex items-center gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {/* Email */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-semibold text-on-surface" htmlFor="collegeEmail">
                    College Email Address
                  </label>
                  <span className="text-[11px] font-medium text-primary font-mono">@nmiet.edu.in</span>
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
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-xs transition-all"
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
                    className="w-full h-11 pl-10 pr-12 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-xs transition-all"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-secondary hover:text-on-surface active:scale-95 transition-transform cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
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
                  className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-[12px] text-on-surface cursor-pointer select-none">
                  Remember my session on this device
                </label>
              </div>

              {/* Sign In CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-semibold text-[14px] flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all shadow-sm mt-1 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In & Continue</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

              {/* Privacy Notice matching Screenshot 2 */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 text-[11px] flex items-center gap-2 border border-emerald-500/20">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">lock</span>
                <span>Used strictly to contact you about your campus grievance. Never shared.</span>
              </div>
            </form>
          </div>

          {/* Footer of Form Panel */}
          <div className="pt-4 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-secondary">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigateRegister(email.trim() || undefined)}
                className="font-bold text-primary hover:underline ml-0.5 cursor-pointer"
              >
                Register as Student or Teacher
              </button>
            </p>

            <button
              type="button"
              onClick={() => onNavigateTrack()}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Track grievance without login →
            </button>
          </div>
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
                  Check your college inbox or spam folder. If you didn't receive the email, contact the Grievance Cell.
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

      {/* Unregistered User Pop-up Modal */}
      {showUnregisteredModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowUnregisteredModal(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-2xl border border-surface-container flex flex-col items-center text-center space-y-4 animate-scale-up relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background ambient glow */}
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setShowUnregisteredModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary hover:text-on-surface cursor-pointer transition-colors"
              title="Close modal"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[34px]">person_add</span>
            </div>

            {/* Text details */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Account Not Registered</span>
              </div>
              <h2 className="text-[20px] font-bold text-on-surface tracking-tight">
                Please Register First!
              </h2>
              <p className="text-[13px] text-secondary leading-relaxed px-1">
                We couldn't find an existing account for{' '}
                <strong className="text-on-surface font-semibold break-all">{unregisteredEmail || email}</strong>.
                You need to register as a <strong>Student</strong> or <strong>Teacher</strong> first before logging in.
              </p>
            </div>

            {/* Role Options Highlight */}
            <div className="w-full bg-surface-container-low rounded-2xl p-3.5 border border-surface-container-high text-left space-y-2 text-[12px]">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                Choose your registration profile:
              </span>
              <div className="flex items-center gap-2.5 text-on-surface">
                <span className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[13px] shrink-0">
                  🎓
                </span>
                <div>
                  <span className="font-semibold block text-on-surface">Student Account</span>
                  <span className="text-[11px] text-secondary">FE, SE, TE, BE & Postgraduates with college email</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-on-surface pt-1 border-t border-surface-container">
                <span className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[13px] shrink-0">
                  👨‍🏫
                </span>
                <div>
                  <span className="font-semibold block text-on-surface">Teacher / Faculty Account</span>
                  <span className="text-[11px] text-secondary">Professors, HODs, Lecturers & Academic Instructors</span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="w-full space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowUnregisteredModal(false);
                  setPassword('');
                  onNavigateRegister(unregisteredEmail || email.trim(), 'STUDENT');
                }}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-[14px] flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">school</span>
                <span>Register as Student</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUnregisteredModal(false);
                  setPassword('');
                  onNavigateRegister(unregisteredEmail || email.trim(), 'TEACHER');
                }}
                className="w-full h-11 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-[14px] flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer border border-surface-container-highest"
              >
                <span className="material-symbols-outlined text-[20px]">badge</span>
                <span>Register as Teacher / Faculty</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUnregisteredModal(false);
                  setPassword('');
                }}
                className="w-full h-9 rounded-xl bg-transparent hover:bg-surface-container text-secondary text-[12px] font-medium transition-colors cursor-pointer"
              >
                Check Email Spelling / Edit Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
