import React, { useState } from 'react';
import { X, AlertCircle, Check, Circle } from 'lucide-react';
import { UserProfile, UserAddress } from '../../types';
import { AddressFields, emptyAddress } from '../Common/AddressFields';
import { BirthDateFields, MobileInput, SuffixSelect, PasswordInput, ageFromBirthdate, birthdateCutoff } from '../Common/IdentityFields';

interface Props { isOpen: boolean; onClose: () => void; onRegisterSuccess: (u: UserProfile) => Promise<void> | void }

export const SignUpModal: React.FC<Props> = ({ isOpen, onClose, onRegisterSuccess }) => {
  const [firstName, setFirstName] = useState(''), [middleName, setMiddleName] = useState(''), [lastName, setLastName] = useState(''), [suffix, setSuffix] = useState(''), [dateOfBirth, setBirth] = useState(''), [gender, setGender] = useState('Prefer not to say'), [email, setEmail] = useState(''), [phone, setPhone] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [address, setAddress] = useState<UserAddress>({ ...emptyAddress }), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  if (!isOpen) return null;

  const age = ageFromBirthdate(dateOfBirth);
  const underage = age !== null && age < 18;
  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: '1 uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: '1 lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: '1 number (0-9)', met: /\d/.test(password) },
    { label: '1 symbol (e.g. !, @, #)', met: /[^A-Za-z0-9\s]/.test(password) },
  ];
  const input = 'w-full rounded-xl border border-white/20 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none focus:border-blue-400';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (age === null) return setError('Enter a valid birthdate that is not in the future.');
    if (underage) return setError('You must be at least 18 years old to register.');
    if (!email.trim() && !phone) return setError('Enter an email or mobile number, or both.');
    if (phone && !/^9\d{9}$/.test(phone)) return setError('Enter exactly 10 mobile digits, starting with 9.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,128}$/.test(password)) return setError('Password needs 8-128 characters, including an uppercase letter, a lowercase letter, a number, and a symbol.');
    setSaving(true);
    try {
      await onRegisterSuccess({ firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim(), suffix, dateOfBirth, gender, email: email.trim().toLowerCase(), mobileNumber: phone ? `+63${phone}` : '', password, address } as UserProfile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-label="Create account" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-6 text-slate-100 shadow-2xl sm:p-8">
      <header className="mb-6 flex items-start justify-between">
        <div><h2 className="text-2xl font-bold">Create your account</h2><p className="mt-1 text-sm text-slate-300">You must be at least 18 years old to create an account. Verify your contacts, then submit your ID for review.</p></div>
        <button type="button" aria-label="Close signup" onClick={onClose}><X /></button>
      </header>
      {error && <p role="alert" className="mb-4 flex gap-2 text-rose-300"><AlertCircle size={18} />{error}</p>}
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {[[firstName, setFirstName, 'First name'], [middleName, setMiddleName, 'Middle name (optional)'], [lastName, setLastName, 'Last name']].map(([value, set, label]: any) => <label key={label} className="text-xs">{label}<input required={!label.includes('optional')} maxLength={100} className={`${input} mt-1`} value={value} onChange={e => set(e.target.value)} /></label>)}
          <label className="text-xs">Suffix (optional)<SuffixSelect className={`${input} mt-1`} value={suffix} onChange={setSuffix} /></label>
          <BirthDateFields className="sm:col-span-2" inputClassName={input} value={dateOfBirth} onChange={setBirth} maxDate={birthdateCutoff(18)} descriptionId="signup-birthdate-help" legend="Date of birth (month, day, and year)" />
          <p id="signup-birthdate-help" className={`sm:col-span-2 -mt-2 text-xs ${dateOfBirth && (age === null || underage) ? 'text-rose-400' : 'text-slate-300'}`} aria-live="polite">
            {dateOfBirth ? age === null ? 'Enter a valid birthdate that is not in the future.' : underage ? `Age: ${age}. You must be at least 18 years old to register.` : `Age: ${age}` : 'You must be 18 years old or older.'}
          </p>
          <label className="text-xs">Gender<select className={`${input} mt-1`} value={gender} onChange={e => setGender(e.target.value)}>{['Prefer not to say', 'Female', 'Male', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs">Email (optional if mobile provided)<input className={`${input} mt-1`} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="text-xs">Mobile number<MobileInput className={`${input} mt-1`} value={phone} onChange={setPhone} /></label>
          <label className="text-xs">Password<PasswordInput className={`${input} mt-1`} autoComplete="new-password" required minLength={8} maxLength={128} aria-describedby="signup-password-requirements" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label className="text-xs">Confirm Password<PasswordInput className={`${input} mt-1`} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
          <div id="signup-password-requirements" className="text-xs text-slate-300 sm:col-span-2">
            <p>Password must contain (maximum 128 characters):</p>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">{passwordRequirements.map(({ label, met }) => <li key={label} className="flex items-center gap-1.5">
              {met ? <Check size={14} className="shrink-0" aria-hidden="true" /> : <Circle size={12} className="shrink-0" aria-hidden="true" />}
              <span className="sr-only">{met ? 'Met: ' : 'Required: '}</span>{label}
            </li>)}</ul>
          </div>
        </div>
        <AddressFields value={address} onChange={setAddress} className={input} />
        <label className="block text-xs">Civil status<select className={`${input} mt-1`} value={address.maritalStatus} onChange={e => setAddress({ ...address, maritalStatus: e.target.value as any })}>{['Single', 'Married', 'Widowed', 'Separated', 'Divorced'].map(x => <option key={x}>{x}</option>)}</select></label>
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          <p className="text-sm">Already have an account? <button type="button" className="text-blue-300 underline" onClick={onClose}>Log in</button></p>
          <button disabled={saving || underage || (!!dateOfBirth && age === null)} className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Creating account...' : 'Create account'}</button>
        </footer>
      </form>
    </section>
  </div>;
};
