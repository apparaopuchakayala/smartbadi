import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    UserCheck, BookOpen, LayoutGrid, PlusCircle,
    Trash2, Loader2, GraduationCap, Sparkles,
    Search, Filter, Download, RotateCcw, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function StaffPlanning() {
    const { profile } = useAuth();
    const schoolId = profile?.school_id;

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [teachers, setTeachers] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [allocations, setAllocations] = useState<any[]>([]);

    // Filter States (Like in the screenshot)
    const [filters, setFilters] = useState({
        degree: 'Under Graduate',
        semester: 'EVEN SEMESTER',
        academicYear: '2025-2026'
    });

    const [formData, setFormData] = useState({
        teacher_id: '',
        class_name: '',
        section: '',
        subject_name: ''
    });

    useEffect(() => {
        if (schoolId) loadPlanningData();
    }, [schoolId]);

    const loadPlanningData = async () => {
        setLoading(true);
        try {
            const { data: tData } = await supabase.from('profiles').select('id, full_name').eq('school_id', schoolId).eq('role', 'teacher');
            const { data: cData } = await supabase.from('school_classes').select('*').eq('school_id', schoolId);
            const { data: aData } = await supabase.from('academic_allocations').select(`*, teacher:profiles(full_name)`).eq('school_id', schoolId);

            setTeachers(tData || []);
            setClasses(cData || []);
            setAllocations(aData || []);
        } catch (err) {
            toast.error("Security Sync Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleAllocate = async () => {
        if (!formData.teacher_id || !formData.class_name || !formData.subject_name) {
            return toast.error("Missing mandatory fields");
        }

        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('academic_allocations')
                .insert([{
                    school_id: schoolId,
                    teacher_id: formData.teacher_id,
                    class_name: formData.class_name,
                    section: formData.section,
                    subject_name: formData.subject_name.trim()
                }])
                .select(`*, teacher:profiles(full_name)`);

            if (error) throw error;
            setAllocations(prev => [...prev, ...data]);
            setFormData({ ...formData, teacher_id: '', subject_name: '' });
            toast.success("Allocation Secured");
        } catch (err: any) {
            toast.error("Mapping Failed: Duplicate Entry Found");
        } finally {
            setIsSaving(false);
        }
    };

    const removeMapping = async (id: string) => {
        if (!window.confirm("Are you sure?")) return;
        const { error } = await supabase.from('academic_allocations').delete().eq('id', id);
        if (!error) {
            setAllocations(prev => prev.filter(a => a.id !== id));
            toast.success("Mapping Dissolved");
        }
    };

    if (loading) return <div className="p-20 text-center uppercase tracking-[4px] text-slate-400 animate-pulse font-black">Initializing Resource Planner...</div>;

    return (
        <div className="space-y-6 text-left max-w-[1600px] mx-auto pb-20 px-4">
            
            {/* --- TOP CRITERIA SELECTOR (Like SS) --- */}
            <div className="bg-white rounded-[30px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                    <Search size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Criteria</span>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8 bg-white">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">Institution <span className="text-red-500">*</span></label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-slate-100 italic">
                            <option>{profile?.schools?.name || 'Woxsen University'}</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Degree <span className="text-red-500">*</span></label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-slate-100">
                            <option>Under Graduate</option>
                            <option>Post Graduate</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Semester / Year <span className="text-red-500">*</span></label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-slate-100">
                            <option>EVEN SEMESTER</option>
                            <option>ODD SEMESTER</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Academic Year <span className="text-red-500">*</span></label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-slate-100">
                            <option>2025-2026</option>
                        </select>
                    </div>
                </div>

                {/* --- TOOLBAR ACTIONS (Like SS) --- */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-100">
                        <PlusCircle size={14} /> New Staff Planning
                    </button>
                    <button className="px-6 py-2 bg-orange-400 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                        <Search size={14} /> Find Staff
                    </button>
                    <button className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                        <Download size={14} /> Download
                    </button>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-400 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                        <RotateCcw size={14} /> Reset
                    </button>
                </div>
            </div>

            {/* --- ALLOCATION PANEL --- */}
            <div className="bg-white rounded-[35px] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-black">1</div>
                        <h2 className="text-sm font-black uppercase tracking-tighter italic">Update Staff Planning</h2>
                    </div>
                    <div className="px-4 py-2 bg-white/10 rounded-full text-[10px] font-bold border border-white/20">
                        Plan Period: 13-Nov-2025 to 12-Mar-2026
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <th className="px-8 py-5">Action</th>
                                <th className="px-8 py-5">Course / Subject</th>
                                <th className="px-8 py-5">Assigned Staff</th>
                                <th className="px-8 py-5">Class-Section</th>
                                <th className="px-8 py-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* --- ADD NEW ROW (The Dynamic Form) --- */}
                            <tr className="bg-blue-50/30">
                                <td className="px-8 py-4">
                                    <button onClick={handleAllocate} className="p-3 bg-[#8DC63F] text-white rounded-xl shadow-lg hover:bg-slate-900 transition-all">
                                        <PlusCircle size={18} />
                                    </button>
                                </td>
                                <td className="px-8 py-4">
                                    <input placeholder="e.g. Full Stack Development" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm" 
                                           value={formData.subject_name} onChange={(e) => setFormData({...formData, subject_name: e.target.value})} />
                                </td>
                                <td className="px-8 py-4">
                                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm"
                                            value={formData.teacher_id} onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}>
                                        <option value="">Select Staff</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                    </select>
                                </td>
                                <td className="px-8 py-4">
                                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm"
                                            value={`${formData.class_name}|${formData.section}`} onChange={(e) => { const [c, s] = e.target.value.split('|'); setFormData({...formData, class_name: c, section: s}) }}>
                                        <option value="">Select Campus Unit</option>
                                        {classes.map((c, i) => <option key={i} value={`${c.class_name}|${c.section}`}>{c.class_name} - {c.section}</option>)}
                                    </select>
                                </td>
                                <td className="px-8 py-4">
                                    <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">New Mapping</span>
                                </td>
                            </tr>

                            {/* --- LIST EXISTING ROWS (Like SS Table) --- */}
                            {allocations.map((alloc) => (
                                <tr key={alloc.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="px-8 py-4">
                                        <button onClick={() => removeMapping(alloc.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 italic">
                                            {alloc.subject_name}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-xs font-black text-slate-800 uppercase italic">
                                        {alloc.teacher?.full_name}
                                    </td>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-500 uppercase">
                                        {alloc.class_name} - {alloc.section}
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-4 bg-blue-500/20 rounded-full relative p-0.5">
                                                <div className="w-3 h-3 bg-blue-600 rounded-full ml-auto"></div>
                                            </div>
                                            <span className="text-[9px] font-black text-blue-600 uppercase">Active</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}