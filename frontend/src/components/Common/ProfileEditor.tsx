import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { api } from '../../services/api';
import { AddressFields } from './AddressFields';
import { MobileInput, mobileDigits, SuffixSelect, PasswordInput, ageFromBirthdate, todayInManila } from './IdentityFields';

const input = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-base text-slate-100';
const action = 'rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold disabled:opacity-50';
const months = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('en-PH', { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2000, i, 1)));
const pad = (n: number) => String(n).padStart(2, '0');

function BirthDateFields({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [year = '', month = '', day = ''] = value.split('-');
  const currentYear = Number(todayInManila().slice(0, 4));
  const days = month ? new Date(Date.UTC(year.length === 4 ? Number(year) : 2000, Number(month), 0)).getUTCDate() : 31;
  const change = (y: string, m: string, d: string) => {
    const maxDay = m ? new Date(Date.UTC(y.length === 4 ? Number(y) : 2000, Number(m), 0)).getUTCDate() : 31;
    onChange([y, m, Number(d) > maxDay ? '' : d].join('-'));
  };
  return <fieldset className="sm:col-span-2">
    <legend className="font-medium">Date of birth</legend>
    <div className="grid grid-cols-3 gap-2">
      <label>Month<select autoComplete="bday-month" required className={input} value={month} onChange={e => change(year, e.target.value, day)}>
        <option value="">Select</option>
        {months.map((name, i) => <option key={name} value={pad(i + 1)}>{name}</option>)}
      </select></label>
      <label>Day<select autoComplete="bday-day" required className={input} value={day} onChange={e => change(year, month, e.target.value)}>
        <option value="">Select</option>
        {Array.from({ length: days }, (_, i) => <option key={i + 1} value={pad(i + 1)}>{i + 1}</option>)}
      </select></label>
      <label>Year<input autoComplete="bday-year" inputMode="numeric" required pattern="[0-9]{4}" maxLength={4} placeholder="YYYY" className={input} value={year} onChange={e => change(e.target.value.replace(/\D/g, ''), month, day)} /></label>
    </div>
    <p className="mt-1">Age: {Number(year) <= currentYear ? ageFromBirthdate(value) ?? '—' : '—'}</p>
  </fieldset>;
}

export function ProfileEditor({ user, showDetails = false }: { user: UserProfile; showDetails?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [verificationFlow, setVerificationFlow] = useState<'PROFILE' | 'PASSWORD' | null>(null);
  const [draft, setDraft] = useState(user);
  const [phone, setPhone] = useState(mobileDigits(user.mobileNumber || ''));
  const [changeAddress, setChangeAddress] = useState(false);
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const address = user.address?.completeAddress || [user.address?.houseUnitStreet, user.address?.municipality, user.address?.zipCode].filter(Boolean).join(', ');

  const openEditor = () => {
    setDraft({ ...user, dateOfBirth: String(user.dateOfBirth || '').slice(0, 10) });
    setPhone(mobileDigits(user.mobileNumber || ''));
    setChangeAddress(false);
    setContact('');
    setCode('');
    setError('');
    setSuccess('');
    setVerificationFlow(null);
    setChangingPassword(false);
    setEditing(true);
  };

  const acceptVerificationResult = (result: any) => {
    setCode('');
    if (result.awaitingApproval) {
      setEditing(false);
      setChangingPassword(false);
      setVerificationFlow(null);
      setContact('');
      setSuccess(result.message || 'Your verified changes are waiting for administrator approval.');
      return;
    }
    if (result.complete) {
      window.location.reload();
      return;
    }
    setContact(result.contact);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (verificationFlow === 'PROFILE') {
        acceptVerificationResult(await api.verifyProfileChange(code));
      } else {
        const age = ageFromBirthdate(draft.dateOfBirth);
        if (age === null) throw Error('Enter a valid date of birth.');
        const result = await api.requestProfileChange({
          ...draft,
          address: changeAddress ? draft.address : user.address,
          mobileNumber: phone ? `+63${phone}` : '',
        });
        setVerificationFlow('PROFILE');
        setCode('');
        setContact(result.contact);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile changes.');
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (verificationFlow === 'PASSWORD') {
        acceptVerificationResult(await api.verifyProfileChange(code));
      } else {
        const result = await api.changePassword({ currentPassword, password, confirmPassword: confirm });
        setVerificationFlow('PASSWORD');
        setCode('');
        setContact(result.contact);
        setCurrent(''); setPassword(''); setConfirm('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  };

  const cancelProfileEdit = () => {
    setEditing(false);
    setContact(''); setCode(''); setVerificationFlow(null); setError('');
  };
  const togglePassword = () => {
    setEditing(false);
    setContact(''); setCode(''); setVerificationFlow(null); setError(''); setSuccess('');
    setChangingPassword(!changingPassword);
  };

  return <section className="mt-5 space-y-5 border-t border-slate-700 pt-5 text-sm">
    {showDetails && !editing && <dl className="grid gap-4 sm:grid-cols-2">
      {[
        ['Full name', [user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(' ')],
        ['Date of birth', user.dateOfBirth?.slice(0, 10)],
        ['Email', user.email],
        ['Mobile number', user.mobileNumber],
        ['Residential address', address],
      ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="font-semibold">{label}</dt><dd className="mt-1 break-words">{value || 'Not recorded'}</dd></div>)}
    </dl>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} className="rounded-lg border border-slate-600 px-4 py-2" onClick={editing ? cancelProfileEdit : openEditor}>{editing ? 'Cancel profile edit' : 'Edit profile'}</button>
      <button type="button" disabled={busy} className="rounded-lg border border-slate-600 px-4 py-2" onClick={togglePassword}>{changingPassword ? 'Cancel password change' : 'Change password'}</button>
    </div>
    {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {editing && <form onSubmit={submit} className="space-y-4">
      {verificationFlow === 'PROFILE' ? <>
        <p role="status">Enter the code sent to {contact}. Your current email and any changed contact details must be verified.</p>
        <label className="block">Verification code<input required className={input} autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>
      </> : <>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['firstName', 'middleName', 'lastName'] as const).map((key, i) => <label key={key}>{['First name', 'Middle name (optional)', 'Last name'][i]}<input required={key !== 'middleName'} maxLength={100} className={input} value={draft[key] || ''} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
          <label>Suffix<SuffixSelect className={input} value={draft.suffix || ''} onChange={suffix => setDraft({ ...draft, suffix })} /></label>
          <BirthDateFields value={draft.dateOfBirth} onChange={dateOfBirth => setDraft({ ...draft, dateOfBirth })} />
          <label>Email<input type="email" className={input} value={draft.email || ''} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
          <label>Mobile number<MobileInput className={input} value={phone} onChange={setPhone} /></label>
        </div>
        <label className="flex gap-2"><input type="checkbox" checked={changeAddress} onChange={e => setChangeAddress(e.target.checked)} />Change residential address</label>
        {changeAddress && <AddressFields value={draft.address} onChange={address => setDraft({ ...draft, address })} className={input} />}
        <p>A verification code will be sent to your verified email. If you change your email or mobile number, that new contact must also be verified.{user.role === 'WORKER' ? ' An administrator must approve the changes before they take effect.' : ''}</p>
      </>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <button disabled={busy} className={action}>{busy ? 'Please wait…' : verificationFlow === 'PROFILE' ? 'Verify and continue' : 'Send email verification'}</button>
    </form>}
    {changingPassword && <form className="space-y-3 border-t border-slate-700 pt-5" onSubmit={submitPassword}>
      {verificationFlow === 'PASSWORD' ? <>
        <p role="status">Enter the verification code sent to {contact}. The password will not change until the code is confirmed{user.role === 'WORKER' ? ' and an administrator approves the request' : ''}.</p>
        <label className="block">Email verification code<input required className={input} autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>
      </> : <>
      <label className="block">Current password<PasswordInput required className={input} autoComplete="current-password" value={currentPassword} onChange={e => setCurrent(e.target.value)} /></label>
      <label className="block">New password<PasswordInput required minLength={8} maxLength={128} className={input} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label className="block">Confirm new password<PasswordInput required minLength={8} maxLength={128} className={input} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      <p>Use 8–128 characters with uppercase, lowercase, a number and a symbol. A verification code will be sent to your verified email.</p>
      </>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <button disabled={busy} className={action}>{busy ? 'Please wait…' : verificationFlow === 'PASSWORD' ? 'Verify password change' : 'Send email verification'}</button>
    </form>}
  </section>;
}
