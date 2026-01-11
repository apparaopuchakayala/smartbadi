import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { LoginPage } from './pages/Loginpage/loginpage';
import { ForgotPasswordPage } from './pages/Forgotpassword/forgotpassword';
import { SchoolSelector } from './pages/schoolselector/schoolselector';
import { ManageSchools } from './pages/admin/manageschools';
import { Sidebar } from './components/sidebar';
import { StaffAndAccess } from './pages/school-admin/StaffAndAccess';
import { StaffManagement } from './pages/admin/staffmanagement';
import {StudentHub} from './pages/school-admin/studenthub';
import { Menu } from 'lucide-react';
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

  // రిఫ్రెష్ చేసినా పాత పేజీ పోకుండా ఉండటానికి localStorage persistence
  const [currentPage, setCurrentPage] = useState<string>(() => localStorage.getItem('lastActivePage') || 'landing');

  const [selectedSchool, setSelectedSchool] = useState<any>(() => {
    const saved = localStorage.getItem('selectedSchoolContext');
    return saved ? JSON.parse(saved) : null;
  });

  // డెస్క్‌టాప్ సైడ్‌బార్ విజిబిలిటీ స్టేట్
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const navigateTo = (pageId: string) => {
    setCurrentPage(pageId);
    localStorage.setItem('lastActivePage', pageId);
  };

  const handleSchoolSelection = (school: any) => {
    setSelectedSchool(school);
    localStorage.setItem('selectedSchoolContext', JSON.stringify(school));
    navigateTo('login');
  };

  // Auth స్టేట్ మారినప్పుడు ఆటోమేటిక్ నేవిగేషన్
  useEffect(() => {
    if (!loading) {
      if (session && profile) {
        // లాగిన్ అయి ఉండి, ఇంకా ఆథెంటికేషన్ పేజీల్లోనే ఉంటే డాష్‌బోర్డ్ కి పంపాలి
        if (['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo(profile.role === 'super-admin' ? 'manage-schools' : 'dashboard');
        }
      } else if (!session) {
        // సెషన్ లేకపోతే కేవలం ఈ 3 పేజీలకే అనుమతి
        if (!['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo('landing');
        }
      }
    }
  }, [session, profile, loading, currentPage]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f9ff]">
        <div className="flex flex-col items-center gap-4 text-blue-600 font-bold">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="animate-pulse tracking-widest uppercase text-[10px]">Securing Connection...</p>
        </div>
      </div>
    );
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
            <Sidebar
              activePage={currentPage}
              userRole={profile.role}
              onNavigate={navigateTo}
              isDesktopVisible={isSidebarVisible}
              toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
            />

            <main className="flex-1 overflow-y-auto bg-[#f8fafc] transition-all duration-300 relative">
              {/* డెస్క్‌టాప్‌లో సైడ్‌బార్ దాక్కున్నప్పుడు కనిపించే టోగుల్ బటన్ */}
              {!isSidebarVisible && (
                <button
                  onClick={() => setIsSidebarVisible(true)}
                  className="hidden md:flex fixed top-6 left-6 z-50 p-3 bg-white shadow-xl rounded-2xl text-blue-600 border border-blue-50 hover:scale-110 transition-all"
                >
                  <Menu size={20} />
                </button>
              )}

              <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* 1. Global Admin Pages */}
                {currentPage === 'manage-schools' && profile.role === 'super-admin' && <ManageSchools /> }
                {currentPage === 'global-staff' && profile.role === 'super-admin' && <StaffManagement /> }

                {/* 2. School Admin & Staff Pages */}
                {currentPage === 'school-staff' && ( profile.role === 'school-admin') && (
                  <StaffAndAccess />
                )}
                 {currentPage === 'student-hub' && ( profile.role === 'school-admin') && (
                  <StudentHub />
                )}

                {/* 3. Common Dashboard */}
                {currentPage === 'dashboard' && (
                  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                    <h1 className="text-3xl font-light text-slate-800 text-left">
                      Welcome back, <span className="font-bold text-blue-600">{profile.full_name}</span>
                    </h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[4px] mt-2 text-left">
                      {profile.role?.replace('-', ' ')} • {profile.schools?.name}
                    </p>
                  </div>
                )}

                {/* 4. Placeholder for Other Modules (Student Hub, Mapping, etc.) */}
                {/* {!['manage-schools', 'staff-mgmt', 'dashboard'].includes(currentPage) && (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                    <div className="p-6 bg-blue-50 rounded-full text-blue-400">
                      <Menu size={48} strokeWidth={1} />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-slate-800 font-bold uppercase tracking-widest text-sm">Module Under Construction</h2>
                      <p className="text-slate-400 text-[10px] font-medium uppercase tracking-[3px]">
                        The "{currentPage?.replace('-', ' ')}" feature is being synchronized
                      </p>
                    </div>
                  </div>
                )} */}
              </div>
            </main>
          </>
        )
      )}
    </div>
  );
}