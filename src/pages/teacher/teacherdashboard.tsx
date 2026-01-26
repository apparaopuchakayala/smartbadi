import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { 
    BookOpen, Users, ArrowRight, Calendar, 
    Layers, GraduationCap, RefreshCw, AlertTriangle, ShieldOff 
} from 'lucide-react';
import { motion } from 'framer-motion';
// Import your existing skeletons
import { CardSkeleton, ControlSkeleton } from '../../components/common/skeletoncomp';

interface DashboardProps {
    onSelectClass: (classData: any) => void;
}

export function TeacherDashboard({ onSelectClass }: DashboardProps) {
    const { profile } = useAuth();
    const [myClasses, setMyClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean>(true);

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const todayDate = new Date().toLocaleDateString('en-US', dateOptions);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    useEffect(() => {
        if (profile?.id) fetchMySchedule();
    }, [profile]);

    const fetchMySchedule = async () => {
        setLoading(true);
        setError(null);
        
        const perms = profile?.permissions || {};
        const isGranted = Object.values(perms).some(val => val === true);

        if (!isGranted) {
            setHasPermission(false);
            setLoading(false);
            return;
        }

        setHasPermission(true);

        try {
            const { data, error } = await supabase
                .from('teacher_assignments')
                .select('*')
                .eq('school_id', profile.school_id)
                .eq('teacher_id', profile.id);

            if (error) throw error;
            setMyClasses(data || []);
        } catch (err: any) {
            console.error("Dashboard Error:", err);
            setError("Unable to load your schedule.");
        } finally {
            setLoading(false);
        }
    };

    // --- LOADING STATE: SKELETON REPLACEMENT ---
    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10 font-poppins">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div className="space-y-4 w-full md:w-1/2">
                        <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
                        <div className="h-10 w-full bg-slate-200 animate-pulse rounded-xl" />
                    </div>
                    <div className="w-full md:w-48 h-20 bg-slate-200 animate-pulse rounded-[24px]" />
                </div>
                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    // --- ACCESS DENIED VIEW ---
    if (!hasPermission) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-red-50 text-red-500 rounded-[35px] flex items-center justify-center mb-6 shadow-xl shadow-red-100"
                >
                    <ShieldOff size={48} />
                </motion.div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Access Not Initialized</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-4 max-w-sm leading-relaxed">
                    Your account permissions are currently disabled. <br />
                    Please contact the <span className="text-blue-600">School Administrator</span>.
                </p>
                <button onClick={fetchMySchedule} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">
                    <RefreshCw size={14} /> Refresh Registry
                </button>
            </div>
        );
    }

    if (error) return (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Connection Issue</h3>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2">{error}</p>
            <button onClick={fetchMySchedule} className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all">
                <RefreshCw size={16} /> Retry Sync
            </button>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-8 md:space-y-12 font-poppins bg-[#F8FAFC] min-h-screen text-left">
            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-[2px] md:tracking-[3px] mb-2">
                        <Calendar size={14} className="text-blue-600" /> {todayDate}
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-800 uppercase tracking-tighter leading-tight">
                        {getGreeting()}, <br />
                        <span className="text-blue-700">{profile?.full_name?.split(' ')[0]} 👋</span>
                    </h1>
                </div>
                
                <div className="w-full md:w-auto bg-white p-5 pr-10 rounded-[30px] shadow-sm border-2 border-white flex items-center gap-5 transition-all hover:shadow-lg">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-inner">
                        <Layers size={28} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Units</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">{myClasses.length}</p>
                    </div>
                </div>
            </div>

            {/* --- CLASSES GRID --- */}
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-1.5 bg-blue-700 rounded-full"></div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Academic Assignment Matrix</h2>
                </div>

                {myClasses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {myClasses.map((cls, index) => (
                            <motion.div 
                                key={cls.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ y: -10, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onSelectClass(cls)}
                                className="group bg-white p-6 md:p-8 rounded-[35px] md:rounded-[45px] border-2 border-white shadow-xl cursor-pointer relative overflow-hidden flex flex-col justify-between h-[240px] md:h-[260px] transition-all"
                            >
                                {/* Decorative Background element */}
                                <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-600/5 rounded-full group-hover:bg-blue-600/10 transition-colors duration-500" />

                                <div className="relative z-10 text-left">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                            {cls.academic_year}
                                        </span>
                                        <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-blue-700 group-hover:text-white transition-all duration-300">
                                            <Users size={22} />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 group-hover:text-blue-700 transition-colors tracking-tighter">
                                        {cls.class_name}
                                        <span className="text-xl text-slate-400 font-bold ml-1">/SEC {cls.section}</span>
                                    </h3>
                                    <div className="flex items-center gap-2 text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest">
                                        <BookOpen size={16} className="text-blue-600" />
                                        {cls.subject_name}
                                    </div>
                                </div>

                                <div className="relative z-10 flex items-center justify-between mt-auto pt-6 border-t-2 border-slate-50 group-hover:border-blue-50 transition-colors">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-700">Enter Class Module</span>
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-700 group-hover:text-white group-hover:rotate-[-45deg] transition-all duration-500">
                                        <ArrowRight size={20} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-24 bg-white rounded-[50px] border-4 border-dashed border-slate-100 shadow-inner px-6"
                    >
                        <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center text-blue-300 mb-6 shadow-xl border-4 border-white">
                            <GraduationCap size={48} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Professional Registry Empty</h3>
                        <p className="text-[10px] font-bold text-slate-400 max-w-xs text-center mt-3 uppercase tracking-[3px] leading-relaxed">
                            No academic units have been assigned to your profile. Please coordinate with the administrative office.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}