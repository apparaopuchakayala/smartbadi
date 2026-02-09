import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { 
    ShieldCheck, Calendar, BookOpen, CheckCircle2, 
    Clock, AlertCircle, Send, Eye, Loader2, ChevronRight,
    Search, Filter, GraduationCap, BarChart3, X, Globe, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmDialogContext';

export function ResultDeclaration() {
    const { profile } = useAuth();
    const { confirm } = useConfirm();

    const [loading, setLoading] = useState(true);
    const [academicYear, setAcademicYear] = useState('');
    const [academicYears, setAcademicYears] = useState<string[]>([]);
    const [examType, setExamType] = useState('');
    const [exams, setExams] = useState<any[]>([]);
    
    const [allConfigs, setAllConfigs] = useState<any[]>([]); 
    const [declarations, setDeclarations] = useState<Set<string>>(new Set()); 
    const [selectedClass, setSelectedClass] = useState<any>(null); 

    useEffect(() => {
        if (profile?.school_id) {
            fetchExams();
            fetchAcademicYears();
        }
    }, [profile]);

    useEffect(() => {
        if (profile?.school_id && academicYear && examType) fetchAuditData();
    }, [profile, academicYear, examType]);

    const fetchAcademicYears = async () => {
        const { data } = await supabase.from('school_classes').select('academic_year').eq('school_id', profile?.school_id);
        if (data) {
            const uniqueYears = Array.from(new Set(data.map(item => item.academic_year))).filter(Boolean).sort().reverse();
            setAcademicYears(uniqueYears as string[]);
            if (uniqueYears.length > 0) setAcademicYear(uniqueYears[0] as string);
        }
    };

    const fetchExams = async () => {
        const { data } = await supabase.from('exams').select('id, exam_name').eq('school_id', profile?.school_id);
        if (data) {
            setExams(data);
            if (data.length > 0) setExamType(data[0].exam_name);
        }
    };

    const fetchAuditData = async () => {
        setLoading(true);
        try {
            const { data: configs } = await supabase
                .from('exam_configurations')
                .select(`id, current_class, current_section, max_marks, class_subjects(id, subject_name), exams!inner(exam_name)`)
                .eq('school_id', profile?.school_id)
                .eq('exams.exam_name', examType);

            const { data: marks } = await supabase
                .from('student_marks')
                .select('exam_config_id, is_uploaded')
                .eq('school_id', profile?.school_id);

            const { data: declaredData } = await supabase
                .from('result_declarations')
                .select('class_name, section')
                .eq('school_id', profile?.school_id)
                .eq('academic_year', academicYear)
                .eq('exam_name', examType)
                .eq('is_published', true);

            const declaredSet = new Set(declaredData?.map(d => `${d.class_name}-${d.section}`));
            setDeclarations(declaredSet);

            const auditResults = configs?.map(config => {
                const marksForThis = marks?.filter(m => m.exam_config_id === config.id) || [];
                const isDone = marksForThis.length > 0 && marksForThis.every(m => m.is_uploaded);
                return { ...config, status: isDone ? 'COMPLETED' : 'PENDING' };
            }) || [];

            setAllConfigs(auditResults);
        } finally {
            setLoading(false);
        }
    };

    const handlePublishResult = async () => {
        if (!selectedClass) return;

        const isConfirmed = await confirm({
            title: 'Declare Results?',
            message: `Are you sure you want to declare results for Class ${selectedClass.class_name} (${selectedClass.section})? This will make marks immediately visible to all students.`,
            confirmText: 'Yes, Declare Now',
            cancelText: 'Cancel',
            variant: 'primary' 
        });

        if (!isConfirmed) return;

        const toastId = toast.loading("Publishing to Student Portal...");
        try {
            const { error } = await supabase.from('result_declarations').upsert({
                school_id: profile?.school_id,
                academic_year: academicYear,
                exam_name: examType,
                class_name: selectedClass.class_name,
                section: selectedClass.section,
                is_published: true,
                published_at: new Date().toISOString()
            }, { onConflict: 'school_id, academic_year, exam_name, class_name, section' });

            if (error) throw error;

            toast.success("Results Declared Successfully!", { id: toastId });
            setDeclarations(prev => new Set(prev).add(`${selectedClass.class_name}-${selectedClass.section}`));
            setSelectedClass(null); 
        } catch (err: any) {
            toast.error("Failed to declare: " + err.message, { id: toastId });
        }
    };

    const groupedByClass = allConfigs.reduce((acc: any, curr) => {
        const key = `${curr.current_class}-${curr.current_section}`;
        if (!acc[key]) acc[key] = { 
            class_name: curr.current_class, section: curr.current_section, 
            subjects: [], total: 0, done: 0 
        };
        acc[key].subjects.push(curr);
        acc[key].total += 1;
        if (curr.status === 'COMPLETED') acc[key].done += 1;
        return acc;
    }, {});

    const classCards = Object.values(groupedByClass);

    // --- ANIMATION VARIANTS ---
    const containerVars = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen w-full p-4 md:p-8 pb-32 relative overflow-hidden text-slate-900">
            <div className="max-w-[1600px] mx-auto space-y-8">
                
                {/* --- PREMIUM HEADER CARD --- */}
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="relative bg-slate-900 rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-900/20 overflow-hidden"
                >
                    {/* Atmospheric Glow */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 border border-white/10 shrink-0">
                                <ShieldCheck size={36} strokeWidth={1.5} />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-tight">
                                    Result Declaration
                                </h1>
                                <p className="text-indigo-200/80 font-medium text-sm md:text-base mt-2 flex items-center gap-2">
                                    <Sparkles size={14} /> Academic Audit & Launch Center
                                </p>
                            </div>
                        </div>

                        {/* Glassmorphic Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                            <div className="relative group min-w-[200px]">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-indigo-300 group-hover:text-white transition-colors">
                                    <Calendar size={18} />
                                </div>
                                <select 
                                    value={academicYear} 
                                    onChange={(e) => setAcademicYear(e.target.value)} 
                                    className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm focus:outline-none focus:bg-white/10 focus:border-indigo-400 transition-all cursor-pointer appearance-none"
                                >
                                    {academicYears.map(y => <option key={y} value={y} className="text-slate-900 bg-white">{y}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/50">
                                    <ChevronRight size={14} className="rotate-90" />
                                </div>
                            </div>

                            <div className="relative group min-w-[240px]">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-indigo-300 group-hover:text-white transition-colors">
                                    <BookOpen size={18} />
                                </div>
                                <select 
                                    value={examType} 
                                    onChange={(e) => setExamType(e.target.value)} 
                                    className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm focus:outline-none focus:bg-white/10 focus:border-indigo-400 transition-all cursor-pointer appearance-none"
                                >
                                    {exams.map(ex => <option key={ex.id} value={ex.exam_name} className="text-slate-900 bg-white">{ex.exam_name}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/50">
                                    <ChevronRight size={14} className="rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* --- CONTENT GRID --- */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 size={24} className="text-indigo-600 animate-pulse" />
                            </div>
                        </div>
                        <p className="mt-6 text-xs font-black uppercase tracking-[3px] text-indigo-900/40">Auditing Registry...</p>
                    </div>
                ) : classCards.length > 0 ? (
                    <motion.div 
                        variants={containerVars}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {classCards.map((cls: any) => {
                            const isPublished = declarations.has(`${cls.class_name}-${cls.section}`);
                            const isAuditComplete = cls.done === cls.total;
                            const progress = (cls.done / cls.total) * 100;

                            return (
                                <motion.div 
                                    layout 
                                    variants={itemVars}
                                    key={`${cls.class_name}-${cls.section}`}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`group relative p-8 rounded-[2.5rem] border transition-all duration-300 cursor-pointer overflow-hidden
                                        ${isPublished 
                                            ? 'bg-white border-emerald-200 shadow-xl shadow-emerald-100/50' 
                                            : 'bg-white border-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.15)] hover:border-blue-100 hover:-translate-y-1'
                                        }`}
                                >
                                    {/* Status Badge */}
                                    {isPublished && (
                                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase px-4 py-2 rounded-bl-[20px]">
                                            Live
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{cls.class_name}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Section {cls.section}</p>
                                        </div>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                                            ${isAuditComplete ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-500'}`}>
                                            {isAuditComplete ? <CheckCircle2 size={22} /> : <Clock size={22} />}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Readiness</span>
                                            <span className={`text-lg font-black ${isAuditComplete ? 'text-indigo-600' : 'text-slate-800'}`}>
                                                {cls.done}<span className="text-slate-300 text-sm">/{cls.total}</span>
                                            </span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={`h-full rounded-full ${isAuditComplete ? 'bg-gradient-to-r from-indigo-500 to-blue-500' : 'bg-orange-400'}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between group-hover:border-slate-100 transition-colors">
                                        <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider
                                            ${isAuditComplete ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                            {isAuditComplete ? 'Ready to Launch' : 'Verification Pending'}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <div className="col-span-full bg-white rounded-[3rem] py-24 border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                         <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                            <GraduationCap size={48} />
                         </div>
                         <h3 className="text-xl font-black text-slate-800 tracking-tight">No Exams Found</h3>
                         <p className="text-slate-400 text-sm font-medium mt-2 max-w-md">There are no exam configurations found for the selected academic year and exam type.</p>
                    </div>
                )}
            </div>

            {/* --- SLIDE-OVER SIDEBAR (AUDIT DETAIL) --- */}
            <AnimatePresence>
                {selectedClass && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            onClick={() => setSelectedClass(null)} 
                            className="fixed inset-0 bg-slate-100/10  backdrop-blur-sm z-[9998]" 
                        />
                        
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} 
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-[700px] w-full md:w-[500px] rounded-[30px] bg-white shadow-2xl z-[9999] flex flex-col overflow-hidden"
                        >
                            {/* Sidebar Header */}
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 ">
                                <div className="flex justify-between items-start mb-6 ">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{selectedClass.class_name}</h2>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Section {selectedClass.section}</p>
                                    </div>
                                    <button onClick={() => setSelectedClass(null)} className="p-3 bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 hover:rotate-90 transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Subjects</p>
                                        <p className="text-2xl font-black text-slate-800">{selectedClass.total}</p>
                                    </div>
                                    <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Uploaded</p>
                                        <p className={`text-2xl font-black ${selectedClass.done === selectedClass.total ? 'text-emerald-600' : 'text-orange-500'}`}>
                                            {selectedClass.done}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Subject List */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-white">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-4">Subject Audit Log</p>
                                {selectedClass.subjects.map((sub: any) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        key={sub.id} 
                                        className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center 
                                                ${sub.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                                <BookOpen size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm uppercase">{sub.class_subjects.subject_name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{sub.status}</p>
                                            </div>
                                        </div>
                                        {sub.status === 'COMPLETED' ? (
                                            <div className="text-emerald-500 bg-emerald-50 p-2 rounded-full">
                                                <CheckCircle2 size={18} />
                                            </div>
                                        ) : (
                                            <button onClick={() => toast.success("Reminder Sent")} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Remind Teacher">
                                                <Send size={18} />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>

                            {/* Footer Action */}
                            <div className="p-8 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md">
                                {declarations.has(`${selectedClass.class_name}-${selectedClass.section}`) ? (
                                    <div className="w-full py-4 rounded-2xl bg-emerald-100/50 border-2 border-emerald-100 text-emerald-700 font-bold flex flex-col items-center justify-center gap-1">
                                        <div className="flex items-center gap-2">
                                            <Globe size={18} />
                                            <span className="uppercase tracking-widest text-xs">Result Published</span>
                                        </div>
                                        <span className="text-[9px] font-medium opacity-80">Visible on Student Portal</span>
                                    </div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={handlePublishResult}
                                            disabled={selectedClass.done !== selectedClass.total}
                                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[2px] text-xs transition-all flex items-center justify-center gap-3 shadow-xl
                                                ${selectedClass.done === selectedClass.total 
                                                    ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95' 
                                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                        >
                                            <Send size={18} /> Declare Result
                                        </button>
                                        {selectedClass.done !== selectedClass.total && (
                                            <p className="text-center text-[10px] font-bold text-red-400 mt-4 flex items-center justify-center gap-2">
                                                <AlertCircle size={12} /> Audit Incomplete: Upload all marks to proceed
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}