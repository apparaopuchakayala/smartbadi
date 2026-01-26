import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { 
    BookOpen, Users, ArrowRight, Calendar, 
    Layers, GraduationCap, RefreshCw, AlertTriangle, ShieldOff 
} from 'lucide-react';
import { motion } from 'framer-motion';

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
        
        // 1. Permission Check: Verify if any core module access is granted
        // We check if the permissions object exists and has at least one module enabled
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

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Verifying Credentials...</p>
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
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Access Not Initialized</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-4 max-w-sm leading-relaxed">
                    Your account permissions are currently disabled. <br />
                    Please contact the <span className="text-blue-600">School Administrator</span> to enable your module access.
                </p>
                <button onClick={fetchMySchedule} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                    <RefreshCw size={14} /> Refresh Permissions
                </button>
            </div>
        );
    }

    if (error) return (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Connection Issue</h3>
            <p className="text-slate-500 text-sm mb-6">{error}</p>
            <button onClick={fetchMySchedule} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-all">
                <RefreshCw size={16} /> Retry Connection
            </button>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10 font-poppins bg-slate-50/50 min-h-screen">
            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                        <Calendar size={14} /> {todayDate}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-light text-slate-800">
                        {getGreeting()}, <br />
                        <span className="font-bold text-slate-900">{profile?.full_name?.split(' ')[0]} 👋</span>
                    </h1>
                </div>
                
                <div className="bg-white p-4 pr-8 rounded-[24px] shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Layers size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Classes</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{myClasses.length}</p>
                    </div>
                </div>
            </div>

            {/* --- CLASSES GRID --- */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Your Professional Schedule</h2>
                </div>

                {myClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myClasses.map((cls, index) => (
                            <motion.div 
                                key={cls.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -8, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onSelectClass(cls)}
                                className="group bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm cursor-pointer relative overflow-hidden flex flex-col justify-between h-[220px]"
                            >
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out"></div>

                                <div className="relative z-10 text-left">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100 group-hover:bg-white transition-colors">
                                            {cls.academic_year}
                                        </span>
                                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                            <Users size={18} />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-4xl font-black text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                                        {cls.class_name}
                                        <span className="text-lg text-slate-400 font-medium ml-1">/{cls.section}</span>
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-tight">
                                        <BookOpen size={16} className="text-blue-400" />
                                        {cls.subject_name}
                                    </div>
                                </div>

                                <div className="relative z-10 flex items-center justify-between mt-auto pt-6 border-t border-slate-50 group-hover:border-slate-100 transition-colors">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">Access Class Registry</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200"
                    >
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                            <GraduationCap size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 uppercase tracking-tight">No Classes Assigned</h3>
                        <p className="text-xs font-bold text-slate-400 max-w-xs text-center mt-2 uppercase tracking-widest leading-loose">
                            Your professional schedule is empty. Contact the administrative office for assignment.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}