import { Grievance, SlaRule } from './db.js';

export type SlaStatus = 'ON_TIME' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED_ON_TIME' | 'RESOLVED_LATE';

export interface SlaInfo {
  status: SlaStatus;
  hours_remaining: number;
  minutes_remaining: number;
  label: string;
  is_overdue: boolean;
  due_at_formatted: string;
}

export function calculateSla(grievance: Grievance): SlaInfo {
  const now = new Date();
  const due = new Date(grievance.due_at);
  const diffMs = due.getTime() - now.getTime();

  // If already resolved:
  if (grievance.status === 'RESOLVED') {
    if (grievance.resolved_at) {
      const resolvedDate = new Date(grievance.resolved_at);
      const wasOnTime = resolvedDate.getTime() <= due.getTime();
      const resolvedHoursAgo = Math.max(1, Math.round((now.getTime() - resolvedDate.getTime()) / 3600000));
      return {
        status: wasOnTime ? 'RESOLVED_ON_TIME' : 'RESOLVED_LATE',
        hours_remaining: 0,
        minutes_remaining: 0,
        label: wasOnTime ? 'Resolved on time' : 'Resolved late',
        is_overdue: false,
        due_at_formatted: due.toISOString(),
      };
    }
    return {
      status: 'RESOLVED_ON_TIME',
      hours_remaining: 0,
      minutes_remaining: 0,
      label: 'Resolved',
      is_overdue: false,
      due_at_formatted: due.toISOString(),
    };
  }

  // Open complaint:
  if (diffMs <= 0) {
    const overdueHours = Math.abs(Math.floor(diffMs / 3600000));
    const overdueMins = Math.abs(Math.floor((diffMs % 3600000) / 60000));
    return {
      status: 'OVERDUE',
      hours_remaining: 0,
      minutes_remaining: 0,
      label: `Overdue by ${overdueHours}h ${overdueMins}m`,
      is_overdue: true,
      due_at_formatted: due.toISOString(),
    };
  }

  const hoursRemaining = Math.floor(diffMs / 3600000);
  const minutesRemaining = Math.floor((diffMs % 3600000) / 60000);

  if (hoursRemaining < 6) {
    return {
      status: 'DUE_SOON',
      hours_remaining: hoursRemaining,
      minutes_remaining: minutesRemaining,
      label: `Due in ${hoursRemaining}h ${minutesRemaining}m`,
      is_overdue: false,
      due_at_formatted: due.toISOString(),
    };
  }

  return {
    status: 'ON_TIME',
    hours_remaining: hoursRemaining,
    minutes_remaining: minutesRemaining,
    label: `Due in ${hoursRemaining} hours`,
    is_overdue: false,
    due_at_formatted: due.toISOString(),
  };
}

export function computeDueAt(createdAt: string, priority: 'Critical' | 'High' | 'Medium' | 'Low', slaRules: SlaRule[]): string {
  const rule = slaRules.find(r => r.priority === priority);
  const hours = rule ? rule.hours : (priority === 'Critical' ? 24 : priority === 'High' ? 48 : priority === 'Medium' ? 72 : 168);
  const created = new Date(createdAt);
  const due = new Date(created.getTime() + hours * 3600000);
  return due.toISOString();
}
