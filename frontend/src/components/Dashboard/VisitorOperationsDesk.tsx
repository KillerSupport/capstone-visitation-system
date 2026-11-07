import React, { useEffect, useState } from 'react';
import { BadgeCheck, BookUser, CalendarDays, LogOut, RefreshCw, Search, ShieldAlert, UserRoundCheck } from 'lucide-react';
import { UserProfile } from '../../types';
import { api } from '../../services/api';
import { SignatureCapture } from '../Common/SignatureCapture';
import { generateQRCodeDataUrl } from '../../utils/qrGenerator';

type Mode = 'PDL' | 'GUEST' | 'ACTIVE';
type Person = { fullName: string; gender: string; address: string; age: string; contactNumber: string };
const blank: Person = { fullName: '', gender: '', address: '', age: '', contactNumber: '' };
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function VisitorOperationsDesk({ user }: { user: UserProfile }) {
  const [mode, setMode] = useState<Mode>('PDL');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pdlId, setPdlId] = useState('');
  const [verification, setVerification] = useState<any>(null);
  const [person, setPerson] = useState<Person>(blank);
  const [purpose, setPurpose] = useState('');
  const [signature, setSignature] = useState('');
  const [active, setActive] = useState<any[]>([]);
  const [activeSearch, setActiveSearch] = useState('');
  const [today, setToday] = useState<any>({ date: '', weekday: 0, visits: [] });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900';

  const loadDesk = async () => {
    try {
      const [activeRows, todayRows, recentRows] = await Promise.all([
        api.getActiveRecordVisits(), api.getTodayPdlVisitors(), api.getRecentRecordVisits(),
      ]);
      setActive(activeRows);
      setToday(todayRows);
      setRecent(recentRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh visitor activity.');
    }
  };
  useEffect(() => { void loadDesk(); }, []);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(''); setNotice(''); setSelected(null); setVerification(null);
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try { setResults(await api.searchVisitorRecords(query.trim())); }
    catch (e) { setError(e instanceof Error ? e.message : 'Visitor search failed.'); }
    finally { setLoading(false); }
  };
  const choose = (row: any) => {
    setSelected(row);
    setPerson({ fullName: row.full_name || '', gender: row.gender || '', address: row.address || '', age: row.age == null ? '' : String(row.age), contactNumber: row.contact_number || '' });
    setPdlId(''); setVerification(null); setSignature(''); setError(''); setNotice('');
  };
  const switchMode = (next: Mode) => {
    setMode(next); setSelected(null); setVerification(null); setSignature(''); setPurpose('');
    setPerson(blank); setError(''); setNotice('');
  };
  const verify = async () => {
    if (!selected || !pdlId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api.verifyVisitorForPdl(String(selected.id), pdlId);
      setVerification(result);
      if (result.allowed) setNotice(result.message); else setError(result.message);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not verify visitor authorization.'); }
    finally { setBusy(false); }
  };
  const printId = async () => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const row = await api.getVisitorQrIdentity(String(selected.id), 'worker');
      const qr = await generateQRCodeDataUrl(row.qr_token);
      const w = window.open('', '_blank', 'width=720,height=520');
      if (!w) throw new Error('Allow the print window to open, then try again.');
      w.document.write(`<!doctype html><html><head><title>${esc(row.visitor_code)} Visitor ID</title><style>@page{size:85mm 54mm;margin:0}*{box-sizing:border-box}body{margin:0;font:12px Arial;color:#111}.card{width:85mm;height:54mm;padding:5mm;border:1px solid #172554;display:grid;grid-template-columns:1fr 28mm;gap:3mm;align-items:center}.brand{font-size:10px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#1e3a8a}.name{font-size:17px;font-weight:bold;margin:5mm 0 2mm}.detail{font-size:10px;margin-top:2mm}.qr{width:28mm;height:28mm}</style></head><body><article class="card"><section><div class="brand">BJMP Bacoor · Visitor Identification</div><div class="name">${esc(row.full_name)}</div><strong>${esc(row.visitor_code)}</strong><div class="detail">${esc(row.gender)} · Age ${esc(row.age)}</div><div class="detail">${esc(row.address)}</div></section><img class="qr" src="${qr}" alt="QR"></article><script>window.onload=()=>window.print()</script></body></html>`);
      w.document.close();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not retrieve the visitor ID.'); }
    finally { setBusy(false); }
  };
  const checkIn = async () => {
    if (!signature) { setError('Capture the visitor signature before check-in.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'PDL') {
        if (!selected || !pdlId || !verification?.allowed) throw new Error('Verify an approved PDL visitor and assigned visitation day first.');
        const result = await api.checkInPdlVisitor({ visitorId: String(selected.id), pdlId, signatureData: signature });
        setNotice(`PDL Visitor checked in at ${new Date(result.timeIn).toLocaleTimeString()}.`);
      } else {
        if (!purpose.trim()) throw new Error('Enter the purpose of visit.');
        const result = await api.checkInGuestVisitor({ visitorId: selected ? String(selected.id) : undefined, ...person, age: Number(person.age), purposeOfVisit: purpose, signatureData: signature });
        setNotice(`Guest Visitor checked in. Visitor ID: ${result.visitorCode}.`);
        if (!selected) { setQuery(result.visitorCode); setResults([]); }
      }
      setSignature(''); setPurpose(''); await loadDesk();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not record the check-in.'); }
    finally { setBusy(false); }
  };
  const checkout = async (row: any) => {
    const type = row.visit_type === 'PDL Visitor' ? 'PDL' : 'GUEST';
    if (!window.confirm(`Record check-out for ${row.visitor_name}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try { await api.checkOutRecordVisit(type, String(row.id)); setNotice(`${row.visit_type} check-out recorded.`); await loadDesk(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not record the check-out.'); }
    finally { setBusy(false); }
  };
  const personFields = (readOnly: boolean) => <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm">Name of visitor<input required readOnly={readOnly} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.fullName} onChange={e => setPerson({ ...person, fullName: e.target.value })}/></label>
    <label className="text-sm">Gender<select required disabled={readOnly} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.gender} onChange={e => setPerson({ ...person, gender: e.target.value })}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>{person.gender && !['Male', 'Female', 'Other'].includes(person.gender) && <option value={person.gender}>{person.gender}</option>}</select></label>
    <label className="text-sm sm:col-span-2">Address<textarea required readOnly={readOnly} rows={2} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.address} onChange={e => setPerson({ ...person, address: e.target.value })}/></label>
    <label className="text-sm">Age<input required type="number" min="0" max="125" readOnly={readOnly} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.age} onChange={e => setPerson({ ...person, age: e.target.value })}/></label>
    <label className="text-sm">Contact number<input required type="tel" inputMode="tel" autoComplete="tel" maxLength={50} readOnly={readOnly} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.contactNumber} onChange={e => setPerson({ ...person, contactNumber: e.target.value })}/></label>
  </div>;

  return <main className="visitor-operations-desk min-h-screen bg-slate-100 px-4 py-7 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Visitor verification and gate logs</p><h1 className="mt-1 text-3xl font-extrabold">Worker Desk</h1><p className="mt-1 text-sm text-slate-600">Welcome, {user.firstName}. Record each visit on its separate form.</p></div><button onClick={() => void loadDesk()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><RefreshCw size={15}/>Refresh</button></header>
      <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">Currently checked in</span><strong className="mt-1 block text-2xl">{active.length}</strong></div><div className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">PDL Visitor entries</span><strong className="mt-1 block text-2xl">{active.filter(x => x.visit_type === 'PDL Visitor').length}</strong></div><div className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">Guest Visitor entries</span><strong className="mt-1 block text-2xl">{active.filter(x => x.visit_type === 'Guest Visitor').length}</strong></div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-bold">Today’s PDL visitation schedule</h2><p className="text-sm text-slate-500">{today.date} · {weekdays[today.weekday] || 'Today'} · {today.visits.length} approved visitor assignment(s)</p></div></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">PDL / cell</th><th className="p-3">Approved visitor</th><th className="p-3">Relationship</th><th className="p-3">Entry status</th></tr></thead><tbody className="divide-y divide-slate-100">{today.visits.map((row: any) => <tr key={row.id}><td className="p-3">{row.pdl_name}<span className="block text-xs text-slate-500">{row.pdl_number} · Cell {row.cell_dormitory || '—'}</span></td><td className="p-3">{row.visitor_name}<span className="block text-xs text-slate-500">{row.visitor_code}</span></td><td className="p-3">{row.relationship}</td><td className="p-3">{row.facilityRestricted ? <strong className="text-rose-700">Facility restriction</strong> : row.restricted ? <strong className="text-rose-700">Restricted for this PDL</strong> : <span className="text-emerald-700">Scheduled today</span>}</td></tr>)}{!today.visits.length && <tr><td colSpan={4} className="p-4 text-center text-slate-500">No approved PDL visitors are scheduled for today.</td></tr>}</tbody></table></div></section>
      <nav className="flex flex-wrap gap-2" aria-label="Visitor workflows"><button onClick={() => switchMode('PDL')} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'PDL' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}>PDL Visitation</button><button onClick={() => switchMode('GUEST')} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'GUEST' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}>Jail / Guest Visitor</button><button onClick={() => switchMode('ACTIVE')} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'ACTIVE' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}>Active Visitors</button></nav>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {mode === 'ACTIVE' && <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Active check-ins</h2><p className="text-xs text-slate-500">Search for the visitor, then record their time out when they leave.</p></div><label className="w-full text-xs font-semibold text-slate-700 sm:w-72">Find visitor<input type="search" value={activeSearch} onChange={e => setActiveSearch(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" placeholder="Search visitor name"/></label></div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Type / visitor</th><th className="p-3">PDL / purpose</th><th className="p-3">Date and time in</th><th className="p-3">Time out</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{active.filter(row => `${row.visitor_name} ${row.pdl_name || ''} ${row.purpose_of_visit || ''}`.toLowerCase().includes(activeSearch.trim().toLowerCase())).map(row => <tr key={`${row.visit_type}-${row.id}`}><td className="p-3"><strong>{row.visit_type}</strong><span className="block">{row.visitor_name}</span></td><td className="p-3">{row.pdl_name || row.purpose_of_visit || '—'}<span className="block text-xs text-slate-500">{row.relationship || row.cell_number || ''}</span></td><td className="p-3">{String(row.visit_date).slice(0, 10)}<span className="block text-xs text-slate-500">{new Date(row.time_in).toLocaleTimeString()}</span></td><td className="p-3">—</td><td className="p-3"><button onClick={() => void checkout(row)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><LogOut size={13}/>Time out</button></td></tr>)}{active.length > 0 && !active.some(row => `${row.visitor_name} ${row.pdl_name || ''} ${row.purpose_of_visit || ''}`.toLowerCase().includes(activeSearch.trim().toLowerCase())) && <tr><td colSpan={5} className="p-5 text-center text-slate-500">No active visitors match that name.</td></tr>}{!active.length && <tr><td colSpan={5} className="p-5 text-center text-slate-500">No visitors are currently checked in.</td></tr>}</tbody></table></div></section>}
      {mode !== 'ACTIVE' && <section className="grid gap-5 lg:grid-cols-[minmax(300px,.8fr)_minmax(400px,1.2fr)]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><div><h2 className="text-lg font-bold">Search or scan Visitor ID / QR</h2><p className="mt-1 text-xs text-slate-500">Search by name or Visitor ID. A keyboard QR scanner can enter the secure QR token here.</p></div><form onSubmit={search} className="flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-semibold text-slate-700">Search by name, Visitor ID, or scan QR<input value={query} onChange={e => setQuery(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Enter a name or Visitor ID, or scan QR"/></label><button className="rounded-lg bg-blue-700 px-3 text-white"><Search size={17}/></button></form>{loading && <p className="text-xs text-slate-500">Searching…</p>}
          <div className="max-h-[420px] space-y-2 overflow-auto">{results.map(row => <button key={row.id} onClick={() => choose(row)} className={`w-full rounded-lg border p-3 text-left ${String(selected?.id) === String(row.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}><span className="flex items-center justify-between gap-2"><strong>{row.full_name}</strong>{row.facilityRestricted ? <ShieldAlert size={16} className="text-rose-700"/> : row.has_qr_identity ? <BadgeCheck size={16} className="text-emerald-700"/> : null}</span><span className="block text-xs text-slate-500">{row.visitor_code} · {row.gender} · Age {row.age ?? '—'}</span>{row.facilityRestricted && <span className="mt-1 block text-xs font-bold text-rose-700">FACILITY-WIDE RESTRICTION</span>}</button>)}{query.length > 1 && !loading && !results.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No visitor record found.</p>}</div>
        </div>
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">{mode === 'PDL' ? 'PDL Visitor form' : 'Jail Visitor form'}</p><h2 className="mt-1 text-lg font-bold">{mode === 'PDL' ? 'Check in an approved PDL Visitor' : 'Register or retrieve a Guest Visitor'}</h2></div>{selected && <button type="button" onClick={() => void printId()} disabled={busy || !selected.has_qr_identity} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-40"><BookUser size={14}/>Print existing ID</button>}</div>
          {mode === 'PDL' && <>
            {!selected && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Select the visitor record first. Only an active approved PDL assignment can be checked in.</p>}
            {selected && <><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{selected.full_name} · {selected.visitor_code}</strong><span className={selected.has_qr_identity ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-rose-700'}>{selected.has_qr_identity ? 'QR identity exists' : 'No approved PDL QR identity'}</span></div>{selected.facilityRestricted && <p className="mt-2 text-sm font-bold text-rose-700">FACILITY-WIDE RESTRICTION: Entry is not permitted.</p>}</div>
              <label className="block text-sm">Assigned PDL<select className={input} value={pdlId} onChange={e => { setPdlId(e.target.value); setVerification(null); }}><option value="">Choose approved PDL</option>{(selected.assignments || []).filter((a: any) => a.status === 'APPROVED').map((a: any) => <option key={a.pdl_id} value={a.pdl_id}>{a.pdl_name} · {a.relationship}{a.restricted ? ' · RESTRICTED' : ''}</option>)}</select></label>
              <button type="button" onClick={() => void verify()} disabled={busy || !pdlId} className="inline-flex items-center gap-2 rounded-lg border border-blue-700 px-3 py-2 text-sm font-bold text-blue-800 disabled:opacity-40"><UserRoundCheck size={16}/>Verify authorization and schedule</button>
              {verification && <div className={`rounded-lg p-3 text-sm ${verification.allowed ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}><strong>{verification.code}</strong><p className="mt-1">{verification.message}</p>{verification.pdl?.weekday != null && <p className="mt-1 text-xs">Assigned visitation day: {weekdays[verification.pdl.weekday]}</p>}{verification.pdl && <p className="mt-1 text-xs">PDL: {verification.pdl.pdl_name || '—'} · Cell: {verification.pdl.cell_dormitory || '—'} · Relationship: {verification.pdl.relationship || '—'}</p>}{verification.otherApprovedPdls?.length > 0 && <p className="mt-1 text-xs">Other PDL approvals remain separate and may still be valid.</p>}</div>}
              <div className="rounded-lg border border-slate-200 p-3 text-sm"><strong>Registration details</strong><div className="mt-2 grid gap-1 text-slate-600 sm:grid-cols-2"><span>Gender: {person.gender || '—'}</span><span>Age: {person.age || '—'}</span><span className="sm:col-span-2">Address: {person.address || '—'}</span><span>Contact: {person.contactNumber || '—'}</span><span>Relationship: {selected.assignments?.find((a: any) => a.pdl_id === pdlId)?.relationship || '—'}</span></div></div>
            </>}
          </>}
          {mode === 'GUEST' && <><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setSelected(null); setPerson(blank); setSignature(''); }} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold">Register new Guest Visitor</button>{selected && <span className="self-center text-xs text-slate-500">Using {selected.full_name} · {selected.visitor_code}</span>}</div>{selected?.facilityRestricted && <p className="rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-800">FACILITY-WIDE RESTRICTION: Entry is not permitted.</p>}{personFields(Boolean(selected))}<label className="block text-sm">Purpose of visit<input required maxLength={255} className={input} value={purpose} onChange={e => setPurpose(e.target.value)}/></label></>}
          {((mode === 'PDL' && selected) || mode === 'GUEST') && <><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Today’s date and time in are recorded automatically when check-in is confirmed. In Active Visitors, search the visitor’s name and select Time out when they leave.</div><SignatureCapture value={signature} onChange={setSignature} label="Visitor signature"/></>}
          {mode === 'PDL' && selected && <button onClick={() => void checkIn()} disabled={busy || !verification?.allowed || !signature} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><CalendarDays className="mr-2 inline" size={16}/>{busy ? 'Saving…' : 'Confirm PDL Visitor check-in'}</button>}
          {mode === 'GUEST' && <button onClick={() => void checkIn()} disabled={busy || !person.fullName || !person.gender || !person.address || !person.age || !person.contactNumber || !signature || !purpose.trim() || Boolean(selected?.facilityRestricted)} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Confirm Guest Visitor check-in'}</button>}
        </div>
      </section>}
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-3 text-lg font-bold">Recent visitor transactions</h2><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Type / visitor</th><th className="p-3">PDL / purpose</th><th className="p-3">Time in</th><th className="p-3">Time out</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{recent.slice(0, 10).map(row => <tr key={`${row.visit_type}-${row.id}`}><td className="p-3"><strong>{row.visit_type}</strong><span className="block">{row.visitor_name}</span></td><td className="p-3">{row.pdl_name || row.purpose_of_visit || '—'}<span className="block text-xs text-slate-500">{row.relationship || row.cell_number || ''}</span></td><td className="p-3">{new Date(row.time_in).toLocaleString()}</td><td className="p-3">{row.time_out ? new Date(row.time_out).toLocaleString() : '—'}</td><td className="p-3">{row.time_out ? 'Checked out' : 'Currently inside'}</td></tr>)}{!recent.length && <tr><td colSpan={5} className="p-4 text-center text-slate-500">No visitor transactions have been recorded.</td></tr>}</tbody></table></div></section>
    </div>
  </main>;
}
