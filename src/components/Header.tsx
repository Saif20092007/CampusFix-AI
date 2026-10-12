import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { CampusFixLogo } from './CampusFixLogo';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  notifications?: NotificationItem[];
  onOpenNotifications?: () => void;
  onNavigateHome?: () => void;
  onNavigateProfile?: () => void;
  onNavigateAnalytics?: () => void;
  onNavigateReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  notifications = [],
  onOpenNotifications,
  onNavigateHome,
  onNavigateProfile,
  onNavigateAnalytics,
  onNavigateReport,
}) => {
  const { user, logout, switchDemoUser, theme, setTheme } = useAuth();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMobileNav = (action: () => void | undefined) => {
    action();
    setShowMobileMenu(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 z-50 pt-safe bg-surface/90 dark:bg-surface-container-lowest/90 backdrop-blur-xl border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Brand or Back + Logo */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBack && (
              <button
                aria-label="Go Back"
                className="w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
                onClick={onBack || onNavigateHome}
                type="button"
              >
                <span className="material-symbols-outlined text-[24px]">arrow_back</span>
              </button>
            )}

            {/* Clickable Logo Lockup */}
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              onClick={onNavigateHome}
              role="button"
              tabIndex={0}
              title="CampusFix AI — Return to Home"
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigateHome?.()}
            >
              <CampusFixLogo size={36} />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-[16px] sm:text-[17px] text-on-surface tracking-tight truncate group-hover:text-primary transition-colors">
                  {title || 'CampusFix AI'}
                </span>
                <span className="text-[11px] text-on-surface-variant truncate">
                  {user?.role === 'STUDENT'
                    ? 'Student Portal'
                    : user?.role === 'OFFICER'
                    ? `HOD · ${user.department_name || 'Dept'}`
                    : 'Grievance Cell'}
                </span>
              </div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Quick Demo Switcher Pill (Desktop) */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-[11px] font-semibold text-primary transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">switch_account</span>
                <span>Demo</span>
                <span className="material-symbols-outlined text-[13px]">arrow_drop_down</span>
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 top-12 w-60 rounded-xl bg-surface-container-lowest p-2 shadow-xl border border-surface-container-high z-50 flex flex-col gap-1 text-[13px] animate-fade-in">
                  <div className="px-2 py-1 text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    Select Demo Account
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      switchDemoUser('student@nmiet.demo');
                      setShowDemoMenu(false);
                    }}
                    className={`text-left px-2.5 py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between cursor-pointer ${
                      user?.email === 'student@nmiet.demo'
                        ? 'bg-primary-container text-on-primary font-semibold'
                        : 'text-on-surface'
                    }`}
                  >
                    <span>As Student</span>
                    <span className="text-[10px] opacity-75">Mahesh Patil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchDemoUser('officer@nmiet.demo');
                      setShowDemoMenu(false);
                    }}
                    className={`text-left px-2.5 py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between cursor-pointer ${
                      user?.email === 'officer@nmiet.demo'
                        ? 'bg-primary-container text-on-primary font-semibold'
                        : 'text-on-surface'
                    }`}
                  >
                    <span>As HOD</span>
                    <span className="text-[10px] opacity-75">Anand Jadhav</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchDemoUser('cell@nmiet.demo');
                      setShowDemoMenu(false);
                    }}
                    className={`text-left px-2.5 py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-between cursor-pointer ${
                      user?.email === 'cell@nmiet.demo'
                        ? 'bg-primary-container text-on-primary font-semibold'
                        : 'text-on-surface'
                    }`}
                  >
                    <span>As Grievance Cell</span>
                    <span className="text-[10px] opacity-75">Sagar Gaikwad</span>
                  </button>
                </div>
              )}
            </div>

            {/* Theme Toggle (Desktop) */}
            <button
              aria-label="Toggle theme"
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high hidden sm:flex items-center justify-center text-on-surface transition-colors cursor-pointer"
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
                className="relative w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-error text-on-error text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* User Avatar (Desktop) */}
            {user && (
              <button
                aria-label="Profile"
                type="button"
                onClick={onNavigateProfile}
                className="w-9 h-9 rounded-full bg-primary hidden sm:flex items-center justify-center text-on-primary font-semibold text-[13px] shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </button>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              aria-label="Open navigation menu"
              type="button"
              onClick={() => setShowMobileMenu(true)}
              className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high flex sm:hidden items-center justify-center text-on-surface transition-colors active:scale-95 cursor-pointer ml-0.5"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="w-80 max-w-[85vw] h-full bg-surface-container-lowest text-on-surface p-5 flex flex-col justify-between shadow-2xl border-l border-surface-container overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top drawer header */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => handleMobileNav(onNavigateHome || (() => {}))}
                >
                  <CampusFixLogo size={32} />
                  <span className="font-bold text-[16px] text-on-surface tracking-tight">CampusFix AI</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileMenu(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* User profile card */}
              {user && (
                <div className="p-3.5 rounded-2xl bg-surface-container flex items-center gap-3 border border-surface-container-high">
                  <div className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-[15px] shrink-0">
                    {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-[14px] text-on-surface truncate">{user.name}</span>
                    <span className="text-[11px] font-semibold text-primary">
                      {user.role === 'STUDENT' ? 'Student' : user.role === 'OFFICER' ? 'HOD' : 'Grievance Cell'}
                    </span>
                    <a
                      href={`mailto:${user.email}`}
                      className="text-[11px] text-secondary font-mono truncate hover:underline"
                    >
                      {user.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Nav links */}
              <nav className="flex flex-col gap-1 text-[14px] font-semibold pt-1">
                {onNavigateHome && (
                  <button
                    type="button"
                    onClick={() => handleMobileNav(onNavigateHome)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">dashboard</span>
                    <span>Dashboard / Home</span>
                  </button>
                )}

                {onNavigateReport && user?.role === 'STUDENT' && (
                  <button
                    type="button"
                    onClick={() => handleMobileNav(onNavigateReport)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">add_circle</span>
                    <span>Report Complaint</span>
                  </button>
                )}

                {onOpenNotifications && (
                  <button
                    type="button"
                    onClick={() => handleMobileNav(onOpenNotifications)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-primary">notifications</span>
                      <span>Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}

                {onNavigateAnalytics && (
                  <button
                    type="button"
                    onClick={() => handleMobileNav(onNavigateAnalytics)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">analytics</span>
                    <span>Analytics &amp; SLA Stats</span>
                  </button>
                )}

                {onNavigateProfile && (
                  <button
                    type="button"
                    onClick={() => handleMobileNav(onNavigateProfile)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">person</span>
                    <span>My Profile</span>
                  </button>
                )}
              </nav>

              {/* Demo Account Switcher on Mobile */}
              <div className="pt-3 border-t border-surface-container flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary px-3">
                  Quick Demo Switch
                </span>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      switchDemoUser('student@nmiet.demo');
                      setShowMobileMenu(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-[12px] flex items-center justify-between transition-colors cursor-pointer ${
                      user?.email === 'student@nmiet.demo'
                        ? 'bg-primary-container text-on-primary font-bold'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span>As Student</span>
                    <span className="opacity-75 font-mono text-[11px]">Mahesh Patil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchDemoUser('officer@nmiet.demo');
                      setShowMobileMenu(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-[12px] flex items-center justify-between transition-colors cursor-pointer ${
                      user?.email === 'officer@nmiet.demo'
                        ? 'bg-primary-container text-on-primary font-bold'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span>As HOD</span>
                    <span className="opacity-75 font-mono text-[11px]">Anand Jadhav</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchDemoUser('cell@nmiet.demo');
                      setShowMobileMenu(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-[12px] flex items-center justify-between transition-colors cursor-pointer ${
                      user?.email === 'cell@nmiet.demo'
                        ? 'bg-primary-container text-on-primary font-bold'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span>As Grievance Cell</span>
                    <span className="opacity-75 font-mono text-[11px]">Sagar Gaikwad</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom of drawer: Contacts, theme, logout */}
            <div className="pt-4 border-t border-surface-container flex flex-col gap-3">
              {/* Emergency Clickable Contacts */}
              <div className="p-3 rounded-xl bg-surface-container flex flex-col gap-1.5 text-[11px] text-secondary">
                <span className="font-bold text-on-surface text-[11px]">Helpdesk Assistance</span>
                <a
                  href="tel:+919822044910"
                  className="flex items-center gap-1.5 text-primary hover:underline font-mono"
                >
                  <span className="material-symbols-outlined text-[14px]">call</span>
                  <span>+91 98220 44910</span>
                </a>
                <a
                  href="mailto:grievance@nmiet.edu.in"
                  className="flex items-center gap-1.5 text-primary hover:underline font-mono"
                >
                  <span className="material-symbols-outlined text-[14px]">mail</span>
                  <span>grievance@nmiet.edu.in</span>
                </a>
              </div>

              {/* Theme toggle row */}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-[13px] font-semibold text-on-surface transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                  <span>Theme</span>
                </div>
                <span className="text-[12px] text-secondary uppercase font-bold">{theme}</span>
              </button>

              {/* Sign out */}
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
