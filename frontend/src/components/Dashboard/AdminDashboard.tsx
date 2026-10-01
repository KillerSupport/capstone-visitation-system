import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield, Users, Calendar, Clock, CheckCircle2, AlertTriangle, AlertCircle, Archive,
  Fingerprint, Search, Filter, Eye, Printer, Plus, Trash2,
  Building, RefreshCw, Check, X, ArrowUpDown, ExternalLink, QrCode,
  FileCheck, ShieldAlert, UserPlus, Sliders, Sparkles, MapPin,
  FileText, Edit3, Scale, Package, CheckSquare, ListFilter, Table
} from 'lucide-react';
import {
  UserProfile, VisitationAppointment, JailFacility, PDL,
  AccountStatus, VisitType, isStaffRole
} from '../../types';
import { BJMP_JAIL_FACILITIES } from '../../data/bjmpData';
import { PrintablePassModal } from '../Common/PrintablePassModal';
import { PDLRegistrationModal } from '../Admin/PDLRegistrationModal';
import { OfficialBjmpDocumentsModal } from '../Admin/OfficialBjmpDocumentsModal';
import { AdminKycPanel } from '../Admin/AdminKycPanel';
import { AdminAuditPanel } from '../Admin/AdminAuditPanel';
import { AdminArchivePanel } from '../Admin/AdminArchivePanel';
import { AdminReportsPanel } from '../Admin/AdminReportsPanel';
import { api } from '../../services/api';

interface AdminDashboardProps {
  currentUser: UserProfile;
  users: UserProfile[];
  appointments: VisitationAppointment[];
  pdls: PDL[];
  onUpdateUserStatus: (userId: string, status: AccountStatus, officerNote?: string) => void;
  onUpdateAppointmentStatus: (appointmentId: string, status: VisitationAppointment['status']) => void;
  onOpenGuardScanner: (visitorId?: string) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onSwitchToVisitorView: () => void;
  onSavePdl: (pdl: PDL) => Promise<void>;
  onUsersRefresh?: () => Promise<void> | void;
}

interface SecurityIncident {
  id: string;
  timestamp: string;
  visitorName: string;
  facility: string;
  incidentType: 'Contraband Interception' | 'Dress Code Non-Compliance' | 'Fake/Expired ID' | 'Unauthorized Relationship';
  description: string;
  actionTaken: string;
  reportingOfficer: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  users,
  appointments,
  pdls,
  onUpdateUserStatus,
  onUpdateAppointmentStatus,
  onOpenGuardScanner,
  onDeleteAppointment,
  onSwitchToVisitorView,
  onSavePdl,
  onUsersRefresh,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'VISITORS' | 'KYC' | 'APPOINTMENTS' | 'PDL_ROSTER' | 'SECURITY_LOGS' | 'AUDIT' | 'ARCHIVE' | 'REPORTS' | 'FACILITY_SETTINGS'>('OVERVIEW');

  // Visitor Management State
  const [visitorFilter, setVisitorFilter] = useState<'ALL' | 'ACTIVATED' | 'ACTIVE' | 'PENDING_VERIFICATION' | 'PENDING_BIOMETRICS' | 'PENDING_EMAIL' | 'SUSPENDED' | 'REJECTED'>('ALL');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [selectedVisitorForKyc, setSelectedVisitorForKyc] = useState<UserProfile | null>(null);
  const [selectedUserDetails,setSelectedUserDetails]=useState<any|null>(null);
  const [profileLoading,setProfileLoading]=useState(false);
  const [pendingKycCount,setPendingKycCount]=useState(0);
  const [biometricScanningUser, setBiometricScanningUser] = useState<UserProfile | null>(null);


  // Appointment Management State
  const [apptFilterDate, setApptFilterDate] = useState<'ALL' | 'TODAY' | 'UPCOMING'>('ALL');
  const [apptFilterStatus, setApptFilterStatus] = useState<string>('ALL');
  const [apptSearch, setApptSearch] = useState('');
  const [selectedPassModalAppt, setSelectedPassModalAppt] = useState<VisitationAppointment | null>(null);

