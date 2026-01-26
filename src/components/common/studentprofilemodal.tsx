import React, { useState, useEffect, useRef } from 'react';
import {
    X, Printer, FileText, Activity, CalendarCheck, User,
    MapPin, Phone, Mail, Sparkles, Award, GraduationCap,
    ShieldCheck, School, ArrowLeft, CheckCircle2, AlertCircle, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../../services/supabaseClient.ts'; 

// --- 1. LOADING ANIMATION COMPONENT ---
const StudentInsLoading = () => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white min-h-[400px]">
        <div className="relative w-48 md:w-64 h-20 flex items-center justify-between overflow-hidden px-4 border-b-4 border-slate-100">
            <School className="text-blue-600" size={32} />
            <motion.div
                initial={{ x: -200 }}
                animate={{ x: 10 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute right-0"
            >
                <div className="relative">
                    <User className="text-orange-500 animate-bounce" size={28} />
                    <div className="absolute -top-1 -right-1 w-2 h-4 bg-orange-700 rounded-sm" />
                </div>
            </motion.div>
        </div>
        <div className="text-center mt-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">
                Fetching Records...
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                Accessing Central Registry
            </p>
        </div>
    </div>
);

// --- 2. STATS VIEW COMPONENT ---
const StudentStatsView = ({ studentId, onBack }: { studentId: string, onBack: () => void }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const { data, error } = await supabase
                .from('student_analytics_view')
                .select('*')
                .eq('student_id', studentId)
                .single();

            if (data) setStats(data);
            else setStats({ percentage: 0, classes_attended: 0, classes_absent: 0, total_classes: 0 });
            setLoading(false);
        };
        fetchStats();
    }, [studentId]);

    if (loading) return <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">Calculations...</div>;

    const percentage = stats?.percentage || 0;
    const colorTheme = percentage >= 75 ? 'blue' : percentage >= 65 ? 'orange' : 'red';

    const colors = {
        blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: CheckCircle2 },
        orange: { text: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', icon: AlertCircle },
        red: { text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', icon: XCircle },
    };

    const theme = colors[colorTheme as keyof typeof colors];
    const StatusIcon = theme.icon;

    return (
        <div className="h-full flex flex-col p-6 md:p-8 bg-white w-full animate-in fade-in zoom-in duration-300 overflow-y-auto">
            <button onClick={onBack} className="self-start flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-8 transition-colors">
                <ArrowLeft size={16} /> Back to Profile
            </button>

            <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[12px] md:border-[16px] border-slate-50"></div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="12" fill="transparent" className={`${theme.text} opacity-20`} />
                        <motion.circle
                            cx="50%" cy="50%" r="42%"
                            stroke="currentColor" strokeWidth="12" fill="transparent"
                            strokeLinecap="round" className={theme.text}
                            initial={{ strokeDasharray: "0 1000" }}
                            animate={{ strokeDasharray: `${(percentage / 100) * 500} 1000` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="flex flex-col items-center z-10">
                        <span className={`text-4xl md:text-6xl font-black ${theme.text}`}>{percentage}%</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attendance</span>
                    </div>
                </div>

                <div className={`mt-8 px-6 md:px-8 py-4 rounded-2xl ${theme.bg} ${theme.text} flex items-center gap-4 border ${theme.border} max-w-md`}>
                    <StatusIcon size={24} className="shrink-0" />
                    <div className="text-left">
                        <p className="text-xs font-black uppercase tracking-wide leading-none">Standing</p>
                        <p className="text-sm font-medium mt-1">
                            {percentage >= 75 ? 'Excellent! Eligible for Exams.' : percentage >= 65 ? 'Warning: Needs Improvement.' : 'Critical: Low Attendance Alert.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 md:gap-6 w-full max-w-2xl mt-12">
                    <div className="p-3 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                        <p className="text-xl md:text-3xl font-black text-slate-800">{stats?.total_classes || 0}</p>
                        <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</p>
                    </div>
                    <div className="p-3 md:p-5 bg-green-50 rounded-2xl border border-green-100 text-center">
                        <p className="text-xl md:text-3xl font-black text-green-600">{stats?.classes_attended || 0}</p>
                        <p className="text-[7px] md:text-[9px] font-bold text-green-600/60 uppercase tracking-widest mt-1">Present</p>
                    </div>
                    <div className="p-3 md:p-5 bg-red-50 rounded-2xl border border-red-100 text-center">
                        <p className="text-xl md:text-3xl font-black text-red-500">{stats?.classes_absent || 0}</p>
                        <p className="text-[7px] md:text-[9px] font-bold text-red-500/60 uppercase tracking-widest mt-1">Absent</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoField = ({ label, value }: { label: string, value: string }) => (
    <div>
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xs md:text-sm font-bold text-slate-800 border-l-2 border-indigo-100 pl-3 break-words">{value}</p>
    </div>
);

// --- 3. MAIN MODAL COMPONENT ---
export const StudentProfileModal = ({ student, onClose }: { student: any, onClose: () => void }) => {
    const [view, setView] = useState<'profile' | 'loading' | 'stats'>('profile');
    const contentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef,
        documentTitle: `${student?.full_name}_Profile`,
        pageStyle: `@page { size: A4 landscape; margin: 10mm; } @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }`
    });

    if (!student) return null;

    const handleViewAttendance = () => {
        setView('loading');
        setTimeout(() => setView('stats'), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 font-poppins">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-5xl h-[95vh] md:h-[85vh] rounded-[24px] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row bg-white"
            >
                <AnimatePresence mode="wait">
                    {view === 'loading' && <StudentInsLoading key="loading" />}
                    {view === 'stats' && <StudentStatsView key="stats" studentId={student.id} onBack={() => setView('profile')} />}
                    {view === 'profile' && (
                        <div key="profile" className="flex flex-col md:flex-row w-full h-full bg-white">
                            
                            {/* --- LEFT PANEL: IDENTITY --- */}
                            <div className="w-full md:w-[320px] lg:w-[350px] relative bg-gradient-to-br from-blue-900 to-indigo-600 p-6 md:p-8 flex flex-col text-white print:w-[300px] shrink-0">
                                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 print:hidden">
                                    <div className="absolute top-[-50px] right-[-50px] w-40 h-40 rounded-full bg-white blur-3xl"></div>
                                </div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-6 md:mb-8">
                                        <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/10 print:border-none">
                                            <Sparkles size={18} className="text-yellow-300" />
                                        </div>
                                        <button onClick={onClose} className="md:hidden p-2 bg-white/10 rounded-lg text-white">
                                            <X size={20} />
                                        </button>
                                        <span className="hidden md:block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-bold tracking-widest border border-white/10">ACTIVE</span>
                                    </div>

                                    {/* Responsive Profile Header */}
                                    <div className="flex flex-row md:flex-col items-center gap-4 md:gap-0">
                                        <div className="w-20 h-20 md:w-40 md:h-40 bg-white/10 backdrop-blur-md rounded-2xl md:rounded-[30px] p-1 border border-white/20 shadow-xl relative shrink-0">
                                            <div className="w-full h-full rounded-[14px] md:rounded-[24px] overflow-hidden bg-white/10">
                                                {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" alt="Student" /> : <div className="w-full h-full flex flex-col items-center justify-center text-white/50"><User size={32} /></div>}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 bg-green-400 text-white p-1 rounded-full border-2 border-indigo-700 print:hidden shrink-0"><ShieldCheck size={12} /></div>
                                        </div>

                                        <div className="text-left md:text-center md:mt-6">
                                            <h2 className="text-lg md:text-2xl font-black tracking-tight leading-tight">{student.full_name}</h2>
                                            <p className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Class {student.current_class} • Section {student.current_section}</p>
                                        </div>
                                    </div>

                                    {/* Mobile hidden stats, shown on Desktop */}
                                    <div className="hidden md:grid grid-cols-2 gap-3 mt-8">
                                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center"><p className="text-[8px] font-bold text-blue-200 uppercase">Roll No</p><p className="text-sm font-black">{student.roll_number || "NA"}</p></div>
                                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center"><p className="text-[8px] font-bold text-blue-200 uppercase">Status</p><p className="text-sm font-black">REG</p></div>
                                    </div>

                                    {/* Mobile hidden contacts, shown on Desktop */}
                                    <div className="space-y-2 mt-6 hidden md:block">
                                        <div className="flex items-center gap-3 text-xs font-medium text-blue-100 truncate"><Phone size={12} /> {student.father_mobile || student.phone || "N/A"}</div>
                                        <div className="flex items-center gap-3 text-xs font-medium text-blue-100 truncate"><Mail size={12} /> {student.email || "N/A"}</div>
                                    </div>
                                </div>
                            </div>

                            {/* --- RIGHT PANEL: DETAILS --- */}
                            <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden print:bg-white print:h-auto">
                                <div className="bg-white px-6 md:px-8 py-4 md:py-5 border-b border-slate-200 flex justify-between items-center shadow-sm z-20 shrink-0">
                                    <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <GraduationCap className="text-indigo-600" size={18} /> Student Details
                                    </h3>
                                    <div className="flex gap-2 no-print">
                                        <button onClick={() => handlePrint()} className="p-2 md:px-4 md:py-2 bg-slate-100 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase text-slate-600"><Printer size={14} /></button>
                                        <button onClick={onClose} className="hidden md:block p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={18} /></button>
                                    </div>
                                </div>

                                <div ref={contentRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
                                    <section>
                                        <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Academic Profile
                                        </h4>
                                        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-y-6 md:gap-x-12">
                                            <InfoField label="Admission Number" value={`ADM-${student.id.substring(0, 6).toUpperCase()}`} />
                                            <InfoField label="Date of Admission" value={student.created_at ? new Date(student.created_at).toLocaleDateString() : "N/A"} />
                                            <InfoField label="Current Class" value={`${student.current_class} - ${student.current_section}`} />
                                            <InfoField label="Academic Year" value="2025-2026" />
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Personal Information
                                        </h4>
                                        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/60 grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-y-6 md:gap-x-8">
                                            <InfoField label="Date of Birth" value={student.dob || "N/A"} />
                                            <InfoField label="Gender" value={student.gender || "N/A"} />
                                            <InfoField label="Blood Group" value={student.blood_group || "N/A"} />
                                            <InfoField label="Father's Name" value={student.father_name || "N/A"} />
                                            <InfoField label="Mother's Name" value={student.mother_name || "N/A"} />
                                            <InfoField label="Email" value={student.email || "N/A"} />
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Residence
                                        </h4>
                                        <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200/60 flex items-start gap-4">
                                            <div className="p-3 bg-green-50 text-green-600 rounded-xl hidden sm:block shrink-0"><MapPin size={20} /></div>
                                            <div>
                                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</p>
                                                <p className="text-xs md:text-sm font-semibold text-slate-700 mt-1 leading-relaxed">{student.address || "No address details available."}</p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Action Buttons: Vertical on small mobile, Horizontal on Tablet+ */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print pb-4">
                                        <button onClick={handleViewAttendance} className="p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold text-[10px] md:text-xs flex flex-col items-center gap-2 hover:bg-blue-100 transition-colors">
                                            <CalendarCheck size={20} /> View Attendance
                                        </button>
                                        <button className="p-4 bg-orange-50 text-orange-700 rounded-2xl font-bold text-[10px] md:text-xs flex flex-col items-center gap-2 hover:bg-orange-100 transition-colors">
                                            <Award size={20} /> Exam Results
                                        </button>
                                        <button className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-[10px] md:text-xs flex flex-col items-center gap-2 hover:bg-emerald-100 transition-colors">
                                            <Activity size={20} /> Health Status
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};