import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Shield, CheckCircle, Fingerprint, Clock, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';

interface LoginPageProps {
  onLogin: (email: string, password: string) => boolean;
  onOpenSignUp: () => void;
  onOpenForgotPassword: () => void;
  demoUsers: UserProfile[];
  onSelectDemoUser: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onOpenSignUp,
  onOpenForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email || !password) {
      setErrorMessage('Please enter both your registered email address and password.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const success = onLogin(email, password);
      setIsLoading(false);
      if (!success) {
        setErrorMessage('Invalid email or password. Please verify your credentials and try again.');
      }
    }, 350);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 bg-slate-950">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        
        {/* Left Col: Official BJMP Institutional Information */}
        <div className="md:col-span-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div>
            {/* Crest and Title */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  DILG • Region IV-A CALABARZON
                </span>
                <h2 className="text-lg font-extrabold text-white tracking-tight">
                  BJMP Imus City Jail
                </h2>
                <span className="text-[11px] text-slate-400 font-medium block">
                  Male & Female Dormitories
                </span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 mb-5 text-[11px] text-slate-300">
              <span className="text-blue-400 font-bold block mb-0.5">Facility Location:</span>
              <span>Brgy. Malagasang 1-G, Imus City, Cavite 4103</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Official electronic portal for inmate visitation booking, biometric registration status, and Gate 1 digital clearance passes.
            </p>

            {/* Official Requirements List */}
            <div className="space-y-3 text-xs">
              <div className="flex items-start space-x-2.5 bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block text-[11px]">Identity KYC Verification</strong>
                  <span className="text-slate-400 text-[10px]">Valid government photo ID (PhilSys, Driver's License, Passport, UMID).</span>
                </div>
              </div>
              <div className="flex items-start space-x-2.5 bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg">
                <Fingerprint className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block text-[11px]">In-Person Biometric Scan</strong>
                  <span className="text-slate-400 text-[10px]">Mandatory digital fingerprint enrollment at jail records desk before first visit.</span>
                </div>
              </div>
              <div className="flex items-start space-x-2.5 bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg">
                <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block text-[11px]">Instant Gate QR Passes</strong>
                  <span className="text-slate-400 text-[10px]">Avoid queues by scheduling morning or afternoon visitation slots in advance.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>BJMP Portal Desk Edition</span>
            <span className="font-mono text-slate-400">Ver. 2026.5</span>
          </div>
        </div>

        {/* Right Col: Official Login Form */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center bg-slate-900">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                Portal Authentication
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Sign in to your account
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered credentials to manage visits and passes
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. maria.santos@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={onOpenForgotPassword}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 rounded-lg pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying BJMP Records...</span>
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Log In to Portal</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400 mb-2">
                First time visiting an inmate at BJMP Imus City Jail?
              </p>
              <button
                type="button"
                onClick={onOpenSignUp}
                className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Create an Account</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
