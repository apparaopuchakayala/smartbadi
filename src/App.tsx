import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { LoginPage } from './pages/Loginpage/loginpage';
import { ForgotPasswordPage } from './pages/Forgotpassword/forgotpassword';
import { SchoolSelector } from './pages/schoolselector/schoolselector';
import { ManageSchools } from './pages/admin/manageschools';
import { Sidebar } from './components/sidebar';
import { Staffsetup } from './pages/school-admin/staffsetup';
import { StaffManagement } from './pages/admin/staffmanagement';
import { StudentHub } from './pages/school-admin/studenthub';
import { AdminDashboard } from './pages/school-admin/admin-dashboard';
import { AccessControl } from './pages/school-admin/accesscontrol';
import { Menu, ShieldAlert } from 'lucide-react';
import { LoginLoading } from './components/utilitis/LoginLoading';
import { ClassMapping } from './pages/school-admin/classmapping';
import { SchoolInfrastructure } from './pages/school-admin/schoolinfra';
import { AttendanceSettings } from './pages/school-admin/attendancesettings';
import { StaffPlanning } from './pages/school-admin/staffplanning';
import { TeacherAttendance } from './pages/teacher/teacherattendance';
import { TeacherDashboard } from './pages/teacher/teacherdashboard';
import { Announcements } from './pages/school-admin/announcements';
import { ExamManagement } from './pages/school-admin/exam-management';
import { TeacherMarksEntry } from './pages/teacher/teacherMarksEntry';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/global.css';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

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
  <div className="h-full flex flex-col items-center justify-center text-center p-10">
    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-100">
      <ShieldAlert size={40} />
    </div>
    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Access Restricted</h2>
    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 max-w-xs">
      Contact your School Administrator to enable this module for your account.
    </p>
  </div>
);

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(() => localStorage.getItem('lastActivePage') || 'landing');
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

  if (loading) return <LoginLoading />;

  const isAuthPage = ['landing', 'login', 'forgot-password'].includes(currentPage);

  return (
    <div className={`min-h-screen w-full flex overflow-hidden ${isAuthPage ? 'items-center justify-center bg-gray-100' : 'bg-[#f0f9ff] flex-row h-screen'}`}>
      <Toaster position="bottom-center" />

      <AnimatePresence mode="wait">
        {!isAuthPage && session && profile ? (
          <div className="flex w-full h-full overflow-hidden" key="app-main">
            <Sidebar
              activePage={currentPage}
              userRole={profile.role}
              onNavigate={navigateTo}
              isDesktopVisible={isSidebarVisible}
              toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
            />

            <main className="flex-1 overflow-y-auto bg-[#f8fafc] transition-all duration-300 relative scroll-smooth">
              {!isSidebarVisible && (
                <button onClick={() => setIsSidebarVisible(true)} className="hidden md:flex fixed top-6 left-6 z-50 p-3 bg-white shadow-xl rounded-2xl text-blue-600 border border-blue-50">
                  <Menu size={20} />
                </button>
              )}

              <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-screen">
                <AnimatePresence mode="wait">
                  <PageWrapper key={currentPage}>
                    {currentPage === 'manage-schools' && profile.role === 'super-admin' && <ManageSchools />}
                    {currentPage === 'global-staff' && profile.role === 'super-admin' && <StaffManagement />}
                    {currentPage === 'school-staff' && profile.role === 'school-admin' && <Staffsetup />}
                    {currentPage === 'student-hub' && profile.role === 'school-admin' && <StudentHub />}
                    {currentPage === 'admin-dashboard' && profile.role === 'school-admin' && <AdminDashboard />}
                    {currentPage === 'access-cntrl' && profile.role === 'school-admin' && <AccessControl />}
                    {currentPage === 'stfplanning' && profile.role === 'school-admin' && <StaffPlanning schoolId={activeSchoolId} />}
                    {currentPage === 'exammngmt' && profile.role === 'school-admin' && <ExamManagement schoolId={activeSchoolId} />}
                    {currentPage === 'class-mapping' && profile.role === 'school-admin' && <ClassMapping schoolId={activeSchoolId} />}
                    {currentPage === 'infra' && profile.role === 'school-admin' && <SchoolInfrastructure schoolId={activeSchoolId} />}
                    {currentPage === 'atnsettings' && profile.role === 'school-admin' && <AttendanceSettings schoolId={activeSchoolId} />}
                    {currentPage === 'announcements' && profile.role === 'school-admin' && <Announcements schoolId={activeSchoolId} />}
                    
                    {/* Teacher Protected Routes */}
                    {currentPage === 'dashboard' && profile.role === 'teacher' && <TeacherDashboard schoolId={activeSchoolId} />}
                    {currentPage === 'attendance' && profile.role === 'teacher' && (profile.permissions?.attendance ? <TeacherAttendance schoolId={activeSchoolId} /> : <AccessDenied />)}
                    {currentPage === 'marks-entry' && profile.role === 'teacher' && (profile.permissions?.marks ? <TeacherMarksEntry schoolId={activeSchoolId} /> : <AccessDenied />)}
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