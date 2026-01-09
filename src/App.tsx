import { useState, useEffect } from 'react';
import './styles/global.css';
import { Toaster } from 'react-hot-toast';
// Ensure this path matches your file structure
import { AuthProvider, useAuth } from './context/AuthProvider';

// Pages
import { LoginPage } from './pages/Loginpage/loginpage';
import { ForgotPasswordPage } from './pages/Forgotpassword/forgotpassword';
import { SchoolSelector } from './pages/schoolselector/schoolselector';
import { ManageSchools } from './pages/admin/manageschools';
import { Sidebar } from './components/sidebar';
import { StaffManagement } from './pages/admin/StaffManagement';

// 1. ROOT WRAPPER
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// 2. MAIN LOGIC
function AppContent() {
  const { session, profile, loading } = useAuth();

  // --- STATE PERSISTENCE ---
  const [currentPage, setCurrentPage] = useState<string>(() => {
    return localStorage.getItem('lastActivePage') || 'landing';
  });

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

  // --- AUTOMATIC REDIRECTS ---
  useEffect(() => {
    // Only run logic when loading is totally finished
    if (!loading) {
      if (session && profile) {
        // --- LOGGED IN & DATA READY ---
        if (['landing', 'login', 'forgot-password'].includes(currentPage)) {
          const defaultPage = profile.role === 'super-admin' ? 'manage-schools' : 'dashboard';
          navigateTo(defaultPage);
        }

        // Sync Profile Data
        if (profile.role !== 'super-admin' && profile.schools) {
          if (selectedSchool?.id !== profile.school_id) {
            const userSchool = { id: profile.school_id, name: profile.schools.name };
            setSelectedSchool(userSchool);
            localStorage.setItem('selectedSchoolContext', JSON.stringify(userSchool));
          }
        }
      } else if (!session) {
        // --- NOT LOGGED IN ---
        if (!['landing', 'login', 'forgot-password'].includes(currentPage)) {
          navigateTo('landing');
        }
        if (currentPage === 'login' && !selectedSchool) {
          navigateTo('landing');
        }
      }
    }
  }, [session, profile, loading, currentPage, selectedSchool]);


  // --- 1. GLOBAL LOADING (Auth Check) ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f9ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-blue-600 font-bold animate-pulse text-sm">Securing Connection...</p>
        </div>
      </div>
    );
  }

  // --- 2. PROFILE DATA GUARD (Critical Fix) ---
  // If we have a session but NO profile yet, keep waiting.
  // This prevents the dashboard from crashing or showing empty data.
  if (session && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f9ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-blue-600 font-bold animate-pulse text-sm">Fetching Profile Data...</p>
        </div>
      </div>
    );
  }

  const isAuthPage = ['landing', 'login', 'forgot-password'].includes(currentPage);

  return (
    <div className={`min-h-screen w-full transition-colors duration-500 ${isAuthPage ? 'bg-gray-100 flex items-center justify-center p-4' : 'bg-[#f0f9ff] flex flex-col md:flex-row h-screen overflow-hidden'}`}>
      <Toaster position="bottom-center" />

      {/* --- PUBLIC ZONE --- */}

      {currentPage === 'landing' && (
        <SchoolSelector onSchoolSelect={handleSchoolSelection} />
      )}

      {currentPage === 'login' && (
        <LoginPage
          schoolContext={selectedSchool}
          onBackToLanding={() => navigateTo('landing')}
          onLoginSuccess={() => { }}
          onSwitchToForgotPassword={() => navigateTo('forgot-password')}
        />
      )}

      {currentPage === 'forgot-password' && (
        <ForgotPasswordPage onSwitchToLogin={() => navigateTo('login')} />
      )}

      {/* --- PRIVATE ZONE --- */}
      {/* Fix: Added '&& profile' to ensure we never render without data */}
      {!isAuthPage && session && profile && (
        <>
          <Sidebar
            activePage={currentPage}
            userRole={profile.role}
            onNavigate={navigateTo}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto">

              {currentPage === 'manage-schools' && profile.role === 'super-admin' && (
                <ManageSchools />
              )}

              {currentPage === 'staff-mgmt' && (profile.role === 'super-admin' || profile.role === 'school-admin') && (
                <StaffManagement />
              )}

              {/* Dashboard Placeholder */}
              {!['manage-schools', 'staff-mgmt', 'dashboard'].includes(currentPage) && (
                <div className="flex items-center justify-center h-[60vh] text-slate-400 font-bold uppercase tracking-widest">
                  Page "{currentPage}" is under construction
                </div>
              )}

            </div>
          </main>
        </>
      )}
    </div>
  );
}