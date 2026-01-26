import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Plus, Loader2, Calendar, BookOpen,
    Save, FileSignature, Hash, Trash2, UserCog, Target, ListChecks, Filter, Edit3, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
// Import skeletons
import { TableSkeleton, ControlSkeleton } from '../../components/common/skeletoncomp';

export function ExamManagement() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('exams');
    const [loading, setLoading] = useState(true);

    // Data Lists
    const [classList, setClassList] = useState<any[]>([]);
    const [sectionList, setSectionList] = useState<any[]>([]);
    const [examTypes, setExamTypes] = useState<any[]>([]);
    const [availableClassSubjects, setAvailableClassSubjects] = useState<any[]>([]);
    const [scheduledExams, setScheduledExams] = useState<any[]>([]);
    
    // Filter & Edit States
    const [selectedClassFilter, setSelectedClassFilter] = useState('');
    const [editingExam, setEditingExam] = useState<any>(null);

    // Form States for Scheduling
    const [newExamName, setNewExamName] = useState('');
    const [schedule, setSchedule] = useState({
        class_id: '',
        current_section: '',
        subject_id: '',
        subject_code: '',
        teacher_name: '',
        exam_id: '',
        max_marks: 100,
        pass_marks: 35,
        exam_date: ''
    });

    useEffect(() => {
        if (profile?.school_id) {
            fetchInitialData();
            fetchScheduledExams();
        }
    }, [profile]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [cls, exms] = await Promise.all([
                supabase.from('school_classes').select('id, class_name, section').eq('school_id', profile?.school_id).order('class_name'),
                supabase.from('exams').select('*').eq('school_id', profile?.school_id).order('created_at')
            ]);

            const uniqueClasses = cls.data?.reduce((acc: any[], current) => {
                if (!acc.find(item => item.class_name === current.class_name)) return acc.concat([current]);
                return acc;
            }, []);

            setClassList(uniqueClasses || []);
            setExamTypes(exms.data || []);
        } catch (error) { toast.error("Data load failed"); } 
        finally { setLoading(false); }
    };

    const fetchScheduledExams = async () => {
        const { data, error } = await supabase
            .from('exam_configurations')
            .select(`
                id, current_class, current_section, max_marks, pass_marks, exam_date,
                exams ( exam_name ),
                class_subjects ( subject_name )
            `)
            .eq('school_id', profile?.school_id)
            .order('exam_date', { ascending: false });

        if (!error) setScheduledExams(data || []);
    };

    const handleAddExamType = async () => {
        if (!newExamName.trim()) return toast.error("Enter Exam Name");
        const loadingToast = toast.loading("Creating master name...");
        try {
            const { error } = await supabase.from('exams').insert([{
                school_id: profile?.school_id,
                exam_name: newExamName.toUpperCase().trim()
            }]);
            if (error) throw error;
            toast.success("Exam Name Created", { id: loadingToast });
            setNewExamName('');
            fetchInitialData();
        } catch (error: any) { toast.error(error.message, { id: loadingToast }); } 
    };

    const handleClassChange = async (classId: string) => {
        const selectedCls = classList.find(c => c.id === classId);
        setSchedule({ ...schedule, class_id: classId, current_section: '', subject_id: '', subject_code: '', teacher_name: '' });
        if (!selectedCls) return;

        const { data: sections } = await supabase.from('school_classes').select('section').eq('class_name', selectedCls.class_name).eq('school_id', profile?.school_id);
        setSectionList(sections || []);

        const { data: subjects } = await supabase.from('class_subjects').select('id, subject_name, subject_code').eq('class_id', classId).eq('school_id', profile?.school_id);
        setAvailableClassSubjects(subjects || []);
    };

    const handleSubjectSelection = async (subjectId: string) => {
        const fetchLoading = toast.loading("Checking faculty assignment...");
        try {
            const selectedSub = availableClassSubjects.find(s => s.id === subjectId);
            const selectedClass = classList.find(c => c.id === schedule.class_id);
            if (!selectedSub || !selectedClass || !schedule.current_section) return;

            const { data: assignment } = await supabase
                .from('teacher_assignments')
                .select(`profiles ( full_name )`)
                .ilike('class_name', selectedClass.class_name.trim())
                .ilike('section', schedule.current_section.trim())
                .ilike('subject_name', selectedSub.subject_name.trim())
                .eq('school_id', profile?.school_id)
                .maybeSingle();

            const teacherData = Array.isArray(assignment?.profiles) ? assignment.profiles[0] : assignment?.profiles;
            setSchedule(prev => ({
                ...prev,
                subject_id: subjectId,
                subject_code: selectedSub.subject_code || 'N/A',
                teacher_name: teacherData?.full_name || 'NOT ASSIGNED'
            }));
            toast.dismiss(fetchLoading);
        } catch (err) { toast.error("Faculty check failed", { id: fetchLoading }); }
    };

    const handleMaxMarksChange = (val: string, target: 'new' | 'edit') => {
        const max = parseInt(val) || 0;
        const pass = Math.ceil(max * 0.35);
        if (target === 'new') {
            setSchedule(prev => ({ ...prev, max_marks: max, pass_marks: pass }));
        } else {
            setEditingExam((prev: any) => ({ ...prev, max_marks: max, pass_marks: pass }));
        }
    };

    const handleSaveSchedule = async () => {
        if (!schedule.class_id || !schedule.current_section || !schedule.subject_id || !schedule.exam_id || !schedule.exam_date) {
            return toast.error("Please fill all mandatory fields");
        }
        const saveLoading = toast.loading("Committing to registry...");
        try {
            const selectedClassName = classList.find(c => c.id === schedule.class_id)?.class_name;
            const { error } = await supabase.from('exam_configurations').insert([{
                school_id: profile?.school_id,
                exam_id: schedule.exam_id,
                subject_id: schedule.subject_id,
                current_class: selectedClassName,
                current_section: schedule.current_section,
                max_marks: schedule.max_marks,
                pass_marks: schedule.pass_marks,
                exam_date: schedule.exam_date
            }]);
            if (error) throw error;
            toast.success("Exam Scheduled!", { id: saveLoading });
            setSchedule({ class_id: '', current_section: '', subject_id: '', subject_code: '', teacher_name: '', exam_id: '', max_marks: 100, pass_marks: 35, exam_date: '' });
            fetchScheduledExams();
            setActiveTab('list');
        } catch (err: any) { toast.error(err.message, { id: saveLoading }); } 
    };

    const handleUpdateExam = async () => {
        const updateToast = toast.loading("Updating records...");
        try {
            const { error } = await supabase
                .from('exam_configurations')
                .update({
                    max_marks: editingExam.max_marks,
                    pass_marks: editingExam.pass_marks,
                    exam_date: editingExam.exam_date
                })
                .eq('id', editingExam.id);

            if (error) throw error;
            toast.success("Schedule Updated Successfully", { id: updateToast });
            setEditingExam(null);
            fetchScheduledExams();
        } catch (err: any) { toast.error(err.message, { id: updateToast }); }
    };

    const deleteScheduledExam = async (id: string) => {
        if (!window.confirm("Delete this configuration?")) return;
        const { error } = await supabase.from('exam_configurations').delete().eq('id', id);
        if (!error) { toast.success("Deleted"); fetchScheduledExams(); }
    };

    const filteredScheduledExams = scheduledExams.filter(exam => 
        selectedClassFilter === '' || exam.current_class === selectedClassFilter
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 text-left py-6 md:py-10 font-poppins relative px-4">
            {/* Header: Responsive Stacking */}
            <div className="flex flex-col gap-2 border-b-4 border-blue-600/10 pb-6">
                <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">
                    Academic <span className="text-blue-700">Exams</span>
                </h1>
                <p className="text-slate-400 font-black text-[9px] md:text-[10px] tracking-[3px] uppercase ml-1">Setup Master Names & Academic Schedules</p>
            </div>

            {/* Tabs: Responsive Scroll */}
            <div className="flex overflow-x-auto no-scrollbar gap-3 md:gap-4 p-1.5 bg-slate-200/50 rounded-2xl md:rounded-[24px] w-full lg:w-fit">
                <TabBtn id="exams" label="1. Create Test" icon={FileSignature} active={activeTab} setActive={setActiveTab} />
                <TabBtn id="scheduler" label="2. Schedule a Exam" icon={Calendar} active={activeTab} setActive={setActiveTab} />
                <TabBtn id="list" label="3. Scheduled Exams" icon={ListChecks} active={activeTab} setActive={setActiveTab} />
            </div>

            <div className="bg-white rounded-[30px] md:rounded-[40px] shadow-2xl border-2 border-slate-100 p-5 md:p-10 min-h-[500px]">
                <AnimatePresence mode="wait">
                    {loading ? (
                        /* Master Skeleton View */
                        <div className="space-y-8 animate-pulse">
                            <div className="h-20 bg-slate-100 rounded-3xl w-full" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-50 rounded-[25px]" />)}
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'exams' && (
                                <motion.div key="exams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                                    <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-6 rounded-[30px] border-2 border-slate-100">
                                        <input value={newExamName} onChange={e => setNewExamName(e.target.value)} placeholder="ENTER MASTER EXAM NAME" className="flex-1 p-5 rounded-2xl border-2 border-transparent focus:border-blue-600 font-black outline-none uppercase shadow-inner text-sm transition-all" />
                                        <button onClick={handleAddExamType} className="px-10 py-5 sm:py-0 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl">Create Name</button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                                        {examTypes.map(e => (
                                            <div key={e.id} className="p-6 bg-white border-2 border-slate-100 rounded-[25px] shadow-sm flex justify-between items-center group hover:border-blue-600 transition-all">
                                                <span className="font-black text-slate-800 uppercase text-xs tracking-tight">{e.exam_name}</span>
                                                <Trash2 size={16} className="text-slate-300 cursor-pointer hover:text-red-500 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'scheduler' && (
                                <motion.div key="scheduler" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 text-left">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                        <FormSelect label="1. Academic Grade" value={schedule.class_id} onChange={handleClassChange} options={classList} displayKey="class_name" />
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">2. Target Section</label>
                                            <select disabled={!schedule.class_id} value={schedule.current_section} onChange={e => setSchedule({...schedule, current_section: e.target.value})} className="w-full p-5 bg-slate-100 border-2 border-transparent rounded-2xl font-black outline-none focus:bg-white focus:border-blue-600 transition-all text-sm disabled:opacity-30 shadow-inner appearance-none">
                                                <option value="">Select Section</option>
                                                {sectionList.map((s, i) => <option key={i} value={s.section}>Section {s.section}</option>)}
                                            </select>
                                        </div>
                                        <FormSelect label="3. Subject Module" value={schedule.subject_id} onChange={handleSubjectSelection} options={availableClassSubjects} displayKey="subject_name" disabled={!schedule.current_section} />
                                        <ReadOnlyInput label="Assigned Faculty" value={schedule.teacher_name} icon={UserCog} color="green" />
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">4. Exam Category</label>
                                            <select value={schedule.exam_id} onChange={e => setSchedule({ ...schedule, exam_id: e.target.value })} className="w-full p-5 bg-slate-100 border-2 border-transparent rounded-2xl font-black outline-none text-sm focus:border-blue-600 focus:bg-white transition-all shadow-inner appearance-none">
                                                <option value="">Select Type</option>
                                                {examTypes.map(e => <option key={e.id} value={e.id}>{e.exam_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3"><label className="text-[10px] font-black text-slate-900 uppercase ml-1">5. Max Marks</label><input type="number" value={schedule.max_marks} onChange={e => handleMaxMarksChange(e.target.value, 'new')} className="w-full p-5 bg-slate-100 border-2 border-transparent rounded-2xl font-black outline-none text-sm focus:border-blue-600 focus:bg-white transition-all shadow-inner" /></div>
                                            <div className="space-y-3"><label className="text-[10px] font-black text-slate-900 uppercase ml-1">6. Pass Marks</label><div className="relative"><input type="number" value={schedule.pass_marks} onChange={e => setSchedule({ ...schedule, pass_marks: parseInt(e.target.value) || 0 })} className="w-full p-5 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black text-blue-700 outline-none shadow-sm" /><Target size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" /></div></div>
                                        </div>
                                        <div className="md:col-span-2 space-y-3"><label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">7. Official Date</label><input type="date" value={schedule.exam_date} onChange={e => setSchedule({ ...schedule, exam_date: e.target.value })} className="w-full p-5 bg-slate-100 border-2 border-transparent rounded-2xl font-black outline-none text-sm focus:border-blue-600 focus:bg-white transition-all shadow-inner" /></div>
                                    </div>
                                    <button onClick={handleSaveSchedule} className="w-full py-6 bg-blue-700 text-white rounded-[30px] font-black uppercase tracking-[4px] text-[12px] hover:bg-slate-900 shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95"><Save size={20} /> Create Exam</button>
                                </motion.div>
                            )}

                            {activeTab === 'list' && (
                                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-100 p-4 md:p-6 rounded-[25px] md:rounded-[30px] border-2 border-white shadow-sm text-left">
                                        <Filter size={18} className="text-blue-700 ml-2 shrink-0" /><span className="text-[11px] font-black uppercase text-slate-900 tracking-widest shrink-0">Class Filter:</span>
                                        <select value={selectedClassFilter} onChange={(e) => setSelectedClassFilter(e.target.value)} className="w-full sm:w-auto bg-white p-4 rounded-xl text-[12px] font-black uppercase outline-none shadow-sm min-w-[220px] border-2 border-transparent focus:border-blue-600 transition-all appearance-none">
                                            <option value="">All Academic Grades</option>
                                            {classList.map((cls, i) => <option key={i} value={cls.class_name}>{cls.class_name}</option>)}
                                        </select>
                                    </div>

                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full min-w-[800px] border-collapse">
                                            <thead>
                                                <tr className="text-[10px] font-black uppercase text-slate-900 border-b-4 border-slate-50 bg-slate-50">
                                                    <th className="px-6 py-6 text-center">Category</th>
                                                    <th className="px-6 py-6 text-center">Grade</th>
                                                    <th className="px-6 py-6 text-center">Section</th>
                                                    <th className="px-6 py-6 text-center">Subject</th>
                                                    <th className="px-6 py-6 text-center">Policy</th>
                                                    <th className="px-6 py-6 text-center">Date</th>
                                                    <th className="px-6 py-6 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y-2 divide-slate-50">
                                                {filteredScheduledExams.map((exam) => (
                                                    <tr key={exam.id} className="hover:bg-blue-50/50 transition-all group">
                                                        <td className="px-6 py-6 text-center font-black text-slate-800 text-[11px] uppercase tracking-tighter">{(exam.exams as any)?.exam_name}</td>
                                                        <td className="px-6 py-6 text-center"><span className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase">{exam.current_class}</span></td>
                                                        <td className="px-6 py-6 text-center"><span className="w-9 h-9 flex items-center justify-center bg-white text-orange-600 rounded-full font-black text-xs border-2 border-orange-100 mx-auto shadow-sm">{exam.current_section}</span></td>
                                                        <td className="px-6 py-6 text-center"><span className="px-4 py-2 bg-blue-700 text-white rounded-full font-black text-[9px] uppercase border-2 border-white mx-auto shadow-md">{(exam.class_subjects as any)?.subject_name}</span></td>
                                                        <td className="px-6 py-6 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[11px] font-black text-slate-800">{exam.max_marks} <span className="text-[8px] opacity-40">MAX</span></span>
                                                                <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 rounded-full border border-emerald-100">PASS: {exam.pass_marks}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 text-center">
                                                            <div className="flex items-center justify-center gap-2 text-slate-800 font-black text-[11px] bg-slate-100 px-4 py-2 rounded-xl shadow-inner w-fit mx-auto border border-white">
                                                                <Calendar size={14} className="text-blue-700" />
                                                                {new Date(exam.exam_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 text-center">
                                                            <div className="flex justify-center gap-2">
                                                                <button onClick={() => setEditingExam(exam)} className="p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-700 hover:text-white transition-all shadow-sm"><Edit3 size={16} /></button>
                                                                <button onClick={() => deleteScheduledExam(exam.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingExam && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingExam(null)} className="absolute inset-0 bg-slate-900/70" />
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }} className="relative bg-white w-full max-w-lg rounded-[40px] p-8 md:p-12 shadow-2xl border-4 border-white text-left">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Modify <span className="text-blue-700">Schedule</span></h2>
                                <button onClick={() => setEditingExam(null)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button>
                            </div>
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 flex items-center gap-5 shadow-inner">
                                    <div className="p-4 bg-white rounded-2xl text-blue-700 shadow-md"><BookOpen size={24}/></div>
                                    <div><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Subject</p><p className="text-lg font-black text-slate-800 uppercase tracking-tight">{(editingExam.class_subjects as any)?.subject_name}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-900 ml-1">Max Score</label><input type="number" value={editingExam.max_marks} onChange={e => handleMaxMarksChange(e.target.value, 'edit')} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-blue-600 transition-all shadow-inner" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-900 ml-1">Min Pass</label><input type="number" value={editingExam.pass_marks} onChange={e => setEditingExam({...editingExam, pass_marks: parseInt(e.target.value)})} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-blue-600 transition-all shadow-inner" /></div>
                                </div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-900 ml-1">Scheduled Date</label><input type="date" value={editingExam.exam_date} onChange={e => setEditingExam({...editingExam, exam_date: e.target.value})} className="w-full p-5 bg-slate-100 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-blue-600 transition-all shadow-inner" /></div>
                                <button onClick={handleUpdateExam} className="w-full py-6 bg-slate-900 text-white rounded-[25px] font-black uppercase text-[12px] tracking-[5px] hover:bg-blue-700 transition-all shadow-2xl flex items-center justify-center gap-3">Save Changes</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Reusable Sub-Components
function TabBtn({ id, label, icon: Icon, active, setActive }: any) {
    const isActive = active === id;
    return (
        <button onClick={() => setActive(id)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-4 rounded-xl md:rounded-[20px] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isActive ? 'bg-white text-blue-700 shadow-xl border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
            <Icon size={16} className="shrink-0" /> {label}
        </button>
    );
}

function ReadOnlyInput({ label, value, icon: Icon, color }: any) {
    const colorClass = color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">{label}</label>
            <div className={`relative flex items-center p-5 border-2 rounded-2xl font-black text-sm shadow-sm ${colorClass}`}>
                <Icon size={18} className="mr-3 opacity-60" />
                {value || 'WAITING FOR DATA...'}
            </div>
        </div>
    );
}

function FormSelect({ label, value, onChange, options, displayKey, disabled }: any) {
    return (
        <div className="space-y-3 text-left">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative">
                <select disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="w-full p-5 bg-slate-100 border-2 border-transparent rounded-2xl font-black outline-none focus:bg-white focus:border-blue-600 transition-all text-sm disabled:opacity-30 shadow-inner appearance-none">
                    <option value="">Choose Option</option>
                    {options.map((o: any) => <option key={o.id} value={o.id}>{o[displayKey]}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
            </div>
        </div>
    );
}