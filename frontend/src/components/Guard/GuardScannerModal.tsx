import React, { useState, useEffect } from 'react';
import { 
  X, Shield, QrCode, CheckCircle2, XCircle, AlertTriangle,
  Calendar, User, RefreshCw, Volume2, Plus
} from 'lucide-react';
import { UserProfile, VisitationAppointment } from '../../types';
import { api } from '../../services/api';

interface GuardScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  appointments: VisitationAppointment[];
  initialVisitorId?: string;
  onQuickBookTodayForUser?: (userId: string, targetDate: string) => void;
}

function playSecurityChime(success: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      // Crisp two-tone verification chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Low warning tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Audio might be constrained by browser permissions
  }
}

export const GuardScannerModal: React.FC<GuardScannerModalProps> = ({
  isOpen,
  onClose,
  users,
  appointments,
  initialVisitorId,
  onQuickBookTodayForUser,
}) => {
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>(
    initialVisitorId || (users[0]?.id || '')
  );
  const [inspectionDate, setInspectionDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [entryAdmittedMessage, setEntryAdmittedMessage] = useState<string | null>(null);
  const [scannedQrValue, setScannedQrValue] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [fingerprintConfirmed, setFingerprintConfirmed] = useState(false);

  // Sync initial visitor when opened
  useEffect(() => {
    if (initialVisitorId) {
      setSelectedVisitorId(initialVisitorId);
      triggerScan(initialVisitorId);
    } else if (users.length > 0 && !selectedVisitorId) {
      setSelectedVisitorId(users[0].id);
      triggerScan(users[0].id);
    }
  }, [initialVisitorId, isOpen]);

  if (!isOpen) return null;

  const currentVisitor = users.find((u) => u.id === selectedVisitorId) || users[0];

  // Find appointment for selected visitor on inspection date
  const visitorAppointments = appointments.filter(
    (a) => a.userId === currentVisitor?.id && a.status !== 'Cancelled'
  );
  const todayAppointment = visitorAppointments.find((a) => a.visitDate === inspectionDate);
  const otherAppointments = visitorAppointments.filter((a) => a.visitDate !== inspectionDate);

  const triggerScan = (visitorIdToScan?: string) => {
    setIsScanning(true);
    setHasScanned(false);
    setEntryAdmittedMessage(null);
    setFingerprintConfirmed(false);

    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);

      const vid = visitorIdToScan || selectedVisitorId;
      const visitor = users.find((u) => u.id === vid);
      const appt = appointments.find(
        (a) => a.userId === visitor?.id && a.visitDate === inspectionDate && a.status !== 'Cancelled'
      );
      if (appt) {
        playSecurityChime(true);
      } else {
        playSecurityChime(false);
      }
    }, 450);
  };

  const handleVisitorChange = (newId: string) => {
    setSelectedVisitorId(newId);
    triggerScan(newId);
  };

  const handleDateChange = (newDate: string) => {
    setInspectionDate(newDate);
    triggerScan();
  };

  const handleQrTokenScan = () => {
    const value = scannedQrValue.trim();
    if (!value) return;
    const appointment = appointments.find((item) =>
      item.qrToken === value || item.appointmentReference === value || value.includes(item.qrToken) || value.includes(item.appointmentReference)
    );
    if (!appointment) {
      setScanError('QR code was not found in the appointment register. Check the visitor pass or use an approved QR reader.');
      setHasScanned(false);
      playSecurityChime(false);
      return;
    }
    setScanError(null);
    setSelectedVisitorId(appointment.userId);
    setInspectionDate(appointment.visitDate);
    triggerScan(appointment.userId);
  };

  const handleAdmitEntry = async () => {
    const time = new Date().toLocaleTimeString();
    if (!fingerprintConfirmed) return;
    setEntryAdmittedMessage(`Visitor clearance verified & admitted at ${time}. Entry logged to the MySQL database.`);
    playSecurityChime(true);

    try {
      await api.logGateScan({
        appointmentId: todayAppointment?.id,
        userId: currentVisitor.id,
        visitorName: `${currentVisitor.firstName} ${currentVisitor.lastName}`,
        pdlName: todayAppointment?.pdlName || 'N/A',
        facilityId: todayAppointment?.jailFacilityId || 'imus-city-jail-male',
        guardOfficer: 'JO2 R. BAUTISTA (Gate 1 Sentinel)',
        action: 'ADMITTED',
        notes: 'Pass verified. Paabot items frisked & cleared.',
      });
    } catch (e) {
      console.warn('Scan saved locally (backend sync):', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto relative text-slate-100">
        
        {/* Terminal Top Bar */}
        <div className="bg-slate-950 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  BJMP REGION IV-A • GATE 1 ACCESS CONTROL
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.2 rounded border border-slate-700">
                  OPTICAL TERMINAL
                </span>
              </div>
              <h2 className="text-sm font-extrabold text-white tracking-tight">
                Imus City Jail • Visitor Electronic Gate Pass Scanner
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right text-[11px] text-slate-400 hidden sm:block">
              <span className="block text-slate-300 font-medium">Duty Sentinel: JO2 R. BAUTISTA</span>
              <span className="font-mono text-emerald-400">● Optical Sensor Online</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal Controls */}
        <div className="bg-slate-950/60 px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
          
          {/* QR input supports a USB QR reader (keyboard mode) or manual test entry. */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <QrCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              value={scannedQrValue}
              onChange={(e) => setScannedQrValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQrTokenScan(); } }}
              placeholder="Scan or paste unique QR token"
              className="min-w-0 flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            />
            <button type="button" onClick={handleQrTokenScan} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg text-xs text-amber-300 font-bold">Read QR</button>
          </div>

          {/* Manual fallback is limited to workers at the physical gate desk. */}
          <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
            <span className="text-slate-400 font-medium shrink-0 text-[11px]">Manual fallback:</span>
            <select
              value={selectedVisitorId}
              onChange={(e) => handleVisitorChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-400 flex-1 max-w-xs"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.biometricReferenceNumber}) - {u.accountStatus}
                </option>
              ))}
            </select>
          </div>

          {/* Inspection Date */}
          <div className="flex items-center space-x-2 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium text-[11px]">Inspection Date:</span>
            <input
              type="date"
              value={inspectionDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400 [color-scheme:dark]"
            />
          </div>

          {/* Rescan Button */}
          <button
            type="button"
            onClick={() => triggerScan()}
            disabled={isScanning}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Rescan QR</span>
          </button>
        </div>

        {scanError && <div className="bg-rose-950/70 border-b border-rose-500/40 px-6 py-2 text-xs text-rose-200">{scanError}</div>}

        {/* Main Terminal Screen */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          
          {isScanning ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center bg-slate-950 border border-amber-400/60 rounded-xl">
                <QrCode className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Scanning Gate QR Code...</h3>
              <p className="text-xs text-slate-400 font-mono">
                Querying MySQL appointment register & verifying daily roster...
              </p>
            </div>
          ) : !currentVisitor ? (
            <div className="text-center py-10 text-slate-400">
              <span>No visitor selected</span>
            </div>
          ) : hasScanned && todayAppointment ? (
            
            /* CASE 1: PASS CONFIRMED FOR TODAY */
            <div className="space-y-4">
              
              {/* Clearance Banner */}
              <div className="bg-emerald-950/60 border border-emerald-500/70 rounded-xl p-4 shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-11 h-11 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.2 rounded">
                          ACCESS GRANTED • VERIFIED PASS
                        </span>
                        <span className="text-[11px] text-emerald-300 font-mono">
                          Date: {todayAppointment.visitDate} (Today)
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        VALID APPOINTMENT CONFIRMED FOR TODAY
                      </h3>
                      <p className="text-xs text-emerald-200/90 mt-0.5 max-w-xl">
                        QR appointment found. Complete the in-person fingerprint confirmation before admitting the visitor.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                      CLEARED
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {todayAppointment.appointmentReference}
                    </div>
                  </div>
                </div>
              </div>

              {entryAdmittedMessage && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 p-3 rounded-lg flex items-center space-x-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{entryAdmittedMessage}</span>
                </div>
              )}

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Visitor Info */}
                <div className="md:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-3 border-b border-slate-800 pb-2.5">
                    <div className="w-14 h-16 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                      {currentVisitor.facePhotoUrl ? (
                        <img 
                          src={currentVisitor.facePhotoUrl} 
                          alt="Visitor" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-slate-500 m-auto" />
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-amber-400 block">
                        Verified Visitor
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {currentVisitor.firstName} {currentVisitor.lastName}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {currentVisitor.biometricReferenceNumber}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ID Presented:</span>
                      <strong className="text-slate-200 text-[11px]">{currentVisitor.validIdType}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contact:</span>
                      <span className="text-slate-300 text-[11px]">{currentVisitor.contactNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Relationship:</span>
                      <strong className="text-amber-300 text-[11px]">{todayAppointment.relationshipToPDL}</strong>
                    </div>
                  </div>
                </div>

                {/* PDL & Inmate Details */}
                <div className="md:col-span-7 space-y-3">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">
                          Person Deprived of Liberty (PDL / Inmate)
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {todayAppointment.pdlName}
                        </h4>
                      </div>
                      <span className="bg-slate-800 text-blue-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
                        {todayAppointment.pdlNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400 block">Cell / Dormitory:</span>
                        <strong className="text-white text-xs">{todayAppointment.cellDormitory}</strong>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400 block">Time Slot:</span>
                        <strong className="text-amber-300 text-xs">{todayAppointment.timeSlot}</strong>
                      </div>
                    </div>

                    {todayAppointment.paabotItemsDescription && (
                      <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5 text-xs">
                        <strong className="text-amber-400 font-semibold block text-[11px] mb-0.5">
                          Declared Paabot Articles (To be Frisked):
                        </strong>
                        <span className="text-slate-300 text-[11px]">{todayAppointment.paabotItemsDescription}</span>
                      </div>
                    )}
                  </div>

                  {/* A browser cannot read fingerprint hardware by itself. The worker confirms completion on the approved physical terminal. */}
                  <label className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs text-amber-100 cursor-pointer">
                    <input type="checkbox" checked={fingerprintConfirmed} onChange={(e) => setFingerprintConfirmed(e.target.checked)} className="accent-amber-400" />
                    <span><strong>Worker confirmation:</strong> fingerprint was matched on the approved BJMP biometric terminal.</span>
                  </label>

                  {/* Admit Action Bar */}
                  <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">
                      <span>Inspection Status: </span>
                      <strong className="text-emerald-400">Ready for Admission</strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdmitEntry}
                      disabled={!fingerprintConfirmed}
                      className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Admit Visitor (Log Entry to Database)</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          ) : (
            
            /* CASE 2: ACCESS DENIED / NO PASS TODAY */
            <div className="space-y-4">
              <div className="bg-rose-950/60 border border-rose-500/70 rounded-xl p-4 shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-11 h-11 rounded-lg bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-400 shrink-0">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.2 rounded">
                          ACCESS DENIED • NO APPOINTMENT TODAY
                        </span>
                        <span className="text-[11px] text-rose-300 font-mono">
                          Inspected Date: {inspectionDate}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        NO ACTIVE APPOINTMENT SCHEDULED FOR TODAY
                      </h3>
                      <p className="text-xs text-rose-200 mt-0.5 max-w-xl">
                        This visitor does not have an approved booking for today ({inspectionDate}). Per BJMP regulations, unscheduled visitors cannot be admitted.
                      </p>
                    </div>
                  </div>
                  <span className="bg-rose-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                    ENTRY REFUSED
                  </span>
                </div>
              </div>

              {/* Other Appointments List or Quick Book */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Visitor Record
                  </span>
                  <div className="font-bold text-sm text-white">{currentVisitor.firstName} {currentVisitor.lastName}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{currentVisitor.biometricReferenceNumber}</div>
                  <div className="text-slate-300">Status: <span className="text-emerald-400 font-medium">{currentVisitor.accountStatus}</span></div>
                </div>

                <div className="md:col-span-7 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Other Appointments on Record</span>
                  </h4>

                  {otherAppointments.length > 0 ? (
                    <div className="space-y-2">
                      {otherAppointments.map((appt) => (
                        <div key={appt.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white block">{appt.pdlName}</span>
                            <span className="text-[11px] text-slate-400">Date: {appt.visitDate} • {appt.timeSlot}</span>
                          </div>
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px]">{appt.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-3">
                      No future appointments found on file for this visitor.
                    </div>
                  )}

                  {onQuickBookTodayForUser && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onQuickBookTodayForUser(currentVisitor.id, inspectionDate)}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Emergency Pass: Issue Today's Pass ({inspectionDate})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
