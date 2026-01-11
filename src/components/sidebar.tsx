import { useState } from 'react';
import {
  LayoutDashboard, Building2, Users, ShieldCheck,
  GraduationCap, CalendarRange, BookOpen, FileSignature,
  PieChart, LogOut, Menu, X, CheckCircle2, ChevronLeft
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
  const { profile, session } = useAuth();

  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || 'User';

  const getMenuItems = () => {
    switch (userRole) {
      case 'super-admin':
        return [
          { id: 'manage-schools', label: 'Global Schools', icon: Building2 },
          { id: 'staff-mgmt', label: 'Global Staff', icon: Users },
          { id: 'settings', label: 'System Settings', icon: ShieldCheck },
        ];
      case 'school-admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'staff-mgmt', label: 'Staff & Access', icon: ShieldCheck },
          { id: 'student-mgmt', label: 'Student Hub', icon: GraduationCap },
          { id: 'class-mapping', label: 'Class Mapping', icon: CalendarRange },
          { id: 'assignments', label: 'Assignments', icon: BookOpen },
          { id: 'exams', label: 'Examinations', icon: FileSignature },
          { id: 'analytics', label: 'Performance', icon: PieChart },
        ];
      case 'teacher':
        return [
          { id: 'dashboard', label: 'My Classes', icon: LayoutDashboard },
          { id: 'attendance', label: 'Mark Attendance', icon: Users },
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

      {/* Mobile Toggle Button */}
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
        {/* Header with Close Button for Desktop */}
        <div className="p-8 pb-4 flex items-center justify-center relative min-h-[80px]">
          <img
            src={logo}
            alt="SmartBadi"
            className="h-12 object-contain"
          />
          <button
            onClick={toggleSidebar}
            className="hidden md:flex absolute right-8 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="px-6 mb-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate w-full">
              {profile?.schools?.name || 'Welcome'}
            </p>
            <h3 className="text-sm font-black text-slate-700 line-clamp-1 mb-2">
              {displayName}
            </h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[8px] font-bold uppercase tracking-widest border border-blue-200">
              {userRole?.replace('-', ' ')}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 768) setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
                  }`}
              >
                <Icon size={20} className={isActive ? 'scale-110' : 'group-hover:scale-110'} />
                <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}