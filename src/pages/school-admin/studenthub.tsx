import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    GraduationCap, Trash2, Loader2, X, Plus, Search,
    ImageIcon, UserCircle, Users2, FileUp, FileDown, CheckCircle2,
    Save, Camera, AlertTriangle, ImagePlus, Sparkles, DownloadCloud, UploadCloud,
    User, Calendar, Mail, MapPin, Phone, LayoutGrid, Filter, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { SchoolLoading } from '../../components/utilitis/SchoolLoading';
import { DeleteLoading } from '../../components/utilitis/DeleteLoading';
import { smartBadiApi } from '../../services/smartBadiApi.ts';

export function StudentHub() {
    const { profile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const bulkPhotoRef = useRef<HTMLInputElement>(null);

    const [students, setStudents] = useState<any[]>([]);
    const [allocatedClasses, setAllocatedClasses] = useState<any[]>([]); 
    const [loading, setLoading] = useState(false); // Initial false
    const [hasSearched, setHasSearched] = useState(false); // To show "Search to see results"
    
    // Filters State
    const [selectedFilter, setSelectedFilter] = useState({ class: '', section: '' });
    const [searchQuery, setSearchQuery] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [csvData, setCsvData] = useState<any[] | null>(null);
    const [bulkTarget, setBulkTarget] = useState({ class: '', section: '' }); 
    const [fileName, setFileName] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [showProfile, setShowProfile] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '', email: '', encrypted_password: '', role: 'student',
        employee_id: '', father_mobile: '', dob: '', current_class: '',
        current_section: '', gender: 'male', blood_group: 'A+', address: '',
        mother_name: '', mother_mobile: '', father_name: '', residential_address: ''
    });

    const openProfile = (student: any) => {
        setSelectedStudent(student);
        setShowProfile(true);
    };

    useEffect(() => {
        if (profile?.school_id) {
            fetchInfrastructure();
        }
    }, [profile]);

    const fetchInfrastructure = async () => {
        const { data, error } = await supabase
            .from('school_classes')
            .select('class_name, section')
            .eq('school_id', profile.school_id);
        if (!error && data) setAllocatedClasses(data);
    };

    // SEARCH LOGIC - Class & Section Based
    const handleSearch = async () => {
        if (!selectedFilter.class || !selectedFilter.section) {
            return toast.error("Please select both Class and Section");
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('school_id', profile.school_id)
                .eq('role', 'student')
                .eq('current_class', selectedFilter.class)
                .eq('current_section', selectedFilter.section)
                .order('full_name', { ascending: true });

            if (error) throw error;
            setStudents(data || []);
            if(data?.length === 0) toast.error("No students found in this class");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
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
            handleSearch(); // Refresh list
        } catch (err: any) { toast.error(err.message, { id: loadId }); }
        finally { setIsSaving(false); if (bulkPhotoRef.current) bulkPhotoRef.current.value = ""; }
    };

    const handleBulkDelete = async () => {
        if (!students || students.length === 0) return;
        setIsDeleting(true);
        try {
            const idsToDelete = students.map(s => s.id);
            const { error } = await supabase.functions.invoke('delete-user', { 
                body: { target_ids: idsToDelete } 
            });
            if (error) throw error;
            toast.success("Current view registry wiped.");
            setShowDeleteModal(false);
            setStudents([]);
        } catch (err: any) { toast.error("Wipe failed: " + err.message); }
        finally { setIsDeleting(false); }
    };

    const handleDeleteSingle = async (id: string) => {
        if (!window.confirm("Delete student permanently?")) return;
        setIsDeleting(true);
        const { error } = await supabase.functions.invoke('delete-user', { body: { target_id: id } });
        if (!error) { 
            toast.success("Student Deleted"); 
            setStudents(prev => prev.filter(s => s.id !== id));
        }
        else { toast.error("Error removing student"); }
        setIsDeleting(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!bulkTarget.class) {
            toast.error("Please select a Target Class first!");
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n').filter(r => r.trim() !== "");
            const parsed = rows.slice(1).map(row => {
                const cells = row.split(',').map(cell => cell.trim());
                return {
                    full_name: cells[0], dob: cells[1], email: cells[2], password: cells[3],
                    gender: cells[4], blood_group: cells[5], father_name: cells[6],
                    father_mobile: cells[7], mother_name: cells[8], mother_mobile: cells[9],
                    roll_number: cells[10], address: cells[13]
                };
            });
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
                const targetCls = csvData ? bulkTarget.class : formData.current_class;
                const targetSec = csvData ? bulkTarget.section : formData.current_section;

                if (!targetCls || !targetSec) throw new Error("Please select a valid Class and Section");

                const cleanEmail = s.email.toLowerCase().trim();
                const { data: res, error } = await supabase.functions.invoke('create-user', {
                    body: { 
                        email: cleanEmail, 
                        password: s.password || formData.encrypted_password || 'Student@123', 
                        profileData: { 
                            ...s, 
                            current_class: targetCls, 
                            current_section: targetSec, 
                            role: 'student', 
                            school_id: profile.school_id, 
                            is_active: true 
                        } 
                    }
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
            setShowAddModal(false); resetForm(); 
            // If the added student is in the current search view, refresh it
            if(hasSearched) handleSearch();
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
            employee_id: '', father_mobile: '', dob: '', current_class: '',
            current_section: '', gender: 'male', blood_group: 'A+', address: '',
            mother_name: '', mother_mobile: '', father_name: '', residential_address: ''
        });
        setCsvData(null); setBulkTarget({ class: '', section: '' }); setFileName(null); setSelectedPhoto(null); setPhotoPreview(null);
    };

    const downloadCSVTemplate = () => {
        const headers = ["FullName", "DOB(YYYY-MM-DD)", "Email", "Password", "Gender", "BloodGroup", "FatherName", "FatherMobile", "MotherName", "MotherMobile", "RollNumber", "Address"];
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
            <AnimatePresence>
                {isSaving && <motion.div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-md"><SchoolLoading /></motion.div>}
                {isDeleting && <motion.div className="fixed inset-0 z-[600] flex items-center justify-center bg-red-900/20 backdrop-blur-md"><DeleteLoading /></motion.div>}
            </AnimatePresence>

            {/* --- NEW SEARCH HEADER --- */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-8">
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="space-y-2 flex-1 min-w-[200px]">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Class & Section</label>
                        <select 
                            value={`${selectedFilter.class}|${selectedFilter.section}`}
                            onChange={e => {
                                const [cls, sec] = e.target.value.split('|');
                                setSelectedFilter({ class: cls, section: sec });
                            }}
                            className="w-full bg-slate-50 p-4 rounded-2xl text-[12px] font-bold outline-none border-none shadow-inner"
                        >
                            <option value="">Select Class to Load</option>
                            {allocatedClasses.map((item, idx) => (
                                <option key={idx} value={`${item.class_name}|${item.section}`}>{item.class_name} - {item.section}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        onClick={handleSearch}
                        className="bg-blue-600 text-white px-8 h-[54px] mt-6 rounded-[20px] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95"
                    >
                        <Search size={18} /> Load Students
                    </button>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                     <div className="relative w-64">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                            placeholder="Live filter results..." 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-none rounded-[20px] text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    <button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-slate-900 text-white px-8 h-[54px] rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:bg-blue-600 transition-all active:scale-95">
                        <Plus size={18} /> Admission
                    </button>
                    <button onClick={() => setShowDeleteModal(true)} disabled={students.length === 0} className="p-4 bg-red-50 text-red-500 rounded-[20px] hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"><Trash2 size={20} /></button>
                </div>
            </div>

            {/* --- RESULTS GRID --- */}
            {!hasSearched ? (
                <div className="py-32 bg-white/30 rounded-[50px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                        <GraduationCap size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Ready to Fetch Records</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Select a class from above to view the registry</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {loading ? (
                        <div className="col-span-full py-20 flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-blue-500" size={40} />
                        </div>
                    ) : (
                        filteredStudents.map((s) => (
                            <motion.div layout key={s.id} onClick={() => openProfile(s)} className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-20 h-20 bg-slate-100 rounded-[30px] border-4 border-white shadow-md overflow-hidden">
                                        {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><GraduationCap size={32} /></div>}
                                    </div>
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase">Roll: {s.roll_number || s.employee_id}</span>
                                </div>
                                <h3 className="text-md font-black text-slate-800 uppercase truncate mb-1">{s.full_name}</h3>
                                <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">Class {s.current_class || 'N/A'}</span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">Sec {s.current_section || 'N/A'}</span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            {/* --- Modals and Profile remain same as original... --- */}
             {/* Profile Sidebar */}
             <AnimatePresence>
                {showProfile && selectedStudent && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-xl flex justify-center" onClick={() => setShowProfile(false)}>
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full max-w-2xl bg-slate-50 h-screen overflow-y-auto shadow-2xl p-6 md:p-12 relative" onClick={(e) => e.stopPropagation()}>
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
                                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-500 border-b pb-4"><GraduationCap size={16} /> Personal Details</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <DetailBox label="Current Class" value={selectedStudent.current_class} />
                                            <DetailBox label="Section" value={selectedStudent.current_section} />
                                            <DetailBox label="Gender" value={selectedStudent.gender} />
                                            <DetailBox label="Blood Group" value={selectedStudent.blood_group} />
                                            <DetailBox label="Date of Birth" value={selectedStudent.dob} />
                                            <DetailBox label="Phone Number" value={selectedStudent.mobile_number} />
                                        </div>
                                    </section>
                                    <section className="bg-white rounded-[30px] p-8 shadow-sm space-y-6">
                                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#8DC63F] border-b pb-4"><UserCircle size={16} /> Guardian Information</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <DetailBox label="Father's Name" value={selectedStudent.father_name} />
                                            <DetailBox label="Mother's Name" value={selectedStudent.mother_name} />
                                            <div className="col-span-2"><DetailBox label="Permanent Address" value={selectedStudent.address || selectedStudent.residential_address} /></div>
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
                            <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Sparkles size={24} /></div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Admission Suite</h2>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500"><X size={24} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <ToolCard icon={<DownloadCloud size={24} />} title="Download Template" step="Step 1" onClick={downloadCSVTemplate} color="red" />
                                    <div className="p-6 bg-white border border-slate-100 rounded-[35px] shadow-sm space-y-4">
                                        <div className="flex items-center gap-3"><div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><LayoutGrid size={20} /></div><span className="text-[11px] font-black uppercase text-slate-500">Step 2: Target Class</span></div>
                                        <select value={`${bulkTarget.class}|${bulkTarget.section}`} onChange={e => { const [cls, sec] = e.target.value.split('|'); setBulkTarget({ class: cls, section: sec }); }} className="w-full bg-slate-50 p-4 rounded-2xl text-[10px] font-black uppercase outline-none border-none shadow-inner">
                                            <option value="">Select Allocated Class</option>
                                            {allocatedClasses.map((item, idx) => (<option key={idx} value={`${item.class_name}|${item.section}`}>{item.class_name} - {item.section}</option>))}
                                        </select>
                                    </div>
                                    <div className={`p-6 bg-white border rounded-[35px] shadow-sm flex flex-col gap-4 ${!bulkTarget.class ? 'opacity-50 grayscale' : ''}`}>
                                        <input type="file" ref={fileInputRef} disabled={!bulkTarget.class} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase">Step 3: Upload CSV</button>
                                    </div>
                                    <div className="p-6 bg-white border border-slate-100 rounded-[35px] shadow-sm flex items-center justify-between gap-4 transition-all">
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
                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-12 bg-white rounded-[50px] border-2 border-green-200 text-center">
                                            <h3 className="text-2xl font-black text-slate-800 uppercase mb-2">{csvData.length} Students for {bulkTarget.class} - {bulkTarget.section}</h3>
                                            <button onClick={handleRegister} className="mt-6 px-12 py-5 bg-green-600 text-white rounded-3xl font-black uppercase shadow-lg shadow-green-100 hover:bg-green-700">Push to Registry</button>
                                        </motion.div>
                                    ) : (
                                        <motion.form key="manual-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleRegister} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <FormSection title="Academic Registry" icon={<GraduationCap size={16} />} color="border-blue-100">
                                                <div className="space-y-2 px-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Allocated Class & Section *</label>
                                                    <select required value={`${formData.current_class}|${formData.current_section}`} onChange={e => { const [cls, sec] = e.target.value.split('|'); setFormData({ ...formData, current_class: cls, current_section: sec }); }} className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold shadow-inner outline-none border-none">
                                                        <option value="">-- Choose From Infrastructure --</option>
                                                        {allocatedClasses.map((item, idx) => (<option key={idx} value={`${item.class_name}|${item.section}`}>{item.class_name} - {item.section}</option>))}
                                                    </select>
                                                </div>
                                                <FormField label="Full Name *" value={formData.full_name} onChange={(v: any) => setFormData({ ...formData, full_name: v })} required />
                                                <FormField label="Roll Number *" value={formData.employee_id} onChange={(v: any) => setFormData({ ...formData, employee_id: v })} required />
                                            </FormSection>
                                            <FormSection title="Family Details" icon={<UserCircle size={16} />} color="border-orange-100">
                                                <FormField label="Father Name" value={formData.father_name} onChange={(v: any) => setFormData({ ...formData, father_name: v })} />
                                                <FormField label="Father Mobile" value={formData.father_mobile} onChange={(v: any) => setFormData({ ...formData, father_mobile: v })} />
                                                <FormField label="Permanent Address" value={formData.residential_address} onChange={(v: any) => setFormData({ ...formData, residential_address: v })} />
                                            </FormSection>
                                            <FormSection title="System Access" icon={<Users2 size={16} />} color="border-green-100">
                                                <FormField label="Student Email *" value={formData.email} onChange={(v: any) => setFormData({ ...formData, email: v })} required />
                                                <FormField label="Password *" type="password" value={formData.encrypted_password} onChange={(v: any) => setFormData({ ...formData, encrypted_password: v })} required />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField label="DOB" type="date" value={formData.dob} onChange={(v: any) => setFormData({ ...formData, dob: v })} />
                                                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">Blood Group</label>
                                                    <select value={formData.blood_group} onChange={e => setFormData({ ...formData, blood_group: e.target.value })} className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold outline-none border-none shadow-inner">
                                                        {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select></div>
                                                </div>
                                            </FormSection>
                                            <div className="col-span-full pt-6"><button type="submit" disabled={isSaving || !formData.current_class} className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black uppercase text-[12px] tracking-[6px] shadow-2xl active:scale-95 transition-all">Authorize Admission</button></div>
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
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-3">Clear Results?</h2>
                            <p className="text-slate-400 text-sm font-bold mb-10 uppercase tracking-wide leading-relaxed">This will erase <b>{students.length} Students</b> currently in view.</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleBulkDelete} disabled={isSaving} className="w-full py-5 bg-red-500 text-white rounded-3xl font-black uppercase text-[11px] shadow-xl hover:bg-red-600 active:scale-95 transition-all">Wipe Viewed List</button>
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