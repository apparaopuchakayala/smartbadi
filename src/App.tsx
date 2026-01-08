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

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const isFetchingProfile = useRef(false);

  useEffect(() => {
    // 1. FAILSAFE: నెట్ స్లోగా ఉంటే లోడింగ్ ఆపడానికి (Same as before)
    const failsafe = setTimeout(() => {
      if (loading) setLoading(false);
    }, 4000);

    // గమనిక: initializeAuth() ని తీసివేసాము. ఎందుకంటే onAuthStateChange ఆ పనిని సమర్థవంతంగా చేస్తుంది.

    // 2. AUTH LISTENER (లాగిన్/లాగౌట్ కంట్రోలర్)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {

      // సెషన్ ఉంటే ప్రొఫైల్ తెచ్చుకో
      if (session) {
        // ప్రొఫైల్ ఫెచ్ అవుతూ ఉంటే మళ్ళీ కాల్ చేయద్దు
        if (!isFetchingProfile.current) {
          fetchUserProfile(session.user.id);
        }
      }
      // సెషన్ లేకపోతే, మరియు మనం ఇంకా లోడింగ్ లో ఉంటే లేదా లాగిన్ పేజీలో లేకపోతే క్లీనప్ చెయ్యి
      else {
        // యూజర్ నిజంగానే లాగౌట్ అయి ఉంటేనే క్లీనప్ చేయాలి.
        // లేదా పేజీ ఇంకా లోడ్ అవుతుంటే లోడింగ్ ఆపేయాలి.
        setLoading(false);
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
    // setSelectedSchool(selectedSchool);
    setCurrentPage('login'); // Logout అయ్యాక School Selector కి వెళ్తుంది
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
        // రోల్ బట్టి ఆటోమేటిక్ పేజీ నావిగేషన్
        setCurrentPage(data.role === 'super-admin' ? 'manage-schools' : 'dashboard');
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
        <SchoolSelector onSchoolSelect={(s) => { setSelectedSchool(s); setCurrentPage('login'); }} />
      )}

      {currentPage === 'login' && (
        <LoginPage
          schoolContext={selectedSchool}
          onBackToLanding={() => setCurrentPage('landing')}
          onLoginSuccess={() => { }}
          onSwitchToForgotPassword={() => setCurrentPage('forgot-password')}
        />
      )}

      {currentPage === 'forgot-password' && (
        <ForgotPasswordPage onSwitchToLogin={() => setCurrentPage('login')} />
      )}

      {!isAuthPage && (
        <>
          <Sidebar activePage={currentPage} userRole={userRole} onNavigate={setCurrentPage} />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto">
              {currentPage === 'manage-schools' && userRole === 'super-admin' && <ManageSchools />}
              {currentPage === 'dashboard' && <div className="text-2xl font-bold">Dashboard (In Progress)</div>}
            </div>
          </main>
        </>
      )}
    </div>
  );
}