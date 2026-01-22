import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Plus, Trash2, Building2, Layers, X, PlusCircle, BookOpen, Sparkles, Hash, Edit3, Save, Loader2, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthProvider';
import toast from 'react-hot-toast';

export function SchoolInfrastructure({ schoolId }: { schoolId: string }) {
  const [loading, setLoading] = useState(true);
  const [activeClasses, setActiveClasses] = useState<any[]>([]);
  const [classSubjectCounts, setClassSubjectCounts] = useState<Record<string, number>>({});
  
  // States
  const [newClassName, setNewClassName] = useState('');
  const [newSections, setNewSections] = useState<string[]>(['A']);
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
    setLoading(false);
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

  // --- NEW CLONE FUNCTIONALITY ---
  const copySubjectsFromClass = async (fromClassName: string) => {
    if (!fromClassName) return;
    
    // Get the first section of the selected class to pull subjects
    const referenceUnit = groupedClasses[fromClassName][0];
    
    const { data, error } = await supabase
      .from('class_subjects')
      .select('subject_name, subject_code')
      .eq('class_id', referenceUnit.id);

    if (!error && data && data.length > 0) {
      const clonedRows = data.map(d => ({
        name: d.subject_name,
        code: d.subject_code
      }));
      setSubjectRows(clonedRows);
      toast.success(`Subjects copied from ${fromClassName}!`);
    } else {
      toast.error("No subjects found in the selected class");
    }
  };

  const addNewClass = async () => {
    if (!newClassName.trim()) return toast.error("Enter a class name");
    
    try {
      setLoading(true);
      const classPayload = newSections.map(sec => ({
        school_id: schoolId,
        class_name: newClassName.trim().toUpperCase(),
        section: sec.toUpperCase().trim()
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
      toast.success("Class Infrastructure Created!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="space-y-12 text-left pb-24 max-w-7xl mx-auto p-4 md:p-8 bg-[#F8FAFC]">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-10 rounded-[50px] shadow-sm border border-white">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 bg-blue-600 rounded-full"></div>
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[4px]">{profile?.schools?.name}</h4>
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none ">Campus <span className="text-[#8DC63F]">Infrastructure</span></h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[3px] mt-2">Design Grades, Sections & Subject Mappings</p>
        </div>
        <div className="p-5 bg-slate-900 text-white rounded-[35px] shadow-2xl"><Building2 size={32} /></div>
      </header>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form */}
        <div className="lg:col-span-1 bg-white p-10 rounded-[50px] shadow-xl border border-slate-50 space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Name</label>
              <input placeholder="e.g. 10TH GRADE" className="w-full p-5 bg-slate-50 border-none rounded-[28px] outline-none font-black text-slate-700 shadow-inner text-sm" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sections</label>
              <input placeholder="A, B, C..." className="w-full p-5 bg-slate-50 border-none rounded-[28px] outline-none font-black text-slate-700 shadow-inner uppercase text-sm" value={newSections.join(', ')} onChange={(e) => setNewSections(e.target.value.split(',').map(s => s.trim()))} />
            </div>
          </div>
          <button onClick={addNewClass} disabled={loading} className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black uppercase text-[11px] tracking-[4px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <PlusCircle size={20} />} Create class
          </button>
        </div>

        {/* Optional Subject Mapping with Clone Option */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[50px] shadow-xl border border-slate-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <BookOpen className="text-blue-600" size={20}/> Map Subjects
            </h3>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* CLONE DROPDOWN */}
              {Object.keys(groupedClasses).length > 0 && (
                <div className="relative flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                  <Copy size={14} className="text-slate-400"/>
                  <select 
                    onChange={(e) => copySubjectsFromClass(e.target.value)}
                    className="bg-transparent text-[10px] font-black uppercase text-slate-500 outline-none cursor-pointer"
                  >
                    <option value="">Clone From...</option>
                    {Object.keys(groupedClasses).map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              )}
              <button onClick={addRow} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                <Plus size={18}/>
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {subjectRows.map((row, index) => (
              <div key={index} className="flex gap-3 items-center bg-slate-50/50 p-2 rounded-2xl">
                <input placeholder="Subject" className="flex-1 p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-200 shadow-sm" value={row.name} onChange={(e) => updateRow(index, 'name', e.target.value)} />
                <input placeholder="Code" className="w-24 p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none text-center shadow-sm" value={row.code} onChange={(e) => updateRow(index, 'code', e.target.value)} />
                <button onClick={() => removeRow(index)} className="p-2 text-slate-300 hover:text-red-500"><X size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blueprint View */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-2">
          <div className="p-2 bg-slate-900 rounded-lg"><Layers size={14} className="text-white" /></div>
          <h2 className="text-[12px] font-black uppercase tracking-[5px] text-slate-400 ">Campus Blueprint</h2>
          <div className="flex-1 h-[1px] bg-slate-200 shadow-inner"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(groupedClasses).map((className) => (
            <motion.div layout key={className} className="bg-white p-8 rounded-[45px] border border-slate-50 shadow-sm flex flex-col gap-6 group hover:shadow-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Building2 size={24} /></div>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">{className}</h3>
              </div>
              <div className="space-y-3">
                {groupedClasses[className].map((unit: any) => (
                  <div key={unit.id} className="bg-slate-50 border border-slate-100 p-4 rounded-3xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-slate-700 uppercase">SEC {unit.section}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-1">
                        <BookOpen size={10}/> Subjects: {classSubjectCounts[unit.id] || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(unit)} className="p-2 text-blue-500 hover:bg-white rounded-xl shadow-sm transition-all"><Edit3 size={16} /></button>
                      <button onClick={async () => { if(window.confirm('Delete?')) { await supabase.from('school_classes').delete().eq('id', unit.id); fetchCurrentStructure(); } }} className="p-2 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white w-full max-w-xl rounded-[40px] p-8 shadow-2xl relative z-10">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-black text-slate-800 uppercase ">Configure Subjects</h2>
                   <button onClick={() => setIsEditModalOpen(false)}><X size={24} className="text-slate-300 hover:text-red-500"/></button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 mb-6">
                   {subjectRows.map((row, index) => (
                    <div key={index} className="flex gap-3 items-center bg-slate-50 p-2 rounded-2xl">
                        <input placeholder="Subject" className="flex-1 p-3 bg-white rounded-xl text-xs font-bold outline-none shadow-sm" value={row.name} onChange={(e) => updateRow(index, 'name', e.target.value)} />
                        <input placeholder="Code" className="w-24 p-3 bg-white rounded-xl text-xs font-bold outline-none text-center shadow-sm" value={row.code} onChange={(e) => updateRow(index, 'code', e.target.value)} />
                        <button onClick={() => removeRow(index)} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                   ))}
                   <button onClick={addRow} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all">+ Add New Subject</button>
                </div>
                <button onClick={saveEditedSubjects} className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase text-[10px] tracking-[4px] shadow-xl hover:bg-blue-600 transition-all">Save Mapping</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Logic components
const Loader2 = ({ className, size }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

const Split = ({ size, className }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22V12"/><path d="M21 3l-9 9"/><path d="M3 3l9 9"/></svg>
);