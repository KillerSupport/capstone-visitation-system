import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { PDL } from '../../types';
import { api } from '../../services/api';
import { confirmAction } from '../../utils/appDialogs';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function AdminVisitationPanel({ pdls, onChanged }: { pdls: PDL[]; onChanged?: () => Promise<void> }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [pdlSearch, setPdlSearch] = useState('');
  const [selectedPdlId, setSelectedPdlId] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [weekday, setWeekday] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const input = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm';
  const loadSchedules = async () => setSchedules(await api.getAdminPdlSchedules());
  const loadDetail = async (pdlId: string) => {
    if (!pdlId) { setDetail(null); setDetailLoading(false); return; }
    setDetailLoading(true);
    try {
      const result = await api.getAdminPdlSchedule(pdlId);
      setDetail(result); setWeekday(result.pdl.weekday == null ? '' : String(result.pdl.weekday));
    } finally { setDetailLoading(false); }
  };
  useEffect(() => { void loadSchedules().catch(e => setError(e.message)); }, []);
  useEffect(() => { void loadDetail(selectedPdlId).catch(e => setError(e.message)); }, [selectedPdlId]);
  useEffect(() => { if (detail) detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [detail]);
  const searchTerm = pdlSearch.trim().toLowerCase();
  const visibleSchedules = schedules.filter(row => pdls.some(pdl => pdl.id === row.pdl_id) && (!searchTerm || `${row.pdl_name} ${row.pdl_number}`.toLowerCase().includes(searchTerm)));
  const activeAssignments = (detail?.assignments || []).filter((assignment: any) => assignment.status === 'APPROVED');
  const selectPdl = (pdlId: string) => { setSelectedPdlId(pdlId); setDetail(null); setReason(''); setMessage(''); setError(''); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPdlId || weekday === '') return;
    if (!await confirmAction(`Check-in authorization will use ${days[Number(weekday)]} immediately.`, { title: `Set visitation day to ${days[Number(weekday)]}?`, confirmLabel: 'Save visitation day', tone: 'warning' })) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api.saveAdminPdlSchedule(selectedPdlId, Number(weekday), reason);
      await Promise.all([loadSchedules(), loadDetail(selectedPdlId)]);
      await onChanged?.(); setReason(''); setMessage('PDL visitation day saved. Workers will verify this day during check-in.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the PDL schedule.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5 rounded-xl border border-slate-700 bg-slate-900 p-5">
    <header><h2 className="text-xl font-bold">PDL visitation schedules</h2><p className="mt-2 text-sm text-slate-400">Assign one weekly visitation day to each PDL. Worker check-in verifies the selected PDL’s day and active visitor approval.</p></header>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}{message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    <label className="block text-sm font-semibold">Search PDL by name or number<div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={pdlSearch} onChange={e => setPdlSearch(e.target.value)} placeholder="Type a PDL name or number" className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm font-normal text-[#26364a]"/></div></label>
    <div className="overflow-x-auto rounded-lg border border-slate-700"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="p-3">PDL</th><th className="p-3">Status</th><th className="p-3">Visitation day</th><th className="p-3">Approved visitors</th><th className="p-3">Updated</th></tr></thead><tbody className="divide-y divide-slate-800">{visibleSchedules.map(row => <tr key={row.pdl_id} role="button" tabIndex={0} aria-selected={selectedPdlId === row.pdl_id} className={`cursor-pointer ${selectedPdlId === row.pdl_id ? 'bg-blue-900/30' : 'hover:bg-slate-800'}`} onClick={() => selectPdl(row.pdl_id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPdl(row.pdl_id); } }}><td className="p-3">{row.pdl_name}<span className="block text-xs text-slate-500">{row.pdl_number}</span></td><td className="p-3">{row.status}</td><td className="p-3">{row.weekday == null ? 'Not assigned' : days[row.weekday]}</td><td className="p-3">{row.approved_count} / 7</td><td className="p-3 text-xs">{row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}</td></tr>)}{!visibleSchedules.length && <tr><td colSpan={5} className="p-4 text-center text-slate-400">{schedules.length ? 'No PDLs match your search.' : 'No PDL records available.'}</td></tr>}</tbody></table></div>
    {selectedPdlId && detailLoading && <p role="status" className="text-sm text-slate-400">Loading PDL details…</p>}
    {selectedPdlId && !detail && !detailLoading && <p role="status" className="text-sm text-slate-400">PDL details could not be displayed.</p>}
    {detail && <div ref={detailPanelRef} className="scroll-mt-4 space-y-5">
      <form onSubmit={save} className="grid gap-3 rounded-lg border border-slate-700 p-4 sm:grid-cols-2"><div className="sm:col-span-2"><h3 className="font-bold">{detail.pdl.pdl_name}</h3><p className="text-xs text-slate-400">{detail.pdl.pdl_number} · Cell {detail.pdl.cell_dormitory || '—'}</p></div><label className="text-sm">Weekly visitation day<select required className={input} value={weekday} onChange={e => setWeekday(e.target.value)}><option value="">Choose a day</option>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label className="text-sm">Reason for assigning or changing the day<input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className={input}/></label><button disabled={busy || weekday === '' || !reason.trim()} className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save visitation day'}</button></form>
      <div><h3 className="font-bold">Approved PDL visitors ({activeAssignments.length}/7)</h3><p className="mt-1 text-xs text-slate-400">A PDL-specific restriction leaves the other PDL approvals unchanged.</p><div className="mt-3 space-y-2">{activeAssignments.map((assignment: any) => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 p-3 text-sm"><span>{assignment.visitor_name}<span className="ml-2 text-xs text-slate-400">{assignment.visitor_code} · {assignment.relationship}</span></span><span className={`text-xs font-bold ${assignment.restricted ? 'text-rose-300' : 'text-emerald-300'}`}>{assignment.restricted ? 'Restricted for this PDL' : 'Approved'}</span></div>)}{!activeAssignments.length && <p className="text-sm text-slate-400">No active visitor approvals. Add and approve visitors in Visitor Records.</p>}</div></div>
      <details className="text-sm"><summary className="cursor-pointer font-semibold">Schedule change history ({detail.events?.length || 0})</summary><div className="mt-3 space-y-2">{(detail.events || []).map((event: any) => <div key={event.id} className="rounded border border-slate-700 p-3 text-xs"><strong>{event.previous_weekday == null ? 'First schedule' : `${days[event.previous_weekday]} → ${days[event.new_weekday]}`}</strong><span className="ml-2 text-slate-400">{new Date(event.changed_at).toLocaleString()} · {event.changed_by_name}</span><p className="mt-1 text-slate-300">{event.reason}</p></div>)}{!detail.events?.length && <p className="text-xs text-slate-400">No schedule changes recorded.</p>}</div></details>
    </div>}
  </section>;
}
