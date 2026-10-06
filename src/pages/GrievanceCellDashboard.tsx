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
      {/* Operational Breadcrumb & Context (Stitch Image 7) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-secondary font-semibold">
            Campus Central Operations
          </span>
          <span className="text-secondary text-[12px]">/</span>
          <span className="text-[13px] font-semibold text-primary">
            Master Triage & Ticket Dispatch
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed text-[11px] font-medium">
            Auto-Sync 15s
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-secondary">
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-tertiary-container">schedule</span>
            <span>Real-Time Shift: Morning (08:00 - 16:30 IST)</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">sensors</span>
            <span>Gateways Active: 14 Nodes</span>
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
              <span className="inline-flex items-center text-[12px] font-semibold text-tertiary-container">
                <span className="material-symbols-outlined text-[13px]">trending_up</span> +5 today
              </span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-primary-container h-full rounded-full" style={{ width: '72%' }}></div>
            </div>
          </div>
        </div>

        {/* Stat 2: AI Triage Precision */}
        <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-secondary">AI Triage Precision</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-tertiary-container">
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-on-surface tracking-tight">94.2%</span>
              <span className="text-[11px] text-secondary">target &gt;90%</span>
            </div>
            <p className="text-[11px] text-secondary mt-1">40 auto-assigned with zero human correction</p>
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

        {/* Stat 5: Mean Turnaround */}
        <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-secondary">Mean Turnaround</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px]">timelapse</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-on-surface tracking-tight">11.4h</span>
              <span className="text-[11px] text-tertiary-container font-semibold">Within 24h</span>
            </div>
            <p className="text-[11px] text-secondary mt-1">-2.1h vs previous campus week</p>
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
              <option value="overdue">Breached (&gt;0h)</option>
              <option value="due_soon">&lt; 6 Hours Left</option>
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

          {/* Campus Live Infrastructure Activity Feed */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">sensors</span>
                <h3 className="text-[14px] font-semibold text-on-surface">Campus Infrastructure Activity Feed</h3>
              </div>
              <span className="text-[11px] text-secondary">Verified Sensor & Student Submissions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[15px]">water_drop</span>
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-[13px] text-on-surface block truncate">Hostel D Sump Sensor</span>
                  <p className="text-[11px] text-error font-medium">Critical level dropped below 15%</p>
                  <span className="text-[10px] text-secondary">12 mins ago · Auto-Logged</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#D1FAE5] text-[#065F46] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[15px]">dns</span>
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-[13px] text-on-surface block truncate">Core Switch Block B</span>
                  <p className="text-[11px] text-[#065F46] font-medium">VLAN 20 latency normalized (12ms)</p>
                  <span className="text-[10px] text-secondary">38 mins ago · Auto-Closed</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[15px]">qr_code_scanner</span>
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-[13px] text-on-surface block truncate">Room 304 AC Triage</span>
                  <p className="text-[11px] text-secondary">QR ticket submitted via student app</p>
                  <span className="text-[10px] text-secondary">1 hr ago · Assigned to Santosh S.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Side Command Widgets (3 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* SLA Resolution Health Gauge Card */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                SLA Resolution Health
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-tertiary-container text-[11px] font-bold">
                Target 90%
              </span>
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  ></path>
                  <path
                    className="text-primary-container"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="92, 100"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  ></path>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-[16px] font-bold text-on-surface">92%</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-on-surface leading-snug">
                  Institutional Target Met
                </span>
                <span className="text-[11px] text-secondary mt-0.5">
                  Resolving inside designated turnaround SLA
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-surface-container flex justify-between text-[11px] text-secondary">
              <span>Weekly Target: <strong>90.0%</strong></span>
              <span className="text-tertiary-container font-semibold">+1.8% vs last cycle</span>
            </div>
          </div>

          {/* Department Workload Distribution */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-primary">groups_3</span>
                <h3 className="text-[14px] font-semibold text-on-surface">Queue Distribution</h3>
              </div>
              <span className="text-[11px] text-secondary">{totalCount} Active</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1 text-[12px]">
                  <span className="font-medium text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-amber-600">bolt</span>
                    <span>Electrical</span>
                  </span>
                  <span className="font-semibold text-secondary">14 tickets (33%)</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-600 h-full rounded-full" style={{ width: '70%' }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-secondary mt-0.5">
                  <span>Crew active: 4 / 6</span>
                  <span className="text-amber-800 font-medium">1 near breach</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[12px]">
                  <span className="font-medium text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-primary">handyman</span>
                    <span>Civil & Sanitation</span>
                  </span>
                  <span className="font-semibold text-secondary">12 tickets (28%)</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '60%' }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-secondary mt-0.5">
                  <span>Crew active: 5 / 5</span>
                  <span className="text-error font-semibold">1 Escalated</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[12px]">
                  <span className="font-medium text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">router</span>
                    <span>IT & Campus Net</span>
                  </span>
                  <span className="font-semibold text-secondary">11 tickets (26%)</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-tertiary-container h-full rounded-full" style={{ width: '55%' }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-secondary mt-0.5">
                  <span>Crew active: 3 / 4</span>
                  <span>1 unassigned</span>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Resolution Protocol */}
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
                <span className="font-mono text-secondary">24 hours</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-amber-700">High Tier</span>
                <span className="font-mono text-secondary">48 hours</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-primary">Medium Tier</span>
                <span className="font-mono text-secondary">72 hours</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                <span className="font-semibold text-secondary">Low Tier</span>
                <span className="font-mono text-secondary">168 hours</span>
              </div>
            </div>
          </div>

          {/* AI NLP Engine Status */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-tertiary-container">psychology</span>
                <span className="text-[13px] font-semibold text-on-surface">NLP Engine Status</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              Multi-lingual student grievance classifier v2.4 initialized with Marathi & Hinglish colloquial detection.
            </p>
            <div className="p-2 rounded bg-surface-container-low text-[11px] text-secondary font-mono flex items-center justify-between border border-surface-container">
              <span>Latent Query Latency</span>
              <span className="text-on-surface font-semibold">142ms</span>
            </div>
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
