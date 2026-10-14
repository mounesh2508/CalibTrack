import { Equipment, CalibrationRecord, NotificationItem, AuthUser, AuthSession } from '../types';

// Use VITE_API_BASE_URL if configured, otherwise default to /api
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// -----------------------------------------------------------------------------
// Session Management & Storage Helpers
// -----------------------------------------------------------------------------
const TOKEN_KEY = 'calibtrack_token';
const USER_KEY = 'calibtrack_user';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {}
}

export function clearAuthSession(): void {
  setStoredToken(null);
  setStoredUser(null);
}

let unauthorizedListener: ((message: string) => void) | null = null;

export function setUnauthorizedListener(listener: ((message: string) => void) | null) {
  unauthorizedListener = listener;
}

// -----------------------------------------------------------------------------
// Data Contracts & Types
// -----------------------------------------------------------------------------
export interface ApiDashboardSummary {
  totalEquipment: number;
  calibratedCount: number;
  dueSoonCount: number;
  overdueCount: number;
  upcomingCalibrations: Array<{
    equipmentId: string;
    equipmentCode: string;
    name: string;
    category: string;
    nextCalibrationDate: string | null;
    daysRemaining: number;
    status: string;
  }>;
  recentCalibrationRecords: Array<any>;
}

export interface EquipmentApiPayload {
  equipment_code: string;
  name: string;
  category: string;
  manufacturer?: string;
  model_number?: string;
  serial_number?: string;
  location?: string;
  department?: string;
  purchase_date?: string;
  calibration_interval_days: number;
  last_calibration_date?: string;
  next_calibration_date?: string;
  description?: string;
  status?: string;
}

export interface CalibrationApiPayload {
  equipment_id: string;
  calibration_date: string;
  next_due_date?: string;
  performed_by?: string;
  calibration_provider?: string;
  certificate_number?: string;
  result: 'PASSED' | 'FAILED' | 'CONDITIONAL';
  remarks?: string;
  certificate_file_path?: string;
}

// -----------------------------------------------------------------------------
// Data Normalizers
// -----------------------------------------------------------------------------
export function mapBackendEquipmentToFrontend(item: any): Equipment {
  const nextDateStr = item.next_calibration_date || item.nextCalibrationDate || null;
  const nextDate = nextDateStr ? new Date(nextDateStr) : null;
  const daysRemaining = nextDate
    ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : item.days_remaining ?? item.daysRemaining ?? 0;

  const rawStatus = (item.status || 'CALIBRATED').toLowerCase();
  let status: Equipment['status'] = 'calibrated';
  if (rawStatus === 'overdue' || daysRemaining < 0) {
    status = 'overdue';
  } else if (rawStatus === 'due_soon' || rawStatus === 'due soon' || daysRemaining <= 30) {
    status = 'due_soon';
  } else {
    status = 'calibrated';
  }

  const intervalDays = item.calibration_interval_days || item.calibrationIntervalDays || 180;
  const intervalMonths = Math.max(1, Math.round(intervalDays / 30));

  return {
    id: String(item.id || item.equipment_code || item.code),
    code: item.equipment_code || item.code || 'EQ-UNKNOWN',
    name: item.name || 'Unnamed Instrument',
    category: (item.category as Equipment['category']) || 'Balances & Scales',
    manufacturer: item.manufacturer || 'Standard Lab Equipment',
    model: item.model_number || item.model || 'Model Standard',
    serialNumber: item.serial_number || item.serialNumber || 'SN-UNASSIGNED',
    department: (item.department as Equipment['department']) || 'Quality Control',
    location: item.location || 'Central Laboratory',
    purchaseDate: item.purchase_date || item.purchaseDate || '2024-01-01',
    calibrationIntervalMonths: intervalMonths,
    lastCalibrationDate: item.last_calibration_date || item.lastCalibrationDate || '2026-01-01',
    nextCalibrationDate: nextDateStr || '2026-07-01',
    daysRemaining,
    status,
    assignedTechnician: item.assigned_technician || item.assignedTechnician || 'Dr. Sarah Lin',
    description: item.description || undefined,
  };
}

