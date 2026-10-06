import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Grievance } from '../types';
import { StatusChip } from '../components/StatusChip';
import { PriorityChip } from '../components/PriorityChip';
import { SlaBadge } from '../components/SlaBadge';

interface OfficerDashboardProps {
  onSelectGrievance: (publicId: string) => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({ onSelectGrievance }) => {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const fetchGrievances = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGrievances({
        limit: 50,
        status: statusFilter,
        priority: priorityFilter,
        q: searchQ,
      });
      setGrievances(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, [user, statusFilter, priorityFilter]);

  const total = grievances.length;
  const inProgress = grievances.filter(g => g.status === 'IN_PROGRESS').length;
  const escalated = grievances.filter(g => g.status === 'ESCALATED').length;
  const resolved = grievances.filter(g => g.status === 'RESOLVED').length;
  const open = total - resolved;
  const overdue = grievances.filter(g => g.sla.status === 'OVERDUE' && g.status !== 'RESOLVED').length;
  const dueSoon = grievances.filter(g => g.sla.status === 'DUE_SOON').length;

  return (
    <div className="flex flex-col w-full pb-20 space-y-5 animate-fade-in">
      {/* Officer Department Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-secondary uppercase tracking-wider">
              Department Operations
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
              Department Queue
            </span>
          </div>
          <h1 className="text-[22px] font-bold text-on-surface mt-0.5">
            {user?.department_name || 'Department'} Queue
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-secondary">
            Officer on Duty: <strong>{user?.name}</strong>
          </span>
        </div>
      </div>

      {/* KPI Stats Strip: Open, In Progress, Escalated, Due Soon, Overdue */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-secondary block">Open</span>
          <span className="text-[24px] font-bold text-primary mt-1 block">{open}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-secondary block">In Progress</span>
          <span className="text-[24px] font-bold text-amber-700 mt-1 block">{inProgress}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-error block">Escalated</span>
          <span className="text-[24px] font-bold text-error mt-1 block">{escalated}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-amber-800 block">Due Soon (&lt;6h)</span>
          <span className="text-[24px] font-bold text-amber-900 mt-1 block">{dueSoon}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-error block">Overdue</span>
          <span className="text-[24px] font-bold text-error mt-1 block">{overdue}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGrievances()}
            placeholder="Search complaint text or Reference ID..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low text-on-surface text-[13px] border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-[12px] border border-surface-container cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-[12px] border border-surface-container cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* 1. DEDICATED OFFICER MOBILE QUEUE (Visible on small screens: md:hidden) */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[14px] font-semibold text-on-surface">Officer Mobile Queue</h3>
          <span className="text-[11px] text-secondary">{grievances.length} tickets</span>
        </div>

        {isLoading ? (
          <div className="p-8 rounded-xl bg-surface-container-lowest text-center text-secondary border border-surface-container">
            <span className="material-symbols-outlined text-[24px] animate-spin text-primary">progress_activity</span>
            <p className="mt-1 text-[13px]">Loading department queue...</p>
          </div>
        ) : grievances.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-container-lowest text-center text-secondary border border-surface-container text-[13px]">
            No grievances in queue matching active filters.
          </div>
        ) : (
          grievances.map((g) => {
            const isEscalated = g.status === 'ESCALATED';
            return (
              <div
                key={g.public_id}
                onClick={() => onSelectGrievance(g.public_id)}
                className={`p-4 rounded-xl bg-surface-container-lowest border shadow-sm space-y-2.5 active:scale-[0.99] transition-all cursor-pointer ${
                  isEscalated ? 'border-error/40 bg-error-container/5' : 'border-surface-container'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[12px] font-bold font-mono ${isEscalated ? 'text-error' : 'text-primary'}`}>
                    {g.display_no}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <PriorityChip priority={g.priority} size="sm" />
                    <StatusChip status={g.status} size="sm" />
                  </div>
                </div>

                <div>
                  <h4 className="text-[14px] font-semibold text-on-surface leading-snug">
                    {g.summary}
                  </h4>
                  <p className="text-[12px] text-secondary mt-0.5 line-clamp-2">
                    {g.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-secondary">
                  <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                  <span className="truncate">{g.location}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-container text-[12px]">
                  <SlaBadge sla={g.sla} variant="text" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectGrievance(g.public_id);
                    }}
                    className="h-8 px-3 rounded-lg bg-primary-container text-on-primary text-[12px] font-semibold flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP QUEUE TABLE (Hidden on mobile: hidden md:block) */}
      <div className="hidden md:block bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
        <div className="p-3.5 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-on-surface">Department Queue Table</h3>
          <span className="text-[11px] text-secondary">Authorized Unit: {user?.department_name}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface-container text-[11px] font-semibold text-secondary uppercase tracking-wider border-b border-surface-container-high">
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Complaint Summary</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">SLA Window</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-secondary">
                    <span className="material-symbols-outlined text-[24px] animate-spin text-primary">progress_activity</span>
                    <p className="mt-1">Loading department tickets...</p>
                  </td>
                </tr>
              ) : grievances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-secondary">
                    No complaints in your department queue matching current filters.
                  </td>
                </tr>
              ) : (
                grievances.map((g) => {
                  const isEscalated = g.status === 'ESCALATED';
                  return (
                    <tr
                      key={g.public_id}
                      className={`hover:bg-surface-container-low transition-colors ${
                        isEscalated ? 'bg-error-container/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-primary">
                        {g.display_no}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-on-surface block">{g.summary}</span>
                        <span className="text-[11px] text-secondary">{g.location}</span>
                      </td>
                      <td className="py-3 px-3">
                        <PriorityChip priority={g.priority} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        <StatusChip status={g.status} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        <SlaBadge sla={g.sla} variant="text" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectGrievance(g.public_id)}
                          className="h-8 px-3 rounded-lg bg-primary-container text-on-primary text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
