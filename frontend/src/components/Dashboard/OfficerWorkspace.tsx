import React,{useEffect,useState} from 'react';
import {UserProfile} from '../../types';
import {WorkerDashboard} from './WorkerDashboard';
import {AdminKycPanel} from '../Admin/AdminKycPanel';
import {hardware} from '../../services/hardware';
import {api} from '../../services/api';

function EnrollmentDesk(){
  const [visitors,setVisitors]=useState<any[]>([]),[selected,setSelected]=useState(''),[online,setOnline]=useState(false),[requestId,setRequestId]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const load=()=>api.getEnrollmentVisitors().then(setVisitors);
  useEffect(()=>{void load().catch(e=>setError(e.message));hardware.connect();return hardware.onStatus(setOnline);},[]);
  useEffect(()=>hardware.onEvent(event=>{if(event.type==='FINGERPRINT_ENROLL_RESULT'&&event.requestId===requestId){if(event.payload?.success&&event.payload.proof){void api.adminEnrollBiometrics(selected,event.payload.proof).then(r=>{setMessage(r.message);setSelected('');void load();}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}else{setError('Fingerprint enrollment was not confirmed.');setBusy(false);}}if(event.type==='DEVICE_ERROR'){setError('Scanner operation failed. Try again after checking the connection.');setBusy(false);}}),[requestId,selected]);
  useEffect(()=>{if(!busy)return;const t=setTimeout(()=>{setBusy(false);setError('Enrollment timed out. No enrollment was recorded.');setRequestId('');},120000);return()=>clearTimeout(t);},[busy]);
  return <section className="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="text-xl font-bold">Supervised fingerprint enrollment</h2><p className="mt-2 text-sm text-slate-400">Only visitors with a completed identity review appear. Activation requires a successful result from the authenticated scanner.</p><label className="mt-4 block text-sm">Visitor<select className="mt-2 w-full rounded border border-slate-700 bg-slate-900 p-3" value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy}><option value="">Choose a visitor awaiting enrollment</option>{visitors.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label><button className="mt-4 rounded-lg bg-blue-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={!selected||!online||busy} onClick={()=>{const id=crypto.randomUUID();setRequestId(id);setError('');setMessage('Place the visitor’s finger on the scanner.');setBusy(true);try{hardware.command('FINGERPRINT_ENROLL',{subjectType:'VISITOR',subjectId:selected},id);}catch(e){setBusy(false);setError(e.message);}}}>{busy?'Waiting for scanner…':'Enroll fingerprint and activate'}</button><p className="mt-3 text-xs">Scanner: {online?'Connected':'Offline'}</p>{message&&<p role="status" className="mt-3 text-sm">{message}</p>}{error&&<p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}</section>;
}
export function OfficerWorkspace({user}:{user:UserProfile}){
  const duties=user.officerDuties||[],[tab,setTab]=useState(duties[0]||'');
  useEffect(()=>setTab(duties[0]||''),[user.id,JSON.stringify(duties)]);
  return <div className="mx-auto max-w-7xl px-4 py-6 text-slate-100"><h1 className="text-2xl font-bold">Officer workspace</h1><p className="mt-2 text-sm text-slate-400">{user.firstName} {user.lastName} · {user.badgeNumber}</p><nav className="my-5 flex flex-wrap gap-2">{duties.map(d=><button key={d} className="rounded-lg border border-slate-700 px-4 py-2 text-sm" aria-pressed={tab===d} onClick={()=>setTab(d)}>{({GATE:'Gate and visits',RECORDS:'PDL records',IDENTITY_REVIEW:'Identity review',ENROLLMENT:'Fingerprint enrollment'})[d]||d}</button>)}</nav>{tab==='GATE'&&<WorkerDashboard user={user} mode="GATE"/>}{tab==='RECORDS'&&<WorkerDashboard user={user} mode="RECORDS"/>}{tab==='IDENTITY_REVIEW'&&<AdminKycPanel/>}{tab==='ENROLLMENT'&&<EnrollmentDesk/>}{!tab&&<p>No duties are assigned. Contact the Administrator.</p>}</div>;
}
