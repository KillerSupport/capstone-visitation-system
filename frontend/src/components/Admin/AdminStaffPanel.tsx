import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { UserProfile } from '../../types';
import { api } from '../../services/api';
import { MobileInput, PasswordInput, SuffixSelect, todayInManila } from '../Common/IdentityFields';

const duties = ['RECORDS', 'GATE', 'IDENTITY_REVIEW', 'ENROLLMENT'];
const labels: Record<string, string> = { RECORDS: 'PDL records', GATE: 'Gate and visitor history', IDENTITY_REVIEW: 'Identity review', ENROLLMENT: 'Fingerprint enrollment' };
type Form = { firstName: string; middleName: string; lastName: string; suffix: string; dateOfBirth: string; email: string; mobileNumber: string; password: string; badgeNumber: string; status: string; officerDuties: string[] };
const freshForm = (): Form => ({ firstName: '', middleName: '', lastName: '', suffix: '', dateOfBirth: '', email: '', mobileNumber: '', password: '', badgeNumber: '', status: 'ACTIVE', officerDuties: ['GATE'] });
const localMobile = (value?: string) => String(value || '').replace(/^\+63/, '');
const personnelRole = (role: string) => role === 'WORKER' ? 'Worker' : role === 'GUARD' ? 'Gate worker' : role === 'OFFICER' ? 'Officer account' : 'Review personnel';

