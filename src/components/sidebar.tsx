import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, Users, ShieldCheck,
  GraduationCap, CalendarRange, BookOpen, FileSignature,
  PieChart, LogOut, ChevronLeft, Split, ChevronDown,
  CheckCircle2, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/smartbadi.png';
import { supabase } from '../services/supabaseClient';
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

  // Submenu page groups
  const campusSubPages = ['infra', 'school-staff', 'stfplanning'];
  const studentSubPages = ['student-list', 'student-enrollment']; // Ensure this matches your Enrollment ID

  // DROPDOWN STATES
  const [isCampusHovered, setIsCampusHovered] = useState(false);
  const [isCampusLocked, setIsCampusLocked] = useState(false);
  
  const [isStudentHovered, setIsStudentHovered] = useState(false);
  const [isStudentLocked, setIsStudentLocked] = useState(false);

  const { profile } = useAuth();
  const displayName = profile?.full_name || 'User';

  // Determine if a section should be open (either hovered OR locked because of active page)
  const isCampusOpen = isCampusHovered || isCampusLocked || campusSubPages.includes(activePage);
  const isStudentOpen = isStudentHovered || isStudentLocked || studentSubPages.includes(activePage);

  // Synchronize locked state with active page
  useEffect(() => {
    if (campusSubPages.includes(activePage)) setIsCampusLocked(true);
    if (studentSubPages.includes(activePage)) setIsStudentLocked(true);
  }, [activePage]);

  const navigate = (id: string) => {
    onNavigate(id);
    if (window.innerWidth < 768) setIsMobileOpen(false);
  };

  const getMenuItems = () => {
    switch (userRole) {
      case 'super-admin':
        return [
          { id: 'manage-schools', label: 'Global Schools', icon: Building2 },
          { id: 'student-list', label: 'Student List', icon: GraduationCap },
          { id: 'global-staff', label: 'Global Staff', icon: Users },
          { id: 'settings', label: 'System Settings', icon: ShieldCheck },
        ];
      case 'school-admin':
        return [
          { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'access-cntrl', label: 'Access Control', icon: ShieldCheck },
          { id: 'attendance-mapping', label: 'Attendance Mapping', icon: CalendarRange },
          { id: 'exammngmt', label: 'Exam Management', icon: FileSignature },
          { id: 'announcements', label: 'Announcements', icon: PieChart },
        ];
      case 'teacher':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard' },
          { id: 'student-list', label: 'Student List', icon: GraduationCap, perm: 'studentlist' },
          { id: 'attendance', label: 'Attendance', icon: Users, perm: 'attendance' },
          { id: 'marks-entry', label: 'Marks Entry', icon: FileSignature, perm: 'marks' },
          { id: 'assignments', label: 'Homework', icon: BookOpen, perm: 'assignments' },
        ].filter(item => userRole === 'school-admin' || profile?.permissions?.[item.perm]);
      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    }
  };

  const handleLogout = async () => {
    setShowLogoutSuccess(true);
    setTimeout(async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      onNavigate('landing');
      setShowLogoutSuccess(false);
    }, 800);
  };

  return (
    <>
      {!isMobileOpen && (
        <button onClick={() => setIsMobileOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-3 bg-white shadow-xl rounded-2xl text-blue-600 border border-blue-50">
          <Menu size={24} />
        </button>
      )}

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] md:hidden" />
        )}
      </AnimatePresence>

      <aside className={`fixed md:relative inset-y-0 left-0 z-[70] bg-white border-r border-slate-100 shadow-xl flex flex-col h-screen transition-all duration-300 
        ${isMobileOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0'} 
        ${!isDesktopVisible ? 'md:w-0 md:opacity-0 overflow-hidden' : 'md:w-72'}`}>

        <div className="p-6 flex items-center justify-center relative">
          <img src={logo} alt="SmartBadi" className="h-12 object-contain" />
          <button onClick={() => window.innerWidth < 768 ? setIsMobileOpen(false) : toggleSidebar()} className="absolute right-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl">
            <span className="md:hidden"><X size={20} /></span>
            <span className="hidden md:block"><ChevronLeft size={20} /></span>
          </button>
        </div>

        <div className="px-6 mb-6">
          <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] mb-1">{profile?.schools?.name || 'INSTITUTION'}</p>
            <h3 className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{displayName}</h3>
            <span className="inline-block mt-3 px-3 py-1 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase shadow-sm">
              {userRole?.replace('-', ' ')}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {getMenuItems().map((item, index) => (
            <div key={item.id}>
              <button onClick={() => navigate(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${activePage === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                <item.icon size={18} /> {item.label}
              </button>

              {/* CAMPUS SETUP WITH HOVER restored */}
              {userRole === 'school-admin' && index === 0 && (
                <div className="mt-1" onMouseEnter={() => setIsCampusHovered(true)} onMouseLeave={() => setIsCampusHovered(false)}>
                  <button onClick={() => setIsCampusLocked(!isCampusLocked)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all uppercase text-[10px] font-black tracking-widest ${isCampusOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4"><Split size={18} /> Campus Setup</div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isCampusOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isCampusOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 mt-1 overflow-hidden border-l-2 border-slate-100 ml-8">
                        <SubItem id="infra" label="Class Creation" activePage={activePage} onNavigate={navigate} />
                        <SubItem id="school-staff" label="Staff Creation" activePage={activePage} onNavigate={navigate} />
                        <SubItem id="stfplanning" label="Staff Planning" activePage={activePage} onNavigate={navigate} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* STUDENTS WITH HOVER restored */}
              {userRole === 'school-admin' && item.id === 'access-cntrl' && (
                <div className="mt-1" onMouseEnter={() => setIsStudentHovered(true)} onMouseLeave={() => setIsStudentHovered(false)}>
                  <button onClick={() => setIsStudentLocked(!isStudentLocked)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all uppercase text-[10px] font-black tracking-widest ${isStudentOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4"><GraduationCap size={18} /> Students</div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isStudentOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isStudentOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 mt-1 overflow-hidden border-l-2 border-slate-100 ml-8">
                        <SubItem id="student-list" label="Student List" activePage={activePage} onNavigate={navigate} />
                        <SubItem id="student-hub" label="Student Enrollment" activePage={activePage} onNavigate={navigate} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/30">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-[11px] uppercase tracking-[2px]">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function SubItem({ id, label, activePage, onNavigate }: { id: string, label: string, activePage: string, onNavigate: (id: string) => void }) {
  const isActive = activePage === id;
  return (
    <button onClick={() => onNavigate(id)} className={`w-full text-left py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-3 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]' : 'bg-slate-300'}`} />
      {label}
    </button>
  );
}