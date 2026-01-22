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
import { Menu } from 'lucide-react';
import { LoginLoading } from './components/utilitis/LoginLoading';
import { ClassMapping } from './pages/school-admin/classmapping';
import { SchoolInfrastructure } from './pages/school-admin/schoolinfra';
import {AttendanceSettings} from './pages/school-admin/attendancesettings';
import {StaffPlanning} from './pages/school-admin/staffplanning';
import './styles/global.css';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

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
          if (profile.role === 'super-admin') {
            navigateTo('manage-schools');
          } else if (profile.role === 'school-admin') {
            navigateTo('admin-dashboard');
          } else {
            navigateTo('dashboard');
          }
        }
      } else if (!session) {
        if (!['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo('landing');
        }
      }
    }
  }, [session, profile, loading, currentPage]);

  if (loading) {
    return <LoginLoading />;
  }

  const isAuthPage = ['landing', 'login', 'forgot-password'].includes(currentPage);

  return (
    <div className={`min-h-screen w-full flex ${isAuthPage ? 'items-center justify-center bg-gray-100' : 'bg-[#f0f9ff] flex-row h-screen overflow-hidden'}`}>
      <Toaster position="bottom-center" />

      {isAuthPage ? (
        <div className="w-full flex items-center justify-center p-4">
          {currentPage === 'landing' && <SchoolSelector onSchoolSelect={handleSchoolSelection} />}
          {currentPage === 'login' && (
            <LoginPage
              schoolContext={selectedSchool}
              onBackToLanding={() => navigateTo('landing')}
              onLoginSuccess={() => { }}
              onSwitchToForgotPassword={() => navigateTo('forgot-password')}
            />
          )}
          {currentPage === 'forgot-password' && <ForgotPasswordPage onSwitchToLogin={() => navigateTo('login')} />}
        </div>
      ) : (
        session && profile && (
          <>
            {/* Sidebar Module */}
            <Sidebar
              activePage={currentPage}
              userRole={profile.role}
              onNavigate={navigateTo}
              isDesktopVisible={isSidebarVisible}
              toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
            />

            {/* Main Application Content Area */}
            <main className="flex-1 overflow-y-auto bg-[#f8fafc] transition-all duration-300 relative">

              {/* Sidebar toggle for desktop when hidden */}
              {!isSidebarVisible && (
                <button
                  onClick={() => setIsSidebarVisible(true)}
                  className="hidden md:flex fixed top-6 left-6 z-50 p-3 bg-white shadow-xl rounded-2xl text-blue-600 border border-blue-50 hover:scale-110 transition-all"
                >
                  <Menu size={20} />
                </button>
              )}

              <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* 1. Global Super Admin Routes */}
                {currentPage === 'manage-schools' && profile.role === 'super-admin' && <ManageSchools />}
                {currentPage === 'global-staff' && profile.role === 'super-admin' && <StaffManagement />}

                {/* 2. School Admin Specific Hubs */}
                {currentPage === 'school-staff' && (profile.role === 'school-admin') && (
                  <Staffsetup />
                )}
                {currentPage === 'student-hub' && (profile.role === 'school-admin') && (
                  <StudentHub />
                )}
                {currentPage === 'admin-dashboard' && (profile.role === 'school-admin') && (
                  <AdminDashboard />
                )}
                {currentPage === 'class-mapping' && (profile.role === 'school-admin') && (
                  <ClassMapping schoolId={activeSchoolId} />
                )}

                {currentPage === 'infra' && (profile.role === 'school-admin') && (
                  <SchoolInfrastructure schoolId={activeSchoolId} />
                )}

                {currentPage === 'stfplanning' && (profile.role === 'school-admin') && (
                  <StaffPlanning schoolId={activeSchoolId} />
                )}

                  {currentPage === 'atnsettings' && (profile.role === 'school-admin') && (
                  <AttendanceSettings schoolId={activeSchoolId} />
                )}

              </div>
            </main>
          </>
        )
      )}
    </div>
  );
}