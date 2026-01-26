import { useState } from 'react';
import {
  LayoutDashboard, Building2, Users, ShieldCheck,
  GraduationCap, CalendarRange, BookOpen, FileSignature,
  PieChart, LogOut, ChevronLeft, Split, ChevronDown, CheckCircle2
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

  // Submenu states
  const campusSubPages = ['infra', 'school-staff', 'stfplanning'];
  const [isCampusHovered, setIsCampusHovered] = useState(false);
  const [isCampusLocked, setIsCampusLocked] = useState(campusSubPages.includes(activePage));

  const studentSubPages = ['student-list', 'student-enrollment'];
  const [isStudentHovered, setIsStudentHovered] = useState(false);
  const [isStudentLocked, setIsStudentLocked] = useState(studentSubPages.includes(activePage));

  const { profile } = useAuth();
  const displayName = profile?.full_name || 'User';

  const isCampusOpen = isCampusHovered || isCampusLocked || campusSubPages.includes(activePage);
  const isStudentOpen = isStudentHovered || isStudentLocked || studentSubPages.includes(activePage);

  const hasAccess = (moduleName: string) => {
    if (userRole === 'school-admin' || userRole === 'super-admin') return true;
    return profile?.permissions?.[moduleName] === true;
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
        const teacherItems = [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard' },
          { id: 'student-list', label: 'Student List', icon: GraduationCap, perm: 'studentlist' },
          { id: 'attendance', label: 'Attendance', icon: Users, perm: 'attendance' },
          { id: 'marks-entry', label: 'Marks Entry', icon: FileSignature, perm: 'marks' },
          { id: 'assignments', label: 'Homework', icon: BookOpen, perm: 'assignments' },
        ];
        return teacherItems.filter(item => hasAccess(item.perm));
      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    }
  };

  const menuItems = getMenuItems();

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
      <AnimatePresence>
        {showLogoutSuccess && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900/20 backdrop-blur-md">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center border border-blue-100">
              <CheckCircle2 size={60} className="text-green-500 mb-4" />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Logged Out!</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className={`fixed md:relative inset-y-0 left-0 z-40 bg-white border-r border-slate-100 shadow-xl flex flex-col h-screen transition-all duration-300 ${isMobileOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0'} ${!isDesktopVisible ? 'md:w-0 md:opacity-0' : 'md:w-72'}`}>
        <div className="p-6 flex items-center justify-center relative">
          <img src={logo} alt="SmartBadi" className="h-12 object-contain" />
          <button onClick={toggleSidebar} className="absolute right-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
        </div>

        <div className="px-6 mb-6 text-center">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
            <p className="text-[12px] font-black text-slate-600 uppercase tracking-widest mb-1">{profile?.schools?.name || 'SmartBadi'}</p>
            <h3 className="text-sm font-black text-slate-700 truncate mb-1">{displayName}</h3>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white rounded-full text-[8px] font-bold uppercase tracking-widest">{userRole?.replace('-', ' ')}</span>
          </div>
        </div>


        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, index) => (
            <div key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold uppercase text-[10px] tracking-widest ${activePage === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <item.icon size={18} />
                {item.label}
              </button>

              {userRole === 'school-admin' && index === 0 && (
                <div className="my-1" onMouseEnter={() => setIsCampusHovered(true)} onMouseLeave={() => setIsCampusHovered(false)}>
                  <button onClick={() => setIsCampusLocked(!isCampusLocked)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all uppercase text-[10px] font-bold tracking-widest ${isCampusOpen ? 'bg-slate-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4"><Split size={18} /> Campus Setup</div>
                    <ChevronDown size={14} className={`transition-transform ${isCampusOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isCampusOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-12 space-y-1 mt-1 overflow-hidden">
                        <SubItem id="infra" label="Class Creation" activePage={activePage} onNavigate={onNavigate} />
                        <SubItem id="school-staff" label="Staff Creation" activePage={activePage} onNavigate={onNavigate} />
                        <SubItem id="stfplanning" label="Staff Planning" activePage={activePage} onNavigate={onNavigate} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {userRole === 'school-admin' && item.id === 'access-cntrl' && (
                <div className="my-1" onMouseEnter={() => setIsStudentHovered(true)} onMouseLeave={() => setIsStudentHovered(false)}>
                  <button onClick={() => setIsStudentLocked(!isStudentLocked)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all uppercase text-[10px] font-bold tracking-widest ${isStudentOpen ? 'bg-slate-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4"><GraduationCap size={18} /> Students</div>
                    <ChevronDown size={14} className={`transition-transform ${isStudentOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isStudentOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-12 space-y-1 mt-1 overflow-hidden">
                        <SubItem id="student-list" label="Student List" activePage={activePage} onNavigate={onNavigate} />
                        <SubItem id="student-hub" label="Student Enrollment" activePage={activePage} onNavigate={onNavigate} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-50">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 text-red-400 hover:bg-red-50 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest">
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
    <button onClick={() => onNavigate(id)} className={`w-full text-left py-2.5 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${isActive ? 'text-blue-600 translate-x-1' : 'text-slate-400 hover:text-slate-600'}`}>
      <div className="flex items-center gap-2">
        <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`} />
        {label}
      </div>
    </button>
  );
}