import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
  Building2, Users, Mail, Trash2,
  Loader2, X, Plus, Search,
  ChevronRight, Crown, ShieldAlert,
  GraduationCap, User, Fingerprint, ChevronDown, Check,
  School
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { smartBadiApi } from '../../services/smartBadiApi.ts';

export function StaffManagement() {
  const { session, profile } = useAuth();

  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
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
    if (profile && profile.role !== 'super-admin' && profile.schools) {
      const mySchool = {
        id: profile.school_id,
        name: profile.schools.name,
        location: profile.schools.location
      };
      fetchStaff(mySchool);
    } else {
      fetchSchools();
      const savedSchool = localStorage.getItem('lastSelectedSchool');
      if (savedSchool) {
        try {
          const parsed = JSON.parse(savedSchool);
          fetchStaff(parsed);
        } catch (e) { localStorage.removeItem('lastSelectedSchool'); }
      }
    }
  }, [profile]);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          profiles(role , school_id)
        `)
        .order('name');

      if (error) throw error;

      if (data) {
        setSchools(data);
      }
    } catch (err: any) {
      console.error("Fetch Error:", err.message);
      toast.error("Failed to sync institution records");
    } finally {
      if (!localStorage.getItem('lastSelectedSchool')) setLoading(false);
    }
  };

  const fetchStaff = async (school: any) => {
    setSelectedSchool(school);
    if (profile?.role === 'super-admin') {
      localStorage.setItem('lastSelectedSchool', JSON.stringify(school));
    }

    setLoading(true);
    try {
      const data = await smartBadiApi.getProfiles(school.id);
      setStaff(data.filter((p: any) => p.role !== 'super-admin'));
    } catch (err: any) {
      console.error("Staff Fetch Error:", err.message);
      toast.error("Failed to fetch staff records");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: string) => {
    setFormData({ ...formData, role });
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

  const toggleMandatory = (field: string) => {
    setMandatoryFields((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await smartBadiApi.registerStaffOrStudent({
        email: formData.email,
        password: formData.encrypted_password,
        profileData: { ...formData, role: formData.role }
      });
      toast.success("Success!");
      setShowAddModal(false);
      fetchStaff(selectedSchool);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const processDelete = async () => {
    setIsSaving(true);
    try {
      console.log("Deleting User via Edge Function...");
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { target_id: memberToDelete.id }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success("USER DELETED PERMANENTLY");
      fetchStaff(selectedSchool);
      if (profile?.role === 'super-admin') fetchSchools();
      setShowDeleteConfirm(false);

    } catch (err: any) {
      console.error("Delete Error:", err);
      toast.error("Failed to delete user from Auth");
    } finally {
      setIsSaving(false);
    }
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
    <div className="space-y-12 text-left min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-light text-slate-800 tracking-tight uppercase">Global Staff management</h1>
          <p className="text-slate-400 font-medium text-[12px] tracking-[3px] uppercase mt-1 ml-1.5">
            {selectedSchool ? `${selectedSchool.name}` : 'Select Institution'}
          </p>
        </div>

        {selectedSchool && (
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                placeholder="Search records..."
                className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-100 rounded-xl outline-none focus:border-blue-200 transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-6 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
              <Plus size={16} /> Add Entry
            </button>
            {profile?.role === 'super-admin' && (
              <button onClick={() => { setSelectedSchool(null); localStorage.removeItem('lastSelectedSchool'); }} className="bg-white text-slate-400 px-5 py-3.5 rounded-xl transition-all hover:text-slate-800 border border-slate-100">
                <ChevronRight className="rotate-180" size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedSchool && profile?.role === 'super-admin' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map(school => {
              const adminCount = school.profiles?.filter((p: any) => p.role === 'school-admin').length || 0;
              const teacherCount = school.profiles?.filter((p: any) => p.role === 'teacher').length || 0;
              const studentCount = school.profiles?.filter((p: any) => p.role === 'student').length || 0;
              const parentCount = school.profiles?.filter((p: any) => p.role === 'parent').length || 0;

              return (
                <div
                  key={school.id} onClick={() => fetchStaff(school)}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg cursor-pointer transition-all group relative overflow-hidden"
                >
                  <School className="absolute -right-4 -bottom-4 text-slate-50 group-hover:text-blue-50 transition-colors" size={120} strokeWidth={0.5} />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <Building2 size={24} />
                      </div>
                      <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{school.location}</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-6 pr-2 line-clamp-1">{school.name}</h3>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center group-hover:border-blue-100 transition-colors">
                        <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                          <Crown size={12} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Admins</span>
                        </div>
                        <span className="text-lg font-black text-slate-700">{adminCount}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center group-hover:border-blue-100 transition-colors">
                        <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                          <Users size={12} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Teachers</span>
                        </div>
                        <span className="text-lg font-black text-slate-700">{teacherCount}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between text-slate-400 pr-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap size={14} /> Students
                        </span>
                        <span className="text-xs font-bold text-slate-600">{studentCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 pl-4 border-l border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <User size={14} /> Parents
                        </span>
                        <span className="text-xs font-bold text-slate-600">{parentCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-16">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" size={40} /></div>
            ) : (
              <>
                <DirectorySection title="Administrators" icon={<Crown size={16} />} list={filteredStaff.filter(u => u.role === 'school-admin')} accent="border-blue-100" onDelete={(m: any) => { setMemberToDelete(m); setShowDeleteConfirm(true); }} />
                <DirectorySection title="Teaching Faculty" icon={<Users size={16} />} list={filteredStaff.filter(u => u.role === 'teacher')} accent="border-slate-100" onDelete={(m: any) => { setMemberToDelete(m); setShowDeleteConfirm(true); }} onToggle={togglePermission} />
                <DirectorySection title="Students" icon={<GraduationCap size={16} />} list={filteredStaff.filter(u => u.role === 'student')} accent="border-slate-100" onDelete={(m: any) => { setMemberToDelete(m); setShowDeleteConfirm(true); }} />
                <DirectorySection title="Parents" icon={<User size={16} />} list={filteredStaff.filter(u => u.role === 'parent')} accent="border-slate-100" onDelete={(m: any) => { setMemberToDelete(m); setShowDeleteConfirm(true); }} />
              </>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* ADD USER MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-3xl rounded-[32px] p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-light tracking-tight text-slate-800 ">Create entry for <span className="font-bold text-blue-600">{selectedSchool.name}</span></h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-800 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-10">
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
                  <FormInput label="Full Name" value={formData.full_name} onChange={(v: string) => setFormData({ ...formData, full_name: v })} isReq={mandatoryFields.full_name} onToggle={() => toggleMandatory('full_name')} />
                  <FormInput label="Email Address" value={formData.email} type="email" onChange={(v: string) => setFormData({ ...formData, email: v })} isReq={mandatoryFields.email} onToggle={() => toggleMandatory('email')} />
                  <FormInput label="Account Password" value={formData.encrypted_password} type="password" onChange={(v: string) => setFormData({ ...formData, encrypted_password: v })} isReq={mandatoryFields.encrypted_password} onToggle={() => toggleMandatory('encrypted_password')} />
                  <FormInput label="ID Number" value={formData.employee_id} onChange={(v: string) => setFormData({ ...formData, employee_id: v })} isReq={mandatoryFields.employee_id} onToggle={() => toggleMandatory('employee_id')} />
                  <FormInput label="Mobile" value={formData.mobile_number} onChange={(v: string) => setFormData({ ...formData, mobile_number: v })} isReq={mandatoryFields.mobile_number} onToggle={() => toggleMandatory('mobile_number')} />
                  <FormInput label="Birth Date" value={formData.dob} type="date" onChange={(v: string) => setFormData({ ...formData, dob: v })} isReq={mandatoryFields.dob} onToggle={() => toggleMandatory('dob')} />
                  <FormInput label="Subject / Grade" value={formData.subject_teaching} onChange={(v: string) => setFormData({ ...formData, subject_teaching: v })} isReq={mandatoryFields.subject_teaching} onToggle={() => toggleMandatory('subject_teaching')} />
                </div>
                <button disabled={isSaving} type="submit" className="w-full py-5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-[3px] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : `Confirm Registration`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM MODAL (UPDATED WITH LOADING) */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-3xl p-10 text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><ShieldAlert size={32} /></div>
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-2">Delete Record</h2>
              <p className="text-slate-400 text-sm font-medium mb-8">This action will remove {memberToDelete?.full_name} permanently.</p>

              <div className="flex gap-4">
                {/* DELETE BUTTON: Added Loading State & Disabled Check */}
                <button
                  onClick={processDelete}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-red-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-red-100 hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Deleting...
                    </>
                  ) : "Delete"}
                </button>

                {/* CANCEL BUTTON: Disabled during saving */}
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DirectorySection({ title, icon, list, accent, onDelete }: any) {
  if (!list || list.length === 0) return null;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-1">
        <span className="text-slate-300">{icon}</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[4px] text-slate-400">{title}</h2>
        <div className="flex-1 h-[1px] bg-slate-100 ml-4"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {list.map((m: any) => {
          const isTeacher = m.role === 'teacher';
          const isStudent = m.role === 'student';

          return (
            <div key={m.id} className={`bg-white rounded-[32px] border ${accent} p-6 flex flex-col shadow-sm hover:shadow-md transition-all group relative`}>

              <div className="flex items-start justify-between mb-6">
                {/* --- PROFILE PIC SECTION --- */}
                <div className="relative">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.full_name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-50 shadow-sm transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}

                  {/* Fallback Icon */}
                  <div className={`${m.avatar_url ? 'hidden' : ''} w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm 
    ${m.role === 'teacher' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                    {m.role === 'student' ? <GraduationCap size={28} /> : <User size={28} />}
                  </div>
                </div>

                <button
                  onClick={() => onDelete(m)}
                  className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-800 tracking-tight truncate">{m.full_name}</h3>
              <p className="text-xs font-medium text-slate-400 mb-6 truncate">{m.email}</p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 mb-6">
                {isTeacher ? (
                  <>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-300 uppercase">Employee ID</p>
                      <p className="text-[11px] font-bold text-slate-600 uppercase">{m.employee_id || '---'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-300 uppercase">Subject</p>
                      <p className="text-[11px] font-bold text-slate-600 uppercase truncate">{m.subject_teaching || 'General'}</p>
                    </div>
                  </>
                ) : isStudent ? (
                  <>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-300 uppercase">Student ID</p>
                      <p className="text-[11px] font-bold text-slate-600 uppercase">{m.roll_number || m.employee_id || '---'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-300 uppercase">Class & Sec</p>
                      <p className="text-[11px] font-bold text-slate-600 uppercase">
                        {m.current_class ? `${m.current_class}-${m.current_section || ''}` : 'Not Set'}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="flex gap-2 mt-auto">
                <button className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                  Edit Profile
                </button>
                {isTeacher ? (
                  <button className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all">
                    Details
                  </button>
                ) : (
                  <button onClick={() => onDelete(m)} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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