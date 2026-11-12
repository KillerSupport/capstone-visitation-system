import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { PDL, UserProfile } from '../../types';
import { PDLRegistrationModal } from '../Admin/PDLRegistrationModal';

export const WorkerDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [pdls, setPdls] = useState<PDL[]>([]);
  const [editingPdl, setEditingPdl] = useState<PDL | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const refresh = useCallback(() => api.getWorkerPdls().then(setPdls).catch((e) => setError(e.message)), []);
  useEffect(() => { void refresh(); }, [refresh]);

  return <main className="mx-auto max-w-7xl px-4 py-7 text-slate-100 sm:px-6">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">PDL records</p><h1 className="mt-1 text-3xl font-extrabold">Assisted PDL intake</h1><p className="mt-1 text-sm text-slate-300">Welcome, {user.firstName}. Help enter and update intake details. Release approval remains an administrator action.</p><p className="mt-1 text-xs text-slate-400">Worker ID: WRK-{String(user.id).padStart(6, '0')}</p></div>
      <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10"><RefreshCw className="h-4 w-4"/>Refresh records</button>
    </header>
    <section className="rounded-2xl border border-white/10 bg-slate-950/75 p-5 shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Current PDL records</h2><p className="text-xs text-slate-400">Select a record to continue intake or add a new record.</p></div><button type="button" onClick={() => { setEditingPdl(null); setIntakeOpen(true); }} className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-bold text-slate-950">New PDL intake</button></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{pdls.filter((p) => p.status !== 'Released').map((pdl) => <button type="button" key={pdl.id} onClick={() => { setEditingPdl(pdl); setIntakeOpen(true); }} className="rounded-lg border border-white/10 bg-slate-900 p-3 text-left hover:border-blue-300/40"><span className="font-semibold">{pdl.fullName}</span><span className="block text-xs text-slate-400">{pdl.pdlNumber} · {pdl.status}</span></button>)}</div>
      {!pdls.filter((p) => p.status !== 'Released').length && <p className="py-8 text-center text-sm text-slate-400">No active PDL records are available.</p>}
      {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}{error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
    </section>
    <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4 text-blue-300"/>PDL records are managed separately from visitor identities and gate logs.</p>
    {intakeOpen && <PDLRegistrationModal existingPdl={editingPdl} onClose={() => setIntakeOpen(false)} onSave={async (pdl) => { setBusy(true); setError(''); try { await api.saveWorkerPdl({ ...pdl, id: editingPdl?.id, status: editingPdl?.status || 'In Custody' }); setMessage('PDL intake information saved.'); setIntakeOpen(false); await refresh(); return pdl; } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the PDL intake.'); throw e; } finally { setBusy(false); } }} />}
    {busy && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 text-sm font-semibold text-white">Saving PDL record…</div>}
  </main>;
};