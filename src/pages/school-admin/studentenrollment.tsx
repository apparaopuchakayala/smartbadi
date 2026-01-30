import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    GraduationCap, Trash2, X, Plus, Search,
    UserCircle, Users2, CheckCircle2,
    Sparkles, DownloadCloud, UploadCloud,
    User, LayoutGrid, Filter, ChevronRight,
    ImagePlus, Loader2, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { SchoolLoading } from '../../components/utilitis/SchoolLoading';
import { DeleteLoading } from '../../components/utilitis/DeleteLoading';
import { StudentProfileModal } from '../../components/common/studentprofilemodal';
// Import skeletons
import { CardSkeleton, ControlSkeleton } from '../../components/common/skeletoncomp';

export function StudentEnrollment() {
    const { profile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bulkPhotoRef = useRef<HTMLInputElement>(null);

    const [students, setStudents] = useState<any[]>([]);
    const [allocatedClasses, setAllocatedClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [infraLoading, setInfraLoading] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);

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
        setInfraLoading(true);
        try {
            const { data, error } = await supabase
                .from('school_classes')
                .select('id, class_name, section') // <--- UPDATED: Fetching ID here
                .eq('school_id', profile.school_id);
            if (!error && data) setAllocatedClasses(data);
        } finally {
            setInfraLoading(false);
        }
    };

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
            if (data?.length === 0) toast.error("No students found in this class");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (students.length === 0) {
            return toast.error("Please load students list first to sync photos!");
        }

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

                    const { error: uploadError } = await supabase.storage
                        .from('student-photos')
                        .upload(path, file, { upsert: true });

                    if (uploadError) throw uploadError;

                    const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(path);

                    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', student.id);

                    successCount++;
                }
            }
            toast.success(`${successCount} Photos Synced Successfully!`, { id: loadId });
            handleSearch();
        } catch (err: any) {
            toast.error("Sync Failed: " + err.message, { id: loadId });
        } finally {
            setIsSaving(false);
            if (bulkPhotoRef.current) bulkPhotoRef.current.value = "";
        }
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

                // --- NEW LOGIC: FIND CLASS ID ---
                const matchedClass = allocatedClasses.find(
                    c => c.class_name === targetCls && c.section === targetSec
                );

                if (!matchedClass) throw new Error(`Class ID not found for ${targetCls} - ${targetSec}`);
                // --------------------------------

                const cleanEmail = s.email.toLowerCase().trim();
                const { data: res, error } = await supabase.functions.invoke('create-user', {
                    body: {
                        email: cleanEmail,
                        password: s.password || formData.encrypted_password || 'Student@123',
                        profileData: {
                            ...s,
                            current_class: targetCls,
                            current_section: targetSec,
                            class_id: matchedClass.id, // <--- PASSING THE CLASS ID HERE
                            role: 'student',
                            school_id: profile.school_id,
                            is_active: true
                        }
                    }
                });
                if (error) throw error;
            }
            toast.success("Success: All Records Synced");
            setShowAddModal(false); resetForm();
            if (hasSearched) handleSearch();
        } catch (err: any) { toast.error(err.message); }
        finally { setIsSaving(false); }
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
        <div className="space-y-6 md:space-y-10 text-left min-h-screen pb-20 px-3 md:px-0 font-poppins bg-[#F8FAFC]">
            <AnimatePresence>
                {isSaving && <motion.div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-md"><SchoolLoading /></motion.div>}
                {isDeleting && <motion.div className="fixed inset-0 z-[600] flex items-center justify-center bg-red-900/20 backdrop-blur-md"><DeleteLoading /></motion.div>}
            </AnimatePresence>

            {/* HEADER & SEARCH CRITERIA */}
            {infraLoading ? <ControlSkeleton /> : (

                <div className="bg-white p-6 md:p-8 rounded-[35px] md:rounded-[40px] shadow-sm border-2 border-white flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="space-y-2 text-center sm:text-left">
                        <h1 className="text-xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                            Student <span className="text-blue-700">Enrollment</span>
                        </h1>
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[2px] md:tracking-[4px] mt-1">on board new students</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto text-left">
                        <div className="space-y-2 w-full sm:w-64 ">
                            <select
                                value={`${selectedFilter.class}|${selectedFilter.section}`}
                                onChange={e => {
                                    const [cls, sec] = e.target.value.split('|');
                                    setSelectedFilter({ class: cls, section: sec });
                                }}
                                className="w-full bg-slate-100 p-4 rounded-2xl text-[12px] font-black uppercase outline-none border-2 border-transparent focus:border-blue-600 transition-all shadow-inner appearance-none"
                            >
                                <option value="">CHOOSE Class & Section</option>
                                {allocatedClasses.map((item, idx) => (
                                    <option key={idx} value={`${item.class_name}|${item.section}`}>{item.class_name} - SEC {item.section}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleSearch}
                            className="w-full sm:w-auto bg-blue-700 text-white px-8 h-[58px] rounded-[22px] font-black uppercase text-[10px] tracking-[2px] shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <Search size={18} /> Load Students
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-center md:justify-end">
                        <div className="relative w-full sm:w-60">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                placeholder="Live filter..."
                                className="w-full pl-11 pr-4 py-4 bg-slate-100 border-2 border-transparent focus:border-blue-600 focus:bg-white transition-all rounded-[22px] text-xs font-bold outline-none shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={() => { resetForm(); setShowAddModal(true); }} className="flex-1 sm:flex-none bg-slate-900 text-white px-6 h-[58px] rounded-[22px] text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95">
                                <Plus size={18} strokeWidth={3} /> ADMISSION
                            </button>
                            <button onClick={() => setShowDeleteModal(true)} disabled={students.length === 0} className="p-4 bg-red-50 text-red-500 rounded-[22px] border-2 border-red-100 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"><Trash2 size={20} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESULTS GRID */}
            {!hasSearched ? (
                <div className="py-24 md:py-32 bg-white/40 rounded-[40px] md:rounded-[50px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-20 h-20 bg-blue-50 text-blue-700 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-100/50">
                        <GraduationCap size={40} />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">Academic Vault Ready</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[3px] mt-3 max-w-xs">Select a Grade and Section above to pull the student registry from the database.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {loading ? (
                        /* Skeleton Grid */
                        [1, 2, 3, 4, 5, 6, 7, 8].map(i => <CardSkeleton key={i} />)
                    ) : filteredStudents.length > 0 ? (
                        filteredStudents.map((s) => (
                            <motion.div layout key={s.id} onClick={() => openProfile(s)} className="bg-white p-6 rounded-[35px] md:rounded-[40px] border-2 border-white shadow-lg hover:shadow-2xl hover:border-blue-600 transition-all relative overflow-hidden group cursor-pointer text-left">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-blue-600 transition-colors duration-500" />

                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="w-20 h-24 bg-slate-100 rounded-2xl border-2 border-white shadow-xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                        {s.avatar_url ? (
                                            <img src={s.avatar_url} className="w-full h-full object-cover" alt={s.full_name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <User size={32} strokeWidth={1} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="text-[8px] font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">
                                            ROLL: {s.roll_number || s.employee_id}
                                        </span>
                                        <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg border border-emerald-100">
                                            <CheckCircle2 size={12} />
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-md font-black text-slate-900 uppercase truncate mb-1 group-hover:text-blue-700 transition-colors">{s.full_name}</h3>
                                    <div className="flex items-center gap-2 text-slate-500 font-black text-[9px] uppercase tracking-widest">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">GRADE {s.current_class}</span>
                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">SEC {s.current_section}</span>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">View Profile</span>
                                    <ChevronRight size={16} className="text-blue-600" />
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
                            <GraduationCap size={48} className="text-slate-200 mb-4" />
                            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[4px]">Empty Registry For This Class</p>
                        </div>
                    )}
                </div>
            )}

            {/* ADMISSION MODAL: Fully Responsive UI */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 md:p-6 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/70" />
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-6xl rounded-[40px] md:rounded-[60px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border-4 border-white">
                            <div className="p-6 md:p-8 border-b-2 border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10 text-left">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200"><Sparkles size={24} /></div>
                                    <div className="min-w-0">
                                        <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Admission <span className="text-blue-700">Suite</span></h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[3px] mt-1.5 truncate">Digital Enrollment Control</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 md:p-10 bg-[#F8FAFC] custom-scrollbar no-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
                                    <ToolCard icon={<DownloadCloud size={24} />} title="Get Template" step="Phase 1" onClick={downloadCSVTemplate} color="blue" />

                                    <div className="p-6 bg-white border-2 border-white rounded-[30px] md:rounded-[35px] shadow-lg space-y-4 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100"><LayoutGrid size={20} /></div>
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Phase 2: Target</span>
                                        </div>
                                        <select value={`${bulkTarget.class}|${bulkTarget.section}`} onChange={e => { const [cls, sec] = e.target.value.split('|'); setBulkTarget({ class: cls, section: sec }); }} className="w-full bg-slate-100 p-4 rounded-2xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-blue-600 transition-all shadow-inner appearance-none">
                                            <option value="">SELECT CLASS</option>
                                            {allocatedClasses.map((item, idx) => (<option key={idx} value={`${item.class_name}|${item.section}`}>{item.class_name} - SEC {item.section}</option>))}
                                        </select>
                                    </div>

                                    <div className={`p-6 bg-white border-2 border-white rounded-[30px] md:rounded-[35px] shadow-lg flex flex-col gap-4 text-left transition-opacity ${!bulkTarget.class ? 'opacity-50 grayscale' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100"><UploadCloud size={20} /></div>
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Phase 3: Upload</span>
                                        </div>
                                        <input type="file" ref={fileInputRef} disabled={!bulkTarget.class} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Import CSV</button>
                                    </div>

                                    <div className={`p-6 bg-white border-2 border-white rounded-[30px] md:rounded-[35px] shadow-lg flex flex-col gap-4 text-left transition-opacity ${students.length === 0 ? 'opacity-50 grayscale' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-orange-50 text-orange-700 rounded-2xl border border-orange-100"><ImagePlus size={20} /></div>
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Phase 4: Media</span>
                                        </div>
                                        <input type="file" ref={bulkPhotoRef} multiple onChange={handleBulkPhotoUpload} accept="image/*" className="hidden" />
                                        <button
                                            onClick={() => {
                                                if (students.length === 0) return toast.error("Load a class list first!");
                                                bulkPhotoRef.current?.click();
                                            }}
                                            className="w-full py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-100 active:scale-95 transition-all"
                                        >
                                            Bulk Photo Sync
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {csvData ? (
                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-10 md:p-16 bg-white rounded-[40px] md:rounded-[50px] border-4 border-emerald-100 text-center shadow-2xl">
                                            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={40} /></div>
                                            <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">{csvData.length} Students Validated</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[4px] mb-8">Ready to initiate permanent cloud storage</p>
                                            <button onClick={handleRegister} className="px-12 py-6 bg-emerald-600 text-white rounded-[30px] font-black uppercase tracking-[4px] shadow-2xl hover:bg-slate-900 transition-all active:scale-95">Push to Registry</button>
                                        </motion.div>
                                    ) : (
                                        <motion.form key="manual-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleRegister} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                                            <FormSection title="Academic Registry" icon={<GraduationCap size={16} />} color="border-blue-100">
                                                <div className="space-y-2 px-2 text-left">
                                                    <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Class Unit *</label>
                                                    <select required value={`${formData.current_class}|${formData.current_section}`} onChange={e => { const [cls, sec] = e.target.value.split('|'); setFormData({ ...formData, current_class: cls, current_section: sec }); }} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl p-4 text-[11px] font-black uppercase shadow-inner outline-none transition-all appearance-none">
                                                        <option value="">-- CHOOSE ALLOCATION --</option>
                                                        {allocatedClasses.map((item, idx) => (<option key={idx} value={`${item.class_name}|${item.section}`}>{item.class_name} - {item.section}</option>))}
                                                    </select>
                                                </div>
                                                <FormField label="Full Legal Name *" value={formData.full_name} onChange={(v: any) => setFormData({ ...formData, full_name: v.toUpperCase() })} required />
                                                <FormField label="Unique Roll No *" value={formData.employee_id} onChange={(v: any) => setFormData({ ...formData, employee_id: v })} required />
                                            </FormSection>

                                            <FormSection title="Parental Control" icon={<UserCircle size={16} />} color="border-orange-100">
                                                <FormField label="Father Name" value={formData.father_name} onChange={(v: any) => setFormData({ ...formData, father_name: v.toUpperCase() })} />
                                                <FormField label="Verified Mobile" value={formData.father_mobile} onChange={(v: any) => setFormData({ ...formData, father_mobile: v })} />
                                                <FormField label="Residential Address" value={formData.residential_address} onChange={(v: any) => setFormData({ ...formData, residential_address: v.toUpperCase() })} />
                                            </FormSection>

                                            <FormSection title="System Governance" icon={<Users2 size={16} />} color="border-emerald-100">
                                                <FormField label="Digital Login ID *" value={formData.email} onChange={(v: any) => setFormData({ ...formData, email: v.toLowerCase() })} required />
                                                <FormField label="Access Key *" type="password" value={formData.encrypted_password} onChange={(v: any) => setFormData({ ...formData, encrypted_password: v })} required />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <FormField label="Birth Registry" type="date" value={formData.dob} onChange={(v: any) => setFormData({ ...formData, dob: v })} />
                                                    <div className="space-y-2 text-left px-2">
                                                        <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Blood Type</label>
                                                        <select value={formData.blood_group} onChange={e => setFormData({ ...formData, blood_group: e.target.value })} className="w-full bg-slate-50 rounded-2xl p-4 text-[11px] font-black shadow-inner outline-none transition-all appearance-none border-2 border-transparent focus:border-emerald-500">
                                                            {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </FormSection>

                                            <div className="col-span-full pt-4">
                                                <button type="submit" disabled={isSaving || !formData.current_class} className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black uppercase text-[12px] tracking-[6px] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30">Authorize Cloud Enrollment</button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Profile Modal & Wipe Modal remain logic-same */}
            <AnimatePresence>
                {showProfile && selectedStudent && (
                    <StudentProfileModal
                        student={selectedStudent}
                        onClose={() => setShowProfile(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)} className="absolute inset-0 bg-slate-900/60" />
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-[40px] p-8 md:p-14 text-center shadow-2xl border-4 border-white">
                            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner shadow-red-100"><AlertTriangle size={48} /></div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3 italic">Purge Registry?</h2>
                            <p className="text-[10px] text-slate-400 mb-10 font-bold uppercase tracking-[3px] leading-relaxed">This will permanently delete <b>{students.length} Records</b> from the current grade view.</p>
                            <div className="flex flex-col gap-4">
                                <button onClick={handleBulkDelete} disabled={isSaving} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[2px] shadow-xl hover:bg-red-700 active:scale-95 transition-all">Confirm Wipe</button>
                                <button onClick={() => setShowDeleteModal(false)} className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[11px] tracking-[2px] hover:bg-slate-200 active:scale-95 transition-all">Abort</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Internal UI Components (Responsive Optimized) ---

const ToolCard = ({ icon, title, step, onClick, color }: any) => {
    const theme = color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-700 border-slate-100';
    return (
        <div className="p-6 bg-white border-2 border-white rounded-[30px] md:rounded-[35px] shadow-lg flex flex-col gap-5 group hover:border-blue-600 transition-all text-left">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${theme}`}>{icon}</div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{step}</span>
            </div>
            <button onClick={onClick} className={`w-full py-4 ${color === 'blue' ? 'bg-blue-700' : 'bg-slate-900'} text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100/50 active:scale-95 transition-all`}>{title}</button>
        </div>
    );
}

const FormSection = ({ title, icon, color, children }: any) => (
    <div className={`p-6 md:p-8 bg-white rounded-[35px] md:rounded-[45px] border-4 ${color} space-y-6 text-left shadow-xl hover:shadow-2xl transition-all`}>
        <h4 className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[3px] text-slate-900 border-b-2 border-slate-50 pb-5">{icon} {title}</h4>
        <div className="space-y-4">{children}</div>
    </div>
);

const FormField = ({ label, type = "text", value, onChange, required, placeholder }: any) => (
    <div className="space-y-2 text-left px-2">
        <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">{label}</label>
        <input
            type={type} value={value} required={required} placeholder={placeholder} onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl p-4 text-[12px] font-black text-slate-800 shadow-inner transition-all outline-none"
        />
    </div>
);