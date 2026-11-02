import React from 'react';
import {X} from 'lucide-react';
import {UserProfile,VisitationAppointment} from '../../types';
import {WorkerDashboard} from '../Dashboard/WorkerDashboard';
interface Props{isOpen:boolean;onClose:()=>void;users:UserProfile[];appointments:VisitationAppointment[];initialVisitorId?:string;staff?:UserProfile}
export const GuardScannerModal:React.FC<Props>=({isOpen,onClose,staff})=>{
 if(!isOpen||!staff)return null;
 return <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/95 p-3"><section role="dialog" aria-modal="true" aria-label="Entrance verification desk" className="mx-auto max-w-7xl rounded-xl border border-slate-700 bg-slate-900"><header className="flex items-center justify-between border-b border-slate-700 p-4 text-slate-100"><h2 className="font-bold">Entrance verification: Fingerprint → QR → Check-in</h2><button aria-label="Close entrance desk" type="button" onClick={onClose}><X/></button></header><WorkerDashboard user={staff} entranceOnly/></section></div>
};
