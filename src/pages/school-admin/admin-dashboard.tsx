import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Users, GraduationCap, School, Activity,
    Calendar, CheckSquare, Sparkles,
    UserPlus, ChevronRight, Target, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AttendanceSettings } from './attendancesettings';
import { AdminMarksView } from './adminmarksview';
import { BirthdayGreetings } from "./birthdaygreetings";
// Import skeletons
import { HubSkeleton, CardSkeleton } from '../../components/common/skeletoncomp';

export function AdminDashboard() {
    const { profile } = useAuth();
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

    return (
        <div className="space-y-3 p-2 md:p-6 text-left bg-[#F8FAFC] min-h-screen pb-20 overflow-hidden font-poppins">

            {/* --- TOP SECTION GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                {/* 1. UNIFIED ADMIN CARD */}
                <div className="lg:col-span-8 bg-white p-8 rounded-[44px] shadow-sm border border-white flex flex-col gap-10">

                    {/* TOP: HUB & TIME - Integrated Skeleton */}
                    {loading ? (
                        <HubSkeleton />
                    ) : (
                        <div className="flex flex-col md:flex-row justify-between items-center w-full animate-in fade-in duration-500">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                                    <Zap size={32} fill="white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                                        Admin <span className="text-[#8DC63F]">Hub</span>
                                    </h1>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[3px] mt-2 flex items-center gap-2">
                                        <School size={14} className="text-blue-500" /> {profile?.schools?.name}
                                    </p>
                                </div>
                            </div>

                            <div className="h-12 w-[1px] bg-slate-100 hidden md:block"></div>

                            <div className="text-right">
                                <p className="text-2xl font-black text-slate-800 tracking-tighter tabular-nums leading-none">
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* BOTTOM: STATS GRID - Integrated Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {loading ? (
                            // Showing 5 skeletons to match the 5 stat cards
                            [1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)
                        ) : (
                            <>
                                <StatCard icon={<Users />} title="Students" value={stats.students} color="blue" />
                                <GenderStatCard maleCount={stats.maleStudents} femaleCount={stats.femaleStudents} />
                                <StatCard icon={<GraduationCap />} title="Teachers" value={stats.teachers} color="green" />
                                <StatCard icon={<Activity />} title="Attendance" value={stats.attendance} color="orange" />
                                <StatCard icon={<Target />} title="Classes" value={stats.classes} color="purple" />
                            </>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <BirthdayGreetings />
                </div>
            </div>

            <AttendanceSettings />
            <AdminMarksView />
        </div>
    );
}

// --- GENDER BREAKDOWN COMPONENT (Funcionality Maintained) ---
const GenderStatCard = ({ maleCount, femaleCount }: { maleCount: number, femaleCount: number }) => (
    <div className="p-5 rounded-[32px] border border-slate-250 transition-all hover:shadow-md bg-slate-50/30 flex flex-col justify-between">
        <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-3">Student Gender</h3>
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <UserPlus size={12} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Male</span>
                </div>
                <span className="text-xs font-black text-slate-800">{maleCount}</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600">
                        <UserPlus size={12} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Female</span>
                </div>
                <span className="text-xs font-black text-slate-800">{femaleCount}</span>
            </div>
        </div>
    </div>
);

// --- COMPACT STAT CARD (Functionality Maintained) ---
const StatCard = ({ icon, title, value, color }: any) => {
    const theme: any = {
        blue: "text-blue-600 bg-blue-50/50",
        green: "text-[#8DC63F] bg-green-50/50",
        orange: "text-orange-600 bg-orange-50/50",
        purple: "text-purple-600 bg-purple-50/50"
    };
    return (
        <div className="p-5 rounded-[32px] border border-slate-250 transition-all hover:shadow-md bg-slate-50/30">
            <div className={`w-10 h-10 rounded-2xl ${theme[color]} flex items-center justify-center mb-3 shadow-inner`}>
                {React.cloneElement(icon, { size: 18 })}
            </div>
            <h3 className="text-slate-400 text-[8px] font-black uppercase tracking-widest">{title}</h3>
            <p className="text-xl font-black text-slate-800 mt-0.5">{value}</p>
        </div>
    );
};