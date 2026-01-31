import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { LoginPage } from './pages/Loginpage/loginpage';
import { ForgotPasswordPage } from './pages/Forgotpassword/forgotpassword';
import { SchoolSelector } from './pages/schoolselector/schoolselector';
import { ManageSchools } from './pages/admin/manageschools';
import { Sidebar } from './components/sidebar';
import { StaffCreation } from './pages/school-admin/staffcreation';
import { StaffManagement } from './pages/admin/staffmanagement';
import { StudentEnrollment } from './pages/school-admin/studentenrollment';
import { AdminDashboard } from './pages/school-admin/admin-dashboard';
import { AccessControl } from './pages/school-admin/accesscontrol';
import { Menu, ShieldAlert, ShieldCheck } from 'lucide-react';
import { HubSkeleton } from './components/common/skeletoncomp';
import { AttenadnceMapping } from './pages/school-admin/attendancemapping';
import { ClassCreation } from './pages/school-admin/classcreation';
import { StaffPlanning } from './pages/school-admin/staffplanning';
import { TeacherAttendance } from './pages/teacher/teacherattendance';
import { TeacherDashboard } from './pages/teacher/teacherdashboard';
import { Announcements } from './pages/school-admin/announcements';
import { ExamManagement } from './pages/school-admin/exam-management';
import { TeacherMarksEntry } from './pages/teacher/teacherMarksEntry';
import { StudentList } from './components/common/studentlist';
import { FeeManagement } from './pages/school-admin/feemanagement';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './services/supabaseClient';
import { SuperAdminLogs } from './pages/admin/SuperAdminLogs';
import { useAudit } from './hooks/useAudit.ts';
import { LeaveSettings } from './pages/school-admin/leavesetting';
import { TeacherLeaveDashboard } from './pages/teacher/teacherleavedashboard';
import { LeaveApprovals } from './pages/school-admin/leaveapprovals';
import { ConfirmProvider } from './context/ConfirmDialogContext';
import { ResultDeclaration } from './pages/school-admin/resultdeclaration';
import { StudentResults } from './pages/student/studentresult';
// 1. Import the Floating Pill
import './styles/global.css';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="w-full h-full"
  >
    {children}
  </motion.div>
);

const AccessDenied = () => (
  <div className="h-full flex flex-col items-center justify-center text-center p-10 mt-20">
    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-100">
      <ShieldAlert size={40} />
    </div>
    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Access Restricted</h2>
    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[3px] mt-4 max-w-xs leading-relaxed">
      Contact Administrator to enable this module.
    </p>
  </div>
);