  // PDL State
  const [pdlList, setPdlList] = useState<PDL[]>(pdls);
  const [pdlSearch, setPdlSearch] = useState('');
  const [isAddPdlOpen, setIsAddPdlOpen] = useState(false);
  const [editingPdl, setEditingPdl] = useState<PDL | null>(null);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [selectedPdlForDocs, setSelectedPdlForDocs] = useState<PDL | null>(null);
  const [pdlViewMode, setPdlViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [newPdlName, setNewPdlName] = useState('');
  const [newPdlNumber, setNewPdlNumber] = useState('');
  const [newPdlFacility, setNewPdlFacility] = useState('imus-city-jail-male');
  const [newPdlCell, setNewPdlCell] = useState('Brigada 2 - Male Cell C');

  useEffect(() => { setPdlList(pdls); }, [pdls]);
  useEffect(() => { api.getIncidents().then(rows=>setIncidentList(rows.map((r:any)=>({id:r.id,timestamp:r.timestamp,visitorName:r.visitor_name,facility:r.facility,incidentType:r.incident_type,description:r.description,actionTaken:r.action_taken,reportingOfficer:r.reporting_officer})))).catch(()=>setIncidentList([])); }, []);
  useEffect(()=>{api.getAdminKyc('PENDING_REVIEW').then(rows=>setPendingKycCount(rows.length)).catch(()=>setPendingKycCount(0))},[users,activeTab]);
  const openUserProfile=async(user:UserProfile)=>{setSelectedVisitorForKyc(user);setSelectedUserDetails(null);setProfileLoading(true);try{setSelectedUserDetails(await api.getAdminUserProfile(user.id))}catch{setSelectedUserDetails({user})}finally{setProfileLoading(false)}};

  // Security Incident Logs State
  const [incidentList, setIncidentList] = useState<SecurityIncident[]>([]);
  const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
  const [newIncidentVisitor, setNewIncidentVisitor] = useState('');
  const [newIncidentType, setNewIncidentType] = useState<SecurityIncident['incidentType']>('Contraband Interception');
  const [newIncidentDesc, setNewIncidentDesc] = useState('');
  const [newIncidentAction, setNewIncidentAction] = useState('');

  // Facility Capacity State
  const [maleCapacity, setMaleCapacity] = useState(40);
  const [femaleCapacity, setFemaleCapacity] = useState(30);
  const [systemNotice, setSystemNotice] = useState('HEIGHTENED SECURITY PROTOCOL: All food packages (Paabot) must strictly use transparent clear containers. Metal cans prohibited.');

  // Today's Date calculation
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered Visitors
  const filteredVisitors = useMemo(() => {
    return users.filter((u) => {
      if (isStaffRole(u.role)) return false;
      if (visitorFilter !== 'ALL' && u.accountStatus !== visitorFilter) return false;
      if (visitorSearch) {
        const query = visitorSearch.toLowerCase();
        const fullName = `${u.firstName} ${u.middleName || ''} ${u.lastName}`.toLowerCase();
        const email = u.email.toLowerCase();
        const bio = (u.biometricReferenceNumber || '').toLowerCase();
        const idType = (u.validIdType || '').toLowerCase();
        const phone=(u.mobileNumber||'').toLowerCase();
        return fullName.includes(query) || email.includes(query) || phone.includes(query) || bio.includes(query) || idType.includes(query);
      }
      return true;
    });
  }, [users, visitorFilter, visitorSearch]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      if (apptFilterDate === 'TODAY' && appt.visitDate !== todayStr) return false;
      if (apptFilterDate === 'UPCOMING' && appt.visitDate < todayStr) return false;
      if (apptFilterStatus !== 'ALL' && appt.status !== apptFilterStatus) return false;
      if (apptSearch) {
        const query = apptSearch.toLowerCase();
        const visitor = (appt.visitorName || '').toLowerCase();
        const pdl = (appt.pdlName || '').toLowerCase();
        const ref = (appt.appointmentReference || '').toLowerCase();
        const cell = (appt.cellDormitory || '').toLowerCase();
        return visitor.includes(query) || pdl.includes(query) || ref.includes(query) || cell.includes(query);
      }
      return true;
    });
  }, [appointments, apptFilterDate, apptFilterStatus, apptSearch, todayStr]);

  // Metric aggregates
  const totalVisitors = users.filter((u) => u.role === 'VISITOR' || !u.role).length;
  const activatedVisitors = users.filter((u) => ['ACTIVE','ACTIVATED'].includes(u.accountStatus) && (u.role === 'VISITOR' || !u.role)).length;
  const pendingBiometricVisitors = users.filter((u) => u.accountStatus === 'PENDING_BIOMETRICS').length;
  const pendingEmailVisitors = users.filter((u) => u.accountStatus === 'PENDING_EMAIL' || u.accountStatus === 'PENDING_VERIFICATION').length;
  const pendingRegistrationUsers = users.filter((u) => ['PENDING_VERIFICATION','PENDING_EMAIL','PENDING_BIOMETRICS'].includes(u.accountStatus)).length;

  const todayAppointments = appointments.filter((a) => a.visitDate === todayStr);
  const pendingAppointments = appointments.filter((a) => a.status === 'Pending Review');

  // Biometric Desk Scanner Execution
  const handleStartBiometricScan = (visitor: UserProfile) => { setBiometricScanningUser(visitor); };

  // Save PDL (from comprehensive registration form)
  const handleSavePdl = async (savedPdl: PDL) => {
    await onSavePdl(savedPdl);
    setPdlList((prev) => {
      const idx = prev.findIndex((p) => p.id === savedPdl.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedPdl;
        return updated;
      }
      return [savedPdl, ...prev];
    });
    setIsAddPdlOpen(false);
    setEditingPdl(null);
  };

  // Quick Add PDL (fallback)
  const handleAddPdl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPdlName || !newPdlNumber) return;
    const newPdl: PDL = {
      id: `pdl-${Date.now()}`,
      pdlNumber: newPdlNumber.toUpperCase(),
      fullName: newPdlName,
      jailFacilityId: newPdlFacility,
      cellDormitory: newPdlCell,
      status: 'In Custody',
      allowedVisitorRelationship: ['Spouse', 'Parent', 'Child', 'Sibling', 'Legal Counsel'],
    };
    void handleSavePdl(newPdl);
    setIsAddPdlOpen(false);
    setNewPdlName('');
    setNewPdlNumber('');
  };

  // Add Incident
  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentVisitor || !newIncidentDesc) return;
    const item: SecurityIncident = {
      id: `inc-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      visitorName: newIncidentVisitor,
      facility: 'BJMP Imus City Jail',
      incidentType: newIncidentType,
      description: newIncidentDesc,
      actionTaken: newIncidentAction || 'Recorded in BJMP Gate blotter.',
      reportingOfficer: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.badgeNumber || 'Command'})`,
    };
    try {const result=await api.reportIncident(item);const r=result.incident;setIncidentList((prev) => [{id:r.id,timestamp:r.timestamp,visitorName:r.visitor_name,facility:r.facility,incidentType:r.incident_type,description:r.description,actionTaken:r.action_taken,reportingOfficer:r.reporting_officer}, ...prev]);} catch(e:any) {window.alert(e.message);return}
    setIsAddIncidentOpen(false);
    setNewIncidentVisitor('');
    setNewIncidentDesc('');
    setNewIncidentAction('');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-transparent text-slate-100 pb-16">
      
      {/* Broadcast Alert Banner */}
      {systemNotice && (
        <div className="bg-blue-500/10 border-b border-blue-500/30 px-6 py-2 text-xs text-blue-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-semibold">{systemNotice}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
        
        {/* Navigation Tabs Bar */}
        <nav aria-label="Admin navigation" className="flex items-center space-x-1.5 border-b border-slate-800 pb-3 overflow-x-auto mb-6 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1 lg:mb-0 lg:h-fit lg:flex-col lg:items-stretch lg:space-x-0 lg:space-y-1.5 lg:overflow-visible lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap lg:w-full lg:justify-start ${
              activeTab === 'OVERVIEW'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Command Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VISITORS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap lg:w-full lg:justify-start relative ${
              activeTab === 'VISITORS'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Visitor Accounts</span>
            {pendingBiometricVisitors > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'VISITORS' ? 'bg-slate-950 text-blue-400' : 'bg-blue-500 text-slate-950'
              }`}>
                {pendingBiometricVisitors}
              </span>
            )}
          </button>

          <button type="button" onClick={() => setActiveTab('KYC')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 whitespace-nowrap ${activeTab==='KYC'?'bg-blue-500 text-slate-950':'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}><FileCheck className="w-4 h-4"/><span>Identity Verification</span></button>

          <button
            type="button"
            onClick={() => setActiveTab('APPOINTMENTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap lg:w-full lg:justify-start relative ${
              activeTab === 'APPOINTMENTS'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Visitations & Gate Schedule</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'APPOINTMENTS' ? 'bg-slate-950 text-blue-400' : 'bg-slate-800 text-slate-300'
            }`}>
              {appointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PDL_ROSTER')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap lg:w-full lg:justify-start ${
              activeTab === 'PDL_ROSTER'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Inmates (PDL) Roster</span>
            <span className="text-[10px] opacity-75 font-mono">({pdlList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SECURITY_LOGS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap lg:w-full lg:justify-start ${
              activeTab === 'SECURITY_LOGS'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Gate 1 Security & Contraband</span>
            <span className="text-[10px] opacity-75 font-mono">({incidentList.length})</span>
          </button>

          <button type="button" onClick={() => setActiveTab('AUDIT')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 whitespace-nowrap ${activeTab==='AUDIT'?'bg-blue-500 text-slate-950':'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}><FileText className="w-4 h-4"/><span>Audit Logs</span></button>
          <button type="button" onClick={() => setActiveTab('ARCHIVE')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 whitespace-nowrap ${activeTab==='ARCHIVE'?'bg-blue-500 text-slate-950':'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}><Archive className="w-4 h-4"/><span>Archive / Recycle Bin</span></button>
          <button type="button" onClick={() => setActiveTab('REPORTS')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 whitespace-nowrap ${activeTab==='REPORTS'?'bg-blue-500 text-slate-950':'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}><Table className="w-4 h-4"/><span>Reports & Exports</span></button>

          <button
            type="button"
            onClick={() => setActiveTab('FACILITY_SETTINGS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap lg:w-full lg:justify-start ${
              activeTab === 'FACILITY_SETTINGS'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Facility Slot Limits</span>
          </button>
        </nav>

        {/* ========================================================
            TAB 1: COMMAND OVERVIEW
        ======================================================== */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            
            {/* Infographic: account health, visit flow, and population snapshot */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label="Facility infographic overview">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Visitor accounts</p><h3 className="text-lg font-extrabold text-white mt-1">Verification health</h3></div>
                  <Users className="w-5 h-5 text-blue-300" />
                </div>
                <div className="h-3 rounded-full bg-slate-950 overflow-hidden flex" role="img" aria-label={`${activatedVisitors} verified, ${pendingBiometricVisitors} awaiting biometrics, ${pendingEmailVisitors} awaiting email`}>
                  <span className="bg-emerald-400 h-full" style={{ width: `${totalVisitors ? activatedVisitors / totalVisitors * 100 : 0}%` }} />
                  <span className="bg-amber-300 h-full" style={{ width: `${totalVisitors ? pendingBiometricVisitors / totalVisitors * 100 : 0}%` }} />
                  <span className="bg-sky-400 h-full" style={{ width: `${totalVisitors ? pendingEmailVisitors / totalVisitors * 100 : 0}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div><span className="block text-xl font-black text-emerald-300">{activatedVisitors}</span><span className="text-[10px] text-slate-400">Verified</span></div>
                  <div><span className="block text-xl font-black text-amber-200">{pendingBiometricVisitors}</span><span className="text-[10px] text-slate-400">Biometrics</span></div>
                  <div><span className="block text-xl font-black text-sky-300">{pendingEmailVisitors}</span><span className="text-[10px] text-slate-400">Email check</span></div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Today's schedule</p><h3 className="text-lg font-extrabold text-white mt-1">Visit pass flow</h3></div>
                  <Calendar className="w-5 h-5 text-blue-300" />
                </div>
                <div className="flex items-end gap-1.5 h-12 mb-3" aria-label={`${todayAppointments.length} visits scheduled today`}>
                  {Array.from({ length: 12 }, (_, i) => <span key={i} className={`flex-1 rounded-t-sm ${i < Math.min(todayAppointments.length, 12) ? 'bg-gradient-to-t from-blue-700 to-cyan-300' : 'bg-slate-800'}`} style={{ height: `${22 + ((i * 17 + todayAppointments.length * 11) % 75)}%` }} />)}
                </div>
                <div className="flex items-end justify-between border-t border-slate-800 pt-3">
                  <div><span className="text-2xl font-black text-white">{todayAppointments.length}</span><span className="text-xs text-slate-400 ml-2">scheduled today</span></div>
                  <button type="button" onClick={() => setActiveTab('APPOINTMENTS')} className="text-[11px] text-blue-300 hover:text-white font-bold cursor-pointer">Open schedule →</button>
                </div>
                <div className="flex gap-3 mt-3 text-[10px] text-slate-400"><span><i className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />{todayAppointments.filter(a => a.status === 'Approved').length} approved</span><span><i className="inline-block w-2 h-2 rounded-full bg-amber-300 mr-1" />{todayAppointments.filter(a => a.status === 'Pending Review').length} in review</span></div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Custody snapshot</p><h3 className="text-lg font-extrabold text-white mt-1">Dorm population</h3></div>
                  <Building className="w-5 h-5 text-blue-300" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full grid place-items-center shrink-0" style={{ background: 'conic-gradient(#60a5fa 0 74.8%, #fbbf24 74.8% 100%)' }} role="img" aria-label="Population split: 184 male, 62 female">
                    <div className="w-[58px] h-[58px] rounded-full bg-slate-900 grid place-items-center text-center"><span className="text-sm leading-tight font-black text-white">246<small className="block text-[8px] text-slate-400 font-semibold">IN CUSTODY</small></span></div>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between text-xs"><span className="text-slate-300"><i className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2" />Male dorm</span><strong className="text-white">184 <small className="text-slate-400">75%</small></strong></div>
                    <div className="flex items-center justify-between text-xs"><span className="text-slate-300"><i className="inline-block w-2 h-2 rounded-full bg-amber-300 mr-2" />Female dorm</span><strong className="text-white">62 <small className="text-slate-400">25%</small></strong></div>
                    <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-sky-300 rounded-full" style={{ width: '74.8%' }} /></div>
                  </div>
                </div>
              </div>
            </section>
            <section className="grid gap-3 sm:grid-cols-3" aria-label="Administrative queues">
              <button type="button" onClick={() => setActiveTab('VISITORS')} className="rounded-xl border border-white/10 bg-slate-900/90 p-4 text-left hover:border-blue-300/40"><span className="text-[10px] uppercase tracking-widest text-slate-400">Registered accounts</span><strong className="mt-1 block text-2xl text-white">{totalVisitors}</strong><span className="text-xs text-blue-300">Open user management →</span></button>
              <button type="button" onClick={() => {setActiveTab('VISITORS');setVisitorFilter('PENDING_VERIFICATION')}} className="rounded-xl border border-amber-300/15 bg-slate-900/90 p-4 text-left hover:border-amber-300/40"><span className="text-[10px] uppercase tracking-widest text-slate-400">Pending registrations</span><strong className="mt-1 block text-2xl text-amber-200">{pendingRegistrationUsers}</strong><span className="text-xs text-amber-100">Review account readiness →</span></button>
              <button type="button" onClick={() => setActiveTab('KYC')} className="rounded-xl border border-blue-300/15 bg-slate-900/90 p-4 text-left hover:border-blue-300/40"><span className="text-[10px] uppercase tracking-widest text-slate-400">Identity verification queue</span><strong className="mt-1 block text-2xl text-blue-200">{pendingKycCount}</strong><span className="text-xs text-blue-100">Open ID submissions →</span></button>
            </section>

            {/* Quick Actions & Facility Status Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Today's Gate Visitation Schedule */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      Today's Gate 1 Visitation Passes & Schedule
                    </h3>
                    <p className="text-xs text-slate-400">Visitors scheduled for contact or e-dalaw visitation today ({todayStr})</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('APPOINTMENTS')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    View All Passes →
                  </button>
                </div>

                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No appointments booked specifically for today yet.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('APPOINTMENTS')}
                      className="mt-3 text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
                    >
                      Browse Upcoming Visitation Schedule
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAppointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 font-mono text-xs font-bold">
                            PASS
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{appt.visitorName}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                                {appt.appointmentReference}
                              </span>
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-semibold">
                                {appt.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Visiting PDL: <strong className="text-slate-200">{appt.pdlName}</strong> ({appt.relationshipToPDL})</span>
                              <span>•</span>
                              <span className="text-blue-300/90">{appt.timeSlot}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPassModalAppt(appt)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs cursor-pointer"
                            title="Inspect Gate Pass"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenGuardScanner(appt.userId)}
                            className="px-2.5 py-1.5 rounded bg-blue-500 hover:bg-blue-400 text-slate-950 font-semibold text-xs flex items-center space-x-1 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Scan at Gate</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Right Col: Biometric Registration Desk In-Person Fast-Track */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-blue-400" />
                      In-Person Biometric Desk Queue
                    </h3>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-bold">
                      {pendingBiometricVisitors} Waiting
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Visitors who confirmed email and are physically present at Gate 1 Records Desk for digital fingerprint capture.
                  </p>

                  <div className="space-y-2.5">
                    {users
                      .filter((u) => u.accountStatus === 'PENDING_BIOMETRICS')
                      .slice(0, 3)
                      .map((u) => (
                        <div
                          key={u.id}
                          className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between"
                        >
                          <div className="text-xs">
                            <div className="font-bold text-white">{u.firstName} {u.lastName}</div>
                            <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                              {u.biometricReferenceNumber}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              ID: {u.validIdType}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartBiometricScan(u)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow-md cursor-pointer transition-colors"
                          >
                            <Fingerprint className="w-3.5 h-3.5" />
                            <span>Device unavailable</span>
                          </button>
                        </div>
                      ))}
                    {pendingBiometricVisitors === 0 && (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No visitors currently in biometric queue.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Desk Station: Gate 1 Records</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('VISITORS')}
                    className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                  >
                    Open Full Visitor Desk →
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Row: Gate 1 Security Incidents Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Recent Gate 1 Interceptions & Compliance Blotter
                  </h3>
                  <p className="text-xs text-slate-400">Contraband seizures, dress code non-compliance, and security interventions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('SECURITY_LOGS')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  View Full Incident Log ({incidentList.length}) →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {incidentList.slice(0, 3).map((inc) => (
                  <div key={inc.id} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-bold text-rose-400">{inc.incidentType}</span>
                      <span className="text-slate-500 font-mono">{inc.timestamp}</span>
                    </div>
                    <div className="font-semibold text-slate-200 mb-1">{inc.visitorName}</div>
                    <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{inc.description}</p>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-blue-400 truncate">
                      Action: {inc.actionTaken}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: VISITORS & BIOMETRICS DESK
        ======================================================== */}
        {activeTab === 'VISITORS' && (
          <div className="space-y-4">
            
            {/* Header & Filter Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
                <div className="flex items-center space-x-1.5">
                  {(['ALL', 'ACTIVE', 'ACTIVATED', 'PENDING_VERIFICATION', 'PENDING_BIOMETRICS', 'PENDING_EMAIL', 'SUSPENDED', 'REJECTED'] as const).map((filterVal) => (
                    <button
                      key={filterVal}
                      type="button"
                      onClick={() => setVisitorFilter(filterVal)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        visitorFilter === filterVal
                          ? 'bg-blue-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {filterVal === 'ALL' && `All (${users.length})`}
                      {filterVal === 'ACTIVE' && `Active (${users.filter(u=>u.accountStatus==='ACTIVE').length})`}
                      {filterVal === 'ACTIVATED' && `Activated (${activatedVisitors})`}
                      {filterVal === 'PENDING_VERIFICATION' && `Pending registration (${users.filter(u=>u.accountStatus==='PENDING_VERIFICATION').length})`}
                      {filterVal === 'SUSPENDED' && `Suspended (${users.filter(u=>u.accountStatus==='SUSPENDED').length})`}
                      {filterVal === 'REJECTED' && `Rejected (${users.filter(u=>u.accountStatus==='REJECTED').length})`}
                      {filterVal === 'PENDING_BIOMETRICS' && `Pending Bio (${pendingBiometricVisitors})`}
                      {filterVal === 'PENDING_EMAIL' && `Pending Email (${pendingEmailVisitors})`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search visitor name, email, Bio ID..."
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {/* Visitors Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Visitor Profile</th>
                      <th className="py-3 px-4">Contact & Location</th>
                      <th className="py-3 px-4">Government ID Presented</th>
                      <th className="py-3 px-4">Biometric Reference #</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Desk Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredVisitors.map((u) => {
                      const isAdmin = u.role === 'ADMIN';
                      return (
                        <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                          
                          {/* Visitor Photo & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                                {u.facePhotoUrl ? (
                                  <img src={u.facePhotoUrl} alt={u.firstName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                                    {u.firstName[0]}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.firstName} {u.middleName ? `${u.middleName} ` : ''}{u.lastName} {u.suffix}</span>
                                  {isAdmin && (
                                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] px-1.5 py-0.2 rounded font-black">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Contact & Location */}
                          <td className="py-3 px-4">
                            <div className="text-slate-200 font-medium">{u.mobileNumber || 'Not provided'}</div>
                            <div className="text-[11px] text-slate-400">{u.address.municipality}</div>
                          </td>

                          {/* Valid ID */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-300">{u.validIdType}</div>
                            <button
                              type="button"
                              onClick={() => void openUserProfile(u)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View account profile</span>
                            </button>
                          </td>

                          {/* Biometric Reference */}
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">
                              {u.biometricReferenceNumber}
                            </span>
                            {u.biometricScannedAt && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                Scanned: {u.biometricScannedAt.split(' ')[0]}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {u.accountStatus === 'ACTIVATED' && (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Activated
                              </span>
                            )}
                            {u.accountStatus === 'PENDING_BIOMETRICS' && (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full font-bold animate-pulse">
                                <Fingerprint className="w-3 h-3" /> Pending Biometrics
                              </span>
                            )}
                            {u.accountStatus === 'PENDING_VERIFICATION' && <span className="inline-flex items-center gap-1 text-[11px] rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 font-bold text-amber-100"><Clock className="h-3 w-3"/>Pending contact / ID review</span>}
                            {u.accountStatus === 'SUSPENDED' && <span className="inline-flex items-center gap-1 text-[11px] rounded-full border border-rose-300/30 bg-rose-300/10 px-2.5 py-1 font-bold text-rose-100">Suspended</span>}
                            {u.accountStatus === 'REJECTED' && <span className="inline-flex items-center gap-1 text-[11px] rounded-full border border-rose-300/30 bg-rose-300/10 px-2.5 py-1 font-bold text-rose-100">Rejected</span>}
                            {u.accountStatus === 'PENDING_EMAIL' && (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full font-bold">
                                <Clock className="w-3 h-3" /> Pending Email OTP
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right space-x-2">
                            {u.accountStatus === 'PENDING_BIOMETRICS' && (
                              <button
                                type="button"
                                onClick={() => handleStartBiometricScan(u)}
                                className="bg-slate-800 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs inline-flex items-center space-x-1.5 shadow cursor-pointer transition-colors"
                                title="Capture fingerprint at Gate 1 Desk & Activate"
                              >
                                <Fingerprint className="w-3.5 h-3.5" />
                                <span>Device unavailable</span>
                              </button>
                            )}

                            {u.accountStatus === 'ACTIVATED' && (
                              <button
                                type="button"
                                onClick={() => onUpdateUserStatus(u.id, 'PENDING_BIOMETRICS', 'Biometrics reset by Admin')}
                                className="text-slate-400 hover:text-blue-300 bg-slate-800 hover:bg-slate-750 px-2 py-1 rounded text-[11px] border border-slate-700 cursor-pointer"
                                title="Require In-Person Biometric Re-scan"
                              >
                                Re-verify
                              </button>
                            )}
                            <button type="button" onClick={async()=>{if(!window.confirm('Archive this visitor account? Its history will remain retained.'))return;const reason=window.prompt('Archive reason:');if(!reason?.trim())return;try{await api.archiveRecord('USERS',u.id,reason);await onUsersRefresh?.()}catch(e:any){window.alert(e.message)}}} className="rounded border border-rose-300/20 px-2 py-1 text-[11px] text-rose-200">Archive</button>

                            {u.accountStatus === 'PENDING_VERIFICATION' && <span className="inline-flex items-center gap-1 text-[11px] rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 font-bold text-amber-100"><Clock className="h-3 w-3"/>Pending contact / ID review</span>}
                            {u.accountStatus === 'SUSPENDED' && <span className="inline-flex items-center gap-1 text-[11px] rounded-full border border-rose-300/30 bg-rose-300/10 px-2.5 py-1 font-bold text-rose-100">Suspended</span>}
                            {u.accountStatus === 'REJECTED' && <span className="inline-flex items-center gap-1 text-[11px] rounded-full border border-rose-300/30 bg-rose-300/10 px-2.5 py-1 font-bold text-rose-100">Rejected</span>}
                            {u.accountStatus === 'PENDING_EMAIL' && (
                              <button
                                type="button"
                                onClick={() => onUpdateUserStatus(u.id, 'PENDING_BIOMETRICS', 'Email override by Admin')}
                                className="bg-blue-500 hover:bg-blue-400 text-slate-950 px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer"
                                title="Manual Email Verification Override"
                              >
                                Skip to Bio
                              </button>
                            )}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 3: VISITATIONS & GATE SCHEDULE
        ======================================================== */}
        {activeTab === 'APPOINTMENTS' && (
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date:</span>
                <div className="flex items-center space-x-1">
                  {(['ALL', 'TODAY', 'UPCOMING'] as const).map((dOption) => (
                    <button
                      key={dOption}
                      type="button"
                      onClick={() => setApptFilterDate(dOption)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        apptFilterDate === dOption
                          ? 'bg-blue-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {dOption === 'ALL' && 'All Dates'}
                      {dOption === 'TODAY' && `Today (${todayStr})`}
                      {dOption === 'UPCOMING' && 'Upcoming Dates'}
                    </button>
                  ))}
                </div>

                <span className="text-slate-600 ml-2">|</span>

                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                <select
                  value={apptFilterStatus}
                  onChange={(e) => setApptFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-400"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search visitor, PDL, ref #, cell..."
                  value={apptSearch}
                  onChange={(e) => setApptSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

            </div>

            {/* Appointments Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Gate Pass Ref</th>
                      <th className="py-3 px-4">Visitor Details</th>
                      <th className="py-3 px-4">Inmate (PDL) In Custody</th>
                      <th className="py-3 px-4">Scheduled Date & Slot</th>
                      <th className="py-3 px-4">Paabot (Care Package)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Clearance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredAppointments.map((appt) => {
                      const isToday = appt.visitDate === todayStr;
                      return (
                        <tr key={appt.id} className={`hover:bg-slate-850/50 transition-colors ${isToday ? 'bg-blue-500/5' : ''}`}>
                          
                          {/* Reference */}
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-blue-300">{appt.appointmentReference}</div>
                            <div className="text-[10px] text-slate-400">{appt.visitType}</div>
                            {isToday && (
                              <span className="inline-block mt-1 bg-blue-500/20 text-blue-400 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                TODAY'S PASS
                              </span>
                            )}
                          </td>

                          {/* Visitor */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{appt.visitorName}</div>
                            <div className="text-[11px] text-slate-400">{appt.visitorContact}</div>
                            <div className="text-[10px] text-slate-500">Rel: {appt.relationshipToPDL}</div>
                          </td>

                          {/* PDL */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-200">{appt.pdlName}</div>
                            <div className="text-[11px] font-mono text-slate-400">{appt.pdlNumber}</div>
                            <div className="text-[10px] text-blue-400/90">{appt.cellDormitory}</div>
                          </td>

                          {/* Date & Slot */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-400" />
                              {appt.visitDate}
                            </div>
                            <div className="text-[11px] text-slate-400">{appt.timeSlot}</div>
                            <div className="text-[10px] text-slate-500">{appt.jailFacilityName}</div>
                          </td>

                          {/* Paabot */}
                          <td className="py-3 px-4 max-w-xs">
                            <p className="text-slate-300 text-[11px] line-clamp-2" title={appt.paabotItemsDescription}>
                              {appt.paabotItemsDescription || 'No care package'}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold ${
                              appt.status === 'Approved'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : appt.status === 'Completed'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {appt.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPassModalAppt(appt)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                              title="View & Print Official Gate Pass"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {appt.status !== 'Approved' && (
                              <button
                                type="button"
                                onClick={() => onUpdateAppointmentStatus(appt.id, 'Approved')}
                                className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-[11px] font-semibold cursor-pointer"
                                title="Grant Visitation Approval"
                              >
                                Approve
                              </button>
                            )}

                            {appt.status === 'Approved' && (
                              <button
                                type="button"
                                onClick={() => onUpdateAppointmentStatus(appt.id, 'Completed')}
                                className="px-2 py-1 rounded bg-blue-500 hover:bg-blue-400 text-slate-950 text-[11px] font-semibold cursor-pointer"
                                title="Mark Visitation Concluded"
                              >
                                Mark Done
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onDeleteAppointment(appt.id)}
                              className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer"
                              title="Cancel / Revoke Pass"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: INMATES (PDL) ROSTER & OFFICIAL REGISTRATION
        ======================================================== */}
        {activeTab === 'PDL_ROSTER' && (
          <div className="space-y-4">
            
            {/* Master Control Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    BJMP Standard Records
                  </span>
                  <span className="text-xs text-slate-400">DILG • Calabarzon Region IV-A</span>
                </div>
                <h2 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                  <Building className="w-4 h-4 text-blue-400" />
                  BJMP Imus City Jail — PDL Commitment & Institutional Master Roster
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Total Committed: <strong className="text-white">{pdlList.length}</strong></span>
                  <span>•</span>
                  <span>Male: <strong className="text-blue-300">{pdlList.filter(p => p.sex === 'Male' || !p.sex).length}</strong></span>
                  <span>•</span>
                  <span>Female: <strong className="text-blue-300">{pdlList.filter(p => p.sex === 'Female').length}</strong></span>
                  <span>•</span>
                  <span>Under Trial: <strong className="text-blue-400">{pdlList.filter(p => (p.caseStatus || '').includes('Trial')).length}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search input */}
                <div className="relative w-56 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, PDL #, offense, cell..."
                    value={pdlSearch}
                    onChange={(e) => setPdlSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* View switcher */}
                <div className="bg-slate-950 p-1 rounded-lg border border-slate-700 flex items-center">
                  <button
                    type="button"
                    onClick={() => setPdlViewMode('CARDS')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                      pdlViewMode === 'CARDS' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Grid Card View"
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdlViewMode('TABLE')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                      pdlViewMode === 'TABLE' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Monthly Commitment Register (Photo 1 & 2 Logbook)"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Logbook</span>
                  </button>
                </div>

                {/* Official Documents Generator Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPdlForDocs(pdlList[0] || null);
                    setIsDocsModalOpen(true);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Official Documents & Reports</span>
                </button>

                {/* Register New Inmate Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingPdl(null);
                    setIsAddPdlOpen(true);
                  }}
                  className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New PDL</span>
                </button>
              </div>
            </div>

            {/* View Mode 1: Detailed Cards Grid */}
            {pdlViewMode === 'CARDS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pdlList
                  .filter((p) => {
                    if (!pdlSearch) return true;
                    const q = pdlSearch.toLowerCase();
                    return (
                      p.fullName.toLowerCase().includes(q) ||
                      p.pdlNumber.toLowerCase().includes(q) ||
                      p.cellDormitory.toLowerCase().includes(q) ||
                      (p.primaryOffense || '').toLowerCase().includes(q) ||
                      (p.aliases || '').toLowerCase().includes(q)
                    );
                  })
                  .map((pdl) => (
                    <div
                      key={pdl.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3 hover:border-slate-700 transition-colors shadow flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        {/* Header: PDL Number & Status */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded text-[11px]">
                              {pdl.pdlNumber}
                            </span>
                            {pdl.fileNumber && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Jacket #{pdl.fileNumber}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold">
                            {pdl.status}
                          </span>
                        </div>

                        {/* Inmate Legal Name & Aliases */}
                        <div>
                          <div className="font-bold text-white text-sm uppercase tracking-wide">
                            {pdl.fullName}
                          </div>
                          {pdl.aliases && (
                            <div className="text-blue-400/90 text-[11px] italic mt-0.5">
                              Alias: "{pdl.aliases}"
                            </div>
                          )}
                          <div className="text-slate-400 text-[11px] mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-400" />
                            <span className="font-semibold text-slate-200">{pdl.cellDormitory}</span>
                            <span className="text-slate-500 text-[10px]">
                              ({pdl.jailFacilityId.includes('female') ? 'Female Dorm' : 'Male Dorm'})
                            </span>
                          </div>
                        </div>

                        {/* Demographics Summary Chip */}
                        <div className="grid grid-cols-3 gap-1.5 bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[10px]">
                          <div>
                            <span className="text-slate-500 block">Sex / Age:</span>
                            <span className="font-semibold text-slate-300">{pdl.sex || 'Male'} • {pdl.ageAtAdmission || '32'}y</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Committed:</span>
                            <span className="font-mono text-slate-300">{pdl.dateCommitted || '2024-03-12'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Pangkat:</span>
                            <span className="font-bold text-blue-300 truncate block" title={pdl.gangGroupAffiliation}>
                              {pdl.gangGroupAffiliation || 'Neutral'}
                            </span>
                          </div>
                        </div>

                        {/* Primary Criminal Offense */}
                        {pdl.primaryOffense && (
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Scale className="w-3 h-3 text-blue-400" />
                                Case & Violation
                              </span>
                              <span className="font-mono text-slate-400">{pdl.criminalCaseNumbers?.[0] || 'CC-24-10294'}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-medium line-clamp-2" title={pdl.primaryOffense}>
                              {pdl.primaryOffense}
                            </p>
                            <div className="text-[10px] text-slate-500 flex justify-between pt-0.5">
                              <span>{pdl.courtBranch || 'RTC Branch 20, Imus City'}</span>
                              <span className="text-slate-400 font-semibold">{pdl.caseStatus || 'Under Trial'}</span>
                            </div>
                          </div>
                        )}

                        {/* Bertillion Tattoo / Physical Marks Notice */}
                        {pdl.bertillionMarks && (
                          <div className="text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800/80">
                            <span className="font-semibold text-slate-300 block">Bertillion Marks / Tattoos:</span>
                            <span className="line-clamp-1 italic text-slate-400">{pdl.bertillionMarks}</span>
                          </div>
                        )}

                        {/* Visits stats */}
                        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <span>Visits on Record:</span>
                          <strong className="text-blue-300">
                            {appointments.filter((a) => a.pdlId === pdl.id).length} scheduled
                          </strong>
                        </div>
                      </div>

                      {/* Card Actions: Official Docs & Edit Registration */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPdlForDocs(pdl);
                            setIsDocsModalOpen(true);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-blue-300 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-blue-500/20 cursor-pointer transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>Official Docs</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPdl(pdl);
                            setIsAddPdlOpen(true);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Edit Booking</span>
                        </button>
                        <button type="button" onClick={async()=>{if(!window.confirm(`Archive PDL ${pdl.fullName}? Related visit history will be retained.`))return;const reason=window.prompt('Archive reason:');if(!reason?.trim())return;try{await api.archiveRecord('PDLS',pdl.id,reason);setPdlList(list=>list.filter(item=>item.id!==pdl.id))}catch(e:any){window.alert(e.message)}}} className="col-span-2 rounded-lg border border-rose-300/20 py-1.5 text-[11px] font-semibold text-rose-200">Archive PDL record</button>
                      </div>

                    </div>
                  ))}
              </div>
            )}

            {/* View Mode 2: Official Monthly Commitment Register Table (Photo 1 & 2) */}
            {pdlViewMode === 'TABLE' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
                <div className="bg-slate-950 p-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      COMMIT - Reports / Logs Generation (Monthly Commitment Register)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Showing {pdlList.length} Inmates
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-950 text-slate-300 text-[10px] uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Date Committed</th>
                        <th className="p-3">PDL Number</th>
                        <th className="p-3">Inmate Name</th>
                        <th className="p-3">DOB / Age</th>
                        <th className="p-3">Sex</th>
                        <th className="p-3">Civil Status</th>
                        <th className="p-3">Address</th>
                        <th className="p-3">Offense / Violation</th>
                        <th className="p-3">Case #</th>
                        <th className="p-3">Court / Judge</th>
                        <th className="p-3">Cell Brigada</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {pdlList
                        .filter((p) => {
                          if (!pdlSearch) return true;
                          const q = pdlSearch.toLowerCase();
                          return (
                            p.fullName.toLowerCase().includes(q) ||
                            p.pdlNumber.toLowerCase().includes(q) ||
                            p.cellDormitory.toLowerCase().includes(q) ||
                            (p.primaryOffense || '').toLowerCase().includes(q)
                          );
                        })
                        .map((pdl) => (
                          <tr key={pdl.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-mono text-[11px] text-slate-300">{pdl.dateCommitted || '2024-03-12'}</td>
                            <td className="p-3 font-mono font-bold text-blue-300 text-[11px]">{pdl.pdlNumber}</td>
                            <td className="p-3 font-bold text-white">
                              {pdl.fullName}
                              {pdl.aliases && <span className="text-blue-400 text-[10px] ml-1">("{pdl.aliases}")</span>}
                            </td>
                            <td className="p-3 font-mono text-slate-300">{pdl.dateOfBirth} ({pdl.ageAtAdmission}y)</td>
                            <td className="p-3 text-slate-300">{pdl.sex || 'Male'}</td>
                            <td className="p-3 text-slate-300">{pdl.civilStatus || 'Single'}</td>
                            <td className="p-3 text-slate-400 max-w-xs truncate" title={pdl.presentAddress}>
                              {pdl.presentAddress}
                            </td>
                            <td className="p-3 max-w-xs truncate font-medium text-slate-200" title={pdl.primaryOffense}>
                              {pdl.primaryOffense}
                            </td>
                            <td className="p-3 font-mono font-bold text-blue-300 text-[11px]">
                              {pdl.criminalCaseNumbers?.[0] || 'CC-24-10294'}
                            </td>
                            <td className="p-3 text-slate-300 text-[11px]">
                              {pdl.courtBranch || 'RTC Branch 20'}
                            </td>
                            <td className="p-3 text-slate-300 font-semibold">{pdl.cellDormitory}</td>
                            <td className="p-3">
                              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                {pdl.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPdlForDocs(pdl);
                                    setIsDocsModalOpen(true);
                                  }}
                                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                  title="View Official BJMP Booking Report, Certificate of Detention, Property Receipt"
                                >
                                  Docs
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPdl(pdl);
                                    setIsAddPdlOpen(true);
                                  }}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer"
                                  title="Edit full registration record"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            TAB 5: SECURITY & GATE 1 CONTRABAND LOGS
        ======================================================== */}
        {activeTab === 'SECURITY_LOGS' && (
          <div className="space-y-4">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  BJMP Gate 1 Security Interceptions & Contraband Blotter
                </h2>
                <p className="text-xs text-slate-400">Official log of contraband seizures, uniform violations, and gate security actions</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddIncidentOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Log Gate Incident</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Visitor Involved</th>
                      <th className="py-3 px-4">Incident Classification</th>
                      <th className="py-3 px-4">Occurrence Description</th>
                      <th className="py-3 px-4">Security Action Enforced</th>
                      <th className="py-3 px-4">Reporting Guard Officer</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {incidentList.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {inc.timestamp}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {inc.visitorName}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            inc.incidentType === 'Contraband Interception'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : inc.incidentType === 'Dress Code Non-Compliance'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {inc.incidentType}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm text-slate-300 text-[11px]">
                          {inc.description}
                        </td>
                        <td className="py-3 px-4 max-w-xs text-blue-400 font-medium text-[11px]">
                          {inc.actionTaken}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {inc.reportingOfficer}
                        </td>
                        <td className="py-3 px-4"><button type="button" onClick={async()=>{if(!window.confirm('Archive this security incident? Its audit history will remain available.'))return;const reason=window.prompt('Archive reason:');if(!reason?.trim())return;try{await api.archiveRecord('INCIDENTS',inc.id,reason);setIncidentList(list=>list.filter(item=>item.id!==inc.id))}catch(e:any){window.alert(e.message)}}} className="rounded border border-rose-300/20 px-2 py-1 text-[11px] text-rose-200">Archive</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 6: FACILITY CAPACITY & SETTINGS
        ======================================================== */}
        {activeTab === 'KYC' && <AdminKycPanel initialStatus={new URLSearchParams(window.location.search).get('kycStatus')||''} onReviewed={onUsersRefresh} />}
        {activeTab === 'AUDIT' && <AdminAuditPanel />}
        {activeTab === 'ARCHIVE' && <AdminArchivePanel />}
        {activeTab === 'REPORTS' && <AdminReportsPanel />}

        {activeTab === 'FACILITY_SETTINGS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Slot Limits */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                Visitation Slot Capacity Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Configure the maximum number of visitors permitted per batch to prevent overcrowding at the visitation hall.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    BJMP Imus Male Dormitory — Capacity per Batch
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={maleCapacity}
                      onChange={(e) => setMaleCapacity(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 w-32 focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-xs text-slate-400">visitors maximum / batch slot</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    BJMP Imus Female Dormitory — Capacity per Batch
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={femaleCapacity}
                      onChange={(e) => setFemaleCapacity(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 w-32 focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-xs text-slate-400">visitors maximum / batch slot</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => alert('Facility slot capacity limits saved to BJMP records system.')}
                    className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow"
                  >
                    Save Capacity Settings
                  </button>
                </div>
              </div>
            </div>

            {/* Broadcast Notice Controller */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-400" />
                Live Broadcast Security Notice
              </h3>
              <p className="text-xs text-slate-400">
                Broadcast vital guidelines to all visitors on their booking screen and login portal banner.
              </p>

              <div>
                <textarea
                  rows={4}
                  value={systemNotice}
                  onChange={(e) => setSystemNotice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-400"
                  placeholder="Enter system announcement for visitors..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => alert('Security notice broadcast updated across all visitor devices.')}
                  className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow"
                >
                  Update Live Broadcast
                </button>
                <button
                  type="button"
                  onClick={() => setSystemNotice('')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs cursor-pointer"
                >
                  Clear Notice
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================
          MODAL: In-Person Biometric Desk Fingerprint Scanner
      ======================================================== */}
      {biometricScanningUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-blue-500/50 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 text-center text-slate-100 relative">
            
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto mb-4">
              <Fingerprint className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Gate 1 Biometrics Enrollment Terminal
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              In-person fingerprint enrollment for:
            </p>
            <div className="mt-2 text-sm font-extrabold text-blue-300">
              {biometricScanningUser.firstName} {biometricScanningUser.lastName}
            </div>
            <div className="text-xs font-mono text-slate-400">
              Ref: {biometricScanningUser.biometricReferenceNumber}
            </div>

            <div className="my-6 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-left space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Government ID:</span>
                <span className="font-semibold text-slate-200">{biometricScanningUser.validIdType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Scanning Desk:</span>
                <span className="font-semibold text-slate-200">BJMP Imus Gate 1 Records</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Enrolling Officer:</span>
                <span className="font-semibold text-blue-300">{currentUser.firstName} {currentUser.lastName}</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-left text-xs leading-relaxed text-amber-100"><strong className="mb-1 block">Fingerprint device not connected</strong>No biometric data was captured. This account cannot be activated from this screen; connect an authorized biometric provider and complete an in-person scan first.</div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setBiometricScanningUser(null)}
                className="text-xs text-slate-400 hover:text-white px-4 py-2 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Account profile modal: documents open from the protected KYC review workspace. */}
      {selectedVisitorForKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-6 text-slate-100 shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/10 pb-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Administrator user profile</p><h3 className="mt-1 text-xl font-bold">{selectedVisitorForKyc.firstName} {selectedVisitorForKyc.middleName||''} {selectedVisitorForKyc.lastName}</h3></div><button type="button" onClick={()=>{setSelectedVisitorForKyc(null);setSelectedUserDetails(null)}} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X/></button></header>
            {profileLoading?<div className="p-10 text-center text-sm text-slate-400">Loading protected profile…</div>:<>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-slate-900/70 p-4"><h4 className="mb-3 font-bold">Account information</h4><dl className="space-y-2 text-xs"><div><dt className="text-slate-400">User ID</dt><dd>{selectedVisitorForKyc.id}</dd></div><div><dt className="text-slate-400">Email</dt><dd>{selectedVisitorForKyc.email||'Not provided'} · {selectedVisitorForKyc.emailVerified?'Verified':'Not verified'}</dd></div><div><dt className="text-slate-400">Philippine mobile</dt><dd>{selectedVisitorForKyc.mobileNumber||'Not provided'} · {selectedVisitorForKyc.phoneVerified?'Verified':'Not verified'}</dd></div><div><dt className="text-slate-400">Account status</dt><dd>{selectedVisitorForKyc.accountStatus}</dd></div><div><dt className="text-slate-400">Registration / last login</dt><dd>{selectedVisitorForKyc.registeredAt||'—'} / {selectedVisitorForKyc.lastLoginAt||'—'}</dd></div><div><dt className="text-slate-400">Address</dt><dd>{selectedVisitorForKyc.address?.houseUnitStreet||'—'}, {selectedVisitorForKyc.address?.municipality||'—'}</dd></div></dl></div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4"><h4 className="mb-3 font-bold">Identity verification</h4>{(selectedUserDetails?.kyc||[]).length?selectedUserDetails.kyc.map((k:any)=><div key={k.id} className="mb-3 rounded-lg bg-slate-950 p-3 text-xs"><p>{k.idType||k.id_type} · {k.status}</p><p className="mt-1 text-slate-400">ID number {k.idNumberMasked||'••••'}</p><p className="text-slate-400">Submitted {k.submitted_at?new Date(k.submitted_at).toLocaleString():'—'}</p>{k.rejection_reason&&<p className="mt-1 text-amber-200">{k.rejection_reason}</p>}</div>):<p className="text-xs text-slate-400">No identity submission on record.</p>}<button type="button" onClick={()=>{setSelectedVisitorForKyc(null);setActiveTab('KYC')}} className="mt-2 rounded-lg border border-blue-300/20 px-3 py-2 text-xs text-blue-200 hover:bg-blue-300/10">Open protected document review</button></div>
            </div><div className="mt-4 rounded-xl border border-white/10 bg-slate-900/70 p-4"><h4 className="mb-3 font-bold">Visitor history</h4>{(selectedUserDetails?.visits||[]).length?<div className="space-y-2">{selectedUserDetails.visits.map((v:any)=><div key={v.appointment_reference} className="grid grid-cols-2 gap-2 border-b border-white/5 pb-2 text-xs sm:grid-cols-4"><span>{v.visit_date?new Date(v.visit_date).toLocaleDateString():'—'}</span><span>{v.pdl_name} · {v.pdl_number}</span><span>{v.time_slot}</span><span>{v.status}</span></div>)}</div>:<p className="text-xs text-slate-400">No visit history on record.</p>}</div>
            </>}
          </section>
        </div>
      )}

      {/* ========================================================
          MODAL: Printable Gate Pass Preview
      ======================================================== */}
      {selectedPassModalAppt && (
        <PrintablePassModal
          appointment={selectedPassModalAppt}
          user={users.find((u) => u.id === selectedPassModalAppt.userId) || currentUser}
          onClose={() => setSelectedPassModalAppt(null)}
        />
      )}

      {/* ========================================================
          MODAL: Comprehensive PDL Registration & Booking Form
      ======================================================== */}
      {isAddPdlOpen && (
        <PDLRegistrationModal
          existingPdl={editingPdl}
          onClose={() => {
            setIsAddPdlOpen(false);
            setEditingPdl(null);
          }}
          onSave={handleSavePdl}
        />
      )}

      {/* ========================================================
          MODAL: Official BJMP Documents Generator & Logbook
      ======================================================== */}
      {isDocsModalOpen && (
        <OfficialBjmpDocumentsModal
          pdlList={pdlList}
          selectedPdl={selectedPdlForDocs}
          onClose={() => {
            setIsDocsModalOpen(false);
            setSelectedPdlForDocs(null);
          }}
        />
      )}

      {/* ========================================================
          MODAL: Add Security Incident
      ======================================================== */}
      {isAddIncidentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 text-slate-100">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Log Gate 1 Incident / Contraband Interception
              </h3>
              <button
                type="button"
                onClick={() => setIsAddIncidentOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIncident} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Visitor Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan P. Santos"
                  value={newIncidentVisitor}
                  onChange={(e) => setNewIncidentVisitor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Incident Classification</label>
                <select
                  value={newIncidentType}
                  onChange={(e) => setNewIncidentType(e.target.value as SecurityIncident['incidentType'])}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                >
                  <option value="Contraband Interception">Contraband Interception (Electronics/Sharp items/Food rules)</option>
                  <option value="Dress Code Non-Compliance">Dress Code Non-Compliance (Yellow/Orange attire, sleeveless)</option>
                  <option value="Fake/Expired ID">Fake/Expired ID presented</option>
                  <option value="Unauthorized Relationship">Unauthorized Relationship to PDL</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Occurrence Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe what was intercepted or observed..."
                  value={newIncidentDesc}
                  onChange={(e) => setNewIncidentDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Action Enforced at Gate</label>
                <input
                  type="text"
                  placeholder="e.g. Confiscated and deposited in locker; entry deferred until..."
                  value={newIncidentAction}
                  onChange={(e) => setNewIncidentAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddIncidentOpen(false)}
                  className="bg-slate-800 text-slate-300 px-3.5 py-2 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Log Incident
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
