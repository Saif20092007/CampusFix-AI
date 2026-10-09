import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AnalyticsSummary, Grievance } from '../types';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

interface AnalyticsPageProps {
  onBack: () => void;
}

const COLORS = ['#1e3a8a', '#0284c7', '#0d9488', '#ea580c', '#e11d48', '#8b5cf6'];
const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#ca8a04',
  Low: '#64748b',
};

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  // Grievance Cell and Admin roles are authorized to export
  const isAuthorized = user?.role === 'GRIEVANCE_CELL' || user?.role === 'ADMIN';

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.getAnalyticsSummary(),
      api.getGrievances({ limit: 1000 }).then((res) => res.items || []).catch(() => [] as Grievance[]),
    ])
      .then(([summaryData, grievanceItems]) => {
        setData(summaryData);
        setGrievances(grievanceItems);
      })
      .catch((err) => setError(err.message || 'Failed to load analytics'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleExportCsv = async () => {
    if (!isAuthorized) {
      setExportToast('Access restricted: Only Grievance Cell and Admin roles can export data.');
      return;
    }
    setIsExporting(true);
    const dateStr = new Date().toISOString().split('T')[0];
    try {
      // Attempt server-side CSV export first
      const blob = await api.exportAnalyticsCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CampusFix_Institutional_Grievances_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExportToast(`Downloaded CampusFix_Institutional_Grievances_${dateStr}.csv`);
    } catch (_err) {
      // Client-side fallback if server route is unavailable
      const headers = [
        'Ticket ID',
        'Summary',
        'Description',
        'Category',
        'Department',
        'Priority',
        'Status',
        'Location',
        'Student Name',
        'Student Dept',
        'Student Year',
        'Student Division',
        'Submitted At',
        'Due Date',
        'SLA Status',
        'Resolved At',
      ];
      const rows = grievances.map((g) => [
        escapeCsv(g.display_no),
        escapeCsv(g.summary),
        escapeCsv(g.description),
        escapeCsv(g.category_name || 'Other'),
        escapeCsv(g.department_name || 'Other'),
        escapeCsv(g.priority),
        escapeCsv(g.status),
        escapeCsv(g.location),
        escapeCsv(g.student?.full_name || g.student?.first_name || g.student_name || 'Student'),
        escapeCsv(g.student?.academic_department || g.student_academic_dept || 'N/A'),
        escapeCsv(g.student?.year || g.student_year || 'N/A'),
        escapeCsv(g.student?.division || g.student_division || 'N/A'),
        escapeCsv(g.created_at),
        escapeCsv(g.due_at),
        escapeCsv(g.sla?.status || 'N/A'),
        escapeCsv(g.resolved_at || ''),
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CampusFix_Institutional_Grievances_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExportToast(`Exported ${grievances.length} grievances to CampusFix_Institutional_Grievances_${dateStr}.csv`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportToast(null), 4500);
    }
  };

  const handleExportPdf = () => {
    if (!data) return;
    if (!isAuthorized) {
      setExportToast('Access restricted: Only Grievance Cell and Admin roles can export data.');
      return;
    }
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString();

      // Top Header Banner
      doc.setFillColor(30, 58, 138); // Deep Navy (#1e3a8a)
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('CAMPUSFIX AI — INSTITUTIONAL GRIEVANCE REPORT', 14, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Nutan Maharashtra Institute of Engineering & Technology (NMIET) | Official Compliance Export', 14, 18);

      // Metadata info strip
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.text(`Generated: ${dateStr} ${timeStr}`, 14, 30);
      doc.text(`Authorized Role: ${user?.role || 'GRIEVANCE_CELL'} (${user?.name || 'Administrator'})`, 105, 30);
      doc.text(`Overall SLA Health: ${data.sla_compliance}%`, 14, 35);
      doc.text(`Total Registered Grievances: ${data.total}`, 105, 35);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, 38, 196, 38);

      // Section 1: KPI Overview
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Executive Compliance & Resolution Metrics', 14, 45);

      const kpis = [
        { label: 'Total', value: data.total },
        { label: 'Open', value: data.open },
        { label: 'In Progress', value: data.in_progress },
        { label: 'Escalated', value: data.escalated },
        { label: 'Resolved', value: data.resolved },
        { label: 'Overdue', value: data.overdue },
      ];

      let boxX = 14;
      const boxW = 28;
      const boxH = 16;
      kpis.forEach((kpi) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(boxX, 48, boxW, boxH, 2, 2, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, boxX + 2, 53);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.text(String(kpi.value), boxX + 2, 60);

        boxX += boxW + 2.5;
      });

      // Section 2: Department Workload Table
      let currentY = 72;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('2. Departmental Workload & Distribution', 14, currentY);

      currentY += 5;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY, 182, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Department Name', 16, currentY + 4.2);
      doc.text('Complaint Count', 120, currentY + 4.2);
      doc.text('Share (%)', 160, currentY + 4.2);

      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      const deptEntries = Object.entries(data.department_counts);
      deptEntries.forEach(([dName, count]) => {
        const pct = data.total > 0 ? ((count / data.total) * 100).toFixed(1) : '0';
        doc.setDrawColor(241, 245, 249);
        doc.line(14, currentY + 5.5, 196, currentY + 5.5);
        doc.text(dName, 16, currentY + 4);
        doc.text(String(count), 120, currentY + 4);
        doc.text(`${pct}%`, 160, currentY + 4);
        currentY += 5.5;
      });

      // Section 3: Categories & Priority Distribution
      currentY += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('3. Category & Priority Classification Breakdown', 14, currentY);

      currentY += 5;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY, 182, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Category', 16, currentY + 4.2);
      doc.text('Incidents', 80, currentY + 4.2);
      doc.text('Priority Level', 120, currentY + 4.2);
      doc.text('Priority Count', 160, currentY + 4.2);

      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      const catEntries = Object.entries(data.category_counts);
      const prioEntries = Object.entries(data.priority_counts);
      const maxRows = Math.max(catEntries.length, prioEntries.length);

      for (let i = 0; i < maxRows; i++) {
        const cat = catEntries[i];
        const prio = prioEntries[i];
        doc.setDrawColor(241, 245, 249);
        doc.line(14, currentY + 5.5, 196, currentY + 5.5);
        if (cat) {
          doc.text(cat[0], 16, currentY + 4);
          doc.text(String(cat[1]), 80, currentY + 4);
        }
        if (prio) {
          doc.text(prio[0], 120, currentY + 4);
          doc.text(String(prio[1]), 160, currentY + 4);
        }
        currentY += 5.5;
      }

      // Section 4: Grievance Register
      currentY += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('4. Grievance Registry Summary', 14, currentY);

      currentY += 5;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY, 182, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Ticket ID', 16, currentY + 4.2);
      doc.text('Summary', 42, currentY + 4.2);
      doc.text('Department', 98, currentY + 4.2);
      doc.text('Priority', 142, currentY + 4.2);
      doc.text('Status', 168, currentY + 4.2);

      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);

      const displayList = grievances.slice(0, 15);
      displayList.forEach((g) => {
        if (currentY > 275) {
          doc.addPage();
          currentY = 20;
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, currentY + 5.5, 196, currentY + 5.5);
        doc.text(g.display_no || 'CF-XXXX', 16, currentY + 4);
        const truncatedSummary =
          (g.summary || '').length > 28 ? (g.summary || '').substring(0, 26) + '...' : g.summary || '';
        doc.text(truncatedSummary, 42, currentY + 4);
        const deptName = g.department_name || 'General';
        const truncatedDept = deptName.length > 20 ? deptName.substring(0, 18) + '...' : deptName;
        doc.text(truncatedDept, 98, currentY + 4);
        doc.text(g.priority, 142, currentY + 4);
        doc.text(g.status, 168, currentY + 4);
        currentY += 5.5;
      });

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 287, 196, 287);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Confidential Institutional Audit Document — CampusFix AI', 14, 292);
        doc.text(`Page ${p} of ${totalPages}`, 180, 292);
      }

      doc.save(`CampusFix_Institutional_Analytics_${dateStr}.pdf`);
      setExportToast(`Downloaded CampusFix_Institutional_Analytics_${dateStr}.pdf`);
    } catch (err: any) {
      console.error('PDF export error:', err);
      setExportToast('Failed to generate PDF. You can also use Print to PDF.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportToast(null), 4500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <span className="material-symbols-outlined text-[32px] animate-spin text-primary">progress_activity</span>
        <span className="text-[14px] text-secondary">Computing institutional analytics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-error-container text-on-error-container text-center flex flex-col items-center gap-3 my-4">
        <span className="material-symbols-outlined text-[32px] text-error">error</span>
        <p className="text-[14px] font-semibold">{error || 'Access restricted.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-4 rounded-xl bg-surface-container text-on-surface text-[13px] font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const categoryData = Object.entries(data.category_counts).map(([name, count]) => ({
    name,
    count,
  }));

  const departmentData = Object.entries(data.department_counts).map(([name, count]) => ({
    name: name.replace(' Maintenance', '').replace(' Administration', ''),
    count,
  }));

  const priorityData = Object.entries(data.priority_counts).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <div className="flex flex-col w-full pb-20 space-y-5 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
            title="Go Back"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-on-surface">Institutional Analytics</h1>
            <p className="text-[12px] text-secondary">Resolution Performance & Department Trends</p>
          </div>
        </div>

        {/* Action badges & Export controls */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-secondary-container text-on-secondary-container flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            SLA Health: {data.sla_compliance}%
          </span>

          {isAuthorized && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="h-8 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1.5 text-[12px] font-semibold shadow-xs disabled:opacity-50"
                title="Export complete grievance dataset as CSV file"
              >
                <span className="material-symbols-outlined text-[16px]">table_view</span>
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="h-8 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center gap-1.5 text-[12px] font-semibold shadow-xs disabled:opacity-50"
                title="Export institutional analytics report as PDF file"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
                title="Print / Save Page to PDF"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Institutional Export Banner for Grievance Cell & Admin */}
      {isAuthorized && (
        <div className="p-4 rounded-xl bg-linear-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900/40 border border-blue-200/70 dark:border-blue-900/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">file_download</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold text-on-surface">Compliance & Governance Export</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider">
                  Cell / Admin
                </span>
              </div>
              <p className="text-[12px] text-secondary mt-0.5">
                Download verified institutional records for accreditation review (NAAC / AICTE), departmental workload audits, or executive committee presentations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[12px] flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[17px]">table_chart</span>
              <span>CSV Dataset ({grievances.length || data.total})</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="h-9 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-[12px] flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
              <span>PDF Report (.pdf)</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-secondary block">Total</span>
          <span className="text-[22px] font-bold text-on-surface mt-1 block">{data.total}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-secondary block">Open</span>
          <span className="text-[22px] font-bold text-primary mt-1 block">{data.open}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-secondary block">In Progress</span>
          <span className="text-[22px] font-bold text-amber-700 mt-1 block">{data.in_progress}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-secondary block">Escalated</span>
          <span className="text-[22px] font-bold text-error mt-1 block">{data.escalated}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-secondary block">Resolved</span>
          <span className="text-[22px] font-bold text-emerald-700 mt-1 block">{data.resolved}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm">
          <span className="text-[11px] font-semibold text-secondary block">Overdue</span>
          <span className="text-[22px] font-bold text-error mt-1 block">{data.overdue}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: 30-Day Trend */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-on-surface">30-Day Complaint Trend</h3>
            <span className="text-[11px] text-secondary">Daily registrations</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={5} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1e3a8a" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Complaints by Category */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-on-surface">Complaints by Category</h3>
            <span className="text-[11px] text-secondary">Distribution</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e3a8a" radius={[6, 6, 0, 0]}>
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Complaints by Department */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-on-surface">Workload by Department</h3>
            <span className="text-[11px] text-secondary">Queue load</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Priority Distribution */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-on-surface">Priority Distribution</h3>
            <span className="text-[11px] text-secondary">Triage classification</span>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {priorityData.map((entry) => (
                    <Cell key={`p-${entry.name}`} fill={PRIORITY_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-[12px]">
            {priorityData.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p.name] }}></span>
                <span className="text-secondary">
                  {p.name}: <strong>{p.count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Export Toast Feedback */}
      {exportToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface border border-outline/30 shadow-xl animate-fade-in text-[13px] max-w-md">
          <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
          <span className="font-medium flex-1">{exportToast}</span>
          <button
            type="button"
            onClick={() => setExportToast(null)}
            className="text-secondary hover:text-on-surface ml-1"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

