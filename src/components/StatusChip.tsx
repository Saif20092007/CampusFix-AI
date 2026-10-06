import React from 'react';
import { GrievanceStatus } from '../types';

interface StatusChipProps {
  status: GrievanceStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'md' }) => {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          <span>Submitted</span>
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE] font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span className="material-symbols-outlined text-[13px]">person_check</span>
          <span>Assigned</span>
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span className="material-symbols-outlined text-[13px]">build</span>
          <span>In Progress</span>
        </span>
      );
    case 'ESCALATED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] font-bold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span className="material-symbols-outlined text-[13px]">warning</span>
          <span>Escalated</span>
        </span>
      );
    case 'RESOLVED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span className="material-symbols-outlined text-[13px]">check_circle</span>
          <span>Resolved</span>
        </span>
      );
    default:
      return null;
  }
};
