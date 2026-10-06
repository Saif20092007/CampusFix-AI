import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Grievance } from '../types';
import { StatusChip } from '../components/StatusChip';
import { PriorityChip } from '../components/PriorityChip';
import { SlaBadge } from '../components/SlaBadge';

interface StudentHomeProps {
  onReportClick: (category?: string) => void;
  onSelectGrievance: (publicId: string) => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({
  onReportClick,
  onSelectGrievance,
}) => {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'resolved'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrievances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGrievances({ limit: 50 });
      setGrievances(data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load your complaints');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, [user]);

  const activeCount = grievances.filter(g => g.status !== 'RESOLVED').length;
  const resolvedCount = grievances.filter(g => g.status === 'RESOLVED').length;

  const filteredGrievances = grievances.filter(g => {
    if (filterTab === 'active') return g.status !== 'RESOLVED';
    if (filterTab === 'resolved') return g.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-24 space-y-5 animate-fade-in">
      {/* Top Greeting Banner */}
      <div className="flex items-center justify-between py-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold text-on-surface tracking-tight">
              Good day, {user?.name.split(' ')[0] || 'Student'}
            </h1>
            <span className="inline-flex items-center justify-center text-[18px] animate-pulse select-none">
              👋
            </span>
          </div>
          <p className="text-[13px] text-secondary font-medium mt-0.5">
            {user?.year ? `${user.year} ` : ''}
            {user?.academic_department || 'Computer Engineering'}
            {user?.division ? ` · ${user.division}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-primary text-[11px] font-semibold shadow-sm shrink-0">
          <span className="w-2 h-2 rounded-full bg-tertiary-container animate-ping"></span>
          <span>{user?.college_display_name || 'NMIET'} Live</span>
        </div>
      </div>

      {/* Responsive Grid: 12 Cols on Desktop, Full Width on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Main Student Feed */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          {/* Prompt Card: Instant AI Report Trigger */}
          <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm space-y-4 border border-surface-container">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                  <span>AI-Assisted Resolution</span>
                </div>
                <h2 className="text-[18px] font-semibold text-on-surface">Have a problem on campus?</h2>
                <p className="text-[13px] text-secondary leading-relaxed">
                  Report maintenance, laboratory hardware, hostel issues, or water supply. AI analyzes and routes it to the designated department.
                </p>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 text-[12px] font-medium scrollbar-none">
              <button
                type="button"
                onClick={() => onReportClick('Electrical')}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] text-amber-600">bolt</span>
                <span>Electrical</span>
              </button>
              <button
                type="button"
                onClick={() => onReportClick('Wi-Fi / Lab')}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] text-primary">wifi</span>
                <span>Wi-Fi / Lab</span>
              </button>
              <button
                type="button"
                onClick={() => onReportClick('Sanitation')}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] text-tertiary">water_drop</span>
                <span>Sanitation</span>
              </button>
              <button
                type="button"
                onClick={() => onReportClick('Hostel')}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] text-secondary">bed</span>
                <span>Hostel</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => onReportClick()}
              className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-medium text-[15px] flex items-center justify-center gap-2 active:opacity-95 transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>+ Report an Issue</span>
            </button>
          </div>

          {/* Section Header with Segmented Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-on-surface">My Grievances</h3>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-semibold text-[12px]">
                {activeCount} Active
              </span>
            </div>

            <div className="inline-flex p-1 bg-surface-container rounded-xl border border-surface-container-high self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${
                  filterTab === 'all'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                All ({grievances.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('active')}
                className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${
                  filterTab === 'active'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('resolved')}
                className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${
                  filterTab === 'resolved'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Resolved ({resolvedCount})
              </button>
            </div>
          </div>

          {/* Loading & Error States */}
          {isLoading && (
            <div className="p-8 rounded-xl bg-surface-container-lowest text-center flex flex-col items-center justify-center gap-2 border border-surface-container">
              <span className="material-symbols-outlined text-[28px] animate-spin text-primary">progress_activity</span>
              <span className="text-[13px] text-secondary">Loading your grievances...</span>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-error-container text-on-error-container text-[13px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-error">error</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchGrievances}
                className="text-[12px] font-semibold underline text-error cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredGrievances.length === 0 && (
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-surface-container flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-3">
                <span className="material-symbols-outlined text-[32px]">folder_open</span>
              </div>
              <h4 className="text-[16px] font-semibold text-on-surface mb-1">
                {filterTab === 'all'
                  ? 'No grievances lodged yet'
                  : filterTab === 'active'
                  ? 'No active grievances'
                  : 'No resolved grievances yet'}
              </h4>
              <p className="text-[13px] text-secondary max-w-xs mb-4">
                {filterTab === 'all'
                  ? 'Your reported issues will appear here. If you encounter any maintenance or facility issue on campus, let us know.'
                  : 'All your issues are currently up to date!'}
              </p>
              {filterTab === 'all' && (
                <button
                  type="button"
                  onClick={() => onReportClick()}
                  className="h-10 px-5 rounded-xl bg-primary-container text-on-primary text-[13px] font-medium flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Report an Issue</span>
                </button>
              )}
            </div>
          )}

          {/* Grievances List */}
          {!isLoading && !error && filteredGrievances.length > 0 && (
            <div className="flex flex-col space-y-3.5">
              {filteredGrievances.map((grievance) => (
                <div
                  key={grievance.public_id}
                  onClick={() => onSelectGrievance(grievance.public_id)}
                  className="group rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container hover:border-surface-container-high transition-all active:scale-[0.99] flex flex-col space-y-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">
                        {grievance.display_no}
                      </span>
                      <span className="text-[12px] text-secondary font-medium">
                        {grievance.category_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PriorityChip priority={grievance.priority} size="sm" />
                      <StatusChip status={grievance.status} size="sm" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-[15px] font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">
                      {grievance.summary}
                    </h4>
                    <p className="text-[13px] text-secondary line-clamp-2 leading-relaxed">
                      {grievance.description}
                    </p>
                  </div>

                  {/* Location & Department */}
                  <div className="flex items-center gap-3 text-[12px] text-secondary flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                      <span className="truncate max-w-[200px]">{grievance.location}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-secondary">domain</span>
                      <span>{grievance.department_name}</span>
                    </span>
                  </div>

                  {/* Footer Metadata: SLA shown separately from status chips */}
                  <div className="flex items-center justify-between pt-1 text-secondary text-[12px] border-t border-surface-container">
                    <SlaBadge sla={grievance.sla} variant="text" />
                    <span className="text-on-surface-variant text-[11px]">
                      {new Date(grievance.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Desktop Guidance & Overview Widgets */}
        <div className="hidden lg:flex lg:col-span-4 flex-col space-y-4">
          {/* Quick Metrics Card */}
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container space-y-3">
            <h4 className="text-[14px] font-semibold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
              <span>Grievance Summary</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container">
                <span className="text-[20px] font-bold text-primary block">{grievances.length}</span>
                <span className="text-[11px] text-secondary">Total Lodged</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container">
                <span className="text-[20px] font-bold text-emerald-700 block">{resolvedCount}</span>
                <span className="text-[11px] text-secondary">Resolved</span>
              </div>
            </div>
          </div>

          {/* SLA Turnaround Standards Card */}
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container space-y-2.5">
            <h4 className="text-[14px] font-semibold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
              <span>Resolution Commitments</span>
            </h4>
            <p className="text-[11px] text-secondary">
              CampusFix AI automatically routes tickets according to college SLA turnaround standards:
            </p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-error">Critical</span>
                <span className="text-secondary font-mono">24 hours</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-amber-700">High</span>
                <span className="text-secondary font-mono">48 hours</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-primary">Medium</span>
                <span className="text-secondary font-mono">72 hours</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-secondary">Low</span>
                <span className="text-secondary font-mono">168 hours</span>
              </div>
            </div>
          </div>

          {/* Grievance Cell Desk Support */}
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm border border-surface-container space-y-2.5">
            <h4 className="text-[14px] font-semibold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">support_agent</span>
              <span>Grievance Cell Desk</span>
            </h4>
            <div className="text-[12px] text-secondary space-y-1">
              <p>Location: Central Estate Office, Ground Floor</p>
              <p>Desk Hours: Mon – Fri (09:00 AM – 05:00 PM)</p>
              <p>Email: grievance@nmiet.edu.in</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
