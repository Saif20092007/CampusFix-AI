import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, logout, theme, setTheme } = useAuth();
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

  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    // Toggle directly between light and dark
    const nextTheme = isDarkMode ? 'light' : 'dark';
    setTheme(nextTheme);
  };

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
              {user.role === 'GRIEVANCE_CELL' ? 'Grievance Cell' : user.role === 'OFFICER' ? 'Department Officer' : 'Student'}
            </span>
          </div>
          <span className="text-[12px] text-secondary font-mono truncate mt-0.5">{user.email}</span>
        </div>
      </div>

      {/* Student Grievance Stats Strip (Student only) */}
      {user.role === 'STUDENT' && (
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

      {/* Academic / Staff Details (No Roll Number) */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container space-y-3.5">
        <h3 className="text-[14px] font-semibold text-on-surface border-b border-surface-container pb-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
          <span>{user.role === 'STUDENT' ? 'Academic Registry Profile' : 'Staff Assignment'}</span>
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
          ) : (
            <div>
              <span className="text-[11px] text-secondary block font-medium">Assigned Service Unit</span>
              <span className="font-semibold text-on-surface mt-0.5 block">{user.department_name || 'Central Administration'}</span>
            </div>
          )}
        </div>
      </div>

      {/* THEME TOGGLE CARD (Light / Dark Mode with Persistence in Local Storage) */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
            <h3 className="text-[14px] font-semibold text-on-surface">Display & Appearance</h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container font-mono text-secondary">
            {theme === 'system' ? 'System Mode' : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        {/* Quick 1-Click Toggle Switch Button */}
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDarkMode ? 'bg-amber-400/20 text-amber-300' : 'bg-primary/10 text-primary'}`}>
              <span className="material-symbols-outlined text-[22px]">
                {isDarkMode ? 'dark_mode' : 'light_mode'}
              </span>
            </div>
            <div>
              <span className="text-[13px] font-semibold text-on-surface block">
                {isDarkMode ? 'Dark Theme Active' : 'Light Theme Active'}
              </span>
              <span className="text-[11px] text-secondary">
                {isDarkMode ? 'Darkened contrast for low-light environments' : 'Bright interface with high readability'}
              </span>
            </div>
          </div>

          {/* Interactive Sliding Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isDarkMode ? 'bg-primary' : 'bg-surface-container-high'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[13px] ${
                isDarkMode ? 'translate-x-6 text-on-primary-container' : 'translate-x-0 text-amber-600'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {isDarkMode ? 'dark_mode' : 'light_mode'}
              </span>
            </span>
          </button>
        </div>

        {/* 3-State Segmented Selector: Light / Dark / System */}
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[12px] font-semibold text-secondary">Appearance Preference</span>
          <div className="grid grid-cols-3 gap-2 p-1 bg-surface-container rounded-xl border border-surface-container-high">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`py-2 px-3 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                theme === 'light'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">light_mode</span>
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`py-2 px-3 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">dark_mode</span>
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`py-2 px-3 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                theme === 'system'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">settings_brightness</span>
              <span>System</span>
            </button>
          </div>
          <span className="text-[11px] text-secondary mt-0.5">
            Your theme choice is stored in local storage and persists across your visits.
          </span>
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
