import React, { useEffect, useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/api';
import { realtimeWS } from '../../services/websocket';
import { confirmAction } from '../../utils/appDialogs';

const label = (key: string) => ({
  firstName: 'First name', middleName: 'Middle name', lastName: 'Last name', suffix: 'Suffix',
  dateOfBirth: 'Date of birth', email: 'Email', mobileNumber: 'Mobile number', address: 'Residential address',
} as Record<string, string>)[key] || key;

function addressText(value: any) {
  if (!value) return '—';
  return value.completeAddress || [value.houseUnitStreet, value.barangay, value.municipality, value.province, value.zipCode].filter(Boolean).join(', ') || '—';
}

export function AdminProfileChangeRequestsPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try { setRequests(await api.getWorkerProfileChangeRequests()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load worker requests.'); }
  };
  useEffect(() => {
    void load();
    return realtimeWS.on('PROFILE_CHANGE_REQUESTS_UPDATED', () => { void load(); });
  }, []);

  const review = async (request: any, decision: 'APPROVE' | 'REJECT') => {
    const reason = reasons[String(request.id)] || '';
    if (!reason.trim()) { setError('Enter an administrator decision note before approving or rejecting a request.'); return; }
    const verb = decision === 'APPROVE' ? 'Approve' : 'Reject';
    if (!await confirmAction(`${verb} ${request.workerName}'s ${request.requestType === 'PASSWORD' ? 'password' : 'profile'} change request?`, { title: `${verb} worker request?`, confirmLabel: verb, tone: decision === 'REJECT' ? 'danger' : 'default' })) return;
    setBusy(String(request.id)); setError(''); setMessage('');
    try {
      const result = await api.reviewWorkerProfileChange(String(request.id), decision, reason);
      setMessage(decision === 'APPROVE'
        ? `Approved. The worker was signed out and will receive your decision note by email${result.emailSent ? '.' : ' when email delivery is available.'}`
        : `Rejected. Your decision note will be emailed to the worker${result.emailSent ? '.' : ' when email delivery is available.'}`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not review the request.'); }
    finally { setBusy(null); }
  };

  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">Worker profile change requests</h2><p className="mt-1 text-sm text-slate-600">Profile edits are sent directly for review. Profile and password changes take effect only after administrator approval.</p></div>
      <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"><RefreshCw size={15}/>Refresh</button>
    </header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {!requests.length ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No worker changes are waiting for approval.</p> :
      <div className="space-y-4">{requests.map(request => {
        const requested = request.requested || {};
        const fields = ['firstName','middleName','lastName','suffix','dateOfBirth','email','mobileNumber','address'];
        return <article key={request.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-bold">{request.workerName}</h3><p className="text-xs text-slate-500">{request.requestType === 'PASSWORD' ? request.source === 'PASSWORD_RECOVERY' ? 'Forgot password recovery · Email verified' : 'Password change · Email verified' : 'Profile change'} · {new Date(request.requestedAt).toLocaleString()}</p></div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Pending approval</span>
          </div>
          {request.requestType === 'PROFILE' && <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {fields.filter(key => JSON.stringify(key === 'address' ? request.current?.address : request.current?.[key]) !== JSON.stringify(key === 'address' ? requested[key] : requested[key])).map(key => {
              const before = key === 'address' ? addressText(request.current?.address) : request.current?.[key] || '—';
              const after = key === 'address' ? addressText(requested[key]) : requested[key] || '—';
              return <div key={key} className="rounded-lg bg-slate-50 p-3 text-sm"><dt className="font-semibold">{label(key)}</dt><dd className="mt-1 text-slate-600">{before} <span aria-hidden="true">→</span> <strong className="text-slate-900">{after}</strong></dd></div>;
            })}
          </dl>}
          {request.requestType === 'PASSWORD' && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">{request.source === 'PASSWORD_RECOVERY' ? 'The worker verified a forgotten-password recovery by email. The new password remains hidden and will be applied only if approved.' : 'The worker verified the password change by email. The new password remains hidden and will be applied only if approved.'}</p>}
          <label className="mt-4 block text-sm">Administrator decision note (required)<textarea required rows={2} maxLength={1000} value={reasons[String(request.id)] || ''} onChange={e => setReasons({ ...reasons, [String(request.id)]: e.target.value })} placeholder="Explain why you are approving or rejecting this request" className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={busy === String(request.id)} onClick={() => void review(request, 'REJECT')} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 disabled:opacity-50"><X size={15}/>Reject</button>
            <button type="button" disabled={busy === String(request.id)} onClick={() => void review(request, 'APPROVE')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={15}/>{busy === String(request.id) ? 'Saving…' : 'Approve change'}</button>
          </div>
        </article>;
      })}</div>}
  </section>;
}
