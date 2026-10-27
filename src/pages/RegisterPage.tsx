import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CampusFixLogo } from '../components/CampusFixLogo';

interface RegisterPageProps {
  onNavigateLogin: () => void;
  initialEmail?: string;
  initialRole?: 'STUDENT' | 'TEACHER';
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateLogin,
  initialEmail = '',
  initialRole = 'STUDENT',
}) => {
  const { register } = useAuth();
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>(initialRole);
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Student specific fields
  const [academicYear, setAcademicYear] = useState('');
  const [academicDept, setAcademicDept] = useState('');
  const [division, setDivision] = useState('');

  // Teacher specific fields
  const [designation, setDesignation] = useState('Assistant Professor');
  const [staffId, setStaffId] = useState('');
  const [phone, setPhone] = useState('');

  // Verification checkbox
  const [enrolledCheck, setEnrolledCheck] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);

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

  const handleYearChange = (newYear: string) => {
    setAcademicYear(newYear);
    setDivision('');
  };

  const getDivisionOptions = () => {
    if (academicYear === 'FE') {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
      return letters.map((letter) => `Div ${letter}`);
    } else if (['SE', 'TE', 'BE'].includes(academicYear)) {
      return ['Div A', 'Div B', 'Div C'];
    } else if (['BCA', 'MCA', 'M.Tech', 'B.Voc'].includes(academicYear)) {
      return ['Div A'];
    }
    return [];
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname || !email || !password) return;

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (!academicDept) {
      setErrorMsg('Please select your Academic Department / Faculty.');
      return;
    }

    if (role === 'STUDENT') {
      if (!academicYear) {
        setErrorMsg('Please select your Academic Year.');
        return;
      }
      if (!division) {
        setErrorMsg('Please select your Class Division.');
        return;
      }
      if (!enrolledCheck) {
        setErrorMsg('Please confirm student enrollment verification.');
        return;
      }
    } else {
      // TEACHER
      if (!designation) {
        setErrorMsg('Please select your Academic Designation.');
        return;
      }
      if (!enrolledCheck) {
        setErrorMsg('Please confirm faculty membership verification.');
        return;
      }
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
      if (role === 'STUDENT') {
        await register({
          name: fullname.trim(),
          email: cleanEmail,
          password,
          role: 'STUDENT',
          year: academicYear,
          academic_department: academicDept,
          division,
          phone: phone.trim() || undefined,
        });
      } else {
        await register({
          name: fullname.trim(),
          email: cleanEmail,
          password,
          role: 'TEACHER',
          academic_department: academicDept,
          designation,
          division: designation,
          year: 'Faculty',
          phone: phone.trim() || undefined,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto py-6 sm:py-8 px-4 animate-fade-in">
      {/* Brand Header */}
      <div className="flex items-center justify-between py-2">
        <div
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={onNavigateLogin}
          role="button"
          tabIndex={0}
          title="CampusFix AI — Back to Sign In"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigateLogin()}
        >
          <CampusFixLogo size={36} />
          <div>
            <p className="text-[11px] text-secondary tracking-wide uppercase font-semibold group-hover:text-primary transition-colors">
              CampusFix AI
            </p>
            <p className="text-[14px] font-semibold text-on-surface">
              {role === 'STUDENT' ? 'Student Portal' : 'Faculty & Staff Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full shadow-sm">
          <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {role === 'STUDENT' ? 'school' : 'badge'}
          </span>
          <span className="text-[11px] font-semibold">
            {role === 'STUDENT' ? 'Student Registry' : 'Faculty Registry'}
          </span>
        </div>
      </div>

      {/* Role Selection Toggle */}
      <div className="w-full bg-surface-container rounded-2xl p-1.5 flex items-center gap-1 border border-surface-container-high mt-2 mb-3">
        <button
          type="button"
          onClick={() => {
            setRole('STUDENT');
            setErrorMsg(null);
            setEnrolledCheck(false);
          }}
          className={`flex-1 h-11 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            role === 'STUDENT'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container-lowest/50'
          }`}
        >
          <span className="text-[16px]">🎓</span>
          <span>I am a Student</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRole('TEACHER');
            setErrorMsg(null);
            setEnrolledCheck(false);
          }}
          className={`flex-1 h-11 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            role === 'TEACHER'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container-lowest/50'
          }`}
        >
          <span className="text-[16px]">👨‍🏫</span>
          <span>I am a Teacher</span>
        </button>
      </div>

      {/* Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-4 shadow-sm mb-4 border border-surface-container">
        <h1 className="text-[19px] sm:text-[20px] font-bold text-on-surface tracking-tight flex items-center gap-2">
          <span>{role === 'STUDENT' ? '🎓 Create Student Account' : '👨‍🏫 Create Teacher Account'}</span>
        </h1>
        <p className="text-[13px] text-secondary mt-1 leading-snug">
          {role === 'STUDENT'
            ? 'Register to report hostel, classroom, lab, or campus issues in real time.'
            : 'Register to report departmental, laboratory, projector, or campus infrastructure issues.'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-[12px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-error shrink-0">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Registration Form Card */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm space-y-4">
        <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-on-surface" htmlFor="fullname">
              {role === 'STUDENT' ? 'Student Full Name' : 'Teacher / Faculty Full Name'}
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
                placeholder={role === 'STUDENT' ? 'e.g. Mahesh Patil' : 'e.g. Prof. Rajesh Sharma'}
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-on-surface" htmlFor="email">
              Official College Email
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
                placeholder={role === 'STUDENT' ? 'yourname@nmiet.edu.in' : 'faculty.name@nmiet.edu.in'}
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all font-mono"
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
                className="absolute right-0 w-10 h-11 flex items-center justify-center text-secondary cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Department */}
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
                required
                value={academicDept}
                onChange={(e) => setAcademicDept(e.target.value)}
                className="w-full h-11 pl-10 pr-8 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm appearance-none cursor-pointer"
              >
                <option value="" disabled>Select Department</option>
                <option value="Computer Engineering">Computer Engineering</option>
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Information Technology">Information Technology</option>
                <option value="AI & DS">AI & DS</option>
                <option value="CSE (AI)">CSE (AI)</option>
                <option value="E&TC">E&TC</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Electronics & Computer Engineering">Electronics & Computer Engineering</option>
                <option value="First Year Engineering / Applied Science">First Year Engineering / Applied Science</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 text-secondary pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          {/* STUDENT ONLY: Academic Year & Division */}
          {role === 'STUDENT' ? (
            <>
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
                    required
                    value={academicYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="w-full h-11 pl-10 pr-8 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Year</option>
                    <option value="FE">FE (First Year)</option>
                    <option value="SE">SE (Second Year)</option>
                    <option value="TE">TE (Third Year)</option>
                    <option value="BE">BE (Final Year)</option>
                    <option value="BCA">BCA</option>
                    <option value="MCA">MCA</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="B.Voc">B.Voc</option>
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
                    required
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    disabled={!academicYear}
                    className="w-full h-11 pl-10 pr-8 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>
                      {academicYear ? 'Select Division' : 'Select Year first'}
                    </option>
                    {getDivisionOptions().map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 text-secondary pointer-events-none text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* TEACHER ONLY: Designation, Staff ID, Phone */
            <>
              {/* Designation */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-on-surface" htmlFor="designation">
                  Designation / Role
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
                    badge
                  </span>
                  <select
                    id="designation"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full h-11 pl-10 pr-8 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Adjunct Faculty">Adjunct Faculty</option>
                    <option value="Lab Instructor">Lab Instructor</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 text-secondary pointer-events-none text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Staff / Faculty ID (Optional) */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-on-surface flex items-center justify-between" htmlFor="staffId">
                  <span>Faculty / Employee ID</span>
                  <span className="text-[11px] text-secondary font-normal">Optional</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
                    pin
                  </span>
                  <input
                    id="staffId"
                    type="text"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="e.g. EMP-2041"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* Contact Mobile (Optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-on-surface flex items-center justify-between" htmlFor="phone">
              <span>Mobile Number</span>
              <span className="text-[11px] text-secondary font-normal">Optional</span>
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[18px] pointer-events-none">
                call
              </span>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all font-mono"
              />
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
              {role === 'STUDENT'
                ? 'I verify that I am currently enrolled as a student at this institution.'
                : 'I verify that I am currently a faculty / teaching staff member at this institution.'}
            </span>
          </label>

          {/* Create Account CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-[14px] shadow-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  <span>{role === 'STUDENT' ? 'Registering Student...' : 'Registering Teacher...'}</span>
                </>
              ) : (
                <>
                  <span>{role === 'STUDENT' ? 'Create Student Account' : 'Create Teacher Account'}</span>
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
                className="font-medium text-primary hover:underline ml-0.5 cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      </div>

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
                Only official NMIET college email addresses are accepted. Please enter your college email address ending in{' '}
                <strong className="text-primary font-semibold">@nmiet.edu.in</strong> to continue.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-[12px] font-mono mt-1 border border-surface-container-high">
                <span className="text-secondary font-sans font-medium">Example:</span>
                <span className="font-semibold text-primary">
                  {role === 'STUDENT' ? 'yourname@nmiet.edu.in' : 'faculty.name@nmiet.edu.in'}
                </span>
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
