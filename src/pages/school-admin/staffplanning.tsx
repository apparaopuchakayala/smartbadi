import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    PlusCircle, Trash2, Loader2, RotateCcw,
    ChevronRight, Save, BookPlus, History, Clock, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CardSkeleton, ControlSkeleton } from '../../components/common/skeletoncomp';

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
    
    const [viewSelection, setViewSelection] = useState({ class_id: '', class_name: '', section: '' });

    useEffect(() => {
        if (schoolId) loadBaseData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolId]);

    useEffect(() => {
        if (viewSelection.class_id) {
            loadPlanningHistory();
            fetchClassSpecificSubjects();
        } else {
            setClassSubjects([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewSelection.class_id]);

    const loadBaseData = async () => {
        setLoading(true);
        try {
            const [tData, cData] = await Promise.all([
                supabase.from('profiles').select('id, full_name, employee_id').eq('school_id', schoolId).eq('role', 'teacher'),
                supabase.from('school_classes').select('id, class_name, section').eq('school_id', schoolId).order('class_name'),
            ]);
            setTeachers(tData.data || []);
            setClasses(cData.data || []);
        } finally {
            setLoading(false);
        }
    };

    const fetchClassSpecificSubjects = async () => {
        if (!viewSelection.class_id) return;

        const { data, error } = await supabase
            .from('class_subjects')
            .select('id, subject_name, subject_code')
            .eq('school_id', schoolId)
            .eq('class_id', viewSelection.class_id);

        if (!error) setClassSubjects(data || []);
    };

    const loadPlanningHistory = async () => {
        const { data, error } = await supabase
            .from('teacher_assignments')
            .select('plan_period_from, plan_period_to')
            .eq('school_id', schoolId)
            .eq('class_id', viewSelection.class_id)
            .eq('academic_year', selectedYear);

        if (!error && data) {
            const unique = data.reduce((acc: any[], curr) => {
                const exists = acc.find((a: any) => a.from === curr.plan_period_from && a.to === curr.plan_period_to);
                if (!exists) acc.push({ from: curr.plan_period_from, to: curr.plan_period_to });
                return acc;
            }, []);
            setExistingPeriods(unique);
        }
    };

    const loadAllocationForPeriod = async (from: string, to: string) => {
        setLoading(true);
        setPlanPeriod({ from, to });
        try {
            const { data } = await supabase
                .from('teacher_assignments')
                .select(`*, teacher:profiles(full_name, employee_id)`)
                .eq('school_id', schoolId)
                .eq('class_id', viewSelection.class_id)
                .eq('plan_period_from', from)
                .eq('plan_period_to', to);

            setAllocations(data || []);
            setShowUpdateUI(true);
        } finally {
            setLoading(false);
        }
    };

    const addNewRow = () => {
        setTempAllocations([{ 
            id: `temp-${Date.now()}`, 
            teacher_id: '', 
            teacher_display: '', 
            subject_id: '', 
            subject_display: '' 
        }, ...tempAllocations]);
    };

    const updateTempRow = (id: string, field: string, value: string) => {
        setTempAllocations(tempAllocations.map(row => {
            if (row.id === id) {
                if (field === 'teacher_display') {
                    const match = teachers.find(t => `${t.employee_id} - ${t.full_name}` === value);
                    return { ...row, teacher_display: value, teacher_id: match ? match.id : '' };
                }
                
                if (field === 'subject_display') {
                    const match = classSubjects.find(s => `${s.subject_code} - ${s.subject_name}` === value);
                    return { ...row, subject_display: value, subject_id: match ? match.id : '' };
                }

                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const saveFinalPlan = async () => {
        const validRows = tempAllocations.filter(r => r.teacher_id && r.subject_id);
        
        if (validRows.length === 0) return toast.error("Complete assignments (Select valid Subjects & Teachers)");

        setIsSaving(true);
        const loadToast = toast.loading("Saving Resource Plan...");
        try {
            const finalData = validRows.map(item => ({
                school_id: schoolId,
                teacher_id: item.teacher_id,
                class_id: viewSelection.class_id,
                class_name: viewSelection.class_name,
                section: viewSelection.section,
                subject_id: item.subject_id,
                subject_name: item.subject_display,
                academic_year: selectedYear,
                plan_period_from: planPeriod.from,
                plan_period_to: planPeriod.to
            }));

            const { error } = await supabase.from('teacher_assignments').insert(finalData);
            if (error) throw error;

            toast.success("Planning Saved", { id: loadToast });
            setTempAllocations([]);
            loadAllocationForPeriod(planPeriod.from, planPeriod.to);
        } catch (err: any) {
            console.error(err);
            toast.error("Error saving data: " + err.message, { id: loadToast });
        } finally {
            setIsSaving(false);
        }
    };

    const removeMapping = async (id: string, isTemp: boolean) => {
        if (isTemp) return setTempAllocations(tempAllocations.filter(a => a.id !== id));
        if (window.confirm("Remove permanent record?")) {
            const { error } = await supabase.from('teacher_assignments').delete().eq('id', id);
            if (!error) {
                setAllocations(allocations.filter(a => a.id !== id));
                toast.success("Removed");
            }
        }
    };

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clsName = e.target.value;
        setViewSelection({ class_id: '', class_name: clsName, section: '' });
        setShowUpdateUI(false);
    };

    const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sec = e.target.value;
        const selectedClassObj = classes.find(c => c.class_name === viewSelection.class_name && c.section === sec);
        
        setViewSelection({ 
            class_name: viewSelection.class_name, 
            section: sec,
            class_id: selectedClassObj ? selectedClassObj.id : ''
        });
        setShowUpdateUI(false);
    };

    // --- LOGIC: Filter Out Already Assigned Subjects ---
    const getAvailableSubjects = () => {
        // 1. Get IDs from Database (Permanent Allocations)
        const dbUsedIds = allocations.map(a => a.subject_id);
        
        // 2. Get IDs from Current UI (Temporary Allocations)
        const tempUsedIds = tempAllocations.map(t => t.subject_id).filter(Boolean); // Filter removes empty strings

        // 3. Combine both
        const allUsedIds = [...dbUsedIds, ...tempUsedIds];

        // 4. Return only subjects that are NOT in the used list
        return classSubjects.filter(sub => !allUsedIds.includes(sub.id));
    };

    const availableSubjects = getAvailableSubjects();

    return (
        <div className="space-y-6 md:space-y-10 text-left min-h-screen font-poppins pb-20 px-2 md:px-0">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 md:p-10 rounded-[35px] md:rounded-[50px] shadow-sm border-2 border-white gap-6">
                <div className="space-y-2 text-center sm:text-left">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                        Staff <span className="text-blue-700">Allocation</span>
                    </h1>
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[2px] md:tracking-[4px] mt-1">Resource Planning Matrix</p>
                </div>
                <div className="p-4 md:p-5 bg-slate-900 text-white rounded-[25px] md:rounded-[35px] shadow-2xl shrink-0">
                    <Layers size={28} />
                </div>
            </header>

            {/* Selection Grid */}
            {loading ? <ControlSkeleton /> : (
                <div className="bg-white rounded-[35px] md:rounded-[45px] border-2 border-blue-50 shadow-xl p-6 md:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end transition-all">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Academic Grade</label>
                        <select className="w-full p-4 md:p-5 bg-slate-100 border-2 border-transparent rounded-[20px] md:rounded-[28px] outline-none font-black text-slate-800 focus:border-blue-600 focus:bg-white transition-all shadow-inner appearance-none"
                            value={viewSelection.class_name} onChange={handleClassChange}>
                            <option value="">Select Grade</option>
                            {Array.from(new Set(classes.map(c => c.class_name))).map((cls: any, i) => <option key={i} value={cls}>{cls}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Section</label>
                        <select className="w-full p-4 md:p-5 bg-slate-100 border-2 border-transparent rounded-[20px] md:rounded-[28px] outline-none font-black text-slate-800 focus:border-blue-600 focus:bg-white transition-all shadow-inner appearance-none"
                            value={viewSelection.section} onChange={handleSectionChange}>
                            <option value="">Select Unit</option>
                            {classes.filter(c => c.class_name === viewSelection.class_name).map((c, i) => <option key={i} value={c.section}>{c.section}</option>)}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <button onClick={() => { 
                            if (!viewSelection.class_id) return toast.error("Selection Required"); 
                            setShowPeriodModal(true); 
                        }}
                            className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-[20px] md:rounded-[30px] font-black uppercase text-[10px] md:text-[11px] tracking-[3px] shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                            <PlusCircle size={20} /> Initialize Planning Term
                        </button>
                    </div>
                </div>
            )}

            {/* History Records */}
            {viewSelection.class_id && !showUpdateUI && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <History size={18} className="text-blue-600" />
                        <h2 className="text-[11px] md:text-[13px] font-black uppercase tracking-[5px] text-slate-900">Periodic Registry</h2>
                        <div className="flex-1 h-[2px] bg-slate-200"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? [1, 2].map(i => <CardSkeleton key={i} />) : existingPeriods.map((period, i) => (
                            <button
                                key={i}
                                onClick={() => loadAllocationForPeriod(period.from, period.to)}
                                className="p-6 md:p-10 bg-white border-2 border-slate-50 rounded-[35px] md:rounded-[50px] shadow-sm hover:shadow-2xl hover:border-blue-600 transition-all flex items-center justify-between group gap-4 text-left"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-[22px] flex-shrink-0 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-all shadow-inner">
                                        <Clock size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Timeline</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-md md:text-xl font-black text-slate-800 uppercase">{period.from}</span>
                                            <ChevronRight size={16} className="text-blue-600" />
                                            <span className="text-md md:text-xl font-black text-slate-800 uppercase">{period.to}</span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={24} className="text-slate-200 group-hover:text-blue-600 transition-colors" />
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Allocation Builder UI */}
            {showUpdateUI && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[35px] md:rounded-[55px] border-2 border-slate-100 shadow-2xl overflow-hidden">
                    <div className="p-6 md:p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setShowUpdateUI(false)} className="p-4 bg-white/10 hover:bg-blue-600 rounded-2xl transition-all shadow-lg"><RotateCcw size={20} /></button>
                            <div className="text-left">
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Drafting Board</h2>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Allocating for Grade {viewSelection.class_name} • {viewSelection.section}</p>
                            </div>
                        </div>
                        <button onClick={addNewRow} className="w-full md:w-auto px-8 py-4 bg-[#8DC63F] text-white rounded-[22px] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-white hover:text-[#8DC63F] transition-all shadow-xl">
                            <BookPlus size={20} /> New Unit
                        </button>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full border-collapse">
                            <thead className="hidden lg:table-header-group">
                                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b-2 border-slate-100">
                                    <th className="px-10 py-8 text-center">Status</th>
                                    <th className="px-10 py-8 text-center">Subject Mapping</th>
                                    <th className="px-10 py-8 text-center">Staff Assignment</th>
                                    <th className="px-10 py-8 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-50">
                                <AnimatePresence mode="popLayout">
                                    {tempAllocations.map((row) => (
                                        <motion.tr key={row.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="flex flex-col lg:table-row bg-blue-50/10 p-6 lg:p-0 border-b-2 lg:border-none border-blue-50">
                                            <td className="px-4 lg:px-10 py-4 lg:py-10 text-center">
                                                <span className="px-4 py-2 bg-blue-700 text-white rounded-full text-[9px] font-black uppercase tracking-[2px] shadow-md border-2 border-white">
                                                    New Entry
                                                </span>
                                            </td>
                                            <td className="px-4 lg:px-10 py-4 lg:py-10">
                                                {/* Use the dynamic 'db-subjects-list' which now updates based on usage */}
                                                <input list="db-subjects-list" className="w-full p-5 bg-white border-2 border-slate-100 rounded-[22px] text-xs font-black outline-none focus:border-blue-600 transition-all shadow-sm text-center uppercase"
                                                    placeholder="Choose Subject..." value={row.subject_display} onChange={(e) => updateTempRow(row.id, 'subject_display', e.target.value)} />
                                            </td>
                                            <td className="px-4 lg:px-10 py-4 lg:py-10">
                                                <input list="db-teachers-list" className="w-full p-5 bg-white border-2 border-slate-100 rounded-[22px] text-xs font-black outline-none focus:border-blue-600 transition-all shadow-sm text-center uppercase"
                                                    placeholder="Assign Teacher..." value={row.teacher_display} onChange={(e) => updateTempRow(row.id, 'teacher_display', e.target.value)} />
                                            </td>
                                            <td className="px-4 lg:px-10 py-4 lg:py-10 text-center">
                                                <button onClick={() => removeMapping(row.id, true)} className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center justify-center mx-auto border-2 border-red-100">
                                                    <Trash2 size={22} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>

                                {allocations.map((alloc) => (
                                    <tr key={alloc.id} className="flex flex-col lg:table-row hover:bg-slate-50/80 transition-all p-6 lg:p-0 border-b-2 lg:border-none border-slate-50">
                                        <td className="px-10 py-8 text-center">
                                            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-[2px] border-2 border-white shadow-sm">Permanent</span>
                                        </td>
                                        <td className="px-10 py-8 text-center font-black text-slate-900 uppercase tracking-tight text-xs">{alloc.subject_name}</td>
                                        <td className="px-10 py-8 text-center font-black text-slate-800 uppercase text-xs">
                                            <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm inline-block min-w-[200px] uppercase">
                                                {alloc.teacher?.employee_id} • {alloc.teacher?.full_name}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <button onClick={() => removeMapping(alloc.id, false)} className="p-4 text-slate-300 hover:text-red-600 transition-all hover:bg-white rounded-2xl shadow-sm">
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-10 bg-slate-50 border-t-2 border-slate-100 flex justify-center">
                        <button onClick={saveFinalPlan} disabled={isSaving || tempAllocations.length === 0}
                            className="w-full max-w-xl py-6 bg-blue-700 text-white rounded-[30px] font-black uppercase text-[12px] tracking-[4px] shadow-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
                            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} Commit Plan To Registry
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Modal: Academic Term */}
            <AnimatePresence>
                {showPeriodModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPeriodModal(false)} className="absolute inset-0 bg-slate-900/70" />
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[45px] p-10 md:p-14 shadow-2xl border-4 border-white text-center">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-10 leading-none">Planning <span className="text-blue-700">Epoch</span></h2>
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Opening Date</label>
                                        <input type="date" className="w-full p-5 bg-slate-100 rounded-3xl text-sm font-black outline-none border-2 border-transparent focus:border-blue-600 transition-all shadow-inner" onChange={(e) => setPlanPeriod({ ...planPeriod, from: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Closure Date</label>
                                        <input type="date" className="w-full p-5 bg-slate-100 rounded-3xl text-sm font-black outline-none border-2 border-transparent focus:border-blue-600 transition-all shadow-inner" onChange={(e) => setPlanPeriod({ ...planPeriod, to: e.target.value })} />
                                    </div>
                                </div>
                                <button onClick={() => { if (!planPeriod.from || !planPeriod.to) return toast.error("Timeline Missing"); setShowPeriodModal(false); setAllocations([]); setShowUpdateUI(true); }}
                                    className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black uppercase text-[12px] tracking-[4px] shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                                    Lock Epoch & Plan <ChevronRight size={20} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Datalist: Subjects (Filtered) */}
            <datalist id="db-subjects-list">
                {availableSubjects.map((s, i) => <option key={i} value={`${s.subject_code} - ${s.subject_name}`} />)}
            </datalist>
            <datalist id="db-teachers-list">
                {teachers.map((t, i) => <option key={i} value={`${t.employee_id} - ${t.full_name}`} />)}
            </datalist>
        </div>
    );
}