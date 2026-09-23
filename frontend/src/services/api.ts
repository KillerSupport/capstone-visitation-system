// REST API client for the BJMP Imus City Jail Visitation System.
import { UserProfile, VisitationAppointment, PDL, AccountStatus } from '../types';

const browserHost = typeof window !== 'undefined' && window.location.hostname
  ? window.location.hostname
  : 'localhost';
const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
const backendPort = import.meta.env.VITE_BACKEND_PORT || '4001';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `${protocol}//${browserHost}:${backendPort}/api`;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Check health
  async checkHealth() {
    return request<{ status: string; database: string }>('/health');
  },

  // Users
  async getUsers(): Promise<UserProfile[]> {
    return request<UserProfile[]>('/users');
  },

  async login(email: string, password: string): Promise<{ success: boolean; user: UserProfile }> {
    return request<{ success: boolean; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(userData: Partial<UserProfile>): Promise<{ success: boolean; user: UserProfile }> {
    return request<{ success: boolean; user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateUserStatus(userId: string, status: AccountStatus, officerName?: string): Promise<{ success: boolean; user: UserProfile }> {
    return request<{ success: boolean; user: UserProfile }>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, officerName }),
    });
  },

  // Appointments
  async getAppointments(): Promise<VisitationAppointment[]> {
    return request<VisitationAppointment[]>('/appointments');
  },

  async createAppointment(appt: Partial<VisitationAppointment>): Promise<{ success: boolean; appointment: VisitationAppointment }> {
    return request<{ success: boolean; appointment: VisitationAppointment }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appt),
    });
  },

  async updateAppointmentStatus(id: string, status: VisitationAppointment['status']): Promise<{ success: boolean; appointment: VisitationAppointment }> {
    return request<{ success: boolean; appointment: VisitationAppointment }>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteAppointment(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  // PDLs
  async getPdls(): Promise<PDL[]> {
    return request<PDL[]>('/pdls');
  },

  async createPdl(pdl: Partial<PDL>): Promise<{ success: boolean; pdl: PDL }> {
    return request<{ success: boolean; pdl: PDL }>('/pdls', {
      method: 'POST',
      body: JSON.stringify(pdl),
    });
  },

  async savePdl(pdl: PDL): Promise<{ success: boolean; pdl: PDL }> {
    return request<{ success: boolean; pdl: PDL }>(`/pdls/${pdl.id}`, {
      method: 'PUT',
      body: JSON.stringify(pdl),
    });
  },

  async getPdlFormRecords(pdlId?: string) {
    return request<any[]>(`/pdl-form-records${pdlId ? `?pdlId=${encodeURIComponent(pdlId)}` : ''}`);
  },

  async savePdlFormRecord(pdlId: string, recordType: string, record: any) {
    return request<{ success: boolean; record: any }>(`/pdl-form-records/${pdlId}/${recordType}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    });
  },

  // Gate Scanner
  async logGateScan(data: {
    appointmentId?: string;
    userId: string;
    visitorName: string;
    pdlName: string;
    facilityId?: string;
    guardOfficer?: string;
    action: 'ADMITTED' | 'DENIED' | 'EXITED';
    notes?: string;
  }) {
    return request<{ success: boolean; log: any }>('/gate/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getGateLogs() {
    return request<any[]>('/gate/logs');
  },

  // Incidents
  async getIncidents() {
    return request<any[]>('/incidents');
  },

  async reportIncident(data: any) {
    return request<{ success: boolean; incident: any }>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Announcements
  async getAnnouncements() {
    return request<any[]>('/announcements');
  },

  async postAnnouncement(data: { title: string; content: string; level: string; postedBy?: string }) {
    return request<{ success: boolean; announcement: any }>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // System Stats
  async getStats() {
    return request<{
      totalPdls: number;
      scheduledToday: number;
      admittedToday: number;
      pendingBiometrics: number;
      currentOnSiteVisitors: number;
    }>('/stats');
  },
};