export function mapBackendCalibrationToFrontend(
  item: any,
  fallbackEquipmentName = 'Laboratory Instrument'
): CalibrationRecord {
  const outcomeRaw = (item.result || item.status || 'PASSED').toUpperCase();
  let result: CalibrationRecord['result'] = 'Passed';
  if (outcomeRaw === 'FAILED') {
    result = 'Failed';
  } else if (outcomeRaw === 'CONDITIONAL' || outcomeRaw === 'PASSED WITH ADJUSTMENT') {
    result = 'Passed with Adjustment';
  } else {
    result = 'Passed';
  }

  return {
    id: String(item.id || `REC-${Date.now()}`),
    equipmentId: String(item.equipment_id || item.equipmentId || ''),
    equipmentCode: item.equipment_code || item.equipmentCode || 'EQ-LOGGED',
    equipmentName: item.equipment_name || item.equipmentName || fallbackEquipmentName,
    calibrationDate: item.calibration_date || item.calibrationDate || new Date().toISOString().split('T')[0],
    nextDueDate: item.next_due_date || item.nextDueDate || '2026-12-31',
    serviceProvider: item.calibration_provider || item.serviceProvider || 'Precision Lab Metrology Inc.',
    technicianName: item.performed_by || item.technicianName || 'Accredited Metrologist',
    certificateNumber: item.certificate_number || item.certificateNumber || 'CERT-PENDING',
    result,
    standardUsed: item.standard_used || item.standardUsed || 'NIST Traceable Reference Standard',
    environmentalTemp: item.environmental_temp || item.environmentalTemp || '20.5 °C',
    environmentalHumidity: item.environmental_humidity || item.environmentalHumidity || '45 % RH',
    remarks: item.remarks || 'Standard routine calibration executed within specifications.',
    status: 'Completed',
  };
}

export function mapBackendDashboardSummary(data: any): ApiDashboardSummary {
  return {
    totalEquipment: data.total_equipment ?? data.totalEquipment ?? 0,
    calibratedCount: data.calibrated_count ?? data.calibratedCount ?? 0,
    dueSoonCount: data.due_soon_count ?? data.dueSoonCount ?? 0,
    overdueCount: data.overdue_count ?? data.overdueCount ?? 0,
    upcomingCalibrations: (data.upcoming_calibrations || data.upcomingCalibrationRecords || []).map((u: any) => ({
      equipmentId: u.equipment_id || u.equipmentId || '',
      equipmentCode: u.equipment_code || u.equipmentCode || '',
      name: u.name || u.equipmentName || '',
      category: u.category || '',
      nextCalibrationDate: u.next_calibration_date || u.nextCalibrationDate || null,
      daysRemaining: u.days_remaining ?? u.daysRemaining ?? 0,
      status: (u.status || 'CALIBRATED').toUpperCase(),
    })),
    recentCalibrationRecords: (data.recent_calibration_activity || data.recentCalibrationRecords || []),
  };
}

// -----------------------------------------------------------------------------
// Core Request Handler with Bearer Token Injection & 401/403 Handling
// -----------------------------------------------------------------------------
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Automatically attach Bearer token to authenticated requests
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorMessage = `HTTP Error ${res.status} (${res.statusText})`;
      try {
        const errorJson = await res.json();
        errorMessage = errorJson.detail || errorJson.error || errorJson.message || errorMessage;
      } catch {
        // use fallback message
      }

      // Handle 401: Unauthorized session (expired or invalid token)
      if (res.status === 401) {
        // Do not clear session if the failed request was the login attempt itself
        if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          clearAuthSession();
          if (unauthorizedListener) {
            unauthorizedListener(errorMessage || 'Your session has expired. Please sign in again.');
          }
        }
      }

      // Handle 403: Forbidden (insufficient permissions, e.g. technician attempting admin action)
      if (res.status === 403) {
        const err = new Error(errorMessage || 'Forbidden: Administrator privileges required.') as any;
        err.status = 403;
        throw err;
      }

      const err = new Error(errorMessage) as any;
      err.status = res.status;
      throw err;
    }

    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (error: any) {
    if (error.status) throw error;
    throw new Error(`Unable to communicate with CalibTrack API at ${url}. Please ensure the backend is running.`);
  }
}

