import {AdminStaffPanel} from '../Admin/AdminStaffPanel';
import {AdminVisitationPanel} from '../Admin/AdminVisitationPanel';
import {AdminVisitorRecordsPanel} from '../Admin/AdminVisitorRecordsPanel';
import {AdminVisitorRestrictionsPanel} from '../Admin/AdminVisitorRestrictionsPanel';
import {AdminVisitorReportsPanel} from '../Admin/AdminVisitorReportsPanel';
import {AdminProfileChangeRequestsPanel} from '../Admin/AdminProfileChangeRequestsPanel';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield, Users, Calendar, Clock, CheckCircle2, AlertTriangle, AlertCircle, Archive,
  Search, Filter, Eye, Plus, Trash2,
  Building, RefreshCw, Check, X, ArrowUpDown, ExternalLink,
  ShieldAlert, UserPlus, Sliders, Sparkles, MapPin,
  FileText, Edit3, Scale, Package, CheckSquare, ListFilter, Table, FileCheck2
} from 'lucide-react';
import { UserProfile, PDL } from '../../types';
import { BJMP_JAIL_FACILITIES } from '../../data/bjmpData';
import { PDLRegistrationModal } from '../Admin/PDLRegistrationModal';
import { OfficialBjmpDocumentsModal } from '../Admin/OfficialBjmpDocumentsModal';
import { AdminAuditPanel } from '../Admin/AdminAuditPanel';
import { AdminArchivePanel } from '../Admin/AdminArchivePanel';
import { alertAction, confirmAction, promptAction } from '../../utils/appDialogs';
import { AdminReportsPanel } from '../Admin/AdminReportsPanel';
import { api } from '../../services/api';
import {realtimeWS} from '../../services/websocket';
import {todayInManila} from '../Common/IdentityFields';

