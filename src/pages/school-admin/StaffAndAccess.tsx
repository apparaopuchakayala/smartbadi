import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { validateEmail, validatePassword, validateMobile } from '../../components/utilitis/validation.ts';
import {
    Users, Mail, Trash2, Loader2, X, Plus, Search,
    Crown, ShieldAlert, GraduationCap,
    User, Fingerprint, Lock, Check, Building2, Droplets, Calendar
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
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('school_id', profile.school_id)
            // .neq('role', 'super-admin');
            console.log(data)

        if (error) {
            console.error("Database Fetch Error:", error.message);
            toast.error("Access Denied: Check RLS Policies");
        } else {
            // console.log("Fetched Data:", data); 
            setStaff(data || []);
        }
        setLoading(false);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        const emailErr = validateEmail(formData.email);
        if (emailErr) return toast.error(emailErr);

        const mobileErr = validateMobile(formData.mobile_number);
        if (mobileErr) return toast.error(mobileErr);

        const passErr = validatePassword(formData.encrypted_password);
        if (passErr) return toast.error(passErr);

        if (!formData.dob || !formData.date_of_joining) {
            return toast.error("Birth Date & Joining Date are required");
        }

        setIsSaving(true);
        const loadId = toast.loading("Authorizing & Encrypting Entry...");

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
            const { data, error } = await supabase.functions.invoke('delete-user', { body: { target_id: memberToDelete.id } });
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
        (s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-10 text-left min-h-screen relative">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-light text-slate-800 tracking-tight uppercase">Staff & Access</h1>
                    <p className="text-slate-400 font-medium text-[10px] tracking-[3px] uppercase mt-1">school staff Management</p>
                </div>

                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                            placeholder="Search records..."
                            className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none text-sm font-medium focus:border-blue-200 transition-all"
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

            {/* TABS SYSTEM */}
            <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-[24px] w-fit border border-slate-100 overflow-x-auto max-w-full">
                {[
                    { id: 'teacher', label: 'Teachers', icon: <Users size={14} /> },
                    { id: 'student', label: 'Students', icon: <GraduationCap size={14} /> },
                    { id: 'parent', label: 'Parents', icon: <User size={14} /> },
                    { id: 'school-admin', label: 'Admins', icon: <Crown size={14} /> }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as UserRole)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* GRID VIEW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-slate-200" size={48} /></div>
                ) : filteredList.length > 0 ? (
                    filteredList.map((m) => (
                        <motion.div layout key={m.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center group-hover:text-blue-500 transition-colors">
                                    <Fingerprint size={24} />
                                </div>
                                <button onClick={() => { setMemberToDelete(m); setShowDeleteConfirm(true); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight truncate">{m.full_name}</h3>
                            <p className="text-[11px] font-medium text-slate-400 mb-6 truncate uppercase tracking-tighter">{m.email}</p>

                            <div className="pt-5 border-t border-slate-50 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Lock size={12} /> <span className="text-[9px] font-bold uppercase tracking-widest">Secured</span>
                                </div>
                                <span className="bg-slate-50 px-3 py-1 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-tighter">{m.employee_id || 'NO-ID'}</span>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-50 rounded-[40px]">
                        <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">No records found</p>
                    </div>
                )}
            </div>

            {/* --- CENTERED REGISTRATION MODAL --- */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 ">
                        {/* Backdrop with Blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="absolute inset-0 "
                        />

                        {/* Centered Content Card */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-5xl rounded-[48px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white"
                        >
                            {/* Fixed Header Inside Modal */}
                            <div className="p-8 md:p-10 border-b border-slate-50 flex justify-between items-center bg-white z-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                                        New <span className="text-blue-600">{activeTab}</span> Entry
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 tracking-[3px] uppercase mt-1">
                                        Enterprise Registration Suite
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-4 bg-slate-50 text-slate-400 hover:text-red-500 rounded-3xl transition-all"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            {/* Scrollable Form Body */}
                            <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                                <form onSubmit={handleAddUser} className="space-y-12 pb-10">
                                    {/* Section 1: Personal Details */}
                                    <div className="space-y-6">
                                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 px-1"><User size={14} /> Personal Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <FormInput label="Full Name" value={formData.full_name} onChange={v => setFormData({ ...formData, full_name: v })} required />
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                                                <select
                                                    className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-700 shadow-sm appearance-none"
                                                    value={formData.gender}
                                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                >
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="others">Others</option>
                                                </select>
                                            </div>
                                            <FormInput label="Date of Birth" type="date" value={formData.dob} onChange={v => setFormData({ ...formData, dob: v })} required />
                                        </div>
                                    </div>

                                    {/* Section 2: Access & Identity */}
                                    <div className="space-y-6">
                                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 px-1"><Lock size={14} /> Access & Identity</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormInput label="Email Address" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} required />
                                            <FormInput label="Mobile (10 Digits)" type="tel" value={formData.mobile_number} onChange={v => setFormData({ ...formData, mobile_number: v })} required />
                                            <FormInput label="Secure Password" type="password" value={formData.encrypted_password} onChange={v => setFormData({ ...formData, encrypted_password: v })} required />
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Blood Group</label>
                                                <select
                                                    className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl outline-none font-bold text-slate-700 shadow-sm appearance-none"
                                                    value={formData.blood_group}
                                                    onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                                                >
                                                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Institutional Record */}
                                    <div className="space-y-6 bg-blue-50/40 p-8 rounded-[40px] border border-blue-100/50">
                                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><Building2 size={14} /> Institutional Record</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <FormInput label={activeTab === 'teacher' ? 'Employee ID' : 'Roll Number'} value={formData.employee_id} onChange={v => setFormData({ ...formData, employee_id: v })} required />
                                            <FormInput label="Subject / Specialization" value={formData.subject_teaching} onChange={v => setFormData({ ...formData, subject_teaching: v })} required />
                                            <FormInput label="Joining Date" type="date" value={formData.date_of_joining} onChange={v => setFormData({ ...formData, date_of_joining: v })} required />
                                        </div>
                                    </div>

                                    <button disabled={isSaving} className="w-full py-6 bg-slate-900 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[5px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                                        {isSaving ? <Loader2 className="animate-spin" size={24} /> : `Authorize & Create ${activeTab}`}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DELETE MODAL */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-[40px] p-12 text-center shadow-2xl">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8"><ShieldAlert size={40} /></div>
                            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-3">Terminate Access?</h2>
                            <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed uppercase tracking-tighter">Permanently remove {memberToDelete?.full_name} from records?</p>
                            <div className="flex gap-4">
                                <button onClick={processDelete} disabled={isSaving} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-100 transition-all disabled:opacity-50">Confirm</button>
                                <button onClick={() => setShowDeleteConfirm(false)} disabled={isSaving} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FormInput({ label, value, onChange, type = "text", required }: any) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                required={required}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-700 shadow-sm"
            />
        </div>
    );
}