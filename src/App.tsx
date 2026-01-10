import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { LoginPage } from './pages/Loginpage/loginpage';
import { ForgotPasswordPage } from './pages/Forgotpassword/forgotpassword';
import { SchoolSelector } from './pages/schoolselector/schoolselector';
import { ManageSchools } from './pages/admin/manageschools';
import { Sidebar } from './components/sidebar';
import { StaffManagement } from './pages/admin/StaffManagement';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { session, profile, loading, signOut } = useAuth();
  
  // Persistence: రిఫ్రెష్ చేసినా పాత పేజీ పోకుండా ఉంటుంది
  const [currentPage, setCurrentPage] = useState<string>(() => localStorage.getItem('lastActivePage') || 'landing');
  const [selectedSchool, setSelectedSchool] = useState<any>(() => {
    const saved = localStorage.getItem('selectedSchoolContext');
    return saved ? JSON.parse(saved) : null;
  });

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
        // లాగిన్ అయి ఉంటే నేరుగా డాష్‌బోర్డ్ కి వెళ్లాలి
        if (['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo(profile.role === 'super-admin' ? 'manage-schools' : 'dashboard');
        }
      } else if (!session) {
        // సెషన్ లేకపోతే ఆథెంటికేషన్ పేజీలకే పరిమితం
        if (!['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo('landing');
        }
      }
    }
  }, [session, profile, loading]);

  // Loading State: సెషన్ రికవరీ అయ్యే వరకు వేచి ఉండటం
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

  // Sync Error Logic: సెషన్ ఉండి ప్రొఫైల్ లేకపోతేనే ఇది రావాలి
  // if (session && !profile && !loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-[#f0f9ff] p-4">
  //       <div className="bg-white p-10 rounded-[40px] shadow-2xl text-center max-w-sm border border-red-100">
  //         <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">⚠️</div>
  //         <h2 className="text-xl font-black text-slate-800 mb-2 uppercase">Sync Error</h2>
  //         <p className="text-slate-500 text-xs font-bold leading-relaxed mb-8 uppercase tracking-wider">
  //           Profile record not found. Please contact system admin to link your credentials.
  //         </p>
  //         <button onClick={signOut} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
  //           Retry Login
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  const isAuthPage = ['landing', 'login', 'forgot-password'].includes(currentPage);

  return (
    <div className={`min-h-screen w-full ${isAuthPage ? 'bg-gray-100 flex items-center justify-center' : 'bg-[#f0f9ff] flex flex-col md:flex-row h-screen overflow-hidden'}`}>
      <Toaster position="bottom-center" />
      {currentPage === 'landing' && <SchoolSelector onSchoolSelect={handleSchoolSelection} />}
      {currentPage === 'login' && <LoginPage schoolContext={selectedSchool} onBackToLanding={() => navigateTo('landing')} onLoginSuccess={() => {}} onSwitchToForgotPassword={() => navigateTo('forgot-password')} />}
      {currentPage === 'forgot-password' && <ForgotPasswordPage onSwitchToLogin={() => navigateTo('login')} />}

      {!isAuthPage && session && profile && (
        <>
          <Sidebar activePage={currentPage} userRole={profile.role} onNavigate={navigateTo} />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto">
              {currentPage === 'manage-schools' && profile.role === 'super-admin' && <ManageSchools />}
              {currentPage === 'staff-mgmt' && (profile.role === 'super-admin' || profile.role === 'school-admin') && <StaffManagement />}
              {currentPage === 'dashboard' && (
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                  <h1 className="text-3xl font-light text-slate-800">Welcome back, <span className="font-bold text-blue-600">{profile.full_name}</span></h1>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[4px] mt-2">{profile.role} • {profile.schools?.name}</p>
                </div>
              )}
              {!['manage-schools', 'staff-mgmt', 'dashboard'].includes(currentPage) && (
                <div className="flex items-center justify-center h-[60vh] text-slate-300 font-bold uppercase tracking-widest text-xs border-4 border-dashed rounded-[48px] border-slate-100">
                  Module "{currentPage}" is under construction
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}