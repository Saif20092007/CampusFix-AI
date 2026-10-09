import React from 'react';

interface BackgroundNotificationBannerProps {
  permission: NotificationPermission;
  isSupported: boolean;
  onEnable: () => void;
  onTest: (status: 'IN_PROGRESS' | 'RESOLVED') => void;
  isTestPending: boolean;
  testCountdown: number | null;
}

export const BackgroundNotificationBanner: React.FC<BackgroundNotificationBannerProps> = ({
  permission,
  isSupported,
  onEnable,
  onTest,
  isTestPending,
  testCountdown,
}) => {
  if (!isSupported) {
    return null;
  }

  const isGranted = permission === 'granted';

  return (
    <div className="w-full rounded-2xl bg-surface-container-low border border-surface-container-high/80 p-4 shadow-xs flex flex-col gap-3 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isGranted
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-primary/10 text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isGranted ? 'notifications_active' : 'add_alert'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-bold text-on-surface">
                Background Status Alerts
              </h4>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isGranted
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                }`}
              >
                {isGranted ? 'Active' : 'Action Needed'}
              </span>
            </div>
            <p className="text-[12px] text-secondary mt-0.5 leading-snug">
              Receive Service Worker notifications when your grievance status changes from{' '}
              <strong className="text-on-surface">Pending</strong> to{' '}
              <span className="text-amber-600 dark:text-amber-400 font-semibold">In-Progress</span> or{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Resolved</span> while you are away.
            </p>
          </div>
        </div>

        {!isGranted && (
          <button
            type="button"
            onClick={onEnable}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-primary-container text-on-primary text-[12px] font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            Enable Alerts
          </button>
        )}
      </div>

      {/* Action / Test controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-surface-container-high/60 text-[12px]">
        <div className="flex items-center gap-1.5 text-secondary text-[11px]">
          <span className="material-symbols-outlined text-[15px] text-primary">sensors</span>
          <span>Monitors background status transitions automatically</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isTestPending ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-primary/10 text-primary font-semibold text-[11px] animate-pulse">
              <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
              <span>
                Switch tabs or minimize now! Triggering in {testCountdown}s...
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onTest('IN_PROGRESS')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-medium transition-colors cursor-pointer border border-surface-container-high active:scale-95"
                title="Simulate grievance transition to In-Progress via Service Worker notification"
              >
                <span className="material-symbols-outlined text-[14px] text-amber-600">bolt</span>
                <span>Test 'In-Progress' Alert</span>
              </button>

              <button
                type="button"
                onClick={() => onTest('RESOLVED')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-medium transition-colors cursor-pointer border border-surface-container-high active:scale-95"
                title="Simulate grievance transition to Resolved via Service Worker notification"
              >
                <span className="material-symbols-outlined text-[14px] text-emerald-600">task_alt</span>
                <span>Test 'Resolved' Alert</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
