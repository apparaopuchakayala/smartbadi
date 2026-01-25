import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Users, GraduationCap, School, Activity,
    Calendar, Bell, TrendingUp, ArrowUpRight,
    Clock, PlusCircle, CheckSquare, Sparkles,
    DollarSign, UserPlus, FileText, ChevronRight,
    MapPin, Target, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, PointElement, LineElement, ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {AttendanceSettings} from './attendancesettings';
import {AdminMarksView} from './adminmarksview';
import {BirthdayGreetings} from "./birthdaygreetings";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

export function AdminDashboard() {
    const { profile } = useAuth();
    const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 14, attendance: '94%' });
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        if (profile?.school_id) fetchDashboardStats();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [profile]);

    const fetchDashboardStats = async () => {
        setLoading(true);
        const { count: sCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', profile.school_id).eq('role', 'student');
        const { count: tCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', profile.school_id).eq('role', 'teacher');
        setStats(prev => ({ ...prev, students: sCount || 0, teachers: tCount || 0 }));
        setLoading(false);
    };

    // Chart Configs
    const performanceData = {
        labels: ['6th', '7th', '8th', '9th', '10th'],
        datasets: [{
            label: 'Avg Score',
            data: [85, 78, 92, 88, 95],
            backgroundColor: ['#3b82f6', '#8DC63F', '#f59e0b', '#8b5cf6', '#ec4899'],
            borderRadius: 12,
        }]
    };

    return (
        <div className="space-y-8 p-2 md:p-6 text-left bg-[#F8FAFC] min-h-screen pb-20 overflow-hidden">

            {/* --- TOP ROW: GREETING & DYNAMIC CLOCK --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center ">
                <div className="lg:col-span-3 bg-white p-8 rounded-[44px] shadow-sm border border-white flex flex-col md:flex-row justify-between items-center gap-6 ">
                    <div className="flex items-center gap-6 ">
                        <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100 animate-pulse">
                            <Zap size={32} fill="white" />
                        </div>
                        <div className ="">
                            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                                Admin <span className="text-[#8DC63F]">Hub</span>
                            </h1>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[3px] mt-2 flex items-center gap-2">
                                <School size={14} className="text-blue-500" /> {profile?.schools?.name || "Institutional Registry"}
                            </p>
                        </div>
                    </div>
                    <div className="h-12 w-[1px] bg-slate-100 hidden md:block"></div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-slate-800 tracking-tighter tabular-nums">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    </div>
                </div>
                
                {/* <div className="bg-slate-900 rounded-[40px] p-8 text-white flex items-center justify-between shadow-2xl active:scale-95 transition-all cursor-pointer">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</p>
                        <p className="text-2xl font-black mt-1">₹4.28L</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl text-[#8DC63F]"><DollarSign size={24} /></div>
                </div> */}
            </div>
            <AttendanceSettings/>
            <AdminMarksView />
            <BirthdayGreetings/>
        </div>
    );
}

// --- Internal UI Components (Modular for re-use) ---

const StatCard = ({ icon, title, value, trend, color }: any) => {
    const theme: any = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        green: "text-[#8DC63F] bg-green-50 border-green-100",
        orange: "text-orange-600 bg-orange-50 border-orange-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100"
    };
    return (
        <motion.div whileHover={{ y: -5 }} className={`bg-white p-7 rounded-[40px] border shadow-sm transition-all group ${theme[color]}`}>
            <div className="flex justify-between items-start mb-5">
                <div className={`p-4 rounded-2xl ${theme[color]} shadow-inner`}>{React.cloneElement(icon, { size: 24 })}</div>
                <span className="text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter bg-white shadow-sm border border-slate-50 text-slate-500">{trend}</span>
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[2px]">{title}</h3>
            <p className="text-3xl font-black text-slate-800 mt-1">{value}</p>
        </motion.div>
    );
};

const NoticeItem = ({ title, time, color }: any) => {
    const dots: any = { blue: "bg-blue-500", green: "bg-[#8DC63F]", purple: "bg-purple-500" };
    return (
        <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer">
            <div className={`w-3 h-3 rounded-full ${dots[color]} shadow-lg`}></div>
            <div>
                <p className="text-xs font-bold text-slate-700">{title}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{time}</p>
            </div>
        </div>
    );
};

const TaskCard = ({ title, category, urgent }: any) => (
    <div className={`p-5 rounded-[30px] border transition-all cursor-pointer group flex items-center justify-between ${urgent ? 'bg-red-50 border-red-100' : 'bg-white border-slate-50 hover:shadow-lg'}`}>
        <div>
            <p className={`text-xs font-bold ${urgent ? 'text-red-700' : 'text-slate-700'}`}>{title}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{category}</p>
        </div>
        <ChevronRight size={16} className={urgent ? 'text-red-300' : 'text-slate-200'} />
    </div>
);

const ActivityRow = ({ user, action, time }: any) => (
    <div className="flex items-start gap-4 border-l-2 border-slate-800 pl-6 relative">
        <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-[#8DC63F] shadow-[0_0_10px_#8DC63F]"></div>
        <div className="flex-1">
            <p className="text-xs font-bold text-slate-200">{action}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">BY {user} • {time}</p>
        </div>
    </div>
);