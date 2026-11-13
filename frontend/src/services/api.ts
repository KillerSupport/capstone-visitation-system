// REST API client for the BJMP Imus City Jail Visitation System.
import { UserProfile, PDL } from '../types';
import { downloadPdfTable } from '../utils/pdfExport';

export type LoginResult = {success:boolean;user:UserProfile};

const browserHost = typeof window !== 'undefined' && window.location.hostname
  ? window.location.hostname
  : 'localhost';
const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
const backendPort = import.meta.env.VITE_BACKEND_PORT || '4001';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `${protocol}//${browserHost}:${backendPort}/api`;

function parseCsvDocument(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"' && field.length === 0) quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\r' || character === '\n') {
      row.push(field); field = '';
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      if (character === '\r' && text[index + 1] === '\n') index += 1;
    } else field += character;
  }
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

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
    let errorMsg = response.status >= 500
      ? 'Something went wrong while completing your request. Please try again. Contact an administrator if it continues.'
      : 'We could not complete that request. Please check the information and try again.';
    try {
      const errJson = await response.json();
      const serverMessage = typeof errJson.error === 'string' ? errJson.error.trim() : '';
      const technicalMessage = /^(?:HTTP\s+Error|Error:|TypeError:|ReferenceError:|SyntaxError:|ER_[A-Z0-9_]+|SQLSTATE)|\bSQL syntax\b|\bSELECT\b.+\bFROM\b|\bat\s+.+\(.+\)|\bDuplicate entry\b|\bCannot add or update a child row\b|\bData too long for column\b|\bUnknown column\b|\bECONNREFUSED\b|\bETIMEDOUT\b/i.test(serverMessage);
      if (serverMessage && !technicalMessage) errorMsg = serverMessage;
    } catch {}
    throw new Error(errorMsg);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('The application returned an unexpected response. Please try again. Contact an administrator if it continues.');
  }
}

