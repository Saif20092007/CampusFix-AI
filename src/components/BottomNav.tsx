import React from 'react';

interface BottomNavProps {
  currentTab: 'home' | 'report' | 'alerts' | 'profile';
  onSelectTab: (tab: 'home' | 'report' | 'alerts' | 'profile') => void;
  unreadCount?: number;
  isStaff?: boolean;
  showAnalytics?: boolean;
  onSelectAnalytics?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  unreadCount = 0,
  isStaff = false,
  showAnalytics = false,
  onSelectAnalytics,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe bg-surface/95 dark:bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-high shadow-[0_-2px_12px_rgba(0,0,0,0.05)] sm:hidden">
      <div className="relative flex justify-around items-center h-16 px-2 max-w-md mx-auto">
        {/* Tab 1: Home / Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] transition-colors cursor-pointer ${
            currentTab === 'home' && !showAnalytics
              ? 'text-primary-container dark:text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: currentTab === 'home' && !showAnalytics ? "'FILL' 1" : "'FILL' 0" }}
          >
            {isStaff ? 'dashboard' : 'home'}
          </span>
          <span className="text-[11px] mt-0.5">{isStaff ? 'Queue' : 'Home'}</span>
        </button>

        {/* Tab 2: For Students: Center Report FAB. For Staff: Analytics */}
        {isStaff ? (
          <button
            type="button"
            onClick={() => onSelectAnalytics?.()}
            className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] transition-colors cursor-pointer ${
              showAnalytics
                ? 'text-primary-container dark:text-primary font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: showAnalytics ? "'FILL' 1" : "'FILL' 0" }}
            >
              analytics
            </span>
            <span className="text-[11px] mt-0.5">Analytics</span>
          </button>
        ) : (
          <div className="relative flex flex-col items-center justify-center min-w-[64px]">
            <button
              type="button"
              onClick={() => onSelectTab('report')}
              className="-top-5 absolute w-12 h-12 rounded-full bg-primary-container hover:bg-primary flex items-center justify-center text-on-primary shadow-[0_4px_12px_rgba(30,58,138,0.35)] transition-transform active:scale-95 cursor-pointer"
              aria-label="Report Issue"
            >
              <span className="material-symbols-outlined text-[26px]">add</span>
            </button>
            <span className="text-[11px] text-on-surface-variant mt-7 font-medium">Report</span>
          </div>
        )}

        {/* Tab 3: Alerts / Notifications */}
        <button
          type="button"
          onClick={() => onSelectTab('alerts')}
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] transition-colors relative cursor-pointer ${
            currentTab === 'alerts' && !showAnalytics
              ? 'text-primary-container dark:text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: currentTab === 'alerts' && !showAnalytics ? "'FILL' 1" : "'FILL' 0" }}
            >
              notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-error text-on-error font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5">Alerts</span>
        </button>

        {/* Tab 4: Profile */}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] transition-colors cursor-pointer ${
            currentTab === 'profile' && !showAnalytics
              ? 'text-primary-container dark:text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: currentTab === 'profile' && !showAnalytics ? "'FILL' 1" : "'FILL' 0" }}
          >
            person
          </span>
          <span className="text-[11px] mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  );
};
