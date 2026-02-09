import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Users, GraduationCap, School, Activity,
    UserPlus, ChevronRight, Target, Zap, PieChart, Clock,
    TrendingUp, Shield, Sparkles, BarChart3, CheckSquare, LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AttendanceSettings } from './attendancesettings';
import { AdminMarksView } from './adminmarksview';
import { BirthdayGreetings } from "./birthdaygreetings";
import { PrincipalSign } from '../../components/common/principlesign';
import { HubSkeleton, CardSkeleton } from '../../components/common/skeletoncomp';
import { LeaveStats } from './leavestats';

interface AdminDashboardProps {
    onNavigate: (page: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
    const { profile } = useAuth();

    // --- STATE ---
    const [stats, setStats] = useState({
        students: 0,
        teachers: 0,
        classes: 14,
        attendance: '94%',
        maleStudents: 0,
        femaleStudents: 0
    });
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- EFFECTS ---
    useEffect(() => {
        if (profile?.school_id) fetchDashboardStats();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [profile]);

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            const { count: sCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', profile.school_id).eq('role', 'student');
            const { count: tCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', profile.school_id).eq('role', 'teacher');
            const { count: mCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', profile.school_id).eq('role', 'student').eq('gender', 'Male');
            const { count: fCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', profile.school_id).eq('role', 'student').eq('gender', 'Female');

            setStats(prev => ({
                ...prev,
                students: sCount || 0,
                teachers: tCount || 0,
                maleStudents: mCount || 0,
                femaleStudents: fCount || 0
            }));
        } finally {
            setLoading(false);
        }
    };

    // --- ANIMATIONS ---
    const containerVars = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        // MAIN WRAPPER: overflow-x-hidden prevents side-to-side scrolling on mobile
        <div className="space-y-6 md:space-y-10 text-left min-h-screen font-poppins pb-20 px-2 md:px-0">
            {/* --- HEADER CARD --- */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-w-[1600px] mx-auto mb-6 md:mb-10 w-full"
            >
                <div className="bg-white/80 backdrop-blur-xl p-5 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                            {/* 3D Icon Container */}
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[20px] md:rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 ring-4 ring-white transform group-hover:scale-105 transition-transform duration-500 shrink-0">
                                <LayoutDashboard size={28} strokeWidth={2} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex flex-wrap items-center gap-3">
                                    Admin Console 
                                    <span className="px-3 py-1 bg-emerald-100/50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-200/50 shadow-sm">Live</span>
                                </h1>
                                <p className="text-slate-500 font-bold mt-1 flex items-center gap-2 text-xs md:text-sm uppercase tracking-wide opacity-80 break-all sm:break-normal">
                                    <School size={14} className="text-indigo-500 shrink-0" /> 
                                    <span className="line-clamp-1">{profile?.schools?.name}</span>
                                </p>
                            </div>
                        </div>

                        {/* 3D Time Pill - Full width on mobile, auto on desktop */}
                        <div className="flex items-center justify-between lg:justify-start gap-4 sm:gap-5 bg-white px-5 py-3 rounded-2xl md:rounded-full border border-slate-100 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.05)] w-full lg:w-auto">
                            <div className="p-2 bg-indigo-50 rounded-full text-indigo-600 shrink-0">
                                <Clock size={18} />
                            </div>
                            <div className="text-right">
                                <p className="text-lg md:text-xl font-black text-slate-800 tabular-nums leading-none">
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* --- MAIN CONTENT GRID --- */}
            {/* Using grid-cols-1 for mobile, 12-col for large screens. min-w-0 ensures children compress properly. */}
            <motion.div
                variants={containerVars}
                initial="hidden"
                animate="show"
                className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 w-full"
            >

                {/* --- LEFT COLUMN --- */}
                <div className="lg:col-span-8 space-y-6 md:space-y-8 w-full min-w-0">

                    {/* 1. 3D METRICS GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
                        {loading ? [1, 2, 3, 4].map(i => <CardSkeleton key={i} />) : (
                            <>
                                <MetricCard3D
                                    label="Total Students"
                                    value={stats.students}
                                    icon={<Users />}
                                    color="blue"
                                    trend="+5%"
                                />
                                <MetricCard3D
                                    label="Faculty"
                                    value={stats.teachers}
                                    icon={<GraduationCap />}
                                    color="indigo"
                                    trend="Active"
                                />
                                <MetricCard3D
                                    label="Attendance"
                                    value={stats.attendance}
                                    icon={<Activity />}
                                    color="emerald"
                                    trend="Daily Avg"
                                />
                                <MetricCard3D
                                    label="Active Classes"
                                    value={stats.classes}
                                    icon={<Target />}
                                    color="rose"
                                    trend="On Track"
                                />
                            </>
                        )}
                    </div>

                    {/* 2. DEMOGRAPHICS */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-100 rounded-2xl text-slate-500">
                                    <PieChart size={20} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Demographics Breakdown</h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {/* Male Card */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-white p-5 md:p-6 rounded-[2rem] border border-blue-100 shadow-sm group hover:shadow-md transition-all">
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                                        <UserPlus size={20} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-blue-400 uppercase tracking-wider">Male</span>
                                        <span className="text-2xl md:text-3xl font-black text-slate-800">{stats.maleStudents}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Female Card */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 to-white p-5 md:p-6 rounded-[2rem] border border-pink-100 shadow-sm group hover:shadow-md transition-all">
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-lg shadow-pink-200 shrink-0">
                                        <UserPlus size={20} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-pink-400 uppercase tracking-wider">Female</span>
                                        <span className="text-2xl md:text-3xl font-black text-slate-800">{stats.femaleStudents}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. LEAVE ANALYTICS */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] w-full overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 md:mb-8 pb-6 border-b border-slate-100">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200 shrink-0">
                                <Sparkles size={22} fill="white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Leave Insights</h3>
                                <p className="text-sm text-slate-400 font-bold">Live overview of staff & student presence</p>
                            </div>
                        </div>
                        <div className="w-full overflow-x-auto">
                            <LeaveStats schoolId={profile?.school_id} onNavigate={onNavigate} />
                        </div>
                    </div>

                    {/* 4. ATTENDANCE PROTOCOL */}
                    <div className="bg-white p-1 rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] w-full overflow-hidden">
                        <AttendanceSettings />
                    </div>

                    {/* 5. MARKS REGISTRY */}
                    <div className="bg-white p-1 rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] w-full overflow-visible">
                        <AdminMarksView />
                    </div>

                </div>

                {/* --- RIGHT COLUMN (Sidebar Widgets) --- */}
                <div className="lg:col-span-4 flex flex-col gap-6 md:gap-8 w-full min-w-0">

                    {/* 1. Birthdays */}
                    <div className="bg-white p-1 rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)]">
                        <BirthdayGreetings />
                    </div>

                    {/* 2. Principal Signature */}
                    <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-slate-900/30 text-white relative overflow-hidden flex flex-col justify-between group min-h-[220px] md:min-h-[250px]">
                        {/* 3D Lighting Effect */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-indigo-500/30 to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>

                        <div className="relative z-10 mb-6 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield size={18} className="text-emerald-400" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[3px]">Verified</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-black tracking-tight">Principal<br />Signature</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                <Sparkles size={20} className="text-yellow-400" fill="currentColor" />
                            </div>
                        </div>

                        <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10 shadow-inner">
                            <PrincipalSign schoolId={profile?.school_id} />
                        </div>
                    </div>

                    {/* 3. Quick Actions */}
                    <div className="bg-gradient-to-b from-indigo-600 to-violet-700 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] text-white shadow-2xl shadow-indigo-600/30 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>

                        <h3 className="text-lg md:text-xl font-black relative z-10 mb-6 md:mb-8 flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Zap size={20} fill="white" /></div>
                            Quick Actions
                        </h3>

                        <div className="space-y-3 md:space-y-4 relative z-10">
                            <ActionButton onClick={() => onNavigate('students')} icon={<UserPlus size={18} />} label="Add Student" />
                            <ActionButton onClick={() => onNavigate('attendance')} icon={<CheckSquare size={18} />} label="Mark Attendance" />
                            <ActionButton onClick={() => onNavigate('results')} icon={<BarChart3 size={18} />} label="Exam Results" />
                        </div>
                    </div>

                </div>

            </motion.div>
        </div>
    );
}

// --- 3D METRIC CARD (Responsive) ---
const MetricCard3D = ({ label, value, icon, color, trend }: any) => {
    const gradients: any = {
        blue: 'from-blue-500 to-blue-600 shadow-blue-500/30',
        indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30',
        emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
        rose: 'from-rose-500 to-rose-600 shadow-rose-500/30',
    };

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] flex flex-col justify-between group cursor-default h-full relative z-0 min-h-[140px] md:min-h-[160px]"
        >
            <div className="flex justify-between items-start mb-4 md:mb-6">
                {/* Floating 3D Icon */}
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[18px] md:rounded-[20px] bg-gradient-to-br ${gradients[color]} flex items-center justify-center text-white shadow-lg ring-4 ring-slate-50 shrink-0`}>
                    {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-emerald-600 bg-emerald-50/80 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-emerald-100">
                        <TrendingUp size={12} /> {trend}
                    </div>
                )}
            </div>

            <div className="pl-1">
                <h3 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter mb-1">{value}</h3>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{label}</p>
            </div>
        </motion.div>
    );
};

// --- ACTION BUTTON (Responsive) ---
const ActionButton = ({ onClick, icon, label }: any) => (
    <button onClick={onClick} className="w-full py-3 md:py-4 px-4 md:px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-[20px] md:rounded-[24px] flex items-center justify-between transition-all backdrop-blur-md group active:scale-95 shadow-sm">
        <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm group-hover:scale-110 transition-transform shrink-0">{icon}</div>
            <span className="font-bold text-xs md:text-sm tracking-wide text-left">{label}</span>
        </div>
        <ChevronRight size={18} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
    </button>
);