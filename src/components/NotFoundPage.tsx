import React from 'react';

interface NotFoundPageProps {
  onReturnHome: () => void;
  onReportIssue?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onReturnHome, onReportIssue }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center max-w-lg mx-auto animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center text-primary mb-5 shadow-sm">
        <span className="material-symbols-outlined text-[44px]">search_off</span>
      </div>

      <span className="text-[12px] font-bold uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 mb-2">
        404 — Page or Ticket Not Found
      </span>

      <h1 className="text-[26px] font-bold text-on-surface tracking-tight mt-1">
        We couldn't locate this page
      </h1>

      <p className="text-[14px] text-secondary mt-2 leading-relaxed max-w-md">
        The ticket, report, or screen you requested does not exist, belongs to another college institution, or is outside your current access authorization.
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full sm:w-auto">
        <button
          type="button"
          onClick={onReturnHome}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
          <span>Return to Dashboard</span>
        </button>

        {onReportIssue && (
          <button
            type="button"
            onClick={onReportIssue}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-[14px] flex items-center justify-center gap-2 border border-surface-container-high transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Report New Issue</span>
          </button>
        )}
      </div>

      {/* Emergency contact box */}
      <div className="mt-8 p-4 rounded-xl bg-surface-container-lowest border border-surface-container max-w-sm w-full text-left">
        <div className="flex items-center gap-2 text-[12px] font-bold text-on-surface uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-[16px] text-primary">support_agent</span>
          <span>Need Immediate Help?</span>
        </div>
        <p className="text-[12px] text-secondary">
          Contact the Campus Grievance Helpdesk directly:
        </p>
        <div className="flex flex-col gap-1 mt-2 text-[12px]">
          <a
            href="tel:+919822044910"
            className="text-primary hover:underline font-mono inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">call</span>
            <span>+91 98220 44910</span>
          </a>
          <a
            href="mailto:grievance@nmiet.edu.in"
            className="text-primary hover:underline font-mono inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">mail</span>
            <span>grievance@nmiet.edu.in</span>
          </a>
        </div>
      </div>
    </div>
  );
};
