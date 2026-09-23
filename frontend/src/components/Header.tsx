import React, { useState, useEffect } from 'react';
import { UserProfile, AccountStatus, isStaffRole } from '../types';
import { Shield, Lock, User, LogOut, CheckCircle2, Clock, Fingerprint, QrCode, Radio, Wifi, WifiOff } from 'lucide-react';
import { realtimeWS, WebSocketStatus } from '../services/websocket';

interface HeaderProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onSelectState?: (status: AccountStatus) => void;
  onOpenGuardScanner?: () => void;
  isAdminView?: boolean;
  onToggleAdminView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenGuardScanner,
  isAdminView,
  onToggleAdminView,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const isStaff = isStaffRole(currentUser?.role);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>(realtimeWS.getStatus());

  useEffect(() => {
    const unsub = realtimeWS.onStatusChange((status) => {
      setWsStatus(status);
    });
    return unsub;
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-lg">
      {/* Official Government Flag Bar */}
      <div className="gov-flag-bar"></div>

      {/* Top Republic Bar */}
      <div className="bg-slate-950 px-6 py-1.5 border-b border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 text-slate-400 text-[11px]">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            GOVPH
          </span>
          <span className="text-slate-600">|</span>
          <span>Republic of the Philippines</span>
          <span className="text-slate-600">|</span>
          <span className="hidden md:inline">Department of the Interior and Local Government (DILG)</span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-blue-400 font-medium">BJMP Region IV-A (CALABARZON)</span>
        </div>

        {/* Real-Time WebSocket & Hotline Status */}
        <div className="flex items-center space-x-3 text-[11px]">
          {/* WebSocket Status Indicator */}
          <div 
            className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-all"
            style={{
              backgroundColor: wsStatus === 'CONNECTED' ? 'rgba(16, 185, 129, 0.12)' : wsStatus === 'RECONNECTING' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              borderColor: wsStatus === 'CONNECTED' ? 'rgba(16, 185, 129, 0.35)' : wsStatus === 'RECONNECTING' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)',
              color: wsStatus === 'CONNECTED' ? '#34d399' : wsStatus === 'RECONNECTING' ? '#fbbf24' : '#f87171',
            }}
            title={
              wsStatus === 'CONNECTED' 
                ? 'Real-Time WebSocket Link Active (Port 4000)' 
                : wsStatus === 'RECONNECTING' 
                ? 'Re-establishing WebSocket connection...' 
                : 'Offline mode (Using local storage cache)'
            }
          >
            {wsStatus === 'CONNECTED' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                <Wifi className="w-3 h-3 text-blue-400" />
                <span className="font-semibold tracking-wide">LIVE WS LINK</span>
              </>
            ) : wsStatus === 'RECONNECTING' ? (
              <>
                <Radio className="w-3 h-3 text-blue-400 animate-spin" />
                <span>RECONNECTING...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span>OFFLINE CACHE</span>
              </>
            )}
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden sm:inline">
            Jail Desk: <span className="font-mono text-blue-300 font-semibold">(046) 471-2854</span>
          </span>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Official BJMP Seal Crest */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[6px] flex flex-col items-center justify-center border border-blue-400/40">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-[7.5px] font-black tracking-tighter text-blue-300">BJMP</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white font-sans">
                  BJMP IMUS CITY JAIL
                </h1>
                <span className="bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                  Cavite
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Inmate Visitation & Biometric Electronic Gate Pass Portal • Brgy. Malagasang 1-G
              </p>
            </div>
          </div>
        </div>

        {/* User / Session Area & Guard Scanner */}
        <div className="flex items-center space-x-3">
          {onOpenGuardScanner && (
            <button
              type="button"
              onClick={onOpenGuardScanner}
              title="Open BJMP Gate 1 Guard Verification Scanner Terminal"
              className="bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-700 hover:border-blue-500/40 shadow-sm cursor-pointer transition-all"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Gate 1</span>
              <span>Scanner</span>
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center space-x-3 bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center shrink-0">
                {currentUser.facePhotoUrl ? (
                  <img
                    src={currentUser.facePhotoUrl}
                    alt={currentUser.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                  <span>{currentUser.firstName} {currentUser.lastName} {currentUser.suffix}</span>
                  {isStaff && (
                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                      {isAdmin ? 'ADMIN' : 'WORKER'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  {isStaff ? (
                    <span className="text-blue-400 font-medium">
                      {currentUser.adminTitle ? currentUser.adminTitle.split('/')[0].trim() : 'Jail Administrator'}
                    </span>
                  ) : (
                    <>
                      {currentUser.accountStatus === 'ACTIVATED' && (
                        <span className="text-blue-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Biometric Verified
                        </span>
                      )}
                      {currentUser.accountStatus === 'PENDING_BIOMETRICS' && (
                        <span className="text-blue-400 font-medium flex items-center gap-1">
                          <Fingerprint className="w-3 h-3" /> Pending Jail Biometrics
                        </span>
                      )}
                      {currentUser.accountStatus === 'PENDING_EMAIL' && (
                        <span className="text-blue-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Email Pending
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isAdmin && onToggleAdminView && (
                <div className="border-l border-slate-700 pl-2 ml-1">
                  <button
                    type="button"
                    onClick={onToggleAdminView}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                      isAdminView
                        ? 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-650'
                        : 'bg-blue-500 text-slate-950 border-blue-400 hover:bg-blue-400'
                    }`}
                    title={isAdminView ? 'Switch to Visitor View Preview' : 'Return to Executive Command Center'}
                  >
                    {isAdminView ? 'Visitor Preview' : 'Admin Panel'}
                  </button>
                </div>
              )}

              <div className="border-l border-slate-700 pl-2.5 ml-1">
                <button
                  onClick={onLogout}
                  title="Log out of account"
                  className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px]">Official BJMP Portal</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
