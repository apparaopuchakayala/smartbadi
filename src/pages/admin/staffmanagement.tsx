import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  Building2, Users, Mail, Trash2, 
  Loader2, X, Plus, Search, 
  ChevronRight, UserCheck, Crown, ShieldAlert, 
  Key, Hash, Phone, Calendar, BookOpen, Check, GraduationCap, User, Fingerprint, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function StaffManagement() {
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '', email: '', encrypted_password: '', role: 'teacher',
    employee_id: '', mobile_number: '', dob: '', subject_teaching: ''
  });

  const [mandatoryFields, setMandatoryFields] = useState<any>({
    full_name: true, email: true, encrypted_password: true,
    employee_id: false, mobile_number: false, dob: false, subject_teaching: false
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);

  useEffect(() => { 
    fetchSchools(); 
    const savedSchool = localStorage.getItem('lastSelectedSchool');
    if (savedSchool) {
      try { fetchStaff(JSON.parse(savedSchool)); } 
      catch (e) { localStorage.removeItem('lastSelectedSchool'); }
    }
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name');
    if (data) setSchools(data);
    setLoading(false);
  };

  const fetchStaff = async (school: any) => {
    setSelectedSchool(school);
    localStorage.setItem('lastSelectedSchool', JSON.stringify(school));
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', school.id)
      .neq('role', 'super-admin');
    setStaff(data || []);
    setLoading(false);
  };

  const toggleMandatory = (field: string) => {
    setMandatoryFields((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleRoleChange = (role: string) => {
    setFormData({ ...formData, role });
    // Mandatory logic remains: Teacher auto-checks all, others reset
    if (role === 'teacher') {
      setMandatoryFields({
        full_name: true, email: true, encrypted_password: true,
        employee_id: true, mobile_number: true, dob: true, subject_teaching: true
      });
    } else {
      setMandatoryFields({
        full_name: true, email: true, encrypted_password: true,
        employee_id: false, mobile_number: false, dob: false, subject_teaching: false
      });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const key in mandatoryFields) {
        if (mandatoryFields[key] && !formData[key as keyof typeof formData]) {
          toast.error(`${key.toUpperCase().replace('_', ' ')} IS REQUIRED`);
          return;
        }
    }
    setIsSaving(true);
    try {
        const { error } = await supabase.from('profiles').insert([{ ...formData, school_id: selectedSchool.id }]);
        if (error) throw error;
        toast.success("ACCOUNT SUCCESSFULLY CREATED");
        setShowAddModal(false);
        fetchStaff(selectedSchool);
    } catch (err: any) { toast.error(err.message); } 
    finally { setIsSaving(false); }
  };

  const processDelete = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('profiles').delete().eq('id', memberToDelete.id);
    if (!error) {
        toast.success("RECORD REMOVED");
        fetchStaff(selectedSchool);
        setShowDeleteConfirm(false);
    } else { toast.error("DELETION FAILED"); }
    setIsSaving(false);
  };

  const togglePermission = async (profileId: string, currentStatus: any, field: string) => {
    const { error } = await supabase.from('profiles').update({ [field]: !currentStatus }).eq('id', profileId);
    if (!error) fetchStaff(selectedSchool);
  };

  const filteredStaff = staff.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-12 max-w-7xl mx-auto text-left min-h-screen bg-white">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-light text-slate-800 tracking-tight uppercase">Directory</h1>
          <p className="text-slate-400 font-medium text-[10px] tracking-[3px] uppercase mt-1">
            {selectedSchool ? `${selectedSchool.name}` : 'Select Institution'}
          </p>
        </div>
        
        {selectedSchool && (
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                    placeholder="Search records..." 
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-blue-200 transition-all text-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-6 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
              <Plus size={16} /> Add Entry
            </button>
            <button onClick={() => { setSelectedSchool(null); localStorage.removeItem('lastSelectedSchool'); }} className="bg-slate-50 text-slate-400 px-5 py-3.5 rounded-xl transition-all hover:text-slate-800">
              <ChevronRight className="rotate-180" size={18}/>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedSchool ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map(school => (
              <div 
                key={school.id} onClick={() => fetchStaff(school)}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Building2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-1">{school.name}</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{school.location}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            <DirectorySection title="Administrators" icon={<Crown size={16}/>} list={filteredStaff.filter(u => u.role === 'school-admin')} accent="border-blue-100" onDelete={(m: any) => { setMemberToDelete(m); setShowDeleteConfirm(true); }} />
            <DirectorySection title="Teaching Faculty" icon={<Users size={16}/>} list={filteredStaff.filter(u => u.role === 'teacher')} accent="border-slate-100" onDelete={(m: any) => { setMemberToDelete(m); setShowDeleteConfirm(true); }} onToggle={togglePermission} />
            <DirectorySection title="Students" icon={<GraduationCap size={16}/>} list={filteredStaff.filter(u => u.role === 'student')} accent="border-slate-100" onDelete={(m: any) => { setMemberToDelete(m); setShowDeleteConfirm(true); }} />
            <DirectorySection title="Parents" icon={<User size={16}/>} list={filteredStaff.filter(u => u.role === 'parent')} accent="border-slate-100" onDelete={(m: any) => { setMemberToDelete(m); setShowDeleteConfirm(true); }} />
          </div>
        )}
      </AnimatePresence>

      {/* REFINED ADD MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-3xl rounded-[32px] p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100">
              
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-light tracking-tight text-slate-800 uppercase">Create <span className="font-bold text-blue-600">Entry</span></h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-800 transition-colors"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleAddUser} className="space-y-10">
                {/* ROLE DROPDOWN SELECTION */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account Role</label>
                    <div className="relative">
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-700 appearance-none focus:bg-white focus:border-blue-200 transition-all cursor-pointer" value={formData.role} onChange={e => handleRoleChange(e.target.value)}>
                            <option value="school-admin">School Administrator</option>
                            <option value="teacher">Teaching Staff</option>
                            <option value="student">Active Student</option>
                            <option value="parent">Parent/Guardian</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                  <FormInput label="Full Name" value={formData.full_name} onChange={(v: string) => setFormData({...formData, full_name: v})} isReq={mandatoryFields.full_name} onToggle={() => toggleMandatory('full_name')} />
                  <FormInput label="Email Address" value={formData.email} type="email" onChange={(v: string) => setFormData({...formData, email: v})} isReq={mandatoryFields.email} onToggle={() => toggleMandatory('email')} />
                  <FormInput label="Account Password" value={formData.encrypted_password} type="password" onChange={(v: string) => setFormData({...formData, encrypted_password: v})} isReq={mandatoryFields.encrypted_password} onToggle={() => toggleMandatory('encrypted_password')} />
                  <FormInput label="ID Number" value={formData.employee_id} onChange={(v: string) => setFormData({...formData, employee_id: v})} isReq={mandatoryFields.employee_id} onToggle={() => toggleMandatory('employee_id')} />
                  <FormInput label="Mobile" value={formData.mobile_number} onChange={(v: string) => setFormData({...formData, mobile_number: v})} isReq={mandatoryFields.mobile_number} onToggle={() => toggleMandatory('mobile_number')} />
                  <FormInput label="Birth Date" value={formData.dob} type="date" onChange={(v: string) => setFormData({...formData, dob: v})} isReq={mandatoryFields.dob} onToggle={() => toggleMandatory('dob')} />
                  <FormInput label="Subject / Grade" value={formData.subject_teaching} onChange={(v: string) => setFormData({...formData, subject_teaching: v})} isReq={mandatoryFields.subject_teaching} onToggle={() => toggleMandatory('subject_teaching')} />
                </div>

                <button disabled={isSaving} type="submit" className="w-full py-5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-[3px] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4">
                  {isSaving ? <Loader2 className="animate-spin" size={20}/> : `Confirm Registration`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE WARNING */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-3xl p-10 text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><ShieldAlert size={32} /></div>
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-2">Delete Record</h2>
              <p className="text-slate-400 text-sm font-medium mb-8">This action will remove {memberToDelete?.full_name} permanently.</p>
              <div className="flex gap-4">
                <button onClick={processDelete} className="flex-1 py-4 bg-red-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-red-100 hover:bg-red-600 transition-all">Delete</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// MINIMAL DIRECTORY SECTION
function DirectorySection({ title, icon, list, accent, onDelete, onToggle }: any) {
  if (list.length === 0) return null;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-1">
        <span className="text-slate-300">{icon}</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[4px] text-slate-400">{title}</h2>
        <div className="flex-1 h-[1px] bg-slate-100 ml-4"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {list.map((m: any) => (
          <div key={m.id} className={`bg-white rounded-2xl border ${accent} p-6 flex flex-col shadow-sm hover:shadow-md transition-all group relative`}>
            <div className="flex items-start justify-between mb-6">
                <div className="w-11 h-11 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center group-hover:text-blue-600 transition-colors">
                    {m.role === 'student' ? <GraduationCap size={20}/> : m.role === 'parent' ? <User size={20}/> : <Fingerprint size={20}/>}
                </div>
                <button onClick={() => onDelete(m)} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
            </div>
            
            <h3 className="text-base font-bold text-slate-800 tracking-tight truncate">{m.full_name}</h3>
            <p className="text-[11px] font-medium text-slate-400 mb-6 truncate">{m.email}</p>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-300 uppercase">ID No.</p>
                    <p className="text-[11px] font-bold text-slate-600 uppercase">{m.employee_id || '---'}</p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-300 uppercase">Assignment</p>
                    <p className="text-[11px] font-bold text-slate-600 uppercase truncate">{m.subject_teaching || 'General'}</p>
                </div>
            </div>

            {m.role === 'teacher' && (
                <div className="flex gap-2 mt-6">
                    <button onClick={() => onToggle(m.id, m.can_manage_attendance, 'can_manage_attendance')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold border transition-all ${m.can_manage_attendance ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>Attendance</button>
                    <button onClick={() => onToggle(m.id, m.can_view_results, 'can_view_results')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold border transition-all ${m.can_view_results ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>Results</button>
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// MINIMAL FORM INPUT
function FormInput({ label, value, onChange, type = "text", isReq, onToggle }: any) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        <button type="button" onClick={onToggle} className="flex items-center gap-1.5 group/req">
            <span className={`text-[8px] font-bold transition-colors ${isReq ? 'text-blue-500' : 'text-slate-200'}`}>REQ</span>
            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${isReq ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                {isReq && <Check size={8} className="text-white" strokeWidth={4} />}
            </div>
        </button>
      </div>
      <input 
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium transition-all ${isReq && !value ? 'border-red-100 bg-red-50/10' : 'focus:bg-white focus:border-blue-200 focus:ring-4 ring-blue-500/5'}`}
      />
    </div>
  );
}