const incidentHistoryDetails = (value: unknown): Record<string, any> => {
  if (value && typeof value === 'object') return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const incidentHistorySummary = (entry: any) => {
  const details = incidentHistoryDetails(entry.details);
  const summary: { label: string; value: string }[] = [];
  if (typeof details.reason === 'string' && details.reason.trim()) summary.push({ label: 'Reason', value: details.reason });
  const before = details.before && typeof details.before === 'object' ? details.before : null;
  const after = details.after && typeof details.after === 'object' ? details.after : null;
  if (before && after) {
    const names: Record<string, string> = { visitor_name: 'Visitor name', facility: 'Facility', incident_type: 'Incident type', description: 'Description', action_taken: 'Action taken', reporting_officer: 'Reporting officer', timestamp: 'Incident date and time' };
    const changed = Object.keys(names).filter(key => String(before[key] ?? '') !== String(after[key] ?? '')).map(key => names[key]);
    if (changed.length) summary.push({ label: 'Updated information', value: changed.join(', ') });
  }
  return summary;
};

interface AdminDashboardProps {
  currentUser: UserProfile;
  pdls: PDL[];
  onSavePdl: (pdl: PDL) => Promise<PDL>;
  onRecordsRefresh?:()=>Promise<void>;
  isSidebarOpen: boolean;
  homeRequest: number;
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
  pdls,
  onSavePdl,
  onRecordsRefresh,
  isSidebarOpen,
  homeRequest,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'VISITOR_RECORDS' | 'RESTRICTIONS' | 'PROFILE_APPROVALS' | 'PDL_ROSTER' | 'SECURITY_LOGS' | 'AUDIT' | 'ARCHIVE' | 'REPORTS' | 'STAFF' | 'VISITATION' | 'FACILITY_SETTINGS'>('OVERVIEW');

  useEffect(() => { setActiveTab('OVERVIEW'); }, [homeRequest]);


  // PDL State
  const [pdlList, setPdlList] = useState<PDL[]>(pdls);
  const [pdlSearch, setPdlSearch] = useState('');
  const [isAddPdlOpen, setIsAddPdlOpen] = useState(false);
  const [editingPdl, setEditingPdl] = useState<PDL | null>(null);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [selectedPdlForDocs, setSelectedPdlForDocs] = useState<PDL | null>(null);
  const [pdlViewMode, setPdlViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [newPdlName, setNewPdlName] = useState('');
  const [newPdlFacility, setNewPdlFacility] = useState('imus-city-jail-male');
  const [newPdlCell, setNewPdlCell] = useState('Brigada 2 - Male Cell C');

  useEffect(() => { setPdlList(pdls); }, [pdls]);
  useEffect(() => { api.getIncidents().then(rows=>setIncidentList(rows.map((r:any)=>({id:r.id,timestamp:r.timestamp,visitorName:r.visitor_name,facility:r.facility,incidentType:r.incident_type,description:r.description,actionTaken:r.action_taken,reportingOfficer:r.reporting_officer})))).catch(()=>setIncidentList([])); }, []);

  // Security Incident Logs State
  const [incidentList, setIncidentList] = useState<SecurityIncident[]>([]);
  const [pendingProfileRequestCount, setPendingProfileRequestCount] = useState(0);
  const refreshPendingProfileRequestCount = useCallback(async () => {
    try {
      const result = await api.getWorkerProfileChangeRequestCount();
      setPendingProfileRequestCount(Number(result.count) || 0);
    } catch { /* Keep the last known alert count if the API is temporarily unavailable. */ }
  }, []);
  useEffect(() => {
    void refreshPendingProfileRequestCount();
    return realtimeWS.on('PROFILE_CHANGE_REQUESTS_UPDATED', () => { void refreshPendingProfileRequestCount(); });
  }, [refreshPendingProfileRequestCount]);
  const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
  const [editingIncident,setEditingIncident]=useState<SecurityIncident|null>(null),[incidentReason,setIncidentReason]=useState(''),[incidentBusy,setIncidentBusy]=useState(false),[incidentError,setIncidentError]=useState(''),[incidentHistory,setIncidentHistory]=useState<any[]|null>(null);
  const [newIncidentVisitor, setNewIncidentVisitor] = useState('');
  const [newIncidentType, setNewIncidentType] = useState<SecurityIncident['incidentType']>('Contraband Interception');
  const [newIncidentDesc, setNewIncidentDesc] = useState('');
  const [newIncidentAction, setNewIncidentAction] = useState('');

  // Facility notice state
  const [systemNotice, setSystemNotice] = useState('');
  const [settingsBusy,setSettingsBusy]=useState(false),[settingsMessage,setSettingsMessage]=useState(''),[settingsError,setSettingsError]=useState('');
  useEffect(()=>{void api.getSecurityNotice().then(notice=>setSystemNotice(notice.content)).catch(e=>setSettingsError(e.message));},[]);
  const publishNotice=async(content:string)=>{setSettingsBusy(true);setSettingsError('');setSettingsMessage('');try{await api.saveSecurityNotice(content);setSystemNotice(content);setSettingsMessage(content.trim()?'Notice published to the staff dashboard and entrance display.':'Notice archived and removed from the public banner.');}catch(e){setSettingsError(e.message)}finally{setSettingsBusy(false)}};
  // Today's Date calculation
  const todayStr = todayInManila();
  const [visitorSummary,setVisitorSummary]=useState<any>({});
  useEffect(()=>{void api.getVisitorReport(todayStr,todayStr).then(setVisitorSummary).catch(()=>setVisitorSummary({}))},[todayStr,activeTab]);

  // Metric aggregates
  const totalVisitors = Number(visitorSummary.registeredVisitors||0);
  const approvedPdlVisitors = Number(visitorSummary.approvedPdlVisitors||0);

  const inCustody=pdlList.filter(p=>p.status==='In Custody');
  const malePopulation=inCustody.filter(p=>p.sex==='Male').length;
  const femalePopulation=inCustody.filter(p=>p.sex==='Female').length;
  const malePercent=inCustody.length?Math.round(malePopulation/inCustody.length*100):0;
  const femalePercent=inCustody.length?Math.round(femalePopulation/inCustody.length*100):0;

  // Save PDL (from comprehensive registration form)
  const handleSavePdl = async (savedPdl: PDL) => {
    const persistedPdl = await onSavePdl(savedPdl);
    setPdlList((prev) => {
      const idx = prev.findIndex((p) => p.id === persistedPdl.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = persistedPdl;
        return updated;
      }
      return [persistedPdl, ...prev];
    });
    setIsAddPdlOpen(false);
    setEditingPdl(null);
    return persistedPdl;
  };

  // Quick Add PDL (fallback)
  const handleAddPdl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPdlName) return;
    const newPdl: PDL = {
      id: `pdl-${Date.now()}`,
      pdlNumber: '',
      fullName: newPdlName,
      jailFacilityId: newPdlFacility,
      cellDormitory: newPdlCell,
      status: 'In Custody',
      allowedVisitorRelationship: ['Spouse', 'Parent', 'Child', 'Sibling', 'Legal Counsel'],
    };
    void handleSavePdl(newPdl);
    setIsAddPdlOpen(false);
    setNewPdlName('');
  };

  // Add Incident
  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incidentBusy||!newIncidentVisitor||!newIncidentDesc) return;
    setIncidentBusy(true);setIncidentError('');
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
    try {const result=editingIncident?await api.updateIncident(editingIncident.id,{...item,facility:editingIncident.facility,reason:incidentReason}):await api.reportIncident(item);const r=result.incident;setIncidentList((prev) => [{id:r.id,timestamp:r.timestamp,visitorName:r.visitor_name,facility:r.facility,incidentType:r.incident_type,description:r.description,actionTaken:r.action_taken,reportingOfficer:r.reporting_officer}, ...prev.filter(x=>x.id!==r.id)]);} catch(e:any) {setIncidentError(e.message);return} finally{setIncidentBusy(false);}
    setIsAddIncidentOpen(false);
    setNewIncidentVisitor('');
    setNewIncidentDesc('');
    setNewIncidentAction('');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-transparent text-slate-100 pb-16">
      
      {/* Broadcast Alert Banner */}

      {/* Main Container */}
      <div className={`admin-dashboard-layout mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6 ${isSidebarOpen ? 'is-sidebar-open' : ''}`}>
        
        {/* Navigation Tabs Bar */}
        <div className="admin-dashboard-sidebar" aria-hidden={!isSidebarOpen} inert={!isSidebarOpen}>
        <nav id="admin-navigation" aria-label="Admin navigation" className="admin-dashboard-nav">
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
            onClick={() => setActiveTab('VISITOR_RECORDS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap lg:w-full lg:justify-start relative ${
              activeTab === 'VISITOR_RECORDS'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Visitor Records</span>
          </button>

          <button type="button" onClick={() => setActiveTab('RESTRICTIONS')} className={`rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold whitespace-nowrap ${activeTab==='RESTRICTIONS'?'restriction-nav-active':'text-slate-300'}`}>Visitor restrictions</button>
          <button type="button" onClick={() => setActiveTab('STAFF')} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold whitespace-nowrap">Worker accounts</button>
          <button type="button" onClick={() => setActiveTab('PROFILE_APPROVALS')} className={`rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold whitespace-nowrap ${activeTab==='PROFILE_APPROVALS'?'bg-blue-500 text-slate-950':'text-slate-300'}`}>
            <span>Profile change requests</span>
            {pendingProfileRequestCount > 0 && <span aria-label={`${pendingProfileRequestCount} pending worker requests`} aria-live="polite" title={`${pendingProfileRequestCount} pending worker request${pendingProfileRequestCount === 1 ? '' : 's'}`} className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{pendingProfileRequestCount > 99 ? '99+' : pendingProfileRequestCount}</span>}
          </button>

          <button type="button" onClick={() => setActiveTab('VISITATION')} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold whitespace-nowrap">Approved lists & Scheduling</button>



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
            <AlertTriangle className="w-4 h-4" />
            <span>Facility Notice</span>
          </button>
        </nav>
        </div>

        <div className="admin-dashboard-content">
        {/* ========================================================
            TAB 1: COMMAND OVERVIEW
        ======================================================== */}
        {activeTab === 'STAFF' && <AdminStaffPanel/>}
        {activeTab === 'PROFILE_APPROVALS' && <AdminProfileChangeRequestsPanel/>}

        {activeTab === 'VISITOR_RECORDS' && <AdminVisitorRecordsPanel pdls={pdlList}/>}
        {activeTab === 'RESTRICTIONS' && <AdminVisitorRestrictionsPanel pdls={pdlList}/>}
        {activeTab === 'VISITATION' && <AdminVisitationPanel pdls={pdls} onChanged={onRecordsRefresh}/> }
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            
            {/* Facility status and database-backed visitor summary */}
            <section className="admin-overview-grid" aria-label="Facility infographic overview">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Visitor records</p><h3 className="text-lg font-extrabold text-white mt-1">Registered and approved</h3></div>
                  <Users className="w-5 h-5 text-blue-300" />
                </div>
                <div className="grid grid-cols-2 gap-3"><div><strong className="block text-3xl text-white">{totalVisitors}</strong><span className="text-xs text-slate-400">Registered people</span></div><div><strong className="block text-3xl text-emerald-300">{approvedPdlVisitors}</strong><span className="text-xs text-slate-400">Approved PDL visitors</span></div></div>
                <button type="button" onClick={() => setActiveTab('VISITOR_RECORDS')} className="mt-4 text-xs font-bold text-blue-300">Open visitor records →</button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Today's visitor activity</p><h3 className="mt-1 text-lg font-extrabold text-white">Gate check-ins</h3></div><Calendar className="h-5 w-5 text-blue-300"/></div>
                <div className="grid grid-cols-2 gap-3"><div><strong className="block text-3xl text-white">{Number(visitorSummary.pdl?.total||0)+Number(visitorSummary.guest?.total||0)}</strong><span className="text-xs text-slate-400">Visitors today</span></div><div><strong className="block text-3xl text-emerald-300">{Number(visitorSummary.pdl?.on_site||0)+Number(visitorSummary.guest?.on_site||0)}</strong><span className="text-xs text-slate-400">Currently inside</span></div></div>
                <button type="button" onClick={() => setActiveTab('REPORTS')} className="mt-4 text-xs font-bold text-blue-300">View visitor reports →</button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Custody snapshot</p><h3 className="text-lg font-extrabold text-white mt-1">Dorm population</h3></div>
                  <Building className="w-5 h-5 text-blue-300" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full grid place-items-center shrink-0" style={{ background: inCustody.length?`conic-gradient(#526d91 0 ${malePercent}%, #bda26c ${malePercent}% 100%)`:'#d8dfe6' }} role="img" aria-label={`Population split: ${malePopulation} male, ${femalePopulation} female`}>
                    <div className="w-[58px] h-[58px] rounded-full bg-slate-900 grid place-items-center text-center"><span className="text-sm leading-tight font-black text-white">{inCustody.length}<small className="block text-[8px] text-slate-400 font-semibold">IN CUSTODY</small></span></div>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between text-xs"><span className="text-slate-300"><i className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2" />Male records</span><strong className="text-white">{malePopulation} <small className="text-slate-400">{malePercent}%</small></strong></div>
                    <div className="flex items-center justify-between text-xs"><span className="text-slate-300"><i className="inline-block w-2 h-2 rounded-full bg-amber-300 mr-2" />Female records</span><strong className="text-white">{femalePopulation} <small className="text-slate-400">{femalePercent}%</small></strong></div>
                    <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${malePercent}%` }} /></div>
                  </div>
                </div>
              </div>
            </section>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Administrative queues">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4"><span className="text-xs text-slate-400">Visitor check-ins today</span><strong className="block text-2xl">{Number(visitorSummary.pdl?.total||0)+Number(visitorSummary.guest?.total||0)}</strong><span className="text-xs text-slate-400">Currently on site: {Number(visitorSummary.pdl?.on_site||0)+Number(visitorSummary.guest?.on_site||0)}</span></div>
              <button type="button" onClick={() => setActiveTab('VISITOR_RECORDS')} className="rounded-xl border border-white/10 bg-slate-900/90 p-4 text-left hover:border-blue-300/40"><span className="text-[10px] uppercase tracking-widest text-slate-400">Visitor records</span><strong className="mt-1 block text-2xl text-white">{totalVisitors}</strong><span className="text-xs text-blue-300">Open visitor records →</span></button>
              <button type="button" onClick={() => setActiveTab('RESTRICTIONS')} className="rounded-xl border border-rose-300/15 bg-slate-900/90 p-4 text-left hover:border-rose-300/40"><span className="text-[10px] uppercase tracking-widest text-slate-400">Visitor restrictions</span><strong className="mt-1 block text-2xl text-rose-200">Review</strong><span className="text-xs text-rose-100">PDL-specific and facility-wide →</span></button>
            </section>

            {/* Quick Actions & Facility Status Bar */}
            <div className="grid grid-cols-1 gap-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white">Visitor restrictions</h3>
                <p className="mt-2 text-xs text-slate-400">Review PDL-specific and facility-wide restrictions. Each restriction is checked again by the backend during entry.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><strong className="block text-2xl text-rose-200">{visitorSummary.restrictions?.total ?? 0}</strong><span className="text-xs text-slate-400">Active restrictions</span></div><div><strong className="block text-2xl text-blue-200">{visitorSummary.approvedPdlVisitors ?? 0}</strong><span className="text-xs text-slate-400">Approved PDL visitors</span></div></div>
                <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setActiveTab('RESTRICTIONS')} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Manage restrictions</button><button type="button" onClick={() => setActiveTab('VISITOR_RECORDS')} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200">Visitor records</button></div>
              </div>            </div>

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
                <label className="block w-56 text-[10px] font-semibold text-slate-300 sm:w-64">Search PDL records by name, number, offense, or cell
                <div className="relative mt-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, PDL #, offense, cell..."
                    value={pdlSearch}
                    onChange={(e) => setPdlSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                  />
                </div>
                </label>

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

                        <p className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">Approved visitors and this PDL’s weekly visiting day are managed in Approved lists & Scheduling.</p>
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
                        <button type="button" onClick={async()=>{if(!await confirmAction(`Related visit history will be retained.`,{title:`Archive PDL ${pdl.fullName}?`,confirmLabel:'Continue',tone:'warning'}))return;const reason=await promptAction('Give a short reason for archiving this PDL record.',{title:'Archive PDL record',inputLabel:'Archive reason',placeholder:'Enter the reason',confirmLabel:'Archive PDL',tone:'danger'});if(reason===null)return;try{await api.archiveRecord('PDLS',pdl.id,reason);setPdlList(list=>list.filter(item=>item.id!==pdl.id))}catch(e:any){await alertAction(e instanceof Error?e.message:'Could not archive the PDL record.',{title:'Unable to archive PDL',tone:'danger'})}}} className="col-span-2 rounded-lg border border-rose-300/20 py-1.5 text-[11px] font-semibold text-rose-200">Archive PDL record</button>
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
                onClick={() => {setEditingIncident(null);setIncidentReason('');setIncidentError('');setNewIncidentVisitor('');setNewIncidentDesc('');setNewIncidentAction('');setIsAddIncidentOpen(true)}}
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
                        <td className="py-3 px-4"><button className="mb-2 mr-2 rounded border border-slate-600 px-2 py-1" onClick={()=>{setEditingIncident(inc);setNewIncidentVisitor(inc.visitorName);setNewIncidentType(inc.incidentType);setNewIncidentDesc(inc.description);setNewIncidentAction(inc.actionTaken);setIncidentReason('');setIncidentError('');setIsAddIncidentOpen(true)}}>Edit / follow up</button><button className="mb-2 mr-2 rounded border border-slate-600 px-2 py-1" onClick={async()=>{try{setIncidentHistory(await api.getIncidentHistory(inc.id))}catch(e){await alertAction(e instanceof Error?e.message:'Could not load incident history.',{title:'Unable to load history',tone:'danger'})}}}>History</button><button type="button" onClick={async()=>{if(!await confirmAction('The incident’s audit history will remain available.',{title:'Archive this security incident?',confirmLabel:'Continue',tone:'warning'}))return;const reason=await promptAction('Give a short reason for archiving this security incident.',{title:'Archive security incident',inputLabel:'Archive reason',placeholder:'Enter the reason',confirmLabel:'Archive incident',tone:'danger'});if(reason===null)return;try{await api.archiveRecord('INCIDENTS',inc.id,reason);setIncidentList(list=>list.filter(item=>item.id!==inc.id))}catch(e:any){await alertAction(e instanceof Error?e.message:'Could not archive the security incident.',{title:'Unable to archive incident',tone:'danger'})}}} className="rounded border border-rose-300/20 px-2 py-1 text-[11px] text-rose-200">Archive</button></td>
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
        {activeTab === 'AUDIT' && <AdminAuditPanel />}
        {activeTab === 'ARCHIVE' && <AdminArchivePanel onRestored={async()=>{await onRecordsRefresh?.();const rows=await api.getIncidents();setIncidentList(rows.map((r:any)=>({id:r.id,timestamp:r.timestamp,visitorName:r.visitor_name,facility:r.facility,incidentType:r.incident_type,description:r.description,actionTaken:r.action_taken,reportingOfficer:r.reporting_officer})))}}/>}
        {activeTab === 'REPORTS' && <><AdminReportsPanel/><AdminVisitorReportsPanel/></>}

        {activeTab === 'FACILITY_SETTINGS' && (
          <section className="max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-100">
            <h2 className="flex items-center gap-2 text-base font-bold"><AlertTriangle className="h-4 w-4 text-blue-400"/>Live facility notice</h2>
            <p className="mt-2 text-xs text-slate-400">Share current visiting guidance with staff and people arriving at the facility.</p>
            <textarea rows={4} value={systemNotice} onChange={(e) => setSystemNotice(e.target.value)} className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100" placeholder="Enter a notice, one message per line..."/>
            <p className="mt-2 text-xs text-slate-400">Put each message on a new line. Messages scroll in the announcement bar.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={settingsBusy} onClick={()=>void publishNotice(systemNotice)} className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Update live notice</button>
              <button type="button" disabled={settingsBusy} onClick={()=>void publishNotice('')} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-50">Clear notice</button>
            </div>
            {settingsError&&<p role="alert" className="mt-3 text-xs text-rose-300">{settingsError}</p>}{settingsMessage&&<p role="status" className="mt-3 text-xs text-slate-300">{settingsMessage}</p>}
          </section>
        )}

        </div>
      </div>

      {/* ========================================================
          MODAL: Printable Gate Pass Preview
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
      {incidentHistory&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"><section role="dialog" aria-modal="true" aria-label="Incident history" className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Incident history</h2><button className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800" onClick={()=>setIncidentHistory(null)}>Close</button></div>{incidentHistory.map(h=><div key={h.id} className="border-t border-slate-700 py-3 text-sm"><p className="font-medium">{String(h.action||'Incident updated').replace(/_/g,' ').toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase())}</p><p className="mt-1 text-xs text-slate-400">{new Date(h.created_at).toLocaleString()} · {h.officer||'Staff member'}</p>{incidentHistorySummary(h).length?<dl className="mt-3 space-y-2 rounded-lg bg-slate-800/70 p-3">{incidentHistorySummary(h).map(item=><div key={item.label}><dt className="text-xs text-slate-400">{item.label}</dt><dd className="break-words">{item.value}</dd></div>)}</dl>:<p className="mt-3 text-xs text-slate-400">No additional information was recorded.</p>}</div>)}</section></div>}
      {isAddIncidentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 text-slate-100">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                {editingIncident?'Edit incident / record follow-up':'Log Gate 1 Incident / Contraband Interception'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddIncidentOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIncident} className="space-y-3.5 text-xs">{incidentError&&<p role="alert" className="text-rose-300">{incidentError}</p>}{editingIncident&&<label className="block">Correction or follow-up reason<input required maxLength={1000} value={incidentReason} onChange={e=>setIncidentReason(e.target.value)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"/></label>}
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
                  disabled={incidentBusy}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  {editingIncident?'Save follow-up':'Log Incident'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
