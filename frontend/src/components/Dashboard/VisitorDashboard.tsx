import React, { useEffect, useState } from 'react';
import { 
  Calendar, Clock, Shield, User, Plus, FileText,
  MapPin, CheckCircle2, AlertTriangle, QrCode,
  AlertCircle, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, VisitationAppointment, VisitType, JailFacility
} from '../../types';
import { 
  BJMP_JAIL_FACILITIES,
  BJMP_RULES_AND_DRESS_CODE 
} from '../../data/bjmpData';
import { PrintablePassModal } from '../Common/PrintablePassModal';
import { PermanentVisitorIdCard } from '../Common/PermanentVisitorIdCard';
import {ProfileEditor} from '../Common/ProfileEditor';
import {CompanionFields,CompanionDetails} from '../Common/CompanionFields';
import {realtimeWS} from '../../services/websocket';
import {ageFromBirthdate,todayInManila} from '../Common/IdentityFields';
import {api} from '../../services/api';

interface VisitorDashboardProps {
  user: UserProfile;
  appointments: VisitationAppointment[];
  onAddAppointment: (newAppt: Partial<VisitationAppointment>) => Promise<VisitationAppointment>;
  onCancelAppointment: (apptId: string) => void;
  onOpenGuardScanner: (visitorId: string) => void;
  pdls: import('../../types').PDL[];
  homeRequest: number;
  onOpenDocuments?: () => void;
}

