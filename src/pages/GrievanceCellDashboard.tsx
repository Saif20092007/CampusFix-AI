import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Grievance, Department } from '../types';
import { StatusChip } from '../components/StatusChip';
import { PriorityChip } from '../components/PriorityChip';
import { SlaBadge } from '../components/SlaBadge';

interface GrievanceCellDashboardProps {
  onSelectGrievance: (publicId: string) => void;
  onNavigateAnalytics?: () => void;
}

export const GrievanceCellDashboard: React.FC<GrievanceCellDashboardProps> = ({
  onSelectGrievance,
  onNavigateAnalytics,
}) => {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQ, setSearchQ] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'escalated' | 'resolved'>('all');

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSent, setAnnouncementSent] = useState(false);

  // Reassignment Modal state
  const [reassignGrievanceId, setReassignGrievanceId] = useState<string | null>(null);
  const [targetDeptId, setTargetDeptId] = useState<number>(1);
  const [targetTechName, setTargetTechName] = useState('');

  const fetchGrievances = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGrievances({
        limit: 50,
        status: activeTab === 'all' ? statusFilter : activeTab === 'pending' ? 'SUBMITTED' : activeTab === 'in_progress' ? 'IN_PROGRESS' : activeTab === 'escalated' ? 'ESCALATED' : 'RESOLVED',
        priority: priorityFilter,
        sla_state: slaFilter,
        department: deptFilter,
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
  }, [user, activeTab, deptFilter, priorityFilter, statusFilter, slaFilter]);

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(console.error);
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGrievances();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(grievances.map(g => g.public_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const [exportToast, setExportToast] = useState<string | null>(null);

  const handleExportCsv = (selectedOnly: boolean = false) => {
    const targetList =
      selectedOnly && selectedIds.length > 0
        ? grievances.filter((g) => selectedIds.includes(g.public_id))
        : grievances;

    if (targetList.length === 0) {
      alert('No grievances available in the current view to export.');
      return;
    }

    const headers = [
      'Ticket Number',
      'Summary',
      'Description',
      'Category',
      'Department',
      'Assigned Technician',
      'Priority',
      'Status',
      'Location',
      'Student Name',
      'Academic Department',
      'Year',
      'Division',
      'SLA Status',
      'SLA Time Remaining',
      'Due Date',
      'Resolution Note',
      'Created Date',
      'Resolved Date',
    ];

    const escapeCsvCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = targetList.map((g) => [
      escapeCsvCell(g.display_no),
      escapeCsvCell(g.summary),
      escapeCsvCell(g.description),
      escapeCsvCell(g.category_name || 'General'),
      escapeCsvCell(g.department_name || 'Central Administration'),
      escapeCsvCell(g.assigned_to_name || 'Unassigned'),
      escapeCsvCell(g.priority),
      escapeCsvCell(g.status),
      escapeCsvCell(g.location || 'Campus Premise'),
      escapeCsvCell(g.student_name || g.student?.full_name || 'Student'),
      escapeCsvCell(g.student_academic_dept || g.student?.academic_department || ''),
      escapeCsvCell(g.student_year || g.student?.year || ''),
      escapeCsvCell(g.student_division || g.student?.division || ''),
      escapeCsvCell(g.sla?.status || ''),
      escapeCsvCell(g.sla?.label || `${g.sla?.hours_remaining ?? 0}h remaining`),
      escapeCsvCell(g.due_at ? new Date(g.due_at).toLocaleString('en-IN') : ''),
      escapeCsvCell(g.resolution_note || ''),
      escapeCsvCell(g.created_at ? new Date(g.created_at).toLocaleString('en-IN') : ''),
      escapeCsvCell(g.resolved_at ? new Date(g.resolved_at).toLocaleString('en-IN') : ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = selectedOnly
      ? `CampusFix_Selected_Grievances_${dateStr}.csv`
      : `CampusFix_Grievances_Report_${dateStr}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportToast(`Exported ${targetList.length} ${targetList.length === 1 ? 'grievance' : 'grievances'} to ${filename}`);
    setTimeout(() => {
      setExportToast(null);
    }, 4500);
  };

  const handlePushAnnouncement = () => {
    if (!announcementText.trim()) return;
    setAnnouncementSent(true);
    setTimeout(() => {
      setAnnouncementSent(false);
      setAnnouncementText('');
    }, 2500);
  };

  const handleReassignSubmit = async () => {
    if (!reassignGrievanceId) return;
    try {
      await api.reassignGrievance(reassignGrievanceId, targetDeptId, targetTechName || undefined);
      setReassignGrievanceId(null);
      await fetchGrievances();
    } catch (err: any) {
      alert(err.message || 'Reassignment failed');
    }
  };

  // KPIs
  const totalCount = grievances.length;
  const inProgressCount = grievances.filter(g => g.status === 'IN_PROGRESS').length;
  const escalatedCount = grievances.filter(g => g.status === 'ESCALATED').length;
  const resolvedCount = grievances.filter(g => g.status === 'RESOLVED').length;
  const overdueCount = grievances.filter(g => g.sla.status === 'OVERDUE' && g.status !== 'RESOLVED').length;
  const dueSoonCount = grievances.filter(g => g.sla.status === 'DUE_SOON').length;

  return (
    <div className="flex flex-col w-full pb-20 space-y-6 animate-fade-in">
      {/* Operational Breadcrumb & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-secondary font-semibold">
            Campus Central Operations
          </span>
          <span className="text-secondary text-[12px]">/</span>
          <span className="text-[13px] font-semibold text-primary">
            Master Triage &amp; Ticket Dispatch
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-secondary">
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-secondary">schedule</span>
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-tertiary-container">receipt_long</span>
            <span>{grievances.length} tickets in view</span>
          </span>
        </div>
      </div>

      {/* 1. Header KPI Stat Cards Bar */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Stat 1: Total Active */}
        <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-secondary">Total Active Tickets</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-on-surface tracking-tight">{totalCount}</span>
              <span className="text-[11px] text-secondary">total tickets</span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full"
                style={{ width: totalCount > 0 ? `${Math.min(100, Math.round(((totalCount - overdueCount) / totalCount) * 100))}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Stat 2: Overdue Tickets */}
        <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-secondary">Overdue Tickets</span>
            <div className="w-7 h-7 rounded-lg bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[16px]">alarm_off</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-error tracking-tight">{String(overdueCount).padStart(2, '0')}</span>
              <span className="text-[11px] text-secondary">past SLA deadline</span>
            </div>
            <p className="text-[11px] text-secondary mt-1">Require immediate attention or escalation</p>
          </div>
        </div>

        {/* Stat 3: SLA At Risk (<6h) */}
        <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-secondary">SLA At Risk (&lt;6h)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <span className="material-symbols-outlined text-[16px]">warning</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-amber-900 tracking-tight">
                {String(dueSoonCount).padStart(2, '0')}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-amber-900 text-[10px] font-semibold">
                Pre-Breach
              </span>
            </div>
            <p className="text-[11px] text-secondary mt-1">IT Cell & Civil teams notified</p>
          </div>
        </div>

        {/* Stat 4: Cell Escalation */}
        <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-error">Cell Escalation</span>
            <div className="w-7 h-7 rounded-lg bg-error-container flex items-center justify-center text-error animate-pulse">
              <span className="material-symbols-outlined text-[16px]">emergency_home</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-error tracking-tight">
                {String(escalatedCount).padStart(2, '0')}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container text-[10px] font-bold">
                URGENT
              </span>
            </div>
            <p className="text-[11px] text-secondary mt-1">Grievances requiring central cell review</p>
          </div>
        </div>

        {/* Stat 5: Resolved Count */}
        <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-secondary">Resolved</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-on-surface tracking-tight">{String(resolvedCount).padStart(2, '0')}</span>
              <span className="text-[11px] text-secondary">closed</span>
            </div>
            <p className="text-[11px] text-secondary mt-1">
              {totalCount > 0 ? `${Math.round((resolvedCount / totalCount) * 100)}% resolution rate` : 'No tickets yet'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Action & Filter Bar Section */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-4 border border-surface-container">
        {/* Top Row: Search & Actions */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between mb-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by Ticket ID (e.g. CF-00124), student name, department, or keywords..."
              className="w-full h-11 pl-11 pr-14 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline text-[13px] border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-surface-container text-secondary text-[11px] font-semibold"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => handleExportCsv(false)}
              className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center gap-1.5 text-[13px] font-medium shadow-xs transition-colors cursor-pointer"
              title="Export all displayed grievances to a CSV file"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">file_download</span>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center gap-1.5 text-[13px] font-medium"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">print</span>
              <span className="hidden sm:inline">Print Report</span>
            </button>

            {onNavigateAnalytics && (
              <button
                type="button"
                onClick={onNavigateAnalytics}
                className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center gap-1.5 text-[13px] font-semibold"
              >
                <span className="material-symbols-outlined text-[16px]">bar_chart_4_bars</span>
                <span>Analytics</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns Multi-Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          <div className="relative">
            <label className="block text-[11px] font-semibold text-secondary mb-1">Department Scope</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full h-10 px-3 pr-8 rounded-lg bg-surface-container-low text-on-surface text-[12px] border border-surface-container focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Departments ({totalCount})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 bottom-2 text-secondary pointer-events-none text-[16px]">
              keyboard_arrow_down
            </span>
          </div>

          <div className="relative">
            <label className="block text-[11px] font-semibold text-secondary mb-1">Severity / Impact</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-10 px-3 pr-8 rounded-lg bg-surface-container-low text-on-surface text-[12px] border border-surface-container focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical Emergency (P1)</option>
              <option value="High">High Operational (P2)</option>
              <option value="Medium">Medium Standard (P3)</option>
              <option value="Low">Low Preventive (P4)</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 bottom-2 text-secondary pointer-events-none text-[16px]">
              keyboard_arrow_down
            </span>
          </div>

          <div className="relative">
            <label className="block text-[11px] font-semibold text-secondary mb-1">Lifecycle Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 pr-8 rounded-lg bg-surface-container-low text-on-surface text-[12px] border border-surface-container focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="SUBMITTED">Submitted (Awaiting Triage)</option>
              <option value="ASSIGNED">Assigned to Crew</option>
              <option value="IN_PROGRESS">In Progress (Field Action)</option>
              <option value="ESCALATED">Escalated / Breached</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 bottom-2 text-secondary pointer-events-none text-[16px]">
              keyboard_arrow_down
            </span>
          </div>

          <div className="relative">
            <label className="block text-[11px] font-semibold text-secondary mb-1">SLA Threshold</label>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full h-10 px-3 pr-8 rounded-lg bg-surface-container-low text-on-surface text-[12px] border border-surface-container focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">Any Window</option>
              <option value="overdue">Breached (Overdue)</option>
              <option value="due_soon">Due Soon (25% window)</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 bottom-2 text-secondary pointer-events-none text-[16px]">
              keyboard_arrow_down
            </span>
          </div>
        </div>

        {/* Quick View Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-surface-container mt-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'bg-primary-container text-on-primary font-semibold'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            All Tickets ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeTab === 'pending'
                ? 'bg-primary-container text-on-primary font-semibold'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span>Pending Triage Review</span>
            <span className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-fixed text-[10px] flex items-center justify-center font-bold">
              {grievances.filter(g => g.status === 'SUBMITTED').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('in_progress')}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeTab === 'in_progress'
                ? 'bg-primary-container text-on-primary font-semibold'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span>In Progress</span>
            <span className="w-5 h-5 rounded-full bg-surface-container-highest text-secondary text-[10px] flex items-center justify-center">
              {inProgressCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('escalated')}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeTab === 'escalated'
                ? 'bg-error text-white font-semibold'
                : 'bg-surface-container text-error hover:bg-surface-container-high'
            }`}
          >
            <span>Escalated / Breached</span>
            <span className="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">
              {escalatedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeTab === 'resolved'
                ? 'bg-primary-container text-on-primary font-semibold'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span>Resolved</span>
            <span className="w-5 h-5 rounded-full bg-surface-container-highest text-secondary text-[10px] flex items-center justify-center">
              {resolvedCount}
            </span>
          </button>
        </div>
      </section>

      {/* 3. Split-Pane Layout: Master Data Table (9 cols) + Side Command Widgets (3 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column: Master Table Container */}
        <div className="xl:col-span-9 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-container-low border-b border-surface-container">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={selectedIds.length > 0 && selectedIds.length === grievances.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded text-primary-container focus:ring-0 cursor-pointer"
                />
                <span className="text-[13px] font-medium text-on-surface">
                  {selectedIds.length} Selected of {grievances.length} Grievances Displayed
                </span>
                <span className="text-[11px] text-secondary hidden md:inline">
                  Sorted by Urgency & SLA Breach Vector
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedIds.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportCsv(true)}
                      className="px-2.5 py-1 rounded-lg bg-surface text-primary text-[12px] font-semibold border border-primary/20 hover:bg-primary/10 flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                      title="Export only selected grievances to CSV"
                    >
                      <span className="material-symbols-outlined text-[15px]">file_download</span>
                      <span>Export Selected ({selectedIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedIds.length > 0) setReassignGrievanceId(selectedIds[0]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-surface text-on-surface text-[12px] font-medium border border-surface-container hover:bg-surface-container flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">tune</span>
                      <span>Reassign</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => alert(`Flagged ${selectedIds.length} tickets for expedited Grievance Cell review.`)}
                      className="px-2.5 py-1 rounded-lg bg-error-container text-error text-[12px] font-bold border border-error-container hover:opacity-90 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">priority_high</span>
                      <span>Escalate Selected</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleExportCsv(false)}
                    className="px-2.5 py-1 rounded-lg bg-surface text-on-surface text-[12px] font-medium border border-surface-container hover:bg-surface-container flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    title="Export all grievances in current view to CSV"
                  >
                    <span className="material-symbols-outlined text-[15px] text-primary">file_download</span>
                    <span>Export CSV ({grievances.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container text-[11px] font-semibold text-secondary uppercase tracking-wider border-b border-surface-container-high">
                    <th className="py-3 px-3 w-8"></th>
                    <th className="py-3 px-3 min-w-[200px]">Ticket & Issue Summary</th>
                    <th className="py-3 px-3 min-w-[150px]">Student / Submitter</th>
                    <th className="py-3 px-3 min-w-[140px]">Routing & Tech</th>
                    <th className="py-3 px-3 min-w-[120px]">Priority / Status</th>
                    <th className="py-3 px-3 min-w-[130px]">SLA & Engine</th>
                    <th className="py-3 px-3 text-right min-w-[130px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-body-md text-[13px]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-secondary">
                        <span className="material-symbols-outlined text-[24px] animate-spin text-primary">progress_activity</span>
                        <p className="mt-1">Loading grievance register...</p>
                      </td>
                    </tr>
                  ) : grievances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-secondary">
                        No grievances match the active criteria.
                      </td>
                    </tr>
                  ) : (
                    grievances.map((g) => {
                      const isSelected = selectedIds.includes(g.public_id);
                      const isEscalated = g.status === 'ESCALATED';

                      return (
                        <tr
                          key={g.public_id}
                          className={`hover:bg-surface-container-low transition-colors group ${
                            isEscalated ? 'bg-error-container/10' : ''
                          }`}
                        >
                          <td className="py-3 px-3 align-top">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(g.public_id)}
                              className="w-4 h-4 rounded text-primary-container focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Ticket & Summary */}
                          <td className="py-3 px-3 align-top">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className={`text-[12px] font-bold font-mono ${
                                  isEscalated ? 'text-error' : 'text-primary'
                                }`}
                              >
                                {g.display_no}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-surface-container text-secondary text-[10px] font-medium">
                                {g.location.split(',')[0]}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectGrievance(g.public_id)}
                              className="text-left font-semibold text-on-surface hover:text-primary transition-colors line-clamp-2 leading-snug cursor-pointer"
                            >
                              {g.summary}
                            </button>
                            <span className="text-[11px] text-secondary block mt-0.5">
                              {g.description.slice(0, 65)}...
                            </span>
                          </td>

                          {/* Student */}
                          <td className="py-3 px-3 align-top">
                            <div className="flex flex-col">
                              <span className="font-semibold text-on-surface">{g.student_name || 'Student'}</span>
                              <span className="text-[11px] text-secondary">
                                {g.student_year ? `${g.student_year} ` : ''}{g.student_academic_dept || 'Engg'}
                              </span>
                              {g.student_phone && (
                                <span className="text-[10px] text-secondary font-mono">{g.student_phone}</span>
                              )}
                            </div>
                          </td>

                          {/* Routing & Tech */}
                          <td className="py-3 px-3 align-top">
                            <div className="flex flex-col">
                              <span className="font-medium text-on-surface flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px] text-secondary">domain</span>
                                <span>{g.department_name}</span>
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-secondary mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
                                <span>{g.assigned_to_name || 'Unassigned'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Priority / Status */}
                          <td className="py-3 px-3 align-top">
                            <div className="flex flex-col gap-1 items-start">
                              <PriorityChip priority={g.priority} size="sm" />
                              <StatusChip status={g.status} size="sm" />
                            </div>
                          </td>

                          {/* SLA & AI */}
                          <td className="py-3 px-3 align-top">
                            <div className="flex flex-col gap-0.5">
                              <SlaBadge sla={g.sla} variant="text" />
                              <span className="text-[10px] text-tertiary-container font-medium flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">psychology</span>
                                <span>AI Auto-Triage</span>
                              </span>
                            </div>
                          </td>

                          {/* Immediate Actions */}
                          <td className="py-3 px-3 align-top text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Reassign"
                                onClick={() => setReassignGrievanceId(g.public_id)}
                                className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                              </button>

                              <button
                                type="button"
                                title="View Ledger Detail"
                                onClick={() => onSelectGrievance(g.public_id)}
                                className="h-8 px-2.5 rounded-lg bg-primary-container text-on-primary text-[12px] font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
                              >
                                <span>Inspect</span>
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 bg-surface-container-low border-t border-surface-container flex items-center justify-between text-[12px] text-secondary">
              <span>Showing <strong>{grievances.length}</strong> master records</span>
              <div className="flex items-center gap-1">
                <button type="button" className="px-2.5 py-1 rounded bg-surface border border-surface-container text-secondary">Previous</button>
                <button type="button" className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-bold">1</button>
                <button type="button" className="px-2.5 py-1 rounded bg-surface border border-surface-container text-secondary">Next</button>
              </div>
            </div>
          </div>

        </div>
      </div>

        {/* Right Column: Side Command Widgets (3 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Live SLA Summary */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="material-symbols-outlined text-[18px] text-primary">monitor_heart</span>
              <span className="text-[13px] font-semibold text-on-surface">Live SLA Summary</span>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-error-container/30">
                <span className="text-secondary">Overdue</span>
                <span className="font-bold text-error">{String(overdueCount).padStart(2, '0')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="text-secondary">Due Soon</span>
                <span className="font-bold text-amber-700">{String(dueSoonCount).padStart(2, '0')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="text-secondary">Escalated</span>
                <span className="font-bold text-error">{String(escalatedCount).padStart(2, '0')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="text-secondary">In Progress</span>
                <span className="font-bold text-on-surface">{String(inProgressCount).padStart(2, '0')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="text-secondary">Resolved</span>
                <span className="font-bold text-primary">{String(resolvedCount).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Institutional SLA Standards */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">policy</span>
              <h3 className="text-[14px] font-semibold text-on-surface">Institutional SLA Standards</h3>
            </div>
            <p className="text-[11px] text-secondary">
              Standard turnaround thresholds enforced across all campus departments.
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-error">Critical Tier</span>
                <span className="font-mono text-secondary">24h &middot; Due Soon &lt;6h</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-amber-700">High Tier</span>
                <span className="font-mono text-secondary">48h &middot; Due Soon &lt;12h</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-primary">Medium Tier</span>
                <span className="font-mono text-secondary">72h &middot; Due Soon &lt;18h</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-secondary">Low Tier</span>
                <span className="font-mono text-secondary">168h &middot; Due Soon &lt;42h</span>
              </div>
            </div>
          </div>

          {/* AI Classification Engine */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-tertiary-container">psychology</span>
              <span className="text-[13px] font-semibold text-on-surface">AI Classification</span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              Google Gemini classifies each complaint into department, priority, and keywords. Falls back to keyword matching if AI is unavailable.
            </p>
            <div className="p-2 rounded bg-surface-container-low text-[11px] text-secondary flex items-center justify-between border border-surface-container">
              <span>Mode</span>
              <span className="text-on-surface font-semibold">Gemini + Keyword Fallback</span>
            </div>
          </div>
        </div>

      {/* Reassign Modal */}
      {reassignGrievanceId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3 border border-surface-container">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-on-surface">Reassign Service Department</h3>
              <button
                type="button"
                onClick={() => setReassignGrievanceId(null)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-secondary">
              Transfer this grievance to another department queue and re-notify personnel.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-secondary">Select Department</label>
              <select
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-[13px] border border-surface-container"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-secondary">Assign Technician (Optional)</label>
              <input
                type="text"
                value={targetTechName}
                onChange={(e) => setTargetTechName(e.target.value)}
                placeholder="e.g. Santosh Shinde"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-[13px] border border-surface-container"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignGrievanceId(null)}
                className="flex-1 h-10 rounded-lg bg-surface-container text-on-surface text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignSubmit}
                className="flex-1 h-10 rounded-lg bg-primary-container text-on-primary text-[13px] font-semibold"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Toast Notification */}
      {exportToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface border border-surface-container-high shadow-xl text-[13px] flex items-center gap-2.5 animate-slide-up">
          <span className="material-symbols-outlined text-[20px] text-emerald-600 dark:text-emerald-400 shrink-0">
            check_circle
          </span>
          <span className="font-medium flex-1">{exportToast}</span>
          <button
            type="button"
            onClick={() => setExportToast(null)}
            className="text-secondary hover:text-on-surface cursor-pointer p-0.5"
            aria-label="Dismiss toast"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
};