export function AdminStaffPanel() {
  const [rows, setRows] = useState<UserProfile[]>([]);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<Form>(freshForm());
  const load = () => api.getStaff().then(setRows);
  useEffect(() => { void load().catch(e => setError(e.message)); }, []);
  const input = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm';
  const filtered = useMemo(() => rows.filter(row => {
    const term = query.toLowerCase();
    const matches = !term || [row.firstName, row.lastName, row.badgeNumber, row.email, row.mobileNumber].some(value => String(value || '').toLowerCase().includes(term));
    const statusMatches = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? ['ACTIVE', 'ACTIVATED'].includes(row.accountStatus) : row.accountStatus === statusFilter);
    return matches && statusMatches;
  }), [rows, query, statusFilter]);
  const openCreate = () => { setEditing(null); setForm(freshForm()); setError(''); setMessage(''); setOpen(true); };
  const openEdit = (row: UserProfile) => {
    setEditing(row);
    setForm({ firstName: row.firstName, middleName: row.middleName || '', lastName: row.lastName, suffix: row.suffix || '', dateOfBirth: String(row.dateOfBirth || '').slice(0, 10), email: row.email || '', mobileNumber: localMobile(row.mobileNumber), password: '', badgeNumber: row.badgeNumber || '', status: row.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE', officerDuties: row.officerDuties?.length ? row.officerDuties : row.role === 'WORKER' ? ['GATE'] : row.role === 'GUARD' ? ['GATE'] : ['IDENTITY_REVIEW'] });
    setError(''); setMessage(''); setOpen(true);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const data = { ...form, mobileNumber: form.mobileNumber ? `+63${form.mobileNumber}` : '' };
    try {
      if (editing) {
        const result = await api.updateWorker(editing.id, data);
        setMessage(result.contactVerificationRequired ? 'Worker details saved. The updated contact must be verified before sign-in.' : 'Worker information saved. Existing sessions were signed out.');
      } else {
        const result = await api.createWorker({ ...data, officerDuties: ['GATE'] });
        setMessage(result.deliveryError || 'Worker account created. They must verify their contact before signing in.');
      }
      await load(); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the worker account.'); }
    finally { setBusy(false); }
  };
  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault(); if (!resetTarget) return;
    if (!window.confirm(`Reset the password for ${resetTarget.firstName} ${resetTarget.lastName}? Their current sessions will be signed out.`)) return;
    setBusy(true); setError(''); setMessage('');
    try { await api.resetWorkerPassword(resetTarget.id, resetPassword); setMessage(`Password reset for ${resetTarget.firstName} ${resetTarget.lastName}. Give the new password to them directly.`); setResetTarget(null); setResetPassword(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not reset the worker password.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Worker accounts</h2><p className="mt-2 text-sm text-slate-400">Only administrators can create, update, deactivate, or reset worker accounts.</p></div><button className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white" onClick={openCreate}><UserPlus size={16}/>Create Worker</button></header>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}{message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    <div className="flex flex-wrap gap-2"><label className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm" placeholder="Search name, ID, email, or mobile"/></label><select aria-label="Filter by account status" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Name and identifier</th><th className="p-3">Account type</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} className="border-t border-slate-700"><td className="p-3">{row.firstName} {row.lastName}<p className="text-xs text-slate-400">{row.badgeNumber} · {row.email || row.mobileNumber}</p></td><td className="p-3">{personnelRole(row.role)}<p className="text-xs text-slate-400">{row.officerDuties?.length ? row.officerDuties.map(duty => labels[duty] || duty).join(', ') : row.role === 'WORKER' ? 'Visitor verification and entry / exit logs' : ''}</p></td><td className="p-3">{row.accountStatus}</td><td className="p-3"><button className="rounded border border-slate-600 px-3 py-2" onClick={() => openEdit(row)}>Edit account</button><button className="ml-2 rounded border border-slate-600 px-3 py-2" onClick={() => { setResetTarget(row); setResetPassword(''); }}>Reset password</button></td></tr>)}{!filtered.length && <tr><td colSpan={4} className="p-5 text-center text-slate-400">No worker accounts match this search.</td></tr>}</tbody></table></div>
    {open && <form onSubmit={submit} className="space-y-4 border-t border-slate-700 pt-5"><h3 className="font-bold">{editing ? 'Edit worker information' : 'New worker account'}</h3><div className="grid gap-3 sm:grid-cols-2">{(['firstName', 'middleName', 'lastName'] as const).map(key => <label key={key} className="text-xs">{key === 'firstName' ? 'First name' : key === 'lastName' ? 'Last name' : 'Middle name (optional)'}<input required={key !== 'middleName'} maxLength={100} className={input} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}/></label>)}<label className="text-xs">Suffix<SuffixSelect className={input} value={form.suffix} onChange={suffix => setForm({ ...form, suffix })}/></label><label className="text-xs">Birthdate<input required type="date" max={todayInManila()} value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} className={input}/></label><label className="text-xs">Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={input}/></label><label className="text-xs">Mobile number<MobileInput className={input} value={form.mobileNumber} onChange={mobileNumber => setForm({ ...form, mobileNumber })}/></label>{!editing && <label className="text-xs">Initial password<PasswordInput required minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={input}/></label>}</div>
      <label className="block text-xs">Badge / staff identifier<input required maxLength={100} className={input} value={form.badgeNumber} onChange={e => setForm({ ...form, badgeNumber: e.target.value })}/></label>
      {editing?.role === 'OFFICER' && <fieldset><legend className="text-sm font-semibold">Existing role permissions</legend><div className="mt-2 flex flex-wrap gap-4">{duties.map(duty => <label className="flex items-center gap-2 text-sm" key={duty}><input type="checkbox" checked={form.officerDuties.includes(duty)} onChange={e => setForm({ ...form, officerDuties: e.target.checked ? [...form.officerDuties, duty] : form.officerDuties.filter(value => value !== duty) })}/>{labels[duty]}</label>)}</div></fieldset>}
      {editing && <label className="block text-sm">Account status<select className={input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></label>}
      <p className="text-xs text-slate-400">At least one contact is required. Changing a contact requires the worker to verify it again. Suspending an account signs out its sessions.</p><div className="flex gap-3"><button disabled={busy} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save worker'}</button><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm">Cancel</button></div></form>}
    {resetTarget && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"><form onSubmit={submitReset} className="w-full max-w-md space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5"><h3 className="text-lg font-bold">Reset worker password</h3><p className="text-sm text-slate-400">Choose a strong temporary password for {resetTarget.firstName} {resetTarget.lastName}. Their current sessions will end.</p><label className="block text-sm">New password<PasswordInput required minLength={8} maxLength={128} autoComplete="new-password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className={input}/></label><div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setResetTarget(null)} className="rounded border border-slate-600 px-3 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded bg-blue-600 px-3 py-2 text-sm font-bold">{busy ? 'Saving…' : 'Confirm reset'}</button></div></form></div>}
  </section>;
}
