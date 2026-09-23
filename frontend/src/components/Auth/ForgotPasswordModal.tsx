import React, { useState } from 'react';
import { X, Mail, KeyRound, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordResetSuccess: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onPasswordResetSuccess,
}) => {
  const [step, setStep] = useState<'REQUEST' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS'>('REQUEST');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [simulatedSentCode, setSimulatedSentCode] = useState('841920');

  if (!isOpen) return null;

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }
    setError(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedSentCode(code);
    setStep('VERIFY_OTP');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== simulatedSentCode && otp !== '123456') {
      setError(`Invalid verification code. (Hint for demo: Enter ${simulatedSentCode})`);
      return;
    }
    setError(null);
    setStep('NEW_PASSWORD');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setStep('SUCCESS');
    setTimeout(() => {
      onPasswordResetSuccess(email);
      onClose();
      setStep('REQUEST');
      setEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Reset Visitor Password</h3>
            <p className="text-xs text-slate-400">BJMP Account Recovery Verification</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start space-x-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'REQUEST' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your registered BJMP visitor email address. We will send a secure 6-digit recovery code to reset your password.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="e.g. maria.santos@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer"
              >
                <span>Send Recovery Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {step === 'VERIFY_OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-300">
              A 6-digit password reset code was sent to <strong className="text-blue-300">{email}</strong>.
              <div className="mt-2 text-[11px] text-blue-400/90 font-mono bg-blue-500/10 p-1.5 rounded border border-blue-500/20">
                Official Recovery Token for demo: <strong>{simulatedSentCode}</strong>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-center font-mono text-lg tracking-widest text-blue-300 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep('REQUEST')}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer"
              >
                <span>Verify Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {step === 'NEW_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password (Minimum 8 characters)
              </label>
              <input
                type="password"
                required
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setStep('VERIFY_OTP')}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer"
              >
                <span>Update Password</span>
                <ShieldCheck className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Password Successfully Updated</h4>
            <p className="text-xs text-slate-400">
              Your BJMP Visitor account credentials have been changed. You can now log in with your new password.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
