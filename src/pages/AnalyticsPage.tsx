import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AnalyticsSummary } from '../types';
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

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.getAnalyticsSummary()
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load analytics'))
      .finally(() => setIsLoading(false));
  }, []);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-on-surface">Institutional Analytics</h1>
            <p className="text-[12px] text-secondary">Grievance Cell Compliance & Trends</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
          SLA Health: {data.sla_compliance}%
        </span>
      </div>

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
                <span className="text-secondary">{p.name}: <strong>{p.count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
