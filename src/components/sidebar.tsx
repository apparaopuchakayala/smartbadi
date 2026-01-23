import { useState } from 'react';
import {
  LayoutDashboard, Building2, Users, ShieldCheck,
  GraduationCap, CalendarRange, BookOpen, FileSignature,
  PieChart, LogOut, Menu, X, CheckCircle2, ChevronLeft, 
  FileText, Split, UserCog, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/smartbadi.png';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthProvider';

interface SidebarProps {
  activePage: string;
  onNavigate: (pageId: string) => void;
  userRole: string;
  isDesktopVisible: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ activePage, onNavigate, userRole, isDesktopVisible, toggleSidebar }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  
  // --- SUBMENU STATES ---
  const [isCampusHovered, setIsCampusHovered] = useState(false);
  const [isCampusLocked, setIsCampusLocked] = useState(false);
  
  const { profile, session } = useAuth();
  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || 'User';

  // కండిషన్: హోవర్ చేసినా, క్లిక్ చేసినా, లేదా లోపల ఉన్న ఏదైనా పేజీ యాక్టివ్‌గా ఉన్నా సబ్-మెనూ ఓపెన్ అవ్వాలి
  const campusSubPages = ['infra', 'school-staff', 'stfplanning'];
  const isCampusOpen = isCampusHovered || isCampusLocked || campusSubPages.includes(activePage);

  const getMenuItems = () => {
    switch (userRole) {
      case 'super-admin':
        return [
          { id: 'manage-schools', label: 'Global Schools', icon: Building2 },
          { id: 'global-staff', label: 'Global Staff', icon: Users },
          { id: 'settings', label: 'System Settings', icon: ShieldCheck },
        ];
      case 'school-admin':
        return [
          { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
          // Note: Campus Setup items (infra, school-staff, stfplanning) manual గా కింద హ్యాండిల్ చేయబడ్డాయి
          { id: 'student-hub', label: 'Student Hub', icon: GraduationCap },
          { id: 'class-mapping', label: 'Class Mapping', icon: CalendarRange },
          { id: 'assignments', label: 'Assignments', icon: BookOpen },
          { id: 'generation', label: 'Generate', icon: FileText },
          { id: 'exams', label: 'Examinations', icon: FileSignature },
          { id: 'analytics', label: 'Performance', icon: PieChart },
        ];
      case 'teacher':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'attendance', label: 'Attendance', icon: Users },
          { id: 'assignments', label: 'Homework', icon: BookOpen },
          { id: 'exams', label: 'Marks Entry', icon: FileSignature },
        ];
      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    try {
      setShowLogoutSuccess(true);
      setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        onNavigate('landing');
        setShowLogoutSuccess(false);
      }, 800);
    } catch (error: any) {
      setShowLogoutSuccess(false);
      toast.error("Logout Issue: " + error.message);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showLogoutSuccess && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900/20 backdrop-blur-md">
            <motion.div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center border border-blue-100">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={60} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Logged Out!</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-white text-slate-600 rounded-xl shadow-lg border border-slate-100"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          bg-white border-r border-slate-100 shadow-xl
          flex flex-col h-screen transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${!isDesktopVisible ? 'md:w-0 md:opacity-0 md:-translate-x-full' : 'md:w-72 md:opacity-100'}
        `}
      >
        <div className="p-8 pb-4 flex items-center justify-center relative min-h-[80px]">
          <img src={logo} alt="SmartBadi" className="h-12 object-contain" />
          <button onClick={toggleSidebar} className="hidden md:flex absolute right-8 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="px-6 mb-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate w-full">{profile?.schools?.name || 'Welcome'}</p>
            <h3 className="text-sm font-black text-slate-700 line-clamp-1 mb-2">{displayName}</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[8px] font-bold uppercase tracking-widest border border-blue-200">{userRole?.replace('-', ' ')}</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    onNavigate(item.id);
                    if (window.innerWidth < 768) setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Icon size={20} className={isActive ? 'scale-110' : 'group-hover:scale-110'} />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
                </button>

                {/* --- CAMPUS SETUP DROPDOWN (AFTER DASHBOARD) --- */}
                {userRole === 'school-admin' && item.id === 'admin-dashboard' && (
                  <div 
                    className="my-1 py-1"
                    onMouseEnter={() => setIsCampusHovered(true)}
                    onMouseLeave={() => setIsCampusHovered(false)}
                  >
                    <button
                      onClick={() => setIsCampusLocked(!isCampusLocked)}
                      className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group ${isCampusOpen ? 'bg-slate-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <Split size={20} className={isCampusOpen ? 'scale-110' : 'group-hover:scale-110'} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Campus Setup</span>
                      </div>
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isCampusOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isCampusOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pl-10 space-y-1"
                        >
                          <SubItem id="infra" label="Class Setup" activePage={activePage} onNavigate={onNavigate} setIsMobileOpen={setIsMobileOpen} />
                          <SubItem id="school-staff" label="Staff Setup" activePage={activePage} onNavigate={onNavigate} setIsMobileOpen={setIsMobileOpen} />
                          <SubItem id="stfplanning" label="Staff Planning" activePage={activePage} onNavigate={onNavigate} setIsMobileOpen={setIsMobileOpen} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-50">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-50 transition-all">
            <LogOut size={18} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// --- SUB-ITEM COMPONENT FOR CLEANER CODE ---
function SubItem({ id, label, activePage, onNavigate, setIsMobileOpen }: any) {
  const isActive = activePage === id;
  return (
    <button
      onClick={() => {
        onNavigate(id);
        if (window.innerWidth < 768) setIsMobileOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-6 py-3 rounded-xl transition-all text-left ${isActive ? 'text-blue-600 font-black' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-200'}`} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}