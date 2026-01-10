import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { LoginPage } from './pages/Loginpage/loginpage';
import { ForgotPasswordPage } from './pages/Forgotpassword/forgotpassword';
import { SchoolSelector } from './pages/schoolselector/schoolselector';
import { ManageSchools } from './pages/admin/manageschools';
import { Sidebar } from './components/sidebar';
import { StaffManagement } from './pages/admin/StaffManagement';
import { Menu } from 'lucide-react'; // Floating button కోసం

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { session, profile, loading, signOut } = useAuth();
  
  const [currentPage, setCurrentPage] = useState<string>(() => localStorage.getItem('lastActivePage') || 'landing');
  const [selectedSchool, setSelectedSchool] = useState<any>(() => {
    const saved = localStorage.getItem('selectedSchoolContext');
    return saved ? JSON.parse(saved) : null;
  });

  // డెస్క్‌టాప్ సైడ్‌బార్ స్టేట్
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

  useEffect(() => {
    if (!loading) {
      if (session && profile) {
        if (['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo(profile.role === 'super-admin' ? 'manage-schools' : 'dashboard');
        }
      } else if (!session) {
        if (!['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo('landing');
        }
      }
    }
  }, [session, profile, loading, currentPage]);

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
    <div className={`min-h-screen w-full ${isAuthPage ? 'bg-gray-100' : 'bg-[#f0f9ff] flex flex-col md:flex-row h-screen overflow-hidden'}`}>
      <Toaster position="bottom-center" />
      
      {isAuthPage ? (
        <div className="flex items-center justify-center w-full">
          {currentPage === 'landing' && <SchoolSelector onSchoolSelect={handleSchoolSelection} />}
          {currentPage === 'login' && <LoginPage schoolContext={selectedSchool} onBackToLanding={() => navigateTo('landing')} onLoginSuccess={() => {}} onSwitchToForgotPassword={() => navigateTo('forgot-password')} />}
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
            
            <main className={`flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc] transition-all duration-300 relative`}>
              {/* Floating Menu Button: సైడ్‌బార్ క్లోజ్ అయినప్పుడు మాత్రమే కనిపిస్తుంది */}
              {!isSidebarVisible && (
                <button 
                  onClick={() => setIsSidebarVisible(true)}
                  className="hidden md:flex fixed top-6 left-6 z-50 p-3 bg-white shadow-xl rounded-2xl text-blue-600 border border-blue-50 hover:scale-110 transition-all"
                >
                  <Menu size={20} />
                </button>
              )}

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
        )
      )}
    </div>
  );
}