import React, { useState, useEffect } from 'react';
import { UserProfile, VisitationAppointment, AccountStatus, PDL, isStaffRole } from './types';
import { INITIAL_DEMO_USERS, INITIAL_APPOINTMENTS } from './data/bjmpData';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginPage } from './components/Auth/LoginPage';
import { ForgotPasswordModal } from './components/Auth/ForgotPasswordModal';
import { SignUpModal } from './components/Registration/SignUpModal';
import { EmailConfirmationView } from './components/Verification/EmailConfirmationView';
import { BiometricNoticeView } from './components/Verification/BiometricNoticeView';
import { VisitorDashboard } from './components/Dashboard/VisitorDashboard';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { GuardScannerModal } from './components/Guard/GuardScannerModal';
import { Shield, Bell, CheckCircle2 } from 'lucide-react';
import { api } from './services/api';
import { realtimeWS } from './services/websocket';

const USERS_STORAGE_KEY = 'bjmp_imus_users_v2';
const CURRENT_USER_STORAGE_KEY = 'bjmp_imus_current_user_id_v2';
const APPOINTMENTS_STORAGE_KEY = 'bjmp_imus_appointments_v2';

export default function App() {
  // Persistence state
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed: UserProfile[] = JSON.parse(saved);
        const ramburatEmail = 'ramburat077@gmail.com';
        const demoRamburat = INITIAL_DEMO_USERS.find((u) => u.email.toLowerCase() === ramburatEmail)!;
        const existingIdx = parsed.findIndex((u) => u.email.toLowerCase() === ramburatEmail);
        if (existingIdx >= 0) {
          parsed[existingIdx] = {
            ...parsed[existingIdx],
            role: 'ADMIN',
            password: 'Password123',
            adminTitle: parsed[existingIdx].adminTitle || 'BJMP Executive Officer & System Administrator',
          };
        } else if (demoRamburat) {
          parsed.unshift(demoRamburat);
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_DEMO_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CURRENT_USER_STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  });

  const [appointments, setAppointments] = useState<VisitationAppointment[]>(() => {
    try {
      const saved = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_APPOINTMENTS;
  });
  const [pdls, setPdls] = useState<PDL[]>([]);

  // Modals & Views
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isGuardScannerOpen, setIsGuardScannerOpen] = useState(false);
  const [guardScannerVisitorId, setGuardScannerVisitorId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'visitor'>('admin');

  // Load initial data from the MySQL database via API.
  useEffect(() => {
    async function loadDatabaseData() {
      try {
        const [dbUsers, dbAppts, dbPdls] = await Promise.all([
          api.getUsers(),
          api.getAppointments(),
          api.getPdls(),
        ]);
        if (dbUsers && dbUsers.length > 0) {
          setUsers(dbUsers);
        }
        if (dbAppts && dbAppts.length > 0) {
          setAppointments(dbAppts);
        }
        setPdls(dbPdls || []);
      } catch (e) {
        console.warn('Backend API offline or unreachable, using local storage fallback:', e);
      }
    }
    loadDatabaseData();
  }, []);

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
    if (currentUser) {
      realtimeWS.identify(currentUser.id, currentUser.role);
    }
  }, [currentUser]);

  // Sync users to localStorage as offline cache
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  // Sync current user ID to localStorage
  useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, currentUserId);
      } else {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUserId]);

  // Sync appointments to localStorage as offline cache
  useEffect(() => {
    try {
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
    } catch (e) {
      console.error(e);
    }
  }, [appointments]);

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
  const handleLogin = (email: string, pass: string): boolean => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanPass = pass.trim();
    if (!/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) return false;
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (found) {
      const passwordMatch = found.password === cleanPass;

      if (passwordMatch) {
        setCurrentUserId(found.id);
        setAdminViewMode('admin');
        if (isStaffRole(found.role)) {
          showToast(`🛡️ Officer Logged In: ${found.firstName} ${found.lastName} (${found.adminTitle || 'Jail Command'})`);
        } else {
          showToast(`Welcome back, ${found.firstName}!`);
        }
        return true;
      }
    }
    return false;
  };

  const handleSelectDemoUser = (user: UserProfile) => {
    setCurrentUserId(user.id);
    setAdminViewMode('admin');
    if (isStaffRole(user.role)) {
      showToast(`🛡️ Officer Profile: ${user.firstName} ${user.lastName}`);
    } else {
      showToast(`Switched to visitor: ${user.firstName} (${user.accountStatus})`);
    }
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setAdminViewMode('admin');
    showToast('Logged out successfully.');
  };

  // Admin Actions
  const handleUpdateUserStatus = async (userId: string, status: AccountStatus, officerNote?: string) => {
    const isActivated = status === 'ACTIVATED';
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          accountStatus: status,
          biometricScannedAt: isActivated ? (u.biometricScannedAt || new Date().toLocaleString()) : u.biometricScannedAt,
          biometricsOfficerName: isActivated ? (currentUser?.adminTitle || 'JO2 R. BAUTISTA (BJMP Desk)') : u.biometricsOfficerName,
        };
      }
      return u;
    });
    setUsers(updatedUsers);

    try {
      await api.updateUserStatus(userId, status, currentUser?.adminTitle);
    } catch (e) {
      console.warn('Updated status saved locally:', e);
    }

    showToast(`Visitor status updated to: ${status}${officerNote ? ` (${officerNote})` : ''}`);
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: VisitationAppointment['status']) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status } : a))
    );

    try {
      await api.updateAppointmentStatus(appointmentId, status);
    } catch (e) {
      console.warn('Updated appointment status saved locally:', e);
    }

    showToast(`Appointment status updated to: ${status.toUpperCase()}`);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));

    try {
      await api.deleteAppointment(appointmentId);
    } catch (e) {
      console.warn('Deleted appointment saved locally:', e);
    }

    showToast('Appointment removed from system records.');
  };

  // Registration success
  const handleRegisterSuccess = async (newUser: UserProfile) => {
    setUsers((prev) => [newUser, ...prev]);
    setCurrentUserId(newUser.id);
    setIsSignUpOpen(false);

    try {
      await api.register(newUser);
    } catch (e) {
      console.warn('Registered visitor saved locally:', e);
    }

    showToast('Registration submitted! Please verify your email address.');
  };

  // Step 3: Email confirmed -> PENDING_BIOMETRICS
  const handleEmailConfirmed = async () => {
    if (!currentUser) return;
    const updatedUsers = users.map((u) => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          accountStatus: 'PENDING_BIOMETRICS' as AccountStatus,
          emailVerifiedAt: new Date().toLocaleString(),
        };
      }
      return u;
    });
    setUsers(updatedUsers);

    try {
      await api.updateUserStatus(currentUser.id, 'PENDING_BIOMETRICS');
    } catch (e) {
      console.warn('Status update saved locally:', e);
    }

    showToast('Email verified! You must now visit the jail in person for biometric fingerprint scanning.');
  };

  // Step 4: Biometrics scanned at jail -> ACTIVATED
  const handleBiometricScanned = async () => {
    if (!currentUser) return;
    const updatedUsers = users.map((u) => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          accountStatus: 'ACTIVATED' as AccountStatus,
          biometricScannedAt: new Date().toLocaleString(),
          biometricsOfficerName: 'JO2 R. BAUTISTA (BJMP Records Desk)',
        };
      }
      return u;
    });
    setUsers(updatedUsers);

    try {
      await api.updateUserStatus(currentUser.id, 'ACTIVATED', 'JO2 R. BAUTISTA (BJMP Records Desk)');
    } catch (e) {
      console.warn('Status update saved locally:', e);
    }

    showToast('Biometric fingerprint verified! Account is now ACTIVATED. You can now book visitation appointments.');
  };

  // Appointments
  const handleAddAppointment = async (newAppt: VisitationAppointment) => {
    setAppointments((prev) => [newAppt, ...prev]);

    try {
      await api.createAppointment(newAppt);
    } catch (e) {
      console.warn('New appointment saved locally:', e);
    }

    showToast('Visitation appointment scheduled! Electronic gate pass generated.');
  };

  const handleCancelAppointment = async (apptId: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== apptId));

    try {
      await api.updateAppointmentStatus(apptId, 'Cancelled');
    } catch (e) {
      console.warn('Cancellation saved locally:', e);
    }

    showToast('Visitation appointment cancelled.');
  };

  // Quick Book Helper for Guard/ID testing
  const handleQuickBookTodayForUser = async (userId: string, targetDate: string) => {
    const visitor = users.find((u) => u.id === userId);
    if (!visitor) return;

    const existing = appointments.find((a) => a.userId === userId && a.visitDate === targetDate);
    if (existing) {
      showToast(`Visitor already has an appointment booked for ${targetDate}.`);
      return;
    }

    const newAppt: VisitationAppointment = {
      id: `appt-quick-${Date.now()}`,
      appointmentReference: `BJMP-IMUS-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: visitor.id,
      visitorName: `${visitor.firstName} ${visitor.middleName ? `${visitor.middleName} ` : ''}${visitor.lastName} ${visitor.suffix}`.trim(),
      visitorContact: visitor.contactNumber,
      pdlId: 'pdl-001',
      pdlName: 'Danilo M. Cruz',
      pdlNumber: 'BJMP-2024-0891',
      jailFacilityId: 'imus-city-jail-male',
      jailFacilityName: 'BJMP Imus City Jail - Male Dormitory',
      cellDormitory: 'Brigada Malagasang - Selda 4',
      visitType: 'Contact Visit',
      relationshipToPDL: 'Spouse',
      visitDate: targetDate,
      timeSlot: 'Morning Batch (09:00 AM - 11:30 AM)',
      paabotItemsDescription: '1 transparent container with cooked meal, 1 sealed 500ml water bottle.',
      status: 'Approved',
      createdAt: new Date().toISOString().split('T')[0],
      qrToken: `BJMP-IMUS-QR-${visitor.biometricReferenceNumber}-${Date.now()}`,
    };

    setAppointments((prev) => [newAppt, ...prev]);

    try {
      await api.createAppointment(newAppt);
    } catch (e) {
      console.warn('Quick appointment saved locally:', e);
    }

    showToast(`Appointment confirmed for ${targetDate}! Gate scanner will now show CONFIRMED.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased">
      
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
        onToggleAdminView={currentUser?.role === 'ADMIN' ? () => setAdminViewMode((m) => (m === 'admin' ? 'visitor' : 'admin')) : undefined}
        onOpenGuardScanner={currentUserIsStaff ? () => {
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
            demoUsers={users}
            onSelectDemoUser={handleSelectDemoUser}
          />
        ) : currentUserIsStaff ? (
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
              onAddAppointment={handleAddAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              onSwitchToVisitorView={() => setAdminViewMode('visitor')}
              onSavePdl={handleSavePdl}
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
                appointments={appointments.filter((a) => a.userId === currentUser.id)}
                onAddAppointment={handleAddAppointment}
                onCancelAppointment={handleCancelAppointment}
                onOpenGuardScanner={(visitorId) => {
                  setGuardScannerVisitorId(visitorId);
                  setIsGuardScannerOpen(true);
                }}
                onQuickBookToday={() => {
                  handleQuickBookTodayForUser(currentUser.id, new Date().toISOString().split('T')[0]);
                }}
              />
            </div>
          )
        ) : currentUser.accountStatus === 'PENDING_EMAIL' ? (
          <EmailConfirmationView
            user={currentUser}
            onEmailConfirmed={handleEmailConfirmed}
            onLogout={handleLogout}
          />
        ) : currentUser.accountStatus === 'PENDING_BIOMETRICS' ? (
          <BiometricNoticeView
            user={currentUser}
            onBiometricScanned={handleBiometricScanned}
            onLogout={handleLogout}
          />
        ) : (
          <VisitorDashboard
            user={currentUser}
            appointments={appointments.filter((a) => a.userId === currentUser.id)}
            onAddAppointment={handleAddAppointment}
            onCancelAppointment={handleCancelAppointment}
            onOpenGuardScanner={(visitorId) => {
              setGuardScannerVisitorId(visitorId);
              setIsGuardScannerOpen(true);
            }}
            onQuickBookToday={() => {
              handleQuickBookTodayForUser(currentUser.id, new Date().toISOString().split('T')[0]);
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
        isOpen={isGuardScannerOpen}
        onClose={() => setIsGuardScannerOpen(false)}
        users={users}
        appointments={appointments}
        initialVisitorId={guardScannerVisitorId}
        onQuickBookTodayForUser={handleQuickBookTodayForUser}
      />

      {/* Official Footer */}
      <Footer />
    </div>
  );
}
