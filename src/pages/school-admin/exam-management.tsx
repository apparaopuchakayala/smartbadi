import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Plus, Loader2, Calendar, BookOpen,
    Save, FileSignature, Hash, Trash2, UserCog, Target, ListChecks, Filter, Edit3, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function ExamManagement() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('exams');
    const [loading, setLoading] = useState(false);

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
        setLoading(true);
        try {
            const { error } = await supabase.from('exams').insert([{
                school_id: profile?.school_id,
                exam_name: newExamName.toUpperCase().trim()
            }]);
            if (error) throw error;
            toast.success("Exam Name Created");
            setNewExamName('');
            fetchInitialData();
        } catch (error: any) { toast.error(error.message); } 
        finally { setLoading(false); }
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
        setLoading(true);
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
        } finally { setLoading(false); }
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
        setLoading(true);
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
            toast.success("Exam Scheduled!");
            setSchedule({ class_id: '', current_section: '', subject_id: '', subject_code: '', teacher_name: '', exam_id: '', max_marks: 100, pass_marks: 35, exam_date: '' });
            fetchScheduledExams();
            setActiveTab('list');
        } catch (err: any) { toast.error(err.message); } 
        finally { setLoading(false); }
    };

    const handleUpdateExam = async () => {
        setLoading(true);
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
            toast.success("Schedule Updated Successfully");
            setEditingExam(null);
            fetchScheduledExams();
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
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
        <div className="max-w-6xl mx-auto space-y-8 text-left py-10 font-poppins relative">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-6">
                <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Academic <span className="text-blue-600">Exams</span></h1>
                <p className="text-slate-400 font-bold text-[10px] tracking-[3px] uppercase ml-1">Setup Exam Names & Subject Schedules</p>
            </div>

            <div className="flex flex-wrap gap-4 p-1.5 bg-slate-100 rounded-[24px] w-fit">
                <TabBtn id="exams" label="1. Master Names" icon={FileSignature} active={activeTab} setActive={setActiveTab} />
                <TabBtn id="scheduler" label="2. Scheduling" icon={Calendar} active={activeTab} setActive={setActiveTab} />
                <TabBtn id="list" label="3. Configured List" icon={ListChecks} active={activeTab} setActive={setActiveTab} />
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl border border-slate-50 p-10 min-h-[500px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'exams' && (
                        <motion.div key="exams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                            <div className="flex gap-4 bg-slate-50 p-6 rounded-[30px] border border-slate-100">
                                <input value={newExamName} onChange={e => setNewExamName(e.target.value)} placeholder="ENTER EXAM TYPE" className="flex-1 p-5 rounded-2xl border-none font-bold outline-none uppercase shadow-inner text-sm" />
                                <button onClick={handleAddExamType} className="px-10 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all">Create Name</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {examTypes.map(e => (
                                    <div key={e.id} className="p-6 bg-white border border-slate-100 rounded-[25px] shadow-sm flex justify-between items-center group">
                                        <span className="font-black text-slate-700 uppercase text-xs">{e.exam_name}</span>
                                        <Trash2 size={16} className="text-slate-300 cursor-pointer hover:text-red-500" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'scheduler' && (
                        <motion.div key="scheduler" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <FormSelect label="1. Grade / Class" value={schedule.class_id} onChange={handleClassChange} options={classList} displayKey="class_name" />
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Target Section</label>
                                    <select disabled={!schedule.class_id} value={schedule.current_section} onChange={e => setSchedule({...schedule, current_section: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:bg-white focus:border-blue-400 transition-all text-sm disabled:opacity-30">
                                        <option value="">Select Section</option>
                                        {sectionList.map((s, i) => <option key={i} value={s.section}>{s.section}</option>)}
                                    </select>
                                </div>
                                <FormSelect label="3. Academic Subject" value={schedule.subject_id} onChange={handleSubjectSelection} options={availableClassSubjects} displayKey="subject_name" disabled={!schedule.current_section} />
                                <ReadOnlyInput label="Assigned Teacher" value={schedule.teacher_name} icon={UserCog} color="green" />
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">4. Category</label>
                                    <select value={schedule.exam_id} onChange={e => setSchedule({ ...schedule, exam_id: e.target.value })} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none text-sm">
                                        <option value="">Select Category</option>
                                        {examTypes.map(e => <option key={e.id} value={e.id}>{e.exam_name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">5. Max Marks</label><input type="number" value={schedule.max_marks} onChange={e => handleMaxMarksChange(e.target.value, 'new')} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none text-sm" /></div>
                                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">6. Pass Marks</label><div className="relative"><input type="number" value={schedule.pass_marks} onChange={e => setSchedule({ ...schedule, pass_marks: parseInt(e.target.value) || 0 })} className="w-full p-5 bg-blue-50/30 border border-blue-100 rounded-2xl font-black text-blue-600 outline-none" /><Target size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" /></div></div>
                                </div>
                                <div className="md:col-span-2 space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">7. Exam Date</label><input type="date" value={schedule.exam_date} onChange={e => setSchedule({ ...schedule, exam_date: e.target.value })} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none text-sm" /></div>
                            </div>
                            <button onClick={handleSaveSchedule} disabled={loading} className="w-full py-6 bg-blue-600 text-white rounded-[30px] font-black uppercase tracking-[4px] text-[12px] hover:bg-slate-900 shadow-2xl transition-all flex items-center justify-center gap-4">{loading ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} /> Commit Schedule</>}</button>
                        </motion.div>
                    )}

                    {activeTab === 'list' && (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="flex items-center gap-4 bg-slate-50/50 p-6 rounded-[30px] border border-slate-100">
                                <Filter size={18} className="text-blue-600 ml-2" /><span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Filter:</span>
                                <select value={selectedClassFilter} onChange={(e) => setSelectedClassFilter(e.target.value)} className="bg-white p-4 rounded-2xl text-[12px] font-black uppercase outline-none shadow-sm min-w-[200px] border border-slate-100">
                                    <option value="">All Academic Classes</option>
                                    {classList.map((cls, i) => <option key={i} value={cls.class_name}>{cls.class_name}</option>)}
                                </select>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 bg-slate-50/50">
                                            <th className="px-6 py-6 text-center">Exam Category</th>
                                            <th className="px-6 py-6 text-center">Grade / Class</th>
                                            <th className="px-6 py-6 text-center">Section</th>
                                            <th className="px-6 py-6 text-center">Subject</th>
                                            <th className="px-6 py-6 text-center">Marks Policy</th>
                                            <th className="px-6 py-6 text-center">Exam Date</th>
                                            <th className="px-6 py-6 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredScheduledExams.map((exam) => (
                                            <tr key={exam.id} className="hover:bg-blue-50/30 transition-all group">
                                                <td className="px-6 py-6 text-center font-black text-slate-800 text-xs uppercase">{(exam.exams as any)?.exam_name}</td>
                                                <td className="px-6 py-6 text-center"><span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-black text-[10px] uppercase">{exam.current_class}</span></td>
                                                <td className="px-6 py-6 text-center"><span className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-600 rounded-full font-black text-xs border border-orange-100 mx-auto">{exam.current_section}</span></td>
                                                <td className="px-6 py-6 text-center"><span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full font-black text-[10px] uppercase border border-blue-100 mx-auto">{(exam.class_subjects as any)?.subject_name}</span></td>
                                                <td className="px-6 py-6 text-center">
                                                    <div className="flex flex-col items-center space-y-1">
                                                        <span className="text-xs font-black text-slate-700">{exam.max_marks} Max</span>
                                                        <span className="text-[9px] font-black text-green-600 uppercase bg-green-50 px-2 rounded">Min: {exam.pass_marks}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-slate-600 font-bold text-xs bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm w-fit mx-auto">
                                                        <Calendar size={14} className="text-blue-500" />
                                                        {new Date(exam.exam_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => setEditingExam(exam)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16} /></button>
                                                        <button onClick={() => deleteScheduledExam(exam.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- EDIT MODAL --- */}
            <AnimatePresence>
                {editingExam && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingExam(null)} className="absolute inset-0 bg-slate-900/60" />
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl border border-white">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-800 uppercase">Update Schedule</h2>
                                <button onClick={() => setEditingExam(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500"><X size={20}/></button>
                            </div>
                            <div className="space-y-6">
                                <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-2xl text-blue-600"><BookOpen size={20}/></div>
                                    <div><p className="text-[10px] font-black uppercase text-blue-400">Subject</p><p className="font-black text-slate-700 uppercase">{(editingExam.class_subjects as any)?.subject_name}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Max Marks</label><input type="number" value={editingExam.max_marks} onChange={e => handleMaxMarksChange(e.target.value, 'edit')} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm outline-none" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pass Marks</label><input type="number" value={editingExam.pass_marks} onChange={e => setEditingExam({...editingExam, pass_marks: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm outline-none" /></div>
                                </div>
                                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date</label><input type="date" value={editingExam.exam_date} onChange={e => setEditingExam({...editingExam, exam_date: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none" /></div>
                                <button onClick={handleUpdateExam} disabled={loading} className="w-full py-6 bg-blue-600 text-white rounded-[25px] font-black uppercase text-[12px] tracking-[5px] hover:bg-slate-900 transition-all flex items-center justify-center gap-3">{loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} Sync Changes</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Reusable Components
function TabBtn({ id, label, icon: Icon, active, setActive }: any) {
    const isActive = active === id;
    return (
        <button onClick={() => setActive(id)} className={`flex items-center gap-2 px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
            <Icon size={18} /> {label}
        </button>
    );
}

function ReadOnlyInput({ label, value, icon: Icon, color }: any) {
    const colorClass = color === 'blue' ? 'bg-blue-50/50 text-blue-600 border-blue-100' : 'bg-green-50/50 text-green-600 border-green-100';
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className={`relative flex items-center p-5 border rounded-2xl font-black text-sm ${colorClass}`}>
                <Icon size={18} className="mr-3 opacity-50" />
                {value || 'WAITING...'}
            </div>
        </div>
    );
}

function FormSelect({ label, value, onChange, options, displayKey, disabled }: any) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <select disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:bg-white focus:border-blue-400 transition-all text-sm disabled:opacity-30">
                <option value="">Select Option</option>
                {options.map((o: any) => <option key={o.id} value={o.id}>{o[displayKey]}</option>)}
            </select>
        </div>
    );
}