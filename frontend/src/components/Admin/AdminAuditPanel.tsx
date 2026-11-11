import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, ScrollText, Download, Search } from 'lucide-react';
import { api } from '../../services/api';

const actionLabels: Record<string, string> = {
  VISITOR_REGISTERED: 'Visitor registered',
  INCIDENT_UPDATED: 'Incident updated',
  INCIDENT_CREATED: 'Incident reported',
  KYC_SUBMISSION_VIEWED: 'Identity submission viewed',
  KYC_DOCUMENT_VIEWED: 'Identity document viewed',
  KYC_VERIFIED: 'Identity review approved',
  KYC_REJECTED: 'Identity review rejected',
  KYC_NEEDS_RESUBMISSION: 'Resubmission requested',
  ARCHIVE: 'Record archived',
  RESTORE: 'Record restored',
  EXPORT: 'Report exported',
  DATE_RANGE_TEST_SAMPLE: 'Date-range filter test sample',
};

const readable = (value: unknown) => String(value ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const actionName = (value: unknown) => actionLabels[String(value)] || readable(value) || 'System activity';
const resultName = (value: unknown) => value === 'SUCCESS' ? 'Successful' : value === 'FAILURE' || value === 'FAILED' ? 'Unsuccessful' : readable(value) || 'Recorded';

const parseDetails = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }
  return {};
};

const detailSummary = (raw: unknown) => {
  const details = parseDetails(raw);
  const rows: [string, string][] = [];
  if (typeof details.reason === 'string' && details.reason.trim()) rows.push(['Reason', details.reason]);
  if (details.previousStatus) rows.push(['Previous status', readable(details.previousStatus)]);
  if (details.side) rows.push(['Document side', readable(details.side)]);
  if (details.format) rows.push(['Export format', readable(details.format)]);
  if (Number.isFinite(Number(details.recordCount))) rows.push(['Records included', String(details.recordCount)]);
  if (typeof details.published === 'boolean') rows.push(['Notice status', details.published ? 'Published' : 'Removed']);
  if (Array.isArray(details.capacities)) rows.push(['Facility capacities', `${details.capacities.length} facilities updated`]);

  const before = details.before && typeof details.before === 'object' ? details.before : null;
  const after = details.after && typeof details.after === 'object' ? details.after : null;
  if (before && after) {
    const labels: Record<string, string> = {
      visitor_name: 'Visitor name', facility: 'Facility', incident_type: 'Incident type',
      description: 'Description', action_taken: 'Action taken', reporting_officer: 'Reporting officer',
      timestamp: 'Incident date and time', status: 'Status', action: 'Action',
    };
    const changed = Object.keys(labels).filter(key => String(before[key] ?? '') !== String(after[key] ?? '')).map(key => labels[key]);
    if (changed.length) rows.push(['Updated information', changed.join(', ')]);
  }
  if (details.recordCount === undefined && Array.isArray(details.items)) rows.push(['Items', `${details.items.length} item(s)`]);
  return rows;
};

type DateParts = { month: string; day: string; year: string };
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const readDateParts = (value: string): DateParts => {
  const [year = '', month = '', day = ''] = value.split('-');
  return { month, day, year };
};
const isCompleteDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const AuditDateField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
  const [parts, setParts] = useState<DateParts>(() => readDateParts(value));
  useEffect(() => setParts(readDateParts(value)), [value]);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear + 2 - 2000 }, (_, index) => String(currentYear + 1 - index));
  const maxDay = parts.month && parts.year ? new Date(Number(parts.year), Number(parts.month), 0).getDate() : 31;
  const update = (key: keyof DateParts, nextValue: string) => {
    const next = { ...parts, [key]: nextValue };
    if (next.month && next.year && next.day && Number(next.day) > new Date(Number(next.year), Number(next.month), 0).getDate()) next.day = '';
    setParts(next);
    onChange(next.month || next.day || next.year ? `${next.year}-${next.month}-${next.day}` : '');
  };
  const selectClass = 'min-w-0 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white';

  return <fieldset className="min-w-0 text-[10px] text-slate-400">
    <legend>{label}</legend>
    <div className="mt-1 grid grid-cols-3 gap-1">
      <select aria-label={`${label} month`} value={parts.month} onChange={event => update('month', event.target.value)} className={selectClass}>
        <option value="">Month</option>{months.map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>)}
      </select>
      <select aria-label={`${label} day`} value={parts.day} onChange={event => update('day', event.target.value)} className={selectClass}>
        <option value="">Day</option>{Array.from({ length: maxDay }, (_, index) => String(index + 1).padStart(2, '0')).map(day => <option key={day} value={day}>{Number(day)}</option>)}
      </select>
      <select aria-label={`${label} year`} value={parts.year} onChange={event => update('year', event.target.value)} className={selectClass}>
        <option value="">Year</option>{years.map(year => <option key={year} value={year}>{year}</option>)}
      </select>
    </div>
  </fieldset>;
};

