import React from 'react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, logout, theme, setTheme } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col w-full pb-24 space-y-4 animate-fade-in max-w-lg mx-auto">
      {/* Profile Header Card */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary text-[20px] font-bold shadow-md">
          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-[18px] font-bold text-on-surface truncate">{user.name}</h2>
          <span className="text-[12px] text-secondary font-mono truncate">{user.email}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
              {user.role}
            </span>
            <span className="text-[11px] text-secondary font-medium">
              {user.college_display_name}
            </span>
          </div>
        </div>
      </div>

      {/* Academic / Staff Details */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-3">
        <h3 className="text-[14px] font-semibold text-on-surface border-b border-surface-container pb-2">
          {user.role === 'STUDENT' ? 'Institutional Academic Profile' : 'Staff Assignment'}
        </h3>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <span className="text-[11px] text-secondary block font-medium">Institution</span>
            <span className="font-semibold text-on-surface mt-0.5 block">{user.college_name}</span>
          </div>

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
                <span className="text-[11px] text-secondary block font-medium">Division & Roll No</span>
                <span className="font-semibold text-on-surface mt-0.5 block">
                  {user.division || 'Div B'} · Roll {user.roll_no || '42'}
                </span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-[11px] text-secondary block font-medium">Service Department</span>
              <span className="font-semibold text-on-surface mt-0.5 block">{user.department_name || 'Central Administration'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Theme Preference Settings */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-3">
        <h3 className="text-[14px] font-semibold text-on-surface border-b border-surface-container pb-2">
          Display & Appearance
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] font-medium text-on-surface block">Theme Mode</span>
            <span className="text-[11px] text-secondary">Switch between light, dark, and system appearance</span>
          </div>

          <div className="inline-flex p-1 bg-surface-container rounded-xl border border-surface-container-high">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${
                theme === 'light' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-secondary'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${
                theme === 'dark' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-secondary'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${
                theme === 'system' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-secondary'
              }`}
            >
              System
            </button>
          </div>
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
        Version 2.4.0 · Institutional Multi-College Grievance Infrastructure
      </p>
    </div>
  );
};
