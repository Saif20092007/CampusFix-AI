import React, { useState } from 'react';
import { Grievance } from '../types';

interface ReportSuccessProps {
  grievance: Grievance;
  onTrackComplaint: (publicId: string) => void;
  onReturnHome: () => void;
}

export const ReportSuccess: React.FC<ReportSuccessProps> = ({
  grievance,
  onTrackComplaint,
  onReturnHome,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(grievance.display_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col w-full pb-20 space-y-5 animate-fade-in">
      {/* Interactive Confirmation Header */}
      <div className="relative flex flex-col items-center pt-2 pb-4 text-center overflow-hidden">
        {/* Ambient Halo */}
        <div className="absolute -top-12 w-48 h-48 bg-tertiary-fixed/30 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

        {/* Success Badge */}
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-tertiary-fixed opacity-40 scale-125 animate-ping duration-1000"></div>
          <div className="relative w-20 h-20 rounded-full bg-tertiary-fixed flex items-center justify-center shadow-sm">
            <span
              className="material-symbols-outlined text-[42px] text-tertiary-container"
              style={{ fontVariationSettings: "'wght' 700" }}
            >
              check_circle
            </span>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-surface-container-lowest px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-surface-container">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
            <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
              Logged
            </span>
          </div>
        </div>

        <h2 className="text-[22px] font-bold text-on-surface tracking-tight">
          Complaint Submitted
        </h2>
        <p className="text-[13px] text-secondary mt-1.5 max-w-xs leading-relaxed">
          Your grievance has been officially registered with college administration.
        </p>

        {/* AI Routing Micro-banner */}
        <div className="mt-3 px-3 py-1.5 rounded-full bg-secondary-container/60 border border-secondary-container flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-on-secondary-container">auto_awesome</span>
          <span className="text-[11px] text-on-secondary-container font-medium">
            Auto-triaged by CampusFix AI to {grievance.department_name || 'Estate Dept'}
          </span>
        </div>
      </div>

      {/* Primary Ticket Reference Bento */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-4 border border-surface-container">
        {/* Reference ID Header */}
        <div className="flex items-center justify-between bg-surface-container-low p-3.5 rounded-lg border border-surface-container">
          <div className="min-w-0">
            <span className="text-[11px] text-secondary uppercase tracking-wider block font-semibold">
              Reference ID
            </span>
            <span className="text-[20px] font-bold text-primary tracking-wider font-mono">
              {grievance.display_no}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all active:scale-95 flex items-center gap-1.5 ${
              copied
                ? 'bg-tertiary-fixed text-tertiary-container font-semibold'
                : 'bg-surface-container hover:bg-surface-container-high text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col justify-between border border-surface-container">
            <span className="text-[11px] text-secondary">Status</span>
            <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary-container text-on-secondary-container w-fit">
              <span className="material-symbols-outlined text-[14px]">subdirectory_arrow_right</span>
              <span className="text-[12px] font-medium">{grievance.status}</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col justify-between border border-surface-container">
            <span className="text-[11px] text-secondary">Priority Level</span>
            <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-error-container text-on-error-container w-fit">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span className="text-[12px] font-bold">{grievance.priority}</span>
            </div>
          </div>
        </div>

        {/* Department & Supervisor */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low border border-surface-container">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-primary">
              <span className="material-symbols-outlined text-[20px]">engineering</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-secondary">Target Department</span>
              <span className="text-[13px] font-semibold text-on-surface truncate">
                {grievance.department_name || 'Electrical Maintenance'}
              </span>
              <span className="text-[11px] text-secondary truncate">{grievance.location}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low border border-surface-container">
            <div className="w-9 h-9 rounded-lg bg-tertiary-fixed-dim/30 flex items-center justify-center shrink-0 mt-0.5 text-tertiary">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-secondary">Assigned Supervisor / Lead</span>
              <span className="text-[13px] font-semibold text-on-surface truncate">
                {grievance.assigned_to_name || 'Mr. R. V. Kulkarni'}
              </span>
              <span className="text-[11px] text-secondary">NMIET Central Estate Office</span>
            </div>
          </div>

          {/* SLA Timer Metric */}
          <div className="p-3.5 rounded-lg bg-surface-container flex flex-col gap-2 border border-surface-container-high">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">timer</span>
                <span className="text-[12px] font-semibold text-primary">Service Level Agreement (SLA)</span>
              </div>
              <span className="text-[11px] bg-surface-container-lowest px-2 py-0.5 rounded text-secondary font-medium">
                {grievance.priority === 'Critical' ? '24h' : grievance.priority === 'High' ? '48h' : '72h'} Window
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-on-surface">{grievance.sla.label}</span>
              <span className="text-[11px] text-secondary mt-0.5">
                Deadline: {new Date(grievance.due_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })} IST
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-primary-container h-full w-[16%] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Assurance Callout */}
      <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3">
        <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
          notifications_active
        </span>
        <p className="text-[12px] text-secondary leading-relaxed">
          You will receive real-time SMS alerts on your registered student mobile and app push updates whenever status changes or technician notes are filed.
        </p>
      </div>

      {/* Resolution Pipeline */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-secondary font-semibold uppercase tracking-wider">
            Resolution Pipeline
          </span>
          <span className="text-[11px] text-primary font-semibold">Step 2 of 4</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <div className="h-1.5 rounded-full bg-tertiary-container"></div>
          <div className="h-1.5 rounded-full bg-primary-container animate-pulse"></div>
          <div className="h-1.5 rounded-full bg-surface-container-highest"></div>
          <div className="h-1.5 rounded-full bg-surface-container-highest"></div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-secondary mt-1.5 px-0.5 font-medium">
          <span className="text-tertiary-container font-semibold">Received</span>
          <span className="text-primary font-bold">Assigned</span>
          <span>In Repair</span>
          <span>Verified</span>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => onTrackComplaint(grievance.public_id)}
          className="w-full h-12 bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary rounded-xl font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <span>Track Complaint</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>

        <button
          type="button"
          onClick={onReturnHome}
          className="w-full h-12 bg-transparent hover:bg-surface-container text-secondary hover:text-on-surface rounded-xl font-medium text-[14px] flex items-center justify-center transition-all cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};
