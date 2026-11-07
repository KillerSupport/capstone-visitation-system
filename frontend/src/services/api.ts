// REST API client for the BJMP Imus City Jail Visitation System.
import { UserProfile, VisitationAppointment, PDL, AccountStatus } from '../types';

export interface LoginCodeResponse {success:boolean;otpRequired:true;channel:'email'|'sms';destination:string;developmentOtp?:string;}
export type LoginResult = LoginCodeResponse | {success:boolean;user:UserProfile;otpRequired?:false;};
export interface NotificationStatus {channel:'email'|'sms';status:string;}

const browserHost = typeof window !== 'undefined' && window.location.hostname
  ? window.location.hostname
  : 'localhost';
const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
const backendPort = import.meta.env.VITE_BACKEND_PORT || '4001';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `${protocol}//${browserHost}:${backendPort}/api`;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  }).catch(()=>{throw new Error('Cannot reach the application server. Make sure the project and MySQL are running, then try again.');});

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
  async updateIncident(id:string,data:any){return request<any>(`/incidents/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)})},
  async getIncidentHistory(id:string){return request<any[]>(`/incidents/${encodeURIComponent(id)}/history`)},
  async getSharedVisitHistory(q=''){return request<any[]>(`/worker/visit-history?q=${encodeURIComponent(q)}`)},

  async changeSelectedDate(id:string,visitDate:string){return request<any>(`/visitation/visits/${encodeURIComponent(id)}/date`,{method:'PATCH',body:JSON.stringify({visitDate})})},

  async getStaff(){return request<UserProfile[]>('/staff')},
  async createWorker(data:any){return request<any>('/staff',{method:'POST',body:JSON.stringify(data)})},
  async updateWorker(id:string,data:any){return request<any>(`/staff/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)})},
  async resetWorkerPassword(id:string,password:string){return request<any>(`/staff/${encodeURIComponent(id)}/reset-password`,{method:'POST',body:JSON.stringify({password})})},
  async getEnrollmentVisitors(){return request<any[]>('/enrollment/visitors')},

  async getVisitationAdmin(){return request<any>('/visitation/admin')},
  async getLinkedPdls(){return request<any[]>('/visitation/linked-pdls')},
  async saveVisitorLimit(visitorLimit:number){return request<any>('/visitation/policy',{method:'PUT',body:JSON.stringify({visitorLimit})})},
  async assignPdlDay(id:string,weekday:number,reason:string){return request<any>(`/visitation/pdls/${encodeURIComponent(id)}/day`,{method:'PUT',body:JSON.stringify({weekday,reason})})},
  async approvePdlVisitor(id:string,userId:string,relationship:string){return request<any>(`/visitation/pdls/${encodeURIComponent(id)}/visitors`,{method:'POST',body:JSON.stringify({userId,relationship})})},
  async archivePdlVisitor(id:string,userId:string,reason:string){return request<any>(`/visitation/pdls/${encodeURIComponent(id)}/visitors/${encodeURIComponent(userId)}/archive`,{method:'POST',body:JSON.stringify({reason})})},

  async getFacilities(){return request<any[]>('/facilities')},
  async saveFacilityCapacities(capacities:{id:string;capacity:number}[]){return request<any>('/admin/facility-capacities',{method:'PUT',body:JSON.stringify({capacities})})},
  async getSecurityNotice(){return request<{content:string}>('/security-notice')},
  async saveSecurityNotice(content:string){return request<any>('/admin/security-notice',{method:'PUT',body:JSON.stringify({content})})},
  async geography(kind:string,parent='',barangay=''){return request<any[]>(`/geography/${kind}?parent=${encodeURIComponent(parent)}&barangay=${encodeURIComponent(barangay)}`)},
  async forgotPassword(identifier:string){return request<any>('/auth/forgot-password',{method:'POST',body:JSON.stringify({identifier})})},
  async verifyReset(identifier:string,code:string){return request<any>('/auth/verify-reset',{method:'POST',body:JSON.stringify({identifier,code})})},
  async resetPassword(data:any){return request<any>('/auth/reset-password',{method:'POST',body:JSON.stringify(data)})},
  async changePassword(data:any){return request<any>('/account-changes/password',{method:'POST',body:JSON.stringify(data)})},
  async requestPasswordRecovery(data:any){return request<any>('/account-changes/password/recovery',{method:'POST',body:JSON.stringify(data)})},
  async requestProfileChange(data:any){return request<any>('/account-changes/profile',{method:'POST',body:JSON.stringify(data)})},
  async verifyProfileChange(code:string){return request<any>('/account-changes/verify',{method:'POST',body:JSON.stringify({code})})},
  async getWorkerProfileChangeRequests(){return request<any[]>('/account-changes/admin/requests')},
  async getWorkerProfileChangeRequestCount(){return request<{count:number}>('/account-changes/admin/requests/count')},
  async reviewWorkerProfileChange(id:string,decision:'APPROVE'|'REJECT',reason=''){return request<any>(`/account-changes/admin/requests/${encodeURIComponent(id)}/review`,{method:'POST',body:JSON.stringify({decision,reason})})},
  async resumeVerification(identifier:string,password:string){return request<any>('/auth/resume-verification',{method:'POST',body:JSON.stringify({identifier,password})})},
  async companionPolicy(){return request<any>('/companion-policy')},
  async reviewCompanion(id:string,index:number,status:string,note:string){return request<any>(`/appointments/${encodeURIComponent(id)}/companions`,{method:'PATCH',body:JSON.stringify({index,status,note})})},
  async verifyLoginOtp(code:string) {return request<{success:boolean;user:UserProfile}>('/auth/verify-login-otp',{method:'POST',body:JSON.stringify({code})});},
  async resendLoginOtp() {return request<LoginCodeResponse>('/auth/resend-login-otp',{method:'POST'});},
  // Check health
  async checkHealth() {
    return request<{ status: string; database: string }>('/health');
  },

  async verifyOtp(code: string) { return request<{success:boolean;user:UserProfile;developmentOtp?:string;deliveryError?:string;verificationComplete:boolean}>('/auth/verify-otp',{method:'POST',body:JSON.stringify({code})}); },
  async resendOtp() { return request<{success:boolean;developmentOtp?:string}>('/auth/resend-otp',{method:'POST'}); },
  async getKycStatus() { return request<{status:any}>('/kyc/status'); },
  async submitKyc(data:{idType:string;idNumber:string;fullName:string;dateOfBirth?:string;address?:string;frontImage:string;backImage?:string}) { return request<{success:boolean;status:string;automatedCheck:any}>('/kyc/submissions',{method:'POST',body:JSON.stringify(data)}); },
  async getWorkerPdls() { return request<PDL[]>('/worker/pdls'); },
  async saveWorkerPdl(pdl:Partial<PDL>) { return request<{success:boolean;pdl:PDL}>('/worker/pdls',{method:'POST',body:JSON.stringify(pdl)}); },
  async getWorkerVisits(scope='worker') { return request<any[]>(`/${scope}/visitors/today`); },
  async getVisitorPdls(): Promise<PDL[]> { return request<PDL[]>('/visitor/pdls'); },
  async getWorkerHistory(scope='worker') { return request<any[]>(`/${scope}/history`); },
  async workerSearchVisitors(query:string,scope='worker') { return request<any[]>(`/${scope}/visitors/search?q=${encodeURIComponent(query)}`); },
  async workerScan(code:string,proof='',scope='worker') { return request<{result:any;canProceed:boolean}>(`/${scope}/scan`,{method:'POST',body:JSON.stringify({code,proof})}); },
  async workerVerifyVisit(id:string,result:'SUCCESS'|'FAILED') { return request<{success:boolean;result:string;message:string}>(`/worker/visits/${encodeURIComponent(id)}/verify`,{method:'POST',body:JSON.stringify({result})}); },
  async workerExitVisit(id:string,scope='worker') { return request<{success:boolean;message:string}>(`/${scope}/visits/`+encodeURIComponent(id)+'/exit',{method:'POST'}); },
  async workerAdmitVisit(id:string,requestId:string,scope='worker') { return request<{success:boolean;message:string}>(`/${scope}/visits/${encodeURIComponent(id)}/admit`,{method:'POST',body:JSON.stringify({requestId})}); },
  async adminEnrollBiometrics(id:string,proof:string) { return request<{success:boolean;message:string}>(`/users/${encodeURIComponent(id)}/biometrics`,{method:'POST',body:JSON.stringify({proof})}); },
  async getAdminUserProfile(id:string) { return request<any>(`/admin/users/${encodeURIComponent(id)}`); },
  async getAdminKyc(status?:string) { return request<any[]>(`/admin/kyc/${status?`?status=${encodeURIComponent(status)}`:''}`); },
  async reviewKyc(id:string,status:'VERIFIED'|'REJECTED'|'NEEDS_RESUBMISSION',reason='') { return request<any>(`/admin/kyc/${encodeURIComponent(id)}/review`,{method:'PATCH',body:JSON.stringify({status,reason})}); },
  async adminKycDetail(id:string) { return request<any>(`/admin/kyc/${encodeURIComponent(id)}`); },
  async getKycDocument(url:string) { const response=await fetch(`${API_BASE}${url.replace(/^\/api/,'')}`,{credentials:'include'});if(!response.ok)throw new Error('Could not load protected document.');return URL.createObjectURL(await response.blob()); },
  async getAdminAuditLogs(filters:Record<string,string>={}) { const q=new URLSearchParams(Object.entries(filters).filter(([,v])=>v));return request<any[]>(`/admin/audit-logs${q.size?`?${q}`:''}`); },
  async getAdminArchive(type='',q='') { const params=new URLSearchParams();if(type)params.set('type',type);if(q)params.set('q',q);return request<any[]>(`/admin/archive${params.size?`?${params}`:''}`); },
  async restoreArchivedRecord(type:string,id:string) { return request<{success:boolean}>(`/admin/archive/${encodeURIComponent(type)}/${encodeURIComponent(id)}/restore`,{method:'POST'}); },
  async getArchiveHistory(type:string,id:string) { return request<any[]>(`/admin/archive/${encodeURIComponent(type)}/${encodeURIComponent(id)}/history`); },
  async getArchivedRecord(type:string,id:string) { return request<any>(`/admin/archive/${encodeURIComponent(type)}/${encodeURIComponent(id)}`); },
  async archiveRecord(type:string,id:string,reason:string) { return request<{success:boolean}>(`/admin/archive/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,{method:'POST',body:JSON.stringify({reason})}); },
  async downloadAdminExport(endpoint:string,filters:Record<string,string>={}) { const q=new URLSearchParams(Object.entries(filters).filter(([,v])=>v));const response=await fetch(`${API_BASE}${endpoint}${q.size?`?${q}`:''}`,{credentials:'include'});if(!response.ok){let message='Export failed';try{message=(await response.json()).error||message}catch{}throw new Error(message)}const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1]||'report.csv';a.click();URL.revokeObjectURL(url);return true; },
  async logout() { return request<{success:boolean}>('/auth/logout',{method:'POST'}); },
  async me() { return request<{user:UserProfile}>('/auth/me'); },

  // Users
  async getUsers(): Promise<UserProfile[]> {
    return request<UserProfile[]>('/users');
  },

  async login(identifier: string, password: string): Promise<LoginResult> {
    return request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  async register(userData: Partial<UserProfile>): Promise<{ success: boolean; user: UserProfile; developmentOtp?:string; deliveryError?:string }> {
    return request<{ success: boolean; user: UserProfile; developmentOtp?:string; deliveryError?:string }>('/auth/register', {
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

  async updateAppointmentStatus(id: string, status: VisitationAppointment['status']): Promise<{ success: boolean; appointment: VisitationAppointment; notifications?:NotificationStatus[] }> {
    return request<{ success: boolean; appointment: VisitationAppointment; notifications?:NotificationStatus[] }>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteAppointment(id: string, reason='Administrator archive'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/archive/VISITS/${encodeURIComponent(id)}`, {
      method: 'POST', body: JSON.stringify({reason}),
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

  async getVisitorRecords(query='') {
    return request<any[]>(`/visitor-records/admin/visitors?q=${encodeURIComponent(query)}`);
  },
  async getVisitorRestrictionOptions(query='') {
    return request<any[]>(`/visitor-records/admin/visitors/restriction-options?q=${encodeURIComponent(query)}`);
  },
  async getVisitorRecord(id:string) {
    return request<any>(`/visitor-records/admin/visitors/${encodeURIComponent(id)}`);
  },
  async createVisitorRecord(data:any) {
    return request<any>('/visitor-records/admin/visitors',{method:'POST',body:JSON.stringify(data)});
  },
  async updateVisitorRecord(id:string,data:any) {
    return request<any>(`/visitor-records/admin/visitors/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(data)});
  },
  async archiveVisitorRecord(id:string,reason:string) {
    return request<any>(`/visitor-records/admin/visitors/${encodeURIComponent(id)}/archive`,{method:'POST',body:JSON.stringify({reason})});
  },
  async restoreVisitorRecord(id:string) {
    return request<any>(`/visitor-records/admin/visitors/${encodeURIComponent(id)}/restore`,{method:'POST',body:'{}'});
  },
  async approveVisitorForPdl(id:string,pdlId:string,relationship:string) {
    return request<any>(`/visitor-records/admin/visitors/${encodeURIComponent(id)}/approve`,{method:'POST',body:JSON.stringify({pdlId,relationship})});
  },
  async revokeVisitorPdlAssignment(assignmentId:string,reason:string) {
    return request<any>(`/visitor-records/admin/assignments/${encodeURIComponent(assignmentId)}/revoke`,{method:'POST',body:JSON.stringify({reason})});
  },
  async getAdminPdlSchedules() {
    return request<any[]>('/visitor-records/admin/schedules');
  },
  async getAdminPdlSchedule(pdlId:string) {
    return request<any>(`/visitor-records/admin/schedules/${encodeURIComponent(pdlId)}`);
  },
  async saveAdminPdlSchedule(pdlId:string,weekday:number,reason:string) {
    return request<any>(`/visitor-records/admin/schedules/${encodeURIComponent(pdlId)}`,{method:'PUT',body:JSON.stringify({weekday,reason})});
  },
  async getVisitorQrIdentity(id:string,scope:'admin'|'worker'='admin') {
    const path=scope==='admin'?`/visitor-records/admin/visitors/${encodeURIComponent(id)}/qr`:`/visitor-records/worker/visitors/${encodeURIComponent(id)}/qr`;
    return request<any>(path);
  },
  async getVisitorRestrictions(query='',from='',to='') {
    const params = new URLSearchParams({ q: query, from, to });
    return request<any[]>(`/visitor-records/admin/restrictions?${params}`);
  },
  async createVisitorRestriction(data:any) {
    return request<any>('/visitor-records/admin/restrictions',{method:'POST',body:JSON.stringify(data)});
  },
  async removeVisitorRestriction(id:string,reason:string) {
    return request<any>(`/visitor-records/admin/restrictions/${encodeURIComponent(id)}/remove`,{method:'POST',body:JSON.stringify({reason})});
  },
  async getVisitorReport(from:string,to:string) {
    return request<any>(`/visitor-records/admin/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  },
  async getNewVisitLogs(filters:Record<string,string>={}) {
    const q=new URLSearchParams(Object.entries(filters).filter(([,v])=>v));
    return request<any[]>(`/visitor-records/admin/visit-logs${q.size?`?${q}`:''}`);
  },
  async searchVisitorRecords(query:string) {
    return request<any[]>(`/visitor-records/worker/search?q=${encodeURIComponent(query)}`);
  },
  async verifyVisitorForPdl(visitorId:string,pdlId:string) {
    return request<any>(`/visitor-records/worker/verify/${encodeURIComponent(visitorId)}/${encodeURIComponent(pdlId)}`);
  },
  async checkInPdlVisitor(data:any) {
    return request<any>('/visitor-records/worker/pdl-checkins',{method:'POST',body:JSON.stringify(data)});
  },
  async checkInGuestVisitor(data:any) {
    return request<any>('/visitor-records/worker/guest-checkins',{method:'POST',body:JSON.stringify(data)});
  },
  async getActiveRecordVisits() {
    return request<any[]>('/visitor-records/worker/active');
  },
  async getTodayPdlVisitors() {
    return request<any>('/visitor-records/worker/today');
  },
  async getRecentRecordVisits() {
    return request<any[]>('/visitor-records/worker/recent');
  },
  async checkOutRecordVisit(type:'PDL'|'GUEST',id:string) {
    return request<any>(`/visitor-records/worker/visits/${type}/${encodeURIComponent(id)}/checkout`,{method:'POST',body:'{}'});
  },
};



