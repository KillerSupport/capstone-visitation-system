import React, { useState, useEffect } from 'react';
import { UserProfile, VisitationAppointment, AccountStatus, PDL, isStaffRole } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginPage } from './components/Auth/LoginPage';
import { ForgotPasswordModal } from './components/Auth/ForgotPasswordModal';
import { SignUpModal } from './components/Registration/SignUpModal';
import { EmailConfirmationView } from './components/Verification/EmailConfirmationView';
import { BiometricNoticeView } from './components/Verification/BiometricNoticeView';
import { VisitorDashboard } from './components/Dashboard/VisitorDashboard';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { WorkerDashboard } from './components/Dashboard/WorkerDashboard';
import { IdentityVerificationPage } from './components/Verification/IdentityVerificationPage';
import { AdminKycPanel } from './components/Admin/AdminKycPanel';
import { GuardScannerModal } from './components/Guard/GuardScannerModal';
import { Shield, Bell, CheckCircle2 } from 'lucide-react';
import { api } from './services/api';
import { realtimeWS } from './services/websocket';

export default function App() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<VisitationAppointment[]>([]);
  const [pdls, setPdls] = useState<PDL[]>([]);

  // Modals & Views
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isGuardScannerOpen, setIsGuardScannerOpen] = useState(false);
  const [guardScannerVisitorId, setGuardScannerVisitorId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [devVerificationOtp,setDevVerificationOtp]=useState<string|null>(null);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'visitor'>('admin');

  useEffect(() => { api.me().then(({user}) => { setUsers(prev => [user,...prev.filter(x=>x.id!==user.id)]); setCurrentUserId(user.id); }).catch(() => setCurrentUserId(null)); }, []);

  // Initialize and connect to Real-time WebSocket Server
  useEffect(() => {
    realtimeWS.connect();

    // Listen to real-time events
    const unsubGateScan = realtimeWS.on('GATE_SCAN_EVENT', (data: any) => {
      showToast(data.message || `Gate 1 Scan: ${data.visitorName} - ${data.action}`);
    });

    const unsubApptCreated = realtimeWS.on('APPOINTMENT_CREATED', (newAppt: VisitationAppointment) => {
      setAppointments((prev) => {
        if (prev.some((a) => a.id === newAppt.id)) return prev;
        return [newAppt, ...prev];
      });
      showToast(`Real-Time Sync: New appointment created for ${newAppt.visitorName}`);
    });

    const unsubApptUpdated = realtimeWS.on('APPOINTMENT_STATUS_UPDATED', (updatedAppt: VisitationAppointment) => {
      setAppointments((prev) => prev.map((a) => (a.id === updatedAppt.id ? updatedAppt : a)));
      showToast(`Real-Time Sync: Appointment for ${updatedAppt.visitorName} updated to ${updatedAppt.status}`);
    });

    const unsubUserStatus = realtimeWS.on('USER_STATUS_UPDATED', (updatedUser: UserProfile) => {
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      showToast(`Real-Time Sync: User ${updatedUser.firstName} ${updatedUser.lastName} is now ${updatedUser.accountStatus}`);
    });

    const unsubAnnouncement = realtimeWS.on('ANNOUNCEMENT_BROADCAST', (ann: any) => {
      showToast(`📢 Official Announcement: ${ann.title}`);
    });

    return () => {
      unsubGateScan();
      unsubApptCreated();
      unsubApptUpdated();
      unsubUserStatus();
      unsubAnnouncement();
    };
  }, []);

  // Identify user with WebSocket when currentUser changes
  const currentUser = users.find((u) => u.id === currentUserId) || null;
  const currentUserIsStaff = isStaffRole(currentUser?.role);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
          const [dbUsers, dbAppts, dbPdls] = await Promise.all([api.getUsers(), api.getAppointments(), api.getPdls()]);
          setUsers(dbUsers || []); setAppointments(dbAppts || []); setPdls(dbPdls || []);
        } else if (currentUser.role === 'WORKER' || currentUser.role === 'GUARD' || currentUser.role === 'VERIFICATION_OFFICER') {
          setUsers([currentUser]); setAppointments([]); setPdls([]);
        } else {
          const [ownAppointments, visitorPdls] = await Promise.all([api.getAppointments(), api.getVisitorPdls()]); setUsers([currentUser]); setAppointments(ownAppointments || []); setPdls(visitorPdls || []);
        }
      } catch (e) { console.warn('Could not load role-appropriate account data:', e); }
    };
    void load();
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser) {
      realtimeWS.identify(currentUser.id, currentUser.role);
    }
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSavePdl = async (pdl: PDL) => {
    const result = await api.savePdl(pdl);
    setPdls((previous) => {
      const existing = previous.findIndex((item) => item.id === result.pdl.id);
      if (existing < 0) return [result.pdl, ...previous];
      return previous.map((item) => item.id === result.pdl.id ? result.pdl : item);
    });
    showToast(`PDL record for ${result.pdl.fullName} saved to MySQL.`);
  };

  // Login handler
  const handleLogin = async (identifier: string, pass: string): Promise<boolean> => {
    try { const result = await api.login(identifier, pass); setUsers(prev => [result.user, ...prev.filter(u => u.id !== result.user.id)]); setCurrentUserId(result.user.id); setAdminViewMode('admin'); showToast(`Welcome back, ${result.user.firstName}!`); return true; } catch { return false; }
  };
  const handleLogout = () => {
    void api.logout().catch(() => {});
    setCurrentUserId(null);
    setAdminViewMode('admin');
    showToast('Logged out successfully.');
  };

  // Admin Actions
  const handleUpdateUserStatus = async (userId: string, status: AccountStatus, officerNote?: string) => {
    try {
      const result=await api.updateUserStatus(userId,status,currentUser?.adminTitle);
      setUsers(previous=>previous.map(u=>u.id===userId?result.user:u));
      showToast(`Account status updated to ${status}${officerNote?` (${officerNote})`:''}`);
    } catch(e) { showToast(e instanceof Error?e.message:'Account status could not be changed.'); }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: VisitationAppointment['status']) => {
    try {
      const { appointment } = await api.updateAppointmentStatus(appointmentId, status);
      setAppointments((prev) => prev.map((item) => item.id === appointmentId ? appointment : item));
      showToast(`Appointment status updated to: ${status.toUpperCase()}`);
    } catch (e) { showToast(e instanceof Error ? e.message : 'Appointment status could not be updated.'); }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Archive this visit? It will leave active schedules but remain available in Archive for restoration.')) return;
    const reason=window.prompt('Archive reason:'); if(!reason?.trim()) return;
    try {
      await api.deleteAppointment(appointmentId,reason);
      setAppointments((prev) => prev.filter((item) => item.id !== appointmentId));
      showToast('Visit archived.');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Appointment could not be removed.'); }
  };

  // Registration success
  const handleRegisterSuccess = async (newUser: UserProfile) => {
    try {
      const result = await api.register(newUser);
      setUsers(prev => [result.user, ...prev.filter(u => u.id !== result.user.id)]);
      setDevVerificationOtp(result.developmentOtp||null);
      setCurrentUserId(result.user.id);
      setIsSignUpOpen(false);
      showToast(result.developmentOtp ? `Mock verification code: ${result.developmentOtp}` : 'Account created. Check your email or SMS for the verification code.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Registration failed.');
    }
  };
  // Contact verification is completed by the auth endpoint; proceed to secure document review.
  const handleEmailConfirmed = (verifiedUser: UserProfile) => { setUsers(prev => [verifiedUser, ...prev.filter(u => u.id !== verifiedUser.id)]); setDevVerificationOtp(null); showToast('Contact verified. Continue to Identity Verification.'); };

  // Appointments
  const handleAddAppointment = async (newAppt: Partial<VisitationAppointment>): Promise<VisitationAppointment> => {
    const { appointment } = await api.createAppointment(newAppt);
    setAppointments((prev) => [appointment, ...prev.filter((item) => item.id !== appointment.id)]);
    showToast('Appointment request submitted for review.');
    return appointment;
  };

  const handleCancelAppointment = async (apptId: string) => {
    try {
      const { appointment } = await api.updateAppointmentStatus(apptId, 'Cancelled');
      setAppointments((prev) => prev.map((item) => item.id === apptId ? appointment : item));
      showToast('Visitation appointment cancelled.');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Appointment could not be cancelled.'); }
  };



  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-100 font-sans antialiased">
      
      {/* Refined Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-blue-500/50 text-slate-100 px-4 py-2.5 rounded-lg shadow-xl flex items-center space-x-2.5 text-xs transition-all animate-fadeIn">
          <Bell className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Official Government Header with Live WebSocket Link */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        isAdminView={adminViewMode === 'admin'}
        onToggleAdminView={(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') ? () => setAdminViewMode((m) => (m === 'admin' ? 'visitor' : 'admin')) : undefined}
        onOpenGuardScanner={(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') ? () => {
          setGuardScannerVisitorId(users.find((user) => !isStaffRole(user.role))?.id);
          setIsGuardScannerOpen(true);
        } : undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!currentUser ? (
          <LoginPage
            onLogin={handleLogin}
            onOpenSignUp={() => setIsSignUpOpen(true)}
            onOpenForgotPassword={() => setIsForgotOpen(true)}
          />
        ) : currentUser?.role === 'WORKER' || currentUser?.role === 'GUARD' ? (
          <WorkerDashboard user={currentUser} />
        ) : currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' ? (
          adminViewMode === 'admin' ? (
            <AdminDashboard
              currentUser={currentUser}
              users={users}
              appointments={appointments}
              pdls={pdls}
              onUpdateUserStatus={handleUpdateUserStatus}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onOpenGuardScanner={(visitorId) => {
                setGuardScannerVisitorId(visitorId || users[0]?.id);
                setIsGuardScannerOpen(true);
              }}
              onDeleteAppointment={handleDeleteAppointment}
              onSwitchToVisitorView={() => setAdminViewMode('visitor')}
              onSavePdl={handleSavePdl}
              onUsersRefresh={async()=>{const latest=await api.getUsers();setUsers(latest)}}
            />
          ) : (
            <div>
              {/* Return to Admin Command Banner */}
              <div className="bg-slate-800 border-b border-slate-700 text-slate-200 px-6 py-2 flex items-center justify-between text-xs sticky top-[53px] z-30">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Officer Mode: Previewing Visitor Interface ({currentUser.firstName} {currentUser.lastName})</span>
                </div>
                <button
                  onClick={() => setAdminViewMode('admin')}
                  className="bg-blue-500 hover:bg-blue-400 text-slate-950 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Return to Admin Panel
                </button>
              </div>
              <VisitorDashboard
                user={currentUser}
                pdls={pdls}
                appointments={appointments.filter((a) => a.userId === currentUser.id)}
                onAddAppointment={handleAddAppointment}
                onCancelAppointment={handleCancelAppointment}
                onOpenGuardScanner={(visitorId) => {
                  setGuardScannerVisitorId(visitorId);
                  setIsGuardScannerOpen(true);
                }}
                  />
            </div>
          )
        ) : currentUser?.role === 'VERIFICATION_OFFICER' ? (
          <main className="min-h-screen bg-transparent p-4 text-slate-100 sm:p-8"><div className="mx-auto max-w-7xl"><header className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Verification Officer</p><h1 className="text-2xl font-bold">Identity Review Workspace</h1></div><button onClick={handleLogout} className="rounded-lg border border-white/15 px-3 py-2 text-sm">Log out</button></header><AdminKycPanel /></div></main>
        ) : currentUser.accountStatus === 'PENDING_EMAIL' || (!currentUser.emailVerified && !currentUser.phoneVerified) ? (
          <EmailConfirmationView
            user={currentUser}
            onEmailConfirmed={handleEmailConfirmed}
            onLogout={handleLogout}
            initialDevelopmentOtp={devVerificationOtp}
          />
        ) : currentUser.accountStatus === 'PENDING_VERIFICATION' ? (
          <IdentityVerificationPage user={currentUser} onLogout={handleLogout} />
        ) : currentUser.accountStatus === 'PENDING_BIOMETRICS' ? (
          <BiometricNoticeView
            user={currentUser}
            onLogout={handleLogout}
          />
        ) : (
          <VisitorDashboard
            user={currentUser}
            pdls={pdls}
            appointments={appointments.filter((a) => a.userId === currentUser.id)}
            onAddAppointment={handleAddAppointment}
            onCancelAppointment={handleCancelAppointment}
            onOpenGuardScanner={(visitorId) => {
              setGuardScannerVisitorId(visitorId);
              setIsGuardScannerOpen(true);
            }}
          />
        )}
      </main>

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        onRegisterSuccess={handleRegisterSuccess}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onPasswordResetSuccess={(email) => {
          showToast(`Password successfully reset for ${email}. Please log in.`);
        }}
      />

      {/* Gate 1 Guard Scanner Terminal */}
      <GuardScannerModal
        isOpen={isGuardScannerOpen && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN')}
        onClose={() => setIsGuardScannerOpen(false)}
        users={users}
        appointments={appointments}
        initialVisitorId={guardScannerVisitorId}
      />

      {/* Official Footer */}
      <Footer />
    </div>
  );
}
