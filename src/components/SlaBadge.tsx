import React from 'react';
import { SlaInfo } from '../types';

interface SlaBadgeProps {
  sla: SlaInfo;
  variant?: 'pill' | 'text';
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({ sla, variant = 'pill' }) => {
  if (variant === 'text') {
    if (sla.status === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1 text-[#DC2626] font-medium text-[12px]">
          <span className="material-symbols-outlined text-[14px]">error</span>
          <span>{sla.label}</span>
        </span>
      );
    }
    if (sla.status === 'DUE_SOON') {
      return (
        <span className="inline-flex items-center gap-1 text-[#D97706] font-medium text-[12px]">
          <span className="material-symbols-outlined text-[14px]">alarm_on</span>
          <span>{sla.label}</span>
        </span>
      );
    }
    if (sla.status.startsWith('RESOLVED')) {
      return (
        <span className="inline-flex items-center gap-1 text-[#065F46] font-medium text-[12px]">
          <span className="material-symbols-outlined text-[14px]">task_alt</span>
          <span>{sla.label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-secondary text-[12px]">
        <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
        <span>{sla.label}</span>
      </span>
    );
  }

  // Pill variant
  if (sla.status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#991B1B] border border-[#F87171] text-[11px] font-bold animate-pulse">
        <span className="material-symbols-outlined text-[14px]">warning</span>
        <span>{sla.label}</span>
      </span>
    );
  }

  if (sla.status === 'DUE_SOON') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[11px] font-semibold">
        <span className="material-symbols-outlined text-[14px]">schedule</span>
        <span>{sla.label}</span>
      </span>
    );
  }

  if (sla.status.startsWith('RESOLVED')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] text-[11px] font-semibold">
        <span className="material-symbols-outlined text-[14px]">done_all</span>
        <span>{sla.label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface text-[12px] font-medium">
      <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
      <span>{sla.label}</span>
    </span>
  );
};
