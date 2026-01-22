import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    PlusCircle, Trash2, Loader2, Search, RotateCcw, 
    ChevronRight, Calendar, Save, UserPlus, BookPlus
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
    const [allocations, setAllocations] = useState<any[]>([]); // DB records
    const [tempAllocations, setTempAllocations] = useState<any[]>([]); // New editable rows
    const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);

    const [selectedYear, setSelectedYear] = useState('2026-2027');
    const [planPeriod, setPlanPeriod] = useState({ from: '', to: '' });

    // Filter selections for the current view
    const [viewSelection, setViewSelection] = useState({ class_name: '', section: '' });

    useEffect(() => {
        if (schoolId) loadPlanningData();
    }, [schoolId, selectedYear]);

    const loadPlanningData = async () => {
        setLoading(true);
        try {
            const { data: tData } = await supabase.from('profiles').select('id, full_name, employee_id').eq('school_id', schoolId).eq('role', 'teacher');
            const { data: cData } = await supabase.from('school_classes').select('*').eq('school_id', schoolId);
            const { data: sData } = await supabase.from('class_subjects').select('*').eq('school_id', schoolId);
            const { data: aData } = await supabase.from('teacher_assignments').select(`*, teacher:profiles(full_name, employee_id)`).eq('school_id', schoolId).eq('academic_year', selectedYear);

            setTeachers(tData || []);
            setClasses(cData || []);
            setAvailableSubjects(sData || []);
            setAllocations(aData || []);
        } catch (err) {
            toast.error("Sync Failed");
        } finally {
            setLoading(false);
        }
    };

    // --- NEW: Function to add an empty editable row ---
    const addNewRow = () => {
        if (!viewSelection.class_name || !viewSelection.section) {
            return toast.error("Select Class & Section in Search Criteria first!");
        }
        const newEntry = {
            id: `temp-${Date.now()}`, 
            teacher_id: '',
            teacher_display: '',
            subject_display: '',
            isNew: true
        };
        setTempAllocations([newEntry, ...tempAllocations]);
    };

    // Handle typing in temporary rows
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
        if (validRows.length === 0) return toast.error("No complete assignments to save");

        setIsSaving(true);
        const loadId = toast.loading("Securing Academic Plan...");

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

            toast.success("Academic Plan Saved", { id: loadId });
            setTempAllocations([]);
            loadPlanningData(); 
        } catch (err: any) {
            toast.error("Error: Check for duplicate assignments", { id: loadId });
        } finally {
            setIsSaving(false);
        }
    };

    const removeMapping = async (id: string, isTemp: boolean) => {
        if (isTemp) {
            setTempAllocations(tempAllocations.filter(a => a.id !== id));
        } else {
            if (!window.confirm("Permanently delete from database?")) return;
            const { error } = await supabase.from('teacher_assignments').delete().eq('id', id);
            if (!error) {
                setAllocations(allocations.filter(a => a.id !== id));
                toast.success("Record Deleted");
            }
        }
    };

    return (
        <div className="space-y-6 text-left max-w-[1600px] mx-auto pb-20 px-4 font-poppins">
            {/* --- TOP CRITERIA SELECTOR --- */}
            <div className="bg-white rounded-[35px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <Search size={14} className="text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Criteria</span>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Institution</label>
                        <div className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-black text-slate-700 border border-slate-100">{profile?.schools?.name}</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Class</label>
                        <select className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-black outline-none border border-slate-100" 
                                value={viewSelection.class_name} onChange={(e) => setViewSelection({...viewSelection, class_name: e.target.value, section: ''})}>
                            <option value="">Select Class</option>
                            {Array.from(new Set(classes.map(c => c.class_name))).map((cls: any, i) => <option key={i} value={cls}>{cls}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Section</label>
                        <select className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-black outline-none border border-slate-100" 
                                value={viewSelection.section} onChange={(e) => setViewSelection({...viewSelection, section: e.target.value})}>
                            <option value="">Select Section</option>
                            {classes.filter(c => c.class_name === viewSelection.class_name).map((c, i) => <option key={i} value={c.section}>{c.section}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Academic Year</label>
                        <div className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-black text-blue-600 border border-slate-100">{selectedYear}</div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={() => setShowPeriodModal(true)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 shadow-2xl hover:bg-blue-600 transition-all">
                        <PlusCircle size={16} /> New Staff Planning
                    </button>
                    <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-slate-400 border border-slate-200 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-50 transition-all">
                        <RotateCcw size={14} /> Reset
                    </button>
                </div>
            </div>

            {/* --- UPDATE STAFF PLANNING UI --- */}
            {showUpdateUI && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500 text-white rounded-[18px] flex items-center justify-center font-black ">SB</div>
                            <div>
                                <h2 className="text-[12px] font-black uppercase tracking-widest ">Update Academic Allocation</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Unit: {viewSelection.class_name}-{viewSelection.section} | {planPeriod.from} TO {planPeriod.to}</p>
                            </div>
                        </div>
                        {/* --- NEW ADD BUTTON ABOVE TABLE --- */}
                        <button onClick={addNewRow} className="px-6 py-3 bg-[#8DC63F] text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-white hover:text-slate-900 transition-all">
                            <BookPlus size={16} /> Add New Subject Assignment
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                    <th className="px-10 py-6">Action</th>
                                    <th className="px-6 py-6">Subject (Code - Name)</th>
                                    <th className="px-6 py-6">Staff (ID - Name)</th>
                                    <th className="px-6 py-6 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {/* DYNAMIC EDITABLE ROWS */}
                                {tempAllocations.map((row) => (
                                    <tr key={row.id} className="bg-blue-50/20">
                                        <td className="px-10 py-6">
                                            <button onClick={() => removeMapping(row.id, true)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-6">
                                            <input list="subjects-list" placeholder="Select Subject..." className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black outline-none focus:border-blue-500 shadow-sm"
                                                   value={row.subject_display} onChange={(e) => updateTempRow(row.id, 'subject_display', e.target.value)} />
                                        </td>
                                        <td className="px-6 py-6">
                                            <input list="teachers-list" placeholder="Search Teacher..." className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black outline-none focus:border-blue-500 shadow-sm"
                                                   value={row.teacher_display} onChange={(e) => updateTempRow(row.id, 'teacher_display', e.target.value)} />
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest">Draft</span>
                                        </td>
                                    </tr>
                                ))}

                                {/* LIVE DB ROWS */}
                                {allocations
                                    .filter(a => a.class_name === viewSelection.class_name && a.section === viewSelection.section)
                                    .map((alloc) => (
                                    <tr key={alloc.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-10 py-6">
                                            <button onClick={() => removeMapping(alloc.id, false)} className="p-3 text-slate-300 hover:text-red-500 transition-all">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-6 text-[11px] font-black text-slate-700 ">{alloc.subject_name}</td>
                                        <td className="px-6 py-6 text-[11px] font-black text-slate-800 uppercase">
                                            {alloc.teacher?.employee_id} - {alloc.teacher?.full_name}
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-center">
                        <button onClick={saveFinalPlan} disabled={isSaving || tempAllocations.length === 0} 
                                className="w-full max-w-md py-6 bg-blue-600 text-white rounded-[30px] font-black uppercase text-[11px] tracking-[4px] shadow-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-4 disabled:opacity-50">
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Save Academic Plan
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Global Datalists for Inputs */}
            <datalist id="subjects-list">
                {availableSubjects.map((s, i) => <option key={i} value={`${s.subject_code} - ${s.subject_name}`} />)}
            </datalist>
            <datalist id="teachers-list">
                {teachers.map((t, i) => <option key={i} value={`${t.employee_id} - ${t.full_name}`} />)}
            </datalist>

            {/* --- PLAN PERIOD MODAL --- */}
            <AnimatePresence>
                {showPeriodModal && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPeriodModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-lg rounded-[50px] p-12 shadow-2xl border border-white">
                            <div className="text-center space-y-4 mb-10">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mx-auto shadow-xl shadow-blue-100"><Calendar size={32} /></div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Set Planning Period</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[3px]">Academic duration configuration</p>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Start Date</label>
                                        <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-black outline-none shadow-inner" onChange={(e) => setPlanPeriod({...planPeriod, from: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">End Date</label>
                                        <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-black outline-none shadow-inner" onChange={(e) => setPlanPeriod({...planPeriod, to: e.target.value})} />
                                    </div>
                                </div>
                                <button onClick={() => { 
                                    if(!planPeriod.from || !planPeriod.to) return toast.error("Dates Required");
                                    if(!viewSelection.class_name || !viewSelection.section) return toast.error("Select Class & Section first");
                                    setShowPeriodModal(false); setShowUpdateUI(true); 
                                }} className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black uppercase text-[11px] tracking-[4px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                                    Proceed to Allocation <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}