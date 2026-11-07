import React, { useEffect, useState } from 'react';
import { UserProfile } from '../../types';
import { api } from '../../services/api';
import { AddressFields } from './AddressFields';
import { BirthDateFields, MobileInput, mobileDigits, SuffixSelect, PasswordInput, ageFromBirthdate } from './IdentityFields';

const input = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-base text-slate-100';
const action = 'rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold disabled:opacity-50';
export function ProfileEditor({ user, showDetails = false }: { user: UserProfile; showDetails?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
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

  useEffect(() => {
    // Clear an email-code step left open by an older worker profile-edit flow.
    if (user.role === 'WORKER' && verificationFlow === 'PROFILE') {
      setVerificationFlow(null);
      setContact('');
      setCode('');
    }
  }, [user.role, verificationFlow]);

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
        if (result.awaitingApproval) {
          acceptVerificationResult(result);
        } else {
          setVerificationFlow('PROFILE');
          acceptVerificationResult(result);
        }
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
      } else if (recoveryMode) {
        const result = await api.requestPasswordRecovery({ password, confirmPassword: confirm });
        setVerificationFlow('PASSWORD');
        setCode('');
        setContact(result.contact);
        setPassword(''); setConfirm(''); setRecoveryMode(false);
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
    setRecoveryMode(false);
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
          <BirthDateFields className="sm:col-span-2" inputClassName={input} value={draft.dateOfBirth} onChange={dateOfBirth => setDraft({ ...draft, dateOfBirth })} legend="Date of birth (month, day, and year)" />
          <label>Email<input type="email" className={input} value={draft.email || ''} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
          <label>Mobile number<MobileInput className={input} value={phone} onChange={setPhone} /></label>
        </div>
        <label className="flex gap-2"><input type="checkbox" checked={changeAddress} onChange={e => setChangeAddress(e.target.checked)} />Change residential address</label>
        {changeAddress && <AddressFields value={draft.address} onChange={address => setDraft({ ...draft, address })} className={input} />}
        <p>{user.role === 'WORKER'
          ? 'Your profile changes will be sent to the administrator for review. They will take effect only after approval.'
          : 'A verification code will be sent to your verified email. If you change your email or mobile number, that new contact must also be verified.'}</p>
      </>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <button disabled={busy} className={action}>{busy ? 'Please wait…' : verificationFlow === 'PROFILE' ? 'Verify and continue' : user.role === 'WORKER' ? 'Submit for admin approval' : 'Send email verification'}</button>
    </form>}
    {changingPassword && <form className="space-y-3 border-t border-slate-700 pt-5" onSubmit={submitPassword}>
      {verificationFlow === 'PASSWORD' ? <>
        <p role="status">Enter the verification code sent to {contact}. The password will not change until the code is confirmed{user.role === 'WORKER' ? ' and an administrator approves the request' : ''}.</p>
        <label className="block">Email verification code<input required className={input} autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>
      </> : recoveryMode ? <>
        <p>Choose a new password. A code will be sent to the verified email on this signed-in worker account, and an administrator must approve the recovery before it takes effect.</p>
        <label className="block">New password<PasswordInput required minLength={8} maxLength={128} className={input} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block">Confirm new password<PasswordInput required minLength={8} maxLength={128} className={input} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      </> : <>
        <label className="block">Current password<PasswordInput required className={input} autoComplete="current-password" value={currentPassword} onChange={e => setCurrent(e.target.value)} /></label>
        <label className="block">New password<PasswordInput required minLength={8} maxLength={128} className={input} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block">Confirm new password<PasswordInput required minLength={8} maxLength={128} className={input} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <p>Use 8–128 characters with uppercase, lowercase, a number and a symbol. A verification code will be sent to your verified email.</p>
        {user.role === 'WORKER' && <button type="button" className="text-sm font-semibold text-blue-700 underline" onClick={() => { setRecoveryMode(true); setCurrent(''); setError(''); }}>Forgot your current password?</button>}
      </>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <button disabled={busy} className={action}>{busy ? 'Please wait…' : verificationFlow === 'PASSWORD' ? 'Verify password change' : recoveryMode ? 'Send recovery code' : 'Send email verification'}</button>
    </form>}
  </section>;
}
