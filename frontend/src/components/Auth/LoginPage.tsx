import React, { useState } from 'react';
import { Contact, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { type LoginResult } from '../../services/api';

interface LoginPageProps {
  onLogin: (identifier: string, password: string) => Promise<LoginResult>;
  onOpenForgotPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onOpenForgotPassword,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async(e:React.FormEvent)=>{e.preventDefault();setErrorMessage(null);setIsLoading(true);try{await onLogin(identifier.trim(),password)}catch(e){setErrorMessage(e instanceof Error?e.message:'Could not sign in.')}finally{setIsLoading(false)}};

  return (
    <main className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10 sm:py-14 bg-transparent">
      <section className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/70 backdrop-blur-xl shadow-2xl shadow-black/25 px-6 py-7 sm:px-9 sm:py-9">
        <div className="flex items-center gap-3.5 mb-7">
          <img src="/assets/bjmp_icon.png" alt="BJMP" className="w-12 h-12 object-contain shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-blue-300">BJMP Bacoor</p>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Visitation Management System</h1>
            <p className="text-[11px] text-slate-300">Bacoor, Cavite</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in</h2>
          <p className="text-sm text-slate-300 mt-1.5">Use the email address or mobile number assigned to your system account.</p>
        </div>

        {errorMessage && (
          <div className="mb-5 bg-rose-500/15 border border-rose-300/30 rounded-xl p-3.5 flex items-start gap-2.5 text-sm text-rose-100">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label htmlFor="login-identifier" className="block text-sm font-semibold text-slate-100 mb-1.5">Email address or mobile number</label>
            <div className="relative">
              <Contact className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or 09XX XXX XXXX"
                className="w-full bg-slate-950/75 border border-white/20 focus:border-blue-300 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-400 outline-none transition-colors"
              />
            </div>
              <p className="text-xs text-slate-300 mt-1.5">Use your registered email address or mobile number.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-100">Password</label>
              <button type="button" onClick={onOpenForgotPassword} className="text-xs text-blue-300 hover:text-white transition-colors">Forgot password?</button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-slate-950/75 border border-white/20 focus:border-blue-300 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-400 outline-none transition-colors"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-3.5 text-slate-300 hover:text-white cursor-pointer">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/30 transition-all cursor-pointer disabled:opacity-60">
            {isLoading ? <><span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />Checking your account…</> : <><LogIn className="w-4 h-4" />Sign in</>}
          </button>
        </form>
        <p className="mt-6 border-t border-white/15 pt-5 text-center text-[11px] leading-relaxed text-slate-400">Account access is provided by an authorized system administrator.</p>
      </section>
    </main>
  );
};