function AppContent() {
  const { logAction } = useAudit();
  const { session, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(() => localStorage.getItem('lastActivePage') || 'landing');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(() => {
    const saved = localStorage.getItem('selectedSchoolContext');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const activeSchoolId = profile?.school_id;

  const navigateTo = (pageId: string) => {
    setCurrentPage(pageId);
    localStorage.setItem('lastActivePage', pageId);
  };

  const handleSchoolSelection = (school: any) => {
    setSelectedSchool(school);
    localStorage.setItem('selectedSchoolContext', JSON.stringify(school));
    navigateTo('login');
  };

  const handleLogoutAction = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      setIsLoggingOut(false);
      navigateTo('landing');
      await logAction('LOGOUT', 'User logged out manually');
    }, 500);
  };

  useEffect(() => {
    if (!loading) {
      if (session && profile) {
        if (['landing', 'login', 'forgot-password'].includes(currentPage)) {
          if (profile.role === 'super-admin') navigateTo('manage-schools');
          else if (profile.role === 'school-admin') navigateTo('admin-dashboard');
          else navigateTo('dashboard');
        }
      } else if (!session && !['landing', 'login', 'forgot-password'].includes(currentPage)) {
        navigateTo('landing');
      }
    }
  }, [session, profile, loading, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-8">
        <HubSkeleton />
      </div>
    );
  }

  const isAuthPage = ['landing', 'login', 'forgot-password'].includes(currentPage);

  return (
    <div className={`min-h-screen w-full flex overflow-hidden ${isAuthPage ? 'items-center justify-center bg-gray-100' : 'bg-[#f0f9ff] flex-row h-screen'}`}>
      <Toaster position="bottom-center" />

      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white p-12 rounded-[45px] shadow-2xl border-4 border-white flex flex-col items-center text-center max-w-sm mx-4"
            >
              <div className="relative mb-8">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[35px] flex items-center justify-center shadow-inner"
                >
                  <ShieldCheck size={48} strokeWidth={1.5} />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 border-2 border-blue-400 rounded-[35px]"
                />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">
                Securing <span className="text-blue-700">Session</span>
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">
                Clearing Registry & Logging Out...
              </p>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-8 overflow-hidden">
                <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1 }} className="h-full bg-blue-600" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isAuthPage && session && profile ? (
          <div className="flex w-full h-full overflow-hidden" key="app-main">
            <Sidebar
              activePage={currentPage}
              userRole={profile.role}
              onNavigate={navigateTo}
              isDesktopVisible={isSidebarVisible}
              toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
              onLogout={handleLogoutAction}
            />
            <main className="flex-1 overflow-y-auto bg-[#f8fafc] transition-all duration-300 relative z-0 scroll-smooth">
              {!isSidebarVisible && (
                <button onClick={() => setIsSidebarVisible(true)} className="hidden md:flex fixed top-6 left-6 z-50 p-3 bg-white shadow-xl rounded-2xl text-blue-600 border border-blue-50">
                  <Menu size={20} />
                </button>
              )}
              <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-screen">
                <AnimatePresence mode="wait">
                  <PageWrapper key={currentPage}>
                    {currentPage === 'student-list' && (
                      (profile.role === 'super-admin' || profile.role === 'school-admin') ? <StudentList /> :
                        (profile.role === 'teacher' && profile.permissions?.studentlist) ? <StudentList /> : <AccessDenied />
                    )}
                    {currentPage === 'manage-schools' && profile.role === 'super-admin' && <ManageSchools />}
                    {currentPage === 'global-staff' && profile.role === 'super-admin' && <StaffManagement />}
                    {currentPage === 'audit-logs' && profile.role === 'super-admin' && <SuperAdminLogs />}
                    {currentPage === 'school-staff' && profile.role === 'school-admin' && <StaffCreation schoolId={activeSchoolId} />}
                    {currentPage === 'leave-settings' && profile.role === 'school-admin' && <LeaveSettings schoolId={activeSchoolId} />}
                    {currentPage === 'leave-approvals' && profile.role === 'school-admin' && <LeaveApprovals schoolId={activeSchoolId} />}
                    {currentPage === 'student-hub' && profile.role === 'school-admin' && <StudentEnrollment schoolId={activeSchoolId} />}
                    {currentPage === 'admin-dashboard' && profile.role === 'school-admin' && <AdminDashboard onNavigate={navigateTo} />}
                    {currentPage === 'access-cntrl' && profile.role === 'school-admin' && <AccessControl schoolId={activeSchoolId} />}
                    {currentPage === 'stfplanning' && profile.role === 'school-admin' && <StaffPlanning schoolId={activeSchoolId} />}
                    {currentPage === 'exammngmt' && profile.role === 'school-admin' && <ExamManagement schoolId={activeSchoolId} />}
                    {currentPage === 'attendance-mapping' && profile.role === 'school-admin' && <AttenadnceMapping schoolId={activeSchoolId} />}
                    {currentPage === 'infra' && profile.role === 'school-admin' && <ClassCreation schoolId={activeSchoolId} />}
                    {currentPage === 'announcement' && profile.role === 'school-admin' && <Announcements schoolId={activeSchoolId} />}
                    {currentPage === 'fee-mngmnt' && profile.role === 'school-admin' && <FeeManagement schoolId={activeSchoolId} />}
                    {currentPage === 'result-dec' && profile.role === 'school-admin' && <ResultDeclaration schoolId={activeSchoolId} />}
                    {currentPage === 'dashboard' && profile.role === 'teacher' && <TeacherDashboard onSelectClass={() => { }} />}
                    {currentPage === 'attendance' && profile.role === 'teacher' && (profile.permissions?.attendance ? <TeacherAttendance /> : <AccessDenied />)}
                    {currentPage === 'marks-entry' && profile.role === 'teacher' && (profile.permissions?.marks ? <TeacherMarksEntry /> : <AccessDenied />)}
                    {currentPage === 'leave-application' && profile.role === 'teacher' && (profile.permissions?.leave ? <TeacherLeaveDashboard /> : <AccessDenied />)}
                    {currentPage === 'assignments' && profile.role === 'teacher' && (profile.permissions?.assignments ? <div className="p-8">Homework Component Content</div> : <AccessDenied />)}


                    {currentPage === 'stu-result' && profile.role === 'student' && <StudentResults schoolId={activeSchoolId} />}
                  </PageWrapper>
                </AnimatePresence>
              </div>
            </main>
          </div>
        ) : (
          isAuthPage && (
            <PageWrapper key={currentPage}>
              <div className="w-full flex items-center justify-center p-4">
                {currentPage === 'landing' && <SchoolSelector onSchoolSelect={handleSchoolSelection} />}
                {currentPage === 'login' && <LoginPage schoolContext={selectedSchool} onBackToLanding={() => navigateTo('landing')} onLoginSuccess={() => { }} onSwitchToForgotPassword={() => navigateTo('forgot-password')} />}
                {currentPage === 'forgot-password' && <ForgotPasswordPage onSwitchToLogin={() => navigateTo('login')} />}
              </div>
            </PageWrapper>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <AppContent />
      </ConfirmProvider>
    </AuthProvider>
  );
}