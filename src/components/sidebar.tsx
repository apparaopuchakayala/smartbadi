import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, Users, ShieldCheck,
  GraduationCap, CalendarRange, BookOpen, FileSignature,
  PieChart, LogOut, ChevronLeft, Split, ChevronDown, Menu, X,
  Bell, Receipt, CalendarPlus, FilePlus, Trophy

} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/smartbadi.png';
import { useAuth } from '../context/AuthProvider';

interface SidebarProps {
  activePage: string;
  onNavigate: (pageId: string) => void;
  userRole: string;
  isDesktopVisible: boolean;
  toggleSidebar: () => void;
  onLogout?: () => void;
}

export function Sidebar({ activePage, onNavigate, userRole, isDesktopVisible, toggleSidebar, onLogout }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { profile } = useAuth();

  // --- SUB PAGE GROUPS ---
  const campusSubPages = ['infra', 'school-staff', 'stfplanning'];
  const studentSubPages = ['student-list', 'student-enrollment'];
  const leaveSubPages = ['leave-settings', 'leave-approvals'];

  // --- HOVER & LOCK STATES ---
  const [isCampusHovered, setIsCampusHovered] = useState(false);
  const [isCampusLocked, setIsCampusLocked] = useState(false);

  const [isStudentHovered, setIsStudentHovered] = useState(false);
  const [isStudentLocked, setIsStudentLocked] = useState(false);

  const [isLeaveHovered, setIsLeaveHovered] = useState(false);
  const [isLeaveLocked, setIsLeaveLocked] = useState(false);

  // --- OPEN STATE LOGIC ---
  const isCampusOpen = isCampusHovered || isCampusLocked || campusSubPages.includes(activePage);
  const isStudentOpen = isStudentHovered || isStudentLocked || studentSubPages.includes(activePage);
  const isLeaveOpen = isLeaveHovered || isLeaveLocked || leaveSubPages.includes(activePage);

  useEffect(() => {
    if (campusSubPages.includes(activePage)) setIsCampusLocked(true);
    if (studentSubPages.includes(activePage)) setIsStudentLocked(true);
    if (leaveSubPages.includes(activePage)) setIsLeaveLocked(true);
  }, [activePage]);

  const navigate = (id: string) => {
    onNavigate(id);
    if (window.innerWidth < 768) setIsMobileOpen(false);
  };

  const getMenuItems = () => {
    const items = {
      'super-admin': [
        { id: 'manage-schools', label: 'Global Schools', icon: Building2 },
        { id: 'student-list', label: 'Student List', icon: GraduationCap },
        { id: 'global-staff', label: 'Global Staff', icon: Users },
        { id: 'settings', label: 'System Settings', icon: ShieldCheck },
        { id: 'audit-logs', label: 'Audit logs', icon: ShieldCheck },
      ],
      'school-admin': [
        { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'access-cntrl', label: 'Access Control', icon: ShieldCheck },
        { id: 'attendance-mapping', label: 'Attendance Mapping', icon: CalendarRange },
        { id: 'leave-mgmt-group', label: 'Leave Management', icon: CalendarPlus },
        { id: 'exammngmt', label: 'Exam Management', icon: FileSignature },
        { id: 'announcement', label: 'Announcement', icon: Bell },
        { id: 'fee-mngmnt', label: 'Fee Management', icon: Receipt },
        { id: 'result-dec', label: 'Result Declaration', icon: Trophy },
      ],
      'teacher': [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard' },
        { id: 'student-list', label: 'Student List', icon: GraduationCap, perm: 'studentlist' },
        { id: 'attendance', label: 'Attendance', icon: Users, perm: 'attendance' },
        { id: 'marks-entry', label: 'Marks Entry', icon: FileSignature, perm: 'marks' },
        { id: 'leave-application', label: 'My Leaves', icon: FilePlus, perm: 'leave' },
      ],
      'student': [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'stu-result', label: 'Result', icon: Trophy},

      ]
    };
    return items[userRole as keyof typeof items] || [];
  };

  return (
    <>
      {/* MOBILE TRIGGER */}
      {!isMobileOpen && (
        <button onClick={() => setIsMobileOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-3 bg-white shadow-xl rounded-2xl text-blue-600 border border-blue-50">
          <Menu size={24} />
        </button>
      )}

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] md:hidden" />
        )}
      </AnimatePresence>

      <aside className={`fixed md:relative inset-y-0 left-0 z-[70] bg-white border-r border-slate-100 shadow-xl flex flex-col h-screen transition-all duration-300 
        ${isMobileOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0'} 
        ${!isDesktopVisible ? 'md:w-0 md:opacity-0 overflow-hidden' : 'md:w-72'}`}>

        {/* LOGO & TOGGLE */}
        <div className="p-6 flex items-center justify-center relative">
          <img src={logo} alt="SmartBadi" className="h-12 object-contain" />
          <button onClick={() => window.innerWidth < 768 ? setIsMobileOpen(false) : toggleSidebar()} className="absolute right-4 p-2 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
            <span className="md:hidden"><X size={20} /></span>
            <span className="hidden md:block"><ChevronLeft size={20} className={!isDesktopVisible ? 'rotate-180' : ''} /></span>
          </button>
        </div>

        {/* PROFILE CARD SECTION */}
        <div className="px-6 mb-6">
          <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 text-center shadow-inner">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] mb-1">
              {profile?.schools?.name || 'INSTITUTION'}
            </p>
            <h3 className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">
              {profile?.full_name || 'User'}
            </h3>
            <span className="inline-block mt-3 px-3 py-1 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase shadow-sm">
              {userRole?.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar custom-scrollbar">
          {getMenuItems().map((item, index) => (
            <div key={item.id}>

              {/* LEAVE MANAGEMENT DROPDOWN */}
              {item.id === 'leave-mgmt-group' ? (
                <div className="mt-1 mb-1" onMouseEnter={() => setIsLeaveHovered(true)} onMouseLeave={() => setIsLeaveHovered(false)}>
                  <button
                    onClick={() => setIsLeaveLocked(!isLeaveLocked)}
                    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all uppercase text-[10px] font-black tracking-widest ${isLeaveOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-4"><item.icon size={18} /> {item.label}</div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isLeaveOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isLeaveOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="space-y-1 mt-1 overflow-hidden border-l-2 border-slate-100 ml-8">
                        <SubItem id="leave-settings" label="Define Leaves" activePage={activePage} onNavigate={navigate} />
                        <SubItem id="leave-approvals" label="Leave Approvals" activePage={activePage} onNavigate={navigate} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* STANDARD MENU ITEM */
                <button
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${activePage === item.id ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <item.icon size={18} /> {item.label}
                </button>
              )}

              {/* CAMPUS SETUP DROPDOWN */}
              {userRole === 'school-admin' && index === 0 && (
                <div className="mt-1" onMouseEnter={() => setIsCampusHovered(true)} onMouseLeave={() => setIsCampusHovered(false)}>
                  <button onClick={() => setIsCampusLocked(!isCampusLocked)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all uppercase text-[10px] font-black tracking-widest ${isCampusOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4"><Split size={18} /> Campus Setup</div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isCampusOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isCampusOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className=" space-y-1 mt-1 overflow-hidden border-l-2 border-slate-100 ml-8">
                        <SubItem id="infra" label="Class Creation" activePage={activePage} onNavigate={navigate} />
                        <SubItem id="school-staff" label="Staff Creation" activePage={activePage} onNavigate={navigate} />
                        <SubItem id="stfplanning" label="Staff Planning" activePage={activePage} onNavigate={navigate} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* STUDENTS DROPDOWN */}
              {userRole === 'school-admin' && item.id === 'access-cntrl' && (
                <div className="mt-1" onMouseEnter={() => setIsStudentHovered(true)} onMouseLeave={() => setIsStudentHovered(false)}>
                  <button onClick={() => setIsStudentLocked(!isStudentLocked)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all uppercase text-[10px] font-black tracking-widest ${isStudentOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4"><GraduationCap size={18} /> Students</div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isStudentOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isStudentOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className=" space-y-1 mt-1 overflow-hidden border-l-2 border-slate-100 ml-8">
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

        {/* FOOTER ACTIONS (Activity + Sign Out) */}
        <div className="p-4 mt-auto border-t border-slate-100 space-y-2">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-[11px] uppercase tracking-[2px] active:scale-95">
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
    <button
      onClick={() => onNavigate(id)}
      className={`w-full text-left py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-3 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]' : 'bg-slate-300'}`} />
      {label}
    </button>
  );
}