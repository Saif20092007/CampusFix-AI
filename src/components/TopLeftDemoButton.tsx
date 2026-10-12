import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const TopLeftDemoButton: React.FC = () => {
  const { switchDemoUser, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectRole = async (email: string, roleName: string) => {
    setLoggingInRole(roleName);
    try {
      await switchDemoUser(email);
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message || 'Demo login failed');
    } finally {
      setLoggingInRole(null);
    }
  };

  const demoRoles = [
    {
      id: 'student',
      label: 'As Student',
      name: 'Mahesh Patil',
      badge: 'Student',
      email: 'student@nmiet.demo',
      icon: 'school',
      iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    },
    {
      id: 'hod',
      label: 'As HOD',
      name: 'Anand Jadhav',
      badge: 'HOD',
      email: 'officer@nmiet.demo',
      icon: 'engineering',
      iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
      id: 'cell',
      label: 'As Grievance Cell',
      name: 'Sagar Gaikwad',
      badge: 'Cell',
      email: 'cell@nmiet.demo',
      icon: 'admin_panel_settings',
      iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
  ];

  return (
    <div ref={dropdownRef} className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-semibold text-[13px] border border-surface-container shadow-md transition-all active:scale-95 cursor-pointer select-none"
        aria-label="Demo Login Accounts"
      >
        <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          switch_account
        </span>
        <span>Demo</span>
        <span
          className={`material-symbols-outlined text-[16px] text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-surface-container-lowest p-2.5 shadow-2xl border border-surface-container-high z-50 flex flex-col gap-1.5 animate-fade-in">
          <div className="px-2.5 py-1.5 border-b border-surface-container flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
              Choose Demo Role
            </span>
            <span className="text-[10px] text-secondary font-medium">1-Click Login</span>
          </div>

          {demoRoles.map((role) => {
            const isCurrentLogging = loggingInRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                disabled={isLoading}
                onClick={() => handleSelectRole(role.email, role.id)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-surface-container active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer disabled:opacity-50"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${role.iconBg}`}>
                  {isCurrentLogging ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">{role.icon}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-[13px] text-on-surface leading-snug">
                      {role.label}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-secondary shrink-0">
                      {role.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-secondary truncate mt-0.5">
                    {role.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
