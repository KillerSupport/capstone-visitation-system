import React, { useState } from 'react';
import { Contact, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { UserProfile } from '../../types';
import { api } from '../../services/api';

interface EmailConfirmationViewProps {
  user: UserProfile;
  onEmailConfirmed: (user: UserProfile) => void;
  onLogout: () => void;
  initialDevelopmentOtp?: string | null;
}

export const EmailConfirmationView: React.FC<EmailConfirmationViewProps> = ({
  user,
  onEmailConfirmed,
  onLogout,
  initialDevelopmentOtp,
}) => {
  const verificationMethod = user.email ? 'email address' : 'mobile number';
  const deliveryDestination = user.email || user.mobileNumber;
  const [otpInput, setOtpInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState<string | null>(initialDevelopmentOtp || null);

  const handleVerify = async () => {
    setErrorMessage(null);
    if (otpInput.trim().length !== 6) { setErrorMessage('Enter the 6-digit code sent to your registered contact.'); return; }
    setIsVerifying(true);
    try { const result=await api.verifyOtp(otpInput.trim()); onEmailConfirmed(result.user); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Verification failed.'); }
    finally { setIsVerifying(false); }
  };
  const handleResend = async () => { setErrorMessage(null);setIsResending(true);try{const r=await api.resendOtp();setDevelopmentOtp(r.developmentOtp||null)}catch(e){setErrorMessage(e instanceof Error?e.message:'Could not resend the verification code.')}finally{setIsResending(false)} };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl mb-8">
        <div className="flex items-start justify-between border-b border-slate-800 pb-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Contact className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
                Step 1 • Contact verification
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Confirm your email or mobile number
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter the 6-digit code sent to your registered contact.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-mono">Reference No.</span>
            <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
              {user.biometricReferenceNumber}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          {/* Left: Interactive Verification Input */}
          <div className="col-span-5 bg-slate-950/60 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-2">Enter Confirmation Code</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Please check <strong className="text-slate-200 font-medium">{deliveryDestination}</strong> and type the 6-digit confirmation code below.
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-center font-mono text-2xl tracking-[0.4em] text-blue-400 focus:outline-none focus:border-blue-400 placeholder:text-slate-600 shadow-inner"
                />
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleVerify()}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-blue-500/10 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <span>Checking verification code...</span>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {developmentOtp&&<div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-center text-xs text-amber-100">Development SMS mock code: <strong className="font-mono">{developmentOtp}</strong></div>}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend code</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Need to switch accounts?</span>
              <button
                type="button"
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Right: Verification instructions */}
          <div className="col-span-7 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <Inbox className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-slate-300">Verification delivery</span>
              </div>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {user.email ? 'Email verification' : 'SMS verification'}
              </span>
            </div>

            {/* Contact Verification Details */}
            <div className="p-6 text-slate-300 text-xs">
              <div className="border-b border-slate-800 pb-4 mb-4">
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Delivery method: <strong className="text-slate-300">{user.email ? 'Email' : 'SMS'}</strong></span>
                  <span>Just now</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Sent to: <strong className="text-slate-300">{deliveryDestination}</strong>
                </div>
                <h4 className="text-sm font-bold text-white mt-2">
                  Action Required: Verify your BJMP visitor account
                </h4>
              </div>

              {/* Verification Details */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 flex items-center justify-center">
                    <img src="/assets/bjmp_icon.png" alt="BJMP" className="w-7 h-7 object-contain" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">BJMP Imus City Jail • Region IV-A</div>
                    <div className="text-[10px] text-slate-400">Imus City, Cavite • DILG</div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-300">
                  Dear <strong className="text-white">{user.firstName} {user.lastName}</strong>,
                </p>

                <p className="text-xs leading-relaxed text-slate-300">
                  Thank you for applying for a visitor account with the BJMP Imus City Jail Visitation System. Your account application has been received and is pending identity verification.
                </p>

                <div className="bg-slate-950 border border-blue-500/30 rounded-lg p-4 text-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                    Your 6-Digit Verification Code:
                  </span>
                  <div className="text-3xl font-mono font-black text-blue-400 tracking-widest my-1">
                    ••••••
                  </div>
                  <span className="text-[10px] text-slate-500">Valid for 10 minutes</span>
                </div><div className="border-t border-slate-800 pt-3 text-[10px] text-slate-400 leading-relaxed">
                  <strong className="text-blue-400">Next Mandatory Step:</strong> After verifying your {verificationMethod}, continue to the protected Identity Verification page to submit your ID for administrator review. Confirm current facility details before traveling.
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
