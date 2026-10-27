import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<{ total: number; active: number; resolved: number }>({
    total: 0,
    active: 0,
    resolved: 0,
  });

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      api.getGrievances({ limit: 100 })
        .then((res) => {
          const list = res.items || [];
          const resolved = list.filter((g) => g.status === 'RESOLVED').length;
          setStats({
            total: list.length,
            active: list.length - resolved,
            resolved,
          });
        })
        .catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col w-full pb-24 space-y-4 animate-fade-in max-w-xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center text-[22px] font-bold shadow-sm shrink-0">
          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[19px] font-bold text-on-surface truncate">{user.name}</h2>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
              {user.role === 'GRIEVANCE_CELL'
                ? 'Grievance Cell'
                : user.role === 'OFFICER'
                ? 'HOD'
                : user.role === 'TEACHER'
                ? 'Teacher / Faculty'
                : 'Student'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <a
              href={`mailto:${user.email}`}
              className="text-[12px] text-secondary hover:text-primary hover:underline font-mono truncate inline-flex items-center gap-1"
              title="Send email"
            >
              <span className="material-symbols-outlined text-[14px]">mail</span>
              <span>{user.email}</span>
            </a>
            {user.phone && (
              <a
                href={`tel:${user.phone.replace(/[\s-]/g, '')}`}
                className="text-[12px] text-secondary hover:text-primary hover:underline font-mono inline-flex items-center gap-1"
                title="Call phone"
              >
                <span className="material-symbols-outlined text-[14px]">call</span>
                <span>{user.phone}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Complainant Grievance Stats Strip (Student & Teacher) */}
      {(user.role === 'STUDENT' || user.role === 'TEACHER') && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container text-center shadow-sm">
            <span className="text-[11px] text-secondary block font-medium">Lodged</span>
            <span className="text-[20px] font-bold text-on-surface mt-0.5 block">{stats.total}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container text-center shadow-sm">
            <span className="text-[11px] text-secondary block font-medium">In Progress</span>
            <span className="text-[20px] font-bold text-primary mt-0.5 block">{stats.active}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container text-center shadow-sm">
            <span className="text-[11px] text-secondary block font-medium">Resolved</span>
            <span className="text-[20px] font-bold text-emerald-700 block mt-0.5">{stats.resolved}</span>
          </div>
        </div>
      )}

      {/* Academic / Faculty / Staff Details */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container space-y-3.5">
        <h3 className="text-[14px] font-semibold text-on-surface border-b border-surface-container pb-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
          <span>
            {user.role === 'STUDENT'
              ? 'Academic Registry Profile'
              : user.role === 'TEACHER'
              ? 'Faculty Registry Profile'
              : 'Staff Assignment'}
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          {user.role === 'STUDENT' ? (
            <>
              <div>
                <span className="text-[11px] text-secondary block font-medium">Academic Department</span>
                <span className="font-semibold text-on-surface mt-0.5 block">{user.academic_department || 'Computer Engineering'}</span>
              </div>
              <div>
                <span className="text-[11px] text-secondary block font-medium">Academic Year</span>
                <span className="font-semibold text-on-surface mt-0.5 block">{user.year || 'TE'}</span>
              </div>
              <div>
                <span className="text-[11px] text-secondary block font-medium">Class Division</span>
                <span className="font-semibold text-on-surface mt-0.5 block">{user.division || 'Div B'}</span>
              </div>
              <div>
                <span className="text-[11px] text-secondary block font-medium">Portal Status</span>
                <span className="font-semibold text-primary mt-0.5 block">Active Student</span>
              </div>
            </>
          ) : user.role === 'TEACHER' ? (
            <>
              <div>
                <span className="text-[11px] text-secondary block font-medium">Academic Department</span>
                <span className="font-semibold text-on-surface mt-0.5 block">{user.academic_department || 'Computer Engineering'}</span>
              </div>
              <div>
                <span className="text-[11px] text-secondary block font-medium">Designation / Role</span>
                <span className="font-semibold text-on-surface mt-0.5 block">{user.division || 'Assistant Professor'}</span>
              </div>
              <div>
                <span className="text-[11px] text-secondary block font-medium">Institution</span>
                <span className="font-semibold text-on-surface mt-0.5 block">{user.college_display_name || 'NMIET Pune'}</span>
              </div>
              <div>
                <span className="text-[11px] text-secondary block font-medium">Portal Status</span>
                <span className="font-semibold text-primary mt-0.5 block">Active Faculty</span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-[11px] text-secondary block font-medium">Assigned Service Unit</span>
              <span className="font-semibold text-on-surface mt-0.5 block">{user.department_name || 'Central Administration'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out CTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={logout}
          className="w-full h-12 rounded-xl bg-error-container hover:bg-error/20 text-on-error-container font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Sign Out of CampusFix AI</span>
        </button>
      </div>

      {/* Footnote */}
      <p className="text-[11px] text-secondary text-center leading-relaxed">
        CampusFix AI — AI-Powered College Grievance Management
      </p>
    </div>
  );
};
