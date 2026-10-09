import {
  User,
  Grievance,
  Category,
  Department,
  NotificationItem,
  AiAnalysisResponse,
  AnalyticsSummary,
  GrievanceAiSummary,
} from '../types';

const TOKEN_KEY = 'campusfix_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeStoredToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const data = await response.json();
      errorDetail = data.detail || data.error || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  // Handle blob/download if needed, else json
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response as unknown as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    year?: string;
    academic_department?: string;
    division?: string;
    phone?: string;
  }): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<User> {
    return request<User>('/api/me');
  },

  logout(): void {
    removeStoredToken();
  },

  // Metadata
  async getCategories(): Promise<Category[]> {
    return request<Category[]>('/api/meta/categories');
  },

  async getDepartments(): Promise<Department[]> {
    return request<Department[]>('/api/meta/departments');
  },

  // AI
  async analyzeGrievance(description: string, location?: string): Promise<AiAnalysisResponse> {
    return request<AiAnalysisResponse>('/api/grievances/analyze', {
      method: 'POST',
      body: JSON.stringify({ description, location }),
    });
  },

  // Attachments
  async uploadPhoto(file: File): Promise<{ attachment_id: number; file_name: string; file_size: number; file_type: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    return request<{ attachment_id: number; file_name: string; file_size: number; file_type: string }>('/api/attachments/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Grievances
  async createGrievance(data: {
    description: string;
    summary: string;
    category_id: number;
    location: string;
    analysis_id: string;
    attachment_ids?: number[];
  }): Promise<Grievance> {
    return request<Grievance>('/api/grievances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getGrievances(params: {
    limit?: number;
    offset?: number;
    status?: string;
    priority?: string;
    sla_state?: string;
    category?: string;
    department?: string;
    q?: string;
  } = {}): Promise<{ total: number; limit: number; offset: number; items: Grievance[] }> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.set('offset', params.offset.toString());
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.priority && params.priority !== 'all') searchParams.set('priority', params.priority);
    if (params.sla_state && params.sla_state !== 'all') searchParams.set('sla_state', params.sla_state);
    if (params.category && params.category !== 'all') searchParams.set('category', params.category);
    if (params.department && params.department !== 'all') searchParams.set('department', params.department);
    if (params.q) searchParams.set('q', params.q);

    const qs = searchParams.toString();
    return request<{ total: number; limit: number; offset: number; items: Grievance[] }>(`/api/grievances${qs ? `?${qs}` : ''}`);
  },

  async getGrievance(publicId: string): Promise<Grievance> {
    return request<Grievance>(`/api/grievances/${publicId}`);
  },

  async updateStatus(publicId: string, status: string, note?: string): Promise<Grievance> {
    return request<Grievance>(`/api/grievances/${publicId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  },

  async escalateGrievance(publicId: string, reason: string): Promise<Grievance> {
    return request<Grievance>(`/api/grievances/${publicId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async reassignGrievance(publicId: string, departmentId: number, assignedToName?: string): Promise<Grievance> {
    return request<Grievance>(`/api/grievances/${publicId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ department_id: departmentId, assigned_to_name: assignedToName }),
    });
  },

  async updatePriority(publicId: string, priority: string): Promise<Grievance> {
    return request<Grievance>(`/api/grievances/${publicId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  },

  async addRemark(publicId: string, kind: 'INTERNAL_REMARK' | 'PUBLIC_UPDATE', note: string): Promise<any> {
    return request<any>(`/api/grievances/${publicId}/remarks`, {
      method: 'POST',
      body: JSON.stringify({ kind, note }),
    });
  },

  async getGrievanceAiSummary(publicId: string): Promise<GrievanceAiSummary> {
    return request<GrievanceAiSummary>(`/api/grievances/${publicId}/ai-summary`);
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return request<NotificationItem[]>('/api/notifications');
  },

  async markNotificationRead(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    });
  },

  // Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return request<AnalyticsSummary>('/api/analytics/summary');
  },
};
