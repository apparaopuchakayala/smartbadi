import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { 
    GraduationCap, Mail, Trash2, Loader2, X, Plus, Search, 
    BookOpen, Fingerprint, Lock, ImageIcon, UserCircle, 
    Users2, FileUp, FileDown, CheckCircle2, Save, RotateCcw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function StudentHub() {
    const { profile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [csvData, setCsvData] = useState<any[] | null>(null);
    const [csvError, setCsvError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: '', email: '', encrypted_password: '', role: 'student',
        employee_id: '', mobile_number: '', // Father Mobile (Mapping)
        dob: '', subject_teaching: '', // Class Name
        gender: 'male', 
        date_of_joining: '', // Father Name
        blood_group: 'A+', 
        address: '', // Section
        mother_name: '', // Added
        mother_mobile: '' // Added
    });

    useEffect(() => {
        if (profile?.school_id) fetchStudents();
    }, [profile]);

    const fetchStudents = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('school_id', profile.school_id)
            .eq('role', 'student');
        if (!error) setStudents(data || []);
        setLoading(false);
    };

    const downloadCSVTemplate = () => {
        // Headers updated with your new requirements
        const headers = ["FullName", "RollNumber", "Class", "Section", "FatherName", "FatherMobile", "MotherName", "MotherMobile", "BloodGroup", "Email", "Password"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "SmartBadi_Student_Template.csv");
        link.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n').filter(row => row.trim() !== "");
            if (rows.length < 2) return setCsvError("File is empty");
            setCsvData(rows.slice(1).map(r => r.split(',').map(c => c.trim())));
            toast.success("CSV Validated Successfully");
        };
        reader.readAsText(file);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const loadId = toast.loading("Processing Admissions...");

        try {
            if (csvData) {
                for (const row of csvData) {
                    await supabase.functions.invoke('create-user', {
                        body: { 
                            email: row[9], 
                            password: row[10] || 'Student@123', 
                            profileData: { 
                                full_name: row[0], role: 'student', school_id: profile.school_id, 
                                employee_id: row[1], subject_teaching: row[2], address: row[3], 
                                date_of_joining: row[4], mobile_number: row[5], // Father Name & Mobile
                                gender: row[6], // Temporary mapping for Mother Name
                                blood_group: row[8], is_active: true 
                            }
                        }
                    });
                }
            } else {
                const { error } = await supabase.functions.invoke('create-user', {
                    body: { 
                        email: formData.email, 
                        password: formData.encrypted_password, 
                        profileData: { ...formData, school_id: profile.school_id, is_active: true }
                    }
                });
                if (error) throw error;
            }
            toast.success("All Students Registered", { id: loadId });
            setShowAddModal(false);
            setCsvData(null);
            fetchStudents();
        } catch (err: any) {
            toast.error(err.message, { id: loadId });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.employee_id?.includes(searchQuery)
    );

    return (
        <div className="space-y-10 text-left min-h-screen pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-light text-slate-800 tracking-tight uppercase">Student Hub</h1>
                    <p className="text-slate-400 font-medium text-[10px] tracking-[3px] uppercase mt-1">Enrollment & Academic Records</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                            placeholder="Search Student..." 
                            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none text-sm focus:border-blue-400 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2">
                        <Plus size={16} /> New Admission
                    </button>
                </div>
            </div>

            {/* Grid View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div> : 
                filteredStudents.map((s) => (
                    <motion.div layout key={s.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
                        <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><GraduationCap size={20}/></div>
                            <span className="bg-slate-50 px-2 py-1 rounded text-[9px] font-black text-slate-500 border border-slate-100">{s.employee_id}</span>
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase truncate">{s.full_name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold mb-4">{s.subject_teaching} • {s.address}</p>
                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">Blood: {s.blood_group}</span>
                            <button className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Admission Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-6xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-slate-800 uppercase">Student Registration Suite</h2>
                                <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 rounded-xl hover:text-red-500"><X /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20 custom-scrollbar">
                                {/* Bulk Actions */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                                    <div className="p-4 bg-white border border-blue-100 rounded-3xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3"><FileDown className="text-blue-500" /> <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Get Template</span></div>
                                        <button onClick={downloadCSVTemplate} className="text-[9px] font-black bg-blue-500 text-white px-5 py-2 rounded-xl uppercase hover:bg-blue-600 transition-all">Download</button>
                                    </div>
                                    <div className={`p-4 bg-white border rounded-3xl flex items-center justify-between shadow-sm ${csvData ? 'border-green-200 bg-green-50/20' : 'border-slate-100'}`}>
                                        <div className="flex items-center gap-3"><FileUp className={csvData ? "text-green-500" : "text-slate-400"} /> <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{csvData ? `${csvData.length} Students Validated` : 'Bulk CSV Upload'}</span></div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black bg-green-500 text-white px-5 py-2 rounded-xl uppercase hover:bg-green-600 transition-all">Select File</button>
                                    </div>
                                </div>

                                <form onSubmit={handleRegister} className={`space-y-8 ${csvData ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <Section title="Academic" icon={<GraduationCap size={16}/>} color="border-blue-100">
                                            <Field label="Full Name *" value={formData.full_name} onChange={(v:any)=>setFormData({...formData, full_name:v})} />
                                            <Field label="Roll Number *" value={formData.employee_id} onChange={(v:any)=>setFormData({...formData, employee_id:v})} />
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Class" value={formData.subject_teaching} onChange={(v:any)=>setFormData({...formData, subject_teaching:v})} placeholder="e.g. 10th" />
                                                <Field label="Section" value={formData.address} onChange={(v:any)=>setFormData({...formData, address:v})} placeholder="e.g. A" />
                                            </div>
                                        </Section>

                                        <Section title="Family" icon={<UserCircle size={16}/>} color="border-orange-100">
                                            <Field label="Father Name" value={formData.date_of_joining} onChange={(v:any)=>setFormData({...formData, date_of_joining:v})} />
                                            <Field label="Father Mobile" value={formData.mobile_number} onChange={(v:any)=>setFormData({...formData, mobile_number:v})} />
                                            <Field label="Mother Name" value={formData.mother_name} onChange={(v:any)=>setFormData({...formData, mother_name:v})} />
                                            <Field label="Mother Mobile" value={formData.mother_mobile} onChange={(v:any)=>setFormData({...formData, mother_mobile:v})} />
                                        </Section>

                                        <Section title="Personal" icon={<Users2 size={16}/>} color="border-green-100">
                                            <Field label="Email (Login ID) *" value={formData.email} onChange={(v:any)=>setFormData({...formData, email:v})} />
                                            <Field label="Password *" type="password" value={formData.encrypted_password} onChange={(v:any)=>setFormData({...formData, encrypted_password:v})} />
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="DOB" type="date" value={formData.dob} onChange={(v:any)=>setFormData({...formData, dob:v})} />
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Blood Group</label>
                                                    <select 
                                                        value={formData.blood_group} 
                                                        onChange={(e)=>setFormData({...formData, blood_group: e.target.value})}
                                                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                                                    >
                                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </Section>
                                    </div>
                                    <button disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[5px] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70">
                                        {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18}/>} 
                                        {isSaving ? 'Synchronizing Data...' : 'Confirm Student Entry'}
                                    </button>
                                </form>

                                {csvData && (
                                    <div className="mt-10 flex gap-4 animate-in fade-in slide-in-from-bottom-4">
                                        <button onClick={handleRegister} className="flex-1 py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 transition-all">Submit Bulk Sync ({csvData.length} Students)</button>
                                        <button onClick={() => setCsvData(null)} className="px-10 py-5 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-300 transition-all">Cancel</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Internal Helper Components ---
const Section = ({ title, icon, color, children }: any) => (
    <div className={`p-6 bg-white rounded-[32px] border-2 ${color} shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4 text-left`}>
        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-50 pb-2">{icon} {title}</h4>
        {children}
    </div>
);

const Field = ({ label, type = "text", value, onChange, placeholder }: any) => (
    <div className="space-y-1">
        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">{label}</label>
        <input 
            type={type} 
            value={value} 
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)} 
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 transition-all placeholder:text-slate-300" 
        />
    </div>
);