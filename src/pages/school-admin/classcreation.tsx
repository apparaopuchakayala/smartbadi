import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
    Plus, Trash2, Building2, Layers, X, PlusCircle, BookOpen, Sparkles, Hash, Edit3, Save, Loader2, Copy, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthProvider';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../../components/common/skeletoncomp';

export function ClassCreation({ schoolId }: { schoolId: string }) {
    const [loading, setLoading] = useState(true);
    const [activeClasses, setActiveClasses] = useState<any[]>([]);
    const [classSubjectCounts, setClassSubjectCounts] = useState<Record<string, number>>({});
    
    // States
    const [newClassName, setNewClassName] = useState('');
    const [newSections, setNewSections] = useState<string[]>(['A']);
    const [academicYear, setAcademicYear] = useState(''); 
    const [subjectRows, setSubjectRows] = useState([{ name: '', code: '' }]);

    // Edit States
    const [editingClass, setEditingClass] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { profile } = useAuth();

    useEffect(() => {
        if (schoolId) fetchCurrentStructure();
    }, [schoolId]);

    const fetchCurrentStructure = async () => {
        setLoading(true);
        try {
            const { data: classes, error } = await supabase
                .from('school_classes')
                .select('*')
                .eq('school_id', schoolId)
                .order('class_name', { ascending: true });

            if (!error && classes) {
                setActiveClasses(classes);
                const { data: subData } = await supabase.from('class_subjects').select('class_id').eq('school_id', schoolId);
                const counts: Record<string, number> = {};
                subData?.forEach(s => { counts[s.class_id] = (counts[s.class_id] || 0) + 1; });
                setClassSubjectCounts(counts);
            }
        } finally {
            setLoading(false);
        }
    };

    const groupedClasses = activeClasses.reduce((acc: any, curr) => {
        if (!acc[curr.class_name]) acc[curr.class_name] = [];
        acc[curr.class_name].push(curr);
        return acc;
    }, {});

    const addRow = () => setSubjectRows([...subjectRows, { name: '', code: '' }]);
    const updateRow = (index: number, field: 'name' | 'code', value: string) => {
        const updated = [...subjectRows];
        updated[index][field] = value.toUpperCase();
        setSubjectRows(updated);
    };
    const removeRow = (index: number) => {
        if (subjectRows.length > 1) setSubjectRows(subjectRows.filter((_, i) => i !== index));
    };

    const copySubjectsFromClass = async (fromClassName: string) => {
        if (!fromClassName) return;
        const referenceUnit = groupedClasses[fromClassName][0];
        const { data, error } = await supabase
            .from('class_subjects')
            .select('subject_name, subject_code')
            .eq('class_id', referenceUnit.id);

        if (!error && data && data.length > 0) {
            const clonedRows = data.map(d => ({ name: d.subject_name, code: d.subject_code }));
            setSubjectRows(clonedRows);
            toast.success(`Subjects copied from ${fromClassName}!`);
        }
    };

    // --- Validation Logic ---
    const validateAcademicYear = (year: string) => {
        const regex = /^\d{4}-\d{4}$/;
        return regex.test(year);
    };

    const addNewClass = async () => {
        if (!newClassName.trim()) return toast.error("Enter a class name");
        if (!validateAcademicYear(academicYear)) return toast.error("Academic Year must be YYYY-YYYY format (e.g. 2025-2026)");

        try {
            setLoading(true);
            const classPayload = newSections.map(sec => ({
                school_id: schoolId,
                class_name: newClassName.trim().toUpperCase(),
                section: sec.toUpperCase().trim(),
                academic_year: academicYear // Added to Payload
            }));

            const { data: savedClasses, error: classError } = await supabase
                .from('school_classes')
                .insert(classPayload)
                .select();

            if (classError) throw classError;

            const validSubjects = subjectRows.filter(s => s.name.trim() && s.code.trim());
            if (validSubjects.length > 0) {
                const subjectPayload: any[] = [];
                savedClasses?.forEach(savedClass => {
                    validSubjects.forEach(sub => {
                        subjectPayload.push({
                            school_id: schoolId,
                            class_id: savedClass.id,
                            subject_name: sub.name,
                            subject_code: sub.code
                        });
                    });
                });
                await supabase.from('class_subjects').insert(subjectPayload);
            }

            fetchCurrentStructure();
            setNewClassName('');
            setNewSections(['A']);
            setSubjectRows([{ name: '', code: '' }]);
            toast.success("Infrastructure Created!");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Modal logic remains same...
    const openEditModal = async (unit: any) => {
        setEditingClass(unit);
        const { data } = await supabase.from('class_subjects').select('subject_name, subject_code').eq('class_id', unit.id);
        setSubjectRows(data && data.length > 0 ? data.map(d => ({ name: d.subject_name, code: d.subject_code })) : [{ name: '', code: '' }]);
        setIsEditModalOpen(true);
    };

    const saveEditedSubjects = async () => {
        if (!editingClass) return;
        const validSubjects = subjectRows.filter(s => s.name.trim() && s.code.trim());
        try {
            setLoading(true);
            await supabase.from('class_subjects').delete().eq('class_id', editingClass.id);
            if (validSubjects.length > 0) {
                const payload = validSubjects.map(s => ({ school_id: schoolId, class_id: editingClass.id, subject_name: s.name, subject_code: s.code }));
                await supabase.from('class_subjects').insert(payload);
            }
            toast.success("Mapping Updated");
            setIsEditModalOpen(false);
            fetchCurrentStructure();
        } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="space-y-8 md:space-y-12 text-left pb-24 max-w-7xl mx-auto p-3 md:p-8 bg-[#F8FAFC]">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-10 rounded-[35px] md:rounded-[50px] shadow-sm border border-white gap-6">
                <div className="space-y-2 text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-1 bg-blue-600 rounded-full"></div>
                        <h4 className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-[4px]">{profile?.schools?.name}</h4>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Campus <span className="text-blue-700">Infrastructure</span></h1>
                    <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[2px] md:tracking-[3px] mt-2">Grades, Sections & Academic Years</p>
                </div>
                <div className="p-4 md:p-5 bg-slate-900 text-white rounded-[25px] md:rounded-[35px] shadow-2xl shrink-0"><Building2 size={28} /></div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Left Form: Builder */}
                <div className="lg:col-span-1 bg-white p-6 md:p-10 rounded-[35px] md:rounded-[50px] shadow-xl border border-slate-50 space-y-8 text-left">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Name</label>
                            <input placeholder="e.g. 10TH GRADE" className="w-full p-4 md:p-5 bg-slate-50 border-2 border-transparent rounded-[24px] md:rounded-[28px] outline-none font-black text-slate-700 shadow-inner text-sm focus:border-blue-600 focus:bg-white transition-all" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                        </div>
                        
                        {/* New Academic Year Field */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    placeholder="2025-2026" 
                                    className="w-full p-4 pl-12 md:p-5 md:pl-14 bg-slate-50 border-2 border-transparent rounded-[24px] md:rounded-[28px] outline-none font-black text-slate-700 shadow-inner text-sm focus:border-blue-600 focus:bg-white transition-all" 
                                    value={academicYear} 
                                    maxLength={9}
                                    onChange={(e) => setAcademicYear(e.target.value)} 
                                />
                            </div>
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest ml-1">Format: YYYY-YYYY</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sections</label>
                            <input placeholder="A, B, C..." className="w-full p-4 md:p-5 bg-slate-50 border-2 border-transparent rounded-[24px] md:rounded-[28px] outline-none font-black text-slate-700 shadow-inner uppercase text-sm focus:border-blue-600 focus:bg-white transition-all" value={newSections.join(', ')} onChange={(e) => setNewSections(e.target.value.split(',').map(s => s.trim()))} />
                        </div>
                    </div>
                    <button onClick={addNewClass} disabled={loading} className="w-full py-5 md:py-6 bg-slate-900 text-white rounded-[25px] md:rounded-[30px] font-black uppercase text-[10px] md:text-[11px] tracking-[3px] md:tracking-[4px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />} Create Class
                    </button>
                </div>

                {/* Right Area: Map Subjects remains same... */}
                <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[35px] md:rounded-[50px] shadow-xl border border-slate-50 text-left">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h3 className="text-md md:text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                            <BookOpen className="text-blue-600" size={20}/> Map Subjects
                        </h3>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {Object.keys(groupedClasses).length > 0 && (
                                <div className="flex-1 sm:flex-none relative flex items-center gap-2 bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 shadow-inner">
                                    <Copy size={14} className="text-slate-400"/>
                                    <select 
                                        onChange={(e) => copySubjectsFromClass(e.target.value)}
                                        className="bg-transparent text-[10px] font-black uppercase text-slate-600 outline-none cursor-pointer w-full"
                                    >
                                        <option value="">Clone Existing...</option>
                                        {Object.keys(groupedClasses).map(cls => (
                                            <option key={cls} value={cls}>{cls}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <button onClick={addRow} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100">
                                <Plus size={20}/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                        {subjectRows.map((row, index) => (
                            <div key={index} className="flex gap-2 md:gap-3 items-center bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                                <input placeholder="Subject Name" className="flex-1 p-3 bg-white border-2 border-transparent rounded-xl text-xs font-bold outline-none focus:border-blue-200 shadow-sm" value={row.name} onChange={(e) => updateRow(index, 'name', e.target.value)} />
                                <input placeholder="Code" className="w-20 md:w-28 p-3 bg-white border-2 border-transparent rounded-xl text-xs font-bold outline-none text-center shadow-sm" value={row.code} onChange={(e) => updateRow(index, 'code', e.target.value)} />
                                <button onClick={() => removeRow(index)} className="p-2 text-slate-300 hover:text-red-500 shrink-0"><X size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Blueprint View: Dynamic Skeletons */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-2">
                    <div className="p-2 bg-slate-900 rounded-lg shrink-0"><Layers size={14} className="text-white" /></div>
                    <h2 className="text-[10px] md:text-[12px] font-black uppercase tracking-[3px] md:tracking-[5px] text-slate-400 ">Campus Blueprint</h2>
                    <div className="flex-1 h-[1px] bg-slate-200 shadow-inner"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => <CardSkeleton key={i} />)
                    ) : Object.keys(groupedClasses).map((className) => (
                        <motion.div layout key={className} className="bg-white p-6 md:p-8 rounded-[35px] md:rounded-[45px] border-2 border-slate-50 shadow-sm flex flex-col gap-6 group hover:shadow-2xl hover:border-blue-100 transition-all text-left">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100"><Building2 size={24} /></div>
                                    <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tighter uppercase">{className}</h3>
                                </div>
                                {/* Badge for Academic Year in View */}
                                <span className="px-3 py-1 bg-slate-900 text-white text-[8px] font-black rounded-full uppercase tracking-tighter">
                                    {groupedClasses[className][0].academic_year}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {groupedClasses[className].map((unit: any) => (
                                    <div key={unit.id} className="bg-slate-50 border border-slate-100 p-4 rounded-[22px] flex justify-between items-center hover:bg-white hover:shadow-md transition-all group/unit">
                                        <div className="text-left">
                                            <p className="text-xs font-black text-slate-700 uppercase">Section {unit.section}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-1">
                                                <BookOpen size={10}/> Subjects: {classSubjectCounts[unit.id] || 0}
                                            </p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover/unit:opacity-100 transition-opacity">
                                            <button onClick={() => openEditModal(unit)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={16} /></button>
                                            <button onClick={async () => { if(window.confirm('Delete section?')) { await supabase.from('school_classes').delete().eq('id', unit.id); fetchCurrentStructure(); } }} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
            
            {/* Modal code remains largely unchanged... */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className="bg-white w-full max-w-xl rounded-[35px] md:rounded-[45px] p-6 md:p-10 shadow-2xl relative z-10 text-left border-4 border-white">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight ">Configure <span className="text-blue-700">Subjects</span></h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><X size={24}/></button>
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 mb-8 custom-scrollbar no-scrollbar">
                                {subjectRows.map((row, index) => (
                                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                        <input placeholder="Subject" className="flex-1 p-3 bg-white rounded-xl text-xs font-black outline-none shadow-sm border-2 border-transparent focus:border-blue-600 transition-all" value={row.name} onChange={(e) => updateRow(index, 'name', e.target.value)} />
                                        <input placeholder="Code" className="w-20 md:w-24 p-3 bg-white rounded-xl text-xs font-black outline-none text-center shadow-sm border-2 border-transparent focus:border-blue-600 transition-all" value={row.code} onChange={(e) => updateRow(index, 'code', e.target.value)} />
                                        <button onClick={() => removeRow(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                ))}
                                <button onClick={addRow} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:border-blue-600 hover:text-blue-700 transition-all bg-slate-50/50">+ Add Subject Row</button>
                            </div>
                            <button onClick={saveEditedSubjects} className="w-full py-5 bg-slate-900 text-white rounded-[22px] font-black uppercase text-[11px] tracking-[4px] shadow-2xl hover:bg-blue-700 transition-all">Save Mapping</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}