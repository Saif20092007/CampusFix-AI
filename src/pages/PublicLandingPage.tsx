import React, { useState } from 'react';
import { CampusFixLogo } from '../components/CampusFixLogo';


interface PublicLandingPageProps {
  onLodgeGrievance: () => void;
  onTrackGrievance: (ticketRef?: string) => void;
  onDepartmentLogin: () => void;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  onLodgeGrievance,
  onTrackGrievance,
  onDepartmentLogin,
}) => {
  const [quickQuery, setQuickQuery] = useState('');
  const [fontSizeLevel, setFontSizeLevel] = useState<1 | 2 | 3>(2);

  const handleQuickTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTrackGrievance(quickQuery.trim() || 'CF-00104');
  };

  const sampleTickets = [
    { label: '#CF-00104 (Wi-Fi issue)', id: 'CF-00104' },
    { label: '#CF-00124 (Hostel Lights)', id: 'CF-00124' },
    { label: '#CF-00092 (Water Pump)', id: 'CF-00092' },
    { label: '#4 (Quick ID)', id: '4' },
  ];

  return (
    <div className={`min-h-screen bg-surface text-on-surface flex flex-col font-sans transition-all ${
      fontSizeLevel === 1 ? 'text-[13px]' : fontSizeLevel === 3 ? 'text-[16px]' : 'text-[14px]'
    }`}>


      {/* Top Government/College Banner Bar */}
      <header className="w-full bg-surface-container-lowest border-b border-surface-container-high px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-3">
          <CampusFixLogo size={42} />
          <div className="flex flex-col">
            <span className="font-bold text-[16px] sm:text-[18px] text-on-surface tracking-tight leading-tight">
              CampusFix AI
            </span>
            <span className="text-[11px] text-secondary font-medium">
              Nutan Maharashtra Institute of Engineering & Technology (NMIET)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Accessibility font size controls like state portal */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container text-secondary text-[12px] font-semibold border border-surface-container-high">
            <button
              type="button"
              onClick={() => setFontSizeLevel(1)}
              className={`px-1.5 py-0.5 rounded ${fontSizeLevel === 1 ? 'bg-primary text-on-primary font-bold' : 'hover:text-on-surface'}`}
              title="Decrease font size"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSizeLevel(2)}
              className={`px-1.5 py-0.5 rounded ${fontSizeLevel === 2 ? 'bg-primary text-on-primary font-bold' : 'hover:text-on-surface'}`}
              title="Default font size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSizeLevel(3)}
              className={`px-1.5 py-0.5 rounded ${fontSizeLevel === 3 ? 'bg-primary text-on-primary font-bold' : 'hover:text-on-surface'}`}
              title="Increase font size"
            >
              A+
            </button>
          </div>

          {/* Department Login CTA */}
          <button
            type="button"
            onClick={onDepartmentLogin}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-primary text-on-primary text-[12px] sm:text-[13px] font-semibold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">verified_user</span>
            <span>Department Login</span>
          </button>
        </div>
      </header>

      {/* Hero Section — Inspired by Maharashtra FDA Portal */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white p-6 sm:p-12 shadow-xl border border-indigo-600/30">
          {/* Subtle background glow blobs */}
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-24 -bottom-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl flex flex-col items-start gap-4">
            {/* Institution Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[12px] font-medium border border-white/20 text-indigo-100">
              <span className="material-symbols-outlined text-[15px] text-amber-300">verified</span>
              <span>Campus Grievance Redressal · NMIET Pune</span>
            </div>

            {/* Bold Headline */}
            <h1 className="text-[28px] sm:text-[42px] font-extrabold tracking-tight leading-tight sm:leading-none text-white">
              Safe Campus, Smart Maintenance, Better College Life
            </h1>

            {/* Subtitle */}
            <p className="text-[14px] sm:text-[16px] text-indigo-100/90 leading-relaxed font-normal">
              Report infrastructure, electrical, civil, hostel, or laboratory issues to the college administration. Your grievance automatically reaches the responsible department officer in real time.
            </p>

            {/* Primary Action Buttons — Side-by-side like Screenshot 1 */}
            <div className="flex flex-wrap items-center gap-3 pt-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onLodgeGrievance}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_box</span>
                <span>Lodge a Grievance</span>
              </button>

              <button
                type="button"
                onClick={() => onTrackGrievance()}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md text-white font-bold text-[15px] flex items-center justify-center gap-2 border border-white/30 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
                <span>Track a Grievance</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Track Input Bar Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 -mt-2 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">track_changes</span>
            </div>
            <div>
              <span className="text-[14px] font-bold text-on-surface block">
                Track Any Complaint Without Login
              </span>
              <span className="text-[12px] text-secondary">
                Enter your reference number (e.g., <strong>CF-00104</strong> or ID <strong>4</strong>)
              </span>
            </div>
          </div>

          <form onSubmit={handleQuickTrackSubmit} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Ticket Ref (e.g. CF-00104)"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-[13px] font-mono border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-primary text-on-primary font-semibold text-[13px] flex items-center gap-1.5 shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <span>Track Live</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </form>
        </div>

        {/* Quick sample chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1 text-[11px] text-secondary">
          <span>Quick test:</span>
          {sampleTickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTrackGrievance(t.id)}
              className="font-mono text-primary hover:underline cursor-pointer font-semibold"
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* How It Works Section — Three Simple Steps matching Screenshot 1 */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-on-surface tracking-tight">
            How it works
          </h2>
          <p className="text-[13px] sm:text-[14px] text-secondary mt-1">
            Three simple steps — it takes about two minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="relative bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container hover:border-surface-container-high hover:shadow-md transition-all flex flex-col gap-3 group">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-bold text-[12px] flex items-center justify-center">
                1
              </span>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">chat_bubble</span>
              </div>
            </div>

            <h3 className="text-[18px] font-bold text-on-surface mt-2">
              Describe it
            </h3>
            <p className="text-[13px] text-secondary leading-relaxed">
              Type or speak what happened — in English, Hindi, or Marathi. AI assistant picks up the details and location.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container hover:border-surface-container-high hover:shadow-md transition-all flex flex-col gap-3 group">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-bold text-[12px] flex items-center justify-center">
                2
              </span>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
              </div>
            </div>

            <h3 className="text-[18px] font-bold text-on-surface mt-2">
              AI reviews it
            </h3>
            <p className="text-[13px] text-secondary leading-relaxed">
              Our assistant checks the fault, classifies the department, sets priority level, and calculates strict SLA response times.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container hover:border-surface-container-high hover:shadow-md transition-all flex flex-col gap-3 group">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-bold text-[12px] flex items-center justify-center">
                3
              </span>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">gavel</span>
              </div>
            </div>

            <h3 className="text-[18px] font-bold text-on-surface mt-2">
              Officer acts
            </h3>
            <p className="text-[13px] text-secondary leading-relaxed">
              It reaches the right campus department head or Grievance Cell member, who investigates, fixes the problem, and updates you.
            </p>
          </div>
        </div>
      </section>

      {/* College Redressal Cell Details & Emergency Helpline */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 mb-6">
        <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <span className="text-[11px] uppercase tracking-wider font-bold text-primary">
              Campus Helpdesk & Grievance Cell
            </span>
            <h4 className="text-[16px] font-bold text-on-surface">
              Need urgent help on campus?
            </h4>
            <p className="text-[12px] text-secondary">
              Campus technicians and hostel wardens are on-call 24x7 for emergencies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="tel:+919822044910"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container text-on-surface text-[13px] font-mono font-semibold hover:border-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">call</span>
              <span>+91 98220 44910</span>
            </a>
            <a
              href="mailto:grievance@nmiet.edu.in"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container text-on-surface text-[13px] font-mono font-semibold hover:border-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">mail</span>
              <span>grievance@nmiet.edu.in</span>
            </a>
          </div>
        </div>
      </section>

      {/* Official Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-surface-container mt-auto py-8 px-4 sm:px-8 text-center text-[12px] text-secondary">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-[12px] font-medium text-secondary">
            <button type="button" onClick={onLodgeGrievance} className="hover:text-primary transition-colors cursor-pointer">
              Lodge Grievance
            </button>
            <span>&middot;</span>
            <button type="button" onClick={() => onTrackGrievance()} className="hover:text-primary transition-colors cursor-pointer">
              Track Status
            </button>
            <span>&middot;</span>
            <button type="button" onClick={onDepartmentLogin} className="hover:text-primary transition-colors cursor-pointer">
              Department Login
            </button>
            <span>&middot;</span>
            <span className="opacity-80">NMIET Pune</span>
          </div>

          <p className="text-[11px] opacity-75">
            © 2026 CampusFix AI · Nutan Maharashtra Institute of Engineering & Technology, Talegaon Dabhade, Pune.
          </p>
          <p className="text-[10px] opacity-60">
            Complies with AICTE National Grievance Redressal Portal standards.
          </p>
        </div>
      </footer>
    </div>
  );
};
