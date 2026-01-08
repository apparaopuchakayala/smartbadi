import { useState } from 'react';
import {
    Home, ClipboardList, GraduationCap, FileText, Users,
    Settings, LogOut, Menu, X, TrendingUp, ClipboardCheck,
    UserPlus, Building2, ShieldAlert, CheckCircle2, Trophy, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/smartbadi.png';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

interface SidebarProps {
    activePage: string;
    onNavigate: (pageId: string) => void;
    userRole: string;
}

export function Sidebar({ activePage, onNavigate, userRole }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

    // --- NAVIGATION LOGIC WITH PERSISTENCE ---
    const handleNavigation = (pageId: string) => {
        // పేజీ మారినప్పుడు దానిని localStorage లో సేవ్ చేయడం వల్ల రీసెట్ సమస్య ఉండదు
        localStorage.setItem('lastActivePage', pageId);
        onNavigate(pageId);
        if (window.innerWidth < 768) setIsOpen(false);
    };

    const handleLogout = async () => {
        try {
            setShowLogoutSuccess(true);
            setTimeout(async () => {
                await supabase.auth.signOut();
                // లాగౌట్ అయినప్పుడు పాత పేజీ మెమరీని క్లియర్ చేయడం
                localStorage.removeItem('lastActivePage');
                localStorage.removeItem('lastSelectedSchool');
                onNavigate('landing');
                setShowLogoutSuccess(false);
            }, 800);
        } catch (error: any) {
            setShowLogoutSuccess(false);
            toast.error("Logout Issue: " + error.message);
        }
    };

    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard', roles: ['super-admin', 'school-admin', 'teacher'] },
        { id: 'manage-schools', icon: Building2, label: 'Institutions', roles: ['super-admin'] },
        { id: 'attendance', icon: ClipboardCheck, label: 'Attendance', roles: ['school-admin', 'teacher'] },
        { id: 'staff-mgmt', icon: ShieldAlert, label: 'Staff Management', roles: ['super-admin', 'school-admin'] },
        { id: 'add-student', icon: UserPlus, label: 'Add Student', roles: ['super-admin', 'school-admin', 'teacher'] },
        { id: 'assignments', icon: ClipboardList, label: 'Assignments', roles: ['school-admin', 'teacher'] },
        { id: 'analytics', icon: TrendingUp, label: 'Analytics', roles: ['super-admin', 'school-admin', 'teacher'] },
        { id: 'grades', icon: GraduationCap, label: 'Grades', roles: ['super-admin', 'school-admin', 'teacher'] },
        { id: 'exams', icon: FileText, label: 'Exam/Marks', roles: ['super-admin', 'school-admin', 'teacher'] },
        { id: 'results', icon: Trophy, label: 'Results', roles: ['super-admin', 'school-admin', 'teacher'] },
        { id: 'parents', icon: Users, label: 'Parents', roles: ['super-admin', 'school-admin', 'teacher'] },
        { id: 'payment', icon: CreditCard, label: 'Payment', roles: ['super-admin', 'school-admin', 'teacher'] },
        { id: 'settings', icon: Settings, label: 'Settings', roles: ['super-admin', 'school-admin', 'teacher'] },
    ];

    const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

    return (
        <>
            {/* LOGOUT SUCCESS OVERLAY */}
            <AnimatePresence>
                {showLogoutSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f0f9ff]/80 backdrop-blur-md"
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
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Logged Out!</h2>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MOBILE MENU TOGGLE */}
            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#1e293b] text-white rounded-lg shadow-lg">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* SIDEBAR CONTAINER */}
            <div className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#1e293b] min-h-screen flex flex-col p-6 text-white transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="flex justify-center mb-8">
                    <img src={logo} alt="SmartBadi Logo" className="h-12 object-contain" />
                </div>

                <div className="mb-4 px-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Role: {userRole?.replace('-', ' ')}</p>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                    {filteredMenu.map((item) => (
                        <button 
                            key={item.id} 
                            onClick={() => handleNavigation(item.id)} 
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${activePage === item.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        >
                            <item.icon size={20} className={activePage === item.id ? 'text-white' : 'group-hover:text-blue-400'} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    ))}

                    <div className="pt-2 border-t border-gray-700/50 mt-2">
                        <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all group">
                            <LogOut size={20} className="group-hover:text-red-400" />
                            <span className="font-medium text-sm">Logout</span>
                        </button>
                    </div>
                </nav>
            </div>
        </>
    );
}