import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    GraduationCap, Trash2, Loader2, X, Plus, Search,
    ImageIcon, UserCircle, Users2, FileUp, FileDown, CheckCircle2,
    Save, Camera, AlertTriangle, ImagePlus, Sparkles, DownloadCloud, UploadCloud,
    User, Calendar, Mail, MapPin, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { SchoolLoading } from '../../components/utilitis/SchoolLoading';
import { DeleteLoading } from '../../components/utilitis/DeleteLoading';

export function StudentHub() {
    const { profile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const bulkPhotoRef = useRef<HTMLInputElement>(null);

    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [csvData, setCsvData] = useState<any[] | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Profile Overlay States
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [showProfile, setShowProfile] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '', email: '', encrypted_password: '', role: 'student',
        employee_id: '', father_mobile: '', dob: '', subject_teaching: '',
        gender: 'male', blood_group: 'A+', address: '',
        mother_name: '', mother_mobile: '', father_name: '', residential_address: ''
    });

    const openProfile = (student: any) => {
        setSelectedStudent(student);
        setShowProfile(true);
    };

    useEffect(() => {
        if (profile?.school_id) fetchStudents();
    }, [profile]);

    const fetchStudents = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('school_id', profile.school_id)
            .eq('role', 'student')
            .order('created_at', { ascending: false });
        if (!error) setStudents(data || []);
        setLoading(false);
    };

    const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsSaving(true);
        const loadId = toast.loading(`Matching and Syncing ${files.length} photos...`);
        try {
            let successCount = 0;
            for (const file of Array.from(files)) {
                const rollNo = file.name.split('.')[0];
                const student = students.find(s => s.employee_id === rollNo || s.roll_number === rollNo);
                if (student) {
                    const fileExt = file.name.split('.').pop();
                    const path = `${profile.school_id}/${student.id}.${fileExt}`;
                    await supabase.storage.from('student-photos').upload(path, file, { upsert: true });
                    const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(path);
                    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', student.id);
                    successCount++;
                }
            }
            toast.success(`${successCount} Photos Synced!`, { id: loadId });
            fetchStudents();
        } catch (err: any) { toast.error(err.message, { id: loadId }); }
        finally { setIsSaving(false); if (bulkPhotoRef.current) bulkPhotoRef.current.value = ""; }
    };

    const handleBulkDelete = async () => {
        if (!students || students.length === 0) return;
        setIsDeleting(true);
        try {
            const { data, error } = await supabase.functions.invoke('delete-user', { body: { all_students: true } });
            if (error) throw error;
            toast.success(data.message || "Registry fully wiped.");
            setShowDeleteModal(false);
            fetchStudents();
        } catch (err: any) { toast.error("Wipe failed: " + err.message); }
        finally { setIsDeleting(false); }
    };

    const handleDeleteSingle = async (id: string) => {
        if (!window.confirm("Delete student permanently?")) return;
        setIsDeleting(true);
        const { error } = await supabase.functions.invoke('delete-user', { body: { target_id: id } });
        if (!error) { toast.success("Student Deleted"); fetchStudents(); }
        else { toast.error("Error removing student"); }
        setIsDeleting(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n').filter(r => r.trim() !== "");
            const allData = rows.map(row => row.split(',').map(cell => cell.trim()));
            const parsed = allData.slice(1).map(row => ({
                full_name: row[0], dob: row[1], email: row[2], password: row[3],
                gender: row[4], blood_group: row[5], father_name: row[6],
                father_mobile: row[7], mother_name: row[8], mother_mobile: row[9],
                roll_number: row[10], current_class: row[11], current_section: row[12],
                residential_address: row[13], role: 'student'
            }));
            setCsvData(parsed);
            toast.success("Data Validated Successfully");
        };
        reader.readAsText(file);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const list = csvData || [formData];
            for (const s of list) {
                const cleanEmail = s.email.toLowerCase().trim();
                const { data: res, error } = await supabase.functions.invoke('create-user', {
                    body: { email: cleanEmail, password: s.password || 'Student@123', profileData: { ...s, role: 'student', school_id: profile.school_id, is_active: true } }
                });
                if (error) throw error;
                if (!csvData && selectedPhoto && res?.user?.id) {
                    const fileExt = selectedPhoto.name.split('.').pop();
                    const path = `${profile.school_id}/${res.user.id}.${fileExt}`;
                    await supabase.storage.from('student-photos').upload(path, selectedPhoto, { upsert: true });
                    const { data: url } = supabase.storage.from('student-photos').getPublicUrl(path);
                    await supabase.from('profiles').update({ avatar_url: url.publicUrl }).eq('id', res.user.id);
                }
            }
            toast.success("Success: All Records Synced");
            setShowAddModal(false); resetForm(); fetchStudents();
        } catch (err: any) { toast.error(err.message); }
        finally { setIsSaving(false); }
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setSelectedPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
    };

    const resetForm = () => {
        setFormData({
            full_name: '', email: '', encrypted_password: '', role: 'student',
            employee_id: '', father_mobile: '', dob: '', subject_teaching: '',
            gender: 'male', blood_group: 'A+', address: '',
            mother_name: '', mother_mobile: '', father_name: '', residential_address: ''
        });
        setCsvData(null); setFileName(null); setSelectedPhoto(null); setPhotoPreview(null);
    };

    const downloadCSVTemplate = () => {
        const headers = ["FullName", "DOB(YYYY-MM-DD)", "Email", "Password", "Gender", "BloodGroup", "FatherName", "FatherMobile", "MotherName", "MotherMobile", "RollNumber", "Class", "Section", "Address"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "SmartBadi_Admission_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredStudents = students.filter(s =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employee_id?.includes(searchQuery) ||
        s.roll_number?.includes(searchQuery)
    );

    return (
        <div className="space-y-10 text-left min-h-screen pb-20 px-4 md:px-0">
            {/* Animation Overlays */}
            <AnimatePresence>
                {isSaving && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
                        <SchoolLoading />
                    </motion.div>
                )}
                {isDeleting && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] flex items-center justify-center bg-red-900/20 backdrop-blur-md">
                        <DeleteLoading />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Elegant Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/50 p-6 rounded-[40px] border border-white shadow-sm backdrop-blur-xl">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">
                        <span className="text-[#2C3E50]">Student</span> <span className="text-[#8DC63F]">Hub</span>
                    </h1>
                    <p className="text-slate-400 text-[10px] font-bold tracking-[4px] uppercase mt-1">Institutional Data Registry</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input placeholder="Search Roll No / Name" className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-[22px] text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-blue-100 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>

                    <button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={students.length === 0}
                        className={`p-4 rounded-[22px] transition-all shadow-sm active:scale-95 
                            ${students.length === 0
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                                : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'
                            }`}
                    >
                        <Trash2 size={20} />
                    </button>

                    <button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-slate-900 text-white px-10 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:bg-blue-600 transition-all active:scale-95">
                        <Plus size={20} /> New Admission
                    </button>
                </div>
            </div>

            {/* Student Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {loading ? <div className="col-span-full py-20 flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-500" size={40} /><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Registry...</p></div> :
                    filteredStudents.map((s) => (
                        <motion.div 
                            layout 
                            key={s.id} 
                            onClick={() => openProfile(s)}
                            className="cursor-pointer bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-20 h-20 bg-slate-100 rounded-[30px] overflow-hidden border-4 border-white shadow-md group-hover:scale-110 transition-transform duration-500">
                                    {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><GraduationCap size={32} /></div>}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase">Roll: {s.roll_number || s.employee_id}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSingle(s.id); }} className="p-2.5 text-slate-200 hover:text-red-500 transition-colors bg-slate-50 rounded-2xl"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <h3 className="text-md font-black text-slate-800 uppercase truncate mb-1">{s.full_name}</h3>
                            <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">Class {s.current_class || 'N/A'}</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">Sec {s.current_section || s.address || 'N/A'}</span>
                            </div>
                        </motion.div>
                    ))}
            </div>

            {/* --- STUDENT PROFILE SIDE PANEL --- */}
            <AnimatePresence>
                {showProfile && selectedStudent && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-xl flex justify-center"
                        onClick={() => setShowProfile(false)}
                    >
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-full max-w-2xl bg-slate-50 h-screen overflow-y-auto shadow-2xl p-6 md:p-12 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => setShowProfile(false)} className="absolute top-8 right-8 p-3 bg-white rounded-full shadow-lg hover:text-red-500 transition-all z-10"><X size={24} /></button>
                            
                            <div className="space-y-8">
                                <div className="bg-white rounded-[40px] p-8 border border-white shadow-xl text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-[#8DC63F]" />
                                    <div className="relative mt-8">
                                        <div className="w-32 h-32 rounded-[40px] border-4 border-white overflow-hidden shadow-lg mx-auto bg-slate-100">
                                            <img src={selectedStudent.avatar_url || `https://ui-avatars.com/api/?name=${selectedStudent.full_name}`} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <h2 className="mt-4 text-2xl font-black text-slate-800 uppercase tracking-tighter">{selectedStudent.full_name}</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Enrollment ID: {selectedStudent.roll_number || selectedStudent.employee_id}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <section className="bg-white rounded-[30px] p-8 shadow-sm space-y-6">
                                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-500 border-b pb-4"><GraduationCap size={16}/> Personal Details</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <DetailBox label="Current Class" value={selectedStudent.current_class} />
                                            <DetailBox label="Section" value={selectedStudent.current_section || selectedStudent.address} />
                                            <DetailBox label="Gender" value={selectedStudent.gender} />
                                            <DetailBox label="Blood Group" value={selectedStudent.blood_group} />
                                            <DetailBox label="Date of Birth" value={selectedStudent.dob} />
                                            <DetailBox label="Phone Number" value={selectedStudent.mobile_number} />
                                        </div>
                                    </section>
                                    <section className="bg-white rounded-[30px] p-8 shadow-sm space-y-6">
                                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#8DC63F] border-b pb-4"><UserCircle size={16}/> Guardian Information</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <DetailBox label="Father's Name" value={selectedStudent.father_name} />
                                            <DetailBox label="Mother's Name" value={selectedStudent.mother_name} />
                                            <div className="col-span-2">
                                                <DetailBox label="Permanent Address" value={selectedStudent.address || selectedStudent.residential_address} />
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Admission Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-6xl rounded-[50px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                            <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Sparkles size={24} /></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Admission Suite</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Smart Registration System</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                    <ToolCard icon={<DownloadCloud size={24} />} title="Download Template" step="Step 1" onClick={downloadCSVTemplate} color="red" />
                                    <div className={`p-6 bg-white border rounded-[35px] shadow-sm flex flex-col gap-4 transition-all ${csvData ? 'border-green-500 bg-green-50/20' : 'border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-2xl ${csvData ? 'bg-green-500 text-white animate-bounce' : 'bg-green-50 text-green-600'}`}>{csvData ? <CheckCircle2 size={20} /> : <FileUp size={20} />}</div>
                                            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Step 2</span>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-green-100 active:scale-95 transition-all">
                                            {csvData ? 'Data Loaded' : 'Upload Student Data'}
                                        </button>
                                    </div>
                                    <div className="p-6 bg-white border border-slate-100 rounded-[35px] shadow-sm flex flex-col gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><ImagePlus size={20} /></div>
                                            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Step 3</span>
                                        </div>
                                        <input type="file" multiple accept="image/*" ref={bulkPhotoRef} onChange={handleBulkPhotoUpload} className="hidden" id="bulk-photo-sync" />
                                        <button onClick={() => bulkPhotoRef.current?.click()} className="w-full py-4 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-orange-100 active:scale-95 transition-all">Bulk Photo Sync</button>
                                    </div>
                                    <div className={`p-6 bg-white border rounded-[35px] shadow-sm flex items-center justify-between gap-4 transition-all ${photoPreview ? 'border-blue-500' : 'border-slate-100'}`}>
                                        <div onClick={() => photoInputRef.current?.click()} className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border cursor-pointer group flex items-center justify-center shadow-inner">
                                            {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Camera className="text-slate-300 group-hover:text-blue-500 transition-colors" size={24} />}
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Single Entry</span>
                                            <input type="file" ref={photoInputRef} onChange={handlePhotoSelect} accept="image/*" className="hidden" />
                                            <button onClick={() => photoInputRef.current?.click()} className="text-[9px] font-black text-blue-600 uppercase text-left">Upload Pic</button>
                                        </div>
                                    </div>
                                </div>
                                <AnimatePresence mode="wait">
                                    {csvData ? (
                                        <motion.div key="bulk-ready" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-0 p-12 bg-white rounded-[50px] border-2 border-green-200 shadow-xl text-center border-[1px] border-solid border-black">
                                            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-black"><Sparkles size={40} /></div>
                                            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Registry Files Ready</h3>
                                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-10">{csvData.length} Validated students in queue</p>
                                            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                                                <button onClick={handleRegister} className="flex-1 py-5 bg-green-600 text-white rounded-3xl font-black uppercase text-[12px] shadow-lg hover:bg-green-700 active:scale-95 transition-all">Push to Registry</button>
                                                <button onClick={() => setCsvData(null)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-[12px] active:scale-95 transition-all">Cancel Batch</button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.form key="manual-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleRegister} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                                            <FormSection title="Academic Registry" icon={<GraduationCap size={16} />} color="border-blue-100">
                                                <FormField label="Full Name *" value={formData.full_name} onChange={(v: any) => setFormData({ ...formData, full_name: v })} required placeholder="Enter student name" />
                                                <FormField label="Roll Number *" value={formData.employee_id} onChange={(v: any) => setFormData({ ...formData, employee_id: v })} required placeholder="E.g. 2026101" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField label="Class" value={formData.subject_teaching} onChange={(v: any) => setFormData({ ...formData, subject_teaching: v })} placeholder="E.g. 10th" />
                                                    <FormField label="Section" value={formData.address} onChange={(v: any) => setFormData({ ...formData, address: v })} placeholder="E.g. A" />
                                                </div>
                                            </FormSection>
                                            <FormSection title="Family Details" icon={<UserCircle size={16} />} color="border-orange-100">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField label="Father Name" value={formData.father_name} onChange={(v: any) => setFormData({ ...formData, father_name: v })} placeholder="Name" />
                                                    <FormField label="Father Mobile" value={formData.father_mobile} onChange={(v: any) => setFormData({ ...formData, father_mobile: v })} placeholder="Number" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField label="Mother Name" value={formData.mother_name} onChange={(v: any) => setFormData({ ...formData, mother_name: v })} placeholder="Name" />
                                                    <FormField label="Mother Mobile" value={formData.mother_mobile} onChange={(v: any) => setFormData({ ...formData, mother_mobile: v })} placeholder="Number" />
                                                </div>
                                                <FormField label="Address" value={formData.residential_address} onChange={(v: any) => setFormData({ ...formData, residential_address: v })} placeholder="Residential Area" />
                                            </FormSection>
                                            <FormSection title="System Access" icon={<Users2 size={16} />} color="border-green-100">
                                                <FormField label="Student Email *" value={formData.email} onChange={(v: any) => setFormData({ ...formData, email: v })} required placeholder="student@school.com" />
                                                <FormField label="Password *" type="password" value={formData.encrypted_password} onChange={(v: any) => setFormData({ ...formData, encrypted_password: v })} required placeholder="Min 6 chars" />
                                                <div className="grid grid-cols-2 gap-4 items-end">
                                                    <FormField label="Date of Birth" type="date" value={formData.dob} onChange={(v: any) => setFormData({ ...formData, dob: v })} />
                                                    <div className="space-y-2 px-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Blood Group</label>
                                                        <select value={formData.blood_group} onChange={e => setFormData({ ...formData, blood_group: e.target.value })} className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold shadow-inner outline-none">
                                                            {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </FormSection>
                                            <div className="col-span-full pt-6 ">
                                                <button type="submit" disabled={isSaving} className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black uppercase text-[12px] tracking-[6px] shadow-2xl flex items-center justify-center gap-4 group active:scale-95 transition-all">
                                                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Authorize Admission
                                                </button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Wipe Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowDeleteModal(false)} className="absolute inset-0 bg-red-900/10" />
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-[50px] p-12 text-center shadow-2xl border-b-8 border-red-500">
                            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-inner"><AlertTriangle size={48} /></div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-3">Terminate Database?</h2>
                            <p className="text-slate-400 text-sm font-bold mb-10 uppercase tracking-wide leading-relaxed">This will erase <b>ALL {students.length} Students</b> and their <b>Login access</b> permanently.</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleBulkDelete} disabled={isSaving} className="w-full py-5 bg-red-500 text-white rounded-3xl font-black uppercase text-[11px] shadow-xl hover:bg-red-600 active:scale-95 transition-all">Wipe Everything</button>
                                <button onClick={() => setShowDeleteModal(false)} className="w-full py-5 bg-slate-50 text-slate-400 rounded-3xl font-black uppercase text-[11px] active:scale-95 transition-all">No, Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Internal UI Components ---
const DetailBox = ({ label, value }: { label: string, value: string }) => (
    <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-700 mt-0.5">{value || 'N/A'}</p>
    </div>
);

const ToolCard = ({ icon, title, step, onClick, color }: any) => (
    <div className="p-6 bg-white border border-slate-100 rounded-[35px] shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all">
        <div className="flex items-center gap-3">
            <div className={`p-3 bg-${color}-50 text-${color}-600 rounded-2xl`}>{icon}</div>
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">{step}</span>
        </div>
        <button onClick={onClick} className={`w-full py-4 bg-${color}-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-${color}-100 active:scale-95 transition-all`}>{title}</button>
    </div>
);

const FormSection = ({ title, icon, color, children }: any) => (
    <div className={`p-8 bg-white rounded-[45px] border-2 ${color} space-y-6 text-left shadow-sm hover:shadow-md transition-all`}>
        <h4 className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[3px] text-slate-500 border-b border-slate-50 pb-5">{icon} {title}</h4>
        <div className="space-y-4">{children}</div>
    </div>
);

const FormField = ({ label, type = "text", value, onChange, required, placeholder }: any) => (
    <div className="space-y-2 text-left px-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <input
            type={type} value={value} required={required} placeholder={placeholder} onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-[12px] font-bold text-slate-700 shadow-inner placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
        />
    </div>
);