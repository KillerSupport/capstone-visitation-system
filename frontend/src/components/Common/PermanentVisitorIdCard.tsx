import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Download, Printer, Shield, CheckCircle2,
  AlertTriangle, MapPin, User, Sparkles, ArrowRight
} from 'lucide-react';
import { UserProfile, VisitationAppointment } from '../../types';
import { buildPermanentQRPayload, generateQRCodeDataUrl } from '../../utils/qrGenerator';

interface PermanentVisitorIdCardProps {
  user: UserProfile;
  appointments: VisitationAppointment[];
  onOpenGuardScanner: (visitorId: string) => void;
  onQuickBookToday?: () => void;
}

export const PermanentVisitorIdCard: React.FC<PermanentVisitorIdCardProps> = ({
  user,
  appointments,
  onOpenGuardScanner,
  onQuickBookToday,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const userAppointments = appointments.filter((a) => a.userId === user.id && a.status !== 'Cancelled');
  const todayAppointment = userAppointments.find((a) => a.visitDate === todayStr);
  const upcomingAppointment = !todayAppointment
    ? userAppointments
        .filter((a) => a.visitDate > todayStr)
        .sort((a, b) => a.visitDate.localeCompare(b.visitDate))[0]
    : null;

  useEffect(() => {
    let isMounted = true;
    async function makeQR() {
      setIsGenerating(true);
      const payload = buildPermanentQRPayload(user, appointments, todayStr);
      const url = await generateQRCodeDataUrl(JSON.stringify(payload));
      if (isMounted) {
        setQrDataUrl(url);
        setIsGenerating(false);
      }
    }
    makeQR();
    return () => {
      isMounted = false;
    };
  }, [user, appointments, todayStr]);

  // Download ID as Image (Canvas rendering)
  const handleDownloadIdImage = () => {
    const canvas = document.createElement('canvas');
    const width = 1000;
    const height = 620;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, width, height);

    // Decorative gradient header
    const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
    headerGrad.addColorStop(0, '#020617');
    headerGrad.addColorStop(0.5, '#1e1b4b');
    headerGrad.addColorStop(1, '#020617');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, width, 110);

    // Top gold accent line
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 108, width, 4);

    // Header Text
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('REPUBLIC OF THE PHILIPPINES • DILG • REGION IV-A (CALABARZON)', 40, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px sans-serif';
    ctx.fillText('BUREAU OF JAIL MANAGEMENT AND PENOLOGY • IMUS CITY JAIL', 40, 72);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('OFFICIAL PERMANENT VISITOR IDENTIFICATION & ELECTRONIC ACCESS BADGE', 40, 95);

    // Left Border / Photo container
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, 135, 180, 220, 12);
    ctx.fill();
    ctx.stroke();

    // Visitor Name & Details
    const fullName = `${user.firstName} ${user.middleName ? `${user.middleName} ` : ''}${user.lastName} ${user.suffix}`.trim();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 26px sans-serif';
    ctx.fillText(fullName, 245, 175);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`BIOMETRIC REF: ${user.biometricReferenceNumber}`, 245, 205);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Valid ID: ${user.validIdType}`, 245, 235);
    ctx.fillText(`Address: ${user.address.municipality} (Zip: ${user.address.zipCode})`, 245, 260);
    ctx.fillText(`Contact: ${user.contactNumber}`, 245, 285);
    ctx.fillText(`Designated Facility: BJMP Imus City Jail (Brgy. Malagasang 1-G)`, 245, 310);

    // Status Pill
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.roundRect(245, 325, 280, 32, 6);
    ctx.fill();
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('✓ BIOMETRIC FINGERPRINT VERIFIED', 260, 346);

    // Appointment Dynamic Section Box
    ctx.fillStyle = todayAppointment ? '#14532d' : '#334155';
    ctx.beginPath();
    ctx.roundRect(40, 385, 560, 195, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    if (todayAppointment) {
      ctx.fillText(`✓ TODAY'S APPOINTMENT: ${todayAppointment.visitDate} (ACTIVE)`, 60, 420);
      ctx.fillStyle = '#fde68a';
      ctx.font = '14px sans-serif';
      ctx.fillText(`PDL: ${todayAppointment.pdlName} (${todayAppointment.pdlNumber})`, 60, 450);
      ctx.fillText(`Batch: ${todayAppointment.timeSlot}`, 60, 475);
      ctx.fillText(`Cell Block: ${todayAppointment.cellDormitory} • Type: ${todayAppointment.visitType}`, 60, 500);
      ctx.fillText(`Ref Code: ${todayAppointment.appointmentReference}`, 60, 525);
    } else {
      ctx.fillText('⚠ NO VISITATION APPOINTMENT FOR TODAY', 60, 420);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px sans-serif';
      ctx.fillText('Status: Permanent ID is valid, but gate clearance requires', 60, 450);
      ctx.fillText('an active booking. Guard scan will display entry denied.', 60, 475);
      if (upcomingAppointment) {
        ctx.fillStyle = '#fde68a';
        ctx.fillText(`Next scheduled visit: ${upcomingAppointment.visitDate} (${upcomingAppointment.timeSlot})`, 60, 510);
      } else {
        ctx.fillText('No upcoming appointments on file. Schedule a visit online.', 60, 510);
      }
    }

    // Load QR Image onto canvas
    const qrImg = new Image();
    qrImg.onload = () => {
      // White box for QR
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(640, 135, 320, 360, 12);
      ctx.fill();

      ctx.drawImage(qrImg, 660, 155, 280, 280);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DYNAMIC GATE 1 SECURITY QR', 800, 460);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Scanned by BJMP guards on visit date', 800, 480);
      ctx.textAlign = 'left';

      // Footer note
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText('Official property of BJMP Region IV-A. Unauthorized reproduction or transfer is punishable by law.', 40, 600);

      // Trigger download
      const link = document.createElement('a');
      link.download = `BJMP_Imus_Permanent_ID_${user.biometricReferenceNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    if (qrDataUrl) {
      qrImg.src = qrDataUrl;
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Intro Explanation Card */}
      <div className="bg-gradient-to-r from-amber-500/15 via-blue-900/20 to-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
            <QrCode className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                PERMANENT VISITOR ID & DYNAMIC QR
              </span>
              <span className="text-xs text-amber-300 font-mono">
                {user.biometricReferenceNumber}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Your Permanent BJMP Digital Visitor Identification Card
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed mt-1">
              This permanent QR code serves as your official identification badge. Keep or download this QR code on your phone or print it. <strong>Whenever you book a new appointment, the gate data inside this QR code automatically syncs to your scheduled date.</strong> When the jail guards scan this QR code at Gate 1, the terminal will verify if you have an approved appointment for that day.
            </p>
          </div>
        </div>
        {/* Action button to test guard scanner */}
        <div className="text-right shrink-0">
          <button
            type="button"
            onClick={() => onOpenGuardScanner(user.id)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-blue-500/20 cursor-pointer transition-all"
          >
            <Shield className="w-4 h-4 text-amber-300" />
            <span>Simulate Guard Scan at Gate 1</span>
          </button>
        </div>
      </div>

      {/* The Official Permanent ID Card View (Desktop & Downloadable) */}
      <div 
        ref={cardRef}
        className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl relative max-w-4xl mx-auto text-slate-100"
      >
        {/* Card Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-8 py-5 border-b-2 border-amber-500/60 flex items-center justify-between relative">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block">
                Republic of the Philippines • Department of the Interior and Local Government
              </span>
              <h2 className="text-base font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans']">
                BUREAU OF JAIL MANAGEMENT AND PENOLOGY • REGION IV-A
              </h2>
              <span className="text-xs text-slate-300 font-semibold">
                BJMP Imus City Jail (Male & Female Dormitories) • Official Permanent Visitor ID
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase px-3 py-1 rounded-full inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Biometric Active
            </span>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Ref: {user.biometricReferenceNumber}
            </div>
          </div>
        </div>

        {/* Card Main Body */}
        <div className="p-8 grid grid-cols-12 gap-8 items-center bg-slate-900/90">
          
          {/* Left Column: Photo & Biometrics Tag */}
          <div className="col-span-3 text-center">
            <div className="w-36 h-44 rounded-2xl bg-slate-800 border-2 border-amber-500/40 overflow-hidden mx-auto shadow-lg relative group">
              {user.facePhotoUrl ? (
                <img 
                  src={user.facePhotoUrl} 
                  alt={user.firstName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <User className="w-12 h-12" />
                  <span className="text-[10px] mt-1">Verified Photo</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[10px] py-1 text-amber-300 font-mono font-bold">
                BJMP RECORDED
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              <span>Date Registered:</span>
              <strong className="text-slate-200 block">{user.registeredAt.split(',')[0]}</strong>
            </div>
          </div>

          {/* Middle Column: Visitor Particulars & Today's Status */}
          <div className="col-span-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Official Registered Visitor
              </span>
              <h3 className="text-xl font-extrabold text-white">
                {user.firstName} {user.middleName ? `${user.middleName} ` : ''}{user.lastName} {user.suffix}
              </h3>
              <div className="text-xs text-amber-400 font-mono font-semibold">
                {user.biometricReferenceNumber}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">Civil Status & Sex:</span>
                <strong className="text-slate-200">{user.address.maritalStatus} • {user.gender}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Contact Phone:</span>
                <strong className="text-slate-200">{user.contactNumber}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Government ID on File:</span>
                <span className="text-slate-300 text-[11px] truncate block">{user.validIdType}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Municipality:</span>
                <span className="text-slate-300 text-[11px] block">{user.address.municipality}</span>
              </div>
            </div>

            {/* Dynamic Appointment Status Display */}
            <div className={`p-4 rounded-xl border transition-all ${
              todayAppointment
                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-950/70 border-slate-800 text-slate-300'
            }`}>
              {todayAppointment ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Appointment Confirmed For Today!
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                      {todayAppointment.timeSlot.split('(')[0].trim()}
                    </span>
                  </div>
                  <div className="text-xs text-white">
                    Visiting Inmate: <strong>{todayAppointment.pdlName}</strong> ({todayAppointment.pdlNumber})
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Cell: {todayAppointment.cellDormitory} • Pass: {todayAppointment.appointmentReference}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      No Appointment For Today ({todayStr})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Card ID Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Guard scanner will display <strong className="text-rose-400">"Entry Denied / No Appointment"</strong> if scanned today without an approved booking.
                  </p>
                  {upcomingAppointment && (
                    <div className="mt-2 text-[11px] bg-slate-900 p-2 rounded border border-slate-700/60 text-slate-300">
                      Next scheduled visit: <strong className="text-amber-300">{upcomingAppointment.visitDate}</strong> ({upcomingAppointment.timeSlot})
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: High-Resolution Permanent QR Code */}
          <div className="col-span-4 flex flex-col items-center justify-center border-l border-slate-800/80 pl-6 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Permanent Security QR Code
            </span>
            <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-slate-800 relative group">
              {isGenerating ? (
                <div className="w-48 h-48 flex items-center justify-center text-slate-800">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="BJMP Visitor Dynamic QR" 
                  className="w-48 h-48 object-contain rounded"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                  <QrCode className="w-16 h-16" />
                </div>
              )}
              <div className="mt-1.5 text-[10px] font-mono text-slate-900 font-bold">
                SCAN AT GATE 1 ENTRANCE
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-2 max-w-[200px]">
              Encrypted digital identifier for BJMP optical laser & mobile scanners
            </span>
          </div>
        </div>

        {/* Card Footer Bar */}
        <div className="bg-slate-950 px-8 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>BJMP Imus City Jail • Brgy. Malagasang 1-G, Imus City, Cavite 4103</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Hotline: <strong className="text-slate-300">(046) 471-2854</strong></span>
            <span>•</span>
            <span className="text-amber-400">Official DILG Pass</span>
          </div>
        </div>
      </div>

      {/* Card Controls & Quick Simulator Bar */}
      <div className="max-w-4xl mx-auto flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleDownloadIdImage}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Permanent ID & QR Code (PNG)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintCard}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Physical ID Badge</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {onQuickBookToday && !todayAppointment && (
            <button
              type="button"
              onClick={onQuickBookToday}
              className="bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Quick Test: Add Today's Appointment</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenGuardScanner(user.id)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Shield className="w-4 h-4 text-amber-300" />
            <span>Test Guard Scanner Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
