import React, { useState } from 'react';
import { 
  Fingerprint, MapPin, Clock, Phone, AlertTriangle,
  CheckCircle2, Printer, QrCode, Shield, FileText,
  Sparkles, UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../../types';
import { BJMP_JAIL_FACILITIES, BJMP_RULES_AND_DRESS_CODE } from '../../data/bjmpData';

interface BiometricNoticeViewProps {
  user: UserProfile;
  onBiometricScanned: () => void;
  onLogout: () => void;
}

export const BiometricNoticeView: React.FC<BiometricNoticeViewProps> = ({
  user,
  onBiometricScanned,
  onLogout,
}) => {
  const [isScanningSimulation, setIsScanningSimulation] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [officerName] = useState('JO2 R. BAUTISTA (BJMP Records Officer)');

  const selectedFacility = BJMP_JAIL_FACILITIES.find(
    (f) => f.id === user.preferredJailFacilityId
  ) || BJMP_JAIL_FACILITIES[0];

  const handleStartBiometricScan = () => {
    setIsScanningSimulation(true);
    setScanProgress(10);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
            onBiometricScanned();
          }, 600);
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Primary Message Alert: Exactly matching user prompt */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
            <Fingerprint className="w-8 h-8 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wide">
                ACTION REQUIRED BY VISITOR
              </span>
              <span className="text-xs text-amber-300/80 font-mono">
                Notice Ref: {user.biometricReferenceNumber}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              In-Person Biometric Fingerprint Scanning Required for Account Activation
            </h2>
            <p className="text-sm text-slate-200 mt-2 leading-relaxed font-medium">
              Your email address has been successfully confirmed. Per BJMP Standard Operating Security Procedure, <strong className="text-amber-300 underline underline-offset-2">you need to go to the jail in person to have your biometric fingerprint scanned</strong> for your visitor account to be activated.
            </p>
            <div className="mt-4 flex items-center space-x-4 text-xs">
              <span className="text-slate-400">
                Designated Facility: <strong className="text-slate-200">{selectedFacility.name}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                Desk Schedule: <strong className="text-slate-200">{selectedFacility.biometricDeskHours}</strong>
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Biometric Slip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Biometric Pass Card & Instructions */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Col: Official Biometric Reference Pass Slip (Printable Format) */}
        <div className="col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Official Biometric Enrollment Order
                </h3>
                <span className="text-[10px] text-slate-400">DILG • Bureau of Jail Management and Penology</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Status:</span>
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                Awaiting Fingerprint
              </span>
            </div>
          </div>

          {/* Biometric Slip Content */}
          <div className="p-6 space-y-6">
            
            {/* Header Identity Row */}
            <div className="flex items-center space-x-5 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="w-20 h-24 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                {user.facePhotoUrl ? (
                  <img
                    src={user.facePhotoUrl}
                    alt={user.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Fingerprint className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <div className="flex-1 text-xs space-y-1">
                <div className="text-[11px] text-slate-400 uppercase tracking-wide">Registered Applicant</div>
                <div className="text-base font-extrabold text-white">
                  {user.firstName} {user.middleName ? `${user.middleName} ` : ''}{user.lastName} {user.suffix}
                </div>
                <div className="text-slate-300">
                  DOB: <strong className="text-white">{user.dateOfBirth}</strong> ({user.gender}) • <span className="text-slate-400">{user.address.maritalStatus}</span>
                </div>
                <div className="text-slate-300">
                  ID Presented: <strong className="text-amber-400">{user.validIdType}</strong>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Address: {user.address.houseUnitStreet}, {user.address.municipality}
                </div>
              </div>
              {/* QR Code */}
              <div className="w-24 bg-white p-2 rounded-lg border border-slate-300 text-center shrink-0">
                <div className="w-20 h-20 bg-slate-950 rounded flex items-center justify-center mx-auto text-white">
                  <QrCode className="w-16 h-16 text-white" />
                </div>
                <span className="text-[9px] font-mono text-slate-900 font-bold block mt-1 truncate">
                  {user.biometricReferenceNumber}
                </span>
              </div>
            </div>

            {/* Jail Location & Details */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-start space-x-3 text-xs">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">
                    {selectedFacility.name}
                  </strong>
                  <span className="text-slate-400 text-[11px]">
                    {selectedFacility.address}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">
                    Records & Biometric Desk Hours
                  </strong>
                  <span className="text-slate-400 text-[11px]">
                    {selectedFacility.biometricDeskHours} (No appointment booking needed for biometric enrollment)
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <Phone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">
                    Facility Inquiries Hotline
                  </strong>
                  <span className="text-slate-400 text-[11px]">
                    {selectedFacility.contactNumber}
                  </span>
                </div>
              </div>

              {/* Imus City Jail Landmarks & Transport Guide */}
              <div className="border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-300">
                <span className="text-amber-400 font-semibold block mb-0.5">📍 Getting to BJMP Imus City Jail:</span>
                <span className="text-slate-400">
                  Located at Brgy. Malagasang 1-G, Imus City, Cavite (adjacent to the Imus City Government Center complex). Approach Gate 1 Admin & Inmate Records Section for biometric enrollment.
                </span>
              </div>
            </div>

            {/* What to Bring Checklist */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Mandatory Physical Documents to Present at Jail Gate</span>
              </h4>
              <div className="space-y-2 text-xs">
                {BJMP_RULES_AND_DRESS_CODE.biometricRequirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2.5 bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-slate-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Right Col: Interactive Biometric Scanner Simulation */}
        <div className="col-span-5 flex flex-col justify-between space-y-6">
          
          {/* Simulation Desk Panel */}
          <div className="bg-slate-900 border-2 border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  BJMP Records Desk Biometric Terminal
                </span>
              </div>
              <span className="text-[10px] bg-blue-900/50 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                DigitalPersona 4500
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              When visiting the jail in person, the BJMP records officer will scan your fingerprint on the optical scanner to verify your identity and activate your account.
            </p>

            {/* Fingerprint Scanner Visual Graphic */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center relative overflow-hidden mb-6">
              {isScanningSimulation && (
                <div 
                  className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)] transition-all duration-300 z-10"
                  style={{ top: `${scanProgress}%` }}
                ></div>
              )}
              <div className={`w-32 h-32 mx-auto rounded-2xl flex items-center justify-center border-2 transition-all relative ${
                isScanningSimulation
                  ? 'border-emerald-400 bg-emerald-950/20 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)]'
                  : 'border-slate-800 bg-slate-900/60 text-slate-600 hover:text-amber-400 hover:border-amber-500/50'
              }`}>
                <Fingerprint className={`w-20 h-20 ${isScanningSimulation ? 'animate-pulse' : ''}`} />
                {isScanningSimulation && (
                  <div className="absolute -bottom-3 bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    Scanning {scanProgress}%
                  </div>
                )}
              </div>
              <div className="mt-4 text-xs font-mono text-slate-400">
                {isScanningSimulation ? (
                  <span className="text-emerald-400 font-bold">
                    Analyzing Biometric Minutiae Points (AFIS)...
                  </span>
                ) : (
                  <span>Optical Fingerprint Sensor: Ready</span>
                )}
              </div>
            </div>

            {/* Desk Officer Sign-off */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 mb-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Duty Verification Officer</span>
                <strong className="text-slate-300 font-medium">{officerName}</strong>
              </div>
              <UserCheck className="w-5 h-5 text-amber-400" />
            </div>

            {/* Test Simulation Button */}
            <button
              type="button"
              disabled={isScanningSimulation}
              onClick={handleStartBiometricScan}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isScanningSimulation ? (
                <span>Registering Biometric Fingerprint...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Simulate Jail Biometric Scan & Activate Account</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Notice */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-400 flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-300 block">Dress Code Reminder for Jail Visit:</strong>
              Visitors wearing yellow or orange clothing, open sandals, or sleeveless shirts will be turned away at Gate 1 per BJMP Security Manual.
            </div>
          </div>

          {/* Logout option */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Log out and return later
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
