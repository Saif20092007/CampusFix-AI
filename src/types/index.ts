export type UserRole = 'STUDENT' | 'OFFICER' | 'GRIEVANCE_CELL' | 'ADMIN';
export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type GrievanceStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED';
export type SlaStatus = 'ON_TIME' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED_ON_TIME' | 'RESOLVED_LATE';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  college_id: number;
  college_name: string;
  college_display_name: string;
  department_id?: number | null;
  department_name?: string | null;
  academic_department?: string | null;
  year?: string | null;
  division?: string | null;
  phone?: string | null;
}

export interface Department {
  id: number;
  college_id: number;
  name: string;
  code: string;
}

export interface Category {
  id: number;
  college_id: number;
  name: string;
  department_id: number;
  department_name?: string;
}

export interface SlaInfo {
  status: SlaStatus;
  hours_remaining: number;
  minutes_remaining: number;
  label: string;
  is_overdue: boolean;
  due_at_formatted: string;
}

export interface Attachment {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  download_url: string;
}

export interface StatusHistoryItem {
  id: number;
  grievance_id: number;
  actor_id: number;
  actor_name: string;
  actor_role: string;
  status: string | null;
  kind: 'STATUS_CHANGE' | 'INTERNAL_REMARK' | 'PUBLIC_UPDATE' | 'PRIORITY_CHANGE' | 'REASSIGNMENT';
  note: string;
  is_public: boolean;
  created_at: string;
}

export interface Grievance {
  id: number;
  public_id: string;
  display_no: string;
  college_id: number;
  description: string;
  summary: string;
  category_id: number;
  category_name?: string;
  department_id: number;
  department_name?: string;
  priority: PriorityLevel;
  location: string;
  status: GrievanceStatus;
  due_at: string;
  created_at: string;
  resolved_at: string | null;
  assigned_to_name?: string | null;
  resolution_note?: string | null;
  sla: SlaInfo;
  student?: {
    first_name?: string;
    full_name?: string;
    year?: string;
    academic_department?: string;
    division?: string;
    phone?: string;
  };
  student_name?: string;
  student_year?: string;
  student_academic_dept?: string;
  student_division?: string;
  student_phone?: string;
  timeline?: StatusHistoryItem[];
  attachments?: Attachment[];
}

export interface NotificationItem {
  id: number;
  user_id: number;
  grievance_id: number | null;
  public_id: string | null;
  display_no: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface AiAnalysisResponse {
  analysis_id: string;
  category: string;
  category_id: number;
  priority: PriorityLevel;
  summary: string;
  location: string;
  keywords: string[];
  department_name: string;
  confidence: number;
  fallback_used: boolean;
}

export interface AnalyticsSummary {
  total: number;
  open: number;
  in_progress: number;
  escalated: number;
  resolved: number;
  overdue: number;
  due_soon: number;
  sla_compliance: number;
  category_counts: Record<string, number>;
  department_counts: Record<string, number>;
  priority_counts: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  trend: Array<{
    date: string;
    label: string;
    count: number;
  }>;
}
