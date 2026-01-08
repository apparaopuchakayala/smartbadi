import { useState, useEffect, useRef } from 'react';
import './styles/global.css';
import { Toaster } from 'react-hot-toast';
import { supabase } from './services/supabaseClient';

// Pages
import { LoginPage } from './pages/Loginpage/loginpage';
import { ForgotPasswordPage } from './pages/Forgotpassword/forgotpassword';
import { Dashboard } from './pages/Dashboard/dashboard';
import { SchoolSelector } from './pages/schoolselector/schoolselector';
import { ManageSchools } from './pages/admin/manageschools';
import { Sidebar } from './components/sidebar';
import { StaffManagement } from './pages/admin/StaffManagement';

export default function App() {
  // Initialize state from localStorage to prevent resetting to "Institutions" page
  const [currentPage, setCurrentPage] = useState<string>(() => {
    return localStorage.getItem('lastActivePage') || 'landing';
  });
  
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const isFetchingProfile = useRef(false);

  // Helper function to change page and save to memory
  const navigateTo = (pageId: string) => {
    setCurrentPage(pageId);
    localStorage.setItem('lastActivePage', pageId);
  };

  useEffect(() => {
    // FAILSAFE: Stop loading after 4 seconds regardless
    const failsafe = setTimeout(() => {
      if (loading) setLoading(false);
    }, 4000);

    // AUTH LISTENER
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (!isFetchingProfile.current) {
          fetchUserProfile(session.user.id);
        }
      } else {
        setLoading(false);
        // If no session, clear memory and go to login/landing
        if (currentPage !== 'landing' && currentPage !== 'login') {
          handleLogoutCleanup();
        }
      }
    });

    return () => {
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogoutCleanup = () => {
    setUserRole('');
    localStorage.removeItem('lastActivePage'); // Clear page memory on logout
    setCurrentPage('login');
    setLoading(false);
    window.history.replaceState(null, '', '/');
  };

  async function fetchUserProfile(userId: string) {
    if (isFetchingProfile.current) return;
    isFetchingProfile.current = true;
    
    try {
      const { data } = await supabase.from('profiles').select('*, schools(name)').eq('id', userId).maybeSingle();
      
      if (data) {
        setUserRole(data.role);
        if (data.role !== 'super-admin' && data.school_id) {
          setSelectedSchool({ id: data.school_id, name: data.schools?.name });
        }

        // Logic to decide which page to show after profile fetch
        const savedPage = localStorage.getItem('lastActivePage');
        
        // If we have a valid saved page from before, stay there.
        // Otherwise, navigate to the default role-based dashboard.
        if (!savedPage || savedPage === 'login' || savedPage === 'landing') {
          const defaultPage = data.role === 'super-admin' ? 'manage-schools' : 'dashboard';
          navigateTo(defaultPage);
        }
      } else {
        handleLogoutCleanup();
      }
    } catch {
      handleLogoutCleanup();
    } finally {
      setLoading(false);
      isFetchingProfile.current = false;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f9ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-blue-600 font-bold animate-pulse text-sm">Loading SmartBadi...</p>
        </div>
      </div>
    );
  }

  const isAuthPage = ['login', 'forgot-password', 'landing'].includes(currentPage);

  return (
    <div className={`min-h-screen w-full transition-colors duration-500 ${isAuthPage ? 'bg-gray-100 flex items-center justify-center p-4' : 'bg-[#f0f9ff] flex flex-col md:flex-row h-screen overflow-hidden'}`}>
      <Toaster position="bottom-center" />

      {currentPage === 'landing' && (
        <SchoolSelector onSchoolSelect={(s) => { setSelectedSchool(s); navigateTo('login'); }} />
      )}

      {currentPage === 'login' && (
        <LoginPage
          schoolContext={selectedSchool}
          onBackToLanding={() => navigateTo('landing')}
          onLoginSuccess={() => { }} // Managed by onAuthStateChange
          onSwitchToForgotPassword={() => navigateTo('forgot-password')}
        />
      )}

      {currentPage === 'forgot-password' && (
        <ForgotPasswordPage onSwitchToLogin={() => navigateTo('login')} />
      )}

      {!isAuthPage && (
        <>
          <Sidebar activePage={currentPage} userRole={userRole} onNavigate={navigateTo} />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto">
              
              {/* SUPER ADMIN: MANAGE SCHOOLS */}
              {currentPage === 'manage-schools' && userRole === 'super-admin' && (
                <ManageSchools />
              )}
              
              {/* STAFF MANAGEMENT: Accessible by Super Admin & School Admin */}
              {currentPage === 'staff-mgmt' && (userRole === 'super-admin' || userRole === 'school-admin') && (
                <StaffManagement />
              )}

              {/* DASHBOARD */}
              {/* {currentPage === 'dashboard' && (
                <Dashboard userRole={userRole} schoolName={selectedSchool?.name} />
              )} */}

              {/* Placeholder for other pages */}
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