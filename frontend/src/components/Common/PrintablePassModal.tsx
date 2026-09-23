import React from 'react';
import { X, Printer, Shield, QrCode, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
import { VisitationAppointment, UserProfile } from '../../types';

interface PrintablePassModalProps {
  appointment: VisitationAppointment | null;
  user: UserProfile;
  onClose: () => void;
}

export const PrintablePassModal: React.FC<PrintablePassModalProps> = ({
  appointment,
  user,
  onClose,
}) => {
  if (!appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto relative text-slate-100">
        
        {/* Top Control Bar */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold">Official BJMP Electronic Gate Pass</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-mono">{appointment.appointmentReference}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Gate Pass (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pass Document (Standard High-Contrast Formal BJMP Style) */}
        <div className="p-8 bg-white text-slate-900 print:p-0 print:m-0" id="printable-pass-area">
          
          {/* Government Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 text-center">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600">Republic of the Philippines</div>
            <div className="text-xs uppercase font-extrabold text-slate-800">Department of the Interior and Local Government</div>
            <div className="text-sm uppercase font-black tracking-tight text-blue-950">
              BUREAU OF JAIL MANAGEMENT AND PENOLOGY • REGION IV-A
            </div>
            <div className="text-xs font-bold text-amber-700 mt-1 uppercase tracking-wider">
              {appointment.jailFacilityName} • IMUS CITY, CAVITE
            </div>
            <div className="text-[10px] text-slate-500">Inmates Welfare and Development Division • Gate Clearance Pass</div>
          </div>

          {/* Pass Title & Barcode */}
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-300 mb-5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Pass Classification</span>
              <strong className="text-sm font-black text-blue-900 uppercase">
                ELECTRONIC VISITATION CLEARANCE PASS ({appointment.visitType})
              </strong>
              <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                Pass Reference: <strong>{appointment.appointmentReference}</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded border border-emerald-300">
                STATUS: APPROVED
              </span>
              <div className="text-[10px] text-slate-500 mt-1">
                Issued: {appointment.createdAt}
              </div>
            </div>
          </div>

          {/* Main Pass Grid */}
          <div className="grid grid-cols-12 gap-6 mb-5">
            
            {/* Left 8 Cols: Visitor & PDL Details */}
            <div className="col-span-8 space-y-4">
              
              {/* Visitor Details */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-600" />
                  <span>Verified Visitor Particulars</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Full Name:</span>
                    <strong className="text-slate-900 font-bold">{appointment.visitorName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Relationship to PDL:</span>
                    <strong className="text-blue-900 font-bold">{appointment.relationshipToPDL}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Valid ID Presented:</span>
                    <span className="text-slate-800 font-medium">{user.validIdType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Biometrics Ref:</span>
                    <span className="font-mono text-slate-700 font-bold">{user.biometricReferenceNumber}</span>
                  </div>
                </div>
              </div>

              {/* PDL Details */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-600" />
                  <span>Person Deprived of Liberty (PDL / Inmate)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">PDL Full Name:</span>
                    <strong className="text-slate-900 font-bold">{appointment.pdlName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">PDL Institutional No.:</span>
                    <span className="font-mono font-bold text-slate-800">{appointment.pdlNumber}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 text-[11px] block">Assigned Cell / Dormitory:</span>
                    <span className="text-slate-800 font-semibold">{appointment.cellDormitory}</span>
                  </div>
                </div>
              </div>

              {/* Schedule Details */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-3 bg-blue-50/40">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Approved Visit Date:</span>
                    <strong className="text-blue-950 text-sm font-black flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-700" />
                      {appointment.visitDate}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Visitation Time Batch:</span>
                    <strong className="text-blue-950 text-xs font-black flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-700" />
                      {appointment.timeSlot}
                    </strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Right 4 Cols: QR Code & Security Stamp */}
            <div className="col-span-4 border border-slate-300 rounded-lg p-4 flex flex-col items-center justify-between text-center bg-white">
              <div className="w-full">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Gate 1 Scanner Optical Code
                </span>
                <div className="w-36 h-36 bg-slate-950 p-2 rounded-lg flex items-center justify-center mx-auto text-white">
                  <QrCode className="w-32 h-32 text-white" />
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-700 mt-2 block break-all">
                  {appointment.qrToken}
                </span>
              </div>
              <div className="w-full pt-3 border-t border-slate-200 text-left">
                <div className="text-[9px] text-slate-500">Security Validation:</div>
                <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Biometric Verified</span>
                </div>
              </div>
            </div>

          </div>

          {/* Paabot Items Declaration if any */}
          {appointment.paabotItemsDescription && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 mb-4">
              <strong className="block text-[11px] font-bold uppercase text-amber-800 mb-0.5">
                Declared Food / Care Articles for Inspection (Paabot):
              </strong>
              <span>{appointment.paabotItemsDescription}</span>
            </div>
          )}

          {/* Critical Entry Rules & Security Warning */}
          <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-900 uppercase">Mandatory Jail Entry Regulations:</div>
            <div>• Present this Pass together with your original valid ID at the Jail Gate Verification Booth.</div>
            <div>• <strong className="text-red-700 uppercase">Strictly NO yellow or orange attire</strong> (matches PDL uniforms). Violators will be denied entry.</div>
            <div>• Cellular phones, smart watches, recording devices, cigarettes, and weapons are strictly prohibited.</div>
            <div>• Be at the facility 30 minutes prior to your allocated time batch for security frisking and document stamping.</div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-slate-300 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 h-8 mx-6"></div>
              <span className="text-[10px] text-slate-500 font-medium block mt-1">Signature of Visitor</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8 mx-6 flex items-end justify-center pb-0.5 text-[10px] font-bold text-slate-800">
                JO2 R. BAUTISTA / BJMP DIWD
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-1">Jail Desk Officer on Duty</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
