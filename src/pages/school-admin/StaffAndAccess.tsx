import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { validateEmail, validatePassword, validateMobile } from '../../components/utilitis/validation.ts';
import {
    Users, Mail, Trash2, Loader2, X, Plus, Search,
    Crown, ShieldAlert, GraduationCap,
    User, Fingerprint, Lock, Check, Building2, Droplets, Calendar, BookOpen,
    ImageIcon, UserCircle, Users2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type UserRole = 'teacher' | 'student' | 'parent' | 'school-admin';

export function StaffAndAccess() {
    const { profile } = useAuth();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<UserRole>('teacher');

    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<any>(null);

    const [formData, setFormData] = useState({
        full_name: '', email: '', encrypted_password: '', role: 'teacher' as UserRole,
        employee_id: '', mobile_number: '', dob: '', subject_teaching: '',
        gender: 'male', date_of_joining: '', blood_group: 'A+', address: ''
    });

    const performSecureEncryption = (text: string) => {
        const salt = "SB-2026-SECURE-BILLIONAIRE";
        return btoa(`${salt}:${text}`);
    };

    useEffect(() => {
        if (profile?.school_id) fetchRecords();
    }, [profile]);

    const fetchRecords = async () => {
        if (!profile?.school_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('school_id', profile.school_id);

        if (error) {
            toast.error("Database Access Denied");
        } else {
            setStaff(data || []);
        }
        setLoading(false);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const emailErr = validateEmail(formData.email);
        if (emailErr) return toast.error(emailErr);

        setIsSaving(true);
        const loadId = toast.loading("Authorizing & Registering...");

        try {
            const finalEncrypted = performSecureEncryption(formData.encrypted_password);
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: formData.email.trim().toLowerCase(),
                    password: formData.encrypted_password,
                    profileData: {
                        ...formData,
                        school_id: profile.school_id,
                        encrypted_password: finalEncrypted,
                        is_active: true
                    }
                }
            });

            if (error || data?.error) throw new Error(data?.error || error.message);

            toast.success(`${formData.role.toUpperCase()} REGISTERED`, { id: loadId });
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
        setFormData({
            full_name: '', email: '', encrypted_password: '', role: activeTab,
            employee_id: '', mobile_number: '', dob: '', subject_teaching: '',
            gender: 'male', date_of_joining: '', blood_group: 'A+', address: ''
        });
    };

    const processDelete = async () => {
        setIsSaving(true);
        try {
            const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { target_id: memberToDelete.id }
            });
            if (error || data?.error) throw new Error(data?.error || error.message);
            toast.success("ACCESS TERMINATED");
            fetchRecords();
            setShowDeleteConfirm(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredList = staff.filter(s =>
        s.role === activeTab &&
        (s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // --- STUDENT SPECIFIC FORM FIELDS ---
    const renderStudentForm = () => (
        <div className="space-y-8">
            <div className="bg-white rounded-[32px] p-6 shadow-sm border-2 border-dashed border-blue-100 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-blue-50 rounded-[20px] flex items-center justify-center text-blue-400 mb-2 border-2 border-white shadow-inner">
                    <ImageIcon size={28} />
                </div>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest cursor-pointer">Upload Student Photo</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FormSection title="Academic" icon={<GraduationCap size={16} className="text-blue-500" />} borderColor="border-blue-50">
                    <FormInput label="Full Name *" value={formData.full_name} onChange={(v: any) => setFormData({ ...formData, full_name: v })} required />
                    <FormInput label="Roll No *" value={formData.employee_id} onChange={(v: any) => setFormData({ ...formData, employee_id: v })} required />
                    <div className="grid grid-cols-2 gap-3">
                        <FormSelect label="Class *" options={['10A', '9A', '8A']} value={formData.subject_teaching} onChange={(v: any) => setFormData({ ...formData, subject_teaching: v })} />
                        <FormSelect label="Section *" options={['A', 'B', 'C']} value={formData.address} onChange={(v: any) => setFormData({ ...formData, address: v })} />
                    </div>
                </FormSection>

                <FormSection title="Family" icon={<UserCircle size={16} className="text-orange-500" />} borderColor="border-orange-50">
                    <FormInput label="Father Name *" value={formData.date_of_joining} onChange={(v: any) => setFormData({ ...formData, date_of_joining: v })} required />
                    <FormInput label="Mother Name *" value={formData.gender} onChange={(v: any) => setFormData({ ...formData, gender: v })} required />
                    <FormInput label="Mother Mobile *" value={formData.mobile_number} onChange={(v: any) => setFormData({ ...formData, mobile_number: v })} required />
                </FormSection>

                <FormSection title="Health & Personal" icon={<Users2 size={16} className="text-green-500" />} borderColor="border-green-50">
                    <FormInput label="Email *" type="email" value={formData.email} onChange={(v: any) => setFormData({ ...formData, email: v })} required />
                    <FormSelect label="Blood Group *" options={['O+', 'A+', 'B+', 'AB+']} value={formData.blood_group} onChange={(v: any) => setFormData({ ...formData, blood_group: v })} />
                    <FormInput label="DOB *" type="date" value={formData.dob} onChange={(v: any) => setFormData({ ...formData, dob: v })} required />
                    <FormInput label="Password *" type="password" value={formData.encrypted_password} onChange={(v: any) => setFormData({ ...formData, encrypted_password: v })} required />
                </FormSection>
            </div>
        </div>
    );

    // --- TEACHER/ADMIN DEFAULT FORM ---
    const renderDefaultForm = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput label="Full Name" value={formData.full_name} onChange={v => setFormData({ ...formData, full_name: v })} required />
                <FormSelect label="Gender" options={['male', 'female', 'others']} value={formData.gender} onChange={v => setFormData({ ...formData, gender: v })} />
                <FormInput label="Date of Birth" type="date" value={formData.dob} onChange={v => setFormData({ ...formData, dob: v })} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput label="Email Address" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} required />
                <FormInput label="Mobile" value={formData.mobile_number} onChange={v => setFormData({ ...formData, mobile_number: v })} required />
                <FormInput label="Password" type="password" value={formData.encrypted_password} onChange={v => setFormData({ ...formData, encrypted_password: v })} required />
                <FormSelect label="Blood Group" options={['A+', 'B+', 'O+', 'AB+']} value={formData.blood_group} onChange={v => setFormData({ ...formData, blood_group: v })} />
            </div>
            <div className="bg-blue-50/40 p-6 rounded-[24px] border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput label={activeTab === 'teacher' ? 'Employee ID' : 'ID Number'} value={formData.employee_id} onChange={v => setFormData({ ...formData, employee_id: v })} required />
                <FormInput label="Department/Subject" value={formData.subject_teaching} onChange={v => setFormData({ ...formData, subject_teaching: v })} required />
                <FormInput label="Joining Date" type="date" value={formData.date_of_joining} onChange={v => setFormData({ ...formData, date_of_joining: v })} required />
            </div>
        </div>
    );

    return (
        <div className="space-y-10 text-left min-h-screen relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">
                        <span className="text-[#2C3E50]">Staff</span> <span className="text-[#8DC63F]">Access</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-[10px] tracking-[3px] uppercase mt-1">SmartBadi Management System</p>
                </div>

                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                            placeholder="Search records..."
                            className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none text-sm font-medium focus:border-blue-200 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        <Plus size={16} /> Add {activeTab}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-[24px] w-fit border border-slate-100 overflow-x-auto max-w-full">
                {[
                    { id: 'school-admin', label: 'Admins', icon: <Crown size={14} /> },
                    { id: 'teacher', label: 'Teachers', icon: <Users size={14} /> },
                    // { id: 'student', label: 'Students', icon: <GraduationCap size={14} /> },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="text-slate-500 font-bold uppercase tracking-[3px] text-[10px]">Syncing...</p>
                    </div>
                ) : filteredList.length > 0 ? (
                    filteredList.map((m) => (
                        <motion.div
                            layout key={m.id}
                            className="group relative bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 overflow-hidden"
                        >
                            <div className={`absolute left-0 top-0 h-full w-1.5 ${m.role === 'teacher' ? 'bg-blue-600' : 'bg-slate-800'}`} />
                            <div className="p-5 ml-1.5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-colors ${m.role === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {m.role === 'teacher' ? <Users size={20} strokeWidth={2.5} /> : <Fingerprint size={20} strokeWidth={2.5} />}
                                    </div>
                                    <button onClick={() => { setMemberToDelete(m); setShowDeleteConfirm(true); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"><Trash2 size={16} /></button>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-slate-900 tracking-tight truncate uppercase">{m.full_name}</h3>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Mail size={12} className="text-blue-400" />
                                        <p className="text-[10px] truncate font-bold lowercase tracking-wide">{m.email}</p>
                                    </div>
                                </div>
                                {m.role === 'teacher' && (
                                    <div className="mt-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-100">
                                            <BookOpen size={12} className="stroke-[3]" />
                                            <span className="text-[9px] font-black uppercase tracking-wider">{m.subject_teaching || 'Faculty'}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">ID NO.</p>
                                        <span className="text-[10px] font-black text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{m.employee_id || m.roll_number || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-[8px] font-black text-green-700 uppercase">Verified</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/30 flex flex-col items-center gap-4">
                        <Users size={32} className="text-slate-300" strokeWidth={1} />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No records found</p>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 ">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-6xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white z-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">New <span className="text-blue-600">{activeTab}</span></h2>
                                    <p className="text-[10px] font-bold text-slate-400 tracking-[3px] uppercase mt-1">Registry Suite</p>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                                <form onSubmit={handleAddUser} className="space-y-10 pb-10">
                                    {activeTab === 'student' ? renderStudentForm() : renderDefaultForm()}
                                    <button disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[5px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                                        {isSaving ? <Loader2 className="animate-spin" size={24} /> : `Register ${activeTab}`}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-[40px] p-12 text-center shadow-2xl">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8"><ShieldAlert size={40} /></div>
                            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-3">Terminate Access?</h2>
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
function FormSection({ title, icon, borderColor, children }: any) {
    return (
        <div className={`flex flex-col gap-4 p-6 bg-white rounded-[32px] border-2 ${borderColor} shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">{title}</h4>
            </div>
            {children}
        </div>
    );
}

function FormInput({ label, value, onChange, type = "text", required }: any) {
    return (
        <div className="flex flex-col gap-2 text-left">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                required={required}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white transition-all font-bold text-slate-700 text-xs shadow-sm"
            />
        </div>
    );
}

function FormSelect({ label, options, value, onChange }: any) {
    return (
        <div className="flex flex-col gap-2 text-left">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-xs focus:border-blue-400 focus:bg-white transition-all appearance-none"
            >
                {options.map((opt: any) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
}