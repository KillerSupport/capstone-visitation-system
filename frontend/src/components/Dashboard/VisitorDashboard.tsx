import React, { useState } from 'react';
import { 
  Calendar, Clock, Shield, User, Plus, FileText,
  MapPin, CheckCircle2, AlertTriangle, QrCode,
  AlertCircle, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, VisitationAppointment, VisitType
} from '../../types';
import { 
  BJMP_JAIL_FACILITIES, SAMPLE_PDL_ROSTER,
  BJMP_RULES_AND_DRESS_CODE 
} from '../../data/bjmpData';
import { PrintablePassModal } from '../Common/PrintablePassModal';
import { PermanentVisitorIdCard } from '../Common/PermanentVisitorIdCard';

interface VisitorDashboardProps {
  user: UserProfile;
  appointments: VisitationAppointment[];
  onAddAppointment: (newAppt: VisitationAppointment) => void;
  onCancelAppointment: (apptId: string) => void;
  onOpenGuardScanner: (visitorId: string) => void;
  onQuickBookToday?: () => void;
}

export const VisitorDashboard: React.FC<VisitorDashboardProps> = ({
  user,
  appointments,
  onAddAppointment,
  onCancelAppointment,
  onOpenGuardScanner,
  onQuickBookToday,
}) => {
  const [activeTab, setActiveTab] = useState<'ID_CARD' | 'BOOK' | 'APPOINTMENTS' | 'RULES' | 'PROFILE'>('ID_CARD');
  const [selectedPass, setSelectedPass] = useState<VisitationAppointment | null>(null);

  // Booking Form State
  const [facilityId, setFacilityId] = useState(user.preferredJailFacilityId || BJMP_JAIL_FACILITIES[0].id);
  const [selectedPdlId, setSelectedPdlId] = useState(SAMPLE_PDL_ROSTER[0].id);
  const [customPdlMode, setCustomPdlMode] = useState(false);
  const [customPdlName, setCustomPdlName] = useState('');
  const [customPdlNumber, setCustomPdlNumber] = useState('');
  const [customCell, setCustomCell] = useState('Brigada 1 - Main Dorm');
  const [visitType, setVisitType] = useState<VisitType>('Contact Visit');
  const [relationship, setRelationship] = useState('Spouse');
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('Morning Batch (09:00 AM - 11:30 AM)');
  const [paabotDescription, setPaabotDescription] = useState(
    '2 transparent tupperware containers with cooked beef tapa and steamed rice, 1 sealed 1L bottle Wilkins water.'
  );

  // Security dress code checks
  const [agreeNoOrangeYellow, setAgreeNoOrangeYellow] = useState(false);
  const [agreeValidIdOriginal, setAgreeValidIdOriginal] = useState(false);
  const [agreeNoElectronics, setAgreeNoElectronics] = useState(false);

  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Facility and PDL computation
  const activeFacility = BJMP_JAIL_FACILITIES.find((f) => f.id === facilityId) || BJMP_JAIL_FACILITIES[0];
  const facilityPdls = SAMPLE_PDL_ROSTER.filter((p) => p.jailFacilityId === facilityId);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!agreeNoOrangeYellow || !agreeValidIdOriginal || !agreeNoElectronics) {
      setBookingError('Please confirm all BJMP Security & Dress Code Undertakings before submitting.');
      return;
    }

    let pdlName = '';
    let pdlNumber = '';
    let cellDorm = '';

    if (customPdlMode) {
      if (!customPdlName.trim() || !customPdlNumber.trim()) {
        setBookingError('Please provide both the PDL Full Name and Institutional Number.');
        return;
      }
      pdlName = customPdlName.trim();
      pdlNumber = customPdlNumber.trim();
      cellDorm = customCell.trim();
    } else {
      const found = SAMPLE_PDL_ROSTER.find((p) => p.id === selectedPdlId) || SAMPLE_PDL_ROSTER[0];
      pdlName = found.fullName;
      pdlNumber = found.pdlNumber;
      cellDorm = found.cellDormitory;
    }

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const newAppointment: VisitationAppointment = {
      id: `appt-${Date.now()}`,
      appointmentReference: `BJMP-VIS-2026-${randomSuffix}`,
      userId: user.id,
      visitorName: `${user.firstName} ${user.middleName ? `${user.middleName} ` : ''}${user.lastName} ${user.suffix}`.trim(),
      visitorContact: user.contactNumber,
      pdlId: customPdlMode ? 'custom-pdl' : selectedPdlId,
      pdlName,
      pdlNumber,
      jailFacilityId: activeFacility.id,
      jailFacilityName: activeFacility.name,
      cellDormitory: cellDorm,
      visitType,
      relationshipToPDL: relationship,
      visitDate,
      timeSlot,
      paabotItemsDescription: paabotDescription,
      status: 'Approved',
      createdAt: new Date().toLocaleString(),
      qrToken: `BJMP-GATE-${randomSuffix}-${activeFacility.id.substring(0, 4).toUpperCase()}`,
    };

    onAddAppointment(newAppointment);
    setBookingSuccess(true);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      setSelectedPass(newAppointment);
      setActiveTab('APPOINTMENTS');
      setBookingSuccess(false);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      {/* Activated Profile Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Account Activated & Biometric Verified
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Bio Ref: <strong className="text-slate-200">{user.biometricReferenceNumber}</strong>
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Welcome, {user.firstName} {user.lastName}
            </h2>
            <p className="text-xs text-slate-400">
              Verified with {user.validIdType} • Authorized for BJMP Jail Visitation and E-Dalaw
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center space-x-6">
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
            <span>Book New Appointment</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 mb-8 text-xs font-semibold">
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
          <span>Book Visitation Appointment</span>
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
          onQuickBookToday={onQuickBookToday}
        />
      )}

      {/* TAB 1: BOOK VISITATION APPOINTMENT */}
      {activeTab === 'BOOK' && (
        <div className="grid grid-cols-12 gap-8">
          
          {/* Main Booking Form */}
          <div className="col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
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
                  <strong className="block font-bold">Appointment Successfully Scheduled!</strong>
                  <span>Generating your official BJMP Electronic Gate Pass...</span>
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
                    {BJMP_JAIL_FACILITIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.municipality})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Visiting Schedule: {activeFacility.visitingDays} ({activeFacility.visitingHours})
                </span>
              </div>

              {/* 2. PDL Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    2. Person Deprived of Liberty (PDL / Inmate) <span className="text-blue-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomPdlMode(!customPdlMode)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    {customPdlMode ? '← Choose from facility roster' : '+ Search / Enter Custom PDL'}
                  </button>
                </div>

                {customPdlMode ? (
                  <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">PDL Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Juan Dela Cruz"
                        value={customPdlName}
                        onChange={(e) => setCustomPdlName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">PDL Institutional No.</label>
                      <input
                        type="text"
                        placeholder="e.g. PDL-2024-0099"
                        value={customPdlNumber}
                        onChange={(e) => setCustomPdlNumber(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Dormitory / Cell</label>
                      <input
                        type="text"
                        value={customCell}
                        onChange={(e) => setCustomCell(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <select
                      value={selectedPdlId}
                      onChange={(e) => setSelectedPdlId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                    >
                      {facilityPdls.length > 0 ? (
                        facilityPdls.map((pdl) => (
                          <option key={pdl.id} value={pdl.id}>
                            {pdl.fullName} ({pdl.pdlNumber}) – {pdl.cellDormitory}
                          </option>
                        ))
                      ) : (
                        SAMPLE_PDL_ROSTER.map((pdl) => (
                          <option key={pdl.id} value={pdl.id}>
                            {pdl.fullName} ({pdl.pdlNumber}) – {pdl.cellDormitory}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
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
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Spouse">Spouse (Legal Husband / Wife)</option>
                    <option value="Parent">Parent (Father / Mother)</option>
                    <option value="Child">Child (Son / Daughter, 18+)</option>
                    <option value="Sibling">Sibling (Brother / Sister)</option>
                    <option value="Legal Counsel">Legal Counsel (Attorney / Public Attorney)</option>
                    <option value="Relative">Relative (Uncle, Aunt, Cousin)</option>
                    <option value="Common-Law Partner">Common-Law Partner (with Barangay Certification)</option>
                  </select>
                </div>
              </div>

              {/* 4. Date & Time Slot */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    5. Visit Date (Calendar) <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    6. Time Batch Slot <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Morning Batch (09:00 AM - 11:30 AM)">
                      Morning Batch: 09:00 AM - 11:30 AM (Available)
                    </option>
                    <option value="Afternoon Batch (01:00 PM - 03:30 PM)">
                      Afternoon Batch: 01:00 PM - 03:30 PM (Available)
                    </option>
                  </select>
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
                    I will bring the original copy of my registered valid ID (<strong className="text-slate-200">{user.validIdType}</strong>) on the appointment date.
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
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Confirm Reservation & Generate Official BJMP Gate Pass</span>
                </button>
              </div>

            </form>
          </div>

          {/* Right Sidebar: Facility Rules & Schedule Card */}
          <div className="col-span-4 space-y-6">
            
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
                  <span className="text-slate-400">Desk Telephone:</span>
                  <strong className="text-blue-300 font-mono">{activeFacility.contactNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Slot Capacity:</span>
                  <span className="text-blue-400 font-bold">{activeFacility.capacityPerSlot} visitors / batch</span>
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
                View upcoming appointments, download official gate passes, or present QR code at Gate 1
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
                        {appt.status}
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

                  {/* Actions */}
                  <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onCancelAppointment(appt.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel Visit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPass(appt)}
                      className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View & Print Gate Pass</span>
                    </button>
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
                {user.facePhotoUrl ? (
                  <img src={user.facePhotoUrl} alt="Face" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-slate-500 m-auto" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {user.firstName} {user.middleName ? `${user.middleName} ` : ''}{user.lastName} {user.suffix}
                </h3>
                <p className="text-xs text-slate-400">
                  Registered BJMP Visitor ID: <strong className="text-blue-400 font-mono">{user.biometricReferenceNumber}</strong>
                </p>
              </div>
            </div>
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Biometrics Verified
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 text-xs mb-8">
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-blue-400 uppercase text-[11px]">Personal & Contact Data</h4>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Date of Birth:</span>
                <span className="text-slate-200 font-medium">{user.dateOfBirth}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Gender & Civil Status:</span>
                <span className="text-slate-200 font-medium">{user.gender} • {user.address.maritalStatus}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Contact Number:</span>
                <span className="text-slate-200 font-medium">{user.contactNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Email Address:</span>
                <span className="text-slate-200 font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Home Address:</span>
                <span className="text-slate-200 font-medium text-right max-w-[200px]">
                  {user.address.houseUnitStreet}, {user.address.municipality} (Zip: {user.address.zipCode})
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-blue-400 uppercase text-[11px]">Biometric & ID Verification Record</h4>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Valid ID Presented:</span>
                <span className="text-blue-300 font-bold">{user.validIdType}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Biometric Desk:</span>
                <span className="text-slate-200 font-medium">Gate 1 Records Division</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Scanning Timestamp:</span>
                <span className="text-slate-200 font-medium font-mono">{user.biometricScannedAt || 'Completed at Jail Desk'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Verification Officer:</span>
                <span className="text-blue-400 font-medium">{user.biometricsOfficerName || 'JO2 R. BAUTISTA (BJMP Records)'}</span>
              </div>
            </div>
          </div>

          {/* Valid ID Photo Card */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <span className="font-bold text-blue-400 uppercase text-[11px] block mb-2">
              Submitted Valid Government ID Snapshot
            </span>
            <div className="max-w-md aspect-[16/10] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
              <img src={user.idPhotoUrl} alt="Valid ID" className="w-full h-full object-cover" />
            </div>
          </div>

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
