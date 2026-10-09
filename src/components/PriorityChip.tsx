import React from 'react';
import { PriorityLevel } from '../types';

interface PriorityChipProps {
  priority: PriorityLevel;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityChip: React.FC<PriorityChipProps> = ({ priority, size = 'md' }) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-3 py-1.5 text-[13px]'
      : 'px-2.5 py-1 text-[12px]';

  switch (priority) {
    case 'Critical':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold shadow-xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            crisis_alert
          </span>
          <span>Critical P1</span>
        </span>
      );
    case 'High':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-semibold shadow-xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            bolt
          </span>
          <span>High Priority</span>
        </span>
      );
    case 'Medium':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium shadow-xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[13px]">
            swap_vert
          </span>
          <span>Medium</span>
        </span>
      );
    case 'Low':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium shadow-xs ${sizeClasses}`}
        >
          <span className="material-symbols-outlined text-[13px]">
            low_priority
          </span>
          <span>Low</span>
        </span>
      );
    default:
      return null;
  }
};