export const api = {
  async updateIncident(id:string,data:any){return request<any>(`/incidents/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)})},
  async getIncidentHistory(id:string){return request<any[]>(`/incidents/${encodeURIComponent(id)}/history`)},
  async getStaff(){return request<UserProfile[]>('/staff')},
  async createWorker(data:any){return request<any>('/staff',{method:'POST',body:JSON.stringify(data)})},
  async updateWorker(id:string,data:any){return request<any>(`/staff/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)})},
  async resetWorkerPassword(id:string,password:string){return request<any>(`/staff/${encodeURIComponent(id)}/reset-password`,{method:'POST',body:JSON.stringify({password})})},
  // Compatibility stubs for legacy, unmounted visitor-account screens.
  async getSharedVisitHistory(_query=''):Promise<any[]>{return []},
  async changeSelectedDate(_id:string,_date:string):Promise<any>{throw new Error('Visitors do not book or change visit dates. Staff record visits at the gate.')},
  async getFacilities():Promise<any[]>{return []},
  async getLinkedPdls():Promise<any[]>{return []},
  async companionPolicy():Promise<any>{return {}},
  async reviewCompanion(_id:string,_index:number,_status:string,_note:string):Promise<any>{throw new Error('Companion booking is no longer available.')},
  async getKycStatus():Promise<any>{throw new Error('Visitor account verification is no longer available.')},
  async submitKyc(_data:any):Promise<any>{throw new Error('Visitor account verification is no longer available.')},
  async getAdminKyc(_status?:string):Promise<any[]>{return []},
  async adminKycDetail(_id:string):Promise<any>{throw new Error('Visitor identity review is no longer available.')},
  async getKycDocument(_url:string):Promise<string>{throw new Error('Visitor identity review is no longer available.')},
  async reviewKyc(_id:string,_status:string,_reason=''):Promise<any>{throw new Error('Visitor identity review is no longer available.')},
  async register(_userData?:Partial<UserProfile>):Promise<any>{throw new Error('Visitor accounts are not available. Visitors are registered by authorized staff.')},
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
  // Check health
  async checkHealth() {
    return request<{ status: string; database: string }>('/health');
  },

  async verifyOtp(code: string) { return request<{success:boolean;user:UserProfile;developmentOtp?:string;deliveryError?:string;verificationComplete:boolean}>('/auth/verify-otp',{method:'POST',body:JSON.stringify({code})}); },
  async resendOtp() { return request<{success:boolean;developmentOtp?:string}>('/auth/resend-otp',{method:'POST'}); },
  async getWorkerPdls() { return request<PDL[]>('/worker/pdls'); },
  async saveWorkerPdl(pdl:Partial<PDL>) { return request<{success:boolean;pdl:PDL}>('/worker/pdls',{method:'POST',body:JSON.stringify(pdl)}); },
  async getAdminAuditLogs(filters:Record<string,string>={}) { const q=new URLSearchParams(Object.entries(filters).filter(([,v])=>v));return request<any[]>(`/admin/audit-logs${q.size?`?${q}`:''}`); },
  async getAdminArchive(type='',q='') { const params=new URLSearchParams();if(type)params.set('type',type);if(q)params.set('q',q);return request<any[]>(`/admin/archive${params.size?`?${params}`:''}`); },
  async restoreArchivedRecord(type:string,id:string) { return request<{success:boolean}>(`/admin/archive/${encodeURIComponent(type)}/${encodeURIComponent(id)}/restore`,{method:'POST'}); },
  async getArchiveHistory(type:string,id:string) { return request<any[]>(`/admin/archive/${encodeURIComponent(type)}/${encodeURIComponent(id)}/history`); },
  async archiveRecord(type:string,id:string,reason:string) { return request<{success:boolean}>(`/admin/archive/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,{method:'POST',body:JSON.stringify({reason})}); },
  async downloadAdminExport(endpoint: string, filters: Record<string, string> = {}) {
    const q = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const response = await fetch(`${API_BASE}${endpoint}${q.size ? `?${q}` : ''}`, { credentials: 'include' });
    if (!response.ok) {
      let message = response.status >= 500
        ? 'The report could not be prepared. Please try again. Contact an administrator if it continues.'
        : 'The report could not be prepared. Check the selected filters and try again.';
      try {
        const body = await response.json();
        const serverMessage = typeof body.error === 'string' ? body.error.trim() : '';
        if (serverMessage && !/SQL|ER_[A-Z0-9_]+|stack|TypeError|SyntaxError|ECONNREFUSED|ETIMEDOUT/i.test(serverMessage)) message = serverMessage;
      } catch { /* Keep the plain-language message. */ }
      throw new Error(message);
    }
    const table = parseCsvDocument(await response.text());
    if (!table.length) throw new Error('This report has no records to download.');
    const sourceName = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'report.csv';
    const baseName = sourceName.replace(/\.[^.]+$/, '');
    const title = baseName.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    downloadPdfTable(title, 'Generated ' + new Date().toLocaleString(), table[0], table.slice(1), baseName + '.pdf');
    return true;
  },
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

  // PDLs
  async getPdls(): Promise<PDL[]> {
    return request<PDL[]>('/pdls');
  },

  async getNextPropertyReceiptNumber(): Promise<{ receiptNumber: string }> {
    return request<{ receiptNumber: string }>('/pdl-property-receipt-number');
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
  async requestWorkerVisitorQr(visitorId: string, pdlId: string) {
    return request<any>(`/visitor-records/worker/visitors/${encodeURIComponent(visitorId)}/qr`, {
      method: 'POST', body: JSON.stringify({ pdlId }),
    });
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
  async searchVisitorRecords(query:string, fromScanner = false) {
    return request<any[]>(`/visitor-records/worker/search?q=${encodeURIComponent(query)}${fromScanner ? '&source=scanner' : ''}`);
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
  async getRecentRecordVisits(query='') {
    return request<any[]>(`/visitor-records/worker/recent${query.trim()?`?q=${encodeURIComponent(query.trim())}`:''}`);
  },
  async checkOutRecordVisit(type:'PDL'|'GUEST',id:string) {
    return request<any>(`/visitor-records/worker/visits/${type}/${encodeURIComponent(id)}/checkout`,{method:'POST',body:'{}'});
  },
};



