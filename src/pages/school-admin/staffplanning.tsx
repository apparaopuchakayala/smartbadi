import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    PlusCircle, Trash2, Loader2, Search, RotateCcw,
    ChevronRight, Calendar, Save, BookPlus, History, Clock, BookOpen, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function StaffPlanning() {
    const { profile } = useAuth();
    const schoolId = profile?.school_id;

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showUpdateUI, setShowUpdateUI] = useState(false);

    const [teachers, setTeachers] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [tempAllocations, setTempAllocations] = useState<any[]>([]);
    const [classSubjects, setClassSubjects] = useState<any[]>([]);
    const [existingPeriods, setExistingPeriods] = useState<any[]>([]);

    const [selectedYear, setSelectedYear] = useState('2026-2027');
    const [planPeriod, setPlanPeriod] = useState({ from: '', to: '' });
    const [viewSelection, setViewSelection] = useState({ class_name: '', section: '' });

    // 1. Initial Load: Teachers and Classes only
    useEffect(() => {
        if (schoolId) loadBaseData();
    }, [schoolId]);

    // 2. Load History & Subjects only when Class/Section is selected (DB Level Filter)
    useEffect(() => {
        if (viewSelection.class_name && viewSelection.section) {
            loadPlanningHistory();
            fetchClassSpecificSubjects();
        }
    }, [viewSelection.class_name, viewSelection.section]);

    const loadBaseData = async () => {
        setLoading(true);
        const [tData, cData] = await Promise.all([
            supabase.from('profiles').select('id, full_name, employee_id').eq('school_id', schoolId).eq('role', 'teacher'),
            supabase.from('school_classes').select('*').eq('school_id', schoolId).order('class_name'),
        ]);
        setTeachers(tData.data || []);
        setClasses(cData.data || []);
        setLoading(false);
    };

    // --- PERMANENT FIX: FETCH SUBJECTS FOR SPECIFIC CLASS FROM DB ---
    const fetchClassSpecificSubjects = async () => {
        const { data, error } = await supabase
            .from('class_subjects')
            .select('subject_name, subject_code')
            .eq('school_id', schoolId)

        if (!error) {
            setClassSubjects(data || []);
        } else {
            console.error("Subject Fetch Error:", error);
        }
    };

    const loadPlanningHistory = async () => {
        const { data, error } = await supabase
            .from('teacher_assignments')
            .select('plan_period_from, plan_period_to')
            .eq('school_id', schoolId)
            .eq('class_name', viewSelection.class_name)
            .eq('section', viewSelection.section)
            .eq('academic_year', selectedYear);

        if (!error && data) {
            const unique = data.reduce((acc: any[], curr) => {
                const exists = acc.find(a => a.from === curr.plan_period_from && a.to === curr.plan_period_to);
                if (!exists) acc.push({ from: curr.plan_period_from, to: curr.plan_period_to });
                return acc;
            }, []);
            setExistingPeriods(unique);
        }
    };

    const loadAllocationForPeriod = async (from: string, to: string) => {
        setLoading(true);
        setPlanPeriod({ from, to });
        const { data } = await supabase
            .from('teacher_assignments')
            .select(`*, teacher:profiles(full_name, employee_id)`)
            .eq('school_id', schoolId)
            .eq('class_name', viewSelection.class_name)
            .eq('section', viewSelection.section)
            .eq('plan_period_from', from)
            .eq('plan_period_to', to);

        setAllocations(data || []);
        setShowUpdateUI(true);
        setLoading(false);
    };

    const addNewRow = () => {
        setTempAllocations([{ id: `temp-${Date.now()}`, teacher_id: '', teacher_display: '', subject_display: '' }, ...tempAllocations]);
    };

    const updateTempRow = (id: string, field: string, value: string) => {
        setTempAllocations(tempAllocations.map(row => {
            if (row.id === id) {
                if (field === 'teacher_display') {
                    const match = teachers.find(t => `${t.employee_id} - ${t.full_name}` === value);
                    return { ...row, teacher_display: value, teacher_id: match ? match.id : '' };
                }
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const saveFinalPlan = async () => {
        const validRows = tempAllocations.filter(r => r.teacher_id && r.subject_display);
        if (validRows.length === 0) return toast.error("Please select a subject and teacher correctly");

        setIsSaving(true);
        try {
            const finalData = validRows.map(item => ({
                school_id: schoolId,
                teacher_id: item.teacher_id,
                class_name: viewSelection.class_name,
                section: viewSelection.section,
                subject_name: item.subject_display,
                academic_year: selectedYear,
                plan_period_from: planPeriod.from,
                plan_period_to: planPeriod.to
            }));

            const { error } = await supabase.from('teacher_assignments').insert(finalData);
            if (error) throw error;

            await Promise.all(validRows.map(item =>
                supabase.from('profiles').update({
                    subject_teaching: item.subject_display.includes(' - ') ? item.subject_display.split(' - ')[1] : item.subject_display
                }).eq('id', item.teacher_id)
            ));

            toast.success("Allocation Permanentally Saved");
            setTempAllocations([]);
            loadAllocationForPeriod(planPeriod.from, planPeriod.to);
        } catch (err: any) {
            toast.error("Duplicate data or Server error");
        } finally {
            setIsSaving(false);
        }
    };

    const removeMapping = async (id: string, isTemp: boolean) => {
        if (isTemp) return setTempAllocations(tempAllocations.filter(a => a.id !== id));
        if (window.confirm("Remove this permanent record?")) {
            const { error } = await supabase.from('teacher_assignments').delete().eq('id', id);
            if (!error) {
                setAllocations(allocations.filter(a => a.id !== id));
                toast.success("Deleted from DB");
            }
        }
    };

    return (
        <div className="space-y-8 text-left max-w-[1600px] mx-auto pb-20 px-4">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-10 rounded-[50px] shadow-sm border border-white">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter ">Staff <span className="text-[#8DC63F]">Allocation</span></h1>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[3px]">Systematic Academic Resource Planning</p>
                </div>
                <div className="p-5 bg-slate-900 text-white rounded-[35px] shadow-2xl"><Layers size={32} /></div>
            </header>

            {/* Selection Grid */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade</label>
                    <select className="w-full p-5 bg-slate-50 border-none rounded-[28px] outline-none font-black text-slate-700 shadow-inner"
                        value={viewSelection.class_name} onChange={(e) => setViewSelection({ ...viewSelection, class_name: e.target.value, section: '' })}>
                        <option value="">Select Class</option>
                        {Array.from(new Set(classes.map(c => c.class_name))).map((cls: any, i) => <option key={i} value={cls}>{cls}</option>)}
                    </select>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                    <select className="w-full p-5 bg-slate-50 border-none rounded-[28px] outline-none font-black text-slate-700 shadow-inner"
                        value={viewSelection.section} onChange={(e) => { setViewSelection({ ...viewSelection, section: e.target.value }); setShowUpdateUI(false); }}>
                        <option value="">Select Section</option>
                        {classes.filter(c => c.class_name === viewSelection.class_name).map((c, i) => <option key={i} value={c.section}>{c.section}</option>)}
                    </select>
                </div>
                <div className="col-span-2 flex items-end">
                    <button onClick={() => { if (!viewSelection.section) return toast.error("Select Class/Section"); setShowPeriodModal(true); }}
                        className="w-full py-5 bg-slate-900 text-white rounded-[30px] font-black uppercase text-[11px] tracking-[4px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                        <PlusCircle size={20} /> Initialize New Planning
                    </button>
                </div>
            </div>

            {/* History Section - Persistent DB Records */}
            {viewSelection.section && !showUpdateUI && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <History size={16} className="text-slate-400" />
                        <h2 className="text-[12px] font-black uppercase tracking-[5px] text-slate-400 ">Found Periodic Records</h2>
                        <div className="flex-1 h-[1px] bg-slate-200 shadow-inner"></div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {existingPeriods.map((period, i) => (
                            <button
                                key={i}
                                onClick={() => loadAllocationForPeriod(period.from, period.to)}
                                className="p-6 md:p-10 bg-white border border-slate-50 rounded-[45px] shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-6"
                            >
                                <div className="flex items-center gap-6 flex-1">
                                    {/* Icon Section */}
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[22px] flex-shrink-0 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                        <Clock size={28} />
                                    </div>

                                    {/* Text Content */}
                                    <div className="text-left space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Planning Record</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-lg font-black text-slate-700 whitespace-nowrap">{period.from}</span>
                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-all" />
                                            <span className="text-lg font-black text-slate-700 whitespace-nowrap">{period.to}</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-blue-500/60 uppercase tracking-widest ">Click to view allocations</p>
                                    </div>
                                </div>

                                {/* Action Arrow */}
                                <div className="hidden sm:flex w-12 h-12 items-center justify-center rounded-full bg-slate-50 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                    <ChevronRight size={24} strokeWidth={3} />
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Allocation Builder UI */}
            {showUpdateUI && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[50px] border border-slate-100 shadow-2xl overflow-hidden">
                    <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                        <div className="flex items-center gap-5">
                            <button onClick={() => setShowUpdateUI(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"><RotateCcw size={20} /></button>
                            <h2 className="text-xl font-black uppercase tracking-tight ">Allocation Builder</h2>
                        </div>
                        <button onClick={addNewRow} className="px-8 py-4 bg-[#8DC63F] text-white rounded-[25px] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg active:scale-95">
                            <BookPlus size={18} /> Add Subject Mapping
                        </button>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                    <th className="px-10 py-8">Status</th>
                                    <th className="px-6 py-8">Subject Mapping</th>
                                    <th className="px-6 py-8">Staff Selection</th>
                                    <th className="px-10 py-8 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                <AnimatePresence mode="popLayout">
                                    {tempAllocations.map((row) => (
                                        <motion.tr key={row.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-blue-50/20 group">
                                            <td className="px-10 py-6"><span className="px-4 py-1.5 bg-blue-100 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest">New Draft</span></td>
                                            <td className="px-6 py-6"><input list="db-subjects-list" className="w-full p-5 bg-white border border-slate-100 rounded-[22px] text-xs font-black outline-none focus:ring-4 ring-blue-500/5 transition-all shadow-sm" placeholder="Select Subject..." value={row.subject_display} onChange={(e) => updateTempRow(row.id, 'subject_display', e.target.value)} /></td>
                                            <td className="px-6 py-6"><input list="db-teachers-list" className="w-full p-5 bg-white border border-slate-100 rounded-[22px] text-xs font-black outline-none focus:ring-4 ring-blue-500/5 transition-all shadow-sm" placeholder="Select Staff..." value={row.teacher_display} onChange={(e) => updateTempRow(row.id, 'teacher_display', e.target.value)} /></td>
                                            <td className="px-10 py-6 text-center"><button onClick={() => removeMapping(row.id, true)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={20} /></button></td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {allocations.map((alloc) => (
                                    <tr key={alloc.id} className="hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-blue-500">
                                        <td className="px-10 py-6"><div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-600 rounded-full w-fit"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-green-100" /><span className="text-[8px] font-black uppercase tracking-widest">Permanent Record</span></div></td>
                                        <td className="px-6 py-6 text-[12px] font-black text-slate-700 ">{alloc.subject_name}</td>
                                        <td className="px-6 py-6 text-[12px] font-black text-slate-800 uppercase ">{alloc.teacher?.employee_id} ➔ {alloc.teacher?.full_name}</td>
                                        <td className="px-10 py-6 text-center"><button onClick={() => removeMapping(alloc.id, false)} className="p-4 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={20} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-12 bg-slate-50 border-t border-slate-100 flex justify-center">
                        <button onClick={saveFinalPlan} disabled={isSaving || tempAllocations.length === 0}
                            className="w-full max-w-lg py-6 bg-blue-600 text-white rounded-[30px] font-black uppercase text-[12px] tracking-[5px] shadow-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
                            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} Finalize Assignments
                        </button>
                    </div>
                </motion.div>
            )}

            {/* --- DATALISTS (Permanent DB Source) --- */}
            <datalist id="db-subjects-list">
                {classSubjects.map((s, i) => (
                    <option key={`sub-${i}`} value={`${s.subject_code} - ${s.subject_name}`} />
                ))}
            </datalist>

            <datalist id="db-teachers-list">
                {teachers.map((t, i) => (
                    <option key={`teach-${i}`} value={`${t.employee_id} - ${t.full_name}`} />
                ))}
            </datalist>

            {/* Term Period Modal */}
            <AnimatePresence>
                {showPeriodModal && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPeriodModal(false)} className="absolute inset-0 bg-slate-900/60" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-xl rounded-[60px] p-16 shadow-2xl border border-white">
                            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-8 text-center ">New Academic Horizon</h2>
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Valid From</label><input type="date" className="w-full p-5 bg-slate-50 rounded-[28px] text-sm font-black outline-none border border-transparent focus:ring-4 ring-blue-500/5 transition-all" onChange={(e) => setPlanPeriod({ ...planPeriod, from: e.target.value })} /></div>
                                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Valid To</label><input type="date" className="w-full p-5 bg-slate-50 rounded-[28px] text-sm font-black outline-none border border-transparent focus:ring-4 ring-blue-500/5 transition-all" onChange={(e) => setPlanPeriod({ ...planPeriod, to: e.target.value })} /></div>
                                </div>
                                <button onClick={() => { if (!planPeriod.from || !planPeriod.to) return toast.error("Dates Missing"); setShowPeriodModal(false); setAllocations([]); setShowUpdateUI(true); }}
                                    className="w-full py-7 bg-slate-900 text-white rounded-[35px] font-black uppercase text-[12px] tracking-[5px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                                    Initialize <ChevronRight size={20} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}