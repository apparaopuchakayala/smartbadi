import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { 
    ShieldCheck, Calendar, BookOpen, CheckCircle2, 
    Clock, AlertCircle, Send, Eye, Loader2, ChevronRight,
    Search, Filter, GraduationCap, BarChart3, X, Globe
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
            // 1. Fetch Configs
            const { data: configs } = await supabase
                .from('exam_configurations')
                .select(`
                    id, current_class, current_section, max_marks,
                    class_subjects(id, subject_name),
                    exams!inner(exam_name)
                `)
                .eq('school_id', profile?.school_id)
                .eq('exams.exam_name', examType);

            // 2. Fetch Mark Upload Status
            const { data: marks } = await supabase
                .from('student_marks')
                .select('exam_config_id, is_uploaded')
                .eq('school_id', profile?.school_id);

            // 3. Fetch Existing Declarations
            const { data: declaredData } = await supabase
                .from('result_declarations')
                .select('class_name, section')
                .eq('school_id', profile?.school_id)
                .eq('academic_year', academicYear)
                .eq('exam_name', examType)
                .eq('is_published', true);

            const declaredSet = new Set(declaredData?.map(d => `${d.class_name}-${d.section}`));
            setDeclarations(declaredSet);

            // 4. Map Status
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
            message: `Are you sure you want to declare results for Class ${selectedClass.class_name} (${selectedClass.section})? This will make marks immediately visible to all students and parents in the Student Portal.`,
            confirmText: 'Yes, Declare Now',
            cancelText: 'Cancel',
            variant: 'primary' 
        });

        if (!isConfirmed) return;
        // --------------------------------------------

        const toastId = toast.loading("Publishing to Student Portal...");
        try {
            const { error } = await supabase
                .from('result_declarations')
                .upsert({
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
            class_name: curr.current_class, 
            section: curr.current_section, 
            subjects: [],
            total: 0,
            done: 0 
        };
        acc[key].subjects.push(curr);
        acc[key].total += 1;
        if (curr.status === 'COMPLETED') acc[key].done += 1;
        return acc;
    }, {});

    const classCards = Object.values(groupedByClass);

    return (
        <div className="space-y-6 md:space-y-8 p-3 md:p-8 max-w-7xl mx-auto text-left relative">
            
            {/* AUDIT HEADER */}
            <div className="flex flex-col gap-6 bg-slate-900 p-6 md:p-10 rounded-[30px] md:rounded-[45px] shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-10 text-white pointer-events-none">
                    <BarChart3 size={120} />
                </div>
                
                <div className="flex items-center gap-4 relative">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><ShieldCheck size={28} /></div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">Result Declaration</h1>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[3px]">Academic Audit & Launch Center</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 relative">
                    <div className="relative">
                        <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="pl-10 pr-8 py-3 bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer">
                            {academicYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                        </select>
                    </div>

                    <div className="relative">
                        <BookOpen size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select value={examType} onChange={(e) => setExamType(e.target.value)} className="pl-10 pr-8 py-3 bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer">
                            {exams.map(ex => <option key={ex.id} value={ex.exam_name} className="text-slate-900">{ex.exam_name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* CLASS AUDIT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300">
                        <Loader2 size={48} className="animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[4px]">Verifying Subject Registry...</p>
                    </div>
                ) : classCards.length > 0 ? (
                    classCards.map((cls: any) => {
                        const isPublished = declarations.has(`${cls.class_name}-${cls.section}`);
                        const isAuditComplete = cls.done === cls.total;

                        return (
                            <motion.div 
                                layout key={`${cls.class_name}-${cls.section}`}
                                onClick={() => setSelectedClass(cls)}
                                className={`p-6 rounded-[35px] border-2 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden ${isPublished ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-50'}`}
                            >
                                {isPublished && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black uppercase px-3 py-1 rounded-bl-2xl">
                                        Published
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-6">
                                    <div className="text-left">
                                        <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">{cls.class_name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section {cls.section}</p>
                                    </div>
                                    <div className={`p-3 rounded-2xl ${isAuditComplete ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {isAuditComplete ? <CheckCircle2 size={20} /> : <Clock size={20} className="animate-pulse" />}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Registry Status</p>
                                        <p className="text-[11px] font-black text-slate-700">{cls.done}/{cls.total} Subjects</p>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(cls.done / cls.total) * 100}%` }}
                                            className={`h-full ${isAuditComplete ? 'bg-blue-500' : 'bg-orange-500'}`}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-between items-center">
                                    <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-tighter 
                                        ${isAuditComplete ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {isAuditComplete ? 'Ready to Declare' : 'Data Pending'}
                                    </span>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="col-span-full bg-slate-50 rounded-[40px] py-20 border-4 border-dashed border-slate-200 flex flex-col items-center">
                         <GraduationCap size={64} className="text-slate-200 mb-4" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-[3px]">No Configurations for this Exam/Year</p>
                    </div>
                )}
            </div>

            {/* SIDEBAR DRILL-DOWN (Subject Breakdown) */}
            <AnimatePresence>
                {selectedClass && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedClass(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9998]" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-[9999] flex flex-col p-6 md:p-10 border-l border-slate-100 font-poppins">
                            <div className="flex justify-between items-center mb-8">
                                <div className="text-left">
                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{selectedClass.class_name} - {selectedClass.section}</h2>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[2px] mt-2">Audit & Declaration</p>
                                </div>
                                <button onClick={() => setSelectedClass(null)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-red-500 transition-all hover:rotate-90">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                {selectedClass.subjects.map((sub: any) => (
                                    <div key={sub.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-lg transition-all">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className={`p-3 rounded-xl ${sub.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                                <BookOpen size={18} />
                                            </div>
                                            <div>
                                                <span className="text-sm font-black text-slate-700 uppercase block leading-none mb-1">{sub.class_subjects.subject_name}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sub.status}</span>
                                            </div>
                                        </div>
                                        {sub.status === 'COMPLETED' ? (
                                            <CheckCircle2 size={20} className="text-emerald-500" />
                                        ) : (
                                            <button onClick={() => toast.success("Reminder Sent to Teacher")} className="p-2.5 bg-white text-slate-400 rounded-xl border border-slate-200 hover:bg-slate-900 hover:text-white transition-all" title="Remind Teacher">
                                                <Send size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 space-y-3">
                                {declarations.has(`${selectedClass.class_name}-${selectedClass.section}`) ? (
                                    <div className="w-full py-5 rounded-[25px] bg-emerald-50 border-2 border-emerald-100 text-emerald-700 font-black uppercase tracking-[3px] text-xs flex flex-col items-center justify-center gap-1">
                                        <Globe size={20} />
                                        <span>Result Published</span>
                                        <span className="text-[8px] opacity-70">Visible to Students</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handlePublishResult}
                                        disabled={selectedClass.done !== selectedClass.total}
                                        className={`w-full py-5 rounded-[25px] font-black uppercase tracking-[4px] text-xs transition-all flex items-center justify-center gap-3
                                            ${selectedClass.done === selectedClass.total 
                                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02]' 
                                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                                    >
                                        <Send size={16} /> Declare Result
                                    </button>
                                )}
                                
                                {selectedClass.done !== selectedClass.total && (
                                    <p className="text-[9px] text-center text-red-400 font-bold uppercase tracking-wide">
                                        * Cannot declare until all subjects are uploaded
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}