import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { 
    GraduationCap, Mail, Trash2, Loader2, X, Plus, Search, 
    BookOpen, Fingerprint, Lock, ImageIcon, UserCircle, 
    Users2, FileUp, FileDown, CheckCircle2, Save, RotateCcw, Camera, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function StudentHub() {
    const { profile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    
    // --- States ---
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // --- Bulk & File States ---
    const [csvData, setCsvData] = useState<any[] | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: '', email: '', encrypted_password: '', role: 'student',
        employee_id: '', mobile_number: '', dob: '', subject_teaching: '', 
        gender: 'male', date_of_joining: '', blood_group: 'A+', 
        address: '', mother_name: '', mother_mobile: '', father_name: '',
        father_mobile: '', avatar_url: '', residential_address: '' // added for form
    });

    const filteredStudents = students.filter(s => 
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.employee_id?.includes(searchQuery)
    );

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

    // --- PHOTO UPLOAD LOGIC ---
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const uploadPhotoToStorage = async (file: File, studentId: string) => {
        const fileExt = file.name.split('.').pop();
        const filePath = `${profile?.school_id}/${studentId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('student-photos').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('student-photos').getPublicUrl(filePath);
        return data.publicUrl;
    };

    // --- CSV LOGIC (FIXED MAPPING TO PREVENT DATE ERRORS) ---
    const downloadCSVTemplate = () => {
        const headers = ["FullName", "DOB_YYYY_MM_DD", "Email", "Password", "Gender", "BloodGroup", "FatherName", "FatherMobile", "MotherName", "MotherMobile", "RollNumber", "Class", "Section", "Address"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "SmartBadi_Student_Registry.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n').filter(row => row.trim() !== "");
            const allData = rows.map(row => row.split(',').map(cell => cell.trim()));
            
            // Map strictly based on the order defined in downloadCSVTemplate
            const parsedRows = allData.slice(1).map(row => ({
                full_name: row[0],
                dob: row[1],             // Date field correctly mapped to index 1
                email: row[2],
                password: row[3],
                gender: row[4],
                blood_group: row[5],
                father_name: row[6],
                father_mobile: row[7],
                mother_name: row[8],
                mother_mobile: row[9],
                employee_id: row[10],    // roll_number
                subject_teaching: row[11], // current_class
                address: row[12],        // current_section
                residential_address: row[13], // New Address Field
                is_active: true
            }));
            setCsvData(parsedRows);
            toast.success(`${parsedRows.length} Students Validated.`);
        };
        reader.readAsText(file);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const loadId = toast.loading("Processing Synchronized Data...");

        try {
            const studentsToRegister = csvData || [formData];
            
            for (const s of studentsToRegister) {
                const { data: res, error } = await supabase.functions.invoke('create-user', {
                    body: { 
                        email: s.email.trim().toLowerCase(), 
                        password: s.password || s.encrypted_password || 'Student@123', 
                        profileData: { 
                            full_name: s.full_name,
                            dob: s.dob,
                            gender: s.gender,
                            blood_group: s.blood_group,
                            father_name: s.father_name,
                            father_mobile: s.father_mobile,
                            mother_name: s.mother_name,
                            mother_mobile: s.mother_mobile,
                            employee_id: s.employee_id,
                            subject_teaching: s.subject_teaching,
                            address: s.address, // section
                            residential_address: s.residential_address, // residential address
                            role: 'student', 
                            school_id: profile.school_id, 
                            is_active: true 
                        } 
                    }
                });
                
                if (error) throw error;

                // Handle Individual Photo Upload
                if (!csvData && selectedPhoto && res?.user?.id) {
                    const url = await uploadPhotoToStorage(selectedPhoto, res.user.id);
                    await supabase.from('profiles').update({ avatar_url: url }).eq('id', res.user.id);
                }
            }

            toast.success("Registry Updated Successfully", { id: loadId });
            setShowAddModal(false);
            resetForm();
            fetchStudents();
        } catch (err: any) {
            toast.error(err.message, { id: loadId });
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            full_name: '', email: '', encrypted_password: '', role: 'student',
            employee_id: '', mobile_number: '', dob: '', subject_teaching: '', 
            gender: 'male', date_of_joining: '', blood_group: 'A+', 
            address: '', mother_name: '', mother_mobile: '', father_name: '',
            father_mobile: '', avatar_url: '', residential_address: ''
        });
        setCsvData(null);
        setFileName(null);
        setSelectedPhoto(null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-10 text-left min-h-screen pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-light text-slate-800 uppercase tracking-tight">Student Hub</h1>
                    <p className="text-slate-400 font-medium text-[10px] tracking-[3px] uppercase mt-1">Registry Management</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                            placeholder="Find student..." 
                            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none text-sm focus:border-blue-400 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95">
                        <Plus size={18} /> Admission
                    </button>
                </div>
            </div>

            {/* Student Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? <Loader2 className="animate-spin text-blue-600 mx-auto col-span-full" /> : 
                filteredStudents.map((s) => (
                    <motion.div layout key={s.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative group overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center shadow-inner">
                                {s.avatar_url ? (
                                    <img src={s.avatar_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <GraduationCap className="text-blue-500" size={24}/>
                                )}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">ID: {s.employee_id}</span>
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase truncate">{s.full_name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{s.subject_teaching} • Sec: {s.address}</p>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-6xl rounded-[40px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                            <div className="p-8 border-b flex justify-between items-center bg-white">
                                <h2 className="text-2xl font-black text-slate-800 uppercase">New Admission Registry</h2>
                                <button type="button" onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 rounded-2xl hover:text-red-500 transition-all"><X /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/20 custom-scrollbar">
                                {/* Photo & Bulk Controls */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    <div className={`p-6 bg-white border-2 rounded-[32px] flex flex-col items-center justify-center gap-3 transition-all ${photoPreview ? 'border-blue-500' : 'border-dashed border-slate-200'} ${csvData ? 'opacity-20 pointer-events-none' : ''}`}>
                                        <div onClick={() => photoInputRef.current?.click()} className="w-20 h-20 bg-slate-50 rounded-3xl overflow-hidden cursor-pointer flex items-center justify-center border border-slate-100 group shadow-inner">
                                            {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" alt="" /> : <Camera className="text-slate-300 group-hover:text-blue-500" size={32}/>}
                                        </div>
                                        <input type="file" ref={photoInputRef} onChange={handlePhotoSelect} accept="image/*" className="hidden" />
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Profile Photo</span>
                                    </div>

                                    <div className="p-6 bg-white border border-blue-100 rounded-[32px] flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3"><FileDown className="text-blue-500" /> <span className="text-[11px] font-black uppercase text-slate-500">CSV Template</span></div>
                                        <button type="button" onClick={downloadCSVTemplate} className="text-[10px] font-black bg-blue-600 text-white px-6 py-2.5 rounded-xl uppercase">Download</button>
                                    </div>

                                    <div className={`p-6 bg-white border-2 rounded-[32px] flex items-center justify-between transition-all ${csvData ? 'border-green-500 bg-green-50/30' : 'border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-2xl ${csvData ? 'bg-green-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                                {csvData ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
                                            </div>
                                            <span className="text-[11px] font-black uppercase text-slate-500 block truncate max-w-[100px]">{fileName || 'Bulk Upload'}</span>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                        <button type="button" onClick={() => csvData ? setCsvData(null) : fileInputRef.current?.click()} className={`text-[10px] font-black px-6 py-2.5 rounded-xl uppercase ${csvData ? 'bg-red-50 text-red-500' : 'bg-blue-600 text-white'}`}>
                                            {csvData ? 'Remove' : 'Select'}
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleRegister} className={`space-y-12 pb-10 transition-all ${csvData ? 'opacity-20 blur-[2px] pointer-events-none' : ''}`}>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <FormSection title="Academic Details" icon={<GraduationCap size={16}/>} color="border-blue-100">
                                            <FormField label="Full Name *" value={formData.full_name} onChange={(v:any)=>setFormData({...formData, full_name:v})} required />
                                            <FormField label="Roll Number *" value={formData.employee_id} onChange={(v:any)=>setFormField({...formData, employee_id:v})} required />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="Grade/Class" value={formData.subject_teaching} onChange={(v:any)=>setFormData({...formData, subject_teaching:v})} />
                                                <FormField label="Section" value={formData.address} onChange={(v:any)=>setFormData({...formData, address:v})} />
                                            </div>
                                        </FormSection>

                                        <FormSection title="Family & Address" icon={<UserCircle size={16}/>} color="border-orange-100">
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="Father Name" value={formData.father_name} onChange={(v:any)=>setFormData({...formData, father_name:v})} />
                                                <FormField label="Father Mobile" value={formData.father_mobile} onChange={(v:any)=>setFormData({...formData, father_mobile:v})} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="Mother Name" value={formData.mother_name} onChange={(v:any)=>setFormData({...formData, mother_name:v})} />
                                                <FormField label="Mother Mobile" value={formData.mother_mobile} onChange={(v:any)=>setFormData({...formData, mother_mobile:v})} />
                                            </div>
                                            <FormField label="Residential Address" value={formData.residential_address} onChange={(v:any)=>setFormData({...formData, residential_address:v})} placeholder="Street, City, Zip" />
                                        </FormSection>

                                        <FormSection title="Identity & Health" icon={<Users2 size={16}/>} color="border-green-100">
                                            <FormField label="Email *" value={formData.email} onChange={(v:any)=>setFormData({...formData, email:v})} required />
                                            <FormField label="Password *" type="password" value={formData.encrypted_password} onChange={(v:any)=>setFormData({...formData, encrypted_password:v})} required />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="Date of Birth" type="date" value={formData.dob} onChange={(v:any)=>setFormData({...formData, dob:v})} />
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Blood Group</label>
                                                    <select value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-[15px] p-3 text-xs font-bold text-slate-700 outline-none">
                                                        {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </FormSection>
                                    </div>
                                    <button type="submit" disabled={isSaving} className="w-full py-6 bg-slate-900 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[5px] hover:bg-blue-600 transition-all shadow-2xl">
                                        {isSaving ? "Syncing..." : "Authorize Registry"}
                                    </button>
                                </form>

                                {/* Bulk Progress Status */}
                                {csvData && (
                                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-10 p-10 bg-green-50 rounded-[40px] border-2 border-green-200 border-dashed text-center">
                                        <h3 className="text-xl font-black text-green-800 uppercase mb-2 tracking-tight">Ready to Synchronize</h3>
                                        <p className="text-sm font-bold text-green-600 uppercase mb-8 tracking-widest">{csvData.length} records in batch</p>
                                        <div className="flex gap-4 max-w-md mx-auto">
                                            <button type="button" onClick={handleRegister} className="flex-1 py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-[12px] shadow-xl hover:bg-green-700 transition-all active:scale-95">Push to Database</button>
                                            <button type="button" onClick={resetForm} className="px-8 py-5 bg-white text-slate-400 rounded-2xl font-black uppercase text-[12px] border border-slate-200">Cancel</button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

const FormSection = ({ title, icon, color, children }: any) => (
    <div className={`p-8 bg-white rounded-[40px] border-2 ${color} space-y-5 text-left`}>
        <h4 className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[3px] text-slate-500 border-b pb-4">{icon} {title}</h4>
        {children}
    </div>
);

const FormField = ({ label, type = "text", value, onChange, placeholder, required }: any) => (
    <div className="space-y-1.5 text-left">
        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
        <input type={type} value={value} placeholder={placeholder} required={required} onChange={e => onChange(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[15px] p-3.5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-300 transition-all placeholder:text-slate-300 shadow-sm" />
    </div>
);