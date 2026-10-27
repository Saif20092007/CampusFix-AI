import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PublicTrackingGrievance, GrievanceStatus } from '../types';
import { StatusChip } from '../components/StatusChip';
import { PriorityChip } from '../components/PriorityChip';
import { CampusFixLogo } from '../components/CampusFixLogo';

interface PublicTrackingPageProps {
  initialTicketId?: string;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
}

export const PublicTrackingPage: React.FC<PublicTrackingPageProps> = ({
  initialTicketId = '',
  onNavigateLogin,
  onNavigateRegister,
}) => {
  const [query, setQuery] = useState(initialTicketId || 'CF-00104');
  const [searchedId, setSearchedId] = useState<string>('');
  const [grievance, setGrievance] = useState<PublicTrackingGrievance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sampleTickets = [
    { label: '#CF-00104 (Wi-Fi Drops - Resolved)', id: 'CF-00104' },
    { label: '#CF-00124 (Hostel Lights - In Progress)', id: 'CF-00124' },
    { label: '#CF-00092 (Water Pump - Escalated)', id: 'CF-00092' },
    { label: '#4 (Quick ID Lookup)', id: '4' },
  ];

  const handleTrack = async (ticketRef: string) => {
    const clean = ticketRef.trim();
    if (!clean) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSearchedId(clean);

    try {
      const data = await api.trackPublicGrievance(clean);
      setGrievance(data);
    } catch (err: any) {
      setGrievance(null);
      setErrorMsg(err.message || `No grievance found matching reference '${clean}'.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialTicketId) {
      setQuery(initialTicketId);
      handleTrack(initialTicketId);
    } else {
      // Auto-load sample ticket 4 / CF-00104 for instant live preview
      handleTrack('CF-00104');
    }
  }, [initialTicketId]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrack(query);
  };

  const handleCopyReference = () => {
    if (!grievance) return;
    navigator.clipboard.writeText(grievance.display_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepState = (stepIndex: number, currentStatus: GrievanceStatus) => {
    const statusOrder: Record<GrievanceStatus, number> = {
      SUBMITTED: 1,
      ASSIGNED: 2,
      IN_PROGRESS: 3,
      ESCALATED: 3, // parallel high-urgency state
      RESOLVED: 4,
    };

    const currentOrder = statusOrder[currentStatus] || 1;
    if (currentOrder > stepIndex) return 'completed';
    if (currentOrder === stepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex-1 flex flex-col items-center w-full max-w-3xl mx-auto py-6 px-4 animate-fade-in pb-16">
      {/* Top Navigation Bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onNavigateLogin}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-[13px] font-semibold transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Sign In</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-secondary hidden sm:inline">Have an account?</span>
          <button
            type="button"
            onClick={onNavigateRegister}
            className="text-[12px] font-semibold text-primary hover:underline cursor-pointer"
          >
            Create Student Account
          </button>
        </div>
      </div>

      {/* Main Branding Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center p-2 mb-2 shadow-sm border border-surface-container-high">
          <CampusFixLogo size={36} />
        </div>
        <h1 className="text-[24px] sm:text-[28px] font-bold text-on-surface tracking-tight">
          Public Ticket Tracker
        </h1>
        <p className="text-[13px] sm:text-[14px] text-secondary max-w-md mt-1 leading-snug">
          Check live progress, department actions, and SLA deadlines on any campus complaint without logging in.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="w-full bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container mb-6">
        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-secondary text-[20px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Ticket Reference (e.g. CF-00104 or 4)"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-on-surface text-[14px] font-medium border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-xs transition-all uppercase placeholder:normal-case font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="h-12 px-6 rounded-xl bg-primary-container text-on-primary font-semibold text-[14px] flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Tracking...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">track_changes</span>
                <span>Track Complaint</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Chips */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-surface-container text-[12px]">
          <span className="text-secondary font-medium mr-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">tips_and_updates</span>
            Try sample:
          </span>
          {sampleTickets.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => {
                setQuery(sample.id);
                handleTrack(sample.id);
              }}
              className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-mono text-[11px] font-semibold border border-surface-container-high transition-colors cursor-pointer"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error / Not Found View */}
      {errorMsg && (
        <div className="w-full p-6 rounded-2xl bg-error-container text-on-error-container flex flex-col items-center text-center gap-2.5 animate-fade-in border border-error/20 mb-6">
          <div className="w-12 h-12 rounded-full bg-error/15 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[28px]">search_off</span>
          </div>
          <h2 className="text-[17px] font-bold">Ticket Not Found</h2>
          <p className="text-[13px] max-w-md leading-relaxed">
            {errorMsg}
          </p>
          <span className="text-[11px] opacity-80 mt-1">
            Tip: You can use the reference code like <strong>CF-00104</strong>, numeric ID <strong>4</strong>, or your tracking token.
          </span>
        </div>
      )}

      {/* Ticket Details View */}
      {grievance && !isLoading && (
        <div className="w-full flex flex-col gap-4 animate-fade-in">
          {/* Main Hero Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
            {/* Header: Reference + Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container pb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[12px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold tracking-wider font-mono">
                  {grievance.display_no}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReference}
                  title="Copy Ticket Reference"
                  className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                </button>
                {copied && <span className="text-[11px] text-emerald-600 font-semibold animate-fade-in">Copied!</span>}
              </div>

              <div className="flex items-center gap-2">
                <PriorityChip priority={grievance.priority} size="sm" />
                <StatusChip status={grievance.status} size="sm" />
              </div>
            </div>

            {/* Title & Summary */}
            <div>
              <h2 className="text-[19px] sm:text-[21px] font-bold text-on-surface tracking-tight leading-snug">
                {grievance.summary}
              </h2>
              <p className="text-[13px] text-secondary mt-1.5 leading-relaxed">
                {grievance.description}
              </p>
            </div>

            {/* Info Grid: Location, Department, Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">location_on</span>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-secondary block tracking-wider">Location</span>
                  <span className="text-[12px] font-semibold text-on-surface truncate block" title={grievance.location}>
                    {grievance.location}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">domain</span>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-secondary block tracking-wider">Department</span>
                  <span className="text-[12px] font-semibold text-on-surface truncate block" title={grievance.department_name}>
                    {grievance.department_name}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">category</span>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-secondary block tracking-wider">Category</span>
                  <span className="text-[12px] font-semibold text-on-surface truncate block" title={grievance.category_name}>
                    {grievance.category_name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Progress Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-secondary mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-primary">linear_scale</span>
              <span>Resolution Workflow Progress</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
              {[
                { step: 1, label: 'Submitted', icon: 'send', desc: 'Complaint logged' },
                { step: 2, label: 'Assigned', icon: 'forward_to_inbox', desc: grievance.department_name },
                { step: 3, label: 'In Progress', icon: 'construction', desc: 'Technician on-site' },
                { step: 4, label: 'Resolved', icon: 'task_alt', desc: grievance.status === 'RESOLVED' ? 'Issue closed' : 'Pending resolution' },
              ].map((stepObj) => {
                const state = getStepState(stepObj.step, grievance.status);
                const isCompleted = state === 'completed';
                const isCurrent = state === 'current';

                return (
                  <div
                    key={stepObj.step}
                    className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
                      isCurrent
                        ? 'bg-primary/5 border-primary text-primary shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : 'bg-surface-container-low border-surface-container text-secondary opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="material-symbols-outlined text-[18px]">
                        {isCompleted ? 'check_circle' : stepObj.icon}
                      </span>
                      <span className="text-[10px] font-mono font-bold">
                        0{stepObj.step}
                      </span>
                    </div>
                    <span className="text-[12px] font-bold tracking-tight">
                      {stepObj.label}
                    </span>
                    <span className="text-[10px] opacity-80 truncate" title={stepObj.desc}>
                      {stepObj.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA & Time Metrics Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  grievance.status === 'RESOLVED'
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : grievance.sla.is_overdue
                    ? 'bg-error/15 text-error animate-pulse'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[26px]">
                  {grievance.status === 'RESOLVED'
                    ? 'verified'
                    : grievance.sla.is_overdue
                    ? 'timer_off'
                    : 'schedule'}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] uppercase font-bold text-secondary block tracking-wider">
                  Service Level Agreement (SLA)
                </span>
                <span className="text-[15px] font-bold text-on-surface block">
                  {grievance.sla.label || (grievance.status === 'RESOLVED' ? 'Resolution Completed' : 'Active Deadline')}
                </span>
                <span className="text-[11px] text-secondary">
                  Target Due: {new Date(grievance.due_at).toLocaleDateString()} at{' '}
                  {new Date(grievance.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {grievance.resolution_note && (
              <div className="w-full sm:max-w-xs p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-[12px]">
                <span className="font-bold block mb-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  Resolution Note:
                </span>
                <span>{grievance.resolution_note}</span>
              </div>
            )}
          </div>

          {/* Public Official Timeline */}
          {grievance.timeline && grievance.timeline.length > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-secondary mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-primary">history</span>
                <span>Public Official Updates & Timeline</span>
              </h3>

              <div className="relative pl-5 border-l-2 border-surface-container-high space-y-4">
                {grievance.timeline.map((item) => (
                  <div key={item.id} className="relative group">
                    <span className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-surface-container-lowest shadow-xs" />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-on-surface">
                          {item.status ? item.status.replace('_', ' ') : item.kind.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-secondary font-mono">
                          {new Date(item.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[12px] text-secondary leading-snug">
                        {item.note}
                      </p>
                      <span className="text-[10px] text-primary font-semibold">
                        Logged by {item.actor_role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container">
            <span className="text-[12px] text-secondary text-center sm:text-left">
              Need to submit a new complaint or manage existing tickets?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateLogin}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-[13px] shadow-sm hover:opacity-95 cursor-pointer"
              >
                Sign In to Student Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
