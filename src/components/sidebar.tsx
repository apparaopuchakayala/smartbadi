import { useState } from 'react';

import {

  LayoutDashboard, Building2, Users, ShieldCheck,

  GraduationCap, CalendarRange, BookOpen, FileSignature,

  PieChart, LogOut, Menu, X, CheckCircle2

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

}



export function Sidebar({ activePage, onNavigate, userRole }: SidebarProps) {

  const [isOpen, setIsOpen] = useState(false);

  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);



  // 1. GET BOTH PROFILE (DB) AND SESSION (TOKEN)

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

        return [

          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },

        ];

    }

  };



  const menuItems = getMenuItems();



  const handleNavigation = (pageId: string) => {

    localStorage.setItem('lastActivePage', pageId);

    onNavigate(pageId);

    if (window.innerWidth < 768) setIsOpen(false);

  };



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

          <motion.div

            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}

            className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900/20 backdrop-blur-md"

          >

            <motion.div

              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}

              className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center border border-blue-100"

            >

              <motion.div

                initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }}

                transition={{ type: "spring", stiffness: 260, damping: 20 }}

                className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6"

              >

                <CheckCircle2 size={60} className="text-green-500" />

              </motion.div>

              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Logged Out!</h2>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>



      <button

        onClick={() => setIsOpen(!isOpen)}

        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-white text-slate-600 rounded-xl shadow-lg border border-slate-100"

      >

        {isOpen ? <X size={24} /> : <Menu size={24} />}

      </button>



      <aside

        className={`

          fixed md:static inset-y-0 left-0 z-40 w-72

          bg-white border-r border-slate-100 shadow-xl shadow-slate-100/50

          flex flex-col h-screen transition-transform duration-300 ease-in-out

          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}

        `}

      >

        <div className="p-8 pb-4 flex justify-center">

          <img src={logo} alt="SmartBadi" className="h-16 object-contain" />

        </div>



        {/* WELCOME SECTION */}

        <div className="px-6 mb-6">

           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center shadow-sm">

             

              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg shadow-sm mb-3 border border-slate-50">

                👋

              </div>

             

              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">

                Welcome back

              </p>

             

              {/* DISPLAY NAME (DB or Token) */}

              <h3 className="text-sm font-black text-slate-700 line-clamp-1 mb-3 px-2">

                {displayName}

              </h3>



              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[9px] font-bold uppercase tracking-widest border border-blue-200">

                {userRole?.replace('-', ' ')}

              </span>

           </div>

        </div>



        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">

          {menuItems.map((item) => {

            const isActive = activePage === item.id;

            const Icon = item.icon;



            return (

              <button

                key={item.id}

                onClick={() => handleNavigation(item.id)}

                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${

                  isActive

                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'

                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'

                }`}

              >

                {isActive && (

                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-full" />

                )}



                <Icon

                  size={20}

                  className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}

                  strokeWidth={isActive ? 2 : 1.5}

                />

               

                <span className={`text-xs font-bold uppercase tracking-widest ${isActive ? 'text-white' : ''}`}>

                  {item.label}

                </span>

              </button>

            );

          })}

        </nav>



        <div className="p-4 mt-auto border-t border-slate-50">

          <button

            onClick={handleLogout}

            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-all group"

          >

            <LogOut size={18} strokeWidth={2} className="group-hover:-translate-x-1 transition-transform" />

            <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>

          </button>

        </div>

      </aside>

    </>

  );

}