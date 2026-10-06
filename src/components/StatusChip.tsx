import React from 'react';
import { GrievanceStatus } from '../types';

export interface StatusChipProps {
  status: GrievanceStatus | string;
  size?: 'sm' | 'md' | 'lg';
  studentFriendly?: boolean;
  showIcon?: boolean;
  showDot?: boolean;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'md',
  studentFriendly = true,
  showIcon = true,
  showDot = true,
  className = '',
}) => {
  const normStatus = (status || '').toUpperCase();

  let config = {
    label: 'Open',
    bgColor: 'bg-sky-50 dark:bg-sky-950/60',
    textColor: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800',
    dotColor: 'bg-sky-500',
    pulse: false,
    icon: 'radio_button_checked',
  };

  if (normStatus === 'SUBMITTED') {
    config = {
      label: studentFriendly ? 'Open' : 'Submitted',
      bgColor: 'bg-sky-50 dark:bg-sky-950/60',
      textColor: 'text-sky-700 dark:text-sky-300',
      borderColor: 'border-sky-200 dark:border-sky-800',
      dotColor: 'bg-sky-500',
      pulse: false,
      icon: 'radio_button_checked',
    };
  } else if (normStatus === 'ASSIGNED') {
    config = {
      label: studentFriendly ? 'Open' : 'Assigned',
      bgColor: 'bg-blue-50 dark:bg-blue-950/60',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800',
      dotColor: 'bg-blue-500',
      pulse: false,
      icon: 'person_check',
    };
  } else if (normStatus === 'IN_PROGRESS' || normStatus === 'IN-PROGRESS') {
    config = {
      label: 'In-Progress',
      bgColor: 'bg-amber-50 dark:bg-amber-950/60',
      textColor: 'text-amber-800 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-800',
      dotColor: 'bg-amber-500',
      pulse: true,
      icon: 'build',
    };
  } else if (normStatus === 'ESCALATED') {
    config = {
      label: 'Escalated',
      bgColor: 'bg-rose-50 dark:bg-rose-950/60',
      textColor: 'text-rose-700 dark:text-rose-300',
      borderColor: 'border-rose-200 dark:border-rose-800',
      dotColor: 'bg-rose-500',
      pulse: true,
      icon: 'priority_high',
    };
  } else if (normStatus === 'RESOLVED') {
    config = {
      label: 'Resolved',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
      textColor: 'text-emerald-800 dark:text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      dotColor: 'bg-emerald-500',
      pulse: false,
      icon: 'check_circle',
    };
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-[12px] gap-1.5',
    lg: 'px-3 py-1.5 text-[13px] gap-2',
  }[size];

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const iconSize = size === 'sm' ? 'text-[12px]' : size === 'md' ? 'text-[14px]' : 'text-[16px]';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border shadow-xs tracking-tight transition-colors ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses} ${className}`}
      title={`Status: ${config.label}`}
    >
      {showDot && (
        <span
          className={`shrink-0 rounded-full ${dotSize} ${config.dotColor} ${
            config.pulse ? 'animate-pulse' : ''
          }`}
          aria-hidden="true"
        />
      )}
      {showIcon && (
        <span className={`material-symbols-outlined shrink-0 ${iconSize}`} aria-hidden="true">
          {config.icon}
        </span>
      )}
      <span className="font-semibold">{config.label}</span>
    </span>
  );
};
