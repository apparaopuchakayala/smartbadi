import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Printer, Activity, CalendarCheck, User, 
    MapPin, Phone, Sparkles, Award, GraduationCap,
    ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../../services/supabaseClient'; 

// --- 1. SKELETON LOADER COMPONENT ---
const ProfileSkeleton = () => (
    <div className="flex flex-col md:flex-row w-full h-full animate-pulse">
        <div className="w-full md:w-[350px] bg-slate-200 p-8 flex flex-col items-center">
            <div className="w-40 h-40 bg-slate-300 rounded-[30px] mb-6" />
            <div className="h-6 w-3/4 bg-slate-300 rounded mb-4" />
            <div className="h-4 w-1/2 bg-slate-300 rounded" />
        </div>
        <div className="flex-1 bg-white p-8 space-y-8">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                    <div className="h-24 w-full bg-slate-50 rounded-[30px]" />
                </div>
            ))}
        </div>
    </div>
);

// --- 2. STATS COMPONENT ---
const StudentStatsView = ({ studentId, onBack }: { studentId: string, onBack: () => void }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const { data } = await supabase
                .from('student_analytics_view')
                .select('*')
                .eq('student_id', studentId)
                .single();
            setStats(data || { percentage: 0, total_classes: 0, classes_attended: 0, classes_absent: 0 });
            setLoading(false);
        };
        fetchStats();
    }, [studentId]);

    if (loading) return (
        <div className="h-full w-full flex flex-col items-center justify-center p-12 space-y-8 animate-pulse">
            <div className="w-56 h-56 rounded-full border-[16px] border-slate-100" />
            <div className="h-12 w-48 bg-slate-100 rounded-2xl" />
            <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl" />)}
            </div>
        </div>
    );

    const percentage = stats?.percentage || 0;
    const theme = percentage >= 75 ? 'blue' : percentage >= 65 ? 'orange' : 'red';
    const colors = {
        blue: { text: 'text-blue-600', ring: 'border-blue-500', bg: 'bg-blue-50', icon: CheckCircle2 },
        orange: { text: 'text-orange-500', ring: 'border-orange-500', bg: 'bg-orange-50', icon: AlertCircle },
        red: { text: 'text-red-500', ring: 'border-red-500', bg: 'bg-red-50', icon: XCircle },
    }[theme] as any;

    const Icon = colors.icon;

    return (
        <div className="h-full flex flex-col p-6 md:p-12 w-full overflow-y-auto no-scrollbar">
            <button onClick={onBack} className="self-start flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 mb-8 transition-all active:scale-95">
                <ArrowLeft size={16} /> Back to Profile
            </button>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[12px] md:border-[20px] border-slate-50 shadow-inner"></div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md">
                        <motion.circle
                            cx="50%" cy="50%" r="42%"
                            stroke="currentColor" strokeWidth="12" fill="transparent" strokeLinecap="round"
                            className={colors.text}
                            initial={{ strokeDasharray: "0 1000" }}
                            animate={{ strokeDasharray: `${(percentage / 100) * 540} 1000` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="flex flex-col items-center z-10">
                        <span className={`text-5xl md:text-7xl font-black tracking-tighter ${colors.text}`}>{percentage}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attendance</span>
                    </div>
                </div>

                <div className={`mt-10 px-8 py-5 rounded-[25px] ${colors.bg} ${colors.text} flex items-center gap-4 border-2 border-white shadow-xl`}>
                    <Icon size={28} />
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Current Standing</p>
                        <p className="text-sm font-bold">{percentage >= 75 ? 'Excellent Record' : percentage >= 65 ? 'Needs Improvement' : 'Critical Low Attendance'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full max-w-2xl mt-12 mb-6">
                    <StatBox label="Total Classes" value={stats.total_classes} color="text-slate-800" />
                    <StatBox label="Present" value={stats.classes_attended} color="text-emerald-600" />
                    <StatBox label="Absent" value={stats.classes_absent} color="text-red-500" />
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, color }: any) => (
    <div className="p-6 bg-white rounded-[28px] border-2 border-slate-50 text-center shadow-sm hover:shadow-md transition-all">
        <p className={`text-3xl font-black ${color}`}>{value}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{label}</p>
    </div>
);

// --- 3. HELPER FOR PROFILE FIELDS ---
const InfoField = ({ label, value }: { label: string, value: string }) => (
    <div className="text-left group">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</p>
        <p className="text-sm font-bold text-slate-800 border-l-4 border-blue-100 pl-4 group-hover:border-blue-500 transition-all">{value || 'N/A'}</p>
    </div>
);

// --- 4. MAIN MODAL COMPONENT ---
export const StudentProfileModal = ({ student, onClose }: { student: any, onClose: () => void }) => {
    const [view, setView] = useState<'profile' | 'loading' | 'stats'>('profile');
    const contentRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = useReactToPrint({
        contentRef,
        documentTitle: `${student?.full_name}_Profile`,
    });

    if (!student) return null;

    const handleViewAttendance = () => {
        setView('loading');
        setTimeout(() => setView('stats'), 800);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 md:p-4 font-poppins">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} 
                className="relative w-full max-w-6xl h-[90vh] md:h-[85vh] rounded-[40px] md:rounded-[55px] overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col md:flex-row bg-[#F8FAFC] border-4 border-white"
            >
                {view === 'loading' && <ProfileSkeleton />}
                
                {view === 'stats' && <StudentStatsView studentId={student.id} onBack={() => setView('profile')} />}

                {view === 'profile' && (
                    <div ref={contentRef} className="flex flex-col md:flex-row w-full h-full bg-white print:h-auto print:w-full">
                        
                        {/* LEFT PANEL: High Impact Brand Side */}
                        <div className="w-full md:w-[380px] relative bg-slate-900 p-8 md:p-12 flex flex-col text-white print:w-[280px]">
                            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 print:hidden pointer-events-none">
                                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-blue-500 blur-3xl" />
                                <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-indigo-500 blur-3xl" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full text-center">
                                <div className="flex justify-between items-center mb-10 print:hidden">
                                    <div className="bg-white/10 p-2.5 rounded-2xl border border-white/5 shadow-inner">
                                        <Sparkles size={20} className="text-blue-400" />
                                    </div>
                                    <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-black tracking-widest border-2 border-white/20 shadow-lg">
                                        VERIFIED
                                    </span>
                                </div>

                                <div className="w-44 h-44 mx-auto bg-white/5 p-2.5 rounded-[45px] border-2 border-white/10 shadow-2xl mb-8 relative group">
                                    <div className="w-full h-full rounded-[35px] overflow-hidden bg-slate-800 relative shadow-inner">
                                        {student.avatar_url ? (
                                            <img src={student.avatar_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Avatar" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                                                <User size={64} strokeWidth={1} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2.5 rounded-2xl border-4 border-slate-900 shadow-xl print:hidden">
                                        <ShieldCheck size={20} />
                                    </div>
                                </div>

                                <h2 className="text-2xl md:text-3xl font-black tracking-tighter leading-tight mb-2 uppercase">{student.full_name}</h2>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[4px] mb-8">Registry ID: {student.roll_number || student.employee_id}</p>

                                <div className="mt-auto space-y-4 print:hidden">
                                    <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-5 hover:bg-white/10 transition-all cursor-default">
                                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><Phone size={18} /></div>
                                        <div className="text-left"><p className="text-[8px] font-black text-white/40 uppercase">Emergency Contact</p><p className="text-sm font-black">{student.father_mobile || "UNLINKED"}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL: Data Side */}
                        <div className="flex-1 bg-[#F8FAFC] flex flex-col h-full overflow-hidden print:bg-white">
                            <div className="bg-white px-6 md:px-10 py-6 border-b-2 border-slate-100 flex justify-between items-center z-20">
                                <div className="text-left">
                                    <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                        <GraduationCap className="text-blue-700" size={24} /> Student <span className="text-blue-700">Dossier</span>
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Academic Year 2025-2026</p>
                                </div>
                                <div className="flex gap-3 no-print">
                                    <button onClick={() => handlePrint()} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90">
                                        <Printer size={20} />
                                    </button>
                                    <button onClick={onClose} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar no-scrollbar print:overflow-visible">
                                <section className="text-left">
                                    <div className="flex items-center gap-3 mb-6"><div className="w-2 h-6 bg-blue-600 rounded-full" /><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[3px]">Campus Enrollment</h4></div>
                                    <div className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <InfoField label="Institutional Class" value={student.current_class} />
                                        <InfoField label="Assigned Section" value={student.current_section} />
                                        <InfoField label="Digital Login" value={student.email} />
                                        <InfoField label="Onboarding Date" value={new Date(student.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
                                    </div>
                                </section>

                                <section className="text-left">
                                    <div className="flex items-center gap-3 mb-6"><div className="w-2 h-6 bg-orange-500 rounded-full" /><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[3px]">Family & Health</h4></div>
                                    <div className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                        <InfoField label="Birth Date" value={student.dob} />
                                        <InfoField label="Gender" value={student.gender} />
                                        <InfoField label="Blood Registry" value={student.blood_group} />
                                        <InfoField label="Father Identity" value={student.father_name} />
                                        <InfoField label="Mother Identity" value={student.mother_name} />
                                        <InfoField label="Parent Mobile" value={student.mother_mobile} />
                                    </div>
                                </section>

                                <section className="text-left">
                                    <div className="flex items-center gap-3 mb-6"><div className="w-2 h-6 bg-emerald-500 rounded-full" /><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[3px]">Residential Data</h4></div>
                                    <div className="bg-white p-6 rounded-[30px] border-2 border-slate-100 flex items-start gap-5">
                                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><MapPin size={24} /></div>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{student.address || "Permanent address details pending in central registry."}</p>
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print mt-6">
                                    <button onClick={handleViewAttendance} className="p-5 bg-blue-600 text-white rounded-[30px] font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-3 shadow-xl hover:bg-slate-900 transition-all active:scale-95">
                                        <CalendarCheck size={28} /> Attendance
                                    </button>
                                    <button className="p-5 bg-white text-slate-900 rounded-[30px] font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-3 shadow-lg border-2 border-slate-100 hover:border-blue-600 transition-all active:scale-95">
                                        <Award size={28} className="text-orange-500" /> Exam Marks
                                    </button>
                                    <button className="p-5 bg-white text-slate-900 rounded-[30px] font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-3 shadow-lg border-2 border-slate-100 hover:border-emerald-600 transition-all active:scale-95">
                                        <Activity size={28} className="text-emerald-500" /> Health Log
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};