export const AdminAuditPanel: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [details, setDetails] = useState<any | null>(null);
  const [filters, setFilters] = useState({ q: '', from: '', to: '' });
  const requestSequence = useRef(0);
  const set = (key: keyof typeof filters, value: string) => setFilters(f => ({ ...f, [key]: value }));
  const load = async (activeFilters = filters) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError('');
    try {
      const nextRows = await api.getAdminAuditLogs(activeFilters);
      if (sequence === requestSequence.current) setRows(nextRows);
    } catch (e) {
      if (sequence === requestSequence.current) setError(e instanceof Error ? e.message : 'Could not load the audit records. Please try again.');
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => void load(filters), 250);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  const applyFilters = () => {
    if ((filters.from && !isCompleteDate(filters.from)) || (filters.to && !isCompleteDate(filters.to))) {
      setError('Choose a month, day, and year for each date before applying the filters.');
      return;
    }
    if (filters.from && filters.to && filters.from > filters.to) {
      setError('The From date must be on or before the To date.');
      return;
    }
    void load({ ...filters });
  };

  const exportRows = async () => {
    try { await api.downloadAdminExport('/admin/audit-logs/export', filters); }
    catch (e: any) { setError(e.message); }
  };

  const summary = details ? detailSummary(details.details) : [];
  const actorSuggestions = useMemo(() => {
    const query = filters.q.trim().toLocaleLowerCase();
    if (!query) return [];
    return [...new Set(rows.filter(row => String(row.first_name || '').toLocaleLowerCase().startsWith(query) || String(row.last_name || '').toLocaleLowerCase().startsWith(query))
      .map(row => [row.first_name, row.last_name].filter(Boolean).join(' ').trim())
      .filter(Boolean))].slice(0, 6);
  }, [rows, filters.q]);

  return <section className="rounded-2xl border border-white/10 bg-slate-950/75 p-5 text-slate-100 sm:p-6">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Administrative oversight</p><h2 className="text-2xl font-bold">Audit Logs</h2><p className="mt-1 text-xs text-slate-400">A record of administrator, security, and visitation activity.</p></div>
      <div className="flex gap-2"><button onClick={() => void exportRows()} className="flex items-center gap-2 rounded-lg border border-blue-300/20 px-3 py-2 text-xs text-blue-200"><Download className="h-4 w-4"/>Download PDF</button><button onClick={() => void load()} className="rounded-lg border border-white/15 p-2" aria-label="Refresh"><RefreshCw className="h-4 w-4"/></button></div>
    </header>
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <label className="relative"><span className="sr-only">Search actor, action, or record</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"/><input value={filters.q} onFocus={() => setSearchFocused(true)} onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)} onChange={e => set('q', e.target.value)} placeholder="Search actor, action, or record" aria-label="Search actor, action, or record" className="w-full rounded-lg border border-white/10 bg-slate-900 py-2 pl-9 pr-2 text-sm"/>{searchFocused && actorSuggestions.length > 0 && <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-xl">{actorSuggestions.map(name => <button key={name} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { set('q', name); setSearchFocused(false); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-500/20">{name}</button>)}</div>}</label>
      <AuditDateField label="From" value={filters.from} onChange={value => set('from', value)}/>
      <AuditDateField label="To" value={filters.to} onChange={value => set('to', value)}/>
      <button type="button" disabled={loading} onClick={applyFilters} aria-busy={loading} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-wait disabled:opacity-70">{loading ? 'Applying…' : 'Apply filters'}</button>
    </div>
    <p className="-mt-2 mb-3 text-xs text-slate-400">Search updates as you type. Set a From and/or To date, then apply to narrow the results by date.</p>
    {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
    <p className="mb-2 text-xs text-slate-400">{loading ? 'Updating audit records…' : `Showing ${rows.length} audit record(s).`}</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-[10px] uppercase text-slate-400"><tr><th className="p-3">When</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Result</th></tr></thead><tbody>{rows.map(r => <tr className="cursor-pointer border-t border-white/5 hover:bg-white/5" key={r.id} onClick={() => setDetails(r)}>
      <td className="p-3 text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
      <td className="p-3">{r.first_name ? `${r.first_name} ${r.last_name}` : readable(r.actor_role)}<div className="text-[10px] text-slate-500">{readable(r.actor_role)} · {r.actor_user_id ?? 'System'}</div></td>
      <td className="p-3">{actionName(r.action)}</td><td className="p-3 text-xs">{readable(r.target_type)} {r.target_id}</td>
      <td className="p-3"><span className="rounded-full bg-blue-400/10 px-2 py-1 text-[10px] text-blue-200">{resultName(r.result)}</span></td>
    </tr>)}</tbody></table>{!rows.length && <div className="p-10 text-center text-sm text-slate-500"><ScrollText className="mx-auto mb-2 h-7 w-7"/>No audit entries match these filters.</div>}</div>
    {details && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={() => setDetails(null)}><section onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-5">
      <div className="flex items-start justify-between"><div><p className="text-xs text-blue-300">Activity record #{details.id}</p><h3 className="mt-1 text-xl font-bold">{actionName(details.action)}</h3></div><button onClick={() => setDetails(null)} className="text-sm text-slate-400">Close</button></div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[['Actor', details.first_name ? `${details.first_name} ${details.last_name}` : readable(details.actor_role)], ['Target', [readable(details.target_type), details.target_id].filter(Boolean).join(' ')], ['When', new Date(details.created_at).toLocaleString()], ['Result', resultName(details.result)], ['IP address', details.ip_address || 'Not recorded']].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd>{v}</dd></div>)}</dl>
      <h4 className="mt-5 font-semibold">Additional information</h4>{summary.length ? <dl className="mt-2 space-y-2 rounded-lg bg-slate-900 p-3 text-sm">{summary.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl> : <p className="mt-2 rounded-lg bg-slate-900 p-3 text-sm text-slate-400">No additional information was recorded.</p>}
    </section></div>}
  </section>;
};
