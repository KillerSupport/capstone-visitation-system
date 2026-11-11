import React, { useEffect, useMemo, useState } from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { realtimeWS } from '../../services/websocket';
import { downloadPdfTable } from '../../utils/pdfExport';

type Period = 'WEEK' | 'MONTH' | 'YEAR';
const ymd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function range(period: Period, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'WEEK') { const start = new Date(end); start.setDate(start.getDate() - 6); return { from: ymd(start), to: ymd(end) }; }
  if (period === 'MONTH') return { from: ymd(new Date(end.getFullYear(), end.getMonth(), 1)), to: ymd(end) };
  return { from: ymd(new Date(end.getFullYear(), 0, 1)), to: ymd(end) };
}
export function AdminVisitorReportsPanel() {
  const [period, setPeriod] = useState<Period>('WEEK');
  const [dates, setDates] = useState(() => range('WEEK'));
  const [report, setReport] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [summary, visits, restrictionRows] = await Promise.all([
        api.getVisitorReport(dates.from, dates.to),
        api.getNewVisitLogs({ from: dates.from, to: dates.to }),
        api.getVisitorRestrictions('', dates.from, dates.to),
      ]);
      setReport(summary); setLogs(visits); setRestrictions(restrictionRows);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load reports.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [dates.from, dates.to]);
  useEffect(() => realtimeWS.on('VISITOR_LOGS_UPDATED', () => { void load(); }), [dates.from, dates.to]);
  const chart = useMemo(() => {
    const values = report?.daily || [];
    if (period !== 'YEAR') return values.map((row: any) => ({ label: String(row.visit_date).slice(5), pdl: Number(row.pdl_visits || 0), guest: Number(row.guest_visits || 0) }));
    const groups = new Map<string, { label: string; pdl: number; guest: number }>();
    for (const row of values) {
      const key = String(row.visit_date).slice(0, 7);
      const item = groups.get(key) || { label: new Date(`${key}-01T00:00:00`).toLocaleString(undefined, { month: 'short' }), pdl: 0, guest: 0 };
      item.pdl += Number(row.pdl_visits || 0); item.guest += Number(row.guest_visits || 0); groups.set(key, item);
    }
    return [...groups.values()];
  }, [report, period]);
  const max = Math.max(1, ...chart.map(item => item.pdl + item.guest));
  const matches = (values: unknown[]) => !query || values.some(value => String(value || '').toLowerCase().includes(query.toLowerCase()));
  const filtered = useMemo(() => logs.filter(row => matches([row.visitor_name, row.visitor_code, row.visit_type, row.pdl_name, row.purpose_of_visit, row.contact_number, row.relationship])), [logs, query]);
  const filteredRestrictions = useMemo(() => restrictions.filter(row => matches([row.full_name, row.visitor_code, row.scope, row.pdl_name, row.reason, row.requested_by, row.request_details])), [restrictions, query]);
  const exportVisits = () => {
    const headers = ['Visit type', 'Date', 'Time in', 'Time out', 'Visitor name', 'Visitor ID', 'Gender', 'Address', 'Age', 'Contact number', 'Relationship to PDL', 'PDL name', 'Cell number', 'Purpose of visit'];
    downloadPdfTable('Visitor gate log', `${dates.from} through ${dates.to} · ${filtered.length} records`, headers, filtered.map(row => [row.visit_type, row.visit_date, row.time_in, row.time_out, row.visitor_name, row.visitor_code, row.gender, row.address, row.age, row.contact_number, row.relationship, row.pdl_name, row.cell_number, row.purpose_of_visit]), `bjmp-visitor-report-${dates.from}-to-${dates.to}.pdf`);
  };
  const exportRestrictions = () => {
    const headers = ['Visitor ID', 'Visitor name', 'Scope', 'PDL', 'Reason', 'Requested by', 'Additional details', 'Processed by', 'Created', 'Effective', 'Expires', 'Status', 'Removal reason'];
    downloadPdfTable('Visitor restriction history', `${dates.from} through ${dates.to} · ${filteredRestrictions.length} records`, headers, filteredRestrictions.map(row => [row.visitor_code, row.full_name, row.scope === 'PDL' ? 'PDL-specific' : 'Facility-wide', row.pdl_name, row.reason, row.requested_by, row.request_details, row.processed_by_name, row.created_at, row.effective_at, row.expires_at, row.status, row.removal_reason]), `bjmp-restrictions-${dates.from}-to-${dates.to}.pdf`);
  };
  const setPeriodRange = (next: Period) => { setPeriod(next); setDates(range(next)); };
  const stat = (label: string, value: unknown, sub = '') => <div className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">{label}</span><strong className="mt-1 block text-2xl text-slate-900">{Number(value || 0).toLocaleString()}</strong>{sub && <small className="text-slate-500">{sub}</small>}</div>;
  return <section className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-slate-900">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Database-backed analytics</p><h2 className="mt-1 text-xl font-bold">Visitation and restriction reports</h2><p className="mt-1 text-sm text-slate-600">PDL and Guest Visitor totals and restriction history come from saved records.</p></div><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><Printer size={15}/>Print / Save PDF</button></header>
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Report period<select className="mt-1 block rounded border border-slate-300 bg-white p-2" value={period} onChange={e => setPeriodRange(e.target.value as Period)}><option value="WEEK">Weekly</option><option value="MONTH">Monthly</option><option value="YEAR">Yearly</option></select></label><label className="text-sm">From<input type="date" className="mt-1 block rounded border border-slate-300 bg-white p-2" value={dates.from} onChange={e => setDates(d => ({ ...d, from: e.target.value }))}/></label><label className="text-sm">To<input type="date" className="mt-1 block rounded border border-slate-300 bg-white p-2" value={dates.to} onChange={e => setDates(d => ({ ...d, to: e.target.value }))}/></label><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><RefreshCw size={14}/>Refresh</button><span className="pb-2 text-xs text-slate-500">{dates.from} through {dates.to}</span></div>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stat('Registered visitors', report?.registeredVisitors)}{stat('Active approved PDL visitors', report?.approvedPdlVisitors)}{stat('PDL visitation transactions', report?.pdl?.total, `${report?.pdl?.completed || 0} completed · ${report?.pdl?.on_site || 0} currently on site`)}{stat('Guest Visitor transactions', report?.guest?.total, `${report?.guest?.completed || 0} completed · ${report?.guest?.on_site || 0} currently on site`)}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stat('PDL visitors in period', report?.pdl?.visitors)}{stat('Guest visitors in period', report?.guest?.visitors)}{stat('Active restrictions', report?.restrictions?.total)}{stat('PDL-specific restrictions', report?.restrictions?.pdl_specific)}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stat('Facility-wide restrictions', report?.restrictions?.facility_wide)}{stat('Temporary restrictions', report?.restrictions?.temporary)}{stat('Indefinite restrictions', report?.restrictions?.indefinite)}{stat('Expired / reinstated records', Number(report?.restrictions?.expired || 0) + Number(report?.restrictions?.reinstated || 0), `${report?.restrictions?.expired || 0} expired · ${report?.restrictions?.reinstated || 0} removed / reinstated`)}</div>
    <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold">Visitor activity</h3><p className="text-xs text-slate-500">Blue: PDL Visitors · Amber: Guest Visitors</p><div className="mt-4 flex h-44 items-end gap-1 overflow-x-auto border-b border-l border-slate-200 px-2 pb-1">{chart.map((item, i) => <div key={`${item.label}-${i}`} className="flex h-full min-w-4 flex-1 flex-col justify-end" title={`${item.label}: ${item.pdl} PDL, ${item.guest} Guest`}><div className="mx-auto w-2/3 rounded-t bg-amber-400" style={{ height: `${item.guest / max * 100}%` }}/><div className="mx-auto w-2/3 bg-blue-600" style={{ height: `${item.pdl / max * 100}%` }}/></div>)}{!chart.length && <span className="pb-3 text-sm text-slate-400">No visit activity in this date range.</span>}</div><div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>{chart[0]?.label || ''}</span><span>{chart[chart.length - 1]?.label || ''}</span></div></div>
    <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Visit log details</h3><p className="text-xs text-slate-500">{filtered.length} records in range · incomplete check-outs are included.</p></div><div className="flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Search name, Visitor ID, PDL, purpose or contact"/><button onClick={exportVisits} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white"><Download size={14}/>Visits PDF</button></div></div><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Type / Date</th><th className="p-3">Visitor</th><th className="p-3">PDL / purpose</th><th className="p-3">Contact</th><th className="p-3">Check-in</th><th className="p-3">Check-out</th><th className="p-3">State</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.slice(0, 500).map(row => <tr key={`${row.visit_type}-${row.id}`}><td className="p-3"><strong>{row.visit_type}</strong><span className="block text-xs text-slate-500">{String(row.visit_date).slice(0, 10)}</span></td><td className="p-3">{row.visitor_name}<span className="block text-xs text-slate-500">{row.visitor_code} · {row.gender} · Age {row.age}</span></td><td className="p-3">{row.pdl_name || row.purpose_of_visit || '—'}<span className="block text-xs text-slate-500">{row.relationship || row.cell_number || ''}</span></td><td className="p-3">{row.contact_number || '—'}</td><td className="p-3 text-xs">{row.time_in ? new Date(row.time_in).toLocaleTimeString() : ''}</td><td className="p-3 text-xs">{row.time_out ? new Date(row.time_out).toLocaleTimeString() : '—'}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.time_out ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{row.time_out ? 'COMPLETED' : 'INCOMPLETE / ON SITE'}</span></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="p-5 text-center text-slate-500">No visitation records in this period.</td></tr>}</tbody></table></div></div>
    <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Restriction history</h3><p className="text-xs text-slate-500">{filteredRestrictions.length} records created in the selected date range. PDL-specific and facility-wide actions remain separate.</p></div><button onClick={exportRestrictions} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"><Download size={14}/>Restrictions PDF</button></div><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Visitor</th><th className="p-3">Scope / affected PDL</th><th className="p-3">Reason / requester</th><th className="p-3">Processed by</th><th className="p-3">Effective / expiration</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRestrictions.map(row => <tr key={row.id}><td className="p-3">{row.full_name}<span className="block text-xs text-slate-500">{row.visitor_code}</span></td><td className="p-3">{row.scope === 'PDL' ? 'PDL-specific' : 'Facility-wide'}<span className="block text-xs text-slate-500">{row.pdl_name || 'All applicable visitor types'}</span></td><td className="max-w-[260px] p-3"><strong>{row.reason}</strong><span className="block text-xs text-slate-500">Requested by {row.requested_by || 'not recorded'}</span>{row.request_details && <span className="block truncate text-xs text-slate-500" title={row.request_details}>{row.request_details}</span>}</td><td className="p-3">{row.processed_by_name || '—'}</td><td className="p-3 text-xs">{new Date(row.effective_at).toLocaleString()}<span className="block text-slate-500">{row.expires_at ? `Until ${new Date(row.expires_at).toLocaleString()}` : 'Indefinite'}</span></td><td className="p-3">{row.currently_active ? 'ACTIVE' : row.expired ? 'EXPIRED' : row.status}</td></tr>)}{!filteredRestrictions.length && <tr><td colSpan={6} className="p-5 text-center text-slate-500">No restriction history in this date range.</td></tr>}</tbody></table></div></div>
    {loading && <p className="text-xs text-slate-500">Loading reports…</p>}
  </section>;
}
