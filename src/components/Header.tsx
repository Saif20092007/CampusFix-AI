import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../types';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  notifications?: NotificationItem[];
  onOpenNotifications?: () => void;
  onNavigateHome?: () => void;
  onNavigateProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  notifications = [],
  onOpenNotifications,
  onNavigateHome,
  onNavigateProfile,
}) => {
  const { user, logout, switchDemoUser, theme, setTheme } = useAuth();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 pt-safe bg-surface/90 dark:bg-surface-container-lowest/90 backdrop-blur-xl border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-3">
        {/* Left: Brand or Back + Logo */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <button
              aria-label="Go Back"
              className="w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
              onClick={onBack || onNavigateHome}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          )}

          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={onNavigateHome}
          >
            <img
              alt="CampusFix AI NMIET Logo"
              className="h-8 w-auto object-contain shrink-0"
              src="https://lh3.googleusercontent.com/aida/AEtjO1VAHa6BtotIvGAQa_8ZdhoqIcJGzxLPAkqr8mAka7WvGC-Frw8-glwvYVf_oKeE7LyYE476u_KUCKZ_ek3HNOml2BbAZLIth2TIFSLK4D0twV5rOVScE8aV5V5C9oyCu349Rgfq9uFX75sNMFakyhhHXoxwuwsGCPT2CtzvI8pELn7up1DV5aokHvpn-4lMXujKVPnCDlvEp7UycHa332gtEsg2g7nFqwzkbzDVQ6g1T6e3w9u2AGdKyNk"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[17px] text-on-surface tracking-tight truncate">
                  {title || 'CampusFix AI'}
                </span>
                <span className="font-medium text-[11px] px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container shrink-0">
                  {user?.college_display_name || 'NMIET'}
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant truncate">
                {user?.role === 'STUDENT'
                  ? 'Student Portal'
                  : user?.role === 'OFFICER'
                  ? `Officer · ${user.department_name || 'Dept'}`
                  : 'Grievance Cell · Admin Console'}
              </span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Demo Switcher Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-[12px] font-medium text-primary transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">switch_account</span>
              <span>Demo Persona</span>
              <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 top-12 w-64 rounded-xl bg-surface-container-lowest p-2 shadow-xl border border-surface-container-high z-50 flex flex-col gap-1 text-[13px]">
                <div className="px-2 py-1 text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  NMIET Accounts
                </div>
                <button
                  type="button"
                  onClick={() => {
                    switchDemoUser('student@nmiet.demo');
                    setShowDemoMenu(false);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between ${user?.email === 'student@nmiet.demo' ? 'bg-primary-container text-on-primary font-semibold' : 'text-on-surface'}`}
                >
                  <span>Student (Saif Patil)</span>
                  <span className="text-[10px] opacity-75">NMIET</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchDemoUser('officer@nmiet.demo');
                    setShowDemoMenu(false);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between ${user?.email === 'officer@nmiet.demo' ? 'bg-primary-container text-on-primary font-semibold' : 'text-on-surface'}`}
                >
                  <span>Officer (Santosh Shinde)</span>
                  <span className="text-[10px] opacity-75">Electrical</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchDemoUser('cell@nmiet.demo');
                    setShowDemoMenu(false);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between ${user?.email === 'cell@nmiet.demo' ? 'bg-primary-container text-on-primary font-semibold' : 'text-on-surface'}`}
                >
                  <span>Grievance Cell (Dr. Joshi)</span>
                  <span className="text-[10px] opacity-75">Admin</span>
                </button>

                <div className="border-t border-surface-container-high my-1 pt-1 px-2 text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  College B (Multi-College)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    switchDemoUser('student@collegeb.demo');
                    setShowDemoMenu(false);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between ${user?.email === 'student@collegeb.demo' ? 'bg-primary-container text-on-primary font-semibold' : 'text-on-surface'}`}
                >
                  <span>Student (Aarav Sharma)</span>
                  <span className="text-[10px] opacity-75">College B</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchDemoUser('cell@collegeb.demo');
                    setShowDemoMenu(false);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between ${user?.email === 'cell@collegeb.demo' ? 'bg-primary-container text-on-primary font-semibold' : 'text-on-surface'}`}
                >
                  <span>Grievance Cell (Prof. Patil)</span>
                  <span className="text-[10px] opacity-75">College B</span>
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            aria-label="Toggle theme"
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Alerts / Notifications Trigger */}
          {user && (
            <button
              aria-label="Notifications"
              type="button"
              onClick={onOpenNotifications}
              className="relative w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-on-error text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Avatar */}
          {user && (
            <button
              aria-label="Profile"
              type="button"
              onClick={onNavigateProfile}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-[13px] shadow-sm active:scale-95 transition-transform"
            >
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
