import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    validateEmail,
    validatePassword,
    validateMobile,
    validateAlpha,
    validateNumeric,
    validateStrictDate,
    getPasswordStrength
} from '../../components/utilitis/validation.ts';
import {
    Users, Mail, Trash2, Loader2, X, Plus, Search,
    Crown, ShieldAlert, GraduationCap,
    User, Lock, Building2, Calendar, BookOpen,
    UserCircle, Users2, ShieldCheck, Phone, IdCard, Edit3, Droplets
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';


type UserRole = 'teacher' | 'student' | 'parent' | 'school-admin';

export function Staffsetup() {
    const { profile } = useAuth();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<UserRole>('teacher');

    // --- MODAL & EDIT STATES ---
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<any>(null);

    // --- SUBJECT & PAPER COUNT STATES ---
    const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
    const [subjectPaperCount, setSubjectPaperCount] = useState<number>(0);

    const [formData, setFormData] = useState({
        full_name: '', email: '', password: '', role: 'teacher' as UserRole,
        employee_id: '', mobile_number: '', dob: '', subject_teaching: '',
        gender: 'male', date_of_joining: '', blood_group: 'A+', address: ''
    });

    const [pwdStrength, setPwdStrength] = useState(0);

    useEffect(() => {
        if (profile?.school_id) {
            fetchRecords();
            fetchGlobalSubjects();
        }
    }, [profile, activeTab]);

    const fetchRecords = async () => {
        setLoading(true);
        const { data } = await supabase.from('profiles')
            .select('*')
            .eq('school_id', profile.school_id)
            .eq('role', activeTab);
        setStaff(data || []);
        setLoading(false);
    };

    // --- NEW: FETCH GLOBAL SUBJECTS FROM 'subjects' MASTER TABLE ---
    const fetchGlobalSubjects = async () => {
        const { data, error } = await supabase
            .from('class_subjects')
            .select('*')
            .eq('school_id', profile.school_id)
            .order('subject_name');

        if (!error && data) {
            setGlobalSubjects(data);
        }
    };

    // --- NEW: CALCULATE HOW MANY CLASSES HAVE THIS SUBJECT ---
    const calculatePaperCount = async (subjectName: string) => {
        if (!subjectName || subjectName === 'GENERAL') {
            setSubjectPaperCount(0);
            return;
        }

        const { count, error } = await supabase
            .from('class_subjects')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', profile.school_id)
            .eq('subject_name', subjectName);

        if (!error) {
            setSubjectPaperCount(count || 0);
        }
    };

    const handleSubjectChange = (val: string) => {
        setFormData({ ...formData, subject_teaching: val });
        calculatePaperCount(val);
    };

    const handleDateChange = (field: string, value: string) => {
        const cleaned = value.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length > 4) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}`;
        if (cleaned.length > 6) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
        setFormData({ ...formData, [field]: formatted });
    };

    const openEditModal = (member: any) => {
        setIsEditMode(true);
        setEditingMemberId(member.id);
        setFormData({ ...member, password: '' });
        calculatePaperCount(member.subject_teaching);
        setShowAddModal(true);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (activeTab === 'teacher' && !formData.subject_teaching) {
            return toast.error("Please select a subject");
        }

        const errors = [
            validateAlpha(formData.full_name, "Full Name"),
            validateMobile(formData.mobile_number),
            validateNumeric(formData.employee_id, "ID Number"),
            validateStrictDate(formData.dob, "Date of Birth"),
            validateStrictDate(formData.date_of_joining, "Joining Date")
        ];

        if (!isEditMode) {
            errors.push(validateEmail(formData.email));
            errors.push(validatePassword(formData.password));
        }

        const firstError = errors.find(err => err !== null);
        if (firstError) return toast.error(firstError);

        setIsSaving(true);
        const loadId = toast.loading(isEditMode ? "Updating record..." : "Registering...");

        try {
            if (isEditMode) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.full_name,
                        mobile_number: formData.mobile_number,
                        dob: formData.dob,
                        subject_teaching: formData.subject_teaching,
                        gender: formData.gender,
                        date_of_joining: formData.date_of_joining,
                        blood_group: formData.blood_group,
                        employee_id: formData.employee_id
                    })
                    .eq('id', editingMemberId);

                if (updateError) throw updateError;
                toast.success("Profile Updated Successfully", { id: loadId });
            } else {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token;

                const { data, error: funcError } = await supabase.functions.invoke('create-user', {
                    body: {
                        email: formData.email.trim().toLowerCase(),
                        password: formData.password,
                        profileData: { ...formData, role: activeTab, school_id: profile.school_id, is_active: true }
                    },
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (funcError || data?.error) throw new Error(data?.error || funcError.message);
                toast.success("Registration Successful", { id: loadId });
            }

            setShowAddModal(false);
            resetForm();
            fetchRecords();
        } catch (err: any) {
            toast.error(err.message, { id: loadId });
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setIsEditMode(false);
        setEditingMemberId(null);
        setSubjectPaperCount(0);
        setFormData({
            full_name: '', email: '', password: '', role: activeTab,
            employee_id: '', mobile_number: '', dob: '', subject_teaching: '',
            gender: 'male', date_of_joining: '', blood_group: 'A+', address: ''
        });
        setPwdStrength(0);
    };

    const processDelete = async () => {
        setIsSaving(true);
        try {
            const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { target_id: memberToDelete.id }
            });
            if (error || data?.error) throw new Error(data?.error || error.message);
            toast.success("Member Removed Successfully");
            fetchRecords();
            setShowDeleteConfirm(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
            setIsSaving(false);
        }
    };

    const filteredList = staff.filter(s => (s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.email?.toLowerCase().includes(searchQuery.toLowerCase())));

    return (
        <div className="space-y-10 text-left min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end bg-white p-10 rounded-[50px] shadow-sm border border-slate-50">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-1 bg-blue-600 rounded-full"></div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[4px]">{profile?.schools?.name}</h4>
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800">Staff <span className="text-[#8DC63F]">Setup</span></h1>
                </div>
                <div className="flex gap-4 w-full md:w-auto mt-6 md:mt-0">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input placeholder="Search directory..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-[25px] outline-none text-sm font-bold shadow-inner" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-slate-900 text-white px-8 py-4 rounded-[25px] text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-3">
                        <Plus size={18} strokeWidth={3} /> Add {activeTab}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-[24px] w-fit border border-slate-100 overflow-x-auto max-w-full">
                {[
                    { id: 'school-admin', label: 'Admins', icon: <Crown size={14} /> },
                    { id: 'teacher', label: 'Teachers', icon: <Users size={14} /> },
                    { id: 'parent', label: 'Parents', icon: <User size={14} /> }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as UserRole);
                            setFormData(prev => ({ ...prev, role: tab.id as UserRole }));
                        }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[40px] shadow-sm">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="text-[10px] font-black tracking-[4px] text-slate-400 uppercase mt-4">Generating Identity Cards...</p>
                    </div>
                ) : filteredList.length > 0 ? (
                    filteredList.map((m) => (
                        <motion.div layout key={m.id} className="relative bg-white rounded-[20px] shadow-xl overflow-hidden border border-slate-100 flex flex-col min-h-[520px]">
                            <div className="relative h-28 w-full bg-white px-6 pt-4">
                                <div className="absolute top-0 left-0 w-full h-full bg-blue-400" style={{ clipPath: 'polygon(0 0, 75% 0, 0 100%)' }} />
                            </div>
                            <div className="flex justify-center -mt-12 relative z-10">
                                <div className="relative">
                                    <div className="p-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg">
                                        <div className="w-28 h-32 bg-slate-50 overflow-hidden rounded-md flex items-center justify-center text-blue-200">
                                            <UserCircle size={70} strokeWidth={0.5} />
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center">
                                        <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center min-w-[80px]">
                                            <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                                {m.role === 'school-admin' ? 'Admin' : m.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center mt-6 px-4">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{m.full_name}</h2>
                                <div className="w-16 h-[2px] bg-[#8DC63F] mx-auto mt-2"></div>
                            </div>
                            <div className="mt-3 px-8 space-y-3 flex-1 text-left">
                                <div className="flex justify-between items-baseline"><span className="text-[9px] font-black text-slate-800 uppercase">Dept / Sub:</span><span className="text-[10px] font-bold text-slate-600 uppercase truncate ml-2">{m.subject_teaching || m.role}</span></div>
                                <div className="flex justify-between items-baseline"><span className="text-[9px] font-black text-slate-800 uppercase">Blood Group:</span><span className="text-[10px] font-bold text-slate-600 uppercase">{m.blood_group || 'O+'}</span></div>
                                <div className="flex justify-between items-baseline"><span className="text-[9px] font-black text-slate-800 uppercase">Gender:</span><span className="text-[10px] font-bold text-slate-600 uppercase truncate ml-2">{m.gender}</span></div>
                                <div className="flex justify-between items-baseline"><span className="text-[9px] font-black text-slate-800 uppercase">Mobile:</span><span className="text-[10px] font-bold text-slate-600 uppercase truncate ml-2">{m.mobile_number}</span></div>
                                <div className="flex justify-between items-baseline"><span className="text-[9px] font-black text-slate-800 uppercase">EMP ID:</span><span className="text-[10px] font-bold text-slate-600">{m.employee_id || 'ID-00'}</span></div>
                                <div className="flex justify-between items-baseline"><span className="text-[9px] font-black text-slate-800 uppercase">Joining Date:</span><span className="text-[10px] font-bold text-slate-600 uppercase truncate ml-2">{m.date_of_joining}</span></div>
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 mt-auto">
                                <button onClick={() => openEditModal(m)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase shadow-sm border border-blue-50 hover:bg-blue-600 hover:text-white transition-all">
                                    <Edit3 size={14} /> Edit
                                </button>
                                <button onClick={() => { setMemberToDelete(m); setShowDeleteConfirm(true); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-red-500 rounded-2xl text-[10px] font-black uppercase shadow-sm border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[5px]">No Staff Accounts Configured</p>
                    </div>
                )}
            </div>

            {/* Registration/Edit Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="relative bg-[#F8FAFC] w-full max-w-5xl rounded-[60px] shadow-2xl overflow-hidden border border-white flex flex-col max-h-[90vh]">
                            <div className="p-10 bg-white border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-3xl font-black text-slate-800 uppercase ">
                                    {isEditMode ? 'Update' : 'Register'} <span className="text-[#8DC63F]">{activeTab}</span>
                                </h2>
                                <button onClick={() => setShowAddModal(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-red-500 rounded-[20px] transition-all"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <form onSubmit={handleAddUser} className="space-y-8">
                                    <div className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-50 grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-sm">
                                        <FormInput label="Full Name" value={formData.full_name} onChange={(v: string) => setFormData({ ...formData, full_name: v })} icon={<User size={16} />} onKeyPress={(e: any) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} />
                                        <FormSelect label="Gender" options={['male', 'female', 'others']} value={formData.gender} onChange={(v: string) => setFormData({ ...formData, gender: v })} icon={<Users2 size={16} />} />
                                        <FormInput label="Date of Birth" placeholder="YYYY-MM-DD" maxLength={10} value={formData.dob} onChange={(v: string) => handleDateChange('dob', v)} icon={<Calendar size={16} />} />
                                    </div>

                                    {!isEditMode && (
                                        <div className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-sm">
                                            <FormInput label="Email Address" type="email" value={formData.email} onChange={(v: string) => setFormData({ ...formData, email: v })} icon={<Mail size={16} />} />
                                            <FormInput label="Secure Password" type="password" value={formData.password} onChange={(v: string) => { setFormData({ ...formData, password: v }); setPwdStrength(getPasswordStrength(v)); }} icon={<Lock size={16} />} />
                                        </div>
                                    )}

                                    <div className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-50 grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-sm">
                                        <FormInput label="Mobile Number" maxLength={10} value={formData.mobile_number} onChange={(v: string) => setFormData({ ...formData, mobile_number: v })} icon={<Phone size={16} />} onKeyPress={(e: any) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }} />
                                        <FormInput label="Staff/Emp ID" value={formData.employee_id} onChange={(v: string) => setFormData({ ...formData, employee_id: v })} icon={<IdCard size={16} />} onKeyPress={(e: any) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }} />
                                        
                                        {/* --- SUBJECT SELECTION WITH PAPER COUNT --- */}
                                        {/* <div className="flex flex-col gap-2">
                                            <FormSelect 
                                                label="Dept / Subject" 
                                                options={['GENERAL', ...globalSubjects.map(s => s.subject_name.toUpperCase())]} 
                                                value={formData.subject_teaching} 
                                                onChange={handleSubjectChange} 
                                                icon={<BookOpen size={16} />} 
                                            />
                                            <AnimatePresence>
                                                {subjectPaperCount > 0 && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -10 }} 
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="mt-2 ml-4 flex items-center gap-2"
                                                    >
                                                        <div className="px-3 py-1 bg-[#8DC63F]/10 border border-[#8DC63F]/20 rounded-full flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 bg-[#8DC63F] rounded-full animate-pulse"></span>
                                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                                Active in {subjectPaperCount} Classes
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div> */}
                                    </div>

                                    <div className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-sm">
                                        <FormInput label="Joining Date" placeholder="YYYY-MM-DD" maxLength={10} value={formData.date_of_joining} onChange={(v: string) => handleDateChange('date_of_joining', v)} icon={<Calendar size={16} />} />
                                        <FormSelect label="Blood Group" options={['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-']} value={formData.blood_group} onChange={(v: string) => setFormData({ ...formData, blood_group: v })} icon={<Droplets size={16} />} />
                                    </div>

                                    <button disabled={isSaving} className="w-full py-7 bg-slate-900 text-white rounded-[35px] text-[12px] font-black uppercase shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4 active:scale-95">
                                        {isSaving ? <Loader2 className="animate-spin" size={24} /> : <>{isEditMode ? 'Update Identity' : 'Authorize Registration'} <ShieldCheck size={20} /></>}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirm (Same as before) */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-[40px] p-12 text-center shadow-2xl border border-white">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8"><ShieldAlert size={40} /></div>
                            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-3 italic">Terminate Access?</h2>
                            <p className="text-xs text-slate-400 mb-8 font-bold uppercase tracking-widest">Wiping credentials for {memberToDelete?.full_name}</p>
                            <div className="flex gap-4">
                                <button onClick={processDelete} disabled={isSaving} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-100">Confirm</button>
                                <button onClick={() => setShowDeleteConfirm(false)} disabled={isSaving} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- HELPER COMPONENTS ---
function FormInput({ label, value, onChange, type = "text", required, placeholder, maxLength, onKeyPress, icon }: any) {
    return (
        <div className="flex flex-col gap-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">{icon}</div>
                <input type={type} required={required} value={value} placeholder={placeholder} maxLength={maxLength} onKeyPress={onKeyPress} onChange={e => onChange(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[22px] outline-none focus:ring-4 ring-blue-500/5 focus:bg-white focus:border-blue-200 transition-all font-bold text-slate-700 text-sm" />
            </div>
        </div>
    );
}

function FormSelect({ label, options, value, onChange, icon }: any) {
    return (
        <div className="flex flex-col gap-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors z-10">{icon}</div>
                <select value={value} onChange={(e) => onChange(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[22px] outline-none focus:ring-4 ring-blue-500/5 focus:bg-white focus:border-blue-200 transition-all font-bold text-slate-700 text-sm appearance-none cursor-pointer relative uppercase">
                    <option value="">SELECT SUBJECT</option>
                    {options.map((opt: any) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>
        </div>
    );
}