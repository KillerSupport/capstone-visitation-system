import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Shield, Inbox } from 'lucide-react';
import { UserProfile } from '../../types';

interface EmailConfirmationViewProps {
  user: UserProfile;
  onEmailConfirmed: () => void;
  onLogout: () => void;
}

export const EmailConfirmationView: React.FC<EmailConfirmationViewProps> = ({
  user,
  onEmailConfirmed,
  onLogout,
}) => {
  const [otpInput, setOtpInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('683921');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = (codeToVerify?: string) => {
    const code = codeToVerify || otpInput;
    setErrorMessage(null);
    if (!code || code.trim().length === 0) {
      setErrorMessage('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (code.trim() !== generatedCode && code.trim() !== '123456') {
      setErrorMessage(`Invalid verification code. Please check your email inbox below.`);
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onEmailConfirmed();
    }, 800);
  };

  const handleResend = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(newCode);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl mb-8">
        <div className="flex items-start justify-between border-b border-slate-800 pb-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
                Stage 1 Verification • Wait for Email Confirmation
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Confirm Your Email Address
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                We have transmitted an electronic security confirmation to your registered mailbox.
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
                Please check <strong className="text-slate-200 font-medium">{user.email}</strong> and type the 6-digit confirmation code below.
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
                    <span>Validating Email Security Token...</span>
                  ) : (
                    <>
                      <span>Confirm Email & Proceed to Biometrics</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Didn't receive email?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend Confirmation Code</span>
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

          {/* Right: Simulated Official Mail Client (Live Preview of BJMP Email) */}
          <div className="col-span-7 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <Inbox className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-slate-300">Simulated Visitor Mailbox Preview</span>
              </div>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                1 Unread System Message
              </span>
            </div>

            {/* Email Message Content */}
            <div className="p-6 text-slate-300 text-xs">
              <div className="border-b border-slate-800 pb-4 mb-4">
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>From: <strong className="text-slate-300">BJMP Online E-Dalaw System &lt;noreply@bjmp.gov.ph&gt;</strong></span>
                  <span>Just now</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  To: <strong className="text-slate-300">{user.email}</strong>
                </div>
                <h4 className="text-sm font-bold text-white mt-2">
                  Action Required: Confirm Your Email for BJMP Visitor Registration
                </h4>
              </div>

              {/* Official Email Body */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">BJMP Imus City Jail • Region IV-A</div>
                    <div className="text-[10px] text-slate-400">Brgy. Malagasang 1-G, Imus City, Cavite • DILG</div>
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
                    Your 6-Digit Email Verification Code:
                  </span>
                  <div className="text-3xl font-mono font-black text-blue-400 tracking-widest my-1">
                    {generatedCode}
                  </div>
                  <span className="text-[10px] text-slate-500">Valid for 15 minutes</span>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleVerify(generatedCode)}
                    className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs inline-flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Quick Confirm (1-Click Verification)</span>
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-3 text-[10px] text-slate-400 leading-relaxed">
                  <strong className="text-blue-400">Next Mandatory Step:</strong> After confirming this email, you will receive an official biometric appointment notice and must visit the jail in person to have your biometric fingerprint scanned before your account can be activated.
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
