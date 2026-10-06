import React from 'react';
import { PriorityLevel } from '../types';

interface PriorityChipProps {
  priority: PriorityLevel;
  size?: 'sm' | 'md';
}

export const PriorityChip: React.FC<PriorityChipProps> = ({ priority, size = 'md' }) => {
  switch (priority) {
    case 'Critical':
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#F87171] font-bold ${size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <span>Critical P1</span>
        </span>
      );
    case 'High':
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-[#FFEDD5] text-[#9A3412] font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <span>High Priority</span>
        </span>
      );
    case 'Medium':
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-[#FEF9C3] text-[#854D0E] font-medium ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span>Medium</span>
        </span>
      );
    case 'Low':
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-[#F1F5F9] text-[#334155] font-medium ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}>
          <span>Low</span>
        </span>
      );
    default:
      return null;
  }
};
