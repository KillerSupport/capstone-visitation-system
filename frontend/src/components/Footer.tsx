import React from 'react';
import { Shield, Phone, FileText, AlertCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs mt-auto">
      {/* Upper Footer: Guidelines and Citizen's Charter */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-4 gap-8">
        <div>
          <div className="flex items-center space-x-2 text-slate-200 font-bold mb-3">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>BJMP IMUS CITY JAIL</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px] mb-2">
            Bureau of Jail Management and Penology (BJMP) Region IV-A (CALABARZON). Male and Female Dormitories serving Imus City, Cavite.
          </p>
          <div className="text-[11px] text-slate-300 font-medium mb-1">
            📍 Brgy. Malagasang 1-G, Imus City, Cavite 4103
          </div>
          <div className="text-[10px] text-slate-500">
            Near Imus City Government Center • Republic Act No. 6975
          </div>
        </div>

        <div>
          <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
            Important Visitor Reminders
          </h4>
          <ul className="space-y-1.5 text-[11px] text-slate-400">
            <li>• Valid Government ID must be presented upon jail entrance.</li>
            <li>• Strictly NO yellow/orange clothing inside jail facilities.</li>
            <li>• Biometric fingerprint registration at Imus City Jail Gate 1.</li>
            <li>• All food/paabot containers must be 100% transparent.</li>
            <li>• Cellphones and electronic gadgets strictly prohibited.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-blue-400" />
            Imus City Jail & Local Hotlines
          </h4>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <p className="flex justify-between">
              <span>BJMP Imus City Jail Desk:</span>
              <strong className="text-blue-300 font-mono">(046) 471-2854</strong>
            </p>
            <p className="flex justify-between">
              <span>Imus Jail Mobile Hotline:</span>
              <strong className="text-blue-300 font-mono">+63 917 839 2044</strong>
            </p>
            <p className="flex justify-between">
              <span>Imus Police Station (PNP):</span>
              <strong className="text-slate-300 font-mono">(046) 471-2868</strong>
            </p>
            <p className="flex justify-between">
              <span>Imus CDRRMO / Emergency:</span>
              <strong className="text-slate-300 font-mono">(046) 472-2432 / 911</strong>
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Privacy & Governance
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
            In compliance with the Data Privacy Act of 2012 (Republic Act No. 10173), all personal data, valid ID copies, and biometric records are securely encrypted and used exclusively for jail security clearance and visitor authentication.
          </p>
          <div className="flex items-center space-x-2 text-[11px] text-blue-400/90 font-medium">
            <span>Official Government Desktop System</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-900 bg-slate-950/80 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} Bureau of Jail Management and Penology (BJMP) - All Rights Reserved. Desktop Edition.
          </div>
          <div className="flex items-center space-x-4">
            <span className="hover:text-slate-400">Visitor Citizen's Charter</span>
            <span>•</span>
            <span className="hover:text-slate-400">Terms of Jail Visitation</span>
            <span>•</span>
            <span className="hover:text-slate-400">Data Privacy Notice</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
