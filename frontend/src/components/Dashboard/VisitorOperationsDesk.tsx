import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, BookUser, CalendarDays, LogOut, RefreshCw, Search, ShieldAlert, UserRoundCheck } from 'lucide-react';
import { UserAddress, UserProfile } from '../../types';
import { api } from '../../services/api';
import { hardware } from '../../services/hardware';
import { alertAction, confirmAction } from '../../utils/appDialogs';
import { realtimeWS } from '../../services/websocket';
import { SignatureCapture } from '../Common/SignatureCapture';
import { generateQRCodeDataUrl } from '../../utils/qrGenerator';
import { AddressFields, addressFromSaved, formatAddress } from '../Common/AddressFields';
import { MobileInput, mobileDigits } from '../Common/IdentityFields';
import { FINGERPRINT_ENABLED } from '../../../../shared/hardware-features';

type Mode = 'PDL' | 'GUEST' | 'ACTIVE';
type Person = { fullName: string; gender: string; address: string; addressDetails: UserAddress; age: string; contactNumber: string };
const blank: Person = { fullName: '', gender: '', address: '', addressDetails: addressFromSaved(), age: '', contactNumber: '' };
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
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [recent, setRecent] = useState<any[]>([]);
  const [recentSearch, setRecentSearch] = useState('');
  const [appliedRecentSearch, setAppliedRecentSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setBusy] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState('');
  const pendingEnrollment = useRef('');
  const busy = saving || (FINGERPRINT_ENABLED && Boolean(enrollmentId));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [scanId, setScanId] = useState('');
  const pendingScan = useRef('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lookupVersion = useRef(0);
  const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900';

  const loadDesk = useCallback(async (historyQuery = appliedRecentSearch) => {
    try {
      const [activeRows, todayRows, recentRows] = await Promise.all([
        api.getActiveRecordVisits(), api.getTodayPdlVisitors(), api.getRecentRecordVisits(historyQuery),
      ]);
      setActive(activeRows);
      setToday(todayRows);
      setRecent(recentRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh visitor activity.');
    }
  }, [appliedRecentSearch]);
  useEffect(() => { void loadDesk(); }, [loadDesk]);
  useEffect(() => realtimeWS.on('VISITOR_LOGS_UPDATED', () => { void loadDesk(); }), [loadDesk]);

  useEffect(() => { if (mode === 'PDL') hardware.connect(); }, [mode]);

  const showScanError = useCallback((message: string) => {
    setError(message);
    void alertAction(message, { title: 'QR scan failed', tone: 'danger' });
  }, []);

  const choose = useCallback((row: any) => {
    setSelected(row);
    setPerson({ fullName: row.full_name || '', gender: row.gender || '', address: row.address || '', addressDetails: addressFromSaved(row.address || '', row.addressDetails), age: row.age == null ? '' : String(row.age), contactNumber: mobileDigits(row.contact_number || '') });
    setPdlId(''); setVerification(null); setSignature(''); setError(''); setNotice('');
  }, []);

  const findVisitor = useCallback(async (value: string, fromScanner = false) => {
    const version = ++lookupVersion.current;
    setSearchedQuery('');
    setError(''); setNotice(''); setSelected(null); setVerification(null);
    setResults([]);
    setLoading(false);
    if (fromScanner && !/^[a-f0-9]{64}$/.test(value.trim())) {
      showScanError('Invalid code. Scan a visitor QR issued by this system.');
      return;
    }
    if (value.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const matches = await api.searchVisitorRecords(value.trim(), fromScanner);
      if (version !== lookupVersion.current) return;
      setResults(matches);
      if (!fromScanner) setSearchedQuery(value.trim());
      if (fromScanner && !matches.length) showScanError('QR not recognized. No active visitor record matches this code.');
      if (fromScanner && matches.length === 1) {
        const visitor = matches[0];
        choose(visitor);
        if (visitor.facilityRestricted) {
          const message = `${visitor.full_name} has an active facility-wide restriction. Entry is not permitted.`;
          setError(message);
          void alertAction(message, { title: 'Visitor restricted', tone: 'danger' });
        } else {
          const message = `Visitor record found for ${visitor.full_name}. Choose a PDL to verify authorization and today's schedule.`;
          setNotice(message);
          void alertAction(message, { title: 'Visitor QR found', tone: 'success' });
        }
      }
    }
    catch (e) {
      if (version === lookupVersion.current) {
        const message = e instanceof Error ? e.message : 'Visitor search failed.';
        if (fromScanner) showScanError(message); else setError(message);
      }
    }
    finally { if (version === lookupVersion.current) setLoading(false); }
  }, [choose, showScanError]);
  useEffect(() => () => {
    clearTimeout(searchTimer.current);
    ++lookupVersion.current;
  }, []);
  const updateQuery = (value: string) => {
    clearTimeout(searchTimer.current);
    ++lookupVersion.current;
    setQuery(value);
    setSearchedQuery('');
    setResults([]); setSelected(null); setVerification(null);
    setError(''); setNotice(''); setLoading(false);
    if (value.trim().length >= 2) searchTimer.current = setTimeout(() => void findVisitor(value), 300);
  };
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    clearTimeout(searchTimer.current);
    if (!busy && !scanId) void findVisitor(query);
  };
  useEffect(() => {
    const unsubscribe = hardware.onEvent(event => {
      if (FINGERPRINT_ENABLED && pendingEnrollment.current && event.requestId === pendingEnrollment.current) {
        if (event.type === 'FINGERPRINT_ENROLLED' || event.type === 'DEVICE_ERROR') {
          pendingEnrollment.current = '';
          setEnrollmentId('');
          if (event.type === 'FINGERPRINT_ENROLLED') {
            setSelected(row => row && { ...row, has_fingerprint: true });
            setResults(rows => rows.map(row => row.id === selected?.id ? { ...row, has_fingerprint: true } : row));
            setNotice('Fingerprint enrolled for this visitor.');
          } else {
            setNotice('');
            setError(String(event.payload.message || 'Fingerprint enrollment failed.'));
          }
        }
        return;
      }
      const requestId = pendingScan.current;
      if (!requestId) return;
      if (event.type === 'DEVICE_STATUS' && event.payload.connected === false) {
        pendingScan.current = '';
        setScanId('');
        showScanError('The ESP32 QR scanner is offline.');
        return;
      }
      if (event.requestId !== requestId) return;
      if (event.type === 'DEVICE_ERROR') {
        pendingScan.current = '';
        setScanId('');
        showScanError(String(event.payload.message || 'QR scan failed.'));
      }
      if (event.type === 'QR_SCANNED') {
        pendingScan.current = '';
        setScanId('');
        const code = String(event.payload.code || '').trim();
        setQuery('');
        void findVisitor(code, true);
      }
    });
    return () => { unsubscribe(); };
  }, [findVisitor, selected?.id, showScanError]);
  useEffect(() => {
    if (!FINGERPRINT_ENABLED || !enrollmentId) return;
    const timeout = setTimeout(() => {
      pendingEnrollment.current = '';
      setEnrollmentId('');
      setNotice('');
      setError('No enrollment confirmation received. Search for the visitor again to refresh enrollment status.');
    }, 90000);
    return () => clearTimeout(timeout);
  }, [enrollmentId]);
  useEffect(() => {
    if (!scanId) return;
    const timeout = setTimeout(() => {
      if (pendingScan.current !== scanId) return;
      pendingScan.current = '';
      setScanId('');
      showScanError('The scanner did not send a result. Check the ESP32 connection and try again.');
    }, 23000);
    return () => clearTimeout(timeout);
  }, [scanId, showScanError]);
  const scanQr = () => {
    clearTimeout(searchTimer.current);
    setSearchedQuery('');
    setError(''); setNotice(''); setResults([]); setSelected(null); setVerification(null);
    try {
      const requestId = crypto.randomUUID();
      pendingScan.current = requestId;
      hardware.command('QR_SCAN_START', {}, requestId);
      setScanId(requestId);
    } catch (e) {
      pendingScan.current = '';
      showScanError(e instanceof Error ? e.message : 'Could not start QR scan.');
    }
  };
  const switchMode = (next: Mode) => {
    pendingScan.current = '';
    clearTimeout(searchTimer.current);
    ++lookupVersion.current;
    setScanId('');
    setLoading(false);
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
      void alertAction(result.message, {
        title: result.allowed ? 'Visitor authorized' : 'Entry blocked',
        tone: result.allowed ? 'success' : 'danger',
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not verify visitor authorization.'); }
    finally { setBusy(false); }
  };
  const printId = async () => {
    if (!selected || (mode === 'PDL' && !verification?.allowed)) return;
    const w = window.open('', '_blank', 'width=720,height=520');
    if (!w) { setError('Allow the print window to open, then try again.'); return; }
    setBusy(true); setError('');
    try {
      const row = mode === 'PDL'
        ? await api.requestWorkerVisitorQr(String(selected.id), pdlId)
        : await api.getVisitorQrIdentity(String(selected.id), 'worker');
      if (mode === 'PDL') {
        setSelected(current => ({ ...current, has_qr_identity: true }));
        setResults(rows => rows.map(result => result.id === selected.id ? { ...result, has_qr_identity: true } : result));
      }
      const qr = await generateQRCodeDataUrl(row.qr_token);
      w.document.write(`<!doctype html><html><head><title>${esc(row.visitor_code)} Visitor ID</title><style>@page{size:85mm 54mm;margin:0}*{box-sizing:border-box}body{margin:0;font:12px Arial;color:#111}.card{width:85mm;height:54mm;padding:5mm;border:1px solid #172554;display:grid;grid-template-columns:1fr 28mm;gap:3mm;align-items:center}.brand{font-size:10px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#1e3a8a}.name{font-size:17px;font-weight:bold;margin:5mm 0 2mm}.detail{font-size:10px;margin-top:2mm}.qr{width:28mm;height:28mm}</style></head><body><article class="card"><section><div class="brand">BJMP Bacoor · Visitor Identification</div><div class="name">${esc(row.full_name)}</div><strong>${esc(row.visitor_code)}</strong><div class="detail">${esc(row.gender)} · Age ${esc(row.age)}</div><div class="detail">${esc(row.address)}</div></section><img class="qr" src="${qr}" alt="QR"></article><script>window.onload=()=>window.print()</script></body></html>`);
      w.document.close();
    } catch (e) {
      w.close();
      setError(e instanceof Error ? e.message : 'Could not retrieve the visitor ID.');
    }
    finally { setBusy(false); }
  };
  const enrollFingerprint = () => {
    // Retained for future use. The shared feature flag disables this operation.
    if (!FINGERPRINT_ENABLED) return;
    if (!selected || !verification?.allowed || selected.has_fingerprint || busy || scanId) return;
    if (!window.confirm(`Have you checked the original ID and confirmed it belongs to ${selected.full_name}?`)) return;
    setError(''); setNotice('');
    const requestId = crypto.randomUUID();
    pendingEnrollment.current = requestId;
    try {
      hardware.command('FINGERPRINT_ENROLL', { visitorId: String(selected.id), pdlId }, requestId);
      setEnrollmentId(requestId);
      setNotice('Place the visitor’s finger on the scanner, lift it, then scan the same finger again when prompted.');
    } catch (e) {
      pendingEnrollment.current = '';
      setError(e instanceof Error ? e.message : 'Could not start fingerprint enrollment.');
    }
  };
  const checkIn = async () => {
    if (!signature) { setError('Capture the visitor signature before check-in.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'PDL') {
        if (!selected || !pdlId || !verification?.allowed) throw new Error('Verify an approved PDL visitor and assigned visitation day first.');
        const result = await api.checkInPdlVisitor({ visitorId: String(selected.id), pdlId, signatureData: signature });
        setNotice(`${selected.full_name} checked in to visit ${verification.pdl.pdl_name} at ${new Date(result.timeIn).toLocaleTimeString()}.`);
        setVerification(null);
      } else {
        if (!purpose.trim()) throw new Error('Enter the purpose of visit.');
        const result = await api.checkInGuestVisitor({ visitorId: selected ? String(selected.id) : undefined, ...person, address: formatAddress(person.addressDetails), contactNumber: person.contactNumber ? `+63${person.contactNumber}` : '', age: Number(person.age), purposeOfVisit: purpose, signatureData: signature });
        setNotice(`Guest Visitor checked in. Visitor ID: ${result.visitorCode}.`);
        if (!selected) { setQuery(result.visitorCode); setResults([]); }
      }
      setSignature(''); setPurpose(''); await loadDesk();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not record the check-in.'); }
    finally { setBusy(false); }
  };
  const checkout = async (row: any) => {
    const type = row.visit_type === 'PDL Visitor' ? 'PDL' : 'GUEST';
    if (!await confirmAction(`Record check-out for ${row.visitor_name}?`, { title: 'Confirm visitor check-out', confirmLabel: 'Record check-out', tone: 'warning' })) return;
    setBusy(true); setError(''); setNotice('');
    try { await api.checkOutRecordVisit(type, String(row.id)); setNotice(`${row.visit_type} check-out recorded.`); await loadDesk(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not record the check-out.'); }
    finally { setBusy(false); }
  };
  const personFields = (readOnly: boolean) => <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm">Name of visitor<input required readOnly={readOnly} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.fullName} onChange={e => setPerson({ ...person, fullName: e.target.value })}/></label>
    <label className="text-sm">Gender<select required disabled={readOnly} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.gender} onChange={e => setPerson({ ...person, gender: e.target.value })}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>{person.gender && !['Male', 'Female', 'Other'].includes(person.gender) && <option value={person.gender}>{person.gender}</option>}</select></label>
    {readOnly ? <label className="text-sm sm:col-span-2">Address<textarea required readOnly rows={2} className={`${input} bg-slate-50`} value={person.address}/></label> : <div className="sm:col-span-2"><AddressFields value={person.addressDetails} onChange={addressDetails => setPerson(current => ({ ...current, addressDetails, address: formatAddress(addressDetails) }))} legend="Visitor residential address *" className={input}/></div>}
    <label className="text-sm">Age<input required type="number" min="0" max="125" readOnly={readOnly} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.age} onChange={e => setPerson({ ...person, age: e.target.value })}/></label>
    <label className="text-sm">Mobile number<MobileInput required readOnly={readOnly} className={`${input} ${readOnly ? 'bg-slate-50' : ''}`} value={person.contactNumber} onChange={contactNumber => setPerson(current => ({ ...current, contactNumber }))}/></label>
  </div>;
  const approvedAssignments = (selected?.assignments || []).filter((assignment: any) => assignment.status === 'APPROVED' && !assignment.pdl_archived && assignment.pdl_status === 'In Custody');
  const activeVisit = selected ? active.find(row => String(row.visitor_record_id) === String(selected.id)) : undefined;
  const scheduleTerm = scheduleSearch.trim().toLowerCase();
  const pdlScheduleGroups: any[] = Object.values((today.visits || []).reduce((groups: Record<string, any>, row: any) => {
    const key = String(row.pdl_id || row.pdl_number || row.pdl_name);
    if (!groups[key]) groups[key] = { id: key, name: row.pdl_name, number: row.pdl_number, visitors: [] };
    groups[key].visitors.push(row);
    return groups;
  }, {} as Record<string, any>));
  const filteredPdlSchedule = pdlScheduleGroups.filter(group => `${group.name || ''} ${group.number || ''}`.toLowerCase().includes(scheduleTerm));

  return <main className="visitor-operations-desk min-h-screen bg-slate-100 px-4 py-7 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Visitor verification and gate logs</p><h1 className="mt-1 text-3xl font-extrabold text-slate-900">Worker Desk</h1><p className="mt-1 text-sm text-slate-600">Welcome, {user.firstName}. Record each visit on its separate form.</p></div><button type="button" onClick={() => window.location.reload()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"><RefreshCw size={15}/>Refresh</button></header>
      <nav className="flex flex-wrap gap-2" aria-label="Visitor workflows"><button disabled={busy || loading} aria-pressed={mode === 'PDL'} onClick={() => switchMode('PDL')} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'PDL' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}>PDL Visitation</button><button disabled={busy || loading} aria-pressed={mode === 'GUEST'} onClick={() => switchMode('GUEST')} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'GUEST' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}>Jail / Guest Visitor</button><button disabled={busy || loading} aria-pressed={mode === 'ACTIVE'} onClick={() => switchMode('ACTIVE')} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'ACTIVE' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}>Active Visitors</button></nav>
      <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">Currently checked in</span><strong className="mt-1 block text-2xl">{active.length}</strong></div><div className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">PDL Visitor entries</span><strong className="mt-1 block text-2xl">{active.filter(x => x.visit_type === 'PDL Visitor').length}</strong></div><div className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">Guest Visitor entries</span><strong className="mt-1 block text-2xl">{active.filter(x => x.visit_type === 'Guest Visitor').length}</strong></div></section>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {mode === 'ACTIVE' && <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Active check-ins</h2><p className="text-xs text-slate-500">Find someone currently checked in, then record their time out.</p></div><label className="w-full text-xs font-semibold text-slate-700 sm:w-72">Find checked-in visitor<input type="search" value={activeSearch} onChange={e => setActiveSearch(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" placeholder="Visitor name, ID, contact, or PDL"/></label></div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Type / visitor</th><th className="p-3">PDL / purpose</th><th className="p-3">Date and time in</th><th className="p-3">Time out</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{active.filter(row => `${row.visitor_name} ${row.visitor_code || ''} ${row.contact_number || ''} ${row.pdl_name || ''} ${row.purpose_of_visit || ''}`.toLowerCase().includes(activeSearch.trim().toLowerCase())).map(row => <tr key={`${row.visit_type}-${row.id}`}><td className="p-3"><strong>{row.visit_type}</strong><span className="block">{row.visitor_name}</span><span className="block text-xs text-slate-500">{row.visitor_code} · {row.contact_number}</span></td><td className="p-3">{row.pdl_name || row.purpose_of_visit || '—'}<span className="block text-xs text-slate-500">{row.relationship || row.cell_number || ''}</span></td><td className="p-3">{String(row.visit_date).slice(0, 10)}<span className="block text-xs text-slate-500">{new Date(row.time_in).toLocaleTimeString()}</span></td><td className="p-3">—</td><td className="p-3"><button onClick={() => void checkout(row)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><LogOut size={13}/>Check out</button></td></tr>)}{active.length > 0 && !active.some(row => `${row.visitor_name} ${row.visitor_code || ''} ${row.contact_number || ''} ${row.pdl_name || ''} ${row.purpose_of_visit || ''}`.toLowerCase().includes(activeSearch.trim().toLowerCase())) && <tr><td colSpan={5} className="p-5 text-center text-slate-500">No active visitors match that name.</td></tr>}{!active.length && <tr><td colSpan={5} className="p-5 text-center text-slate-500">No visitors are currently checked in.</td></tr>}</tbody></table></div></section>}
      {mode !== 'ACTIVE' && <section className="grid gap-5 lg:grid-cols-[minmax(300px,.8fr)_minmax(400px,1.2fr)]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><div><h2 className="text-lg font-bold">Find visitor to check in</h2><p className="mt-1 text-xs text-slate-500">Look up an existing visitor record by name or Visitor ID, or scan their QR token.</p></div>{mode === 'PDL' && <button type="button" onClick={scanQr} disabled={busy || Boolean(scanId) || loading} className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">{scanId ? 'Waiting for QR…' : 'Scan QR'}</button>}<form onSubmit={search} className="flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-semibold text-slate-700">Visitor name, ID, or QR<input value={query} disabled={busy || Boolean(scanId)} onChange={e => updateQuery(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Enter visitor name or ID, or scan QR"/></label><button disabled={busy || Boolean(scanId) || loading} className="rounded-lg bg-blue-700 px-3 text-white disabled:opacity-50"><Search size={17}/><span className="sr-only">Search visitors</span></button></form>{loading && <p className="text-xs text-slate-500">Searching…</p>}
          <div className="max-h-[420px] space-y-2 overflow-auto">{results.map(row => <button key={row.id} disabled={busy || loading || Boolean(scanId)} onClick={() => choose(row)} className={`w-full rounded-lg border p-3 text-left ${String(selected?.id) === String(row.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}><span className="flex items-center justify-between gap-2"><strong>{row.full_name}</strong>{row.facilityRestricted ? <ShieldAlert size={16} className="text-rose-700"/> : row.has_qr_identity ? <BadgeCheck size={16} className="text-emerald-700"/> : null}</span><span className="block text-xs text-slate-500">{row.visitor_code} · {row.gender} · Age {row.age ?? '—'}</span>{row.facilityRestricted && <span className="mt-1 block text-xs font-bold text-rose-700">FACILITY-WIDE RESTRICTION</span>}</button>)}{searchedQuery === query.trim() && searchedQuery.length > 1 && !loading && !results.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No visitor record found.</p>}</div>
        </div>
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">{mode === 'PDL' ? 'PDL Visitor form' : 'Jail Visitor form'}</p><h2 className="mt-1 text-lg font-bold">{mode === 'PDL' ? 'Check in an approved PDL Visitor' : 'Register or retrieve a Guest Visitor'}</h2></div>{mode === 'GUEST' && selected && <button type="button" onClick={() => void printId()} disabled={busy || !selected.has_qr_identity} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-40"><BookUser size={14}/>Print existing ID</button>}</div>
          {mode === 'PDL' && <>
            {!selected && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Select the visitor record first. Only an active approved PDL assignment can be checked in.</p>}
            {selected && <><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{selected.full_name} · {selected.visitor_code}</strong><span className={selected.has_qr_identity ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-rose-700'}>{selected.has_qr_identity ? 'QR identity exists' : 'No approved PDL QR identity'}</span></div>{selected.facilityRestricted && <p className="mt-2 text-sm font-bold text-rose-700">FACILITY-WIDE RESTRICTION: Entry is not permitted.</p>}</div>
              <fieldset className="space-y-2" disabled={busy || Boolean(activeVisit)}>
                <legend className="text-sm font-bold text-slate-900">Approved PDLs and visiting days</legend>
                {approvedAssignments.length === 0 && <p className="text-sm text-slate-600">This visitor has no current approved PDL assignments.</p>}
                {approvedAssignments.map((assignment: any) => (
                  <label key={assignment.pdl_id} className="flex items-start gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900">
                    <input type="radio" name="worker-desk-pdl" className="mt-1" checked={String(assignment.pdl_id) === pdlId}
                      disabled={Boolean(assignment.restricted || selected.facilityRestricted)}
                      onChange={() => { setPdlId(String(assignment.pdl_id)); setVerification(null); setError(''); setNotice(''); }} />
                    <span>
                      <strong className="block text-sm">{assignment.pdl_name}</strong>
                      <span className="block text-xs text-slate-600">{assignment.relationship} · {assignment.weekday == null ? 'Visiting day not assigned' : `Every ${weekdays[Number(assignment.weekday)]}`}</span>
                      {(assignment.restricted || selected.facilityRestricted) && <span className="block text-xs font-bold text-rose-700">Entry restricted</span>}
                    </span>
                  </label>
                ))}
              </fieldset>
              {activeVisit && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900">
                <span className="text-sm">Checked in{activeVisit.pdl_name ? ` to visit ${activeVisit.pdl_name}` : ' as a guest'}.</span>
                <button type="button" onClick={() => void checkout(activeVisit)} disabled={busy} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-900 disabled:opacity-40">Check out</button>
              </div>}
              <button type="button" onClick={() => void verify()} disabled={busy || !pdlId || Boolean(activeVisit)} className="inline-flex items-center gap-2 rounded-lg border border-blue-700 px-3 py-2 text-sm font-bold text-blue-800 disabled:opacity-40"><UserRoundCheck size={16}/>Verify authorization and schedule</button>
              {verification && <div className={`rounded-lg p-3 text-sm ${verification.allowed ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}><strong>{verification.code}</strong><p className="mt-1">{verification.message}</p>{verification.pdl?.weekday != null && <p className="mt-1 text-xs">Assigned visitation day: {weekdays[verification.pdl.weekday]}</p>}{verification.pdl && <p className="mt-1 text-xs">PDL: {verification.pdl.pdl_name || '—'} · Cell: {verification.pdl.cell_dormitory || '—'} · Relationship: {verification.pdl.relationship || '—'}</p>}{verification.otherApprovedPdls?.length > 0 && <p className="mt-1 text-xs">Other PDL approvals remain separate and may still be valid.</p>}</div>}
              {verification?.allowed && <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void printId()} disabled={busy || Boolean(scanId)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">
                  <BookUser size={14}/>Print visitor QR ID
                </button>
                {FINGERPRINT_ENABLED && (selected.has_fingerprint
                  ? <span className="text-sm font-semibold text-emerald-700">Fingerprint enrolled</span>
                  : <button type="button" onClick={enrollFingerprint} disabled={busy || Boolean(scanId)} className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-800 disabled:opacity-40">
                      {enrollmentId ? 'Waiting for fingerprint…' : 'Enroll fingerprint'}
                    </button>)}
              </div>}
              <div className="rounded-lg border border-slate-200 p-3 text-sm"><strong>Registration details</strong><div className="mt-2 grid gap-1 text-slate-600 sm:grid-cols-2"><span>Gender: {person.gender || '—'}</span><span>Age: {person.age || '—'}</span><span className="sm:col-span-2">Address: {person.address || '—'}</span><span>Contact: {person.contactNumber || '—'}</span><span>Relationship: {selected.assignments?.find((a: any) => String(a.pdl_id) === pdlId)?.relationship || '—'}</span></div></div>
            </>}
          </>}
          {mode === 'GUEST' && <><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setSelected(null); setPerson(blank); setSignature(''); }} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold">Register new Guest Visitor</button>{selected && <span className="self-center text-xs text-slate-500">Using {selected.full_name} · {selected.visitor_code}</span>}</div>{selected?.facilityRestricted && <p className="rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-800">FACILITY-WIDE RESTRICTION: Entry is not permitted.</p>}{personFields(Boolean(selected))}<label className="block text-sm">Purpose of visit<input required maxLength={255} className={input} value={purpose} onChange={e => setPurpose(e.target.value)}/></label></>}
          {((mode === 'PDL' && selected) || mode === 'GUEST') && <><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Today’s date and time in are recorded automatically when check-in is confirmed. In Active Visitors, search the visitor’s name and select Check out when they leave.</div><SignatureCapture value={signature} onChange={setSignature} label="Visitor signature"/></>}
          {mode === 'PDL' && selected && <button onClick={() => void checkIn()} disabled={busy || Boolean(activeVisit) || !verification?.allowed || !signature} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><CalendarDays className="mr-2 inline" size={16}/>{busy ? 'Saving…' : 'Confirm PDL Visitor check-in'}</button>}
          {mode === 'GUEST' && <button onClick={() => void checkIn()} disabled={busy || !person.fullName || !person.gender || !person.address || !person.age || !person.contactNumber || !signature || !purpose.trim() || Boolean(selected?.facilityRestricted)} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Confirm Guest Visitor check-in'}</button>}
        </div>
      </section>}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Today’s PDL visitation schedule</h2>
            <p className="text-sm text-slate-500">{today.date} · {weekdays[today.weekday] || 'Today'} · {scheduleTerm ? `Showing ${filteredPdlSchedule.length} of ${pdlScheduleGroups.length}` : pdlScheduleGroups.length} PDL(s) scheduled today</p>
          </div>
          <label className="w-full text-xs font-semibold text-slate-700 sm:w-72">Find a PDL<input type="search" value={scheduleSearch} onChange={e => setScheduleSearch(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" placeholder="PDL name or PDL ID"/></label>
        </div>
        <div className="mt-3 space-y-2">
          {filteredPdlSchedule.map(group => <details key={group.id} className="rounded-lg border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
              <span><strong className="block">{group.name}</strong><span className="text-xs text-slate-500">PDL ID: {group.number || '—'}</span></span>
              <span className="text-xs font-semibold text-blue-800">{group.visitors.length} approved visitor(s) · click to view</span>
            </summary>
            <div className="border-t border-slate-200 p-3">
              <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Approved visitor</th><th className="p-3">Relationship</th><th className="p-3">Entry status</th></tr></thead><tbody className="divide-y divide-slate-100">{group.visitors.map((row: any) => <tr key={row.id}><td className="p-3">{row.visitor_name}<span className="block text-xs text-slate-500">{row.visitor_code}</span></td><td className="p-3">{row.relationship || '—'}</td><td className="p-3">{row.facilityRestricted ? <strong className="text-rose-700">Facility restriction</strong> : row.restricted ? <strong className="text-rose-700">Restricted for this PDL</strong> : <span className="text-emerald-700">Approved for today</span>}</td></tr>)}</tbody></table></div>
            </div>
          </details>)}
          {!filteredPdlSchedule.length && <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">{scheduleTerm && pdlScheduleGroups.length ? 'No PDLs match your search.' : 'No PDL visitors are scheduled for today.'}</p>}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Recent visitor transactions</h2><p className="text-xs text-slate-500">Search saved check-in and check-out records by name, Visitor ID, contact, PDL, purpose, or date.</p></div><form onSubmit={e=>{e.preventDefault();setAppliedRecentSearch(recentSearch)}} className="flex gap-2"><label className="text-xs font-semibold text-slate-700">Search visit history<input value={recentSearch} onChange={e=>setRecentSearch(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" placeholder="Name, ID, PDL, or date"/></label><button className="self-end rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Search</button></form></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Type / visitor</th><th className="p-3">PDL / purpose</th><th className="p-3">Time in</th><th className="p-3">Time out</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{recent.slice(0, 100).map(row => <tr key={`${row.visit_type}-${row.id}`}><td className="p-3"><strong>{row.visit_type}</strong><span className="block">{row.visitor_name}</span><span className="block text-xs text-slate-500">{row.visitor_code}</span></td><td className="p-3">{row.pdl_name || row.purpose_of_visit || '—'}<span className="block text-xs text-slate-500">{row.relationship || row.cell_number || ''}</span></td><td className="p-3">{new Date(row.time_in).toLocaleString()}</td><td className="p-3">{row.time_out ? new Date(row.time_out).toLocaleString() : '—'}</td><td className="p-3">{row.time_out ? 'Checked out' : 'Currently inside'}</td></tr>)}{!recent.length && <tr><td colSpan={5} className="p-4 text-center text-slate-500">{appliedRecentSearch.trim()?'No visitor transactions match that search.':'No visitor transactions have been recorded.'}</td></tr>}</tbody></table></div></section>
    </div>
  </main>;
}