export const VisitorDashboard: React.FC<VisitorDashboardProps> = ({
  user,
  appointments,
  onAddAppointment,
  onCancelAppointment,
  onOpenGuardScanner,
  pdls,
  homeRequest,
  onOpenDocuments,
}) => {
  const [activeTab, setActiveTab] = useState<'ID_CARD' | 'BOOK' | 'APPOINTMENTS' | 'RULES' | 'PROFILE'>('ID_CARD');
  const [selectedPass, setSelectedPass] = useState<VisitationAppointment | null>(null);
  const [rescheduling,setRescheduling]=useState<VisitationAppointment|null>(null),[newDate,setNewDate]=useState(''),[dateError,setDateError]=useState(''),[dateBusy,setDateBusy]=useState(false);
  useEffect(() => { setActiveTab('ID_CARD'); setSelectedPass(null); }, [homeRequest]);

  // Booking Form State
  const [facilityId, setFacilityId] = useState(user.preferredJailFacilityId || BJMP_JAIL_FACILITIES[0].id);
  const [facilities,setFacilities]=useState<JailFacility[]>([]),[facilitiesError,setFacilitiesError]=useState('');
  useEffect(()=>{void api.getFacilities().then(rows=>{setFacilities(rows);setFacilityId(previous=>rows.some(f=>f.id===previous)?previous:rows[0]?.id||'');}).catch(e=>setFacilitiesError(e.message));},[]);
  const [linkedPdls,setLinkedPdls]=useState<any[]>([]),[linksError,setLinksError]=useState('');
  const loadLinks=()=>api.getLinkedPdls().then(rows=>{setLinkedPdls(rows);setLinksError('')}).catch(e=>setLinksError(e.message));
  useEffect(()=>{void loadLinks();return realtimeWS.on('VISITATION_UPDATED',()=>void loadLinks());},[]);
  const [selectedPdlId, setSelectedPdlId] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('Contact Visit');
  const [relationship, setRelationship] = useState('Spouse');
  const [companions,setCompanions]=useState<NonNullable<VisitationAppointment['companions']>>([]);
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const timeSlot='Visiting hours (08:00 AM - 04:00 PM)';
  const [paabotDescription, setPaabotDescription] = useState('');

  // Security dress code checks
  const [agreeNoOrangeYellow, setAgreeNoOrangeYellow] = useState(false);
  const [agreeValidIdOriginal, setAgreeValidIdOriginal] = useState(false);
  const [agreeNoElectronics, setAgreeNoElectronics] = useState(false);

  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingBusy,setBookingBusy]=useState(false);

  // Facility and PDL computation
  const activeFacility = facilities.find((f) => f.id === facilityId) || facilities[0] || BJMP_JAIL_FACILITIES[0];
  const facilityPdls = linkedPdls.filter((p) => p.jailFacilityId === facilityId && p.status === 'In Custody');

  const selectedConnection=linkedPdls.find(p=>p.id===selectedPdlId);
  const eligibleDates=Array.from({length:85},(_,i)=>{const d=new Date(todayInManila()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i+1);return d.toISOString().slice(0,10)}).filter(d=>selectedConnection?.weekday!==null&&selectedConnection?.weekday!==undefined&&new Date(d+'T00:00:00Z').getUTCDay()===Number(selectedConnection.weekday));
  useEffect(()=>{setRelationship(selectedConnection?.relationship||'Relative');setVisitDate(eligibleDates[0]||'');setCompanions([]);},[selectedPdlId,selectedConnection?.weekday]);
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(bookingBusy)return;
    setBookingError(null);
    if(companions.some(c=>(ageFromBirthdate(c.dateOfBirth)??0)<20)){setBookingError('Companions must be at least 20 years old.');return;}
    if (!agreeNoOrangeYellow || !agreeValidIdOriginal || !agreeNoElectronics) {
      setBookingError('Please confirm all BJMP Security & Dress Code Undertakings before submitting.');
      return;
    }
    const selectedPdl = facilityPdls.find((p) => p.id === selectedPdlId);
    if (!selectedPdl) {
      setBookingError('Select a current PDL record from the available facility list.');
      return;
    }
    if (!eligibleDates.includes(visitDate)) {
      setBookingError('Choose an eligible upcoming date on this PDL’s assigned day.');
      return;
    }
    setBookingBusy(true);
    try {
      const created = await onAddAppointment({
        pdlId: selectedPdl.id, visitType, relationshipToPDL: relationship,
        visitDate, timeSlot, paabotItemsDescription: paabotDescription,
        companions,
      } as Partial<VisitationAppointment>);
      setBookingSuccess(true);
      confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
      window.setTimeout(() => {
        setSelectedPass(created.status === 'Approved' ? created : null);
        setActiveTab('APPOINTMENTS');
        setBookingSuccess(false);
      }, 700);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not submit the appointment. Please try again.');
    } finally {setBookingBusy(false);}
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {facilitiesError&&<p role="alert" className="mb-4 text-sm text-rose-300">Facility information could not be loaded: {facilitiesError}</p>}
      
      {/* Activated Profile Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl mb-8 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Account Status: {user.accountStatus}
              </span>

            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Welcome, {user.firstName} {user.lastName}
            </h2>
            <p className="text-xs text-slate-400">
              Manage your selected visits and verification details.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Active Visits</span>
            <span className="text-xl font-bold text-blue-400 font-mono">
              {appointments.filter((a) => a.status === 'Approved').length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('BOOK')}
            className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-500/10 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Select Visit Date</span>
          </button>
        </div>
      </div>

      <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4"><h2 className="font-bold">Your approved PDL connections</h2>{linksError&&<p role="alert" className="mt-2 text-sm">{linksError} <button onClick={()=>void loadLinks()} className="underline">Retry</button></p>}{!linksError&&!linkedPdls.length&&<p className="mt-2 text-sm text-slate-400">No approved connection yet. Authorized personnel must link your account to the PDL’s approved list before you can select a visit date.</p>}<div className="mt-3 flex flex-wrap gap-3">{linkedPdls.map(p=><button key={p.id} onClick={()=>{setFacilityId(p.jailFacilityId);setSelectedPdlId(p.id);setActiveTab('BOOK')}} className="rounded-lg border border-slate-600 p-3 text-left text-sm"><strong>{p.fullName}</strong><span className="mt-1 block text-xs">{p.weekday===null?'Weekly day not assigned':['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][p.weekday]+' · 8:00 a.m.–4:00 p.m.'}</span></button>)}</div></section>
      {rescheduling&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={async e=>{e.preventDefault();setDateBusy(true);try{await api.changeSelectedDate(rescheduling.id,newDate);window.location.reload();}catch(e){setDateError(e.message);}finally{setDateBusy(false);}}} role="dialog" aria-modal="true" aria-label="Change selected visit date" className="w-full max-w-md space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="font-bold">Change selected visit date</h2><p className="text-sm">{rescheduling.pdlName} · 8:00 a.m.–4:00 p.m.</p><label className="block text-sm">New eligible date<select required value={newDate} onChange={e=>setNewDate(e.target.value)} className="mt-2 w-full rounded border border-slate-700 bg-slate-900 p-3"><option value="">Choose a date</option>{Array.from({length:85},(_,i)=>{const d=new Date(todayInManila()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i+1);return d.toISOString().slice(0,10);}).filter(d=>{const p=linkedPdls.find(p=>p.id===rescheduling.pdlId);return p&&p.weekday!==null&&new Date(d+'T00:00:00Z').getUTCDay()===Number(p.weekday);}).map(d=><option key={d}>{d}</option>)}</select></label>{dateError&&<p role="alert" className="text-sm text-rose-300">{dateError}</p>}<div className="flex gap-3"><button disabled={dateBusy} className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white">Save date</button><button type="button" disabled={dateBusy} onClick={()=>setRescheduling(null)} className="rounded border border-slate-600 px-4 py-2 text-sm">Cancel</button></div></form></div>}
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 mb-8 text-xs font-semibold [&>button]:shrink-0">
        <button
          onClick={() => setActiveTab('ID_CARD')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ID_CARD'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4 text-blue-400" />
          <span>Permanent ID & Dynamic QR</span>
        </button>

        <button
          onClick={() => setActiveTab('BOOK')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'BOOK'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Select an Eligible Visit Date</span>
        </button>

        <button
          onClick={() => setActiveTab('APPOINTMENTS')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'APPOINTMENTS'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Appointments & Gate Passes ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RULES')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'RULES'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>BJMP Visiting Guidelines & Dress Code</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'PROFILE'
              ? 'border-blue-400 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Visitor Profile & KYC Documents</span>
        </button>
      </div>

      {/* TAB 0: PERMANENT DIGITAL VISITOR ID & DYNAMIC QR */}
      {activeTab === 'ID_CARD' && (
        <PermanentVisitorIdCard
          user={user}
          appointments={appointments}
          onOpenGuardScanner={onOpenGuardScanner}
        />
      )}

      {/* TAB 1: BOOK VISITATION APPOINTMENT */}
      {activeTab === 'BOOK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Booking Form */}
          <div className="min-w-0 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-8 shadow-xl">
            <div className="mb-6">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-400">Step-by-Step Reservation</span>
              <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">Schedule a Jail Visit</h3>
              <p className="text-xs text-slate-400">
                Reserve your contact visit or E-Dalaw video slot with the Person Deprived of Liberty (PDL)
              </p>
            </div>

            {bookingError && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccess && (
              <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center space-x-3 text-xs text-blue-300">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <strong className="block font-bold">Visit date selected.</strong>
                  <span>Your date follows the assigned weekly schedule. Entry still requires your active account, approved PDL connection, fingerprint and permanent QR checks.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              
              {/* 1. Jail Facility */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Select Target BJMP Jail Facility <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    {!facilities.length&&<option value="">No configured facilities available</option>}
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.municipality})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Visitation availability: {activeFacility.visitingDays} {activeFacility.visitingHours}
                </span>
              </div>

              {/* 2. PDL Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  2. Person Deprived of Liberty (PDL) <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select required value={selectedPdlId} onChange={(e) => setSelectedPdlId(e.target.value)}
                    disabled={facilityPdls.length === 0}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400 disabled:opacity-60">
                    <option value="">{facilityPdls.length ? 'Choose a PDL' : 'No approved PDL connections for this facility'}</option>
                    {facilityPdls.map((pdl) => <option key={pdl.id} value={pdl.id}>{pdl.fullName} ({pdl.pdlNumber})</option>)}
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Only your approved PDL connections appear. Contact authorized personnel if your connection is missing.</p>
              </div>

              {/* 3. Visit Type & Relationship */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    3. Visitation Type <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as VisitType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Contact Visit">Contact Visit (Face-to-Face Visitation Hall)</option>
                    <option value="Non-Contact (Glass Barrier)">Non-Contact Visit (Glass Barrier / Intercom)</option>
                    <option value="E-Dalaw (Online Video Call)">E-Dalaw (Remote Secure Video Conference)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    4. Relationship to PDL <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={relationship}
                    disabled
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Spouse">Spouse (Legal Husband / Wife)</option>
                    <option value="Parent">Parent (Father / Mother)</option>
                    <option value="Child">Adult Child (Son / Daughter, 20+)</option>
                    <option value="Sibling">Sibling (Brother / Sister)</option>
                    <option value="Legal Counsel">Legal Counsel (Attorney / Public Attorney)</option>
                    <option value="Relative">Relative (Uncle, Aunt, Cousin)</option>
                    <option value="Common-Law Partner">Common-Law Partner (with Barangay Certification)</option>
                  </select>
                </div>
              </div>

              <CompanionFields value={companions} onChange={setCompanions}/><p className="text-xs text-slate-400">Every companion must be an activated adult on the same PDL’s approved list, with separate identity and entry review. Enter their registered full name and birthdate.</p>
              {/* 4. Date & Time Slot */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    5. Visit Date (Calendar) <span className="text-blue-400">*</span>
                  </label>
                  <select required value={visitDate} onChange={e=>setVisitDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm"><option value="">{eligibleDates.length?'Choose an eligible date':'Select a PDL with an assigned day'}</option>{eligibleDates.map(d=><option key={d} value={d}>{d} · {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][Number(selectedConnection?.weekday)]}</option>)}</select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    6. Permitted visiting hours <span className="text-blue-400">*</span>
                  </label>
                  <p className="rounded-lg border border-slate-700 p-3 text-sm">8:00 a.m.–4:00 p.m.</p>
                </div>
              </div>

              {/* 5. Food & Paabot Declaration */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  7. Declaration of Food / Care Items (Paabot)
                </label>
                <textarea
                  rows={2}
                  value={paabotDescription}
                  onChange={(e) => setPaabotDescription(e.target.value)}
                  placeholder="e.g. 2 clear plastic containers of cooked adobo and rice, 1 unopened bottled water"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                ></textarea>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Strictly transparent containers only. No pull-tab canned goods or opaque thermoses.
                </span>
              </div>

              {/* 6. Security Undertakings */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                <div className="font-bold text-blue-400 uppercase tracking-wider text-[11px] mb-1">
                  BJMP Visitor Security Undertakings:
                </div>
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeNoOrangeYellow}
                    onChange={(e) => setAgreeNoOrangeYellow(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-800 text-blue-500"
                  />
                  <span className="text-slate-300">
                    I strictly pledge <strong className="text-blue-300">NOT to wear yellow or orange shirts/clothes</strong>, shorts above the knee, sleeveless tops, or open-toed slippers.
                  </span>
                </label>
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeValidIdOriginal}
                    onChange={(e) => setAgreeValidIdOriginal(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-800 text-blue-500"
                  />
                  <span className="text-slate-300">
                    I will bring the original government-issued ID submitted for document review on the appointment date.
                  </span>
                </label>
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeNoElectronics}
                    onChange={(e) => setAgreeNoElectronics(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-800 text-blue-500"
                  />
                  <span className="text-slate-300">
                    I understand that mobile phones, smartwatches, and recording devices are strictly prohibited and will be surrendered to the gate deposit lockers.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={bookingBusy}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{bookingBusy?'Submitting…':'Save selected visit date'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Right Sidebar: Facility Rules & Schedule Card */}
          <div className="min-w-0 lg:col-span-4 space-y-6">
            
            {/* Facility Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4" />
                <span>Selected Jail Facility</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">{activeFacility.name}</h4>
              <p className="text-xs text-slate-400 mb-4">{activeFacility.address}</p>

              <div className="space-y-2.5 text-xs border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Visiting Days:</span>
                  <strong className="text-slate-200 text-right">{activeFacility.visitingDays}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Official contact:</span>
                  <a className="text-blue-300 hover:text-white text-right underline underline-offset-2" href="https://odbs.bjmp.gov.ph/" target="_blank" rel="noreferrer">Check BJMP booking system ↗</a>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available slots:</span>
                  <a className="text-blue-300 hover:text-white text-right underline underline-offset-2" href="https://odbs.bjmp.gov.ph/" target="_blank" rel="noreferrer">View official schedule ↗</a>
                </div>
              </div>
            </div>

            {/* Strict Dress Code Warning */}
            <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/30 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
                <AlertTriangle className="w-4 h-4" />
                <span>Strict Dress Code Policy</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✗</span>
                  <span><strong>NO Yellow or Orange</strong> tops or bottoms (PDL uniform).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✗</span>
                  <span><strong>NO Slippers</strong> (closed shoes or strapped sandals only).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✗</span>
                  <span><strong>NO Sleeveless</strong>, see-through, or low-cut tops.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">✓</span>
                  <span>Plain t-shirts, jeans/slacks below the knee are allowed.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: MY APPOINTMENTS & GATE PASSES */}
      {activeTab === 'APPOINTMENTS' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">My Visitation Passes & Appointments</h3>
              <p className="text-xs text-slate-400">
                Review your selected dates and visitation history. Admission remains subject to the facility checks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('BOOK')}
              className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book Another Visit</span>
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white mb-1">No Visitation Appointments Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                You haven't scheduled any jail visitations. Click the button below to reserve a visit slot.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('BOOK')}
                className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg text-xs cursor-pointer"
              >
                Schedule First Visitation
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-xl transition-all relative flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="text-xs font-mono font-bold text-blue-400">
                          {appt.appointmentReference}
                        </span>
                      </div>
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        {appt.selectionMode==='PDL_DAY'&&appt.status==='Approved'?'Scheduled':appt.status}
                      </span>
                    </div>

                    {/* PDL & Details */}
                    <div className="space-y-3 text-xs mb-4">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Inmate to Visit (PDL):</span>
                        <strong className="text-base font-extrabold text-white">
                          {appt.pdlName}
                        </strong>
                        <div className="text-slate-400 text-[11px]">
                          {appt.pdlNumber} • {appt.cellDormitory}
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Facility:</span>
                          <strong className="text-slate-200">{appt.jailFacilityName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Visit Date:</span>
                          <strong className="text-blue-300 font-mono">{appt.visitDate}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Time Batch:</span>
                          <strong className="text-slate-200">{appt.timeSlot}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Visit Type:</span>
                          <span className="text-blue-300 font-medium">{appt.visitType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Relationship:</span>
                          <span className="text-slate-300">{appt.relationshipToPDL}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CompanionDetails appointment={appt}/>
                  {appt.selectionMode==='PDL_DAY'&&appt.status==='Approved'&&!appt.checkedInAt&&appt.visitDate>todayInManila()&&<button className="my-3 rounded border border-slate-700 px-3 py-2 text-xs" onClick={()=>{setRescheduling(appt);setNewDate('');setDateError('');}}>Change selected date</button>}
                  {/* Actions */}
                  <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={Boolean(appt.checkedInAt)||['Completed','Cancelled'].includes(appt.status)}
                      onClick={() => onCancelAppointment(appt.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel Visit</span>
                    </button>
                    {appt.status === 'Approved' ? (
                      <button type="button" onClick={() => setSelectedPass(appt)} className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer">
                        <QrCode className="w-3.5 h-3.5" /><span>View Selected Visit</span>
                      </button>
                    ) : <span className="text-[11px] text-slate-400">No active visit clearance</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VISITATION GUIDELINES & DRESS CODE */}
      {activeTab === 'RULES' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Official BJMP Visitation Rules & Regulations</h3>
            <p className="text-xs text-slate-400">
              Pursuant to the BJMP Comprehensive Operations Manual and Security Standard Operating Procedures
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            
            {/* Column 1: Dress Code */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-4">
                <AlertTriangle className="w-4 h-4" />
                <span>Strictly Prohibited Dress Code</span>
              </div>
              <div className="space-y-3 text-xs">
                {BJMP_RULES_AND_DRESS_CODE.dressCodeProhibited.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
                    <strong className="text-rose-300 block mb-0.5">{item.rule}</strong>
                    <span className="text-slate-400 text-[11px]">{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Allowed Paabot Items */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">
                <CheckCircle2 className="w-4 h-4" />
                <span>Allowed Food & Care Articles (Paabot)</span>
              </div>
              <div className="space-y-2.5 text-xs text-slate-300">
                {BJMP_RULES_AND_DRESS_CODE.allowedPaabotItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-[11px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Prohibited Contraband */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">
                <Shield className="w-4 h-4" />
                <span>Strictly Prohibited Contraband</span>
              </div>
              <div className="space-y-2.5 text-xs text-slate-300">
                {BJMP_RULES_AND_DRESS_CODE.prohibitedContraband.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-start space-x-2">
                    <span className="text-rose-400 font-bold shrink-0">✗</span>
                    <span className="text-[11px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: VISITOR PROFILE & KYC DOCUMENTS */}
      {activeTab === 'PROFILE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-4xl mx-auto">
          <div className="border-b border-slate-800 pb-5 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                <User className="w-8 h-8 text-slate-500 m-auto" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {user.firstName} {user.middleName ? `${user.middleName} ` : ''}{user.lastName} {user.suffix}
                </h3>
                <p className="text-xs text-slate-400">
                  Account status: <strong className="text-blue-400">{user.accountStatus}</strong>
                </p>
              </div>
            </div>
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {user.biometricScannedAt ? 'In-Person Check Recorded' : 'In-Person Check Pending'}
            </span>
          </div>

          <div className="mb-8 grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-blue-400 uppercase text-[11px]">Personal & Contact Data</h4>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Date of Birth:</span>
                <span className="text-slate-200 font-medium">{user.dateOfBirth}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Gender & Civil Status:</span>
                <span className="text-slate-200 font-medium">{user.gender} • {user.address?.maritalStatus || 'Not provided'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Contact Number:</span>
                <span className="text-slate-200 font-medium">{(user.mobileNumber || '')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Email Address:</span>
                <span className="text-slate-200 font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Home Address:</span>
                <span className="text-slate-200 font-medium text-right max-w-[200px]">
                  {user.address?.houseUnitStreet || 'Not provided'}, {user.address?.municipality || ''} {user.address?.zipCode ? `(Zip: ${user.address.zipCode})` : ''}
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-blue-400 uppercase text-sm">Identity verification</h4>
              {onOpenDocuments && <button type="button" onClick={onOpenDocuments} className="rounded-lg border border-slate-600 px-3 py-2 font-semibold">Upload or review government ID</button>}
              <p>Government ID documents are submitted privately for review. The visitor card displays a separate portrait when one is on file.</p>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Document type:</span>
                <span className="text-blue-300 font-bold">{user.validIdType || 'Not submitted'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">In-person check:</span>
                <span className="text-slate-200 font-medium">{user.biometricScannedAt || 'Not recorded'}</span>
              </div>
            </div>
          </div>
          <ProfileEditor user={user}/>
        </div>
      )}

      {/* Printable Pass Modal */}
      <PrintablePassModal
        appointment={selectedPass}
        user={user}
        onClose={() => setSelectedPass(null)}
      />

    </div>
  );
};
