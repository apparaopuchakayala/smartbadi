import { useState, useEffect } from 'react';
import './styles/global.css';
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
        if (['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo(profile.role === 'super-admin' ? 'manage-schools' : 'dashboard');
        }
      } else if (!session && !['landing', 'login', 'forgot-password'].includes(currentPage)) {
        navigateTo('landing');
      }
    }
  }, [session, profile, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f9ff]">
        <div className="flex flex-col items-center gap-4 text-blue-600 font-bold">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="animate-pulse">Securing Connection...</p>
        </div>
      </div>
    );
  }

  // FIXED: ప్రొఫైల్ మిస్ అయితే వచ్చే లూప్ ని ఇక్కడ ఆపాము
  if (session && !profile && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f9ff] p-4">
        <div className="bg-white p-8 rounded-[32px] shadow-xl text-center max-w-sm border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Sync Error</h2>
          <p className="text-slate-500 text-sm mb-6">Profile record not found in database. Contact admin to sync your record.</p>
          <button onClick={() => signOut()} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Retry Login</button>
        </div>
      </div>
    );
  }

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
              {currentPage === 'dashboard' && <div className="text-2xl font-black text-slate-800">Welcome, {profile.full_name}</div>}
              {!['manage-schools', 'staff-mgmt', 'dashboard'].includes(currentPage) && <div className="flex items-center justify-center h-[60vh] text-slate-400 font-bold uppercase border-2 border-dashed rounded-3xl">Page "{currentPage}" is under construction</div>}
            </div>
          </main>
        </>
      )}
    </div>
  );
}