// -----------------------------------------------------------------------------
// Centralized API Service for CalibTrack
// -----------------------------------------------------------------------------
export const api = {
  // Session helpers
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearAuthSession,
  setUnauthorizedListener,

  // Health
  async fetchHealth(): Promise<{ status: string }> {
    return request<{ status: string }>('/health');
  },

  // Authentication
  async login(email: string, password: string): Promise<AuthSession> {
    const res = await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const session: AuthSession = {
      token: res.access_token,
      user: {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        created_at: res.user.created_at,
      },
      expiresAt: res.expires_at,
    };

    setStoredToken(session.token);
    setStoredUser(session.user);
    return session;
  },

  async register(name: string, email: string, password: string): Promise<{
    message: string;
    is_email_verified: boolean;
    user: AuthUser;
    simulation?: {
      mode: string;
      message: string;
      verification_token: string;
      verification_url: string;
    } | null;
  }> {
    const res = await request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
      }),
    });

    return {
      message: res.message,
      is_email_verified: res.is_email_verified,
      user: {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        created_at: res.user.created_at,
      },
      simulation: res.simulation || null,
    };
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string; email: string }> {
    return request<{ success: boolean; message: string; email: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: token.trim() }),
    });
  },

  async resendVerification(email: string): Promise<{
    success: boolean;
    message: string;
    already_verified?: boolean;
    simulation?: {
      mode: string;
      message: string;
      verification_token: string;
      verification_url: string;
    } | null;
  }> {
    return request<any>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  },

  async fetchCurrentUser(): Promise<AuthUser> {
    const user = await request<AuthUser>('/auth/me');
    setStoredUser(user);
    return user;
  },

  async listUsers(): Promise<AuthUser[]> {
    return request<AuthUser[]>('/users');
  },

  async updateUserRole(userId: string, role: 'ADMIN' | 'TECHNICIAN'): Promise<AuthUser> {
    return request<AuthUser>(`/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  logout(): void {
    clearAuthSession();
  },

  // Dashboard
  async fetchDashboardSummary(): Promise<ApiDashboardSummary> {
    const raw = await request<any>('/dashboard/summary');
    const data = raw.data ? raw.data : raw;
    return mapBackendDashboardSummary(data);
  },

  // Equipment
  async fetchEquipment(filters?: {
    search?: string;
    category?: string;
    status?: string;
    department?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{ items: Equipment[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters?.status && filters.status !== 'All') params.append('status', filters.status.toUpperCase());
    if (filters?.department && filters.department !== 'All') params.append('department', filters.department);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);

    const query = params.toString() ? `?${params.toString()}` : '';
    const raw = await request<any>(`/equipment${query}`);

    const rawList = raw.items || raw.data || (Array.isArray(raw) ? raw : []);
    const total = raw.total ?? raw.count ?? rawList.length;

    return {
      items: rawList.map(mapBackendEquipmentToFrontend),
      total,
    };
  },

  async fetchEquipmentItem(id: string): Promise<Equipment> {
    const raw = await request<any>(`/equipment/${encodeURIComponent(id)}`);
    const data = raw.data || raw;
    return mapBackendEquipmentToFrontend(data);
  },

  async createEquipment(payload: EquipmentApiPayload): Promise<Equipment> {
    const raw = await request<any>('/equipment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = raw.data || raw;
    return mapBackendEquipmentToFrontend(data);
  },

  async updateEquipment(id: string, updates: Partial<EquipmentApiPayload>): Promise<Equipment> {
    const raw = await request<any>(`/equipment/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const data = raw.data || raw;
    return mapBackendEquipmentToFrontend(data);
  },

  async deleteEquipment(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/equipment/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Calibration Records
  async fetchCalibrationRecords(equipmentId?: string): Promise<CalibrationRecord[]> {
    const endpoint = equipmentId
      ? `/equipment/${encodeURIComponent(equipmentId)}/calibration-records`
      : '/calibration-records';

    const raw = await request<any>(endpoint);
    const rawList = raw.items || raw.data || (Array.isArray(raw) ? raw : []);
    return rawList.map((r: any) => mapBackendCalibrationToFrontend(r));
  },

  async createCalibrationRecord(payload: CalibrationApiPayload): Promise<{
    record: CalibrationRecord;
    updatedEquipment?: Equipment;
  }> {
    const raw = await request<any>('/calibration-records', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const recordData = raw.data || raw.record || raw;
    const equipData = raw.updatedEquipment ? mapBackendEquipmentToFrontend(raw.updatedEquipment) : undefined;

    return {
      record: mapBackendCalibrationToFrontend(recordData),
      updatedEquipment: equipData,
    };
  },

  // Notifications
  async fetchNotifications(): Promise<{ items: NotificationItem[]; total: number; unreadCount: number }> {
    const raw = await request<any>('/notifications');
    const rawList = raw.items || raw.data || (Array.isArray(raw) ? raw : []);
    const unreadCount = raw.unread_count ?? raw.unreadCount ?? rawList.filter((n: any) => !n.is_read).length;

    const items: NotificationItem[] = rawList.map((n: any) => ({
      id: String(n.id),
      title: n.title,
      description: n.message,
      timestamp: 'Recently',
      category:
        n.type === 'CALIBRATION_OVERDUE'
          ? 'alert'
          : n.type === 'CALIBRATION_DUE_SOON'
          ? 'reminder'
          : n.type === 'CALIBRATION_COMPLETED'
          ? 'success'
          : 'system',
      read: Boolean(n.is_read),
      equipmentId: n.equipment_id || undefined,
    }));

    return {
      items,
      total: raw.total ?? rawList.length,
      unreadCount,
    };
  },

  async markNotificationRead(id: string): Promise<void> {
    await request<any>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    try {
      await request<any>('/notifications/read-all', {
        method: 'POST',
      });
    } catch {
      // Fallback
    }
  },

  // Reminder Settings
  async fetchReminderSettings(): Promise<{
    reminder_days_before: number;
    email_enabled: boolean;
    in_app_enabled: boolean;
    smtp_configured: boolean;
  }> {
    return request<any>('/reminders/settings');
  },

  async updateReminderSettings(payload: {
    reminder_days_before?: number;
    email_enabled?: boolean;
    in_app_enabled?: boolean;
  }): Promise<any> {
    return request<any>('/reminders/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async triggerReminders(): Promise<any> {
    return request<any>('/reminders/trigger', {
      method: 'POST',
    });
  },
};
