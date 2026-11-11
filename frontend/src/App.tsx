import {OfficerWorkspace} from './components/Dashboard/OfficerWorkspace';
import React, { useState, useEffect } from 'react';
import { UserProfile, VisitationAppointment, PDL, isStaffRole } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginPage } from './components/Auth/LoginPage';
import { ForgotPasswordModal } from './components/Auth/ForgotPasswordModal';
import { EmailConfirmationView } from './components/Verification/EmailConfirmationView';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { VisitorOperationsDesk } from './components/Dashboard/VisitorOperationsDesk';
import { AdminKycPanel } from './components/Admin/AdminKycPanel';
import { GuardScannerModal } from './components/Guard/GuardScannerModal';
import {ProfileEditor} from './components/Common/ProfileEditor';
import {AppDialogHost} from './components/Common/AppDialogHost';
import {SecurityNotice} from './components/Common/SecurityNotice';
import { Bell } from 'lucide-react';
import { api, type LoginResult } from './services/api';
import { realtimeWS } from './services/websocket';
import {hardware} from './services/hardware';
import {confirmAction,promptAction} from './utils/appDialogs';

export default function App() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<VisitationAppointment[]>([]);
  const [pdls, setPdls] = useState<PDL[]>([]);

  // Modals & Views
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [profileOpen,setProfileOpen]=useState(false);
  const openProfile = () => setProfileOpen(true);
  const [isGuardScannerOpen, setIsGuardScannerOpen] = useState(false);
  const [guardScannerVisitorId, setGuardScannerVisitorId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [devVerificationOtp,setDevVerificationOtp]=useState<string|null>(null);
  const [verificationDeliveryError,setVerificationDeliveryError]=useState<string|null>(null);
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);
  const [dashboardHomeRequest, setDashboardHomeRequest] = useState(0);
  const [dataError,setDataError]=useState('');

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
  const contactsVerified = (user:UserProfile) => user.contactAccessPolicy==='LEGACY_VERIFIED'
    ? Boolean((user.email&&user.emailVerified)||(user.mobileNumber&&user.phoneVerified))
    : (!user.email || user.emailVerified) && (!user.mobileNumber || user.phoneVerified) && Boolean(user.email || user.mobileNumber);
  const isDashboardVisible = Boolean(currentUser && (
    currentUserIsStaff || (
      contactsVerified(currentUser) &&
      !['PENDING_EMAIL', 'PENDING_VERIFICATION', 'PENDING_BIOMETRICS'].includes(currentUser.accountStatus)
    )
  ));

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setDataError('');
      try {
        if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
          const [dbUsers, dbAppts, dbPdls] = await Promise.all([api.getUsers(), api.getAppointments(), api.getPdls()]);
          setUsers(dbUsers || []); setAppointments(dbAppts || []); setPdls(dbPdls || []);
        } else if (currentUser.role === 'OFFICER' || currentUser.role === 'WORKER' || currentUser.role === 'GUARD' || currentUser.role === 'VERIFICATION_OFFICER') {
          setUsers([currentUser]); setAppointments([]); setPdls([]);
        } else {
          setUsers([currentUser]); setAppointments([]); setPdls([]);
        }
      } catch (e) { setDataError(e instanceof Error?e.message:'Account data could not be loaded.'); }
    };
    void load();
  }, [currentUser?.id, currentUser?.role,currentUser?.accountStatus,currentUser?.emailVerified,currentUser?.phoneVerified,currentUser?.contactAccessPolicy]);

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
    return result.pdl;
  };

  // Login handler
  const finishSignIn = (user:UserProfile) => {
    setUsers(prev=>[user,...prev.filter(u=>u.id!==user.id)]);setCurrentUserId(user.id);showToast(`Welcome back, ${user.firstName}!`);
  };
  const handleLogin = async (identifier:string,pass:string):Promise<LoginResult> => {
    const result=await api.login(identifier,pass);
    if('user' in result)finishSignIn(result.user);
    return result;
  };
  const handleLogout = async () => {
    realtimeWS.disconnect();hardware.disconnect();
    await api.logout().catch(() => {});
    setCurrentUserId(null);setProfileOpen(false);
    setUsers([]);setAppointments([]);setPdls([]);setDataError('');
    setIsAdminSidebarOpen(false);
    showToast('Logged out successfully.');
  };

  const handleGoHome = () => {
    if (!isDashboardVisible) return;
    setIsAdminSidebarOpen(false);
    setDashboardHomeRequest((request) => request + 1);
    setIsGuardScannerOpen(false);
    setIsForgotOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    if (!isAdminSidebarOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAdminSidebarOpen(false);
        document.querySelector<HTMLButtonElement>('[aria-controls="admin-navigation"]')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminSidebarOpen]);

  // Administrator actions for the legacy appointment history.
  const handleUpdateAppointmentStatus = async (appointmentId: string, status: VisitationAppointment['status']) => {
    try {
      const { appointment, notifications } = await api.updateAppointmentStatus(appointmentId, status);
      setAppointments((prev) => prev.map((item) => item.id === appointmentId ? appointment : item));
      const pending=notifications?.filter(item=>item.status!=='ACCEPTED'&&item.status!=='MOCK');
      const mock=notifications?.some(item=>item.status==='MOCK');
      showToast(status==='Approved' && pending?.length ? `Appointment approved. ${pending.map(item=>item.channel==='sms'?'Text':'Email').join(' and ')} confirmation could not be sent yet.` : status==='Approved' && mock ? 'Appointment approved. SMS is in test mode; no real text was sent.' : `Appointment status updated to: ${status.toUpperCase()}`);
    } catch (e) { showToast(e instanceof Error ? e.message : 'Appointment status could not be updated.'); }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!await confirmAction('This visit will leave active schedules but remain available in Archive for restoration.', { title: 'Archive visit?', confirmLabel: 'Continue', tone: 'warning' })) return;
    const reason=await promptAction('Give a short reason for archiving this visit.', { title: 'Archive visit', inputLabel: 'Archive reason', placeholder: 'Enter the reason', confirmLabel: 'Archive visit', tone: 'danger' }); if(reason===null) return;
    try {
      await api.deleteAppointment(appointmentId,reason);
      setAppointments((prev) => prev.filter((item) => item.id !== appointmentId));
      showToast('Visit archived.');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Appointment could not be removed.'); }
  };

  // Contact verification is completed by the auth endpoint; proceed to secure document review.
  const handleEmailConfirmed = (verifiedUser:UserProfile,developmentOtp?:string,deliveryError?:string) => {setUsers(prev=>[verifiedUser,...prev.filter(u=>u.id!==verifiedUser.id)]);setDevVerificationOtp(developmentOtp||null);setVerificationDeliveryError(deliveryError||null);showToast(deliveryError || (contactsVerified(verifiedUser)?'Contacts verified. Continue to Identity Verification.':'Contact verified. Enter the code for your other contact.'));};

  return (
    <div className="government-theme min-h-screen flex flex-col text-slate-100 font-sans antialiased">
      <AppDialogHost />
      
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
        onOpenProfile={currentUser ? () => openProfile() : undefined}
        onGoHome={isDashboardVisible ? handleGoHome : undefined}
        isSidebarOpen={isAdminSidebarOpen}
        onToggleSidebar={(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') ? () => setIsAdminSidebarOpen((open) => !open) : undefined}
        onOpenGuardScanner={(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') ? () => {
          setGuardScannerVisitorId(users.find((user) => !isStaffRole(user.role))?.id);
          setIsGuardScannerOpen(true);
        } : undefined}
      />

      {/* Main Content Area */}
      <SecurityNotice/>
      <main className="flex-1">
        {currentUser&&dataError&&<p role="alert" className="mx-auto max-w-7xl p-4 text-sm text-rose-300">Account data could not be loaded: {dataError} <button className="underline" onClick={()=>window.location.reload()}>Retry</button></p>}
        {!currentUser ? (
          <LoginPage
            onLogin={handleLogin}
            onOpenForgotPassword={(identifier) => { setForgotIdentifier(identifier); setIsForgotOpen(true); }}
          />
        ) : (currentUser?.role === 'OFFICER' || currentUser?.role === 'WORKER') && !contactsVerified(currentUser) ? (<EmailConfirmationView user={currentUser} onEmailConfirmed={handleEmailConfirmed} onLogout={handleLogout}/>) : currentUser?.role === 'OFFICER' ? (<OfficerWorkspace user={currentUser}/>) : currentUser?.role === 'WORKER' || currentUser?.role === 'GUARD' ? (
          <VisitorOperationsDesk user={currentUser} />
        ) : currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' ? (
            <AdminDashboard
              isSidebarOpen={isAdminSidebarOpen}
              homeRequest={dashboardHomeRequest}
              currentUser={currentUser}
              users={users}
              appointments={appointments}
              pdls={pdls}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onOpenGuardScanner={(visitorId) => {
                setGuardScannerVisitorId(visitorId || users[0]?.id);
                setIsGuardScannerOpen(true);
              }}
              onDeleteAppointment={handleDeleteAppointment}
              onSavePdl={handleSavePdl}
              onRecordsRefresh={async()=>{const [latestUsers,latestAppointments,latestPdls]=await Promise.all([api.getUsers(),api.getAppointments(),api.getPdls()]);setUsers(latestUsers);setAppointments(latestAppointments);setPdls(latestPdls);}}
            />
        ) : currentUser?.role === 'VERIFICATION_OFFICER' ? (
          <main className="min-h-screen bg-transparent p-4 text-slate-100 sm:p-8"><div className="mx-auto max-w-7xl"><header className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Verification Officer</p><h1 className="text-2xl font-bold">Identity Review Workspace</h1></div><button onClick={handleLogout} className="rounded-lg border border-white/15 px-3 py-2 text-sm">Log out</button></header><AdminKycPanel /></div></main>
        ) : currentUser.accountStatus === 'PENDING_EMAIL' || !contactsVerified(currentUser) ? (
          <EmailConfirmationView
            user={currentUser}
            onEmailConfirmed={handleEmailConfirmed}
            onLogout={handleLogout}
            initialDevelopmentOtp={devVerificationOtp}
            initialDeliveryError={verificationDeliveryError}
          />
        ) : (
          <section className="mx-auto max-w-2xl p-8 text-center text-slate-300">This account does not have an active system workspace. Contact an administrator.</section>
        )}
      </main>

      {profileOpen && currentUser && <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/80 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="profile-title" className="mx-auto my-6 w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100">
          <header className="flex items-center justify-between gap-3">
            <h2 id="profile-title" className="text-xl font-bold">My profile</h2>
            <button type="button" onClick={() => setProfileOpen(false)} className="rounded border border-slate-600 px-3 py-2">Close</button>
          </header>
          <ProfileEditor user={currentUser} showDetails />
        </section>
      </div>}

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        initialIdentifier={forgotIdentifier}
        onClose={() => setIsForgotOpen(false)}
        onPasswordResetSuccess={(identifier, result) => {
          showToast(result?.awaitingApproval
            ? result.adminNotified ? 'Password recovery request sent to an administrator. Check your registered email for the decision.' : 'Password recovery request was saved, but administrator email could not be delivered. Contact an administrator to review it.'
            : `Password successfully reset for ${identifier}. Please log in.`);
        }}
      />

      {/* Gate 1 Guard Scanner Terminal */}
      <GuardScannerModal
        staff={currentUser}
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
